# CPU Monitoring Knowledge

## Overview

CPU analysis for Windows Server performance diagnosis.

## Key Metrics

### Overall CPU
- Total CPU utilization %
- User mode vs Kernel mode
- Idle percentage
- Interrupt time

### Per-Core Analysis
- Individual core utilization
- Core parking status
- NUMA node distribution

### Process CPU
- Process CPU time
- Thread count per process
- CPU affinity

## Windows APIs

- `GetSystemTimes()` - Overall CPU times
- Performance counter `\Processor(_Total)\% Processor Time`
- Per-core: `\Processor(0)\% Processor Time`
- WMI `Win32_PerfRawData_PerfOS_Processor`

## Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| CPU Total | > 70% | > 90% |
| Kernel Time | > 30% | > 50% |
| Single Core | > 95% | 100% (pinned) |

## LoadRunner Correlation

- High CPU often correlates with slow response times
- Kernel time spikes may indicate driver/network issues
- Single core pinning suggests non-parallelized code
