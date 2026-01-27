# Task: UI Dashboard Features Planning

**Status:** In Progress
**Created:** 2026-01-26
**Assigned:** Copilot
**Priority:** High

## Requirements

- Design comprehensive dashboard for Windows server diagnosis
- Support LoadRunner test analysis correlation
- **Real-time monitoring with "Start System" button**
- Single executable deployment

---

## 🚀 "Start System" Real-Time Monitoring Mode

When user clicks **"Start System"** button:
1. Begin collecting all metrics at configurable interval (default: 1 second)
2. Stream data via WebSocket to dashboard
3. All 10 sections update in real-time
4. Show elapsed time and collection status
5. "Stop System" button to pause collection
6. Data retained for session analysis

### Real-Time Collection Flow
```
[Start System] → Timer Loop (1s) → Collect All Metrics → WebSocket Push → UI Update
                      ↓
              Store in Memory Buffer (configurable retention: 1hr default)
```

---

## UI Dashboard Sections

### 1. Overview Dashboard
- [ ] System health summary (CPU, Memory, Disk, Network at-a-glance)
- [ ] Active alerts and warnings
- [ ] Server uptime and basic info
- [ ] Quick status indicators (green/yellow/red)

### 2. TCP/Network Analysis Panel ⭐ (Primary Feature)
- [ ] **TCP Zero Windows Detection** - Real-time counter + history graph
  - Detect via `GetTcpStatistics()` and connection monitoring
  - Show which connections have zero window
  - Alert when zero window events spike
  - **Note: Detects server-side issue, independent of LoadRunner**
- [ ] **Connection States** - Pie chart of ESTABLISHED, TIME_WAIT, CLOSE_WAIT, etc.
  - High CLOSE_WAIT = App not closing connections (your scenario!)
  - High TIME_WAIT = Connection churn
- [ ] **Unclosed Connections Detection** - Connections stuck in CLOSE_WAIT
  - Shows if application (or LR script target) isn't closing properly
- [ ] **Retransmission Rate** - Line chart over time
- [ ] **Active Connections Table** - Sortable list with PID, local/remote address, state, **window size**
- [ ] **Port Usage** - Top ports by connection count
- [ ] **Connection Rate** - New connections per second
- [ ] **Half-Open Connections** - SYN_RECV without completing handshake

### 3. Memory Analysis Panel
- [ ] **Physical Memory** - Used vs Available (gauge chart)
- [ ] **Memory Trend** - Line chart over time
- [ ] **Page File Usage** - Current and historical
- [ ] **Page Faults/sec** - Line chart (hard vs soft)
- [ ] **Top Memory Consumers** - Bar chart by process
- [ ] **Memory Leak Detection** - Processes with growing memory

### 4. CPU Analysis Panel
- [ ] **Overall CPU Usage** - Gauge chart
- [ ] **Per-Core Utilization** - Multi-line chart
- [ ] **CPU Over Time** - Historical trend
- [ ] **Top CPU Consumers** - Bar chart by process
- [ ] **Kernel vs User Time** - Stacked area chart
- [ ] **Context Switches/sec** - Line chart

### 5. Disk I/O Panel
- [ ] **Disk Queue Depth** - Gauge per disk
- [ ] **Read/Write Throughput** - Line chart (MB/s)
- [ ] **IOPS** - Reads/Writes per second
- [ ] **Disk Latency** - Average read/write latency
- [ ] **Per-Disk Breakdown** - Tab or dropdown selector
- [ ] **Top I/O Processes** - Ranked list

### 6. Network Interface Panel ⭐ (Buffer Capacity Added)
- [ ] **Bandwidth Utilization** - Per interface (used vs total capacity)
- [ ] **Buffer Usage Visualization**:
  - **Receive Buffer**: Available vs Used (gauge chart)
  - **Send Buffer**: Available vs Used (gauge chart)
  - **Interface Queue Length**: Current vs Max capacity
  - **Buffer Overflow Events**: Counter with alerts
- [ ] **Bytes Sent/Received** - Line chart
- [ ] **Packets/sec** - Line chart
- [ ] **Errors and Drops** - Counter with alerts (indicates buffer overflow)
- [ ] **Interface Status** - Up/Down indicators
- [ ] **NIC Settings** - Speed, duplex, offload settings

### 7. Process Monitor
- [ ] **Top Processes Table** - Sortable by CPU, Memory, I/O
- [ ] **Process Timeline** - Start/stop events
- [ ] **Process Details** - Click to expand (threads, handles, modules)
- [ ] **Process Search** - Filter by name or PID

