/**
 * МАСТЕР ФІХ - Остаточне рішення всіх проблем
 * Глибоко продуманий код з урахуванням всіх вимог
 */

console.log('🎯 МАСТЕР ФІХ - Ініціалізація...');

// Глобальний стан додатка
window.MASTER_STATE = {
    initialized: false,
    currentClient: null,
    isAnalyzing: false,
    clients: [],
    authStatus: false
};

// Мастер клас для управління всім додатком
class MasterAppController {
    constructor() {
        this.initPromise = null;
        this.eventListeners = new Map();
        this.domObserver = null;
        this.retryCount = 0;
        this.maxRetries = 3;
        
        console.log('🎯 MasterAppController створено');
        this.safeInit();
    }
    
    // Безпечна ініціалізація з повторними спробами
    async safeInit() {
        try {
            if (this.initPromise) return this.initPromise;
            
            this.initPromise = this.performInit();
            await this.initPromise;
            
        } catch (error) {
            console.error('🎯 Ініціалізація не вдалася:', error);
            
            if (this.retryCount < this.maxRetries) {
                this.retryCount++;
                console.log(`🎯 Повторна спроба ${this.retryCount}/${this.maxRetries}`);
                
                setTimeout(() => {
                    this.initPromise = null;
                    this.safeInit();
                }, 2000 * this.retryCount);
            } else {
                this.showCriticalError('Неможливо ініціалізувати додаток');
            }
        }
    }
    
    async performInit() {
        console.log('🎯 Виконання ініціалізації...');
        
        // Очікуємо завантаження DOM
        await this.waitForDOM();
        
        // Очікуємо завантаження всіх залежностей
        await this.waitForDependencies();
        
        // Ініціалізуємо компоненти
        await this.initializeComponents();
        
        // Налаштовуємо event listeners
        this.setupEventListeners();
        
        // Налаштовуємо спостереження за DOM
        this.setupDOMObserver();
        
        // Завантажуємо початкові дані
        await this.loadInitialData();
        
        window.MASTER_STATE.initialized = true;
        console.log('🎯 Мастер система готова!');
    }
    
