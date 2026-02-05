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
    console.log('startMonitoring called');
    const intervalSelect = document.getElementById('intervalSelect');
    console.log('intervalSelect element:', intervalSelect);
    
    if (!intervalSelect) {
        console.error('intervalSelect element not found!');
        return;
    }
    
    const interval = parseInt(intervalSelect.value);
    console.log('Starting monitoring with interval:', interval);
    
    try {
        const response = await fetch('/api/monitoring/start', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ interval: interval / 1000 })
        });
        console.log('Start monitoring response status:', response.status);
        const result = await response.json();
        console.log('Start monitoring result:', result);
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

        // Update topology diagram
        updateTopologyDiagram(metrics.tcp.connections || [], states);
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

// Store all connections for filtering
let allConnections = [];

function updateConnectionsTable(connections) {
    allConnections = connections;
    document.getElementById('connectionCount').textContent = `(${connections.length})`;
    filterConnections();
}

function filterConnections() {
    const searchTerm = (document.getElementById('connectionSearch')?.value || '').toLowerCase();
    const stateFilter = document.getElementById('stateFilter')?.value || '';
    
    let filtered = allConnections;
    
    // Apply state filter
    if (stateFilter) {
        filtered = filtered.filter(conn => conn.state === stateFilter);
    }
    
    // Apply search filter
    if (searchTerm) {
        filtered = filtered.filter(conn => {
            const searchStr = `${conn.localAddress}:${conn.localPort} ${conn.remoteAddress}:${conn.remotePort} ${conn.state} ${conn.pid}`.toLowerCase();
            return searchStr.includes(searchTerm);
        });
    }
    
    renderConnectionsTable(filtered);
}

function renderConnectionsTable(connections) {
    const tbody = document.querySelector('#connectionsTable tbody');
    tbody.innerHTML = '';

    // Show first 200 connections (increased limit)
    const displayed = connections.slice(0, 200);
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
    
    // Show count info
    if (connections.length > 200) {
        const row = document.createElement('tr');
        row.innerHTML = `<td colspan="4" style="text-align: center; color: var(--text-secondary);">... and ${connections.length - 200} more connections</td>`;
        tbody.appendChild(row);
    }
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

// ==================== TRACEROUTE FUNCTIONS ====================

async function runTraceroute() {
    const targetInput = document.getElementById('traceTarget');
    const target = targetInput.value.trim();
    
    if (!target) {
        alert('Please enter a target IP or hostname');
        return;
    }

    const traceBtn = document.getElementById('traceBtn');
    const traceStatus = document.getElementById('traceStatus');
    const traceResults = document.getElementById('traceResults');

    // Disable button during trace
    traceBtn.disabled = true;
    traceBtn.textContent = '⏳ Tracing...';
    traceStatus.innerHTML = '<span style="color: var(--accent-yellow);">🔄 Tracing route to ' + target + '... This may take up to 60 seconds.</span>';
    traceResults.style.display = 'none';

    try {
        const response = await fetch('/api/trace?target=' + encodeURIComponent(target));
        const result = await response.json();

        if (result.error) {
            traceStatus.innerHTML = '<span style="color: var(--accent-red);">❌ Error: ' + result.error + '</span>';
            return;
        }

        // Display results
        displayTraceResults(result);
        traceResults.style.display = 'block';
        traceStatus.innerHTML = '<span style="color: var(--accent-green);">✅ Trace completed!</span>';

    } catch (error) {
        traceStatus.innerHTML = '<span style="color: var(--accent-red);">❌ Error: ' + error.message + '</span>';
    } finally {
        traceBtn.disabled = false;
        traceBtn.textContent = '🚀 Trace Route';
    }
}

function displayTraceResults(result) {
    // Update summary cards
    document.getElementById('traceTargetIP').textContent = result.targetIP || result.target;
    document.getElementById('traceTotalHops').textContent = result.totalHops || 0;
    document.getElementById('traceDuration').textContent = (result.duration || 0).toFixed(0);
    
    const completedEl = document.getElementById('traceCompleted');
    if (result.completed) {
        completedEl.textContent = 'Complete';
        completedEl.className = 'stat-value green';
    } else {
        completedEl.textContent = 'Incomplete';
        completedEl.className = 'stat-value yellow';
    }

    // Build visual diagram
    buildTraceDiagram(result);

    // Build detail table
    buildTraceTable(result);
}

function buildTraceDiagram(result) {
    const diagram = document.getElementById('traceDiagram');
    diagram.innerHTML = '';

    // Add source node
    diagram.innerHTML += `
        <div class="trace-hop-node">
            <div class="trace-hop-icon source">🖥️</div>
            <div class="trace-hop-info">
                <div class="trace-hop-num">Source</div>
                <div class="trace-hop-ip">This Machine</div>
            </div>
        </div>
    `;

    if (!result.hops || result.hops.length === 0) {
        diagram.innerHTML += '<div style="padding: 20px; color: var(--text-secondary);">No hops detected</div>';
        return;
    }

    // Add each hop
    result.hops.forEach((hop, index) => {
        const isLast = index === result.hops.length - 1;
        const isTarget = hop.ip === result.targetIP;
        const isSlow = hop.avgLatency > 100;

        // Add connector
        diagram.innerHTML += `
            <div class="trace-connector">
                <div class="trace-line ${isSlow ? 'slow' : ''}"></div>
            </div>
        `;

        // Determine node type
        let iconClass = 'hop';
        let icon = '🌐';
        
        if (hop.timeout) {
            iconClass = 'timeout';
            icon = '❓';
        } else if (isTarget || isLast) {
            iconClass = 'target';
            icon = '🎯';
        }

        // Format latency display
        const latencyText = hop.timeout ? 'Timeout' : (hop.avgLatency ? hop.avgLatency.toFixed(1) + ' ms' : '--');
        const latencyColor = hop.avgLatency > 100 ? 'color: var(--accent-red)' : 
                            hop.avgLatency > 50 ? 'color: var(--accent-yellow)' : '';

        diagram.innerHTML += `
            <div class="trace-hop-node">
                <div class="trace-hop-icon ${iconClass}">${icon}</div>
                <div class="trace-hop-info">
                    <div class="trace-hop-num">Hop ${hop.hop}</div>
                    <div class="trace-hop-ip" title="${hop.ip || '*'}">${hop.ip || '*'}</div>
                    <div class="trace-hop-latency" style="${latencyColor}">${latencyText}</div>
                </div>
            </div>
        `;
    });
}

function buildTraceTable(result) {
    const tbody = document.querySelector('#traceTable tbody');
    tbody.innerHTML = '';

    if (!result.hops || result.hops.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-secondary);">No hops detected</td></tr>';
        return;
    }

    result.hops.forEach(hop => {
        const formatRtt = (rtt) => {
            if (rtt === undefined || rtt < 0) return '<span style="color: var(--text-secondary);">*</span>';
            const color = rtt > 100 ? 'var(--accent-red)' : rtt > 50 ? 'var(--accent-yellow)' : 'var(--accent-green)';
            return `<span style="color: ${color}">${rtt.toFixed(1)} ms</span>`;
        };

        const statusBadge = hop.timeout 
            ? '<span class="state-badge" style="background: var(--text-secondary);">Timeout</span>'
            : hop.loss > 0 
                ? `<span class="state-badge" style="background: var(--accent-yellow); color: #000;">${hop.loss}/3 Lost</span>`
                : '<span class="state-badge state-established">OK</span>';

        tbody.innerHTML += `
            <tr>
                <td>${hop.hop}</td>
                <td>${hop.ip || '*'}</td>
                <td style="max-width: 200px; overflow: hidden; text-overflow: ellipsis;">${hop.hostname || '-'}</td>
                <td>${formatRtt(hop.latency1)}</td>
                <td>${formatRtt(hop.latency2)}</td>
                <td>${formatRtt(hop.latency3)}</td>
                <td>${hop.timeout ? '-' : (hop.avgLatency ? hop.avgLatency.toFixed(1) + ' ms' : '-')}</td>
                <td>${statusBadge}</td>
            </tr>
        `;
    });
}

