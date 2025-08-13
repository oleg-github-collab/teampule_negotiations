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
        
        // First check if we have a server-side cookie by making a simple API call
        try {
            const response = await fetch('/api/usage');
            console.log('🔐 Auth check response status:', response.status);
            
            if (response.ok) {
                console.log('🔐 Server authentication successful');
                // Server auth is good, update sessionStorage to match
                sessionStorage.setItem('teampulse-auth', 'true');
                
                const loginScreen = $('#login-screen');
                const appContainer = $('#app-container');
                
                if (loginScreen) loginScreen.style.display = 'none';
                if (appContainer) appContainer.style.display = 'block';
                return true;
            }
        } catch (error) {
            console.log('🔐 Server auth check failed:', error);
        }
        
        // Fallback to sessionStorage check
        const isAuthenticated = sessionStorage.getItem('teampulse-auth') === 'true';
        console.log('🔐 SessionStorage auth status:', isAuthenticated);
        
        const loginScreen = $('#login-screen');
        const appContainer = $('#app-container');
        
        if (isAuthenticated) {
            if (loginScreen) loginScreen.style.display = 'none';
            if (appContainer) appContainer.style.display = 'block';
            return true;
        } else {
            if (loginScreen) loginScreen.style.display = 'flex';
            if (appContainer) appContainer.style.display = 'none';
            return false;
        }
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

    function logout() {
        sessionStorage.removeItem('teampulse-auth');
        location.reload();
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