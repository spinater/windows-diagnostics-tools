# Disk I/O Knowledge

## Overview

Disk performance monitoring for Windows Server storage diagnosis.

## Key Metrics

### Throughput
- Read bytes/sec
- Write bytes/sec
- Total throughput

### IOPS
- Reads/sec
- Writes/sec
- Total IOPS

### Latency
- Average read latency (ms)
- Average write latency (ms)
- Queue depth

## Windows APIs

- Performance counter `\PhysicalDisk(*)\*`
- Performance counter `\LogicalDisk(*)\*`
- WMI `Win32_PerfRawData_PerfDisk_PhysicalDisk`

## Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Queue Depth | > 2 | > 10 |
| Read Latency | > 10ms | > 50ms |
| Write Latency | > 10ms | > 50ms |
| Disk Utilization | > 70% | > 90% |

## LoadRunner Correlation

- High queue depth → Database bottleneck
- High latency → Slow file operations
- I/O spikes → Batch job interference
