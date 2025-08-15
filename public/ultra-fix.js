/**
 * УЛЬТРА ФІХ - СУПЕР СОЛІД СИСТЕМА
 * Вирішує всі проблеми раз і назавжди
 */

console.log('🚀 УЛЬТРА ФІХ - Завантажуємо...');

// Глобальний стейт
window.ULTRA_STATE = {
    isAnalyzing: false,
    currentClient: null,
    analysisData: null
};

// Ультранадійна система кнопок
class UltraButtonSystem {
    constructor() {
        this.buttons = new Map();
        this.init();
    }
    
    init() {
        console.log('🚀 Ініціалізація ультра-кнопок...');
        this.setupButtons();
        this.watchForNewButtons();
    }
    
    setupButtons() {
        // Logout button
        this.addButton('#logout-btn', () => {
            console.log('🚀 ULTRA LOGOUT');
            if (confirm('Вийти із системи?')) {
                localStorage.clear();
                sessionStorage.clear();
                fetch('/api/logout', { method: 'POST', credentials: 'include' })
                    .finally(() => window.location.href = '/login');
            }
        });
        
        // Help button
        this.addButton('#help-toggle', () => {
            console.log('🚀 ULTRA HELP');
            const modal = document.getElementById('onboarding-modal');
            if (modal) {
                modal.style.display = 'flex';
                modal.style.zIndex = '10000';
            }
        });
        
        // Start analysis button
        this.addButton('#start-analysis-btn', () => {
            console.log('🚀 ULTRA ANALYSIS START');
            this.startAnalysis();
        });
        
        // New client button
        this.addButton('#new-client-btn, .new-client-btn, #welcome-new-client', () => {
            console.log('🚀 ULTRA NEW CLIENT');
            this.showClientForm();
        });
        
        // Save client button
        this.addButton('#save-client-btn', () => {
            console.log('🚀 ULTRA SAVE CLIENT');
            this.saveClient();
        });
    }
    
