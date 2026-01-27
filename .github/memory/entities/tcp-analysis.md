# TCP Analysis Knowledge

## Overview

TCP connection analysis for LoadRunner diagnosis focusing on:
- Zero Window detection (SERVER-SIDE - we detect this!)
- Connection state monitoring
- Unclosed connection detection
- Retransmission tracking

## ⭐ Key Point: Zero Windows are Detected Server-Side

**Zero windows occur on the RECEIVER side** when:
1. The application isn't reading data fast enough
2. Receive buffer fills up
3. TCP advertises Window Size = 0

**We CAN detect this from our tool** regardless of what LoadRunner does because:
- It's a SERVER metric, not a client metric
- We monitor the server's TCP stack
- LoadRunner is just the traffic generator

## Detection Methods

### Method 1: TCP Statistics API
```go
// GetTcpStatistics() returns MIB_TCPSTATS
// Includes: RcvWinZeroProbes, RcvWinZeroProbesFailed
```

### Method 2: Extended TCP Table
```go
// GetTcpTable2() returns connection details
// We can check each connection's window size
```

### Method 3: netstat parsing
```bash
netstat -s  # Shows protocol statistics including zero window events
netstat -ano # Shows all connections with state
```

### Method 4: WMI Performance Counters
```
Win32_PerfRawData_Tcpip_TCPv4
- ConnectionsActive
- ConnectionsPassive  
- ConnectionFailures
- SegmentsRetransmittedPerSec
```

## Key Metrics

### TCP Zero Window
- **What**: Receiver advertises zero bytes available in receive buffer
- **Cause**: Application not reading data fast enough
- **Impact**: Sender stops transmitting, causing throughput collapse
- **Detection**: Parse netstat output or use Windows TCP statistics API

### TCP States
- ESTABLISHED: Active connections
- TIME_WAIT: Connections waiting to close (can accumulate)
- CLOSE_WAIT: Waiting for application to close ⚠️
- SYN_SENT/SYN_RECV: Connection establishment

### ⭐ Unclosed Connection Detection (User Scenario)

**Problem**: LoadRunner script (or target app) not closing connections properly

**What We Detect:**
| State | Meaning | Problem Indicator |
|-------|---------|-------------------|
| `CLOSE_WAIT` | Remote closed, local didn't | **App not calling close()** |
| `TIME_WAIT` | Normal close, waiting | High count = connection churn |
| `FIN_WAIT_2` | Local closed, remote didn't | Remote app issue |

**Detection Logic:**
```go
// Alert if CLOSE_WAIT connections > threshold
// Alert if CLOSE_WAIT connections growing over time
// Show which process owns the unclosed connections
```

**This answers your question:** Yes, we can detect if connections aren't being closed properly!

### Retransmissions
- High retransmission rate indicates network issues
- Correlates with latency spikes in LoadRunner

## Windows APIs

- `GetTcpStatistics()` - TCP protocol statistics
- `GetTcpTable2()` - TCP connection table
- `netstat -s` - Protocol statistics
- WMI `Win32_PerfRawData_Tcpip_TCPv4`

## LoadRunner Correlation

Map TCP issues to LoadRunner transaction times:
- Zero windows → Transaction delays
- Retransmissions → Response time variance
- Connection exhaustion → Failed transactions
