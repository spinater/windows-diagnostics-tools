//go:build windows
// +build windows

// Package collectors provides NetPath probe functionality similar to SolarWinds
package collectors

import (
	"fmt"
	"log"
	"math"
	"net"
	"strings"
	"sync"
	"time"

	"loadrunner-diagnosis/internal/models"

	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
)

// NetPathCollector manages network path probes
type NetPathCollector struct {
	mu        sync.RWMutex
	probes    map[string]*activeProbe
	maxProbes int
}

type activeProbe struct {
	probe      *models.NetPathProbe
	stopChan   chan struct{}
	updateChan chan *models.NetPathResult
	running    bool
}

// NewNetPathCollector creates a new NetPath collector
func NewNetPathCollector() *NetPathCollector {
	return &NetPathCollector{
		probes:    make(map[string]*activeProbe),
		maxProbes: 10, // Maximum concurrent probes
	}
}

// StartProbe starts a new network path probe
func (n *NetPathCollector) StartProbe(target string, config models.NetPathConfig) (*models.NetPathProbe, error) {
	n.mu.Lock()
	defer n.mu.Unlock()

	// Check if probe already exists
	if existing, ok := n.probes[target]; ok {
		if existing.running {
			return existing.probe, nil
		}
	}

	// Check max probes limit
	if len(n.probes) >= n.maxProbes {
		return nil, fmt.Errorf("maximum number of probes (%d) reached", n.maxProbes)
	}

	// Resolve target
	ips, err := net.LookupIP(target)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve %s: %w", target, err)
	}

	var targetIP string
	for _, ip := range ips {
		if ip4 := ip.To4(); ip4 != nil {
			targetIP = ip4.String()
			break
		}
	}
	if targetIP == "" {
		return nil, fmt.Errorf("no IPv4 address found for %s", target)
	}

	// Apply default config
	if config.MaxHops <= 0 {
		config.MaxHops = 30
	}
	if config.Timeout <= 0 {
		config.Timeout = 3000 // 3 seconds
	}
	if config.ProbesPerHop <= 0 {
		config.ProbesPerHop = 3
	}
	if config.HistorySize <= 0 {
		config.HistorySize = 60 // Keep 60 samples (1 hour at 1min interval)
	}

	// Create probe
	probe := &models.NetPathProbe{
		ID:        fmt.Sprintf("probe_%s_%d", target, time.Now().Unix()),
		Target:    target,
		TargetIP:  targetIP,
		Status:    "running",
		Interval:  60, // Default 60 seconds
		StartedAt: time.Now(),
		Config:    config,
		History:   make([]models.NetPathResult, 0),
	}

	ap := &activeProbe{
		probe:      probe,
		stopChan:   make(chan struct{}),
		updateChan: make(chan *models.NetPathResult, 10),
		running:    true,
	}

	n.probes[target] = ap

	// Start probe goroutine
	go n.runProbe(ap)

	// Do initial probe immediately
	go func() {
		result := n.doProbe(ap.probe)
		ap.updateChan <- result
	}()

	return probe, nil
}

// StopProbe stops an active probe
func (n *NetPathCollector) StopProbe(target string) error {
	n.mu.Lock()
	defer n.mu.Unlock()

	ap, ok := n.probes[target]
	if !ok {
		return fmt.Errorf("probe not found for target: %s", target)
	}

	if ap.running {
		close(ap.stopChan)
		ap.running = false
		ap.probe.Status = "stopped"
	}

	return nil
}

// GetProbe returns probe data for a target
func (n *NetPathCollector) GetProbe(target string) (*models.NetPathProbe, error) {
	n.mu.RLock()
	defer n.mu.RUnlock()

	ap, ok := n.probes[target]
	if !ok {
		return nil, fmt.Errorf("probe not found for target: %s", target)
	}

	return ap.probe, nil
}

// GetAllProbes returns all active probes
func (n *NetPathCollector) GetAllProbes() []*models.NetPathProbe {
	n.mu.RLock()
	defer n.mu.RUnlock()

	probes := make([]*models.NetPathProbe, 0, len(n.probes))
	for _, ap := range n.probes {
		probes = append(probes, ap.probe)
	}
	return probes
}

