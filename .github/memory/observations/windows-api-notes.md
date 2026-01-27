# Windows API Observations

## Date: 2026-01-26

### Performance Counter Access

- Requires appropriate permissions
- Some counters need Administrator privileges
- Use `PdhOpenQuery` for performance data

### WMI Considerations

- WMI queries can be slow (100-500ms)
- Cache WMI connections where possible
- Use async queries for better performance

### netstat Parsing

- `netstat -ano` provides connection details with PIDs
- `netstat -s` provides protocol statistics
- Consider raw API calls for better performance

### Privilege Requirements

- TCP table: No special privileges needed
- Performance counters: Varies by counter
- Process details: May need SeDebugPrivilege

## Best Practices

1. Use context with timeouts for all API calls
2. Implement graceful degradation when APIs unavailable
3. Cache static information (CPU count, total RAM)
4. Pool connections for repeated WMI queries
