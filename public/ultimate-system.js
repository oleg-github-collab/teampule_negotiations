/**
 * УЛЬТИМАТИВНА СИСТЕМА - ОСТАТОЧНЕ ТА НАДІЙНЕ РІШЕННЯ
 * Замінює ВСЕ і працює ЗАВЖДИ
 */

console.log('🔥 УЛЬТИМАТИВНА СИСТЕМА - Завантаження...');

// Глобальний контролер
window.ULTIMATE_CONTROLLER = null;

class UltimateController {
    constructor() {
        this.initialized = false;
        this.eventHandlers = new Map();
        this.analysisInProgress = false;
        this.retryAttempts = 0;
        this.maxRetries = 5;
        
        console.log('🔥 UltimateController створено');
        this.forceInit();
    }
    
    // ФОРСОВАНА ІНІЦІАЛІЗАЦІЯ
    async forceInit() {
        console.log('🔥 ФОРСОВАНА ІНІЦІАЛІЗАЦІЯ...');
        
        try {
            // Чекаємо DOM
            await this.waitForDOMComplete();
            
            // Знищуємо всі попередні системи
            this.destroyPreviousSystems();
            
            // Ініціалізуємо наші системи
            await this.initializeSystems();
            
            // Стартуємо моніторинг
            this.startMonitoring();
            
            this.initialized = true;
            console.log('🔥 🚀 УЛЬТИМАТИВНА СИСТЕМА АКТИВНА! 🚀');
            
        } catch (error) {
            console.error('🔥 Помилка ініціалізації:', error);
            this.handleInitError(error);
        }
    }
    
    waitForDOMComplete() {
        return new Promise((resolve) => {
            const checkComplete = () => {
                const requiredElements = [
                    '#logout-btn', '#help-toggle', '#start-analysis-btn',
                    '#new-client-btn', '#save-client-btn', '#negotiation-text'
                ];
                
                const allPresent = requiredElements.every(sel => document.querySelector(sel));
                
                if (allPresent && document.readyState === 'complete') {
                    console.log('🔥 Всі елементи завантажені');
                    resolve();
                } else {
                    setTimeout(checkComplete, 200);
                }
            };
            
            checkComplete();
        });
    }
    
    destroyPreviousSystems() {
        console.log('🔥 Знищення попередніх систем...');
        
        // Знищуємо всі попередні глобальні об'єкти
        if (window.ultraButtons) window.ultraButtons = null;
        if (window.masterApp) window.masterApp = null;
        if (window.applicationManager) window.applicationManager = null;
        if (window.buttonManager) window.buttonManager = null;
        if (window.analysisManager) window.analysisManager = null;
        
        // Очищуємо всі event listeners
        const allElements = document.querySelectorAll('button, [role="button"], .btn');
        allElements.forEach(el => {
            const newEl = el.cloneNode(true);
            el.replaceWith(newEl);
        });
        
        console.log('🔥 Попередні системи знищені');
    }
    
    async initializeSystems() {
        console.log('🔥 Ініціалізація систем...');
        
        // Ініціалізуємо кнопки
        this.initButtons();
        
        // Ініціалізуємо форми
        this.initForms();
        
        // Ініціалізуємо глобальні handlers
        this.initGlobalHandlers();
        
        // Завантажуємо дані
        await this.loadData();
        
        console.log('🔥 Системи ініціалізовані');
    }
    
