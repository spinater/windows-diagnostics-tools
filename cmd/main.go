// LoadRunner Diagnosis Tool
// Windows Server resource diagnosis with real-time visualization
package main

import (
	"embed"
	"flag"
	"fmt"
	"io/fs"
	"log"
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

	// Start server
	addr := fmt.Sprintf(":%d", *port)
	log.Printf("Starting server on http://localhost%s", addr)
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