// DeleteProbe removes a probe completely
func (n *NetPathCollector) DeleteProbe(target string) error {
	n.mu.Lock()
	defer n.mu.Unlock()

	ap, ok := n.probes[target]
	if !ok {
		return fmt.Errorf("probe not found for target: %s", target)
	}

	if ap.running {
		close(ap.stopChan)
	}

	delete(n.probes, target)
	return nil
}

// ProbeOnce performs a single probe without starting continuous monitoring
func (n *NetPathCollector) ProbeOnce(target string, config models.NetPathConfig) (*models.NetPathResult, error) {
	log.Printf("NetPath: ProbeOnce starting for target: %s", target)
	
	// Resolve target
	ips, err := net.LookupIP(target)
	if err != nil {
		log.Printf("NetPath: Failed to resolve target %s: %v", target, err)
		return nil, fmt.Errorf("failed to resolve %s: %w", target, err)
	}

	var targetIP string
	for _, ip := range ips {
		if ip4 := ip.To4(); ip4 != nil {
			targetIP = ip4.String()
			break
		}
	}
	if targetIP == "" {
		return nil, fmt.Errorf("no IPv4 address found for %s", target)
	}

	// Apply defaults
	if config.MaxHops <= 0 {
		config.MaxHops = 30
	}
	if config.Timeout <= 0 {
		config.Timeout = 3000
	}
	if config.ProbesPerHop <= 0 {
		config.ProbesPerHop = 3
	}

	tempProbe := &models.NetPathProbe{
		Target:   target,
		TargetIP: targetIP,
		Config:   config,
	}

	log.Printf("NetPath: Resolved %s to %s, starting probe with MaxHops=%d, Timeout=%d", target, targetIP, config.MaxHops, config.Timeout)
	result := n.doProbe(tempProbe)
	log.Printf("NetPath: Probe completed for %s - TotalHops=%d, Completed=%v, HasProblems=%v", target, result.TotalHops, result.Completed, result.HasProblems)
	return result, nil
}

// runProbe runs the continuous probe loop
func (n *NetPathCollector) runProbe(ap *activeProbe) {
	ticker := time.NewTicker(time.Duration(ap.probe.Interval) * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ap.stopChan:
			return
		case result := <-ap.updateChan:
			n.updateProbeResult(ap, result)
		case <-ticker.C:
			if ap.running {
				result := n.doProbe(ap.probe)
				n.updateProbeResult(ap, result)
			}
		}
	}
}

// updateProbeResult updates the probe with a new result
func (n *NetPathCollector) updateProbeResult(ap *activeProbe, result *models.NetPathResult) {
	n.mu.Lock()
	defer n.mu.Unlock()

	ap.probe.LastProbe = result.Timestamp
	ap.probe.ProbeCount++
	ap.probe.CurrentPath = result

	// Add to history
	ap.probe.History = append(ap.probe.History, *result)
	if len(ap.probe.History) > ap.probe.Config.HistorySize {
		ap.probe.History = ap.probe.History[1:]
	}
}

// doProbe performs a single network path probe
func (n *NetPathCollector) doProbe(probe *models.NetPathProbe) *models.NetPathResult {
	log.Printf("NetPath: doProbe starting for %s (%s)", probe.Target, probe.TargetIP)
	startTime := time.Now()
	result := &models.NetPathResult{
		Timestamp: startTime,
		Hops:      make([]models.NetPathHop, 0),
	}

	targetIP := net.ParseIP(probe.TargetIP)
	if targetIP == nil {
		log.Printf("NetPath: Invalid target IP: %s", probe.TargetIP)
		result.Completed = false
		return result
	}

	// Create ICMP connection
	conn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
	if err != nil {
		log.Printf("NetPath: Failed to create ICMP listener: %v", err)
		result.Completed = false
		return result
	}
	defer conn.Close()

	totalPacketsSent := 0
	totalPacketsRecv := 0
	previousAvgLatency := 0.0

	for ttl := 1; ttl <= probe.Config.MaxHops; ttl++ {
		hop := n.probeHop(conn, targetIP, ttl, probe.Config)
		hop.Hop = ttl
		totalPacketsSent += hop.PacketsSent
		totalPacketsRecv += hop.PacketsRecv

		// Detect bottleneck (significant latency increase from previous hop)
		if previousAvgLatency > 0 && hop.AvgLatency > 0 {
			latencyIncrease := hop.AvgLatency - previousAvgLatency
			if latencyIncrease > 20 { // More than 20ms increase
				hop.IsBottleneck = true
				result.HasProblems = true
				result.ProblemHops = append(result.ProblemHops, ttl)
			}
		}
		previousAvgLatency = hop.AvgLatency

		// Determine hop status
		hop.Status = n.determineHopStatus(hop)
		if hop.Status == "critical" || hop.Status == "warning" {
			result.HasProblems = true
			if !contains(result.ProblemHops, ttl) {
				result.ProblemHops = append(result.ProblemHops, ttl)
			}
		}

		result.Hops = append(result.Hops, hop)
		result.TotalHops = ttl

		// Check if we reached the target
		if hop.IP == probe.TargetIP {
			result.Completed = true
			result.TotalLatency = hop.AvgLatency
			break
		}

		// If hop responded and is the target
		if !hop.Timeout && hop.IP != "" {
			hopIP := net.ParseIP(hop.IP)
			if hopIP != nil && hopIP.Equal(targetIP) {
				result.Completed = true
				result.TotalLatency = hop.AvgLatency
				break
			}
		}
	}

	// Calculate overall packet loss
	if totalPacketsSent > 0 {
		result.PacketLoss = float64(totalPacketsSent-totalPacketsRecv) / float64(totalPacketsSent) * 100
	}

	result.Duration = time.Since(startTime).Seconds() * 1000
	return result
}

