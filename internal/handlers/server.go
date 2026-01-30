// Package handlers provides HTTP and WebSocket handlers
package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"

	"loadrunner-diagnosis/internal/collectors"
	"loadrunner-diagnosis/internal/models"
)

// Server handles HTTP and WebSocket connections
type Server struct {
	mu             sync.RWMutex
	collector      *collectors.Manager
	isRunning      bool
	startedAt      time.Time
	interval       time.Duration
	stopChan       chan struct{}
	clients        map[*Client]bool
	clientsMu      sync.RWMutex
	broadcast      chan *models.SystemMetrics
	samplesCount   int64
	metricsHistory []*models.SystemMetrics
	maxHistory     int
}

// Client represents a WebSocket client
type Client struct {
	conn   *WebSocketConn
	send   chan []byte
	server *Server
}

// NewServer creates a new HTTP server
func NewServer() (*Server, error) {
	mgr, err := collectors.NewManager()
	if err != nil {
		return nil, err
	}

	return &Server{
		collector:  mgr,
		interval:   time.Second,
		clients:    make(map[*Client]bool),
		broadcast:  make(chan *models.SystemMetrics, 100),
		maxHistory: 3600, // 1 hour at 1s interval
	}, nil
}

// SetupRoutes configures HTTP routes
func (s *Server) SetupRoutes(mux *http.ServeMux) {
	// API endpoints
	mux.HandleFunc("/api/monitoring/start", s.handleStart)
	mux.HandleFunc("/api/monitoring/stop", s.handleStop)
	mux.HandleFunc("/api/monitoring/status", s.handleStatus)
	
	mux.HandleFunc("/api/metrics/all", s.handleMetricsAll)
	mux.HandleFunc("/api/metrics/tcp", s.handleMetricsTCP)
	mux.HandleFunc("/api/metrics/memory", s.handleMetricsMemory)
	mux.HandleFunc("/api/metrics/cpu", s.handleMetricsCPU)
	mux.HandleFunc("/api/metrics/disk", s.handleMetricsDisk)
	mux.HandleFunc("/api/metrics/network", s.handleMetricsNetwork)
	mux.HandleFunc("/api/metrics/processes", s.handleMetricsProcesses)
	mux.HandleFunc("/api/metrics/history", s.handleMetricsHistory)
	
	// WebSocket endpoint
	mux.HandleFunc("/ws/metrics", s.handleWebSocket)
}

// handleStart starts the monitoring
func (s *Server) handleStart(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	s.mu.Lock()
	if s.isRunning {
		s.mu.Unlock()
		s.respondJSON(w, http.StatusOK, map[string]interface{}{
			"message": "Monitoring already running",
			"status":  s.getStatus(),
		})
		return
	}

	// Parse optional interval from request
	var req struct {
		Interval int `json:"interval"` // seconds
	}
	json.NewDecoder(r.Body).Decode(&req)
	if req.Interval > 0 {
		s.interval = time.Duration(req.Interval) * time.Second
	}

	s.isRunning = true
	s.startedAt = time.Now()
	s.samplesCount = 0
	s.metricsHistory = nil
	s.stopChan = make(chan struct{})
	s.mu.Unlock()

	// Start collection loop
	go s.collectionLoop()

	// Start broadcast loop
	go s.broadcastLoop()

	s.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message": "Monitoring started",
		"status":  s.getStatus(),
	})
}

// handleStop stops the monitoring
func (s *Server) handleStop(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	s.mu.Lock()
	if !s.isRunning {
		s.mu.Unlock()
		s.respondJSON(w, http.StatusOK, map[string]interface{}{
			"message": "Monitoring not running",
		})
		return
	}

	close(s.stopChan)
	s.isRunning = false
	s.mu.Unlock()

	s.respondJSON(w, http.StatusOK, map[string]interface{}{
		"message":        "Monitoring stopped",
		"samplesCollected": s.samplesCount,
	})
}

// handleStatus returns the monitoring status
func (s *Server) handleStatus(w http.ResponseWriter, r *http.Request) {
	s.respondJSON(w, http.StatusOK, s.getStatus())
}

// getStatus returns the current monitoring status
func (s *Server) getStatus() *models.MonitoringStatus {
	s.mu.RLock()
	defer s.mu.RUnlock()

	status := &models.MonitoringStatus{
		IsRunning:        s.isRunning,
		Interval:         s.interval,
		SamplesCollected: s.samplesCount,
	}

	if s.isRunning {
		status.StartedAt = &s.startedAt
		elapsed := time.Since(s.startedAt)
		status.Elapsed = formatDuration(elapsed)
	}

	return status
}

