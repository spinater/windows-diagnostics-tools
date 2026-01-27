# Memory Diagnostics Knowledge

## Overview

Windows memory analysis for performance diagnosis.

## Key Metrics

### Physical Memory
- Total RAM
- Available RAM
- Committed memory
- Cache size

### Virtual Memory
- Page file usage
- Page faults/sec
- Hard vs soft page faults

### Process Memory
- Working set
- Private bytes
- Virtual bytes
- Memory leaks detection

## Windows APIs

- `GlobalMemoryStatusEx()` - Memory status
- WMI `Win32_OperatingSystem` - OS memory info
- WMI `Win32_PerfRawData_PerfOS_Memory` - Memory counters
- Performance counters: `\Memory\*`

## Warning Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Available Memory | < 20% | < 10% |
| Page Faults/sec | > 1000 | > 5000 |
| Committed % | > 80% | > 95% |
