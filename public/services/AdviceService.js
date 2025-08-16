/**
 * AdviceService - Single Responsibility: Managing advice operations
 * Follows SOLID principles - only handles advice logic
 */
class AdviceService {
    constructor() {
        this.isRequestingAdvice = false;
        this.lastAdviceRequest = null;
        this.adviceHistory = [];
        this.maxHistoryItems = 20;
        this.retryAttempts = 3;
        
        console.log('💡 AdviceService initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize advice service
    init() {
        this.setupGlobalMethods();
        this.loadAdviceHistory();
        console.log('💡 AdviceService ready');
    }
    
    // Single Responsibility: Setup global methods
    setupGlobalMethods() {
        window.getAdvice = () => this.getAdvice();
        window.showAdviceModal = (advice) => this.showAdviceModal(advice);
        window.copyAdviceToClipboard = (text) => this.copyAdviceToClipboard(text);
        window.adviceService = this;
    }
    
    // Single Responsibility: Get advice for selected workspace items
    async getAdvice() {
        if (this.isRequestingAdvice) {
            console.warn('💡 Advice request already in progress');
            return false;
        }
        
        if (!window.workspaceService) {
            alert('❌ Робочий простір недоступний');
            return false;
        }
        
        const selectedItems = window.workspaceService.getWorkspaceSelection();
        
        if (selectedItems.length === 0) {
            alert('❌ Оберіть фрагменти для отримання поради');
            return false;
        }
        
        if (selectedItems.length > 20) {
            alert('❌ Забагато фрагментів. Максимум: 20');
            return false;
        }
        
        this.isRequestingAdvice = true;
        this.updateAdviceUI();
        
        try {
            const advice = await this.requestAdvice(selectedItems);
            this.showAdviceModal(advice);
            this.addToAdviceHistory(selectedItems, advice);
            return true;
        } catch (error) {
            console.error('💡 Advice request failed:', error);
            alert('❌ Помилка отримання поради: ' + error.message);
            return false;
        } finally {
            this.isRequestingAdvice = false;
            this.updateAdviceUI();
        }
    }
    
    // Single Responsibility: Request advice from server
    async requestAdvice(items) {
        console.log('💡 Requesting advice for', items.length, 'items');
        
        this.showAdviceProgress('Підготовка запиту...');
        
        // Get client profile
        let profile = {};
        try {
            const clientSelect = document.getElementById('client-select');
            if (clientSelect?.value) {
                const clientId = parseInt(clientSelect.value);
                profile = await this.getClientProfile(clientId);
            }
        } catch (error) {
            console.warn('💡 Could not load client profile:', error);
        }
        
        const requestData = {
            items: items.map(item => ({
                text: item.text,
                category: item.category,
                label: item.label
            })),
            profile: profile
        };
        
        let attempts = 0;
        const maxAttempts = this.retryAttempts;
        
        while (attempts < maxAttempts) {
            attempts++;
            
            try {
                this.showAdviceProgress(`Спроба ${attempts}/${maxAttempts} - відправляю запит...`);
                
                const response = await fetch('/api/advice', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(requestData),
                    credentials: 'include'
                });
                
                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
                }
                
                const result = await response.json();
                
                if (!result.success) {
                    throw new Error(result.error || 'Невідома помилка сервера');
                }
                
                this.showAdviceProgress('Порада отримана!');
                return result.advice;
                
            } catch (error) {
                console.error(`💡 Advice attempt ${attempts} failed:`, error);
                this.showAdviceProgress(`Спроба ${attempts} - помилка: ${error.message}`);
                
                if (attempts < maxAttempts) {
                    await this.delay(2000 * attempts);
                } else {
                    throw new Error(`Не вдалося отримати пораду після ${maxAttempts} спроб. ${error.message}`);
                }
            }
        }
    }
    
