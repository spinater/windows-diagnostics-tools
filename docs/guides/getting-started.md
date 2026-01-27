# Getting Started

## Overview

LoadRunner Diagnosis Tool is a single-executable Windows server diagnosis tool that provides real-time visualization of system metrics.

## Installation

1. Download the latest `loadrunner-diagnosis.exe`
2. Copy to target Windows Server
3. Run the executable (Administrator recommended for full metrics)

## First Run

```bash
# Basic run
loadrunner-diagnosis.exe

# With custom port
loadrunner-diagnosis.exe -port 9090
```

## Accessing the Dashboard

Open your browser and navigate to:
- http://localhost:8080 (default)
- http://localhost:<port> (if custom port specified)

## Permissions

For full functionality, run as Administrator to access:
- All performance counters
- Process details
- Network statistics

## Next Steps

- [Interpreting Results](interpreting-results.md)
- [LoadRunner Analysis](loadrunner-analysis.md)
- [Troubleshooting](troubleshooting.md)
