# GitHub Copilot Instructions

This file contains specific instructions for GitHub Copilot when working on the **LoadRunner Diagnosis Tool** project. Please follow these guidelines consistently for all development work.

## ⚠️ CRITICAL: Build & Run Commands

**Use `go build` and `go run` commands for development - target single executable output**

- **Build**: `go build -o loadrunner-diagnosis.exe ./cmd/main.go`
- **Run**: `go run ./cmd/main.go`
- **Test**: `go test ./...`
- **Reason**: Single executable deployment for Windows Server environments

---

## Project Overview

This is a **Windows Server Resource Diagnosis Tool** built in Go, designed to analyze and visualize system performance metrics, particularly for diagnosing issues from LoadRunner tests. The tool creates a single `.exe` file for easy deployment and execution on Windows servers.

### Technology Stack

- **Language**: Go 1.21+ (latest stable)
- **UI Framework**: Web-based UI (embedded HTTP server with HTML/JS)
- **Data Collection**: Windows Performance Counters, netstat, WMI
- **Visualization**: Chart.js or D3.js (embedded in web UI)
- **Output**: Single portable .exe (no external dependencies)
- **Target OS**: Windows Server 2016/2019/2022

### Core Features

1. **TCP Connection Analysis**: Zero window detection, connection states, retransmissions
2. **Memory Diagnostics**: RAM usage, paging, memory leaks detection
3. **CPU Analysis**: Per-core utilization, process CPU consumption
4. **Network Performance**: Bandwidth, latency, packet loss, interface stats
5. **Disk I/O**: Read/write throughput, queue depth, IOPS
6. **Process Monitoring**: Top processes by resource usage
7. **LoadRunner Integration**: Parse and correlate LoadRunner output files
8. **Real-time Dashboard**: Live metrics visualization
9. **Report Generation**: Export analysis as HTML/PDF reports

---

## 1. Sequential Thinking Requirement

**ALWAYS use sequential thinking for task planning and problem-solving.**

- Use the `mcp_sequentialthi_sequentialthinking` tool for every significant task
- Break down complex problems into logical thinking steps
- Question and revise previous thoughts when needed
- Generate solution hypotheses and verify them
- Document your thinking process for transparency

Example usage:

```
Before starting any development work, use sequential thinking to:
- Analyze the Windows API requirements
- Plan the data collection approach
- Identify potential performance impacts
- Design the visualization architecture
```

---

## 2. Task Management

**Break down all work into manageable tasks stored in `./.github/tasks`**

### Task Organization

- Create individual task files in `./.github/tasks/` directory
- Use descriptive filenames: `task-[date]-[brief-description].md`
- Include task status, requirements, and progress tracking
- Update task files as work progresses

### Task File Structure

```markdown
# Task: [Brief Description]

**Status:** [Not Started | In Progress | Completed | Blocked]
**Created:** [Date]
**Assigned:** [Developer/Copilot]
**Priority:** [High | Medium | Low]

## Requirements

- [Requirement 1]
- [Requirement 2]

## Implementation Plan

1. [Step 1]
2. [Step 2]

## Progress

- [x] Completed item
- [ ] Pending item

## Notes

[Any additional notes or considerations]
```

---

## 3. Memory Simulation

**Simulate MCP memory functionality in `./.github/memory` to prevent context loss**

### Memory Structure

- Create knowledge graphs in `./.github/memory/entities/`
- Store observations in `./.github/memory/observations/`
- Maintain relationships in `./.github/memory/relations/`

### Memory Management

- Document all important decisions and their rationale
- Store code patterns and architectural decisions
- Keep track of dependencies and their versions
- Record API changes and breaking changes
- Maintain a project knowledge base

### Memory File Examples

```
./.github/memory/
├── entities/
│   ├── tcp-analysis.md
│   ├── memory-diagnostics.md
│   ├── cpu-monitoring.md
│   ├── network-metrics.md
│   ├── disk-io.md
│   └── loadrunner-integration.md
├── observations/
│   ├── windows-api-notes.md
│   ├── performance-considerations.md
│   ├── visualization-patterns.md
│   └── diagnosis-patterns.md
└── relations/
    ├── metric-correlations.md
    ├── bottleneck-patterns.md
    └── loadrunner-mapping.md
```

---

## 4. Documentation Updates

**Update documentation in `./docs` after every development task**

### Documentation Requirements

