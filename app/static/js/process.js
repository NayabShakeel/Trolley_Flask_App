// Global variables
let trolleyBarcode = '';
let processBarcode = '';
let trolleyScanned = false;
let processScanned = false;

// DOM Elements
const scanTrolleyBtn = document.getElementById('scanTrolleyBtn');
const scanProcessBtn = document.getElementById('scanProcessBtn');
const connectBtn = document.getElementById('connectBtn');
const resetConnectivityBtn = document.getElementById('resetConnectivityBtn');
const trolleyBarcodeDisplay = document.getElementById('trolleyBarcodeDisplay');
const processBarcodeDisplay = document.getElementById('processBarcodeDisplay');
const trolleyBarcodeText = document.getElementById('trolleyBarcodeText');
const processBarcodeText = document.getElementById('processBarcodeText');
const processNameInput = document.getElementById('processNameInput');
const connectionStatus = document.getElementById('connectionStatus');
const statusIcon = document.getElementById('statusIcon');
const statusTitle = document.getElementById('statusTitle');
const statusMessage = document.getElementById('statusMessage');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    scanTrolleyBtn.addEventListener('click', handleScanTrolley);
    scanProcessBtn.addEventListener('click', handleScanProcess);
    connectBtn.addEventListener('click', handleConnect);
    resetConnectivityBtn.addEventListener('click', handleReset);
}

// Handle Scan Trolley Barcode
function handleScanTrolley() {
    // Prompt for barcode input (simulating 1D scanner input)
    const barcode = prompt('Scan or enter trolley barcode:');
    
    if (barcode && barcode.trim() !== '') {
        trolleyBarcode = barcode.trim();
        trolleyScanned = true;
        
        // Update button to show success
        scanTrolleyBtn.innerHTML = `
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Trolley Barcode Scanned
        `;
        scanTrolleyBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        scanTrolleyBtn.classList.remove('bg-primary', 'hover:bg-primary/90');
        
        // Show barcode display
        trolleyBarcodeDisplay.classList.remove('hidden');
        trolleyBarcodeText.textContent = trolleyBarcode;
        
        // Check if both barcodes are scanned
        updateConnectButton();
        
        showToast('Success', `Trolley barcode ${trolleyBarcode} scanned successfully.`, 'success');
    } else {
        showToast('Error', 'Please scan or enter a valid trolley barcode.', 'error');
    }
}

// Handle Scan Process Barcode
async function handleScanProcess() {
    // Prompt for barcode input (simulating 1D scanner input)
    const barcode = prompt('Scan or enter process barcode (Input/Output):');
    
    if (barcode && barcode.trim() !== '') {
        processBarcode = barcode.trim();
        
        try {
            // Check the process type
            const response = await fetch(`/api/process/check/${encodeURIComponent(processBarcode)}`);
            const result = await response.json();
            
            if (!result.success || !result.exists) {
                showToast('Error', 'Process barcode not found in database.', 'error');
                return;
            }
            
            processScanned = true;
            const processType = result.processType; // 'input' or 'output'
            
            // Update button to show success with type
            scanProcessBtn.innerHTML = `
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                Process Barcode Scanned (${processType === 'input' ? 'INPUT' : 'OUTPUT'})
            `;
            scanProcessBtn.classList.add('bg-green-600', 'hover:bg-green-700');
            scanProcessBtn.classList.remove('bg-primary', 'hover:bg-primary/90');
            
            // Show barcode display
            processBarcodeDisplay.classList.remove('hidden');
            processBarcodeText.textContent = `${processBarcode} (${processType === 'input' ? 'Input' : 'Output'})`;
            
            // Show/hide process name input based on type
            const processNameContainer = processNameInput.parentElement;
            if (processType === 'input') {
                // Input process - show process name field
                processNameContainer.classList.remove('hidden');
                showToast('Success', `Input process barcode ${processBarcode} scanned. Please enter process name.`, 'success');
            } else {
                // Output process - hide process name field (not needed for transfer)
                processNameContainer.classList.add('hidden');
                showToast('Success', `Output process barcode ${processBarcode} scanned. Ready to transfer.`, 'success');
            }
            
            // Check if both barcodes are scanned
            updateConnectButton();
            
        } catch (error) {
            console.error('Error checking process:', error);
            showToast('Error', 'Failed to verify process barcode.', 'error');
        }
    } else {
        showToast('Error', 'Please scan or enter a valid process barcode.', 'error');
    }
}

