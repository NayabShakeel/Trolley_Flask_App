// DOM Elements
const companyNameInput = document.getElementById('companyName');
const timezoneSelect = document.getElementById('timezone');
const maintenanceModeCheckbox = document.getElementById('maintenanceMode');
const dbHostInput = document.getElementById('dbHost');
const dbPortInput = document.getElementById('dbPort');
const dbNameInput = document.getElementById('dbName');
const saveBtn = document.querySelector('.btn-primary[type="button"]');
const cancelBtn = document.querySelector('.btn-secondary');

// Global state
let originalSettings = {};
let currentSettings = {};

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadSettings();
    setupEventListeners();
});

// Setup Event Listeners
function setupEventListeners() {
    // Find the Save Settings button specifically
    const buttons = document.querySelectorAll('.btn-primary');
    buttons.forEach(btn => {
        if (btn.textContent.includes('Save Settings')) {
            btn.addEventListener('click', saveSettings);
        }
    });
    
    // Cancel button
    if (cancelBtn) {
        cancelBtn.addEventListener('click', resetToOriginal);
    }
    
    // Maintenance mode toggle
    if (maintenanceModeCheckbox) {
        maintenanceModeCheckbox.addEventListener('change', handleMaintenanceModeToggle);
    }
    
    // Track changes for unsaved changes warning
    [companyNameInput, timezoneSelect, dbHostInput, dbPortInput, dbNameInput].forEach(element => {
        if (element) {
            element.addEventListener('input', markAsModified);
        }
    });
}

// Load Settings from Backend
async function loadSettings() {
    try {
        const response = await fetch('/api/settings/all');
        if (!response.ok) throw new Error('Failed to fetch settings');
        
        const result = await response.json();
        
        if (result.success && result.data) {
            originalSettings = result.data;
            currentSettings = { ...result.data };
            applySettingsToForm(result.data);
        }
    } catch (error) {
        console.error('Error loading settings:', error);
        showToast('Error', 'Failed to load settings. Using defaults.', 'error');
    }
}

// Apply Settings to Form
function applySettingsToForm(settings) {
    if (companyNameInput && settings.company_name) {
        companyNameInput.value = settings.company_name;
    }
    
    if (timezoneSelect && settings.timezone) {
        timezoneSelect.value = settings.timezone;
    }
    
    if (maintenanceModeCheckbox && settings.maintenance_mode) {
        maintenanceModeCheckbox.checked = settings.maintenance_mode === 'true';
    }
    
    // Update sidebar company name if it exists
    updateSidebarCompanyName(settings.company_name);
}

// Update Sidebar Company Name
function updateSidebarCompanyName(name) {
    const sidebarHeading = document.querySelector('aside h1');
    if (sidebarHeading && name) {
        sidebarHeading.textContent = name;
    }
}

// Handle Maintenance Mode Toggle
function handleMaintenanceModeToggle(event) {
    const isEnabled = event.target.checked;
    const message = isEnabled 
        ? 'Maintenance mode enabled. Only admins will be able to access the application.' 
        : 'Maintenance mode disabled. All users can access the application.';
    
    showToast(
        isEnabled ? 'Maintenance Mode Enabled' : 'Maintenance Mode Disabled',
        message,
        'info'
    );
    
    markAsModified();
}

// Mark as Modified
function markAsModified() {
    // Visual indicator that settings have been modified
    const saveBtn = Array.from(document.querySelectorAll('.btn-primary'))
        .find(btn => btn.textContent.includes('Save Settings'));
    
    if (saveBtn && !saveBtn.classList.contains('pulse')) {
        saveBtn.classList.add('pulse');
    }
}

// Save Settings
async function saveSettings() {
    try {
        // Gather current form values
        const settings = {
            company_name: companyNameInput ? companyNameInput.value : 'TFT Industries',
            timezone: timezoneSelect ? timezoneSelect.value : 'UTC +5:00 (Pakistan Standard Time)',
            maintenance_mode: maintenanceModeCheckbox ? maintenanceModeCheckbox.checked.toString() : 'false'
        };
        
        // Show loading state
        const saveBtn = Array.from(document.querySelectorAll('.btn-primary'))
            .find(btn => btn.textContent.includes('Save Settings'));
        if (saveBtn) {
            saveBtn.disabled = true;
            saveBtn.innerHTML = '<svg class="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Saving...';
        }
        
        const response = await fetch('/api/settings/update', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(settings)
        });
        
        const result = await response.json();
        
        if (result.success) {
            originalSettings = { ...settings };
            currentSettings = { ...settings };
            
            // Update sidebar with new company name
            updateSidebarCompanyName(settings.company_name);
            
            showToast('Success', 'Settings saved successfully!', 'success');
            
            // Remove pulse class
            if (saveBtn) {
                saveBtn.classList.remove('pulse');
            }
        } else {
            throw new Error(result.message || 'Failed to save settings');
        }
        
    } catch (error) {
        console.error('Error saving settings:', error);
        showToast('Error', error.message || 'Failed to save settings', 'error');
    } finally {
        // Restore button state
        const saveBtn = Array.from(document.querySelectorAll('.btn-primary'))
            .find(btn => btn.innerHTML.includes('Saving'));
        if (saveBtn) {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4"></path></svg> Save Settings';
        }
    }
}

// Reset to Original
function resetToOriginal() {
    if (confirm('Are you sure you want to discard all changes?')) {
        applySettingsToForm(originalSettings);
        showToast('Reset', 'Settings reset to last saved values', 'info');
        
        // Remove pulse class
        const saveBtn = Array.from(document.querySelectorAll('.btn-primary'))
            .find(btn => btn.textContent.includes('Save Settings'));
        if (saveBtn) {
            saveBtn.classList.remove('pulse');
        }
    }
}

// Toast Notification
function showToast(title, message, type = 'info') {
    // Create toast if it doesn't exist
    let toast = document.getElementById('toast');
    
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'toast';
        toast.className = 'fixed bottom-5 right-5 bg-card border border-border rounded-lg shadow-lg p-4 transform translate-y-full transition-transform duration-300 z-50';
        toast.innerHTML = `
            <div class="flex items-center gap-3">
                <svg id="toastIcon" class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"></svg>
                <div>
                    <p id="toastTitle" class="font-semibold text-foreground"></p>
                    <p id="toastMessage" class="text-sm text-muted-foreground"></p>
                </div>
            </div>
        `;
        document.body.appendChild(toast);
    }
    
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    if (toastTitle) toastTitle.textContent = title;
    if (toastMessage) toastMessage.textContent = message;
    
    // Set icon based on type
    if (toastIcon) {
        toastIcon.className = 'w-6 h-6';
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
    }
    
    toast.classList.remove('hidden', 'translate-y-full');
    toast.classList.add('translate-y-0');
    
    setTimeout(() => {
        toast.classList.add('translate-y-full');
        toast.classList.remove('translate-y-0');
        setTimeout(() => {
            if (toastIcon) toastIcon.className = 'w-6 h-6';
        }, 300);
    }, 3000);
}

// Add CSS for pulse animation
const style = document.createElement('style');
style.textContent = `
    .pulse {
        animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
    }
    
    @keyframes pulse {
        0%, 100% {
            opacity: 1;
        }
        50% {
            opacity: 0.7;
        }
    }
`;
document.head.appendChild(style);
