/**
 * Error Recovery System - Enhanced failsafe mechanisms
 * Provides comprehensive error handling and recovery for critical failures
 */

class ErrorRecoveryManager {
    constructor() {
        this.retryQueue = [];
        this.errorLog = [];
        this.maxRetries = 3;
        this.retryDelay = 2000;
        this.isRecovering = false;
        
        console.log('🛡️ ErrorRecoveryManager initialized');
        this.init();
    }
    
    init() {
        this.setupGlobalErrorHandlers();
        this.setupNetworkMonitoring();
        this.setupPerformanceMonitoring();
        this.setupStorageRecovery();
    }
    
    // Setup enhanced global error handlers
    setupGlobalErrorHandlers() {
        // Critical JavaScript errors
        window.addEventListener('error', (event) => {
            this.handleCriticalError({
                type: 'javascript',
                message: event.message,
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno,
                stack: event.error?.stack,
                timestamp: new Date().toISOString()
            });
        });
        
        // Promise rejection errors
        window.addEventListener('unhandledrejection', (event) => {
            // Handle specific known errors gracefully
            if (this.shouldIgnoreError(event.reason)) {
                event.preventDefault();
                return;
            }
            
            this.handleCriticalError({
                type: 'promise_rejection',
                reason: event.reason?.toString() || 'Unknown',
                stack: event.reason?.stack,
                timestamp: new Date().toISOString()
            });
        });
        
        // Resource loading errors
        window.addEventListener('error', (event) => {
            if (event.target !== window) {
                this.handleResourceError({
                    type: 'resource',
                    element: event.target.tagName,
                    source: event.target.src || event.target.href,
                    timestamp: new Date().toISOString()
                });
            }
        }, true);
    }
    
    // Setup network monitoring
    setupNetworkMonitoring() {
        // Online/offline detection
        window.addEventListener('online', () => {
            console.log('🛡️ Network restored');
            this.handleNetworkRestore();
        });
        
        window.addEventListener('offline', () => {
            console.log('🛡️ Network lost');
            this.handleNetworkLoss();
        });
        
        // Periodic connectivity check
        setInterval(() => {
            this.checkConnectivity();
        }, 30000); // Every 30 seconds
    }
    
    // Setup performance monitoring
    setupPerformanceMonitoring() {
        // Monitor memory usage
        setInterval(() => {
            if (window.performance?.memory) {
                const memInfo = window.performance.memory;
                const usedMB = Math.round(memInfo.usedJSHeapSize / 1024 / 1024);
                const limitMB = Math.round(memInfo.jsHeapSizeLimit / 1024 / 1024);
                
                if (usedMB / limitMB > 0.8) {
                    this.handleHighMemoryUsage(usedMB, limitMB);
                }
            }
        }, 60000); // Every minute
        
        // Monitor page responsiveness
        let lastCheck = Date.now();
        setInterval(() => {
            const now = Date.now();
            const timeDiff = now - lastCheck;
            if (timeDiff > 10000) { // More than 10 seconds delay
                this.handleUnresponsiveness(timeDiff);
            }
            lastCheck = now;
        }, 5000);
    }
    
    // Setup local storage recovery
    setupStorageRecovery() {
        try {
            // Test localStorage availability
            localStorage.setItem('__test__', 'test');
            localStorage.removeItem('__test__');
            
            // Setup storage error handler
            window.addEventListener('storage', (event) => {
                if (event.key === null) {
                    this.handleStorageCleared();
                }
            });
        } catch (error) {
            this.handleStorageUnavailable();
        }
    }
    
    // Handle critical errors
    handleCriticalError(errorData) {
        console.error('🛡️ Critical error:', errorData);
        this.errorLog.push(errorData);
        
        // Try to recover from known error patterns
        if (this.attemptErrorRecovery(errorData)) {
            return;
        }
        
        // Show user-friendly error message
        this.showCriticalErrorDialog(errorData);
        
        // Log to server if possible
        this.logErrorToServer(errorData);
    }
    
