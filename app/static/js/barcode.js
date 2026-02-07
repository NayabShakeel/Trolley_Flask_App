// Global variables
let currentBarcode = '';
let barcodeData = null;

// DOM Elements
const scanBtn = document.getElementById('scanBtn');
const clearBtn = document.getElementById('clearBtn');
const loadingState = document.getElementById('loadingState');
const noDataState = document.getElementById('noDataState');
const resultsContainer = document.getElementById('resultsContainer');
const scannedBarcodeDisplay = document.getElementById('scannedBarcodeDisplay');
const barcodeTypeDisplay = document.getElementById('barcodeTypeDisplay');
const trolleyInfo = document.getElementById('trolleyInfo');
const processInfo = document.getElementById('processInfo');
const currentProcessInfo = document.getElementById('currentProcessInfo');
const attachedTrolleys = document.getElementById('attachedTrolleys');
const processHistory = document.getElementById('processHistory');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    scanBtn.addEventListener('click', handleScan);
    clearBtn.addEventListener('click', clearResults);
}

// Handle Scan
async function handleScan() {
    const barcode = prompt('Scan or enter barcode:');
    
    if (barcode && barcode.trim() !== '') {
        currentBarcode = barcode.trim();
        await fetchBarcodeInfo(currentBarcode);
    } else {
        showToast('Error', 'Please scan or enter a valid barcode.', 'error');
    }
}

// Fetch Barcode Information from Backend
async function fetchBarcodeInfo(barcode) {
    hideAllStates();
    loadingState.classList.remove('hidden');
    
    try {
        const response = await fetch(`/api/barcode/search/${encodeURIComponent(barcode)}`);
        if (!response.ok) throw new Error('Barcode not found');
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.message || 'Failed to fetch barcode');
        }
        
        if (result.found && (result.trolley || result.process)) {
            barcodeData = transformBackendData(result, barcode);
            displayBarcodeInfo(barcodeData);
            showToast('Success', `Barcode ${barcode} information loaded.`, 'success');
        } else {
            hideAllStates();
            noDataState.classList.remove('hidden');
            showToast('Not Found', 'This barcode has no information yet.', 'info');
        }
        
    } catch (error) {
        console.error('Error fetching barcode info:', error);
        hideAllStates();
        noDataState.classList.remove('hidden');
        showToast('Error', 'Failed to fetch barcode information.', 'error');
    }
}

