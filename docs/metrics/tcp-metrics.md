# TCP Metrics

## Overview

TCP connection metrics are critical for diagnosing network-related performance issues in LoadRunner tests.

## Metrics Collected

### TCP Zero Windows

| Metric | Description | Unit |
|--------|-------------|------|
| `tcp.zero_window.count` | Number of zero window events | count |
| `tcp.zero_window.connections` | Connections experiencing zero window | list |
| `tcp.zero_window.rate` | Zero window events per second | events/s |

**Interpretation:**
- Zero windows indicate receiver buffer full
- Application not processing incoming data fast enough
- Correlates with transaction delays in LoadRunner

### Connection States

| Metric | Description |
|--------|-------------|
| `tcp.state.established` | Active connections |
| `tcp.state.time_wait` | Connections in TIME_WAIT |
| `tcp.state.close_wait` | Waiting for app to close |
| `tcp.state.syn_sent` | Outgoing connections pending |
| `tcp.state.listen` | Listening sockets |

**Interpretation:**
- High TIME_WAIT: Connection churn, may exhaust ports
- High CLOSE_WAIT: Application not closing connections properly

### TCP Statistics

| Metric | Description | Unit |
|--------|-------------|------|
| `tcp.retransmissions` | Packets retransmitted | count |
| `tcp.retransmission_rate` | Retransmission rate | % |
| `tcp.connections.active` | Active connection opens | count |
| `tcp.connections.passive` | Passive connection opens | count |
| `tcp.segments.sent` | Segments sent | count |
| `tcp.segments.received` | Segments received | count |

## Thresholds

| Metric | Warning | Critical |
|--------|---------|----------|
| Zero Windows | > 10/min | > 50/min |
| Retransmission Rate | > 1% | > 5% |
| TIME_WAIT Connections | > 1000 | > 5000 |

## LoadRunner Correlation

- Map zero windows to transaction response times
- Correlate retransmissions with failed transactions
- Track connection states during load ramp-up
