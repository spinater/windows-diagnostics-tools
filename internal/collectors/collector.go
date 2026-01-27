// Package collectors provides system metric collection functionality
package collectors

import (
	"context"
	"loadrunner-diagnosis/internal/models"
)

// Collector interface for all metric collectors
type Collector interface {
	Name() string
	Collect(ctx context.Context) error
}

// Manager manages all collectors and provides unified access
type Manager struct {
	tcp     *TCPCollector
	memory  *MemoryCollector
	cpu     *CPUCollector
	disk    *DiskCollector
	network *NetworkCollector
	process *ProcessCollector
}

// NewManager creates a new collector manager
func NewManager() (*Manager, error) {
	tcp, err := NewTCPCollector()
	if err != nil {
		return nil, err
	}

	memory, err := NewMemoryCollector()
	if err != nil {
		return nil, err
	}

	cpu, err := NewCPUCollector()
	if err != nil {
		return nil, err
	}

	disk, err := NewDiskCollector()
	if err != nil {
		return nil, err
	}

	network, err := NewNetworkCollector()
	if err != nil {
		return nil, err
	}

	process, err := NewProcessCollector()
	if err != nil {
		return nil, err
	}

	return &Manager{
		tcp:     tcp,
		memory:  memory,
		cpu:     cpu,
		disk:    disk,
		network: network,
		process: process,
	}, nil
}

// CollectAll collects all system metrics
func (m *Manager) CollectAll(ctx context.Context) (*models.SystemMetrics, error) {
	metrics := &models.SystemMetrics{}

	// Collect TCP metrics
	if tcp, err := m.tcp.Collect(ctx); err == nil {
		metrics.TCP = tcp
	}

	// Collect Memory metrics
	if mem, err := m.memory.Collect(ctx); err == nil {
		metrics.Memory = mem
	}

	// Collect CPU metrics
	if cpu, err := m.cpu.Collect(ctx); err == nil {
		metrics.CPU = cpu
	}

	// Collect Disk metrics
	if disk, err := m.disk.Collect(ctx); err == nil {
		metrics.Disk = disk
	}

	// Collect Network metrics
	if net, err := m.network.Collect(ctx); err == nil {
		metrics.Network = net
	}

	// Collect Process metrics
	if procs, err := m.process.Collect(ctx); err == nil {
		metrics.Processes = procs
	}

	return metrics, nil
}

// GetTCP returns TCP metrics
func (m *Manager) GetTCP(ctx context.Context) (*models.TCPMetrics, error) {
	return m.tcp.Collect(ctx)
}

// GetMemory returns Memory metrics
func (m *Manager) GetMemory(ctx context.Context) (*models.MemoryMetrics, error) {
	return m.memory.Collect(ctx)
}

// GetCPU returns CPU metrics
func (m *Manager) GetCPU(ctx context.Context) (*models.CPUMetrics, error) {
	return m.cpu.Collect(ctx)
}

// GetDisk returns Disk metrics
func (m *Manager) GetDisk(ctx context.Context) (*models.DiskMetrics, error) {
	return m.disk.Collect(ctx)
}

// GetNetwork returns Network metrics
func (m *Manager) GetNetwork(ctx context.Context) (*models.NetworkMetrics, error) {
	return m.network.Collect(ctx)
}

// GetProcesses returns Process metrics
func (m *Manager) GetProcesses(ctx context.Context) ([]models.ProcessInfo, error) {
	return m.process.Collect(ctx)
}
