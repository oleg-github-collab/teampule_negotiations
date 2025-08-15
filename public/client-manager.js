/**
 * ClientManager - SOLID compliant client management system
 * Single Responsibility: Manages only client-related operations
 * Open/Closed: Extensible for new client operations
 * Liskov Substitution: All client operations follow same interface
 * Interface Segregation: Separate concerns for CRUD operations
 * Dependency Inversion: Depends on ButtonManager and API abstractions
 */

class ClientManager {
    constructor(buttonManager, apiClient) {
        this.buttonManager = buttonManager;
        this.apiClient = apiClient;
        this.clients = [];
        this.currentClient = null;
        this.isInitialized = false;
        
        console.log('👥 ClientManager initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize client manager
    init() {
        this.registerButtons();
        this.loadClients();
        this.isInitialized = true;
        console.log('👥 ClientManager ready');
    }
    
    // Single Responsibility: Register all client-related buttons
    registerButtons() {
        // New client button
        this.buttonManager.register('#new-client-btn', () => {
            this.showClientForm();
        }, { description: 'New Client Button' });
        
        // Welcome new client button
        this.buttonManager.register('#welcome-new-client', () => {
            this.showClientForm();
        }, { description: 'Welcome New Client Button' });
        
        // Save client button
        this.buttonManager.register('#save-client-btn', () => {
            this.saveClient();
        }, { description: 'Save Client Button' });
        
        // Cancel client button
        this.buttonManager.register('#cancel-client-btn', () => {
            this.cancelClientForm();
        }, { description: 'Cancel Client Button' });
        
        console.log('👥 Client buttons registered');
    }
    
    // Single Responsibility: Show client form
    showClientForm(clientId = null) {
        console.log('👥 Showing client form', clientId ? `for client ${clientId}` : 'for new client');
        
        // Hide other sections
        this.hideAllSections();
        
        // Show client form
        const form = document.getElementById('client-form');
        if (form) {
            form.style.display = 'block';
            
            // Update form title
            const title = document.getElementById('client-form-title');
            if (title) {
                title.textContent = clientId ? 'Редагувати клієнта' : 'Новий клієнт';
            }
            
            // Load client data if editing
            if (clientId) {
                this.loadClientToForm(clientId);
            } else {
                this.clearClientForm();
            }
        }
    }
    
    // Single Responsibility: Hide all main sections
    hideAllSections() {
        const sections = [
            '#welcome-screen',
            '#client-form', 
            '#analysis-dashboard'
        ];
        
        sections.forEach(selector => {
            const element = document.querySelector(selector);
            if (element) {
                element.style.display = 'none';
            }
        });
    }
    
    // Single Responsibility: Save client data
    async saveClient() {
        console.log('👥 Saving client...');
        
        try {
            const formData = this.getClientFormData();
            if (!this.validateClientData(formData)) {
                return;
            }
            
            // Show loading state
            this.setFormLoading(true);
            
            // Save to API
            const result = await this.apiClient.saveClient(formData);
            
            if (result.success) {
                console.log('👥 Client saved successfully');
                this.showNotification('Клієнт збережено успішно!', 'success');
                
                // Refresh client list
                await this.loadClients();
                
                // Hide form and show dashboard or welcome
                this.hideAllSections();
                this.showWelcomeOrDashboard();
                
            } else {
                throw new Error(result.error || 'Failed to save client');
            }
            
        } catch (error) {
            console.error('👥 Error saving client:', error);
            this.showNotification('Помилка збереження клієнта: ' + error.message, 'error');
        } finally {
            this.setFormLoading(false);
        }
    }
    
    // Single Responsibility: Cancel client form
    cancelClientForm() {
        console.log('👥 Cancelling client form');
        this.hideAllSections();
        this.showWelcomeOrDashboard();
    }
    
    // Single Responsibility: Get form data
    getClientFormData() {
        return {
            id: document.getElementById('client-id')?.value || null,
            company: document.getElementById('company')?.value || '',
            negotiator: document.getElementById('negotiator')?.value || '',
            sector: document.getElementById('sector')?.value || '',
            companySize: document.getElementById('company-size')?.value || '',
            negotiationType: document.getElementById('negotiation-type')?.value || '',
            goals: document.getElementById('goals')?.value || '',
            dealValue: document.getElementById('deal-value')?.value || ''
        };
    }
    
    // Single Responsibility: Validate client data
    validateClientData(data) {
        if (!data.company.trim()) {
            this.showNotification('Назва компанії обов\'язкова', 'error');
            document.getElementById('company')?.focus();
            return false;
        }
        
        return true;
    }
    
    // Single Responsibility: Load client data to form
    loadClientToForm(clientId) {
        const client = this.clients.find(c => c.id == clientId);
        if (!client) return;
        
        console.log('👥 Loading client to form:', client.company);
        
        // Populate form fields
        const fields = {
            'client-id': client.id,
            'company': client.company,
            'negotiator': client.negotiator,
            'sector': client.sector,
            'company-size': client.company_size,
            'negotiation-type': client.negotiation_type,
            'goals': client.goals,
            'deal-value': client.deal_value
        };
        
        Object.entries(fields).forEach(([fieldId, value]) => {
            const field = document.getElementById(fieldId);
            if (field && value !== undefined) {
                field.value = value;
            }
        });
    }
    
    // Single Responsibility: Clear client form
    clearClientForm() {
        console.log('👥 Clearing client form');
        
        const form = document.getElementById('client-form');
        if (form) {
            const inputs = form.querySelectorAll('input, select, textarea');
            inputs.forEach(input => {
                if (input.type === 'checkbox' || input.type === 'radio') {
                    input.checked = false;
                } else {
                    input.value = '';
                }
            });
        }
    }
    
    // Single Responsibility: Set form loading state
    setFormLoading(loading) {
        const saveBtn = document.getElementById('save-client-btn');
        const cancelBtn = document.getElementById('cancel-client-btn');
        
        if (saveBtn) {
            saveBtn.disabled = loading;
            saveBtn.textContent = loading ? 'Збереження...' : 'Зберегти клієнта';
        }
        
        if (cancelBtn) {
            cancelBtn.disabled = loading;
        }
    }
    
    // Single Responsibility: Load clients from API
    async loadClients() {
        try {
            console.log('👥 Loading clients...');
            const result = await this.apiClient.getClients();
            
            if (result.success) {
                this.clients = result.clients || [];
                this.renderClientsList();
                this.updateClientCount();
                console.log(`👥 Loaded ${this.clients.length} clients`);
            }
            
        } catch (error) {
            console.error('👥 Error loading clients:', error);
            this.showNotification('Помилка завантаження клієнтів', 'error');
        }
    }
    
    // Single Responsibility: Render clients list
    renderClientsList() {
        const container = document.getElementById('client-list');
        if (!container) return;
        
        if (this.clients.length === 0) {
            container.innerHTML = this.getEmptyClientsHTML();
            return;
        }
        
        const html = this.clients.map(client => this.getClientItemHTML(client)).join('');
        container.innerHTML = html;
        
        // Register dynamic button handlers
        this.registerDynamicClientButtons();
    }
    
    // Single Responsibility: Register dynamic client buttons
    registerDynamicClientButtons() {
        // Client selection buttons
        document.querySelectorAll('.client-item').forEach(item => {
            if (!item.hasAttribute('data-handler-bound')) {
                item.addEventListener('click', (e) => {
                    if (!e.target.closest('.client-actions')) {
                        const clientId = item.dataset.clientId;
                        this.selectClient(clientId);
                    }
                });
                item.setAttribute('data-handler-bound', 'true');
            }
        });
        
        // Edit buttons
        document.querySelectorAll('.edit-client-btn').forEach(btn => {
            if (!btn.hasAttribute('data-handler-bound')) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const clientId = btn.dataset.clientId;
                    this.editClient(clientId);
                });
                btn.setAttribute('data-handler-bound', 'true');
            }
        });
        
