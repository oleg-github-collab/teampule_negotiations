// ===== TEAMPULSE CORE SYSTEM v3.0 =====
// SOLID ARCHITECTURE - ЄДИНИЙ МОДУЛЬ БЕЗ ДУБЛЮВАННЯ
// ЗАМІНЯЄ ВСІ СТАРІ СИСТЕМИ: ClientService, AnalysisService, SIMPLE_*, EMERGENCY_*

console.log('🔥 ==> TEAMPULSE CORE LOADING...');

// ===== GLOBAL STATE =====
window.TEAMPULSE = {
    // Core State
    currentClient: null,
    clients: [],
    isAnalysisActive: false,
    highlights: [],
    
    // Services
    notificationService: null,
    apiClient: null,
    
    // UI State
    currentView: 'welcome', // welcome, client-form, analysis-dashboard
    analysisProgress: 0,
    
    // Config
    config: {
        minTextLength: 20,
        debugMode: true
    }
};

// ===== UTILITY FUNCTIONS =====
const Utils = {
    log(message, data = null) {
        if (window.TEAMPULSE.config.debugMode) {
            console.log(`🔥 TEAMPULSE: ${message}`, data || '');
        }
    },
    
    error(message, error = null) {
        console.error(`🔥 TEAMPULSE ERROR: ${message}`, error || '');
    },
    
    $(id) {
        return document.getElementById(id);
    },
    
    $$(selector) {
        return document.querySelectorAll(selector);
    },
    
    show(elementId) {
        const el = this.$(elementId);
        if (el) el.style.display = 'block';
    },
    
    hide(elementId) {
        const el = this.$(elementId);
        if (el) el.style.display = 'none';
    }
};

// ===== NOTIFICATION SYSTEM =====
const Notifications = {
    success(message) {
        Utils.log('Success notification:', message);
        if (window.notificationService) {
            window.notificationService.showNotification(message, 'success');
        } else {
            alert('✅ ' + message);
        }
    },
    
    error(message) {
        Utils.log('Error notification:', message);
        if (window.notificationService) {
            window.notificationService.showAlert(message, 'error');
        } else {
            alert('❌ ' + message);
        }
    },
    
    async confirm(message) {
        Utils.log('Confirm dialog:', message);
        if (window.notificationService) {
            return await window.notificationService.showConfirm(message);
        } else {
            return confirm(message);
        }
    }
};

