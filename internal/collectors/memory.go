//go:build windows
// +build windows

// Package collectors provides memory metrics collection
package collectors

import (
	"context"
	"unsafe"

	"loadrunner-diagnosis/internal/models"

	"golang.org/x/sys/windows"
)

// MEMORYSTATUSEX structure
type MEMORYSTATUSEX struct {
	Length               uint32
	MemoryLoad           uint32
	TotalPhys            uint64
	AvailPhys            uint64
	TotalPageFile        uint64
	AvailPageFile        uint64
	TotalVirtual         uint64
	AvailVirtual         uint64
	AvailExtendedVirtual uint64
}

// PERFORMANCE_INFORMATION structure
type PERFORMANCE_INFORMATION struct {
	Size                  uint32
	CommitTotal           uint64
	CommitLimit           uint64
	CommitPeak            uint64
	PhysicalTotal         uint64
	PhysicalAvailable     uint64
	SystemCache           uint64
	KernelTotal           uint64
	KernelPaged           uint64
	KernelNonpaged        uint64
	PageSize              uint64
	HandleCount           uint32
	ProcessCount          uint32
	ThreadCount           uint32
}

var (
	modkernel32              = windows.NewLazySystemDLL("kernel32.dll")
	modpsapi                 = windows.NewLazySystemDLL("psapi.dll")
	procGlobalMemoryStatusEx = modkernel32.NewProc("GlobalMemoryStatusEx")
	procGetPerformanceInfo   = modpsapi.NewProc("GetPerformanceInfo")
)

// MemoryCollector collects memory metrics
type MemoryCollector struct {
	lastPageFaults uint64
}

// NewMemoryCollector creates a new memory collector
func NewMemoryCollector() (*MemoryCollector, error) {
	return &MemoryCollector{}, nil
}

// Name returns the collector name
func (c *MemoryCollector) Name() string {
	return "memory"
}

// Collect gathers memory metrics
func (c *MemoryCollector) Collect(ctx context.Context) (*models.MemoryMetrics, error) {
	metrics := &models.MemoryMetrics{}

	// Get memory status
	var memStatus MEMORYSTATUSEX
	memStatus.Length = uint32(unsafe.Sizeof(memStatus))
	
	ret, _, _ := procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&memStatus)))
	if ret != 0 {
		metrics.TotalPhysical = memStatus.TotalPhys
		metrics.AvailablePhysical = memStatus.AvailPhys
		metrics.UsedPhysical = memStatus.TotalPhys - memStatus.AvailPhys
		metrics.UsedPercent = float64(memStatus.MemoryLoad)
		
		metrics.TotalPageFile = memStatus.TotalPageFile
		metrics.AvailablePageFile = memStatus.AvailPageFile
		metrics.UsedPageFile = memStatus.TotalPageFile - memStatus.AvailPageFile
	}

	// Get performance info for commit and cache
	var perfInfo PERFORMANCE_INFORMATION
	perfInfo.Size = uint32(unsafe.Sizeof(perfInfo))
	
	ret, _, _ = procGetPerformanceInfo.Call(
		uintptr(unsafe.Pointer(&perfInfo)),
		uintptr(perfInfo.Size),
	)
	if ret != 0 {
		pageSize := perfInfo.PageSize
		metrics.CommittedBytes = perfInfo.CommitTotal * pageSize
		metrics.CommitLimit = perfInfo.CommitLimit * pageSize
		metrics.CacheBytes = perfInfo.SystemCache * pageSize
		
		if metrics.CommitLimit > 0 {
			metrics.CommitPercent = float64(metrics.CommittedBytes) / float64(metrics.CommitLimit) * 100
		}
	}

	return metrics, nil
}
