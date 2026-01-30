// LoadRunner Diagnosis Tool - Dashboard JavaScript

let ws = null;
let isRunning = false;
let charts = {};
let historyData = {
    cpu: [],
    memory: [],
    zeroWindows: [],
    labels: []
};
const MAX_HISTORY = 60;
let lastZeroWindowCount = 0;

// Initialize charts
document.addEventListener('DOMContentLoaded', () => {
    initCharts();
    checkStatus();
});

function initCharts() {
    // Overview Chart
    const overviewCtx = document.getElementById('overviewChart').getContext('2d');
    charts.overview = new Chart(overviewCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'CPU %',
                    data: [],
                    borderColor: '#00b4d8',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'Memory %',
                    data: [],
                    borderColor: '#00d9a5',
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#a0a0a0' }
                },
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#a0a0a0' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e8e8e8' } }
            }
        }
    });

    // Connection States Chart
    const statesCtx = document.getElementById('connectionStatesChart').getContext('2d');
    charts.connectionStates = new Chart(statesCtx, {
        type: 'doughnut',
        data: {
            labels: ['ESTABLISHED', 'TIME_WAIT', 'CLOSE_WAIT', 'LISTEN', 'Other'],
            datasets: [{
                data: [0, 0, 0, 0, 0],
                backgroundColor: ['#00d9a5', '#ffc107', '#e63946', '#00b4d8', '#a0a0a0']
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    position: 'right',
                    labels: { color: '#e8e8e8' }
                }
            }
        }
    });

    // Memory Chart
    const memoryCtx = document.getElementById('memoryChart').getContext('2d');
    charts.memory = new Chart(memoryCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Memory Usage %',
                data: [],
                borderColor: '#00d9a5',
                backgroundColor: 'rgba(0, 217, 165, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#a0a0a0' }
                },
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#a0a0a0' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e8e8e8' } }
            }
        }
    });

    // CPU Chart
    const cpuCtx = document.getElementById('cpuChart').getContext('2d');
    charts.cpu = new Chart(cpuCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [
                {
                    label: 'Total CPU %',
                    data: [],
                    borderColor: '#00b4d8',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'Kernel %',
                    data: [],
                    borderColor: '#9d4edd',
                    tension: 0.4,
                    fill: false
                },
                {
                    label: 'User %',
                    data: [],
                    borderColor: '#00d9a5',
                    tension: 0.4,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#a0a0a0' }
                },
                x: {
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#a0a0a0' }
                }
            },
            plugins: {
                legend: { labels: { color: '#e8e8e8' } }
            }
        }
    });

    // Memory Gauge
    const memGaugeCtx = document.getElementById('memoryGauge').getContext('2d');
    charts.memoryGauge = new Chart(memGaugeCtx, {
        type: 'doughnut',
        data: {
            labels: ['Used', 'Available'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#00d9a5', '#16213e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false }
            }
        }
    });

    // CPU Gauge
    const cpuGaugeCtx = document.getElementById('cpuGauge').getContext('2d');
    charts.cpuGauge = new Chart(cpuGaugeCtx, {
        type: 'doughnut',
        data: {
            labels: ['Used', 'Idle'],
            datasets: [{
                data: [0, 100],
                backgroundColor: ['#00b4d8', '#16213e'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { display: false }
            }
        }
    });

    // Zero Window History Chart
    const zeroWindowCtx = document.getElementById('zeroWindowChart').getContext('2d');
    charts.zeroWindow = new Chart(zeroWindowCtx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Zero Window Events',
                data: [],
                borderColor: '#e63946',
                backgroundColor: 'rgba(230, 57, 70, 0.2)',
                tension: 0.4,
                fill: true,
                pointRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(255,255,255,0.1)' },
                    ticks: { color: '#a0a0a0' }
                },
                x: {
                    display: false
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}

async function checkStatus() {
    try {
        const response = await fetch('/api/monitoring/status');
        const status = await response.json();
        updateStatusUI(status.isRunning);
        if (status.isRunning) {
            connectWebSocket();
        }
    } catch (error) {
        console.error('Failed to check status:', error);
    }
}

async function startMonitoring() {
    const interval = parseInt(document.getElementById('intervalSelect').value);
    try {
        const response = await fetch('/api/monitoring/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interval: interval / 1000 })
        });
        const result = await response.json();
        updateStatusUI(true);
        connectWebSocket();
    } catch (error) {
        console.error('Failed to start monitoring:', error);
    }
}

async function stopMonitoring() {
    try {
        const response = await fetch('/api/monitoring/stop', { method: 'POST' });
        const result = await response.json();
        updateStatusUI(false);
        if (ws) {
            ws.close();
            ws = null;
        }
    } catch (error) {
        console.error('Failed to stop monitoring:', error);
    }
}

function updateStatusUI(running) {
    isRunning = running;
    const indicator = document.getElementById('statusIndicator');
    const statusText = document.getElementById('statusText');
    const startBtn = document.getElementById('startBtn');
    const stopBtn = document.getElementById('stopBtn');

    if (running) {
        indicator.classList.add('running');
        statusText.textContent = 'Running';
        startBtn.disabled = true;
        stopBtn.disabled = false;
    } else {
        indicator.classList.remove('running');
        statusText.textContent = 'Stopped';
        startBtn.disabled = false;
        stopBtn.disabled = true;
    }
}

function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}/ws/metrics`);

    ws.onopen = () => {
        console.log('WebSocket connected');
    };

    ws.onmessage = (event) => {
        const metrics = JSON.parse(event.data);
        updateDashboard(metrics);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        if (isRunning) {
            setTimeout(connectWebSocket, 1000);
        }
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function updateDashboard(metrics) {
    const time = new Date(metrics.timestamp).toLocaleTimeString();

    // Update overview stats
    if (metrics.cpu) {
        document.getElementById('cpuOverview').textContent = metrics.cpu.totalPercent.toFixed(1) + '%';
        document.getElementById('cpuTotal').textContent = metrics.cpu.totalPercent.toFixed(1) + '%';
        document.getElementById('cpuUser').textContent = metrics.cpu.userPercent.toFixed(1) + '%';
        document.getElementById('cpuKernel').textContent = metrics.cpu.kernelPercent.toFixed(1) + '%';
        document.getElementById('cpuIdle').textContent = metrics.cpu.idlePercent.toFixed(1) + '%';
        document.getElementById('coreCount').textContent = metrics.cpu.coreCount;

        // Update CPU gauge
        charts.cpuGauge.data.datasets[0].data = [metrics.cpu.totalPercent, 100 - metrics.cpu.totalPercent];
        charts.cpuGauge.data.datasets[0].backgroundColor[0] = getColorForValue(metrics.cpu.totalPercent);
        charts.cpuGauge.update();
    }

    if (metrics.memory) {
        document.getElementById('memoryOverview').textContent = metrics.memory.usedPercent.toFixed(1) + '%';
        document.getElementById('totalPhysical').textContent = formatBytes(metrics.memory.totalPhysical);
        document.getElementById('usedPhysical').textContent = formatBytes(metrics.memory.usedPhysical);
        document.getElementById('availablePhysical').textContent = formatBytes(metrics.memory.availablePhysical);
        document.getElementById('committedMemory').textContent = formatBytes(metrics.memory.committedBytes);
        document.getElementById('cachedMemory').textContent = formatBytes(metrics.memory.cacheBytes);
        document.getElementById('totalPageFile').textContent = formatBytes(metrics.memory.totalPageFile);
        document.getElementById('usedPageFile').textContent = formatBytes(metrics.memory.usedPageFile);

        // Page file progress
        const pageFilePercent = (metrics.memory.usedPageFile / metrics.memory.totalPageFile * 100) || 0;
        const pageFileProgress = document.getElementById('pageFileProgress');
        pageFileProgress.style.width = pageFilePercent + '%';
        pageFileProgress.className = 'progress-fill ' + getColorClass(pageFilePercent);

        // Update Memory gauge
        charts.memoryGauge.data.datasets[0].data = [metrics.memory.usedPercent, 100 - metrics.memory.usedPercent];
        charts.memoryGauge.data.datasets[0].backgroundColor[0] = getColorForValue(metrics.memory.usedPercent);
        charts.memoryGauge.update();
    }

    if (metrics.tcp) {
        document.getElementById('tcpConnections').textContent = metrics.tcp.totalConnections;
        document.getElementById('closeWaitCount').textContent = metrics.tcp.closeWaitCount;
        document.getElementById('closeWaitDetail').textContent = metrics.tcp.closeWaitCount;
        document.getElementById('zeroWindowCount').textContent = metrics.tcp.zeroWindowEvents || 0;
        document.getElementById('segmentsSent').textContent = formatNumber(metrics.tcp.segmentsSent);
        document.getElementById('segmentsReceived').textContent = formatNumber(metrics.tcp.segmentsReceived);
        document.getElementById('retransmissions').textContent = formatNumber(metrics.tcp.segmentsRetransmitted);
        document.getElementById('retransmissionRate').textContent = (metrics.tcp.retransmissionRate || 0).toFixed(2) + '%';
        document.getElementById('connectionFailures').textContent = formatNumber(metrics.tcp.connectionFailures);

        // Update Zero Window Status Panel
        updateWindowStatus(metrics.tcp);

        // Update connection states chart
        const states = metrics.tcp.connectionStates || {};
        charts.connectionStates.data.datasets[0].data = [
            states['ESTABLISHED'] || 0,
            states['TIME_WAIT'] || 0,
            states['CLOSE_WAIT'] || 0,
            states['LISTEN'] || 0,
            (states['SYN_SENT'] || 0) + (states['SYN_RCVD'] || 0) + (states['FIN_WAIT1'] || 0) + (states['FIN_WAIT2'] || 0)
        ];
        charts.connectionStates.update();

        // Update connections table
        updateConnectionsTable(metrics.tcp.connections || []);
    }

    // Update history charts
    historyData.labels.push(time);
    historyData.cpu.push(metrics.cpu?.totalPercent || 0);
    historyData.memory.push(metrics.memory?.usedPercent || 0);
    historyData.zeroWindows.push(metrics.tcp?.zeroWindowEvents || 0);

    if (historyData.labels.length > MAX_HISTORY) {
        historyData.labels.shift();
        historyData.cpu.shift();
        historyData.memory.shift();
        historyData.zeroWindows.shift();
    }

    // Update zero window chart
    if (charts.zeroWindow) {
        charts.zeroWindow.data.labels = historyData.labels;
        charts.zeroWindow.data.datasets[0].data = historyData.zeroWindows;
        charts.zeroWindow.update();
    }

    // Update overview chart
    charts.overview.data.labels = historyData.labels;
    charts.overview.data.datasets[0].data = historyData.cpu;
    charts.overview.data.datasets[1].data = historyData.memory;
    charts.overview.update();

    // Update memory chart
    charts.memory.data.labels = historyData.labels;
    charts.memory.data.datasets[0].data = historyData.memory;
    charts.memory.update();

    // Update CPU chart
    charts.cpu.data.labels = historyData.labels;
    charts.cpu.data.datasets[0].data = historyData.cpu;
    charts.cpu.update();

    // Update disks
    if (metrics.disk && metrics.disk.disks) {
        updateDiskGrid(metrics.disk.disks);
    }

    // Update network interfaces
    if (metrics.network && metrics.network.interfaces) {
        updateNetworkGrid(metrics.network.interfaces);
    }

    // Update processes
    if (metrics.processes) {
        updateProcessesTable(metrics.processes);
    }

    // Check for alerts
    checkAlerts(metrics);
}

function updateConnectionsTable(connections) {
    const tbody = document.querySelector('#connectionsTable tbody');
    tbody.innerHTML = '';

    // Show first 100 connections
    const displayed = connections.slice(0, 100);
    displayed.forEach(conn => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${conn.localAddress}:${conn.localPort}</td>
            <td>${conn.remoteAddress}:${conn.remotePort}</td>
            <td><span class="state-badge ${getStateBadgeClass(conn.state)}">${conn.state}</span></td>
            <td>${conn.pid}</td>
        `;
        tbody.appendChild(row);
    });
}

