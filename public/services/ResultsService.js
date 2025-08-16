/**
 * ResultsService - Single Responsibility: Managing analysis results display
 * Follows SOLID principles - only handles results and highlights
 */
class ResultsService {
    constructor() {
        this.currentResults = [];
        this.selectedItems = new Set();
        this.counters = {
            manipulation: 0,
            cognitive_bias: 0,
            rhetological_fallacy: 0,
            total: 0
        };
        
        console.log('📊 ResultsService initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize results service
    init() {
        this.setupGlobalMethods();
        this.setupEventListeners();
        console.log('📊 ResultsService ready');
    }
    
    // Single Responsibility: Setup global methods
    setupGlobalMethods() {
        window.resultsService = this;
        window.displayResults = (results) => this.displayResults(results);
        window.showCounterModal = (category) => this.showCounterModal(category);
    }
    
    // Single Responsibility: Setup event listeners
    setupEventListeners() {
        // Listen for analysis completion
        window.addEventListener('analysisComplete', (event) => {
            this.displayResults(event.detail.results);
        });
        
        // Counter click handlers
        document.addEventListener('click', (event) => {
            if (event.target.matches('.fragment-counter[data-category]')) {
                const category = event.target.dataset.category;
                this.showCounterModal(category);
            }
        });
    }
    
    // Single Responsibility: Display analysis results
    displayResults(results) {
        console.log('📊 === DISPLAYING RESULTS START ===');
        console.log('📊 Results received:', results);
        
        if (!Array.isArray(results)) {
            console.warn('📊 Invalid results format');
            return;
        }
        
        this.currentResults = results;
        this.updateCounters();
        this.renderResults();
        this.renderHighlightedText();
        this.showResultsSection();
        
        console.log('📊 === DISPLAYING RESULTS END ===');
    }
    
    // Single Responsibility: Update problem counters
    updateCounters() {
        // Reset counters
        this.counters = {
            manipulation: 0,
            cognitive_bias: 0,
            rhetological_fallacy: 0,
            total: 0
        };
        
        // Count by category
        this.currentResults.forEach(result => {
            const category = result.category || 'unknown';
            if (this.counters.hasOwnProperty(category)) {
                this.counters[category]++;
            }
            this.counters.total++;
        });
        
        // Update UI counters
        this.updateCounterDisplay('manipulation', this.counters.manipulation);
        this.updateCounterDisplay('cognitive_bias', this.counters.cognitive_bias);
        this.updateCounterDisplay('rhetological_fallacy', this.counters.rhetological_fallacy);
        this.updateCounterDisplay('total', this.counters.total);
        
        console.log('📊 Counters updated:', this.counters);
    }
    
    // Single Responsibility: Update individual counter display
    updateCounterDisplay(category, count) {
        const counterElement = document.querySelector(`[data-category="${category}"] .counter-number`);
        if (counterElement) {
            counterElement.textContent = count;
        }
        
        // Add click handler if not exists
        const counterContainer = document.querySelector(`[data-category="${category}"]`);
        if (counterContainer && !counterContainer.hasAttribute('data-click-bound')) {
            counterContainer.setAttribute('data-click-bound', 'true');
            counterContainer.style.cursor = 'pointer';
            counterContainer.addEventListener('click', () => this.showCounterModal(category));
        }
    }
    
    // Single Responsibility: Render results list
    renderResults() {
        const resultsContainer = document.getElementById('analysis-results-list');
        if (!resultsContainer) {
            console.warn('📊 Results container not found');
            return;
        }
        
        if (this.currentResults.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <div class="no-results-icon">🔍</div>
                    <p>Аналіз не виявив проблем</p>
                    <p>Текст виглядає коректно для переговорів</p>
                </div>
            `;
            return;
        }
        
        // Sort results by position
        const sortedResults = [...this.currentResults].sort((a, b) => {
            return (a.start_pos || 0) - (b.start_pos || 0);
        });
        
        const html = sortedResults.map((result, index) => this.generateResultHTML(result, index)).join('');
        resultsContainer.innerHTML = html;
        
        this.attachResultEventListeners();
        console.log('📊 Results rendered:', sortedResults.length, 'items');
    }
    
    // Single Responsibility: Generate HTML for a result item
    generateResultHTML(result, index) {
        const categoryInfo = this.getCategoryInfo(result.category);
        const severity = this.calculateSeverity(result);
        
        return `
            <div class="analysis-result-item ${severity.class}" data-result-index="${index}">
                <div class="result-header">
                    <span class="result-number">#${index + 1}</span>
                    <span class="result-category ${result.category}">
                        ${categoryInfo.icon} ${categoryInfo.name}
                    </span>
                    <span class="result-severity ${severity.class}">
                        ${severity.icon} ${severity.level}
                    </span>
                    <div class="result-actions">
                        <button class="btn-icon add-to-workspace-btn" 
                                data-result-index="${index}" 
                                title="Додати до робочої зони">
                            📝 Workspace
                        </button>
                        <button class="btn-icon copy-result-btn" 
                                data-text="${this.escapeHtml(result.text)}" 
                                title="Копіювати">
                            📋
                        </button>
                    </div>
                </div>
                <div class="result-content">
                    <div class="result-text">${this.escapeHtml(result.text)}</div>
                    <div class="result-label">${this.escapeHtml(result.label || 'Без мітки')}</div>
                    <div class="result-meta">
                        Позиція: ${result.start_pos || 0}-${result.end_pos || 0} | 
                        Довжина: ${result.text?.length || 0} символів
                        ${result.confidence ? ` | Впевненість: ${Math.round(result.confidence * 100)}%` : ''}
                    </div>
                </div>
            </div>
        `;
    }
    
    // Single Responsibility: Attach event listeners to result items
    attachResultEventListeners() {
        // Add to workspace buttons
        document.querySelectorAll('.add-to-workspace-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const resultIndex = parseInt(btn.dataset.resultIndex);
                this.addToWorkspace(resultIndex);
            });
        });
        
        // Copy buttons
        document.querySelectorAll('.copy-result-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const text = btn.dataset.text;
                this.copyToClipboard(text);
            });
        });
        
        // Result item selection
        document.querySelectorAll('.analysis-result-item').forEach(item => {
            item.addEventListener('click', (e) => {
                if (!e.target.closest('.result-actions')) {
                    this.toggleResultSelection(item);
                }
            });
        });
    }
    
    // Single Responsibility: Show counter modal with category items
    showCounterModal(category) {
        console.log('📊 Showing counter modal for:', category);
        
        const filteredResults = this.currentResults.filter(result => {
            return category === 'total' || result.category === category;
        });
        
        const categoryInfo = this.getCategoryInfo(category);
        const modal = this.createCounterModal(categoryInfo, filteredResults);
        
        document.body.appendChild(modal);
        this.showModal(modal);
    }
    
    // Single Responsibility: Create counter modal
    createCounterModal(categoryInfo, results) {
        const modal = document.createElement('div');
        modal.className = 'custom-modal counter-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>
                        ${categoryInfo.icon} ${categoryInfo.name}
                        <span class="modal-count">(${results.length})</span>
                    </h3>
                    <button class="modal-close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="counter-items">
                        ${results.map((result, index) => `
                            <div class="counter-item" data-result-index="${index}">
                                <div class="counter-item-header">
                                    <span class="counter-item-number">#${index + 1}</span>
                                    <span class="counter-item-label">${this.escapeHtml(result.label || 'Без мітки')}</span>
                                    <div class="counter-item-actions">
                                        <button class="btn-sm add-to-workspace-btn" data-result='${JSON.stringify(result)}'>
                                            📝 Workspace
                                        </button>
                                        <button class="btn-sm copy-result-btn" data-text="${this.escapeHtml(result.text)}">
                                            📋
                                        </button>
                                    </div>
                                </div>
                                <div class="counter-item-text">${this.escapeHtml(result.text)}</div>
                                <div class="counter-item-position">
                                    Позиція: ${result.start_pos || 0}-${result.end_pos || 0}
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-close-btn">Закрити</button>
                    <button class="btn-primary add-all-to-workspace-btn">
                        📝 Додати все до Workspace
                    </button>
                </div>
            </div>
        `;
        
        this.attachCounterModalEventListeners(modal, results);
        return modal;
    }
    
    // Single Responsibility: Attach counter modal event listeners
    attachCounterModalEventListeners(modal, results) {
        // Close modal
        modal.querySelectorAll('.modal-close-btn, .modal-overlay').forEach(element => {
            element.addEventListener('click', () => this.closeModal(modal));
        });
        
        // Add individual items to workspace
        modal.querySelectorAll('.add-to-workspace-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const resultData = JSON.parse(btn.dataset.result);
                this.addToWorkspace(resultData);
            });
        });
        
        // Copy buttons
        modal.querySelectorAll('.copy-result-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const text = btn.dataset.text;
                this.copyToClipboard(text);
            });
        });
        
        // Add all to workspace
        const addAllBtn = modal.querySelector('.add-all-to-workspace-btn');
        if (addAllBtn) {
            addAllBtn.addEventListener('click', () => {
                results.forEach(result => this.addToWorkspace(result));
                this.showNotification(`Додано ${results.length} елементів до робочої зони`, 'success');
                this.closeModal(modal);
            });
        }
    }
    
    // Single Responsibility: Add item to workspace
    addToWorkspace(item) {
        if (window.services?.workspace) {
            window.services.workspace.addToWorkspace(item);
        } else if (window.workspaceService) {
            window.workspaceService.addToWorkspace(item);
        } else {
            console.warn('📊 Workspace service not available');
            this.showNotification('Робоча зона недоступна', 'error');
        }
    }
    
    // Single Responsibility: Render highlighted text
    renderHighlightedText() {
        const textDisplay = document.getElementById('highlighted-text-display');
        if (!textDisplay) return;
        
        const originalText = this.getOriginalText();
        if (!originalText) {
            textDisplay.innerHTML = '<p>Оригінальний текст недоступний</p>';
            return;
        }
        
        let highlightedText = originalText;
        
        // Sort results by position (reverse order for proper replacement)
        const sortedResults = [...this.currentResults].sort((a, b) => {
            return (b.start_pos || 0) - (a.start_pos || 0);
        });
        
        // Apply highlights
        sortedResults.forEach((result, index) => {
            if (result.start_pos !== undefined && result.end_pos !== undefined) {
                const before = highlightedText.substring(0, result.start_pos);
                const highlighted = highlightedText.substring(result.start_pos, result.end_pos);
                const after = highlightedText.substring(result.end_pos);
                
                const categoryInfo = this.getCategoryInfo(result.category);
                highlightedText = before + 
                    `<mark class="highlight ${result.category}" data-result-index="${index}" title="${result.label || 'Без мітки'}">` +
                    highlighted + 
                    '</mark>' + 
                    after;
            }
        });
        
        textDisplay.innerHTML = `<div class="highlighted-text">${highlightedText}</div>`;
        
        // Add click handlers to highlights
        textDisplay.querySelectorAll('.highlight').forEach(highlight => {
            highlight.addEventListener('click', (e) => {
                const resultIndex = parseInt(highlight.dataset.resultIndex);
                this.showResultDetails(resultIndex);
            });
        });
    }
    
    // Single Responsibility: Get original text
    getOriginalText() {
        const textArea = document.getElementById('negotiation-text');
        if (textArea) {
            return textArea.value;
        }
        
        if (window.state?.originalText) {
            return window.state.originalText;
        }
        
        return null;
    }
    
    // Single Responsibility: Show results section
    showResultsSection() {
        const resultsSection = document.getElementById('analysis-results');
        if (resultsSection) {
            resultsSection.style.display = 'block';
        }
    }
    
    // Single Responsibility: Get category information
    getCategoryInfo(category) {
        const categoryMap = {
            manipulation: {
                name: 'Маніпуляція',
                icon: '🎭',
                color: '#ff6b6b'
            },
            cognitive_bias: {
                name: 'Когнітивне спотворення',
                icon: '🧠',
                color: '#4ecdc4'
            },
            rhetological_fallacy: {
                name: 'Риторична помилка',
                icon: '💬',
                color: '#ffe66d'
            },
            total: {
                name: 'Всі проблеми',
                icon: '📊',
                color: '#a8e6cf'
            }
        };
        
        return categoryMap[category] || {
            name: 'Невідома категорія',
            icon: '❓',
            color: '#ccc'
        };
    }
    
    // Single Responsibility: Calculate severity
    calculateSeverity(result) {
        const textLength = result.text?.length || 0;
        const position = result.start_pos || 0;
        const confidence = result.confidence || 0.5;
        
        let score = 0;
        
        // Category weight
        if (result.category === 'manipulation') score += 3;
        else if (result.category === 'cognitive_bias') score += 2;
        else if (result.category === 'rhetological_fallacy') score += 1;
        
        // Length weight
        if (textLength > 100) score += 2;
        else if (textLength > 50) score += 1;
        
        // Position weight (earlier = more important)
        if (position < 100) score += 1;
        
        // Confidence weight
        score += Math.round(confidence * 2);
        
        if (score >= 6) return { level: 'Критичний', class: 'critical', icon: '🔴' };
        if (score >= 4) return { level: 'Високий', class: 'high', icon: '🟠' };
        if (score >= 2) return { level: 'Середній', class: 'medium', icon: '🟡' };
        return { level: 'Низький', class: 'low', icon: '🟢' };
    }
    
    // Single Responsibility: Show/hide modal
    showModal(modal) {
        modal.style.display = 'flex';
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('.modal-content').style.transform = 'translateY(0)';
        }, 10);
    }
    
    closeModal(modal) {
        modal.style.opacity = '0';
        modal.querySelector('.modal-content').style.transform = 'translateY(-50px)';
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
    
    // Single Responsibility: Copy to clipboard
    async copyToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showNotification('Скопійовано до буферу обміну!', 'success');
        } catch (error) {
            console.error('📊 Copy failed:', error);
            this.showNotification('Помилка копіювання', 'error');
        }
    }
    
    // Single Responsibility: Show notification
    showNotification(message, type = 'info') {
        console.log(`📊 Notification [${type}]:`, message);
        
        if (window.showNotification) {
            window.showNotification(message, type);
            return;
        }
        
        // Create custom notification
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            font-weight: 500;
            z-index: 10000;
            transform: translateX(400px);
            transition: transform 0.3s ease;
            background: ${type === 'success' ? '#4caf50' : type === 'error' ? '#f44336' : '#2196f3'};
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(0)';
        }, 10);
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }, 3000);
    }
    
    // Single Responsibility: Escape HTML
    escapeHtml(text) {
        if (!text) return '';
        return text.replace(/[<>&"']/g, (char) => {
            const map = {
                '<': '&lt;',
                '>': '&gt;',
                '&': '&amp;',
                '"': '&quot;',
                "'": '&#x27;'
            };
            return map[char];
        });
    }
}

// Export for module use
window.ResultsService = ResultsService;