// ==================== NETPATH PROBE FUNCTIONS ====================

let netPathState = {
    currentProbe: null,
    currentResult: null,
    probeInterval: null,
    activeProbes: []
};

async function startNetPathProbe() {
    console.log('startNetPathProbe called');
    
    const targetEl = document.getElementById('netpathTarget');
    const maxHopsEl = document.getElementById('netpathMaxHops');
    const timeoutEl = document.getElementById('netpathTimeout');
    const modeEl = document.getElementById('netpathMode');
    
    console.log('Elements:', { targetEl, maxHopsEl, timeoutEl, modeEl });
    
    if (!targetEl) {
        console.error('netpathTarget element not found!');
        return;
    }
    
    const target = targetEl.value.trim();
    const maxHops = parseInt(maxHopsEl.value);
    const timeout = parseInt(timeoutEl.value);
    const mode = modeEl.value;
    
    console.log('Values:', { target, maxHops, timeout, mode });

    if (!target) {
        showNetPathStatus('Please enter a target IP or hostname', 'error');
        return;
    }

    const btn = document.getElementById('netpathStartBtn');
    btn.disabled = true;
    btn.innerHTML = '<span style="animation: spin 1s linear infinite;">⏳</span> Probing...';
    
    showNetPathStatus('Starting probe to ' + target + '...', 'info');

    try {
        if (mode === 'continuous') {
            // Start continuous probe
            console.log('Starting continuous probe');
            const response = await fetch('/api/netpath/start', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    target: target,
                    maxHops: maxHops,
                    timeout: timeout,
                    interval: 60
                })
            });
            
            const data = await response.json();
            console.log('Continuous probe response:', data);
            if (data.error) {
                showNetPathStatus('Error: ' + data.error, 'error');
                return;
            }

            netPathState.currentProbe = data.probe;
            showNetPathStatus('Continuous probe started. Refreshing every 60 seconds.', 'success');
            
            // Start polling for updates
            startNetPathPolling(target);
            
            // Display initial results if available
            if (data.probe.currentPath) {
                displayNetPathResult(target, data.probe.currentPath);
            }
        } else {
            // Single probe
            console.log('Starting single probe to:', target);
            const response = await fetch('/api/netpath/probe?target=' + encodeURIComponent(target));
            console.log('Single probe response status:', response.status);
            const data = await response.json();
            console.log('Single probe data:', data);
            
            if (data.error) {
                showNetPathStatus('Error: ' + data.error, 'error');
                return;
            }

            displayNetPathResult(target, data.result);
            showNetPathStatus('Probe completed successfully!', 'success');
        }
    } catch (error) {
        showNetPathStatus('Error: ' + error.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<span>▶</span> Start Probe';
    }
}

function startNetPathPolling(target) {
    // Clear existing interval
    if (netPathState.probeInterval) {
        clearInterval(netPathState.probeInterval);
    }

    // Poll every 5 seconds for updates
    netPathState.probeInterval = setInterval(async () => {
        try {
            const response = await fetch('/api/netpath/probe?target=' + encodeURIComponent(target));
            const data = await response.json();
            
            if (data.probe && data.probe.currentPath) {
                displayNetPathResult(target, data.probe.currentPath);
            }
        } catch (error) {
            console.error('Polling error:', error);
        }
    }, 5000);
}

async function stopNetPathProbe(target) {
    try {
        await fetch('/api/netpath/stop', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: target })
        });
        
        if (netPathState.probeInterval) {
            clearInterval(netPathState.probeInterval);
            netPathState.probeInterval = null;
        }
        
        showNetPathStatus('Probe stopped', 'info');
        refreshAllProbes();
    } catch (error) {
        showNetPathStatus('Error stopping probe: ' + error.message, 'error');
    }
}

async function deleteNetPathProbe(target) {
    try {
        await fetch('/api/netpath/delete', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ target: target })
        });
        
        refreshAllProbes();
    } catch (error) {
        console.error('Delete error:', error);
    }
}

async function refreshAllProbes() {
    try {
        const response = await fetch('/api/netpath/probes');
        const data = await response.json();
        
        netPathState.activeProbes = data.probes || [];
        updateActiveProbesList();
    } catch (error) {
        console.error('Refresh error:', error);
    }
}

function updateActiveProbesList() {
    const panel = document.getElementById('activeProbesPanel');
    const list = document.getElementById('activeProbesList');
    
    if (!netPathState.activeProbes || netPathState.activeProbes.length === 0) {
        panel.style.display = 'none';
        return;
    }
    
    panel.style.display = 'block';
    list.innerHTML = '';
    
    netPathState.activeProbes.forEach(probe => {
        const statusColor = probe.status === 'running' ? '#10b981' : '#6b7280';
        const card = document.createElement('div');
        card.style.cssText = `
            background: #0f2744; border: 1px solid #2a4a6c; border-radius: 8px;
            padding: 12px 15px; display: flex; align-items: center; gap: 15px;
        `;
        card.innerHTML = `
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${statusColor};"></span>
            <div>
                <div style="font-weight: 600; color: #e2e8f0;">${probe.target}</div>
                <div style="font-size: 11px; color: #7a9ab8;">${probe.probeCount} probes • ${probe.status}</div>
            </div>
            <button onclick="loadProbeResult('${probe.target}')" 
                    style="margin-left: auto; padding: 5px 10px; border-radius: 4px; border: 1px solid #4aa3df;
                           background: transparent; color: #4aa3df; cursor: pointer; font-size: 11px;">
                View
            </button>
            <button onclick="stopNetPathProbe('${probe.target}')"
                    style="padding: 5px 10px; border-radius: 4px; border: 1px solid #f97316;
                           background: transparent; color: #f97316; cursor: pointer; font-size: 11px;">
                Stop
            </button>
        `;
        list.appendChild(card);
    });
}