// ===== CLIENT MANAGEMENT (Single Responsibility) =====
const ClientManager = {
    // Load clients from API
    async loadClients() {
        Utils.log('Loading clients...');
        try {
            const response = await fetch('/api/clients', { credentials: 'include' });
            const result = await response.json();
            
            if (result.success) {
                window.TEAMPULSE.clients = result.clients || [];
                Utils.log('Clients loaded', window.TEAMPULSE.clients.length);
                this.renderClients();
                return true;
            }
        } catch (error) {
            Utils.error('Failed to load clients', error);
        }
        return false;
    },
    
    // Render clients in sidebar
    renderClients() {
        Utils.log('Rendering clients...');
        const clientList = Utils.$('client-list');
        if (!clientList) {
            Utils.error('Client list container not found');
            return;
        }
        
        if (window.TEAMPULSE.clients.length === 0) {
            clientList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">👤</div>
                    <div class="empty-title">Немає клієнтів</div>
                    <button id="empty-new-client-btn" class="btn-primary">
                        <i class="fas fa-plus"></i> Додати клієнта
                    </button>
                </div>
            `;
            this.setupEmptyButton();
            return;
        }
        
        const html = window.TEAMPULSE.clients.map(client => {
            const isActive = window.TEAMPULSE.currentClient?.id === client.id;
            const avatar = (client.company || 'C')[0].toUpperCase();
            
            return `
                <div class="client-item ${isActive ? 'active' : ''}" data-client-id="${client.id}">
                    <div class="client-avatar">${avatar}</div>
                    <div class="client-info">
                        <div class="client-name">${client.company || 'Без назви'}</div>
                        <div class="client-meta">
                            ${client.sector || ''} • ${client.analyses_count || 0} аналізів
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
        }).join('');
        
        clientList.innerHTML = html;
        this.setupClientEvents();
        this.updateCounter();
        Utils.log('Clients rendered successfully');
    },
    
    // Setup event handlers for clients
    setupClientEvents() {
        Utils.log('Setting up client events...');
        
        // Client selection
        Utils.$$('.client-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (e.target.closest('.client-actions')) return;
                
                const clientId = parseInt(item.dataset.clientId);
                Utils.log('Client clicked:', clientId);
                this.selectClient(clientId);
            });
        });
        
        // Delete buttons
        Utils.$$('.delete-client-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const clientId = parseInt(btn.dataset.clientId);
                this.deleteClient(clientId);
            });
        });
        
        // Edit buttons
        Utils.$$('.edit-client-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const clientId = parseInt(btn.dataset.clientId);
                this.editClient(clientId);
            });
        });
    },
    
    // Select client (Open/Closed Principle)
    selectClient(clientId) {
        Utils.log('==> SELECTING CLIENT:', clientId);
        
        const client = window.TEAMPULSE.clients.find(c => c.id == clientId);
        if (!client) {
            Utils.error('Client not found:', clientId);
            return false;
        }
        
        Utils.log('CLIENT FOUND:', client.company);
        
        // Set current client
        window.TEAMPULSE.currentClient = client;
        
        // Update UI
        this.updateClientSelection();
        
        // Navigate to analysis dashboard
        ViewManager.showAnalysisDashboard();
        
        // Update analysis button state
        AnalysisManager.updateAnalysisButton();
        
        Utils.log('CLIENT SELECTION COMPLETE!');
        return true;
    },
    
    // Update client selection UI
    updateClientSelection() {
        Utils.log('Updating client selection UI...');
        
        // Update highlighting
        Utils.$$('.client-item').forEach(item => {
            const clientId = parseInt(item.dataset.clientId);
            const isSelected = window.TEAMPULSE.currentClient?.id === clientId;
            item.classList.toggle('active', isSelected);
        });
        
        // Update navigation
        this.updateNavigation();
    },
    
    // Update navigation client info
    updateNavigation() {
        const client = window.TEAMPULSE.currentClient;
        const navInfo = Utils.$('nav-client-info');
        
        if (navInfo && client) {
            navInfo.style.display = 'block';
            navInfo.innerHTML = `
                <div class="nav-client-avatar">${(client.company || 'C')[0].toUpperCase()}</div>
                <div class="nav-client-details">
                    <div class="nav-client-name">${client.company || 'Без назви'}</div>
                    <div class="nav-client-sector">${client.sector || 'Сектор не вказано'}</div>
                </div>
            `;
        }
    },
    
    // Save client (Interface Segregation)
    async saveClient() {
        Utils.log('Saving client...');
        
        try {
            const clientData = {
                company: Utils.$('company')?.value?.trim() || '',
                negotiator: Utils.$('negotiator')?.value?.trim() || '',
                sector: Utils.$('sector')?.value || '',
                company_size: Utils.$('company-size')?.value || '',
                negotiation_type: Utils.$('negotiation-type')?.value || '',
                goals: Utils.$('goals')?.value?.trim() || '',
                deal_value: Utils.$('deal-value')?.value?.trim() || ''
            };
            
            if (!clientData.company) {
                Notifications.error('Назва компанії є обов\'язковою');
                return false;
            }
            
            Utils.log('Client data to save:', clientData);
            
            // Show loading
            const saveBtn = Utils.$('save-client-btn');
            if (saveBtn) {
                saveBtn.disabled = true;
                saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Збереження...';
            }
            
            // Save via API
            let result;
            if (window.apiClient) {
                result = await window.apiClient.saveClient(clientData);
            } else {
                const response = await fetch('/api/clients', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(clientData),
                    credentials: 'include'
                });
                
                if (response.ok) {
                    const data = await response.json();
                    result = { success: true, client: data.client };
                } else {
                    const error = await response.text();
                    result = { success: false, error: `HTTP ${response.status}: ${error}` };
                }
            }
            
            if (result.success) {
                Utils.log('Client saved successfully:', result.client);
                
                // Update local state
                if (result.client) {
                    const existingIndex = window.TEAMPULSE.clients.findIndex(c => c.id === result.client.id);
                    if (existingIndex >= 0) {
                        window.TEAMPULSE.clients[existingIndex] = result.client;
                    } else {
                        window.TEAMPULSE.clients.push(result.client);
                    }
                }
                
                // Update UI
                this.renderClients();
                
                // Auto-select new client
                if (result.client) {
                    this.selectClient(result.client.id);
                }
                
                Notifications.success('Клієнт збережений успішно!');
                this.clearForm();
                
                return true;
            } else {
                Utils.error('Save error:', result.error);
                Notifications.error('Помилка збереження: ' + result.error);
                return false;
            }
            
        } catch (error) {
            Utils.error('Save client error:', error);
            Notifications.error('Помилка збереження: ' + error.message);
            return false;
        } finally {
            // Restore button
            const saveBtn = Utils.$('save-client-btn');
            if (saveBtn) {
                saveBtn.disabled = false;
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Зберегти клієнта';
            }
        }
    },
    
    // Delete client (Dependency Inversion)
    async deleteClient(clientId) {
        const client = window.TEAMPULSE.clients.find(c => c.id == clientId);
        if (!client) return;
        
        Utils.log('Deleting client:', client.company);
        
        try {
            const confirmed = await Notifications.confirm(
                `Ви дійсно хочете видалити клієнта "${client.company}"?\n\nЦя дія незворотна.`
            );
            
            if (!confirmed) {
                Utils.log('Delete cancelled by user');
                return false;
            }
            
            let result;
            if (window.apiClient) {
                result = await window.apiClient.deleteClient(clientId);
            } else {
                const response = await fetch(`/api/clients/${clientId}`, {
                    method: 'DELETE',
                    credentials: 'include'
                });
                
                if (response.ok) {
                    result = { success: true };
                } else {
                    const error = await response.text();
                    result = { success: false, error: `HTTP ${response.status}: ${error}` };
                }
            }
            
            if (result.success) {
                Utils.log('Client deleted successfully');
                
                // Update local state
                window.TEAMPULSE.clients = window.TEAMPULSE.clients.filter(c => c.id !== clientId);
                
                // If current client deleted
                if (window.TEAMPULSE.currentClient?.id === clientId) {
                    window.TEAMPULSE.currentClient = null;
                    ViewManager.showWelcomeScreen();
                }
                
                // Update UI
                this.renderClients();
                
                Notifications.success(`Клієнт "${client.company}" видалений`);
                return true;
            } else {
                Utils.error('Delete error:', result.error);
                Notifications.error('Помилка видалення: ' + result.error);
                return false;
            }
            
        } catch (error) {
            Utils.error('Delete client error:', error);
            Notifications.error('Помилка видалення: ' + error.message);
            return false;
        }
    },
    
    // Helper methods
    updateCounter() {
        const counter = Utils.$('client-count');
        if (counter) {
            counter.textContent = window.TEAMPULSE.clients.length;
        }
    },
    
    setupEmptyButton() {
        const btn = Utils.$('empty-new-client-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                ViewManager.showClientForm();
            });
        }
    },
    
    clearForm() {
        const fields = ['company', 'negotiator', 'sector', 'company-size', 'negotiation-type', 'goals', 'deal-value'];
        fields.forEach(fieldId => {
            const field = Utils.$(fieldId);
            if (field) field.value = '';
        });
    },
    
    editClient(clientId) {
        Utils.log('Edit client:', clientId);
        ViewManager.showClientForm(clientId);
    }
};

