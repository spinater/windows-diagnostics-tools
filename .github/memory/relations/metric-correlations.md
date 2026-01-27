# Metric Correlations

## Overview

Relationships between different metrics for root cause analysis.

## Correlation Patterns

### High CPU + Slow Transactions
- **Pattern**: CPU > 80% correlates with increased response times
- **Root Cause**: Processing bottleneck
- **Action**: Identify hot processes, optimize code

### Memory Pressure + TCP Issues
- **Pattern**: Low available memory often precedes TCP zero windows
- **Root Cause**: Application buffers not being processed
- **Action**: Check memory-intensive processes

### Disk Queue + Latency
- **Pattern**: Disk queue depth > 2 correlates with I/O wait
- **Root Cause**: Storage bottleneck
- **Action**: Review I/O patterns, consider SSD

### Network Retransmissions + LoadRunner Errors
- **Pattern**: High retransmissions correlate with transaction failures
- **Root Cause**: Network instability or congestion
- **Action**: Check network path, switch ports, NIC settings

## Visualization Recommendations

- Use time-series overlay for correlation
- Highlight anomaly periods
- Show metric pairs side-by-side
- Include LoadRunner transaction overlay