- Maintain up-to-date metric documentation
- Document all collectors and their data sources
- Include usage examples and interpretation guides
- Update version information
- Document known limitations

### Documentation Structure

```
./docs/
├── metrics/
│   ├── tcp-metrics.md
│   ├── memory-metrics.md
│   ├── cpu-metrics.md
│   ├── network-metrics.md
│   └── disk-metrics.md
├── guides/
│   ├── getting-started.md
│   ├── installation.md
│   ├── loadrunner-analysis.md
│   ├── troubleshooting.md
│   └── interpreting-results.md
├── api/
│   ├── rest-endpoints.md
│   └── websocket-events.md
└── changelog.md
```

---

## 5. Context7 Usage for External Resources

**Use Context7 tools for reading external documentation**

### When to Use Context7

- Reading Go standard library documentation
- Checking Windows API documentation
- Researching performance monitoring best practices
- Validating system call patterns

### Usage Guidelines

- Always use `mcp_context7_resolve-library-id` first to find the correct library
- Use `mcp_context7_get-library-docs` for comprehensive documentation
- Reference the latest documentation for accuracy
- Document the source of external information used

---

## 6. Error Handling Pattern

**CRITICAL: All functions MUST use Go's idiomatic error handling**

### Error Interface Pattern

All functions should return errors following Go conventions:

```go
// Result type for complex responses
type DiagnosticResult struct {
    Success   bool        `json:"success"`
    Data      interface{} `json:"data,omitempty"`
    Error     string      `json:"error,omitempty"`
    Timestamp time.Time   `json:"timestamp"`
}

// Function pattern
func CollectMetrics(ctx context.Context) (*Metrics, error) {
    // Implementation
}
```

### Standard Error Handling

```go
// Define custom error types
var (
    ErrCollectionFailed  = errors.New("metric collection failed")
    ErrPermissionDenied  = errors.New("insufficient permissions")
    ErrNotAvailable      = errors.New("metric not available on this system")
    ErrTimeout           = errors.New("collection timeout exceeded")
)

// Wrap errors with context
func (c *Collector) Collect() error {
    data, err := c.gatherData()
    if err != nil {
        return fmt.Errorf("failed to gather data: %w", err)
    }
    return nil
}
```

### HTTP Response Pattern

```go
type APIResponse struct {
    StatusCode int         `json:"statusCode"`
    Message    string      `json:"message"`
    Data       interface{} `json:"data,omitempty"`
    Error      string      `json:"error,omitempty"`
}

func respondJSON(w http.ResponseWriter, status int, payload interface{}) {
    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(status)
    json.NewEncoder(w).Encode(payload)
}
```

---

## 7. Unit Testing Requirements

**Write unit tests for every function and feature implemented**

### Testing Standards

- Write tests BEFORE or IMMEDIATELY AFTER implementing functions
- Achieve minimum 80% code coverage
- Use descriptive test names that explain the expected behavior
- Test both happy path and edge cases
- Mock external dependencies (WMI, Windows APIs)

### Test Organization

```
tests/
├── collectors/
│   ├── tcp_test.go
│   ├── memory_test.go
│   ├── cpu_test.go
│   └── network_test.go
├── analyzers/
│   ├── bottleneck_test.go
│   └── correlation_test.go
├── handlers/
│   └── api_test.go
└── integration/
    └── full_collection_test.go
```

### Test Structure

```go
func TestCollector_CollectTCPStats(t *testing.T) {
    t.Run("successful collection", func(t *testing.T) {
        // Arrange
        collector := NewTCPCollector()
        
        // Act
        stats, err := collector.Collect(context.Background())
        
        // Assert
        require.NoError(t, err)
        assert.NotNil(t, stats)
    })

    t.Run("handles permission error", func(t *testing.T) {
        // Test error cases
    })
}
```

---

## 8. Build & Run Guidelines

### Building the Executable

```bash
# Standard build
go build -o loadrunner-diagnosis.exe ./cmd/main.go

# Production build with optimizations
go build -ldflags="-s -w" -o loadrunner-diagnosis.exe ./cmd/main.go

# Cross-compile for Windows from Linux/Mac
GOOS=windows GOARCH=amd64 go build -o loadrunner-diagnosis.exe ./cmd/main.go
```

### Running the Tool