    // Attempt automatic error recovery
    attemptErrorRecovery(errorData) {
        // Recovery for common errors
        if (errorData.message?.includes('Cannot read property') || 
            errorData.message?.includes('Cannot read properties')) {
            return this.recoverFromNullReference(errorData);
        }
        
        if (errorData.message?.includes('NetworkError') || 
            errorData.type === 'network') {
            return this.recoverFromNetworkError(errorData);
        }
        
        if (errorData.message?.includes('out of memory') || 
            errorData.type === 'memory') {
            return this.recoverFromMemoryError(errorData);
        }
        
        return false;
    }
    
    // Recover from null reference errors
    recoverFromNullReference(errorData) {
        console.log('🛡️ Attempting null reference recovery');
        
        // Reinitialize critical components
        try {
            if (window.applicationManager && !window.applicationManager.isInitialized) {
                window.applicationManager.init();
                return true;
            }
            
            // Reload critical managers
            if (!window.apiClient) {
                window.apiClient = new window.APIClient();
            }
            
            if (!window.clientManager) {
                window.clientManager = new window.ClientManager();
            }
            
            return true;
        } catch (recoveryError) {
            console.error('🛡️ Recovery failed:', recoveryError);
            return false;
        }
    }
    
    // Recover from network errors
    recoverFromNetworkError(errorData) {
        console.log('🛡️ Attempting network recovery');
        
        // Queue failed requests for retry
        if (errorData.request) {
            this.queueForRetry(errorData.request);
        }
        
        // Show network status indicator
        this.showNetworkStatus('Проблеми з мережею. Спробуємо відновити...');
        
        return true;
    }
    
    // Recover from memory errors
    recoverFromMemoryError(errorData) {
        console.log('🛡️ Attempting memory recovery');
        
        // Clear caches
        this.clearCaches();
        
        // Force garbage collection if available
        if (window.gc) {
            window.gc();
        }
        
        // Show memory warning
        this.showMemoryWarning();
        
        return true;
    }
    
    // Handle resource loading errors
    handleResourceError(errorData) {
        console.warn('🛡️ Resource loading error:', errorData);
        
        // Attempt to reload critical resources
        if (errorData.element === 'SCRIPT' && errorData.source) {
            this.attemptResourceReload(errorData.source);
        }
    }
    
    // Handle network restoration
    handleNetworkRestore() {
        this.showNetworkStatus('З\'єднання відновлено', 'success');
        this.processRetryQueue();
    }
    
    // Handle network loss
    handleNetworkLoss() {
        this.showNetworkStatus('Відсутнє з\'єднання з інтернетом', 'error');
        this.enableOfflineMode();
    }
    
    // Check connectivity
    async checkConnectivity() {
        try {
            const response = await fetch('/health', { 
                method: 'HEAD',
                cache: 'no-cache',
                timeout: 5000 
            });
            
            if (!response.ok) {
                this.handleConnectivityIssue();
            }
        } catch (error) {
            this.handleConnectivityIssue();
        }
    }
    
    // Handle high memory usage
    handleHighMemoryUsage(usedMB, limitMB) {
        console.warn(`🛡️ High memory usage: ${usedMB}MB / ${limitMB}MB`);
        
        // Clear unnecessary data
        this.clearCaches();
        
        // Warn user
        this.showMemoryWarning();
    }
    
    // Handle unresponsiveness
    handleUnresponsiveness(delay) {
        console.warn(`🛡️ Page unresponsive for ${delay}ms`);
        
        // Show loading indicator
        this.showUnresponsivenessIndicator();
        
        // Try to recover
        setTimeout(() => {
            this.hideUnresponsivenessIndicator();
        }, 3000);
    }
    
