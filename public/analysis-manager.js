/**
 * AnalysisManager - SOLID compliant analysis management system
 * Single Responsibility: Manages only analysis-related operations
 * Open/Closed: Extensible for new analysis types
 * Liskov Substitution: All analysis operations follow same interface
 * Interface Segregation: Separate concerns for input, processing, and results
 * Dependency Inversion: Depends on API abstractions only
 */

class AnalysisManager {
    constructor() {
        this.apiClient = null; // Will be injected
        this.currentAnalysis = null;
        this.isAnalyzing = false;
        this.inputMethod = 'text';
        this.retryAttempts = 3;
        this.lastAnalysisData = null; // For retry functionality
        this.analysisTimeout = null;
        this.heartbeatInterval = null;
        this.failedAnalysisCount = 0;
        this.analysisHistory = [];
        
        console.log('📊 AnalysisManager initialized - optimized for Ultimate Button Controller');
        this.init();
    }
    
    // Single Responsibility: Initialize analysis manager
    init() {
        this.setupAPIClient();
        this.setupInputHandlers();
        this.setupGlobalMethods();
        console.log('📊 AnalysisManager ready');
    }
    
    // Single Responsibility: Setup API client connection
    setupAPIClient() {
        // Wait for API client to be available
        const checkAPIClient = () => {
            if (window.apiClient) {
                this.apiClient = window.apiClient;
                console.log('📊 AnalysisManager connected to API client');
            } else {
                setTimeout(checkAPIClient, 100);
            }
        };
        checkAPIClient();
    }
    
