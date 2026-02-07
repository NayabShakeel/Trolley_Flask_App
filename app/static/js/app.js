// Global variables
let currentStep = 1;
let barcodeScanned = false;
let scannedBarcode = '';
const formData = {
    barcode: '',
    customerName: '',
    lotNumber: '',
    designName: '',
    designNumber: '',
    packInstructions: '',
    greyWidth: '',
    finishWidth: '',
    quality: '',
    totalTrolley: '',
    matching: '',
    remarks: '',
    orderReceiveDate: '',
    greyReceiveDate: ''
};

// DOM Elements
const page1 = document.getElementById('page1');
const page2 = document.getElementById('page2');
const backBtn = document.getElementById('backBtn');
const nextBtn = document.getElementById('nextBtn');
const submitBtn = document.getElementById('submitBtn');
const resetBtn = document.getElementById('resetBtn');
const trolleyForm = document.getElementById('trolleyForm');
const logoutBtn = document.getElementById('logoutBtn');
const scanBarcodeBtn = document.getElementById('scanBarcodeBtn');

// Progress indicators
const step1Circle = document.getElementById('step1Circle');
const step2Circle = document.getElementById('step2Circle');
const step1Text = document.getElementById('step1Text');
const step2Text = document.getElementById('step2Text');
const progressLine = document.getElementById('progressLine');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    updateProgress();
    disableForm(); // Disable form until barcode is scanned
});

// Setup Event Listeners
function setupEventListeners() {
    // Scan barcode button
    scanBarcodeBtn.addEventListener('click', handleScanBarcode);
    
    // Navigation buttons
    nextBtn.addEventListener('click', handleNext);
    backBtn.addEventListener('click', handleBack);
    resetBtn.addEventListener('click', handleReset);
    logoutBtn.addEventListener('click', handleLogout);
    
    // Form submission
    trolleyForm.addEventListener('submit', handleSubmit);
    
    // Form inputs - save data on change
    const inputs = trolleyForm.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.addEventListener('change', function() {
            formData[this.name] = this.value;
        });
    });
}

