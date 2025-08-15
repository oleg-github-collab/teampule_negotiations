/**
 * AnalysisManager - SOLID compliant analysis management system
 * Single Responsibility: Manages only analysis-related operations
 * Open/Closed: Extensible for new analysis types
 * Liskov Substitution: All analysis operations follow same interface
 * Interface Segregation: Separate concerns for input, processing, and results
 * Dependency Inversion: Depends on ButtonManager and API abstractions
 */

class AnalysisManager {
    constructor(buttonManager, apiClient) {
        this.buttonManager = buttonManager;
        this.apiClient = apiClient;
        this.currentAnalysis = null;
        this.isAnalyzing = false;
        this.inputMethod = 'text';
        
        console.log('📊 AnalysisManager initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize analysis manager
    init() {
        this.registerButtons();
        this.setupInputHandlers();
        console.log('📊 AnalysisManager ready');
    }
    
    // Single Responsibility: Register all analysis-related buttons
    registerButtons() {
        // Start analysis button
        this.buttonManager.register('#start-analysis-btn', () => {
            this.startAnalysis();
        }, { description: 'Start Analysis Button' });
        
        // New analysis button
        this.buttonManager.register('#new-analysis-btn', () => {
            this.createNewAnalysis();
        }, { description: 'New Analysis Button' });
        
        // Analysis history button
        this.buttonManager.register('#analysis-history-btn', () => {
            this.showAnalysisHistory();
        }, { description: 'Analysis History Button' });
        
        // Input method buttons
        this.buttonManager.register('#text-method', () => {
            this.setInputMethod('text');
        }, { description: 'Text Input Method Button' });
        
        this.buttonManager.register('#file-method', () => {
            this.setInputMethod('file');
        }, { description: 'File Input Method Button' });
        
        // Text input utility buttons
        this.buttonManager.register('#clear-text-btn', () => {
            this.clearText();
        }, { description: 'Clear Text Button' });
        
        this.buttonManager.register('#paste-btn', () => {
            this.pasteText();
        }, { description: 'Paste Text Button' });
        
        // View control buttons
        this.buttonManager.register('#list-view', () => {
            this.switchHighlightsView('list');
        }, { description: 'List View Button' });
        
        this.buttonManager.register('#text-view', () => {
            this.switchHighlightsView('text');
        }, { description: 'Text View Button' });
        
        this.buttonManager.register('#filter-view', () => {
            this.toggleFilters();
        }, { description: 'Filter View Button' });
        
        // Filter control buttons
        this.buttonManager.register('#clear-filters', () => {
            this.clearFilters();
        }, { description: 'Clear Filters Button' });
        
        this.buttonManager.register('#apply-filters', () => {
            this.applyFilters();
        }, { description: 'Apply Filters Button' });
        
        // Workspace buttons
        this.buttonManager.register('#get-advice-btn', () => {
            this.getPersonalizedAdvice();
        }, { description: 'Get Advice Button' });
        
        this.buttonManager.register('#export-selected-btn', () => {
            this.exportSelectedFragments();
        }, { description: 'Export Selected Button' });
        
        this.buttonManager.register('#clear-workspace-btn', () => {
            this.clearWorkspace();
        }, { description: 'Clear Workspace Button' });
        
        // Analysis history button
        this.buttonManager.register('#analysis-history-btn', () => {
            this.showAnalysisHistory();
        }, { description: 'Analysis History Button' });
        
        console.log('📊 Analysis buttons registered');
    }
    
    // Single Responsibility: Setup input handlers
    setupInputHandlers() {
        // Text area input handler
        const textArea = document.getElementById('negotiation-text');
        if (textArea) {
            textArea.addEventListener('input', this.debounce(() => {
                this.updateTextStats();
                this.updateAnalysisButtonState();
            }, 300));
        }
        
        // File input handlers
        this.setupFileHandling();
        
        console.log('📊 Input handlers setup');
    }
    
    // Single Responsibility: Setup file handling
    setupFileHandling() {
        const fileInput = document.getElementById('file-input');
        const dropzone = document.getElementById('file-dropzone');
        const chooseBtn = document.getElementById('choose-file-btn');
        const removeBtn = document.getElementById('remove-file-btn');
        
        // Choose file button
        if (chooseBtn) {
            this.buttonManager.register('#choose-file-btn', () => {
                fileInput?.click();
            }, { description: 'Choose File Button' });
        }
        
        // Remove file button
        if (removeBtn) {
            this.buttonManager.register('#remove-file-btn', () => {
                this.clearFile();
            }, { description: 'Remove File Button' });
        }
        
        // File input change
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files[0]);
            });
        }
        
        // Drag and drop
        if (dropzone) {
            dropzone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropzone.classList.add('drag-over');
            });
            
            dropzone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
            });
            
            dropzone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropzone.classList.remove('drag-over');
                const file = e.dataTransfer.files[0];
                this.handleFileSelect(file);
            });
            
            dropzone.addEventListener('click', () => {
                fileInput?.click();
            });
        }
    }
    
    // Single Responsibility: Start analysis
    async startAnalysis() {
        if (this.isAnalyzing) {
            console.log('📊 Analysis already in progress');
            return;
        }
        
        console.log('📊 Starting analysis...');
        
        try {
            // Get analysis input
            const analysisData = this.getAnalysisData();
            if (!this.validateAnalysisData(analysisData)) {
                return;
            }
            
            // Set analyzing state
            this.setAnalyzingState(true);
            
            // Show results section and progress
            this.showResultsSection();
            this.startProgressAnimation();
            
            // Perform analysis
            const result = await this.apiClient.analyzeText(analysisData);
            
            if (result.success) {
                console.log('📊 Analysis completed successfully');
                this.currentAnalysis = result.analysis;
                this.displayAnalysisResults(result.analysis);
                this.showNotification('Аналіз завершено!', 'success');
            } else {
                throw new Error(result.error || 'Analysis failed');
            }
            
        } catch (error) {
            console.error('📊 Analysis error:', error);
            this.showNotification('Помилка аналізу: ' + error.message, 'error');
            this.hideResultsSection();
        } finally {
            this.setAnalyzingState(false);
        }
    }
    
    // Single Responsibility: Create new analysis
    createNewAnalysis() {
        console.log('📊 Creating new analysis');
        
        // Clear current analysis
        this.currentAnalysis = null;
        
        // Reset UI
        this.clearText();
        this.clearFile();
        this.hideResultsSection();
        this.setInputMethod('text');
        
        // Focus on text input
        const textArea = document.getElementById('negotiation-text');
        if (textArea) {
            textArea.focus();
        }
        
        this.showNotification('Готово для нового аналізу', 'info');
    }
    
    // Single Responsibility: Show analysis history
    async showAnalysisHistory() {
        console.log('📊 Showing analysis history');
        
        const currentClient = window.clientManager?.getCurrentClient();
        if (!currentClient) {
            this.showNotification('Спочатку оберіть клієнта', 'warning');
            return;
        }
        
        try {
            const result = await this.apiClient.getAnalysisHistory(currentClient.id);
            if (result.success && result.analyses.length > 0) {
                this.displayAnalysisHistoryModal(result.analyses);
            } else {
                this.showNotification('Історія аналізів порожня', 'info');
            }
        } catch (error) {
            console.error('📊 Error loading analysis history:', error);
            this.showNotification('Помилка завантаження історії аналізів', 'error');
        }
    }
    
    // Single Responsibility: Display analysis history modal
    displayAnalysisHistoryModal(analyses) {
        const historyHTML = analyses.map(analysis => `
            <div class="analysis-history-item">
                <div class="analysis-info">
                    <h4>${analysis.title || 'Аналіз без назви'}</h4>
                    <p><strong>Дата:</strong> ${new Date(analysis.created_at).toLocaleDateString('uk-UA')}</p>
                    <p><strong>Джерело:</strong> ${analysis.source || 'Текст'}</p>
                    ${analysis.original_filename ? `<p><strong>Файл:</strong> ${analysis.original_filename}</p>` : ''}
                </div>
                <div class="analysis-actions">
                    <button class="btn btn-sm btn-secondary view-analysis-btn" data-analysis-id="${analysis.id}">
                        <i class="fas fa-eye"></i> Переглянути
                    </button>
                    <button class="btn btn-sm btn-danger delete-analysis-btn" data-analysis-id="${analysis.id}" data-analysis-title="${analysis.title || 'Аналіз'}">
                        <i class="fas fa-trash"></i> Видалити
                    </button>
                </div>
            </div>
        `).join('');
        
        window.modalManager.createModal('analysis-history-modal', {
            title: 'Історія аналізів',
            content: `
                <div class="analysis-history-list">
                    ${historyHTML}
                </div>
            `,
            size: 'large',
            buttons: [
                { text: 'Закрити', action: 'close', type: 'secondary' }
            ]
        });
        
        window.modalManager.showModal('analysis-history-modal');
        
        // Bind action handlers
        this.bindAnalysisHistoryActions();
    }
    
    // Single Responsibility: Bind analysis history action handlers
    bindAnalysisHistoryActions() {
        // Delete buttons
        document.querySelectorAll('.delete-analysis-btn').forEach(btn => {
            if (!btn.hasAttribute('data-handler-bound')) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const analysisId = btn.dataset.analysisId;
                    const analysisTitle = btn.dataset.analysisTitle;
                    this.deleteAnalysis(analysisId, analysisTitle);
                });
                btn.setAttribute('data-handler-bound', 'true');
            }
        });
        
        // View buttons
        document.querySelectorAll('.view-analysis-btn').forEach(btn => {
            if (!btn.hasAttribute('data-handler-bound')) {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const analysisId = btn.dataset.analysisId;
                    this.viewAnalysis(analysisId);
                });
                btn.setAttribute('data-handler-bound', 'true');
            }
        });
    }
    
    // Single Responsibility: Delete analysis with modal confirmation
    async deleteAnalysis(analysisId, analysisTitle) {
        const currentClient = window.clientManager?.getCurrentClient();
        if (!currentClient) {
            this.showNotification('Клієнт не обраний', 'error');
            return;
        }
        
        // Use modal manager for confirmation
        window.modalManager.showConfirmDialog({
            title: 'Видалення аналізу',
            message: `Ви впевнені, що хочете видалити аналіз "${analysisTitle}"? Ця дія незворотна.`,
            confirmText: 'Видалити',
            onConfirm: async () => {
                try {
                    console.log('📊 Deleting analysis:', analysisId);
                    
                    // Show loading modal
                    window.modalManager.showLoadingModal('Видалення аналізу...');
                    
                    const result = await this.apiClient.deleteAnalysis(currentClient.id, analysisId);
                    
                    // Hide loading modal
                    window.modalManager.hideLoadingModal();
                    
                    if (result.success) {
                        this.showNotification('Аналіз видалено успішно', 'success');
                        
                        // Refresh history modal
                        window.modalManager.closeModal('analysis-history-modal');
                        this.showAnalysisHistory();
                        
                    } else {
                        throw new Error(result.error || 'Failed to delete analysis');
                    }
                    
                } catch (error) {
                    // Hide loading modal
                    window.modalManager.hideLoadingModal();
                    console.error('📊 Error deleting analysis:', error);
                    window.modalManager.showAlert('Помилка видалення аналізу: ' + error.message, 'Помилка');
                }
            }
        });
    }
    
    // Single Responsibility: View specific analysis
    async viewAnalysis(analysisId) {
        const currentClient = window.clientManager?.getCurrentClient();
        if (!currentClient) {
            this.showNotification('Клієнт не обраний', 'error');
            return;
        }
        
        try {
            console.log('📊 Loading analysis:', analysisId);
            
            // Show loading
            window.modalManager.showLoadingModal('Завантаження аналізу...');
            
            const result = await this.apiClient.makeRequest(`/api/clients/${currentClient.id}/analysis/${analysisId}`);
            
            // Hide loading
            window.modalManager.hideLoadingModal();
            
            if (result.success) {
                this.currentAnalysis = result.analysis;
                this.displayAnalysisResults(result.analysis);
                
                // Close history modal
                window.modalManager.closeModal('analysis-history-modal');
                
                this.showNotification('Аналіз завантажено', 'success');
            } else {
                throw new Error(result.error || 'Failed to load analysis');
            }
            
        } catch (error) {
            // Hide loading
            window.modalManager.hideLoadingModal();
            console.error('📊 Error loading analysis:', error);
            this.showNotification('Помилка завантаження аналізу: ' + error.message, 'error');
        }
    }
    
    // Single Responsibility: Set input method
    setInputMethod(method) {
        console.log('📊 Setting input method:', method);
        this.inputMethod = method;
        
        // Update UI
        const textContent = document.getElementById('text-input-content');
        const fileContent = document.getElementById('file-input-content');
        const textBtn = document.getElementById('text-method');
        const fileBtn = document.getElementById('file-method');
        
        if (method === 'text') {
            if (textContent) textContent.style.display = 'block';
            if (fileContent) fileContent.style.display = 'none';
            if (textBtn) textBtn.classList.add('active');
            if (fileBtn) fileBtn.classList.remove('active');
        } else {
            if (textContent) textContent.style.display = 'none';
            if (fileContent) fileContent.style.display = 'block';
            if (textBtn) textBtn.classList.remove('active');
            if (fileBtn) fileBtn.classList.add('active');
        }
        
        this.updateAnalysisButtonState();
    }
    
    // Single Responsibility: Clear text input
    clearText() {
        const textArea = document.getElementById('negotiation-text');
        if (textArea) {
            textArea.value = '';
            this.updateTextStats();
            this.updateAnalysisButtonState();
        }
    }
    
    // Single Responsibility: Paste text from clipboard
    async pasteText() {
        try {
            const text = await navigator.clipboard.readText();
            const textArea = document.getElementById('negotiation-text');
            if (textArea && text) {
                textArea.value = text;
                this.updateTextStats();
                this.updateAnalysisButtonState();
                this.showNotification('Текст вставлено з буферу обміну', 'success');
            }
        } catch (error) {
            console.error('📊 Paste error:', error);
            this.showNotification('Не вдалося вставити з буферу обміну', 'error');
        }
    }
    
    // Single Responsibility: Handle file selection
    handleFileSelect(file) {
        if (!file) return;
        
        console.log('📊 File selected:', file.name);
        
        // Validate file
        if (!this.validateFile(file)) {
            return;
        }
        
        // Show file preview
        this.showFilePreview(file);
        
        // Read file content
        this.readFileContent(file);
    }
    
    // Single Responsibility: Clear selected file
    clearFile() {
        const fileInput = document.getElementById('file-input');
        const filePreview = document.getElementById('file-preview');
        const dropzone = document.getElementById('file-dropzone');
        
        if (fileInput) fileInput.value = '';
        if (filePreview) filePreview.style.display = 'none';
        if (dropzone) dropzone.style.display = 'block';
        
        this.updateAnalysisButtonState();
    }
    
    // Single Responsibility: Update text statistics
    updateTextStats() {
        const textArea = document.getElementById('negotiation-text');
        const charCount = document.getElementById('char-count');
        const wordCount = document.getElementById('word-count');
        const tokenCount = document.getElementById('estimated-tokens');
        
        if (!textArea) return;
        
        const text = textArea.value;
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;
        const tokens = Math.ceil(chars / 4); // Rough estimate
        
        if (charCount) charCount.textContent = `${chars.toLocaleString()} символів`;
        if (wordCount) wordCount.textContent = `${words.toLocaleString()} слів`;
        if (tokenCount) tokenCount.textContent = `≈ ${tokens.toLocaleString()} токенів`;
    }
    
    // Single Responsibility: Update analysis button state
    updateAnalysisButtonState() {
        const button = document.getElementById('start-analysis-btn');
        if (!button) return;
        
        const hasContent = this.hasAnalysisContent();
        button.disabled = !hasContent || this.isAnalyzing;
        
        if (this.isAnalyzing) {
            button.textContent = 'Аналіз в процесі...';
        } else if (hasContent) {
            button.textContent = 'Розпочати аналіз';
        } else {
            button.textContent = 'Введіть текст для аналізу';
        }
    }
    
    // Single Responsibility: Check if has analysis content
    hasAnalysisContent() {
        if (this.inputMethod === 'text') {
            const textArea = document.getElementById('negotiation-text');
            return textArea && textArea.value.trim().length > 10;
        } else {
            const fileInput = document.getElementById('file-input');
            return fileInput && fileInput.files.length > 0;
        }
    }
    
    // Single Responsibility: Get analysis data
    getAnalysisData() {
        const clientId = window.clientManager?.getCurrentClient()?.id;
        
        if (this.inputMethod === 'text') {
            const textArea = document.getElementById('negotiation-text');
            return {
                client_id: clientId,
                text: textArea?.value || '',
                method: 'text'
            };
        } else {
            const fileInput = document.getElementById('file-input');
            return {
                client_id: clientId,
                file: fileInput?.files[0],
                method: 'file'
            };
        }
    }
    
    // Single Responsibility: Validate analysis data
    validateAnalysisData(data) {
        if (!data.client_id) {
            this.showNotification('Спочатку оберіть клієнта', 'error');
            return false;
        }
        
        if (data.method === 'text') {
            if (!data.text || data.text.trim().length < 10) {
                this.showNotification('Введіть принаймні 10 символів тексту', 'error');
                return false;
            }
        } else {
            if (!data.file) {
                this.showNotification('Оберіть файл для аналізу', 'error');
                return false;
            }
        }
        
        return true;
    }
    
    // Single Responsibility: Set analyzing state
    setAnalyzingState(analyzing) {
        this.isAnalyzing = analyzing;
        this.updateAnalysisButtonState();
        
        // Disable/enable input elements
        const inputs = document.querySelectorAll('#negotiation-text, #file-input, .input-method');
        inputs.forEach(input => {
            input.disabled = analyzing;
        });
    }
    
    // Placeholder methods for UI operations (to be implemented)
    showResultsSection() {
        const section = document.getElementById('results-section');
        if (section) section.style.display = 'block';
    }
    
    hideResultsSection() {
        const section = document.getElementById('results-section');
        if (section) section.style.display = 'none';
    }
    
    startProgressAnimation() {
        // Implementation depends on specific progress UI
        console.log('📊 Starting progress animation');
    }
    
    displayAnalysisResults(analysis) {
        // Implementation depends on specific results UI
        console.log('📊 Displaying analysis results:', analysis);
    }
    
    switchHighlightsView(view) {
        console.log('📊 Switching highlights view:', view);
    }
    
    toggleFilters() {
        console.log('📊 Toggling filters');
    }
    
    clearFilters() {
        console.log('📊 Clearing filters');
    }
    
    applyFilters() {
        console.log('📊 Applying filters');
    }
    
    getPersonalizedAdvice() {
        console.log('📊 Getting personalized advice');
    }
    
    exportSelectedFragments() {
        console.log('📊 Exporting selected fragments');
    }
    
    clearWorkspace() {
        console.log('📊 Clearing workspace');
    }
    
    validateFile(file) {
        // Basic file validation
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['text/plain', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
        
        if (file.size > maxSize) {
            this.showNotification('Файл занадто великий (максимум 10MB)', 'error');
            return false;
        }
        
        if (!allowedTypes.includes(file.type)) {
            this.showNotification('Непідтримуваний тип файлу', 'error');
            return false;
        }
        
        return true;
    }
    
    showFilePreview(file) {
        const preview = document.getElementById('file-preview');
        const nameEl = document.getElementById('file-name');
        const sizeEl = document.getElementById('file-size');
        const dropzone = document.getElementById('file-dropzone');
        
        if (preview && nameEl && sizeEl) {
            nameEl.textContent = file.name;
            sizeEl.textContent = this.formatFileSize(file.size);
            preview.style.display = 'block';
            if (dropzone) dropzone.style.display = 'none';
        }
    }
    
    readFileContent(file) {
        // File reading implementation
        console.log('📊 Reading file content:', file.name);
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
    
    showNotification(message, type = 'info') {
        if (window.showNotification) {
            window.showNotification(message, type);
        } else {
            console.log(`📊 ${type.toUpperCase()}: ${message}`);
        }
    }
    
    // Interface Segregation: Public API
    getCurrentAnalysis() {
        return this.currentAnalysis;
    }
    
    isAnalysisInProgress() {
        return this.isAnalyzing;
    }
    
    destroy() {
        console.log('📊 Destroying AnalysisManager...');
        this.currentAnalysis = null;
        this.isAnalyzing = false;
    }
}

// Export for global use
window.AnalysisManager = AnalysisManager;
console.log('📊 AnalysisManager class loaded');