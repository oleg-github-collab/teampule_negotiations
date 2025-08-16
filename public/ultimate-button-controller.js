/**
 * ULTIMATE BUTTON CONTROLLER v2.0 - SOLID Architecture
 * Ідеальна система управління всіма кнопками з глибоким продумуванням
 */

console.log('🎯 ULTIMATE BUTTON CONTROLLER v2.0 - Завантаження...');

// SOLID принципи:
// S - Single Responsibility: Кожен клас має одну відповідальність
// O - Open/Closed: Відкритий для розширення, закритий для модифікації
// L - Liskov Substitution: Підкласи можуть замінювати батьківські класи
// I - Interface Segregation: Інтерфейси мають бути специфічними
// D - Dependency Inversion: Залежності від абстракцій, не від конкретних класів

// === АБСТРАКТНІ ІНТЕРФЕЙСИ ===

class IButtonHandler {
    handle() {
        throw new Error('handle() method must be implemented');
    }
    
    canHandle(element) {
        throw new Error('canHandle() method must be implemented');
    }
}

class IButtonRegistry {
    register(selector, handler) {
        throw new Error('register() method must be implemented');
    }
    
    unregister(selector) {
        throw new Error('unregister() method must be implemented');
    }
}

// === КОНКРЕТНІ ОБРОБНИКИ КНОПОК ===

class LogoutButtonHandler extends IButtonHandler {
    canHandle(element) {
        return element.id === 'logout-btn';
    }
    
    async handle(element, event) {
        console.log('🎯 LOGOUT HANDLER');
        event.preventDefault();
        event.stopPropagation();
        
        if (!confirm('Ви впевнені, що хочете вийти із системи?')) return;
        
        try {
            localStorage.clear();
            sessionStorage.clear();
            
            // Clear cookies
            document.cookie.split(";").forEach(c => {
                const eqPos = c.indexOf("=");
                const name = eqPos > -1 ? c.substr(0, eqPos).trim() : c.trim();
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;domain=" + window.location.hostname;
                document.cookie = name + "=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/";
            });
            
            await fetch('/api/logout', { method: 'POST', credentials: 'include' });
        } catch (error) {
            console.error('🎯 Logout error:', error);
        } finally {
            window.location.href = '/login';
        }
    }
}

class OnboardingButtonHandler extends IButtonHandler {
    canHandle(element) {
        const onboardingSelectors = [
            'help-toggle', 'welcome-help', 'skip-onboarding', 
            'next-step', 'prev-step'
        ];
        return onboardingSelectors.includes(element.id) || 
               element.classList.contains('help-toggle') ||
               element.hasAttribute('data-action') && element.getAttribute('data-action') === 'help';
    }
    
    async handle(element, event) {
        console.log('🎯 ONBOARDING HANDLER');
        event.preventDefault();
        event.stopPropagation();
        
        const action = this.getOnboardingAction(element);
        
        switch (action) {
            case 'show':
                this.showOnboardingModal();
                break;
            case 'skip':
                this.skipOnboarding();
                break;
            case 'next':
                this.nextStep();
                break;
            case 'prev':
                this.prevStep();
                break;
        }
    }
    
    getOnboardingAction(element) {
        if (element.id === 'skip-onboarding') return 'skip';
        if (element.id === 'next-step') return 'next';
        if (element.id === 'prev-step') return 'prev';
        return 'show';
    }
    
    showOnboardingModal() {
        const modal = document.getElementById('onboarding-modal');
        if (modal) {
            console.log('🎯 Showing onboarding modal');
            modal.style.display = 'flex';
            modal.style.zIndex = '10000';
            document.body.scrollTop = 0;
            document.documentElement.scrollTop = 0;
            
            // Ensure onboarding buttons work
            this.initializeOnboardingButtons();
        } else {
            this.showFallbackHelp();
        }
    }
    
    initializeOnboardingButtons() {
        setTimeout(() => {
            const modal = document.getElementById('onboarding-modal');
            if (!modal) return;
            
            // Skip button
            const skipBtn = modal.querySelector('#skip-onboarding');
            if (skipBtn && !skipBtn.hasAttribute('ultimate-attached')) {
                skipBtn.addEventListener('click', (e) => this.handle(skipBtn, e));
                skipBtn.setAttribute('ultimate-attached', 'true');
            }
            
            // Next button
            const nextBtn = modal.querySelector('#next-step');
            if (nextBtn && !nextBtn.hasAttribute('ultimate-attached')) {
                nextBtn.addEventListener('click', (e) => this.handle(nextBtn, e));
                nextBtn.setAttribute('ultimate-attached', 'true');
            }
            
            // Prev button
            const prevBtn = modal.querySelector('#prev-step');
            if (prevBtn && !prevBtn.hasAttribute('ultimate-attached')) {
                prevBtn.addEventListener('click', (e) => this.handle(prevBtn, e));
                prevBtn.setAttribute('ultimate-attached', 'true');
            }
        }, 100);
    }
    