// probeHop probes a single hop with multiple packets
func (n *NetPathCollector) probeHop(conn *icmp.PacketConn, target net.IP, ttl int, config models.NetPathConfig) models.NetPathHop {
	hop := models.NetPathHop{
		Latencies:   make([]float64, 0, config.ProbesPerHop),
		PacketsSent: config.ProbesPerHop,
	}

	var hopIP string
	latencies := make([]float64, 0, config.ProbesPerHop)
	timeout := time.Duration(config.Timeout) * time.Millisecond

	for probe := 0; probe < config.ProbesPerHop; probe++ {
		ip, rtt, err := n.sendProbe(conn, target, ttl, probe, timeout)
		if err != nil {
			continue
		}

		if hopIP == "" && ip != "" {
			hopIP = ip
			// Try to resolve hostname
			names, err := net.LookupAddr(ip)
			if err == nil && len(names) > 0 {
				hop.Hostname = names[0]
				// Infer device details from hostname
				hop.DeviceType, hop.DeviceVendor, hop.DeviceName, hop.Location = n.inferDeviceDetails(hop.Hostname, ip, ttl)
			} else {
				// No hostname - try to infer from IP
				hop.DeviceType, hop.DeviceVendor, hop.DeviceName, hop.Location = n.inferDeviceDetails("", ip, ttl)
			}
		}

		latencies = append(latencies, rtt)
		hop.Latencies = append(hop.Latencies, rtt)
		hop.PacketsRecv++
	}

	hop.IP = hopIP
	hop.Timeout = hop.PacketsRecv == 0

	// Calculate statistics
	if len(latencies) > 0 {
		sum := 0.0
		minLat := latencies[0]
		maxLat := latencies[0]

		for _, l := range latencies {
			sum += l
			if l < minLat {
				minLat = l
			}
			if l > maxLat {
				maxLat = l
			}
		}

		hop.AvgLatency = sum / float64(len(latencies))
		hop.MinLatency = minLat
		hop.MaxLatency = maxLat
		hop.Jitter = maxLat - minLat

		// Calculate standard deviation for jitter
		if len(latencies) > 1 {
			variance := 0.0
			for _, l := range latencies {
				variance += (l - hop.AvgLatency) * (l - hop.AvgLatency)
			}
			hop.Jitter = math.Sqrt(variance / float64(len(latencies)))
		}
	}

	// Calculate packet loss percentage
	if hop.PacketsSent > 0 {
		hop.PacketLoss = float64(hop.PacketsSent-hop.PacketsRecv) / float64(hop.PacketsSent) * 100
	}

	return hop
}