// Update Connect Button State
async function updateConnectButton() {
    if (trolleyScanned && processScanned) {
        connectBtn.disabled = false;
        connectBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        
        // Update button text based on process type
        try {
            const response = await fetch(`/api/process/check/${encodeURIComponent(processBarcode)}`);
            const result = await response.json();
            
            if (result.success && result.exists) {
                const processType = result.processType;
                
                if (processType === 'input') {
                    connectBtn.innerHTML = `
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
                        </svg>
                        Connect Trolley to Process Input
                    `;
                } else {
                    connectBtn.innerHTML = `
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"></path>
                        </svg>
                        Transfer Process Output to Trolley
                    `;
                }
            }
        } catch (error) {
            console.error('Error updating button:', error);
        }
    } else {
        connectBtn.disabled = true;
        connectBtn.classList.add('opacity-50', 'cursor-not-allowed');
        connectBtn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path>
            </svg>
            Connect Trolley with Process
        `;
    }
}

// Handle Connect
async function handleConnect() {
    if (!trolleyScanned || !processScanned) {
        showToast('Error', 'Please scan both trolley and process barcodes first.', 'error');
        return;
    }
    
    try {
        // First, check what type of process barcode was scanned
        const checkResponse = await fetch(`/api/process/check/${encodeURIComponent(processBarcode)}`);
        const checkResult = await checkResponse.json();
        
        if (!checkResult.success || !checkResult.exists) {
            throw new Error('Process barcode not found. Please scan a valid process barcode.');
        }
        
        const processType = checkResult.processType; // 'input' or 'output'
        
        // Determine which endpoint to call based on process type
        let endpoint;
        let connectionData;
        
        if (processType === 'input') {
            // Trolley → Process Input (e.g., TR-01 → PR-01-in)
            endpoint = '/api/process/input';
            connectionData = {
                trolleyBarcode: trolleyBarcode,
                processBarcode: processBarcode,
                processName: processNameInput.value.trim() || 'Unknown Process',
                timestamp: new Date().toISOString()
            };
        } else if (processType === 'output') {
            // Process Output → Trolley (e.g., PR-01-out → TR-02)
            endpoint = '/api/process/output';
            connectionData = {
                outputBarcode: processBarcode,
                trolleyBarcode: trolleyBarcode,
                timestamp: new Date().toISOString()
            };
        } else {
            throw new Error('Invalid process type. Must be input or output.');
        }
        
        console.log('Connection Data:', connectionData);
        console.log('Endpoint:', endpoint);
        
        // Send data to backend API
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(connectionData)
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            const successMessage = processType === 'input' 
                ? `Trolley ${trolleyBarcode} connected to Process ${processBarcode}`
                : `Process ${processBarcode} output transferred to Trolley ${trolleyBarcode}`;
            
            showConnectionStatus('success', 'Connection Successful', successMessage);
            showToast('Success', 'Operation completed successfully.', 'success');
        } else {
            throw new Error(result.message || 'Failed to complete operation');
        }
        
    } catch (error) {
        console.error('Error:', error);
        showConnectionStatus('error', 'Connection Failed', 
            error.message || 'Failed to establish connection. Please try again.');
        showToast('Error', error.message || 'Failed to establish connection. Please try again.', 'error');
    }
}

// Handle Reset
function handleReset() {
    if (trolleyScanned || processScanned) {
        if (confirm('Are you sure you want to reset? This will clear all scanned barcodes.')) {
            // Reset all variables
            trolleyBarcode = '';
            processBarcode = '';
            trolleyScanned = false;
            processScanned = false;
            
            // Reset trolley button
            scanTrolleyBtn.innerHTML = `
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h4v16H3V4zm6 0h2v16H9V4zm4 0h4v16h-4V4zm6 0h2v16h-2V4z"></path>
                </svg>
                Scan Trolley Barcode
            `;
            scanTrolleyBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            scanTrolleyBtn.classList.add('bg-primary', 'hover:bg-primary/90');
            trolleyBarcodeDisplay.classList.add('hidden');
            
            // Reset process button
            scanProcessBtn.innerHTML = `
                <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h4v16H3V4zm6 0h2v16H9V4zm4 0h4v16h-4V4zm6 0h2v16h-2V4z"></path>
                </svg>
                Scan Process Barcode
            `;
            scanProcessBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
            scanProcessBtn.classList.add('bg-primary', 'hover:bg-primary/90');
            processBarcodeDisplay.classList.add('hidden');
            
            // Show process name field (in case it was hidden)
            const processNameContainer = processNameInput.parentElement;
            processNameContainer.classList.remove('hidden');
            
            // Hide connection status
            connectionStatus.classList.add('hidden');
            
            // Clear process name
            processNameInput.value = '';
            
            // Disable connect button
            updateConnectButton();
            
            showToast('Reset', 'All data has been cleared. Ready for new scan.', 'info');
        }
    } else {
        showToast('Info', 'Nothing to reset.', 'info');
    }
}

// Show Connection Status
function showConnectionStatus(type, title, message) {
    connectionStatus.classList.remove('hidden');
    
    if (type === 'success') {
        connectionStatus.classList.remove('border-red-500', 'bg-red-50', 'dark:bg-red-950');
        connectionStatus.classList.add('border-green-500', 'bg-green-50', 'dark:bg-green-950');
        statusIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        statusIcon.classList.remove('text-red-500');
        statusIcon.classList.add('text-green-500');
        statusTitle.classList.remove('text-red-900', 'dark:text-red-100');
        statusTitle.classList.add('text-green-900', 'dark:text-green-100');
        statusMessage.classList.remove('text-red-800', 'dark:text-red-200');
        statusMessage.classList.add('text-green-800', 'dark:text-green-200');
    } else if (type === 'error') {
        connectionStatus.classList.remove('border-green-500', 'bg-green-50', 'dark:bg-green-950');
        connectionStatus.classList.add('border-red-500', 'bg-red-50', 'dark:bg-red-950');
        statusIcon.innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"></path>';
        statusIcon.classList.remove('text-green-500');
        statusIcon.classList.add('text-red-500');
        statusTitle.classList.remove('text-green-900', 'dark:text-green-100');
        statusTitle.classList.add('text-red-900', 'dark:text-red-100');
        statusMessage.classList.remove('text-green-800', 'dark:text-green-200');
        statusMessage.classList.add('text-red-800', 'dark:text-red-200');
    }
    
    statusTitle.textContent = title;
    statusMessage.textContent = message;
}

// Toast Notification
function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    toastTitle.textContent = title;
    toastMessage.textContent = message;
    
    // Set icon based on type
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
