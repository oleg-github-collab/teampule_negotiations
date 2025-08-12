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
            const formData = new FormData();
            const inputs = $$('#client-form input, #client-form select, #client-form textarea');
            
            let hasRequired = false;
            inputs.forEach(input => {
                if (input.value.trim()) {
                    formData.append(input.id, input.value.trim());
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
                body: formData
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка збереження');
            }

            showNotification('Клієнта збережено успішно! 🎉', 'success');
            
            // Reload clients and return to welcome
            await loadClients();
            showSection('welcome-screen');

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

        try {
            // Show results section and update steps
            if (elements.resultsSection) elements.resultsSection.style.display = 'block';
            updateAnalysisSteps('analysis');
            
            // Add loading state
            if (elements.startAnalysisBtn) {
                elements.startAnalysisBtn.classList.add('btn-loading');
                elements.startAnalysisBtn.disabled = true;
            }

            // Start analysis
            const response = await fetch('/api/analyze', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    clientId: state.currentClient.id,
                    text: text
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка аналізу');
            }

            // Update token usage
            await loadTokenUsage();
            
            // Display results
            state.currentAnalysis = data.analysis;
            displayAnalysisResults(data.analysis);
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
            displayHighlights(analysis.highlights);
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
            elements.fulltextContent.innerHTML = `
                <div class="fulltext-container">
                    ${highlightedText || escapeHtml(elements.negotiationText?.value || '')}
                </div>
            `;
        }
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

        // Onboarding
        elements.welcomeHelp?.addEventListener('click', showOnboarding);
        elements.onboardingClose?.addEventListener('click', completeOnboarding);
        elements.skipOnboarding?.addEventListener('click', completeOnboarding);
        elements.nextStep?.addEventListener('click', nextOnboardingStep);
        elements.prevStep?.addEventListener('click', prevOnboardingStep);

        // Input methods
        elements.textMethod?.addEventListener('click', () => updateInputMethod('text'));
        elements.fileMethod?.addEventListener('click', () => updateInputMethod('file'));

        // Text analysis
        elements.negotiationText?.addEventListener('input', debouncedUpdateTextStats);
        elements.startAnalysisBtn?.addEventListener('click', startAnalysis);
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
            const response = await fetch(`/api/clients/${clientId}/analyses`);
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

    // ===== Global Functions =====
    window.showClientForm = showClientForm;
    window.selectClient = selectClient;
    window.editClient = (id) => showClientForm(id);
    window.deleteClient = (id) => console.log('Delete client:', id);
    window.addToWorkspace = (id) => console.log('Add to workspace:', id);
    window.shareHighlight = (id) => console.log('Share highlight:', id);
    window.loadAnalysis = (id) => console.log('Load analysis:', id);

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