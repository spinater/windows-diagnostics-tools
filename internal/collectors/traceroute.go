//go:build windows
// +build windows

// Package collectors provides traceroute functionality
package collectors

import (
	"context"
	"fmt"
	"net"
	"sync"
	"time"

	"loadrunner-diagnosis/internal/models"

	"golang.org/x/net/icmp"
	"golang.org/x/net/ipv4"
)

const (
	maxHops        = 30
	probesPerHop   = 3
	timeoutPerHop  = 3 * time.Second
	icmpProtocol   = 1
	protocolICMP   = 1
)

// TraceRouteCollector performs traceroute operations
type TraceRouteCollector struct {
	mu sync.Mutex
}

// NewTraceRouteCollector creates a new traceroute collector
func NewTraceRouteCollector() *TraceRouteCollector {
	return &TraceRouteCollector{}
}

// Trace performs a traceroute to the specified target
func (t *TraceRouteCollector) Trace(ctx context.Context, target string) (*models.TraceRouteResult, error) {
	t.mu.Lock()
	defer t.mu.Unlock()

	startTime := time.Now()
	result := &models.TraceRouteResult{
		Target:    target,
		Hops:      []models.TraceHop{},
		Timestamp: startTime,
	}

	// Resolve target IP
	ips, err := net.LookupIP(target)
	if err != nil {
		return nil, fmt.Errorf("failed to resolve %s: %w", target, err)
	}

	var targetIP net.IP
	for _, ip := range ips {
		if ip4 := ip.To4(); ip4 != nil {
			targetIP = ip4
			break
		}
	}
	if targetIP == nil {
		return nil, fmt.Errorf("no IPv4 address found for %s", target)
	}
	result.TargetIP = targetIP.String()

	// Create ICMP listener
	conn, err := icmp.ListenPacket("ip4:icmp", "0.0.0.0")
	if err != nil {
		// Fallback to system tracert command
		return t.traceWithCommand(ctx, target)
	}
	defer conn.Close()

	// Perform traceroute
	for ttl := 1; ttl <= maxHops; ttl++ {
		select {
		case <-ctx.Done():
			result.Duration = time.Since(startTime).Seconds() * 1000
			return result, ctx.Err()
		default:
		}

		hop := t.probeHop(conn, targetIP, ttl)
		hop.Hop = ttl
		result.Hops = append(result.Hops, hop)
		result.TotalHops = ttl

		// Check if we reached the target
		if hop.IP == targetIP.String() {
			result.Completed = true
			break
		}

		// If we got a response (not timeout), check if it's the destination
		if !hop.Timeout && hop.IP != "" {
			hopIP := net.ParseIP(hop.IP)
			if hopIP != nil && hopIP.Equal(targetIP) {
				result.Completed = true
				break
			}
		}
	}

	result.Duration = time.Since(startTime).Seconds() * 1000
	return result, nil
}

// probeHop sends probes for a specific TTL and returns the hop information
func (t *TraceRouteCollector) probeHop(conn *icmp.PacketConn, target net.IP, ttl int) models.TraceHop {
	hop := models.TraceHop{
		Latency1: -1,
		Latency2: -1,
		Latency3: -1,
	}

	var hopIP string
	var latencies []float64
	lossCount := 0

	for probe := 0; probe < probesPerHop; probe++ {
		ip, rtt, err := t.sendProbe(conn, target, ttl, probe)
		if err != nil {
			lossCount++
			continue
		}

		if hopIP == "" && ip != "" {
			hopIP = ip
			// Try to resolve hostname
			names, err := net.LookupAddr(ip)
			if err == nil && len(names) > 0 {
				hop.Hostname = names[0]
			}
		}

		latencies = append(latencies, rtt)
		switch probe {
		case 0:
			hop.Latency1 = rtt
		case 1:
			hop.Latency2 = rtt
		case 2:
			hop.Latency3 = rtt
		}
	}

	hop.IP = hopIP
	hop.Loss = lossCount
	hop.Timeout = lossCount == probesPerHop

	// Calculate average latency
	if len(latencies) > 0 {
		sum := 0.0
		for _, l := range latencies {
			sum += l
		}
		hop.AvgLatency = sum / float64(len(latencies))
	}

	return hop
}

// sendProbe sends a single ICMP echo request and waits for a response
func (t *TraceRouteCollector) sendProbe(conn *icmp.PacketConn, target net.IP, ttl int, seq int) (string, float64, error) {
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
			Data: []byte("TRACE"),
		},
	}

	msgBytes, err := msg.Marshal(nil)
	if err != nil {
		return "", 0, err
	}

	// Set deadline
	conn.SetDeadline(time.Now().Add(timeoutPerHop))

	start := time.Now()

	// Send probe
	_, err = conn.WriteTo(msgBytes, &net.IPAddr{IP: target})
	if err != nil {
		return "", 0, err
	}

	// Wait for response
	reply := make([]byte, 1500)
	n, peer, err := conn.ReadFrom(reply)
	if err != nil {
		return "", 0, err
	}

	rtt := time.Since(start).Seconds() * 1000 // Convert to ms

	// Parse response
	rm, err := icmp.ParseMessage(protocolICMP, reply[:n])
	if err != nil {
		return "", 0, err
	}

	peerIP := ""
	if peer != nil {
		peerIP = peer.String()
	}

	switch rm.Type {
	case ipv4.ICMPTypeEchoReply:
		return peerIP, rtt, nil
	case ipv4.ICMPTypeTimeExceeded:
		return peerIP, rtt, nil
	case ipv4.ICMPTypeDestinationUnreachable:
		return peerIP, rtt, nil
	}

	return peerIP, rtt, nil
}

// traceWithCommand falls back to using the system tracert command
func (t *TraceRouteCollector) traceWithCommand(ctx context.Context, target string) (*models.TraceRouteResult, error) {
	startTime := time.Now()
	result := &models.TraceRouteResult{
		Target:    target,
		Hops:      []models.TraceHop{},
		Timestamp: startTime,
	}

	// Resolve IP first
	ips, _ := net.LookupIP(target)
	for _, ip := range ips {
		if ip4 := ip.To4(); ip4 != nil {
			result.TargetIP = ip4.String()
			break
		}
	}

	// Use Windows tracert with limited hops and timeout
	// This is a simplified fallback - in production you'd parse the actual output
	// For now, return a message indicating raw ICMP isn't available
	result.Hops = append(result.Hops, models.TraceHop{
		Hop:      1,
		IP:       "Requires Administrator privileges for ICMP",
		Timeout:  true,
	})
	result.Duration = time.Since(startTime).Seconds() * 1000
	
	return result, fmt.Errorf("raw ICMP sockets require Administrator privileges - run as Administrator")
}
