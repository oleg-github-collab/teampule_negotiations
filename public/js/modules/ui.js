// UI Management Module
import { DOMUtils } from './dom.js';
import { AppState } from './state.js';

export class UIManager {
    constructor() {
        this.elements = DOMUtils.elements;
    }

    // View Management
    showView(viewName) {
        const views = ['welcome-screen', 'client-form', 'analysis-dashboard'];
        
        views.forEach(view => {
            const element = this.elements[view.replace('-', '')] || DOMUtils.$(`#${view}`);
            if (element) {
                element.style.display = view === `${viewName}-screen` || view === viewName ? 'block' : 'none';
            }
        });

        AppState.set('ui', { ...AppState.get('ui'), currentView: viewName });
        console.log(`📱 Switched to view: ${viewName}`);
    }

    // Sidebar Management
    toggleSidebar(side) {
        if (side === 'left') {
            const collapsed = !AppState.get('ui').leftSidebarCollapsed;
            AppState.set('ui', { 
                ...AppState.get('ui'), 
                leftSidebarCollapsed: collapsed 
            });
            
            if (this.elements.sidebarLeft) {
                this.elements.sidebarLeft.classList.toggle('collapsed', collapsed);
            }
        } else if (side === 'right') {
            const collapsed = !AppState.get('ui').rightSidebarCollapsed;
            AppState.set('ui', { 
                ...AppState.get('ui'), 
                rightSidebarCollapsed: collapsed 
            });
            
            if (this.elements.sidebarRight) {
                this.elements.sidebarRight.classList.toggle('collapsed', collapsed);
                
                // Update toggle icon
                const icon = this.elements.sidebarRightToggle?.querySelector('i');
                if (icon) {
                    icon.className = collapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
                }
            }
        }
    }

    // Mobile Menu Management
    toggleMobileMenu() {
        const isActive = this.elements.sidebarLeft?.classList.contains('active') || false;
        
        if (isActive) {
            // Close mobile menu
            this.elements.sidebarLeft?.classList.remove('active');
            document.body.classList.remove('mobile-menu-open');
        } else {
            // Open mobile menu
            this.elements.sidebarLeft?.classList.add('active');
            document.body.classList.add('mobile-menu-open');
        }
        
        // Update mobile menu toggle icon
        const icon = this.elements.mobileMenuToggle?.querySelector('i');
        if (icon) {
            icon.className = isActive ? 'fas fa-bars' : 'fas fa-times';
        }
        
        console.log('📱 Mobile menu', isActive ? 'closed' : 'opened');
    }

    // Modal Management
    showModal(modalId) {
        const modal = DOMUtils.$(`#${modalId}`);
        if (modal) {
            modal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeModal(modalId = null) {
        if (modalId) {
            const modal = DOMUtils.$(`#${modalId}`);
            if (modal) {
                modal.style.display = 'none';
            }
        } else {
            // Close all modals
            const modals = DOMUtils.$$('.modal');
            modals.forEach(modal => {
                modal.style.display = 'none';
            });
        }
        document.body.style.overflow = '';
    }

    // Notification System
    showNotification(message, type = 'info', duration = 5000) {
        return DOMUtils.createNotification(message, type, duration);
    }

    // Loading States
    showLoading(element = null) {
        if (element) {
            element.classList.add('loading');
        } else {
            const overlay = DOMUtils.$('#loading-overlay');
            if (overlay) overlay.style.display = 'flex';
        }
    }

    hideLoading(element = null) {
        if (element) {
            element.classList.remove('loading');
        } else {
            const overlay = DOMUtils.$('#loading-overlay');
            if (overlay) overlay.style.display = 'none';
        }
    }

    // Progress Management
    updateProgress(percentage, label = '') {
        const progressFill = DOMUtils.$('#onboarding-progress');
        const progressText = DOMUtils.$('#progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${percentage}%`;
        }
        
        if (progressText && label) {
            progressText.textContent = label;
        }
    }

    // Counter Updates
    updateCounters(data) {
        const counters = {
            'manipulations-count': data.manipulations || 0,
            'biases-count': data.biases || 0,
            'fallacies-count': data.fallacies || 0,
            'recommendations-count': data.recommendations || 0,
            'client-count': data.clients || 0,
            'analysis-count': data.analyses || 0
        };

        Object.entries(counters).forEach(([id, count]) => {
            const element = DOMUtils.$(`#${id}`);
            if (element) {
                element.textContent = count;
            }
        });
    }

    // Token Usage Display
    updateTokenUsage(used, total) {
        const percentage = Math.round((used / total) * 100);
        
        AppState.set('tokenUsage', { used, total, percentage });
        
        // Update displays
        if (this.elements.usedTokens) {
            this.elements.usedTokens.textContent = used.toLocaleString();
        }
        if (this.elements.totalTokens) {
            this.elements.totalTokens.textContent = total.toLocaleString();
        }
        if (this.elements.tokenProgressFill) {
            this.elements.tokenProgressFill.style.width = `${percentage}%`;
        }
        
        // Update workspace display
        if (this.elements.workspaceUsedTokens) {
            this.elements.workspaceUsedTokens.textContent = used.toLocaleString();
        }
        if (this.elements.workspaceTotalTokens) {
            this.elements.workspaceTotalTokens.textContent = total.toLocaleString();
        }
        if (this.elements.workspaceTokenProgress) {
            this.elements.workspaceTokenProgress.style.width = `${percentage}%`;
        }
        if (this.elements.workspaceTokenPercentage) {
            this.elements.workspaceTokenPercentage.textContent = `${percentage}%`;
        }
    }

    // Input Method Switching
    switchInputMethod(method) {
        if (method === 'text') {
            this.elements.textMethod?.classList.add('active');
            this.elements.fileMethod?.classList.remove('active');
            if (this.elements.textInputContent) this.elements.textInputContent.style.display = 'block';
            if (this.elements.fileInputContent) this.elements.fileInputContent.style.display = 'none';
        } else if (method === 'file') {
            this.elements.textMethod?.classList.remove('active');
            this.elements.fileMethod?.classList.add('active');
            if (this.elements.textInputContent) this.elements.textInputContent.style.display = 'none';
            if (this.elements.fileInputContent) this.elements.fileInputContent.style.display = 'block';
        }
    }

    // Highlights View Management
    switchHighlightsView(view) {
        const views = ['list', 'text', 'filter'];
        
        views.forEach(v => {
            const button = DOMUtils.$(`#${v}-view`);
            const content = DOMUtils.$(`#${v === 'list' ? 'highlights-list' : v === 'text' ? 'fulltext-content' : 'filters-panel'}`);
            
            if (button) {
                button.classList.toggle('active', v === view);
            }
            
            if (content) {
                content.style.display = v === view ? 'block' : 'none';
            }
        });
        
        AppState.set('ui', { 
            ...AppState.get('ui'), 
            highlightsView: view 
        });
    }

    // Form Validation
    validateForm(formElement) {
        const inputs = formElement.querySelectorAll('input[required], select[required], textarea[required]');
        let isValid = true;
        
        inputs.forEach(input => {
            if (!input.value.trim()) {
                input.classList.add('error');
                isValid = false;
            } else {
                input.classList.remove('error');
            }
        });
        
        return isValid;
    }

    // Responsive Utilities
    isMobile() {
        return window.innerWidth <= 768;
    }

    isTablet() {
        return window.innerWidth > 768 && window.innerWidth <= 1024;
    }

    isDesktop() {
        return window.innerWidth > 1024;
    }
}

// Create singleton instance
export const ui = new UIManager();