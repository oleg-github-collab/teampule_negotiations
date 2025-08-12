// TeamPulse Turbo - Neon Enhanced Frontend
(() => {
    'use strict';

    // ===== Application State =====
    const state = {
        currentClient: null,
        currentAnalysis: null,
        clients: [],
        analyses: [],
        selectedFragments: [],
        originalText: null,
        onboardingCompleted: false,
        onboardingStep: 1,
        tokenUsage: {
            used: 0,
            total: 512000,
            percentage: 0
        },
        ui: {
            leftSidebarCollapsed: false,
            rightSidebarCollapsed: false,
            currentView: 'welcome',
            analysisStep: 1,
            highlightsView: 'list' // list, text, filter
        }
    };

    // ===== DOM Elements Cache =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));

    const elements = {
        // Layout
        sidebarLeft: $('#sidebar-left'),
        sidebarRight: $('#sidebar-right'),
        mainContent: $('#main-content'),
        sidebarLeftToggle: $('#sidebar-left-toggle'),
        sidebarRightToggle: $('#sidebar-right-toggle'),
        mobileMenuToggle: $('#mobile-menu-toggle'),
        workspaceToggle: $('#workspace-toggle'),
        
        // Onboarding
        onboardingModal: $('#onboarding-modal'),
        onboardingClose: $('#onboarding-close'),
        onboardingProgress: $('#onboarding-progress'),
        progressText: $('#progress-text'),
        nextStep: $('#next-step'),
        prevStep: $('#prev-step'),
        skipOnboarding: $('#skip-onboarding'),

        // Client Management
        clientList: $('#client-list'),
        clientSearch: $('#client-search'),
        clientCount: $('#client-count'),
        newClientBtn: $('#new-client-btn'),
        welcomeNewClient: $('#welcome-new-client'),
        welcomeHelp: $('#welcome-help'),
        
        // Navigation
        navClientInfo: $('#nav-client-info'),
        navClientAvatar: $('#nav-client-avatar'),
        navClientName: $('#nav-client-name'),
        navClientSector: $('#nav-client-sector'),
        
        // Token Counter
        tokenCounter: $('#token-counter'),
        usedTokens: $('#used-tokens'),
        totalTokens: $('#total-tokens'),
        tokenProgressFill: $('#token-progress-fill'),
        workspaceUsedTokens: $('#workspace-used-tokens'),
        workspaceTotalTokens: $('#workspace-total-tokens'),
        workspaceTokenProgress: $('#workspace-token-progress'),
        workspaceTokenPercentage: $('#workspace-token-percentage'),
        
        // Tabs & Content
        welcomeScreen: $('#welcome-screen'),
        clientForm: $('#client-form'),
        analysisDashboard: $('#analysis-dashboard'),
        
        // Client Form
        clientFormTitle: $('#client-form-title'),
        saveClientBtn: $('#save-client-btn'),
        cancelClientBtn: $('#cancel-client-btn'),
        
        // Analysis
        textMethod: $('#text-method'),
        fileMethod: $('#file-method'),
        textInputContent: $('#text-input-content'),
        fileInputContent: $('#file-input-content'),
        negotiationText: $('#negotiation-text'),
        fileDropzone: $('#file-dropzone'),
        fileInput: $('#file-input'),
        chooseFileBtn: $('#choose-file-btn'),
        filePreview: $('#file-preview'),
        fileName: $('#file-name'),
        fileSize: $('#file-size'),
        removeFileBtn: $('#remove-file-btn'),
        startAnalysisBtn: $('#start-analysis-btn'),
        clearTextBtn: $('#clear-text-btn'),
        pasteBtn: $('#paste-btn'),
        charCount: $('#char-count'),
        wordCount: $('#word-count'),
        estimatedTokens: $('#estimated-tokens'),
        
        // Results
        resultsSection: $('#results-section'),
        stepInput: $('#step-input'),
        stepAnalysis: $('#step-analysis'),
        stepResults: $('#step-results'),
        manipulationsCount: $('#manipulations-count'),
        biasesCount: $('#biases-count'),
        fallaciesCount: $('#fallacies-count'),
        recommendationsCount: $('#recommendations-count'),
        barometerScore: $('#barometer-score'),
        barometerLabel: $('#barometer-label'),
        gaugeCircle: $('#gauge-circle'),
        highlightsList: $('#highlights-list'),
        fulltextContent: $('#fulltext-content'),
        listView: $('#list-view'),
        textView: $('#text-view'),
        filterView: $('#filter-view'),
        
        // Workspace
        workspaceClientInfo: $('#workspace-client-info'),
        fragmentsCount: $('#fragments-count'),
        fragmentsDropZone: $('#fragments-drop-zone'),
        selectedFragments: $('#selected-fragments'),
        getAdviceBtn: $('#get-advice-btn'),
        exportSelectedBtn: $('#export-selected-btn'),
        clearWorkspaceBtn: $('#clear-workspace-btn'),
        
        // Analysis History
        analysisHistory: $('#analysis-history'),
        analysisCount: $('#analysis-count'),
        newAnalysisBtn: $('#new-analysis-btn'),
        
        // Notifications
        notifications: $('#notifications')
    };

    // ===== Utility Functions =====
    function showNotification(message, type = 'info', duration = 5000) {
        if (!elements.notifications) return;

        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const icons = {
            success: 'fa-check-circle',
            error: 'fa-exclamation-circle',
            warning: 'fa-exclamation-triangle',
            info: 'fa-info-circle'
        };

        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas ${icons[type] || icons.info}"></i>
                <span>${escapeHtml(message)}</span>
            </div>
        `;

        elements.notifications.appendChild(notification);

        // Auto remove
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.animation = 'slideOut 0.3s ease-in forwards';
                setTimeout(() => notification.remove(), 300);
            }
        }, duration);

        // Click to remove
        notification.addEventListener('click', () => {
            notification.style.animation = 'slideOut 0.3s ease-in forwards';
            setTimeout(() => notification.remove(), 300);
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function estimateTokens(text) {
        if (!text) return 0;
        return Math.ceil(text.length / 4);
    }

    function formatNumber(num) {
        return num.toLocaleString('uk-UA');
    }

    function debounce(func, wait) {
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

    // ===== Token Management =====
    async function loadTokenUsage() {
        try {
            const response = await fetch('/api/usage');
            const data = await response.json();
            
            if (data.success) {
                state.tokenUsage.used = data.used_tokens;
                state.tokenUsage.total = data.total_tokens;
                state.tokenUsage.percentage = data.percentage;
                updateTokenDisplay();
            }
        } catch (error) {
            console.error('Error loading token usage:', error);
        }
    }

    function updateTokenDisplay() {
        const { used, total, percentage } = state.tokenUsage;
        
        // Top nav token counter
        if (elements.usedTokens) elements.usedTokens.textContent = formatNumber(used);
        if (elements.totalTokens) elements.totalTokens.textContent = formatNumber(total);
        if (elements.tokenProgressFill) {
            elements.tokenProgressFill.style.width = `${percentage}%`;
            
            // Color coding
            if (percentage > 90) {
                elements.tokenProgressFill.style.background = 'linear-gradient(90deg, var(--danger), var(--neon-pink))';
            } else if (percentage > 70) {
                elements.tokenProgressFill.style.background = 'linear-gradient(90deg, var(--warning), var(--neon-yellow))';
            } else {
                elements.tokenProgressFill.style.background = 'var(--gradient-accent)';
            }
        }

        // Workspace token display
        if (elements.workspaceUsedTokens) elements.workspaceUsedTokens.textContent = formatNumber(used);
        if (elements.workspaceTotalTokens) elements.workspaceTotalTokens.textContent = formatNumber(total);
        if (elements.workspaceTokenPercentage) elements.workspaceTokenPercentage.textContent = `${Math.round(percentage)}%`;
        if (elements.workspaceTokenProgress) {
            elements.workspaceTokenProgress.style.width = `${percentage}%`;
            if (percentage > 90) {
                elements.workspaceTokenProgress.style.background = 'var(--danger)';
            } else if (percentage > 70) {
                elements.workspaceTokenProgress.style.background = 'var(--warning)';
            } else {
                elements.workspaceTokenProgress.style.background = 'var(--gradient-accent)';
            }
        }
    }

    // ===== Layout Management =====
    function toggleSidebar(side) {
        const sidebar = side === 'left' ? elements.sidebarLeft : elements.sidebarRight;
        const isCollapsed = sidebar.classList.contains('collapsed');
        
        if (side === 'left') {
            state.ui.leftSidebarCollapsed = !isCollapsed;
            sidebar.classList.toggle('collapsed');
            
            // Update main content margin
            if (window.innerWidth > 1024) {
                elements.mainContent.style.marginLeft = isCollapsed ? '0' : `var(--sidebar-width)`;
            }
            
            // Update toggle icon
            const icon = elements.sidebarLeftToggle?.querySelector('i');
            if (icon) {
                icon.className = isCollapsed ? 'fas fa-chevron-right' : 'fas fa-chevron-left';
            }
        } else {
            state.ui.rightSidebarCollapsed = !isCollapsed;
            sidebar.classList.toggle('collapsed');
            
            // Update main content margin
            if (window.innerWidth > 1024) {
                elements.mainContent.style.marginRight = isCollapsed ? '0' : `var(--right-panel-width)`;
            }
            
            // Update toggle icon
            const icon = elements.sidebarRightToggle?.querySelector('i');
            if (icon) {
                icon.className = isCollapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
            }
        }
        
        // Save state
        localStorage.setItem('teampulse-ui-state', JSON.stringify(state.ui));
    }

    function showSection(sectionId) {
        // Hide all sections
        const sections = ['welcome-screen', 'client-form', 'analysis-dashboard'];
        sections.forEach(id => {
            const el = $(`#${id}`);
            if (el) el.style.display = 'none';
        });
        
        // Show target section
        const target = $(`#${sectionId}`);
        if (target) {
            target.style.display = 'block';
            state.ui.currentView = sectionId;
        }
    }

    function updateInputMethod(method) {
        // Update buttons
        elements.textMethod?.classList.toggle('active', method === 'text');
        elements.fileMethod?.classList.toggle('active', method === 'file');
        
        // Update content
        if (elements.textInputContent) {
            elements.textInputContent.style.display = method === 'text' ? 'block' : 'none';
        }
        if (elements.fileInputContent) {
            elements.fileInputContent.style.display = method === 'file' ? 'block' : 'none';
        }
    }

    // ===== Onboarding System =====
    function initOnboarding() {
        const completed = localStorage.getItem('teampulse-onboarding-completed');
        if (completed === 'true') {
            state.onboardingCompleted = true;
            if (elements.onboardingModal) {
                elements.onboardingModal.style.display = 'none';
            }
            return;
        }

        // Show onboarding
        showOnboarding();
    }

    function showOnboarding() {
        if (elements.onboardingModal) {
            elements.onboardingModal.style.display = 'flex';
            updateOnboardingStep();
        }
    }

    function updateOnboardingStep() {
        const maxSteps = 4;
        const progress = (state.onboardingStep / maxSteps) * 100;
        
        if (elements.onboardingProgress) {
            elements.onboardingProgress.style.width = `${progress}%`;
        }
        if (elements.progressText) {
            elements.progressText.textContent = `Крок ${state.onboardingStep} з ${maxSteps}`;
        }

        // Show/hide steps
        for (let i = 1; i <= maxSteps; i++) {
            const step = $(`#onboarding-step-${i}`);
            if (step) {
                step.classList.toggle('active', i === state.onboardingStep);
                step.style.display = i === state.onboardingStep ? 'block' : 'none';
            }
        }

        // Update navigation buttons
        if (elements.prevStep) {
            elements.prevStep.style.display = state.onboardingStep > 1 ? 'inline-flex' : 'none';
        }
        if (elements.nextStep) {
            if (state.onboardingStep < maxSteps) {
                elements.nextStep.innerHTML = 'Далі <i class="fas fa-arrow-right"></i>';
            } else {
                elements.nextStep.innerHTML = '<i class="fas fa-rocket"></i> Розпочати роботу';
            }
        }
    }

    function nextOnboardingStep() {
        if (state.onboardingStep < 4) {
            state.onboardingStep++;
            updateOnboardingStep();
        } else {
            completeOnboarding();
        }
    }

    function prevOnboardingStep() {
        if (state.onboardingStep > 1) {
            state.onboardingStep--;
            updateOnboardingStep();
        }
    }

    function completeOnboarding() {
        state.onboardingCompleted = true;
        localStorage.setItem('teampulse-onboarding-completed', 'true');
        
        if (elements.onboardingModal) {
            elements.onboardingModal.style.display = 'none';
        }
        
        showNotification('Ласкаво просимо до TeamPulse Turbo! 🚀', 'success');
        
        // Load initial data
        loadClients();
        loadTokenUsage();
    }

    // ===== Client Management =====
    async function loadClients() {
        try {
            const response = await fetch('/api/clients');
            
            if (response.status === 401) {
                window.location.href = '/login';
                return;
            }
            
            const data = await response.json();
            
            if (!response.ok || !data.success) {
                throw new Error(data.error || `HTTP Error: ${response.status}`);
            }
            
            state.clients = data.clients || [];
            renderClientsList();
            updateClientCount();
            
        } catch (error) {
            console.error('Failed to load clients:', error);
            showNotification('Помилка завантаження клієнтів', 'error');
        }
    }

    function renderClientsList() {
        if (!elements.clientList) return;

        const searchTerm = elements.clientSearch?.value.toLowerCase().trim() || '';
        const filtered = state.clients.filter(client => {
            if (!searchTerm) return true;
            return (
                client.company?.toLowerCase().includes(searchTerm) ||
                client.sector?.toLowerCase().includes(searchTerm) ||
                client.negotiator?.toLowerCase().includes(searchTerm)
            );
        });

        if (filtered.length === 0) {
            const emptyMessage = searchTerm ? 'Нічого не знайдено' : 'Немає клієнтів';
            const emptyIcon = searchTerm ? 'fas fa-search' : 'fas fa-users';
            elements.clientList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="${emptyIcon}"></i>
                    </div>
                    <p>${emptyMessage}</p>
                    ${!searchTerm ? '<button class="btn-primary" onclick="window.showClientForm()">Створити першого клієнта</button>' : ''}
                </div>
            `;
            return;
        }

        // Sort clients by name
        filtered.sort((a, b) => (a.company || '').localeCompare(b.company || ''));

        // Render client items
        elements.clientList.innerHTML = filtered.map(client => {
            const isActive = state.currentClient?.id === client.id;
            const avatar = (client.company || 'C')[0].toUpperCase();
            const analysisCount = client.analysisCount || 0;
            
            return `
                <div class="client-item ${isActive ? 'active' : ''}" 
                     data-client-id="${client.id}"
                     onclick="window.selectClient(${client.id})">
                    <div class="client-avatar">${avatar}</div>
                    <div class="client-info">
                        <div class="client-name">${escapeHtml(client.company || 'Без назви')}</div>
                        <div class="client-meta">
                            ${client.sector ? escapeHtml(client.sector) + ' • ' : ''}
                            ${analysisCount} аналізів
                        </div>
                    </div>
                    <div class="client-actions">
                        <button class="btn-icon" onclick="event.stopPropagation(); window.editClient(${client.id})" title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" onclick="event.stopPropagation(); window.deleteClient(${client.id})" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function updateClientCount() {
        const count = state.clients.length;
        if (elements.clientCount) {
            elements.clientCount.textContent = count;
        }
    }

    function showClientForm(clientId = null) {
        const isEdit = clientId !== null;
        
        if (elements.clientFormTitle) {
            elements.clientFormTitle.textContent = isEdit ? 'Редагувати клієнта' : 'Новий клієнт';
        }
        
        if (isEdit) {
            const client = state.clients.find(c => c.id === clientId);
            if (client) {
                populateClientForm(client);
            }
        } else {
            clearClientForm();
        }
        
        showSection('client-form');
    }

    function clearClientForm() {
        const inputs = $$('#client-form input, #client-form select, #client-form textarea');
        inputs.forEach(input => {
            if (input.type === 'checkbox' || input.type === 'radio') {
                input.checked = false;
            } else {
                input.value = '';
            }
        });
    }

    function populateClientForm(client) {
        Object.keys(client).forEach(key => {
            const input = $(`#${key}`);
            if (input && client[key]) {
                input.value = client[key];
            }
        });
    }

    function selectClient(clientId) {
        const client = state.clients.find(c => c.id === clientId);
        if (!client) return;

        state.currentClient = client;
        
        // Update UI
        updateNavClientInfo(client);
        updateWorkspaceClientInfo(client);
        renderClientsList(); // Re-render to show active state
        
        // Show analysis dashboard
        showSection('analysis-dashboard');
        
        showNotification(`Обрано клієнта: ${client.company}`, 'success');
        
        // Load analysis history for this client
        loadAnalysisHistory(clientId);
    }

    function updateNavClientInfo(client) {
        if (!client) {
            if (elements.navClientInfo) elements.navClientInfo.style.display = 'none';
            return;
        }

        const avatar = (client.company || 'C')[0].toUpperCase();
        
        if (elements.navClientAvatar) elements.navClientAvatar.textContent = avatar;
        if (elements.navClientName) elements.navClientName.textContent = client.company || 'Без назви';
        if (elements.navClientSector) elements.navClientSector.textContent = client.sector || '—';
        if (elements.navClientInfo) elements.navClientInfo.style.display = 'flex';
    }

    function updateWorkspaceClientInfo(client) {
        if (!elements.workspaceClientInfo) return;

        if (!client) {
            elements.workspaceClientInfo.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-user-plus"></i>
                    </div>
                    <p>Оберіть клієнта для роботи</p>
                </div>
            `;
            return;
        }

        const avatar = (client.company || 'C')[0].toUpperCase();
        
        elements.workspaceClientInfo.innerHTML = `
            <div class="client-item active">
                <div class="client-avatar">${avatar}</div>
                <div class="client-info">
                    <div class="client-name">${escapeHtml(client.company || 'Без назві')}</div>
                    <div class="client-meta">
                        ${client.sector ? escapeHtml(client.sector) + ' • ' : ''}
                        ${client.analysisCount || 0} аналізів
                    </div>
                </div>
            </div>
        `;
    }

    async function saveClient() {
        try {
            const clientData = {};
            const inputs = $$('#client-form input, #client-form select, #client-form textarea');
            
            let hasRequired = false;
            inputs.forEach(input => {
                if (input.value.trim()) {
                    clientData[input.id] = input.value.trim();
                    if (input.id === 'company') hasRequired = true;
                }
            });

            if (!hasRequired) {
                showNotification('Назва компанії є обов\'язковою', 'warning');
                return;
            }

            // Add loading state
            if (elements.saveClientBtn) {
                elements.saveClientBtn.classList.add('btn-loading');
                elements.saveClientBtn.disabled = true;
            }

            const response = await fetch('/api/clients', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(clientData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка збереження');
            }

            showNotification('Клієнта збережено успішно! 🎉', 'success');
            
            // Set the new client as current and show analysis dashboard
            state.currentClient = data.client;
            await loadClients();
            updateNavClientInfo(state.currentClient);
            updateWorkspaceClientInfo(state.currentClient);
            showSection('analysis-dashboard');

        } catch (error) {
            console.error('Save client error:', error);
            showNotification(error.message || 'Помилка при збереженні клієнта', 'error');
        } finally {
            // Remove loading state
            if (elements.saveClientBtn) {
                elements.saveClientBtn.classList.remove('btn-loading');
                elements.saveClientBtn.disabled = false;
            }
        }
    }

    // ===== Text Analysis =====
    function updateTextStats() {
        const text = elements.negotiationText?.value || '';
        const chars = text.length;
        const words = text.split(/\s+/).filter(w => w.length > 0).length;
        const tokens = estimateTokens(text);
        
        if (elements.charCount) elements.charCount.textContent = `${formatNumber(chars)} символів`;
        if (elements.wordCount) elements.wordCount.textContent = `${formatNumber(words)} слів`;
        if (elements.estimatedTokens) elements.estimatedTokens.textContent = `≈ ${formatNumber(tokens)} токенів`;
        
        // Enable/disable analysis button
        const hasText = chars > 0;
        const hasClient = state.currentClient !== null;
        
        if (elements.startAnalysisBtn) {
            elements.startAnalysisBtn.disabled = !hasText || !hasClient;
            
            if (!hasClient) {
                elements.startAnalysisBtn.innerHTML = '<i class="fas fa-user-plus"></i> <span>Спочатку оберіть клієнта</span>';
            } else if (!hasText) {
                elements.startAnalysisBtn.innerHTML = '<i class="fas fa-edit"></i> <span>Введіть текст для аналізу</span>';
            } else {
                elements.startAnalysisBtn.innerHTML = '<i class="fas fa-brain"></i> <span>Розпочати аналіз</span>';
            }
        }
    }

    // Debounced version for performance
    const debouncedUpdateTextStats = debounce(updateTextStats, 300);

    async function startAnalysis() {
        if (!state.currentClient) {
            showNotification('Спочатку оберіть клієнта', 'warning');
            return;
        }

        const text = elements.negotiationText?.value?.trim();
        if (!text) {
            showNotification('Введіть текст для аналізу', 'warning');
            return;
        }

        // Store original text for highlighting
        state.originalText = text;

        try {
            // Show results section and update steps
            if (elements.resultsSection) elements.resultsSection.style.display = 'block';
            updateAnalysisSteps('analysis');
            
            // Add loading state
            if (elements.startAnalysisBtn) {
                elements.startAnalysisBtn.classList.add('btn-loading');
                elements.startAnalysisBtn.disabled = true;
            }

            // Prepare form data for streaming analysis
            const formData = new FormData();
            formData.append('text', text);
            formData.append('client_id', state.currentClient.id);

            // Start streaming analysis
            const response = await fetch('/api/analyze', {
                method: 'POST',
                body: formData
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Помилка аналізу');
            }

            // Process streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let analysisData = {
                highlights: [],
                summary: {},
                barometer: {}
            };

            while (true) {
                const { value, done } = await reader.read();
                if (done) break;
                
                const chunk = decoder.decode(value);
                const lines = chunk.split('\n');
                
                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            
                            if (data.type === 'highlight') {
                                analysisData.highlights.push(data);
                                updateHighlightsDisplay(analysisData.highlights);
                            } else if (data.type === 'merged_highlights') {
                                analysisData.highlights = data.items;
                                updateHighlightsDisplay(analysisData.highlights);
                            } else if (data.type === 'summary') {
                                analysisData.summary = data;
                                updateSummaryDisplay(data);
                            } else if (data.type === 'barometer') {
                                analysisData.barometer = data;
                                updateBarometerDisplay(data);
                            } else if (data.type === 'analysis_saved') {
                                state.currentAnalysis = { id: data.id, ...analysisData };
                                await loadAnalysisHistory(state.currentClient.id);
                            }
                        } catch (e) {
                            // Skip invalid JSON lines
                        }
                    }
                }
            }

            // Update token usage
            await loadTokenUsage();
            updateAnalysisSteps('completed');
            showNotification('Аналіз завершено успішно! ✨', 'success');

        } catch (error) {
            console.error('Analysis error:', error);
            showNotification(error.message || 'Помилка при аналізі', 'error');
            updateAnalysisSteps('error');
        } finally {
            // Remove loading state
            if (elements.startAnalysisBtn) {
                elements.startAnalysisBtn.classList.remove('btn-loading');
                elements.startAnalysisBtn.disabled = false;
            }
            updateTextStats(); // Restore button text
        }
    }

    function updateAnalysisSteps(step) {
        const steps = {
            'input': { step: 1, status: 'completed' },
            'analysis': { step: 2, status: 'active' },
            'completed': { step: 3, status: 'completed' },
            'error': { step: 2, status: 'error' }
        };

        const currentStep = steps[step];
        if (!currentStep) return;

        // Update step elements
        ['step-input', 'step-analysis', 'step-results'].forEach((id, index) => {
            const element = $(`#${id}`);
            if (element) {
                const stepNumber = index + 1;
                element.classList.remove('active', 'completed', 'error');
                
                if (stepNumber < currentStep.step) {
                    element.classList.add('completed');
                } else if (stepNumber === currentStep.step) {
                    element.classList.add(currentStep.status);
                }
            }
        });
    }

    // Streaming update functions
    function updateHighlightsDisplay(highlights) {
        if (!elements.highlightsList) return;
        
        if (!highlights || highlights.length === 0) {
            elements.highlightsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-search"></i></div>
                    <p>Проблемні моменти з'являться тут після аналізу</p>
                </div>
            `;
            return;
        }
        
        elements.highlightsList.innerHTML = highlights.map((highlight, index) => `
            <div class="highlight-item" data-highlight-id="${index}" draggable="true">
                <div class="highlight-header">
                    <div class="highlight-type ${highlight.category || 'manipulation'}">${highlight.label || 'Проблема'}</div>
                    <div class="highlight-severity">Рівень: ${highlight.severity || 1}</div>
                </div>
                <div class="highlight-text">"${highlight.text}"</div>
                <div class="highlight-explanation">${highlight.explanation || ''}</div>
                <div class="highlight-actions">
                    <button class="btn-icon" onclick="addToWorkspace(${index})" title="Додати до робочої області">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `).join('');
        
        // Enable drag functionality
        enableHighlightDrag();
    }

    function updateSummaryDisplay(summary) {
        // Update counts from summary
        const counts = summary.counts_by_category || {};
        
        if (elements.manipulationsCount) elements.manipulationsCount.textContent = counts.manipulation || 0;
        if (elements.biasesCount) elements.biasesCount.textContent = counts.cognitive_bias || 0;
        if (elements.fallaciesCount) elements.fallaciesCount.textContent = counts.rhetological_fallacy || 0;
        
        // Show patterns
        if (summary.top_patterns) {
            state.currentPatterns = summary.top_patterns;
        }
    }

    function updateBarometerDisplay(barometer) {
        if (!barometer.score) return;
        
        const score = barometer.score;
        const label = barometer.label || 'Medium';
        
        // Update barometer display
        if (elements.barometerScore) {
            elements.barometerScore.textContent = score;
        }
        if (elements.barometerLabel) {
            elements.barometerLabel.textContent = label;
        }
        
        // Update gauge
        const gaugeCircle = $('#gauge-circle');
        if (gaugeCircle) {
            const circumference = 2 * Math.PI * 45; // radius = 45
            const progress = (score / 100) * circumference;
            gaugeCircle.style.strokeDasharray = `${progress} ${circumference}`;
        }
    }

    function displayAnalysisResults(analysis) {
        if (!analysis) return;

        // Update statistics
        const stats = {
            manipulations: analysis.manipulations?.length || 0,
            biases: analysis.biases?.length || 0,
            fallacies: analysis.fallacies?.length || 0,
            recommendations: analysis.recommendations?.length || 0
        };

        Object.keys(stats).forEach(key => {
            const element = $(`#${key}-count`);
            if (element) {
                animateNumber(element, stats[key]);
            }
        });

        // Update barometer
        if (analysis.complexity_score !== undefined) {
            updateBarometer(analysis.complexity_score, analysis.complexity_label);
        }

        // Update highlights
        if (analysis.highlights) {
            updateHighlightsDisplay(analysis.highlights);
        }

        // Update full text view
        if (analysis.highlighted_text) {
            updateFullTextView(analysis.highlighted_text);
        }
    }

    function animateNumber(element, target) {
        const start = parseInt(element.textContent) || 0;
        const duration = 1000;
        const startTime = Date.now();

        function update() {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);
            const current = Math.floor(start + (target - start) * progress);
            
            element.textContent = current;
            
            if (progress < 1) {
                requestAnimationFrame(update);
            }
        }
        
        update();
    }

    function updateBarometer(score, label) {
        if (elements.barometerScore) {
            elements.barometerScore.textContent = score || '—';
        }
        if (elements.barometerLabel) {
            elements.barometerLabel.textContent = label || 'Невідомо';
        }
        
        // Update gauge fill
        if (elements.gaugeCircle && score) {
            const circumference = 2 * Math.PI * 45; // radius = 45
            const progress = (score / 10) * circumference;
            elements.gaugeCircle.style.strokeDasharray = `${progress} ${circumference}`;
        }
    }

    function displayHighlights(highlights) {
        if (!elements.highlightsList || !highlights.length) {
            if (elements.highlightsList) {
                elements.highlightsList.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon">
                            <i class="fas fa-check-circle"></i>
                        </div>
                        <p>Проблемних моментів не виявлено</p>
                    </div>
                `;
            }
            return;
        }

        elements.highlightsList.innerHTML = highlights.map((highlight, index) => `
            <div class="highlight-item ${highlight.category || 'general'}" data-highlight-id="${index}">
                <div class="highlight-header">
                    <div class="highlight-type ${highlight.category}">${highlight.category_label || 'Проблема'}</div>
                    <div class="highlight-actions">
                        <button class="btn-icon" onclick="window.addToWorkspace(${index})" title="Додати до робочої області">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn-icon" onclick="window.shareHighlight(${index})" title="Поділитися">
                            <i class="fas fa-share"></i>
                        </button>
                    </div>
                </div>
                <div class="highlight-text">${escapeHtml(highlight.text || '')}</div>
                <div class="highlight-description">${escapeHtml(highlight.description || '')}</div>
                ${highlight.suggestion ? `<div class="highlight-suggestion"><strong>Рекомендація:</strong> ${escapeHtml(highlight.suggestion)}</div>` : ''}
            </div>
        `).join('');
    }

    function updateFullTextView(highlightedText) {
        if (elements.fulltextContent) {
            if (highlightedText) {
                elements.fulltextContent.innerHTML = `
                    <div class="fulltext-container">
                        ${highlightedText}
                    </div>
                `;
            } else if (state.currentAnalysis?.highlights && state.originalText) {
                // Generate highlighted text from highlights and original text
                const highlighted = generateHighlightedText(state.originalText, state.currentAnalysis.highlights);
                elements.fulltextContent.innerHTML = `
                    <div class="fulltext-container">
                        ${highlighted}
                    </div>
                `;
            } else {
                elements.fulltextContent.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-icon"><i class="fas fa-file-text"></i></div>
                        <p>Повний текст з підсвічуванням з'явиться тут після аналізу</p>
                    </div>
                `;
            }
        }
    }

    function generateHighlightedText(originalText, highlights) {
        if (!originalText || !highlights || highlights.length === 0) {
            return escapeHtml(originalText || '');
        }

        let highlightedText = originalText;
        const sortedHighlights = [...highlights].sort((a, b) => {
            const aStart = originalText.indexOf(a.text);
            const bStart = originalText.indexOf(b.text);
            return bStart - aStart; // Sort in reverse order to avoid index shifting
        });

        for (const highlight of sortedHighlights) {
            const regex = new RegExp(escapeRegExp(highlight.text), 'gi');
            const categoryClass = getCategoryClass(highlight.category);
            highlightedText = highlightedText.replace(regex, 
                `<span class="text-highlight ${categoryClass}" data-tooltip="${escapeHtml(highlight.explanation || highlight.label)}">${highlight.text}</span>`
            );
        }

        return highlightedText;
    }

    function getCategoryClass(category) {
        const categoryMap = {
            'manipulation': 'manipulation',
            'cognitive_bias': 'cognitive_bias', 
            'rhetological_fallacy': 'fallacy',
            'logical_fallacy': 'fallacy'
        };
        return categoryMap[category] || 'manipulation';
    }

    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ===== View Controls =====
    function switchHighlightsView(view) {
        state.ui.highlightsView = view;
        
        // Update button states
        elements.listView?.classList.toggle('active', view === 'list');
        elements.textView?.classList.toggle('active', view === 'text');
        elements.filterView?.classList.toggle('active', view === 'filter');
        
        // Show/hide content
        if (elements.highlightsList) {
            elements.highlightsList.style.display = view === 'list' ? 'block' : 'none';
        }
        if (elements.fulltextContent) {
            elements.fulltextContent.style.display = view === 'text' ? 'block' : 'none';
            
            // Update full text view when switching to text view
            if (view === 'text') {
                updateFullTextView();
            }
        }
    }

    // ===== File Handling =====
    function setupFileHandling() {
        if (!elements.fileDropzone || !elements.fileInput) return;

        // File input change
        elements.fileInput.addEventListener('change', handleFileSelect);
        
        // Choose file button
        elements.chooseFileBtn?.addEventListener('click', () => {
            elements.fileInput.click();
        });

        // Drag and drop
        elements.fileDropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            elements.fileDropzone.classList.add('dragover');
        });

        elements.fileDropzone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            elements.fileDropzone.classList.remove('dragover');
        });

        elements.fileDropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            elements.fileDropzone.classList.remove('dragover');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                handleFileSelect({ target: { files } });
            }
        });

        // Remove file button
        elements.removeFileBtn?.addEventListener('click', clearFile);
    }

    function handleFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;

        // Validate file
        const maxSize = 10 * 1024 * 1024; // 10MB
        const allowedTypes = ['.txt', '.doc', '.docx'];
        const fileExt = '.' + file.name.split('.').pop().toLowerCase();

        if (file.size > maxSize) {
            showNotification('Файл занадто великий. Максимальний розмір: 10MB', 'error');
            return;
        }

        if (!allowedTypes.includes(fileExt)) {
            showNotification('Непідтримуваний формат файлу. Дозволені: TXT, DOC, DOCX', 'error');
            return;
        }

        // Show file preview
        showFilePreview(file);

        // Read file
        const reader = new FileReader();
        reader.onload = (e) => {
            if (elements.negotiationText) {
                elements.negotiationText.value = e.target.result;
                updateTextStats();
            }
            showNotification('Файл завантажено успішно! ✅', 'success');
        };
        reader.onerror = () => {
            showNotification('Помилка читання файлу', 'error');
        };
        reader.readAsText(file);
    }

    function showFilePreview(file) {
        if (elements.fileName) elements.fileName.textContent = file.name;
        if (elements.fileSize) elements.fileSize.textContent = formatFileSize(file.size);
        if (elements.filePreview) elements.filePreview.style.display = 'block';
    }

    function clearFile() {
        if (elements.fileInput) elements.fileInput.value = '';
        if (elements.filePreview) elements.filePreview.style.display = 'none';
        if (elements.negotiationText) {
            elements.negotiationText.value = '';
            updateTextStats();
        }
    }

    function formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // ===== Sidebar Management =====
    function toggleSidebar(side) {
        if (side === 'left') {
            state.ui.leftSidebarCollapsed = !state.ui.leftSidebarCollapsed;
            if (elements.sidebarLeft) {
                elements.sidebarLeft.classList.toggle('collapsed', state.ui.leftSidebarCollapsed);
            }
        } else if (side === 'right') {
            state.ui.rightSidebarCollapsed = !state.ui.rightSidebarCollapsed;
            if (elements.sidebarRight) {
                elements.sidebarRight.classList.toggle('collapsed', state.ui.rightSidebarCollapsed);
            }
        }
    }

    function showOnboarding() {
        if (elements.onboardingModal) {
            elements.onboardingModal.style.display = 'flex';
        }
    }

    function completeOnboarding() {
        state.onboardingCompleted = true;
        if (elements.onboardingModal) {
            elements.onboardingModal.style.display = 'none';
        }
        
        // Load initial data
        loadClients();
        loadTokenUsage();
        
        // Auto-refresh token usage
        setInterval(loadTokenUsage, 30000);
    }

    function nextOnboardingStep() {
        if (state.onboardingStep < 4) {
            state.onboardingStep++;
            updateOnboardingStep();
        } else {
            completeOnboarding();
        }
    }

    function prevOnboardingStep() {
        if (state.onboardingStep > 1) {
            state.onboardingStep--;
            updateOnboardingStep();
        }
    }

    function updateOnboardingStep() {
        // Hide all steps
        $$('.onboarding-step').forEach(step => step.classList.remove('active'));
        
        // Show current step
        const currentStep = $(`#onboarding-step-${state.onboardingStep}`);
        if (currentStep) {
            currentStep.classList.add('active');
        }
        
        // Update progress
        const progress = (state.onboardingStep / 4) * 100;
        if (elements.onboardingProgress) {
            elements.onboardingProgress.style.width = `${progress}%`;
        }
        if (elements.progressText) {
            elements.progressText.textContent = `Крок ${state.onboardingStep} з 4`;
        }
        
        // Update buttons
        if (elements.prevStep) {
            elements.prevStep.style.display = state.onboardingStep > 1 ? 'block' : 'none';
        }
        if (elements.nextStep) {
            elements.nextStep.innerHTML = state.onboardingStep < 4 ? 
                'Далі <i class="fas fa-arrow-right"></i>' : 
                'Завершити <i class="fas fa-check"></i>';
        }
    }

    // ===== Drag & Drop Functions =====
    function enableHighlightDrag() {
        $$('.highlight-item[draggable="true"]').forEach(item => {
            item.addEventListener('dragstart', (e) => {
                const highlightId = e.target.dataset.highlightId;
                e.dataTransfer.setData('text/plain', highlightId);
                e.target.classList.add('dragging');
            });

            item.addEventListener('dragend', (e) => {
                e.target.classList.remove('dragging');
            });
        });
    }

    function setupWorkspaceDrop() {
        const dropZone = elements.fragmentsDropZone;
        if (!dropZone) return;

        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.classList.add('dragover');
        });

        dropZone.addEventListener('dragleave', (e) => {
            if (!dropZone.contains(e.relatedTarget)) {
                dropZone.classList.remove('dragover');
            }
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.classList.remove('dragover');
            
            const highlightId = e.dataTransfer.getData('text/plain');
            if (highlightId !== '') {
                addToWorkspace(parseInt(highlightId));
            }
        });
    }

    function addToWorkspace(highlightIndex) {
        if (!state.currentAnalysis?.highlights?.[highlightIndex]) return;
        
        const highlight = state.currentAnalysis.highlights[highlightIndex];
        
        // Avoid duplicates
        const exists = state.selectedFragments.some(f => f.id === highlight.id);
        if (exists) {
            showNotification('Цей фрагмент вже додано до робочої області', 'warning');
            return;
        }
        
        state.selectedFragments.push({
            id: highlight.id,
            text: highlight.text,
            category: highlight.category,
            label: highlight.label,
            explanation: highlight.explanation
        });
        
        updateWorkspaceFragments();
        updateWorkspaceActions();
        showNotification('Фрагмент додано до робочої області', 'success');
    }

    function updateWorkspaceFragments() {
        const selectedFragments = elements.selectedFragments;
        if (!selectedFragments) return;
        
        if (elements.fragmentsCount) {
            elements.fragmentsCount.textContent = state.selectedFragments.length;
        }
        
        if (state.selectedFragments.length === 0) {
            selectedFragments.innerHTML = '';
            return;
        }
        
        selectedFragments.innerHTML = state.selectedFragments.map((fragment, index) => `
            <div class="fragment-item">
                <div class="highlight-type ${fragment.category}">${fragment.label}</div>
                <div class="fragment-text">"${fragment.text}"</div>
                <button class="fragment-remove" onclick="removeFromWorkspace(${index})" title="Видалити">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }

    function removeFromWorkspace(index) {
        state.selectedFragments.splice(index, 1);
        updateWorkspaceFragments();
        updateWorkspaceActions();
    }

    function updateWorkspaceActions() {
        const hasFragments = state.selectedFragments.length > 0;
        
        if (elements.getAdviceBtn) {
            elements.getAdviceBtn.disabled = !hasFragments;
        }
        if (elements.exportSelectedBtn) {
            elements.exportSelectedBtn.disabled = !hasFragments;
        }
        if (elements.clearWorkspaceBtn) {
            elements.clearWorkspaceBtn.disabled = !hasFragments;
        }
    }

    async function getPersonalizedAdvice() {
        if (state.selectedFragments.length === 0) {
            showNotification('Спочатку оберіть фрагменти для аналізу', 'warning');
            return;
        }

        if (!state.currentClient) {
            showNotification('Клієнт не обраний', 'warning');
            return;
        }

        try {
            elements.getAdviceBtn.classList.add('btn-loading');
            elements.getAdviceBtn.disabled = true;

            const response = await fetch('/api/advice', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    client_id: state.currentClient.id,
                    fragments: state.selectedFragments
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка отримання порад');
            }

            // Show advice in a modal or notification
            showAdviceModal(data.advice);
            await loadTokenUsage();

        } catch (error) {
            console.error('Advice error:', error);
            showNotification(error.message || 'Помилка при отриманні порад', 'error');
        } finally {
            elements.getAdviceBtn.classList.remove('btn-loading');
            elements.getAdviceBtn.disabled = state.selectedFragments.length === 0;
        }
    }

    function showAdviceModal(advice) {
        // Create and show advice modal
        const modal = document.createElement('div');
        modal.className = 'advice-modal';
        modal.innerHTML = `
            <div class="advice-content">
                <div class="advice-header">
                    <h3><i class="fas fa-lightbulb"></i> Персоналізовані поради</h3>
                    <button class="btn-icon close-advice" onclick="this.closest('.advice-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="advice-body">
                    <div class="advice-text">${advice}</div>
                </div>
                <div class="advice-actions">
                    <button class="btn-secondary" onclick="this.closest('.advice-modal').remove()">Закрити</button>
                    <button class="btn-primary" onclick="copyAdviceToClipboard('${advice.replace(/'/g, "\\'")}')">
                        <i class="fas fa-copy"></i> Копіювати
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        showNotification('Поради згенеровано успішно! 💡', 'success');
    }

    function copyAdviceToClipboard(advice) {
        navigator.clipboard.writeText(advice).then(() => {
            showNotification('Поради скопійовано в буфер обміну', 'success');
        }).catch(() => {
            showNotification('Не вдалося скопіювати', 'error');
        });
    }

    function exportSelectedFragments() {
        if (state.selectedFragments.length === 0) {
            showNotification('Немає фрагментів для експорту', 'warning');
            return;
        }

        const exportData = {
            client: state.currentClient,
            fragments: state.selectedFragments,
            analysis_date: new Date().toISOString(),
            export_date: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `teampulse_analysis_${state.currentClient?.company || 'client'}_${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        showNotification('Дані експортовано успішно! 📁', 'success');
    }

    function clearWorkspace() {
        if (state.selectedFragments.length === 0) return;

        if (confirm('Очистити робочу область? Всі обрані фрагменти будуть видалені.')) {
            state.selectedFragments = [];
            updateWorkspaceFragments();
            updateWorkspaceActions();
            showNotification('Робочу область очищено', 'info');
        }
    }

    // Make functions globally accessible
    window.addToWorkspace = addToWorkspace;
    window.removeFromWorkspace = removeFromWorkspace;
    window.copyAdviceToClipboard = copyAdviceToClipboard;

    // ===== Event Handlers =====
    function bindEvents() {
        // Sidebar toggles
        elements.sidebarLeftToggle?.addEventListener('click', () => toggleSidebar('left'));
        elements.sidebarRightToggle?.addEventListener('click', () => toggleSidebar('right'));
        elements.mobileMenuToggle?.addEventListener('click', () => toggleSidebar('left'));
        elements.workspaceToggle?.addEventListener('click', () => toggleSidebar('right'));

        // Client search
        elements.clientSearch?.addEventListener('input', debounce(renderClientsList, 300));

        // Client management
        elements.newClientBtn?.addEventListener('click', () => showClientForm());
        elements.welcomeNewClient?.addEventListener('click', () => showClientForm());
        elements.saveClientBtn?.addEventListener('click', saveClient);
        elements.cancelClientBtn?.addEventListener('click', () => showSection('welcome-screen'));

        // Navigation actions
        $('#help-toggle')?.addEventListener('click', showOnboarding);
        $('#settings-toggle')?.addEventListener('click', () => {
            showNotification('Налаштування будуть додані в наступній версії', 'info');
        });

        // Onboarding
        elements.welcomeHelp?.addEventListener('click', showOnboarding);
        elements.skipOnboarding?.addEventListener('click', completeOnboarding);
        elements.nextStep?.addEventListener('click', nextOnboardingStep);
        elements.prevStep?.addEventListener('click', prevOnboardingStep);

        // Input methods
        elements.textMethod?.addEventListener('click', () => updateInputMethod('text'));
        elements.fileMethod?.addEventListener('click', () => updateInputMethod('file'));

        // Text analysis
        elements.negotiationText?.addEventListener('input', debouncedUpdateTextStats);
        elements.startAnalysisBtn?.addEventListener('click', startAnalysis);
        elements.newAnalysisBtn?.addEventListener('click', createNewAnalysis);
        elements.clearTextBtn?.addEventListener('click', () => {
            if (elements.negotiationText) {
                elements.negotiationText.value = '';
                updateTextStats();
            }
        });
        elements.pasteBtn?.addEventListener('click', async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (elements.negotiationText) {
                    elements.negotiationText.value = text;
                    updateTextStats();
                    showNotification('Текст вставлено з буферу обміну', 'success');
                }
            } catch (err) {
                showNotification('Не вдалося вставити з буферу обміну', 'error');
            }
        });

        // View controls
        elements.listView?.addEventListener('click', () => switchHighlightsView('list'));
        elements.textView?.addEventListener('click', () => switchHighlightsView('text'));
        elements.filterView?.addEventListener('click', () => switchHighlightsView('filter'));

        // Workspace actions
        elements.getAdviceBtn?.addEventListener('click', getPersonalizedAdvice);
        elements.exportSelectedBtn?.addEventListener('click', exportSelectedFragments);
        elements.clearWorkspaceBtn?.addEventListener('click', clearWorkspace);

        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
        
        // Window resize
        window.addEventListener('resize', debounce(handleResize, 100));
    }

    function handleKeyboardShortcuts(e) {
        // Ctrl/Cmd + Enter to start analysis
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            if (state.ui.currentView === 'analysis-dashboard' && !elements.startAnalysisBtn?.disabled) {
                startAnalysis();
            }
        }
        
        // Escape to close modals
        if (e.key === 'Escape') {
            if (elements.onboardingModal?.style.display === 'flex') {
                completeOnboarding();
            }
        }
    }

    function handleResize() {
        // Update sidebar states based on screen size
        if (window.innerWidth <= 1024) {
            // Mobile layout
            elements.sidebarLeft?.classList.remove('collapsed');
            elements.sidebarRight?.classList.remove('collapsed');
            if (elements.mainContent) {
                elements.mainContent.style.marginLeft = '';
                elements.mainContent.style.marginRight = '';
            }
        } else {
            // Desktop layout
            if (state.ui.leftSidebarCollapsed) {
                elements.sidebarLeft?.classList.add('collapsed');
            }
            if (state.ui.rightSidebarCollapsed) {
                elements.sidebarRight?.classList.add('collapsed');
            }
        }
    }

    // ===== Analysis History =====
    async function loadAnalysisHistory(clientId) {
        try {
            const response = await fetch(`/api/clients/${clientId}`);
            const data = await response.json();
            
            if (data.success && data.analyses) {
                renderAnalysisHistory(data.analyses);
            }
        } catch (error) {
            console.error('Failed to load analysis history:', error);
        }
    }

    function renderAnalysisHistory(analyses) {
        if (!elements.analysisHistory) return;

        if (elements.analysisCount) {
            elements.analysisCount.textContent = analyses.length;
        }

        if (analyses.length === 0) {
            elements.analysisHistory.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-history"></i>
                    </div>
                    <p>Немає аналізів</p>
                </div>
            `;
            return;
        }

        elements.analysisHistory.innerHTML = analyses.map(analysis => `
            <div class="analysis-history-item" onclick="window.loadAnalysis(${analysis.id})">
                <div class="analysis-date">${formatDate(analysis.created_at)}</div>
                <div class="analysis-preview">${escapeHtml(analysis.text_preview || 'Аналіз')}</div>
                <div class="analysis-stats">
                    <span class="stat-item">${analysis.issues_count || 0} проблем</span>
                    <span class="stat-item">Рівень: ${analysis.complexity_score || '—'}</span>
                </div>
            </div>
        `).join('');
    }

    function formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString('uk-UA', {
            day: 'numeric',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit'
        });
    }

    // ===== Analysis Loading =====
    async function loadAnalysis(analysisId) {
        try {
            const response = await fetch(`/api/analyses/${analysisId}`);
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || 'Помилка завантаження аналізу');
            }
            
            // Set the loaded analysis as current
            state.currentAnalysis = data.analysis;
            state.originalText = data.analysis.original_text || '';
            
            // Clear current text and show the analysis text
            if (elements.negotiationText) {
                elements.negotiationText.value = state.originalText;
                updateTextStats();
            }
            
            // Show results section
            if (elements.resultsSection) {
                elements.resultsSection.style.display = 'block';
            }
            
            // Update displays with loaded analysis
            if (data.analysis.highlights) {
                updateHighlightsDisplay(data.analysis.highlights);
            }
            if (data.analysis.summary) {
                updateSummaryDisplay(data.analysis.summary);
            }
            if (data.analysis.barometer) {
                updateBarometerDisplay(data.analysis.barometer);
            }
            
            // Update analysis steps to show completed
            updateAnalysisSteps('completed');
            
            // Clear workspace if switching analyses
            state.selectedFragments = [];
            updateWorkspaceFragments();
            updateWorkspaceActions();
            
            showNotification(`Аналіз від ${formatDate(data.analysis.created_at)} завантажено`, 'success');
            
        } catch (error) {
            console.error('Load analysis error:', error);
            showNotification(error.message || 'Помилка завантаження аналізу', 'error');
        }
    }

    async function createNewAnalysis() {
        if (!state.currentClient) {
            showNotification('Спочатку оберіть клієнта', 'warning');
            return;
        }
        
        // Clear current analysis state
        state.currentAnalysis = null;
        state.originalText = null;
        state.selectedFragments = [];
        
        // Clear UI
        if (elements.negotiationText) {
            elements.negotiationText.value = '';
            updateTextStats();
        }
        if (elements.resultsSection) {
            elements.resultsSection.style.display = 'none';
        }
        if (elements.highlightsList) {
            elements.highlightsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-search"></i></div>
                    <p>Проблемні моменти з'являться тут після аналізу</p>
                </div>
            `;
        }
        if (elements.fulltextContent) {
            elements.fulltextContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-file-text"></i></div>
                    <p>Повний текст з підсвічуванням з'явиться тут після аналізу</p>
                </div>
            `;
        }
        
        updateWorkspaceFragments();
        updateWorkspaceActions();
        
        showNotification('Новий аналіз створено. Введіть текст для початку.', 'info');
    }

    // ===== Global Functions =====
    window.showClientForm = showClientForm;
    window.selectClient = selectClient;
    window.editClient = (id) => showClientForm(id);
    window.deleteClient = (id) => console.log('Delete client:', id);
    window.addToWorkspace = (id) => console.log('Add to workspace:', id);
    window.shareHighlight = (id) => console.log('Share highlight:', id);
    window.loadAnalysis = loadAnalysis;
    window.createNewAnalysis = createNewAnalysis;

    // ===== Initialization =====
    function init() {
        console.log('🚀 TeamPulse Turbo Neon - Initializing...');
        
        // Load saved UI state
        const savedState = localStorage.getItem('teampulse-ui-state');
        if (savedState) {
            try {
                Object.assign(state.ui, JSON.parse(savedState));
            } catch (e) {
                console.warn('Failed to parse saved UI state');
            }
        }
        
        // Initialize onboarding
        initOnboarding();
        
        // Setup file handling
        setupFileHandling();
        
        // Setup drag & drop workspace
        setupWorkspaceDrop();
        
        // Bind events
        bindEvents();
        
        // Initialize displays
        updateTextStats();
        updateInputMethod('text');
        switchHighlightsView('list');
        
        // Load initial data if onboarding completed
        if (state.onboardingCompleted) {
            loadClients();
            loadTokenUsage();
            
            // Auto-refresh token usage
            setInterval(loadTokenUsage, 30000);
        }
        
        // Handle initial resize
        handleResize();
        
        console.log('✨ TeamPulse Turbo Neon - Ready!');
    }

    // Start when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();