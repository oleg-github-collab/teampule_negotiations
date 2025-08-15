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
        
        // Enable/disable analysis button
        const analysisBtn = document.getElementById('start-analysis-btn');
        const clientSelect = document.getElementById('client-select');
        
        if (analysisBtn) {
            const hasText = charCount >= 20;
            const hasClient = clientSelect && clientSelect.value;
            analysisBtn.disabled = !hasText || !hasClient || this.isAnalyzing;
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
        this.updateResultCounters(highlights);
    }
    
    // Single Responsibility: Update result counters
    updateResultCounters(highlights) {
        const totalCounter = document.getElementById('total-highlights-count');
        if (totalCounter) totalCounter.textContent = highlights.length;
        
        // Count by categories
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
    
    getPersonalizedAdvice() {
        console.log('📊 Getting personalized advice');
        alert('💡 Функція персоналізованих порад буде доступна найближчим часом');
    }
    
    exportSelectedFragments() {
        console.log('📊 Exporting selected fragments');
        alert('📁 Функція експорту буде доступна найближчим часом');
    }
    
    clearWorkspace() {
        console.log('📊 Clearing workspace');
        if (confirm('❓ Очистити робочу область?')) {
            const fragments = document.getElementById('selected-fragments');
            if (fragments) fragments.innerHTML = '';
            
            const counter = document.getElementById('fragments-count');
            if (counter) counter.textContent = '0';
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
}

// Auto-initialize
window.AnalysisManager = AnalysisManager;