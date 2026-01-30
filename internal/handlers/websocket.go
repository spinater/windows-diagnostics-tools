// Package handlers provides WebSocket functionality
package handlers

import (
	"bufio"
	"crypto/sha1"
	"encoding/base64"
	"encoding/binary"
	"io"
	"log"
	"net"
	"net/http"
	"strings"
	"sync"
)

// WebSocket GUID for handshake
const wsGUID = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11"

// WebSocketConn represents a WebSocket connection
type WebSocketConn struct {
	conn   net.Conn
	reader *bufio.Reader
	mu     sync.Mutex
}

// handleWebSocket handles WebSocket upgrade and connection
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
	// Check for WebSocket upgrade
	if !strings.EqualFold(r.Header.Get("Upgrade"), "websocket") {
		http.Error(w, "Expected WebSocket upgrade", http.StatusBadRequest)
		return
	}

	// Get the WebSocket key
	key := r.Header.Get("Sec-WebSocket-Key")
	if key == "" {
		http.Error(w, "Missing Sec-WebSocket-Key", http.StatusBadRequest)
		return
	}

	// Hijack the connection
	hijacker, ok := w.(http.Hijacker)
	if !ok {
		http.Error(w, "WebSocket not supported", http.StatusInternalServerError)
		return
	}

	conn, bufrw, err := hijacker.Hijack()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	// Calculate accept key
	h := sha1.New()
	h.Write([]byte(key + wsGUID))
	acceptKey := base64.StdEncoding.EncodeToString(h.Sum(nil))

	// Send upgrade response
	response := "HTTP/1.1 101 Switching Protocols\r\n" +
		"Upgrade: websocket\r\n" +
		"Connection: Upgrade\r\n" +
		"Sec-WebSocket-Accept: " + acceptKey + "\r\n\r\n"
	
	if _, err := bufrw.WriteString(response); err != nil {
		conn.Close()
		return
	}
	bufrw.Flush()

	// Create WebSocket connection wrapper
	wsConn := &WebSocketConn{
		conn:   conn,
		reader: bufrw.Reader,
	}

	// Create client
	client := &Client{
		conn:   wsConn,
		send:   make(chan []byte, 256),
		server: s,
	}

	// Register client
	s.clientsMu.Lock()
	s.clients[client] = true
	s.clientsMu.Unlock()

	log.Printf("WebSocket client connected, total clients: %d", len(s.clients))

	// Start write pump
	go client.writePump()

	// Read pump (handles disconnection)
	client.readPump()
}

// readPump reads messages from the WebSocket (mainly for detecting disconnection)
func (c *Client) readPump() {
	defer func() {
		c.server.clientsMu.Lock()
		delete(c.server.clients, c)
		c.server.clientsMu.Unlock()
		c.conn.conn.Close()
		close(c.send)
		log.Printf("WebSocket client disconnected, remaining clients: %d", len(c.server.clients))
	}()

	for {
		// Read WebSocket frame
		_, err := c.conn.ReadMessage()
		if err != nil {
			return
		}
	}
}

// writePump writes messages to the WebSocket
func (c *Client) writePump() {
	for message := range c.send {
		if err := c.conn.WriteMessage(message); err != nil {
			return
		}
	}
}

// ReadMessage reads a WebSocket message
func (ws *WebSocketConn) ReadMessage() ([]byte, error) {
	// Read first 2 bytes
	header := make([]byte, 2)
	if _, err := io.ReadFull(ws.reader, header); err != nil {
		return nil, err
	}

	// FIN and opcode
	// fin := (header[0] & 0x80) != 0
	opcode := header[0] & 0x0F

	// Check for close frame
	if opcode == 0x08 {
		return nil, io.EOF
	}

	// Mask and payload length
	masked := (header[1] & 0x80) != 0
	length := uint64(header[1] & 0x7F)

	// Extended payload length
	if length == 126 {
		ext := make([]byte, 2)
		if _, err := io.ReadFull(ws.reader, ext); err != nil {
			return nil, err
		}
		length = uint64(binary.BigEndian.Uint16(ext))
	} else if length == 127 {
		ext := make([]byte, 8)
		if _, err := io.ReadFull(ws.reader, ext); err != nil {
			return nil, err
		}
		length = binary.BigEndian.Uint64(ext)
	}

	// Read mask key
	var maskKey []byte
	if masked {
		maskKey = make([]byte, 4)
		if _, err := io.ReadFull(ws.reader, maskKey); err != nil {
			return nil, err
		}
	}

	// Read payload
	payload := make([]byte, length)
	if _, err := io.ReadFull(ws.reader, payload); err != nil {
		return nil, err
	}

	// Unmask
	if masked {
		for i := range payload {
			payload[i] ^= maskKey[i%4]
		}
	}

	return payload, nil
}

// WriteMessage writes a WebSocket message
func (ws *WebSocketConn) WriteMessage(data []byte) error {
	ws.mu.Lock()
	defer ws.mu.Unlock()

	length := len(data)
	
	// Build frame header
	var frame []byte
	frame = append(frame, 0x81) // FIN + text frame

	if length < 126 {
		frame = append(frame, byte(length))
	} else if length < 65536 {
		frame = append(frame, 126)
		frame = append(frame, byte(length>>8), byte(length))
	} else {
		frame = append(frame, 127)
		for i := 7; i >= 0; i-- {
			frame = append(frame, byte(length>>(i*8)))
		}
	}

	// Write frame header
	if _, err := ws.conn.Write(frame); err != nil {
		return err
	}

	// Write payload
	if _, err := ws.conn.Write(data); err != nil {
		return err
	}

	return nil
}
