/**
 * ApplicationManager - SOLID compliant main application orchestrator
 * Single Responsibility: Orchestrates application startup and coordination
 * Open/Closed: Extensible for new managers without modification
 * Liskov Substitution: All managers follow same lifecycle interface
 * Interface Segregation: Separate initialization concerns
 * Dependency Inversion: Depends on manager abstractions
 */

class ApplicationManager {
    constructor() {
        this.managers = new Map();
        this.isInitialized = false;
        this.initPromise = null;
        
        console.log('🚀 ApplicationManager starting...');
        this.init();
    }
    
    // Single Responsibility: Initialize application
    async init() {
        if (this.initPromise) {
            return this.initPromise;
        }
        
        this.initPromise = this.performInitialization();
        return this.initPromise;
    }
    
    // Single Responsibility: Perform the actual initialization
    async performInitialization() {
        try {
            console.log('🚀 Initializing SOLID application architecture...');
            
            // Initialize in dependency order
            await this.initializeAPIClient();
            await this.initializeButtonManager();
            await this.initializeModalManager();
            await this.initializeOnboardingManager();
            await this.initializeClientManager();
            await this.initializeAnalysisManager();
            await this.initializeUIManager();
            
            this.isInitialized = true;
            console.log('🚀 ✅ Application initialized successfully!');
            
            // Post-initialization setup
            this.setupGlobalErrorHandling();
            this.setupGlobalEvents();
            this.setupDebugHelpers();
            
            // Start the application
            this.startApplication();
            
        } catch (error) {
            console.error('🚀 ❌ Application initialization failed:', error);
            this.handleInitializationError(error);
        }
    }
    
    // Single Responsibility: Initialize API client
    async initializeAPIClient() {
        console.log('🚀 Initializing APIClient...');
        
        const apiClient = new window.APIClient();
        this.managers.set('api', apiClient);
        
        // Test connection
        const connected = await apiClient.testConnection();
        if (!connected) {
            console.warn('🚀 ⚠️ API connection test failed - continuing anyway');
        }
        
        // Make globally available
        window.apiClient = apiClient;
    }
    
    // Single Responsibility: Initialize button manager
    async initializeButtonManager() {
        console.log('🚀 Initializing ButtonManager...');
        
        const buttonManager = new window.ButtonManager();
        this.managers.set('buttons', buttonManager);
        
        // Make globally available
        window.buttonManager = buttonManager;
    }
    
    // Single Responsibility: Initialize modal manager
    async initializeModalManager() {
        console.log('🚀 Initializing ModalManager...');
        
        const modalManager = new window.ModalManager(window.buttonManager);
        this.managers.set('modals', modalManager);
        
        // Make globally available
        window.modalManager = modalManager;
    }
    
    // Single Responsibility: Initialize onboarding manager
    async initializeOnboardingManager() {
        console.log('🚀 Initializing OnboardingManager...');
        
        const onboardingManager = new window.OnboardingManager();
        this.managers.set('onboarding', onboardingManager);
        
        // Make globally available
        window.onboardingManager = onboardingManager;
        
        // Setup notification system compatibility
        if (window.legacyShowNotification) {
            window.showNotification = window.legacyShowNotification;
        }
    }
    
    // Single Responsibility: Initialize client manager
    async initializeClientManager() {
        console.log('🚀 Initializing ClientManager...');
        
        const clientManager = new window.ClientManager(
            window.buttonManager,
            window.apiClient
        );
        this.managers.set('clients', clientManager);
        
        // Make globally available
        window.clientManager = clientManager;
    }
    
    // Single Responsibility: Initialize analysis manager
    async initializeAnalysisManager() {
        console.log('🚀 Initializing AnalysisManager...');
        
        const analysisManager = new window.AnalysisManager(
            window.buttonManager,
            window.apiClient
        );
        this.managers.set('analysis', analysisManager);
        
        // Make globally available
        window.analysisManager = analysisManager;
    }
    
