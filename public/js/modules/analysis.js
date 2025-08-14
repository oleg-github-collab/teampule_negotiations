// Analysis Processing Module
import { AppState } from './state.js';
import { api } from './api.js';
import { ui } from './ui.js';
import { DOMUtils } from './dom.js';

export class AnalysisManager {
    constructor() {
        this.currentStream = null;
    }

    // Start analysis process
    async startAnalysis(text, clientId) {
        if (!text || !clientId) {
            ui.showNotification('Потрібен текст та обраний клієнт', 'error');
            return;
        }

        try {
            ui.showLoading();
            AppState.set('originalText', text);

            // Show results section
            const resultsSection = DOMUtils.$('#results-section');
            if (resultsSection) {
                resultsSection.style.display = 'block';
            }

            // Start streaming analysis
            this.currentStream = api.streamAnalysis(
                clientId, 
                text,
                this.handleAnalysisMessage.bind(this),
                this.handleAnalysisError.bind(this),
                this.handleAnalysisComplete.bind(this)
            );

            console.log('🧠 Analysis started for client:', clientId);
            
        } catch (error) {
            console.error('Analysis start failed:', error);
            ui.showNotification('Помилка запуску аналізу: ' + error.message, 'error');
            ui.hideLoading();
        }
    }

    // Handle streaming analysis messages
    handleAnalysisMessage(data) {
        console.log('📊 Analysis message:', data.type, data);

        switch (data.type) {
            case 'progress':
                this.updateAnalysisProgress(data);
                break;
            
            case 'highlights':
                this.updateHighlights(data.highlights);
                break;
            
            case 'barometer':
                this.updateBarometer(data.barometer);
                break;
            
            case 'analysis':
                this.handleAnalysisData(data.analysis);
                break;
            
            case 'complete':
                this.handleAnalysisComplete();
                break;
                
            default:
                console.log('Unknown analysis message type:', data.type);
        }
    }

    // Update analysis progress
    updateAnalysisProgress(data) {
        const steps = ['input', 'analysis', 'results'];
        const currentStep = data.step || 1;
        
        steps.forEach((step, index) => {
            const element = DOMUtils.$(`#step-${step}`);
            if (element) {
                element.classList.toggle('completed', index < currentStep);
                element.classList.toggle('active', index === currentStep - 1);
            }
        });
    }

    // Update highlights display
    updateHighlights(highlights) {
        if (!highlights || !Array.isArray(highlights)) return;

        AppState.set('currentAnalysis', {
            ...AppState.get('currentAnalysis'),
            highlights: highlights
        });

        this.renderHighlightsList(highlights);
        this.generateHighlightedText(highlights);
        this.updateHighlightCounters(highlights);
    }

