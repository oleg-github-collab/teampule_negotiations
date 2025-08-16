// ===== ПРОСТІШЕ ВИПРАВЛЕННЯ АНАЛІЗУ =====
// ПРАЦЮЄ З НОВОЮ ПРОСТОЮ СИСТЕМОЮ КЛІЄНТІВ

console.log('🔥 SIMPLE ANALYSIS FIX - LOADING...');

// ГЛОБАЛЬНА ФУНКЦІЯ АНАЛІЗУ
window.SIMPLE_START_ANALYSIS = async function() {
    console.log('🔥 ==> SIMPLE START ANALYSIS <==');
    
    // ПЕРЕВІРКА ТЕКСТУ
    const textArea = document.getElementById('negotiation-text');
    if (!textArea?.value?.trim()) {
        if (window.notificationService) {
            window.notificationService.showAlert('Введіть текст для аналізу', 'error');
        } else {
            alert('❌ Введіть текст для аналізу');
        }
        return false;
    }
    
    const text = textArea.value.trim();
    if (text.length < 20) {
        if (window.notificationService) {
            window.notificationService.showAlert('Текст занадто короткий (мінімум 20 символів)', 'error');
        } else {
            alert('❌ Текст занадто короткий');
        }
        return false;
    }
    
    // ПЕРЕВІРКА КЛІЄНТА (ПРОСТІША)
    const currentClient = window.SIMPLE_STATE?.currentClient;
    if (!currentClient) {
        console.error('🔥 NO CLIENT SELECTED!');
        console.log('🔥 SIMPLE_STATE:', window.SIMPLE_STATE);
        
        if (window.notificationService) {
            window.notificationService.showAlert('Спочатку оберіть клієнта в лівому сайдбарі', 'error');
        } else {
            alert('❌ Оберіть клієнта');
        }
        return false;
    }
    
    console.log('🔥 CLIENT FOUND:', currentClient.company);
    console.log('🔥 TEXT LENGTH:', text.length);
    
    // ПІДГОТОВКА ДАНИХ
    const analysisData = {
        client_id: currentClient.id,
        text: text,
        method: 'text'
    };
    
    // ДОДАТИ ПРОФІЛЬ КЛІЄНТА
    if (currentClient) {
        analysisData.profile = JSON.stringify({
            company: currentClient.company || '',
            negotiator: currentClient.negotiator || '',
            sector: currentClient.sector || ''
        });
    }
    
    console.log('🔥 STARTING ANALYSIS WITH DATA:', analysisData);
    
    try {
        // ПОКАЗАТИ ПРОГРЕС
        const analysisBtn = document.getElementById('start-analysis-btn');
        if (analysisBtn) {
            analysisBtn.disabled = true;
            analysisBtn.textContent = 'Аналізую...';
        }
        
        // ВІДПРАВИТИ ЗАПИТ
        const formData = new URLSearchParams();
        Object.keys(analysisData).forEach(key => {
            formData.append(key, analysisData[key]);
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
        
        console.log('🔥 ANALYSIS STARTED SUCCESSFULLY!');
        
        // ОБРОБИТИ STREAM (СПРОЩЕНИЙ ВАРІАНТ)
        return await SIMPLE_PROCESS_ANALYSIS_STREAM(response);
        
    } catch (error) {
        console.error('🔥 ANALYSIS ERROR:', error);
        
        if (window.notificationService) {
            window.notificationService.showAlert('Помилка аналізу: ' + error.message, 'error');
        } else {
            alert('❌ Помилка аналізу: ' + error.message);
        }
        
        return false;
    } finally {
        // ВІДНОВИТИ КНОПКУ
        const analysisBtn = document.getElementById('start-analysis-btn');
        if (analysisBtn) {
            analysisBtn.disabled = false;
            analysisBtn.textContent = 'Розпочати аналіз';
        }
    }
};

// ОБРОБКА STREAM (СПРОЩЕНА)
async function SIMPLE_PROCESS_ANALYSIS_STREAM(response) {
    console.log('🔥 Processing analysis stream...');
    
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    
    let buffer = '';
    let highlights = [];
    
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
                        
                        console.log('🔥 Stream data:', data.type);
                        
                        if (data.type === 'highlight') {
                            highlights.push(data);
                        } else if (data.type === 'merged_highlights') {
                            if (data.items && Array.isArray(data.items)) {
                                highlights = data.items;
                            }
                        } else if (data.type === 'complete') {
                            console.log('🔥 Analysis complete!');
                        }
                    } catch (parseError) {
                        console.warn('🔥 Parse error:', parseError);
                    }
                }
            }
        }
        
        console.log('🔥 ANALYSIS COMPLETED! Highlights:', highlights.length);
        
        // ПОКАЗАТИ РЕЗУЛЬТАТИ (СПРОЩЕНИЙ ВАРІАНТ)
        if (highlights.length > 0) {
            SIMPLE_SHOW_RESULTS(highlights);
        }
        
        return highlights;
        
    } finally {
        reader.releaseLock();
    }
}

// ПОКАЗАТИ РЕЗУЛЬТАТИ (СПРОЩЕНИЙ ВАРІАНТ)
function SIMPLE_SHOW_RESULTS(highlights) {
    console.log('🔥 Showing results...');
    
    // ЗНАЙТИ СЕКЦІЮ РЕЗУЛЬТАТІВ
    const resultsSection = document.getElementById('analysis-results');
    if (resultsSection) {
        resultsSection.style.display = 'block';
    }
    
    // ОНОВИТИ ЛІЧИЛЬНИКИ
    const totalCount = highlights.length;
    const manipulationCount = highlights.filter(h => h.category === 'manipulation').length;
    const biasCount = highlights.filter(h => h.category === 'cognitive_bias').length;
    const fallacyCount = highlights.filter(h => h.category === 'rhetorical_fallacy').length;
    
    console.log('🔥 Results:', { totalCount, manipulationCount, biasCount, fallacyCount });
    
    // ПОКАЗАТИ ПОВІДОМЛЕННЯ ПРО УСПІХ
    if (window.notificationService) {
        window.notificationService.showNotification(`Аналіз завершено! Знайдено ${totalCount} проблем`, 'success');
    }
}

// ВСТАНОВИТИ ОБРОБНИК НА КНОПКУ АНАЛІЗУ
function SETUP_SIMPLE_ANALYSIS_BUTTON() {
    const analysisBtn = document.getElementById('start-analysis-btn');
    if (analysisBtn) {
        // ВИДАЛИТИ СТАРІ ОБРОБНИКИ
        analysisBtn.removeEventListener('click', window.SIMPLE_START_ANALYSIS);
        
        // ДОДАТИ НОВИЙ ОБРОБНИК
        analysisBtn.addEventListener('click', window.SIMPLE_START_ANALYSIS);
        
        console.log('🔥 Simple analysis button handler set up!');
    } else {
        console.log('🔥 Analysis button not found, retrying...');
        setTimeout(SETUP_SIMPLE_ANALYSIS_BUTTON, 500);
    }
}

// ІНІЦІАЛІЗАЦІЯ
setTimeout(SETUP_SIMPLE_ANALYSIS_BUTTON, 1000);

console.log('🔥 SIMPLE ANALYSIS FIX - LOADED!');