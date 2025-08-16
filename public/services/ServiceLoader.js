/**
 * ServiceLoader - Single Responsibility: Managing service initialization
 * Follows SOLID principles - only handles service loading and coordination
 */
class ServiceLoader {
    constructor() {
        this.services = new Map();
        this.loadingPromises = new Map();
        this.isInitialized = false;
        this.dependencyGraph = {
            AnalysisService: [],
            WorkspaceService: [],
            AdviceService: ['WorkspaceService'],
            NavigationService: []
        };
        
        console.log('⚡ ServiceLoader initialized');
    }
    
    // Single Responsibility: Initialize all services
    async init() {
        if (this.isInitialized) {
            console.warn('⚡ ServiceLoader already initialized');
            return this.services;
        }
        
        console.log('⚡ Starting service initialization...');
        const startTime = performance.now();
        
        try {
            // Load services in dependency order
            await this.loadServicesInOrder();
            
            // Wait for DOM to be ready
            if (document.readyState === 'loading') {
                await new Promise(resolve => {
                    document.addEventListener('DOMContentLoaded', resolve);
                });
            }
            
            // Initialize UI connections
            await this.connectServicesToUI();
            
            this.isInitialized = true;
            const loadTime = performance.now() - startTime;
            
            console.log(`⚡ All services initialized in ${Math.round(loadTime)}ms`);
            console.log('⚡ Available services:', Array.from(this.services.keys()));
            
            return this.services;
            
        } catch (error) {
            console.error('⚡ Service initialization failed:', error);
            throw error;
        }
    }
    
    // Single Responsibility: Load services in correct dependency order
    async loadServicesInOrder() {
        const loadOrder = this.calculateLoadOrder();
        
        for (const serviceName of loadOrder) {
            await this.loadService(serviceName);
        }
    }
    
    // Single Responsibility: Calculate service load order based on dependencies
    calculateLoadOrder() {
        const visited = new Set();
        const order = [];
        
        const visit = (serviceName) => {
            if (visited.has(serviceName)) return;
            visited.add(serviceName);
            
            const dependencies = this.dependencyGraph[serviceName] || [];
            for (const dep of dependencies) {
                visit(dep);
            }
            
            order.push(serviceName);
        };
        
        for (const serviceName of Object.keys(this.dependencyGraph)) {
            visit(serviceName);
        }
        
        return order;
    }
    
    // Single Responsibility: Load individual service
    async loadService(serviceName) {
        if (this.services.has(serviceName)) {
            return this.services.get(serviceName);
        }
        
        if (this.loadingPromises.has(serviceName)) {
            return this.loadingPromises.get(serviceName);
        }
        
        const loadPromise = this.createService(serviceName);
        this.loadingPromises.set(serviceName, loadPromise);
        
        try {
            const service = await loadPromise;
            this.services.set(serviceName, service);
            this.loadingPromises.delete(serviceName);
            
            console.log(`⚡ ${serviceName} loaded successfully`);
            return service;
            
        } catch (error) {
            this.loadingPromises.delete(serviceName);
            console.error(`⚡ Failed to load ${serviceName}:`, error);
            throw error;
        }
    }
    
    // Single Responsibility: Create service instance
    async createService(serviceName) {
        // Wait for dependencies
        const dependencies = this.dependencyGraph[serviceName] || [];
        for (const dep of dependencies) {
            await this.loadService(dep);
        }
        
        // Check if service class is available
        const ServiceClass = window[serviceName];
        if (!ServiceClass) {
            console.warn(`⚡ Service class ${serviceName} not found, skipping...`);
            return null;
        }
        
        // Create service instance
        const service = new ServiceClass();
        
        // Give service time to initialize
        if (service.init && typeof service.init === 'function') {
            await service.init();
        }
        
        return service;
    }
    
    // Single Responsibility: Connect services to UI elements
    async connectServicesToUI() {
        console.log('⚡ Connecting services to UI...');
        
        // Wait for critical UI elements
        await this.waitForElement('#analysis-section');
        
        // Ensure services are properly connected
        this.validateServiceConnections();
        
        // Setup global service access
        this.setupGlobalAccess();
        
        console.log('⚡ Services connected to UI');
    }
    
    // Single Responsibility: Wait for DOM element to exist
    waitForElement(selector, timeout = 5000) {
        return new Promise((resolve, reject) => {
            const element = document.querySelector(selector);
            if (element) {
                resolve(element);
                return;
            }
            
            const observer = new MutationObserver((mutations) => {
                const element = document.querySelector(selector);
                if (element) {
                    observer.disconnect();
                    resolve(element);
                }
            });
            
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
            
            setTimeout(() => {
                observer.disconnect();
                reject(new Error(`Element ${selector} not found within ${timeout}ms`));
            }, timeout);
        });
    }
    
    // Single Responsibility: Validate service connections
    validateServiceConnections() {
        const requiredConnections = {
            analysisService: ['startAnalysis', 'isAnalyzing'],
            workspaceService: ['addToWorkspace', 'workspace'],
            adviceService: ['getAdvice', 'isRequestingAdvice'],
            navigationService: ['applyFilters', 'setResults']
        };
        
        for (const [serviceName, methods] of Object.entries(requiredConnections)) {
            const service = window[serviceName];
            if (!service) {
                console.warn(`⚡ Service ${serviceName} not available globally`);
                continue;
            }
            
            for (const method of methods) {
                if (typeof service[method] === 'undefined') {
                    console.warn(`⚡ Service ${serviceName} missing ${method}`);
                }
            }
        }
    }
    
