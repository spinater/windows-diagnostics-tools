//go:build windows
// +build windows

// Package collectors provides TCP connection analysis
package collectors

import (
	"context"
	"fmt"
	"net"
	"sync"
	"syscall"
	"unsafe"

	"loadrunner-diagnosis/internal/models"

	"golang.org/x/sys/windows"
)

// TCP connection states
const (
	MIB_TCP_STATE_CLOSED     = 1
	MIB_TCP_STATE_LISTEN     = 2
	MIB_TCP_STATE_SYN_SENT   = 3
	MIB_TCP_STATE_SYN_RCVD   = 4
	MIB_TCP_STATE_ESTAB      = 5
	MIB_TCP_STATE_FIN_WAIT1  = 6
	MIB_TCP_STATE_FIN_WAIT2  = 7
	MIB_TCP_STATE_CLOSE_WAIT = 8
	MIB_TCP_STATE_CLOSING    = 9
	MIB_TCP_STATE_LAST_ACK   = 10
	MIB_TCP_STATE_TIME_WAIT  = 11
	MIB_TCP_STATE_DELETE_TCB = 12
)

var tcpStateNames = map[uint32]string{
	MIB_TCP_STATE_CLOSED:     "CLOSED",
	MIB_TCP_STATE_LISTEN:     "LISTEN",
	MIB_TCP_STATE_SYN_SENT:   "SYN_SENT",
	MIB_TCP_STATE_SYN_RCVD:   "SYN_RCVD",
	MIB_TCP_STATE_ESTAB:      "ESTABLISHED",
	MIB_TCP_STATE_FIN_WAIT1:  "FIN_WAIT1",
	MIB_TCP_STATE_FIN_WAIT2:  "FIN_WAIT2",
	MIB_TCP_STATE_CLOSE_WAIT: "CLOSE_WAIT",
	MIB_TCP_STATE_CLOSING:    "CLOSING",
	MIB_TCP_STATE_LAST_ACK:   "LAST_ACK",
	MIB_TCP_STATE_TIME_WAIT:  "TIME_WAIT",
	MIB_TCP_STATE_DELETE_TCB: "DELETE_TCB",
}

// MIB_TCPSTATS structure for TCP statistics
type MIB_TCPSTATS struct {
	RtoAlgorithm uint32
	RtoMin       uint32
	RtoMax       uint32
	MaxConn      uint32
	ActiveOpens  uint32
	PassiveOpens uint32
	AttemptFails uint32
	EstabResets  uint32
	CurrEstab    uint32
	InSegs       uint32
	OutSegs      uint32
	RetransSegs  uint32
	InErrs       uint32
	OutRsts      uint32
	NumConns     uint32
}

// MIB_TCPROW2 structure for TCP connection table
type MIB_TCPROW2 struct {
	State        uint32
	LocalAddr    uint32
	LocalPort    uint32
	RemoteAddr   uint32
	RemotePort   uint32
	OwningPid    uint32
	OffloadState uint32
}

// MIB_TCPTABLE2 structure
type MIB_TCPTABLE2 struct {
	NumEntries uint32
	Table      [1]MIB_TCPROW2
}

var (
	modiphlpapi           = windows.NewLazySystemDLL("iphlpapi.dll")
	procGetTcpStatistics  = modiphlpapi.NewProc("GetTcpStatistics")
	procGetTcpTable2      = modiphlpapi.NewProc("GetTcpTable2")
)

// TCPCollector collects TCP connection metrics
type TCPCollector struct {
	mu            sync.RWMutex
	lastStats     *MIB_TCPSTATS
	lastCollect   int64
	processNames  map[uint32]string
}

// NewTCPCollector creates a new TCP collector
func NewTCPCollector() (*TCPCollector, error) {
	return &TCPCollector{
		processNames: make(map[uint32]string),
	}, nil
}

// Name returns the collector name
func (c *TCPCollector) Name() string {
	return "tcp"
}

