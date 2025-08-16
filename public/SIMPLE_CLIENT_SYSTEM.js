// ===== ПРОСТІША НОВА СИСТЕМА ВИБОРУ КЛІЄНТІВ =====
// ПОВНІСТЮ ЗАМІНЯЄ ВСІ СКЛАДНІ СЕРВІСИ

console.log('🔥 SIMPLE CLIENT SYSTEM - LOADING...');

// ГЛОБАЛЬНИЙ STATE
window.SIMPLE_STATE = {
    currentClient: null,
    clients: [],
    isAnalysisEnabled: false
};

// ГЛОБАЛЬНІ ФУНКЦІЇ
window.SIMPLE_CLIENT_SYSTEM = {
    
    // 1. ЗАВАНТАЖИТИ КЛІЄНТІВ
    async loadClients() {
        console.log('🔥 Loading clients...');
        try {
            const response = await fetch('/api/clients', { credentials: 'include' });
            const result = await response.json();
            
            if (result.success) {
                window.SIMPLE_STATE.clients = result.clients || [];
                console.log('🔥 Clients loaded:', window.SIMPLE_STATE.clients.length);
                this.renderClients();
                return true;
            }
        } catch (error) {
            console.error('🔥 Error loading clients:', error);
        }
        return false;
    },
    
    // 2. ВІДОБРАЗИТИ КЛІЄНТІВ
    renderClients() {
        console.log('🔥 Rendering clients...');
        const clientList = document.getElementById('client-list');
        if (!clientList) {
            console.error('🔥 Client list not found!');
            return;
        }
        
        if (window.SIMPLE_STATE.clients.length === 0) {
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
        
        // ГЕНЕРУВАТИ HTML ДЛЯ КЛІЄНТІВ
        const html = window.SIMPLE_STATE.clients.map(client => {
            const isActive = window.SIMPLE_STATE.currentClient?.id === client.id;
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
        
        // ВСТАНОВИТИ КЛІКИ
        this.setupClicks();
        
        // ОНОВИТИ ЛІЧИЛЬНИК
        this.updateCounter();
        
        console.log('🔥 Clients rendered successfully');
    },
    
    // 3. ВСТАНОВИТИ ОБРОБНИКИ КЛІКІВ (ПРОСТІШІ)
    setupClicks() {
        console.log('🔥 Setting up clicks...');
        
        // КЛІК НА КЛІЄНТА
        document.querySelectorAll('.client-item').forEach(item => {
            item.addEventListener('click', (e) => {
                // Не обробляти кліки на кнопки
                if (e.target.closest('.client-actions')) return;
                
                const clientId = parseInt(item.dataset.clientId);
                console.log('🔥 CLIENT CLICKED:', clientId);
                this.selectClient(clientId);
            });
        });
        
        // КЛІКИ НА КНОПКИ
        document.querySelectorAll('.delete-client-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const clientId = parseInt(btn.dataset.clientId);
                this.deleteClient(clientId);
            });
        });
        
        document.querySelectorAll('.edit-client-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const clientId = parseInt(btn.dataset.clientId);
                this.editClient(clientId);
            });
        });
    },
    
    // 4. ВИБРАТИ КЛІЄНТА (ОСНОВНА ФУНКЦІЯ)
    selectClient(clientId) {
        console.log('🔥 ==> SELECTING CLIENT:', clientId);
        
        // ЗНАЙТИ КЛІЄНТА
        const client = window.SIMPLE_STATE.clients.find(c => c.id == clientId);
        if (!client) {
            console.error('🔥 Client not found:', clientId);
            return false;
        }
        
        console.log('🔥 CLIENT FOUND:', client.company);
        
        // ВСТАНОВИТИ ПОТОЧНОГО КЛІЄНТА
        window.SIMPLE_STATE.currentClient = client;
        
        // ОНОВИТИ UI
        this.updateClientSelection();
        
        // ПЕРЕЙТИ НА АНАЛІЗ
        this.showAnalysisDashboard();
        
        // ПЕРЕВІРИТИ КНОПКУ АНАЛІЗУ
        this.updateAnalysisButton();
        
        console.log('🔥 CLIENT SELECTION COMPLETE!');
        return true;
    },
    
    // 5. ОНОВИТИ ВІДОБРАЖЕННЯ ВИБОРУ
    updateClientSelection() {
        console.log('🔥 Updating client selection UI...');
        
        // ОНОВИТИ ПІДСВІЧУВАННЯ
        document.querySelectorAll('.client-item').forEach(item => {
            const clientId = parseInt(item.dataset.clientId);
            const isSelected = window.SIMPLE_STATE.currentClient?.id === clientId;
            item.classList.toggle('active', isSelected);
        });
        
        // ОНОВИТИ НАВІГАЦІЮ
        this.updateNavigation();
    },
    
    // 6. ПОКАЗАТИ DASHBOARD АНАЛІЗУ
    showAnalysisDashboard() {
        console.log('🔥 Showing analysis dashboard...');
        
        // ПРИХОВАТИ ВСІ СЕКЦІЇ
        const sections = ['welcome-screen', 'client-form', 'analysis-dashboard'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = sectionId === 'analysis-dashboard' ? 'block' : 'none';
            }
        });
        
        // ПОКАЗАТИ ІНФОРМАЦІЮ ПРО КЛІЄНТА В DASHBOARD
        this.showClientInfo();
    },
    
    // 7. ПОКАЗАТИ ІНФОРМАЦІЮ ПРО КЛІЄНТА
    showClientInfo() {
        const client = window.SIMPLE_STATE.currentClient;
        if (!client) return;
        
        console.log('🔥 Showing client info for:', client.company);
        
        // ЗНАЙТИ АБО СТВОРИТИ БЛОК ІНФОРМАЦІЇ ПРО КЛІЄНТА
        let clientInfo = document.getElementById('current-client-info');
        if (!clientInfo) {
            // СТВОРИТИ БЛОК ЯКЩО НЕ ІСНУЄ
            const dashboard = document.getElementById('analysis-dashboard');
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
    },
    
    // 8. ОНОВИТИ КНОПКУ АНАЛІЗУ
    updateAnalysisButton() {
        console.log('🔥 Updating analysis button...');
        
        const analysisBtn = document.getElementById('start-analysis-btn');
        const textArea = document.getElementById('negotiation-text');
        
        if (analysisBtn) {
            const hasClient = !!window.SIMPLE_STATE.currentClient;
            const hasText = textArea?.value?.trim()?.length >= 20;
            
            analysisBtn.disabled = !hasClient || !hasText;
            window.SIMPLE_STATE.isAnalysisEnabled = hasClient && hasText;
            
            console.log('🔥 Analysis button state:', {
                hasClient,
                hasText,
                disabled: analysisBtn.disabled,
                enabled: window.SIMPLE_STATE.isAnalysisEnabled
            });
        }
    },
    
    // 9. ОНОВИТИ НАВІГАЦІЮ
    updateNavigation() {
        const client = window.SIMPLE_STATE.currentClient;
        const navInfo = document.getElementById('nav-client-info');
        
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
    
    // 10. ОНОВИТИ ЛІЧИЛЬНИК
    updateCounter() {
        const counter = document.getElementById('client-count');
        if (counter) {
            counter.textContent = window.SIMPLE_STATE.clients.length;
        }
    },
    
    // 11. КНОПКА "НОВИЙ КЛІЄНТ" В ПУСТОМУ СТАНІ
    setupEmptyButton() {
        const btn = document.getElementById('empty-new-client-btn');
        if (btn) {
            btn.addEventListener('click', () => {
                this.showClientForm();
            });
        }
    },
    
    // 12. ПОКАЗАТИ ФОРМУ КЛІЄНТА
    showClientForm(clientId = null) {
        console.log('🔥 Showing client form...');
        
        const sections = ['welcome-screen', 'client-form', 'analysis-dashboard'];
        sections.forEach(sectionId => {
            const section = document.getElementById(sectionId);
            if (section) {
                section.style.display = sectionId === 'client-form' ? 'block' : 'none';
            }
        });
    },
    
    // 13. ВИДАЛИТИ КЛІЄНТА
    async deleteClient(clientId) {
        const client = window.SIMPLE_STATE.clients.find(c => c.id == clientId);
        if (!client) return;
        
        // ПІДТВЕРДЖЕННЯ
        let confirmed = false;
        if (window.notificationService) {
            confirmed = await window.notificationService.showConfirm(`Видалити клієнта "${client.company}"?`);
        } else {
            confirmed = confirm(`Видалити клієнта "${client.company}"?`);
        }
        
        if (!confirmed) return;
        
        try {
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (response.ok) {
                // ВИДАЛИТИ З ЛОКАЛЬНОГО МАСИВУ
                window.SIMPLE_STATE.clients = window.SIMPLE_STATE.clients.filter(c => c.id !== clientId);
                
                // ЯКЩО ПОТОЧНИЙ КЛІЄНТ ВИДАЛЯЄТЬСЯ
                if (window.SIMPLE_STATE.currentClient?.id === clientId) {
                    window.SIMPLE_STATE.currentClient = null;
                }
                
                // ПЕРЕРЕНДЕРИТИ
                this.renderClients();
                
                console.log('🔥 Client deleted successfully');
            }
        } catch (error) {
            console.error('🔥 Delete error:', error);
        }
    },
    
    // 14. РЕДАГУВАТИ КЛІЄНТА
    editClient(clientId) {
        console.log('🔥 Edit client:', clientId);
        this.showClientForm(clientId);
    },
    
    // 15. ІНІЦІАЛІЗАЦІЯ
    async init() {
        console.log('🔥 SIMPLE CLIENT SYSTEM - INITIALIZING...');
        
        // ЗАВАНТАЖИТИ КЛІЄНТІВ
        await this.loadClients();
        
        // ВСТАНОВИТИ ОБРОБНИК НА ТЕКСТОВЕ ПОЛЕ
        const textArea = document.getElementById('negotiation-text');
        if (textArea) {
            textArea.addEventListener('input', () => {
                this.updateAnalysisButton();
            });
        }
        
        // ВСТАНОВИТИ ОБРОБНИК НА КНОПКУ "НОВИЙ КЛІЄНТ"
        const newClientBtn = document.getElementById('new-client-btn');
        if (newClientBtn) {
            newClientBtn.addEventListener('click', () => {
                this.showClientForm();
            });
        }
        
        console.log('🔥 SIMPLE CLIENT SYSTEM - READY!');
    }
};

// АВТОМАТИЧНА ІНІЦІАЛІЗАЦІЯ
setTimeout(() => {
    window.SIMPLE_CLIENT_SYSTEM.init();
}, 500);

console.log('🔥 SIMPLE CLIENT SYSTEM - LOADED!');