// Global variables
let usersData = [];
let currentPage = 1;
let itemsPerPage = 10;

// DOM Elements
const usersTableBody = document.querySelector('tbody');

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    loadUsers();
    // Auto-refresh every 30 seconds
    setInterval(loadUsers, 30000);
});

// Load Users Data from Backend
async function loadUsers() {
    try {
        const response = await fetch('/api/users');
        if (!response.ok) throw new Error('Failed to fetch users');
        
        const result = await response.json();
        
        if (result.success) {
            usersData = result.data || [];
            renderTable();
        } else {
            throw new Error(result.message || 'Failed to load users');
        }
        
    } catch (error) {
        console.error('Error loading users:', error);
        // Show empty table with message
        usersData = [];
        renderTable();
    }
}

// Render Table
function renderTable() {
    if (!usersTableBody) return;
    
    if (usersData.length === 0) {
        usersTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="text-center py-8">
                    <p class="text-lg font-semibold text-foreground mb-2">No Users Found</p>
                    <p class="text-muted-foreground">Users will appear here once they are created through the login system.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Render user rows
    usersTableBody.innerHTML = usersData.map(user => {
        const lastLogin = user.last_login 
            ? new Date(user.last_login).toLocaleString() 
            : 'Never';
        
        const statusClass = user.status === 'active' 
            ? 'badge-success' 
            : 'badge-error';
        
        return `
            <tr>
                <td>${user.name || 'N/A'}</td>
                <td>${user.role || 'N/A'}</td>
                <td><span class="badge ${statusClass}">${user.status || 'N/A'}</span></td>
                <td>${lastLogin}</td>
                <td>
                    <button onclick="toggleUserStatus(${user.id}, '${user.status}')" 
                            class="text-primary hover:underline text-sm mr-2">
                        ${user.status === 'active' ? 'Deactivate' : 'Activate'}
                    </button>
                    <button onclick="deleteUser(${user.id})" 
                            class="text-red-500 hover:underline text-sm">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

// Toggle User Status
async function toggleUserStatus(userId, currentStatus) {
    try {
        const newStatus = currentStatus === 'active' ? 'inactive' : 'active';
        
        const response = await fetch(`/api/users/update/${userId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ status: newStatus })
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Success', `User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`, 'success');
            loadUsers(); // Reload the table
        } else {
            throw new Error(result.message || 'Failed to update user');
        }
        
    } catch (error) {
        console.error('Error updating user:', error);
        showToast('Error', error.message || 'Failed to update user status', 'error');
    }
}

// Delete User
async function deleteUser(userId) {
    if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`/api/users/delete/${userId}`, {
            method: 'DELETE'
        });
        
        const result = await response.json();
        
        if (result.success) {
            showToast('Success', 'User deleted successfully', 'success');
            loadUsers(); // Reload the table
        } else {
            throw new Error(result.message || 'Failed to delete user');
        }
        
    } catch (error) {
        console.error('Error deleting user:', error);
        showToast('Error', error.message || 'Failed to delete user', 'error');
    }
}

// Toast Notification (simple version, can be enhanced)
function showToast(title, message, type = 'info') {
    // Check if toast exists in the page
    const toast = document.getElementById('toast');
    if (!toast) {
        // Simple alert fallback
        alert(`${title}: ${message}`);
        return;
    }
    
    const toastTitle = document.getElementById('toastTitle');
    const toastMessage = document.getElementById('toastMessage');
    const toastIcon = document.getElementById('toastIcon');
    
    if (toastTitle) toastTitle.textContent = title;
    if (toastMessage) toastMessage.textContent = message;
    
    // Set icon based on type
    if (toastIcon) {
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
    
    toast.classList.remove('hidden');
    toast.classList.add('show');
    
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.classList.add('hidden');
            if (toastIcon) toastIcon.className = 'w-6 h-6';
        }, 300);
    }, 3000);
}