// sendProbe sends a single ICMP probe
func (n *NetPathCollector) sendProbe(conn *icmp.PacketConn, target net.IP, ttl int, seq int, timeout time.Duration) (string, float64, error) {
	// Set TTL
	if err := conn.IPv4PacketConn().SetTTL(ttl); err != nil {
		return "", 0, err
	}

	// Create ICMP message
	msg := icmp.Message{
		Type: ipv4.ICMPTypeEcho,
		Code: 0,
		Body: &icmp.Echo{
			ID:   ttl*100 + seq,
			Seq:  seq,
			Data: []byte("NETPATH"),
		},
	}

	msgBytes, err := msg.Marshal(nil)
	if err != nil {
		return "", 0, err
	}

	// Set deadline
	conn.SetDeadline(time.Now().Add(timeout))

	start := time.Now()

	// Send probe
	_, err = conn.WriteTo(msgBytes, &net.IPAddr{IP: target})
	if err != nil {
		return "", 0, err
	}

	// Wait for response
	reply := make([]byte, 1500)
	readLen, peer, err := conn.ReadFrom(reply)
	if err != nil {
		return "", 0, err
	}

	rtt := time.Since(start).Seconds() * 1000 // Convert to ms

	// Parse response
	rm, err := icmp.ParseMessage(protocolICMP, reply[:readLen])
	if err != nil {
		return "", 0, err
	}

	switch rm.Type {
	case ipv4.ICMPTypeEchoReply:
		return peer.String(), rtt, nil
	case ipv4.ICMPTypeTimeExceeded:
		return peer.String(), rtt, nil
	case ipv4.ICMPTypeDestinationUnreachable:
		return peer.String(), rtt, nil
	}

	return "", 0, fmt.Errorf("unexpected ICMP type: %v", rm.Type)
}

// determineHopStatus determines the health status of a hop
func (n *NetPathCollector) determineHopStatus(hop models.NetPathHop) string {
	if hop.Timeout {
		return "timeout"
	}
	if hop.PacketLoss > 50 {
		return "critical"
	}
	if hop.PacketLoss > 10 || hop.AvgLatency > 150 || hop.Jitter > 50 {
		return "warning"
	}
	if hop.AvgLatency > 50 || hop.Jitter > 20 {
		return "slow"
	}
	return "healthy"
}

// contains checks if a slice contains a value
func contains(slice []int, val int) bool {
	for _, item := range slice {
		if item == val {
			return true
		}
	}
	return false
}