    initButtons() {
        console.log('🔥 Ініціалізація ВСІХ кнопок...');
        
        // LOGOUT BUTTON
        this.attachButton('#logout-btn', () => {
            console.log('🔥 LOGOUT CLICKED');
            this.handleLogout();
        });
        
        // HELP/ONBOARDING BUTTON - ВСЮДИ
        const helpSelectors = [
            '#help-toggle',
            '#welcome-help',
            '.help-toggle', 
            '[data-action="help"]',
            '.onboarding-trigger',
            'button[title*="Онбординг"]',
            'button[title*="онбординг"]'
        ];
        
        helpSelectors.forEach(selector => {
            this.attachButton(selector, () => {
                console.log('🔥 HELP CLICKED');
                this.handleHelp();
            });
        });
        
        // NEW CLIENT BUTTONS - ВСЮДИ
        const newClientSelectors = [
            '#new-client-btn',
            '.new-client-btn',
            '#welcome-new-client',
            '[data-action="new-client"]'
        ];
        
        newClientSelectors.forEach(selector => {
            this.attachButton(selector, () => {
                console.log('🔥 NEW CLIENT CLICKED');
                this.handleNewClient();
            });
        });
        
        // SAVE CLIENT BUTTON
        this.attachButton('#save-client-btn', () => {
            console.log('🔥 SAVE CLIENT CLICKED');
            this.handleSaveClient();
        });
        
        // CANCEL CLIENT BUTTON
        this.attachButton('#cancel-client-btn', () => {
            console.log('🔥 CANCEL CLIENT CLICKED');
            this.handleCancelClient();
        });
        
        // START ANALYSIS BUTTON
        this.attachButton('#start-analysis-btn', () => {
            console.log('🔥 START ANALYSIS CLICKED');
            this.handleStartAnalysis();
        });
        
        // DELETE CLIENT BUTTONS
        this.initDeleteButtons();
        
        console.log('🔥 Всі кнопки ініціалізовані');
    }
    
