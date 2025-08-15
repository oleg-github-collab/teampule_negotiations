/**
 * ModalManager - SOLID compliant modal management system
 * Single Responsibility: Manages only modal operations
 * Open/Closed: Extensible for new modal types
 * Liskov Substitution: All modals follow same interface
 * Interface Segregation: Separate concerns for different modal types
 * Dependency Inversion: Depends on ButtonManager abstraction
 */

class ModalManager {
    constructor(buttonManager) {
        this.buttonManager = buttonManager;
        this.modals = new Map();
        this.currentModal = null;
        this.zIndexCounter = 10000;
        
        console.log('🪟 ModalManager initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize modal manager
    init() {
        this.registerGlobalHandlers();
        this.discoverModals();
        console.log('🪟 ModalManager ready');
    }
    
    // Single Responsibility: Register global modal handlers
    registerGlobalHandlers() {
        // ESC key to close modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.currentModal) {
                this.closeModal(this.currentModal.id);
            }
        });
        
        // Click outside to close modals
        document.addEventListener('click', (e) => {
            if (this.currentModal && e.target.classList.contains('modal')) {
                this.closeModal(this.currentModal.id);
            }
        });
        
        console.log('🪟 Global modal handlers registered');
    }
    
    // Single Responsibility: Discover existing modals in DOM
    discoverModals() {
        const modalElements = document.querySelectorAll('.modal, [id$="-modal"]');
        modalElements.forEach(element => {
            this.registerModal(element.id, {
                element: element,
                type: 'standard'
            });
        });
        
        console.log(`🪟 Discovered ${modalElements.length} modals`);
    }
    
    // Single Responsibility: Register a modal
    registerModal(id, config) {
        const modalConfig = {
            id,
            element: config.element || document.getElementById(id),
            type: config.type || 'standard',
            closable: config.closable !== false,
            backdrop: config.backdrop !== false,
            keyboard: config.keyboard !== false,
            onShow: config.onShow || null,
            onHide: config.onHide || null,
            ...config
        };
        
        this.modals.set(id, modalConfig);
        this.bindModalButtons(modalConfig);
        
        console.log(`🪟 Modal registered: ${id}`);
    }
    
    // Single Responsibility: Bind modal-specific buttons
    bindModalButtons(config) {
        if (!config.element) return;
        
        // Close buttons
        const closeButtons = config.element.querySelectorAll('.modal-close, [data-action="close-modal"]');
        closeButtons.forEach(btn => {
            if (!btn.hasAttribute('data-modal-handler-bound')) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.closeModal(config.id);
                });
                btn.setAttribute('data-modal-handler-bound', 'true');
            }
        });
        
        // Action buttons
        const actionButtons = config.element.querySelectorAll('[data-action]');
        actionButtons.forEach(btn => {
            const action = btn.getAttribute('data-action');
            if (action && action !== 'close-modal' && !btn.hasAttribute('data-modal-handler-bound')) {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.handleModalAction(config.id, action, e, btn);
                });
                btn.setAttribute('data-modal-handler-bound', 'true');
            }
        });
    }
    
    // Single Responsibility: Show a modal
    showModal(id, data = null) {
        const config = this.modals.get(id);
        if (!config) {
            console.error(`🪟 Modal not found: ${id}`);
            return false;
        }
        
        if (!config.element) {
            console.error(`🪟 Modal element not found: ${id}`);
            return false;
        }
        
        console.log(`🪟 Showing modal: ${id}`);
        
        // Close current modal if exists
        if (this.currentModal && this.currentModal.id !== id) {
            this.closeModal(this.currentModal.id);
        }
        
        // Set current modal
        this.currentModal = config;
        
        // Update z-index
        config.element.style.zIndex = this.zIndexCounter++;
        
        // Show modal
        config.element.style.display = 'flex';
        config.element.classList.add('modal-open');
        
        // Add body class
        document.body.classList.add('modal-open');
        
        // Call onShow callback
        if (config.onShow) {
            try {
                config.onShow(data);
            } catch (error) {
                console.error(`🪟 Modal onShow error: ${id}`, error);
            }
        }
        
        // Focus management
        this.setModalFocus(config);
        
        return true;
    }
    
    // Single Responsibility: Close a modal
    closeModal(id) {
        const config = this.modals.get(id);
        if (!config) {
            console.error(`🪟 Modal not found: ${id}`);
            return false;
        }
        
        if (!config.element || config.element.style.display === 'none') {
            return false; // Already closed
        }
        
        console.log(`🪟 Closing modal: ${id}`);
        
        // Call onHide callback
        if (config.onHide) {
            try {
                config.onHide();
            } catch (error) {
                console.error(`🪟 Modal onHide error: ${id}`, error);
            }
        }
        
        // Hide modal
        config.element.style.display = 'none';
        config.element.classList.remove('modal-open');
        
        // Clear current modal
        if (this.currentModal?.id === id) {
            this.currentModal = null;
        }
        
        // Remove body class if no other modals
        if (!this.hasOpenModals()) {
            document.body.classList.remove('modal-open');
        }
        
        return true;
    }
    
    // Single Responsibility: Toggle a modal
    toggleModal(id, data = null) {
        const config = this.modals.get(id);
        if (!config || !config.element) return false;
        
        if (config.element.style.display === 'none' || !config.element.style.display) {
            return this.showModal(id, data);
        } else {
            return this.closeModal(id);
        }
    }
    
    // Single Responsibility: Handle modal actions
    handleModalAction(modalId, action, event, button) {
        console.log(`🪟 Modal action: ${modalId} -> ${action}`);
        
        // Standard actions
        switch (action) {
            case 'close-modal':
                this.closeModal(modalId);
                break;
                
            case 'confirm':
                console.log(`🪟 Handling confirm action for ${modalId}`);
                this.handleConfirmAction(modalId, event, button);
                break;
                
            case 'cancel':
                this.closeModal(modalId);
                break;
                
            default:
                // Custom actions - dispatch event
                const customEvent = new CustomEvent('modalAction', {
                    detail: {
                        modalId,
                        action,
                        event,
                        button
                    }
                });
                window.dispatchEvent(customEvent);
                break;
        }
    }
    
    // Single Responsibility: Handle confirm actions - FIXED
    handleConfirmAction(modalId, event, button) {
        console.log(`🪟 handleConfirmAction called for ${modalId}`);
        const config = this.modals.get(modalId);
        if (!config) {
            console.error(`🪟 Config not found for modal ${modalId}`);
            return;
        }
        
        // Close modal first
        this.closeModal(modalId);
        
        // Execute onConfirm callback immediately
        if (config.onConfirm) {
            console.log(`🪟 Executing onConfirm callback for ${modalId}`);
            try {
                config.onConfirm();
            } catch (error) {
                console.error(`🪟 Error in onConfirm callback:`, error);
            }
        }
        
        // Also dispatch event for legacy compatibility
        const confirmEvent = new CustomEvent('modalConfirm', {
            detail: {
                modalId,
                event,
                button
            }
        });
        
        window.dispatchEvent(confirmEvent);
    }
    
    // Single Responsibility: Set modal focus
    setModalFocus(config) {
        // Focus first focusable element
        const focusableElements = config.element.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length > 0) {
            focusableElements[0].focus();
        }
    }
    
    // Single Responsibility: Check if any modals are open
    hasOpenModals() {
        for (let [id, config] of this.modals) {
            if (config.element && config.element.style.display !== 'none') {
                return true;
            }
        }
        return false;
    }
    
    // Single Responsibility: Create dynamic modal
    createModal(id, options = {}) {
        const modalHTML = this.generateModalHTML(id, options);
        
        // Insert into DOM
        const container = document.body;
        container.insertAdjacentHTML('beforeend', modalHTML);
        
        // Register the modal
        this.registerModal(id, {
            element: document.getElementById(id),
            type: 'dynamic',
            ...options
        });
        
        console.log(`🪟 Dynamic modal created: ${id}`);
        return id;
    }
    
    // Single Responsibility: Generate modal HTML
    generateModalHTML(id, options) {
        const {
            title = 'Modal',
            content = '',
            buttons = [],
            size = 'medium',
            closable = true
        } = options;
        
        const sizeClass = `modal-${size}`;
        const closeButton = closable ? '<button class="modal-close">&times;</button>' : '';
        
        const buttonsHTML = buttons.map(btn => 
            `<button class="btn btn-${btn.type || 'secondary'}" data-action="${btn.action || 'close'}">${btn.text}</button>`
        ).join('');
        
        return `
            <div id="${id}" class="modal ${sizeClass}" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        ${closeButton}
                    </div>
                    <div class="modal-body">
                        ${content}
                    </div>
                    ${buttonsHTML ? `<div class="modal-footer">${buttonsHTML}</div>` : ''}
                </div>
            </div>
        `;
    }
    
    // Single Responsibility: Remove a modal
    removeModal(id) {
        const config = this.modals.get(id);
        if (!config) return false;
        
        // Close if open
        this.closeModal(id);
        
        // Remove from DOM if dynamic
        if (config.type === 'dynamic' && config.element) {
            config.element.remove();
        }
        
        // Remove from registry
        this.modals.delete(id);
        
        console.log(`🪟 Modal removed: ${id}`);
        return true;
    }
    
    // Interface Segregation: Convenience methods for specific modal types
    
    // Show confirmation dialog
    showConfirmDialog(options = {}) {
        const id = 'confirm-dialog-' + Date.now();
        
        this.createModal(id, {
            title: options.title || 'Підтвердження',
            content: `<p>${options.message || 'Ви впевнені?'}</p>`,
            buttons: [
                { text: 'Скасувати', action: 'cancel', type: 'secondary' },
                { text: options.confirmText || 'Підтвердити', action: 'confirm', type: 'primary' }
            ],
            size: 'small',
            onConfirm: options.onConfirm,
            onCancel: options.onCancel
        });
        
        // Handle confirm/cancel
        const handleAction = (e) => {
            if (e.detail.modalId === id) {
                if (e.detail.action === 'confirm' && options.onConfirm) {
                    options.onConfirm();
                } else if (e.detail.action === 'cancel' && options.onCancel) {
                    options.onCancel();
                }
                this.removeModal(id);
                window.removeEventListener('modalAction', handleAction);
            }
        };
        
        window.addEventListener('modalAction', handleAction);
        
        this.showModal(id);
        return id;
    }
    
    // Show alert dialog
    showAlert(message, title = 'Повідомлення') {
        const id = 'alert-dialog-' + Date.now();
        
        this.createModal(id, {
            title,
            content: `<p>${message}</p>`,
            buttons: [
                { text: 'OK', action: 'close', type: 'primary' }
            ],
            size: 'small'
        });
        
        this.showModal(id);
        
        // Auto-remove after closing
        setTimeout(() => {
            if (this.modals.has(id)) {
                this.removeModal(id);
            }
        }, 100);
        
        return id;
    }
    
    // Show loading modal
    showLoadingModal(message = 'Завантаження...') {
        const id = 'loading-modal';
        
        if (!this.modals.has(id)) {
            this.createModal(id, {
                title: '',
                content: `
                    <div class="loading-content">
                        <div class="loading-spinner"></div>
                        <p>${message}</p>
                    </div>
                `,
                buttons: [],
                size: 'small',
                closable: false,
                backdrop: false,
                keyboard: false
            });
        }
        
        this.showModal(id);
        return id;
    }
    
    // Hide loading modal
    hideLoadingModal() {
        this.closeModal('loading-modal');
    }
    
    // Interface Segregation: Public API
    getCurrentModal() {
        return this.currentModal;
    }
    
    getModal(id) {
        return this.modals.get(id);
    }
    
    getAllModals() {
        return Array.from(this.modals.keys());
    }
    
    isModalOpen(id) {
        const config = this.modals.get(id);
        return config && config.element && config.element.style.display !== 'none';
    }
    
    closeAllModals() {
        console.log('🪟 Closing all modals');
        this.modals.forEach((config, id) => {
            this.closeModal(id);
        });
    }
    
    destroy() {
        console.log('🪟 Destroying ModalManager...');
        this.closeAllModals();
        this.modals.clear();
        this.currentModal = null;
        document.body.classList.remove('modal-open');
    }
}

// Export for global use
window.ModalManager = ModalManager;
console.log('🪟 ModalManager class loaded');