// inferDeviceDetails infers device type, vendor, name and location from hostname and IP
func (n *NetPathCollector) inferDeviceDetails(hostname, ip string, ttl int) (deviceType, vendor, deviceName, location string) {
	hostname = strings.ToLower(hostname)
	
	// Default values
	deviceType = "unknown"
	vendor = ""
	deviceName = ""
	location = ""
	
	// First hop is typically the local gateway
	if ttl == 1 {
		deviceType = "gateway"
		deviceName = "Local Gateway"
		return
	}
	
	// Check for timeout (no response)
	if hostname == "" && ip == "" {
		deviceType = "unknown"
		deviceName = "* * *"
		return
	}
	
	// Infer vendor from hostname patterns
	vendorPatterns := map[string]string{
		"cisco":     "Cisco",
		"csco":      "Cisco",
		"juniper":   "Juniper",
		"jnpr":      "Juniper",
		"huawei":    "Huawei",
		"arista":    "Arista",
		"mikrotik":  "MikroTik",
		"ubnt":      "Ubiquiti",
		"ubiquiti":  "Ubiquiti",
		"fortinet":  "Fortinet",
		"fortigate": "Fortinet",
		"paloalto":  "Palo Alto",
		"checkpoint": "Check Point",
		"sonicwall": "SonicWall",
		"watchguard": "WatchGuard",
		"netgear":   "Netgear",
		"hp":        "HP",
		"hpe":       "HPE",
		"dell":      "Dell",
		"brocade":   "Brocade",
		"extreme":   "Extreme",
		"f5":        "F5",
		"a10":       "A10",
		"citrix":    "Citrix",
		"vmware":    "VMware",
	}
	
	for pattern, v := range vendorPatterns {
		if strings.Contains(hostname, pattern) {
			vendor = v
			break
		}
	}
	
	// Infer device type from hostname patterns
	deviceTypePatterns := map[string][]string{
		"router": {"rtr", "router", "cr", "br", "ar", "er", "pe", "ce", "edge", "core", "backbone"},
		"switch": {"sw", "switch", "csw", "asw", "dsw", "tor", "leaf", "spine", "access"},
		"firewall": {"fw", "firewall", "asa", "pix", "fortigate", "paloalto", "checkpoint", "utm"},
		"load-balancer": {"lb", "loadbalancer", "f5", "netscaler", "a10", "haproxy", "nginx"},
		"gateway": {"gw", "gateway", "nat", "cgn", "cgnat"},
		"server": {"srv", "server", "web", "app", "db", "api", "www", "mail", "dns", "ntp"},
		"cloud": {"aws", "azure", "gcp", "google", "amazon", "microsoft", "cloudflare", "akamai", "fastly", "cloudfront"},
		"isp": {"isp", "dsl", "cable", "fiber", "fios", "comcast", "spectrum", "att", "verizon", "cox", "xfinity"},
	}
	
	for dtype, patterns := range deviceTypePatterns {
		for _, pattern := range patterns {
			if strings.Contains(hostname, pattern) {
				deviceType = dtype
				break
			}
		}
		if deviceType != "unknown" {
			break
		}
	}
	
	// Extract location hints from hostname
	locationPatterns := map[string]string{
		// US Cities/Regions
		"nyc":   "New York, US",
		"lax":   "Los Angeles, US",
		"sfo":   "San Francisco, US",
		"sjc":   "San Jose, US",
		"sea":   "Seattle, US",
		"dal":   "Dallas, US",
		"dfw":   "Dallas, US",
		"chi":   "Chicago, US",
		"ord":   "Chicago, US",
		"atl":   "Atlanta, US",
		"mia":   "Miami, US",
		"bos":   "Boston, US",
		"iad":   "Washington DC, US",
		"dca":   "Washington DC, US",
		"phx":   "Phoenix, US",
		"den":   "Denver, US",
		// Europe
		"lon":   "London, UK",
		"lhr":   "London, UK",
		"ams":   "Amsterdam, NL",
		"fra":   "Frankfurt, DE",
		"par":   "Paris, FR",
		"cdg":   "Paris, FR",
		"mad":   "Madrid, ES",
		"mil":   "Milan, IT",
		"ber":   "Berlin, DE",
		"zrh":   "Zurich, CH",
		// Asia
		"sin":   "Singapore",
		"hkg":   "Hong Kong",
		"tyo":   "Tokyo, JP",
		"nrt":   "Tokyo, JP",
		"syd":   "Sydney, AU",
		"mel":   "Melbourne, AU",
		"bom":   "Mumbai, IN",
		"del":   "Delhi, IN",
		"icn":   "Seoul, KR",
		// South America
		"gru":   "Sao Paulo, BR",
		"eze":   "Buenos Aires, AR",
	}
	
	for pattern, loc := range locationPatterns {
		if strings.Contains(hostname, pattern) {
			location = loc
			break
		}
	}
	
	// Generate friendly device name
	if hostname != "" {
		// Remove trailing dot and extract first part of hostname
		cleanHostname := strings.TrimSuffix(hostname, ".")
		parts := strings.Split(cleanHostname, ".")
		if len(parts) > 0 {
			deviceName = parts[0]
			// Capitalize first letter
			if len(deviceName) > 0 {
				deviceName = strings.ToUpper(deviceName[:1]) + deviceName[1:]
			}
		}
	}
	
	// If we couldn't determine device type from hostname, use TTL position heuristics
	if deviceType == "unknown" {
		if ttl <= 3 {
			deviceType = "router"
			deviceName = fmt.Sprintf("Router (Hop %d)", ttl)
		} else if ttl <= 6 {
			deviceType = "isp"
			deviceName = fmt.Sprintf("ISP Router (Hop %d)", ttl)
		} else {
			deviceType = "router"
			deviceName = fmt.Sprintf("Internet Router (Hop %d)", ttl)
		}
	}
	
	// Set default device name if still empty
	if deviceName == "" {
		switch deviceType {
		case "router":
			deviceName = fmt.Sprintf("Router %s", ip)
		case "switch":
			deviceName = fmt.Sprintf("Switch %s", ip)
		case "firewall":
			deviceName = fmt.Sprintf("Firewall %s", ip)
		case "gateway":
			deviceName = fmt.Sprintf("Gateway %s", ip)
		case "cloud":
			deviceName = fmt.Sprintf("Cloud Node %s", ip)
		case "server":
			deviceName = fmt.Sprintf("Server %s", ip)
		default:
			deviceName = ip
		}
	}
	
	return
}