// collectionLoop runs the metric collection loop
func (s *Server) collectionLoop() {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	for {
		select {
		case <-s.stopChan:
			return
		case <-ticker.C:
			ctx, cancel := context.WithTimeout(context.Background(), s.interval)
			metrics, err := s.collector.CollectAll(ctx)
			cancel()

			if err != nil {
				log.Printf("Collection error: %v", err)
				continue
			}

			metrics.Timestamp = time.Now()

			s.mu.Lock()
			s.samplesCount++
			s.metricsHistory = append(s.metricsHistory, metrics)
			if len(s.metricsHistory) > s.maxHistory {
				s.metricsHistory = s.metricsHistory[1:]
			}
			s.mu.Unlock()

			// Send to broadcast channel
			select {
			case s.broadcast <- metrics:
			default:
				// Skip if channel is full
			}
		}
	}
}

// broadcastLoop sends metrics to all connected clients
func (s *Server) broadcastLoop() {
	for {
		select {
		case <-s.stopChan:
			return
		case metrics := <-s.broadcast:
			data, err := json.Marshal(metrics)
			if err != nil {
				continue
			}

			s.clientsMu.RLock()
			for client := range s.clients {
				select {
				case client.send <- data:
				default:
					// Client buffer full, skip
				}
			}
			s.clientsMu.RUnlock()
		}
	}
}

// handleMetricsAll returns all current metrics
func (s *Server) handleMetricsAll(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	metrics, err := s.collector.CollectAll(ctx)
	if err != nil {
		s.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	metrics.Timestamp = time.Now()
	s.respondJSON(w, http.StatusOK, metrics)
}

// handleMetricsTCP returns TCP metrics
func (s *Server) handleMetricsTCP(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	metrics, err := s.collector.GetTCP(ctx)
	if err != nil {
		s.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.respondJSON(w, http.StatusOK, metrics)
}

// handleMetricsMemory returns memory metrics
func (s *Server) handleMetricsMemory(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	metrics, err := s.collector.GetMemory(ctx)
	if err != nil {
		s.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.respondJSON(w, http.StatusOK, metrics)
}

// handleMetricsCPU returns CPU metrics
func (s *Server) handleMetricsCPU(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	metrics, err := s.collector.GetCPU(ctx)
	if err != nil {
		s.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.respondJSON(w, http.StatusOK, metrics)
}

// handleMetricsDisk returns disk metrics
func (s *Server) handleMetricsDisk(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	metrics, err := s.collector.GetDisk(ctx)
	if err != nil {
		s.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.respondJSON(w, http.StatusOK, metrics)
}

// handleMetricsNetwork returns network metrics
func (s *Server) handleMetricsNetwork(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	metrics, err := s.collector.GetNetwork(ctx)
	if err != nil {
		s.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.respondJSON(w, http.StatusOK, metrics)
}

// handleMetricsProcesses returns process metrics
func (s *Server) handleMetricsProcesses(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	metrics, err := s.collector.GetProcesses(ctx)
	if err != nil {
		s.respondError(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.respondJSON(w, http.StatusOK, metrics)
}

// handleMetricsHistory returns historical metrics
func (s *Server) handleMetricsHistory(w http.ResponseWriter, r *http.Request) {
	s.mu.RLock()
	history := make([]*models.SystemMetrics, len(s.metricsHistory))
	copy(history, s.metricsHistory)
	s.mu.RUnlock()

	s.respondJSON(w, http.StatusOK, map[string]interface{}{
		"count":   len(history),
		"history": history,
	})
}

// respondJSON writes a JSON response
func (s *Server) respondJSON(w http.ResponseWriter, status int, data interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(data)
}

// respondError writes an error response
func (s *Server) respondError(w http.ResponseWriter, status int, message string) {
	s.respondJSON(w, status, map[string]string{"error": message})
}

// formatDuration formats a duration as HH:MM:SS
func formatDuration(d time.Duration) string {
	h := int(d.Hours())
	m := int(d.Minutes()) % 60
	sec := int(d.Seconds()) % 60
	return fmt.Sprintf("%02d:%02d:%02d", h, m, sec)
}