    skipOnboarding() {
        console.log('🎯 Skip onboarding');
        const modal = document.getElementById('onboarding-modal');
        if (modal) modal.style.display = 'none';
    }
    
    nextStep() {
        console.log('🎯 Next onboarding step');
        // Implement step progression logic
        this.updateOnboardingStep(1);
    }
    
    prevStep() {
        console.log('🎯 Previous onboarding step');
        // Implement step regression logic
        this.updateOnboardingStep(-1);
    }
    
    updateOnboardingStep(direction) {
        const steps = document.querySelectorAll('.onboarding-step');
        const activeStep = document.querySelector('.onboarding-step.active');
        const currentIndex = Array.from(steps).indexOf(activeStep);
        const newIndex = currentIndex + direction;
        
        if (newIndex >= 0 && newIndex < steps.length) {
            activeStep.classList.remove('active');
            steps[newIndex].classList.add('active');
            
            // Update progress
            const progress = ((newIndex + 1) / steps.length) * 100;
            const progressBar = document.getElementById('onboarding-progress');
            const progressText = document.getElementById('progress-text');
            
            if (progressBar) progressBar.style.width = progress + '%';
            if (progressText) progressText.textContent = `Крок ${newIndex + 1} з ${steps.length}`;
            
            // Show/hide navigation buttons
            const prevBtn = document.getElementById('prev-step');
            const nextBtn = document.getElementById('next-step');
            
            if (prevBtn) prevBtn.style.display = newIndex === 0 ? 'none' : 'inline-block';
            if (nextBtn) nextBtn.textContent = newIndex === steps.length - 1 ? 'Завершити' : 'Далі';
        }
        
        // If last step and next clicked, close modal
        if (newIndex >= steps.length) {
            this.skipOnboarding();
        }
    }
    
    showFallbackHelp() {
        alert(`📚 Швидкий старт TeamPulse Turbo:

1. 👤 Створіть профіль клієнта (кнопка "Новий клієнт")
2. 📝 Заповніть інформацію про компанію та переговори
3. 💾 Збережіть клієнта
4. 📊 Введіть текст переговорів для аналізу
5. 🚀 Натисніть "Почати аналіз"
6. 📈 Перегляньте виявлені проблеми та рекомендації

Готово! 🎉`);
    }
}

class ClientButtonHandler extends IButtonHandler {
    canHandle(element) {
        const clientSelectors = [
            'new-client-btn', 'welcome-new-client', 'save-client-btn', 
            'cancel-client-btn'
        ];
        return clientSelectors.includes(element.id) || 
               element.classList.contains('new-client-btn') ||
               element.classList.contains('delete-client-btn');
    }
    
    async handle(element, event) {
        console.log('🎯 CLIENT HANDLER');
        event.preventDefault();
        event.stopPropagation();
        
        const action = this.getClientAction(element);
        
        switch (action) {
            case 'new':
                this.handleNewClient();
                break;
            case 'save':
                await this.handleSaveClient();
                break;
            case 'cancel':
                this.handleCancelClient();
                break;
            case 'delete':
                await this.handleDeleteClient(element);
                break;
        }
    }
    
    getClientAction(element) {
        if (element.id === 'save-client-btn') return 'save';
        if (element.id === 'cancel-client-btn') return 'cancel';
        if (element.classList.contains('delete-client-btn')) return 'delete';
        return 'new';
    }
    
    handleNewClient() {
        console.log('🎯 New client');
        const welcomeScreen = document.getElementById('welcome-screen');
        const clientForm = document.getElementById('client-form');
        const analysisDashboard = document.getElementById('analysis-dashboard');
        
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (analysisDashboard) analysisDashboard.style.display = 'none';
        
        if (clientForm) {
            clientForm.style.display = 'block';
            
            // Clear form
            const fields = clientForm.querySelectorAll('input, textarea, select');
            fields.forEach(field => field.value = '');
            
            // Focus first field
            const firstField = clientForm.querySelector('#company, input[name="company"]');
            if (firstField) setTimeout(() => firstField.focus(), 100);
        }
    }
    
    async handleSaveClient() {
        console.log('🎯 Save client');
        
        const clientData = this.collectClientData();
        
        if (!clientData.company?.trim()) {
            alert('❌ Назва компанії обов\'язкова!');
            const companyField = document.getElementById('company');
            if (companyField) companyField.focus();
            return;
        }
        
        try {
            // Use new ClientService if available
            if (window.services?.client) {
                console.log('🎯 Using ClientService for save');
                await window.services.client.createClient(clientData);
                return;
            }
            
            // Fallback to direct API call
            console.log('🎯 Using direct API call for save');
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(clientData)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const result = await response.json();
            
            if (result.success) {
                alert('✅ Клієнт збережений успішно!');
                
                // Force reload clients
                if (window.services?.client) {
                    await window.services.client.loadClients(true);
                } else if (window.loadClients) {
                    await window.loadClients(true);
                }
                
                this.showAnalysisDashboard();
            } else {
                throw new Error(result.error || 'Невідома помилка збереження');
            }
        } catch (error) {
            console.error('🎯 Save client error:', error);
            alert('❌ Помилка збереження: ' + error.message);
        }
    }
    
