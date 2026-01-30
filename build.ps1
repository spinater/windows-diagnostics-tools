# LoadRunner Diagnosis Tool - Build Script
# Usage: .\build.ps1 [-Release] [-Clean]

param(
    [switch]$Release,
    [switch]$Clean
)

$ErrorActionPreference = "Stop"

# Configuration
$AppName = "loadrunner-diagnosis"
$OutputDir = ".\dist"
$MainFile = ".\cmd\main.go"
$Version = "1.0.0"

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LoadRunner Diagnosis Tool - Builder  " -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Clean if requested
if ($Clean) {
    Write-Host "[*] Cleaning build artifacts..." -ForegroundColor Yellow
    if (Test-Path $OutputDir) {
        Remove-Item -Recurse -Force $OutputDir
    }
    if (Test-Path ".\$AppName.exe") {
        Remove-Item -Force ".\$AppName.exe"
    }
    Write-Host "[+] Clean complete!" -ForegroundColor Green
    if (-not $Release) {
        exit 0
    }
}

# Check Go installation
Write-Host "[*] Checking Go installation..." -ForegroundColor Yellow
try {
    $goVersion = go version
    Write-Host "[+] Found: $goVersion" -ForegroundColor Green
} catch {
    Write-Host "[!] Go is not installed or not in PATH" -ForegroundColor Red
    Write-Host "    Please install Go from https://go.dev/dl/" -ForegroundColor Red
    exit 1
}

# Create output directory
if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
}

# Build flags
$ldflags = "-s -w"  # Strip debug info for smaller binary
if ($Release) {
    $ldflags += " -X main.Version=$Version"
    Write-Host "[*] Building RELEASE version $Version..." -ForegroundColor Yellow
} else {
    Write-Host "[*] Building DEBUG version..." -ForegroundColor Yellow
}

# Set environment for Windows build
$env:GOOS = "windows"
$env:GOARCH = "amd64"
$env:CGO_ENABLED = "0"

# Build command
$outputPath = "$OutputDir\$AppName.exe"

Write-Host "[*] Compiling..." -ForegroundColor Yellow
Write-Host "    Source: $MainFile" -ForegroundColor Gray
Write-Host "    Output: $outputPath" -ForegroundColor Gray
Write-Host ""

try {
    if ($Release) {
        go build -ldflags="$ldflags" -trimpath -o $outputPath $MainFile
    } else {
        go build -o $outputPath $MainFile
    }
} catch {
    Write-Host "[!] Build failed!" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}

# Check if build succeeded
if (Test-Path $outputPath) {
    $fileInfo = Get-Item $outputPath
    $sizeMB = [math]::Round($fileInfo.Length / 1MB, 2)
    
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "  BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
    Write-Host ""
    Write-Host "  Output: $outputPath" -ForegroundColor White
    Write-Host "  Size:   $sizeMB MB" -ForegroundColor White
    Write-Host ""
    
    # Copy to root for convenience
    Copy-Item $outputPath ".\$AppName.exe" -Force
    Write-Host "[+] Also copied to: .\$AppName.exe" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Run with: .\$AppName.exe" -ForegroundColor Yellow
    Write-Host "Then open: http://localhost:8080" -ForegroundColor Yellow
    Write-Host ""
} else {
    Write-Host "[!] Build failed - output file not created" -ForegroundColor Red
    exit 1
}
