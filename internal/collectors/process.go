//go:build windows
// +build windows

// Package collectors provides process metrics collection
package collectors

import (
	"context"
	"sort"
	"unsafe"

	"loadrunner-diagnosis/internal/models"

	"golang.org/x/sys/windows"
)

const (
	PROCESS_QUERY_INFORMATION = 0x0400
	PROCESS_VM_READ           = 0x0010
	MAX_PROCESSES             = 1024
)

// PROCESS_MEMORY_COUNTERS structure
type PROCESS_MEMORY_COUNTERS struct {
	Cb                         uint32
	PageFaultCount             uint32
	PeakWorkingSetSize         uint64
	WorkingSetSize             uint64
	QuotaPeakPagedPoolUsage    uint64
	QuotaPagedPoolUsage        uint64
	QuotaPeakNonPagedPoolUsage uint64
	QuotaNonPagedPoolUsage     uint64
	PagefileUsage              uint64
	PeakPagefileUsage          uint64
}

var (
	procEnumProcesses             = modpsapi.NewProc("EnumProcesses")
	procGetProcessMemoryInfo      = modpsapi.NewProc("GetProcessMemoryInfo")
	procQueryFullProcessImageNameW = modkernel32.NewProc("QueryFullProcessImageNameW")
)

// ProcessCollector collects process metrics
type ProcessCollector struct {
	totalMemory uint64
}

// NewProcessCollector creates a new process collector
func NewProcessCollector() (*ProcessCollector, error) {
	// Get total memory for percentage calculation
	var memStatus MEMORYSTATUSEX
	memStatus.Length = uint32(unsafe.Sizeof(memStatus))
	procGlobalMemoryStatusEx.Call(uintptr(unsafe.Pointer(&memStatus)))
	
	return &ProcessCollector{
		totalMemory: memStatus.TotalPhys,
	}, nil
}

// Name returns the collector name
func (c *ProcessCollector) Name() string {
	return "process"
}

// Collect gathers process metrics
func (c *ProcessCollector) Collect(ctx context.Context) ([]models.ProcessInfo, error) {
	// Enumerate processes
	pids := make([]uint32, MAX_PROCESSES)
	var bytesReturned uint32
	
	ret, _, _ := procEnumProcesses.Call(
		uintptr(unsafe.Pointer(&pids[0])),
		uintptr(len(pids)*4),
		uintptr(unsafe.Pointer(&bytesReturned)),
	)
	if ret == 0 {
		return nil, windows.GetLastError()
	}

	numProcesses := bytesReturned / 4
	processes := make([]models.ProcessInfo, 0, numProcesses)

	for i := uint32(0); i < numProcesses; i++ {
		pid := pids[i]
		if pid == 0 {
			continue
		}

		info := c.getProcessInfo(pid)
		if info != nil {
			processes = append(processes, *info)
		}
	}

	// Sort by memory usage (descending)
	sort.Slice(processes, func(i, j int) bool {
		return processes[i].MemoryBytes > processes[j].MemoryBytes
	})

	// Return top 50 processes
	if len(processes) > 50 {
		processes = processes[:50]
	}

	return processes, nil
}

// getProcessInfo gets information about a specific process
func (c *ProcessCollector) getProcessInfo(pid uint32) *models.ProcessInfo {
	// Open process
	handle, err := windows.OpenProcess(
		PROCESS_QUERY_INFORMATION|PROCESS_VM_READ,
		false,
		pid,
	)
	if err != nil {
		return nil
	}
	defer windows.CloseHandle(handle)

	// Get process name
	name := c.getProcessName(handle)
	if name == "" {
		name = "Unknown"
	}

	// Get memory info
	var memCounters PROCESS_MEMORY_COUNTERS
	memCounters.Cb = uint32(unsafe.Sizeof(memCounters))
	
	ret, _, _ := procGetProcessMemoryInfo.Call(
		uintptr(handle),
		uintptr(unsafe.Pointer(&memCounters)),
		uintptr(memCounters.Cb),
	)
	
	memoryBytes := uint64(0)
	if ret != 0 {
		memoryBytes = memCounters.WorkingSetSize
	}

	memoryPercent := float64(0)
	if c.totalMemory > 0 {
		memoryPercent = float64(memoryBytes) / float64(c.totalMemory) * 100
	}

	return &models.ProcessInfo{
		PID:           pid,
		Name:          name,
		MemoryBytes:   memoryBytes,
		MemoryPercent: memoryPercent,
	}
}

// getProcessName gets the name of a process
func (c *ProcessCollector) getProcessName(handle windows.Handle) string {
	var buf [windows.MAX_PATH]uint16
	size := uint32(len(buf))
	
	ret, _, _ := procQueryFullProcessImageNameW.Call(
		uintptr(handle),
		0,
		uintptr(unsafe.Pointer(&buf[0])),
		uintptr(unsafe.Pointer(&size)),
	)
	
	if ret == 0 {
		return ""
	}

	fullPath := windows.UTF16ToString(buf[:size])
	
	// Extract just the filename
	for i := len(fullPath) - 1; i >= 0; i-- {
		if fullPath[i] == '\\' {
			return fullPath[i+1:]
		}
	}
	return fullPath
}