    collectClientData() {
        const fields = [
            'company', 'negotiator', 'sector', 'goals', 'deal-value',
            'negotiation-type', 'company-size'
        ];
        
        const data = {};
        fields.forEach(fieldName => {
            const field = document.getElementById(fieldName) || 
                         document.querySelector(`[name="${fieldName}"]`);
            
            if (field) {
                data[fieldName.replace('-', '_')] = field.value.trim();
            }
        });
        
        return data;
    }
    
    handleCancelClient() {
        console.log('🎯 Cancel client');
        
        const hasData = this.checkFormHasData();
        if (hasData && !confirm('❓ Скасувати створення клієнта? Незбережені дані будуть втрачені.')) {
            return;
        }
        
        this.showWelcomeScreen();
    }
    
    async handleDeleteClient(element) {
        const clientId = element.dataset.clientId;
        const clientName = element.dataset.clientName || 'клієнта';
        
        console.log(`🎯 Delete client ${clientId}`);
        
        if (!confirm(`❓ Видалити клієнта "${clientName}"? Ця дія незворотна.`)) return;
        
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
                
                // Update client counter instead of full reload
                if (window.updateClientCounter) {
                    window.updateClientCounter();
                }
                
                // Refresh client select options
                if (window.refreshClientSelect) {
                    window.refreshClientSelect();
                }
                
                // Close modal and return to main view
                this.closeAllModals();
                this.showWelcomeScreen();
            } else {
                throw new Error(result.error || 'Помилка видалення');
            }
        } catch (error) {
            console.error('🎯 Delete client error:', error);
            alert('❌ Помилка видалення: ' + error.message);
        }
    }
    
    checkFormHasData() {
        const fields = ['company', 'negotiator', 'sector', 'goals'];
        return fields.some(fieldName => {
            const field = document.getElementById(fieldName);
            return field && field.value.trim();
        });
    }
    
    showWelcomeScreen() {
        const welcomeScreen = document.getElementById('welcome-screen');
        const clientForm = document.getElementById('client-form');
        const analysisDashboard = document.getElementById('analysis-dashboard');
        
        if (welcomeScreen) welcomeScreen.style.display = 'block';
        if (clientForm) clientForm.style.display = 'none';
        if (analysisDashboard) analysisDashboard.style.display = 'none';
    }
    
    showAnalysisDashboard() {
        const welcomeScreen = document.getElementById('welcome-screen');
        const clientForm = document.getElementById('client-form');
        const analysisDashboard = document.getElementById('analysis-dashboard');
        
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (clientForm) clientForm.style.display = 'none';
        if (analysisDashboard) analysisDashboard.style.display = 'block';
    }
}

class AnalysisButtonHandler extends IButtonHandler {
    constructor() {
        super();
        this.isAnalyzing = false;
    }
    
    canHandle(element) {
        const analysisSelectors = [
            'start-analysis-btn', 'analysis-history-btn', 'new-analysis-btn',
            'clear-text-btn', 'paste-btn', 'choose-file-btn', 'remove-file-btn'
        ];
        return analysisSelectors.includes(element.id);
    }
    
    async handle(element, event) {
        console.log('🎯 ANALYSIS HANDLER');
        event.preventDefault();
        event.stopPropagation();
        
        const action = this.getAnalysisAction(element);
        
        switch (action) {
            case 'start':
                await this.handleStartAnalysis();
                break;
            case 'clear':
                this.handleClearText();
                break;
            case 'paste':
                await this.handlePasteText();
                break;
            case 'choose-file':
                this.handleChooseFile();
                break;
            case 'remove-file':
                this.handleRemoveFile();
                break;
            case 'history':
                this.handleAnalysisHistory();
                break;
            case 'new':
                this.handleNewAnalysis();
                break;
        }
    }
    
    getAnalysisAction(element) {
        const actionMap = {
            'start-analysis-btn': 'start',
            'clear-text-btn': 'clear',
            'paste-btn': 'paste',
            'choose-file-btn': 'choose-file',
            'remove-file-btn': 'remove-file',
            'analysis-history-btn': 'history',
            'new-analysis-btn': 'new'
        };
        return actionMap[element.id] || 'start';
    }
    