    waitForDOM() {
        return new Promise((resolve) => {
            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                resolve();
            } else {
                document.addEventListener('DOMContentLoaded', resolve, { once: true });
            }
        });
    }
    
    waitForDependencies() {
        return new Promise((resolve) => {
            const checkDependencies = () => {
                // Перевіряємо, чи завантажені всі необхідні скрипти
                const requiredElements = [
                    '#logout-btn',
                    '#help-toggle', 
                    '#start-analysis-btn',
                    '#analysis-text',
                    '#client-select'
                ];
                
                const allPresent = requiredElements.every(selector => 
                    document.querySelector(selector) !== null
                );
                
                if (allPresent) {
                    resolve();
                } else {
                    setTimeout(checkDependencies, 100);
                }
            };
            
            checkDependencies();
        });
    }
    
    async initializeComponents() {
        console.log('🎯 Ініціалізація компонентів...');
        
        // Ініціалізація кнопок
        this.initializeButtons();
        
        // Ініціалізація форм
        this.initializeForms();
        
        // Ініціалізація модальних вікон
        this.initializeModals();
        
        console.log('🎯 Компоненти ініціалізовані');
    }
    
    initializeButtons() {
        const buttons = [
            {
                selector: '#logout-btn',
                handler: () => this.handleLogout(),
                description: 'Кнопка виходу'
            },
            {
                selector: '#help-toggle',
                handler: () => this.handleHelp(),
                description: 'Кнопка допомоги'
            },
            {
                selector: '#start-analysis-btn',
                handler: () => this.handleStartAnalysis(),
                description: 'Кнопка аналізу'
            },
            {
                selector: '#new-client-btn, .new-client-btn, #welcome-new-client',
                handler: () => this.handleNewClient(),
                description: 'Кнопка нового клієнта'
            },
            {
                selector: '#save-client-btn',
                handler: () => this.handleSaveClient(),
                description: 'Кнопка збереження клієнта'
            },
            {
                selector: '#cancel-client-btn',
                handler: () => this.handleCancelClient(),
                description: 'Кнопка скасування'
            }
        ];
        
        buttons.forEach(({ selector, handler, description }) => {
            this.attachButtonHandler(selector, handler, description);
        });
        
        // Спеціальна обробка для delete кнопок
        this.initializeDeleteButtons();
    }
    
    attachButtonHandler(selector, handler, description) {
        const elements = document.querySelectorAll(selector);
        
        elements.forEach(element => {
            if (!element.hasAttribute('master-attached')) {
                // Видаляємо всі попередні listeners
                const newElement = element.cloneNode(true);
                element.replaceWith(newElement);
                
                // Додаємо новий listener
                newElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log(`🎯 ${description} натиснута`);
                    
                    try {
                        handler();
                    } catch (error) {
                        console.error(`🎯 Помилка в ${description}:`, error);
                        this.showError(`Помилка: ${error.message}`);
                    }
                });
                
                newElement.setAttribute('master-attached', 'true');
                console.log(`🎯 ${description} прив'язана`);
            }
        });
    }
    
    initializeDeleteButtons() {
        const deleteButtons = document.querySelectorAll('.delete-client-btn');
        
        deleteButtons.forEach(button => {
            if (!button.hasAttribute('master-attached')) {
                const clientId = button.dataset.clientId;
                const clientName = button.dataset.clientName || 'клієнта';
                
                const newButton = button.cloneNode(true);
                button.replaceWith(newButton);
                
                newButton.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    
                    console.log(`🎯 Видалення клієнта ${clientId}`);
                    this.handleDeleteClient(clientId, clientName);
                });
                
                newButton.setAttribute('master-attached', 'true');
            }
        });
    }
    
    initializeForms() {
        // Обробка форми клієнта
        const clientForm = document.querySelector('#client-form form, form');
        if (clientForm) {
            clientForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleSaveClient();
            });
        }
    }
    
    initializeModals() {
        // Закриття модальних вікон по ESC
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Закриття модальних вікон по кліку на backdrop
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal') || e.target.classList.contains('modal-backdrop')) {
                this.closeModal(e.target.closest('.modal'));
            }
        });
    }
    
    setupEventListeners() {
        // Глобальні event listeners
        window.addEventListener('error', (e) => this.handleGlobalError(e));
        window.addEventListener('unhandledrejection', (e) => this.handlePromiseRejection(e));
        
        // Network events
        window.addEventListener('online', () => this.handleNetworkOnline());
        window.addEventListener('offline', () => this.handleNetworkOffline());
    }
    
    setupDOMObserver() {
        // Спостерігаємо за змінами DOM для нових кнопок
        this.domObserver = new MutationObserver((mutations) => {
            let needsReinit = false;
            
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.classList?.contains('delete-client-btn') || 
                            node.querySelector?.('.delete-client-btn')) {
                            needsReinit = true;
                        }
                    }
                });
            });
            
            if (needsReinit) {
                setTimeout(() => {
                    console.log('🎯 Реініціалізація нових кнопок');
                    this.initializeDeleteButtons();
                }, 100);
            }
        });
        
        this.domObserver.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    async loadInitialData() {
        try {
            // Завантажуємо список клієнтів
            await this.loadClients();
            
            // Оновлюємо UI
            this.updateUI();
            
        } catch (error) {
            console.error('🎯 Помилка завантаження початкових даних:', error);
        }
    }
    
    // ============ ОБРОБНИКИ ПОДІЙ ============
    
    async handleLogout() {
        console.log('🎯 Обробка виходу з системи');
        
        const confirmed = confirm('Ви впевнені, що хочете вийти із системи?');
        if (!confirmed) return;
        
        try {
            // Очищуємо локальні дані
            localStorage.clear();
            sessionStorage.clear();
            
            // Очищуємо cookies
            document.cookie.split(";").forEach(c => {
                const eqPos = c.indexOf("=");
                const name = eqPos > -1 ? c.substr(0, eqPos) : c;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            });
            
            // API виклик logout
            await fetch('/api/logout', {
                method: 'POST',
                credentials: 'include'
            });
            
        } catch (error) {
            console.error('🎯 Помилка logout API:', error);
        } finally {
            // Перенаправлення незалежно від результату
            window.location.href = '/login';
        }
    }
    
    handleHelp() {
        console.log('🎯 Відображення допомоги');
        
        const onboardingModal = document.getElementById('onboarding-modal');
        if (onboardingModal) {
            onboardingModal.style.display = 'flex';
            onboardingModal.style.zIndex = '10000';
            
            // Фокус на модальному вікні
            onboardingModal.focus();
        } else {
            // Fallback - показуємо alert з інструкціями
            alert(`Інструкція по використанню:
1. Створіть клієнта
2. Введіть текст для аналізу  
3. Натисніть "Почати аналіз"
4. Перегляньте результати`);
        }
    }
    
    async handleStartAnalysis() {
        if (window.MASTER_STATE.isAnalyzing) {
            alert('Аналіз уже виконується. Зачекайте завершення.');
            return;
        }
        
        console.log('🎯 Початок аналізу');
        
        const textArea = document.getElementById('analysis-text');
        const clientSelect = document.getElementById('client-select');
        
        // Валідація
        if (!textArea || !textArea.value.trim()) {
            alert('Введіть текст для аналізу');
            textArea?.focus();
            return;
        }
        
        if (!clientSelect || !clientSelect.value) {
            alert('Оберіть клієнта');
            clientSelect?.focus();
            return;
        }
        
        const text = textArea.value.trim();
        const clientId = parseInt(clientSelect.value);
        
        if (text.length < 20) {
            alert('Текст занадто короткий. Мінімум 20 символів.');
            textArea.focus();
            return;
        }
        
        if (text.length > 100000) {
            alert('Текст занадто довгий. Максимум 100,000 символів.');
            textArea.focus();
            return;
        }
        
        window.MASTER_STATE.isAnalyzing = true;
        
        try {
            await this.performAnalysis(text, clientId);
        } catch (error) {
            console.error('🎯 Помилка аналізу:', error);
            this.showError('Помилка аналізу: ' + error.message);
        } finally {
            window.MASTER_STATE.isAnalyzing = false;
        }
    }
    
    handleNewClient() {
        console.log('🎯 Створення нового клієнта');
        
        const welcomeScreen = document.getElementById('welcome-screen');
        const clientForm = document.getElementById('client-form');
        
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (clientForm) {
            clientForm.style.display = 'block';
            
            // Очищуємо форму
            this.clearClientForm();
            
            // Фокус на першому полі
            const firstField = clientForm.querySelector('input, textarea, select');
            if (firstField) firstField.focus();
        }
    }
    
    async handleSaveClient() {
        console.log('🎯 Збереження клієнта');
        
        const clientData = this.getClientFormData();
        
        if (!clientData.company?.trim()) {
            alert('Назва компанії є обов\'язковою');
            const companyField = document.getElementById('company');
            if (companyField) companyField.focus();
            return;
        }
        
        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(clientData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert('Клієнт збережений успішно!');
                await this.loadClients();
                this.showWelcomeScreen();
            } else {
                throw new Error(result.error || 'Помилка збереження');
            }
            
        } catch (error) {
            console.error('🎯 Помилка збереження клієнта:', error);
            alert('Помилка збереження клієнта: ' + error.message);
        }
    }
    
    handleCancelClient() {
        console.log('🎯 Скасування створення клієнта');
        
        const hasData = this.checkClientFormHasData();
        
        if (hasData) {
            const confirmed = confirm('Скасувати створення клієнта? Незбережені дані будуть втрачені.');
            if (!confirmed) return;
        }
        
        this.showWelcomeScreen();
    }
    
    async handleDeleteClient(clientId, clientName) {
        console.log(`🎯 Видалення клієнта ${clientId}`);
        
        const confirmed = confirm(`Ви впевнені, що хочете видалити клієнта "${clientName}"?\n\nЦя дія незворотна.`);
        if (!confirmed) return;
        
        try {
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert('Клієнт видалений успішно');
                await this.loadClients();
                this.updateUI();
            } else {
                throw new Error(result.error || 'Помилка видалення');
            }
            
        } catch (error) {
            console.error('🎯 Помилка видалення клієнта:', error);
            alert('Помилка видалення клієнта: ' + error.message);
        }
    }
    
    // ============ АНАЛІЗ ТЕКСТУ ============
    
    async performAnalysis(text, clientId) {
        console.log('🎯 Виконання аналізу тексту...');
        
        // Показуємо прогрес
        this.showAnalysisProgress();
        
        try {
            const formData = new FormData();
            formData.append('client_id', clientId.toString());
            formData.append('text', text);
            formData.append('method', 'text');
            
            // Додаємо профіль клієнта якщо доступний
            const clientProfile = this.getCurrentClientProfile(clientId);
            if (clientProfile) {
                formData.append('profile', JSON.stringify(clientProfile));
            }
            
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, 600000); // 10 хвилин
            
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData,
                credentials: 'include',
                signal: controller.signal
            });
            
            clearTimeout(timeoutId);
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            await this.processAnalysisStream(response);
            
        } catch (error) {
            if (error.name === 'AbortError') {
                throw new Error('Аналіз перервано через тайм-аут. Спробуйте з коротшим текстом.');
            }
            throw error;
        }
    }
    
    async processAnalysisStream(response) {
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        let highlights = [];
        let currentProgress = 0;
        let failedChunks = 0;
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) break;
                
                buffer += decoder.decode(value, { stream: true });
                
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            await this.handleAnalysisData(data, highlights, currentProgress, failedChunks);
                        } catch (parseError) {
                            console.warn('🎯 Помилка парсингу SSE:', parseError);
                        }
                    }
                }
            }
        } finally {
            reader.releaseLock();
        }
        
        // Відображаємо результати
        this.displayAnalysisResults(highlights);
    }
    
    async handleAnalysisData(data, highlights, currentProgress, failedChunks) {
        switch (data.type) {
            case 'progress':
            case 'analysis_started':
                currentProgress = Math.min(currentProgress + 5, 90);
                this.updateAnalysisProgress(currentProgress, data.message || 'Аналізую...');
                break;
                
            case 'highlight':
                highlights.push(data);
                this.updateAnalysisProgress(
                    currentProgress,
                    `Знайдено ${highlights.length} проблемних моментів...`
                );
                break;
                
            case 'merged_highlights':
                if (data.items && Array.isArray(data.items)) {
                    highlights.splice(0, highlights.length, ...data.items);
                }
                break;
                
            case 'summary':
                this.displayAnalysisSummary(data);
                break;
                
            case 'barometer':
                this.displayAnalysisBarometer(data);
                break;
                
            case 'complete':
                this.updateAnalysisProgress(100, 'Аналіз завершено!');
                break;
                
            case 'error':
                if (data.chunkNumber) {
                    failedChunks++;
                    console.warn(`🎯 Chunk ${data.chunkNumber} failed: ${data.message}`);
                    // Продовжуємо аналіз інших chunks
                } else {
                    throw new Error(data.message || 'Помилка аналізу');
                }
                break;
        }
    }
    
    // ============ УТІЛІТИ ============
    
    getClientFormData() {
        const formData = {};
        
        const fields = [
            'company', 'negotiator', 'sector', 'goal', 
            'decision_criteria', 'constraints', 'user_goals', 
            'client_goals', 'weekly_hours', 'offered_services',
            'deadlines', 'notes'
        ];
        
        fields.forEach(fieldName => {
            const field = document.getElementById(fieldName) || 
                         document.querySelector(`[name="${fieldName}"]`);
            
            if (field) {
                if (fieldName === 'weekly_hours') {
                    formData[fieldName] = parseInt(field.value) || 0;
                } else {
                    formData[fieldName] = field.value.trim();
                }
            }
        });
        
        return formData;
    }
    
    clearClientForm() {
        const form = document.getElementById('client-form');
        if (form) {
            const fields = form.querySelectorAll('input, textarea, select');
            fields.forEach(field => {
                field.value = '';
            });
        }
    }
    
    checkClientFormHasData() {
        const formData = this.getClientFormData();
        return Object.values(formData).some(value => 
            value && value.toString().trim() !== '' && value !== 0
        );
    }
    
    getCurrentClientProfile(clientId) {
        const client = window.MASTER_STATE.clients.find(c => c.id == clientId);
        if (!client) return null;
        
        return {
            company: client.company || '',
            negotiator: client.negotiator || '',
            sector: client.sector || '',
            goal: client.goal || '',
            criteria: client.decision_criteria || '',
            constraints: client.constraints || ''
        };
    }
    
    async loadClients() {
        try {
            const response = await fetch('/api/clients', {
                credentials: 'include'
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                window.MASTER_STATE.clients = result.clients || [];
                this.updateClientSelect();
            }
            
        } catch (error) {
            console.error('🎯 Помилка завантаження клієнтів:', error);
        }
    }
    
    // ============ UI МЕТОДИ ============
    
    showWelcomeScreen() {
        const welcomeScreen = document.getElementById('welcome-screen');
        const clientForm = document.getElementById('client-form');
        const analysisDashboard = document.getElementById('analysis-dashboard');
        
        if (welcomeScreen) welcomeScreen.style.display = 'block';
        if (clientForm) clientForm.style.display = 'none';
        if (analysisDashboard) analysisDashboard.style.display = 'none';
    }
    
    showAnalysisProgress() {
        const progressSection = document.querySelector('.analysis-progress');
        const resultsSection = document.getElementById('analysis-results');
        
        if (progressSection) progressSection.style.display = 'block';
        if (resultsSection) resultsSection.style.display = 'block';
        
        this.updateAnalysisProgress(0, 'Підготовка до аналізу...');
    }
    
    updateAnalysisProgress(percentage, message) {
        const progressBar = document.getElementById('live-progress-percentage');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar) progressBar.textContent = Math.round(percentage) + '%';
        if (progressText) progressText.textContent = message;
    }
    
    displayAnalysisResults(highlights) {
        console.log(`🎯 Відображення ${highlights.length} результатів аналізу`);
        
        const resultsContainer = document.getElementById('highlights-list');
        if (!resultsContainer) return;
        
        if (highlights.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-check-circle"></i>
                    <h3>Проблемних моментів не знайдено</h3>
                    <p>Текст виглядає чистим від маніпулятивних технік</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = highlights.map((highlight, index) => `
            <div class="highlight-item ${highlight.category || 'manipulation'}" data-index="${index}">
                <div class="highlight-header">
                    <span class="highlight-number">#${index + 1}</span>
                    <span class="highlight-label">${highlight.label || `Проблема ${index + 1}`}</span>
                    <span class="highlight-category ${highlight.category}">
                        ${this.getCategoryDisplayName(highlight.category)}
                    </span>
                    <span class="highlight-severity severity-${highlight.severity || 1}">
                        Рівень ${highlight.severity || 1}
                    </span>
                </div>
                <div class="highlight-content">
                    <div class="highlight-text">"${this.escapeHtml(highlight.text)}"</div>
                    <div class="highlight-explanation">${this.escapeHtml(highlight.explanation || 'Немає пояснення')}</div>
                </div>
            </div>
        `).join('');
        
        // Оновлюємо лічильники
        this.updateResultsCounters(highlights);
    }
    
    getCategoryDisplayName(category) {
        const names = {
            'manipulation': 'Маніпуляція',
            'cognitive_bias': 'Когнітивне упередження', 
            'rhetological_fallacy': 'Логічна помилка'
        };
        return names[category] || 'Невизначено';
    }
    
    updateResultsCounters(highlights) {
        const totalElement = document.getElementById('total-highlights-count');
        if (totalElement) totalElement.textContent = highlights.length;
        
        // Підрахунки по категоріях
        const counters = {
            manipulation: 0,
            cognitive_bias: 0,
            rhetological_fallacy: 0
        };
        
        highlights.forEach(h => {
            if (counters.hasOwnProperty(h.category)) {
                counters[h.category]++;
            }
        });
        
        Object.keys(counters).forEach(category => {
            const element = document.getElementById(`${category}-count`);
            if (element) element.textContent = counters[category];
        });
    }
    
    updateClientSelect() {
        const clientSelect = document.getElementById('client-select');
        if (!clientSelect) return;
        
        const currentValue = clientSelect.value;
        
        clientSelect.innerHTML = '<option value="">Оберіть клієнта...</option>' +
            window.MASTER_STATE.clients.map(client => 
                `<option value="${client.id}">${this.escapeHtml(client.company)}</option>`
            ).join('');
        
        // Відновлюємо попереднє значення якщо можливо
        if (currentValue) {
            clientSelect.value = currentValue;
        }
    }
    
    updateUI() {
        this.updateClientSelect();
        // Інші оновлення UI за потреби
    }
    
    // ============ МОДАЛЬНІ ВІКНА ============
    
    closeAllModals() {
        const modals = document.querySelectorAll('.modal');
        modals.forEach(modal => {
            if (modal.style.display !== 'none') {
                this.closeModal(modal);
            }
        });
    }
    
    closeModal(modal) {
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    // ============ ОБРОБКА ПОМИЛОК ============
    
    handleGlobalError(errorEvent) {
        console.error('🎯 Глобальна помилка:', errorEvent.error);
        
        // Не показуємо критичну помилку для деяких типів помилок
        const ignorableErrors = [
            'Script error',
            'Non-Error promise rejection captured',
            'ResizeObserver loop limit exceeded'
        ];
        
        if (ignorableErrors.some(err => errorEvent.message?.includes(err))) {
            return;
        }
        
        // Логуємо помилку але не переривуємо роботу додатка
        this.logError('Global Error', errorEvent.error);
    }
    
    handlePromiseRejection(rejectionEvent) {
        console.error('🎯 Необроблене відхилення Promise:', rejectionEvent.reason);
        
        // Не показуємо помилку для AbortError
        if (rejectionEvent.reason?.name === 'AbortError') {
            rejectionEvent.preventDefault();
            return;
        }
        
        this.logError('Promise Rejection', rejectionEvent.reason);
        rejectionEvent.preventDefault();
    }
    
    handleNetworkOnline() {
        console.log('🎯 Мережа відновлена');
        this.showNotification('З\'єднання відновлено', 'success');
    }
    
    handleNetworkOffline() {
        console.log('🎯 Мережа втрачена');
        this.showNotification('Відсутнє з\'єднання з інтернетом', 'warning');
    }
    
    async logError(type, error) {
        try {
            await fetch('/api/log-error', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    type,
                    error: error?.message || error?.toString() || 'Unknown error',
                    stack: error?.stack,
                    timestamp: new Date().toISOString(),
                    userAgent: navigator.userAgent,
                    url: window.location.href
                })
            });
        } catch (logError) {
            console.error('🎯 Помилка логування:', logError);
        }
    }
    
    // ============ ПОВІДОМЛЕННЯ ============
    
    showError(message) {
        alert('❌ Помилка: ' + message);
    }
    
    showNotification(message, type = 'info') {
        console.log(`🎯 ${type.toUpperCase()}: ${message}`);
        
        // Можна додати toast notifications тут
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed; top: 20px; right: 20px; z-index: 10001;
            background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white; padding: 12px 16px; border-radius: 4px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.remove();
        }, 5000);
    }
    
    showCriticalError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.innerHTML = `
            <div style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; 
                        background: rgba(0,0,0,0.9); color: white; z-index: 10002;
                        display: flex; align-items: center; justify-content: center; font-family: Arial;">
                <div style="text-align: center; padding: 2rem; background: rgba(255,255,255,0.1); 
                            border-radius: 8px; max-width: 500px;">
                    <h2 style="color: #ff6b6b; margin-bottom: 1rem;">⚠️ Критична помилка</h2>
                    <p style="margin-bottom: 2rem; line-height: 1.5;">${message}</p>
                    <button onclick="window.location.reload()" 
                            style="background: #4CAF50; color: white; border: none; 
                                   padding: 12px 24px; border-radius: 4px; cursor: pointer; 
                                   font-size: 16px; margin-right: 10px;">
                        Перезавантажити
                    </button>
                    <button onclick="this.closest('div').remove()" 
                            style="background: #666; color: white; border: none; 
                                   padding: 12px 24px; border-radius: 4px; cursor: pointer; 
                                   font-size: 16px;">
                        Закрити
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(errorDiv);
    }
    
    // ============ УТІЛІТИ ============
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    destroy() {
        if (this.domObserver) {
            this.domObserver.disconnect();
        }
        
        // Очищуємо event listeners
        this.eventListeners.forEach((listener, element) => {
            element.removeEventListener(listener.event, listener.handler);
        });
        
        window.MASTER_STATE.initialized = false;
    }
}

// Запуск мастер системи
console.log('🎯 Запуск мастер системи...');

window.addEventListener('DOMContentLoaded', () => {
    // Даємо час іншим скриптам завантажитися
    setTimeout(() => {
        console.log('🎯 Ініціалізація MasterAppController...');
        
        try {
            window.masterApp = new MasterAppController();
            console.log('🎯 🚀 МАСТЕР СИСТЕМА АКТИВНА! 🚀');
        } catch (error) {
            console.error('🎯 Критична помилка ініціалізації мастер системи:', error);
        }
    }, 1500);
});

console.log('🎯 Мастер ФІХ завантажений і готовий до роботи!');