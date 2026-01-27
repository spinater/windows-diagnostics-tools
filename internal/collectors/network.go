//go:build windows
// +build windows

// Package collectors provides network interface metrics collection
package collectors

import (
	"context"
	"sync"
	"time"
	"unsafe"

	"loadrunner-diagnosis/internal/models"
)

// MIB_IF_ROW2 structure (simplified)
type MIB_IF_ROW2 struct {
	InterfaceLuid            uint64
	InterfaceIndex           uint32
	InterfaceGuid            [16]byte
	Alias                    [514]uint16
	Description              [514]uint16
	PhysicalAddressLength    uint32
	PhysicalAddress          [32]byte
	PermanentPhysicalAddress [32]byte
	Mtu                      uint32
	Type                     uint32
	TunnelType               uint32
	MediaType                uint32
	PhysicalMediumType       uint32
	AccessType               uint32
	DirectionType            uint32
	InterfaceAndOperStatusFlags uint8
	OperStatus               uint32
	AdminStatus              uint32
	MediaConnectState        uint32
	NetworkGuid              [16]byte
	ConnectionType           uint32
	TransmitLinkSpeed        uint64
	ReceiveLinkSpeed         uint64
	InOctets                 uint64
	InUcastPkts              uint64
	InNUcastPkts             uint64
	InDiscards               uint64
	InErrors                 uint64
	InUnknownProtos          uint64
	InUcastOctets            uint64
	InMulticastOctets        uint64
	InBroadcastOctets        uint64
	OutOctets                uint64
	OutUcastPkts             uint64
	OutNUcastPkts            uint64
	OutDiscards              uint64
	OutErrors                uint64
	OutUcastOctets           uint64
	OutMulticastOctets       uint64
	OutBroadcastOctets       uint64
	OutQLen                  uint64
}

// MIB_IF_TABLE2 structure
type MIB_IF_TABLE2 struct {
	NumEntries uint32
	Table      [1]MIB_IF_ROW2
}

var (
	procGetIfTable2    = modiphlpapi.NewProc("GetIfTable2")
	procFreeMibTable   = modiphlpapi.NewProc("FreeMibTable")
)

// NetworkCollector collects network interface metrics
type NetworkCollector struct {
	mu           sync.RWMutex
	lastCollect  time.Time
	lastStats    map[uint32]*interfaceStats
}

type interfaceStats struct {
	inOctets  uint64
	outOctets uint64
	inPkts    uint64
	outPkts   uint64
}

// NewNetworkCollector creates a new network collector
func NewNetworkCollector() (*NetworkCollector, error) {
	return &NetworkCollector{
		lastStats: make(map[uint32]*interfaceStats),
	}, nil
}

// Name returns the collector name
func (c *NetworkCollector) Name() string {
	return "network"
}

// Collect gathers network interface metrics
func (c *NetworkCollector) Collect(ctx context.Context) (*models.NetworkMetrics, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	metrics := &models.NetworkMetrics{
		Interfaces: []models.NetworkInterface{},
	}

	// Get interface table
	var table *MIB_IF_TABLE2
	ret, _, _ := procGetIfTable2.Call(uintptr(unsafe.Pointer(&table)))
	if ret != 0 {
		return metrics, nil
	}
	defer procFreeMibTable.Call(uintptr(unsafe.Pointer(table)))

	now := time.Now()
	elapsed := now.Sub(c.lastCollect).Seconds()
	if elapsed < 0.1 {
		elapsed = 1
	}

	numEntries := int(table.NumEntries)
	entries := unsafe.Pointer(&table.Table[0])
	entrySize := unsafe.Sizeof(MIB_IF_ROW2{})

	for i := 0; i < numEntries; i++ {
		row := (*MIB_IF_ROW2)(unsafe.Pointer(uintptr(entries) + uintptr(i)*entrySize))
		
		// Skip loopback and non-operational interfaces
		if row.OperStatus != 1 { // IfOperStatusUp = 1
			continue
		}

		name := utf16ToString(row.Alias[:])
		desc := utf16ToString(row.Description[:])
		
		iface := models.NetworkInterface{
			Name:              name,
			Description:       desc,
			IsUp:              row.OperStatus == 1,
			Speed:             row.TransmitLinkSpeed,
			BytesSent:         row.OutOctets,
			BytesReceived:     row.InOctets,
			PacketsSent:       row.OutUcastPkts + row.OutNUcastPkts,
			PacketsReceived:   row.InUcastPkts + row.InNUcastPkts,
			InErrors:          row.InErrors,
			OutErrors:         row.OutErrors,
			InDiscards:        row.InDiscards,
			OutDiscards:       row.OutDiscards,
			OutputQueueLength: row.OutQLen,
		}

		// Calculate rates if we have previous data
		if last, ok := c.lastStats[row.InterfaceIndex]; ok {
			iface.BytesSentPerSec = uint64(float64(row.OutOctets-last.outOctets) / elapsed)
			iface.BytesRecvPerSec = uint64(float64(row.InOctets-last.inOctets) / elapsed)
			iface.PacketsSentPerSec = uint64(float64(row.OutUcastPkts+row.OutNUcastPkts-last.outPkts) / elapsed)
			iface.PacketsRecvPerSec = uint64(float64(row.InUcastPkts+row.InNUcastPkts-last.inPkts) / elapsed)
		}

		// Calculate utilization
		if row.TransmitLinkSpeed > 0 {
			totalBytesPerSec := float64(iface.BytesSentPerSec + iface.BytesRecvPerSec)
			maxBytesPerSec := float64(row.TransmitLinkSpeed) / 8
			iface.Utilization = (totalBytesPerSec / maxBytesPerSec) * 100
			if iface.Utilization > 100 {
				iface.Utilization = 100
			}
		}

		// Store for next calculation
		c.lastStats[row.InterfaceIndex] = &interfaceStats{
			inOctets:  row.InOctets,
			outOctets: row.OutOctets,
			inPkts:    row.InUcastPkts + row.InNUcastPkts,
			outPkts:   row.OutUcastPkts + row.OutNUcastPkts,
		}

		metrics.Interfaces = append(metrics.Interfaces, iface)
	}

	c.lastCollect = now
	return metrics, nil
}

// utf16ToString converts a UTF-16 slice to a Go string
func utf16ToString(s []uint16) string {
	for i, v := range s {
		if v == 0 {
			s = s[:i]
			break
		}
	}
	return string(utf16Decode(s))
}

// utf16Decode decodes UTF-16 to runes
func utf16Decode(s []uint16) []rune {
	runes := make([]rune, len(s))
	for i, v := range s {
		runes[i] = rune(v)
	}
	return runes
}