    addButton(selector, handler) {
        const elements = document.querySelectorAll(selector);
        elements.forEach(btn => {
            if (btn && !btn.hasAttribute('ultra-fixed')) {
                // Remove all existing listeners
                const newBtn = btn.cloneNode(true);
                btn.replaceWith(newBtn);
                
                // Add our handler
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🚀 ULTRA BUTTON CLICKED: ${selector}`);
                    handler();
                });
                
                newBtn.setAttribute('ultra-fixed', 'true');
                console.log(`🚀 Fixed button: ${selector}`);
            }
        });
        
        // Handle delete buttons separately (they're dynamic)
        if (selector.includes('delete')) {
            this.setupDeleteButtons();
        }
    }
    
    setupDeleteButtons() {
        document.querySelectorAll('.delete-client-btn').forEach(btn => {
            if (!btn.hasAttribute('ultra-fixed')) {
                const clientId = btn.dataset.clientId;
                const newBtn = btn.cloneNode(true);
                btn.replaceWith(newBtn);
                
                newBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log(`🚀 ULTRA DELETE CLIENT ${clientId}`);
                    
                    if (confirm('Видалити клієнта?')) {
                        this.deleteClient(clientId);
                    }
                });
                
                newBtn.setAttribute('ultra-fixed', 'true');
            }
        });
    }
    
    watchForNewButtons() {
        // Watch for DOM changes
        const observer = new MutationObserver(() => {
            setTimeout(() => {
                this.setupButtons();
                this.setupDeleteButtons();
            }, 100);
        });
        
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }
    
    // Client operations
    showClientForm() {
        const welcomeScreen = document.getElementById('welcome-screen');
        const clientForm = document.getElementById('client-form');
        
        if (welcomeScreen) welcomeScreen.style.display = 'none';
        if (clientForm) {
            clientForm.style.display = 'block';
            // Clear form
            clientForm.querySelectorAll('input, textarea, select').forEach(field => {
                field.value = '';
            });
        }
    }
    
    async saveClient() {
        const form = document.getElementById('client-form');
        if (!form) return;
        
        const formData = new FormData(form);
        const clientData = Object.fromEntries(formData);
        
        if (!clientData.company?.trim()) {
            alert('Введіть назву компанії');
            return;
        }
        
        try {
            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(clientData),
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Клієнт збережений');
                window.location.reload();
            } else {
                alert('Помилка: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Помилка мережі: ' + error.message);
        }
    }
    
    async deleteClient(clientId) {
        try {
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE',
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert('Клієнт видалений');
                window.location.reload();
            } else {
                alert('Помилка видалення: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            alert('Помилка мережі: ' + error.message);
        }
    }
    
    // Analysis system
    async startAnalysis() {
        if (window.ULTRA_STATE.isAnalyzing) {
            alert('Аналіз уже виконується');
            return;
        }
        
        const textArea = document.getElementById('analysis-text');
        const clientSelect = document.getElementById('client-select');
        
        if (!textArea?.value?.trim()) {
            alert('Введіть текст для аналізу');
            return;
        }
        
        if (!clientSelect?.value) {
            alert('Оберіть клієнта');
            return;
        }
        
        const text = textArea.value.trim();
        const clientId = parseInt(clientSelect.value);
        
        if (text.length < 20) {
            alert('Текст занадто короткий (мінімум 20 символів)');
            return;
        }
        
        window.ULTRA_STATE.isAnalyzing = true;
        
        // Show progress
        const progressSection = document.querySelector('.analysis-progress');
        const resultsSection = document.getElementById('analysis-results');
        
        if (progressSection) progressSection.style.display = 'block';
        if (resultsSection) resultsSection.style.display = 'block';
        
        const progressBar = document.getElementById('live-progress-percentage');
        const progressText = document.getElementById('progress-text');
        
        if (progressBar) progressBar.textContent = '0%';
        if (progressText) progressText.textContent = 'Починаю аналіз...';
        
        try {
            // Prepare form data
            const formData = new FormData();
            formData.append('client_id', clientId);
            formData.append('text', text);
            formData.append('method', 'text');
            
            console.log('🚀 ULTRA ANALYSIS - Sending request...');
            
            // Make request with extended timeout
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 600000); // 10 minutes
            
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
            
            console.log('🚀 ULTRA ANALYSIS - Reading stream...');
            
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            
            let buffer = '';
            let highlights = [];
            let currentProgress = 0;
            let completedChunks = 0;
            
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
                            
                            switch (data.type) {
                                case 'progress':
                                case 'analysis_started':
                                    currentProgress = Math.min(currentProgress + 5, 90);
                                    if (progressBar) progressBar.textContent = currentProgress + '%';
                                    if (progressText) progressText.textContent = data.message || 'Аналізую...';
                                    break;
                                    
                                case 'highlight':
                                    highlights.push(data);
                                    if (progressText) progressText.textContent = `Знайдено ${highlights.length} проблем...`;
                                    break;
                                    
                                case 'merged_highlights':
                                    highlights = data.items || highlights;
                                    break;
                                    
                                case 'complete':
                                    if (progressBar) progressBar.textContent = '100%';
                                    if (progressText) progressText.textContent = 'Аналіз завершено!';
                                    break;
                                    
                                case 'error':
                                    if (data.chunkNumber) {
                                        console.warn(`🚀 Chunk ${data.chunkNumber} failed: ${data.message}`);
                                        completedChunks++;
                                        currentProgress = Math.min(currentProgress + 15, 90);
                                        if (progressBar) progressBar.textContent = currentProgress + '%';
                                    } else {
                                        throw new Error(data.message || 'Analysis error');
                                    }
                                    break;
                            }
                        } catch (parseError) {
                            console.warn('🚀 Parse error:', parseError);
                        }
                    }
                }
            }
            
            console.log(`🚀 ULTRA ANALYSIS - Completed with ${highlights.length} highlights`);
            
            // Display results
            this.displayResults(highlights, text);
            
            if (progressBar) progressBar.textContent = '100%';
            if (progressText) progressText.textContent = `Знайдено ${highlights.length} проблемних моментів`;
            
        } catch (error) {
            console.error('🚀 ULTRA ANALYSIS - Error:', error);
            
            if (error.name === 'AbortError') {
                if (progressText) progressText.textContent = 'Аналіз перервано через тайм-аут';
                alert('Аналіз перервано через тривалий час очікування. Спробуйте з коротшим текстом.');
            } else {
                if (progressText) progressText.textContent = 'Помилка: ' + error.message;
                alert('Помилка аналізу: ' + error.message);
            }
        } finally {
            window.ULTRA_STATE.isAnalyzing = false;
        }
    }
    
    displayResults(highlights, originalText) {
        const resultsContainer = document.getElementById('highlights-list');
        if (!resultsContainer) return;
        
        if (highlights.length === 0) {
            resultsContainer.innerHTML = '<div class="no-results">Проблемних моментів не знайдено</div>';
            return;
        }
        
        resultsContainer.innerHTML = highlights.map((h, index) => `
            <div class="highlight-item ${h.category || 'manipulation'}" data-index="${index}">
                <div class="highlight-header">
                    <span class="highlight-label">${h.label || `Проблема ${index + 1}`}</span>
                    <span class="highlight-category ${h.category}">${this.getCategoryName(h.category)}</span>
                    <span class="highlight-severity severity-${h.severity || 1}">Рівень ${h.severity || 1}</span>
                </div>
                <div class="highlight-text">"${h.text}"</div>
                <div class="highlight-explanation">${h.explanation || 'Немає пояснення'}</div>
            </div>
        `).join('');
        
        // Update counters
        const totalCount = document.getElementById('total-highlights-count');
        if (totalCount) totalCount.textContent = highlights.length;
        
        console.log(`🚀 ULTRA ANALYSIS - Results displayed: ${highlights.length} highlights`);
    }
    
    getCategoryName(category) {
        const names = {
            'manipulation': 'Маніпуляція',
            'cognitive_bias': 'Когнітивне упередження',
            'rhetological_fallacy': 'Логічна помилка'
        };
        return names[category] || 'Невідомо';
    }
}

// Запуск ультра системи
window.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        console.log('🚀 ЗАПУСК УЛЬТРА СИСТЕМИ...');
        window.ultraButtons = new UltraButtonSystem();
        console.log('🚀 УЛЬТРА СИСТЕМА АКТИВНА!');
    }, 1000);
});

console.log('🚀 УЛЬТРА ФІХ завантажений');