// Transform backend data to frontend format
function transformBackendData(result, barcode) {
    if (result.trolley) {
        return {
            type: 'trolley',
            barcode: barcode,
            trolleyData: {
                customerName: result.trolley.customer_name,
                lotNumber: result.trolley.lot_number,
                designName: result.trolley.design_name,
                designNumber: result.trolley.design_number,
                greyWidth: result.trolley.grey_width,
                finishWidth: result.trolley.finish_width,
                quality: result.trolley.fabric_quality,
                totalTrolley: result.trolley.total_trolley,
                meters: result.trolley.meters,
                matching: result.trolley.matching,
                orderReceiveDate: result.trolley.order_receive_date,
                greyReceiveDate: result.trolley.grey_receive_date,
                remarks: result.trolley.remarks,
                packInstructions: result.trolley.pack_instructions,
                attachedAt: result.trolley.attached_at || 'Not attached',
                isEmpty: result.trolley.is_empty
            },
            currentProcess: null, // Don't show process info when scanning trolley
            history: (result.history || []).map((h, idx) => ({
                step: idx + 1,
                processName: h.process_name || formatEventType(h.event_type),
                processBarcode: h.process_barcode || 'N/A',
                inputTime: h.process_start_time || h.created_at,
                outputTime: h.process_end_time || 'N/A',
                status: 'Completed'
            }))
        };
    } else if (result.current_process && !result.trolley) {
        // This is a trolley that is connected to a process
        return {
            type: 'trolley',
            barcode: barcode,
            trolleyData: null, // Show empty as requested
            currentProcess: {
                connected: true,
                processBarcode: result.current_process.barcode,
                processName: result.current_process.process_name || 'Unknown',
                connectedAt: result.current_process.attached_at,
                status: 'In Progress'
            },
            history: (result.history || []).map((h, idx) => ({
                step: idx + 1,
                processName: h.process_name || formatEventType(h.event_type),
                processBarcode: h.process_barcode || 'N/A',
                inputTime: h.process_start_time || h.created_at,
                outputTime: h.process_end_time || 'N/A',
                status: 'Completed'
            }))
        };
    } else if (result.process) {
        // FIXED: Map source_trolley_barcode from backend to trolleyBarcode for display
        const trolleyBarcodeValue = result.process.source_trolley_barcode || result.process.trolley_barcode;
        const hasData = result.process.customer_name || result.process.lot_number || result.process.design_name;
        
        return {
            type: 'process',
            barcode: barcode,
            processData: {
                processName: result.process.process_name || 'Unknown Process',
                processType: result.process.process_type === 'input' ? 'Input' : 'Output',
                currentStatus: result.process.state === 'EMPTY' ? 'Empty' : (result.process.state === 'IN_PROCESS' ? 'Active' : 'Completed'),
                startedAt: result.process.process_start_time || result.process.attached_at || 'Not started'
            },
            attachedTrolley: (trolleyBarcodeValue && hasData) ? {
                trolleyBarcode: trolleyBarcodeValue,
                customerName: result.process.customer_name || 'N/A',
                lotNumber: result.process.lot_number || 'N/A',
                designName: result.process.design_name || 'N/A',
                designNumber: result.process.design_number || 'N/A',
                greyWidth: result.process.grey_width || 'N/A',
                finishWidth: result.process.finish_width || 'N/A',
                quality: result.process.fabric_quality || 'N/A',
                totalTrolley: result.process.total_trolley || 'N/A',
                meters: result.process.meters || 'N/A',
                matching: result.process.matching || 'N/A',
                orderReceiveDate: result.process.order_receive_date || 'N/A',
                greyReceiveDate: result.process.grey_receive_date || 'N/A',
                remarks: result.process.remarks || 'N/A',
                packInstructions: result.process.pack_instructions || 'N/A',
                connectedAt: result.process.process_start_time || result.process.attached_at || 'Not attached'
            } : null,
            history: (result.history || []).map((h, idx) => ({
                step: idx + 1,
                action: formatEventType(h.event_type),
                trolleyBarcode: h.trolley_barcode,
                timestamp: h.created_at
            }))
        };
    }
    return null;
}

function formatEventType(eventType) {
    const formatMap = {
        'trolley_attached': 'Trolley Attached',
        'process_input': 'Process Started',
        'process_output': 'Process Completed',
        'trolley_transferred': 'Trolley Transferred'
    };
    return formatMap[eventType] || eventType;
}

// Display Barcode Information
function displayBarcodeInfo(data) {
    hideAllStates();
    resultsContainer.classList.remove('hidden');
    
    scannedBarcodeDisplay.textContent = data.barcode;
    barcodeTypeDisplay.textContent = data.type === 'trolley' ? 'Trolley Barcode' : 'Process Barcode';
    barcodeTypeDisplay.className = data.type === 'trolley' ? 'badge badge-success text-base' : 'badge badge-info text-base';
    
    if (data.type === 'trolley') {
        displayTrolleyInfo(data);
    } else if (data.type === 'process') {
        displayProcessInfo(data);
    }
}

