// LoadRunner Diagnosis Tool
// Windows Server resource diagnosis with real-time visualization
package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"syscall"

	"loadrunner-diagnosis/internal/handlers"
)

//go:embed web/*
var webFS embed.FS

var (
	version = "1.0.0"
	port    = flag.Int("port", 8080, "HTTP server port")
	help    = flag.Bool("help", false, "Show help")
)

func main() {
	flag.Parse()

	if *help {
		printUsage()
		return
	}

	// Print banner
	fmt.Println("╔════════════════════════════════════════════════════════════╗")
	fmt.Println("║         LoadRunner Diagnosis Tool v" + version + "                    ║")
	fmt.Println("║     Windows Server Resource Diagnosis & Visualization      ║")
	fmt.Println("╚════════════════════════════════════════════════════════════╝")
	fmt.Println()

	// Create server
	server, err := handlers.NewServer()
	if err != nil {
		log.Fatalf("Failed to create server: %v", err)
	}

	// Setup routes
	mux := http.NewServeMux()
	server.SetupRoutes(mux)

	// Serve static files from embedded filesystem
	webContent, err := fs.Sub(webFS, "web")
	if err != nil {
		log.Fatalf("Failed to load web content: %v", err)
	}
	mux.Handle("/", http.FileServer(http.FS(webContent)))

	// Find available port (starting from requested port)
	actualPort := findAvailablePort(*port)
	addr := fmt.Sprintf(":%d", actualPort)
	
	if actualPort != *port {
		log.Printf("Port %d is in use, using port %d instead", *port, actualPort)
	}
	
	log.Printf("Starting server on http://localhost:%d", actualPort)
	log.Printf("Press Ctrl+C to stop")

	// Handle shutdown
	go func() {
		sigChan := make(chan os.Signal, 1)
		signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
		<-sigChan
		fmt.Println("\nShutting down...")
		os.Exit(0)
	}()

	if err := http.ListenAndServe(addr, mux); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}

// findAvailablePort finds an available port starting from the given port
func findAvailablePort(startPort int) int {
	for port := startPort; port < startPort+100; port++ {
		addr := fmt.Sprintf(":%d", port)
		listener, err := net.Listen("tcp", addr)
		if err == nil {
			listener.Close()
			return port
		}
	}
	// If no port found in range, let the OS assign one
	listener, err := net.Listen("tcp", ":0")
	if err != nil {
		log.Fatalf("Cannot find available port: %v", err)
	}
	port := listener.Addr().(*net.TCPAddr).Port
	listener.Close()
	return port
}

func printUsage() {
	fmt.Println("LoadRunner Diagnosis Tool v" + version)
	fmt.Println()
	fmt.Println("Usage: loadrunner-diagnosis.exe [options]")
	fmt.Println()
	fmt.Println("Options:")
	flag.PrintDefaults()
	fmt.Println()
	fmt.Println("Examples:")
	fmt.Println("  loadrunner-diagnosis.exe                # Start with default port 8080")
	fmt.Println("  loadrunner-diagnosis.exe -port 9090     # Start with custom port")
}
