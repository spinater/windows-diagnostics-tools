# Network Metrics Knowledge

## Overview

Network interface and bandwidth monitoring for Windows Server.

## ⭐ Buffer Capacity Visualization (User Request)

### What We Can Show

| Metric | Description | How to Get |
|--------|-------------|------------|
| **Receive Buffer Size** | TCP receive buffer per socket | `getsockopt(SO_RCVBUF)` |
| **Send Buffer Size** | TCP send buffer per socket | `getsockopt(SO_SNDBUF)` |
| **Interface Output Queue** | Packets waiting to transmit | WMI/Performance Counter |
| **Interface Input Queue** | Packets waiting to process | WMI/Performance Counter |
| **Available Buffer %** | (Total - Used) / Total * 100 | Calculated |

### Buffer-Related Metrics

```
\Network Interface(*)\Output Queue Length
\Network Interface(*)\Packets Outbound Discarded  (buffer full!)
\Network Interface(*)\Packets Received Discarded  (buffer full!)
```

### Visual Representation
```
┌─────────────────────────────────────────┐
│ Receive Buffer                          │
│ ████████████░░░░░░░░  60% Used (24KB/40KB) │
├─────────────────────────────────────────┤
│ Send Buffer                             │
│ ██████░░░░░░░░░░░░░░  30% Used (12KB/40KB) │
├─────────────────────────────────────────┤
│ Interface Queue                         │
│ ██░░░░░░░░░░░░░░░░░░  10% Used (5/50)   │
└─────────────────────────────────────────┘
```

## Key Metrics

### Interface Statistics
- Bytes sent/received
- Packets sent/received
- Errors (inbound/outbound)
- Discards
- Interface speed

### Bandwidth
- Current throughput (Mbps)
- Utilization percentage
- Peak throughput

## Windows APIs

- `GetIfTable()` / `GetIfTable2()` - Interface table
- Performance counter `\Network Interface(*)\*`
- WMI `Win32_PerfRawData_Tcpip_NetworkInterface`

## Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Bandwidth Utilization | > 70% | > 90% |
| Packet Errors | > 0.1% | > 1% |
| Discards | > 100/min | > 1000/min |

## LoadRunner Correlation

- Bandwidth saturation → Throughput plateau
- Packet errors → Transaction failures
- High latency → Response time increase