    // Single Responsibility: Setup global service access
    setupGlobalAccess() {
        // Create service registry
        window.services = {
            analysis: this.services.get('AnalysisService'),
            workspace: this.services.get('WorkspaceService'),
            advice: this.services.get('AdviceService'),
            navigation: this.services.get('NavigationService'),
            
            // Service loader methods
            get: (name) => this.services.get(name),
            has: (name) => this.services.has(name),
            getAll: () => Array.from(this.services.values()),
            reload: (name) => this.reloadService(name),
            status: () => this.getServiceStatus()
        };
        
        // Backward compatibility
        window.serviceLoader = this;
        
        console.log('⚡ Global service access configured');
    }
    
    // Single Responsibility: Get service
    getService(name) {
        return this.services.get(name) || null;
    }
    
    // Single Responsibility: Check if service is loaded
    hasService(name) {
        return this.services.has(name);
    }
    
    // Single Responsibility: Reload specific service
    async reloadService(serviceName) {
        console.log(`⚡ Reloading ${serviceName}...`);
        
        // Remove old service
        const oldService = this.services.get(serviceName);
        if (oldService && oldService.destroy) {
            try {
                oldService.destroy();
            } catch (error) {
                console.warn(`⚡ Error destroying ${serviceName}:`, error);
            }
        }
        
        this.services.delete(serviceName);
        
        // Load new service
        try {
            const newService = await this.loadService(serviceName);
            console.log(`⚡ ${serviceName} reloaded successfully`);
            return newService;
        } catch (error) {
            console.error(`⚡ Failed to reload ${serviceName}:`, error);
            throw error;
        }
    }
    
    // Single Responsibility: Get service status
    getServiceStatus() {
        const status = {
            total: Object.keys(this.dependencyGraph).length,
            loaded: this.services.size,
            loading: this.loadingPromises.size,
            initialized: this.isInitialized,
            services: {}
        };
        
        for (const serviceName of Object.keys(this.dependencyGraph)) {
            status.services[serviceName] = {
                loaded: this.services.has(serviceName),
                loading: this.loadingPromises.has(serviceName),
                instance: this.services.get(serviceName) || null
            };
        }
        
        return status;
    }
    
    // Single Responsibility: Destroy all services
    destroy() {
        console.log('⚡ Destroying all services...');
        
        for (const [name, service] of this.services) {
            if (service && service.destroy) {
                try {
                    service.destroy();
                    console.log(`⚡ ${name} destroyed`);
                } catch (error) {
                    console.warn(`⚡ Error destroying ${name}:`, error);
                }
            }
        }
        
        this.services.clear();
        this.loadingPromises.clear();
        this.isInitialized = false;
        
        // Clean up global references
        delete window.services;
        delete window.serviceLoader;
        
        console.log('⚡ All services destroyed');
    }
    
    // Single Responsibility: Handle service errors
    handleServiceError(serviceName, error) {
        console.error(`⚡ Service error in ${serviceName}:`, error);
        
        // Emit service error event
        window.dispatchEvent(new CustomEvent('serviceError', {
            detail: { serviceName, error }
        }));
        
        // Remove failed service
        this.services.delete(serviceName);
        this.loadingPromises.delete(serviceName);
    }
    
    // Single Responsibility: Wait for all services to be ready
    async waitForServices(serviceNames = null) {
        const targetServices = serviceNames || Object.keys(this.dependencyGraph);
        const promises = targetServices.map(name => this.loadService(name));
        
        try {
            await Promise.all(promises);
            console.log('⚡ All requested services are ready');
        } catch (error) {
            console.error('⚡ Some services failed to load:', error);
            throw error;
        }
    }
    
    // Single Responsibility: Create service performance monitor
    createPerformanceMonitor() {
        const monitor = {
            serviceMetrics: new Map(),
            
            startTimer: (serviceName, operation) => {
                const key = `${serviceName}.${operation}`;
                const startTime = performance.now();
                monitor.serviceMetrics.set(key, { startTime, operation });
            },
            
            endTimer: (serviceName, operation) => {
                const key = `${serviceName}.${operation}`;
                const metric = monitor.serviceMetrics.get(key);
                if (metric) {
                    const duration = performance.now() - metric.startTime;
                    console.log(`⚡ ${serviceName}.${operation}: ${Math.round(duration)}ms`);
                    monitor.serviceMetrics.delete(key);
                    return duration;
                }
                return 0;
            },
            
            getMetrics: () => Array.from(monitor.serviceMetrics.entries())
        };
        
        return monitor;
    }
}

// Auto-initialize service loader when script loads
window.serviceLoader = new ServiceLoader();

// Initialize services after a delay to allow main app to load first
setTimeout(() => {
    console.log('⚡ Starting delayed service initialization...');
    window.serviceLoader.init().catch(error => {
        console.error('⚡ Failed to initialize services:', error);
    });
}, 1000);

// Export for module use
window.ServiceLoader = ServiceLoader;