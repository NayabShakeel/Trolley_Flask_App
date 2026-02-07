// Global variables
let historyData = [];
let currentPage = 1;
let itemsPerPage = 10;
let totalItems = 0;
let filteredData = [];

// DOM Elements
const historyTableBody = document.getElementById('historyTableBody');
const noDataRow = document.getElementById('noDataRow');
const paginationInfo = document.getElementById('paginationInfo');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const searchInput = document.querySelector('input[placeholder*="Search"]');
const dateInput = document.querySelector('input[type="date"]');
const filterBtn = document.querySelector('.btn-primary');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    loadHistoryData();
});

// Setup Event Listeners
function setupEventListeners() {
    if (filterBtn) filterBtn.addEventListener('click', handleFilter);
    if (prevBtn) prevBtn.addEventListener('click', () => changePage(-1));
    if (nextBtn) nextBtn.addEventListener('click', () => changePage(1));
    
    if (searchInput) searchInput.addEventListener('input', handleFilter);
    if (dateInput) dateInput.addEventListener('change', handleFilter);
}

// Load History Data from Backend
async function loadHistoryData() {
    try {
        const response = await fetch('/api/history/all');
        if (!response.ok) throw new Error('Failed to fetch history');
        const result = await response.json();
        
        historyData = result.success ? (result.data || []) : [];
        filteredData = [...historyData];
        totalItems = filteredData.length;
        
        renderTable();
        updatePagination();
        
    } catch (error) {
        console.error('Error loading history:', error);
        historyData = [];
        filteredData = [];
        totalItems = 0;
        renderTable();
        updatePagination();
        showToast('Info', 'No history records found or unable to connect to server.', 'info');
    }
}

// Handle Filter
function handleFilter() {
    const searchTerm = searchInput ? searchInput.value.toLowerCase() : '';
    const selectedDate = dateInput ? dateInput.value : '';
    
    filteredData = historyData.filter(item => {
        const matchesSearch = !searchTerm || 
            (item.customer_name && item.customer_name.toLowerCase().includes(searchTerm)) ||
            (item.lot_number && item.lot_number.toLowerCase().includes(searchTerm)) ||
            (item.fabric_quality && item.fabric_quality.toLowerCase().includes(searchTerm)) ||
            (item.trolley_barcode && item.trolley_barcode.toLowerCase().includes(searchTerm)) ||
            (item.process_barcode && item.process_barcode.toLowerCase().includes(searchTerm)) ||
            (item.id && item.id.toString().includes(searchTerm));
        
        const itemDate = item.created_at ? new Date(item.created_at).toISOString().split('T')[0] : '';
        const matchesDate = !selectedDate || itemDate === selectedDate;
        
        return matchesSearch && matchesDate;
    });
    
    totalItems = filteredData.length;
    currentPage = 1;
    renderTable();
    updatePagination();
}

// Render Table
function renderTable() {
    if (!historyTableBody) return;

    if (filteredData.length === 0) {
        historyTableBody.innerHTML = `
            <tr>
                <td colspan="10" class="text-center py-8">
                    <svg class="w-16 h-16 mx-auto mb-4 text-muted-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
                    </svg>
                    <p class="text-lg font-semibold text-foreground mb-2">No History Records</p>
                    <p class="text-muted-foreground">History data will appear here once trolley forms are submitted.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = Math.min(startIndex + itemsPerPage, filteredData.length);
    const pageData = filteredData.slice(startIndex, endIndex);
    
    historyTableBody.innerHTML = pageData.map(item => {
        const f = (val) => (val === null || val === undefined || val === '' || val === 'N/A' || val === 'na') ? '-' : val;
        
        const createdDate = item.created_at ? new Date(item.created_at).toLocaleString() : '-';
        const startTime = item.process_start_time ? new Date(item.process_start_time).toLocaleString() : '-';
        const endTime = item.process_end_time ? new Date(item.process_end_time).toLocaleString() : '-';
        
        let duration = '-';
        if (item.process_start_time && item.process_end_time) {
            const start = new Date(item.process_start_time);
            const end = new Date(item.process_end_time);
            const diffMs = end - start;
            const diffMins = Math.floor(diffMs / 60000);
            const hours = Math.floor(diffMins / 60);
            const mins = diffMins % 60;
            duration = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;
        }
        
        return `
        <tr>
            <td>${f(item.id)}</td>
            <td>${f(item.customer_name)}</td>
            <td>${f(item.lot_number)}</td>
            <td>${f(item.trolley_barcode)}</td>
            <td>${f(item.process_barcode)}</td>
            <td>${createdDate}</td>
            <td>${startTime}</td>
            <td>${endTime}</td>
            <td>${duration}</td>
            <td><span class="badge ${getStatusBadgeClass(item.event_type)}">${f(formatEventType(item.event_type))}</span></td>
        </tr>
    `}).join('');
}

function getStatusBadgeClass(eventType) {
    const statusMap = {
        'trolley_attached': 'badge-success',
        'process_input': 'badge-warning',
        'process_output': 'badge-success',
        'trolley_transferred': 'badge-info'
    };
    return statusMap[eventType] || 'badge-info';
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

function updatePagination() {
    if (!paginationInfo) return;
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
    const endItem = Math.min(currentPage * itemsPerPage, totalItems);
    
    paginationInfo.textContent = totalItems === 0 
        ? 'Showing 0 entries' 
        : `Showing ${startItem}-${endItem} of ${totalItems} entries`;
    
    if (prevBtn) {
        prevBtn.disabled = currentPage === 1 || totalItems === 0;
        if (prevBtn.disabled) prevBtn.classList.add('opacity-50', 'cursor-not-allowed');
        else prevBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentPage >= totalPages || totalItems === 0;
        if (nextBtn.disabled) nextBtn.classList.add('opacity-50', 'cursor-not-allowed');
        else nextBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
}

function changePage(direction) {
    const totalPages = Math.ceil(totalItems / itemsPerPage);
    const newPage = currentPage + direction;
    
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        renderTable();
        updatePagination();
    }
}

function showToast(title, message, type = 'info') {
    const toast = document.getElementById('toast');
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    if (!toast) return;
    
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
