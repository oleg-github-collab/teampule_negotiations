/**
 * ClientService - Single Responsibility: Managing client operations
 * Follows SOLID principles - only handles client CRUD and display
 */
class ClientService {
    constructor() {
        this.clients = [];
        this.currentClient = null;
        this.isLoading = false;
        this.retryAttempts = 3;
        
        console.log('👥 ClientService initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize client service
    init() {
        this.setupGlobalMethods();
        this.setupEventListeners();
        this.loadClients();
        console.log('👥 ClientService ready');
    }
    
    // Single Responsibility: Setup global methods
    setupGlobalMethods() {
        window.clientService = this;
        window.loadClients = () => this.loadClients();
        window.createClient = (data) => this.createClient(data);
        window.selectClient = (id) => this.selectClient(id);
        window.deleteClient = (id) => this.deleteClient(id);
        
        // DEBUG FUNCTIONS
        window.testClientClick = (clientId) => {
            console.log('🧪 TESTING CLIENT CLICK for ID:', clientId);
            if (this.clients.length === 0) {
                console.log('🧪 No clients available. Creating test client...');
                this.clients.push({
                    id: 999,
                    company: 'Test Company',
                    negotiator: 'Test User',
                    sector: 'Testing'
                });
                this.renderClientsList();
            }
            const testId = clientId || this.clients[0]?.id;
            console.log('🧪 Selecting client:', testId);
            return this.selectClient(testId);
        };
        
        window.debugClientService = () => {
            console.log('🔍 DEBUG ClientService:');
            console.log('- Clients:', this.clients.length);
            console.log('- Current client:', this.currentClient?.company || 'NONE');
            console.log('- Client items in DOM:', document.querySelectorAll('.client-item').length);
            console.log('- Client list container:', !!document.getElementById('client-list'));
        };
        
        // Setup text area and client select listeners to update button state
        setTimeout(() => {
            const textArea = document.getElementById('negotiation-text');
            if (textArea) {
                textArea.addEventListener('input', () => this.updateAnalysisButtonState());
                textArea.addEventListener('change', () => this.updateAnalysisButtonState());
            }
            
            const clientSelect = document.getElementById('client-select');
            if (clientSelect) {
                clientSelect.addEventListener('change', (e) => {
                    // Handle dropdown client selection
                    const clientId = parseInt(e.target.value);
                    if (clientId) {
                        this.selectClient(clientId);
                    }
                    this.updateAnalysisButtonState();
                });
            }
        }, 2000);
    }
    
    // Single Responsibility: Setup event listeners
    setupEventListeners() {
        // Setup client click delegation (MOST IMPORTANT!)
        this.attachClientEventListeners();
        
        // Client search
        const clientSearch = document.getElementById('client-search');
        if (clientSearch) {
            clientSearch.addEventListener('input', () => {
                clearTimeout(this.searchTimeout);
                this.searchTimeout = setTimeout(() => this.renderClientsList(), 300);
            });
        }
        
        // New client button
        const newClientBtn = document.getElementById('new-client-btn');
        if (newClientBtn) {
            newClientBtn.addEventListener('click', () => this.showClientForm());
        }
    }
    
    // Single Responsibility: Load clients from API
    async loadClients(forceRefresh = false) {
        if (this.isLoading) {
            console.log('👥 Already loading clients, skipping...');
            return;
        }
        
        this.isLoading = true;
        console.log('👥 === LOADING CLIENTS START ===');
        
        try {
            const cacheBuster = forceRefresh ? `?_=${Date.now()}` : '';
            const response = await fetch(`/api/clients${cacheBuster}`, {
                credentials: 'include'
            });
            
            console.log('👥 Response status:', response.status);
            
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('👥 API response:', data);
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to load clients');
            }
            
            // Update clients array
            const previousCount = this.clients.length;
            this.clients = Array.isArray(data.clients) ? data.clients : [];
            
            console.log('👥 Clients loaded:', {
                previousCount,
                newCount: this.clients.length,
                clients: this.clients
            });
            
            // Update UI
            this.updateClientCount();
            this.renderClientsList();
            
            // Update global state for backward compatibility
            if (window.state) {
                window.state.clients = this.clients;
            }
            
            console.log('👥 === LOADING CLIENTS END ===');
            
        } catch (error) {
            console.error('👥 Failed to load clients:', error);
            this.showNotification('Помилка завантаження клієнтів: ' + error.message, 'error');
        } finally {
            this.isLoading = false;
        }
    }
    
    // Single Responsibility: Create new client
    async createClient(clientData) {
        console.log('👥 === CREATING CLIENT START ===');
        console.log('👥 Client data:', clientData);
        
        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData),
                credentials: 'include'
            });
            
            console.log('👥 Create response status:', response.status);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            console.log('👥 Create response:', data);
            
            if (!data.success) {
                throw new Error(data.error || 'Failed to create client');
            }
            
            // Set as current client
            this.currentClient = data.client;
            console.log('👥 New client created:', this.currentClient);
            
            // Reload clients to ensure UI is updated
            await this.loadClients(true);
            
            // Show success message
            this.showNotification(`Клієнт "${this.currentClient.company}" створено успішно!`, 'success');
            
            // Switch to analysis dashboard
            this.showAnalysisDashboard();
            
            console.log('👥 === CREATING CLIENT END ===');
            return this.currentClient;
            
        } catch (error) {
            console.error('👥 Failed to create client:', error);
            this.showNotification('Помилка створення клієнта: ' + error.message, 'error');
            throw error;
        }
    }
    
    // Single Responsibility: Render clients list
    renderClientsList() {
        console.log('👥 === RENDERING CLIENTS LIST START ===');
        console.log('👥 Total clients:', this.clients.length);
        
        const clientList = document.getElementById('client-list');
        if (!clientList) {
            console.warn('👥 Client list element not found');
            return;
        }
        
        const searchTerm = this.getSearchTerm();
        console.log('👥 Search term:', searchTerm);
        
        // Filter clients
        const filtered = this.filterClients(searchTerm);
        console.log('👥 Filtered clients:', filtered.length);
        
        if (filtered.length === 0) {
            this.renderEmptyState(searchTerm, clientList);
            return;
        }
        
        // Sort clients
        filtered.sort((a, b) => (a.company || '').localeCompare(b.company || ''));
        
        // Generate HTML
        const html = filtered.map(client => this.generateClientHTML(client)).join('');
        console.log('👥 Generated HTML length:', html.length);
        
        // Set HTML
        clientList.innerHTML = html;
        
        // Add direct listeners as fallback after HTML is set
        this.addDirectEventListeners();
        
        console.log('👥 🔥 HTML set and direct listeners added');
        
        console.log('👥 === RENDERING CLIENTS LIST END ===');
    }
    
    // Single Responsibility: Filter clients by search term
    filterClients(searchTerm) {
        if (!searchTerm) {
            return [...this.clients];
        }
        
        return this.clients.filter(client => {
            const matchCompany = client.company?.toLowerCase().includes(searchTerm);
            const matchSector = client.sector?.toLowerCase().includes(searchTerm);
            const matchNegotiator = client.negotiator?.toLowerCase().includes(searchTerm);
            
            return matchCompany || matchSector || matchNegotiator;
        });
    }
    
    // Single Responsibility: Generate HTML for a client
    generateClientHTML(client) {
        const isActive = this.currentClient?.id === client.id;
        const avatar = (client.company || 'C')[0].toUpperCase();
        const analysisCount = client.analyses_count || 0;
        
        // Safe HTML generation
        const safeCompany = this.escapeHtml(client.company || 'Без назви');
        const safeSector = this.escapeHtml(client.sector || '');
        
        return `
            <div class="client-item ${isActive ? 'active' : ''}" 
                 data-client-id="${client.id}">
                <div class="client-avatar">${avatar}</div>
                <div class="client-info">
                    <div class="client-name">${safeCompany}</div>
                    <div class="client-meta">
                        ${safeSector ? safeSector + ' • ' : ''}
                        ${analysisCount} аналізів
                    </div>
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
    
    // Single Responsibility: Render empty state
    renderEmptyState(searchTerm, clientList) {
        const emptyMessage = searchTerm ? 'Нічого не знайдено' : 'Немає клієнтів';
        const emptyIcon = searchTerm ? 'fas fa-search' : 'fas fa-users';
        
        clientList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="${emptyIcon}"></i>
                </div>
                <p>${emptyMessage}</p>
                ${!searchTerm ? '<button class="btn-primary" id="empty-new-client-btn">Створити першого клієнта</button>' : ''}
            </div>
        `;
        
        // Add event listener for empty state button
        if (!searchTerm) {
            const emptyNewBtn = document.getElementById('empty-new-client-btn');
            if (emptyNewBtn) {
                emptyNewBtn.addEventListener('click', () => this.showClientForm());
            }
        }
    }
    
    // Single Responsibility: Attach event listeners using event delegation (MUCH MORE RELIABLE)
    attachClientEventListeners() {
        const clientList = document.getElementById('client-list');
        if (!clientList) {
            console.warn('👥 Client list container not found');
            setTimeout(() => this.attachClientEventListeners(), 1000);
            return;
        }
        
        // Remove any existing listeners to avoid duplicates
        if (this.handleClientListClick) {
            clientList.removeEventListener('click', this.handleClientListClick);
        }
        
        // Add single delegated listener
        this.handleClientListClick = this.handleClientListClick.bind(this);
        clientList.addEventListener('click', this.handleClientListClick);
        
        console.log('👥 🔥 Event delegation set up on client-list');
        
        // FALLBACK: Also add direct listeners as backup
        this.addDirectEventListeners();
    }
    
    // Single Responsibility: Add direct event listeners as fallback
    addDirectEventListeners() {
        document.querySelectorAll('.client-item').forEach(item => {
            const clientId = parseInt(item.dataset.clientId);
            
            // Create unique handler for each item
            const handler = (e) => {
                console.log('👥 🔥 DIRECT CLICK on client:', clientId);
                if (!e.target.closest('.client-actions')) {
                    e.preventDefault();
                    e.stopPropagation();
                    this.selectClient(clientId);
                }
            };
            
            // Store handler reference for cleanup
            item._clickHandler = handler;
            
            // Add click listener
            item.addEventListener('click', handler);
            
            console.log('👥 🔥 Direct listener added for client:', clientId);
        });
        
        console.log('👥 🔥 All direct listeners added');
    }
    
    // Single Responsibility: Handle all client list clicks (EVENT DELEGATION)
    handleClientListClick(e) {
        console.log('👥 🔥 CLICK DETECTED on:', e.target);
        
        // Find the client item
        const clientItem = e.target.closest('.client-item');
        if (!clientItem) {
            console.log('👥 Click not on client item');
            return;
        }
        
        const clientId = parseInt(clientItem.dataset.clientId);
        console.log('👥 🔥 CLIENT ITEM CLICKED! ID:', clientId);
        
        // Handle different click targets
        if (e.target.closest('.delete-client-btn')) {
            e.preventDefault();
            e.stopPropagation();
            console.log('👥 Delete button clicked');
            this.deleteClient(clientId);
            return;
        }
        
        if (e.target.closest('.edit-client-btn')) {
            e.preventDefault();
            e.stopPropagation();
            console.log('👥 Edit button clicked');
            this.editClient(clientId);
            return;
        }
        
        // If not action button, select client
        console.log('👥 🔥 SELECTING CLIENT:', clientId);
        this.selectClient(clientId);
    }
    
    // Single Responsibility: Update client count display
    updateClientCount() {
        const clientCount = document.getElementById('client-count');
        if (clientCount) {
            clientCount.textContent = this.clients.length;
        }
    }
    
    // Single Responsibility: Get search term
    getSearchTerm() {
        const clientSearch = document.getElementById('client-search');
        return clientSearch?.value.toLowerCase().trim() || '';
    }
    
    // Single Responsibility: Select client (COMPLETELY REWRITTEN FOR RELIABILITY)
    selectClient(clientId) {
        console.log('👥 🔥 ==> SELECT CLIENT CALLED <==');
        console.log('👥 🔥 ClientID:', clientId, 'type:', typeof clientId);
        console.log('👥 🔥 Available clients:', this.clients.map(c => ({ id: c.id, company: c.company })));
        
        // Find client
        const client = this.clients.find(c => c.id == clientId);
        if (!client) {
            console.error('👥 ❌ CLIENT NOT FOUND:', clientId);
            return false;
        }
        
        console.log('👥 🔥 CLIENT FOUND:', client.company);
        
        // Set current client
        this.currentClient = client;
        console.log('👥 🔥 CURRENT CLIENT SET TO:', this.currentClient);
        
        // Update ALL UI elements immediately
        this.updateAllUIForSelectedClient(client);
        
        // Update global state for backward compatibility
        if (window.state) {
            window.state.currentClient = client;
            console.log('👥 🔥 Global state updated');
        }
        
        // Notify other services
        this.notifyClientSelected(client);
        
        // Show analysis dashboard
        this.showAnalysisDashboard();
        
        console.log('👥 🔥 ==> CLIENT SELECTION COMPLETE <==');
        return true;
    }
    
    // Single Responsibility: Update ALL UI elements for selected client
    updateAllUIForSelectedClient(client) {
        console.log('👥 🔥 Updating ALL UI for client:', client.company);
        
        // 1. Update client list (highlight selected)
        document.querySelectorAll('.client-item').forEach(item => {
            const isSelected = parseInt(item.dataset.clientId) === client.id;
            item.classList.toggle('active', isSelected);
            console.log('👥 Client item', item.dataset.clientId, 'active:', isSelected);
        });
        
        // 2. Update navigation info
        this.updateNavClientInfo();
        
        // 3. Update client select dropdown
        this.updateClientSelectDropdown();
        
        // 4. Update analysis button state
        this.updateAnalysisButtonState();
        
        // 5. Force re-render client list to ensure proper state
        // this.renderClientsList(); // Commented out to avoid infinite loop
        
        console.log('👥 🔥 All UI updated for client selection');
    }
    
    // Single Responsibility: Update client select dropdown for analysis
    updateClientSelectDropdown() {
        const clientSelect = document.getElementById('client-select');
        if (!clientSelect) return;
        
        // Clear existing options
        clientSelect.innerHTML = '<option value="">Оберіть клієнта...</option>';
        
        // Add all clients
        this.clients.forEach(client => {
            const option = document.createElement('option');
            option.value = client.id;
            option.textContent = client.company || 'Без назви';
            option.selected = this.currentClient?.id === client.id;
            clientSelect.appendChild(option);
        });
        
        console.log('👥 Client select dropdown updated, current client:', this.currentClient?.id);
    }
    
    // Single Responsibility: Notify other services about client selection
    notifyClientSelected(client) {
        // Dispatch custom event for other services
        window.dispatchEvent(new CustomEvent('clientSelected', {
            detail: { client }
        }));
        
        // Update analysis manager if available
        if (window.analysisManager && window.analysisManager.setCurrentClient) {
            window.analysisManager.setCurrentClient(client);
        }
        
        console.log('👥 Client selection notifications sent');
    }
    
    // Single Responsibility: Show client form
    showClientForm(clientId = null) {
        console.log('👥 Showing client form for:', clientId || 'new client');
        
        // Show client form section
        const sections = ['welcome-screen', 'client-form', 'analysis-dashboard'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = sectionId === 'client-form' ? 'block' : 'none';
            }
        });
        
        // Update form title
        const formTitle = document.getElementById('client-form-title');
        if (formTitle) {
            formTitle.textContent = clientId ? 'Редагувати клієнта' : 'Новий клієнт';
        }
        
        // Fill form if editing
        if (clientId) {
            this.fillClientForm(clientId);
        } else {
            this.clearClientForm();
        }
    }
    
    // Single Responsibility: Show analysis dashboard
    showAnalysisDashboard() {
        console.log('👥 Showing analysis dashboard');
        
        const sections = ['welcome-screen', 'client-form', 'analysis-dashboard'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = sectionId === 'analysis-dashboard' ? 'block' : 'none';
            }
        });
        
        // Enable analysis button when client is selected
        this.updateAnalysisButtonState();
    }
    
    // Single Responsibility: Update analysis button state
    updateAnalysisButtonState() {
        const analysisBtn = document.getElementById('start-analysis-btn');
        const textArea = document.getElementById('negotiation-text');
        
        if (analysisBtn) {
            const hasClient = this.currentClient !== null;
            const hasText = textArea?.value?.trim();
            
            analysisBtn.disabled = !hasClient || !hasText;
            
            if (hasClient && !hasText) {
                analysisBtn.title = 'Введіть текст для аналізу';
            } else if (!hasClient) {
                analysisBtn.title = 'Спочатку оберіть клієнта';
            } else {
                analysisBtn.title = 'Розпочати аналіз';
            }
            
            console.log('👥 Analysis button state:', { hasClient, hasText, disabled: analysisBtn.disabled });
        }
    }
    
    // Single Responsibility: Update navigation client info
    updateNavClientInfo() {
        const navClientInfo = document.getElementById('nav-client-info');
        if (!navClientInfo) return;
        
        if (this.currentClient) {
            navClientInfo.innerHTML = `
                <div class="nav-client-active">
                    <div class="nav-client-avatar">${(this.currentClient.company || 'C')[0].toUpperCase()}</div>
                    <div class="nav-client-details">
                        <div class="nav-client-name">${this.escapeHtml(this.currentClient.company || 'Без назви')}</div>
                        <div class="nav-client-meta">${this.currentClient.analyses_count || 0} аналізів</div>
                    </div>
                </div>
            `;
        } else {
            navClientInfo.innerHTML = `
                <div class="nav-client-empty">
                    <i class="fas fa-user-plus"></i>
                    <span>Оберіть клієнта</span>
                </div>
            `;
        }
    }
    
    // Single Responsibility: Show notification
    showNotification(message, type = 'info') {
        console.log(`👥 Notification [${type}]:`, message);
        
        // Try to use NotificationService first
        if (window.notificationService) {
            window.notificationService.showAlert(message, type);
            return;
        }
        
        // Try to use global notification system
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }
        
        // Fallback to alert
        if (type === 'error') {
            alert('❌ ' + message);
        } else if (type === 'success') {
            alert('✅ ' + message);
        } else {
            alert('ℹ️ ' + message);
        }
    }
    
    // Single Responsibility: Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[<>&"']/g, (char) => {
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
    
    // Single Responsibility: Clear client form
    clearClientForm() {
        const form = document.getElementById('client-form');
        if (form) {
            const inputs = form.querySelectorAll('input, textarea, select');
            inputs.forEach(input => {
                input.value = '';
            });
        }
    }
    
    // Single Responsibility: Fill client form for editing
    fillClientForm(clientId) {
        const client = this.clients.find(c => c.id == clientId);
        if (!client) return;
        
        const form = document.getElementById('client-form');
        if (!form) return;
        
        // Fill form fields
        Object.keys(client).forEach(key => {
            const input = form.querySelector(`#${key}`);
            if (input && client[key] !== null && client[key] !== undefined) {
                input.value = client[key];
            }
        });
    }
    
    // Single Responsibility: Edit client
    editClient(clientId) {
        console.log('👥 Editing client:', clientId);
        this.showClientForm(clientId);
    }
    
    // Single Responsibility: Delete client
    async deleteClient(clientId) {
        const client = this.clients.find(c => c.id == clientId);
        if (!client) return;
        
        const confirmed = window.notificationService 
            ? await window.notificationService.showConfirm(`Видалити клієнта "${client.company}"?`)
            : confirm(`Видалити клієнта "${client.company}"?`);
            
        if (!confirmed) {
            return;
        }
        
        try {
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();
            if (!data.success) {
                throw new Error(data.error || 'Failed to delete client');
            }
            
            // Remove from clients array
            this.clients = this.clients.filter(c => c.id !== clientId);
            
            // Clear current client if it was deleted
            if (this.currentClient?.id === clientId) {
                this.currentClient = null;
            }
            
            // Update UI
            this.updateClientCount();
            this.renderClientsList();
            this.updateNavClientInfo();
            
            this.showNotification(`Клієнт "${client.company}" видалено`, 'success');
            
        } catch (error) {
            console.error('👥 Failed to delete client:', error);
            this.showNotification('Помилка видалення клієнта: ' + error.message, 'error');
        }
    }
}

// Export for module use
window.ClientService = ClientService;