// ===== VIEW MANAGEMENT (Single Responsibility) =====
const ViewManager = {
    showWelcomeScreen() {
        Utils.log('Showing welcome screen');
        window.TEAMPULSE.currentView = 'welcome';
        this.switchView('welcome-screen');
    },
    
    showClientForm(clientId = null) {
        Utils.log('Showing client form', clientId);
        window.TEAMPULSE.currentView = 'client-form';
        this.switchView('client-form');
        
        if (clientId) {
            // TODO: Load client data for editing
        }
    },
    
    showAnalysisDashboard() {
        Utils.log('Showing analysis dashboard');
        window.TEAMPULSE.currentView = 'analysis-dashboard';
        this.switchView('analysis-dashboard');
        this.showClientInfo();
    },
    
    switchView(activeView) {
        const sections = ['welcome-screen', 'client-form', 'analysis-dashboard'];
        sections.forEach(sectionId => {
            const section = Utils.$(sectionId);
            if (section) {
                section.style.display = sectionId === activeView ? 'block' : 'none';
            }
        });
    },
    
    showClientInfo() {
        const client = window.TEAMPULSE.currentClient;
        if (!client) return;
        
        Utils.log('Showing client info for:', client.company);
        
        let clientInfo = Utils.$('current-client-info');
        if (!clientInfo) {
            const dashboard = Utils.$('analysis-dashboard');
            if (dashboard) {
                clientInfo = document.createElement('div');
                clientInfo.id = 'current-client-info';
                clientInfo.className = 'current-client-info';
                dashboard.insertBefore(clientInfo, dashboard.firstChild);
            }
        }
        
        if (clientInfo) {
            clientInfo.innerHTML = `
                <div class="client-card">
                    <div class="client-header">
                        <div class="client-avatar-large">${(client.company || 'C')[0].toUpperCase()}</div>
                        <div class="client-details">
                            <h2>${client.company || 'Без назви'}</h2>
                            <p><strong>Переговірник:</strong> ${client.negotiator || 'Не вказано'}</p>
                            <p><strong>Сектор:</strong> ${client.sector || 'Не вказано'}</p>
                            <p><strong>Аналізів:</strong> ${client.analyses_count || 0}</p>
                        </div>
                    </div>
                    <div class="client-status">
                        ✅ Клієнт активний - можна проводити аналіз
                    </div>
                </div>
            `;
        }
    }
};

