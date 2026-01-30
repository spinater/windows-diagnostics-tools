//go:build windows
// +build windows

// Package collectors provides disk I/O metrics collection
package collectors

import (
	"context"
	"fmt"
	"unsafe"

	"loadrunner-diagnosis/internal/models"

	"golang.org/x/sys/windows"
)

var (
	diskKernel32            = windows.NewLazySystemDLL("kernel32.dll")
	procGetDiskFreeSpaceExW = diskKernel32.NewProc("GetDiskFreeSpaceExW")
	procGetLogicalDrives    = diskKernel32.NewProc("GetLogicalDrives")
)

// DiskCollector collects disk I/O metrics
type DiskCollector struct{}

// NewDiskCollector creates a new disk collector
func NewDiskCollector() (*DiskCollector, error) {
	// Verify DLL and procs are available
	if err := diskKernel32.Load(); err != nil {
		return nil, fmt.Errorf("failed to load kernel32.dll: %w", err)
	}
	if err := procGetDiskFreeSpaceExW.Find(); err != nil {
		return nil, fmt.Errorf("GetDiskFreeSpaceExW not found: %w", err)
	}
	if err := procGetLogicalDrives.Find(); err != nil {
		return nil, fmt.Errorf("GetLogicalDrives not found: %w", err)
	}
	return &DiskCollector{}, nil
}

// Name returns the collector name
func (c *DiskCollector) Name() string {
	return "disk"
}

// Collect gathers disk metrics
func (c *DiskCollector) Collect(ctx context.Context) (*models.DiskMetrics, error) {
	metrics := &models.DiskMetrics{
		Disks: []models.DiskInfo{},
	}

	// Safety check
	if c == nil {
		return metrics, fmt.Errorf("disk collector is nil")
	}

	// Get logical drives
	drives, err := c.getLogicalDrives()
	if err != nil {
		return metrics, err
	}

	for _, drive := range drives {
		info, err := c.getDriveInfo(drive)
		if err != nil {
			continue
		}
		if info != nil {
			metrics.Disks = append(metrics.Disks, *info)
		}
	}

	return metrics, nil
}

// getLogicalDrives returns a list of available drive letters
func (c *DiskCollector) getLogicalDrives() ([]string, error) {
	ret, _, _ := procGetLogicalDrives.Call()
	if ret == 0 {
		return nil, windows.GetLastError()
	}

	var drives []string
	for i := 0; i < 26; i++ {
		if ret&(1<<uint(i)) != 0 {
			drives = append(drives, string(rune('A'+i))+":\\")
		}
	}
	return drives, nil
}

// getDriveInfo gets information about a specific drive
func (c *DiskCollector) getDriveInfo(drive string) (*models.DiskInfo, error) {
	drivePtr, err := windows.UTF16PtrFromString(drive)
	if err != nil {
		return nil, err
	}

	var freeBytesAvailable, totalBytes, totalFreeBytes uint64
	
	ret, _, _ := procGetDiskFreeSpaceExW.Call(
		uintptr(unsafe.Pointer(drivePtr)),
		uintptr(unsafe.Pointer(&freeBytesAvailable)),
		uintptr(unsafe.Pointer(&totalBytes)),
		uintptr(unsafe.Pointer(&totalFreeBytes)),
	)
	
	if ret == 0 {
		return nil, windows.GetLastError()
	}

	usedBytes := totalBytes - totalFreeBytes
	usedPercent := float64(0)
	if totalBytes > 0 {
		usedPercent = float64(usedBytes) / float64(totalBytes) * 100
	}

	return &models.DiskInfo{
		Name:        drive,
		TotalBytes:  totalBytes,
		FreeBytes:   totalFreeBytes,
		UsedPercent: usedPercent,
	}, nil
}