    async handleStartAnalysis() {
        if (this.isAnalyzing) {
            alert('⏳ Аналіз уже виконується');
            return;
        }
        
        console.log('🎯 Start analysis');
        
        const textArea = document.getElementById('negotiation-text');
        const clientSelect = document.getElementById('client-select');
        
        if (!textArea?.value?.trim()) {
            alert('❌ Введіть текст для аналізу');
            if (textArea) textArea.focus();
            return;
        }
        
        if (!clientSelect?.value) {
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
        
        this.isAnalyzing = true;
        
        try {
            await this.performAnalysis(text, clientId);
        } catch (error) {
            console.error('🎯 Analysis error:', error);
            alert('❌ Помилка аналізу: ' + error.message);
        } finally {
            this.isAnalyzing = false;
        }
    }
    
    async performAnalysis(text, clientId) {
        console.log('🎯 Performing analysis...');
        
        // Show progress UI
        this.showAnalysisProgress();
        this.updateProgress(0, 'Підготовка до аналізу...');
        
        const formData = new URLSearchParams();
        formData.append('client_id', clientId.toString());
        formData.append('text', text);
        formData.append('method', 'text');
        
        let attempts = 0;
        const maxAttempts = 3;
        
        while (attempts < maxAttempts) {
            attempts++;
            console.log(`🎯 Analysis attempt ${attempts}/${maxAttempts}`);
            
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 300000);
                
                this.updateProgress(10, `Спроба ${attempts}/${maxAttempts} - відправляю запит...`);
                
                const response = await fetch('/api/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
                    body: formData,
                    credentials: 'include',
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                
                await this.processAnalysisStream(response);
                return;
                
            } catch (error) {
                console.error(`🎯 Analysis attempt ${attempts} failed:`, error);
                
                if (attempts < maxAttempts) {
                    await this.delay(2000 * attempts);
                } else {
                    throw new Error(`Аналіз не вдався після ${maxAttempts} спроб. ${error.message}`);
                }
            }
        }
    }
    
    async processAnalysisStream(response) {
        console.log('🎯 Processing analysis stream...');
        
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        
        let buffer = '';
        let highlights = [];
        let progress = 20;
        
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
                            
                            switch (data.type) {
                                case 'analysis_started':
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
                                    }
                                    break;
                                case 'complete':
                                    this.updateProgress(100, 'Аналіз завершено!');
                                    break;
                                case 'error':
                                    console.warn('🎯 Analysis chunk error:', data.message);
                                    break;
                            }
                        } catch (parseError) {
                            console.warn('🎯 Parse error:', parseError);
                        }
                    }
                }
            }
            
            this.displayResults(highlights);
            
        } finally {
            reader.releaseLock();
        }
    }
    
    displayResults(highlights) {
        console.log(`🎯 Displaying ${highlights.length} results`);
        
        const resultsContainer = document.getElementById('highlights-list');
        if (!resultsContainer) return;
        
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
        
        // Update counters
        const totalCounter = document.getElementById('total-highlights-count');
        if (totalCounter) totalCounter.textContent = highlights.length;
    }
    
    showAnalysisProgress() {
        const progressSection = document.querySelector('.analysis-progress');
        const resultsSection = document.getElementById('analysis-results');
        
        if (progressSection) progressSection.style.display = 'block';
        if (resultsSection) resultsSection.style.display = 'block';
    }
    
    updateProgress(percentage, message) {
        const progressBar = document.getElementById('live-progress-percentage');
        const progressText = document.getElementById('step-text');
        
        if (progressBar) progressBar.textContent = Math.round(percentage) + '%';
        if (progressText) progressText.textContent = message;
    }
    
    handleClearText() {
        const textArea = document.getElementById('negotiation-text');
        if (textArea) {
            textArea.value = '';
            textArea.focus();
        }
    }
    
    async handlePasteText() {
        try {
            const text = await navigator.clipboard.readText();
            const textArea = document.getElementById('negotiation-text');
            if (textArea) {
                textArea.value = text;
                textArea.focus();
            }
        } catch (error) {
            console.error('🎯 Paste error:', error);
            alert('❌ Не вдалося вставити текст з буфера обміну');
        }
    }
    
    handleChooseFile() {
        const fileInput = document.getElementById('file-input');
        if (fileInput) fileInput.click();
    }
    
    handleRemoveFile() {
        const fileInput = document.getElementById('file-input');
        const filePreview = document.getElementById('file-preview');
        
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.style.display = 'none';
    }
    
    handleAnalysisHistory() {
        console.log('🎯 Analysis history');
        const modal = document.getElementById('analysis-history-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.zIndex = '10001';
        }
    }
    
    handleNewAnalysis() {
        console.log('🎯 New analysis');
        this.handleClearText();
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
}