function updateDiskGrid(disks) {
    const grid = document.getElementById('diskGrid');
    grid.innerHTML = '';

    disks.forEach(disk => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span class="card-title">💾 ${disk.name}</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Total</span>
                <span class="metric-value">${formatBytes(disk.totalBytes)}</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Free</span>
                <span class="metric-value">${formatBytes(disk.freeBytes)}</span>
            </div>
            <div>
                <span class="metric-label">Usage: ${disk.usedPercent.toFixed(1)}%</span>
                <div class="progress-bar">
                    <div class="progress-fill ${getColorClass(disk.usedPercent)}" style="width: ${disk.usedPercent}%"></div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateNetworkGrid(interfaces) {
    const grid = document.getElementById('networkGrid');
    grid.innerHTML = '';

    interfaces.forEach(iface => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="card-header">
                <span class="card-title">📡 ${iface.name || iface.description}</span>
                <span style="color: ${iface.isUp ? '#00d9a5' : '#e63946'}">${iface.isUp ? '● UP' : '○ DOWN'}</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Speed</span>
                <span class="metric-value">${formatSpeed(iface.speed)}</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Sent</span>
                <span class="metric-value">${formatBytes(iface.bytesSentPerSec)}/s</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Received</span>
                <span class="metric-value">${formatBytes(iface.bytesRecvPerSec)}/s</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Errors In/Out</span>
                <span class="metric-value">${iface.inErrors}/${iface.outErrors}</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Discards In/Out</span>
                <span class="metric-value" style="color: ${(iface.inDiscards + iface.outDiscards) > 0 ? '#e63946' : 'inherit'}">${iface.inDiscards}/${iface.outDiscards}</span>
            </div>
            <div>
                <span class="metric-label">Utilization: ${(iface.utilization || 0).toFixed(1)}%</span>
                <div class="progress-bar">
                    <div class="progress-fill ${getColorClass(iface.utilization || 0)}" style="width: ${iface.utilization || 0}%"></div>
                </div>
            </div>
        `;
        grid.appendChild(card);
    });
}

function updateProcessesTable(processes) {
    const tbody = document.querySelector('#processesTable tbody');
    tbody.innerHTML = '';

    processes.slice(0, 30).forEach(proc => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${proc.pid}</td>
            <td>${proc.name}</td>
            <td>${formatBytes(proc.memoryBytes)}</td>
            <td>${proc.memoryPercent.toFixed(2)}%</td>
        `;
        tbody.appendChild(row);
    });
}

function checkAlerts(metrics) {
    const container = document.getElementById('alertsContainer');
    const alerts = [];

    // Check CPU
    if (metrics.cpu && metrics.cpu.totalPercent > 90) {
        alerts.push({ level: 'critical', message: `CPU usage critical: ${metrics.cpu.totalPercent.toFixed(1)}%` });
    } else if (metrics.cpu && metrics.cpu.totalPercent > 70) {
        alerts.push({ level: 'warning', message: `CPU usage high: ${metrics.cpu.totalPercent.toFixed(1)}%` });
    }

    // Check Memory
    if (metrics.memory && metrics.memory.usedPercent > 90) {
        alerts.push({ level: 'critical', message: `Memory usage critical: ${metrics.memory.usedPercent.toFixed(1)}%` });
    } else if (metrics.memory && metrics.memory.usedPercent > 80) {
        alerts.push({ level: 'warning', message: `Memory usage high: ${metrics.memory.usedPercent.toFixed(1)}%` });
    }

    // Check CLOSE_WAIT
    if (metrics.tcp && metrics.tcp.closeWaitCount > 50) {
        alerts.push({ level: 'critical', message: `High CLOSE_WAIT connections: ${metrics.tcp.closeWaitCount} (potential connection leak)` });
    } else if (metrics.tcp && metrics.tcp.closeWaitCount > 10) {
        alerts.push({ level: 'warning', message: `Elevated CLOSE_WAIT connections: ${metrics.tcp.closeWaitCount}` });
    }

    // Check TIME_WAIT
    if (metrics.tcp && metrics.tcp.timeWaitCount > 5000) {
        alerts.push({ level: 'warning', message: `High TIME_WAIT connections: ${metrics.tcp.timeWaitCount} (connection churn)` });
    }

    // Check retransmission rate
    if (metrics.tcp && metrics.tcp.retransmissionRate > 5) {
        alerts.push({ level: 'critical', message: `High retransmission rate: ${metrics.tcp.retransmissionRate.toFixed(2)}%` });
    } else if (metrics.tcp && metrics.tcp.retransmissionRate > 1) {
        alerts.push({ level: 'warning', message: `Elevated retransmission rate: ${metrics.tcp.retransmissionRate.toFixed(2)}%` });
    }

    if (alerts.length === 0) {
        container.innerHTML = '<div class="no-data">No active alerts</div>';
    } else {
        container.innerHTML = alerts.map(alert => `
            <div class="alert-box alert-${alert.level}">
                ${alert.level === 'critical' ? '🔴' : '🟡'} ${alert.message}
            </div>
        `).join('');
    }
}

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(`tab-${tabName}`).classList.add('active');
    event.target.classList.add('active');
}

