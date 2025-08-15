/**
 * ButtonManager - SOLID compliant universal button management system
 * Single Responsibility: Manages only button events and states
 * Open/Closed: Extensible for new button types without modification
 * Liskov Substitution: All buttons follow same interface
 * Interface Segregation: Separate button types for different functionality
 * Dependency Inversion: Depends on abstractions, not concrete implementations
 */

class ButtonManager {
    constructor() {
        this.buttons = new Map();
        this.eventHandlers = new Map();
        this.isDestroyed = false;
        
        console.log('🔘 ButtonManager initialized');
    }
    
    // Single Responsibility: Register a button with its handler
    register(selector, handler, options = {}) {
        if (this.isDestroyed) {
            console.warn('🔘 ButtonManager is destroyed, cannot register buttons');
            return;
        }
        
        const config = {
            selector,
            handler,
            preventDefault: options.preventDefault !== false,
            stopPropagation: options.stopPropagation !== false,
            once: options.once || false,
            debounce: options.debounce || 0,
            enabled: options.enabled !== false,
            description: options.description || selector
        };
        
        this.buttons.set(selector, config);
        this.bindButton(config);
        
        console.log(`🔘 Button registered: ${config.description}`);
    }
    
    // Single Responsibility: Bind event to a specific button
    bindButton(config) {
        const element = document.querySelector(config.selector);
        if (!element) {
            console.warn(`🔘 Element not found: ${config.selector}`);
            return;
        }
        
        // Remove existing handler if any
        this.unbindButton(config.selector);
        
        // Create wrapped handler
        let wrappedHandler = (e) => {
            if (!config.enabled) {
                console.log(`🔘 Button disabled: ${config.description}`);
                return;
            }
            
            if (config.preventDefault) e.preventDefault();
            if (config.stopPropagation) e.stopPropagation();
            
            console.log(`🔘 Button clicked: ${config.description}`);
            
            try {
                config.handler(e, element);
            } catch (error) {
                console.error(`🔘 Button handler error: ${config.description}`, error);
            }
        };
        
        // Add debouncing if specified
        if (config.debounce > 0) {
            wrappedHandler = this.debounce(wrappedHandler, config.debounce);
        }
        
        // Store handler for cleanup
        this.eventHandlers.set(config.selector, wrappedHandler);
        
        // Bind event
        const eventType = config.once ? 'click' : 'click';
        element.addEventListener(eventType, wrappedHandler, { once: config.once });
        
        console.log(`🔘 Event bound: ${config.description}`);
    }
    
    // Single Responsibility: Unbind event from a specific button
    unbindButton(selector) {
        const handler = this.eventHandlers.get(selector);
        if (handler) {
            const element = document.querySelector(selector);
            if (element) {
                element.removeEventListener('click', handler);
            }
            this.eventHandlers.delete(selector);
        }
    }
    
    // Single Responsibility: Enable/disable a button
    setEnabled(selector, enabled) {
        const config = this.buttons.get(selector);
        if (config) {
            config.enabled = enabled;
            
            const element = document.querySelector(selector);
            if (element) {
                element.disabled = !enabled;
                element.classList.toggle('disabled', !enabled);
            }
            
            console.log(`🔘 Button ${enabled ? 'enabled' : 'disabled'}: ${config.description}`);
        }
    }
    
    // Single Responsibility: Trigger a button programmatically
    trigger(selector) {
        const config = this.buttons.get(selector);
        if (config && config.enabled) {
            console.log(`🔘 Button triggered programmatically: ${config.description}`);
            const element = document.querySelector(selector);
            if (element) {
                config.handler(new Event('click'), element);
            }
        }
    }
    
    // Single Responsibility: Rebind all buttons (useful after DOM changes)
    rebindAll() {
        console.log('🔘 Rebinding all buttons...');
        this.buttons.forEach(config => {
            this.bindButton(config);
        });
    }
    
    // Single Responsibility: Debounce utility
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
    
    // Single Responsibility: Get button state
    getButtonState(selector) {
        const config = this.buttons.get(selector);
        return config ? {
            selector: config.selector,
            enabled: config.enabled,
            description: config.description,
            exists: !!document.querySelector(selector)
        } : null;
    }
    
    // Single Responsibility: Get all button states
    getAllStates() {
        const states = {};
        this.buttons.forEach((config, selector) => {
            states[selector] = this.getButtonState(selector);
        });
        return states;
    }
    
    // Single Responsibility: Destroy manager and cleanup
    destroy() {
        console.log('🔘 Destroying ButtonManager...');
        
        // Unbind all events
        this.eventHandlers.forEach((handler, selector) => {
            this.unbindButton(selector);
        });
        
        // Clear all data
        this.buttons.clear();
        this.eventHandlers.clear();
        this.isDestroyed = true;
        
        console.log('🔘 ButtonManager destroyed');
    }
}

// Export for global use
window.ButtonManager = ButtonManager;
console.log('🔘 ButtonManager class loaded');