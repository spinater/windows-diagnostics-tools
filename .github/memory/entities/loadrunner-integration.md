# LoadRunner Integration Knowledge

## Overview

Parse and correlate LoadRunner test results with server metrics.

## Supported File Formats

### LRA (LoadRunner Analysis)
- Transaction response times
- Error events
- Vuser activity
- Throughput data

### Raw Results
- Summary.xml
- output.mdb (Access database)
- Raw log files

## Key Data Points to Extract

### Transactions
- Transaction name
- Start/end timestamp
- Response time (avg, min, max, 90th percentile)
- Pass/fail status

### Vusers
- Concurrent users over time
- Ramp-up pattern
- User distribution

### Errors
- Error timestamp
- Error message
- Transaction context
- Vuser ID

## Correlation Logic

### Time Alignment
1. Parse LoadRunner timestamps
2. Convert to server local time (handle timezone)
3. Match with metric collection timestamps
4. Allow for time skew (configurable tolerance)

### Event Correlation
- Map slow transactions to resource spikes
- Map errors to system events
- Calculate correlation coefficients

## Visualization

- Transaction overlay on metric charts
- Error markers on timeline
- Vuser count as secondary axis
- Correlation heatmap