    // Single Responsibility: Get client profile
    async getClientProfile(clientId) {
        try {
            const response = await fetch('/api/clients', { credentials: 'include' });
            if (!response.ok) return {};
            
            const result = await response.json();
            if (result.success && result.clients) {
                const client = result.clients.find(c => c.id == clientId);
                return client || {};
            }
        } catch (error) {
            console.warn('💡 Error loading client profile:', error);
        }
        return {};
    }
    
    // Single Responsibility: Show advice modal
    showAdviceModal(advice) {
        const modal = this.createAdviceModal(advice);
        document.body.appendChild(modal);
        
        // Show modal with animation
        setTimeout(() => {
            modal.style.opacity = '1';
            modal.querySelector('.advice-modal-content').style.transform = 'translateY(0)';
        }, 10);
        
        this.attachAdviceModalHandlers(modal);
        console.log('💡 Showing advice modal');
    }
    
    // Single Responsibility: Create advice modal HTML
    createAdviceModal(advice) {
        const modal = document.createElement('div');
        modal.className = 'advice-modal';
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        
        const modalContent = document.createElement('div');
        modalContent.className = 'advice-modal-content';
        modalContent.style.cssText = `
            background: linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 100%);
            border: 2px solid #00ffff;
            border-radius: 15px;
            padding: 30px;
            max-width: 800px;
            width: 90%;
            max-height: 80%;
            overflow-y: auto;
            transform: translateY(-50px);
            transition: transform 0.3s ease;
            box-shadow: 0 20px 40px rgba(0, 255, 255, 0.3);
        `;
        
        modalContent.innerHTML = `
            <div class="advice-modal-header">
                <h2 style="color: #00ffff; margin: 0 0 20px 0; font-size: 24px;">
                    💡 Рекомендації експерта
                </h2>
                <button class="advice-close-btn" style="
                    position: absolute;
                    top: 15px;
                    right: 15px;
                    background: none;
                    border: none;
                    color: #ff6b6b;
                    font-size: 24px;
                    cursor: pointer;
                    padding: 5px;
                ">✕</button>
            </div>
            
            <div class="advice-content">
                ${this.formatAdviceContent(advice)}
            </div>
            
            <div class="advice-modal-footer" style="
                margin-top: 30px;
                display: flex;
                gap: 15px;
                justify-content: flex-end;
            ">
                <button class="advice-copy-btn" style="
                    background: linear-gradient(135deg, #00ffff, #0088cc);
                    color: #000;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    font-weight: bold;
                    transition: all 0.3s ease;
                ">📋 Копіювати все</button>
                <button class="advice-close-btn-footer" style="
                    background: linear-gradient(135deg, #666, #444);
                    color: #fff;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 8px;
                    cursor: pointer;
                    transition: all 0.3s ease;
                ">Закрити</button>
            </div>
        `;
        
        modal.appendChild(modalContent);
        return modal;
    }
    
