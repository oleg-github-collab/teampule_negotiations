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
    }
    
    // Single Responsibility: Setup event listeners
    setupEventListeners() {
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
        
        // Attach event listeners
        this.attachClientEventListeners();
        
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
    
    // Single Responsibility: Attach event listeners to client items
    attachClientEventListeners() {
        document.querySelectorAll('.client-item').forEach(item => {
            const clientId = parseInt(item.dataset.clientId);
            
            // Client selection
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.client-actions')) {
                    this.selectClient(clientId);
                }
            });
            
            // Edit button
            const editBtn = item.querySelector('.edit-client-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.editClient(clientId);
                });
            }
            
            // Delete button
            const deleteBtn = item.querySelector('.delete-client-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    this.deleteClient(clientId);
                });
            }
        });
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
    
    // Single Responsibility: Select client
    selectClient(clientId) {
        const client = this.clients.find(c => c.id == clientId);
        if (!client) {
            console.warn('👥 Client not found:', clientId);
            return;
        }
        
        this.currentClient = client;
        console.log('👥 Client selected:', client.company);
        
        // Update UI
        this.renderClientsList();
        this.updateNavClientInfo();
        this.updateClientSelectDropdown();
        
        // Update global state for backward compatibility
        if (window.state) {
            window.state.currentClient = client;
        }
        
        // Notify other services
        this.notifyClientSelected(client);
        
        // Show analysis dashboard
        this.showAnalysisDashboard();
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