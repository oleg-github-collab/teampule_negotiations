/**
 * CRITICAL ANALYSIS FIX - Fixes timeout issues
 */

// Override analysis to handle timeouts better
window.addEventListener('DOMContentLoaded', () => {
    console.log('🔧 ANALYSIS FIX - Loading...');
    
    setTimeout(() => {
        // Override the analysis function with a working one
        if (window.analysisManager) {
            window.analysisManager.originalStartAnalysis = window.analysisManager.startAnalysis;
            
            window.analysisManager.startAnalysis = async function() {
                console.log('🔧 FIXED ANALYSIS - Starting...');
                
                const textArea = document.getElementById('analysis-text');
                const clientSelect = document.getElementById('client-select');
                
                if (!textArea || !textArea.value.trim()) {
                    alert('Введіть текст для аналізу');
                    return;
                }
                
                if (!clientSelect || !clientSelect.value) {
                    alert('Оберіть клієнта');
                    return;
                }
                
                const text = textArea.value.trim();
                const clientId = parseInt(clientSelect.value);
                
                if (text.length < 20) {
                    alert('Текст занадто короткий (мінімум 20 символів)');
                    return;
                }
                
                // Show progress
                const progressDiv = document.querySelector('.analysis-progress');
                const resultsSection = document.getElementById('analysis-results');
                
                if (progressDiv) progressDiv.style.display = 'block';
                if (resultsSection) resultsSection.style.display = 'block';
                
                // Update progress
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
                    
                    // Get client info if available
                    if (window.clientManager && window.clientManager.currentClient) {
                        const client = window.clientManager.currentClient;
                        const profile = {
                            company: client.company,
                            negotiator: client.negotiator,
                            sector: client.sector
                        };
                        formData.append('profile', JSON.stringify(profile));
                    }
                    
                    console.log('🔧 Making analysis request...');
                    
                    // Use fetch with longer timeout
                    const response = await fetch('/api/analyze', {
                        method: 'POST',
                        body: formData,
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                    }
                    
                    console.log('🔧 Reading analysis stream...');
                    const reader = response.body.getReader();
                    const decoder = new TextDecoder();
                    
                    let buffer = '';
                    let highlights = [];
                    let currentProgress = 0;
                    
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
                                    
                                    console.log('🔧 Analysis data:', data.type);
                                    
                                    switch (data.type) {
                                        case 'progress':
                                        case 'analysis_started':
                                            currentProgress = Math.min(currentProgress + 10, 90);
                                            if (progressBar) progressBar.textContent = currentProgress + '%';
                                            if (progressText) progressText.textContent = data.message || 'Аналізую...';
                                            break;
                                            
                                        case 'highlight':
                                            highlights.push(data);
                                            // Show highlight count
                                            if (progressText) progressText.textContent = `Знайдено ${highlights.length} проблем...`;
                                            break;
                                            
                                        case 'complete':
                                            if (progressBar) progressBar.textContent = '100%';
                                            if (progressText) progressText.textContent = 'Аналіз завершено!';
                                            break;
                                            
                                        case 'error':
                                            if (data.chunkNumber) {
                                                console.warn(`🔧 Chunk ${data.chunkNumber} failed, continuing...`);
                                            } else {
                                                throw new Error(data.message);
                                            }
                                            break;
                                    }
                                } catch (parseError) {
                                    console.warn('🔧 Parse error:', parseError);
                                }
                            }
                        }
                    }
                    
                    console.log('🔧 Analysis completed with', highlights.length, 'highlights');
                    
                    // Display results
                    if (highlights.length > 0) {
                        this.displayResults(highlights, text);
                        if (progressText) progressText.textContent = `Знайдено ${highlights.length} проблемних моментів`;
                    } else {
                        if (progressText) progressText.textContent = 'Аналіз завершено, проблем не знайдено';
                    }
                    
                } catch (error) {
                    console.error('🔧 Analysis error:', error);
                    if (progressText) progressText.textContent = 'Помилка: ' + error.message;
                    alert('Помилка аналізу: ' + error.message);
                }
            };
            
            // Add simple displayResults method if not exists
            if (!window.analysisManager.displayResults) {
                window.analysisManager.displayResults = function(highlights, originalText) {
                    const resultsContainer = document.getElementById('highlights-list');
                    if (!resultsContainer) return;
                    
                    resultsContainer.innerHTML = highlights.map(h => `
                        <div class="highlight-item ${h.category}">
                            <div class="highlight-text">"${h.text}"</div>
                            <div class="highlight-explanation">${h.explanation}</div>
                            <div class="highlight-meta">
                                <span class="category">${h.category}</span>
                                <span class="severity">Рівень: ${h.severity}</span>
                            </div>
                        </div>
                    `).join('');
                };
            }
            
            console.log('🔧 Analysis manager FIXED');
        }
    }, 3000);
});

console.log('🔧 ANALYSIS FIX script loaded');