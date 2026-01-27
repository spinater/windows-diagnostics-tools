//go:build windows
// +build windows

// Package collectors provides CPU metrics collection
package collectors

import (
	"context"
	"runtime"
	"sync"
	"time"
	"unsafe"

	"loadrunner-diagnosis/internal/models"

	"golang.org/x/sys/windows"
)

var (
	procGetSystemTimes = modkernel32.NewProc("GetSystemTimes")
)

// CPUCollector collects CPU metrics
type CPUCollector struct {
	mu             sync.RWMutex
	lastIdle       uint64
	lastKernel     uint64
	lastUser       uint64
	lastCollect    time.Time
	coreCount      int
}

// NewCPUCollector creates a new CPU collector
func NewCPUCollector() (*CPUCollector, error) {
	c := &CPUCollector{
		coreCount: runtime.NumCPU(),
	}
	// Initialize baseline
	c.getSystemTimes()
	c.lastCollect = time.Now()
	time.Sleep(100 * time.Millisecond) // Brief pause for initial reading
	return c, nil
}

// Name returns the collector name
func (c *CPUCollector) Name() string {
	return "cpu"
}

// Collect gathers CPU metrics
func (c *CPUCollector) Collect(ctx context.Context) (*models.CPUMetrics, error) {
	c.mu.Lock()
	defer c.mu.Unlock()

	metrics := &models.CPUMetrics{
		CoreCount: c.coreCount,
	}

	// Get current system times
	idle, kernel, user, err := c.getSystemTimes()
	if err != nil {
		return metrics, err
	}

	// Calculate deltas
	now := time.Now()
	elapsed := now.Sub(c.lastCollect).Seconds()
	if elapsed < 0.1 {
		elapsed = 0.1 // Minimum interval
	}

	idleDelta := float64(idle - c.lastIdle)
	kernelDelta := float64(kernel - c.lastKernel)
	userDelta := float64(user - c.lastUser)
	
	// Kernel time includes idle time, so subtract it
	kernelDelta = kernelDelta - idleDelta
	
	totalDelta := kernelDelta + userDelta + idleDelta
	
	if totalDelta > 0 {
		metrics.IdlePercent = (idleDelta / totalDelta) * 100
		metrics.KernelPercent = (kernelDelta / totalDelta) * 100
		metrics.UserPercent = (userDelta / totalDelta) * 100
		metrics.TotalPercent = 100 - metrics.IdlePercent
	}

	// Update last values
	c.lastIdle = idle
	c.lastKernel = kernel
	c.lastUser = user
	c.lastCollect = now

	// Per-core metrics would require additional API calls
	// For now, estimate based on total (simplified)
	metrics.PerCorePercent = make([]float64, c.coreCount)
	for i := 0; i < c.coreCount; i++ {
		metrics.PerCorePercent[i] = metrics.TotalPercent // Simplified
	}

	return metrics, nil
}

// getSystemTimes retrieves system CPU times
func (c *CPUCollector) getSystemTimes() (idle, kernel, user uint64, err error) {
	var idleTime, kernelTime, userTime windows.Filetime
	
	ret, _, callErr := procGetSystemTimes.Call(
		uintptr(unsafe.Pointer(&idleTime)),
		uintptr(unsafe.Pointer(&kernelTime)),
		uintptr(unsafe.Pointer(&userTime)),
	)
	
	if ret == 0 {
		return 0, 0, 0, callErr
	}
	
	idle = uint64(idleTime.HighDateTime)<<32 | uint64(idleTime.LowDateTime)
	kernel = uint64(kernelTime.HighDateTime)<<32 | uint64(kernelTime.LowDateTime)
	user = uint64(userTime.HighDateTime)<<32 | uint64(userTime.LowDateTime)
	
	return idle, kernel, user, nil
}
