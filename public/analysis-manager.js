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
        this.retryAttempts = 3;
        this.lastAnalysisData = null; // For retry functionality
        this.analysisTimeout = null;
        this.heartbeatInterval = null;
        this.failedAnalysisCount = 0;
        this.analysisHistory = [];
        
        console.log('📊 AnalysisManager initialized with enhanced reliability');
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
    
    // Single Responsibility: Start analysis with real-time streaming
    async startAnalysis() {
        if (this.isAnalyzing) {
            console.log('📊 Analysis already in progress');
            return;
        }
        
        console.log('📊 Starting streaming analysis...');
        
        try {
            // Get analysis input
            const analysisData = this.getAnalysisData();
            if (!this.validateAnalysisData(analysisData)) {
                return;
            }
            
            // Set analyzing state
            this.setAnalyzingState(true);
            
            // Show results section and initialize UI
            this.showResultsSection();
            this.initializeAnalysisUI();
            
            // Clear previous results
            this.clearPreviousResults();
            
            // Start real-time analysis with streaming callbacks
            const result = await this.apiClient.analyzeText(
                analysisData,
                (progressData) => this.handleProgressUpdate(progressData),
                (highlightData) => this.handleHighlightReceived(highlightData)
            );
            
            if (result.success) {
                console.log('📊 Analysis completed successfully');
                this.currentAnalysis = result.analysis;
                this.finalizeAnalysisResults(result.analysis);
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
            this.hideProgressAnimation();
        }
    }
    
    // Single Responsibility: Handle progress updates from SSE stream
    handleProgressUpdate(progressData) {
        console.log('📊 Progress update:', progressData);
        
        // Update progress bar
        this.updateProgressBar(progressData.progress || 0);
        
        // Update status message
        this.updateProgressMessage(progressData.message || 'Обробка...');
        
        // Update chunk information if available
        if (progressData.chunks) {
            this.updateChunkInfo(progressData.chunks);
        }
    }
    
    // Single Responsibility: Handle real-time highlight reception
    handleHighlightReceived(highlightData) {
        console.log('📊 New highlight received:', highlightData);
        
        // Add highlight to results immediately
        this.addHighlightToResults(highlightData);
        
        // Update text highlighting in real-time
        this.updateTextHighlighting(highlightData);
        
        // Update statistics
        this.updateAnalysisStatistics();
        
        // Show highlight notification for high-severity issues
        if (highlightData.severity >= 3) {
            this.showHighlightNotification(highlightData);
        }
    }
    
    // Single Responsibility: Initialize analysis UI
    initializeAnalysisUI() {
        console.log('📊 Initializing analysis UI...');
        
        // Show progress section
        this.showProgressSection();
        
        // Initialize highlighted text display
        this.initializeHighlightedTextDisplay();
        
        // Reset counters and statistics
        this.resetAnalysisCounters();
        
        // Prepare results containers
        this.prepareResultsContainers();
    }
    
    // Single Responsibility: Clear previous analysis results
    clearPreviousResults() {
        // Clear highlights list
        const highlightsList = document.getElementById('highlights-list');
        if (highlightsList) {
            highlightsList.innerHTML = '';
        }
        
        // Clear highlighted text
        const highlightedTextContainer = document.getElementById('highlighted-text');
        if (highlightedTextContainer) {
            highlightedTextContainer.innerHTML = '';
        }
        
        // Clear statistics
        this.clearStatistics();
        
        // Reset progress
        this.updateProgressBar(0);
        this.updateProgressMessage('Підготовка до аналізу...');
    }
    
    // Single Responsibility: Add highlight to results in real-time
    addHighlightToResults(highlight) {
        const highlightsList = document.getElementById('highlights-list');
        if (!highlightsList) return;
        
        // Clear empty state on first highlight
        if (highlightsList.querySelector('.empty-state')) {
            highlightsList.innerHTML = '';
        }
        
        const highlightElement = this.createHighlightElement(highlight);
        
        // Add with animation
        highlightElement.style.opacity = '0';
        highlightElement.style.transform = 'translateY(-10px)';
        highlightsList.appendChild(highlightElement);
        
        // Animate in
        requestAnimationFrame(() => {
            highlightElement.style.transition = 'all 0.3s ease';
            highlightElement.style.opacity = '1';
            highlightElement.style.transform = 'translateY(0)';
        });
        
        // Scroll to show new highlight
        highlightElement.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        
        // Update counter
        this.updateHighlightCounter();
    }
    
    // Single Responsibility: Update highlight counter
    updateHighlightCounter() {
        const counter = document.querySelector('.highlights-counter');
        if (counter) {
            const count = document.querySelectorAll('#highlights-list .highlight-item').length;
            counter.textContent = `Знайдено проблем: ${count}`;
        }
    }
    
    // Single Responsibility: Update text highlighting in real-time
    updateTextHighlighting(highlight) {
        // Update fulltext content
        let highlightedTextContainer = document.getElementById('fulltext-content');
        if (highlightedTextContainer) {
            // Get current text or original if first highlight
            let currentHTML = highlightedTextContainer.innerHTML;
            if (!currentHTML || currentHTML.includes('empty-state')) {
                const analysisData = this.getAnalysisData();
                currentHTML = `<div class="fulltext-display">${this.escapeHtml(analysisData.text || '')}</div>`;
                highlightedTextContainer.innerHTML = currentHTML;
            }
            
            // Apply new highlight
            const highlightedHTML = this.applyHighlightToText(currentHTML, highlight);
            highlightedTextContainer.innerHTML = highlightedHTML;
        }
        
        console.log('📊 Text highlighting updated for:', highlight.text);
    }
    
    // Single Responsibility: Create HTML element for a highlight
    createHighlightElement(highlight) {
        const element = document.createElement('div');
        element.className = `highlight-item ${highlight.category} severity-${highlight.severity}`;
        element.setAttribute('data-highlight-id', highlight.id);
        
        const categoryIcons = {
            manipulation: '🎭',
            cognitive_bias: '🧠',
            rhetological_fallacy: '🗣️'
        };
        
        const severityLabels = {
            1: 'Низький',
            2: 'Середній', 
            3: 'Високий'
        };
        
        element.innerHTML = `
            <div class="highlight-header">
                <span class="highlight-icon">${categoryIcons[highlight.category] || '⚠️'}</span>
                <span class="highlight-label">${highlight.label}</span>
                <span class="highlight-severity severity-${highlight.severity}">
                    ${severityLabels[highlight.severity] || 'Невідомо'}
                </span>
            </div>
            <div class="highlight-text">"${highlight.text}"</div>
            <div class="highlight-explanation">${highlight.explanation}</div>
            <div class="highlight-actions">
                <button class="btn-sm btn-secondary highlight-text-btn" data-text="${this.escapeHtml(highlight.text)}">
                    <i class="fas fa-search"></i> Знайти в тексті
                </button>
            </div>
        `;
        
        // Bind highlight text button
        const highlightTextBtn = element.querySelector('.highlight-text-btn');
        if (highlightTextBtn) {
            highlightTextBtn.addEventListener('click', () => {
                this.highlightTextInDocument(highlight.text);
            });
        }
        
        return element;
    }
    
    // Single Responsibility: Apply highlight to text
    applyHighlightToText(currentHTML, highlight) {
        if (!highlight.text) return currentHTML;
        
        const categoryClass = this.getCategoryClass(highlight.category);
        const escapeRegExp = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        
        const regex = new RegExp(`(${escapeRegExp(highlight.text)})`, 'gi');
        
        return currentHTML.replace(regex, 
            `<mark class="text-highlight ${categoryClass}" data-highlight-id="${highlight.id}" 
                   data-severity="${highlight.severity}" title="${this.escapeHtml(highlight.explanation)}">$1</mark>`
        );
    }
    
    // Single Responsibility: Get CSS class for category
    getCategoryClass(category) {
        const categoryMap = {
            manipulation: 'manipulation',
            cognitive_bias: 'bias',
            rhetological_fallacy: 'fallacy'
        };
        return categoryMap[category] || 'manipulation';
    }
    
    // Single Responsibility: Escape HTML
    escapeHtml(unsafe) {
        if (!unsafe) return '';
        return unsafe
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
    
    // Single Responsibility: Update progress bar
    updateProgressBar(progress) {
        // Update main progress indicator
        const stepText = document.getElementById('step-text');
        if (stepText) {
            stepText.textContent = `Прогрес: ${Math.round(progress)}%`;
        }
        
        // Update progress steps visually
        this.updateProgressSteps(progress);
    }
    
    // Single Responsibility: Update progress message
    updateProgressMessage(message) {
        const stepText = document.getElementById('step-text');
        if (stepText) {
            stepText.textContent = message;
        }
        
        // Also update console for debugging
        console.log('📊 Progress:', message);
    }
    
    // Single Responsibility: Update visual progress steps
    updateProgressSteps(progress) {
        const steps = {
            'step-text-processing': 0,
            'step-ai-analysis': 25,
            'step-problem-detection': 50,
            'step-complexity-assessment': 75
        };
        
        Object.entries(steps).forEach(([stepId, threshold]) => {
            const stepElement = document.getElementById(stepId);
            if (stepElement) {
                if (progress >= threshold) {
                    stepElement.classList.add('completed');
                    stepElement.classList.remove('active');
                    const statusEl = stepElement.querySelector('.step-status');
                    if (statusEl) statusEl.textContent = 'Завершено';
                } else if (progress >= threshold - 25) {
                    stepElement.classList.add('active');
                    stepElement.classList.remove('completed');
                    const statusEl = stepElement.querySelector('.step-status');
                    if (statusEl) statusEl.textContent = 'В процесі...';
                }
            }
        });
    }
    
    // Single Responsibility: Finalize analysis results
    finalizeAnalysisResults(analysis) {
        console.log('📊 Finalizing analysis results...');
        
        // Update summary and barometer
        this.displaySummary(analysis.summary);
        this.displayBarometer(analysis.barometer);
        
        // Update final statistics
        this.updateFinalStatistics(analysis);
        
        // Enable export and other actions
        this.enableAnalysisActions();
        
        // Hide progress section
        this.hideProgressSection();
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
    
    // Single Responsibility: Show/hide sections
    showProgressSection() {
        const progressSection = document.getElementById('analysis-progress-section');
        if (progressSection) {
            progressSection.style.display = 'block';
        }
    }
    
    hideProgressSection() {
        const progressSection = document.getElementById('analysis-progress-section');
        if (progressSection) {
            progressSection.style.display = 'none';
        }
    }
    
    showResultsSection() {
        // Show the main results section which contains highlights and barometer
        const analysisResults = document.querySelector('.analysis-results');
        if (analysisResults) {
            analysisResults.style.display = 'block';
        }
        
        // Ensure highlights section is visible
        const highlightsSection = document.querySelector('.highlights-section');
        if (highlightsSection) {
            highlightsSection.style.display = 'block';
        }
        
        // Show progress section
        const progressSection = document.querySelector('.analysis-progress');
        if (progressSection) {
            progressSection.style.display = 'block';
        }
        
        // Show barometer section
        const barometerCard = document.querySelector('.barometer-card');
        if (barometerCard) {
            barometerCard.style.display = 'block';
        }
        
        console.log('📊 Results sections made visible');
    }
    
    hideResultsSection() {
        const resultsSection = document.getElementById('analysis-results');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
    }
    
    // Single Responsibility: Progress management
    hideProgressAnimation() {
        this.hideProgressSection();
    }
    
    startProgressAnimation() {
        this.showProgressSection();
        this.updateProgressBar(0);
        this.updateProgressMessage('Розпочинаю аналіз...');
    }
    
    // Single Responsibility: Statistics and counters
    resetAnalysisCounters() {
        this.analysisStats = {
            totalHighlights: 0,
            manipulationCount: 0,
            biasCount: 0,
            fallacyCount: 0
        };
    }
    
    updateAnalysisStatistics() {
        this.analysisStats.totalHighlights++;
        this.displayCurrentStats();
    }
    
    displayCurrentStats() {
        const statsElement = document.getElementById('analysis-current-stats');
        if (statsElement) {
            statsElement.innerHTML = `
                <span class="stat-item">
                    <span class="stat-label">Знайдено проблем:</span>
                    <span class="stat-value">${this.analysisStats.totalHighlights}</span>
                </span>
            `;
        }
    }
    
    clearStatistics() {
        const statsElement = document.getElementById('analysis-current-stats');
        if (statsElement) {
            statsElement.innerHTML = '';
        }
    }
    
    // Single Responsibility: UI preparation and initialization
    initializeHighlightedTextDisplay() {
        const container = document.getElementById('highlighted-text');
        if (container) {
            container.innerHTML = '';
            container.style.display = 'block';
        }
    }
    
    prepareResultsContainers() {
        // Ensure results containers exist and are ready
        const containers = ['highlights-list', 'analysis-summary', 'analysis-barometer'];
        containers.forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.innerHTML = '';
                element.style.display = 'block';
            }
        });
    }
    
    updateChunkInfo(chunks) {
        const chunkInfo = document.getElementById('analysis-chunk-info');
        if (chunkInfo) {
            chunkInfo.textContent = `Обробка у ${chunks} частинах`;
        }
    }
    
    // Single Responsibility: Highlight notifications
    showHighlightNotification(highlight) {
        const message = `Виявлено критичну проблему: ${highlight.label}`;
        if (window.modalManager) {
            window.modalManager.showAlert(message, 'Критична проблема');
        } else {
            this.showNotification(message, 'warning');
        }
    }
    
    // Single Responsibility: Text search and highlighting
    highlightTextInDocument(text) {
        const container = document.getElementById('highlighted-text');
        if (!container) return;
        
        // Find and scroll to the text
        const textNodes = this.getTextNodes(container);
        for (const node of textNodes) {
            if (node.textContent.toLowerCase().includes(text.toLowerCase())) {
                const range = document.createRange();
                const startIndex = node.textContent.toLowerCase().indexOf(text.toLowerCase());
                range.setStart(node, startIndex);
                range.setEnd(node, startIndex + text.length);
                
                const rect = range.getBoundingClientRect();
                if (rect.top < 0 || rect.bottom > window.innerHeight) {
                    range.startContainer.parentElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'center'
                    });
                }
                break;
            }
        }
    }
    
    getTextNodes(element) {
        const textNodes = [];
        const walk = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            null,
            false
        );
        
        let node;
        while (node = walk.nextNode()) {
            textNodes.push(node);
        }
        
        return textNodes;
    }
    
    // Single Responsibility: Results finalization
    displaySummary(summary) {
        const summaryElement = document.getElementById('analysis-summary');
        if (summaryElement && summary) {
            summaryElement.innerHTML = `
                <div class="summary-content">
                    <h3>Підсумок аналізу</h3>
                    <div class="summary-stats">
                        <div class="stat-item">
                            <span class="stat-label">Маніпуляції:</span>
                            <span class="stat-value">${summary.counts_by_category?.manipulation || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Когнітивні упередження:</span>
                            <span class="stat-value">${summary.counts_by_category?.cognitive_bias || 0}</span>
                        </div>
                        <div class="stat-item">
                            <span class="stat-label">Логічні помилки:</span>
                            <span class="stat-value">${summary.counts_by_category?.rhetological_fallacy || 0}</span>
                        </div>
                    </div>
                    <div class="summary-observations">
                        <p><strong>Загальна оцінка:</strong> ${summary.overall_observations || 'Аналіз завершено'}</p>
                        <p><strong>Стратегічна оцінка:</strong> ${summary.strategic_assessment || 'Оцінка недоступна'}</p>
                    </div>
                </div>
            `;
        }
    }
    
    displayBarometer(barometer) {
        if (!barometer) return;
        
        const scoreElement = document.getElementById('barometer-score');
        const labelElement = document.getElementById('barometer-label');
        const commentElement = document.getElementById('barometer-comment');
        const gaugeCircle = document.getElementById('gauge-circle');
        
        if (scoreElement) {
            scoreElement.textContent = barometer.score || 0;
        }
        
        if (labelElement) {
            labelElement.textContent = barometer.label || 'Невідомо';
        }
        
        if (commentElement) {
            commentElement.textContent = barometer.rationale || 'Оцінка недоступна';
        }
        
        // Update gauge visual
        if (gaugeCircle && barometer.score) {
            const score = Math.max(0, Math.min(100, barometer.score));
            const dashArray = (score / 100) * 283; // 283 = 2π × 45 (radius)
            gaugeCircle.setAttribute('stroke-dasharray', `${dashArray} 283`);
        }
        
        console.log('📊 Barometer updated:', barometer);
    }
    
    updateFinalStatistics(analysis) {
        this.analysisStats.totalHighlights = analysis.highlights?.length || 0;
        this.displayCurrentStats();
    }
    
    enableAnalysisActions() {
        const actionButtons = document.querySelectorAll('.analysis-action-btn');
        actionButtons.forEach(btn => {
            btn.disabled = false;
        });
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