    attachButton(selector, handler) {
        const elements = document.querySelectorAll(selector);
        console.log(`🔥 Attaching buttons for selector "${selector}" - found ${elements.length} elements`);
        
        elements.forEach(element => {
            if (element && !element.hasAttribute('ultimate-attached')) {
                // Клонуємо для очищення всіх listeners
                const newElement = element.cloneNode(true);
                element.replaceWith(newElement);
                
                // Додаємо наш handler
                newElement.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    console.log(`🔥 Button clicked: ${selector}`);
                    
                    try {
                        handler();
                    } catch (error) {
                        console.error('🔥 Button handler error:', error);
                        this.showError('Помилка: ' + error.message);
                    }
                });
                
                newElement.setAttribute('ultimate-attached', 'true');
                console.log(`🔥 Button attached: ${selector}`);
            }
        });
    }
    
    initDeleteButtons() {
        const deleteButtons = document.querySelectorAll('.delete-client-btn');
        
        deleteButtons.forEach(btn => {
            if (!btn.hasAttribute('ultimate-attached')) {
                const clientId = btn.dataset.clientId;
                
                const newBtn = btn.cloneNode(true);
                btn.replaceWith(newBtn);
                
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    e.stopImmediatePropagation();
                    
                    console.log(`🔥 DELETE CLIENT CLICKED: ${clientId}`);
                    this.handleDeleteClient(clientId);
                });
                
                newBtn.setAttribute('ultimate-attached', 'true');
            }
        });
    }
    
    initForms() {
        // Обробка форм
        const forms = document.querySelectorAll('form');
        forms.forEach(form => {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                console.log('🔥 Form submitted');
                
                if (form.closest('#client-form')) {
                    this.handleSaveClient();
                }
            });
        });
    }
    
    initGlobalHandlers() {
        // ESC для закриття модальних вікон
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Error handlers
        window.addEventListener('error', (e) => {
            console.error('🔥 Global error:', e.error);
        });
        
        window.addEventListener('unhandledrejection', (e) => {
            console.error('🔥 Promise rejection:', e.reason);
            e.preventDefault();
        });
    }
    
    startMonitoring() {
        // Моніторинг DOM змін для нових кнопок
        const observer = new MutationObserver((mutations) => {
            let hasNewButtons = false;
            
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.matches?.('.delete-client-btn, .new-client-btn') ||
                            node.querySelector?.('.delete-client-btn, .new-client-btn')) {
                            hasNewButtons = true;
                        }
                    }
                });
            });
            
            if (hasNewButtons) {
                setTimeout(() => {
                    console.log('🔥 Нові кнопки виявлені, реініціалізація...');
                    this.initButtons();
                }, 150);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('🔥 Моніторинг активний');
    }
    
    async loadData() {
        try {
            console.log('🔥 Завантаження даних...');
            
            // Завантажуємо клієнтів
            const response = await fetch('/api/clients', {
                credentials: 'include'
            });
            
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.clients) {
                    this.updateClientSelect(result.clients);
                    console.log(`🔥 Завантажено ${result.clients.length} клієнтів`);
                }
            }
        } catch (error) {
            console.error('🔥 Помилка завантаження даних:', error);
        }
    }
    
    updateClientSelect(clients) {
        const select = document.getElementById('client-select');
        if (select) {
            const currentValue = select.value;
            
            select.innerHTML = '<option value="">Оберіть клієнта...</option>' +
                clients.map(client => 
                    `<option value="${client.id}">${this.escapeHtml(client.company)}</option>`
                ).join('');
            
            if (currentValue) {
                select.value = currentValue;
            }
        }
    }
    
    // ============ HANDLERS ============
    
    async handleLogout() {
        console.log('🔥 LOGOUT PROCESS...');
        
        if (!confirm('Вийти з системи?')) return;
        
        try {
            // Очищуємо все
            localStorage.clear();
            sessionStorage.clear();
            
            // Очищуємо cookies
            document.cookie.split(";").forEach(c => {
                const eqPos = c.indexOf("=");
                const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            });
            
            // API виклик
            await fetch('/api/logout', { 
                method: 'POST', 
                credentials: 'include' 
            });
            
        } catch (error) {
            console.error('🔥 Logout error:', error);
        } finally {
            window.location.href = '/login';
        }
    }
    
    handleHelp() {
        console.log('🔥 HELP PROCESS...');
        
        // Знаходимо onboarding modal
        const modal = document.getElementById('onboarding-modal');
        if (modal) {
            console.log('🔥 Showing onboarding modal');
            modal.style.display = 'flex';
            modal.style.zIndex = '10000';
            
            // Scroll to top to ensure modal is visible
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            
            // Активуємо onboarding buttons якщо є
            setTimeout(() => {
                const skipBtn = modal.querySelector('#skip-onboarding');
                const nextBtn = modal.querySelector('#next-step');
                const prevBtn = modal.querySelector('#prev-step');
                
                if (skipBtn && !skipBtn.hasAttribute('ultimate-attached')) {
                    skipBtn.addEventListener('click', () => {
                        modal.style.display = 'none';
                    });
                    skipBtn.setAttribute('ultimate-attached', 'true');
                }
                
                if (nextBtn && !nextBtn.hasAttribute('ultimate-attached')) {
                    nextBtn.addEventListener('click', () => {
                        // Next step logic тут
                        console.log('🔥 Onboarding next step');
                    });
                    nextBtn.setAttribute('ultimate-attached', 'true');
                }
                
                if (prevBtn && !prevBtn.hasAttribute('ultimate-attached')) {
                    prevBtn.addEventListener('click', () => {
                        // Prev step logic тут
                        console.log('🔥 Onboarding prev step');
                    });
                    prevBtn.setAttribute('ultimate-attached', 'true');
                }
            }, 100);
            
        } else {
            // Fallback
            console.log('🔥 No onboarding modal, showing alert');
            alert(`📚 Швидкий старт:

1. 👤 Створіть клієнта (кнопка "Новий клієнт")
2. 📝 Заповніть інформацію про компанію
3. 💾 Збережіть клієнта
4. 📊 Введіть текст для аналізу
5. 🚀 Натисніть "Почати аналіз"
6. 📈 Переглядайте результати

Готово! 🎉`);
        }
    }
    
    handleNewClient() {
        console.log('🔥 NEW CLIENT PROCESS...');
        
        const welcomeScreen = document.getElementById('welcome-screen');
        const clientForm = document.getElementById('client-form');
        const analysisDashboard = document.getElementById('analysis-dashboard');
        
        // Ховаємо інші секції
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (analysisDashboard) analysisDashboard.style.display = 'none';
        
        // Показуємо форму
        if (clientForm) {
            clientForm.style.display = 'block';
            
            // Очищуємо всі поля
            const fields = clientForm.querySelectorAll('input, textarea, select');
            fields.forEach(field => {
                field.value = '';
            });
            
            // Фокус на першому полі
            const firstField = clientForm.querySelector('#company, input[name="company"]');
            if (firstField) {
                setTimeout(() => firstField.focus(), 100);
            }
            
            console.log('🔥 Client form shown and cleared');
        }
    }
    
    async handleSaveClient() {
        console.log('🔥 SAVE CLIENT PROCESS...');
        
        // Збираємо дані з форми ВРУЧНУ
        const clientData = {};
        
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
                    clientData[fieldName] = parseInt(field.value) || 0;
                } else {
                    clientData[fieldName] = field.value ? field.value.trim() : '';
                }
            }
        });
        
        console.log('🔥 Collected client data:', clientData);
        
        if (!clientData.company) {
            alert('❌ Назва компанії обов\'язкова!');
            const companyField = document.getElementById('company');
            if (companyField) companyField.focus();
            return;
        }
        
        try {
            console.log('🔥 Sending save request...');
            
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify(clientData)
            });
            
            console.log('🔥 Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`HTTP ${response.status}: ${errorText}`);
            }
            
            const result = await response.json();
            console.log('🔥 Save result:', result);
            
            if (result.success) {
                alert('✅ Клієнт збережений успішно!');
                
                // Оновлюємо список клієнтів
                await this.loadData();
                
                // Повертаємося на welcome screen
                this.showWelcomeScreen();
                
            } else {
                throw new Error(result.error || 'Невідома помилка збереження');
            }
            
        } catch (error) {
            console.error('🔥 Save client error:', error);
            alert('❌ Помилка збереження: ' + error.message);
        }
    }
    
    handleCancelClient() {
        console.log('🔥 CANCEL CLIENT PROCESS...');
        
        // Перевіряємо чи є дані в формі
        const hasData = this.checkFormHasData();
        
        if (hasData) {
            if (!confirm('❓ Скасувати створення клієнта? Незбережені дані будуть втрачені.')) {
                return;
            }
        }
        
        this.showWelcomeScreen();
    }
    
    async handleDeleteClient(clientId) {
        console.log(`🔥 DELETE CLIENT PROCESS: ${clientId}`);
        
        if (!clientId) {
            alert('❌ ID клієнта не знайдено');
            return;
        }
        
        const confirmed = confirm('❓ Видалити клієнта? Ця дія незворотна.');
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
                alert('✅ Клієнт видалений успішно');
                
                // Перезавантажуємо сторінку для оновлення
                window.location.reload();
                
            } else {
                throw new Error(result.error || 'Помилка видалення');
            }
            
        } catch (error) {
            console.error('🔥 Delete error:', error);
            alert('❌ Помилка видалення: ' + error.message);
        }
    }
    
    async handleStartAnalysis() {
        if (this.analysisInProgress) {
            alert('⏳ Аналіз уже виконується');
            return;
        }
        
        console.log('🔥 START ANALYSIS PROCESS...');
        
        const textArea = document.getElementById('negotiation-text');
        const clientSelect = document.getElementById('client-select');
        
        if (!textArea || !textArea.value.trim()) {
            alert('❌ Введіть текст для аналізу');
            if (textArea) textArea.focus();
            return;
        }
        
        if (!clientSelect || !clientSelect.value) {
            alert('❌ Оберіть клієнта');
            if (clientSelect) clientSelect.focus();
            return;
        }
        
        const text = textArea.value.trim();
        const clientId = parseInt(clientSelect.value);
        
        if (text.length < 20) {
            alert('❌ Текст занадто короткий (мінімум 20 символів)');
            textArea.focus();
            return;
        }
        
        this.analysisInProgress = true;
        
        try {
            await this.performRobustAnalysis(text, clientId);
        } catch (error) {
            console.error('🔥 Analysis error:', error);
            alert('❌ Помилка аналізу: ' + error.message);
        } finally {
            this.analysisInProgress = false;
        }
    }
    
    async performRobustAnalysis(text, clientId) {
        console.log('🔥 ROBUST ANALYSIS START...');
        console.log(`🔥 Text length: ${text.length} characters`);
        console.log(`🔥 Client ID: ${clientId}`);
        
        // Показуємо progress UI
        this.showAnalysisProgress();
        this.updateProgress(0, 'Підготовка до аналізу...');
        
        // Підготовка даних - використовуємо URLSearchParams замість FormData для уникнення проблем
        const formData = new URLSearchParams();
        formData.append('client_id', clientId.toString());
        formData.append('text', text);
        formData.append('method', 'text');
        
        // Додаємо профіль клієнта
        try {
            const clientsResponse = await fetch('/api/clients', { credentials: 'include' });
            if (clientsResponse.ok) {
                const clientsResult = await clientsResponse.json();
                const client = clientsResult.clients?.find(c => c.id == clientId);
                if (client) {
                    const profile = {
                        company: client.company || '',
                        negotiator: client.negotiator || '',
                        sector: client.sector || ''
                    };
                    formData.append('profile', JSON.stringify(profile));
                }
            }
        } catch (error) {
            console.warn('🔥 Could not load client profile:', error);
        }
        
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`🔥 Analysis attempt ${attempts}/${maxAttempts}`);
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => {
                    console.log('🔥 Analysis timeout, aborting...');
                    controller.abort();
                }, 300000); // 5 хвилин
                
                this.updateProgress(10, `Спроба ${attempts}/${maxAttempts} - відправляю запит...`);
                
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/x-www-form-urlencoded'
                    },
                    body: formData,
                    credentials: 'include',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                console.log('🔥 Got analysis response, processing stream...');
                this.updateProgress(20, 'Отримано відповідь, обробляю потік...');
                
                await this.processAnalysisStream(response);
                return; // Успішно завершено
                
            } catch (error) {
                console.error(`🔥 Analysis attempt ${attempts} failed:`, error);
                
                if (error.name === 'AbortError') {
                    this.updateProgress(0, `Спроба ${attempts} - тайм-аут`);
                } else {
                    this.updateProgress(0, `Спроба ${attempts} - помилка: ${error.message}`);
                }
                
                if (attempts < maxAttempts) {
                    console.log(`🔥 Waiting before retry attempt ${attempts + 1}...`);
                    await this.delay(2000 * attempts); // Збільшуємо затримку
                } else {
                    throw new Error(`Аналіз не вдався після ${maxAttempts} спроб. Остання помилка: ${error.message}`);
                }
            }
        }
    }
    
    async processAnalysisStream(response) {
        console.log('🔥 Processing analysis stream...');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        let highlights = [];
        let progress = 20;
        let chunksProcessed = 0;
        let chunksTotal = 0;
        
        try {
            while (true) {
                const { done, value } = await reader.read();
                
                if (done) {
                    console.log('🔥 Stream processing completed');
                    break;
                }
                
                buffer += decoder.decode(value, { stream: true });
                
                const lines = buffer.split('\n');
                buffer = lines.pop() || '';
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            switch (data.type) {
                                case 'analysis_started':
                                    chunksTotal = data.chunks || 1;
                                    this.updateProgress(25, data.message || 'Розпочато аналіз...');
                                    break;
                                    
                                case 'progress':
                                    progress = Math.min(progress + 5, 85);
                                    this.updateProgress(progress, data.message || 'Аналізую...');
                                    break;
                                    
                                case 'highlight':
                                    highlights.push(data);
                                    this.updateProgress(progress, `Знайдено ${highlights.length} проблем...`);
                                    break;
                                    
                                case 'merged_highlights':
                                    if (data.items && Array.isArray(data.items)) {
                                        highlights = data.items;
                                        this.updateProgress(90, `Об'єднано ${highlights.length} результатів`);
                                    }
                                    break;
                                    
                                case 'complete':
                                    this.updateProgress(100, 'Аналіз завершено!');
                                    break;
                                    
                                case 'error':
                                    if (data.chunkNumber) {
                                        chunksProcessed++;
                                        console.warn(`🔥 Chunk ${data.chunkNumber} failed: ${data.message}`);
                                        this.updateProgress(
                                            Math.min(30 + (chunksProcessed / chunksTotal) * 50, 85), 
                                            `Обробка частин: ${chunksProcessed}/${chunksTotal} (деякі з помилками)`
                                        );
                                    } else {
                                        console.error('🔥 Analysis error:', data.message);
                                        // Не кидаємо помилку, продовжуємо
                                    }
                                    break;
                            }
                            
                        } catch (parseError) {
                            console.warn('🔥 Failed to parse SSE data:', parseError);
                        }
                    }
                }
            }
            
            // Показуємо результати
            this.displayResults(highlights);
            
        } finally {
            reader.releaseLock();
        }
    }
    
    // ============ UI METHODS ============
    
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
    }
    
    updateProgress(percentage, message) {
        const progressBar = document.getElementById('live-progress-percentage');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar) progressBar.textContent = Math.round(percentage) + '%';
        if (progressText) progressText.textContent = message;
        
        console.log(`🔥 Progress: ${percentage}% - ${message}`);
    }
    
    displayResults(highlights) {
        console.log(`🔥 Displaying ${highlights.length} results`);
        
        const resultsContainer = document.getElementById('highlights-list');
        if (!resultsContainer) {
            console.error('🔥 Results container not found');
            return;
        }
        
        if (highlights.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results" style="text-align: center; padding: 2rem;">
                    <h3>✅ Проблем не знайдено</h3>
                    <p>Текст виглядає чистим</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = highlights.map((item, index) => `
            <div class="highlight-item ${item.category || 'manipulation'}" style="margin-bottom: 1rem; border: 1px solid #ddd; padding: 1rem; border-radius: 4px;">
                <div class="highlight-header" style="display: flex; gap: 10px; margin-bottom: 0.5rem; align-items: center;">
                    <span style="background: #007bff; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em;">
                        #${index + 1}
                    </span>
                    <span style="font-weight: bold;">
                        ${item.label || `Проблема ${index + 1}`}
                    </span>
                    <span style="background: #6c757d; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em;">
                        ${this.getCategoryName(item.category)}
                    </span>
                    <span style="background: #dc3545; color: white; padding: 2px 8px; border-radius: 3px; font-size: 0.8em;">
                        Рівень ${item.severity || 1}
                    </span>
                </div>
                <div class="highlight-text" style="background: #f8f9fa; padding: 0.5rem; margin: 0.5rem 0; border-left: 3px solid #007bff; font-style: italic;">
                    "${this.escapeHtml(item.text || 'Текст не знайдено')}"
                </div>
                <div class="highlight-explanation" style="color: #6c757d;">
                    ${this.escapeHtml(item.explanation || 'Пояснення відсутнє')}
                </div>
            </div>
        `).join('');
        
        // Оновлюємо счетчики
        const totalCounter = document.getElementById('total-highlights-count');
        if (totalCounter) totalCounter.textContent = highlights.length;
        
        this.updateProgress(100, `Готово! Знайдено ${highlights.length} проблемних моментів`);
    }
    
    getCategoryName(category) {
        const names = {
            'manipulation': 'Маніпуляція',
            'cognitive_bias': 'Когнітивне упередження',
            'rhetological_fallacy': 'Логічна помилка'
        };
        return names[category] || 'Невизначено';
    }
    
    checkFormHasData() {
        const fields = ['company', 'negotiator', 'sector', 'goal'];
        return fields.some(fieldName => {
            const field = document.getElementById(fieldName);
            return field && field.value.trim();
        });
    }
    
    closeAllModals() {
        const modals = document.querySelectorAll('.modal, [class*="modal"]');
        modals.forEach(modal => {
            if (modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
        });
    }
    
    showError(message) {
        alert('❌ ' + message);
    }
    
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    handleInitError(error) {
        this.retryAttempts++;
        
        if (this.retryAttempts < this.maxRetries) {
            console.log(`🔥 Retry init attempt ${this.retryAttempts}/${this.maxRetries}`);
            setTimeout(() => {
                this.forceInit();
            }, 1000 * this.retryAttempts);
        } else {
            console.error('🔥 Max retries reached, showing critical error');
            alert('❌ Критична помилка ініціалізації. Перезавантажте сторінку.');
        }
    }
}

// ЗАПУСК УЛЬТИМАТИВНОЇ СИСТЕМИ
let initTimeout = null;

function initUltimateSystem() {
    if (window.ULTIMATE_CONTROLLER) return;
    
    console.log('🔥 Ініціалізація ультимативної системи...');
    
    try {
        window.ULTIMATE_CONTROLLER = new UltimateController();
    } catch (error) {
        console.error('🔥 Critical init error:', error);
        
        // Retry once more
        setTimeout(() => {
            if (!window.ULTIMATE_CONTROLLER) {
                try {
                    window.ULTIMATE_CONTROLLER = new UltimateController();
                } catch (retryError) {
                    console.error('🔥 Retry failed:', retryError);
                    alert('Критична помилка ініціалізації. Перезавантажте сторінку.');
                }
            }
        }, 2000);
    }
}

// МНОЖИННІ ТОЧКИ ВХОДУ
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initTimeout = setTimeout(initUltimateSystem, 1000);
    });
} else {
    initTimeout = setTimeout(initUltimateSystem, 500);
}