async function loadProbeResult(target) {
    try {
        const response = await fetch('/api/netpath/probe?target=' + encodeURIComponent(target));
        const data = await response.json();
        
        if (data.probe && data.probe.currentPath) {
            displayNetPathResult(target, data.probe.currentPath);
        }
    } catch (error) {
        console.error('Load error:', error);
    }
}

function showNetPathStatus(message, type) {
    const status = document.getElementById('netpathStatus');
    const colors = {
        success: { bg: '#10b98120', border: '#10b981', text: '#10b981' },
        error: { bg: '#ef444420', border: '#ef4444', text: '#ef4444' },
        info: { bg: '#4aa3df20', border: '#4aa3df', text: '#4aa3df' },
        warning: { bg: '#f59e0b20', border: '#f59e0b', text: '#f59e0b' }
    };
    const color = colors[type] || colors.info;
    
    status.style.display = 'block';
    status.style.background = color.bg;
    status.style.border = '1px solid ' + color.border;
    status.style.color = color.text;
    status.textContent = message;
    
    // Auto-hide after 5 seconds for success/info
    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            status.style.display = 'none';
        }, 5000);
    }
}

function displayNetPathResult(target, result) {
    // Show results panel, hide empty state
    document.getElementById('netpathResults').style.display = 'block';
    document.getElementById('netpathEmpty').style.display = 'none';
    
    netPathState.currentResult = result;
    
    // Update summary
    document.getElementById('npTargetDisplay').textContent = target.length > 20 ? target.substring(0, 17) + '...' : target;
    document.getElementById('npTargetDisplay').title = target;
    document.getElementById('npTotalHops').textContent = result.totalHops || 0;
    document.getElementById('npLatency').textContent = (result.totalLatency || 0).toFixed(1) + ' ms';
    
    const lossEl = document.getElementById('npPacketLoss');
    lossEl.textContent = (result.packetLoss || 0).toFixed(1) + '%';
    lossEl.style.color = result.packetLoss > 5 ? '#ef4444' : result.packetLoss > 0 ? '#f59e0b' : '#10b981';
    
    const problemsEl = document.getElementById('npProblems');
    const problemCount = (result.problemHops || []).length;
    problemsEl.textContent = problemCount;
    problemsEl.style.color = problemCount > 0 ? '#ef4444' : '#10b981';
    
    const statusEl = document.getElementById('npStatus');
    if (result.completed) {
        if (result.hasProblems) {
            statusEl.textContent = 'Issues';
            statusEl.style.color = '#f97316';
        } else {
            statusEl.textContent = 'Healthy';
            statusEl.style.color = '#10b981';
        }
    } else {
        statusEl.textContent = 'Incomplete';
        statusEl.style.color = '#f59e0b';
    }
    
    document.getElementById('netpathLastUpdate').textContent = 'Last update: ' + new Date().toLocaleTimeString();
    
    // Draw visualization
    drawNetPathVisualization(target, result);
    
    // Update table
    updateNetPathTable(result);
}

// NetPath zoom state
let netPathZoom = {
    scale: 1.0,
    minScale: 0.5,
    maxScale: 2.0
};

function zoomNetPath(delta) {
    netPathZoom.scale = Math.max(netPathZoom.minScale, Math.min(netPathZoom.maxScale, netPathZoom.scale + delta));
    document.getElementById('netpathZoomLevel').textContent = Math.round(netPathZoom.scale * 100) + '%';
    if (netPathState.currentResult) {
        drawNetPathVisualization(document.getElementById('netpathTarget').value, netPathState.currentResult);
    }
}

function resetNetPathZoom() {
    netPathZoom.scale = 1.0;
    document.getElementById('netpathZoomLevel').textContent = '100%';
    if (netPathState.currentResult) {
        drawNetPathVisualization(document.getElementById('netpathTarget').value, netPathState.currentResult);
    }
}

function drawNetPathVisualization(target, result) {
    const canvas = document.getElementById('netpathCanvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const container = document.getElementById('netpathCanvasContainer');
    
    const hops = result.hops || [];
    const totalNodes = hops.length + 1; // +1 for source
    
    // 5 hops per line layout
    const HOPS_PER_LINE = 5;
    const numLines = Math.ceil(totalNodes / HOPS_PER_LINE);
    
    console.log('NetPath Visualization: totalNodes=' + totalNodes + ', HOPS_PER_LINE=' + HOPS_PER_LINE + ', numLines=' + numLines + ', zoom=' + netPathZoom.scale);
    
    // Calculate dimensions with zoom
    const baseNodeSpacing = 180;    // Wider spacing for device names
    const baseLineHeight = 180;      // Taller rows for device details
    const basePadding = 80;
    
    const nodeSpacing = baseNodeSpacing * netPathZoom.scale;
    const lineHeight = baseLineHeight * netPathZoom.scale;
    const padding = basePadding * netPathZoom.scale;
    
    const nodesPerLine = Math.min(HOPS_PER_LINE, totalNodes);
    const canvasWidth = Math.max(container.clientWidth, nodesPerLine * nodeSpacing + padding * 2);
    const canvasHeight = Math.max(400, numLines * lineHeight + padding * 2);
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    
    // Clear and draw background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, canvasHeight);
    bgGradient.addColorStop(0, '#0a1628');
    bgGradient.addColorStop(1, '#0f2744');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Draw subtle grid
    ctx.strokeStyle = '#1a3a5c15';
    ctx.lineWidth = 1;
    for (let x = 0; x < canvasWidth; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvasHeight);
        ctx.stroke();
    }
    for (let y = 0; y < canvasHeight; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvasWidth, y);
        ctx.stroke();
    }
    
    if (hops.length === 0) {
        ctx.fillStyle = '#7a9ab8';
        ctx.font = '14px Segoe UI';
        ctx.textAlign = 'center';
        ctx.fillText('No hop data available', canvasWidth / 2, canvasHeight / 2);
        return;
    }
    
    // Build all nodes (source + hops) with device details
    const allNodes = [
        { 
            type: 'source', 
            label: 'Source', 
            sublabel: 'This Machine',
            deviceType: 'server',
            deviceName: 'Local Host',
            ip: 'localhost',
            status: 'healthy' 
        }
    ];
    
    hops.forEach((hop, index) => {
        const isTarget = index === hops.length - 1;
        allNodes.push({
            type: isTarget ? 'target' : 'hop',
            label: hop.deviceName || hop.hostname || hop.ip || '*',
            sublabel: hop.ip || (isTarget ? 'Destination' : `Hop ${hop.hop}`),
            deviceType: hop.deviceType || 'unknown',
            deviceName: hop.deviceName || '',
            deviceVendor: hop.deviceVendor || '',
            hostname: hop.hostname || '',
            ip: hop.ip || '',
            location: hop.location || '',
            asn: hop.asn || '',
            isp: hop.isp || '',
            minLatency: hop.minLatency,
            maxLatency: hop.maxLatency,
            jitter: hop.jitter,
            packetsSent: hop.packetsSent,
            packetsRecv: hop.packetsRecv,
            status: hop.status || 'healthy',
            latency: hop.avgLatency,
            loss: hop.packetLoss,
            isBottleneck: hop.isBottleneck,
            hopData: hop
        });
    });
    
    // Calculate node positions (5 per line, snake pattern for clean flow)
    const nodePositions = [];
    allNodes.forEach((node, index) => {
        const lineIndex = Math.floor(index / HOPS_PER_LINE);
        const posInLine = index % HOPS_PER_LINE;
        
        // Alternate direction for each line (snake pattern)
        const isReverseLine = lineIndex % 2 === 1;
        const adjustedPos = isReverseLine ? (HOPS_PER_LINE - 1 - posInLine) : posInLine;
        
        const x = padding + adjustedPos * nodeSpacing + nodeSpacing / 2;
        const y = padding + lineIndex * lineHeight + lineHeight / 2;
        
        nodePositions.push({ x, y, node, index });
    });
    
    // Draw connections
    for (let i = 0; i < nodePositions.length - 1; i++) {
        const from = nodePositions[i];
        const to = nodePositions[i + 1];
        const hopData = allNodes[i + 1].hopData || {};
        const lineColor = getStatusColor(allNodes[i + 1].status || 'healthy');
        
        // Check if crossing to next line
        const fromLine = Math.floor(i / HOPS_PER_LINE);
        const toLine = Math.floor((i + 1) / HOPS_PER_LINE);
        
        // Determine direction: even lines go right, odd lines go left
        const isReverseLine = fromLine % 2 === 1;
        
        if (fromLine !== toLine) {
            // Draw curved connector to next line
            drawNetPathCurvedLine(ctx, from.x, from.y, to.x, to.y, hopData, lineColor, netPathZoom.scale, isReverseLine);
        } else {
            // Draw straight line with correct direction
            const nodeSize = 24 * netPathZoom.scale;
            if (isReverseLine) {
                // Going left on odd lines
                drawNetPathLine(ctx, from.x - nodeSize, from.y, to.x + nodeSize, to.y, hopData, lineColor, netPathZoom.scale, 'left');
            } else {
                // Going right on even lines
                drawNetPathLine(ctx, from.x + nodeSize, from.y, to.x - nodeSize, to.y, hopData, lineColor, netPathZoom.scale, 'right');
            }
        }
    }
    
    // Draw nodes
    nodePositions.forEach(({ x, y, node }) => {
        drawNetPathNode(ctx, x, y, node, netPathZoom.scale);
    });
}

