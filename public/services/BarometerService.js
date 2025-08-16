/**
 * BarometerService - Single Responsibility: Managing interaction ease barometer
 * Follows SOLID principles - only handles barometer display and calculations
 */
class BarometerService {
    constructor() {
        this.currentScore = 0;
        this.maxScore = 100;
        this.factors = {
            manipulation_count: 0,
            cognitive_bias_count: 0,
            rhetological_fallacy_count: 0,
            text_length: 0,
            complexity_score: 0
        };
        
        console.log('🌡️ BarometerService initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize barometer service
    init() {
        this.setupGlobalMethods();
        this.createBarometerUI();
        console.log('🌡️ BarometerService ready');
    }
    
    // Single Responsibility: Setup global methods
    setupGlobalMethods() {
        window.barometerService = this;
        window.updateBarometer = (data) => this.updateBarometer(data);
        window.resetBarometer = () => this.resetBarometer();
    }
    
    // Single Responsibility: Create barometer UI
    createBarometerUI() {
        const barometerContainer = document.getElementById('barometer-container');
        if (!barometerContainer) {
            console.warn('🌡️ Barometer container not found');
            return;
        }
        
        barometerContainer.innerHTML = `
            <div class="barometer-widget">
                <div class="barometer-header">
                    <h4>
                        🌡️ Барометр легкості взаємодії
                        <button class="barometer-info-btn" title="Інформація про барометр">ℹ️</button>
                    </h4>
                </div>
                <div class="barometer-display">
                    <div class="barometer-gauge">
                        <div class="barometer-fill" id="barometer-fill"></div>
                        <div class="barometer-needle" id="barometer-needle"></div>
                    </div>
                    <div class="barometer-score">
                        <span class="barometer-value" id="barometer-value">0</span>
                        <span class="barometer-max">/100</span>
                    </div>
                </div>
                <div class="barometer-level">
                    <span class="barometer-level-text" id="barometer-level">Не оцінено</span>
                    <span class="barometer-level-icon" id="barometer-icon">❓</span>
                </div>
                <div class="barometer-factors" id="barometer-factors">
                    <!-- Factors will be populated here -->
                </div>
                <div class="barometer-actions">
                    <button class="btn-sm barometer-details-btn" id="barometer-details-btn">
                        📊 Детальна інформація
                    </button>
                </div>
            </div>
        `;
        
        this.attachBarometerEventListeners();
    }
    
    // Single Responsibility: Attach barometer event listeners
    attachBarometerEventListeners() {
        const infoBtn = document.querySelector('.barometer-info-btn');
        if (infoBtn) {
            infoBtn.addEventListener('click', () => this.showBarometerInfo());
        }
        
        const detailsBtn = document.getElementById('barometer-details-btn');
        if (detailsBtn) {
            detailsBtn.addEventListener('click', () => this.showBarometerDetails());
        }
    }
    
    // Single Responsibility: Update barometer with analysis data
    updateBarometer(data) {
        console.log('🌡️ Updating barometer with data:', data);
        
        if (!data) {
            console.warn('🌡️ No barometer data provided');
            return;
        }
        
        // Extract factors from data
        this.factors = {
            manipulation_count: data.manipulation_count || 0,
            cognitive_bias_count: data.cognitive_bias_count || 0,
            rhetological_fallacy_count: data.rhetological_fallacy_count || 0,
            text_length: data.text_length || 0,
            complexity_score: data.complexity_score || 0
        };
        
        // Calculate score
        this.currentScore = this.calculateScore(this.factors);
        
        // Update UI
        this.updateBarometerDisplay();
        this.updateBarometerFactors();
        
        console.log('🌡️ Barometer updated, score:', this.currentScore);
    }
    
    // Single Responsibility: Calculate barometer score
    calculateScore(factors) {
        let score = 100; // Start with perfect score
        
        // Penalty for manipulation techniques
        score -= factors.manipulation_count * 15;
        score -= factors.cognitive_bias_count * 10;
        score -= factors.rhetological_fallacy_count * 5;
        
        // Penalty for text complexity
        if (factors.text_length > 5000) {
            score -= 10; // Very long text
        } else if (factors.text_length > 2000) {
            score -= 5; // Long text
        }
        
        // Penalty for high complexity
        if (factors.complexity_score > 80) {
            score -= 15;
        } else if (factors.complexity_score > 60) {
            score -= 10;
        } else if (factors.complexity_score > 40) {
            score -= 5;
        }
        
        // Ensure score is within bounds
        return Math.max(0, Math.min(100, score));
    }
    
    // Single Responsibility: Update barometer visual display
    updateBarometerDisplay() {
        const valueElement = document.getElementById('barometer-value');
        const fillElement = document.getElementById('barometer-fill');
        const needleElement = document.getElementById('barometer-needle');
        const levelElement = document.getElementById('barometer-level');
        const iconElement = document.getElementById('barometer-icon');
        
        if (valueElement) {
            valueElement.textContent = Math.round(this.currentScore);
        }
        
        if (fillElement) {
            fillElement.style.width = `${this.currentScore}%`;
            fillElement.className = `barometer-fill ${this.getScoreClass(this.currentScore)}`;
        }
        
        if (needleElement) {
            const rotation = (this.currentScore / 100) * 180 - 90; // -90 to 90 degrees
            needleElement.style.transform = `rotate(${rotation}deg)`;
        }
        
        const levelInfo = this.getScoreLevelInfo(this.currentScore);
        if (levelElement) {
            levelElement.textContent = levelInfo.text;
            levelElement.className = `barometer-level-text ${levelInfo.class}`;
        }
        
        if (iconElement) {
            iconElement.textContent = levelInfo.icon;
        }
    }
    
    // Single Responsibility: Update factors display
    updateBarometerFactors() {
        const factorsContainer = document.getElementById('barometer-factors');
        if (!factorsContainer) return;
        
        const factorsList = [
            {
                label: 'Маніпуляції',
                value: this.factors.manipulation_count,
                impact: this.factors.manipulation_count * -15,
                icon: '🎭'
            },
            {
                label: 'Когнітивні спотворення',
                value: this.factors.cognitive_bias_count,
                impact: this.factors.cognitive_bias_count * -10,
                icon: '🧠'
            },
            {
                label: 'Риторичні помилки',
                value: this.factors.rhetological_fallacy_count,
                impact: this.factors.rhetological_fallacy_count * -5,
                icon: '💬'
            },
            {
                label: 'Складність тексту',
                value: this.factors.complexity_score,
                impact: this.calculateComplexityImpact(this.factors.complexity_score),
                icon: '📊'
            }
        ];
        
        factorsContainer.innerHTML = factorsList.map(factor => `
            <div class="barometer-factor">
                <span class="factor-icon">${factor.icon}</span>
                <span class="factor-label">${factor.label}</span>
                <span class="factor-value">${factor.value}</span>
                <span class="factor-impact ${factor.impact < 0 ? 'negative' : 'neutral'}">
                    ${factor.impact < 0 ? factor.impact : '0'}
                </span>
            </div>
        `).join('');
    }
    
    // Single Responsibility: Calculate complexity impact
    calculateComplexityImpact(complexityScore) {
        if (complexityScore > 80) return -15;
        if (complexityScore > 60) return -10;
        if (complexityScore > 40) return -5;
        return 0;
    }
    
    // Single Responsibility: Get score class for styling
    getScoreClass(score) {
        if (score >= 80) return 'excellent';
        if (score >= 60) return 'good';
        if (score >= 40) return 'moderate';
        if (score >= 20) return 'poor';
        return 'critical';
    }
    
    // Single Responsibility: Get score level information
    getScoreLevelInfo(score) {
        if (score >= 80) {
            return {
                text: 'Відмінна взаємодія',
                class: 'excellent',
                icon: '😊',
                description: 'Текст дуже легкий для співпраці, мінімум проблемних моментів'
            };
        }
        if (score >= 60) {
            return {
                text: 'Гарна взаємодія',
                class: 'good',
                icon: '🙂',
                description: 'Текст переважно позитивний, є деякі моменти для уваги'
            };
        }
        if (score >= 40) {
            return {
                text: 'Помірна складність',
                class: 'moderate',
                icon: '😐',
                description: 'Текст містить помітні проблеми, потрібна обережність'
            };
        }
        if (score >= 20) {
            return {
                text: 'Складна взаємодія',
                class: 'poor',
                icon: '😟',
                description: 'Текст містить багато проблемних моментів'
            };
        }
        return {
            text: 'Критична складність',
            class: 'critical',
            icon: '😰',
            description: 'Текст дуже складний для взаємодії, високий ризик конфліктів'
        };
    }
    
    // Single Responsibility: Show barometer information modal
    showBarometerInfo() {
        const modal = this.createInfoModal();
        document.body.appendChild(modal);
        this.showModal(modal);
    }
    
    // Single Responsibility: Create information modal
    createInfoModal() {
        const modal = document.createElement('div');
        modal.className = 'custom-modal barometer-info-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🌡️ Про барометр легкості взаємодії</h3>
                    <button class="modal-close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="barometer-explanation">
                        <p>Барометр легкості взаємодії показує, наскільки складно буде співпрацювати з цим контрагентом на основі аналізу тексту переговорів.</p>
                        
                        <h4>Як розраховується оцінка:</h4>
                        <ul>
                            <li><strong>Маніпуляції (-15 балів кожна):</strong> Спроби свідомого впливу та тиску</li>
                            <li><strong>Когнітивні спотворення (-10 балів кожне):</strong> Логічні помилки в мисленні</li>
                            <li><strong>Риторичні помилки (-5 балів кожна):</strong> Неточності в аргументації</li>
                            <li><strong>Складність тексту:</strong> Довжина та заплутаність повідомлень</li>
                        </ul>
                        
                        <h4>Рівні оцінки:</h4>
                        <div class="score-levels">
                            <div class="score-level excellent">
                                <span class="level-icon">😊</span>
                                <span class="level-text">80-100: Відмінна взаємодія</span>
                            </div>
                            <div class="score-level good">
                                <span class="level-icon">🙂</span>
                                <span class="level-text">60-79: Гарна взаємодія</span>
                            </div>
                            <div class="score-level moderate">
                                <span class="level-icon">😐</span>
                                <span class="level-text">40-59: Помірна складність</span>
                            </div>
                            <div class="score-level poor">
                                <span class="level-icon">😟</span>
                                <span class="level-text">20-39: Складна взаємодія</span>
                            </div>
                            <div class="score-level critical">
                                <span class="level-icon">😰</span>
                                <span class="level-text">0-19: Критична складність</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-primary modal-close-btn">Зрозуміло</button>
                </div>
            </div>
        `;
        
        // Attach close handlers
        modal.querySelectorAll('.modal-close-btn, .modal-overlay').forEach(element => {
            element.addEventListener('click', () => this.closeModal(modal));
        });
        
        return modal;
    }
    
    // Single Responsibility: Show detailed barometer analysis
    showBarometerDetails() {
        const levelInfo = this.getScoreLevelInfo(this.currentScore);
        const modal = this.createDetailsModal(levelInfo);
        document.body.appendChild(modal);
        this.showModal(modal);
    }
    
    // Single Responsibility: Create details modal
    createDetailsModal(levelInfo) {
        const modal = document.createElement('div');
        modal.className = 'custom-modal barometer-details-modal';
        modal.innerHTML = `
            <div class="modal-overlay"></div>
            <div class="modal-content">
                <div class="modal-header">
                    <h3>📊 Детальний аналіз барометра</h3>
                    <button class="modal-close-btn">×</button>
                </div>
                <div class="modal-body">
                    <div class="barometer-summary">
                        <div class="summary-score ${levelInfo.class}">
                            <span class="summary-icon">${levelInfo.icon}</span>
                            <div class="summary-info">
                                <div class="summary-value">${Math.round(this.currentScore)}/100</div>
                                <div class="summary-level">${levelInfo.text}</div>
                            </div>
                        </div>
                        <p class="summary-description">${levelInfo.description}</p>
                    </div>
                    
                    <div class="factors-breakdown">
                        <h4>Детальний розклад факторів:</h4>
                        ${this.generateFactorsBreakdown()}
                    </div>
                    
                    <div class="recommendations">
                        <h4>Рекомендації:</h4>
                        ${this.generateRecommendations()}
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn-secondary modal-close-btn">Закрити</button>
                    <button class="btn-primary export-barometer-btn">📊 Експорт звіту</button>
                </div>
            </div>
        `;
        
        // Attach event handlers
        modal.querySelectorAll('.modal-close-btn, .modal-overlay').forEach(element => {
            element.addEventListener('click', () => this.closeModal(modal));
        });
        
        const exportBtn = modal.querySelector('.export-barometer-btn');
        if (exportBtn) {
            exportBtn.addEventListener('click', () => this.exportBarometerReport());
        }
        
        return modal;
    }
    
    // Single Responsibility: Generate factors breakdown
    generateFactorsBreakdown() {
        const factors = [
            {
                name: 'Маніпулятивні техніки',
                icon: '🎭',
                count: this.factors.manipulation_count,
                impact: this.factors.manipulation_count * -15,
                severity: this.factors.manipulation_count > 5 ? 'high' : this.factors.manipulation_count > 2 ? 'medium' : 'low'
            },
            {
                name: 'Когнітивні спотворення',
                icon: '🧠',
                count: this.factors.cognitive_bias_count,
                impact: this.factors.cognitive_bias_count * -10,
                severity: this.factors.cognitive_bias_count > 5 ? 'high' : this.factors.cognitive_bias_count > 2 ? 'medium' : 'low'
            },
            {
                name: 'Риторичні помилки',
                icon: '💬',
                count: this.factors.rhetological_fallacy_count,
                impact: this.factors.rhetological_fallacy_count * -5,
                severity: this.factors.rhetological_fallacy_count > 10 ? 'high' : this.factors.rhetological_fallacy_count > 5 ? 'medium' : 'low'
            }
        ];
        
        return factors.map(factor => `
            <div class="factor-breakdown ${factor.severity}">
                <div class="factor-header">
                    <span class="factor-icon">${factor.icon}</span>
                    <span class="factor-name">${factor.name}</span>
                    <span class="factor-badge">${factor.count}</span>
                </div>
                <div class="factor-impact">
                    Вплив на оцінку: <span class="impact-value">${factor.impact}</span>
                </div>
                <div class="factor-severity">
                    Рівень: <span class="severity-${factor.severity}">${this.getSeverityText(factor.severity)}</span>
                </div>
            </div>
        `).join('');
    }
    
    // Single Responsibility: Generate recommendations
    generateRecommendations() {
        const recommendations = [];
        
        if (this.factors.manipulation_count > 0) {
            recommendations.push('🎭 Будьте обережні з маніпулятивними техніками - документуйте всі домовленості');
        }
        
        if (this.factors.cognitive_bias_count > 0) {
            recommendations.push('🧠 Зверніть увагу на логічні помилки - перевіряйте факти та аргументи');
        }
        
        if (this.factors.rhetological_fallacy_count > 0) {
            recommendations.push('💬 Аналізуйте аргументацію - не приймайте необґрунтовані твердження');
        }
        
        if (this.currentScore < 40) {
            recommendations.push('⚠️ Розгляньте можливість залучення медіатора або юридичної консультації');
        }
        
        if (recommendations.length === 0) {
            recommendations.push('✅ Взаємодія виглядає позитивно - продовжуйте діалог у конструктивному ключі');
        }
        
        return `<ul>${recommendations.map(rec => `<li>${rec}</li>`).join('')}</ul>`;
    }
    
    // Single Responsibility: Get severity text
    getSeverityText(severity) {
        const severityMap = {
            low: 'Низький',
            medium: 'Середній',
            high: 'Високий'
        };
        return severityMap[severity] || 'Невідомо';
    }
    
    // Single Responsibility: Export barometer report
    exportBarometerReport() {
        const report = {
            timestamp: new Date().toISOString(),
            score: this.currentScore,
            level: this.getScoreLevelInfo(this.currentScore),
            factors: this.factors,
            recommendations: this.generateRecommendations()
        };
        
        const blob = new Blob([JSON.stringify(report, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `barometer_report_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        this.showNotification('Звіт барометра експортовано', 'success');
    }
    
    // Single Responsibility: Reset barometer
    resetBarometer() {
        this.currentScore = 0;
        this.factors = {
            manipulation_count: 0,
            cognitive_bias_count: 0,
            rhetological_fallacy_count: 0,
            text_length: 0,
            complexity_score: 0
        };
        
        this.updateBarometerDisplay();
        this.updateBarometerFactors();
        
        console.log('🌡️ Barometer reset');
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
    
    // Single Responsibility: Show notification
    showNotification(message, type = 'info') {
        if (window.resultsService?.showNotification) {
            window.resultsService.showNotification(message, type);
        } else {
            console.log(`🌡️ Notification [${type}]:`, message);
        }
    }
}

// Export for module use
window.BarometerService = BarometerService;