    // Single Responsibility: Initialize UI manager for remaining UI operations
    async initializeUIManager() {
        console.log('🚀 Initializing UIManager...');
        
        // Register remaining UI buttons
        this.setupNavigationButtons();
        this.setupUtilityButtons();
        this.setupSidebarButtons();
        
        console.log('🚀 UIManager ready');
    }
    
    // Single Responsibility: Setup navigation buttons
    setupNavigationButtons() {
        const buttonManager = window.buttonManager;
        
        // Logout button
        buttonManager.register('#logout-btn', () => {
            this.handleLogout();
        }, { description: 'Logout Button' });
        
        // Help button
        buttonManager.register('#help-toggle', () => {
            window.onboardingManager?.forceShow();
        }, { description: 'Help Button' });
        
        // Product dropdown
        buttonManager.register('#product-dropdown-btn', () => {
            this.toggleProductDropdown();
        }, { description: 'Product Dropdown Button' });
        
        // Workspace toggle
        buttonManager.register('#workspace-toggle', () => {
            this.toggleSidebar('right');
        }, { description: 'Workspace Toggle Button' });
    }
    
    // Single Responsibility: Setup utility buttons
    setupUtilityButtons() {
        const buttonManager = window.buttonManager;
        
        // Mobile menu toggle
        buttonManager.register('#mobile-menu-toggle', () => {
            this.toggleMobileMenu();
        }, { description: 'Mobile Menu Toggle' });
        
        // Sidebar toggle
        buttonManager.register('#sidebar-right-toggle', () => {
            this.toggleSidebar('right');
        }, { description: 'Right Sidebar Toggle' });
    }
    
    // Single Responsibility: Setup sidebar buttons
    setupSidebarButtons() {
        // These will be handled by specific managers
        // Just ensuring proper delegation
        console.log('🚀 Sidebar buttons delegated to specific managers');
    }
    