function drawNetPathCurvedLine(ctx, x1, y1, x2, y2, hop, color, scale, fromReverseLine = false) {
    const isTimeout = hop.timeout;
    
    ctx.strokeStyle = color + '80';
    ctx.lineWidth = (isTimeout ? 2 : 3) * scale;
    ctx.setLineDash(isTimeout ? [6, 4] : []);
    ctx.lineCap = 'round';
    
    // Draw curved path going down to next line
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    
    // Control points for smooth curve
    const midY = (y1 + y2) / 2;
    ctx.bezierCurveTo(x1, midY, x2, midY, x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw arrow pointing down at midpoint
    const arrowY = midY;
    const arrowX = (x1 + x2) / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    // Arrow pointing down ↓
    ctx.moveTo(arrowX, arrowY + 6 * scale);
    ctx.lineTo(arrowX - 5 * scale, arrowY - 4 * scale);
    ctx.lineTo(arrowX + 5 * scale, arrowY - 4 * scale);
    ctx.closePath();
    ctx.fill();
    
    // Show hop latency on the curve
    if (hop.avgLatency && hop.avgLatency > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${8 * scale}px Segoe UI`;
        ctx.textAlign = 'center';
        ctx.fillText(`${hop.avgLatency.toFixed(0)}ms`, arrowX + 25 * scale, arrowY);
    }
}

function drawNetPathNode(ctx, x, y, config, scale = 1) {
    const { type, label, sublabel, status, latency, loss, isBottleneck, deviceType, deviceVendor, hostname, ip, location, asn, isp, minLatency, maxLatency, jitter, packetsSent, packetsRecv } = config;
    
    const baseSize = type === 'source' ? 30 : (type === 'target' ? 28 : 24);
    const size = baseSize * scale;
    const color = getStatusColor(status);
    
    // Bottleneck highlight
    if (isBottleneck) {
        ctx.strokeStyle = '#ef4444';
        ctx.lineWidth = 3 * scale;
        ctx.setLineDash([5, 3]);
        ctx.beginPath();
        ctx.arc(x, y, size + 12 * scale, 0, Math.PI * 2);
        ctx.stroke();
        ctx.setLineDash([]);
    }
    
    // Outer glow
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size + 15 * scale);
    glowGradient.addColorStop(0, color + '40');
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, size + 15 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Node background
    ctx.fillStyle = '#0a1628';
    ctx.beginPath();
    ctx.arc(x, y, size + 3 * scale, 0, Math.PI * 2);
    ctx.fill();
    
    // Node ring
    ctx.strokeStyle = color;
    ctx.lineWidth = 3 * scale;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner fill
    const innerGradient = ctx.createRadialGradient(x - size/4, y - size/4, 0, x, y, size);
    innerGradient.addColorStop(0, color);
    innerGradient.addColorStop(1, shadeColor(color, -30));
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(x, y, size - 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Device type icon based on type
    ctx.fillStyle = '#ffffff';
    ctx.font = `${size * 0.7}px Segoe UI Emoji`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    let icon = getDeviceTypeIcon(deviceType, type, status);
    ctx.fillText(icon, x, y + 1);
    
    // Device name (primary label)
    ctx.fillStyle = '#e2e8f0';
    ctx.font = `bold ${10 * scale}px Segoe UI`;
    const displayLabel = label.length > 18 ? label.substring(0, 15) + '...' : label;
    ctx.fillText(displayLabel, x, y + size + 18 * scale);
    
    // IP address (sublabel)
    ctx.fillStyle = '#64748b';
    ctx.font = `${9 * scale}px Segoe UI`;
    const ipLabel = ip || sublabel;
    ctx.fillText(ipLabel, x, y + size + 30 * scale);
    
    // Current Y offset for additional info
    let infoY = y + size + 42 * scale;
    
    // Device type badge with vendor (below IP)
    if (deviceType && deviceType !== 'unknown') {
        const deviceTypeBadge = formatDeviceType(deviceType) + (deviceVendor ? ` (${deviceVendor})` : '');
        ctx.fillStyle = '#4aa3df';
        ctx.font = `italic ${8 * scale}px Segoe UI`;
        ctx.fillText(deviceTypeBadge, x, infoY);
        infoY += 11 * scale;
    }
    
    // ISP info (if available)
    if (isp) {
        ctx.fillStyle = '#22d3ee';
        ctx.font = `${7 * scale}px Segoe UI`;
        ctx.fillText('🌐 ' + isp, x, infoY);
        infoY += 10 * scale;
    }
    
    // ASN info (if available)
    if (asn) {
        ctx.fillStyle = '#a78bfa';
        ctx.font = `${7 * scale}px Segoe UI`;
        ctx.fillText('AS' + asn, x, infoY);
        infoY += 10 * scale;
    }
    
    // Location badge (if available)
    if (location) {
        ctx.fillStyle = '#f472b6';
        ctx.font = `${7 * scale}px Segoe UI`;
        ctx.fillText('📍 ' + location, x, infoY);
        infoY += 10 * scale;
    }
    
    // Latency badge (top of node)
    if (latency !== undefined && latency > 0) {
        const badgeY = y - size - 15 * scale;
        const badgeText = latency.toFixed(1) + 'ms';
        ctx.font = `bold ${9 * scale}px Segoe UI`;
        const badgeWidth = ctx.measureText(badgeText).width + 12 * scale;
        
        ctx.fillStyle = '#0a1628';
        ctx.beginPath();
        ctx.roundRect(x - badgeWidth/2, badgeY - 8 * scale, badgeWidth, 16 * scale, 8 * scale);
        ctx.fill();
        
        ctx.strokeStyle = color + '80';
        ctx.lineWidth = 1;
        ctx.stroke();
        
        ctx.fillStyle = color;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(badgeText, x, badgeY);
        
        // Min-Max range (smaller, above the main badge)
        if (minLatency !== undefined && maxLatency !== undefined && minLatency !== maxLatency) {
            ctx.fillStyle = '#94a3b8';
            ctx.font = `${7 * scale}px Segoe UI`;
            ctx.fillText(`${minLatency.toFixed(0)}-${maxLatency.toFixed(0)}ms`, x, badgeY - 14 * scale);
        }
    }
    
    // Packet stats on side (if available and has issues)
    if (loss !== undefined && loss > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.font = `bold ${7 * scale}px Segoe UI`;
        ctx.textAlign = 'left';
        ctx.fillText(`📉 ${loss.toFixed(0)}% loss`, x + size + 5 * scale, y - 5 * scale);
        ctx.textAlign = 'center';
    }
    
    // Jitter indicator on side (if significant)
    if (jitter !== undefined && jitter > 15) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = `${7 * scale}px Segoe UI`;
        ctx.textAlign = 'left';
        ctx.fillText(`±${jitter.toFixed(0)}ms`, x + size + 5 * scale, y + 5 * scale);
        ctx.textAlign = 'center';
    }
}

// Get appropriate icon for device type
function getDeviceTypeIcon(deviceType, nodeType, status) {
    if (nodeType === 'source') return '💻';
    if (nodeType === 'target') return '🎯';
    if (status === 'timeout') return '❓';
    if (status === 'critical') return '⚠️';
    
    const icons = {
        'router': '🔀',
        'switch': '🔃',
        'firewall': '🛡️',
        'gateway': '🚪',
        'server': '🖥️',
        'cloud': '☁️',
        'isp': '🌐',
        'load-balancer': '⚖️',
        'unknown': '❔'
    };
    return icons[deviceType] || '🔀';
}

// Format device type for display
function formatDeviceType(deviceType) {
    const names = {
        'router': 'Router',
        'switch': 'Switch',
        'firewall': 'Firewall',
        'gateway': 'Gateway',
        'server': 'Server',
        'cloud': 'Cloud',
        'isp': 'ISP',
        'load-balancer': 'Load Balancer',
        'unknown': 'Unknown'
    };
    return names[deviceType] || deviceType;
}

function drawNetPathLine(ctx, x1, y1, x2, y2, hop, color, scale = 1, direction = 'right') {
    const isTimeout = hop.timeout;
    
    // Line gradient
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(0.5, color + '90');
    gradient.addColorStop(1, color + '40');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = (isTimeout ? 2 : 4) * scale;
    ctx.setLineDash(isTimeout ? [6, 4] : []);
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Flow arrow - direction aware
    const midX = (x1 + x2) / 2;
    const midY = (y1 + y2) / 2;
    ctx.fillStyle = color;
    ctx.beginPath();
    
    if (direction === 'right') {
        // Arrow pointing right →
        ctx.moveTo(midX + 6 * scale, midY);
        ctx.lineTo(midX - 4 * scale, midY - 5 * scale);
        ctx.lineTo(midX - 4 * scale, midY + 5 * scale);
    } else {
        // Arrow pointing left ←
        ctx.moveTo(midX - 6 * scale, midY);
        ctx.lineTo(midX + 4 * scale, midY - 5 * scale);
        ctx.lineTo(midX + 4 * scale, midY + 5 * scale);
    }
    ctx.closePath();
    ctx.fill();
    
    // Packet loss indicator
    if (hop.packetLoss && hop.packetLoss > 0) {
        ctx.fillStyle = '#ef4444';
        ctx.font = `bold ${9 * scale}px Segoe UI`;
        ctx.textAlign = 'center';
        ctx.fillText(`${hop.packetLoss.toFixed(0)}% loss`, midX, midY + 20 * scale);
    }
    
    // Show jitter if significant
    if (hop.jitter && hop.jitter > 10) {
        ctx.fillStyle = '#f59e0b';
        ctx.font = `${8 * scale}px Segoe UI`;
        ctx.textAlign = 'center';
        ctx.fillText(`±${hop.jitter.toFixed(0)}ms`, midX, midY - 15 * scale);
    }
}

function getStatusColor(status) {
    const colors = {
        healthy: '#10b981',
        slow: '#f59e0b',
        warning: '#f97316',
        critical: '#ef4444',
        timeout: '#6b7280'
    };
    return colors[status] || colors.healthy;
}

function updateNetPathTable(result) {
    const tbody = document.getElementById('netpathTableBody');
    tbody.innerHTML = '';
    
    if (!result.hops || result.hops.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align: center; color: #7a9ab8;">No hop data</td></tr>';
        return;
    }
    
    result.hops.forEach(hop => {
        const status = hop.status || 'healthy';
        const statusColors = {
            healthy: { bg: '#10b98120', text: '#10b981' },
            slow: { bg: '#f59e0b20', text: '#f59e0b' },
            warning: { bg: '#f9731620', text: '#f97316' },
            critical: { bg: '#ef444420', text: '#ef4444' },
            timeout: { bg: '#6b728020', text: '#6b7280' }
        };
        const statusStyle = statusColors[status] || statusColors.healthy;
        
        const formatMs = (val) => val !== undefined && val >= 0 ? val.toFixed(1) : '-';
        
        // Device type icon
        const deviceTypeIcons = {
            'router': '🔀',
            'switch': '🔃',
            'firewall': '🛡️',
            'gateway': '🚪',
            'server': '🖥️',
            'cloud': '☁️',
            'isp': '🌐',
            'load-balancer': '⚖️',
            'unknown': '❔'
        };
        const deviceIcon = deviceTypeIcons[hop.deviceType] || deviceTypeIcons.unknown;
        
        // Format ISP/ASN
        let ispAsn = '-';
        if (hop.isp && hop.asn) {
            ispAsn = `${hop.isp}<br><span style="color: #a78bfa; font-size: 9px;">AS${hop.asn}</span>`;
        } else if (hop.isp) {
            ispAsn = hop.isp;
        } else if (hop.asn) {
            ispAsn = `AS${hop.asn}`;
        }
        
        // Format Min-Max latency
        let minMax = '-';
        if (hop.minLatency !== undefined && hop.maxLatency !== undefined) {
            minMax = `${hop.minLatency.toFixed(0)}-${hop.maxLatency.toFixed(0)}ms`;
        }
        
        tbody.innerHTML += `
            <tr style="${hop.isBottleneck ? 'background: rgba(239,68,68,0.1);' : ''}">
                <td style="font-weight: 600;">${hop.hop}</td>
                <td>
                    <span style="display: inline-block; padding: 2px 6px; border-radius: 8px; 
                                 background: ${statusStyle.bg}; color: ${statusStyle.text}; 
                                 font-size: 9px; font-weight: 600; text-transform: uppercase;">
                        ${status}
                    </span>
                </td>
                <td style="font-size: 16px;" title="${hop.deviceType || 'Unknown'}">${deviceIcon}</td>
                <td style="font-weight: 500; color: #e2e8f0; font-size: 11px;">
                    ${hop.deviceName || '-'}
                    ${hop.isBottleneck ? '<br><span style="color: #ef4444; font-size: 9px;">⚠️ BOTTLENECK</span>' : ''}
                </td>
                <td style="font-family: monospace; font-size: 11px;">${hop.ip || '*'}</td>
                <td style="max-width: 130px; overflow: hidden; text-overflow: ellipsis; color: #7a9ab8; font-size: 10px;" 
                    title="${hop.hostname || ''}">${hop.hostname || '-'}</td>
                <td style="color: #4aa3df; font-size: 10px;">${hop.deviceVendor || '-'}</td>
                <td style="color: #22d3ee; font-size: 10px;">${ispAsn}</td>
                <td style="color: ${statusStyle.text}; font-weight: 600; font-size: 11px;">${formatMs(hop.avgLatency)}ms</td>
                <td style="color: #94a3b8; font-size: 10px;">${minMax}</td>
                <td style="color: ${hop.jitter > 30 ? '#f59e0b' : '#7a9ab8'}; font-size: 10px;">
                    ${hop.jitter ? '±' + hop.jitter.toFixed(0) + 'ms' : '-'}
                </td>
                <td style="color: ${hop.packetLoss > 5 ? '#ef4444' : '#10b981'}; font-size: 10px;">
                    ${hop.packetLoss !== undefined ? hop.packetLoss.toFixed(0) + '%' : '-'}
                </td>
                <td style="color: #f472b6; font-size: 9px;">${hop.location ? '📍' + hop.location : '-'}</td>
            </tr>
        `;
    });
}

// ==================== NETWORK HOP PATH DIAGRAM ====================

let topologyData = {
    targets: new Map(), // IP -> { connections: [], states: {} }
    tracedPaths: new Map(), // IP -> traceroute result
    autoTraceEnabled: false,  // Disabled - use NetPath tab for manual tracing
    tracingInProgress: new Set(), // IPs currently being traced
    lastUpdate: null
};

function toggleAutoTrace() {
    // Auto-trace is disabled - this function is no longer used
    topologyData.autoTraceEnabled = false;
}

function clearTracedPaths() {
    topologyData.tracedPaths.clear();
    topologyData.tracingInProgress.clear();
    document.getElementById('topoTracedPaths').textContent = '0';
    updateTargetDropdown(topologyData.targets);
    drawHopPaths();
}

function updateTopologyDiagram(connections, states) {
    // Update stats
    document.getElementById('topoEstablished').textContent = states['ESTABLISHED'] || 0;
    document.getElementById('topoTimeWait').textContent = states['TIME_WAIT'] || 0;
    document.getElementById('topoCloseWait').textContent = states['CLOSE_WAIT'] || 0;
    document.getElementById('topoTracedPaths').textContent = topologyData.tracedPaths.size;

    // Group connections by remote IP
    const targetMap = new Map();
    
    connections.forEach(conn => {
        if (!conn.remoteAddress || conn.remoteAddress === '0.0.0.0' || conn.remoteAddress === '::') {
            return; // Skip listening sockets
        }
        
        // Skip localhost
        if (conn.remoteAddress === '127.0.0.1' || conn.remoteAddress === '::1') {
            return;
        }

        const key = conn.remoteAddress;
        if (!targetMap.has(key)) {
            targetMap.set(key, {
                ip: conn.remoteAddress,
                connections: [],
                states: {},
                ports: new Set()
            });
        }
        
        const target = targetMap.get(key);
        target.connections.push(conn);
        target.states[conn.state] = (target.states[conn.state] || 0) + 1;
        target.ports.add(conn.remotePort);
    });

    topologyData.targets = targetMap;
    document.getElementById('topoUniqueTargets').textContent = targetMap.size;

    // Update target dropdown
    updateTargetDropdown(targetMap);

    // Auto-map new targets if enabled
    if (topologyData.autoTraceEnabled) {
        autoMapNewTargets(targetMap);
    }

    // Draw the hop paths
    drawHopPaths();
}

async function autoMapNewTargets(targetMap) {
    // Get top targets by connection count that haven't been traced
    const targets = Array.from(targetMap.values())
        .filter(t => !topologyData.tracedPaths.has(t.ip) && !topologyData.tracingInProgress.has(t.ip))
        .sort((a, b) => b.connections.length - a.connections.length);
    
    // Limit auto-trace to top 5 targets with at least 1 connection
    const toTrace = targets
        .filter(t => t.connections.length >= 1)
        .slice(0, 5);
    
    // Trace each target (don't await to avoid blocking UI)
    for (const target of toTrace) {
        if (!topologyData.tracingInProgress.has(target.ip)) {
            traceTargetPath(target.ip);
        }
    }
}

function updateTargetDropdown(targetMap) {
    const select = document.getElementById('topologyTargetSelect');
    if (!select) return;

    const currentValue = select.value;
    select.innerHTML = '<option value="">Select target to trace...</option>';

    const targets = Array.from(targetMap.values());
    targets.sort((a, b) => b.connections.length - a.connections.length);

    targets.forEach(target => {
        const option = document.createElement('option');
        option.value = target.ip;
        option.textContent = `${target.ip} (${target.connections.length} conn)`;
        if (topologyData.tracedPaths.has(target.ip)) {
            option.textContent += ' ✓';
        }
        select.appendChild(option);
    });

    if (currentValue) {
        select.value = currentValue;
    }
}

async function traceSelectedTarget() {
    const select = document.getElementById('topologyTargetSelect');
    const target = select.value;
    if (!target) {
        alert('Please select a target to trace');
        return;
    }
    await traceTargetPath(target);
}

async function autoTraceTopTargets() {
    const targets = Array.from(topologyData.targets.values());
    targets.sort((a, b) => b.connections.length - a.connections.length);
    
    const topTargets = targets.slice(0, 3);
    for (const target of topTargets) {
        if (!topologyData.tracedPaths.has(target.ip)) {
            await traceTargetPath(target.ip);
        }
    }
}

async function traceTargetPath(targetIp) {
    // Mark as in progress
    topologyData.tracingInProgress.add(targetIp);
    
    try {
        const response = await fetch(`/api/trace?target=${encodeURIComponent(targetIp)}&maxHops=15&timeout=1000`);
        const result = await response.json();
        
        if (result.success && result.hops) {
            topologyData.tracedPaths.set(targetIp, result);
            document.getElementById('topoTracedPaths').textContent = topologyData.tracedPaths.size;
            drawHopPaths();
            updateTargetDropdown(topologyData.targets);
        }
    } catch (err) {
        console.error('Trace failed:', err);
    } finally {
        topologyData.tracingInProgress.delete(targetIp);
    }
}

// ==================== NETPATH-STYLE VISUALIZATION ====================

let netPathAnimation = {
    particles: [],
    animationFrame: null,
    lastTime: 0
};

function drawHopPaths() {
    const canvas = document.getElementById('topologyCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const container = canvas.parentElement;
    
    const paths = Array.from(topologyData.tracedPaths.entries());
    const pathCount = paths.length;
    
    // Set canvas size based on number of paths
    canvas.width = container.clientWidth;
    canvas.height = Math.max(250, pathCount * 120 + 100);
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Store path data for animation
    netPathAnimation.pathData = [];
    
    // Clear and draw background
    drawNetPathBackground(ctx, width, height);

    if (pathCount === 0) {
        drawEmptyState(ctx, width, height);
        return;
    }

    // Draw each path
    paths.forEach(([targetIp, traceResult], pathIndex) => {
        const y = 80 + pathIndex * 120;
        drawNetPathRoute(ctx, traceResult, targetIp, y, width, pathIndex);
    });

    // Start animation
    startNetPathAnimation(canvas);
}

function drawNetPathBackground(ctx, width, height) {
    // Dark gradient background
    const bgGradient = ctx.createLinearGradient(0, 0, 0, height);
    bgGradient.addColorStop(0, '#0a1628');
    bgGradient.addColorStop(1, '#0f2744');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(0, 0, width, height);
    
    // Subtle grid pattern
    ctx.strokeStyle = '#1a3a5c20';
    ctx.lineWidth = 1;
    for (let x = 0; x < width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
    }
    for (let y = 0; y < height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
    }
}

function drawEmptyState(ctx, width, height) {
    // Empty state with icon
    ctx.fillStyle = '#3a5a7c';
    ctx.font = '48px Segoe UI Emoji';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🌐', width / 2, height / 2 - 30);
    
    ctx.fillStyle = '#7a9ab8';
    ctx.font = '14px Segoe UI';
    ctx.fillText('Network paths will appear here automatically', width / 2, height / 2 + 20);
    ctx.fillStyle = '#5a7a98';
    ctx.font = '12px Segoe UI';
    ctx.fillText('Enable Auto-Map or select a target to trace', width / 2, height / 2 + 42);
}

function drawNetPathRoute(ctx, traceResult, targetIp, baseY, canvasWidth, pathIndex) {
    const hops = traceResult.hops || [];
    const validHops = hops.filter(h => h.ip || h.timeout);
    
    if (validHops.length === 0) return;

    const startX = 100;
    const endX = canvasWidth - 100;
    const hopCount = validHops.length + 1;
    const spacing = Math.min(180, (endX - startX) / hopCount);
    
    // Calculate total latency
    const totalLatency = validHops.reduce((sum, hop) => sum + (hop.avgLatency || 0), 0);
    const maxLatency = Math.max(...validHops.map(h => h.avgLatency || 0), 1);
    
    // Get connection info
    const connInfo = topologyData.targets.get(targetIp);
    const connCount = connInfo ? connInfo.connections.length : 0;
    
    // Draw path header
    drawPathHeader(ctx, startX, baseY - 45, targetIp, connCount, totalLatency, validHops.length);
    
    // Store nodes for animation
    const pathNodes = [];
    
    // Draw source node
    let currentX = startX;
    pathNodes.push({ x: currentX, y: baseY });
    drawNetPathNode(ctx, currentX, baseY, {
        type: 'source',
        label: 'Source',
        sublabel: 'This Machine',
        latency: null,
        status: 'healthy'
    });

    // Draw each hop with connections
    validHops.forEach((hop, index) => {
        const nextX = currentX + spacing;
        const latency = hop.avgLatency || hop.latency1 || 0;
        const isTarget = index === validHops.length - 1;
        
        // Determine health status
        let status = 'healthy';
        if (hop.timeout) status = 'timeout';
        else if (latency > 100) status = 'critical';
        else if (latency > 50) status = 'warning';
        else if (latency > 20) status = 'slow';
        
        // Draw connection line
        drawNetPathConnection(ctx, currentX, baseY, nextX, baseY, latency, status, hop.timeout);
        
        // Draw node
        pathNodes.push({ x: nextX, y: baseY });
        drawNetPathNode(ctx, nextX, baseY, {
            type: isTarget ? 'target' : 'hop',
            label: hop.ip || '*',
            sublabel: hop.hostname || (isTarget ? 'Destination' : `Hop ${hop.hop}`),
            latency: latency,
            status: status
        });

        currentX = nextX;
    });
    
    // Store for animation
    netPathAnimation.pathData.push({
        nodes: pathNodes,
        pathIndex: pathIndex,
        baseY: baseY
    });
}

function drawPathHeader(ctx, x, y, targetIp, connCount, totalLatency, hopCount) {
    // Path info badge
    ctx.fillStyle = '#1a3a5c';
    ctx.beginPath();
    ctx.roundRect(x - 10, y - 12, 400, 24, 12);
    ctx.fill();
    
    ctx.font = 'bold 11px Segoe UI';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4aa3df';
    ctx.fillText(`→ ${targetIp}`, x, y + 4);
    
    ctx.font = '10px Segoe UI';
    ctx.fillStyle = '#7a9ab8';
    ctx.fillText(`${connCount} connections  •  ${hopCount} hops  •  ${totalLatency.toFixed(1)} ms total`, x + 150, y + 4);
}

function drawNetPathNode(ctx, x, y, config) {
    const { type, label, sublabel, latency, status } = config;
    
    // Node size based on type
    const size = type === 'source' ? 28 : (type === 'target' ? 26 : 22);
    
    // Colors based on status
    const colors = {
        healthy: { fill: '#10b981', glow: '#10b98140', border: '#34d399' },
        slow: { fill: '#f59e0b', glow: '#f59e0b40', border: '#fbbf24' },
        warning: { fill: '#f97316', glow: '#f9731640', border: '#fb923c' },
        critical: { fill: '#ef4444', glow: '#ef444440', border: '#f87171' },
        timeout: { fill: '#6b7280', glow: '#6b728040', border: '#9ca3af' }
    };
    
    const color = colors[status] || colors.healthy;
    
    // Outer glow
    const glowGradient = ctx.createRadialGradient(x, y, 0, x, y, size + 15);
    glowGradient.addColorStop(0, color.glow);
    glowGradient.addColorStop(1, 'transparent');
    ctx.fillStyle = glowGradient;
    ctx.beginPath();
    ctx.arc(x, y, size + 15, 0, Math.PI * 2);
    ctx.fill();
    
    // Node background (dark)
    ctx.fillStyle = '#0f2744';
    ctx.beginPath();
    ctx.arc(x, y, size + 3, 0, Math.PI * 2);
    ctx.fill();
    
    // Node border ring
    ctx.strokeStyle = color.border;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, size, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner fill gradient
    const innerGradient = ctx.createRadialGradient(x - size/3, y - size/3, 0, x, y, size);
    innerGradient.addColorStop(0, color.fill);
    innerGradient.addColorStop(1, shadeColor(color.fill, -30));
    ctx.fillStyle = innerGradient;
    ctx.beginPath();
    ctx.arc(x, y, size - 2, 0, Math.PI * 2);
    ctx.fill();
    
    // Icon
    ctx.fillStyle = '#ffffff';
    ctx.font = `${size * 0.7}px Segoe UI Emoji`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    let icon = '🔀';
    if (type === 'source') icon = '💻';
    else if (type === 'target') icon = '🎯';
    else if (status === 'timeout') icon = '❓';
    
    ctx.fillText(icon, x, y + 1);
    
    // Label (IP address)
    ctx.fillStyle = '#e2e8f0';
    ctx.font = 'bold 10px Segoe UI';
    ctx.textAlign = 'center';
    const displayLabel = label.length > 15 ? label.substring(0, 12) + '...' : label;
    ctx.fillText(displayLabel, x, y + size + 16);
    
    // Sublabel
    ctx.fillStyle = '#64748b';
    ctx.font = '9px Segoe UI';
    ctx.fillText(sublabel.substring(0, 20), x, y + size + 28);
    
    // Latency badge (for non-source nodes)
    if (latency !== null && type !== 'source') {
        drawLatencyBadge(ctx, x, y - size - 12, latency, status);
    }
}

function drawLatencyBadge(ctx, x, y, latency, status) {
    const colors = {
        healthy: '#10b981',
        slow: '#f59e0b',
        warning: '#f97316',
        critical: '#ef4444',
        timeout: '#6b7280'
    };
    
    const text = latency > 0 ? `${latency.toFixed(1)}ms` : '*';
    ctx.font = 'bold 9px Segoe UI';
    const width = ctx.measureText(text).width + 12;
    
    // Badge background
    ctx.fillStyle = '#0f2744';
    ctx.beginPath();
    ctx.roundRect(x - width/2, y - 8, width, 16, 8);
    ctx.fill();
    
    ctx.strokeStyle = colors[status] || colors.healthy;
    ctx.lineWidth = 1.5;
    ctx.stroke();
    
    // Badge text
    ctx.fillStyle = colors[status] || colors.healthy;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, y);
}

function drawNetPathConnection(ctx, x1, y1, x2, y2, latency, status, isTimeout) {
    const colors = {
        healthy: '#10b981',
        slow: '#f59e0b',
        warning: '#f97316',
        critical: '#ef4444',
        timeout: '#6b7280'
    };
    
    const color = colors[status] || colors.healthy;
    
    // Connection line with gradient
    const gradient = ctx.createLinearGradient(x1, y1, x2, y2);
    gradient.addColorStop(0, color + '40');
    gradient.addColorStop(0.5, color + '80');
    gradient.addColorStop(1, color + '40');
    
    ctx.strokeStyle = gradient;
    ctx.lineWidth = isTimeout ? 2 : 4;
    ctx.setLineDash(isTimeout ? [8, 4] : []);
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(x1 + 30, y1);
    ctx.lineTo(x2 - 30, y2);
    ctx.stroke();
    ctx.setLineDash([]);
    
    // Draw flow indicators (small arrows along the line)
    const midX = (x1 + x2) / 2;
    drawFlowArrow(ctx, midX, y1, color);
}

function drawFlowArrow(ctx, x, y, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + 6, y);
    ctx.lineTo(x - 3, y - 4);
    ctx.lineTo(x - 3, y + 4);
    ctx.closePath();
    ctx.fill();
}

function shadeColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + 
        (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 + 
        (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 + 
        (B < 255 ? (B < 1 ? 0 : B) : 255)
    ).toString(16).slice(1);
}

// Animation for flowing particles
function startNetPathAnimation(canvas) {
    if (netPathAnimation.animationFrame) {
        cancelAnimationFrame(netPathAnimation.animationFrame);
    }
    
    // Initialize particles for each path
    netPathAnimation.particles = [];
    
    if (netPathAnimation.pathData) {
        netPathAnimation.pathData.forEach((pathData, pathIdx) => {
            const nodes = pathData.nodes;
            for (let i = 0; i < nodes.length - 1; i++) {
                // Create particles for each segment
                for (let p = 0; p < 2; p++) {
                    netPathAnimation.particles.push({
                        pathIdx: pathIdx,
                        segmentIdx: i,
                        progress: Math.random(),
                        speed: 0.005 + Math.random() * 0.005,
                        x1: nodes[i].x,
                        y1: nodes[i].y,
                        x2: nodes[i + 1].x,
                        y2: nodes[i + 1].y
                    });
                }
            }
        });
    }
    
    animateNetPath(canvas);
}

function animateNetPath(canvas) {
    const ctx = canvas.getContext('2d');
    
    // Only animate particles, don't redraw entire canvas
    netPathAnimation.particles.forEach(particle => {
        // Calculate position
        const x = particle.x1 + (particle.x2 - particle.x1) * particle.progress;
        const y = particle.y1 + (particle.y2 - particle.y1) * particle.progress;
        
        // Draw particle
        ctx.fillStyle = '#4aa3df';
        ctx.beginPath();
        ctx.arc(x + 30, y, 3, 0, Math.PI * 2);
        ctx.fill();
        
        // Particle trail
        ctx.fillStyle = '#4aa3df40';
        ctx.beginPath();
        ctx.arc(x + 25, y, 2, 0, Math.PI * 2);
        ctx.fill();
        
        // Update progress
        particle.progress += particle.speed;
        if (particle.progress > 0.85) {
            particle.progress = 0.15;
        }
    });
    
    // Redraw at low frequency to avoid flicker
    netPathAnimation.animationFrame = setTimeout(() => {
        // Redraw the entire canvas periodically
        drawHopPathsStatic();
        requestAnimationFrame(() => animateNetPath(canvas));
    }, 50);
}

function drawHopPathsStatic() {
    const canvas = document.getElementById('topologyCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const paths = Array.from(topologyData.tracedPaths.entries());
    const pathCount = paths.length;
    
    if (pathCount === 0) return;
    
    const width = canvas.width;
    const height = canvas.height;
    
    // Redraw background and paths
    drawNetPathBackground(ctx, width, height);
    
    paths.forEach(([targetIp, traceResult], pathIndex) => {
        const y = 80 + pathIndex * 120;
        drawNetPathRoute(ctx, traceResult, targetIp, y, width, pathIndex);
    });}