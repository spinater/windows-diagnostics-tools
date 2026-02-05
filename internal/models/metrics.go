// Package models defines data structures for all collected metrics
package models

import "time"

// SystemMetrics contains all collected system metrics
type SystemMetrics struct {
	Timestamp time.Time      `json:"timestamp"`
	TCP       *TCPMetrics    `json:"tcp,omitempty"`
	Memory    *MemoryMetrics `json:"memory,omitempty"`
	CPU       *CPUMetrics    `json:"cpu,omitempty"`
	Disk      *DiskMetrics   `json:"disk,omitempty"`
	Network   *NetworkMetrics `json:"network,omitempty"`
	Processes []ProcessInfo  `json:"processes,omitempty"`
}

// TCPMetrics contains TCP connection statistics
type TCPMetrics struct {
	// Zero Window Detection
	ZeroWindowEvents    uint64 `json:"zeroWindowEvents"`
	ZeroWindowRate      float64 `json:"zeroWindowRate"` // per second

	// Connection States
	ConnectionStates    map[string]int `json:"connectionStates"`
	TotalConnections    int    `json:"totalConnections"`
	
	// Connection Issues
	CloseWaitCount      int    `json:"closeWaitCount"`      // Unclosed connections
	TimeWaitCount       int    `json:"timeWaitCount"`       // Connection churn
	
	// TCP Statistics
	SegmentsSent        uint64 `json:"segmentsSent"`
	SegmentsReceived    uint64 `json:"segmentsReceived"`
	SegmentsRetransmitted uint64 `json:"segmentsRetransmitted"`
	RetransmissionRate  float64 `json:"retransmissionRate"` // percentage
	
	// Connection Rate
	ActiveOpens         uint64 `json:"activeOpens"`
	PassiveOpens        uint64 `json:"passiveOpens"`
	ConnectionFailures  uint64 `json:"connectionFailures"`
	ConnectionsReset    uint64 `json:"connectionsReset"`
	
	// Active Connections Table
	Connections         []TCPConnection `json:"connections,omitempty"`
}

// TCPConnection represents a single TCP connection
type TCPConnection struct {
	LocalAddress  string `json:"localAddress"`
	LocalPort     uint16 `json:"localPort"`
	RemoteAddress string `json:"remoteAddress"`
	RemotePort    uint16 `json:"remotePort"`
	State         string `json:"state"`
	PID           uint32 `json:"pid"`
	ProcessName   string `json:"processName,omitempty"`
}

// MemoryMetrics contains memory usage statistics
type MemoryMetrics struct {
	// Physical Memory
	TotalPhysical     uint64  `json:"totalPhysical"`     // bytes
	AvailablePhysical uint64  `json:"availablePhysical"` // bytes
	UsedPhysical      uint64  `json:"usedPhysical"`      // bytes
	UsedPercent       float64 `json:"usedPercent"`       // percentage
	
	// Virtual Memory / Page File
	TotalPageFile     uint64  `json:"totalPageFile"`
	AvailablePageFile uint64  `json:"availablePageFile"`
	UsedPageFile      uint64  `json:"usedPageFile"`
	
	// Cache
	CacheBytes        uint64 `json:"cacheBytes"`
	
	// Paging
	PageFaultsPerSec  uint64 `json:"pageFaultsPerSec"`
	PagesInputPerSec  uint64 `json:"pagesInputPerSec"`  // Hard page faults
	PagesOutputPerSec uint64 `json:"pagesOutputPerSec"`
	
	// Committed Memory
	CommittedBytes    uint64  `json:"committedBytes"`
	CommitLimit       uint64  `json:"commitLimit"`
	CommitPercent     float64 `json:"commitPercent"`
}

// CPUMetrics contains CPU usage statistics
type CPUMetrics struct {
	// Overall CPU
	TotalPercent   float64   `json:"totalPercent"`
	UserPercent    float64   `json:"userPercent"`
	KernelPercent  float64   `json:"kernelPercent"`
	IdlePercent    float64   `json:"idlePercent"`
	
	// Per-Core
	CoreCount      int       `json:"coreCount"`
	PerCorePercent []float64 `json:"perCorePercent"`
	
	// Additional Stats
	ContextSwitchesPerSec uint64 `json:"contextSwitchesPerSec"`
	InterruptsPerSec      uint64 `json:"interruptsPerSec"`
	ProcessorQueueLength  uint64 `json:"processorQueueLength"`
}

