@echo off
REM LoadRunner Diagnosis Tool - Simple Build Script
REM Double-click to build or run: build.bat

echo.
echo ========================================
echo   LoadRunner Diagnosis Tool - Builder
echo ========================================
echo.

REM Check if Go is available
where go >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Go is not installed or not in PATH
    echo Please install Go from https://go.dev/dl/
    pause
    exit /b 1
)

echo [*] Building loadrunner-diagnosis.exe...
echo.

REM Build with optimizations for smaller size
set GOOS=windows
set GOARCH=amd64
set CGO_ENABLED=0

go build -ldflags="-s -w" -o loadrunner-diagnosis.exe ./cmd/main.go

if %ERRORLEVEL% equ 0 (
    echo.
    echo ========================================
    echo   BUILD SUCCESSFUL!
    echo ========================================
    echo.
    echo   Output: loadrunner-diagnosis.exe
    echo.
    echo   Run with: loadrunner-diagnosis.exe
    echo   Then open: http://localhost:8080
    echo.
) else (
    echo.
    echo [ERROR] Build failed!
    echo.
)

pause