// ===== ANALYSIS MANAGEMENT (Single Responsibility) =====
const AnalysisManager = {
    async startAnalysis() {
        Utils.log('==> START ANALYSIS CALLED <==');
        
        // Check text
        const textArea = Utils.$('negotiation-text');
        if (!textArea?.value?.trim()) {
            Notifications.error('Введіть текст для аналізу');
            return false;
        }
        
        const text = textArea.value.trim();
        if (text.length < window.TEAMPULSE.config.minTextLength) {
            Notifications.error(`Текст занадто короткий (мінімум ${window.TEAMPULSE.config.minTextLength} символів)`);
            return false;
        }
        
        // Check client
        const currentClient = window.TEAMPULSE.currentClient;
        if (!currentClient) {
            Utils.error('NO CLIENT SELECTED!');
            Utils.log('TEAMPULSE STATE:', window.TEAMPULSE);
            Notifications.error('Спочатку оберіть клієнта в лівому сайдбарі');
            return false;
        }
        
        Utils.log('CLIENT FOUND:', currentClient.company);
        Utils.log('TEXT LENGTH:', text.length);
        
        // Prepare data
        const analysisData = {
            client_id: currentClient.id,
            text: text,
            method: 'text'
        };
        
        if (currentClient) {
            analysisData.profile = JSON.stringify({
                company: currentClient.company || '',
                negotiator: currentClient.negotiator || '',
                sector: currentClient.sector || ''
            });
        }
        
        Utils.log('STARTING ANALYSIS WITH DATA:', analysisData);
        
        try {
            window.TEAMPULSE.isAnalysisActive = true;
            this.showAnalysisProgress();
            
            // Show progress
            const analysisBtn = Utils.$('start-analysis-btn');
            if (analysisBtn) {
                analysisBtn.disabled = true;
                analysisBtn.textContent = 'Аналізую...';
            }
            
            // Send request
            const formData = new FormData();
            Object.keys(analysisData).forEach(key => {
                formData.append(key, analysisData[key]);
            });
            
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            Utils.log('ANALYSIS STARTED SUCCESSFULLY!');
            
            // Process stream
            return await this.processAnalysisStream(response);
            
        } catch (error) {
            Utils.error('ANALYSIS ERROR:', error);
            Notifications.error('Помилка аналізу: ' + error.message);
            return false;
        } finally {
            window.TEAMPULSE.isAnalysisActive = false;
            
            // Restore button
            const analysisBtn = Utils.$('start-analysis-btn');
            if (analysisBtn) {
                analysisBtn.disabled = false;
                analysisBtn.textContent = 'Розпочати аналіз';
            }
        }
    },
    
    async processAnalysisStream(response) {
        Utils.log('Processing analysis stream...');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        let highlights = [];
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split('\\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            Utils.log('Stream data:', data.type);
                            
                            if (data.type === 'highlight') {
                                highlights.push(data);
                                this.updateProgressDisplay(highlights.length);
                            } else if (data.type === 'merged_highlights') {
                                if (data.items && Array.isArray(data.items)) {
                                    highlights = data.items;
                                }
                            } else if (data.type === 'complete') {
                                Utils.log('Analysis complete!');
                            }
                        } catch (parseError) {
                            Utils.log('Parse error:', parseError);
                        }
                    }
                }
            }
            
            Utils.log('ANALYSIS COMPLETED! Highlights:', highlights.length);
            window.TEAMPULSE.highlights = highlights;
            
            // Show results
            if (highlights.length > 0) {
                this.showResults(highlights);
            }
            
            return highlights;
            
        } finally {
            reader.releaseLock();
        }
    },
    
    showAnalysisProgress() {
        Utils.log('Showing analysis progress...');
        const resultsSection = Utils.$('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
    },
    
    updateProgressDisplay(highlightCount) {
        Utils.log(`Progress update: ${highlightCount} highlights found`);
        // TODO: Update progress indicators and counters
    },
    
    showResults(highlights) {
        Utils.log('Showing results...');
        
        // Update counters
        const totalCount = highlights.length;
        const manipulationCount = highlights.filter(h => h.category === 'manipulation').length;
        const biasCount = highlights.filter(h => h.category === 'cognitive_bias').length;
        const fallacyCount = highlights.filter(h => h.category === 'rhetorical_fallacy').length;
        
        Utils.log('Results:', { totalCount, manipulationCount, biasCount, fallacyCount });
        
        // Update UI counters
        const manipulationsEl = Utils.$('manipulations-count');
        const biasesEl = Utils.$('biases-count');
        const fallaciesEl = Utils.$('fallacies-count');
        
        if (manipulationsEl) manipulationsEl.textContent = manipulationCount;
        if (biasesEl) biasesEl.textContent = biasCount;
        if (fallaciesEl) fallaciesEl.textContent = fallacyCount;
        
        // Show success message
        Notifications.success(`Аналіз завершено! Знайдено ${totalCount} проблем`);
        
        // TODO: Render highlights list, update barometer, etc.
    },
    
    updateAnalysisButton() {
        Utils.log('Updating analysis button...');
        
        const analysisBtn = Utils.$('start-analysis-btn');
        const textArea = Utils.$('negotiation-text');
        
        if (analysisBtn) {
            const hasClient = !!window.TEAMPULSE.currentClient;
            const hasText = textArea?.value?.trim()?.length >= window.TEAMPULSE.config.minTextLength;
            
            analysisBtn.disabled = !hasClient || !hasText;
            
            Utils.log('Analysis button state:', {
                hasClient,
                hasText,
                disabled: analysisBtn.disabled
            });
        }
    }
};

