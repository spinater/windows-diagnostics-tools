# LoadRunner Diagnosis Tool

A Windows Server resource diagnosis tool built in Go, designed to analyze and visualize system performance metrics for LoadRunner test analysis.

## Features

- **TCP Connection Analysis**: Zero window detection, connection states, retransmissions
- **Memory Diagnostics**: RAM usage, paging, memory leaks detection
- **CPU Analysis**: Per-core utilization, process CPU consumption
- **Network Performance**: Bandwidth, latency, packet loss
- **Disk I/O**: Read/write throughput, queue depth, IOPS
- **Real-time Dashboard**: Live metrics visualization via web UI
- **LoadRunner Integration**: Parse and correlate LoadRunner output files

## Quick Start

### Build

```bash
go build -o loadrunner-diagnosis.exe ./cmd/main.go
```

### Run

```bash
./loadrunner-diagnosis.exe
```

Then open http://localhost:8080 in your browser.

### Command Line Options

```bash
./loadrunner-diagnosis.exe -port 8080          # Custom port
./loadrunner-diagnosis.exe -analyze <path>     # Analyze LoadRunner files
./loadrunner-diagnosis.exe -headless           # API only mode
```

## Requirements

- Windows Server 2016/2019/2022
- Go 1.21+ (for building)

## Project Structure

```
loadRunnerDiagnosis/
├── cmd/main.go              # Entry point
├── internal/
│   ├── collectors/          # Data collectors (TCP, Memory, CPU, etc.)
│   ├── analyzers/           # Analysis engines
│   ├── handlers/            # HTTP/WebSocket handlers
│   └── models/              # Data structures
├── web/                     # Frontend assets
└── docs/                    # Documentation
```

## License

MIT License
