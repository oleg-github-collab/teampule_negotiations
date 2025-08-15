// Authentication module for TeamPulse Turbo
(function() {
    'use strict';
    
    // ===== Authentication =====
    const CREDENTIALS = {
        username: 'janeDVDops',
        password: 'jane2210'
    };

    function $(selector) {
        return document.querySelector(selector);
    }

    async function checkAuth() {
        console.log('🔐 Checking authentication status...');
        
        // Check if we have valid server-side authentication
        try {
            const response = await fetch('/api/clients');
            console.log('🔐 Auth check response status:', response.status);
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log('🔐 Server authentication successful');
                    // Server auth is good, update sessionStorage to match
                    sessionStorage.setItem('teampulse-auth', 'true');
                    
                    const loginScreen = $('#login-screen');
                    const appContainer = $('#app-container');
                    
                    if (loginScreen) loginScreen.style.display = 'none';
                    if (appContainer) appContainer.style.display = 'block';
                    return true;
                } else {
                    console.log('🔐 Server returned unsuccessful response');
                }
            } else if (response.status === 401) {
                console.log('🔐 Server authentication failed - 401 Unauthorized');
            }
        } catch (error) {
            console.log('🔐 Server auth check failed:', error);
        }
        
        // If server auth failed, clear any stale sessionStorage
        sessionStorage.removeItem('teampulse-auth');
        console.log('🔐 Authentication failed, showing login screen');
        
        const loginScreen = $('#login-screen');
        const appContainer = $('#app-container');
        
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appContainer) appContainer.style.display = 'none';
        return false;
    }

    async function handleLogin(e) {
        e.preventDefault();
        console.log('🔐 Login attempt started...');
        
        const usernameField = $('#username');
        const passwordField = $('#password');
        const errorDiv = $('#login-error');
        
        if (!usernameField || !passwordField) return;
        
        const username = usernameField.value.trim();
        const password = passwordField.value.trim();
        
        console.log('🔐 Attempting server authentication...');
        
        try {
            // Use server-side authentication
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            console.log('🔐 Server login response:', response.status, data);
            
            if (response.ok && data.success) {
                console.log('🔐 Server authentication successful');
                sessionStorage.setItem('teampulse-auth', 'true');
                if (errorDiv) errorDiv.style.display = 'none';
                
                await checkAuth();
                
                // Fire custom event to notify that authentication is complete
                window.dispatchEvent(new CustomEvent('auth-success'));
            } else {
                console.log('🔐 Server authentication failed');
                if (errorDiv) {
                    errorDiv.textContent = data.error || 'Невірний логін або пароль';
                    errorDiv.style.display = 'block';
                }
                if (passwordField) passwordField.value = '';
            }
        } catch (error) {
            console.error('🔐 Login request failed:', error);
            if (errorDiv) {
                errorDiv.textContent = 'Помилка з\'єднання із сервером';
                errorDiv.style.display = 'block';
            }
            if (passwordField) passwordField.value = '';
        }
    }

    async function logout() {
        console.log('🔐 Logout initiated...');
        try {
            // Call server logout endpoint
            const response = await fetch('/api/logout', {
                method: 'POST'
            });
            console.log('🔐 Server logout response:', response.status);
        } catch (error) {
            console.log('🔐 Server logout failed, proceeding with client cleanup:', error);
        }
        
        // Clear client-side auth state
        sessionStorage.removeItem('teampulse-auth');
        localStorage.clear(); // Clear all app state
        
        // Redirect to login page
        console.log('🔐 Logout complete, redirecting to login page');
        window.location.href = '/login.html';
    }

    async function initAuth() {
        console.log('🔐 Initializing authentication...');
        // Check authentication status
        const isAuthenticated = await checkAuth();
        if (!isAuthenticated) {
            // Bind login form if not authenticated
            const loginForm = $('#login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', handleLogin);
                console.log('🔐 Login form bound');
            }
        } else {
            // If already authenticated, fire success event
            console.log('🔐 Already authenticated, firing auth-success event');
            window.dispatchEvent(new CustomEvent('auth-success'));
        }
    }

    // Make logout function globally available
    window.logout = logout;

    // Initialize auth when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initAuth);
    } else {
        initAuth();
    }
})();