### 8. LoadRunner Integration Panel
- [ ] **Transaction Import** - Upload/parse LoadRunner results
- [ ] **Transaction Timeline** - Overlay on resource graphs
- [ ] **Response Time Correlation** - Match slowdowns to resource spikes
- [ ] **Error Correlation** - Match LR errors to system events
- [ ] **Vuser Activity** - Concurrent users over time

### 9. Alerts & Recommendations
- [ ] **Active Alerts** - Real-time threshold violations
- [ ] **Alert History** - Timeline of past alerts
- [ ] **Recommendations** - AI-suggested actions based on patterns
- [ ] **Threshold Configuration** - Customizable warning/critical levels

### 10. Report Generation
- [ ] **Export to HTML** - Standalone report file
- [ ] **Export to PDF** - Print-ready format
- [ ] **Time Range Selection** - Custom report period
- [ ] **Metric Selection** - Choose what to include

## Technical Implementation Plan

### "Start System" Button Implementation
```
┌──────────────────────────────────────────────────────────────┐
│  LoadRunner Diagnosis Tool                                    │
├──────────────────────────────────────────────────────────────┤
│  [▶ Start System]  [⏹ Stop]  Interval: [1s ▼]  ⏱ 00:05:23   │
├──────────────────────────────────────────────────────────────┤
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐            │
│  │ CPU 45% │ │ MEM 72% │ │ NET 30% │ │ DISK 5% │            │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘            │
├──────────────────────────────────────────────────────────────┤
│  [Overview] [TCP/Network] [Memory] [CPU] [Disk] [Processes]  │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   📊 Real-time charts update every interval                  │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### WebSocket Message Flow
```go
// When "Start System" clicked:
POST /api/monitoring/start  → Start collection goroutine
WS   /ws/metrics           → Client subscribes to updates

// Every interval (1s default):
Collector → Metrics → WebSocket Broadcast → All connected UIs

// When "Stop" clicked:
POST /api/monitoring/stop  → Stop collection goroutine
```

### Data Collection Layer
1. TCP Collector - netstat, GetTcpTable2, GetTcpStatistics, WMI
2. Memory Collector - GlobalMemoryStatusEx, WMI
3. CPU Collector - Performance counters, WMI
4. Disk Collector - Performance counters, WMI
5. Network Collector - GetIfTable, GetIfEntry2, performance counters
6. Process Collector - EnumProcesses, QueryProcessInfo
7. Buffer Collector - Socket options, interface queue stats

### API Endpoints
- `POST /api/monitoring/start` - Start real-time collection
- `POST /api/monitoring/stop` - Stop collection
- `GET /api/monitoring/status` - Collection status
- `GET /api/metrics/tcp` - TCP statistics + zero windows + connection states
- `GET /api/metrics/memory` - Memory statistics
- `GET /api/metrics/cpu` - CPU statistics
- `GET /api/metrics/disk` - Disk statistics
- `GET /api/metrics/network` - Network + buffer capacity
- `GET /api/metrics/processes` - Process list
- `GET /api/metrics/all` - All metrics snapshot
- `WS /ws/metrics` - Real-time WebSocket stream
- `POST /api/loadrunner/upload` - Import LR results
- `GET /api/loadrunner/correlate` - Correlation data

### Frontend Technology
- Embedded HTML/CSS/JS (single .exe)
- Chart.js for visualizations
- WebSocket for real-time updates
- Responsive design for various screen sizes
- Dark mode support

## Progress

- [x] Define UI sections
- [x] List metrics to collect  
- [x] Define real-time "Start System" concept
- [x] Clarify zero window detection (server-side, YES we can!)
- [x] Add buffer capacity visualization
- [ ] Design wireframes
- [ ] Implement collectors
- [ ] Implement API
- [ ] Build frontend
- [ ] Integration testing

## Key Clarifications

### ✅ TCP Zero Windows - YES, We Detect This!
- Zero windows are a SERVER-SIDE metric
- We detect when the server's receive buffer is full
- Independent of LoadRunner - we monitor the server

### ✅ Unclosed Connections - YES, We Detect This!
- CLOSE_WAIT state = Application didn't close the socket
- We show which process owns unclosed connections
- Alert when CLOSE_WAIT count grows

### ✅ Buffer Capacity - YES, We Show This!
- Receive/Send buffer usage per interface
- Interface queue length vs capacity
- Discarded packets (buffer overflow indicator)

## Notes

- Priority: TCP Zero Windows analysis (most requested feature)
- Consider dark mode for server room viewing
- Mobile-responsive for monitoring on the go
- Export all data for offline analysis