    // Single Responsibility: Format advice content
    formatAdviceContent(advice) {
        let html = '';
        
        // Recommended replies
        if (advice.recommended_replies && advice.recommended_replies.length > 0) {
            html += `
                <div class="advice-section">
                    <h3 style="color: #00ff88; margin: 0 0 15px 0;">🎯 Рекомендовані відповіді:</h3>
                    <div class="advice-replies">
                        ${advice.recommended_replies.map((reply, index) => `
                            <div class="advice-reply" style="
                                background: rgba(0, 255, 136, 0.1);
                                border: 1px solid rgba(0, 255, 136, 0.3);
                                border-radius: 10px;
                                padding: 15px;
                                margin: 10px 0;
                                position: relative;
                            ">
                                <div style="color: #00ff88; font-weight: bold; margin-bottom: 8px;">
                                    Варіант ${index + 1}:
                                </div>
                                <div style="color: #fff; line-height: 1.5;">${this.escapeHtml(reply)}</div>
                                <button class="copy-reply-btn" data-text="${this.escapeHtml(reply)}" style="
                                    position: absolute;
                                    top: 10px;
                                    right: 10px;
                                    background: rgba(0, 255, 136, 0.2);
                                    border: 1px solid rgba(0, 255, 136, 0.5);
                                    color: #00ff88;
                                    padding: 5px 10px;
                                    border-radius: 5px;
                                    cursor: pointer;
                                    font-size: 12px;
                                ">📋</button>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Risks
        if (advice.risks && advice.risks.length > 0) {
            html += `
                <div class="advice-section" style="margin-top: 25px;">
                    <h3 style="color: #ff6b6b; margin: 0 0 15px 0;">⚠️ Ключові ризики:</h3>
                    <div class="advice-risks">
                        ${advice.risks.map(risk => `
                            <div class="advice-risk" style="
                                background: rgba(255, 107, 107, 0.1);
                                border: 1px solid rgba(255, 107, 107, 0.3);
                                border-radius: 10px;
                                padding: 15px;
                                margin: 10px 0;
                                color: #ff6b6b;
                                display: flex;
                                align-items: center;
                                gap: 10px;
                            ">
                                <span style="font-size: 18px;">🚨</span>
                                <span>${this.escapeHtml(risk)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        }
        
        // Notes
        if (advice.notes) {
            html += `
                <div class="advice-section" style="margin-top: 25px;">
                    <h3 style="color: #ffd700; margin: 0 0 15px 0;">📝 Детальні поради:</h3>
                    <div class="advice-notes" style="
                        background: rgba(255, 215, 0, 0.1);
                        border: 1px solid rgba(255, 215, 0, 0.3);
                        border-radius: 10px;
                        padding: 20px;
                        color: #fff;
                        line-height: 1.6;
                        white-space: pre-wrap;
                    ">${this.escapeHtml(advice.notes)}</div>
                </div>
            `;
        }
        
        return html;
    }
    
    // Single Responsibility: Attach modal event handlers
    attachAdviceModalHandlers(modal) {
        // Close button handlers
        modal.querySelectorAll('.advice-close-btn, .advice-close-btn-footer').forEach(btn => {
            btn.addEventListener('click', () => this.closeAdviceModal(modal));
        });
        
        // Copy all button
        const copyAllBtn = modal.querySelector('.advice-copy-btn');
        if (copyAllBtn) {
            copyAllBtn.addEventListener('click', () => {
                const allText = this.extractAdviceText(modal);
                this.copyAdviceToClipboard(allText);
            });
        }
        
        // Copy individual reply buttons
        modal.querySelectorAll('.copy-reply-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const text = btn.dataset.text;
                this.copyAdviceToClipboard(text);
            });
        });
        