class WorkspaceButtonHandler extends IButtonHandler {
    canHandle(element) {
        const workspaceSelectors = [
            'workspace-toggle', 'sidebar-right-toggle', 'mobile-menu-toggle',
            'get-advice-btn', 'export-selected-btn', 'clear-workspace-btn',
            'clear-recommendations-btn'
        ];
        return workspaceSelectors.includes(element.id);
    }
    
    async handle(element, event) {
        console.log('🎯 WORKSPACE HANDLER');
        event.preventDefault();
        event.stopPropagation();
        
        const action = this.getWorkspaceAction(element);
        
        switch (action) {
            case 'toggle-workspace':
                this.toggleWorkspace();
                break;
            case 'toggle-sidebar':
                this.toggleSidebar();
                break;
            case 'toggle-menu':
                this.toggleMobileMenu();
                break;
            case 'get-advice':
                await this.getAdvice();
                break;
            case 'export-selected':
                this.exportSelected();
                break;
            case 'clear-workspace':
                this.clearWorkspace();
                break;
            case 'clear-recommendations':
                this.clearRecommendations();
                break;
        }
    }
    
    getWorkspaceAction(element) {
        const actionMap = {
            'workspace-toggle': 'toggle-workspace',
            'sidebar-right-toggle': 'toggle-sidebar',
            'mobile-menu-toggle': 'toggle-menu',
            'get-advice-btn': 'get-advice',
            'export-selected-btn': 'export-selected',
            'clear-workspace-btn': 'clear-workspace',
            'clear-recommendations-btn': 'clear-recommendations'
        };
        return actionMap[element.id] || 'toggle-workspace';
    }
    
    toggleWorkspace() {
        console.log('🎯 Toggle workspace');
        const workspace = document.getElementById('sidebar-right');
        const button = document.getElementById('workspace-toggle');
        
        if (workspace) {
            const isHidden = workspace.style.display === 'none' || workspace.classList.contains('collapsed');
            
            if (isHidden) {
                workspace.style.display = 'block';
                workspace.classList.remove('collapsed');
                if (button) button.classList.add('active');
            } else {
                workspace.style.display = 'none';
                workspace.classList.add('collapsed');
                if (button) button.classList.remove('active');
            }
        }
    }
    
    toggleSidebar() {
        console.log('🎯 Toggle sidebar');
        const sidebar = document.getElementById('sidebar-right');
        const toggleBtn = document.getElementById('sidebar-right-toggle');
        const icon = toggleBtn?.querySelector('i');
        
        if (sidebar) {
            const isCollapsed = sidebar.classList.contains('collapsed');
            
            if (isCollapsed) {
                sidebar.classList.remove('collapsed');
                if (icon) {
                    icon.classList.remove('fa-chevron-left');
                    icon.classList.add('fa-chevron-right');
                }
            } else {
                sidebar.classList.add('collapsed');
                if (icon) {
                    icon.classList.remove('fa-chevron-right');
                    icon.classList.add('fa-chevron-left');
                }
            }
        }
    }
    
    toggleMobileMenu() {
        console.log('🎯 Toggle mobile menu');
        const sidebar = document.getElementById('sidebar-left');
        const button = document.getElementById('mobile-menu-toggle');
        
        if (sidebar) {
            const isVisible = sidebar.classList.contains('mobile-visible');
            
            if (isVisible) {
                sidebar.classList.remove('mobile-visible');
                if (button) button.classList.remove('active');
            } else {
                sidebar.classList.add('mobile-visible');
                if (button) button.classList.add('active');
            }
        }
    }
    
    async getAdvice() {
        console.log('🎯 Get advice');
        alert('💡 Функція персоналізованих порад буде доступна найближчим часом');
    }
    
    exportSelected() {
        console.log('🎯 Export selected');
        alert('📁 Функція експорту буде доступна найближчим часом');
    }
    
    clearWorkspace() {
        console.log('🎯 Clear workspace');
        if (confirm('❓ Очистити робочу область?')) {
            const fragments = document.getElementById('selected-fragments');
            if (fragments) fragments.innerHTML = '';
            
            const counter = document.getElementById('fragments-count');
            if (counter) counter.textContent = '0';
        }
    }
    