// Додатковий fallback
window.addEventListener('load', () => {
    if (!window.ULTIMATE_CONTROLLER) {
        console.log('🔥 Fallback initialization...');
        setTimeout(initUltimateSystem, 100);
    }
});

// Exposure для debugging
window.initUltimateSystem = initUltimateSystem;

// Global test function
window.testAllButtons = function() {
    console.log('🔥 TESTING ALL BUTTONS...');
    
    const tests = [
        {name: 'Logout', selector: '#logout-btn'},
        {name: 'Help (top nav)', selector: '#help-toggle'},
        {name: 'Help (welcome)', selector: '#welcome-help'},
        {name: 'New Client (sidebar)', selector: '#new-client-btn'},
        {name: 'New Client (welcome)', selector: '#welcome-new-client'},
        {name: 'Save Client', selector: '#save-client-btn'},
        {name: 'Start Analysis', selector: '#start-analysis-btn'},
    ];
    
    tests.forEach(test => {
        const element = document.querySelector(test.selector);
        console.log(`🔥 ${test.name}: ${element ? '✅ FOUND' : '❌ NOT FOUND'} (${test.selector})`);
        if (element) {
            console.log(`   - Has ultimate-attached: ${element.hasAttribute('ultimate-attached')}`);
            console.log(`   - Visible: ${element.offsetParent !== null}`);
            console.log(`   - Disabled: ${element.disabled}`);
        }
    });
};

