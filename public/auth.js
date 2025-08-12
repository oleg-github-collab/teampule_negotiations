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

    function checkAuth() {
        const isAuthenticated = sessionStorage.getItem('teampulse-auth') === 'true';
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

    function handleLogin(e) {
        e.preventDefault();
        
        const usernameField = $('#username');
        const passwordField = $('#password');
        const errorDiv = $('#login-error');
        
        if (!usernameField || !passwordField) return;
        
        const username = usernameField.value.trim();
        const password = passwordField.value.trim();
        
        if (username === CREDENTIALS.username && password === CREDENTIALS.password) {
            sessionStorage.setItem('teampulse-auth', 'true');
            if (errorDiv) errorDiv.style.display = 'none';
            checkAuth();
            
            // Fire custom event to notify that authentication is complete
            window.dispatchEvent(new CustomEvent('auth-success'));
        } else {
            if (errorDiv) {
                errorDiv.textContent = 'Невірний логін або пароль';
                errorDiv.style.display = 'block';
            }
            if (passwordField) passwordField.value = '';
        }
    }

    function logout() {
        sessionStorage.removeItem('teampulse-auth');
        location.reload();
    }

    function initAuth() {
        // Check authentication status
        if (!checkAuth()) {
            // Bind login form if not authenticated
            const loginForm = $('#login-form');
            if (loginForm) {
                loginForm.addEventListener('submit', handleLogin);
            }
        } else {
            // If already authenticated, fire success event
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