// DiskMetrics contains disk I/O statistics
type DiskMetrics struct {
	Disks []DiskInfo `json:"disks"`
}

// DiskInfo contains per-disk statistics
type DiskInfo struct {
	Name            string  `json:"name"`
	
	// Throughput
	ReadBytesPerSec  uint64  `json:"readBytesPerSec"`
	WriteBytesPerSec uint64  `json:"writeBytesPerSec"`
	
	// IOPS
	ReadsPerSec     float64 `json:"readsPerSec"`
	WritesPerSec    float64 `json:"writesPerSec"`
	
	// Queue & Latency
	QueueLength     uint64  `json:"queueLength"`
	AvgReadLatency  float64 `json:"avgReadLatency"`  // ms
	AvgWriteLatency float64 `json:"avgWriteLatency"` // ms
	
	// Utilization
	IdlePercent     float64 `json:"idlePercent"`
	BusyPercent     float64 `json:"busyPercent"`
	
	// Capacity
	TotalBytes      uint64  `json:"totalBytes"`
	FreeBytes       uint64  `json:"freeBytes"`
	UsedPercent     float64 `json:"usedPercent"`
}

// NetworkMetrics contains network interface statistics
type NetworkMetrics struct {
	Interfaces []NetworkInterface `json:"interfaces"`
}

// NetworkInterface contains per-interface statistics
type NetworkInterface struct {
	Name        string `json:"name"`
	Description string `json:"description"`
	
	// Status
	IsUp        bool   `json:"isUp"`
	Speed       uint64 `json:"speed"` // bits per second
	
	// Traffic
	BytesSent       uint64  `json:"bytesSent"`
	BytesReceived   uint64  `json:"bytesReceived"`
	BytesSentPerSec uint64  `json:"bytesSentPerSec"`
	BytesRecvPerSec uint64  `json:"bytesRecvPerSec"`
	
	// Packets
	PacketsSent     uint64 `json:"packetsSent"`
	PacketsReceived uint64 `json:"packetsReceived"`
	PacketsSentPerSec   uint64 `json:"packetsSentPerSec"`
	PacketsRecvPerSec   uint64 `json:"packetsRecvPerSec"`
	
	// Errors & Discards (Buffer overflow indicators)
	InErrors        uint64 `json:"inErrors"`
	OutErrors       uint64 `json:"outErrors"`
	InDiscards      uint64 `json:"inDiscards"`  // Buffer full!
	OutDiscards     uint64 `json:"outDiscards"` // Buffer full!
	
	// Buffer/Queue (capacity visualization)
	OutputQueueLength uint64  `json:"outputQueueLength"`
	Utilization       float64 `json:"utilization"` // percentage of speed
}

// ProcessInfo contains process resource usage
type ProcessInfo struct {
	PID           uint32  `json:"pid"`
	Name          string  `json:"name"`
	CPUPercent    float64 `json:"cpuPercent"`
	MemoryBytes   uint64  `json:"memoryBytes"`
	MemoryPercent float64 `json:"memoryPercent"`
	ThreadCount   uint32  `json:"threadCount"`
	HandleCount   uint32  `json:"handleCount"`
}

// MonitoringStatus represents the current monitoring state
type MonitoringStatus struct {
	IsRunning      bool          `json:"isRunning"`
	StartedAt      *time.Time    `json:"startedAt,omitempty"`
	Elapsed        string        `json:"elapsed,omitempty"`
	Interval       time.Duration `json:"interval"`
	SamplesCollected int64       `json:"samplesCollected"`
}

// Alert represents a threshold violation
type Alert struct {
	ID        string    `json:"id"`
	Level     string    `json:"level"` // warning, critical
	Category  string    `json:"category"` // tcp, memory, cpu, disk, network
	Message   string    `json:"message"`
	Value     float64   `json:"value"`
	Threshold float64   `json:"threshold"`
	Timestamp time.Time `json:"timestamp"`
}

// TraceRouteResult represents a complete traceroute result
type TraceRouteResult struct {
	Target      string          `json:"target"`
	TargetIP    string          `json:"targetIP"`
	TotalHops   int             `json:"totalHops"`
	Completed   bool            `json:"completed"`
	Hops        []TraceHop      `json:"hops"`
	Timestamp   time.Time       `json:"timestamp"`
	Duration    float64         `json:"duration"` // Total trace duration in ms
}