        // Delete buttons
        document.querySelectorAll('.delete-client-btn').forEach(btn => {
            if (!btn.hasAttribute('data-handler-bound')) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const clientId = btn.dataset.clientId;
                    this.deleteClient(clientId);
                });
                btn.setAttribute('data-handler-bound', 'true');
            }
        });
    }
    
    // Single Responsibility: Select a client
    selectClient(clientId) {
        const client = this.clients.find(c => c.id == clientId);
        if (!client) return;
        
        console.log('👥 Selecting client:', client.company);
        this.currentClient = client;
        
        // Update UI
        this.updateClientSelection();
        this.showAnalysisDashboard();
        
        // Notify other systems
        this.dispatchClientChanged(client);
    }
    
    // Single Responsibility: Edit a client
    editClient(clientId) {
        console.log('👥 Editing client:', clientId);
        this.showClientForm(clientId);
    }
    
    // Single Responsibility: Delete a client
    async deleteClient(clientId) {
        const client = this.clients.find(c => c.id == clientId);
        if (!client) return;
        
        // Use modal manager for confirmation
        window.modalManager.showConfirmDialog({
            title: 'Видалення клієнта',
            message: `Ви впевнені, що хочете видалити клієнта "${client.company}"? Ця дія незворотна.`,
            confirmText: 'Видалити',
            onConfirm: async () => {
                try {
                    console.log('👥 Deleting client:', client.company);
                    
                    // Show loading modal
                    window.modalManager.showLoadingModal('Видалення клієнта...');
                    
                    const result = await this.apiClient.deleteClient(clientId);
                    
                    // Hide loading modal
                    window.modalManager.hideLoadingModal();
                    
                    if (result.success) {
                        this.showNotification('Клієнт видалено успішно', 'success');
                        await this.loadClients();
                        
                        // If deleted client was selected, clear selection
                        if (this.currentClient?.id == clientId) {
                            this.currentClient = null;
                            this.showWelcomeOrDashboard();
                        }
                    } else {
                        throw new Error(result.error || 'Failed to delete client');
                    }
                    
                } catch (error) {
                    // Hide loading modal
                    window.modalManager.hideLoadingModal();
                    console.error('👥 Error deleting client:', error);
                    window.modalManager.showAlert('Помилка видалення клієнта: ' + error.message, 'Помилка');
                }
            }
        });
    }
    
    // Single Responsibility: Update client count display
    updateClientCount() {
        const counter = document.getElementById('client-count');
        if (counter) {
            counter.textContent = this.clients.length.toString();
        }
    }
    
    // Single Responsibility: Show welcome or dashboard based on client selection
    showWelcomeOrDashboard() {
        if (this.currentClient) {
            this.showAnalysisDashboard();
        } else {
            this.showWelcomeScreen();
        }
    }
    
    // Single Responsibility: Show welcome screen
    showWelcomeScreen() {
        this.hideAllSections();
        const welcome = document.getElementById('welcome-screen');
        if (welcome) {
            welcome.style.display = 'block';
        }
    }
    
    // Single Responsibility: Show analysis dashboard
    showAnalysisDashboard() {
        this.hideAllSections();
        const dashboard = document.getElementById('analysis-dashboard');
        if (dashboard) {
            dashboard.style.display = 'block';
        }
    }
    
    // Single Responsibility: Update client selection UI
    updateClientSelection() {
        // Update navigation
        const navInfo = document.getElementById('nav-client-info');
        const navAvatar = document.getElementById('nav-client-avatar');
        const navName = document.getElementById('nav-client-name');
        const navSector = document.getElementById('nav-client-sector');
        
        if (this.currentClient) {
            if (navInfo) navInfo.style.display = 'flex';
            if (navAvatar) navAvatar.textContent = this.currentClient.company.charAt(0).toUpperCase();
            if (navName) navName.textContent = this.currentClient.company;
            if (navSector) navSector.textContent = this.currentClient.sector || '—';
        } else {
            if (navInfo) navInfo.style.display = 'none';
        }
        
        // Update client list selection
        document.querySelectorAll('.client-item').forEach(item => {
            const isSelected = item.dataset.clientId == this.currentClient?.id;
            item.classList.toggle('active', isSelected);
        });
    }
    
    // Single Responsibility: Dispatch client changed event
    dispatchClientChanged(client) {
        const event = new CustomEvent('clientChanged', { detail: client });
        window.dispatchEvent(event);
    }
    
    // Single Responsibility: Generate empty clients HTML
    getEmptyClientsHTML() {
        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-users"></i>
                </div>
                <p>Поки що немає клієнтів</p>
                <button class="btn-primary btn-sm" id="empty-new-client-btn">
                    <i class="fas fa-plus"></i>
                    Додати першого клієнта
                </button>
            </div>
        `;
    }
    
    // Single Responsibility: Generate client item HTML
    getClientItemHTML(client) {
        return `
            <div class="client-item" data-client-id="${client.id}">
                <div class="client-avatar">${client.company.charAt(0).toUpperCase()}</div>
                <div class="client-info">
                    <div class="client-name">${client.company}</div>
                    <div class="client-meta">${client.sector || 'Не вказано'} • ${client.analyses_count || 0} аналізів</div>
                </div>
                <div class="client-actions">
                    <button class="btn-icon edit-client-btn" data-client-id="${client.id}" title="Редагувати">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn-icon delete-client-btn" data-client-id="${client.id}" title="Видалити">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        `;
    }
    
    // Single Responsibility: Show notification
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`👥 ${type.toUpperCase()}: ${message}`);
        }
    }
    
    // Interface Segregation: Public API
    getCurrentClient() {
        return this.currentClient;
    }
    
    getClients() {
        return [...this.clients];
    }
    
    refreshClients() {
        return this.loadClients();
    }
    
    destroy() {
        console.log('👥 Destroying ClientManager...');
        this.currentClient = null;
        this.clients = [];
        this.isInitialized = false;
    }
}

// Export for global use
window.ClientManager = ClientManager;
console.log('👥 ClientManager class loaded');