    // Single Responsibility: Setup input handlers
    setupInputHandlers() {
        // Character counter for text input
        const textArea = document.getElementById('negotiation-text');
        if (textArea) {
            textArea.addEventListener('input', (e) => {
                this.updateTextStats(e.target.value);
            });
        }
        
        // File input handler
        const fileInput = document.getElementById('file-input');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileUpload(e.target.files[0]);
            });
        }
        
        // Drag and drop
        const dropzone = document.getElementById('file-dropzone');
        if (dropzone) {
            this.setupDragAndDrop(dropzone);
        }
    }
    
    // Single Responsibility: Setup global methods
    setupGlobalMethods() {
        // Make analysis methods globally available for Ultimate Button Controller
        window.startAnalysis = () => this.startAnalysis();
        window.clearAnalysisText = () => this.clearText();
        window.showAnalysisHistory = () => this.showAnalysisHistory();
        window.getAnalysisAdvice = () => this.getPersonalizedAdvice();
        window.exportAnalysisData = () => this.exportSelectedFragments();
        window.clearAnalysisWorkspace = () => this.clearWorkspace();
        window.updateClientCounter = () => this.updateClientCounter();
        window.initializeCounters = () => this.initializeCounters();
        window.refreshClientSelect = () => this.refreshClientSelect();
        
        // Initialize counters
        this.initializeCounters();
        
        // Initialize workspace
        this.initializeWorkspace();
    }
    
    // Single Responsibility: Update text statistics
    updateTextStats(text) {
        const charCount = text.length;
        const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
        const estimatedTokens = Math.ceil(charCount / 4); // Rough estimate
        
        const charCountEl = document.getElementById('char-count');
        const wordCountEl = document.getElementById('word-count');
        const tokensEl = document.getElementById('estimated-tokens');
        
        if (charCountEl) charCountEl.textContent = `${charCount} символів`;
        if (wordCountEl) wordCountEl.textContent = `${wordCount} слів`;
        if (tokensEl) tokensEl.textContent = `≈ ${estimatedTokens} токенів`;
        
        // Update analysis button state (delegate to ClientService if available)
        if (window.clientService && window.clientService.updateAnalysisButtonState) {
            window.clientService.updateAnalysisButtonState();
        } else {
            // Fallback: Enable/disable analysis button directly
            const analysisBtn = document.getElementById('start-analysis-btn');
            const clientSelect = document.getElementById('client-select');
            
            if (analysisBtn) {
                const hasText = charCount >= 20;
                const hasClient = clientSelect && clientSelect.value;
                analysisBtn.disabled = !hasText || !hasClient || this.isAnalyzing;
            }
        }
    }
    
    // Single Responsibility: Handle file upload
    async handleFileUpload(file) {
        if (!file) return;
        
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            alert('❌ Файл занадто великий (максимум 10MB)');
            return;
        }
        
        const allowedTypes = ['text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        if (!allowedTypes.includes(file.type)) {
            alert('❌ Непідтримуваний тип файлу (підтримуються: TXT, DOC, DOCX)');
            return;
        }
        
        try {
            const text = await this.extractTextFromFile(file);
            const textArea = document.getElementById('negotiation-text');
            if (textArea) {
                textArea.value = text;
                this.updateTextStats(text);
            }
            
            this.showFilePreview(file);
        } catch (error) {
            console.error('📊 File upload error:', error);
            alert('❌ Помилка читання файлу: ' + error.message);
        }
    }
    
    // Single Responsibility: Extract text from file
    async extractTextFromFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => resolve(e.target.result);
            reader.onerror = () => reject(new Error('Помилка читання файлу'));
            reader.readAsText(file);
        });
    }
    
    // Single Responsibility: Show file preview
    showFilePreview(file) {
        const preview = document.getElementById('file-preview');
        const fileName = document.getElementById('file-name');
        const fileSize = document.getElementById('file-size');
        
        if (preview && fileName && fileSize) {
            fileName.textContent = file.name;
            fileSize.textContent = this.formatFileSize(file.size);
            preview.style.display = 'block';
        }
    }
    
    // Single Responsibility: Format file size
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Single Responsibility: Setup drag and drop
    setupDragAndDrop(dropzone) {
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
            if (file) {
                this.handleFileUpload(file);
            }
        });
    }
    
    // Single Responsibility: Start analysis (called by Ultimate Button Controller)
    async startAnalysis() {
        if (this.isAnalyzing) {
            console.warn('📊 Analysis already in progress');
            return false;
        }
        
        const textArea = document.getElementById('negotiation-text');
        const clientSelect = document.getElementById('client-select');
        
        if (!textArea?.value?.trim()) {
            alert('❌ Введіть текст для аналізу');
            if (textArea) textArea.focus();
            return false;
        }
        
        if (!clientSelect?.value) {
            alert('❌ Оберіть клієнта');
            if (clientSelect) clientSelect.focus();
            return false;
        }
        
        const text = textArea.value.trim();
        const clientId = parseInt(clientSelect.value);
        
        if (text.length < 20) {
            alert('❌ Текст занадто короткий (мінімум 20 символів)');
            textArea.focus();
            return false;
        }
        
        this.isAnalyzing = true;
        this.updateUI();
        this.resetBarometer();
        
        try {
            await this.performAnalysis(text, clientId);
            return true;
        } catch (error) {
            console.error('📊 Analysis failed:', error);
            alert('❌ Помилка аналізу: ' + error.message);
            return false;
        } finally {
            this.isAnalyzing = false;
            this.updateUI();
        }
    }
    
    // Single Responsibility: Perform the actual analysis
    async performAnalysis(text, clientId) {
        console.log('📊 Starting analysis...');
        
        this.lastAnalysisData = { text, clientId };
        this.showProgressUI();
        this.updateProgress(0, 'Підготовка до аналізу...');
        
        const analysisData = {
            client_id: clientId,
            text: text,
            method: 'text'
        };
        
        // Add client profile if available
        try {
            const client = await this.getClientProfile(clientId);
            if (client) {
                analysisData.profile = JSON.stringify({
                    company: client.company || '',
                    negotiator: client.negotiator || '',
                    sector: client.sector || ''
                });
            }
        } catch (error) {
            console.warn('📊 Could not load client profile:', error.message);
        }
        
        let attempts = 0;
        const maxAttempts = this.retryAttempts;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            try {
                this.updateProgress(10, `Спроба ${attempts}/${maxAttempts} - відправляю запит...`);
                
                const result = await this.sendAnalysisRequest(analysisData);
                
                // Store in history
                this.analysisHistory.unshift({
                    id: Date.now(),
                    timestamp: new Date(),
                    clientId,
                    text: text.substring(0, 100) + '...',
                    results: result
                });
                
                this.updateProgress(100, 'Аналіз завершено!');
                return result;
                
            } catch (error) {
                console.error(`📊 Analysis attempt ${attempts} failed:`, error);
                this.updateProgress(0, `Спроба ${attempts} - помилка: ${error.message}`);
                
                if (attempts < maxAttempts) {
                    await this.delay(2000 * attempts);
                } else {
                    this.failedAnalysisCount++;
                    throw new Error(`Аналіз не вдався після ${maxAttempts} спроб. ${error.message}`);
                }
            }
        }
    }
    
    // Single Responsibility: Send analysis request
    async sendAnalysisRequest(data) {
        if (!this.apiClient) {
            throw new Error('API клієнт недоступний');
        }
        
        const formData = new URLSearchParams();
        Object.keys(data).forEach(key => {
            formData.append(key, data[key]);
        });
        
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            body: formData,
            credentials: 'include'
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        return await this.processAnalysisStream(response);
    }
    
    // Single Responsibility: Process analysis stream
    async processAnalysisStream(response) {
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
                                case 'barometer':
                                    this.updateBarometer(data);
                                    break;
                                case 'complete':
                                    this.updateProgress(100, 'Аналіз завершено!');
                                    break;
                            }
                        } catch (parseError) {
                            console.warn('📊 Parse error:', parseError);
                        }
                    }
                }
            }
            
            this.displayResults(highlights);
            return highlights;
            
        } finally {
            reader.releaseLock();
        }
    }
    
    // Single Responsibility: Get client profile
    async getClientProfile(clientId) {
        try {
            const response = await fetch('/api/clients', { credentials: 'include' });
            if (!response.ok) return null;
            
            const result = await response.json();
            if (result.success && result.clients) {
                return result.clients.find(c => c.id == clientId);
            }
        } catch (error) {
            console.warn('📊 Error loading client profile:', error);
        }
        return null;
    }
    
    // Single Responsibility: Show progress UI
    showProgressUI() {
        const progressSection = document.querySelector('.analysis-progress');
        const resultsSection = document.getElementById('analysis-results');
        
        if (progressSection) progressSection.style.display = 'block';
        if (resultsSection) resultsSection.style.display = 'block';
    }
    
    // Single Responsibility: Update progress
    updateProgress(percentage, message) {
        const progressBar = document.getElementById('live-progress-percentage');
        const progressText = document.getElementById('step-text');
        
        if (progressBar) progressBar.textContent = Math.round(percentage) + '%';
        if (progressText) progressText.textContent = message;
        
        console.log(`📊 Progress: ${percentage}% - ${message}`);
    }
    
    // Single Responsibility: Display analysis results
    displayResults(highlights) {
        console.log(`📊 Displaying ${highlights.length} analysis results`);
        
        const resultsContainer = document.getElementById('highlights-list');
        if (!resultsContainer) return;
        
        if (highlights.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results" style="text-align: center; padding: 2rem;">
                    <h3>✅ Проблем не знайдено</h3>
                    <p>Текст виглядає чистим від маніпулятивних технік</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = highlights.map((item, index) => `
            <div class="highlight-item ${item.category || 'manipulation'}" data-highlight-id="${item.id || index}" style="margin-bottom: 1rem; border: 1px solid #ddd; padding: 1rem; border-radius: 4px;">
                <div class="highlight-header" style="display: flex; gap: 10px; margin-bottom: 0.5rem; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 10px; align-items: center;">
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
                    <button class="btn-ghost btn-sm add-to-workspace-btn" 
                            data-highlight-index="${index}"
                            title="Додати до робочої області"
                            style="padding: 4px 8px; font-size: 0.8em;">
                        <i class="fas fa-plus"></i>
                        До робочої області
                    </button>
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
        this.updateResultCounters(highlights);
        
        // Add event handlers for workspace buttons
        this.attachWorkspaceButtonHandlers(highlights);
        
        // Store highlights for navigation functionality
        this.currentHighlights = highlights;
        
        // Setup navigation controls
        this.setupNavigationControls();
    }
    
    // Single Responsibility: Update result counters
    updateResultCounters(highlights) {
        console.log('📊 Updating counters with', highlights.length, 'highlights');
        
        // Count by categories
        const counters = {
            manipulation: 0,
            cognitive_bias: 0,
            rhetological_fallacy: 0,
            total: highlights.length
        };
        
        highlights.forEach(h => {
            const category = h.category || 'manipulation';
            if (counters.hasOwnProperty(category)) {
                counters[category]++;
            }
        });
        
        // Update analysis count in header
        const analysisCountEl = document.getElementById('analysis-count');
        if (analysisCountEl) {
            const currentCount = parseInt(analysisCountEl.textContent) || 0;
            analysisCountEl.textContent = currentCount + 1;
        }
        
        // Update statistics cards
        const manipulationsEl = document.getElementById('manipulations-count');
        if (manipulationsEl) manipulationsEl.textContent = counters.manipulation;
        
        const biasesEl = document.getElementById('biases-count');
        if (biasesEl) biasesEl.textContent = counters.cognitive_bias;
        
        const fallaciesEl = document.getElementById('fallacies-count');
        if (fallaciesEl) fallaciesEl.textContent = counters.rhetological_fallacy;
        
        // Update recommendations count (for now, equal to total highlights)
        const recommendationsEl = document.getElementById('recommendations-count');
        if (recommendationsEl) recommendationsEl.textContent = highlights.length;
        
        // Update fragments count (simulated)
        const fragmentsEl = document.getElementById('fragments-count');
        if (fragmentsEl) {
            const currentFragments = parseInt(fragmentsEl.textContent) || 0;
            fragmentsEl.textContent = currentFragments + highlights.length;
        }
        
        // Update displayed count
        const displayedCountEl = document.getElementById('displayed-count');
        if (displayedCountEl) {
            displayedCountEl.textContent = `Показано: ${highlights.length} з ${highlights.length}`;
        }
        
        console.log('📊 Counters updated:', counters);
    }
    
    // Utility methods
    clearText() {
        const textArea = document.getElementById('negotiation-text');
        if (textArea) {
            textArea.value = '';
            this.updateTextStats('');
            textArea.focus();
        }
    }
    
    showAnalysisHistory() {
        console.log('📊 Showing analysis history');
        const modal = document.getElementById('analysis-history-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.zIndex = '10001';
        }
    }
    
    async getPersonalizedAdvice() {
        console.log('📊 Getting personalized advice for selected workspace items');
        
        if (!this.workspaceItems || this.workspaceItems.length === 0) {
            alert('❌ Спочатку додайте фрагменти до робочої області');
            return;
        }
        
        const selectedItems = this.workspaceItems.filter(item => item.selected);
        if (selectedItems.length === 0) {
            alert('❌ Оберіть фрагменти для отримання порад');
            return;
        }
        
        console.log('📊 Generating advice for', selectedItems.length, 'selected items');
        
        try {
            // Show loading state
            this.showAdviceLoadingState();
            
            const advice = await this.requestPersonalizedAdvice(selectedItems);
            this.displayAdviceResults(advice);
            
        } catch (error) {
            console.error('📊 Error getting advice:', error);
            this.showAdviceError(error.message);
        }
    }
    
    // Single Responsibility: Show advice loading state
    showAdviceLoadingState() {
        const modal = document.getElementById('advice-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-robot"></i> Генерую персоналізовані поради...</h3>
                        <button class="modal-close" onclick="this.closest('.modal').style.display='none'">&times;</button>
                    </div>
                    <div class="modal-body">
                        <div class="advice-loading">
                            <div class="loading-spinner"></div>
                            <p>Аналізую обрані фрагменти та генерую стратегічні поради...</p>
                            <div class="loading-progress">
                                <div class="progress-bar">
                                    <div class="progress-fill" style="animation: loading-progress 3s infinite;"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Create modal if doesn't exist
            this.createAdviceModal();
            this.showAdviceLoadingState();
        }
    }
    
    // Single Responsibility: Request advice from API
    async requestPersonalizedAdvice(selectedItems) {
        const clientSelect = document.getElementById('client-select');
        const clientId = clientSelect ? clientSelect.value : null;
        
        if (!clientId) {
            throw new Error('Оберіть клієнта для персоналізованих порад');
        }
        
        // Get client profile
        let clientProfile = {};
        try {
            const clientsResponse = await fetch('/api/clients', { credentials: 'include' });
            if (clientsResponse.ok) {
                const clientsResult = await clientsResponse.json();
                if (clientsResult.success && clientsResult.clients) {
                    const client = clientsResult.clients.find(c => c.id == clientId);
                    if (client) {
                        clientProfile = {
                            company: client.company,
                            negotiator: client.negotiator,
                            sector: client.sector,
                            user_goals: client.user_goals,
                            client_goals: client.client_goals,
                            weekly_hours: client.weekly_hours,
                            offered_services: client.offered_services,
                            deadlines: client.deadlines,
                            constraints: client.constraints,
                            decision_criteria: client.decision_criteria,
                            notes: client.notes
                        };
                    }
                }
            }
        } catch (error) {
            console.warn('📊 Could not load client profile:', error.message);
        }
        
        // Prepare advice request
        const adviceData = {
            items: selectedItems.map(item => ({
                text: item.text,
                label: item.label,
                category: item.category,
                severity: item.severity,
                explanation: item.explanation
            })),
            profile: clientProfile
        };
        
        console.log('📊 Sending advice request:', adviceData);
        
        const response = await fetch('/api/advice', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify(adviceData)
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        
        const result = await response.json();
        
        if (!result.success) {
            throw new Error(result.error || 'Помилка отримання порад');
        }
        
        return result.advice;
    }
    
    // Single Responsibility: Display advice results
    displayAdviceResults(advice) {
        console.log('📊 Displaying advice results:', advice);
        
        const modal = document.getElementById('advice-modal');
        if (!modal) return;
        
        modal.innerHTML = `
            <div class="modal-content advice-modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-lightbulb"></i> Персоналізовані поради</h3>
                    <button class="modal-close" onclick="this.closest('.modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="advice-content">
                        <!-- Recommended Replies -->
                        <div class="advice-section">
                            <h4><i class="fas fa-comments"></i> Рекомендовані відповіді</h4>
                            <div class="recommended-replies">
                                ${(advice.recommended_replies || []).map((reply, index) => `
                                    <div class="reply-item">
                                        <div class="reply-header">
                                            <span class="reply-number">#${index + 1}</span>
                                            <button class="btn-ghost btn-sm copy-reply-btn" 
                                                    data-reply="${this.escapeHtml(reply)}"
                                                    title="Копіювати відповідь">
                                                <i class="fas fa-copy"></i> Копіювати
                                            </button>
                                        </div>
                                        <div class="reply-text">"${this.escapeHtml(reply)}"</div>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Risks -->
                        <div class="advice-section">
                            <h4><i class="fas fa-exclamation-triangle"></i> Ключові ризики</h4>
                            <div class="risks-list">
                                ${(advice.risks || []).map(risk => `
                                    <div class="risk-item">
                                        <i class="fas fa-warning"></i>
                                        <span>${this.escapeHtml(risk)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                        
                        <!-- Strategic Notes -->
                        <div class="advice-section">
                            <h4><i class="fas fa-chess"></i> Стратегічні рекомендації</h4>
                            <div class="strategic-notes">
                                ${this.escapeHtml(advice.notes || 'Додаткові рекомендації відсутні')}
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="this.closest('.modal').style.display='none'">
                        Закрити
                    </button>
                    <button class="btn-primary" onclick="window.analysisManager.saveAdviceToHistory(${JSON.stringify(advice).replace(/"/g, '&quot;')})">
                        <i class="fas fa-save"></i> Зберегти в історію
                    </button>
                </div>
            </div>
        `;
        
        // Attach copy button handlers
        this.attachAdviceCopyHandlers();
    }
    
    // Single Responsibility: Show advice error
    showAdviceError(errorMessage) {
        const modal = document.getElementById('advice-modal');
        if (!modal) return;
        
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3><i class="fas fa-exclamation-circle"></i> Помилка генерації порад</h3>
                    <button class="modal-close" onclick="this.closest('.modal').style.display='none'">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="error-message">
                        <i class="fas fa-times-circle"></i>
                        <p>${this.escapeHtml(errorMessage)}</p>
                    </div>
                    <div class="error-suggestions">
                        <h5>Можливі рішення:</h5>
                        <ul>
                            <li>Перевірте з'єднання з інтернетом</li>
                            <li>Оберіть менше фрагментів (максимум 50)</li>
                            <li>Переконайтеся, що обрано клієнта</li>
                            <li>Спробуйте ще раз через декілька секунд</li>
                        </ul>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-ghost" onclick="this.closest('.modal').style.display='none'">
                        Закрити
                    </button>
                    <button class="btn-primary" onclick="window.analysisManager.getPersonalizedAdvice()">
                        <i class="fas fa-redo"></i> Спробувати ще раз
                    </button>
                </div>
            </div>
        `;
    }
    
    // Single Responsibility: Attach copy button handlers
    attachAdviceCopyHandlers() {
        const copyButtons = document.querySelectorAll('.copy-reply-btn');
        copyButtons.forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const replyText = button.dataset.reply;
                
                try {
                    await navigator.clipboard.writeText(replyText);
                    button.innerHTML = '<i class="fas fa-check"></i> Скопійовано';
                    button.style.background = '#28a745';
                    
                    setTimeout(() => {
                        button.innerHTML = '<i class="fas fa-copy"></i> Копіювати';
                        button.style.background = '';
                    }, 2000);
                } catch (error) {
                    console.error('📊 Copy failed:', error);
                    // Fallback for older browsers
                    const textArea = document.createElement('textarea');
                    textArea.value = replyText;
                    document.body.appendChild(textArea);
                    textArea.select();
                    document.execCommand('copy');
                    document.body.removeChild(textArea);
                    
                    button.innerHTML = '<i class="fas fa-check"></i> Скопійовано';
                    setTimeout(() => {
                        button.innerHTML = '<i class="fas fa-copy"></i> Копіювати';
                    }, 2000);
                }
            });
        });
    }
    
    // Single Responsibility: Create advice modal if it doesn't exist
    createAdviceModal() {
        let modal = document.getElementById('advice-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'advice-modal';
            modal.className = 'modal';
            modal.style.display = 'none';
            document.body.appendChild(modal);
        }
        return modal;
    }
    
    // Single Responsibility: Save advice to history (placeholder)
    saveAdviceToHistory(advice) {
        console.log('📊 Saving advice to history:', advice);
        // For now, just show confirmation
        alert('💾 Поради збережено в історію (функція в розробці)');
        
        // Close modal
        const modal = document.getElementById('advice-modal');
        if (modal) modal.style.display = 'none';
    }
    
    exportSelectedFragments() {
        console.log('📊 Exporting selected fragments');
        alert('📁 Функція експорту буде доступна найближчим часом');
    }
    
    clearWorkspace() {
        console.log('📊 Clearing workspace');
        if (confirm('❓ Очистити робочу область?')) {
            this.workspaceItems = [];
            this.updateWorkspaceDisplay();
            this.updateWorkspaceCounter();
            this.showWorkspaceNotification('Робочу область очищено');
        }
    }
    
    updateUI() {
        const analysisBtn = document.getElementById('start-analysis-btn');
        if (analysisBtn) {
            analysisBtn.disabled = this.isAnalyzing;
            analysisBtn.textContent = this.isAnalyzing ? 'Аналізую...' : 'Розпочати аналіз';
        }
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
    
    // Single Responsibility: Initialize all counters
    initializeCounters() {
        console.log('📊 Initializing counters...');
        
        // Initialize statistics cards
        const statsCounters = ['manipulations-count', 'biases-count', 'fallacies-count', 'recommendations-count'];
        statsCounters.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.textContent === '') {
                element.textContent = '0';
            }
        });
        
        // Initialize text counters
        const textCounters = ['char-count', 'word-count', 'estimated-tokens'];
        textCounters.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.textContent === '') {
                if (id === 'char-count') element.textContent = '0 символів';
                else if (id === 'word-count') element.textContent = '0 слів';
                else if (id === 'estimated-tokens') element.textContent = '≈ 0 токенів';
            }
        });
        
        // Initialize header counters
        const headerCounters = ['client-count', 'analysis-count', 'fragments-count'];
        headerCounters.forEach(id => {
            const element = document.getElementById(id);
            if (element && element.textContent === '') {
                element.textContent = '0';
            }
        });
        
        // Initialize display counters
        const displayedCountEl = document.getElementById('displayed-count');
        if (displayedCountEl && displayedCountEl.textContent === '') {
            displayedCountEl.textContent = 'Показано: 0 з 0';
        }
        
        const selectionCountEl = document.getElementById('selection-count');
        if (selectionCountEl && selectionCountEl.textContent === '') {
            selectionCountEl.textContent = 'Обрано: 0';
        }
        
        // Load and display current client count
        this.updateClientCounter();
        
        console.log('📊 Counters initialized');
    }
    
    // Single Responsibility: Initialize workspace functionality
    initializeWorkspace() {
        console.log('📊 Initializing workspace...');
        
        // Initialize workspace items array
        this.workspaceItems = [];
        
        // Setup workspace display
        this.updateWorkspaceDisplay();
        this.updateWorkspaceCounter();
        
        console.log('📊 Workspace initialized');
    }
    
    // Single Responsibility: Update client counter from server
    async updateClientCounter() {
        try {
            const response = await fetch('/api/clients', { credentials: 'include' });
            if (response.ok) {
                const result = await response.json();
                if (result.success && result.clients) {
                    const clientCountEl = document.getElementById('client-count');
                    if (clientCountEl) {
                        clientCountEl.textContent = result.clients.length;
                        console.log('📊 Client counter updated:', result.clients.length);
                    }
                }
            }
        } catch (error) {
            console.warn('📊 Could not update client counter:', error.message);
        }
    }
    
    // Single Responsibility: Reset analysis-related counters
    resetAnalysisCounters() {
        const resetCounters = ['manipulations-count', 'biases-count', 'fallacies-count'];
        resetCounters.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.textContent = '0';
        });
        
        const displayedCountEl = document.getElementById('displayed-count');
        if (displayedCountEl) displayedCountEl.textContent = 'Показано: 0 з 0';
        
        console.log('📊 Analysis counters reset');
    }
    
    // Single Responsibility: Update barometer display
    updateBarometer(data) {
        console.log('📊 Updating barometer:', data);
        
        if (!data || typeof data.score === 'undefined') {
            console.warn('📊 Invalid barometer data received');
            return;
        }
        
        const scoreElement = document.getElementById('barometer-score');
        const labelElement = document.getElementById('barometer-label');
        const commentElement = document.getElementById('barometer-comment');
        
        // Update score display
        if (scoreElement) {
            scoreElement.textContent = `${data.score}%`;
            scoreElement.className = `barometer-score ${this.getScoreClass(data.score)}`;
        }
        
        // Update label
        if (labelElement) {
            labelElement.textContent = data.label || 'Невідомий рівень';
            labelElement.className = `barometer-label ${this.getScoreClass(data.score)}`;
        }
        
        // Update comment/rationale
        if (commentElement) {
            commentElement.textContent = data.rationale || 'Аналіз завершено';
            commentElement.style.display = data.rationale ? 'block' : 'none';
        }
        
        // Update gauge visual
        this.updateGaugeVisual(data.score);
        
        console.log('📊 Barometer updated successfully');
    }
    
    // Single Responsibility: Get CSS class based on score
    getScoreClass(score) {
        if (score >= 80) return 'score-critical';
        if (score >= 60) return 'score-high';
        if (score >= 40) return 'score-medium';
        if (score >= 20) return 'score-low';
        return 'score-minimal';
    }
    
    // Single Responsibility: Update gauge visual indicator
    updateGaugeVisual(score) {
        const gaugeCircle = document.querySelector('.gauge-circle svg');
        if (!gaugeCircle) return;
        
        // Update gauge needle or progress arc
        const progressArc = gaugeCircle.querySelector('.gauge-progress');
        if (progressArc) {
            // Calculate arc parameters for the score
            const normalizedScore = Math.max(0, Math.min(100, score));
            const circumference = 2 * Math.PI * 30; // Assuming radius of 30
            const offset = circumference - (normalizedScore / 100) * circumference;
            
            progressArc.style.strokeDasharray = circumference;
            progressArc.style.strokeDashoffset = offset;
            progressArc.style.stroke = this.getGaugeColor(normalizedScore);
        }
        
        // Update gauge text if present
        const gaugeText = gaugeCircle.querySelector('.gauge-text');
        if (gaugeText) {
            gaugeText.textContent = `${score}%`;
        }
        
        // Add pulse animation for high scores
        const barometerCard = document.querySelector('.barometer-card');
        if (barometerCard) {
            barometerCard.classList.remove('pulse-warning', 'pulse-critical');
            if (score >= 80) {
                barometerCard.classList.add('pulse-critical');
            } else if (score >= 60) {
                barometerCard.classList.add('pulse-warning');
            }
        }
    }
    
    // Single Responsibility: Get gauge color based on score
    getGaugeColor(score) {
        if (score >= 80) return '#dc3545'; // Critical - red
        if (score >= 60) return '#fd7e14'; // High - orange
        if (score >= 40) return '#ffc107'; // Medium - yellow
        if (score >= 20) return '#28a745'; // Low - green
        return '#6c757d'; // Minimal - gray
    }
    
    // Single Responsibility: Reset barometer to initial state
    resetBarometer() {
        const scoreElement = document.getElementById('barometer-score');
        const labelElement = document.getElementById('barometer-label');
        const commentElement = document.getElementById('barometer-comment');
        
        if (scoreElement) {
            scoreElement.textContent = '—';
            scoreElement.className = 'barometer-score';
        }
        
        if (labelElement) {
            labelElement.textContent = 'Очікування аналізу...';
            labelElement.className = 'barometer-label';
        }
        
        if (commentElement) {
            commentElement.textContent = '';
            commentElement.style.display = 'none';
        }
        
        // Reset gauge visual
        this.updateGaugeVisual(0);
        
        console.log('📊 Barometer reset');
    }
    
    // Single Responsibility: Attach event handlers for workspace buttons
    attachWorkspaceButtonHandlers(highlights) {
        const workspaceButtons = document.querySelectorAll('.add-to-workspace-btn');
        workspaceButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const highlightIndex = parseInt(button.dataset.highlightIndex);
                const highlight = highlights[highlightIndex];
                if (highlight) {
                    this.addToWorkspace(highlight, highlightIndex);
                }
            });
        });
    }
    
    // Single Responsibility: Add highlight to workspace
    addToWorkspace(highlight, index) {
        console.log('📊 Adding highlight to workspace:', highlight);
        
        // Get or initialize workspace data
        if (!this.workspaceItems) {
            this.workspaceItems = [];
        }
        
        // Check if already added
        const existingItem = this.workspaceItems.find(item => 
            item.text === highlight.text && item.category === highlight.category
        );
        
        if (existingItem) {
            alert('⚠️ Цей фрагмент вже додано до робочої області');
            return;
        }
        
        // Create workspace item
        const workspaceItem = {
            id: Date.now() + Math.random(),
            originalIndex: index,
            text: highlight.text,
            label: highlight.label || `Проблема ${index + 1}`,
            category: highlight.category || 'manipulation',
            severity: highlight.severity || 1,
            explanation: highlight.explanation || '',
            addedAt: new Date(),
            selected: false
        };
        
        this.workspaceItems.push(workspaceItem);
        this.updateWorkspaceDisplay();
        this.updateWorkspaceCounter();
        
        // Visual feedback
        this.showWorkspaceNotification(`Додано: "${highlight.label || 'Фрагмент'}"`);
        
        console.log('📊 Workspace updated, total items:', this.workspaceItems.length);
    }
    
    // Single Responsibility: Update workspace display
    updateWorkspaceDisplay() {
        const workspaceContainer = document.getElementById('selected-fragments');
        if (!workspaceContainer) return;
        
        if (!this.workspaceItems || this.workspaceItems.length === 0) {
            workspaceContainer.innerHTML = `
                <div class="empty-workspace">
                    <i class="fas fa-bookmark" style="font-size: 2rem; color: #ccc; margin-bottom: 1rem;"></i>
                    <p style="color: #999; text-align: center;">Робоча область порожня</p>
                    <p style="color: #999; font-size: 0.9em; text-align: center;">Додайте фрагменти з результатів аналізу</p>
                </div>
            `;
            return;
        }
        
        workspaceContainer.innerHTML = this.workspaceItems.map((item, index) => `
            <div class="workspace-item ${item.selected ? 'selected' : ''}" data-workspace-id="${item.id}">
                <div class="workspace-item-header">
                    <div class="workspace-item-controls">
                        <input type="checkbox" 
                               class="workspace-item-checkbox" 
                               data-workspace-id="${item.id}"
                               ${item.selected ? 'checked' : ''}>
                        <span class="workspace-item-category ${item.category}">${this.getCategoryLabel(item.category)}</span>
                        <span class="workspace-item-severity severity-${item.severity}">Рівень ${item.severity}</span>
                    </div>
                    <button class="workspace-item-remove" 
                            data-workspace-id="${item.id}"
                            title="Видалити з робочої області">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="workspace-item-label">${this.escapeHtml(item.label)}</div>
                <div class="workspace-item-text">"${this.escapeHtml(item.text || 'Текст відсутній')}"</div>
                <div class="workspace-item-explanation">${this.escapeHtml(item.explanation || 'Пояснення відсутнє')}</div>
                <div class="workspace-item-meta">
                    Додано: ${this.formatDate(item.addedAt)}
                </div>
            </div>
        `).join('');
        
        // Attach event handlers
        this.attachWorkspaceItemHandlers();
    }
    
    // Single Responsibility: Attach workspace item event handlers
    attachWorkspaceItemHandlers() {
        // Checkbox handlers
        const checkboxes = document.querySelectorAll('.workspace-item-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const itemId = parseFloat(checkbox.dataset.workspaceId);
                const item = this.workspaceItems.find(item => item.id === itemId);
                if (item) {
                    item.selected = checkbox.checked;
                    this.updateWorkspaceSelectionUI();
                }
            });
        });
        
        // Remove button handlers
        const removeButtons = document.querySelectorAll('.workspace-item-remove');
        removeButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = parseFloat(button.dataset.workspaceId);
                this.removeFromWorkspace(itemId);
            });
        });
    }
    
    // Single Responsibility: Remove item from workspace
    removeFromWorkspace(itemId) {
        const itemIndex = this.workspaceItems.findIndex(item => item.id === itemId);
        if (itemIndex === -1) return;
        
        const item = this.workspaceItems[itemIndex];
        this.workspaceItems.splice(itemIndex, 1);
        
        this.updateWorkspaceDisplay();
        this.updateWorkspaceCounter();
        this.showWorkspaceNotification(`Видалено: "${item.label}"`);
        
        console.log('📊 Item removed from workspace, remaining:', this.workspaceItems.length);
    }
    
    // Single Responsibility: Update workspace selection UI
    updateWorkspaceSelectionUI() {
        const selectedCount = this.workspaceItems.filter(item => item.selected).length;
        const totalCount = this.workspaceItems.length;
        
        // Update selection counter
        const selectionCounter = document.querySelector('.bulk-selection-count');
        if (selectionCounter) {
            selectionCounter.textContent = `${selectedCount} обрано`;
        }
        
        // Enable/disable action buttons
        const actionButtons = document.querySelectorAll('#get-advice-btn, #export-data-btn, #clear-workspace-btn');
        actionButtons.forEach(button => {
            if (button.id === 'clear-workspace-btn') {
                button.disabled = totalCount === 0;
            } else {
                button.disabled = selectedCount === 0;
            }
        });
        
        console.log('📊 Workspace selection updated:', selectedCount, 'of', totalCount);
    }
    
    // Single Responsibility: Update workspace counter
    updateWorkspaceCounter() {
        const counter = document.getElementById('fragments-count');
        if (counter) {
            counter.textContent = this.workspaceItems ? this.workspaceItems.length : 0;
        }
        
        this.updateWorkspaceSelectionUI();
    }
    
    // Single Responsibility: Show workspace notification
    showWorkspaceNotification(message) {
        // Create or update notification
        let notification = document.getElementById('workspace-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'workspace-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: #28a745;
                color: white;
                padding: 12px 16px;
                border-radius: 6px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                z-index: 10000;
                font-size: 14px;
                max-width: 300px;
                opacity: 0;
                transform: translateX(100%);
                transition: all 0.3s ease;
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.opacity = '1';
        notification.style.transform = 'translateX(0)';
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
        }, 3000);
    }
    
    // Single Responsibility: Get category label
    getCategoryLabel(category) {
        const labels = {
            manipulation: 'Маніпуляція',
            cognitive_bias: 'Когнітивне упередження',
            rhetological_fallacy: 'Логічна помилка'
        };
        return labels[category] || 'Невідомо';
    }
    
    // Single Responsibility: Format date
    formatDate(date) {
        if (!date) return 'Невідомо';
        const d = new Date(date);
        return d.toLocaleString('uk-UA', {
            day: '2-digit',
            month: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    }
    
    // Single Responsibility: Refresh client select dropdown
    async refreshClientSelect() {
        try {
            console.log('📊 Refreshing client select dropdown...');
            
            const response = await fetch('/api/clients', { credentials: 'include' });
            if (!response.ok) return;
            
            const result = await response.json();
            if (!result.success || !result.clients) return;
            
            const clientSelect = document.getElementById('client-select');
            if (!clientSelect) return;
            
            // Store current selection
            const currentValue = clientSelect.value;
            
            // Clear existing options except the first one
            const firstOption = clientSelect.querySelector('option[value=""]');
            clientSelect.innerHTML = '';
            
            // Add default option
            if (firstOption) {
                clientSelect.appendChild(firstOption);
            } else {
                const defaultOption = document.createElement('option');
                defaultOption.value = '';
                defaultOption.textContent = 'Оберіть клієнта...';
                clientSelect.appendChild(defaultOption);
            }
            
            // Add client options
            result.clients.forEach(client => {
                const option = document.createElement('option');
                option.value = client.id;
                option.textContent = `${client.company || 'Без назви'} (${client.negotiator || 'Невідомо'})`;
                clientSelect.appendChild(option);
            });
            
            // Restore selection if still valid
            if (currentValue && [...clientSelect.options].some(opt => opt.value === currentValue)) {
                clientSelect.value = currentValue;
            }
            
            console.log('📊 Client select refreshed with', result.clients.length, 'clients');
            
        } catch (error) {
            console.warn('📊 Could not refresh client select:', error.message);
        }
    }
    
    // ===== NAVIGATION AND FILTERING FUNCTIONALITY =====
    
    // Single Responsibility: Setup navigation controls
    setupNavigationControls() {
        console.log('📊 Setting up navigation controls...');
        
        // Initialize filters state
        this.activeFilters = {
            categories: new Set(),
            severities: new Set(),
            searchTerm: ''
        };
        
        // Attach filter event handlers
        this.attachFilterHandlers();
        this.attachSortHandlers();
        this.attachSearchHandlers();
        
        console.log('📊 Navigation controls ready');
    }
    
    // Single Responsibility: Attach filter event handlers
    attachFilterHandlers() {
        // Category filter buttons (if they exist)
        const categoryButtons = document.querySelectorAll('[data-filter-category]');
        categoryButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const category = button.dataset.filterCategory;
                this.toggleCategoryFilter(category);
            });
        });
        
        // Severity filter buttons (if they exist)
        const severityButtons = document.querySelectorAll('[data-filter-severity]');
        severityButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const severity = parseInt(button.dataset.filterSeverity);
                this.toggleSeverityFilter(severity);
            });
        });
        
        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.clearAllFilters();
            });
        }
    }
    
    // Single Responsibility: Attach sort event handlers
    attachSortHandlers() {
        const sortSelect = document.getElementById('results-sort-select');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                const sortBy = e.target.value;
                this.sortResults(sortBy);
            });
        }
    }
    
    // Single Responsibility: Attach search event handlers
    attachSearchHandlers() {
        const searchInput = document.getElementById('results-search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.activeFilters.searchTerm = e.target.value.toLowerCase().trim();
                    this.applyFilters();
                }, 300); // Debounce search
            });
        }
    }
    
    // Single Responsibility: Toggle category filter
    toggleCategoryFilter(category) {
        console.log('📊 Toggling category filter:', category);
        
        if (this.activeFilters.categories.has(category)) {
            this.activeFilters.categories.delete(category);
        } else {
            this.activeFilters.categories.add(category);
        }
        
        this.applyFilters();
        this.updateFilterUI();
    }
    
    // Single Responsibility: Toggle severity filter
    toggleSeverityFilter(severity) {
        console.log('📊 Toggling severity filter:', severity);
        
        if (this.activeFilters.severities.has(severity)) {
            this.activeFilters.severities.delete(severity);
        } else {
            this.activeFilters.severities.add(severity);
        }
        
        this.applyFilters();
        this.updateFilterUI();
    }
    
    // Single Responsibility: Clear all filters
    clearAllFilters() {
        console.log('📊 Clearing all filters');
        
        this.activeFilters = {
            categories: new Set(),
            severities: new Set(),
            searchTerm: ''
        };
        
        // Clear search input
        const searchInput = document.getElementById('results-search-input');
        if (searchInput) searchInput.value = '';
        
        this.applyFilters();
        this.updateFilterUI();
    }
    
    // Single Responsibility: Apply current filters to results
    applyFilters() {
        if (!this.currentHighlights) return;
        
        console.log('📊 Applying filters...', this.activeFilters);
        
        let filteredHighlights = [...this.currentHighlights];
        
        // Apply category filters
        if (this.activeFilters.categories.size > 0) {
            filteredHighlights = filteredHighlights.filter(h => 
                this.activeFilters.categories.has(h.category)
            );
        }
        
        // Apply severity filters
        if (this.activeFilters.severities.size > 0) {
            filteredHighlights = filteredHighlights.filter(h => 
                this.activeFilters.severities.has(h.severity)
            );
        }
        
        // Apply search filter
        if (this.activeFilters.searchTerm) {
            filteredHighlights = filteredHighlights.filter(h => {
                const searchableText = [
                    h.text,
                    h.label,
                    h.explanation,
                    h.category
                ].join(' ').toLowerCase();
                
                return searchableText.includes(this.activeFilters.searchTerm);
            });
        }
        
        console.log('📊 Filtered results:', filteredHighlights.length, 'of', this.currentHighlights.length);
        
        // Update display without triggering full re-render
        this.displayFilteredResults(filteredHighlights);
        this.updateNavigationStats(filteredHighlights);
    }
    
    // Single Responsibility: Display filtered results
    displayFilteredResults(filteredHighlights) {
        const resultsContainer = document.getElementById('highlights-list');
        if (!resultsContainer) return;
        
        if (filteredHighlights.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results" style="text-align: center; padding: 2rem;">
                    <h3>🔍 Нічого не знайдено</h3>
                    <p>Спробуйте змінити фільтри або критерії пошуку</p>
                    <button class="btn-ghost" onclick="window.analysisManager.clearAllFilters()">
                        <i class="fas fa-times"></i> Очистити фільтри
                    </button>
                </div>
            `;
            return;
        }
        
        // Re-use existing display logic but with filtered data
        resultsContainer.innerHTML = filteredHighlights.map((item, index) => `
            <div class="highlight-item ${item.category || 'manipulation'}" data-highlight-id="${item.id || index}" style="margin-bottom: 1rem; border: 1px solid #ddd; padding: 1rem; border-radius: 4px;">
                <div class="highlight-header" style="display: flex; gap: 10px; margin-bottom: 0.5rem; align-items: center; justify-content: space-between;">
                    <div style="display: flex; gap: 10px; align-items: center;">
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
                    <button class="btn-ghost btn-sm add-to-workspace-btn" 
                            data-highlight-index="${this.currentHighlights.indexOf(item)}"
                            title="Додати до робочої області"
                            style="padding: 4px 8px; font-size: 0.8em;">
                        <i class="fas fa-plus"></i>
                        До робочої області
                    </button>
                </div>
                <div class="highlight-text" style="background: #f8f9fa; padding: 0.5rem; margin: 0.5rem 0; border-left: 3px solid #007bff; font-style: italic;">
                    "${this.escapeHtml(item.text || 'Текст не знайдено')}"
                </div>
                <div class="highlight-explanation" style="color: #6c757d;">
                    ${this.escapeHtml(item.explanation || 'Пояснення відсутнє')}
                </div>
            </div>
        `).join('');
        
        // Re-attach workspace button handlers for filtered results
        this.attachWorkspaceButtonHandlers(this.currentHighlights);
    }
    
    // Single Responsibility: Sort results
    sortResults(sortBy) {
        if (!this.currentHighlights) return;
        
        console.log('📊 Sorting results by:', sortBy);
        
        let sortedHighlights = [...this.currentHighlights];
        
        switch (sortBy) {
            case 'severity-desc':
                sortedHighlights.sort((a, b) => (b.severity || 1) - (a.severity || 1));
                break;
            case 'severity-asc':
                sortedHighlights.sort((a, b) => (a.severity || 1) - (b.severity || 1));
                break;
            case 'category':
                sortedHighlights.sort((a, b) => {
                    const categoryA = a.category || 'manipulation';
                    const categoryB = b.category || 'manipulation';
                    return categoryA.localeCompare(categoryB);
                });
                break;
            case 'length-desc':
                sortedHighlights.sort((a, b) => (b.text?.length || 0) - (a.text?.length || 0));
                break;
            case 'length-asc':
                sortedHighlights.sort((a, b) => (a.text?.length || 0) - (b.text?.length || 0));
                break;
            case 'position':
            default:
                sortedHighlights.sort((a, b) => (a.char_start || 0) - (b.char_start || 0));
                break;
        }
        
        this.currentHighlights = sortedHighlights;
        this.applyFilters(); // Re-apply filters to sorted results
    }
    
    // Single Responsibility: Update filter UI indicators
    updateFilterUI() {
        const totalActiveFilters = this.activeFilters.categories.size + 
                                  this.activeFilters.severities.size + 
                                  (this.activeFilters.searchTerm ? 1 : 0);
        
        // Update active filters count badge
        const filterBadge = document.getElementById('active-filters-count');
        if (filterBadge) {
            if (totalActiveFilters > 0) {
                filterBadge.textContent = totalActiveFilters;
                filterBadge.style.display = 'inline';
            } else {
                filterBadge.style.display = 'none';
            }
        }
        
        // Update filter button states
        document.querySelectorAll('[data-filter-category]').forEach(button => {
            const category = button.dataset.filterCategory;
            if (this.activeFilters.categories.has(category)) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
        
        document.querySelectorAll('[data-filter-severity]').forEach(button => {
            const severity = parseInt(button.dataset.filterSeverity);
            if (this.activeFilters.severities.has(severity)) {
                button.classList.add('active');
            } else {
                button.classList.remove('active');
            }
        });
    }
    
    // Single Responsibility: Update navigation statistics
    updateNavigationStats(filteredHighlights) {
        const totalCount = this.currentHighlights ? this.currentHighlights.length : 0;
        const filteredCount = filteredHighlights.length;
        
        // Update displayed count
        const displayedCountEl = document.getElementById('displayed-count');
        if (displayedCountEl) {
            displayedCountEl.textContent = `Показано: ${filteredCount} з ${totalCount}`;
        }
        
        console.log('📊 Navigation stats updated:', {
            total: totalCount,
            filtered: filteredCount,
            activeFilters: this.activeFilters
        });
    }
    
    // Single Responsibility: Quick navigation to specific highlight
    navigateToHighlight(highlightId) {
        const highlightElement = document.querySelector(`[data-highlight-id="${highlightId}"]`);
        if (highlightElement) {
            highlightElement.scrollIntoView({ 
                behavior: 'smooth', 
                block: 'center' 
            });
            
            // Add highlight effect
            highlightElement.style.animation = 'highlight-flash 2s ease-in-out';
            setTimeout(() => {
                highlightElement.style.animation = '';
            }, 2000);
        }
    }
}

// Auto-initialize
window.AnalysisManager = AnalysisManager;