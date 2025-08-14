// DOM Utilities and Element Management
export const DOMUtils = {
    // Shorthand selectors
    $: (sel) => document.querySelector(sel),
    $$: (sel) => Array.from(document.querySelectorAll(sel)),

    // Element cache
    elements: {},

    // Initialize element cache
    initElements() {
        this.elements = {
            // Layout
            sidebarLeft: this.$('#sidebar-left'),
            sidebarRight: this.$('#sidebar-right'),
            mainContent: this.$('#main-content'),
            sidebarRightToggle: this.$('#sidebar-right-toggle'),
            mobileMenuToggle: this.$('#mobile-menu-toggle'),
            workspaceToggle: this.$('#workspace-toggle'),
            
            // Onboarding
            onboardingModal: this.$('#onboarding-modal'),
            onboardingClose: this.$('#onboarding-close'),
            onboardingProgress: this.$('#onboarding-progress'),
            progressText: this.$('#progress-text'),
            nextStep: this.$('#next-step'),
            prevStep: this.$('#prev-step'),
            skipOnboarding: this.$('#skip-onboarding'),

            // Client Management
            clientList: this.$('#client-list'),
            clientSearch: this.$('#client-search'),
            clientCount: this.$('#client-count'),
            newClientBtn: this.$('#new-client-btn'),
            welcomeNewClient: this.$('#welcome-new-client'),
            welcomeHelp: this.$('#welcome-help'),
            
            // Navigation
            navClientInfo: this.$('#nav-client-info'),
            navClientAvatar: this.$('#nav-client-avatar'),
            navClientName: this.$('#nav-client-name'),
            navClientSector: this.$('#nav-client-sector'),
            
            // Token Counter
            tokenCounter: this.$('#token-counter'),
            usedTokens: this.$('#used-tokens'),
            totalTokens: this.$('#total-tokens'),
            tokenProgressFill: this.$('#token-progress-fill'),
            workspaceUsedTokens: this.$('#workspace-used-tokens'),
            workspaceTotalTokens: this.$('#workspace-total-tokens'),
            workspaceTokenProgress: this.$('#workspace-token-progress'),
            workspaceTokenPercentage: this.$('#workspace-token-percentage'),
            
            // Tabs & Content
            welcomeScreen: this.$('#welcome-screen'),
            clientForm: this.$('#client-form'),
            analysisDashboard: this.$('#analysis-dashboard'),
            
            // Client Form
            clientFormTitle: this.$('#client-form-title'),
            saveClientBtn: this.$('#save-client-btn'),
            cancelClientBtn: this.$('#cancel-client-btn'),
            
            // Analysis
            textMethod: this.$('#text-method'),
            fileMethod: this.$('#file-method'),
            textInputContent: this.$('#text-input-content'),
            fileInputContent: this.$('#file-input-content'),
            negotiationText: this.$('#negotiation-text'),
            startAnalysisBtn: this.$('#start-analysis-btn'),
            resultsSection: this.$('#results-section'),
            
            // Results
            manipulationsCount: this.$('#manipulations-count'),
            biasesCount: this.$('#biases-count'),
            fallaciesCount: this.$('#fallacies-count'),
            recommendationsCount: this.$('#recommendations-count'),
            barometerScore: this.$('#barometer-score'),
            barometerLabel: this.$('#barometer-label'),
            barometerComment: this.$('#barometer-comment'),
            gaugeCircle: this.$('#gauge-circle'),
            
            // Highlights
            highlightsList: this.$('#highlights-list'),
            fulltextContent: this.$('#fulltext-content'),
            filtersPanel: this.$('#filters-panel'),
            listView: this.$('#list-view'),
            textView: this.$('#text-view'),
            filterView: this.$('#filter-view'),
            
            // Analysis History
            analysisHistory: this.$('#analysis-history'),
            analysisCount: this.$('#analysis-count'),
            
            // Workspace
            selectedFragments: this.$('#selected-fragments'),
            fragmentsCount: this.$('#fragments-count'),
            getAdviceBtn: this.$('#get-advice-btn'),
            clearWorkspaceBtn: this.$('#clear-workspace-btn'),
            exportSelectedBtn: this.$('#export-selected-btn'),
            workspaceClientInfo: this.$('#workspace-client-info'),
            recommendationsHistory: this.$('#recommendations-history'),
            
            // Product Switcher
            productDropdownBtn: this.$('#product-dropdown-btn'),
            productDropdown: this.$('#product-dropdown')
        };
        
        console.log('📋 DOM elements initialized');
        return this.elements;
    },

    // Reinitialize elements (useful after dynamic content changes)
    reinitElements() {
        return this.initElements();
    },

    // Utility methods
    addClass(element, className) {
        if (element) element.classList.add(className);
    },

    removeClass(element, className) {
        if (element) element.classList.remove(className);
    },

    toggleClass(element, className) {
        if (element) element.classList.toggle(className);
    },

    show(element) {
        if (element) element.style.display = '';
    },

    hide(element) {
        if (element) element.style.display = 'none';
    },

    // Create notification toast
    createNotification(message, type = 'info', duration = 5000) {
        const container = this.$('#notifications') || document.body;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove
        setTimeout(() => {
            notification.remove();
        }, duration);
        
        // Manual close
        notification.querySelector('.notification-close').onclick = () => {
            notification.remove();
        };
        
        return notification;
    },

    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    },

    // Escape HTML for safe injection
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};