    // Single Responsibility: Setup global error handling
    setupGlobalErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('🚀 Global error:', event.error);
            this.logClientError({
                error: event.error?.message || 'Unknown error',
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack
            });
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('🚀 Unhandled promise rejection:', event.reason);
            this.logClientError({
                error: 'Unhandled promise rejection: ' + event.reason,
                type: 'unhandledrejection'
            });
        });
        
        console.log('🚀 Global error handling setup');
    }
    
    // Single Responsibility: Setup global events
    setupGlobalEvents() {
        // Client change events
        window.addEventListener('clientChanged', (event) => {
            console.log('🚀 Client changed:', event.detail);
            this.handleClientChange(event.detail);
        });
        
        // Modal events
        window.addEventListener('modalAction', (event) => {
            console.log('🚀 Modal action:', event.detail);
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            this.handleGlobalKeyboard(event);
        });
        
        // Window resize
        window.addEventListener('resize', this.debounce(() => {
            this.handleResize();
        }, 250));
        
        console.log('🚀 Global events setup');
    }
    
    // Single Responsibility: Setup debug helpers
    setupDebugHelpers() {
        // Global debug object
        window.debug = {
            app: this,
            managers: this.managers,
            
            // Quick access to managers
            buttons: () => window.buttonManager,
            modals: () => window.modalManager,
            clients: () => window.clientManager,
            analysis: () => window.analysisManager,
            onboarding: () => window.onboardingManager,
            api: () => window.apiClient,
            
            // Debug utilities
            testAllButtons: () => this.testAllButtons(),
            testConnection: () => window.apiClient?.testConnection(),
            resetApp: () => this.resetApplication(),
            getStats: () => this.getApplicationStats(),
            
            // Quick actions
            closeOnboarding: () => window.onboardingManager?.forceComplete(),
            showOnboarding: () => window.onboardingManager?.forceShow(),
            resetOnboarding: () => window.onboardingManager?.reset(),
            
            // Modal helpers
            alert: (msg) => window.modalManager?.showAlert(msg),
            confirm: (msg, onConfirm) => window.modalManager?.showConfirmDialog({ message: msg, onConfirm }),
            
            // Client helpers
            getClients: () => window.clientManager?.getClients(),
            getCurrentClient: () => window.clientManager?.getCurrentClient(),
            
            // Analysis helpers
            getCurrentAnalysis: () => window.analysisManager?.getCurrentAnalysis(),
            isAnalyzing: () => window.analysisManager?.isAnalysisInProgress()
        };
        
        console.log('🚀 Debug helpers available at window.debug');
    }
    
    // Single Responsibility: Start application
    startApplication() {
        console.log('🚀 Starting application...');
        
        // Load initial data
        this.loadInitialData();
        
        // Show initial UI state
        this.showInitialState();
        
        console.log('🚀 ✨ Application started successfully!');
    }
    
    // Single Responsibility: Load initial data
    async loadInitialData() {
        try {
            // Load token usage
            const tokenUsage = await window.apiClient.getTokenUsage();
            if (tokenUsage.success) {
                this.updateTokenDisplay(tokenUsage.usage);
            }
            
            console.log('🚀 Initial data loaded');
        } catch (error) {
            console.error('🚀 Failed to load initial data:', error);
        }
    }
    
    // Single Responsibility: Show initial UI state
    showInitialState() {
        // Check if client is selected
        const currentClient = window.clientManager?.getCurrentClient();
        
        if (currentClient) {
            // Show analysis dashboard
            this.showSection('analysis-dashboard');
        } else {
            // Show welcome screen
            this.showSection('welcome-screen');
        }
    }
    
    // Single Responsibility: Handle logout
    handleLogout() {
        window.modalManager.showConfirmDialog({
            title: 'Вихід',
            message: 'Ви впевнені, що хочете вийти із системи?',
            confirmText: 'Вийти',
            onConfirm: () => {
                console.log('🚀 Logging out...');
                
                if (window.logout) {
                    window.logout();
                } else {
                    // Fallback logout
                    localStorage.clear();
                    sessionStorage.clear();
                    document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                    window.location.href = '/';
                }
            }
        });
    }
    
    // Single Responsibility: Handle client change
    handleClientChange(client) {
        console.log('🚀 Handling client change to:', client.company);
        
        // Update token usage for new client
        this.loadInitialData();
        
        // Switch to analysis dashboard
        this.showSection('analysis-dashboard');
    }
    
    // Single Responsibility: Handle global keyboard shortcuts
    handleGlobalKeyboard(event) {
        // Only handle if no input is focused
        if (document.activeElement?.tagName === 'INPUT' || 
            document.activeElement?.tagName === 'TEXTAREA') {
            return;
        }
        
        switch (event.key) {
            case 'Escape':
                // Already handled by modal manager
                break;
                
            case 'F1':
                event.preventDefault();
                window.onboardingManager?.forceShow();
                break;
                
            case 'n':
                if (event.ctrlKey || event.metaKey) {
                    event.preventDefault();
                    window.clientManager?.showClientForm();
                }
                break;
        }
    }
    
    // Single Responsibility: Handle window resize
    handleResize() {
        console.log('🚀 Handling resize');
        
        // Update mobile layout
        const isMobile = window.innerWidth < 768;
        document.body.classList.toggle('mobile-layout', isMobile);
        
        // Notify managers of resize
        this.managers.forEach(manager => {
            if (manager.handleResize) {
                manager.handleResize();
            }
        });
    }
    
    // Single Responsibility: Show a section
    showSection(sectionId) {
        const sections = ['welcome-screen', 'client-form', 'analysis-dashboard'];
        
        sections.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.style.display = id === sectionId ? 'block' : 'none';
            }
        });
        
        console.log(`🚀 Showing section: ${sectionId}`);
    }
    
    // Single Responsibility: Update token display
    updateTokenDisplay(usage) {
        const elements = {
            used: ['#used-tokens', '#workspace-used-tokens'],
            total: ['#total-tokens', '#workspace-total-tokens'],
            progress: ['#token-progress-fill', '#workspace-token-progress'],
            percentage: ['#workspace-token-percentage']
        };
        
        elements.used.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.textContent = usage.used.toLocaleString();
        });
        
        elements.total.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.textContent = usage.total.toLocaleString();
        });
        
        elements.progress.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.style.width = `${usage.percentage}%`;
        });
        
        elements.percentage.forEach(selector => {
            const el = document.querySelector(selector);
            if (el) el.textContent = `${usage.percentage.toFixed(1)}%`;
        });
    }
    
    // Utility methods
    toggleProductDropdown() {
        const dropdown = document.getElementById('product-dropdown');
        if (dropdown) {
            const isVisible = dropdown.style.display === 'block';
            dropdown.style.display = isVisible ? 'none' : 'block';
        }
    }
    
    toggleSidebar(side) {
        const sidebar = document.getElementById(`sidebar-${side}`);
        if (sidebar) {
            sidebar.classList.toggle('collapsed');
        }
    }
    
    toggleMobileMenu() {
        document.body.classList.toggle('mobile-menu-open');
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    // Debug and utility methods
    async testAllButtons() {
        const states = window.buttonManager.getAllStates();
        console.log('🚀 All button states:', states);
        return states;
    }
    
    async logClientError(errorData) {
        try {
            await window.apiClient.logClientError({
                ...errorData,
                timestamp: new Date().toISOString(),
                userAgent: navigator.userAgent,
                url: window.location.href
            });
        } catch (error) {
            console.error('🚀 Failed to log client error:', error);
        }
    }
    
    resetApplication() {
        console.log('🚀 Resetting application...');
        
        // Reset all managers
        this.managers.forEach(manager => {
            if (manager.destroy) {
                manager.destroy();
            }
        });
        
        // Clear managers
        this.managers.clear();
        
        // Reinitialize
        this.isInitialized = false;
        this.initPromise = null;
        this.init();
    }
    
    getApplicationStats() {
        return {
            initialized: this.isInitialized,
            managers: Array.from(this.managers.keys()),
            buttonStates: window.buttonManager?.getAllStates(),
            currentModal: window.modalManager?.getCurrentModal(),
            currentClient: window.clientManager?.getCurrentClient(),
            isAnalyzing: window.analysisManager?.isAnalysisInProgress(),
            apiStats: window.apiClient?.getStats()
        };
    }
    
    handleInitializationError(error) {
        console.error('🚀 💥 Critical initialization error:', error);
        
        // Show error message to user
        document.body.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; height: 100vh; background: #0a0a0a; color: white; font-family: Inter, sans-serif;">
                <div style="text-align: center; max-width: 500px; padding: 2rem;">
                    <h1 style="color: #ff0080; margin-bottom: 1rem;">❌ Помилка ініціалізації</h1>
                    <p style="margin-bottom: 2rem;">Не вдалося запустити додаток. Спробуйте перезавантажити сторінку.</p>
                    <button onclick="window.location.reload()" style="background: #a855f7; border: none; color: white; padding: 0.75rem 1.5rem; border-radius: 0.5rem; cursor: pointer;">
                        Перезавантажити
                    </button>
                    <details style="margin-top: 2rem; text-align: left;">
                        <summary style="cursor: pointer; color: #a855f7;">Деталі помилки</summary>
                        <pre style="background: #1a1a1a; padding: 1rem; border-radius: 0.5rem; margin-top: 1rem; overflow: auto; font-size: 0.875rem;">${error.stack || error.message}</pre>
                    </details>
                </div>
            </div>
        `;
    }
    
    // Interface Segregation: Public API
    getManager(name) {
        return this.managers.get(name);
    }
    
    isReady() {
        return this.isInitialized;
    }
    
    destroy() {
        console.log('🚀 Destroying ApplicationManager...');
        
        this.managers.forEach(manager => {
            if (manager.destroy) {
                manager.destroy();
            }
        });
        
        this.managers.clear();
        this.isInitialized = false;
    }
}

// Initialize application when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.app = new ApplicationManager();
    });
} else {
    window.app = new ApplicationManager();
}

// Export for global use
window.ApplicationManager = ApplicationManager;
console.log('🚀 ApplicationManager class loaded');