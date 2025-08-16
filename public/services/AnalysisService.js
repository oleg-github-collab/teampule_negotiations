/**
 * AnalysisService - Single Responsibility: Managing analysis operations
 * Follows SOLID principles - only handles analysis logic
 */
class AnalysisService {
    constructor() {
        this.apiClient = null;
        this.currentAnalysis = null;
        this.isAnalyzing = false;
        this.retryAttempts = 3;
        this.lastAnalysisData = null;
        this.analysisTimeout = null;
        this.heartbeatInterval = null;
        this.failedAnalysisCount = 0;
        this.analysisHistory = [];
        
        console.log('📊 AnalysisService initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize analysis service
    init() {
        this.setupAPIClient();
        this.setupGlobalMethods();
        console.log('📊 AnalysisService ready');
    }
    
    // Single Responsibility: Setup API client connection
    setupAPIClient() {
        const checkAPIClient = () => {
            if (window.apiClient) {
                this.apiClient = window.apiClient;
                console.log('📊 AnalysisService connected to API client');
            } else {
                setTimeout(checkAPIClient, 100);
            }
        };
        checkAPIClient();
    }
    
    // Single Responsibility: Setup global methods
    setupGlobalMethods() {
        window.startAnalysis = () => this.startAnalysis();
        window.analysisService = this;
    }
    
    // Single Responsibility: Start analysis
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
        
        // Reset barometer if available
        if (window.barometerService) {
            window.barometerService.resetBarometer();
        }
        
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
                                    if (window.barometerService) {
                                        window.barometerService.updateBarometer(data);
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
            
            // Notify results display service
            if (window.resultsService) {
                window.resultsService.displayResults(highlights);
            }
            
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
    
    // Single Responsibility: Update UI state
    updateUI() {
        const analysisBtn = document.getElementById('start-analysis-btn');
        if (analysisBtn) {
            analysisBtn.disabled = this.isAnalyzing;
            analysisBtn.textContent = this.isAnalyzing ? 'Аналізую...' : 'Розпочати аналіз';
        }
    }
    
    // Single Responsibility: Show analysis history
    showAnalysisHistory() {
        console.log('📊 Showing analysis history');
        const modal = document.getElementById('analysis-history-modal');
        if (modal) {
            modal.style.display = 'flex';
            modal.style.zIndex = '10001';
        }
    }
    
    // Utility method
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for module use
window.AnalysisService = AnalysisService;