    // Show critical error dialog
    showCriticalErrorDialog(errorData) {
        const dialog = document.createElement('div');
        dialog.className = 'error-recovery-dialog';
        dialog.innerHTML = `
            <div class="error-dialog-backdrop">
                <div class="error-dialog-content">
                    <h2>⚠️ Виникла критична помилка</h2>
                    <p>Додаток зіткнувся з несподіваною помилкою. Ми намагаємося автоматично відновити роботу.</p>
                    <div class="error-actions">
                        <button class="btn-primary" onclick="window.location.reload()">
                            Перезавантажити
                        </button>
                        <button class="btn-secondary" onclick="this.closest('.error-recovery-dialog').remove()">
                            Продовжити
                        </button>
                    </div>
                    <details class="error-details">
                        <summary>Технічні деталі</summary>
                        <pre>${JSON.stringify(errorData, null, 2)}</pre>
                    </details>
                </div>
            </div>
        `;
        
        dialog.querySelector('.error-dialog-backdrop').style.cssText = `
            position: fixed; top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.8); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
        `;
        
        dialog.querySelector('.error-dialog-content').style.cssText = `
            background: #1a1a1a; color: white; padding: 2rem; border-radius: 8px;
            max-width: 500px; text-align: center; border: 1px solid #ff6b6b;
        `;
        
        document.body.appendChild(dialog);
        
        // Auto-remove after 30 seconds
        setTimeout(() => {
            if (dialog.parentNode) {
                dialog.remove();
            }
        }, 30000);
    }
    
    // Show network status
    showNetworkStatus(message, type = 'warning') {
        const indicator = document.createElement('div');
        indicator.className = `network-status-indicator ${type}`;
        indicator.textContent = message;
        
        indicator.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 9999;
            padding: 12px 16px; border-radius: 8px; color: white;
            background: ${type === 'success' ? '#4CAF50' : type === 'error' ? '#f44336' : '#ff9800'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(indicator);
        
        setTimeout(() => {
            indicator.remove();
        }, type === 'success' ? 3000 : 5000);
    }
    
    // Show memory warning
    showMemoryWarning() {
        const warning = document.createElement('div');
        warning.innerHTML = `
            <div style="position: fixed; bottom: 20px; right: 20px; z-index: 9999;
                        background: #ff9800; color: white; padding: 12px 16px; border-radius: 8px;
                        box-shadow: 0 4px 12px rgba(0,0,0,0.3); max-width: 300px;">
                <strong>⚠️ Висока витрата пам'яті</strong><br>
                Закрийте непотрібні вкладки браузера
            </div>
        `;
        
        document.body.appendChild(warning);
        
        setTimeout(() => {
            warning.remove();
        }, 8000);
    }
    
    // Clear caches and free memory
    clearCaches() {
        try {
            // Clear analysis cache
            if (window.analysisManager) {
                window.analysisManager.clearCache?.();
            }
            
            // Clear client cache
            if (window.clientManager) {
                window.clientManager.clearCache?.();
            }
            
            // Clear API cache
            if (window.apiClient) {
                window.apiClient.clearCache?.();
            }
            
            // Clear DOM cache
            this.clearDOMCache();
            
        } catch (error) {
            console.error('🛡️ Cache clearing failed:', error);
        }
    }
    
    // Clear DOM cache
    clearDOMCache() {
        // Remove unused DOM elements
        const unusedElements = document.querySelectorAll('[data-cache="true"]');
        unusedElements.forEach(el => el.remove());
        
        // Clear large text content
        const largeTexts = document.querySelectorAll('textarea, .large-content');
        largeTexts.forEach(el => {
            if (el.value?.length > 10000) {
                el.value = '';
            }
        });
    }
    
    // Should ignore specific errors
    shouldIgnoreError(reason) {
        const ignoredErrors = [
            'AbortError',
            'NetworkError when attempting to fetch resource',
            'Load failed',
            'Non-Error promise rejection captured'
        ];
        
        return ignoredErrors.some(ignored => 
            reason?.toString().includes(ignored)
        );
    }
    
    // Log error to server
    async logErrorToServer(errorData) {
        try {
            if (window.apiClient) {
                await window.apiClient.logClientError({
                    ...errorData,
                    recovery_attempted: true,
                    user_agent: navigator.userAgent,
                    url: window.location.href
                });
            }
        } catch (logError) {
            console.error('🛡️ Failed to log error to server:', logError);
        }
    }
    
    // Get error recovery stats
    getStats() {
        return {
            totalErrors: this.errorLog.length,
            recentErrors: this.errorLog.slice(-10),
            isRecovering: this.isRecovering,
            queueSize: this.retryQueue.length
        };
    }
}

// Initialize error recovery
if (typeof window !== 'undefined') {
    window.errorRecovery = new ErrorRecoveryManager();
    console.log('🛡️ Error recovery system activated');
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ErrorRecoveryManager;
}