// Utility functions
function formatBytes(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function formatSpeed(bps) {
    if (!bps || bps === 0) return '0 bps';
    const k = 1000;
    const sizes = ['bps', 'Kbps', 'Mbps', 'Gbps'];
    const i = Math.floor(Math.log(bps) / Math.log(k));
    return parseFloat((bps / Math.pow(k, i)).toFixed(0)) + ' ' + sizes[i];
}

function formatNumber(num) {
    if (!num) return '0';
    return num.toLocaleString();
}

function getColorForValue(value) {
    if (value >= 90) return '#e63946';
    if (value >= 70) return '#ffc107';
    return '#00d9a5';
}

function getColorClass(value) {
    if (value >= 90) return 'red';
    if (value >= 70) return 'yellow';
    return 'green';
}

function getStateBadgeClass(state) {
    switch (state) {
        case 'ESTABLISHED': return 'state-established';
        case 'TIME_WAIT': return 'state-time-wait';
        case 'CLOSE_WAIT': return 'state-close-wait';
        case 'LISTEN': return 'state-listen';
        default: return 'state-other';
    }
}

// Update TCP Window Free/Busy Status
function updateWindowStatus(tcp) {
    const currentZeroWindows = tcp.zeroWindowEvents || 0;
    const zeroWindowRate = tcp.zeroWindowRate || 0;
    
    // Update numeric displays
    document.getElementById('zeroWindowEvents').textContent = formatNumber(currentZeroWindows);
    document.getElementById('zeroWindowRate').textContent = zeroWindowRate.toFixed(2) + '/sec';
    
    // Calculate new events since last update
    const newEvents = currentZeroWindows - lastZeroWindowCount;
    lastZeroWindowCount = currentZeroWindows;
    
    // Determine status: FREE, WARNING, or BUSY
    const statusBox = document.getElementById('windowStatusIndicator');
    const healthProgress = document.getElementById('windowHealthProgress');
    const bufferStatus = document.getElementById('bufferStatus');
    
    let status, icon, label, healthPercent, healthColor, bufferText;
    
    if (zeroWindowRate > 10 || newEvents > 5) {
        // BUSY - High rate of zero windows
        status = 'busy';
        icon = '✕';
        label = 'BUSY';
        healthPercent = Math.max(0, 100 - (zeroWindowRate * 5));
        healthColor = 'red';
        bufferText = 'Buffer Full!';
    } else if (zeroWindowRate > 1 || newEvents > 0 || currentZeroWindows > 100) {
        // WARNING - Some zero windows detected
        status = 'warning';
        icon = '⚠';
        label = 'WARNING';
        healthPercent = Math.max(20, 100 - (zeroWindowRate * 10));
        healthColor = 'yellow';
        bufferText = 'Pressure Detected';
    } else {
        // FREE - No zero window issues
        status = 'free';
        icon = '✓';
        label = 'FREE';
        healthPercent = 100;
        healthColor = 'green';
        bufferText = 'Normal';
    }
    
    // Update UI elements
    statusBox.className = 'window-status-box ' + status;
    statusBox.innerHTML = `
        <div class="window-icon">${icon}</div>
        <div class="window-label">${label}</div>
    `;
    
    healthProgress.style.width = healthPercent + '%';
    healthProgress.className = 'progress-fill ' + healthColor;
    
    bufferStatus.textContent = bufferText;
    bufferStatus.style.color = status === 'free' ? '#00d9a5' : (status === 'warning' ? '#ffc107' : '#e63946');
}