// TraceHop represents a single hop in a traceroute
type TraceHop struct {
	Hop       int       `json:"hop"`
	IP        string    `json:"ip"`
	Hostname  string    `json:"hostname,omitempty"`
	Latency1  float64   `json:"latency1"`  // First probe RTT in ms
	Latency2  float64   `json:"latency2"`  // Second probe RTT in ms
	Latency3  float64   `json:"latency3"`  // Third probe RTT in ms
	AvgLatency float64  `json:"avgLatency"` // Average RTT in ms
	Loss      int       `json:"loss"`      // Packet loss count (0-3)
	Timeout   bool      `json:"timeout"`   // All probes timed out
}

// ==================== NetPath Probe Types ====================

// NetPathProbe represents an active network path probe
type NetPathProbe struct {
	ID          string              `json:"id"`
	Target      string              `json:"target"`
	TargetIP    string              `json:"targetIP"`
	Status      string              `json:"status"` // "running", "stopped", "error"
	Interval    int                 `json:"interval"` // Probe interval in seconds
	StartedAt   time.Time           `json:"startedAt"`
	LastProbe   time.Time           `json:"lastProbe"`
	ProbeCount  int                 `json:"probeCount"`
	CurrentPath *NetPathResult      `json:"currentPath,omitempty"`
	History     []NetPathResult     `json:"history,omitempty"` // Last N results
	Config      NetPathConfig       `json:"config"`
}

// NetPathConfig holds probe configuration
type NetPathConfig struct {
	MaxHops       int     `json:"maxHops"`
	Timeout       int     `json:"timeout"`       // Timeout per hop in ms
	ProbesPerHop  int     `json:"probesPerHop"`
	HistorySize   int     `json:"historySize"`   // Number of historical samples to keep
}

// NetPathResult represents a single probe cycle result
type NetPathResult struct {
	Timestamp     time.Time        `json:"timestamp"`
	Duration      float64          `json:"duration"`      // Total probe duration in ms
	TotalLatency  float64          `json:"totalLatency"`  // End-to-end latency
	TotalHops     int              `json:"totalHops"`
	PacketLoss    float64          `json:"packetLoss"`    // Overall packet loss %
	Completed     bool             `json:"completed"`
	Hops          []NetPathHop     `json:"hops"`
	HasProblems   bool             `json:"hasProblems"`
	ProblemHops   []int            `json:"problemHops,omitempty"` // Indices of problem hops
}

// NetPathHop represents a hop with extended metrics
type NetPathHop struct {
	Hop           int       `json:"hop"`
	IP            string    `json:"ip"`
	Hostname      string    `json:"hostname,omitempty"`
	DeviceName    string    `json:"deviceName,omitempty"`  // Friendly device name
	DeviceType    string    `json:"deviceType,omitempty"`  // router, switch, firewall, server, gateway, cloud, unknown
	DeviceVendor  string    `json:"deviceVendor,omitempty"` // Cisco, Juniper, etc.
	ASN           string    `json:"asn,omitempty"`        // Autonomous System Number
	ISP           string    `json:"isp,omitempty"`        // ISP name
	Location      string    `json:"location,omitempty"`   // Geographic location hint
	
	// Latency metrics
	AvgLatency    float64   `json:"avgLatency"`
	MinLatency    float64   `json:"minLatency"`
	MaxLatency    float64   `json:"maxLatency"`
	Jitter        float64   `json:"jitter"`        // Latency variation
	Latencies     []float64 `json:"latencies"`     // All latency samples
	
	// Packet metrics
	PacketsSent   int       `json:"packetsSent"`
	PacketsRecv   int       `json:"packetsRecv"`
	PacketLoss    float64   `json:"packetLoss"`    // Percentage
	
	// Status
	Status        string    `json:"status"`        // "healthy", "warning", "critical", "timeout"
	IsBottleneck  bool      `json:"isBottleneck"`  // High latency jump from previous hop
	Timeout       bool      `json:"timeout"`
	
	// Historical
	LatencyTrend  string    `json:"latencyTrend,omitempty"` // "stable", "increasing", "decreasing"
}
