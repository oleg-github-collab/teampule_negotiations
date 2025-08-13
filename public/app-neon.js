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
            highlightsView: 'list', // list, text, filter
            filters: {
                showManipulation: true,
                showCognitiveBias: true,
                showRhetoricalFallacy: true,
                minSeverity: 1,
                maxSeverity: 3,
                searchText: ''
            },
            filtersVisible: false
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
        barometerComment: $('#barometer-comment'),
        gaugeCircle: $('#gauge-circle'),
        highlightsList: $('#highlights-list'),
        fulltextContent: $('#fulltext-content'),
        listView: $('#list-view'),
        textView: $('#text-view'),
        filterView: $('#filter-view'),
        filtersPanel: $('#filters-panel'),
        filterManipulation: $('#filter-manipulation'),
        filterCognitiveBias: $('#filter-cognitive-bias'),
        filterRhetoricalFallacy: $('#filter-rhetorical-fallacy'),
        filterMinSeverity: $('#filter-min-severity'),
        filterMaxSeverity: $('#filter-max-severity'),
        filterSearch: $('#filter-search'),
        clearFiltersBtn: $('#clear-filters'),
        applyFiltersBtn: $('#apply-filters'),
        
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
        // Left sidebar is now always visible, only right sidebar can be toggled
        if (side === 'right') {
            const sidebar = elements.sidebarRight;
            state.ui.rightSidebarCollapsed = !state.ui.rightSidebarCollapsed;
            sidebar.classList.toggle('collapsed', state.ui.rightSidebarCollapsed);
            
            // Update main content margin
            if (window.innerWidth > 1024) {
                elements.mainContent.style.marginRight = state.ui.rightSidebarCollapsed ? '0' : 'var(--right-panel-width)';
            }
            
            // Update toggle icon
            const icon = elements.sidebarRightToggle?.querySelector('i');
            if (icon) {
                icon.className = state.ui.rightSidebarCollapsed ? 'fas fa-chevron-left' : 'fas fa-chevron-right';
            }
            
            // Save state
            localStorage.setItem('teampulse-ui-state', JSON.stringify(state.ui));
        }
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
        console.log('🔄 Loading clients...');
        try {
            const response = await fetch('/api/clients');
            console.log('📡 Response status:', response.status);
            
            if (response.status === 401) {
                console.log('❌ Unauthorized, redirecting to login');
                window.location.href = '/login';
                return;
            }
            
            const data = await response.json();
            console.log('📦 Received data:', data);
            
            if (!response.ok || !data.success) {
                throw new Error(data.error || `HTTP Error: ${response.status}`);
            }
            
            state.clients = data.clients || [];
            console.log('✅ Set state.clients:', state.clients.length, 'clients');
            
            // Force immediate UI update
            renderClientsList();
            updateClientCount();
            
            // Validate and fix data integrity
            validateDataIntegrity();
            
            console.log('🎉 Clients loaded successfully');
            
        } catch (error) {
            console.error('Failed to load clients:', error);
            showNotification('Помилка завантаження клієнтів', 'error');
        }
    }

    async function validateDataIntegrity() {
        try {
            // Check if there's a current analysis without a current client
            if (state.currentAnalysis && !state.currentClient) {
                console.log('🔄 Clearing orphaned analysis data');
                state.currentAnalysis = null;
                state.originalText = '';
                state.selectedFragments = [];
                clearAnalysisDisplay();
            }
            
            // Check if current client still exists in clients array
            if (state.currentClient && !state.clients.find(c => c.id === state.currentClient.id)) {
                console.log('🔄 Current client no longer exists, clearing state');
                state.currentClient = null;
                state.currentAnalysis = null;
                state.originalText = '';
                state.selectedFragments = [];
                updateNavClientInfo(null);
                updateWorkspaceClientInfo(null);
                clearAnalysisDisplay();
                showNotification('Поточний клієнт більше не існує', 'warning');
            }
            
            // If we have clients but none is selected, but there's analysis data visible
            if (state.clients.length > 0 && !state.currentClient && elements.resultsSection?.style.display === 'block') {
                console.log('🔄 Clearing analysis display - no client selected');
                clearAnalysisDisplay();
            }
            
        } catch (error) {
            console.error('Error validating data integrity:', error);
        }
    }

    function renderClientsList() {
        console.log('🎨 renderClientsList called');
        console.log('🎨 state.clients.length:', state.clients.length);
        console.log('🎨 Current client:', state.currentClient ? state.currentClient.company : 'none');
        
        if (!elements.clientList) {
            console.warn('❌ Client list element not found');
            return;
        }

        const searchTerm = elements.clientSearch?.value.toLowerCase().trim() || '';
        console.log('🎨 Search term:', searchTerm);
        
        const filtered = state.clients.filter(client => {
            if (!searchTerm) return true;
            return (
                client.company?.toLowerCase().includes(searchTerm) ||
                client.sector?.toLowerCase().includes(searchTerm) ||
                client.negotiator?.toLowerCase().includes(searchTerm)
            );
        });
        
        console.log('🎨 Filtered clients count:', filtered.length);

        if (filtered.length === 0) {
            console.log('🎨 Showing empty state');
            const emptyMessage = searchTerm ? 'Нічого не знайдено' : 'Немає клієнтів';
            const emptyIcon = searchTerm ? 'fas fa-search' : 'fas fa-users';
            elements.clientList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="${emptyIcon}"></i>
                    </div>
                    <p>${emptyMessage}</p>
                    ${!searchTerm ? '<button class="btn-primary" id="empty-new-client-btn">Створити першого клієнта</button>' : ''}
                </div>
            `;
            
            // Add event listener for empty state button
            if (!searchTerm) {
                const emptyNewBtn = document.getElementById('empty-new-client-btn');
                if (emptyNewBtn) {
                    emptyNewBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        console.log('🎯 Empty state new client button clicked');
                        showClientForm();
                    });
                }
            }
            return;
        }

        // Sort clients by name
        filtered.sort((a, b) => (a.company || '').localeCompare(b.company || ''));

        console.log('🎨 Rendering', filtered.length, 'client items');

        // Render client items
        elements.clientList.innerHTML = filtered.map(client => {
            const isActive = state.currentClient?.id === client.id;
            const avatar = (client.company || 'C')[0].toUpperCase();
            const analysisCount = client.analyses_count || 0;
            
            console.log('🎨 Rendering client:', client.company, 'active:', isActive);
            
            return `
                <div class="client-item ${isActive ? 'active' : ''}" 
                     data-client-id="${client.id}">
                    <div class="client-avatar">${avatar}</div>
                    <div class="client-info">
                        <div class="client-name">${escapeHtml(client.company || 'Без назви')}</div>
                        <div class="client-meta">
                            ${client.sector ? escapeHtml(client.sector) + ' • ' : ''}
                            ${analysisCount} аналізів
                        </div>
                    </div>
                    <div class="client-actions">
                        <button class="btn-icon edit-client-btn" data-client-id="${client.id}" title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon delete-client-btn" data-client-id="${client.id}" title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners to all client items
        const clientItems = elements.clientList.querySelectorAll('.client-item');
        clientItems.forEach(item => {
            const clientId = parseInt(item.dataset.clientId);
            
            // Client selection - click on main area (not buttons)
            item.addEventListener('click', (e) => {
                // Only handle clicks that are not on buttons
                if (!e.target.closest('.client-actions')) {
                    console.log('🎯 Client item clicked:', clientId);
                    selectClient(clientId);
                }
            });
            
            // Edit button
            const editBtn = item.querySelector('.edit-client-btn');
            if (editBtn) {
                editBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('✏️ Edit button clicked for client:', clientId);
                    editClient(clientId, e);
                });
            }
            
            // Delete button
            const deleteBtn = item.querySelector('.delete-client-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('🗑️ Delete button clicked for client:', clientId);
                    deleteClient(clientId, e);
                });
            }
        });
        
        console.log('🎨 Client list rendered successfully with event listeners');
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

    async function selectClient(clientId) {
        console.log('🎯 selectClient called with ID:', clientId);
        console.log('🎯 Current state.clients:', state.clients.length, 'clients');
        
        const client = state.clients.find(c => c.id === clientId);
        console.log('🎯 Found client:', client ? client.company : 'NOT FOUND');
        
        if (!client) {
            console.error('❌ Client not found with ID:', clientId);
            showNotification('Клієнт не знайдений', 'error');
            return;
        }
        
        console.log('🎯 Setting current client to:', client.company);
        state.currentClient = client;
        
        // Update UI
        console.log('🎯 Updating UI components...');
        updateNavClientInfo(client);
        updateWorkspaceClientInfo(client);
        renderClientsList(); // Re-render to show active state
        
        // Show analysis dashboard
        console.log('🎯 Showing analysis dashboard...');
        showSection('analysis-dashboard');
        
        showNotification(`Обрано клієнта: ${client.company}`, 'success');
        
        // Load analysis history for this client and try to load the latest analysis
        console.log('🎯 Loading analysis history...');
        await loadAnalysisHistoryAndLatest(clientId);
        
        // Save state
        console.log('🎯 Saving state...');
        scheduleStateSave();
        console.log('🎯 selectClient completed successfully');
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
                    <div class="client-name">${escapeHtml(client.company || 'Без назви')}</div>
                    <div class="client-meta">
                        ${client.sector ? escapeHtml(client.sector) + ' • ' : ''}
                        ${client.analyses_count || 0} аналізів
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
            
            // Force refresh the clients list to ensure it appears
            await loadClients();
            
            // Make sure the client appears in UI
            renderClientsList();
            updateClientCount();
            updateNavClientInfo(state.currentClient);
            updateWorkspaceClientInfo(state.currentClient);
            
            // Show analysis dashboard
            showSection('analysis-dashboard');
            
            // Save state
            scheduleStateSave();

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
                                updateCountersFromHighlights(analysisData.highlights);
                            } else if (data.type === 'merged_highlights') {
                                analysisData.highlights = data.items;
                                updateHighlightsDisplay(analysisData.highlights);
                                updateCountersFromHighlights(analysisData.highlights);
                            } else if (data.type === 'summary') {
                                analysisData.summary = data;
                                updateSummaryDisplay(data);
                            } else if (data.type === 'barometer') {
                                analysisData.barometer = data;
                                updateBarometerDisplay(data);
                            } else if (data.type === 'analysis_saved') {
                                state.currentAnalysis = { id: data.id, ...analysisData };
                                await loadAnalysisHistory(state.currentClient.id);
                                
                                // Calculate and display custom barometer if none was provided
                                if (!analysisData.barometer) {
                                    const customBarometer = calculateComplexityBarometer(state.currentClient, analysisData);
                                    updateBarometerDisplay(customBarometer);
                                }
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
            
            // Save state
            scheduleStateSave();

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
        
        // Apply filters if they exist
        const filteredHighlights = filterHighlights(highlights);
        
        if (filteredHighlights.length === 0) {
            elements.highlightsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-filter"></i></div>
                    <p>Жодних результатів не знайдено за вашими фільтрами</p>
                    <button class="btn-secondary btn-sm" onclick="clearFilters()">Очистити фільтри</button>
                </div>
            `;
            return;
        }
        
        elements.highlightsList.innerHTML = filteredHighlights.map((highlight, filteredIndex) => {
            // Find original index in the full highlights array
            const originalIndex = highlights.findIndex(h => h.id === highlight.id || 
                (h.text === highlight.text && h.category === highlight.category));
            
            return `
            <div class="highlight-item" data-highlight-id="${originalIndex}" draggable="true">
                <div class="highlight-header">
                    <div class="highlight-type ${highlight.category || 'manipulation'}">${highlight.label || 'Проблема'}</div>
                    <div class="highlight-severity">Рівень: ${highlight.severity || 1}</div>
                </div>
                <div class="highlight-text">"${highlight.text}"</div>
                <div class="highlight-explanation">${highlight.explanation || ''}</div>
                <div class="highlight-actions">
                    <button class="btn-icon add-to-workspace-btn" data-highlight-index="${originalIndex}" title="Додати до робочої області">
                        <i class="fas fa-plus"></i>
                    </button>
                </div>
            </div>
        `;
        }).join('');
        
        // Enable drag functionality
        enableHighlightDrag();
        
        // Add event listeners for workspace buttons
        $$('.add-to-workspace-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const index = parseInt(btn.dataset.highlightIndex);
                addToWorkspace(index);
            });
        });
    }

    function updateSummaryDisplay(summary) {
        // Update counts from summary
        const counts = summary.counts_by_category || {};
        
        // Animate counters
        if (elements.manipulationsCount) {
            animateNumber(elements.manipulationsCount, counts.manipulation || 0);
        }
        if (elements.biasesCount) {
            animateNumber(elements.biasesCount, counts.cognitive_bias || 0);
        }
        if (elements.fallaciesCount) {
            animateNumber(elements.fallaciesCount, counts.rhetological_fallacy || 0);
        }
        
        // Calculate total recommendations
        const totalCount = (counts.manipulation || 0) + (counts.cognitive_bias || 0) + (counts.rhetological_fallacy || 0);
        if (elements.recommendationsCount) {
            animateNumber(elements.recommendationsCount, totalCount);
        }
        
        // Show patterns
        if (summary.top_patterns) {
            state.currentPatterns = summary.top_patterns;
        }
    }

    function updateCountersFromHighlights(highlights) {
        if (!highlights || highlights.length === 0) return;
        
        // Count by category
        const counts = highlights.reduce((acc, highlight) => {
            const category = highlight.category || 'manipulation';
            acc[category] = (acc[category] || 0) + 1;
            return acc;
        }, {});
        
        // Update counters
        if (elements.manipulationsCount) {
            animateNumber(elements.manipulationsCount, counts.manipulation || 0);
        }
        if (elements.biasesCount) {
            animateNumber(elements.biasesCount, counts.cognitive_bias || 0);
        }
        if (elements.fallaciesCount) {
            animateNumber(elements.fallaciesCount, counts.rhetological_fallacy || 0);
        }
        
        // Calculate total recommendations
        const totalCount = highlights.length;
        if (elements.recommendationsCount) {
            animateNumber(elements.recommendationsCount, totalCount);
        }
        
        console.log('Updated counters:', counts, 'Total:', totalCount);
    }

    // ===== Enhanced Custom Barometer Logic =====
    function calculateComplexityBarometer(clientData, analysisData) {
        let complexityScore = 0;
        let factors = {
            client_profile: 0,
            manipulation_density: 0,
            manipulation_severity: 0,
            negotiation_type: 0,
            stakes_level: 0,
            communication_complexity: 0,
            risk_factors: 0,
            time_pressure: 0,
            resource_demands: 0
        };
        
        // Factor 1: Client Profile Complexity (0-20 points)
        if (clientData) {
            // Company size impact with more granular scoring
            const sizeMap = { 'startup': 3, 'small': 7, 'medium': 12, 'large': 20 };
            factors.client_profile += sizeMap[clientData.company_size] || 8;
            
            // Sector complexity with refined weights
            const sectorMap = { 
                'IT': 8, 'Finance': 18, 'Healthcare': 12, 'Education': 4,
                'Manufacturing': 10, 'Retail': 6, 'Real Estate': 15, 'Energy': 20,
                'Consulting': 12, 'Other': 8
            };
            factors.client_profile += (sectorMap[clientData.sector] || 8) * 0.4;
            
            // Deal value complexity with more detail
            if (clientData.deal_value) {
                const dealStr = clientData.deal_value.toLowerCase();
                if (dealStr.includes('m') || dealStr.includes('мільйон') || dealStr.includes('млн')) {
                    factors.client_profile += 6;
                } else if (dealStr.includes('k') || dealStr.includes('тисяч') || dealStr.includes('тис')) {
                    factors.client_profile += 2;
                }
                // Look for specific amounts
                const amount = parseFloat(dealStr.replace(/[^0-9.]/g, ''));
                if (amount > 10) factors.client_profile += 3; // Large amounts add complexity
            }
        }
        
        // Factor 2: Manipulation Density (0-25 points)
        if (analysisData && analysisData.highlights) {
            const totalHighlights = analysisData.highlights.length;
            const textLength = state.originalText ? state.originalText.length : 1000;
            const density = (totalHighlights / (textLength / 100)); // highlights per 100 chars
            
            factors.manipulation_density = Math.min(25, density * 3);
            
            // Category distribution analysis
            const categories = analysisData.highlights.reduce((acc, h) => {
                acc[h.category] = (acc[h.category] || 0) + 1;
                return acc;
            }, {});
            
            // More manipulation types = higher complexity
            const categoryCount = Object.keys(categories).length;
            factors.manipulation_density += categoryCount * 2;
        }
        
        // Factor 3: Manipulation Severity Analysis (0-20 points)
        if (analysisData?.highlights) {
            const severities = analysisData.highlights.map(h => h.severity || 1);
            const avgSeverity = severities.reduce((sum, s) => sum + s, 0) / severities.length;
            const maxSeverity = Math.max(...severities);
            const severeCount = severities.filter(s => s >= 3).length;
            
            factors.manipulation_severity = avgSeverity * 3 + maxSeverity * 2 + severeCount * 1.5;
            factors.manipulation_severity = Math.min(20, factors.manipulation_severity);
        }
        
        // Factor 4: Negotiation Type Complexity (0-15 points) 
        if (clientData?.negotiation_type) {
            const typeMap = {
                'sales': 5, 'partnership': 9, 'contract': 7, 'investment': 13,
                'acquisition': 15, 'licensing': 11, 'other': 7
            };
            factors.negotiation_type = typeMap[clientData.negotiation_type] || 7;
        }
        
        // Factor 5: Stakes Level Analysis (0-15 points)
        if (clientData?.goals || clientData?.user_goals) {
            const goalsText = (clientData.goals || clientData.user_goals || '').toLowerCase();
            
            // High-stakes keywords
            const criticalWords = ['критично', 'важливо', 'стратегічно', 'ключово', 'пріоритет'];
            const urgentWords = ['терміново', 'швидко', 'негайно', 'асап', 'дедлайн'];
            const riskWords = ['ризик', 'загроза', 'втрати', 'конкуренти', 'криза'];
            
            factors.stakes_level += criticalWords.filter(word => goalsText.includes(word)).length * 3;
            factors.stakes_level += urgentWords.filter(word => goalsText.includes(word)).length * 2;
            factors.stakes_level += riskWords.filter(word => goalsText.includes(word)).length * 2;
            factors.stakes_level += Math.min(4, goalsText.length / 100); // Length indicates detail/complexity
        }
        
        // Factor 6: Communication Complexity (0-12 points)
        if (analysisData?.highlights) {
            const categories = analysisData.highlights.reduce((acc, h) => {
                acc[h.category] = (acc[h.category] || 0) + 1;
                return acc;
            }, {});
            
            factors.communication_complexity = Object.keys(categories).length * 2;
            
            // Check for complex manipulation patterns
            const manipulationCount = categories.manipulation || 0;
            const biasCount = categories.cognitive_bias || 0;
            const fallacyCount = categories.rhetological_fallacy || 0;
            
            if (manipulationCount > 5) factors.communication_complexity += 2;
            if (biasCount > 3) factors.communication_complexity += 2;
            if (fallacyCount > 3) factors.communication_complexity += 2;
            
            factors.communication_complexity = Math.min(12, factors.communication_complexity);
        }
        
        // Factor 7: Risk Factors (0-10 points)
        if (clientData) {
            // Large companies = more bureaucracy and complexity
            if (clientData.company_size === 'large') factors.risk_factors += 3;
            
            // High-risk sectors
            const riskySectors = ['Finance', 'Energy', 'Real Estate'];
            if (riskySectors.includes(clientData.sector)) factors.risk_factors += 3;
            
            // Complex deal types
            const complexDeals = ['acquisition', 'investment', 'partnership'];
            if (complexDeals.includes(clientData.negotiation_type)) factors.risk_factors += 2;
            
            // Multiple stakeholders indicator
            if (clientData.goals && clientData.goals.length > 200) factors.risk_factors += 2;
        }
        
        // Factor 8: Time Pressure (0-8 points)
        if (state.originalText) {
            const text = state.originalText.toLowerCase();
            const timeWords = ['терміново', 'швидко', 'негайно', 'дедлайн', 'часу мало', 'пізно'];
            factors.time_pressure = timeWords.filter(word => text.includes(word)).length * 1.5;
            factors.time_pressure = Math.min(8, factors.time_pressure);
        }
        
        // Factor 9: Resource Demands (0-10 points)
        if (clientData) {
            // Large deal values require more resources
            if (clientData.deal_value) {
                const dealStr = clientData.deal_value.toLowerCase();
                if (dealStr.includes('m') || dealStr.includes('мільйон')) factors.resource_demands += 4;
                else if (dealStr.includes('k') || dealStr.includes('тисяч')) factors.resource_demands += 2;
            }
            
            // Complex sectors require specialized knowledge
            const resourceIntensiveSectors = ['Finance', 'Healthcare', 'Energy', 'Real Estate'];
            if (resourceIntensiveSectors.includes(clientData.sector)) factors.resource_demands += 3;
            
            // Complex negotiation types
            if (['acquisition', 'investment'].includes(clientData.negotiation_type)) factors.resource_demands += 3;
        }
        
        // Calculate total complexity score
        complexityScore = Object.values(factors).reduce((sum, val) => sum + val, 0);
        
        // Enhanced complexity labels and scoring
        let label, normalizedScore, description;
        if (complexityScore <= 20) {
            label = 'Easy Mode';
            normalizedScore = Math.min(20, complexityScore);
            description = 'Прості переговори з мінімальними ризиками';
        } else if (complexityScore <= 40) {
            label = 'Clear Client';
            normalizedScore = 20 + Math.min(20, (complexityScore - 20) * 1.0);
            description = 'Стандартні переговори з прозорими умовами';
        } else if (complexityScore <= 65) {
            label = 'Medium';
            normalizedScore = 40 + Math.min(25, (complexityScore - 40) * 1.0);
            description = 'Помірно складні переговори, потрібна обережність';
        } else if (complexityScore <= 90) {
            label = 'High Stakes';
            normalizedScore = 65 + Math.min(20, (complexityScore - 65) * 0.8);
            description = 'Високоризикові переговори з серйозними викликами';
        } else if (complexityScore <= 110) {
            label = 'Bloody Hell';
            normalizedScore = 85 + Math.min(10, (complexityScore - 90) * 0.5);
            description = 'Надскладні переговори з множинними загрозами';
        } else {
            label = 'Mission Impossible';
            normalizedScore = 95 + Math.min(5, (complexityScore - 110) * 0.1);
            description = 'Екстремально складні переговори, максимальна готовність';
        }
        
        return {
            score: Math.round(normalizedScore),
            label,
            description,
            factors,
            rawScore: complexityScore,
            recommendations: generateComplexityRecommendations(label, factors)
        };
    }
    
    function generateComplexityRecommendations(label, factors) {
        const recommendations = [];
        
        if (factors.manipulation_density > 15) {
            recommendations.push('Високий рівень маніпуляцій - готуйте контраргументи');
        }
        if (factors.manipulation_severity > 12) {
            recommendations.push('Агресивні техніки впливу - розгляньте залучення юристів');
        }
        if (factors.stakes_level > 10) {
            recommendations.push('Високі ставки - детальна підготовка критично важлива');
        }
        if (factors.time_pressure > 5) {
            recommendations.push('Тиск часу - не поспішайте з рішеннями');
        }
        if (factors.communication_complexity > 8) {
            recommendations.push('Складна комунікація - документуйте всі домовленості');
        }
        
        return recommendations;
    }

    function getHumorousBarometerComment(score, label, clientName) {
        const comments = {
            'Very Low': [
                `${clientName || 'Цей клієнт'} як теплий літній вечір - все спокійно та передбачувано ☕`,
                'Схоже на зустріч з найкращим другом. Насолоджуйтесь процесом! 😊',
                'Легше буває хіба що у спа-салоні. Берите блокнот для записів! 📝'
            ],
            'Low': [
                `З ${clientName || 'цим клієнтом'} буде приємно працювати. Майже як відпустка! 🏖️`,
                'Рівень стресу: як вибрати що подивитись на Netflix. Relaxed! 🎬',
                'Це той випадок, коли переговори можуть закінчитись дружбою! 🤝'
            ],
            'Medium': [
                `${clientName || 'Цей клієнт'} тримає вас у тонусі, але без фанатизму ⚡`,
                'Як квест середньої складності - цікаво, але не смертельно! 🎮',
                'Потрібна концентрація, але кава ще не обов\'язкова ☕'
            ],
            'High': [
                `${clientName || 'Цей клієнт'} витисне з вас всі соки, але воно того варте! 💪`,
                'Рівень босу в Dark Souls. Приготуйте валер\'янку! 😅',
                'Після таких переговорів можна писати мемуари "Як я вижив" 📚'
            ],
            'Very High': [
                `${clientName || 'Цей клієнт'} - це переговорна версія екстремального спорту! 🎢`,
                'Підтримайте родичів - може знадобиться моральна підтримка 😱',
                'Якщо переживете це, вам точно підвищать зарплату! 💰',
                'Легенди складають про таких клієнтів. Ви увійдете в історію! 🏆'
            ]
        };
        
        const levelComments = comments[label] || comments['Medium'];
        return levelComments[Math.floor(Math.random() * levelComments.length)];
    }

    function updateBarometerDisplay(barometer) {
        // Use custom barometer if none provided by AI
        if (!barometer || typeof barometer.score === 'undefined') {
            barometer = calculateComplexityBarometer(state.currentClient, state.currentAnalysis);
        }
        
        const score = Math.round(barometer.score);
        const label = barometer.label || 'Medium';
        
        console.log('Updating barometer:', score, label, barometer);
        
        // Update barometer display with animation
        if (elements.barometerScore) {
            animateNumber(elements.barometerScore, score);
        }
        if (elements.barometerLabel) {
            elements.barometerLabel.textContent = label;
        }
        
        // Add humorous comment
        if (elements.barometerComment) {
            const clientName = state.currentClient?.company;
            const comment = getHumorousBarometerComment(score, label, clientName);
            elements.barometerComment.textContent = comment;
        }
        
        // Update gauge with smooth animation
        const gaugeCircle = $('#gauge-circle');
        if (gaugeCircle) {
            const circumference = 2 * Math.PI * 45; // radius = 45
            const progress = (score / 100) * circumference;
            
            // Animate the gauge
            let currentProgress = 0;
            const duration = 1500;
            const startTime = Date.now();
            
            function animateGauge() {
                const elapsed = Date.now() - startTime;
                const progressRatio = Math.min(elapsed / duration, 1);
                currentProgress = progress * progressRatio;
                
                gaugeCircle.style.strokeDasharray = `${currentProgress} ${circumference}`;
                
                // Color based on score
                if (score <= 20) {
                    gaugeCircle.style.stroke = 'var(--neon-green)';
                } else if (score <= 40) {
                    gaugeCircle.style.stroke = 'var(--neon-cyan)';
                } else if (score <= 60) {
                    gaugeCircle.style.stroke = 'var(--neon-yellow)';
                } else if (score <= 80) {
                    gaugeCircle.style.stroke = 'var(--neon-purple)';
                } else {
                    gaugeCircle.style.stroke = 'var(--neon-pink)';
                }
                
                if (progressRatio < 1) {
                    requestAnimationFrame(animateGauge);
                }
            }
            
            animateGauge();
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

    function toggleFilters() {
        state.ui.filtersVisible = !state.ui.filtersVisible;
        
        // Update button state
        elements.filterView?.classList.toggle('active', state.ui.filtersVisible);
        
        // Show/hide filters panel
        if (elements.filtersPanel) {
            elements.filtersPanel.style.display = state.ui.filtersVisible ? 'block' : 'none';
        }
        
        // Hide other views when filters are shown
        if (state.ui.filtersVisible) {
            if (elements.highlightsList) elements.highlightsList.style.display = 'none';
            if (elements.fulltextContent) elements.fulltextContent.style.display = 'none';
        } else {
            // Restore previous view
            switchHighlightsView(state.ui.highlightsView || 'list');
        }
    }

    function applyFilters() {
        // Get filter values
        state.ui.filters.showManipulation = elements.filterManipulation?.checked ?? true;
        state.ui.filters.showCognitiveBias = elements.filterCognitiveBias?.checked ?? true;
        state.ui.filters.showRhetoricalFallacy = elements.filterRhetoricalFallacy?.checked ?? true;
        state.ui.filters.minSeverity = parseInt(elements.filterMinSeverity?.value || '1');
        state.ui.filters.maxSeverity = parseInt(elements.filterMaxSeverity?.value || '3');
        state.ui.filters.searchText = elements.filterSearch?.value.toLowerCase() || '';
        
        // Apply filters to current highlights
        if (state.currentAnalysis?.highlights) {
            updateHighlightsDisplay(state.currentAnalysis.highlights);
        }
        
        // Close filters panel
        toggleFilters();
        
        showNotification('Фільтри застосовано', 'success');
    }

    function clearFilters() {
        // Reset filter values
        state.ui.filters = {
            showManipulation: true,
            showCognitiveBias: true,
            showRhetoricalFallacy: true,
            minSeverity: 1,
            maxSeverity: 3,
            searchText: ''
        };
        
        // Update UI
        if (elements.filterManipulation) elements.filterManipulation.checked = true;
        if (elements.filterCognitiveBias) elements.filterCognitiveBias.checked = true;
        if (elements.filterRhetoricalFallacy) elements.filterRhetoricalFallacy.checked = true;
        if (elements.filterMinSeverity) elements.filterMinSeverity.value = '1';
        if (elements.filterMaxSeverity) elements.filterMaxSeverity.value = '3';
        if (elements.filterSearch) elements.filterSearch.value = '';
        
        // Reapply filters
        applyFilters();
    }

    function filterHighlights(highlights) {
        if (!highlights || highlights.length === 0) return highlights;
        
        return highlights.filter(highlight => {
            // Category filter
            const category = highlight.category || 'manipulation';
            if (category === 'manipulation' && !state.ui.filters.showManipulation) return false;
            if (category === 'cognitive_bias' && !state.ui.filters.showCognitiveBias) return false;
            if ((category === 'rhetological_fallacy' || category === 'rhetorical_fallacy') && !state.ui.filters.showRhetoricalFallacy) return false;
            
            // Severity filter
            const severity = highlight.severity || 1;
            if (severity < state.ui.filters.minSeverity || severity > state.ui.filters.maxSeverity) return false;
            
            // Text search filter
            if (state.ui.filters.searchText) {
                const searchText = state.ui.filters.searchText;
                const text = (highlight.text || '').toLowerCase();
                const label = (highlight.label || '').toLowerCase();
                const explanation = (highlight.explanation || '').toLowerCase();
                
                if (!text.includes(searchText) && !label.includes(searchText) && !explanation.includes(searchText)) {
                    return false;
                }
            }
            
            return true;
        });
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
        
        // Save state
        scheduleStateSave();
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
                    items: state.selectedFragments,
                    profile: state.currentClient
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка отримання порад');
            }

            // Save the advice for future reference
            const advice = data.advice || data;
            saveAdviceToHistory(advice);
            
            // Show advice in a modal or notification
            showAdviceModal(advice);
            await loadTokenUsage();

        } catch (error) {
            console.error('Advice error:', error);
            showNotification(error.message || 'Помилка при отриманні порад', 'error');
        } finally {
            elements.getAdviceBtn.classList.remove('btn-loading');
            elements.getAdviceBtn.disabled = state.selectedFragments.length === 0;
        }
    }

    function saveAdviceToHistory(advice) {
        try {
            if (!state.currentClient) return;
            
            const adviceRecord = {
                id: Date.now(),
                timestamp: new Date().toISOString(),
                clientId: state.currentClient.id,
                fragments: [...state.selectedFragments],
                advice: advice,
                created: formatDate(new Date())
            };
            
            // Get existing advice history
            const historyKey = 'teampulse-advice-history';
            let history = [];
            try {
                const saved = localStorage.getItem(historyKey);
                if (saved) history = JSON.parse(saved);
            } catch (e) {
                console.warn('Failed to parse advice history');
            }
            
            // Add new advice to beginning of history
            history.unshift(adviceRecord);
            
            // Keep only last 50 recommendations
            if (history.length > 50) {
                history = history.slice(0, 50);
            }
            
            // Save updated history
            localStorage.setItem(historyKey, JSON.stringify(history));
            console.log('Saved advice to history:', adviceRecord);
            
        } catch (error) {
            console.error('Failed to save advice to history:', error);
        }
    }

    function showAdviceModal(advice) {
        console.log('Showing advice modal with:', advice);
        
        // Handle different response formats
        let content = '';
        if (typeof advice === 'string') {
            content = `<div class="advice-text">${advice}</div>`;
        } else if (advice && typeof advice === 'object') {
            content = `
                ${advice.recommended_replies ? `
                    <div class="advice-section">
                        <h4><i class="fas fa-comments"></i><span>Рекомендовані відповіді:</span></h4>
                        <ul class="advice-list">
                            ${advice.recommended_replies.map(reply => `<li>${escapeHtml(reply)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${advice.risks ? `
                    <div class="advice-section">
                        <h4><i class="fas fa-exclamation-triangle"></i><span>Виявлені ризики:</span></h4>
                        <ul class="advice-list risks">
                            ${advice.risks.map(risk => `<li>${escapeHtml(risk)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
                
                ${advice.notes ? `
                    <div class="advice-section">
                        <h4><i class="fas fa-clipboard-list"></i><span>Додаткові поради:</span></h4>
                        <div class="advice-notes">${escapeHtml(advice.notes)}</div>
                    </div>
                ` : ''}
            `;
        } else {
            content = '<div class="advice-text">Помилка отримання порад</div>';
        }
        
        // Create and show advice modal
        const modal = document.createElement('div');
        modal.className = 'advice-modal';
        modal.innerHTML = `
            <div class="advice-content">
                <div class="advice-header">
                    <h3><i class="fas fa-lightbulb"></i> Персоналізовані поради</h3>
                    <button class="btn-icon close-advice">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="advice-body">
                    ${content}
                </div>
                <div class="advice-actions">
                    <button class="btn-secondary close-advice-btn">Закрити</button>
                    <button class="btn-ghost view-history-btn">
                        <i class="fas fa-history"></i> Попередні поради
                    </button>
                    <button class="btn-primary copy-advice-btn">
                        <i class="fas fa-copy"></i> Копіювати
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners for close buttons
        modal.querySelector('.close-advice').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.close-advice-btn').addEventListener('click', () => {
            modal.remove();
        });
        
        // Add event listener for history button
        modal.querySelector('.view-history-btn').addEventListener('click', () => {
            modal.remove();
            showAdviceHistory();
        });
        
        // Add event listener for copy button
        modal.querySelector('.copy-advice-btn').addEventListener('click', () => {
            copyAdviceToClipboard(JSON.stringify(advice));
        });
        
        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                modal.remove();
            }
        });
        
        showNotification('Поради згенеровано успішно! 💡', 'success');
    }

    function showAdviceHistory() {
        try {
            const historyKey = 'teampulse-advice-history';
            const saved = localStorage.getItem(historyKey);
            const history = saved ? JSON.parse(saved) : [];
            
            // Filter by current client if one is selected
            const filteredHistory = state.currentClient 
                ? history.filter(record => record.clientId === state.currentClient.id)
                : history;
                
            if (filteredHistory.length === 0) {
                showNotification('Немає збережених порад для цього клієнта', 'info');
                return;
            }
            
            const modal = document.createElement('div');
            modal.className = 'advice-modal';
            modal.innerHTML = `
                <div class="advice-content" style="max-width: 800px;">
                    <div class="advice-header">
                        <h3><i class="fas fa-history"></i> Історія порад${state.currentClient ? ` для ${state.currentClient.company}` : ''}</h3>
                        <button class="btn-icon close-history">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="advice-body" style="max-height: 500px; overflow-y: auto;">
                        ${filteredHistory.map(record => `
                            <div class="advice-history-item" style="margin-bottom: 20px; padding: 15px; border: 1px solid rgba(168, 85, 247, 0.2); border-radius: 8px;">
                                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                    <span style="font-size: 0.9em; color: rgba(255, 255, 255, 0.7);">${record.created}</span>
                                    <button class="btn-icon copy-history-advice" data-advice='${JSON.stringify(record.advice)}' title="Копіювати">
                                        <i class="fas fa-copy"></i>
                                    </button>
                                </div>
                                <div class="advice-content-preview">
                                    ${typeof record.advice === 'string' 
                                        ? `<div class="advice-text">${escapeHtml(record.advice)}</div>` 
                                        : formatAdviceContent(record.advice)
                                    }
                                </div>
                                ${record.fragments && record.fragments.length > 0 ? `
                                    <div style="margin-top: 10px; font-size: 0.85em; color: rgba(255, 255, 255, 0.6);">
                                        Базувалося на ${record.fragments.length} обраних фрагментах
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                    <div class="advice-actions">
                        <button class="btn-secondary close-history-btn">Закрити</button>
                        <button class="btn-ghost clear-history-btn">
                            <i class="fas fa-trash"></i> Очистити історію
                        </button>
                    </div>
                </div>
            `;
            
            document.body.appendChild(modal);
            
            // Event listeners
            modal.querySelector('.close-history').addEventListener('click', () => modal.remove());
            modal.querySelector('.close-history-btn').addEventListener('click', () => modal.remove());
            modal.querySelector('.clear-history-btn').addEventListener('click', () => {
                if (confirm('Ви впевнені, що хочете видалити всю історію порад?')) {
                    localStorage.removeItem(historyKey);
                    modal.remove();
                    showNotification('Історію порад очищено', 'success');
                }
            });
            
            // Copy buttons
            modal.querySelectorAll('.copy-history-advice').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const advice = e.target.closest('.copy-history-advice').getAttribute('data-advice');
                    copyAdviceToClipboard(advice);
                });
            });
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) modal.remove();
            });
            
        } catch (error) {
            console.error('Failed to show advice history:', error);
            showNotification('Помилка завантаження історії порад', 'error');
        }
    }

    function formatAdviceContent(advice) {
        if (!advice || typeof advice !== 'object') return '';
        
        let content = '';
        if (advice.recommended_replies && advice.recommended_replies.length > 0) {
            content += `
                <div class="advice-section">
                    <h5><i class="fas fa-comments"></i> Рекомендовані відповіді:</h5>
                    <ul class="advice-list">
                        ${advice.recommended_replies.map(reply => `<li>${escapeHtml(reply)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (advice.strategies && advice.strategies.length > 0) {
            content += `
                <div class="advice-section">
                    <h5><i class="fas fa-chess"></i> Стратегії:</h5>
                    <ul class="advice-list">
                        ${advice.strategies.map(strategy => `<li>${escapeHtml(strategy)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        if (advice.warnings && advice.warnings.length > 0) {
            content += `
                <div class="advice-section">
                    <h5><i class="fas fa-exclamation-triangle"></i> Попередження:</h5>
                    <ul class="advice-list">
                        ${advice.warnings.map(warning => `<li>${escapeHtml(warning)}</li>`).join('')}
                    </ul>
                </div>
            `;
        }
        
        return content || '<div class="advice-text">Немає структурованих порад</div>';
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
        // Sidebar toggles (only right sidebar can be toggled now)
        elements.sidebarRightToggle?.addEventListener('click', () => toggleSidebar('right'));
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
        $('#logout-btn')?.addEventListener('click', () => {
            if (confirm('Ви впевнені, що хочете вийти із системи?')) {
                // Clear authentication cookie and redirect to login
                document.cookie = 'auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
                localStorage.removeItem('teampulse-app-state');
                localStorage.removeItem('teampulse-ui-state');
                window.location.href = '/';
            }
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
        elements.filterView?.addEventListener('click', () => toggleFilters());

        // Filter controls
        elements.clearFiltersBtn?.addEventListener('click', clearFilters);
        elements.applyFiltersBtn?.addEventListener('click', applyFilters);

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

    async function loadAnalysisHistoryAndLatest(clientId) {
        try {
            const response = await fetch(`/api/clients/${clientId}`);
            const data = await response.json();
            
            if (data.success && data.analyses) {
                renderAnalysisHistory(data.analyses);
                
                // If there are analyses, automatically load the latest one
                if (data.analyses.length > 0) {
                    const latestAnalysis = data.analyses[0]; // Analyses should be sorted by date descending
                    await loadAnalysis(latestAnalysis.id);
                } else {
                    // No analyses for this client - show clean dashboard state
                    clearAnalysisDisplay();
                    showNotification(`Клієнт ${state.currentClient.company} обраний. Додайте текст для аналізу.`, 'info');
                }
            }
        } catch (error) {
            console.error('Failed to load analysis history and latest:', error);
        }
    }

    function clearAnalysisDisplay() {
        // Clear current analysis state
        state.currentAnalysis = null;
        state.originalText = '';
        state.selectedFragments = [];
        
        // Clear text input
        if (elements.negotiationText) {
            elements.negotiationText.value = '';
            updateTextStats();
        }
        
        // Hide results section
        if (elements.resultsSection) {
            elements.resultsSection.style.display = 'none';
        }
        
        // Clear highlights
        if (elements.highlightsList) {
            elements.highlightsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-search"></i>
                    </div>
                    <p>Проблемні моменти з'являться тут після аналізу</p>
                </div>
            `;
        }
        
        // Reset counters
        const counters = ['manipulations-count', 'biases-count', 'fallacies-count', 'recommendations-count'];
        counters.forEach(counterId => {
            const element = $(`#${counterId}`);
            if (element) element.textContent = '0';
        });
        
        // Reset barometer
        if (elements.barometerScore) elements.barometerScore.textContent = '—';
        if (elements.barometerLabel) elements.barometerLabel.textContent = 'Очікування аналізу...';
        if (elements.barometerComment) elements.barometerComment.textContent = '';
        
        // Update workspace
        updateWorkspaceFragments();
        updateWorkspaceActions();
        
        // Reset analysis steps
        updateAnalysisSteps('input');
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

        elements.analysisHistory.innerHTML = analyses.map((analysis, index) => {
            const isLatest = index === 0;
            const date = new Date(analysis.created_at);
            const timeAgo = getTimeAgo(date);
            const issuesCount = analysis.issues_count || 0;
            const complexityScore = analysis.complexity_score || 0;
            
            return `
                <div class="analysis-history-item ${isLatest ? 'latest' : ''}" 
                     onclick="window.loadAnalysis(${analysis.id})"
                     title="Натисніть для перегляду аналізу">
                    <div class="analysis-header">
                        <div class="analysis-date">
                            ${isLatest ? '<i class="fas fa-star" title="Останній"></i> ' : ''}
                            ${timeAgo}
                        </div>
                        <div class="analysis-actions">
                            <button class="btn-micro" onclick="event.stopPropagation(); confirmDeleteAnalysis(${analysis.id})" title="Видалити аналіз">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    </div>
                    <div class="analysis-preview">${escapeHtml(analysis.text_preview || 'Аналіз переговорів')}</div>
                    <div class="analysis-stats">
                        <span class="stat-item ${issuesCount > 0 ? 'has-issues' : ''}">
                            <i class="fas fa-exclamation-triangle"></i>
                            ${issuesCount} проблем
                        </span>
                        <span class="stat-item complexity-${getComplexityLevel(complexityScore)}">
                            <i class="fas fa-tachometer-alt"></i>
                            ${complexityScore}/100
                        </span>
                    </div>
                </div>
            `;
        }).join('');
    }

    function getTimeAgo(date) {
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Щойно';
        if (diffInMinutes < 60) return `${diffInMinutes} хв тому`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} год тому`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 7) return `${diffInDays} дн тому`;
        
        return formatDate(date);
    }

    function getComplexityLevel(score) {
        if (score >= 80) return 'high';
        if (score >= 50) return 'medium';
        return 'low';
    }

    async function confirmDeleteAnalysis(analysisId) {
        try {
            if (!confirm('Видалити цей аналіз? Цю дію неможливо скасувати.')) {
                return;
            }

            const response = await fetch(`/api/analyses/${analysisId}`, {
                method: 'DELETE'
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Помилка видалення аналізу');
            }

            // If deleted analysis was current, clear it
            if (state.currentAnalysis?.id === analysisId) {
                clearAnalysisDisplay();
            }

            // Reload analysis history for current client
            if (state.currentClient) {
                await loadAnalysisHistoryAndLatest(state.currentClient.id);
            }

            showNotification('Аналіз видалено успішно', 'success');

        } catch (error) {
            console.error('Delete analysis error:', error);
            showNotification(error.message || 'Помилка при видаленні аналізу', 'error');
        }
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

    async function editClient(clientId, event) {
        console.log('✏️ editClient called with ID:', clientId);
        console.log('✏️ Event object:', event);
        
        // Stop event propagation to prevent client selection
        if (event) {
            event.stopPropagation();
        }
        
        try {
            const client = state.clients.find(c => c.id === clientId);
            console.log('✏️ Found client for editing:', client ? client.company : 'NOT FOUND');
            
            if (!client) {
                console.error('❌ Client not found for editing with ID:', clientId);
                showNotification('Клієнт не знайдений', 'error');
                return;
            }
            
            console.log('✏️ Opening client form for editing...');
            showClientForm(clientId);
        } catch (error) {
            console.error('❌ Edit client error:', error);
            showNotification('Помилка при редагуванні клієнта', 'error');
        }
    }

    function showDeleteClientModal(clientId) {
        console.log('🗑️ showDeleteClientModal called with ID:', clientId);
        
        const client = state.clients.find(c => c.id === clientId);
        if (!client) {
            console.error('❌ Client not found for deletion with ID:', clientId);
            showNotification('Клієнт не знайдений', 'error');
            return;
        }

        // Create delete confirmation modal
        const modal = document.createElement('div');
        modal.className = 'advice-modal'; // Reuse existing modal styles
        modal.innerHTML = `
            <div class="advice-content" style="max-width: 500px;">
                <div class="advice-header">
                    <h3><i class="fas fa-exclamation-triangle" style="color: var(--neon-pink);"></i> Підтвердження видалення</h3>
                    <button class="close-advice" aria-label="Закрити">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="advice-body">
                    <p><strong>Ви дійсно хочете видалити клієнта?</strong></p>
                    <div class="client-info-preview">
                        <div class="client-avatar">${(client.company || 'C')[0].toUpperCase()}</div>
                        <div>
                            <div class="client-name"><strong>${client.company || 'Без назви'}</strong></div>
                            <div class="client-meta">${client.sector || 'Без сектору'}</div>
                        </div>
                    </div>
                    <p style="color: var(--neon-pink); margin-top: 1rem;">
                        <i class="fas fa-warning"></i> 
                        <strong>Увага:</strong> Всі аналізи цього клієнта також будуть видалені. Цю дію неможливо скасувати.
                    </p>
                </div>
                <div class="advice-actions">
                    <button class="btn-secondary cancel-delete-btn">
                        <i class="fas fa-times"></i> Скасувати
                    </button>
                    <button class="btn-danger confirm-delete-btn" data-client-id="${clientId}">
                        <i class="fas fa-trash"></i> Видалити клієнта
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('.close-advice').addEventListener('click', () => modal.remove());
        modal.querySelector('.cancel-delete-btn').addEventListener('click', () => modal.remove());
        modal.querySelector('.confirm-delete-btn').addEventListener('click', () => {
            modal.remove();
            performDeleteClient(clientId);
        });

        // Close when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }

    async function deleteClient(clientId, event) {
        console.log('🗑️ deleteClient called with ID:', clientId);
        
        // Stop event propagation to prevent client selection
        if (event) {
            event.stopPropagation();
        }
        
        // Show confirmation modal instead of browser confirm
        showDeleteClientModal(clientId);
    }

    async function performDeleteClient(clientId) {
        console.log('🗑️ performDeleteClient called with ID:', clientId);
        try {
            const client = state.clients.find(c => c.id === clientId);
            console.log('🗑️ Found client for deletion:', client ? client.company : 'NOT FOUND');

            console.log('🗑️ Sending delete request...');
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE'
            });

            const data = await response.json();
            console.log('🗑️ Delete response:', data);

            if (!response.ok) {
                throw new Error(data.error || 'Помилка видалення клієнта');
            }

            // Update state
            state.clients = state.clients.filter(c => c.id !== clientId);
            
            // If deleted client was current, clear selection
            if (state.currentClient?.id === clientId) {
                state.currentClient = null;
                state.currentAnalysis = null;
                state.selectedFragments = [];
                updateNavClientInfo(null);
                updateWorkspaceClientInfo(null);
                updateWorkspaceFragments();
                showSection('welcome-screen');
            }

            // Re-render clients list
            renderClientsList();
            updateClientCount();

            showNotification(`Клієнт "${client.company}" видалено успішно`, 'success');

        } catch (error) {
            console.error('Delete client error:', error);
            showNotification(error.message || 'Помилка при видаленні клієнта', 'error');
        }
    }

    // ===== Global Functions =====
    window.showClientForm = showClientForm;
    window.selectClient = selectClient;
    window.editClient = editClient;
    window.deleteClient = deleteClient;
    window.addToWorkspace = addToWorkspace;
    window.removeFromWorkspace = removeFromWorkspace;
    window.shareHighlight = (id) => console.log('Share highlight:', id);
    window.loadAnalysis = loadAnalysis;
    window.createNewAnalysis = createNewAnalysis;
    window.clearFilters = clearFilters;
    window.confirmDeleteAnalysis = confirmDeleteAnalysis;
    
    // ===== Debug Testing Functions =====
    window.testClientFunctions = function() {
        console.log('🧪 Testing client functions availability:');
        console.log('🧪 selectClient:', typeof window.selectClient);
        console.log('🧪 editClient:', typeof window.editClient);
        console.log('🧪 deleteClient:', typeof window.deleteClient);
        console.log('🧪 Current clients:', state.clients.length);
        if (state.clients.length > 0) {
            console.log('🧪 Testing selectClient with first client...');
            window.selectClient(state.clients[0].id);
        }
    };
    
    window.testEditClient = function(clientId) {
        console.log('🧪 Testing editClient with ID:', clientId);
        window.editClient(clientId || (state.clients[0] && state.clients[0].id));
    };
    
    window.testDeleteClient = function(clientId) {
        console.log('🧪 Testing deleteClient with ID:', clientId);
        window.deleteClient(clientId || (state.clients[0] && state.clients[0].id));
    };

    // ===== State Persistence =====
    function saveAppState() {
        const appState = {
            currentClient: state.currentClient,
            currentAnalysis: state.currentAnalysis,
            selectedFragments: state.selectedFragments,
            originalText: state.originalText,
            ui: state.ui,
            timestamp: new Date().toISOString()
        };
        
        try {
            localStorage.setItem('teampulse-app-state', JSON.stringify(appState));
        } catch (e) {
            console.warn('Failed to save app state:', e);
        }
    }

    function loadAppState() {
        try {
            const savedState = localStorage.getItem('teampulse-app-state');
            if (!savedState) return false;
            
            const appState = JSON.parse(savedState);
            
            // Check if state is not too old (max 24 hours)
            const savedTime = new Date(appState.timestamp);
            const now = new Date();
            const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
            
            if (hoursDiff > 24) {
                localStorage.removeItem('teampulse-app-state');
                return false;
            }
            
            // Restore state
            if (appState.currentClient) {
                state.currentClient = appState.currentClient;
                updateNavClientInfo(state.currentClient);
                updateWorkspaceClientInfo(state.currentClient);
            }
            
            if (appState.currentAnalysis) {
                state.currentAnalysis = appState.currentAnalysis;
                state.originalText = appState.originalText;
                
                // Restore analysis UI
                if (elements.negotiationText) {
                    elements.negotiationText.value = state.originalText || '';
                    updateTextStats();
                }
                
                if (elements.resultsSection) {
                    elements.resultsSection.style.display = 'block';
                }
                
                // Restore displays
                if (state.currentAnalysis.highlights) {
                    updateHighlightsDisplay(state.currentAnalysis.highlights);
                }
                if (state.currentAnalysis.summary) {
                    updateSummaryDisplay(state.currentAnalysis.summary);
                }
                if (state.currentAnalysis.barometer) {
                    updateBarometerDisplay(state.currentAnalysis.barometer);
                }
                
                updateAnalysisSteps('completed');
                showSection('analysis-dashboard');
            }
            
            if (appState.selectedFragments) {
                state.selectedFragments = appState.selectedFragments;
                updateWorkspaceFragments();
                updateWorkspaceActions();
            }
            
            if (appState.ui) {
                Object.assign(state.ui, appState.ui);
            }
            
            return true;
        } catch (e) {
            console.warn('Failed to load app state:', e);
            return false;
        }
    }

    // Auto-save state on important changes
    function scheduleStateSave() {
        clearTimeout(scheduleStateSave.timeout);
        scheduleStateSave.timeout = setTimeout(saveAppState, 1000);
    }

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
        
        // Always load initial data
        console.log('🚀 Starting loadClients...');
        loadClients().then(() => {
            console.log('🚀 loadClients completed, clients loaded:', state.clients.length);
            loadTokenUsage();
            
            // Try to restore previous app state
            console.log('🚀 Restoring app state...');
            const stateRestored = loadAppState();
            
            // Load current client's analysis history if we have a current client
            if (state.currentClient) {
                console.log('🚀 Loading analysis history for current client:', state.currentClient.company);
                loadAnalysisHistory(state.currentClient.id);
            } else {
                console.log('🚀 No current client to load analysis for');
            }
            
            console.log('🚀 App initialization completed successfully');
            console.log('🚀 Final state:', {
                clientsLoaded: state.clients.length,
                currentClient: state.currentClient ? state.currentClient.company : 'none',
                stateRestored
            });
        }).catch(error => {
            console.error('🚀 Failed to initialize app:', error);
        });
        
        // Auto-refresh token usage
        setInterval(loadTokenUsage, 30000);
        
        // Handle initial resize
        handleResize();
        
        // Auto-save state periodically
        setInterval(saveAppState, 60000); // Save every minute
        
        // Save state on page unload
        window.addEventListener('beforeunload', saveAppState);
        
        console.log('✨ TeamPulse Turbo Neon - Ready!');
    }

    // Start when authenticated
    window.addEventListener('auth-success', init);

})();