// ===== INITIALIZATION (Dependency Inversion) =====
const TeampulseCore = {
    async init() {
        Utils.log('==> TEAMPULSE CORE INITIALIZING...');
        
        // Setup services
        window.TEAMPULSE.notificationService = window.notificationService;
        window.TEAMPULSE.apiClient = window.apiClient;
        
        // Load clients
        await ClientManager.loadClients();
        
        // Setup event handlers
        this.setupEventHandlers();
        
        Utils.log('==> TEAMPULSE CORE READY!');
    },
    
    setupEventHandlers() {
        Utils.log('Setting up event handlers...');
        
        // Text area changes
        const textArea = Utils.$('negotiation-text');
        if (textArea) {
            textArea.addEventListener('input', () => {
                AnalysisManager.updateAnalysisButton();
            });
        }
        
        // New client button
        const newClientBtn = Utils.$('new-client-btn');
        if (newClientBtn) {
            newClientBtn.addEventListener('click', () => {
                ViewManager.showClientForm();
            });
        }
        
        // Save client button
        const saveClientBtn = Utils.$('save-client-btn');
        if (saveClientBtn) {
            saveClientBtn.addEventListener('click', () => {
                ClientManager.saveClient();
            });
        }
        
        // Analysis button
        const analysisBtn = Utils.$('start-analysis-btn');
        if (analysisBtn) {
            analysisBtn.addEventListener('click', () => {
                AnalysisManager.startAnalysis();
            });
        }
        
        // Welcome screen new client
        const welcomeNewClient = Utils.$('welcome-new-client');
        if (welcomeNewClient) {
            welcomeNewClient.addEventListener('click', () => {
                ViewManager.showClientForm();
            });
        }
        
        Utils.log('Event handlers set up successfully');
    }
};

// ===== GLOBAL EXPOSURE =====
window.TeampulseCore = TeampulseCore;
window.ClientManager = ClientManager;
window.AnalysisManager = AnalysisManager;
window.ViewManager = ViewManager;

// ===== AUTO-INITIALIZATION =====
setTimeout(() => {
    TeampulseCore.init();
}, 500);

console.log('🔥 TEAMPULSE CORE LOADED!');