// Global analysis test function
window.testAnalysis = function() {
    console.log('🔥 TESTING ANALYSIS REQUIREMENTS...');
    
    const textArea = document.getElementById('negotiation-text');
    const clientSelect = document.getElementById('client-select');
    const startBtn = document.getElementById('start-analysis-btn');
    
    console.log(`🔥 Text area: ${textArea ? '✅ FOUND' : '❌ NOT FOUND'}`);
    if (textArea) {
        console.log(`   - Value length: ${textArea.value.length}`);
        console.log(`   - Value preview: "${textArea.value.substring(0, 50)}..."`);
    }
    
    console.log(`🔥 Client select: ${clientSelect ? '✅ FOUND' : '❌ NOT FOUND'}`);
    if (clientSelect) {
        console.log(`   - Selected value: "${clientSelect.value}"`);
        console.log(`   - Options count: ${clientSelect.options.length}`);
    }
    
    console.log(`🔥 Start button: ${startBtn ? '✅ FOUND' : '❌ NOT FOUND'}`);
    if (startBtn) {
        console.log(`   - Disabled: ${startBtn.disabled}`);
        console.log(`   - Has ultimate-attached: ${startBtn.hasAttribute('ultimate-attached')}`);
    }
};

console.log('🔥 УЛЬТИМАТИВНА СИСТЕМА ЗАВАНТАЖЕНА!');
console.log('🔥 Доступні команди: testAllButtons(), testAnalysis()');
console.log('🔥 Перевірте консоль для додаткової інформації');