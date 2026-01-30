//go:build windows
// +build windows

// Package collectors provides network interface metrics collection
package collectors

import (
	"context"
	"fmt"
	"sync"
	"time"
	"unsafe"

	"loadrunner-diagnosis/internal/models"

	"golang.org/x/sys/windows"
)

var (
	procGetIfEntry = modiphlpapi.NewProc("GetIfEntry")
)

// NetworkCollector collects network interface metrics
type NetworkCollector struct {
	mu          sync.RWMutex
	lastCollect time.Time
	lastStats   map[string]*interfaceStats
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
		lastStats: make(map[string]*interfaceStats),
	}, nil
}

// Name returns the collector name
func (c *NetworkCollector) Name() string {
	return "network"
}

// Collect gathers network interface metrics using a simpler approach
func (c *NetworkCollector) Collect(ctx context.Context) (*models.NetworkMetrics, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	metrics := &models.NetworkMetrics{
		Interfaces: []models.NetworkInterface{},
	}

	// Use GetAdaptersAddresses for safer enumeration
	adapters, err := getNetworkAdapters()
	if err != nil {
		return metrics, nil
	}

	now := time.Now()
	elapsed := now.Sub(c.lastCollect).Seconds()
	if elapsed < 0.1 {
		elapsed = 1
	}

	for _, adapter := range adapters {
		iface := models.NetworkInterface{
			Name:        adapter.Name,
			Description: adapter.Description,
			IsUp:        adapter.IsUp,
			Speed:       adapter.Speed,
		}

		// Get interface statistics using GetIfEntry
		stats, err := getInterfaceStats(adapter.Index)
		if err == nil {
			iface.BytesSent = stats.OutOctets
			iface.BytesReceived = stats.InOctets
			iface.PacketsSent = stats.OutPkts
			iface.PacketsReceived = stats.InPkts
			iface.InErrors = stats.InErrors
			iface.OutErrors = stats.OutErrors
			iface.InDiscards = stats.InDiscards
			iface.OutDiscards = stats.OutDiscards
			iface.OutputQueueLength = stats.OutQLen

			// Calculate rates
			key := adapter.Name
			if last, ok := c.lastStats[key]; ok {
				iface.BytesSentPerSec = uint64(float64(stats.OutOctets-last.outOctets) / elapsed)
				iface.BytesRecvPerSec = uint64(float64(stats.InOctets-last.inOctets) / elapsed)
				iface.PacketsSentPerSec = uint64(float64(stats.OutPkts-last.outPkts) / elapsed)
				iface.PacketsRecvPerSec = uint64(float64(stats.InPkts-last.inPkts) / elapsed)
			}

			c.lastStats[key] = &interfaceStats{
				inOctets:  stats.InOctets,
				outOctets: stats.OutOctets,
				inPkts:    stats.InPkts,
				outPkts:   stats.OutPkts,
			}

			// Calculate utilization
			if adapter.Speed > 0 {
				totalBytesPerSec := float64(iface.BytesSentPerSec + iface.BytesRecvPerSec)
				maxBytesPerSec := float64(adapter.Speed) / 8
				iface.Utilization = (totalBytesPerSec / maxBytesPerSec) * 100
				if iface.Utilization > 100 {
					iface.Utilization = 100
				}
			}
		}

		metrics.Interfaces = append(metrics.Interfaces, iface)
	}

	c.lastCollect = now
	return metrics, nil
}

// AdapterInfo holds basic adapter information
type AdapterInfo struct {
	Index       uint32
	Name        string
	Description string
	IsUp        bool
	Speed       uint64
}

// InterfaceStats holds interface statistics
type InterfaceStats struct {
	InOctets    uint64
	OutOctets   uint64
	InPkts      uint64
	OutPkts     uint64
	InErrors    uint64
	OutErrors   uint64
	InDiscards  uint64
	OutDiscards uint64
	OutQLen     uint64
}

// getNetworkAdapters gets list of network adapters using GetAdaptersAddresses
func getNetworkAdapters() ([]AdapterInfo, error) {
	var adapters []AdapterInfo

	// Get adapter addresses
	var size uint32 = 15000
	buf := make([]byte, size)

	err := windows.GetAdaptersAddresses(
		windows.AF_UNSPEC,
		windows.GAA_FLAG_INCLUDE_PREFIX,
		0,
		(*windows.IpAdapterAddresses)(unsafe.Pointer(&buf[0])),
		&size,
	)
	if err != nil {
		return adapters, err
	}

	for addr := (*windows.IpAdapterAddresses)(unsafe.Pointer(&buf[0])); addr != nil; addr = addr.Next {
		// Skip loopback and non-operational interfaces
		if addr.OperStatus != windows.IfOperStatusUp {
			continue
		}
		if addr.IfType == windows.IF_TYPE_SOFTWARE_LOOPBACK {
			continue
		}

		name := windows.UTF16PtrToString(addr.FriendlyName)
		desc := windows.UTF16PtrToString(addr.Description)

		adapters = append(adapters, AdapterInfo{
			Index:       addr.IfIndex,
			Name:        name,
			Description: desc,
			IsUp:        addr.OperStatus == windows.IfOperStatusUp,
			Speed:       addr.TransmitLinkSpeed,
		})
	}

	return adapters, nil
}

// MIB_IF_ROW structure for GetIfEntry
type MIB_IFROW struct {
	Name            [256]uint16
	Index           uint32
	Type            uint32
	Mtu             uint32
	Speed           uint32
	PhysAddrLen     uint32
	PhysAddr        [8]byte
	AdminStatus     uint32
	OperStatus      uint32
	LastChange      uint32
	InOctets        uint32
	InUcastPkts     uint32
	InNUcastPkts    uint32
	InDiscards      uint32
	InErrors        uint32
	InUnknownProtos uint32
	OutOctets       uint32
	OutUcastPkts    uint32
	OutNUcastPkts   uint32
	OutDiscards     uint32
	OutErrors       uint32
	OutQLen         uint32
	DescrLen        uint32
	Descr           [256]byte
}

// getInterfaceStats gets statistics for a specific interface
func getInterfaceStats(index uint32) (*InterfaceStats, error) {
	var row MIB_IFROW
	row.Index = index

	ret, _, _ := procGetIfEntry.Call(uintptr(unsafe.Pointer(&row)))
	if ret != 0 {
		return nil, fmt.Errorf("GetIfEntry failed: %d", ret)
	}

	return &InterfaceStats{
		InOctets:    uint64(row.InOctets),
		OutOctets:   uint64(row.OutOctets),
		InPkts:      uint64(row.InUcastPkts) + uint64(row.InNUcastPkts),
		OutPkts:     uint64(row.OutUcastPkts) + uint64(row.OutNUcastPkts),
		InErrors:    uint64(row.InErrors),
		OutErrors:   uint64(row.OutErrors),
		InDiscards:  uint64(row.InDiscards),
		OutDiscards: uint64(row.OutDiscards),
		OutQLen:     uint64(row.OutQLen),
	}, nil
}