    // Render highlights in list view
    renderHighlightsList(highlights) {
        const highlightsList = DOMUtils.$('#highlights-list');
        if (!highlightsList) return;

        if (highlights.length === 0) {
            highlightsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <p>Проблемних моментів не виявлено</p>
                </div>
            `;
            return;
        }

        highlightsList.innerHTML = highlights.map((highlight, index) => `
            <div class="highlight-item" 
                 data-highlight-index="${index}" 
                 draggable="true" 
                 data-highlight-id="${index}">
                <div class="highlight-header">
                    <div class="highlight-type ${this.getCategoryClass(highlight.category)}">
                        ${this.getCategoryLabel(highlight.category)}
                    </div>
                    <div class="highlight-severity severity-${highlight.severity || 1}">
                        Рівень ${highlight.severity || 1}
                    </div>
                    <button class="btn-micro" 
                            data-action="add-to-workspace" 
                            data-id="${index}" 
                            title="Додати до робочої області">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
                <div class="highlight-text">"${DOMUtils.escapeHtml(highlight.text)}"</div>
                <div class="highlight-explanation">
                    ${DOMUtils.escapeHtml(highlight.explanation)}
                </div>
                ${highlight.recommendation ? `
                    <div class="highlight-recommendation">
                        <i class="fas fa-lightbulb"></i>
                        ${DOMUtils.escapeHtml(highlight.recommendation)}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // Generate highlighted text view
    generateHighlightedText(highlights) {
        const originalText = AppState.get('originalText');
        if (!originalText || !highlights.length) return;

        const highlightedHTML = this.createHighlightedHTML(originalText, highlights);
        
        const fulltextContent = DOMUtils.$('#fulltext-content');
        if (fulltextContent) {
            fulltextContent.innerHTML = highlightedHTML;
        }

        // Store in state
        AppState.set('currentAnalysis', {
            ...AppState.get('currentAnalysis'),
            highlighted_text: highlightedHTML
        });
    }

    // Create HTML with highlights
    createHighlightedHTML(text, highlights) {
        // Sort highlights by position
        const sortedHighlights = highlights.slice().sort((a, b) => a.start_pos - b.start_pos);
        
        let result = '';
        let lastPos = 0;

        sortedHighlights.forEach((highlight, index) => {
            const startPos = highlight.start_pos || 0;
            const endPos = highlight.end_pos || startPos + (highlight.text?.length || 0);

            // Add text before highlight
            if (startPos > lastPos) {
                result += DOMUtils.escapeHtml(text.substring(lastPos, startPos));
            }

            // Add highlighted text
            const categoryClass = this.getCategoryClass(highlight.category);
            const tooltip = DOMUtils.escapeHtml(highlight.explanation || '');
            const highlightText = DOMUtils.escapeHtml(highlight.text || text.substring(startPos, endPos));

            result += `<span class="text-highlight ${categoryClass}" 
                             title="${tooltip}" 
                             data-highlight-index="${index}">
                         ${highlightText}
                       </span>`;

            lastPos = Math.max(lastPos, endPos);
        });

        // Add remaining text
        if (lastPos < text.length) {
            result += DOMUtils.escapeHtml(text.substring(lastPos));
        }

        return `<div class="text-content">${result}</div>`;
    }

    // Update highlight counters
    updateHighlightCounters(highlights) {
        const counters = {
            manipulation: 0,
            cognitive_bias: 0,
            rhetorical_fallacy: 0
        };

        highlights.forEach(h => {
            if (counters.hasOwnProperty(h.category)) {
                counters[h.category]++;
            }
        });

        ui.updateCounters({
            manipulations: counters.manipulation,
            biases: counters.cognitive_bias,
            fallacies: counters.rhetorical_fallacy
        });
    }

    // Update barometer display
    updateBarometer(barometer) {
        if (!barometer) return;

        const score = barometer.score || 0;
        const label = barometer.label || 'Невизначено';
        const comment = barometer.comment || '';

        // Update displays
        const scoreElement = DOMUtils.$('#barometer-score');
        const labelElement = DOMUtils.$('#barometer-label');
        const commentElement = DOMUtils.$('#barometer-comment');
        const gaugeElement = DOMUtils.$('#gauge-circle');

        if (scoreElement) scoreElement.textContent = score;
        if (labelElement) labelElement.textContent = label;
        if (commentElement) commentElement.textContent = comment;

        // Update gauge
        if (gaugeElement) {
            const circumference = 2 * Math.PI * 45; // radius = 45
            const progress = (score / 100) * circumference;
            gaugeElement.style.strokeDasharray = `${progress} ${circumference}`;
        }

        // Store in state
        AppState.set('currentAnalysis', {
            ...AppState.get('currentAnalysis'),
            barometer: barometer
        });

        console.log('📊 Barometer updated:', score, label);
    }

    // Handle complete analysis data
    handleAnalysisData(analysis) {
        AppState.set('currentAnalysis', analysis);
        
        // Update displays if not already updated by individual messages
        if (analysis.highlights) {
            this.updateHighlights(analysis.highlights);
        }
        
        if (analysis.barometer) {
            this.updateBarometer(analysis.barometer);
        }
    }

    // Handle analysis completion
    handleAnalysisComplete() {
        ui.hideLoading();
        ui.showNotification('Аналіз завершено!', 'success');
        console.log('✅ Analysis completed');
    }

    // Handle analysis errors
    handleAnalysisError(error) {
        ui.hideLoading();
        ui.showNotification('Помилка аналізу: ' + error.message, 'error');
        console.error('❌ Analysis error:', error);
    }

    // Get category CSS class
    getCategoryClass(category) {
        const categoryMap = {
            'manipulation': 'manipulation',
            'cognitive_bias': 'cognitive-bias',
            'rhetorical_fallacy': 'fallacy'
        };
        return categoryMap[category] || 'manipulation';
    }

    // Get category label
    getCategoryLabel(category) {
        const labelMap = {
            'manipulation': 'Маніпуляція',
            'cognitive_bias': 'Когнітивне викривлення',
            'rhetorical_fallacy': 'Риторичний софізм'
        };
        return labelMap[category] || 'Маніпуляція';
    }

    // Stop current analysis
    stopAnalysis() {
        if (this.currentStream) {
            this.currentStream.close();
            this.currentStream = null;
            ui.hideLoading();
            ui.showNotification('Аналіз зупинено', 'info');
        }
    }

    // Load existing analysis
    async loadAnalysis(analysisId) {
        try {
            ui.showLoading();
            const response = await api.getAnalysis(analysisId);
            
            if (response.success && response.analysis) {
                const analysis = response.analysis;
                
                AppState.set('currentAnalysis', analysis);
                AppState.set('originalText', analysis.original_text);

                // Update displays
                if (analysis.highlights) {
                    this.updateHighlights(analysis.highlights);
                }
                
                if (analysis.barometer) {
                    this.updateBarometer(analysis.barometer);
                }

                // Show results section
                const resultsSection = DOMUtils.$('#results-section');
                if (resultsSection) {
                    resultsSection.style.display = 'block';
                }

                ui.showNotification('Аналіз завантажено', 'success');
            }
        } catch (error) {
            console.error('Failed to load analysis:', error);
            ui.showNotification('Помилка завантаження аналізу', 'error');
        } finally {
            ui.hideLoading();
        }
    }
}

// Create singleton instance
export const analysisManager = new AnalysisManager();