        // Close on background click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeAdviceModal(modal);
            }
        });
        
        // Escape key handler
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeAdviceModal(modal);
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }
    
    // Single Responsibility: Close advice modal
    closeAdviceModal(modal) {
        modal.style.opacity = '0';
        modal.querySelector('.advice-modal-content').style.transform = 'translateY(-50px)';
        
        setTimeout(() => {
            if (modal.parentNode) {
                modal.parentNode.removeChild(modal);
            }
        }, 300);
    }
    
    // Single Responsibility: Extract all text from advice modal
    extractAdviceText(modal) {
        const sections = [];
        
        // Replies
        const replies = Array.from(modal.querySelectorAll('.advice-reply')).map((el, i) => 
            `Варіант ${i + 1}: ${el.querySelector('div:last-child').textContent.trim()}`
        );
        if (replies.length > 0) {
            sections.push('🎯 РЕКОМЕНДОВАНІ ВІДПОВІДІ:\n' + replies.join('\n\n'));
        }
        
        // Risks
        const risks = Array.from(modal.querySelectorAll('.advice-risk span:last-child')).map(el => 
            `🚨 ${el.textContent.trim()}`
        );
        if (risks.length > 0) {
            sections.push('⚠️ КЛЮЧОВІ РИЗИКИ:\n' + risks.join('\n'));
        }
        
        // Notes
        const notes = modal.querySelector('.advice-notes');
        if (notes) {
            sections.push('📝 ДЕТАЛЬНІ ПОРАДИ:\n' + notes.textContent.trim());
        }
        
        return sections.join('\n\n---\n\n');
    }
    
    // Single Responsibility: Copy text to clipboard
    async copyAdviceToClipboard(text) {
        try {
            await navigator.clipboard.writeText(text);
            this.showCopyNotification('Скопійовано до буферу обміну!');
            console.log('💡 Text copied to clipboard');
        } catch (error) {
            console.error('💡 Failed to copy to clipboard:', error);
            // Fallback method
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showCopyNotification('Скопійовано до буферу обміну!');
            } catch (fallbackError) {
                this.showCopyNotification('Помилка копіювання');
            }
            document.body.removeChild(textArea);
        }
    }
    
    // Single Responsibility: Show copy notification
    showCopyNotification(message) {
        let notification = document.getElementById('copy-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'copy-notification';
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #00ff88, #00cc66);
                color: #000;
                padding: 10px 20px;
                border-radius: 8px;
                font-weight: bold;
                z-index: 10001;
                transform: translateX(400px);
                transition: transform 0.3s ease;
            `;
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.transform = 'translateX(0)';
        
        setTimeout(() => {
            notification.style.transform = 'translateX(400px)';
        }, 3000);
    }
    
    // Single Responsibility: Update advice UI
    updateAdviceUI() {
        const adviceBtn = document.getElementById('get-advice-btn');
        if (adviceBtn) {
            adviceBtn.disabled = this.isRequestingAdvice;
            if (this.isRequestingAdvice) {
                adviceBtn.textContent = 'Отримую пораду...';
            } else {
                const selectedCount = window.workspaceService?.selectedItems?.size || 0;
                adviceBtn.textContent = selectedCount > 0 
                    ? `Отримати пораду (${selectedCount})` 
                    : 'Оберіть фрагменти';
            }
        }
    }
    
    // Single Responsibility: Show advice progress
    showAdviceProgress(message) {
        console.log('💡 Progress:', message);
        
        // Update advice button text
        const adviceBtn = document.getElementById('get-advice-btn');
        if (adviceBtn) {
            adviceBtn.textContent = message;
        }
    }
    
    // Single Responsibility: Add to advice history
    addToAdviceHistory(items, advice) {
        const historyItem = {
            id: Date.now(),
            timestamp: new Date().toISOString(),
            itemsCount: items.length,
            items: items.map(item => ({
                text: item.text.substring(0, 100) + '...',
                category: item.category
            })),
            advice: advice
        };
        
        this.adviceHistory.unshift(historyItem);
        
        // Keep only recent items
        if (this.adviceHistory.length > this.maxHistoryItems) {
            this.adviceHistory = this.adviceHistory.slice(0, this.maxHistoryItems);
        }
        
        this.saveAdviceHistory();
        console.log('💡 Added to advice history:', historyItem.id);
    }
    
    // Single Responsibility: Save advice history
    saveAdviceHistory() {
        try {
            localStorage.setItem('teamPulse_adviceHistory', JSON.stringify({
                history: this.adviceHistory,
                lastUpdated: new Date().toISOString()
            }));
        } catch (error) {
            console.warn('💡 Failed to save advice history:', error);
        }
    }
    
    // Single Responsibility: Load advice history
    loadAdviceHistory() {
        try {
            const stored = localStorage.getItem('teamPulse_adviceHistory');
            if (stored) {
                const data = JSON.parse(stored);
                this.adviceHistory = data.history || [];
                console.log('💡 Loaded advice history:', this.adviceHistory.length, 'items');
            }
        } catch (error) {
            console.warn('💡 Failed to load advice history:', error);
            this.adviceHistory = [];
        }
    }
    
    // Single Responsibility: Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Utility method
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
}

// Export for module use
window.AdviceService = AdviceService;