// Collect gathers TCP metrics
func (c *TCPCollector) Collect(ctx context.Context) (*models.TCPMetrics, error) {
	metrics := &models.TCPMetrics{
		ConnectionStates: make(map[string]int),
	}

	// Get TCP statistics
	stats, err := c.getTcpStatistics()
	if err == nil {
		metrics.SegmentsSent = uint64(stats.OutSegs)
		metrics.SegmentsReceived = uint64(stats.InSegs)
		metrics.SegmentsRetransmitted = uint64(stats.RetransSegs)
		metrics.ActiveOpens = uint64(stats.ActiveOpens)
		metrics.PassiveOpens = uint64(stats.PassiveOpens)
		metrics.ConnectionFailures = uint64(stats.AttemptFails)
		metrics.ConnectionsReset = uint64(stats.EstabResets)

		// Calculate retransmission rate
		if stats.OutSegs > 0 {
			metrics.RetransmissionRate = float64(stats.RetransSegs) / float64(stats.OutSegs) * 100
		}
	}

	// Get TCP connection table
	connections, err := c.getTcpTable()
	if err == nil {
		metrics.Connections = connections
		metrics.TotalConnections = len(connections)

		// Count connection states
		for _, conn := range connections {
			metrics.ConnectionStates[conn.State]++
			
			// Count specific problematic states
			switch conn.State {
			case "CLOSE_WAIT":
				metrics.CloseWaitCount++
			case "TIME_WAIT":
				metrics.TimeWaitCount++
			}
		}
	}

	return metrics, nil
}

// getTcpStatistics retrieves TCP protocol statistics
func (c *TCPCollector) getTcpStatistics() (*MIB_TCPSTATS, error) {
	var stats MIB_TCPSTATS
	ret, _, _ := procGetTcpStatistics.Call(uintptr(unsafe.Pointer(&stats)))
	if ret != 0 {
		return nil, fmt.Errorf("GetTcpStatistics failed: %d", ret)
	}
	return &stats, nil
}

// getTcpTable retrieves the TCP connection table
func (c *TCPCollector) getTcpTable() ([]models.TCPConnection, error) {
	// First call to get required buffer size
	var size uint32
	procGetTcpTable2.Call(0, uintptr(unsafe.Pointer(&size)), 1)
	
	if size == 0 {
		return nil, fmt.Errorf("GetTcpTable2 returned zero size")
	}

	// Allocate buffer
	buf := make([]byte, size)
	ret, _, _ := procGetTcpTable2.Call(
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(unsafe.Pointer(&size)),
		1, // Sort by local address
	)
	
	if ret != 0 {
		return nil, fmt.Errorf("GetTcpTable2 failed: %d", ret)
	}

	// Parse the table
	table := (*MIB_TCPTABLE2)(unsafe.Pointer(&buf[0]))
	numEntries := int(table.NumEntries)
	
	connections := make([]models.TCPConnection, 0, numEntries)
	
	// Calculate pointer to first entry
	entries := unsafe.Pointer(&table.Table[0])
	entrySize := unsafe.Sizeof(MIB_TCPROW2{})

	for i := 0; i < numEntries; i++ {
		row := (*MIB_TCPROW2)(unsafe.Pointer(uintptr(entries) + uintptr(i)*entrySize))
		
		conn := models.TCPConnection{
			LocalAddress:  c.ipToString(row.LocalAddr),
			LocalPort:     c.portToHost(row.LocalPort),
			RemoteAddress: c.ipToString(row.RemoteAddr),
			RemotePort:    c.portToHost(row.RemotePort),
			State:         tcpStateNames[row.State],
			PID:           row.OwningPid,
		}
		
		connections = append(connections, conn)
	}

	return connections, nil
}

// ipToString converts a uint32 IP to dotted string
func (c *TCPCollector) ipToString(ip uint32) string {
	return net.IPv4(
		byte(ip),
		byte(ip>>8),
		byte(ip>>16),
		byte(ip>>24),
	).String()
}

// portToHost converts network byte order port to host order
func (c *TCPCollector) portToHost(port uint32) uint16 {
	return uint16((port&0xFF)<<8 | (port&0xFF00)>>8)
}

// GetConnectionsByState returns connections filtered by state
func (c *TCPCollector) GetConnectionsByState(ctx context.Context, state string) ([]models.TCPConnection, error) {
	all, err := c.getTcpTable()
	if err != nil {
		return nil, err
	}
	
	var filtered []models.TCPConnection
	for _, conn := range all {
		if conn.State == state {
			filtered = append(filtered, conn)
		}
	}
	return filtered, nil
}

// GetCloseWaitConnections returns connections stuck in CLOSE_WAIT (unclosed)
func (c *TCPCollector) GetCloseWaitConnections(ctx context.Context) ([]models.TCPConnection, error) {
	return c.GetConnectionsByState(ctx, "CLOSE_WAIT")
}

// Dummy import to ensure syscall is used
var _ = syscall.EINVAL
