// TeamPulse Turbo - Modular Enhanced Frontend
import { AppState } from './modules/state.js';
import { DOMUtils, ui } from './modules/ui.js';
import { api } from './modules/api.js';
import { analysisManager } from './modules/analysis.js';

class TeamPulseApp {
    constructor() {
        this.eventHandlers = new Map();
        this.initialized = false;
    }

    // Initialize the application
    async init() {
        if (this.initialized) return;

        console.log('🚀 TeamPulse Turbo - Modular Version Starting...');
        
        try {
            // Load saved state
            AppState.load();
            
            // Initialize DOM elements
            DOMUtils.initElements();
            
            // Setup event handlers
            this.setupEventHandlers();
            
            // Load initial data
            await this.loadInitialData();
            
            // Initialize UI state
            this.initializeUI();
            
            this.initialized = true;
            console.log('✅ TeamPulse Turbo initialized successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error);
            ui.showNotification('Помилка ініціалізації додатка', 'error');
        }
    }

    // Setup all event handlers
    setupEventHandlers() {
        // Centralized event delegation
        document.addEventListener('click', this.handleClick.bind(this));
        document.addEventListener('submit', this.handleSubmit.bind(this));
        document.addEventListener('input', this.handleInput.bind(this));
        
        // Keyboard shortcuts
        document.addEventListener('keydown', this.handleKeydown.bind(this));
        
        // Mobile menu and sidebar handlers
        this.bindSidebarEvents();
        
        // File upload handlers
        this.bindFileHandlers();
        
        // Window events
        window.addEventListener('resize', this.handleResize.bind(this));
        window.addEventListener('beforeunload', this.handleBeforeUnload.bind(this));
        
        console.log('🔗 Event handlers setup complete');
    }

    // Handle all click events through delegation
    handleClick(e) {
        const target = e.target.closest('[data-action]');
        if (!target) return;

        const action = target.dataset.action;
        const id = target.dataset.id;
        const category = target.dataset.category;

        // Prevent default for data-action elements
        e.preventDefault();
        e.stopPropagation();

        console.log(`🎯 Action: ${action}`, { id, category });

        // Route to appropriate handler
        switch (action) {
            case 'select-client':
                this.handleSelectClient(parseInt(id));
                break;
            case 'edit-client':
                this.handleEditClient(parseInt(id));
                break;
            case 'delete-client':
                this.handleDeleteClient(parseInt(id));
                break;
            case 'load-analysis':
                analysisManager.loadAnalysis(parseInt(id));
                break;
            case 'delete-analysis':
                this.handleDeleteAnalysis(parseInt(id));
                break;
            case 'duplicate-analysis':
                this.handleDuplicateAnalysis(parseInt(id));
                break;
            case 'show-counter-modal':
                this.handleShowCounterModal(category);
                break;
            case 'close-modal':
                ui.closeModal();
                break;
            case 'add-to-workspace':
                this.handleAddToWorkspace(parseInt(id));
                break;
            case 'remove-from-workspace':
                this.handleRemoveFromWorkspace(id);
                break;
            case 'clear-workspace':
                this.handleClearWorkspace();
                break;
            default:
                console.warn('Unknown action:', action);
        }
    }

    // Handle form submissions
    handleSubmit(e) {
        const form = e.target;
        
        if (form.id === 'login-form') {
            e.preventDefault();
            this.handleLogin(form);
        } else if (form.closest('#client-form')) {
            e.preventDefault();
            this.handleSaveClient(form);
        }
    }

    // Handle input events
    handleInput(e) {
        const input = e.target;
        
        if (input.id === 'client-search') {
            this.debounce(() => this.renderClientsList(), 300)();
        } else if (input.id === 'negotiation-text') {
            this.updateTextStats();
        }
    }

    // Handle keyboard shortcuts
    handleKeydown(e) {
        // Escape key
        if (e.key === 'Escape') {
            ui.closeModal();
            return;
        }

        // Ctrl/Cmd shortcuts
        if (e.ctrlKey || e.metaKey) {
            switch (e.key) {
                case 'k': // Ctrl+K for search
                    e.preventDefault();
                    DOMUtils.elements.clientSearch?.focus();
                    break;
                case 'Enter': // Ctrl+Enter for analysis
                    e.preventDefault();
                    if (DOMUtils.elements.startAnalysisBtn && !DOMUtils.elements.startAnalysisBtn.disabled) {
                        this.startAnalysis();
                    }
                    break;
            }
        }
    }

    // Bind sidebar and mobile events
    bindSidebarEvents() {
        // Mobile menu toggle
        DOMUtils.elements.mobileMenuToggle?.addEventListener('click', () => {
            ui.toggleMobileMenu();
        });

        // Sidebar toggles
        DOMUtils.elements.sidebarRightToggle?.addEventListener('click', () => {
            ui.toggleSidebar('right');
        });
        
        DOMUtils.elements.workspaceToggle?.addEventListener('click', () => {
            ui.toggleSidebar('right');
        });

        // Close mobile menu on outside click
        document.addEventListener('click', (e) => {
            if (document.body.classList.contains('mobile-menu-open')) {
                if (!e.target.closest('.sidebar-left')) {
                    ui.toggleMobileMenu();
                }
            }
        });
    }

    // Bind file upload handlers
    bindFileHandlers() {
        const fileInput = DOMUtils.$('#file-input');
        const dropzone = DOMUtils.$('#file-dropzone');

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files[0]);
            });
        }

        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('dragover');
            });

            dropzone.addEventListener('dragleave', () => {
                dropzone.classList.remove('dragover');
            });

            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('dragover');
                const file = e.dataTransfer.files[0];
                if (file) this.handleFileUpload(file);
            });
        }
    }

    // Load initial application data
    async loadInitialData() {
        try {
            // Load clients
            const clientsResponse = await api.getClients();
            if (clientsResponse.success) {
                AppState.set('clients', clientsResponse.clients || []);
                this.renderClientsList();
            }

            // Auto-select last client if exists
            const savedState = AppState.get();
            if (savedState.currentClient) {
                const client = savedState.clients.find(c => c.id === savedState.currentClient.id);
                if (client) {
                    AppState.set('currentClient', client);
                    this.updateWorkspaceClientInfo(client);
                    await this.loadAnalysisHistory(client.id);
                }
            }

        } catch (error) {
            console.error('Failed to load initial data:', error);
            ui.showNotification('Помилка завантаження даних', 'error');
        }
    }

    // Initialize UI state
    initializeUI() {
        const uiState = AppState.get('ui');
        
        // Set initial view
        ui.showView(uiState.currentView || 'welcome');
        
        // Set input method
        ui.switchInputMethod('text');
        
        // Set highlights view
        ui.switchHighlightsView(uiState.highlightsView || 'list');
        
        // Update counters
        ui.updateCounters({
            clients: AppState.get('clients')?.length || 0,
            analyses: AppState.get('analyses')?.length || 0
        });
        
        // Update token usage
        const tokenUsage = AppState.get('tokenUsage');
        ui.updateTokenUsage(tokenUsage.used, tokenUsage.total);
    }

    // Client Management
    handleSelectClient(clientId) {
        const client = AppState.get('clients').find(c => c.id === clientId);
        if (client) {
            AppState.set('currentClient', client);
            this.updateWorkspaceClientInfo(client);
            this.loadAnalysisHistory(clientId);
            ui.showView('analysis-dashboard');
            ui.showNotification(`Обрано клієнта: ${client.company}`, 'success');
        }
    }

    handleEditClient(clientId) {
        const client = AppState.get('clients').find(c => c.id === clientId);
        if (client) {
            this.populateClientForm(client);
            ui.showView('client-form');
        }
    }

    async handleDeleteClient(clientId) {
        if (!confirm('Ви дійсно хочете видалити цього клієнта?')) return;

        try {
            await api.deleteClient(clientId);
            
            // Remove from state
            const clients = AppState.get('clients').filter(c => c.id !== clientId);
            AppState.set('clients', clients);
            
            // Update current client if it was deleted
            if (AppState.get('currentClient')?.id === clientId) {
                AppState.set('currentClient', null);
                this.updateWorkspaceClientInfo(null);
            }
            
            this.renderClientsList();
            ui.showNotification('Клієнта видалено', 'success');
            
        } catch (error) {
            console.error('Delete client failed:', error);
            ui.showNotification('Помилка видалення клієнта', 'error');
        }
    }

    // Analysis Management
    async startAnalysis() {
        const text = DOMUtils.elements.negotiationText?.value?.trim();
        const client = AppState.get('currentClient');

        if (!text) {
            ui.showNotification('Введіть текст для аналізу', 'warning');
            return;
        }

        if (!client) {
            ui.showNotification('Оберіть клієнта', 'warning');
            return;
        }

        await analysisManager.startAnalysis(text, client.id);
    }

    async loadAnalysisHistory(clientId) {
        try {
            const response = await api.getAnalysisHistory(clientId);
            if (response.success) {
                AppState.set('analyses', response.analyses || []);
                this.renderAnalysisHistory(response.analyses || []);
            }
        } catch (error) {
            console.error('Failed to load analysis history:', error);
        }
    }

    handleDeleteAnalysis(analysisId) {
        if (!confirm('Видалити цей аналіз?')) return;
        // Implementation would be similar to delete client
    }

    handleDuplicateAnalysis(analysisId) {
        const analysis = AppState.get('analyses').find(a => a.id === analysisId);
        if (analysis && analysis.original_text) {
            DOMUtils.elements.negotiationText.value = analysis.original_text;
            this.updateTextStats();
            ui.switchInputMethod('text');
            ui.showNotification('Текст скопійовано для нового аналізу', 'success');
        }
    }

    // Workspace Management
    handleAddToWorkspace(highlightId) {
        const highlights = AppState.get('currentAnalysis')?.highlights;
        if (!highlights || !highlights[highlightId]) return;

        const fragment = highlights[highlightId];
        const selectedFragments = AppState.get('selectedFragments') || [];
        
        // Avoid duplicates
        if (!selectedFragments.find(f => f.text === fragment.text)) {
            selectedFragments.push({ ...fragment, id: Date.now() });
            AppState.set('selectedFragments', selectedFragments);
            this.updateWorkspaceFragments();
            ui.showNotification('Додано до робочої області', 'success');
        }
    }

    handleRemoveFromWorkspace(fragmentId) {
        const selectedFragments = AppState.get('selectedFragments').filter(f => f.id !== fragmentId);
        AppState.set('selectedFragments', selectedFragments);
        this.updateWorkspaceFragments();
    }

    handleClearWorkspace() {
        AppState.set('selectedFragments', []);
        this.updateWorkspaceFragments();
        ui.showNotification('Робочу область очищено', 'success');
    }

    // UI Update Methods
    renderClientsList() {
        // Implementation similar to original, but using modular components
    }

    renderAnalysisHistory(analyses) {
        // Implementation using new grouped history design
    }

    updateWorkspaceClientInfo(client) {
        // Update workspace with client info
    }

    updateWorkspaceFragments() {
        // Update workspace fragments display
    }

    updateTextStats() {
        const text = DOMUtils.elements.negotiationText?.value || '';
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const tokens = Math.ceil(chars / 4);

        // Update stats display
        const charCount = DOMUtils.$('#char-count');
        const wordCount = DOMUtils.$('#word-count');
        const tokenCount = DOMUtils.$('#estimated-tokens');

        if (charCount) charCount.textContent = `${chars.toLocaleString()} символів`;
        if (wordCount) wordCount.textContent = `${words.toLocaleString()} слів`;
        if (tokenCount) tokenCount.textContent = `≈ ${tokens.toLocaleString()} токенів`;

        // Update analysis button state
        this.updateAnalysisButtonState();
    }

    updateAnalysisButtonState() {
        const text = DOMUtils.elements.negotiationText?.value || '';
        const client = AppState.get('currentClient');
        const canAnalyze = text.trim().length >= 20 && client;

        if (DOMUtils.elements.startAnalysisBtn) {
            DOMUtils.elements.startAnalysisBtn.disabled = !canAnalyze;
        }
    }

    // Utility Methods
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

    handleResize() {
        // Handle responsive changes
    }

    handleBeforeUnload() {
        // Save state before leaving
        AppState.save();
    }

    // File handling
    async handleFileUpload(file) {
        try {
            ui.showLoading();
            const response = await api.uploadFile(file);
            
            if (response.success && response.text) {
                DOMUtils.elements.negotiationText.value = response.text;
                this.updateTextStats();
                ui.switchInputMethod('text');
                ui.showNotification('Файл завантажено успішно', 'success');
            }
        } catch (error) {
            console.error('File upload failed:', error);
            ui.showNotification('Помилка завантаження файлу', 'error');
        } finally {
            ui.hideLoading();
        }
    }
}

// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    const app = new TeamPulseApp();
    app.init();
    
    // Make app available globally for debugging
    window.TeamPulseApp = app;
});