    clearRecommendations() {
        console.log('🎯 Clear recommendations');
        if (confirm('❓ Очистити історію рекомендацій?')) {
            const history = document.getElementById('recommendations-history');
            if (history) {
                history.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-lightbulb"></i></div>
                        <p>Історія рекомендацій очищена</p>
                    </div>
                `;
            }
        }
    }
}

class ModalButtonHandler extends IButtonHandler {
    canHandle(element) {
        const modalSelectors = [
            'counter-modal-close', 'analysis-history-close', 'comparison-modal-close',
            'export-modal-close', 'cancel-export-btn', 'confirm-export-btn',
            'close-history-modal-btn', 'history-help-btn', 'export-history-btn',
            'history-settings-btn'
        ];
        return modalSelectors.includes(element.id) || 
               element.classList.contains('modal-close') ||
               element.getAttribute('data-action') === 'close-modal';
    }
    
    async handle(element, event) {
        console.log('🎯 MODAL HANDLER');
        event.preventDefault();
        event.stopPropagation();
        
        const action = this.getModalAction(element);
        
        switch (action) {
            case 'close':
                this.closeModal(element);
                break;
            case 'export':
                await this.handleExport();
                break;
            case 'cancel-export':
                this.cancelExport();
                break;
            case 'help':
                this.showHelp();
                break;
        }
    }
    
    getModalAction(element) {
        if (element.id.includes('close') || element.classList.contains('modal-close')) return 'close';
        if (element.id === 'confirm-export-btn') return 'export';
        if (element.id === 'cancel-export-btn') return 'cancel-export';
        if (element.id === 'history-help-btn') return 'help';
        return 'close';
    }
    
    closeModal(element) {
        console.log('🎯 Close modal');
        
        // Find the modal container
        let modal = element.closest('.modal');
        if (!modal) {
            // Try to find by modal ID
            const modalIds = [
                'onboarding-modal', 'counter-modal', 'analysis-history-modal',
                'comparison-modal', 'export-modal'
            ];
            
            for (const id of modalIds) {
                const targetModal = document.getElementById(id);
                if (targetModal && targetModal.style.display !== 'none') {
                    modal = targetModal;
                    break;
                }
            }
        }
        
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    async handleExport() {
        console.log('🎯 Handle export');
        alert('📁 Експорт розпочато...');
        // Close export modal
        const modal = document.getElementById('export-modal');
        if (modal) modal.style.display = 'none';
    }
    
    cancelExport() {
        console.log('🎯 Cancel export');
        const modal = document.getElementById('export-modal');
        if (modal) modal.style.display = 'none';
    }
    
    showHelp() {
        console.log('🎯 Show modal help');
        alert('📚 Довідка з роботи з історією аналізів буде доступна найближчим часом');
    }
}

class NavigationButtonHandler extends IButtonHandler {
    canHandle(element) {
        const navSelectors = [
            'product-dropdown-btn', 'mobile-menu-toggle'
        ];
        return navSelectors.includes(element.id) || 
               element.classList.contains('product-dropdown-btn') ||
               element.classList.contains('mobile-menu-toggle');
    }
    
    async handle(element, event) {
        console.log('🎯 NAVIGATION HANDLER');
        event.preventDefault();
        event.stopPropagation();
        
        const action = this.getNavigationAction(element);
        
        switch (action) {
            case 'toggle-dropdown':
                this.toggleProductDropdown();
                break;
            case 'toggle-mobile-menu':
                this.toggleMobileMenu();
                break;
        }
    }
    
    getNavigationAction(element) {
        if (element.id === 'product-dropdown-btn') return 'toggle-dropdown';
        if (element.id === 'mobile-menu-toggle') return 'toggle-mobile-menu';
        return 'toggle-dropdown';
    }
    
    toggleProductDropdown() {
        console.log('🎯 Toggle product dropdown');
        const dropdown = document.getElementById('product-dropdown');
        const button = document.getElementById('product-dropdown-btn');
        
        if (dropdown) {
            const isVisible = dropdown.style.display !== 'none';
            dropdown.style.display = isVisible ? 'none' : 'block';
            
            if (button) {
                button.classList.toggle('active', !isVisible);
            }
            
            // Close on click outside
            if (!isVisible) {
                setTimeout(() => {
                    document.addEventListener('click', this.closeDropdownOnClickOutside.bind(this), { once: true });
                }, 10);
            }
        }
    }
    
    closeDropdownOnClickOutside(event) {
        const dropdown = document.getElementById('product-dropdown');
        const button = document.getElementById('product-dropdown-btn');
        
        if (dropdown && !dropdown.contains(event.target) && !button.contains(event.target)) {
            dropdown.style.display = 'none';
            if (button) button.classList.remove('active');
        }
    }
    
    toggleMobileMenu() {
        console.log('🎯 Toggle mobile menu');
        const sidebar = document.getElementById('sidebar-left');
        const button = document.getElementById('mobile-menu-toggle');
        
        if (sidebar) {
            const isVisible = sidebar.classList.contains('mobile-visible');
            sidebar.classList.toggle('mobile-visible', !isVisible);
            
            if (button) {
                button.classList.toggle('active', !isVisible);
            }
        }
    }
}

class InputMethodButtonHandler extends IButtonHandler {
    canHandle(element) {
        const inputSelectors = [
            'text-method', 'file-method', 'list-view', 'text-view', 
            'filter-view', 'clear-filters', 'apply-filters'
        ];
        return inputSelectors.includes(element.id) || 
               element.classList.contains('input-method') ||
               element.classList.contains('view-control');
    }
    
    async handle(element, event) {
        console.log('🎯 INPUT METHOD HANDLER');
        event.preventDefault();
        event.stopPropagation();
        
        const action = this.getInputAction(element);
        
        switch (action) {
            case 'text-method':
                this.selectTextMethod();
                break;
            case 'file-method':
                this.selectFileMethod();
                break;
            case 'list-view':
                this.selectListView();
                break;
            case 'text-view':
                this.selectTextView();
                break;
            case 'filter-view':
                this.toggleFilters();
                break;
            case 'clear-filters':
                this.clearFilters();
                break;
            case 'apply-filters':
                this.applyFilters();
                break;
        }
    }
    
    getInputAction(element) {
        return element.id || 'text-method';
    }
    
    selectTextMethod() {
        console.log('🎯 Select text input method');
        
        // Update active method
        document.querySelectorAll('.input-method').forEach(btn => btn.classList.remove('active'));
        document.getElementById('text-method')?.classList.add('active');
        
        // Show/hide content
        document.getElementById('text-input-content')?.style.setProperty('display', 'block');
        document.getElementById('file-input-content')?.style.setProperty('display', 'none');
    }
    
    selectFileMethod() {
        console.log('🎯 Select file input method');
        
        // Update active method
        document.querySelectorAll('.input-method').forEach(btn => btn.classList.remove('active'));
        document.getElementById('file-method')?.classList.add('active');
        
        // Show/hide content
        document.getElementById('text-input-content')?.style.setProperty('display', 'none');
        document.getElementById('file-input-content')?.style.setProperty('display', 'block');
    }
    
    selectListView() {
        console.log('🎯 Select list view');
        
        // Update active view
        document.querySelectorAll('.view-control').forEach(btn => btn.classList.remove('active'));
        document.getElementById('list-view')?.classList.add('active');
        
        // Show/hide content
        document.getElementById('highlights-list')?.style.setProperty('display', 'block');
        document.getElementById('fulltext-content')?.style.setProperty('display', 'none');
        document.getElementById('filters-panel')?.style.setProperty('display', 'none');
    }
    
    selectTextView() {
        console.log('🎯 Select text view');
        
        // Update active view
        document.querySelectorAll('.view-control').forEach(btn => btn.classList.remove('active'));
        document.getElementById('text-view')?.classList.add('active');
        
        // Show/hide content
        document.getElementById('highlights-list')?.style.setProperty('display', 'none');
        document.getElementById('fulltext-content')?.style.setProperty('display', 'block');
        document.getElementById('filters-panel')?.style.setProperty('display', 'none');
    }
    
    toggleFilters() {
        console.log('🎯 Toggle filters');
        
        const filtersPanel = document.getElementById('filters-panel');
        if (filtersPanel) {
            const isVisible = filtersPanel.style.display !== 'none';
            filtersPanel.style.display = isVisible ? 'none' : 'block';
            
            // Update button state
            const button = document.getElementById('filter-view');
            if (button) {
                if (isVisible) {
                    button.classList.remove('active');
                } else {
                    button.classList.add('active');
                }
            }
        }
    }
    
    clearFilters() {
        console.log('🎯 Clear filters');
        
        // Reset all filter inputs
        document.querySelectorAll('#filters-panel input[type="checkbox"]').forEach(cb => cb.checked = true);
        document.querySelectorAll('#filters-panel select').forEach(select => select.selectedIndex = 0);
        document.querySelectorAll('#filters-panel input[type="text"]').forEach(input => input.value = '');
        document.querySelectorAll('#filters-panel input[type="range"]').forEach(range => {
            if (range.id.includes('min')) range.value = range.min;
            if (range.id.includes('max')) range.value = range.max;
        });
    }
    
    applyFilters() {
        console.log('🎯 Apply filters');
        alert('🔍 Фільтри застосовано');
    }
}

// === ГОЛОВНИЙ КОНТРОЛЕР ===

class UltimateButtonController {
    constructor() {
        this.handlers = [
            new LogoutButtonHandler(),
            new OnboardingButtonHandler(),
            new ClientButtonHandler(),
            new AnalysisButtonHandler(),
            new WorkspaceButtonHandler(),
            new ModalButtonHandler(),
            new NavigationButtonHandler(),
            new InputMethodButtonHandler()
        ];
        
        this.attachedElements = new Set();
        this.init();
    }
    
    async init() {
        console.log('🎯 Initializing Ultimate Button Controller v2.0...');
        
        await this.waitForDOM();
        this.attachAllButtons();
        this.setupGlobalListeners();
        this.setupMutationObserver();
        
        console.log('🎯 ✅ Ultimate Button Controller v2.0 АКТИВНИЙ!');
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
    
    attachAllButtons() {
        console.log('🎯 Attaching all buttons...');
        
        // Find all clickable elements
        const clickableElements = document.querySelectorAll(`
            button, 
            [role="button"], 
            .btn, 
            .button, 
            [onclick], 
            [data-action],
            .input-method,
            .view-control,
            .modal-close,
            .nav-action,
            .sidebar-toggle
        `);
        
        let attachedCount = 0;
        
        clickableElements.forEach(element => {
            if (this.attachedElements.has(element)) return;
            
            const handler = this.findHandler(element);
            if (handler) {
                this.attachHandler(element, handler);
                attachedCount++;
            }
        });
        
        console.log(`🎯 Attached ${attachedCount} buttons`);
    }
    
    findHandler(element) {
        return this.handlers.find(handler => handler.canHandle(element));
    }
    
    attachHandler(element, handler) {
        // Clone element to remove all existing listeners
        const newElement = element.cloneNode(true);
        element.replaceWith(newElement);
        
        // Add our universal handler
        newElement.addEventListener('click', async (event) => {
            try {
                await handler.handle(newElement, event);
            } catch (error) {
                console.error('🎯 Button handler error:', error);
                alert('❌ Помилка: ' + error.message);
            }
        });
        
        // Mark as attached
        newElement.setAttribute('ultimate-attached', 'true');
        this.attachedElements.add(newElement);
        
        console.log(`🎯 Attached handler for: ${newElement.id || newElement.className || newElement.tagName}`);
    }
    
    setupGlobalListeners() {
        // ESC key for closing modals
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.closeAllModals();
            }
        });
        
        // Click outside modals to close
        document.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal') || 
                event.target.classList.contains('modal-backdrop')) {
                const modal = event.target.closest('.modal');
                if (modal) modal.style.display = 'none';
            }
        });
        
        console.log('🎯 Global listeners attached');
    }
    
    setupMutationObserver() {
        const observer = new MutationObserver((mutations) => {
            let hasNewButtons = false;
            
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (this.isClickableElement(node) || 
                            node.querySelector && node.querySelector('button, .btn, [role="button"]')) {
                            hasNewButtons = true;
                        }
                    }
                });
            });
            
            if (hasNewButtons) {
                setTimeout(() => {
                    console.log('🎯 New buttons detected, re-attaching...');
                    this.attachAllButtons();
                }, 100);
            }
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        console.log('🎯 Mutation observer active');
    }
    
    isClickableElement(element) {
        return element.tagName === 'BUTTON' || 
               element.classList.contains('btn') ||
               element.getAttribute('role') === 'button' ||
               element.hasAttribute('onclick') ||
               element.hasAttribute('data-action');
    }
    
    closeAllModals() {
        const modals = document.querySelectorAll('.modal, [class*="modal"]');
        modals.forEach(modal => {
            if (modal.style.display !== 'none') {
                modal.style.display = 'none';
            }
        });
    }
    
    // Public testing methods
    testAllButtons() {
        console.log('🎯 TESTING ALL BUTTONS...');
        
        const clickableElements = document.querySelectorAll('button, [role="button"], .btn');
        
        console.log(`🎯 Found ${clickableElements.length} clickable elements:`);
        
        clickableElements.forEach((element, index) => {
            const id = element.id || `button-${index}`;
            const handler = this.findHandler(element);
            const isAttached = element.hasAttribute('ultimate-attached');
            
            console.log(`🎯 ${id}: ${handler ? '✅ HANDLER FOUND' : '❌ NO HANDLER'}, ${isAttached ? '✅ ATTACHED' : '❌ NOT ATTACHED'}`);
            
            if (element.id) {
                console.log(`   - ID: ${element.id}`);
            }
            if (element.className) {
                console.log(`   - Classes: ${element.className}`);
            }
            console.log(`   - Visible: ${element.offsetParent !== null}`);
            console.log(`   - Disabled: ${element.disabled || false}`);
        });
        
        return clickableElements.length;
    }
}

// === ІНІЦІАЛІЗАЦІЯ ===

let ultimateController = null;

function initUltimateButtonController() {
    if (ultimateController) {
        console.log('🎯 Ultimate Button Controller already initialized');
        return;
    }
    
    ultimateController = new UltimateButtonController();
    
    // Expose for debugging
    window.ultimateController = ultimateController;
    window.testAllButtons = () => ultimateController.testAllButtons();
}

// Multiple initialization points
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initUltimateButtonController, 500);
    });
} else {
    setTimeout(initUltimateButtonController, 100);
}

window.addEventListener('load', () => {
    if (!ultimateController) {
        setTimeout(initUltimateButtonController, 100);
    }
});

console.log('🎯 ULTIMATE BUTTON CONTROLLER v2.0 ЗАВАНТАЖЕНО!');
console.log('🎯 Команди: testAllButtons()');