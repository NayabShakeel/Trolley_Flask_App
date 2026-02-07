// Authentication and Role-based Access Control

// Check if user is authenticated on protected pages
function checkAuth() {
    // Authentication disabled as per user request
    console.log('Auth check bypassed');
    return true;
}

// Check if current page is accessible by user's role
function checkRoleAccess(role) {
    return true; // Access granted to all pages
    const currentPage = window.location.pathname;
    
    // Define page access by role
    const operatorPages = [
        'index.html',
        'process.html',
        'barcode.html'
    ];
    
    const adminOnlyPages = [
        'users.html',
        'history.html',
        'settings.html'
    ];
    
    // Check if operator is trying to access admin-only pages
    if (role === 'operator') {
        const isAdminPage = adminOnlyPages.some(page => currentPage.includes(page));
        if (isAdminPage) {
            alert('Access Denied: This page is only accessible to administrators.');
            window.location.href = '../index.html';
            return;
        }
        
        // Hide admin-only navigation items for operators
        hideAdminNavItems();
    }
}

// Hide admin-only navigation items for operators
function hideAdminNavItems() {
    // Show all items
    const user = JSON.parse(localStorage.getItem('user'));
    if (user && user.role === 'operator') {
        // Hide User Data, History, and Settings nav items
        const navItems = document.querySelectorAll('nav a[href*="users.html"], nav a[href*="history.html"], nav a[href*="settings.html"]');
        navItems.forEach(item => {
            item.style.display = 'none';
        });
    }
}

// Login Form Handler
if (document.getElementById('loginForm')) {
    document.getElementById('loginForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const role = document.getElementById('role').value;
        const name = document.getElementById('name').value;
        const password = document.getElementById('password').value;
        const errorMessage = document.getElementById('errorMessage');
        
        // Validate inputs
        if (!role || !name || !password) {
            errorMessage.textContent = 'Please fill in all fields';
            errorMessage.classList.remove('hidden');
            return;
        }
        
        // API call to authenticate user
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    role: role,
                    name: name,
                    password: password
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                // Store user data in localStorage
                localStorage.setItem('user', JSON.stringify({
                    name: name,
                    role: role,
                    token: data.token
                }));
                
                // Redirect based on role
                window.location.href = 'index.html';
            } else {
                errorMessage.textContent = data.message || 'Invalid credentials';
                errorMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = 'Login failed. Please try again.';
            errorMessage.classList.remove('hidden');
        }
    });
}

// Reset Password Form Handler
if (document.getElementById('resetPasswordForm')) {
    document.getElementById('resetPasswordForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const message = document.getElementById('message');
        
        // Since the form doesn't have a role selector, we'll ask the user or default to admin for this simple fix
        // In a real app, this would be handled by a token or a role selector
        const role = prompt("Please enter the role to reset (admin or operator):", "admin");
        
        if (!role || (role !== 'admin' && role !== 'operator')) {
            alert("Invalid role. Please enter 'admin' or 'operator'.");
            return;
        }
        
        // Validate passwords
        if (!newPassword || !confirmPassword) {
            message.textContent = 'Please fill in all fields';
            message.classList.remove('hidden', 'text-green-600');
            message.classList.add('text-red-600');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            message.textContent = 'Passwords do not match';
            message.classList.remove('hidden', 'text-green-600');
            message.classList.add('text-red-600');
            return;
        }
        
        if (newPassword.length < 6) {
            message.textContent = 'Password must be at least 6 characters long';
            message.classList.remove('hidden', 'text-green-600');
            message.classList.add('text-red-600');
            return;
        }
        
        // API call to reset password
        try {
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    newPassword: newPassword,
                    role: role
                })
            });
            
            const data = await response.json();
            
            if (response.ok && data.success) {
                message.textContent = 'Password reset successfully! Redirecting to login...';
                message.classList.remove('hidden', 'text-red-600');
                message.classList.add('text-green-600');
                
                // Redirect to login after 2 seconds
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 2000);
            } else {
                message.textContent = data.message || 'Password reset failed';
                message.classList.remove('hidden', 'text-green-600');
                message.classList.add('text-red-600');
            }
        } catch (error) {
            console.error('Reset password error:', error);
            message.textContent = 'Password reset failed. Please try again.';
            message.classList.remove('hidden', 'text-green-600');
            message.classList.add('text-red-600');
        }
    });
}

// Logout Handler
function setupLogout() {
    const logoutButtons = document.querySelectorAll('button:has(span:contains("Logout"))');
    logoutButtons.forEach(button => {
        button.addEventListener('click', function() {
            if (confirm('Are you sure you want to logout?')) {
                localStorage.removeItem('user');
                window.location.href = 'login.html';
            }
        });
    });
}

// Initialize authentication check and setup
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    setupLogout();
    hideAdminNavItems();
});

// Get current user
function getCurrentUser() {
    return JSON.parse(localStorage.getItem('user'));
}

// Check if user is admin
function isAdmin() {
    const user = getCurrentUser();
    return user && user.role === 'admin';
}

// Export functions for use in other scripts
window.authUtils = {
    getCurrentUser,
    isAdmin,
    checkAuth,
    checkRoleAccess
};
