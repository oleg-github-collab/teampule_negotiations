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
            
            // Initialize in dependency order - optimized for Ultimate Button Controller
            await this.initializeAPIClient();
            await this.initializeAnalysisManager();
            await this.initializeUIManager();
            
            // Ultimate Button Controller handles all button/modal/onboarding logic
            
            this.isInitialized = true;
            console.log('🚀 ✅ Application initialized successfully!');
            
            // Post-initialization setup
            this.setupGlobalErrorHandling();
            this.setupGlobalEvents();
            this.setupDebugHelpers();
            
        } catch (error) {
            console.error('🚀 ❌ Application initialization failed:', error);
            this.handleInitializationError(error);
            throw error;
        }
    }
    
    // Single Responsibility: Initialize API client
    async initializeAPIClient() {
        console.log('🚀 Initializing APIClient...');
        
        if (!window.APIClient) {
            console.warn('🚀 ⚠️ APIClient not available - skipping');
            return;
        }
        
        const apiClient = new window.APIClient();
        this.managers.set('api', apiClient);
        
        // Test connection
        try {
            const connected = await apiClient.testConnection();
            if (!connected) {
                console.warn('🚀 ⚠️ API connection test failed - continuing anyway');
            }
        } catch (error) {
            console.warn('🚀 ⚠️ API test failed:', error.message);
        }
        
        // Make globally available
        window.apiClient = apiClient;
    }
    
    // Single Responsibility: Initialize analysis manager
    async initializeAnalysisManager() {
        console.log('🚀 Initializing AnalysisManager...');
        
        if (!window.AnalysisManager) {
            console.warn('🚀 ⚠️ AnalysisManager not available - skipping');
            return;
        }
        
        const analysisManager = new window.AnalysisManager();
        this.managers.set('analysis', analysisManager);
        
        // Make globally available
        window.analysisManager = analysisManager;
    }
    
    // Single Responsibility: Initialize UI manager (legacy app compatibility)
    async initializeUIManager() {
        console.log('🚀 Initializing UI compatibility layer...');
        
        // Initialize legacy app if available
        if (window.initializeApp) {
            try {
                await window.initializeApp();
                console.log('🚀 Legacy app initialized');
            } catch (error) {
                console.warn('🚀 ⚠️ Legacy app initialization failed:', error.message);
            }
        }
        
        // Setup responsive design handlers
        this.setupResponsiveHandlers();
    }
    
    // Single Responsibility: Setup responsive design
    setupResponsiveHandlers() {
        const mediaQuery = window.matchMedia('(max-width: 768px)');
        
        const handleResponsive = (e) => {
            document.body.classList.toggle('mobile-layout', e.matches);
        };
        
        handleResponsive(mediaQuery);
        mediaQuery.addListener(handleResponsive);
    }
    
    // Single Responsibility: Setup global error handling
    setupGlobalErrorHandling() {
        // Uncaught exceptions
        window.addEventListener('error', (event) => {
            this.handleGlobalError(event.error, 'uncaught-exception');
        });
        
        // Unhandled promise rejections
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError(event.reason, 'unhandled-rejection');
            event.preventDefault(); // Prevent console spam
        });
    }
    
    // Single Responsibility: Setup global events
    setupGlobalEvents() {
        // Keyboard shortcuts
        document.addEventListener('keydown', (event) => {
            // ESC to close modals (handled by Ultimate Button Controller)
            // Ctrl+/ for help
            if (event.ctrlKey && event.key === '/') {
                event.preventDefault();
                if (window.ultimateController) {
                    // Trigger help via Ultimate Button Controller
                    const helpBtn = document.querySelector('#help-toggle, #welcome-help');
                    if (helpBtn) helpBtn.click();
                }
            }
        });
        
        // Focus management
        document.addEventListener('focusin', (event) => {
            // Add focus indicators for accessibility
            event.target.classList.add('focused');
        });
        
        document.addEventListener('focusout', (event) => {
            event.target.classList.remove('focused');
        });
    }
    
    // Single Responsibility: Setup debug helpers
    setupDebugHelpers() {
        // Global debug object
        window.AppDebug = {
            managers: this.managers,
            getManager: (name) => this.managers.get(name),
            isInitialized: () => this.isInitialized,
            restart: () => this.restart(),
            version: '3.0.0'
        };
        
        console.log('🚀 Debug helpers available: window.AppDebug');
    }
    
    // Single Responsibility: Handle global errors
    handleGlobalError(error, type) {
        console.error(`🚀 Global ${type}:`, error);
        
        // Don't spam for known harmless errors
        const harmlessErrors = [
            'Script error',
            'ResizeObserver loop limit exceeded',
            'Non-Error promise rejection captured'
        ];
        
        const isHarmless = harmlessErrors.some(msg => 
            error?.message?.includes(msg) || 
            error?.toString?.()?.includes(msg)
        );
        
        if (isHarmless) return;
        
        // Log to API if available
        const apiClient = this.managers.get('api');
        if (apiClient) {
            apiClient.logError(error, type).catch(() => {
                // Ignore logging errors
            });
        }
    }
    
    // Single Responsibility: Handle initialization errors
    handleInitializationError(error) {
        console.error('🚀 💥 Critical initialization error:', error);
        
        // Show user-friendly error
        const errorMessage = `
            Помилка ініціалізації додатка.
            
            Будь ласка, перезавантажте сторінку.
            Якщо проблема повториться, зверніться до підтримки.
        `;
        
        // Create error UI
        this.showCriticalError(errorMessage);
    }
    
    // Single Responsibility: Show critical error UI
    showCriticalError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.9); color: white; z-index: 99999;
            display: flex; align-items: center; justify-content: center;
            font-family: Arial, sans-serif; text-align: center;
        `;
        
        errorDiv.innerHTML = `
            <div style="padding: 2rem; background: rgba(220,53,69,0.1); border-radius: 8px; max-width: 500px;">
                <h2 style="color: #ff6b6b; margin-bottom: 1rem;">⚠️ Критична помилка</h2>
                <p style="margin-bottom: 2rem; line-height: 1.5;">${message}</p>
                <button onclick="window.location.reload()" 
                        style="background: #28a745; color: white; border: none; 
                               padding: 12px 24px; border-radius: 4px; cursor: pointer; 
                               font-size: 16px; margin-right: 10px;">
                    Перезавантажити
                </button>
                <button onclick="this.closest('div').remove()" 
                        style="background: #6c757d; color: white; border: none; 
                               padding: 12px 24px; border-radius: 4px; cursor: pointer; 
                               font-size: 16px;">
                    Закрити
                </button>
            </div>
        `;
        
        document.body.appendChild(errorDiv);
    }
    
    // Single Responsibility: Restart application
    async restart() {
        console.log('🚀 Restarting application...');
        
        // Clear state
        this.isInitialized = false;
        this.initPromise = null;
        this.managers.clear();
        
        // Reinitialize
        await this.init();
    }
    
    // Single Responsibility: Get manager by name
    getManager(name) {
        return this.managers.get(name);
    }
    
    // Single Responsibility: Check if manager exists
    hasManager(name) {
        return this.managers.has(name);
    }
    
    // Single Responsibility: Get all manager names
    getManagerNames() {
        return Array.from(this.managers.keys());
    }
}

// Auto-initialize on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.applicationManager = new ApplicationManager();
    });
} else {
    window.applicationManager = new ApplicationManager();
}

// Export for ES6 modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ApplicationManager;
}