```bash
# Run with default settings
./loadrunner-diagnosis.exe

# Run with custom port
./loadrunner-diagnosis.exe -port 8080

# Run with LoadRunner file analysis
./loadrunner-diagnosis.exe -analyze /path/to/loadrunner/results

# Run in headless mode (API only)
./loadrunner-diagnosis.exe -headless
```

### Development Mode

```bash
# Run with live reload (using air or similar)
air

# Run tests with coverage
go test -cover ./...

# Run specific test
go test -v -run TestTCPCollector ./internal/collectors/
```

---

## 9. General Workflow

### Before Starting Any Work

1. Use sequential thinking to plan the approach
2. Create or update relevant task files
3. Review existing memory/knowledge base
4. Check current documentation
5. Verify Windows API compatibility

### During Development

1. Write code following established patterns
2. Write corresponding unit tests
3. Update memory with new learnings
4. Document any architectural decisions
5. Test on target Windows Server versions

### After Completing Work

1. Update documentation in ./docs
2. Mark tasks as completed
3. Update memory with final outcomes
4. Ensure all tests pass
5. Build and verify the executable
6. Commit changes with descriptive messages

---

## 10. Code Quality Standards

- Follow Go style guidelines (gofmt, golint)
- Use meaningful variable and function names
- Add appropriate comments for complex logic
- Validate all input parameters
- Handle errors gracefully
- Use context for cancellation and timeouts
- Avoid memory leaks in long-running collectors
- Keep the executable size minimal

---

## 11. Windows-Specific Considerations

### API Usage

- Use `golang.org/x/sys/windows` for Windows API calls
- Prefer WMI queries for system information
- Use performance counters for real-time metrics
- Handle UAC/privilege requirements gracefully

### Permissions

- Document required permissions clearly
- Provide fallback when elevated privileges unavailable
- Log permission-related limitations

### Compatibility

- Test on Windows Server 2016, 2019, 2022
- Handle API differences between versions
- Document minimum Windows version requirements

---

## 12. Agent-Generated Markdown File Management

**MANDATORY Rules for Agent-Generated Documentation**

### File Organization

```
✓ ALL agent-generated *.md files MUST be organized with timestamp
✓ MUST follow naming convention: YYYY-MM-DD-HHmmss-filename.md
✓ MUST be stored in: .github/agent-md/
✓ Examples:
  - .github/agent-md/2026-01-26-143022-tcp-analysis-design.md
  - .github/agent-md/2026-01-26-150533-ui-architecture.md
  - .github/agent-md/2026-01-26-091045-collector-patterns.md
```

### Directory Structure

```
.github/agent-md/
├── 2026-01-26-143022-tcp-analysis-design.md
├── 2026-01-26-150533-ui-architecture.md
├── README.md (index of all agent-generated docs)
```

### When to Use

```
✓ Architecture analysis and specifications
✓ Technical documentation generated by agent
✓ Research and investigation results
✓ Windows API analysis
✓ Performance optimization strategies
✓ Any markdown documentation created by AI agent
```

---

## 13. Project Structure

```
loadRunnerDiagnosis/
├── cmd/
│   └── main.go                 # Entry point
├── internal/
│   ├── collectors/             # Data collectors
│   │   ├── tcp.go
│   │   ├── memory.go
│   │   ├── cpu.go
│   │   ├── network.go
│   │   └── disk.go
│   ├── analyzers/              # Data analysis
│   │   ├── bottleneck.go
│   │   ├── correlation.go
│   │   └── loadrunner.go
│   ├── handlers/               # HTTP handlers
│   │   ├── api.go
│   │   └── websocket.go
│   ├── models/                 # Data structures
│   │   └── metrics.go
│   └── ui/                     # Embedded web UI
│       ├── static/
│       └── templates/
├── pkg/                        # Reusable packages
│   ├── windows/                # Windows API wrappers
│   └── utils/
├── web/                        # Frontend assets
│   ├── index.html
│   ├── css/
│   └── js/
├── docs/                       # Documentation
├── .github/
│   ├── copilot-instructions.md
│   ├── tasks/
│   ├── memory/
│   │   ├── entities/
│   │   ├── observations/
│   │   └── relations/
│   └── agent-md/
├── go.mod
├── go.sum
└── README.md
```

---

**Remember: These instructions should be followed consistently across all development work on this LoadRunner Diagnosis Tool project. The goal is a single, portable .exe that provides comprehensive Windows server diagnostics with clear visualizations.**