// Display Trolley Information
function displayTrolleyInfo(data) {
    trolleyInfo.classList.remove('hidden');
    const trolleyParameters = document.getElementById('trolleyParameters');
    
    if (data.trolleyData) {
        const fields = [
            { label: 'Customer Name', value: data.trolleyData.customerName },
            { label: 'Lot Number', value: data.trolleyData.lotNumber },
            { label: 'Design Name', value: data.trolleyData.designName },
            { label: 'Design Number', value: data.trolleyData.designNumber },
            { label: 'Grey Width', value: data.trolleyData.greyWidth },
            { label: 'Finish Width', value: data.trolleyData.finishWidth },
            { label: 'Quality', value: data.trolleyData.quality },
            { label: 'Total Trolley', value: data.trolleyData.totalTrolley },
            { label: 'Meters', value: data.trolleyData.meters },
            { label: 'Matching', value: data.trolleyData.matching },
            { label: 'Order Receive Date', value: data.trolleyData.orderReceiveDate },
            { label: 'Grey Receive Date', value: data.trolleyData.greyReceiveDate },
            { label: 'Remarks', value: data.trolleyData.remarks },
            { label: 'Pack Instructions', value: data.trolleyData.packInstructions, fullWidth: true }
        ];

        trolleyParameters.innerHTML = fields
            .filter(f => f.value !== null && f.value !== undefined && f.value !== '' && f.value !== 'N/A' && f.value !== 'na')
            .map(f => `
                <div class="${f.fullWidth ? 'col-span-2' : ''}">
                    <p class="text-sm text-muted-foreground mb-1">${f.label}</p>
                    <p class="font-semibold text-foreground">${f.value}</p>
                </div>
            `).join('');
        
        if (trolleyParameters.innerHTML === '') {
            trolleyParameters.innerHTML = '<div class="col-span-2 py-4 text-center text-muted-foreground italic">No parameters found for this trolley.</div>';
        }
    } else {
        trolleyParameters.innerHTML = '<div class="col-span-2 py-8 text-center text-muted-foreground italic">Trolley is currently connected to a process. Scan the process barcode to see details.</div>';
    }
    
    if (data.currentProcess && data.currentProcess.connected) {
        currentProcessInfo.classList.remove('hidden');
        const currentProcessDetails = document.getElementById('currentProcessDetails');
        currentProcessDetails.innerHTML = `
            <div class="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-900">
                <div class="flex items-center gap-2 mb-3">
                    <span class="badge badge-success">Connected</span>
                    <span class="text-sm text-muted-foreground">${data.currentProcess.status}</span>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <p class="text-sm text-muted-foreground mb-1">Process Name</p>
                        <p class="font-semibold text-foreground">${data.currentProcess.processName}</p>
                    </div>
                    <div>
                        <p class="text-sm text-muted-foreground mb-1">Process Barcode</p>
                        <p class="font-semibold text-foreground">${data.currentProcess.processBarcode}</p>
                    </div>
                    <div class="col-span-2">
                        <p class="text-sm text-muted-foreground mb-1">Connected At</p>
                        <p class="font-semibold text-foreground">${new Date(data.currentProcess.connectedAt).toLocaleString()}</p>
                    </div>
                </div>
            </div>
        `;
    }
    
    if (data.history && data.history.length > 0) {
        processHistory.classList.remove('hidden');
        const historyTimeline = document.getElementById('historyTimeline');
        historyTimeline.innerHTML = data.history.map((item, index) => `
            <div class="flex gap-4">
                <div class="flex flex-col items-center">
                    <div class="w-10 h-10 rounded-full bg-green-500 text-white flex items-center justify-center font-bold">
                        ${item.step}
                    </div>
                    ${index < data.history.length - 1 ? '<div class="w-0.5 h-full bg-border mt-2"></div>' : ''}
                </div>
                <div class="flex-1 pb-8">
                    <div class="bg-secondary p-4 rounded-lg border border-border">
                        <h4 class="font-semibold text-foreground mb-2">${item.processName}</h4>
                        <div class="space-y-1 text-sm">
                            <p><span class="text-muted-foreground">Process Barcode:</span> <span class="font-medium">${item.processBarcode}</span></p>
                            <p><span class="text-muted-foreground">Input Time:</span> <span class="font-medium">${item.inputTime !== 'N/A' ? new Date(item.inputTime).toLocaleString() : 'N/A'}</span></p>
                            <p><span class="text-muted-foreground">Output Time:</span> <span class="font-medium">${item.outputTime !== 'N/A' ? new Date(item.outputTime).toLocaleString() : 'N/A'}</span></p>
                            <span class="badge badge-success">${item.status}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Display Process Information
function displayProcessInfo(data) {
    processInfo.classList.remove('hidden');
    const processDetails = document.getElementById('processDetails');
    processDetails.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div>
                <p class="text-sm text-muted-foreground mb-1">Process Name</p>
                <p class="font-semibold text-foreground">${data.processData.processName}</p>
            </div>
            <div>
                <p class="text-sm text-muted-foreground mb-1">Process Type</p>
                <span class="badge ${data.processData.processType === 'Input' ? 'badge-info' : 'badge-warning'}">${data.processData.processType}</span>
            </div>
            <div>
                <p class="text-sm text-muted-foreground mb-1">Current Status</p>
                <span class="badge badge-success">${data.processData.currentStatus}</span>
            </div>
            <div>
                <p class="text-sm text-muted-foreground mb-1">Started At</p>
                <p class="font-semibold text-foreground">${data.processData.startedAt !== 'Not started' ? new Date(data.processData.startedAt).toLocaleString() : 'Not started'}</p>
            </div>
        </div>
    `;
    
    if (data.attachedTrolley) {
        attachedTrolleys.classList.remove('hidden');
        const attachedTrolleyDetails = document.getElementById('attachedTrolleyDetails');
        attachedTrolleyDetails.innerHTML = `
            <div class="p-4 bg-blue-50 dark:bg-blue-950 rounded-lg border border-blue-200 dark:border-blue-900 mb-4">
                <div class="flex items-center justify-between mb-3">
                    <div>
                        <p class="text-sm text-muted-foreground mb-1">Trolley Barcode</p>
                        <p class="text-lg font-bold text-foreground">${data.attachedTrolley.trolleyBarcode}</p>
                    </div>
                    <span class="badge badge-info">Attached</span>
                </div>
                <p class="text-sm text-muted-foreground mb-1">Connected At: <span class="font-medium">${new Date(data.attachedTrolley.connectedAt).toLocaleString()}</span></p>
            </div>
            
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Customer Name</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.customerName}</p>
                </div>
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Lot Number</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.lotNumber}</p>
                </div>
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Design Name</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.designName}</p>
                </div>
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Design Number</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.designNumber}</p>
                </div>
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Grey Width</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.greyWidth}</p>
                </div>
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Finish Width</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.finishWidth}</p>
                </div>
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Quality</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.quality}</p>
                </div>
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Total Trolley</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.totalTrolley}</p>
                </div>
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Meters</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.meters}</p>
                </div>
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Matching</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.matching}</p>
                </div>
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Order Receive Date</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.orderReceiveDate}</p>
                </div>
                <div>
                    <p class="text-sm text-muted-foreground mb-1">Grey Receive Date</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.greyReceiveDate}</p>
                </div>
                ${data.attachedTrolley.remarks && data.attachedTrolley.remarks !== 'N/A' ? `
                <div class="col-span-2">
                    <p class="text-sm text-muted-foreground mb-1">Remarks</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.remarks}</p>
                </div>` : ''}
                ${data.attachedTrolley.packInstructions && data.attachedTrolley.packInstructions !== 'N/A' ? `
                <div class="col-span-2">
                    <p class="text-sm text-muted-foreground mb-1">Pack Instructions</p>
                    <p class="font-semibold text-foreground">${data.attachedTrolley.packInstructions}</p>
                </div>` : ''}
            </div>
        `;
    }
    
    if (data.history && data.history.length > 0) {
        processHistory.classList.remove('hidden');
        const historyTimeline = document.getElementById('historyTimeline');
        historyTimeline.innerHTML = data.history.map((item, index) => `
            <div class="flex gap-4">
                <div class="flex flex-col items-center">
                    <div class="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                        ${item.step}
                    </div>
                    ${index < data.history.length - 1 ? '<div class="w-0.5 h-full bg-border mt-2"></div>' : ''}
                </div>
                <div class="flex-1 pb-8">
                    <div class="bg-secondary p-4 rounded-lg border border-border">
                        <h4 class="font-semibold text-foreground mb-2">${item.action}</h4>
                        <div class="space-y-1 text-sm">
                            ${item.trolleyBarcode ? `<p><span class="text-muted-foreground">Trolley:</span> <span class="font-medium">${item.trolleyBarcode}</span></p>` : ''}
                            <p><span class="text-muted-foreground">Timestamp:</span> <span class="font-medium">${new Date(item.timestamp).toLocaleString()}</span></p>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

// Hide All States
function hideAllStates() {
    loadingState.classList.add('hidden');
    noDataState.classList.add('hidden');
    resultsContainer.classList.add('hidden');
    trolleyInfo.classList.add('hidden');
    processInfo.classList.add('hidden');
    currentProcessInfo.classList.add('hidden');
    attachedTrolleys.classList.add('hidden');
    processHistory.classList.add('hidden');
}

// Clear Results
function clearResults() {
    currentBarcode = '';
    barcodeData = null;
    hideAllStates();
    showToast('Cleared', 'Results cleared. Ready for new scan.', 'info');
}

// Toast Notification
function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toastIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        toastIcon.classList.add('text-green-500');
    } else if (type === 'error') {
        toastIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        toastIcon.classList.add('text-red-500');
    } else {
        toastIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        toastIcon.classList.add('text-blue-500');
    }
    
    toast.classList.remove('hidden');
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
            toastIcon.className = 'w-6 h-6';
        }, 300);
    }, 3000);
}
