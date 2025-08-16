/**
 * NotificationService - Single Responsibility: Managing all notifications and modals
 * Follows SOLID principles - centralized notification system
 */
class NotificationService {
    constructor() {
        this.notifications = [];
        this.modals = [];
        
        console.log('🔔 NotificationService initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize notification service
    init() {
        this.setupGlobalMethods();
        this.createNotificationContainer();
        console.log('🔔 NotificationService ready');
    }
    
    // Single Responsibility: Setup global methods
    setupGlobalMethods() {
        window.notificationService = this;
        window.showNotification = (message, type, duration) => this.showNotification(message, type, duration);
        window.showConfirm = (message, onConfirm, onCancel) => this.showConfirm(message, onConfirm, onCancel);
        window.showAlert = (message, type) => this.showAlert(message, type);
        window.showPrompt = (message, defaultValue, onConfirm) => this.showPrompt(message, defaultValue, onConfirm);
        
        // Override native alert/confirm
        window.alert = (message) => this.showAlert(message, 'info');
        window.confirm = (message) => this.showConfirm(message);
    }
    
    // Single Responsibility: Create notification container
    createNotificationContainer() {
        if (document.getElementById('notification-container')) return;
        
        const container = document.createElement('div');
        container.id = 'notification-container';
        container.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    // Single Responsibility: Show notification
    showNotification(message, type = 'info', duration = 4000) {
        const notification = this.createNotification(message, type);
        const container = document.getElementById('notification-container');
        
        container.appendChild(notification);
        this.notifications.push(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
            notification.style.opacity = '1';
        }, 10);
        
        // Auto remove
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
        
        console.log(`🔔 Notification [${type}]:`, message);
    }
    
    // Single Responsibility: Create notification element
    createNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const colors = {
            success: '#4caf50',
            error: '#f44336',
            warning: '#ff9800',
            info: '#2196f3'
        };
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        notification.style.cssText = `
            background: ${colors[type] || colors.info};
            color: white;
            padding: 12px 16px;
            margin-bottom: 10px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: translateX(400px);
            opacity: 0;
            transition: all 0.3s ease;
            pointer-events: auto;
            cursor: pointer;
            max-width: 350px;
            word-wrap: break-word;
        `;
        
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 16px;">${icons[type] || icons.info}</span>
                <span style="flex: 1;">${this.escapeHtml(message)}</span>
                <button style="
                    background: none;
                    border: none;
                    color: white;
                    cursor: pointer;
                    padding: 0;
                    margin-left: 8px;
                    opacity: 0.7;
                    font-size: 18px;
                " onclick="event.stopPropagation(); this.parentElement.parentElement.click();">×</button>
            </div>
        `;
        
        notification.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        return notification;
    }
    
    // Single Responsibility: Remove notification
    removeNotification(notification) {
        notification.style.transform = 'translateX(400px)';
        notification.style.opacity = '0';
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
            const index = this.notifications.indexOf(notification);
            if (index > -1) {
                this.notifications.splice(index, 1);
            }
        }, 300);
    }
    
    // Single Responsibility: Show confirmation modal
    showConfirm(message, onConfirm = null, onCancel = null) {
        return new Promise((resolve) => {
            const modal = this.createConfirmModal(message, (result) => {
                this.closeModal(modal);
                if (result && onConfirm) onConfirm();
                if (!result && onCancel) onCancel();
                resolve(result);
            });
            
            document.body.appendChild(modal);
            this.modals.push(modal);
            this.showModal(modal);
        });
    }
    
    // Single Responsibility: Create confirmation modal
    createConfirmModal(message, callback) {
        const modal = document.createElement('div');
        modal.className = 'custom-modal confirm-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Підтвердження</h3>
                </div>
                <div class="modal-body">
                    <p style="margin: 0; line-height: 1.5;">${this.escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary cancel-btn">Скасувати</button>
                    <button class="btn-primary confirm-btn">Підтвердити</button>
                </div>
            </div>
        `;
        
        this.applyModalStyles(modal);
        
        // Event handlers
        modal.querySelector('.cancel-btn').addEventListener('click', () => callback(false));
        modal.querySelector('.confirm-btn').addEventListener('click', () => callback(true));
        modal.querySelector('.modal-overlay').addEventListener('click', () => callback(false));
        
        // Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                callback(false);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        return modal;
    }
    
    // Single Responsibility: Show alert modal
    showAlert(message, type = 'info') {
        return new Promise((resolve) => {
            const modal = this.createAlertModal(message, type, () => {
                this.closeModal(modal);
                resolve();
            });
            
            document.body.appendChild(modal);
            this.modals.push(modal);
            this.showModal(modal);
        });
    }
    
    // Single Responsibility: Create alert modal
    createAlertModal(message, type, callback) {
        const modal = document.createElement('div');
        modal.className = `custom-modal alert-modal alert-${type}`;
        
        const icons = {
            success: '✅',
            error: '❌',
            warning: '⚠️',
            info: 'ℹ️'
        };
        
        const titles = {
            success: 'Успішно',
            error: 'Помилка',
            warning: 'Попередження',
            info: 'Інформація'
        };
        
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>${icons[type] || icons.info} ${titles[type] || titles.info}</h3>
                </div>
                <div class="modal-body">
                    <p style="margin: 0; line-height: 1.5;">${this.escapeHtml(message)}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary ok-btn" style="min-width: 80px;">OK</button>
                </div>
            </div>
        `;
        
        this.applyModalStyles(modal);
        
        // Event handlers
        modal.querySelector('.ok-btn').addEventListener('click', callback);
        modal.querySelector('.modal-overlay').addEventListener('click', callback);
        
        // Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                callback();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
        
        // Focus OK button
        setTimeout(() => {
            modal.querySelector('.ok-btn').focus();
        }, 100);
        
        return modal;
    }
    
    // Single Responsibility: Show prompt modal
    showPrompt(message, defaultValue = '', onConfirm = null) {
        return new Promise((resolve) => {
            const modal = this.createPromptModal(message, defaultValue, (result) => {
                this.closeModal(modal);
                if (result !== null && onConfirm) onConfirm(result);
                resolve(result);
            });
            
            document.body.appendChild(modal);
            this.modals.push(modal);
            this.showModal(modal);
        });
    }
    
    // Single Responsibility: Create prompt modal
    createPromptModal(message, defaultValue, callback) {
        const modal = document.createElement('div');
        modal.className = 'custom-modal prompt-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content" style="max-width: 400px;">
                <div class="modal-header">
                    <h3>Введіть значення</h3>
                </div>
                <div class="modal-body">
                    <p style="margin: 0 0 10px 0; line-height: 1.5;">${this.escapeHtml(message)}</p>
                    <input type="text" class="prompt-input" value="${this.escapeHtml(defaultValue)}" 
                           style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary cancel-btn">Скасувати</button>
                    <button class="btn-primary confirm-btn">OK</button>
                </div>
            </div>
        `;
        
        this.applyModalStyles(modal);
        
        const input = modal.querySelector('.prompt-input');
        
        // Event handlers
        modal.querySelector('.cancel-btn').addEventListener('click', () => callback(null));
        modal.querySelector('.confirm-btn').addEventListener('click', () => callback(input.value));
        modal.querySelector('.modal-overlay').addEventListener('click', () => callback(null));
        
        // Enter key
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                callback(input.value);
            } else if (e.key === 'Escape') {
                callback(null);
            }
        });
        
        // Focus input
        setTimeout(() => {
            input.focus();
            input.select();
        }, 100);
        
        return modal;
    }
    
    // Single Responsibility: Apply modal styles
    applyModalStyles(modal) {
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10001;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const overlay = modal.querySelector('.modal-overlay');
        if (overlay) {
            overlay.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background: rgba(0, 0, 0, 0.7);
            `;
        }
        
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.cssText = `
                background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
                border: 2px solid #00ffff;
                border-radius: 12px;
                padding: 0;
                position: relative;
                transform: translateY(-30px);
                transition: transform 0.3s ease;
                box-shadow: 0 20px 40px rgba(0, 255, 255, 0.3);
                color: white;
                min-width: 300px;
                max-width: 90vw;
                max-height: 90vh;
                overflow: auto;
            `;
        }
        
        const header = modal.querySelector('.modal-header');
        if (header) {
            header.style.cssText = `
                padding: 20px 24px 16px;
                border-bottom: 1px solid rgba(0, 255, 255, 0.2);
                margin: 0;
            `;
            const h3 = header.querySelector('h3');
            if (h3) {
                h3.style.cssText = `
                    margin: 0;
                    color: #00ffff;
                    font-size: 18px;
                `;
            }
        }
        
        const body = modal.querySelector('.modal-body');
        if (body) {
            body.style.cssText = `
                padding: 20px 24px;
            `;
        }
        
        const footer = modal.querySelector('.modal-footer');
        if (footer) {
            footer.style.cssText = `
                padding: 16px 24px 20px;
                border-top: 1px solid rgba(0, 255, 255, 0.2);
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            `;
        }
        
        // Style buttons
        modal.querySelectorAll('.btn-primary, .btn-secondary').forEach(btn => {
            btn.style.cssText = `
                padding: 8px 16px;
                border: none;
                border-radius: 6px;
                cursor: pointer;
                font-weight: 500;
                transition: all 0.2s ease;
            `;
            
            if (btn.classList.contains('btn-primary')) {
                btn.style.background = 'linear-gradient(135deg, #00ffff, #0088cc)';
                btn.style.color = '#000';
            } else {
                btn.style.background = 'linear-gradient(135deg, #666, #444)';
                btn.style.color = '#fff';
            }
        });
    }
    
    // Single Responsibility: Show modal
    showModal(modal) {
        modal.style.opacity = '1';
        setTimeout(() => {
            const content = modal.querySelector('.modal-content');
            if (content) {
                content.style.transform = 'translateY(0)';
            }
        }, 10);
    }
    
    // Single Responsibility: Close modal
    closeModal(modal) {
        modal.style.opacity = '0';
        const content = modal.querySelector('.modal-content');
        if (content) {
            content.style.transform = 'translateY(-30px)';
        }
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
            const index = this.modals.indexOf(modal);
            if (index > -1) {
                this.modals.splice(index, 1);
            }
        }, 300);
    }
    
    // Single Responsibility: Close all modals
    closeAllModals() {
        [...this.modals].forEach(modal => this.closeModal(modal));
    }
    
    // Single Responsibility: Close all notifications
    closeAllNotifications() {
        [...this.notifications].forEach(notification => this.removeNotification(notification));
    }
    
    // Single Responsibility: Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        return String(text).replace(/[<>&"']/g, (char) => {
            const map = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&#x27;'
            };
            return map[char];
        });
    }
}

// Export for module use
window.NotificationService = NotificationService;