// Handle Scan Barcode
function handleScanBarcode() {
    // Prompt for barcode input (simulating 1D scanner input)
    const barcode = prompt('Scan or enter trolley barcode:');
    
    if (barcode && barcode.trim() !== '') {
        scannedBarcode = barcode.trim();
        formData.barcode = scannedBarcode;
        barcodeScanned = true;
        
        // Enable the form
        enableForm();
        
        // Update button text to show barcode is scanned
        scanBarcodeBtn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            Barcode: ${scannedBarcode}
        `;
        scanBarcodeBtn.classList.add('bg-green-600', 'hover:bg-green-700');
        scanBarcodeBtn.classList.remove('bg-primary', 'hover:bg-primary/90');
        
        showToast('Barcode Scanned', `Barcode ${scannedBarcode} has been scanned. You can now fill the form.`, 'success');
    } else {
        showToast('No Barcode', 'Please scan or enter a valid barcode.', 'error');
    }
}

// Disable Form
function disableForm() {
    const inputs = trolleyForm.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.disabled = true;
        input.classList.add('opacity-50', 'cursor-not-allowed');
    });
    
    // Disable navigation buttons
    nextBtn.disabled = true;
    nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
    submitBtn.disabled = true;
    submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    resetBtn.disabled = true;
    resetBtn.classList.add('opacity-50', 'cursor-not-allowed');
}

// Enable Form
function enableForm() {
    const inputs = trolleyForm.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        input.disabled = false;
        input.classList.remove('opacity-50', 'cursor-not-allowed');
    });
    
    // Enable navigation buttons
    nextBtn.disabled = false;
    nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    submitBtn.disabled = false;
    submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    resetBtn.disabled = false;
    resetBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    
    // Keep back button disabled if on page 1
    if (currentStep === 1) {
        backBtn.disabled = true;
        backBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

// Handle Next Button
function handleNext() {
    if (currentStep === 1) {
        currentStep = 2;
        updateProgress();
        updateButtons();
        showPage(2);
    }
}

// Handle Back Button
function handleBack() {
    if (currentStep === 2) {
        currentStep = 1;
        updateProgress();
        updateButtons();
        showPage(1);
    }
}

// Handle Reset
function handleReset() {
    if (confirm('Are you sure you want to reset the form? This will only clear the form inputs. Data already saved will remain in the database.')) {
        trolleyForm.reset();
        
        // Reset formData object
        for (let key in formData) {
            formData[key] = '';
        }
        
        // Reset barcode state
        barcodeScanned = false;
        scannedBarcode = '';
        
        // Reset scan button
        scanBarcodeBtn.innerHTML = `
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 4h4v16H3V4zm6 0h2v16H9V4zm4 0h4v16h-4V4zm6 0h2v16h-2V4z"></path>
            </svg>
            Scan Barcode
        `;
        scanBarcodeBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
        scanBarcodeBtn.classList.add('bg-primary', 'hover:bg-primary/90');
        
        // Go back to step 1
        currentStep = 1;
        updateProgress();
        updateButtons();
        showPage(1);
        
        // Disable form until barcode is scanned again
        disableForm();
        
        showToast('Form Reset', 'Form inputs cleared. Previously saved data remains in the database.', 'info');
    }
}

// Handle Form Submission
async function handleSubmit(e) {
    e.preventDefault();
    
    // Check if barcode is scanned
    if (!barcodeScanned || !scannedBarcode) {
        showToast('Error', 'Please scan trolley barcode first.', 'error');
        return;
    }
    
    // Get all form values
    const inputs = trolleyForm.querySelectorAll('input, textarea');
    inputs.forEach(input => {
        formData[input.name] = input.value;
    });
    
    // Add barcode to form data
    formData.barcode = scannedBarcode;
    
    console.log('Form Data:', formData);
    
    // Send data to backend API
    try {
        const response = await fetch('/api/trolley/attach', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                barcode: formData.barcode,
                customerName: formData.customerName,
                lotNumber: formData.lotNumber,
                designName: formData.designName,
                designNumber: formData.designNumber,
                packInstructions: formData.packInstructions,
                greyWidth: formData.greyWidth,
                finishWidth: formData.finishWidth,
                fabricQuality: formData.quality,
                totalTrolley: formData.totalTrolley,
                matching: formData.matching,
                remarks: formData.remarks,
                orderReceiveDate: formData.orderReceiveDate,
                greyReceiveDate: formData.greyReceiveDate
            })
        });
        
        const result = await response.json();
        
        if (response.ok && result.success) {
            showToast('Success!', `Form data saved for barcode ${scannedBarcode}.`, 'success');
            setTimeout(() => {
                handleReset();
            }, 2000);
        } else {
            throw new Error(result.message || 'Failed to save data');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error', error.message || 'Failed to save data. Please try again.', 'error');
    }
}

// Handle Logout
function handleLogout() {
    showToast('Logout Disabled', 'Authentication is currently disabled.', 'info');
}

// Update Progress Indicator
function updateProgress() {
    if (currentStep >= 1) {
        step1Circle.classList.add('bg-primary', 'text-primary-foreground');
        step1Circle.classList.remove('bg-border', 'text-foreground');
        step1Text.classList.add('text-foreground');
        step1Text.classList.remove('text-muted-foreground');
    }
    
    if (currentStep >= 2) {
        step2Circle.classList.add('bg-primary', 'text-primary-foreground');
        step2Circle.classList.remove('bg-border', 'text-foreground');
        step2Text.classList.add('text-foreground');
        step2Text.classList.remove('text-muted-foreground');
        progressLine.classList.add('bg-primary');
        progressLine.classList.remove('bg-border');
    } else {
        step2Circle.classList.remove('bg-primary', 'text-primary-foreground');
        step2Circle.classList.add('bg-border', 'text-foreground');
        step2Text.classList.remove('text-foreground');
        step2Text.classList.add('text-muted-foreground');
        progressLine.classList.remove('bg-primary');
        progressLine.classList.add('bg-border');
    }
}

// Update Buttons
function updateButtons() {
    if (currentStep === 1) {
        backBtn.disabled = true;
        backBtn.classList.add('opacity-50', 'cursor-not-allowed');
        nextBtn.classList.remove('hidden');
        submitBtn.classList.add('hidden');
    } else {
        backBtn.disabled = false;
        backBtn.classList.remove('opacity-50', 'cursor-not-allowed');
        nextBtn.classList.add('hidden');
        submitBtn.classList.remove('hidden');
    }
}

// Show Page
function showPage(pageNum) {
    if (pageNum === 1) {
        page1.classList.remove('hidden');
        page2.classList.add('hidden');
    } else {
        page1.classList.add('hidden');
        page2.classList.remove('hidden');
    }
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

// API Helper Functions (for backend integration)
const API = {
    // Base URL - change this to your backend URL
    baseURL: 'http://localhost:5000/api',
    
    // Save trolley data
    async saveTrolley(data) {
        const response = await fetch(`${this.baseURL}/trolley`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },
    
    // Get all trolleys
    async getTrolleys() {
        const response = await fetch(`${this.baseURL}/trolleys`);
        return await response.json();
    },
    
    // Get single trolley
    async getTrolley(id) {
        const response = await fetch(`${this.baseURL}/trolley/${id}`);
        return await response.json();
    },
    
    // Update trolley
    async updateTrolley(id, data) {
        const response = await fetch(`${this.baseURL}/trolley/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(data)
        });
        return await response.json();
    },
    
    // Delete trolley
    async deleteTrolley(id) {
        const response = await fetch(`${this.baseURL}/trolley/${id}`, {
            method: 'DELETE'
        });
        return await response.json();
    }
};

// Export for use in other pages
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { API, showToast };
}
