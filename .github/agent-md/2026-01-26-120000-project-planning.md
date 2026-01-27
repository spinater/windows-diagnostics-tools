# Agent Documentation: Project Planning

**Generated:** 2026-01-26-120000
**Topic:** Initial Project Planning and UI Feature List

## Project Goals

Create a single-executable Windows server diagnosis tool focused on:

1. **LoadRunner Test Correlation** - Correlate server metrics with LoadRunner test results
2. **TCP Zero Window Detection** - Primary feature for network bottleneck identification
3. **Comprehensive Resource Monitoring** - CPU, Memory, Disk, Network in one view
4. **Actionable Insights** - Not just data, but recommendations

## Key Differentiators

- Single .exe file - no installation required
- Embedded web UI - no browser plugins needed
- LoadRunner-specific analysis
- Real-time + historical views
- Windows Server optimized

## UI Design Principles

1. **Dashboard First** - Overview visible immediately
2. **Drill-Down Capable** - Click to explore details
3. **Time Correlation** - All metrics share time axis
4. **Alert Driven** - Highlight anomalies automatically
5. **Export Ready** - Generate shareable reports

## Metric Categories

### Network/TCP (Primary Focus)
- Zero Window events
- Connection states distribution
- Retransmission rate
- Port exhaustion detection
- Connection table

### System Resources
- CPU utilization (total + per-core)
- Memory usage (physical + virtual)
- Disk I/O (throughput + latency)
- Process resource consumption

### LoadRunner Correlation
- Transaction response times overlay
- Error events overlay
- Vuser count overlay
- Throughput correlation

## Technology Decisions

| Component | Choice | Rationale |
|-----------|--------|-----------|
| Language | Go | Single binary, good Windows support |
| UI | Embedded web | Universal, no dependencies |
| Charts | Chart.js | Lightweight, feature-rich |
| Real-time | WebSocket | Low latency updates |
| Data Collection | WMI + Win32 API | Native Windows integration |

## Next Steps

1. Set up Go project structure
2. Implement TCP collector first
3. Build basic web server
4. Create dashboard wireframe
5. Add remaining collectors
6. LoadRunner parser integration
