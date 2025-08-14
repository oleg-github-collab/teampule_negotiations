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
        recommendationsHistory: {}, // clientId -> array of recommendations
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
        fragmentsContent: $('#fragments-content'),
        listView: $('#list-view'),
        textView: $('#text-view'),
        highlightsView: $('#highlights-view'),
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
        recommendationsHistorySection: $('#recommendations-history-section'),
        recommendationsHistory: $('#recommendations-history'),
        recommendationsCount: $('#recommendations-count'),
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
        notifications: $('#notifications'),
        
        // Product switcher
        productDropdownBtn: $('#product-dropdown-btn'),
        productDropdown: $('#product-dropdown')
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
            // Add timestamp and cache busting for reliable daily updates
            const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD format
            const response = await fetch(`/api/usage?date=${today}&_=${Date.now()}`);
            const data = await response.json();
            
            if (data.success) {
                const newUsage = {
                    used: data.used_tokens || 0,
                    total: data.total_tokens || 512000,
                    percentage: data.percentage || 0,
                    daily_used: data.daily_used || 0,
                    daily_limit: data.daily_limit || 50000,
                    daily_percentage: data.daily_percentage || 0,
                    last_updated: new Date().toISOString(),
                    date: today
                };
                
                // Store in state with validation
                state.tokenUsage = { ...state.tokenUsage, ...newUsage };
                
                // Cache in localStorage for offline resilience
                localStorage.setItem('teampulse-token-usage', JSON.stringify({
                    ...newUsage,
                    cached_at: Date.now()
                }));
                
                updateTokenDisplay();
                console.log('📊 Token usage updated:', newUsage);
            }
        } catch (error) {
            console.error('Error loading token usage:', error);
            
            // Fallback to cached data if available
            const cached = localStorage.getItem('teampulse-token-usage');
            if (cached) {
                try {
                    const cachedData = JSON.parse(cached);
                    const cacheAge = Date.now() - cachedData.cached_at;
                    
                    // Use cached data if less than 1 hour old
                    if (cacheAge < 3600000) {
                        state.tokenUsage = { ...state.tokenUsage, ...cachedData };
                        updateTokenDisplay();
                        console.log('📊 Using cached token usage:', cachedData);
                    }
                } catch (e) {
                    console.error('Error parsing cached token usage:', e);
                }
            }
            
            // Show user-friendly error notification
            showNotification('Помилка завантаження даних про токени. Використовуємо кеш.', 'warning');
        }
    }

    function updateTokenDisplay() {
        const { used, total, percentage, dailyUsed, dailyLimit, dailyPercentage } = state.tokenUsage;
        
        // Calculate display values
        const displayUsed = dailyUsed || used;
        const displayTotal = dailyLimit || total;
        const displayPercentage = dailyPercentage || percentage;
        
        // Top nav token counter - show daily usage primarily
        if (elements.usedTokens) {
            elements.usedTokens.textContent = formatNumber(displayUsed);
            elements.usedTokens.title = `Сьогодні: ${formatNumber(dailyUsed || 0)}/${formatNumber(dailyLimit || 0)} | Всього: ${formatNumber(used)}/${formatNumber(total)}`;
        }
        if (elements.totalTokens) {
            elements.totalTokens.textContent = formatNumber(displayTotal);
        }
        if (elements.tokenProgressFill) {
            elements.tokenProgressFill.style.width = `${displayPercentage}%`;
            
            // Color coding based on daily usage
            if (displayPercentage > 90) {
                elements.tokenProgressFill.style.background = 'linear-gradient(90deg, var(--danger), var(--neon-pink))';
            } else if (displayPercentage > 70) {
                elements.tokenProgressFill.style.background = 'linear-gradient(90deg, var(--warning), var(--neon-yellow))';
            } else {
                elements.tokenProgressFill.style.background = 'var(--gradient-accent)';
            }
        }

        // Workspace token display - show daily usage
        if (elements.workspaceUsedTokens) {
            elements.workspaceUsedTokens.textContent = formatNumber(displayUsed);
            elements.workspaceUsedTokens.title = `Денне використання: ${formatNumber(dailyUsed || 0)}`;
        }
        if (elements.workspaceTotalTokens) {
            elements.workspaceTotalTokens.textContent = formatNumber(displayTotal);
            elements.workspaceTotalTokens.title = `Денний ліміт: ${formatNumber(dailyLimit || 0)}`;
        }
        if (elements.workspaceTokenPercentage) {
            elements.workspaceTokenPercentage.textContent = `${Math.round(displayPercentage)}%`;
            elements.workspaceTokenPercentage.title = `Сьогодні використано: ${Math.round(displayPercentage)}%`;
        }
        if (elements.workspaceTokenProgress) {
            elements.workspaceTokenProgress.style.width = `${displayPercentage}%`;
            if (displayPercentage > 90) {
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
        
        // Ensure textarea is interactive when text method is active
        if (method === 'text' && elements.negotiationText) {
            // Remove any potential disable states
            elements.negotiationText.disabled = false;
            elements.negotiationText.readOnly = false;
            
            // Ensure proper styles
            elements.negotiationText.style.pointerEvents = 'auto';
            elements.negotiationText.style.userSelect = 'text';
            
            // Force focus after a brief delay to ensure element is visible
            setTimeout(() => {
                if (elements.negotiationText && method === 'text') {
                    elements.negotiationText.focus();
                }
            }, 100);
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
    async function loadClients(forceRefresh = false) {
        console.log('🔄 Loading clients...', { forceRefresh, currentCount: state.clients?.length || 0 });
        try {
            // Add cache busting if forcing refresh
            const cacheBuster = forceRefresh ? `?_=${Date.now()}` : '';
            const response = await fetch(`/api/clients${cacheBuster}`);
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
            
            const previousCount = state.clients?.length || 0;
            state.clients = data.clients || [];
            console.log('✅ Set state.clients:', state.clients.length, 'clients', { previousCount, newCount: state.clients.length });
            
            // Force immediate UI update with animation
            setTimeout(() => {
                renderClientsList();
                updateClientCount();
            }, 100);
            
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

        // Render client items using data-action attributes for event delegation
        elements.clientList.innerHTML = filtered.map(client => {
            const isActive = state.currentClient?.id === client.id;
            const avatar = (client.company || 'C')[0].toUpperCase();
            const analysisCount = client.analyses_count || 0;
            
            console.log('🎨 Rendering client:', client.company, 'active:', isActive);
            
            return `
                <div class="client-item ${isActive ? 'active' : ''}" 
                     data-action="select-client"
                     data-id="${client.id}">
                    <div class="client-avatar">${avatar}</div>
                    <div class="client-info">
                        <div class="client-name">${escapeHtml(client.company || 'Без назви')}</div>
                        <div class="client-meta">
                            ${client.sector ? escapeHtml(client.sector) + ' • ' : ''}
                            ${analysisCount} аналізів
                        </div>
                    </div>
                    <div class="client-actions">
                        <button class="btn-icon" 
                                data-action="edit-client" 
                                data-id="${client.id}" 
                                title="Редагувати">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-icon" 
                                data-action="delete-client" 
                                data-id="${client.id}" 
                                title="Видалити">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        console.log('🎨 Client list rendered successfully with event listeners');
    }

    function updateClientCount() {
        const count = state.clients ? state.clients.length : 0;
        console.log('📊 Updating client count:', count);
        
        // Force find element every time to ensure it exists
        const clientCountElement = document.getElementById('client-count');
        if (clientCountElement) {
            clientCountElement.textContent = count;
            console.log('📊 ✅ Client count updated to:', count);
            elements.clientCount = clientCountElement; // Cache it
        } else {
            console.error('📊 ❌ Client count element #client-count not found in DOM');
            // Try alternative selector
            const altElement = document.querySelector('.fragment-counter');
            if (altElement) {
                altElement.textContent = count;
                console.log('📊 ✅ Updated via alternative selector');
            }
        }
    }

    function showClientForm(clientId = null) {
        console.log('🔥 ===== SHOW CLIENT FORM CALLED =====');
        console.log('📝 ClientId:', clientId, 'Type:', typeof clientId);
        
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
            // Hide recommendations history
            if (elements.recommendationsHistorySection) {
                elements.recommendationsHistorySection.style.display = 'none';
            }
            return;
        }

        // Find the most current client data from state.clients to get updated analysis count
        const currentClientData = state.clients.find(c => c.id === client.id) || client;
        const avatar = (currentClientData.company || 'C')[0].toUpperCase();
        
        elements.workspaceClientInfo.innerHTML = `
            <div class="client-item active">
                <div class="client-avatar">${avatar}</div>
                <div class="client-info">
                    <div class="client-name">${escapeHtml(currentClientData.company || 'Без назви')}</div>
                    <div class="client-meta">
                        ${currentClientData.sector ? escapeHtml(currentClientData.sector) + ' • ' : ''}
                        ${currentClientData.analyses_count || 0} аналізів
                    </div>
                </div>
            </div>
        `;
        
        // Show and update recommendations history
        if (elements.recommendationsHistorySection) {
            elements.recommendationsHistorySection.style.display = 'block';
            updateRecommendationsHistory(client.id);
        }
    }
    
    function updateRecommendationsHistory(clientId) {
        if (!elements.recommendationsHistory) return;
        
        const recommendations = state.recommendationsHistory[clientId] || [];
        
        if (elements.recommendationsCount) {
            elements.recommendationsCount.textContent = recommendations.length;
        }
        
        // Show/hide clear button
        const clearBtn = document.getElementById('clear-recommendations-btn');
        if (clearBtn) {
            clearBtn.style.display = recommendations.length > 0 ? 'block' : 'none';
        }
        
        if (recommendations.length === 0) {
            elements.recommendationsHistory.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-lightbulb"></i>
                    </div>
                    <p>Історія рекомендацій з'явиться тут після їх генерації</p>
                </div>
            `;
            return;
        }
        
        elements.recommendationsHistory.innerHTML = recommendations.map((rec, index) => {
            // Truncate long recommendations for preview
            const maxLength = 150;
            const shortContent = rec.advice.length > maxLength 
                ? rec.advice.substring(0, maxLength) + '...' 
                : rec.advice;
            
            return `
            <div class="recommendation-item" data-recommendation-id="${rec.id}" data-client-id="${clientId}" data-index="${index}">
                <div class="recommendation-header">
                    <div class="recommendation-date">
                        <i class="fas fa-clock"></i>
                        ${getTimeAgo(new Date(rec.created_at))}
                    </div>
                    <div class="recommendation-actions">
                        <button class="btn-micro expand-rec-btn" title="Переглянути повністю">
                            <i class="fas fa-expand-alt"></i>
                        </button>
                        <button class="btn-micro copy-rec-btn" title="Копіювати">
                            <i class="fas fa-copy"></i>
                        </button>
                        <button class="btn-micro btn-danger remove-rec-btn" title="Видалити рекомендацію">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <div class="recommendation-content expand-content" style="cursor: pointer;">
                    ${escapeHtml(shortContent)}
                </div>
                ${rec.fragments_count ? `
                    <div class="recommendation-meta">
                        <i class="fas fa-bookmark"></i>
                        Базується на ${rec.fragments_count} фрагментах
                    </div>
                ` : ''}
            </div>
        `;
        }).join('');
        
        // Add event listeners to recommendation buttons
        addRecommendationEventListeners();
    }
    
    function addRecommendationEventListeners() {
        // Remove any existing listeners to prevent duplicates
        document.querySelectorAll('.expand-rec-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.recommendation-item');
                const clientId = item.dataset.clientId;
                const index = parseInt(item.dataset.index);
                expandRecommendation(clientId, index);
            });
        });
        
        document.querySelectorAll('.copy-rec-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.recommendation-item');
                const clientId = item.dataset.clientId;
                const index = parseInt(item.dataset.index);
                copyRecommendation(clientId, index);
            });
        });
        
        document.querySelectorAll('.remove-rec-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const item = e.target.closest('.recommendation-item');
                const clientId = item.dataset.clientId;
                const index = parseInt(item.dataset.index);
                if (confirm('Видалити цю рекомендацію?')) {
                    removeRecommendation(clientId, index);
                }
            });
        });
        
        document.querySelectorAll('.expand-content').forEach(content => {
            content.addEventListener('click', (e) => {
                const item = e.target.closest('.recommendation-item');
                const clientId = item.dataset.clientId;
                const index = parseInt(item.dataset.index);
                expandRecommendation(clientId, index);
            });
        });
    }
    
    function saveRecommendation(clientId, advice, fragmentsCount = 0) {
        if (!state.recommendationsHistory[clientId]) {
            state.recommendationsHistory[clientId] = [];
        }
        
        const recommendation = {
            id: Date.now(),
            advice,
            fragments_count: fragmentsCount,
            created_at: new Date().toISOString()
        };
        
        state.recommendationsHistory[clientId].unshift(recommendation);
        
        // Keep only last 20 recommendations per client
        if (state.recommendationsHistory[clientId].length > 20) {
            state.recommendationsHistory[clientId] = state.recommendationsHistory[clientId].slice(0, 20);
        }
        
        updateRecommendationsHistory(clientId);
        scheduleStateSave();
    }
    
    function removeRecommendation(clientId, index) {
        if (state.recommendationsHistory[clientId] && state.recommendationsHistory[clientId][index]) {
            state.recommendationsHistory[clientId].splice(index, 1);
            updateRecommendationsHistory(clientId);
            scheduleStateSave();
            showNotification('Рекомендацію видалено', 'info');
        }
    }
    
    function expandRecommendation(clientId, index) {
        const recommendations = state.recommendationsHistory[clientId];
        if (!recommendations || !recommendations[index]) return;
        
        const rec = recommendations[index];
        
        // Create modal for full recommendation view
        const modal = document.createElement('div');
        modal.className = 'advice-modal';
        modal.innerHTML = `
            <div class="advice-content" style="max-width: 700px;">
                <div class="advice-header">
                    <h3>
                        <i class="fas fa-lightbulb"></i> 
                        Персональна рекомендація
                    </h3>
                    <div class="advice-meta">
                        <span><i class="fas fa-clock"></i> ${getTimeAgo(new Date(rec.created_at))}</span>
                        ${rec.fragments_count ? `<span><i class="fas fa-bookmark"></i> ${rec.fragments_count} фрагментів</span>` : ''}
                    </div>
                    <button class="btn-icon close-advice">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="advice-body" style="max-height: 500px; overflow-y: auto;">
                    <div class="recommendation-full-content">
                        ${escapeHtml(rec.advice).replace(/\\n/g, '<br>')}
                    </div>
                </div>
                <div class="advice-footer">
                    <button class="btn-secondary copy-modal-btn" data-client-id="${clientId}" data-index="${index}">
                        <i class="fas fa-copy"></i> Копіювати
                    </button>
                    <button class="btn-danger remove-modal-btn" data-client-id="${clientId}" data-index="${index}">
                        <i class="fas fa-trash"></i> Видалити
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Add event listeners for modal buttons
        modal.querySelector('.close-advice').addEventListener('click', () => {
            modal.remove();
        });
        
        modal.querySelector('.copy-modal-btn').addEventListener('click', (e) => {
            const clientId = e.target.dataset.clientId;
            const index = parseInt(e.target.dataset.index);
            copyRecommendation(clientId, index);
        });
        
        modal.querySelector('.remove-modal-btn').addEventListener('click', (e) => {
            const clientId = e.target.dataset.clientId;
            const index = parseInt(e.target.dataset.index);
            if (confirm('Видалити цю рекомендацію?')) {
                removeRecommendation(clientId, index);
                modal.remove();
            }
        });
        
        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    function copyRecommendation(clientId, index) {
        const recommendations = state.recommendationsHistory[clientId];
        if (!recommendations || !recommendations[index]) return;
        
        const rec = recommendations[index];
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(rec.advice).then(() => {
                showNotification('Рекомендацію скопійовано до буферу обміну', 'success');
            }).catch(() => {
                // Fallback
                copyToClipboardFallback(rec.advice);
            });
        } else {
            copyToClipboardFallback(rec.advice);
        }
    }
    
    function copyToClipboardFallback(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.select();
        
        try {
            document.execCommand('copy');
            showNotification('Рекомендацію скопійовано до буферу обміну', 'success');
        } catch (err) {
            showNotification('Помилка копіювання до буферу обміну', 'error');
        }
        
        document.body.removeChild(textArea);
    }
    
    function clearRecommendationsHistory() {
        if (!state.currentClient) return;
        
        const clientId = state.currentClient.id;
        const recommendations = state.recommendationsHistory[clientId];
        
        if (!recommendations || recommendations.length === 0) {
            showNotification('Історія рекомендацій вже порожня', 'info');
            return;
        }
        
        // Create confirmation modal
        const modal = document.createElement('div');
        modal.className = 'advice-modal';
        modal.innerHTML = `
            <div class="advice-content" style="max-width: 450px;">
                <div class="advice-header">
                    <h3>
                        <i class="fas fa-exclamation-triangle" style="color: var(--neon-pink);"></i> 
                        Підтвердження
                    </h3>
                    <button class="btn-icon close-advice" onclick="this.closest('.advice-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="advice-body">
                    <p><strong>Ви дійсно хочете видалити всю історію рекомендацій для цього клієнта?</strong></p>
                    <p>Буде видалено <strong>${recommendations.length}</strong> рекомендацій. Цю дію неможливо скасувати.</p>
                </div>
                <div class="advice-footer">
                    <button class="btn-secondary" onclick="this.closest('.advice-modal').remove()">
                        <i class="fas fa-times"></i> Скасувати
                    </button>
                    <button class="btn-danger" onclick="confirmClearRecommendations('${clientId}'); this.closest('.advice-modal').remove();">
                        <i class="fas fa-trash"></i> Видалити все
                    </button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        // Close on click outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.remove();
        });
    }
    
    function confirmClearRecommendations(clientId) {
        if (state.recommendationsHistory[clientId]) {
            const count = state.recommendationsHistory[clientId].length;
            state.recommendationsHistory[clientId] = [];
            updateRecommendationsHistory(clientId);
            scheduleStateSave();
            showNotification(`Видалено ${count} рекомендацій з історії`, 'success');
        }
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

            // Determine if we're creating new or updating existing
            const isEditing = !!state.editingClientId;
            const clientId = state.editingClientId;
            
            console.log('💾 Operation type:', isEditing ? 'UPDATE' : 'CREATE', isEditing ? `ID: ${clientId}` : '');

            const response = await fetch(
                isEditing ? `/api/clients/${clientId}` : '/api/clients',
                {
                    method: isEditing ? 'PUT' : 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(clientData)
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Помилка збереження');
            }

            const successMessage = isEditing 
                ? 'Клієнта оновлено успішно! 🎉' 
                : 'Клієнта створено успішно! 🎉';
            
            showNotification(successMessage, 'success');
            
            // Update or add client in state
            if (isEditing) {
                const clientIndex = state.clients.findIndex(c => c.id === clientId);
                if (clientIndex >= 0) {
                    state.clients[clientIndex] = { ...state.clients[clientIndex], ...data.client };
                }
                // Update current client if it's the one being edited
                if (state.currentClient && state.currentClient.id === clientId) {
                    state.currentClient = { ...state.currentClient, ...data.client };
                }
                // Clear editing state
                state.editingClientId = null;
            } else {
                // Add new client to state and force refresh
                await loadClients(true); // Force refresh with cache busting
                // Set as current client
                state.currentClient = data.client;
            }
            
            // Update UI
            renderClientsList();
            updateClientCount();
            updateNavClientInfo(state.currentClient);
            updateWorkspaceClientInfo(state.currentClient);
            
            // Hide form and show appropriate section
            if (elements.clientForm) {
                elements.clientForm.style.display = 'none';
            }
            
            if (isEditing) {
                // Stay on current section when editing
                if (state.currentClient) {
                    showSection('analysis-dashboard');
                } else {
                    showSection('welcome-screen');
                }
            } else {
                // Show analysis dashboard for new client
                showSection('analysis-dashboard');
            }
            
            // Clear form
            inputs.forEach(input => input.value = '');
            
            // Save state
            scheduleStateSave();

        } catch (error) {
            console.error('💾 Save client error:', error);
            showNotification(error.message || 'Помилка збереження клієнта', 'error');
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
        
        // Update text input state
        state.originalText = text;
        
        // Enable/disable analysis button with enhanced validation
        const hasText = chars > 0;
        const hasClient = state.currentClient !== null;
        const isTextTooLarge = chars > 10000000; // 10M character limit - без обмежень
        const isTextTooSmall = chars > 0 && chars < 20; // Minimum 20 characters
        
        if (elements.startAnalysisBtn) {
            const canAnalyze = hasText && hasClient && !isTextTooLarge && !isTextTooSmall;
            elements.startAnalysisBtn.disabled = !canAnalyze;
            
            if (!hasClient) {
                elements.startAnalysisBtn.innerHTML = '<i class="fas fa-user-plus"></i> <span>Спочатку оберіть клієнта</span>';
            } else if (isTextTooLarge) {
                elements.startAnalysisBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> <span>Текст занадто великий (макс. 10М символів)</span>';
            } else if (isTextTooSmall) {
                elements.startAnalysisBtn.innerHTML = '<i class="fas fa-edit"></i> <span>Текст занадто короткий (мін. 20 символів)</span>';
            } else if (!hasText) {
                elements.startAnalysisBtn.innerHTML = '<i class="fas fa-edit"></i> <span>Введіть текст для аналізу</span>';
            } else {
                // Show appropriate message for large texts
                if (chars > 100000) {
                    const estimatedTime = Math.ceil(chars / 10000); // Rough estimation: 1 minute per 10k characters
                    elements.startAnalysisBtn.innerHTML = `<i class="fas fa-brain"></i> <span>Розпочати аналіз (≈${estimatedTime} хв)</span>`;
                } else {
                    elements.startAnalysisBtn.innerHTML = '<i class="fas fa-brain"></i> <span>Розпочати аналіз</span>';
                }
            }
        }
        
        // Add warning for very large texts
        if (chars > 500000 && !document.querySelector('.large-text-warning')) {
            const warningDiv = document.createElement('div');
            warningDiv.className = 'large-text-warning';
            warningDiv.style.cssText = 'background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin: 10px 0; border-radius: 5px; font-size: 14px;';
            warningDiv.innerHTML = `
                <i class="fas fa-info-circle" style="color: #856404; margin-right: 8px;"></i>
                <strong>Великий текст:</strong> Аналіз може зайняти кілька хвилин. Система обробить весь текст повністю.
            `;
            elements.negotiationText?.parentNode?.insertBefore(warningDiv, elements.negotiationText.nextSibling);
        } else if (chars <= 500000) {
            // Remove warning if text is smaller
            const warning = document.querySelector('.large-text-warning');
            if (warning) warning.remove();
        }
    }

    // Debounced version for performance
    const debouncedUpdateTextStats = debounce(updateTextStats, 300);

    async function startAnalysis() {
        console.log('🔥 ===== START ANALYSIS CALLED =====');
        console.log('🔥 Current client:', state.currentClient);
        
        if (!state.currentClient) {
            console.log('🔥 No client selected, showing warning');
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
            // Reset progress bar to starting state
            resetProgressSteps();
            updateAnalysisProgressEnhanced(1, 'Ініціалізація аналізу...', 5);
            
            // Show analysis has started with clear visual feedback
            showNotification('🚀 Аналіз розпочато! Слідкуйте за прогресом...', 'info', 3000);
            
            // Show results section and update steps
            if (elements.resultsSection) {
                elements.resultsSection.style.display = 'block';
                
                // Progressive auto-scroll: Stage 1 - Scroll to counters
                setTimeout(() => {
                    const statsGrid = document.querySelector('.stats-grid');
                    if (statsGrid) {
                        statsGrid.scrollIntoView({ 
                            behavior: 'smooth', 
                            block: 'center',
                            inline: 'nearest'
                        });
                        showNotification('📊 Підраховуємо проблеми...', 'info', 2000);
                    }
                }, 1000);
            }
            
            updateAnalysisSteps('analysis');
            
            // Add loading state with more descriptive text based on text size
            if (elements.startAnalysisBtn) {
                elements.startAnalysisBtn.classList.add('btn-loading');
                elements.startAnalysisBtn.disabled = true;
                
                const textLength = text.length;
                let loadingMessage = 'Аналізую текст...';
                if (textLength > 500000) {
                    loadingMessage = 'Аналізую великий текст повністю...';
                } else if (textLength > 100000) {
                    loadingMessage = 'Аналізую розширений текст...';
                } else if (textLength > 50000) {
                    loadingMessage = 'Детальний аналіз тексту...';
                }
                
                elements.startAnalysisBtn.innerHTML = `
                    <i class="fas fa-spinner fa-spin"></i>
                    <span>${loadingMessage}</span>
                `;
            }
            
            // Show progress in step 2 with context about text size
            if (elements.stepAnalysis) {
                const stepContent = elements.stepAnalysis.querySelector('.step-content p');
                if (stepContent) {
                    let dots = 0;
                    const textLength = text.length;
                    let baseMessage = 'Аналіз в процесі';
                    
                    if (textLength > 500000) {
                        baseMessage = 'Детальна обробка великого тексту';
                    } else if (textLength > 100000) {
                        baseMessage = 'Глибокий аналіз розширеного тексту';
                    }
                    
                    const progressInterval = setInterval(() => {
                        dots = (dots + 1) % 4;
                        stepContent.textContent = `${baseMessage}${'.'.repeat(dots)}`;
                    }, 800);
                    
                    // Store interval to clear it later
                    state.progressInterval = progressInterval;
                }
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
                            console.log('📨 Received data:', data.type, data);
                            
                            if (data.type === 'analysis_started') {
                                console.log('🚀 Analysis started with chunks:', data.chunks);
                                showNotification(`🚀 ${data.message} (${data.chunks} частин)`, 'info', 3000);
                            } else if (data.type === 'progress') {
                                console.log('📊 Progress update:', data.progress, data.message);
                                
                                // Enhanced progress update with new progress bar
                                const progressPercentage = data.progress || 0;
                                const progressMessage = data.message || 'Обробка...';
                                
                                // Map progress to step numbers (5 steps total)
                                let currentStep = 1;
                                if (progressPercentage >= 80) currentStep = 5;
                                else if (progressPercentage >= 60) currentStep = 4; 
                                else if (progressPercentage >= 40) currentStep = 3;
                                else if (progressPercentage >= 20) currentStep = 2;
                                else if (progressPercentage > 0) currentStep = 1;
                                
                                // Update the enhanced progress bar
                                updateAnalysisProgressEnhanced(currentStep, progressMessage, progressPercentage);
                                
                                // Legacy support - Update old progress indicators if they exist
                                const stepText = document.querySelector('.step-text');
                                if (stepText) {
                                    stepText.textContent = progressMessage;
                                }
                            } else if (data.type === 'highlight') {
                                console.log('🔍 New highlight received:', data);
                                analysisData.highlights.push(data);
                                console.log('📊 Total highlights now:', analysisData.highlights.length);
                                
                                // Real-time individual highlight display
                                addHighlightToDisplayRealTime(data, analysisData.highlights.length - 1);
                                updateCountersFromHighlights(analysisData.highlights);
                                
                                // Real-time text highlighting update
                                updateFullTextHighlightingRealTime(analysisData.highlights);
                            } else if (data.type === 'merged_highlights') {
                                analysisData.highlights = data.items;
                                updateHighlightsDisplay(analysisData.highlights);
                                updateCountersFromHighlights(analysisData.highlights);
                                
                                // Progressive auto-scroll: Stage 2 - Scroll to problems
                                setTimeout(() => {
                                    const highlightsSection = document.querySelector('.highlights-section');
                                    if (highlightsSection) {
                                        highlightsSection.scrollIntoView({ 
                                            behavior: 'smooth', 
                                            block: 'start',
                                            inline: 'nearest'
                                        });
                                        showNotification(`🔍 Знайдено ${data.items.length} проблемних моментів`, 'success', 2500);
                                    }
                                }, 1000);
                            } else if (data.type === 'summary') {
                                analysisData.summary = data;
                                updateSummaryDisplay(data);
                            } else if (data.type === 'barometer') {
                                console.log('📊 Received barometer data:', data);
                                analysisData.barometer = data;
                                updateBarometerDisplay(data);
                            } else if (data.type === 'analysis_saved') {
                                state.currentAnalysis = { id: data.id, ...analysisData };
                                
                                // Increment client analysis count
                                if (state.currentClient) {
                                    // Update in state.clients array
                                    const clientIndex = state.clients.findIndex(c => c.id === state.currentClient.id);
                                    if (clientIndex !== -1) {
                                        state.clients[clientIndex].analyses_count = (state.clients[clientIndex].analyses_count || 0) + 1;
                                    }
                                    
                                    // Update current client object
                                    state.currentClient.analyses_count = (state.currentClient.analyses_count || 0) + 1;
                                    
                                    // Update UI displays
                                    updateWorkspaceClientInfo(state.currentClient);
                                    updateClientsList();
                                }
                                
                                // Create proper analysis object with all needed data for history
                                const analysisForHistory = {
                                    id: data.id,
                                    created_at: new Date().toISOString(),
                                    text_preview: state.originalText ? state.originalText.substring(0, 100) : 'Аналіз переговорів',
                                    highlights: analysisData.highlights || [],
                                    issues_count: analysisData.highlights ? analysisData.highlights.length : 0,
                                    complexity_score: analysisData.barometer ? analysisData.barometer.score : 0,
                                    barometer: analysisData.barometer
                                };
                                
                                console.log('💾 Saving analysis with data:', {
                                    id: data.id,
                                    issues_count: analysisForHistory.issues_count,
                                    complexity_score: analysisForHistory.complexity_score,
                                    barometer: analysisForHistory.barometer
                                });
                                
                                // Update currentAnalysis with complete data
                                state.currentAnalysis = {
                                    id: data.id,
                                    ...analysisData,
                                    created_at: analysisForHistory.created_at,
                                    text_preview: analysisForHistory.text_preview,
                                    issues_count: analysisForHistory.issues_count,
                                    complexity_score: analysisForHistory.complexity_score,
                                    original_text: data.original_text // Зберігаємо повний оригінальний текст
                                };
                                
                                // Update analysis history immediately with current data
                                if (!state.analyses) state.analyses = [];
                                state.analyses.unshift(analysisForHistory);
                                renderAnalysisHistory(state.analyses);
                                
                                // Update analysis counter immediately
                                const analysisCountElement = document.getElementById('analysis-count');
                                if (analysisCountElement) {
                                    analysisCountElement.textContent = state.analyses.length;
                                    console.log('📊 ✅ Analysis counter updated to:', state.analyses.length);
                                }
                                
                                // Also load from server to sync
                                await loadAnalysisHistory(state.currentClient.id);
                                
                                // Update client analysis count by refreshing client data
                                await loadClients(true);
                                
                                // Update current client data with refreshed info
                                if (state.currentClient) {
                                    const updatedClient = state.clients.find(c => c.id === state.currentClient.id);
                                    if (updatedClient) {
                                        state.currentClient = updatedClient;
                                    }
                                }
                                
                                renderClientsList();
                                updateWorkspaceClientInfo(state.currentClient);
                                
                                // Calculate and display custom barometer if none was provided
                                if (!analysisData.barometer) {
                                    const customBarometer = calculateComplexityBarometer(state.currentClient, analysisData);
                                    updateBarometerDisplay(customBarometer);
                                }
                            } else if (data.type === 'complete') {
                                console.log('📋 Analysis complete signal received');
                                
                                // Complete the progress bar animation
                                completeAnalysisProgress();
                                
                                // Ensure barometer is displayed and stored
                                if (analysisData.barometer) {
                                    console.log('📊 Triggering barometer display on complete');
                                    updateBarometerDisplay(analysisData.barometer);
                                } else {
                                    console.log('📊 No barometer from AI, calculating custom barometer');
                                    const customBarometer = calculateComplexityBarometer(state.currentClient, analysisData);
                                    analysisData.barometer = customBarometer; // Store it in analysisData
                                    updateBarometerDisplay(customBarometer);
                                }
                                
                                // Ensure barometer is saved in currentAnalysis
                                if (!state.currentAnalysis) state.currentAnalysis = {};
                                state.currentAnalysis.barometer = analysisData.barometer;
                                
                                // Progressive auto-scroll: Stage 3 - Scroll to barometer (final)
                                setTimeout(() => {
                                    const barometerCard = document.querySelector('.barometer-card');
                                    if (barometerCard) {
                                        barometerCard.scrollIntoView({ 
                                            behavior: 'smooth', 
                                            block: 'center',
                                            inline: 'nearest'
                                        });
                                        const score = analysisData.barometer?.score || 0;
                                        const label = analysisData.barometer?.label || 'Невизначено';
                                        showNotification(`🎯 Аналіз завершено! Складність: ${score}/100 (${label})`, 'success', 4000);
                                    }
                                }, 2000);
                                
                                // Generate and display highlighted text - КРИТИЧНО ВАЖЛИВО!
                                console.log('🔍 === FINAL HIGHLIGHTING PHASE ===');
                                console.log('🔍 Original text available:', !!state.originalText, 'length:', state.originalText?.length);
                                console.log('🔍 Highlights available:', analysisData.highlights?.length || 0);
                                
                                if (!state.currentAnalysis) state.currentAnalysis = {};
                                
                                // Save original text if not already saved
                                if (!state.originalText && elements.negotiationText?.value) {
                                    state.originalText = elements.negotiationText.value;
                                    console.log('🔍 Rescued original text from textarea:', state.originalText?.length);
                                }
                                
                                if (state.originalText && analysisData.highlights?.length > 0) {
                                    console.log('🔍 ✅ Both original text and highlights available - generating highlighted text');
                                    const highlightedText = generateHighlightedTextNew(state.originalText, analysisData.highlights);
                                    
                                    // Store everything in currentAnalysis
                                    state.currentAnalysis.original_text = state.originalText;
                                    state.currentAnalysis.highlighted_text = highlightedText;
                                    state.currentAnalysis.highlights = analysisData.highlights;
                                    
                                    console.log('🎨 Generated highlighted text successfully, length:', highlightedText.length);
                                    
                                    // FORCE update full text view
                                    updateFullTextView(highlightedText);
                                    
                                    // Also update fragments view
                                    updateFragmentsView(analysisData.highlights);
                                    
                                    console.log('🔍 ✅ Full text view and fragments view FORCE updated');
                                } else if (state.originalText) {
                                    console.log('🔍 ⚠️ Original text available but no highlights - showing plain text');
                                    state.currentAnalysis.original_text = state.originalText;
                                    updateFullTextView(null); // Will show plain text
                                } else {
                                    console.error('🔍 ❌ No original text available for highlighting!');
                                    console.error('🔍 Debug info:', {
                                        hasOriginalText: !!state.originalText,
                                        hasTextArea: !!elements.negotiationText,
                                        textAreaValue: elements.negotiationText?.value?.length,
                                        analysisHighlights: analysisData.highlights?.length
                                    });
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
            
            // Update analysis history in sidebar if we have all the data
            if (state.currentClient && analysisData.highlights) {
                console.log('🔄 Updating analysis history after completion');
                await loadAnalysisHistory(state.currentClient.id);
            }
            
            showNotification('Аналіз завершено успішно! ✨', 'success');
            
            // Save state
            scheduleStateSave();

        } catch (error) {
            console.error('Analysis error:', error);
            showNotification(error.message || 'Помилка при аналізі', 'error');
            updateAnalysisSteps('error');
        } finally {
            // Clear progress interval
            if (state.progressInterval) {
                clearInterval(state.progressInterval);
                state.progressInterval = null;
            }
            
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

        // Update step elements with better animation
        ['step-input', 'step-analysis', 'step-results'].forEach((id, index) => {
            const element = $(`#${id}`);
            if (element) {
                const stepNumber = index + 1;
                const stepContent = element.querySelector('.step-content p');
                
                // Remove all status classes
                element.classList.remove('active', 'completed', 'error');
                
                if (stepNumber < currentStep.step) {
                    element.classList.add('completed');
                    if (stepContent) {
                        stepContent.textContent = 'Завершено';
                    }
                } else if (stepNumber === currentStep.step) {
                    element.classList.add(currentStep.status);
                    if (stepContent) {
                        if (currentStep.status === 'active') {
                            stepContent.textContent = 'В процесі';
                        } else if (currentStep.status === 'completed') {
                            stepContent.textContent = 'Завершено';
                        } else if (currentStep.status === 'error') {
                            stepContent.textContent = 'Помилка';
                        }
                    }
                } else {
                    // Future steps
                    if (stepContent) {
                        if (stepNumber === 1) {
                            stepContent.textContent = 'Очікування';
                        } else if (stepNumber === 2) {
                            stepContent.textContent = 'Очікування';
                        } else if (stepNumber === 3) {
                            stepContent.textContent = 'Готові дані';
                        }
                    }
                }
            }
        });
        
        // Force repaint for animations
        requestAnimationFrame(() => {
            document.body.offsetHeight;
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
                    <button class="btn-secondary btn-sm" data-action="clear-filters">Очистити фільтри</button>
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
        setTimeout(() => {
            $$('.add-to-workspace-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const index = parseInt(btn.dataset.highlightIndex);
                    console.log('🔘 Adding highlight to workspace via + button:', index);
                    addToWorkspace(index);
                });
            });
        }, 100); // Small delay to ensure DOM is ready
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
        // Count by category - handle empty highlights
        const counts = {
            manipulation: 0,
            cognitive_bias: 0,
            rhetological_fallacy: 0
        };
        
        if (highlights && highlights.length > 0) {
            highlights.forEach(highlight => {
                const category = highlight.category || 'manipulation';
                if (counts.hasOwnProperty(category)) {
                    counts[category]++;
                } else {
                    counts.manipulation++; // fallback
                }
            });
        }
        
        const totalCount = highlights ? highlights.length : 0;
        console.log('📊 Updating problem counters:', counts, 'Total:', totalCount);
        
        // Force find and update all counters
        const manipulationsElement = document.getElementById('manipulations-count');
        const biasesElement = document.getElementById('biases-count');
        const fallaciesElement = document.getElementById('fallacies-count');
        const recommendationsElement = document.getElementById('recommendations-count');
        
        if (manipulationsElement) {
            animateNumber(manipulationsElement, counts.manipulation);
            elements.manipulationsCount = manipulationsElement;
            console.log('📊 ✅ Manipulations count updated:', counts.manipulation);
        } else {
            console.error('📊 ❌ #manipulations-count not found');
        }
        
        if (biasesElement) {
            animateNumber(biasesElement, counts.cognitive_bias);
            elements.biasesCount = biasesElement;
            console.log('📊 ✅ Biases count updated:', counts.cognitive_bias);
        } else {
            console.error('📊 ❌ #biases-count not found');
        }
        
        if (fallaciesElement) {
            animateNumber(fallaciesElement, counts.rhetological_fallacy);
            elements.fallaciesCount = fallaciesElement;
            console.log('📊 ✅ Fallacies count updated:', counts.rhetological_fallacy);
        } else {
            console.error('📊 ❌ #fallacies-count not found');
        }
        
        if (recommendationsElement) {
            animateNumber(recommendationsElement, totalCount);
            elements.recommendationsCount = recommendationsElement;
            console.log('📊 ✅ Total recommendations updated:', totalCount);
        } else {
            console.error('📊 ❌ #recommendations-count not found');
        }
        
        console.log('📊 All counters update completed');
    }

    // ===== Enhanced Custom Barometer Logic =====
    function calculateComplexityBarometer(clientData, analysisData) {
        let complexityScore = 0;
        let factors = {
            client_profile: 0,
            manipulation_density: 0,
            manipulation_severity: 0,
            manipulation_frequency: 0,
            negotiation_type: 0,
            stakes_level: 0,
            communication_style: 0,
            company_size_impact: 0,
            sector_complexity: 0,
            risk_indicators: 0,
            time_pressure: 0,
            power_dynamics: 0
        };
        
        // Factor 1: Client Profile & Company Size (0-25 points) - More weight for large organizations
        if (clientData) {
            // Company size impact - larger companies mean more stakeholders, bureaucracy, and complexity
            const sizeMap = { 
                'startup': 4, 
                'small': 8, 
                'medium': 15, 
                'large': 25  // Maximum points for large companies due to complexity
            };
            factors.company_size_impact = sizeMap[clientData.company_size] || 10;
            
            // Sector complexity with more realistic weights based on regulatory burden and negotiation complexity
            const sectorMap = { 
                'IT': 12, 'Finance': 25, 'Healthcare': 20, 'Education': 8,
                'Manufacturing': 15, 'Retail': 10, 'Real Estate': 22, 'Energy': 25,
                'Consulting': 16, 'Other': 12
            };
            factors.sector_complexity = sectorMap[clientData.sector] || 12;
            
            // Deal value complexity with exponential scaling
            if (clientData.deal_value) {
                const dealStr = clientData.deal_value.toLowerCase();
                const amount = parseFloat(dealStr.replace(/[^0-9.]/g, '')) || 0;
                
                if (dealStr.includes('m') || dealStr.includes('мільйон') || dealStr.includes('млн')) {
                    factors.client_profile += 8 + Math.min(12, amount * 0.5); // Scale with amount
                } else if (dealStr.includes('k') || dealStr.includes('тисяч') || dealStr.includes('тис')) {
                    factors.client_profile += 3 + Math.min(5, amount * 0.1);
                }
                
                // Very large deals add exponential complexity
                if (amount > 50 && (dealStr.includes('m') || dealStr.includes('мільйон'))) {
                    factors.client_profile += 15;
                }
            }
        }
        
        // Factor 2: Manipulation Density Analysis (0-35 points) - Higher weight for frequent manipulation
        if (analysisData && analysisData.highlights) {
            const totalHighlights = analysisData.highlights.length;
            const textLength = state.originalText ? state.originalText.length : 1000;
            
            // Calculate manipulation density per paragraph (more realistic than per 100 chars)
            const paragraphs = (state.originalText || '').split(/\n\s*\n/).length;
            const manipulationsPerParagraph = totalHighlights / Math.max(1, paragraphs);
            
            // If there are many manipulations per paragraph, it's extremely complex
            factors.manipulation_density = Math.min(25, manipulationsPerParagraph * 8);
            
            // Category analysis with higher penalties for multiple manipulation types
            const categories = analysisData.highlights.reduce((acc, h) => {
                acc[h.category] = (acc[h.category] || 0) + 1;
                return acc;
            }, {});
            
            const categoryCount = Object.keys(categories).length;
            factors.manipulation_frequency = Math.min(10, categoryCount * 3); // Higher penalty for variety
            
            // Penalty for high concentration of any single manipulation type
            const maxCategoryCount = Math.max(...Object.values(categories), 0);
            if (maxCategoryCount > 5) factors.manipulation_frequency += 5;
        }
        
        // Factor 3: Manipulation Severity with Non-Linear Scaling (0-30 points)
        if (analysisData?.highlights && analysisData.highlights.length > 0) {
            const severities = analysisData.highlights.map(h => h.severity || 1);
            const avgSeverity = severities.reduce((sum, s) => sum + s, 0) / severities.length;
            const maxSeverity = Math.max(...severities);
            const severeCount = severities.filter(s => s >= 3).length;
            const extremeCount = severities.filter(s => s >= 4).length;
            
            // Non-linear scaling - high severity gets exponentially more weight
            factors.manipulation_severity = avgSeverity * 4 + maxSeverity * 3 + severeCount * 3 + extremeCount * 5;
            factors.manipulation_severity = Math.min(30, factors.manipulation_severity);
            
            // If most manipulations are severe, add extra penalty
            const severeRatio = severeCount / severities.length;
            if (severeRatio > 0.6) factors.manipulation_severity += 8;
        }
        
        // Factor 4: Communication Style Analysis (0-20 points) - New factor
        if (state.originalText) {
            const text = state.originalText.toLowerCase();
            
            // Aggressive communication patterns
            const aggressiveWords = ['мусиш', 'маєш', 'зобов\'язаний', 'примусити', 'змусити'];
            const manipulativeWords = ['тільки сьогодні', 'останній шанс', 'всі так роблять', 'ніхто не'];
            const pressureWords = ['швидко', 'зараз', 'негайно', 'терміново', 'поспішай'];
            
            factors.communication_style += aggressiveWords.filter(word => text.includes(word)).length * 4;
            factors.communication_style += manipulativeWords.filter(word => text.includes(word)).length * 3;
            factors.communication_style += pressureWords.filter(word => text.includes(word)).length * 2;
            
            // Length and complexity indicators
            const sentences = text.split(/[.!?]+/).length;
            const avgSentenceLength = text.length / sentences;
            if (avgSentenceLength > 100) factors.communication_style += 3; // Very complex sentences
            
            factors.communication_style = Math.min(20, factors.communication_style);
        }
        
        // Factor 5: Negotiation Type with Power Dynamics (0-20 points)
        if (clientData?.negotiation_type) {
            const typeMap = {
                'sales': 8, 'partnership': 12, 'contract': 10, 'investment': 18,
                'acquisition': 20, 'licensing': 14, 'other': 10
            };
            factors.negotiation_type = typeMap[clientData.negotiation_type] || 10;
            
            // Add complexity for high-stake deal types with large companies
            if (['investment', 'acquisition'].includes(clientData.negotiation_type) && 
                clientData.company_size === 'large') {
                factors.power_dynamics += 10;
            }
        }
        
        // Factor 6: Enhanced Stakes Analysis (0-25 points)
        if (clientData?.goals || clientData?.user_goals) {
            const goalsText = (clientData.goals || clientData.user_goals || '').toLowerCase();
            
            // Critical business keywords
            const criticalWords = ['критично', 'важливо', 'стратегічно', 'ключово', 'пріоритет', 'життєво'];
            const urgentWords = ['терміново', 'швидко', 'негайно', 'асап', 'дедлайн', 'вчора'];
            const riskWords = ['ризик', 'загроза', 'втрати', 'конкуренти', 'криза', 'банкрутство'];
            const powerWords = ['контроль', 'влада', 'домінування', 'перемога', 'поразка'];
            
            factors.stakes_level += criticalWords.filter(word => goalsText.includes(word)).length * 4;
            factors.stakes_level += urgentWords.filter(word => goalsText.includes(word)).length * 3;
            factors.stakes_level += riskWords.filter(word => goalsText.includes(word)).length * 4;
            factors.stakes_level += powerWords.filter(word => goalsText.includes(word)).length * 3;
            
            // Very detailed goals indicate high stakes
            factors.stakes_level += Math.min(8, goalsText.length / 80);
            factors.stakes_level = Math.min(25, factors.stakes_level);
        }
        
        // Factor 7: Time Pressure with Escalation (0-15 points)
        if (state.originalText) {
            const text = state.originalText.toLowerCase();
            const timeWords = ['терміново', 'швидко', 'негайно', 'дедлайн', 'часу мало', 'пізно', 'вчора', 'зараз'];
            const pressureWords = ['поспішай', 'не встигнеш', 'останній день', 'закінчується', 'спливає'];
            
            factors.time_pressure += timeWords.filter(word => text.includes(word)).length * 2;
            factors.time_pressure += pressureWords.filter(word => text.includes(word)).length * 3;
            factors.time_pressure = Math.min(15, factors.time_pressure);
        }
        
        // Factor 8: Risk Indicators (0-20 points)
        if (clientData) {
            // Large companies in risky sectors = maximum complexity
            if (clientData.company_size === 'large') factors.risk_indicators += 8;
            
            // High-risk sectors get exponential scaling
            const riskySectors = ['Finance', 'Energy', 'Real Estate', 'Healthcare'];
            if (riskySectors.includes(clientData.sector)) {
                factors.risk_indicators += 10;
                if (clientData.company_size === 'large') factors.risk_indicators += 5; // Compound effect
            }
            
            // Very complex deal types
            const complexDeals = ['acquisition', 'investment'];
            const mediumDeals = ['partnership', 'licensing'];
            
            if (complexDeals.includes(clientData.negotiation_type)) {
                factors.risk_indicators += 8;
            } else if (mediumDeals.includes(clientData.negotiation_type)) {
                factors.risk_indicators += 4;
            }
            
            factors.risk_indicators = Math.min(20, factors.risk_indicators);
        }
        
        // Calculate total with weighted factors
        const weightedScore = 
            factors.company_size_impact * 0.8 +
            factors.sector_complexity * 0.7 +
            factors.client_profile * 0.6 +
            factors.manipulation_density * 1.2 +
            factors.manipulation_frequency * 1.1 +
            factors.manipulation_severity * 1.5 +
            factors.communication_style * 1.0 +
            factors.negotiation_type * 0.9 +
            factors.stakes_level * 1.3 +
            factors.time_pressure * 0.8 +
            factors.risk_indicators * 1.1 +
            factors.power_dynamics * 0.9;
        
        complexityScore = Math.round(weightedScore);
        
        // More realistic and less optimistic scoring ranges
        let label, normalizedScore, description;
        if (complexityScore <= 30) {
            label = 'Manageable';
            normalizedScore = Math.min(25, complexityScore * 0.8);
            description = 'Стандартні переговори, базова підготовка';
        } else if (complexityScore <= 60) {
            label = 'Challenging';
            normalizedScore = 25 + Math.min(25, (complexityScore - 30) * 0.8);
            description = 'Складні переговори, потрібна ретельна підготовка';
        } else if (complexityScore <= 100) {
            label = 'High Risk';
            normalizedScore = 50 + Math.min(25, (complexityScore - 60) * 0.6);
            description = 'Високоризикові переговори, критична підготовка';
        } else if (complexityScore <= 150) {
            label = 'Danger Zone';
            normalizedScore = 75 + Math.min(15, (complexityScore - 100) * 0.3);
            description = 'Вкрай небезпечні переговори, максимальна обережність';
        } else {
            label = 'Minefield';
            normalizedScore = 90 + Math.min(10, (complexityScore - 150) * 0.1);
            description = 'Екстремально небезпечні переговори, розгляньте відмову';
        }
        
        return {
            score: Math.round(normalizedScore),
            label,
            description,
            factors,
            rawScore: complexityScore,
            recommendations: generateAdvancedComplexityRecommendations(label, factors, clientData)
        };
    }
    
    function generateAdvancedComplexityRecommendations(label, factors, clientData) {
        const recommendations = [];
        
        // Manipulation-based recommendations
        if (factors.manipulation_density > 15) {
            recommendations.push('🚨 Критично високий рівень маніпуляцій - підготуйте детальні контраргументи');
        }
        if (factors.manipulation_severity > 20) {
            recommendations.push('⚖️ Агресивні техніки впливу - розгляньте залучення юристів');
        }
        if (factors.manipulation_frequency > 6) {
            recommendations.push('🎭 Різноманітні техніки маніпуляцій - вивчіть кожну категорію');
        }
        
        // Company and sector-based recommendations
        if (factors.company_size_impact > 20) {
            recommendations.push('🏢 Велика корпорація - очікуйте складну ієрархію та довгі процеси');
        }
        if (factors.sector_complexity > 20) {
            recommendations.push('🏭 Складна галузь - залучіть галузевих експертів');
        }
        
        // Communication style recommendations
        if (factors.communication_style > 15) {
            recommendations.push('💬 Агресивний стиль спілкування - зберігайте спокій та професіоналізм');
        }
        if (factors.power_dynamics > 5) {
            recommendations.push('⚡ Складна динаміка влади - визначте справжніх осіб, що приймають рішення');
        }
        
        // Stakes and pressure recommendations
        if (factors.stakes_level > 18) {
            recommendations.push('🎯 Критично високі ставки - максимальна підготовка обов\'язкова');
        }
        if (factors.time_pressure > 10) {
            recommendations.push('⏰ Сильний тиск часу - не поспішайте з важливими рішеннями');
        }
        if (factors.risk_indicators > 15) {
            recommendations.push('⚠️ Високі ризики - розробіть план виходу з переговорів');
        }
        
        // Label-based strategic recommendations
        switch (label) {
            case 'Manageable':
                recommendations.push('✅ Стандартна підготовка буде достатньою');
                break;
            case 'Challenging':
                recommendations.push('📚 Поглиблена підготовка та дослідження контрагента');
                break;
            case 'High Risk':
                recommendations.push('🛡️ Залучіть команду експертів та юридичну підтримку');
                break;
            case 'Danger Zone':
                recommendations.push('🚨 Розгляньте можливість відмови або кардинальної зміни умов');
                break;
            case 'Minefield':
                recommendations.push('💀 Серйозно розгляньте відмову від цих переговорів');
                break;
        }
        
        // Deal value specific recommendations
        if (clientData?.deal_value) {
            const dealStr = clientData.deal_value.toLowerCase();
            if (dealStr.includes('m') || dealStr.includes('мільйон')) {
                recommendations.push('💰 Великі суми - обов\'язкова юридична експертиза');
            }
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
        
        console.log('🔍 Updating barometer:', score, label, barometer);
        console.log('🔍 Elements check:', {
            barometerScore: !!elements.barometerScore,
            barometerLabel: !!elements.barometerLabel,
            barometerComment: !!elements.barometerComment,
            gaugeCircle: !!$('#gauge-circle')
        });
        
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

        console.log('🔍 displayAnalysisResults called with:', {
            highlights: analysis.highlights?.length || 0,
            summary: !!analysis.summary,
            barometer: !!analysis.barometer
        });

        // Process highlights to extract categories
        let categoryCounts = { manipulation: 0, cognitive_bias: 0, rhetological_fallacy: 0 };
        
        if (analysis.highlights && Array.isArray(analysis.highlights)) {
            analysis.highlights.forEach(highlight => {
                const category = highlight.category;
                if (categoryCounts.hasOwnProperty(category)) {
                    categoryCounts[category]++;
                }
            });
        }
        
        // Also check summary data if available
        if (analysis.summary && analysis.summary.counts_by_category) {
            categoryCounts = {
                ...categoryCounts,
                ...analysis.summary.counts_by_category
            };
        }

        console.log('🔍 Category counts:', categoryCounts);

        // Update statistics display
        if (elements.manipulationsCount) {
            animateNumber(elements.manipulationsCount, categoryCounts.manipulation || 0);
        }
        if (elements.biasesCount) {
            animateNumber(elements.biasesCount, categoryCounts.cognitive_bias || 0);
        }
        if (elements.fallaciesCount) {
            animateNumber(elements.fallaciesCount, categoryCounts.rhetological_fallacy || 0);
        }
        
        // Calculate total for recommendations count
        const totalCount = (categoryCounts.manipulation || 0) + (categoryCounts.cognitive_bias || 0) + (categoryCounts.rhetological_fallacy || 0);
        if (elements.recommendationsCount) {
            animateNumber(elements.recommendationsCount, totalCount);
        }

        // Update barometer
        if (analysis.barometer) {
            updateBarometerDisplay(analysis.barometer);
        } else if (analysis.complexity_score !== undefined) {
            updateBarometer(analysis.complexity_score, analysis.complexity_label);
        }

        // Update highlights display
        if (analysis.highlights) {
            updateHighlightsDisplay(analysis.highlights);
        }
        
        // Update summary display
        if (analysis.summary) {
            updateSummaryDisplay(analysis.summary);
        }

        // Update full text view
        if (analysis.highlighted_text) {
            console.log('🔍 Loading analysis with highlighted text, length:', analysis.highlighted_text.length);
            updateFullTextView(analysis.highlighted_text);
        } else {
            console.log('🔍 No highlighted text found in analysis');
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
            <div class="highlight-item ${highlight.category || 'general'}" 
                 data-highlight-id="${index}" 
                 draggable="true">
                <div class="highlight-header">
                    <div class="highlight-type ${highlight.category}">${highlight.category_label || 'Проблема'}</div>
                    <div class="highlight-actions">
                        <button class="btn-icon" 
                                data-action="add-to-workspace" 
                                data-id="${index}" 
                                title="Додати до робочої області">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn-icon" 
                                data-action="share-highlight" 
                                data-id="${index}" 
                                title="Поділитися">
                            <i class="fas fa-share"></i>
                        </button>
                    </div>
                </div>
                <div class="highlight-text">${escapeHtml(highlight.text || '')}</div>
                <div class="highlight-description">${escapeHtml(highlight.explanation || highlight.description || '')}</div>
                ${highlight.suggestion ? `<div class="highlight-suggestion"><strong>Рекомендація:</strong> ${escapeHtml(highlight.suggestion)}</div>` : ''}
            </div>
        `).join('');
        
        // Enable drag functionality after rendering
        enableHighlightDrag();
    }

    function updateFullTextView(highlightedText) {
        console.log('🔍 updateFullTextView called with:', {
            highlightedTextLength: highlightedText ? highlightedText.length : 0,
            hasCurrentAnalysis: !!state.currentAnalysis,
            hasHighlights: state.currentAnalysis?.highlights?.length || 0,
            hasOriginalText: !!(state.originalText || state.currentAnalysis?.original_text)
        });
        
        if (!elements.fulltextContent) {
            console.warn('🔍 fulltext content element not found');
            return;
        }
        
        if (highlightedText && highlightedText.trim() !== '') {
            console.log('🔍 Displaying provided highlighted text');
            elements.fulltextContent.innerHTML = `
                <div class="fulltext-container">
                    <div class="fulltext-header">
                        <h4><i class="fas fa-file-text"></i> Повний текст з підсвічуванням проблем</h4>
                    </div>
                    <div class="fulltext-body">
                        ${highlightedText}
                    </div>
                </div>
            `;
        } else if (state.currentAnalysis?.highlights && (state.originalText || state.currentAnalysis?.original_text)) {
            // Generate highlighted text from highlights and original text
            console.log('🔍 Generating highlighted text from highlights and original');
            const originalTextToUse = state.originalText || state.currentAnalysis.original_text;
            const highlighted = generateHighlightedTextNew(originalTextToUse, state.currentAnalysis.highlights);
            elements.fulltextContent.innerHTML = `
                <div class="fulltext-container">
                    <div class="fulltext-header">
                        <h4><i class="fas fa-file-text"></i> Повний текст з підсвічуванням проблем</h4>
                        <span class="highlights-count">${state.currentAnalysis.highlights.length} проблем знайдено</span>
                    </div>
                    <div class="fulltext-body">
                        ${highlighted}
                    </div>
                </div>
            `;
        } else if ((state.originalText || state.currentAnalysis?.original_text) && (state.originalText || state.currentAnalysis?.original_text).trim() !== '') {
            // Show original text without highlighting if no highlights available
            console.log('🔍 Showing original text without highlighting');
            const originalTextToUse = state.originalText || state.currentAnalysis?.original_text;
            elements.fulltextContent.innerHTML = `
                <div class="fulltext-container">
                    <div class="fulltext-header">
                        <h4><i class="fas fa-file-text"></i> Повний текст</h4>
                        <span class="text-info">Без підсвічування (аналіз не виконано)</span>
                    </div>
                    <div class="fulltext-body">
                        <div class="text-content">
                            ${escapeHtml(originalTextToUse)}
                        </div>
                    </div>
                </div>
            `;
        } else {
            // Show empty state if no text available
            console.log('🔍 Showing empty state for full text view');
            elements.fulltextContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-file-text"></i></div>
                    <h4>Повний текст недоступний</h4>
                    <p>Повний текст з підсвічуванням з'явиться тут після аналізу</p>
                </div>
            `;
        }
        
        // Add scrollable class for proper styling
        const fulltextBody = elements.fulltextContent.querySelector('.fulltext-body');
        if (fulltextBody) {
            fulltextBody.classList.add('scrollable-content');
        }
    }

    function generateHighlightedText(originalText, highlights) {
        console.log('🔥 ========== NEW HIGHLIGHTING ENGINE ==========');
        
        if (!originalText) {
            console.log('🔥 No original text provided');
            return '<div class="text-content">Немає тексту для відображення</div>';
        }
        
        if (!highlights || !Array.isArray(highlights) || highlights.length === 0) {
            console.log('🔥 No highlights provided, showing plain text');
            return `<div class="text-content">${escapeHtml(originalText)}</div>`;
        }
        
        console.log(`🔥 Processing ${highlights.length} highlights for text of ${originalText.length} chars`);

        // Build array of all highlight positions
        const highlightPositions = [];
        
        highlights.forEach((highlight, index) => {
            const highlight = highlights[i];
            
            // Strategy 1: Try exact coordinates if available  
            let start = highlight.char_start || highlight.start_pos;
            let end = highlight.char_end || highlight.end_pos;
            
            if (start !== undefined && end !== undefined && start >= 0 && end > start && end <= originalText.length) {
                const actualText = originalText.substring(start, end);
                console.log(`🎯 Strategy 1 (coordinates) - Highlight ${i}: [${start}-${end}] "${actualText.slice(0, 30)}..."`);
                
                segments.push({
                    start: start,
                    end: end,
                    actualText: actualText,
                    highlight: highlight,
                    highlightIndex: i
                });
                continue;
            }
            
            // Strategy 2: Exact text search
            const searchText = highlight.text?.trim();
            if (searchText && searchText.length >= 2) {
                let index = originalText.indexOf(searchText);
                
                // Try case-insensitive search if exact fails
                if (index === -1) {
                    const lowerOriginal = originalText.toLowerCase();
                    const lowerSearch = searchText.toLowerCase();
                    index = lowerOriginal.indexOf(lowerSearch);
                }
                
                if (index !== -1) {
                    start = index;
                    end = index + searchText.length;
                    console.log(`🎯 Strategy 2 (exact text) - Highlight ${i}: [${start}-${end}] "${searchText.slice(0, 30)}..."`);
                    
                    segments.push({
                        start: start,
                        end: end,
                        actualText: originalText.substring(start, end),
                        highlight: highlight,
                        highlightIndex: i
                    });
                    continue;
                }
            }
            
            // Strategy 3: Fuzzy text search (remove punctuation, extra spaces)
            if (searchText) {
                const cleanSearch = searchText.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ').trim();
                const cleanOriginal = originalText.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
                
                const index = cleanOriginal.toLowerCase().indexOf(cleanSearch.toLowerCase());
                if (index !== -1) {
                    // Map back to original text positions (approximate)
                    const beforeClean = cleanOriginal.substring(0, index);
                    const wordsBefore = beforeClean.split(' ').length - 1;
                    
                    // Find approximate position in original text
                    const words = originalText.split(/\s+/);
                    let charPosition = 0;
                    for (let w = 0; w < Math.min(wordsBefore, words.length); w++) {
                        charPosition = originalText.indexOf(words[w], charPosition);
                        if (charPosition !== -1) {
                            charPosition += words[w].length;
                        }
                    }
                    
                    // Search for the actual text near this position
                    const searchWindow = originalText.substring(Math.max(0, charPosition - 50), Math.min(originalText.length, charPosition + searchText.length + 50));
                    const localIndex = searchWindow.toLowerCase().indexOf(searchText.toLowerCase());
                    
                    if (localIndex !== -1) {
                        start = Math.max(0, charPosition - 50) + localIndex;
                        end = start + searchText.length;
                        
                        console.log(`🎯 Strategy 3 (fuzzy search) - Highlight ${i}: [${start}-${end}] "${searchText.slice(0, 30)}..."`);
                        
                        segments.push({
                            start: start,
                            end: end,
                            actualText: originalText.substring(start, end),
                            highlight: highlight,
                            highlightIndex: i
                        });
                        continue;
                    }
                }
            }
            
            // Strategy 4: Word-based search
            if (searchText && searchText.split(' ').length >= 2) {
                const words = searchText.split(' ').filter(w => w.length > 2); // Skip short words
                let bestMatch = null;
                let bestScore = 0;
                
                for (let pos = 0; pos < originalText.length - searchText.length; pos += 10) { // Sample every 10 chars
                    const window = originalText.substring(pos, pos + searchText.length + 20);
                    let score = 0;
                    
                    for (const word of words) {
                        if (window.toLowerCase().includes(word.toLowerCase())) {
                            score += word.length;
                        }
                    }
                    
                    if (score > bestScore && score >= searchText.length * 0.6) { // 60% match
                        bestScore = score;
                        bestMatch = pos;
                    }
                }
                
                if (bestMatch !== null) {
                    start = bestMatch;
                    end = Math.min(bestMatch + searchText.length, originalText.length);
                    
                    console.log(`🎯 Strategy 4 (word-based) - Highlight ${i}: [${start}-${end}] score: ${bestScore}`);
                    
                    segments.push({
                        start: start,
                        end: end,
                        actualText: originalText.substring(start, end),
                        highlight: highlight,
                        highlightIndex: i
                    });
                    continue;
                }
            }
            
            console.warn(`🎯 ❌ All strategies failed for highlight ${i}: "${searchText?.slice(0, 50)}..."`);
        }
        
        // Sort segments by start position
        segments.sort((a, b) => a.start - b.start);
        console.log(`🎯 Valid segments to process: ${segments.length}`);
        
        // Handle overlapping segments - merge or prioritize
        const mergedSegments = [];
        for (const segment of segments) {
            let merged = false;
            
            for (let i = 0; i < mergedSegments.length; i++) {
                const existing = mergedSegments[i];
                
                // Check for overlap
                if (segment.start < existing.end && segment.end > existing.start) {
                    console.log(`🎯 Overlap detected: [${existing.start}-${existing.end}] vs [${segment.start}-${segment.end}]`);
                    
                    // Merge by taking the widest range and combining highlights
                    const newStart = Math.min(existing.start, segment.start);
                    const newEnd = Math.max(existing.end, segment.end);
                    const newText = originalText.substring(newStart, newEnd);
                    
                    mergedSegments[i] = {
                        start: newStart,
                        end: newEnd,
                        actualText: newText,
                        highlight: existing.highlight, // Keep first highlight's properties
                        highlightIndex: existing.highlightIndex,
                        merged: true
                    };
                    
                    console.log(`🎯   Merged into: [${newStart}-${newEnd}]`);
                    merged = true;
                    break;
                }
            }
            
            if (!merged) {
                mergedSegments.push(segment);
            }
        }
        
        // Sort merged segments
        mergedSegments.sort((a, b) => a.start - b.start);
        console.log(`🎯 Final segments after merging: ${mergedSegments.length}`);
        
        // Build the final HTML with precise highlighting
        let result = '';
        let currentIndex = 0;
        
        for (const segment of mergedSegments) {
            // Add unhighlighted text before this segment
            if (segment.start > currentIndex) {
                const beforeText = originalText.substring(currentIndex, segment.start);
                result += escapeHtml(beforeText);
            }
            
            // Add highlighted segment with proper styling and interactive tooltip
            const category = getCategoryClass(segment.highlight.category || 'manipulation');
            const tooltip = escapeHtml(
                segment.highlight.explanation || 
                segment.highlight.description || 
                segment.highlight.label || 
                'Проблемний фрагмент'
            );
            const highlightedText = escapeHtml(segment.actualText);
            
            // Create rich tooltip data
            const tooltipData = {
                title: segment.highlight.label || getCategoryLabel(segment.highlight.category),
                explanation: segment.highlight.explanation,
                severity: segment.highlight.severity || 1,
                category: segment.highlight.category,
                recommendation: segment.highlight.recommendation
            };
            
            result += `<span class="text-highlight ${category} interactive-highlight" 
                             title="${tooltip}" 
                             data-highlight-index="${segment.highlightIndex}"
                             data-tooltip='${JSON.stringify(tooltipData).replace(/'/g, "&apos;")}'
                             onmouseover="showHighlightTooltip(event, this)"
                             onmouseout="hideHighlightTooltip()">${highlightedText}</span>`;
            
            currentIndex = segment.end;
        }
        
        // Add remaining unhighlighted text
        if (currentIndex < originalText.length) {
            const remainingText = originalText.substring(currentIndex);
            result += escapeHtml(remainingText);
        }
        
        console.log('🎯 ========== PRECISE HIGHLIGHTING COMPLETED ==========');
        console.log('🎯 Final result length:', result.length);
        console.log('🎯 Applied precise highlights:', mergedSegments.length);
        
        return `<div class="text-content">${result}</div>`;
    }

    // ===== NEW SUPER HIGHLIGHTING FUNCTION =====
    function generateHighlightedTextNew(originalText, highlights) {
        console.log('🔥 ========== SUPER HIGHLIGHTING ENGINE ==========');
        
        if (!originalText) {
            console.log('🔥 No original text provided');
            return '<div class="text-content">Немає тексту для відображення</div>';
        }
        
        if (!highlights || !Array.isArray(highlights) || highlights.length === 0) {
            console.log('🔥 No highlights, showing plain text');
            return `<div class="text-content">${escapeHtml(originalText)}</div>`;
        }
        
        console.log(`🔥 Processing ${highlights.length} highlights for text of ${originalText.length} chars`);
        
        // Build array of all highlight positions
        const highlightPositions = [];
        
        highlights.forEach((highlight, index) => {
            console.log(`🔥 Processing highlight ${index}:`, {
                text: (highlight.text || '').substring(0, 50) + '...',
                category: highlight.category
            });
            
            const searchText = highlight.text?.trim();
            if (!searchText || searchText.length < 2) {
                console.log(`🔥 Skipping highlight ${index} - text too short or missing`);
                return;
            }
            
            // Find all occurrences of this text (case-insensitive)
            const lowerOriginal = originalText.toLowerCase();
            const lowerSearch = searchText.toLowerCase();
            
            let startIndex = 0;
            let foundIndex;
            
            while ((foundIndex = lowerOriginal.indexOf(lowerSearch, startIndex)) !== -1) {
                const endIndex = foundIndex + searchText.length;
                
                highlightPositions.push({
                    start: foundIndex,
                    end: endIndex,
                    highlight: highlight,
                    highlightIndex: index,
                    actualText: originalText.substring(foundIndex, endIndex)
                });
                
                console.log(`🔥 Found "${searchText.substring(0, 30)}..." at position [${foundIndex}-${endIndex}]`);
                startIndex = foundIndex + 1;
                
                // Prevent infinite loops and limit matches per highlight
                if (highlightPositions.length > 200) break;
            }
        });
        
        if (highlightPositions.length === 0) {
            console.log('🔥 No highlights found in text');
            return `<div class="text-content">${escapeHtml(originalText)}</div>`;
        }
        
        // Sort by position and remove overlaps
        highlightPositions.sort((a, b) => a.start - b.start);
        console.log(`🔥 Found ${highlightPositions.length} highlight positions`);
        
        // Remove overlapping highlights (keep first one)
        const cleanedHighlights = [];
        let lastEnd = 0;
        
        for (const pos of highlightPositions) {
            if (pos.start >= lastEnd) {
                cleanedHighlights.push(pos);
                lastEnd = pos.end;
            } else {
                console.log(`🔥 Removing overlapping highlight at [${pos.start}-${pos.end}]`);
            }
        }
        
        console.log(`🔥 After removing overlaps: ${cleanedHighlights.length} highlights`);
        
        // Generate HTML
        let html = '';
        let currentPos = 0;
        
        cleanedHighlights.forEach((pos) => {
            // Add plain text before highlight
            if (pos.start > currentPos) {
                html += escapeHtml(originalText.substring(currentPos, pos.start));
            }
            
            // Add highlighted text
            const category = getCategoryClass(pos.highlight.category || 'manipulation');
            const tooltipData = {
                title: pos.highlight.label || getCategoryLabel(pos.highlight.category),
                explanation: pos.highlight.explanation || 'Проблемний фрагмент',
                severity: pos.highlight.severity || 1,
                category: pos.highlight.category,
                recommendation: pos.highlight.recommendation
            };
            
            html += `<span class="text-highlight ${category} interactive-highlight" 
                          data-highlight-index="${pos.highlightIndex}"
                          data-tooltip='${JSON.stringify(tooltipData).replace(/'/g, "&apos;")}'
                          onmouseover="showHighlightTooltip(event, this)"
                          onmouseout="hideHighlightTooltip()"
                          title="${escapeHtml(pos.highlight.explanation || 'Проблемний фрагмент')}">${escapeHtml(pos.actualText)}</span>`;
            
            currentPos = pos.end;
        });
        
        // Add remaining plain text
        if (currentPos < originalText.length) {
            html += escapeHtml(originalText.substring(currentPos));
        }
        
        console.log(`🔥 Generated HTML with ${cleanedHighlights.length} highlighted segments`);
        console.log('🔥 ========== HIGHLIGHTING COMPLETE ==========');
        
        return `<div class="text-content">${html}</div>`;
    }
    
    // Simplified helper function for category CSS classes
    function getCategoryClass(category) {
        const categoryMap = {
            'manipulation': 'manipulation',
            'cognitive_bias': 'bias',
            'social_manipulation': 'manipulation',
            'rhetological_fallacy': 'fallacy',
            'rhetorical_fallacy': 'fallacy',
            'logical_fallacy': 'fallacy'
        };
        return categoryMap[category] || 'manipulation';
    }

    // Get category label in Ukrainian
    function getCategoryLabel(category) {
        const labelMap = {
            'manipulation': 'Маніпуляція',
            'cognitive_bias': 'Когнітивне викривлення',
            'social_manipulation': 'Соціальна маніпуляція',
            'rhetological_fallacy': 'Риторичний софізм',
            'rhetorical_fallacy': 'Риторичний софізм',
            'logical_fallacy': 'Логічна помилка'
        };
        return labelMap[category] || 'Проблемний фрагмент';
    }
    
    function escapeRegExp(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    // ===== Interactive Highlight Tooltips =====
    let highlightTooltip = null;
    let tooltipTimeout = null;

    function showHighlightTooltip(event, element) {
        // Clear any existing timeout
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
            tooltipTimeout = null;
        }

        try {
            const tooltipData = JSON.parse(element.dataset.tooltip.replace(/&apos;/g, "'"));
            
            // Remove existing tooltip
            if (highlightTooltip) {
                highlightTooltip.remove();
            }

            // Create tooltip element
            highlightTooltip = document.createElement('div');
            highlightTooltip.className = 'highlight-tooltip';
            highlightTooltip.innerHTML = `
                <div class="tooltip-header">
                    <div class="tooltip-category ${getCategoryClass(tooltipData.category)}">
                        ${tooltipData.title}
                    </div>
                    <div class="tooltip-severity severity-${tooltipData.severity}">
                        Рівень ${tooltipData.severity}
                    </div>
                </div>
                <div class="tooltip-content">
                    <div class="tooltip-explanation">
                        ${escapeHtml(tooltipData.explanation || 'Опис недоступний')}
                    </div>
                    ${tooltipData.recommendation ? `
                        <div class="tooltip-recommendation">
                            <i class="fas fa-lightbulb"></i>
                            <span>${escapeHtml(tooltipData.recommendation)}</span>
                        </div>
                    ` : ''}
                </div>
                <div class="tooltip-arrow"></div>
            `;

            // Position tooltip
            document.body.appendChild(highlightTooltip);
            
            // Position calculation with screen bounds check
            const rect = element.getBoundingClientRect();
            const tooltipRect = highlightTooltip.getBoundingClientRect();
            
            let left = rect.left + (rect.width / 2) - (tooltipRect.width / 2);
            let top = rect.top - tooltipRect.height - 10;
            
            // Adjust for screen bounds
            if (left < 10) left = 10;
            if (left + tooltipRect.width > window.innerWidth - 10) {
                left = window.innerWidth - tooltipRect.width - 10;
            }
            
            // If tooltip would go above screen, show below instead
            if (top < 10) {
                top = rect.bottom + 10;
                highlightTooltip.classList.add('tooltip-below');
            }
            
            highlightTooltip.style.left = left + 'px';
            highlightTooltip.style.top = top + 'px';
            
            // Fade in
            setTimeout(() => {
                if (highlightTooltip) {
                    highlightTooltip.classList.add('tooltip-visible');
                }
            }, 10);

        } catch (error) {
            console.error('Error showing tooltip:', error);
        }
    }

    function hideHighlightTooltip() {
        if (tooltipTimeout) {
            clearTimeout(tooltipTimeout);
        }
        
        tooltipTimeout = setTimeout(() => {
            if (highlightTooltip) {
                highlightTooltip.classList.remove('tooltip-visible');
                setTimeout(() => {
                    if (highlightTooltip) {
                        highlightTooltip.remove();
                        highlightTooltip = null;
                    }
                }, 200);
            }
        }, 100); // Small delay to prevent flickering when moving between highlight elements
    }

    // Make functions globally available
    window.showHighlightTooltip = showHighlightTooltip;
    window.hideHighlightTooltip = hideHighlightTooltip;

    // ===== REAL-TIME ANALYSIS DISPLAY FUNCTIONS =====
    function addHighlightToDisplayRealTime(highlight, index) {
        console.log('⚡ Adding highlight to display in real-time:', highlight);
        
        const highlightsList = document.getElementById('highlights-list');
        if (!highlightsList) return;
        
        // Remove empty state if it exists
        const emptyState = highlightsList.querySelector('.empty-state');
        if (emptyState) {
            emptyState.remove();
        }
        
        // Create new highlight item
        const highlightItem = document.createElement('div');
        highlightItem.className = 'highlight-item new-highlight';
        highlightItem.setAttribute('data-highlight-index', index);
        highlightItem.setAttribute('draggable', 'true');
        highlightItem.setAttribute('data-highlight-id', index);
        
        const category = getCategoryClass(highlight.category || 'manipulation');
        const categoryLabel = getCategoryLabel(highlight.category || 'manipulation');
        
        highlightItem.innerHTML = `
            <div class="highlight-header">
                <div class="highlight-type ${category}">
                    ${categoryLabel}
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
            <div class="highlight-text">"${escapeHtml(highlight.text || '')}"</div>
            <div class="highlight-explanation">
                ${escapeHtml(highlight.explanation || highlight.description || 'Проблемний фрагмент')}
            </div>
            ${highlight.recommendation ? `
                <div class="highlight-recommendation">
                    <i class="fas fa-lightbulb"></i>
                    ${escapeHtml(highlight.recommendation)}
                </div>
            ` : ''}
        `;
        
        // Add with animation
        highlightItem.style.opacity = '0';
        highlightItem.style.transform = 'translateY(-20px)';
        highlightsList.appendChild(highlightItem);
        
        // Animate in
        setTimeout(() => {
            highlightItem.style.transition = 'all 0.5s ease';
            highlightItem.style.opacity = '1';
            highlightItem.style.transform = 'translateY(0)';
            
            // Remove new-highlight class after animation
            setTimeout(() => {
                highlightItem.classList.remove('new-highlight');
            }, 500);
        }, 50);
    }

    function updateFullTextHighlightingRealTime(highlights) {
        console.log('⚡ Updating full text highlighting in real-time');
        
        if (!state.originalText) return;
        
        // Generate new highlighted text
        const highlightedHTML = generateHighlightedTextNew(state.originalText, highlights);
        
        // Update full text content
        const fulltextContent = document.getElementById('fulltext-content');
        if (fulltextContent) {
            fulltextContent.innerHTML = `
                <div class="fulltext-container">
                    <div class="fulltext-header">
                        <h4><i class="fas fa-file-text"></i> Повний текст з підсвічуванням проблем</h4>
                        <span class="highlights-count">${highlights.length} проблем знайдено</span>
                    </div>
                    <div class="fulltext-body">
                        ${highlightedHTML}
                    </div>
                </div>
            `;
        }
    }

    // ===== View Controls =====
    function switchHighlightsView(view) {
        console.log('🔥 ===== SWITCH HIGHLIGHTS VIEW CALLED =====');
        console.log('🔍 Switching highlights view to:', view);
        console.log('🔍 Available elements:', {
            listView: !!elements.listView,
            textView: !!elements.textView,
            highlightsView: !!elements.highlightsView,
            filterView: !!elements.filterView,
            highlightsList: !!elements.highlightsList,
            fulltextContent: !!elements.fulltextContent
        });
        
        state.ui.highlightsView = view;
        
        // Update button states
        elements.listView?.classList.toggle('active', view === 'list');
        elements.textView?.classList.toggle('active', view === 'text');
        elements.highlightsView?.classList.toggle('active', view === 'highlights');
        elements.filterView?.classList.toggle('active', view === 'filter');
        
        // Show/hide content panels
        if (elements.highlightsList) {
            elements.highlightsList.style.display = view === 'list' ? 'block' : 'none';
        }
        if (elements.fulltextContent) {
            elements.fulltextContent.style.display = view === 'text' ? 'block' : 'none';
            
            // Always update full text view when switching to text view
            if (view === 'text') {
                console.log('🔍 Switching to text view, force updating content');
                
                // Priority 1: Use cached highlighted text
                if (state.currentAnalysis?.highlighted_text) {
                    console.log('🔍 Using cached highlighted text');
                    updateFullTextView(state.currentAnalysis.highlighted_text);
                }
                // Priority 2: Generate from highlights and original text
                else if (state.currentAnalysis?.highlights && (state.originalText || state.currentAnalysis?.original_text)) {
                    console.log('🔍 Generating highlighted text from analysis data');
                    const originalTextToUse = state.originalText || state.currentAnalysis.original_text;
                    const highlightedText = generateHighlightedTextNew(originalTextToUse, state.currentAnalysis.highlights);
                    
                    // Cache the generated text
                    if (state.currentAnalysis) {
                        state.currentAnalysis.highlighted_text = highlightedText;
                    }
                    
                    updateFullTextView(highlightedText);
                }
                // Priority 3: Show original text if available
                else if (state.originalText || state.currentAnalysis?.original_text) {
                    console.log('🔍 Showing original text without highlights');
                    updateFullTextView(null);
                }
                // Priority 4: Show empty state
                else {
                    console.log('🔍 No text available, showing empty state');
                    updateFullTextView(null);
                }
            }
        }
        if (elements.fragmentsContent) {
            elements.fragmentsContent.style.display = view === 'highlights' ? 'block' : 'none';
            
            // Update fragments view when switching to highlights view
            if (view === 'highlights' && state.currentAnalysis?.highlights) {
                console.log('🔍 Updating fragments view with highlights');
                updateFragmentsView(state.currentAnalysis.highlights);
            }
        }
        if (elements.filtersPanel) {
            elements.filtersPanel.style.display = view === 'filter' ? 'block' : 'none';
        }
        
        console.log('🔍 View switch completed, current view:', view);
    }

    function updateFragmentsView(highlights) {
        if (!elements.fragmentsContent) return;
        
        if (!highlights || highlights.length === 0) {
            elements.fragmentsContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-highlighter"></i></div>
                    <p>Виділені маніпулятивні фрагменти з'являться тут після аналізу</p>
                </div>
            `;
            return;
        }
        
        // Apply filters if they exist
        const filteredHighlights = filterHighlights(highlights);
        
        if (filteredHighlights.length === 0) {
            elements.fragmentsContent.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon"><i class="fas fa-filter"></i></div>
                    <p>Жодних фрагментів не знайдено за вашими фільтрами</p>
                    <button class="btn-secondary btn-sm" data-action="clear-filters">Очистити фільтри</button>
                </div>
            `;
            return;
        }
        
        // Sort highlights by severity (high to low)
        const sortedHighlights = [...filteredHighlights].sort((a, b) => 
            (b.severity || 2) - (a.severity || 2)
        );
        
        elements.fragmentsContent.innerHTML = sortedHighlights.map(highlight => {
            const categoryClass = getCategoryClass(highlight.category);
            const categoryLabel = getCategoryLabel(highlight.category);
            const severityText = getSeverityText(highlight.severity);
            
            return `
                <div class="fragment-item" data-category="${highlight.category}">
                    <div class="fragment-header">
                        <div class="fragment-category ${categoryClass}">
                            <i class="fas ${getCategoryIcon(highlight.category)}"></i>
                            ${categoryLabel}
                        </div>
                        <div class="highlight-severity">${severityText}</div>
                    </div>
                    <div class="fragment-text">
                        "${escapeHtml(highlight.text)}"
                    </div>
                    <div class="fragment-explanation">
                        <strong>${escapeHtml(highlight.label || highlight.title || 'Проблемний момент')}:</strong>
                        ${escapeHtml(highlight.explanation || 'Пояснення недоступне')}
                        ${highlight.suggestion ? `<br><br><strong>Рекомендація:</strong> ${escapeHtml(highlight.suggestion)}` : ''}
                    </div>
                    <div class="fragment-actions">
                        <button class="btn-icon add-fragment-btn" data-fragment='${JSON.stringify(highlight).replace(/'/g, "&#39;")}' title="Додати до робочої області">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn-icon copy-fragment-btn" data-text="${escapeHtml(highlight.text)}" title="Скопіювати текст">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                </div>
            `;
        }).join('');
        
        // Add event listeners
        elements.fragmentsContent.querySelectorAll('.add-fragment-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const fragment = JSON.parse(e.target.closest('.add-fragment-btn').dataset.fragment);
                addToSelectedFragments(fragment);
            });
        });
        
        elements.fragmentsContent.querySelectorAll('.copy-fragment-btn').forEach(btn => {
            btn.addEventListener('click', async (e) => {
                e.preventDefault();
                const text = e.target.closest('.copy-fragment-btn').dataset.text;
                try {
                    await navigator.clipboard.writeText(text);
                    showNotification('Фрагмент скопійовано в буфер обміну', 'success');
                } catch (err) {
                    showNotification('Помилка копіювання', 'error');
                }
            });
        });
    }
    
    function getCategoryLabel(category) {
        const labels = {
            'manipulation': 'Маніпуляція',
            'cognitive_bias': 'Когнітивне викривлення',
            'rhetological_fallacy': 'Софізм',
            'logical_fallacy': 'Логічна помилка'
        };
        return labels[category] || 'Проблемний момент';
    }
    
    function getCategoryIcon(category) {
        const icons = {
            'manipulation': 'fa-exclamation-triangle',
            'cognitive_bias': 'fa-brain',
            'rhetological_fallacy': 'fa-comments',
            'logical_fallacy': 'fa-times-circle'
        };
        return icons[category] || 'fa-exclamation-triangle';
    }
    
    function getSeverityText(severity) {
        const severities = {
            1: 'Легкий',
            2: 'Помірний', 
            3: 'Серйозний'
        };
        return severities[severity] || 'Помірний';
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
            if (elements.fragmentsContent) elements.fragmentsContent.style.display = 'none';
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

    function toggleMobileMenu() {
        const isActive = elements.sidebarLeft.classList.contains('active');
        
        if (isActive) {
            // Close mobile menu
            elements.sidebarLeft.classList.remove('active');
            document.body.classList.remove('mobile-menu-open');
        } else {
            // Open mobile menu
            elements.sidebarLeft.classList.add('active');
            document.body.classList.add('mobile-menu-open');
        }
        
        // Update mobile menu toggle icon
        const icon = elements.mobileMenuToggle?.querySelector('i');
        if (icon) {
            icon.className = isActive ? 'fas fa-bars' : 'fas fa-times';
        }
        
        console.log('📱 Mobile menu', isActive ? 'closed' : 'opened');
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
                <button class="fragment-remove" 
                        data-action="remove-from-workspace" 
                        data-id="${fragment.id}" 
                        title="Видалити">
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
            
            // Save recommendation to new history system
            if (state.currentClient) {
                let adviceText = '';
                if (typeof advice === 'string') {
                    adviceText = advice;
                } else if (advice && typeof advice === 'object') {
                    // Extract text from structured advice object
                    const parts = [];
                    if (advice.recommended_replies) {
                        parts.push('РЕКОМЕНДОВАНІ ВІДПОВІДІ:\n' + advice.recommended_replies.join('\n• '));
                    }
                    if (advice.strategies) {
                        parts.push('СТРАТЕГІЇ:\n' + advice.strategies.join('\n• '));
                    }
                    if (advice.warnings) {
                        parts.push('ПОПЕРЕДЖЕННЯ:\n' + advice.warnings.join('\n• '));
                    }
                    if (advice.next_steps) {
                        parts.push('НАСТУПНІ КРОКИ:\n' + advice.next_steps.join('\n• '));
                    }
                    adviceText = parts.join('\n\n');
                }
                
                if (adviceText) {
                    saveRecommendation(state.currentClient.id, adviceText, state.selectedFragments.length);
                }
            }
            
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

    // ===== Product Switcher =====
    function toggleProductDropdown(e) {
        e.stopPropagation();
        const isOpen = elements.productDropdown.style.display === 'block';
        
        if (isOpen) {
            closeProductDropdown();
        } else {
            openProductDropdown();
        }
    }
    
    function openProductDropdown() {
        elements.productDropdown.style.display = 'block';
        elements.productDropdownBtn.classList.add('active');
    }
    
    function closeProductDropdown() {
        elements.productDropdown.style.display = 'none';
        elements.productDropdownBtn.classList.remove('active');
    }

    // Legacy global functions removed - now using event delegation

    // ===== LEGACY FUNCTION REMOVED =====
    // Old bindEvents function removed - now using unified event system

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
            console.log('🔄 Loading analysis history for client:', clientId);
            const response = await fetch(`/api/clients/${clientId}`);
            const data = await response.json();
            
            if (data.success && data.analyses) {
                console.log('📊 ✅ Received', data.analyses.length, 'analyses from server');
                state.analyses = data.analyses; // Store in state
                renderAnalysisHistory(data.analyses);
                
                // Auto-load latest analysis if available and no current analysis
                if (data.analyses.length > 0 && !state.currentAnalysis) {
                    const latestAnalysis = data.analyses[0];
                    console.log('📊 Auto-loading latest analysis:', latestAnalysis.id);
                    await loadAnalysis(latestAnalysis.id);
                }
            } else {
                console.log('📊 No analyses found for client');
                state.analyses = [];
                renderAnalysisHistory([]);
            }
        } catch (error) {
            console.error('Failed to load analysis history:', error);
            state.analyses = [];
            renderAnalysisHistory([]);
        }
    }

    async function loadAnalysisHistoryAndLatest(clientId) {
        try {
            const response = await fetch(`/api/clients/${clientId}`);
            const data = await response.json();
            
            if (data.success && data.analyses) {
                console.log('📊 Loading history and latest - received', data.analyses.length, 'analyses');
                state.analyses = data.analyses; // Store in state
                renderAnalysisHistory(data.analyses);
                
                // If there are analyses, automatically load the latest one
                if (data.analyses.length > 0) {
                    const latestAnalysis = data.analyses[0]; // Analyses should be sorted by date descending
                    await loadAnalysis(latestAnalysis.id);
                } else {
                    // No analyses for this client - show clean dashboard state but preserve UI
                    console.log('🔍 No analyses found for current client - showing empty state');
                    state.currentAnalysis = null;
                    state.originalText = '';
                    state.selectedFragments = [];
                    
                    // Clear text input only
                    if (elements.negotiationText) {
                        elements.negotiationText.value = '';
                        updateTextStats();
                    }
                    
                    // Show empty highlights
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
                    
                    // Update workspace but DON'T reset counters and barometer
                    updateWorkspaceFragments();
                    updateWorkspaceActions();
                    updateAnalysisSteps('input');
                    
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

        const count = analyses ? analyses.length : 0;
        console.log('📊 Updating analysis count:', count);
        
        // Force find element every time to ensure it exists
        const analysisCountElement = document.getElementById('analysis-count');
        if (analysisCountElement) {
            analysisCountElement.textContent = count;
            console.log('📊 ✅ Analysis count updated to:', count);
            elements.analysisCount = analysisCountElement; // Cache it
        } else {
            console.error('📊 ❌ Analysis count element #analysis-count not found in DOM');
            // Try to find all fragment counters and update the second one
            const counters = document.querySelectorAll('.fragment-counter');
            if (counters.length > 1) {
                counters[1].textContent = count;
                console.log('📊 ✅ Updated via alternative selector (second counter)');
            }
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

        // Group analyses by date for better navigation
        const groupedAnalyses = groupAnalysesByDate(analyses);
        
        elements.analysisHistory.innerHTML = Object.entries(groupedAnalyses).map(([dateGroup, groupAnalyses]) => `
            <div class="analysis-date-group">
                <div class="date-group-header">
                    <span class="date-group-label">${dateGroup}</span>
                    <span class="date-group-count">${groupAnalyses.length}</span>
                </div>
                <div class="analysis-group">
                    ${groupAnalyses.map((analysis, index) => {
                        const isLatest = analysis.id === analyses[0]?.id;
                        const date = new Date(analysis.created_at);
                        const timeAgo = getTimeAgo(date);
                        
                        // Calculate issues count from highlights
                        let issuesCount = 0;
                        
                        // First try to get from analysis.issues_count
                        if (analysis.issues_count && analysis.issues_count > 0) {
                            issuesCount = analysis.issues_count;
                        } 
                        // Then try to parse highlights array
                        else if (analysis.highlights && Array.isArray(analysis.highlights)) {
                            issuesCount = analysis.highlights.length;
                        }
                        // Finally try to parse highlights_json string
                        else if (analysis.highlights_json) {
                            try {
                                const highlights = JSON.parse(analysis.highlights_json);
                                if (Array.isArray(highlights)) {
                                    issuesCount = highlights.length;
                                }
                            } catch (e) {
                                console.warn('Failed to parse highlights_json:', e);
                            }
                        }
                        
                        // Calculate complexity score from barometer if not provided
                        let complexityScore = analysis.complexity_score || 0;
                        if (complexityScore === 0 && analysis.barometer?.score) {
                            complexityScore = analysis.barometer.score;
                        }
                        
                        // Generate category breakdown for issues
                        let categoryBreakdown = '';
                        if (analysis.highlights && Array.isArray(analysis.highlights)) {
                            const categories = {};
                            analysis.highlights.forEach(h => {
                                categories[h.category] = (categories[h.category] || 0) + 1;
                            });
                            
                            const categoryLabels = {
                                'manipulation': 'Маніп.',
                                'cognitive_bias': 'Викрив.',
                                'rhetorical_fallacy': 'Софізми'
                            };
                            
                            categoryBreakdown = Object.entries(categories)
                                .map(([cat, count]) => `${categoryLabels[cat] || cat}: ${count}`)
                                .join(' • ');
                        }
                        
                        return `
                            <div class="analysis-history-item ${isLatest ? 'latest' : ''} ${state.currentAnalysis?.id === analysis.id ? 'active' : ''}" 
                                 data-action="load-analysis" 
                                 data-id="${analysis.id}"
                                 title="Натисніть для перегляду аналізу">
                                <div class="analysis-header">
                                    <div class="analysis-date">
                                        ${isLatest ? '<i class="fas fa-star latest-badge" title="Найновіший"></i> ' : ''}
                                        <span class="time-label">${date.toLocaleTimeString('uk-UA', { hour: '2-digit', minute: '2-digit' })}</span>
                                        ${state.currentAnalysis?.id === analysis.id ? '<i class="fas fa-eye current-indicator" title="Поточний аналіз"></i>' : ''}
                                    </div>
                                    <div class="analysis-actions">
                                        <button class="btn-micro btn-duplicate" data-action="duplicate-analysis" data-id="${analysis.id}" title="Дублювати аналіз">
                                            <i class="fas fa-copy"></i>
                                        </button>
                                        <button class="btn-micro btn-delete" data-action="delete-analysis" data-id="${analysis.id}" title="Видалити аналіз">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                                <div class="analysis-preview">
                                    ${escapeHtml(analysis.text_preview || 'Аналіз переговорів')}
                                </div>
                                <div class="analysis-stats">
                                    <div class="primary-stats">
                                        <span class="stat-item issues ${issuesCount > 0 ? 'has-issues' : ''}">
                                            <i class="fas fa-exclamation-triangle"></i>
                                            <span class="stat-number">${issuesCount}</span>
                                            <span class="stat-label">проблем</span>
                                        </span>
                                        <span class="stat-item complexity complexity-${getComplexityLevel(complexityScore)}">
                                            <i class="fas fa-tachometer-alt"></i>
                                            <span class="stat-number">${complexityScore}</span>
                                            <span class="stat-label">/100</span>
                                        </span>
                                    </div>
                                    ${categoryBreakdown ? `<div class="category-breakdown">${categoryBreakdown}</div>` : ''}
                                </div>
                            </div>
                        `;
                    }).join('')}
                </div>
            </div>
        `).join('');
    }

    function groupAnalysesByDate(analyses) {
        const groups = {};
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        
        analyses.forEach(analysis => {
            const date = new Date(analysis.created_at);
            const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            
            let groupKey;
            if (dateOnly.getTime() === today.getTime()) {
                groupKey = 'Сьогодні';
            } else if (dateOnly.getTime() === yesterday.getTime()) {
                groupKey = 'Вчора';
            } else if (now - dateOnly <= 7 * 24 * 60 * 60 * 1000) {
                groupKey = date.toLocaleDateString('uk-UA', { weekday: 'long' });
            } else if (date.getFullYear() === now.getFullYear()) {
                groupKey = date.toLocaleDateString('uk-UA', { month: 'long', day: 'numeric' });
            } else {
                groupKey = date.toLocaleDateString('uk-UA', { year: 'numeric', month: 'long' });
            }
            
            if (!groups[groupKey]) {
                groups[groupKey] = [];
            }
            groups[groupKey].push(analysis);
        });
        
        return groups;
    }

    function getTimeAgo(date) {
        const now = new Date();
        const diffInMilliseconds = now - date;
        const diffInMinutes = Math.floor(diffInMilliseconds / (1000 * 60));
        
        if (diffInMinutes < 1) return 'Щойно';
        if (diffInMinutes === 1) return '1 хв тому';
        if (diffInMinutes < 60) return `${diffInMinutes} хв тому`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours === 1) return '1 год тому';
        if (diffInHours < 24) return `${diffInHours} год тому`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays === 1) return 'Вчора';
        if (diffInDays < 7) return `${diffInDays} дн тому`;
        
        // For older dates, show formatted date with time
        const options = { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        };
        return date.toLocaleDateString('uk-UA', options);
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
            const response = await fetch(`/api/clients/${state.currentClient.id}/analysis/${analysisId}`);
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
            
            // Update displays with loaded analysis using displayAnalysisResults
            displayAnalysisResults(data.analysis);
            
            // Update full text view with highlighting
            if (data.analysis.highlighted_text) {
                console.log('🔍 Loading analysis with pre-generated highlighted text');
                updateFullTextView(data.analysis.highlighted_text);
            } else if (data.analysis.highlights && (state.originalText || data.analysis.original_text)) {
                console.log('🔍 Generating highlighted text from highlights and original text');
                const originalTextToUse = state.originalText || data.analysis.original_text;
                const highlightedText = generateHighlightedTextNew(originalTextToUse, data.analysis.highlights);
                updateFullTextView(highlightedText);
                
                // Also store it in current analysis for future use
                state.currentAnalysis.highlighted_text = highlightedText;
                state.currentAnalysis.original_text = originalTextToUse;
            } else {
                console.log('🔍 No highlighting data available, showing plain text');
                updateFullTextView(escapeHtml(state.originalText || data.analysis.original_text || ''));
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

    // ===== Legacy Code Cleanup =====
    // All global functions removed - using centralized event delegation system
    // Debug functions removed - using modern event handling

    // ===== State Persistence =====
    function saveAppState() {
        const appState = {
            currentClient: state.currentClient,
            currentAnalysis: state.currentAnalysis,
            selectedFragments: state.selectedFragments,
            recommendationsHistory: state.recommendationsHistory,
            originalText: state.originalText,
            ui: state.ui,
            clients: state.clients, // Include clients for backup
            tokenUsage: state.tokenUsage,
            timestamp: new Date().toISOString(),
            version: '1.0' // For future migration compatibility
        };
        
        try {
            const serialized = JSON.stringify(appState);
            
            // Check localStorage availability and space
            if (typeof Storage === "undefined") {
                throw new Error('LocalStorage не підтримується');
            }
            
            // Try to save main state
            localStorage.setItem('teampulse-app-state', serialized);
            
            // Create rotating backup (keep last 3 saves)
            const backupKey = `teampulse-backup-${Date.now() % 3}`;
            localStorage.setItem(backupKey, serialized);
            
            // Clean old backups
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);
                if (key && key.startsWith('teampulse-backup-') && 
                    !['teampulse-backup-0', 'teampulse-backup-1', 'teampulse-backup-2'].includes(key)) {
                    localStorage.removeItem(key);
                }
            }
            
        } catch (e) {
            console.warn('Failed to save app state:', e);
            
            // Try to free up space by removing old data
            try {
                const keysToRemove = [];
                for (let i = 0; i < localStorage.length; i++) {
                    const key = localStorage.key(i);
                    if (key && (key.startsWith('teampulse-old-') || key.includes('temp'))) {
                        keysToRemove.push(key);
                    }
                }
                keysToRemove.forEach(key => localStorage.removeItem(key));
                
                // Try saving again
                localStorage.setItem('teampulse-app-state', JSON.stringify(appState));
            } catch (e2) {
                showNotification('Помилка збереження даних. Місце на диску вичерпано.', 'error');
            }
        }
    }

    function loadAppState() {
        let appState = null;
        let attempts = 0;
        
        // Try to load main state, then backups if main fails
        const stateKeys = ['teampulse-app-state', 'teampulse-backup-0', 'teampulse-backup-1', 'teampulse-backup-2'];
        
        for (const key of stateKeys) {
            attempts++;
            try {
                const savedState = localStorage.getItem(key);
                if (!savedState) continue;
                
                const parsedState = JSON.parse(savedState);
                
                // Validate required properties
                if (!parsedState.timestamp) continue;
                
                // Check if state is not too old (max 7 days for backups, 24 hours for main)
                const savedTime = new Date(parsedState.timestamp);
                const now = new Date();
                const hoursDiff = (now - savedTime) / (1000 * 60 * 60);
                const maxAge = key === 'teampulse-app-state' ? 24 : 168; // 7 days for backups
                
                if (hoursDiff > maxAge) {
                    if (key === 'teampulse-app-state') {
                        localStorage.removeItem(key);
                    }
                    continue;
                }
                
                // Found valid state
                appState = parsedState;
                if (key !== 'teampulse-app-state') {
                    console.log(`🔄 Recovered from backup: ${key}`);
                    showNotification('Відновлено з резервної копії', 'success');
                }
                break;
                
            } catch (e) {
                console.warn(`Failed to load state from ${key}:`, e);
                continue;
            }
        }
        
        if (!appState) {
            console.log('No valid app state found');
            return false;
        }
        
        try {
            // Safely restore state with validation
            
            // Restore client info
            if (appState.currentClient && typeof appState.currentClient === 'object') {
                state.currentClient = appState.currentClient;
                try {
                    updateNavClientInfo(state.currentClient);
                    updateWorkspaceClientInfo(state.currentClient);
                } catch (e) {
                    console.warn('Error updating client info:', e);
                }
            }
            
            // Restore clients list if available
            if (appState.clients && Array.isArray(appState.clients)) {
                state.clients = appState.clients;
            }
            
            // Restore token usage if available
            if (appState.tokenUsage && typeof appState.tokenUsage === 'object') {
                state.tokenUsage = { ...state.tokenUsage, ...appState.tokenUsage };
                updateTokenDisplay();
            }
            
            // Restore analysis
            if (appState.currentAnalysis && typeof appState.currentAnalysis === 'object') {
                state.currentAnalysis = appState.currentAnalysis;
                if (appState.originalText && typeof appState.originalText === 'string') {
                    state.originalText = appState.originalText;
                }
                
                // Restore analysis UI safely
                try {
                    if (elements.negotiationText) {
                        elements.negotiationText.value = state.originalText || '';
                        updateTextStats();
                    }
                    
                    if (elements.resultsSection) {
                        elements.resultsSection.style.display = 'block';
                    }
                    
                    // Restore displays with error handling
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
                } catch (e) {
                    console.warn('Error restoring analysis UI:', e);
                }
            }
            
            // Restore selected fragments
            if (appState.selectedFragments && Array.isArray(appState.selectedFragments)) {
                state.selectedFragments = appState.selectedFragments;
                try {
                    updateWorkspaceFragments();
                    updateWorkspaceActions();
                } catch (e) {
                    console.warn('Error updating workspace fragments:', e);
                }
            }
            
            // Restore recommendations history
            if (appState.recommendationsHistory && typeof appState.recommendationsHistory === 'object') {
                state.recommendationsHistory = appState.recommendationsHistory;
            }
            
            // Restore UI state
            if (appState.ui && typeof appState.ui === 'object') {
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

    // Re-initialize DOM elements (in case they weren't available during initial load)
    function reinitializeElements() {
        // Re-initialize key elements that might have been null
        Object.assign(elements, {
            // Layout
            sidebarLeft: $('#sidebar-left'),
            sidebarRight: $('#sidebar-right'),
            mainContent: $('#main-content'),
            sidebarRightToggle: $('#sidebar-right-toggle'),
            mobileMenuToggle: $('#mobile-menu-toggle'),
            workspaceToggle: $('#workspace-toggle'),
            
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
            startAnalysisBtn: $('#start-analysis-btn'),
            newAnalysisBtn: $('#new-analysis-btn'),
            negotiationText: $('#negotiation-text'),
            charCount: $('#char-count'),
            wordCount: $('#word-count'),
            
            // Statistics
            manipulationsCount: $('#manipulations-count'),
            biasesCount: $('#biases-count'),
            fallaciesCount: $('#fallacies-count'),
            recommendationsCount: $('#recommendations-count'),
            
            // Analysis History
            analysisCount: $('#analysis-count'),
            
            // Workspace
            fragmentsCount: $('#fragments-count'),
            getAdviceBtn: $('#get-advice-btn'),
            exportSelectedBtn: $('#export-selected-btn'),
            clearWorkspaceBtn: $('#clear-workspace-btn')
        });
    }

    // ===== UNIFIED EVENT SYSTEM =====
    function initializeUnifiedEventSystem() {
        console.log('🎯 Initializing unified event system...');
        
        // Part 1: Direct event handlers for static elements
        bindStaticEvents();
        
        // Part 2: Event delegation for dynamic elements
        initializeDynamicEventDelegation();
        
        console.log('🎯 Unified event system initialized');
        
        // CRITICAL FIX: Expose functions globally for debugging and testing
        window.TeamPulseDebug = {
            showClientForm,
            startAnalysis,
            saveClient,
            state,
            elements,
            switchHighlightsView,
            toggleSidebar,
            toggleMobileMenu,
            // Test functions
            testShowClientForm: () => {
                console.log('🧪 TEST: Calling showClientForm...');
                showClientForm();
            },
            testStartAnalysis: () => {
                console.log('🧪 TEST: Calling startAnalysis...');
                startAnalysis();
            }
        };
        
        console.log('🔧 TeamPulseDebug functions exposed globally:', Object.keys(window.TeamPulseDebug));
    }
    
    function bindStaticEvents() {
        console.log('🔥 Binding static element events...');
        
        // Core UI elements that are always present
        const staticBindings = [
            { element: elements.mobileMenuToggle, event: 'click', handler: toggleMobileMenu, name: 'Mobile menu toggle' },
            { element: elements.sidebarRightToggle, event: 'click', handler: () => toggleSidebar('right'), name: 'Right sidebar toggle' },
            { element: elements.workspaceToggle, event: 'click', handler: () => toggleSidebar('right'), name: 'Workspace toggle' },
            { element: elements.newClientBtn, event: 'click', handler: showClientForm, name: 'New client button' },
            { element: elements.welcomeNewClient, event: 'click', handler: showClientForm, name: 'Welcome new client button' },
            { element: elements.saveClientBtn, event: 'click', handler: saveClient, name: 'Save client button' },
            { element: elements.cancelClientBtn, event: 'click', handler: () => showSection('welcome-screen'), name: 'Cancel client button' },
            { element: elements.startAnalysisBtn, event: 'click', handler: startAnalysis, name: 'Start analysis button' },
            { element: elements.newAnalysisBtn, event: 'click', handler: createNewAnalysis, name: 'New analysis button' },
            { element: elements.listView, event: 'click', handler: () => switchHighlightsView('list'), name: 'List view button' },
            { element: elements.textView, event: 'click', handler: () => switchHighlightsView('text'), name: 'Text view button' },
            { element: elements.highlightsView, event: 'click', handler: () => switchHighlightsView('highlights'), name: 'Highlights view button' },
            { element: elements.filterView, event: 'click', handler: () => toggleFilters(), name: 'Filter view button' },
            { element: elements.getAdviceBtn, event: 'click', handler: getPersonalizedAdvice, name: 'Get advice button' },
            { element: elements.exportSelectedBtn, event: 'click', handler: exportSelectedFragments, name: 'Export selected button' },
            { element: elements.clearWorkspaceBtn, event: 'click', handler: clearWorkspace, name: 'Clear workspace button' },
            { element: elements.clearFiltersBtn, event: 'click', handler: clearFilters, name: 'Clear filters button' },
            { element: elements.applyFiltersBtn, event: 'click', handler: applyFilters, name: 'Apply filters button' },
        ];
        
        let boundCount = 0;
        staticBindings.forEach(({ element, event, handler, name }) => {
            if (element) {
                element.addEventListener(event, (e) => {
                    console.log(`🔥 STATIC EVENT: ${name} clicked`);
                    console.log(`🔥 Handler function:`, handler);
                    console.log(`🔥 Element:`, element);
                    try {
                        handler(e);
                        console.log(`🔥 ✅ ${name} handler executed successfully`);
                    } catch (error) {
                        console.error(`🔥 ❌ ${name} handler failed:`, error);
                    }
                });
                boundCount++;
                console.log(`🔥 ✅ ${name} - bound successfully`);
            } else {
                console.log(`🔥 ❌ ${name} - element not found`);
            }
        });
        
        // Input events
        if (elements.clientSearch) {
            elements.clientSearch.addEventListener('input', debounce(renderClientsList, 300));
            console.log('🔥 ✅ Client search input - bound successfully');
        }
        
        if (elements.negotiationText) {
            elements.negotiationText.addEventListener('input', debouncedUpdateTextStats);
            console.log('🔥 ✅ Negotiation text input - bound successfully');
        }
        
        // Special handlers
        $('#help-toggle')?.addEventListener('click', showOnboarding);
        $('#logout-btn')?.addEventListener('click', () => {
            if (confirm('Ви впевнені, що хочете вийти із системи?')) {
                if (window.logout) {
                    window.logout();
                } else {
                    localStorage.clear();
                    sessionStorage.clear();
                    window.location.href = '/login.html';
                }
            }
        });
        
        // Additional UI handlers
        elements.textMethod?.addEventListener('click', () => updateInputMethod('text'));
        elements.fileMethod?.addEventListener('click', () => updateInputMethod('file'));
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
        
        // Onboarding handlers
        elements.welcomeHelp?.addEventListener('click', showOnboarding);
        elements.skipOnboarding?.addEventListener('click', completeOnboarding);
        elements.nextStep?.addEventListener('click', nextOnboardingStep);
        elements.prevStep?.addEventListener('click', prevOnboardingStep);
        
        // Product switcher
        elements.productDropdownBtn?.addEventListener('click', toggleProductDropdown);
        
        // Global handlers
        document.addEventListener('click', (e) => {
            // Close product dropdown when clicking outside
            if (!e.target.closest('.product-switcher')) {
                closeProductDropdown();
            }
            
            // Close mobile menu when clicking outside
            if (document.body.classList.contains('mobile-menu-open')) {
                if (!e.target.closest('.sidebar-left') || 
                    e.target.closest('[data-action="select-client"]') ||
                    e.target.closest('[data-action="load-analysis"]')) {
                    toggleMobileMenu();
                }
            }
        });
        
        // Keyboard shortcuts
        document.addEventListener('keydown', handleKeyboardShortcuts);
        
        // Window resize
        window.addEventListener('resize', debounce(handleResize, 100));
        
        console.log(`🔥 Static events binding complete: ${boundCount} elements bound`);
    }
    
    function initializeDynamicEventDelegation() {
        console.log('🎯 Initializing dynamic event delegation...');
        
        // Single event handler for dynamic elements with data-action
        document.addEventListener('click', (e) => {
            const target = e.target.closest('[data-action]');
            if (!target) return;
            
            const action = target.dataset.action;
            const id = target.dataset.id;
            const category = target.dataset.category;
            
            console.log(`🔥 DYNAMIC EVENT DELEGATION: ${action}`, { id, category, target });
            
            switch (action) {
                case 'select-client':
                    handleSelectClient(parseInt(id));
                    break;
                case 'edit-client':
                    handleEditClient(parseInt(id));
                    break;
                case 'delete-client':
                    handleDeleteClient(parseInt(id));
                    break;
                case 'add-to-workspace':
                    handleAddToWorkspace(parseInt(id));
                    break;
                case 'show-counter-modal':
                    handleShowCounterModal(category);
                    break;
                case 'close-modal':
                    handleCloseModal();
                    break;
                case 'delete-analysis':
                    handleDeleteAnalysis(parseInt(id));
                    break;
                case 'load-analysis':
                    handleLoadAnalysis(parseInt(id));
                    break;
                case 'share-highlight':
                    handleShareHighlight(parseInt(id));
                    break;
                case 'remove-from-workspace':
                    handleRemoveFromWorkspace(id);
                    break;
                case 'clear-workspace':
                    handleClearWorkspace();
                    break;
                case 'clear-filters':
                    handleClearFilters();
                    break;
                case 'duplicate-analysis':
                    handleDuplicateAnalysis(parseInt(id));
                    break;
                default:
                    console.warn('🎯 Unknown action:', action);
            }
        });
        
        // Handle drag and drop through delegation
        document.addEventListener('dragstart', (e) => {
            if (!e.target.matches('[draggable="true"]')) return;
            
            const highlightId = e.target.dataset.highlightId;
            if (highlightId) {
                e.dataTransfer.setData('text/plain', highlightId);
                e.target.classList.add('dragging');
                console.log('🎯 Drag started for highlight:', highlightId);
            }
        });
        
        document.addEventListener('dragend', (e) => {
            if (!e.target.matches('[draggable="true"]')) return;
            e.target.classList.remove('dragging');
        });
        
        console.log('✅ Centralized event delegation initialized');
    }
    
    // ===== Event Handlers =====
    function handleSelectClient(clientId) {
        if (!clientId) return;
        
        console.log('👤 Selecting client:', clientId);
        const client = state.clients.find(c => c.id === clientId);
        if (!client) {
            console.warn('Client not found:', clientId);
            return;
        }
        
        // Clear previous client data
        state.currentAnalysis = null;
        state.originalText = null;
        state.selectedFragments = [];
        state.analyses = [];
        
        // Clear UI displays
        if (elements.negotiationText) {
            elements.negotiationText.value = '';
        }
        
        // Clear results section
        const resultsSection = document.getElementById('results-section');
        if (resultsSection) {
            resultsSection.style.display = 'none';
        }
        
        // Reset counters to 0
        const counters = ['manipulations-count', 'biases-count', 'fallacies-count'];
        counters.forEach(counterId => {
            const element = document.getElementById(counterId);
            if (element) element.textContent = '0';
        });
        
        // Clear highlights and barometer
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
                    <p>Повний текст з підсвічуванням з'явиться після аналізу</p>
                </div>
            `;
        }
        
        // Reset barometer
        if (elements.barometerScore) elements.barometerScore.textContent = '0';
        if (elements.barometerLabel) elements.barometerLabel.textContent = 'Очікування аналізу...';
        if (elements.barometerComment) elements.barometerComment.textContent = '';
        if (elements.gaugeCircle) {
            elements.gaugeCircle.style.strokeDasharray = '0 283';
        }
        
        // Set new client
        state.currentClient = client;
        updateWorkspaceClientInfo(client);
        renderClientsList();
        
        // Load client-specific data
        loadAnalysisHistory(clientId);
        updateRecommendationsHistory(clientId);
        updateWorkspaceFragments();
        
        saveAppState();
        
        console.log(`✅ Client switched to: ${client.company}`);
        showNotification(`Обрано клієнта: ${client.company}`, 'success');
    }
    
    function handleEditClient(clientId) {
        console.log('✏️ Editing client:', clientId);
        const client = state.clients.find(c => c.id === clientId);
        if (!client) return;
        
        // Заповнити форму даними клієнта
        if (elements.companyInput) elements.companyInput.value = client.company || '';
        if (elements.negotiatorInput) elements.negotiatorInput.value = client.negotiator || '';
        if (elements.sectorInput) elements.sectorInput.value = client.sector || '';
        if (elements.goalInput) elements.goalInput.value = client.goal || '';
        if (elements.criteriaInput) elements.criteriaInput.value = client.decision_criteria || '';
        if (elements.constraintsInput) elements.constraintsInput.value = client.constraints || '';
        if (elements.userGoalsInput) elements.userGoalsInput.value = client.user_goals || '';
        if (elements.clientGoalsInput) elements.clientGoalsInput.value = client.client_goals || '';
        if (elements.weeklyHoursInput) elements.weeklyHoursInput.value = client.weekly_hours || '';
        if (elements.offeredServicesInput) elements.offeredServicesInput.value = client.offered_services || '';
        if (elements.deadlinesInput) elements.deadlinesInput.value = client.deadlines || '';
        if (elements.notesInput) elements.notesInput.value = client.notes || '';
        
        // Зберегти ID клієнта для оновлення
        state.editingClientId = clientId;
        
        // Показати форму
        if (elements.clientForm) {
            elements.clientForm.style.display = 'block';
            elements.companyInput?.focus();
        }
    }
    
    function handleDeleteClient(clientId) {
        console.log('🗑️ Delete client requested:', clientId);
        const client = state.clients.find(c => c.id === clientId);
        if (!client) return;
        
        // Показати кастомне модальне вікно замість confirm()
        showConfirmModal(
            'Видалити клієнта',
            `Ви дійсно хочете видалити клієнта "${client.company}"? Всі пов'язані аналізи також будуть видалені. Цю дію неможливо відмінити.`,
            () => confirmDeleteClient(clientId)
        );
    }
    
    function handleAddToWorkspace(highlightIndex) {
        console.log('➕ Adding to workspace:', highlightIndex);
        addToWorkspace(highlightIndex);
    }
    
    function handleShowCounterModal(category) {
        console.log('📊 Showing counter modal:', category);
        const titles = {
            'manipulation': 'Маніпулятивні техніки',
            'cognitive_bias': 'Когнітивні викривлення',
            'rhetological_fallacy': 'Логічні помилки та софізми'
        };
        showCounterModal(category, titles[category] || 'Проблеми');
    }
    
    function handleCloseModal() {
        console.log('❌ Closing modal');
        closeModal();
        closeConfirmModal();
    }
    
    function handleDuplicateAnalysis(analysisId) {
        console.log('📋 Duplicate analysis requested:', analysisId);
        const analysis = state.analyses.find(a => a.id === analysisId);
        
        if (!analysis) {
            showNotification('Аналіз не знайдено', 'error');
            return;
        }
        
        // Pre-fill the text input with the analysis text
        if (analysis.original_text && elements.negotiationText) {
            elements.negotiationText.value = analysis.original_text;
            updateTextStats();
            
            // Switch to analysis dashboard and text input
            showView('analysis-dashboard');
            
            // Switch to text input method
            if (elements.textMethod && elements.fileMethod) {
                elements.textMethod.classList.add('active');
                elements.fileMethod.classList.remove('active');
                elements.textInputContent.style.display = 'block';
                elements.fileInputContent.style.display = 'none';
            }
            
            showNotification('Текст аналізу скопійовано для нового аналізу', 'success');
        } else {
            showNotification('Неможливо дублювати: оригінальний текст не знайдено', 'error');
        }
    }

    function handleDeleteAnalysis(analysisId) {
        console.log('🗑️ Delete analysis requested:', analysisId);
        showConfirmModal(
            'Видалити аналіз',
            'Ви дійсно хочете видалити цей аналіз? Цю дію неможливо відмінити.',
            () => confirmDeleteAnalysis(analysisId)
        );
    }
    
    function handleLoadAnalysis(analysisId) {
        console.log('📄 Loading analysis:', analysisId);
        loadAnalysisById(analysisId);
    }
    
    function handleShareHighlight(highlightIndex) {
        console.log('📤 Sharing highlight:', highlightIndex);
        shareHighlight(highlightIndex);
    }
    
    function handleRemoveFromWorkspace(fragmentId) {
        console.log('❌ Removing from workspace:', fragmentId);
        state.selectedFragments = state.selectedFragments.filter(f => f.id !== fragmentId);
        updateWorkspaceFragments();
        updateWorkspaceActions();
        scheduleStateSave();
        showNotification('Фрагмент видалено з робочої області', 'info');
    }
    
    function handleClearWorkspace() {
        console.log('🧹 Clearing workspace');
        showConfirmModal(
            'Очистити робочу область',
            'Ви дійсно хочете видалити всі фрагменти з робочої області?',
            () => {
                state.selectedFragments = [];
                updateWorkspaceFragments();
                updateWorkspaceActions();
                scheduleStateSave();
                showNotification('Робочу область очищено', 'info');
                closeConfirmModal();
            }
        );
    }
    
    function handleClearFilters() {
        console.log('🔍 Clearing filters');
        // Reset all filter states
        state.filters = {
            category: 'all',
            severity: 'all',
            search: ''
        };
        
        // Clear filter UI
        if (elements.categoryFilter) elements.categoryFilter.value = 'all';
        if (elements.severityFilter) elements.severityFilter.value = 'all';
        if (elements.searchFilter) elements.searchFilter.value = '';
        
        // Refresh displays
        if (state.currentAnalysis?.highlights) {
            displayHighlights(state.currentAnalysis.highlights);
            updateWorkspaceFragments();
        }
        
        showNotification('Фільтри очищено', 'info');
    }

    // ===== Confirm Modal System =====
    function showConfirmModal(title, message, onConfirm) {
        // Create modal if it doesn't exist
        let modal = document.getElementById('confirm-modal');
        if (!modal) {
            modal = document.createElement('div');
            modal.id = 'confirm-modal';
            modal.className = 'modal';
            modal.style.display = 'none';
            modal.innerHTML = `
                <div class="modal-content">
                    <div class="modal-header">
                        <h3 id="confirm-modal-title"></h3>
                        <button class="modal-close" data-action="close-modal">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p id="confirm-modal-message"></p>
                        <div class="modal-actions" style="margin-top: 1.5rem; display: flex; gap: 1rem; justify-content: flex-end;">
                            <button class="btn btn-secondary" data-action="close-modal">Скасувати</button>
                            <button class="btn btn-danger" id="confirm-modal-confirm">Підтвердити</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);
        }
        
        // Update content
        document.getElementById('confirm-modal-title').textContent = title;
        document.getElementById('confirm-modal-message').textContent = message;
        
        // Set up confirm handler
        const confirmBtn = document.getElementById('confirm-modal-confirm');
        confirmBtn.onclick = () => {
            onConfirm();
            closeConfirmModal();
        };
        
        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        console.log('✅ Confirm modal shown:', title);
    }
    
    function closeConfirmModal() {
        const modal = document.getElementById('confirm-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            console.log('✅ Confirm modal closed');
        }
    }
    
    // ===== Helper Functions for Confirmations =====
    async function confirmDeleteClient(clientId) {
        try {
            console.log('🗑️ Confirming delete client:', clientId);
            
            const response = await fetch(`/api/clients/${clientId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Помилка видалення клієнта');
            }
            
            // Remove from state
            state.clients = state.clients.filter(c => c.id !== clientId);
            
            // If this was current client, clear it
            if (state.currentClient && state.currentClient.id === clientId) {
                state.currentClient = null;
                state.currentAnalysis = null;
                state.analyses = [];
                state.selectedFragments = [];
            }
            
            // Update UI
            renderClientsList();
            updateWorkspaceClientInfo(null);
            updateWorkspaceFragments();
            saveAppState();
            
            showNotification('Клієнта успішно видалено', 'success');
            
        } catch (error) {
            console.error('Delete client error:', error);
            showNotification(error.message, 'error');
        }
    }
    
    async function confirmDeleteAnalysis(analysisId) {
        try {
            console.log('🗑️ Confirming delete analysis:', analysisId);
            
            const response = await fetch(`/api/analyses/${analysisId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || 'Помилка видалення аналізу');
            }
            
            // Remove from state
            state.analyses = state.analyses.filter(a => a.id !== analysisId);
            
            // If this was current analysis, clear it
            if (state.currentAnalysis && state.currentAnalysis.id === analysisId) {
                state.currentAnalysis = null;
                state.selectedFragments = [];
                // Clear UI
                if (elements.highlightsList) {
                    elements.highlightsList.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-icon"><i class="fas fa-search"></i></div>
                            <p>Проблемні моменти з'являться тут після аналізу</p>
                        </div>
                    `;
                }
                if (elements.fulltextContent) {
                    elements.fulltextContent.innerHTML = '<p>Виберіть аналіз для перегляду повного тексту</p>';
                }
            }
            
            // Update UI
            renderAnalysisHistory(state.analyses);
            updateWorkspaceFragments();
            saveAppState();
            
            showNotification('Аналіз успішно видалено', 'success');
            
        } catch (error) {
            console.error('Delete analysis error:', error);
            showNotification(error.message, 'error');
        }
    }

    // ===== Modal Functionality =====
    function initializeModalHandlers() {
        console.log('🔗 Initializing modal handlers...');
        
        // Modal handlers are now managed by centralized event delegation
        // Add escape key handler for modals
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                closeModal();
                closeConfirmModal();
            }
        });
        
        console.log('✅ Modal handlers initialized with event delegation');
    }
    
    function showCounterModal(category, title) {
        console.log(`🔍 Opening modal for category: ${category}`);
        
        if (!state.currentAnalysis || !state.currentAnalysis.highlights) {
            console.warn('⚠️ No current analysis available for modal');
            return;
        }
        
        const modal = document.getElementById('counter-modal');
        const modalTitle = document.getElementById('counter-modal-title');
        const modalItems = document.getElementById('counter-modal-items');
        
        if (!modal || !modalTitle || !modalItems) {
            console.warn('⚠️ Modal elements not found');
            return;
        }
        
        // Filter highlights by category
        const categoryHighlights = state.currentAnalysis.highlights.filter(h => h.category === category);
        
        console.log(`📊 Found ${categoryHighlights.length} highlights for category ${category}`);
        
        // Set modal title
        modalTitle.textContent = `${title} (${categoryHighlights.length})`;
        
        // Clear and populate items
        modalItems.innerHTML = '';
        
        if (categoryHighlights.length === 0) {
            modalItems.innerHTML = `
                <div class="counter-item">
                    <div class="counter-item-header">
                        <span class="counter-item-label">Проблеми не знайдено</span>
                    </div>
                    <div class="counter-item-explanation">
                        У цій категорії поки що немає виявлених проблем.
                    </div>
                </div>
            `;
        } else {
            categoryHighlights.forEach((highlight, index) => {
                const itemHtml = `
                    <div class="counter-item">
                        <div class="counter-item-header">
                            <span class="counter-item-label">${highlight.label || `Проблема ${index + 1}`}</span>
                            <span class="counter-item-severity severity-${highlight.severity || 1}">
                                Рівень ${highlight.severity || 1}
                            </span>
                        </div>
                        ${highlight.text ? `
                            <div class="counter-item-text">
                                "${highlight.text}"
                            </div>
                        ` : ''}
                        <div class="counter-item-explanation">
                            ${highlight.explanation || 'Опис недоступний'}
                        </div>
                    </div>
                `;
                modalItems.insertAdjacentHTML('beforeend', itemHtml);
            });
        }
        
        // Show modal
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        
        // Add click outside to close functionality
        modal.onclick = (e) => {
            if (e.target === modal) {
                closeModal();
            }
        };
        
        console.log('✅ Modal opened successfully');
    }
    
    function closeModal() {
        const modal = document.getElementById('counter-modal');
        if (modal) {
            modal.style.display = 'none';
            document.body.style.overflow = '';
            console.log('✅ Modal closed');
        }
    }

    // ===== ENHANCED PROGRESS MANAGEMENT =====
    function initializeProgressSystem() {
        console.log('📊 Initializing enhanced progress system...');
        
        // Reset all progress steps to initial state
        resetProgressSteps();
    }
    
    function resetProgressSteps() {
        const stepIds = [
            'step-text-processing',
            'step-ai-analysis', 
            'step-problem-detection',
            'step-complexity-assessment',
            'step-final-results'
        ];
        
        stepIds.forEach((stepId, index) => {
            const element = document.getElementById(stepId);
            if (element) {
                element.classList.remove('completed', 'active');
                
                // Reset status text
                const statusElement = element.querySelector('.step-status');
                if (statusElement) {
                    statusElement.textContent = 'Очікування';
                }
                
                // Reset icon
                const iconElement = element.querySelector('.step-icon i');
                if (iconElement) {
                    // Reset to original icons based on step
                    const originalIcons = [
                        'fas fa-file-text',      // Text Processing
                        'fas fa-brain',          // AI Analysis  
                        'fas fa-search',         // Problem Detection
                        'fas fa-chart-line',     // Complexity Assessment
                        'fas fa-check-circle'    // Final Results
                    ];
                    iconElement.className = originalIcons[index] || 'fas fa-circle';
                }
            }
        });
        
        // Reset live progress bar
        const progressFill = document.getElementById('live-progress-fill');
        const progressText = document.getElementById('live-progress-text');
        
        if (progressFill) {
            progressFill.style.width = '0%';
        }
        
        if (progressText) {
            progressText.textContent = '0% - Готовність до аналізу';
        }
    }
    
    function updateAnalysisProgressEnhanced(step, stepName, percentage) {
        const stepIds = [
            'step-text-processing',
            'step-ai-analysis', 
            'step-problem-detection',
            'step-complexity-assessment',
            'step-final-results'
        ];
        
        const stepLabels = [
            'Обробка тексту',
            'ШІ Аналіз',
            'Пошук проблем',
            'Оцінка складності',
            'Фінальні результати'
        ];
        
        console.log(`📊 Progress update: Step ${step}/${stepIds.length} - ${stepName || stepLabels[step - 1]} (${percentage}%)`);
        
        // Update each step
        stepIds.forEach((stepId, index) => {
            const element = document.getElementById(stepId);
            if (element) {
                const isCompleted = index < step - 1;
                const isActive = index === step - 1;
                
                element.classList.toggle('completed', isCompleted);
                element.classList.toggle('active', isActive);
                
                // Update step status text
                const statusElement = element.querySelector('.step-status');
                if (statusElement) {
                    if (isCompleted) {
                        statusElement.textContent = 'Завершено';
                    } else if (isActive) {
                        statusElement.textContent = 'В процесі...';
                    } else {
                        statusElement.textContent = 'Очікування';
                    }
                }
                
                // Update step icon for completed steps
                const iconElement = element.querySelector('.step-icon i');
                if (iconElement && isCompleted) {
                    iconElement.className = 'fas fa-check';
                }
            }
        });
        
        // Update live progress bar
        const progressFill = document.getElementById('live-progress-fill');
        const progressText = document.getElementById('live-progress-text');
        
        if (progressFill) {
            progressFill.style.width = `${Math.min(percentage || 0, 100)}%`;
        }
        
        if (progressText) {
            progressText.textContent = `${Math.round(percentage || 0)}% - ${stepName || stepLabels[step - 1] || 'Обробка...'}`;
        }
        
        // Show progress section
        const progressSection = document.querySelector('.analysis-progress');
        if (progressSection) {
            progressSection.style.display = 'block';
        }
    }
    
    function completeAnalysisProgress() {
        console.log('✅ Analysis completed - updating progress to 100%');
        
        updateAnalysisProgressEnhanced(5, 'Аналіз завершено!', 100);
        
        // Mark all steps as completed with slight delay for visual effect
        setTimeout(() => {
            const stepIds = [
                'step-text-processing',
                'step-ai-analysis', 
                'step-problem-detection',
                'step-complexity-assessment',
                'step-final-results'
            ];
            
            stepIds.forEach(stepId => {
                const element = document.getElementById(stepId);
                if (element) {
                    element.classList.add('completed');
                    element.classList.remove('active');
                    
                    // Update status
                    const statusElement = element.querySelector('.step-status');
                    if (statusElement) {
                        statusElement.textContent = 'Завершено';
                    }
                    
                    // Update icon
                    const iconElement = element.querySelector('.step-icon i');
                    if (iconElement) {
                        iconElement.className = 'fas fa-check';
                    }
                }
            });
        }, 500);
    }

    // ===== Initialization =====
    function init() {
        console.log('🚀 TeamPulse Turbo Neon - Initializing...');
        
        // Re-initialize DOM elements to ensure they are available
        reinitializeElements();
        
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
        
        // Initialize unified event system (replaces old bindEvents)
        initializeUnifiedEventSystem();
        
        // Initialize displays
        updateTextStats();
        updateInputMethod('text');
        switchHighlightsView('list');
        
        // Always load initial data
        console.log('🚀 Starting loadClients...');
        
        // Force initial counter display to 0 
        setTimeout(() => {
            console.log('🚀 Force updating counters on startup');
            console.log('🚀 DOM elements check:', {
                clientCount: !!document.getElementById('client-count'),
                analysisCount: !!document.getElementById('analysis-count'),
                manipulationsCount: !!document.getElementById('manipulations-count'),
                biasesCount: !!document.getElementById('biases-count'),
                fallaciesCount: !!document.getElementById('fallacies-count'),
                recommendationsCount: !!document.getElementById('recommendations-count'),
                clientList: !!document.getElementById('client-list'),
                analysisHistory: !!document.getElementById('analysis-history')
            });
            
            // Force reset all counters to 0
            const counters = [
                'client-count', 'analysis-count', 'manipulations-count', 
                'biases-count', 'fallacies-count', 'recommendations-count'
            ];
            
            counters.forEach(counterId => {
                const element = document.getElementById(counterId);
                if (element) {
                    element.textContent = '0';
                    console.log('🚀 ✅ Reset', counterId, 'to 0');
                } else {
                    console.error('🚀 ❌ Element', counterId, 'not found');
                }
            });
            
            updateClientCount();
            renderAnalysisHistory([]);
            updateCountersFromHighlights([]);
        }, 100);
        
        loadClients().then(() => {
            console.log('🚀 loadClients completed, clients loaded:', state.clients.length);
            
            // Force update counters with real data
            setTimeout(() => {
                updateClientCount();
                renderAnalysisHistory(state.analyses || []);
                
                // Also load analysis history for current client if exists
                if (state.currentClient) {
                    console.log('🚀 Loading analysis history for current client:', state.currentClient.company);
                    loadAnalysisHistory(state.currentClient.id);
                }
                
                // Double-check all counters are updated
                setTimeout(() => {
                    updateClientCount();
                    updateCountersFromHighlights([]);
                    console.log('🚀 Final counter update completed');
                }, 500);
            }, 200);
            
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
        
        // Event delegation is now part of unified event system
        
        // Initialize modal functionality
        initializeModalHandlers();
        
        // Initialize enhanced progress system
        initializeProgressSystem();
        
        console.log('✨ TeamPulse Turbo Neon - Ready!');
    }

    // TeamPulseDebug is already exposed in initializeUnifiedEventSystem
    // Just confirm it's available
    console.log('🔧 TeamPulseDebug available:', !!window.TeamPulseDebug);
    
    // ДІАГНОСТИКА: Додамо детальне логування ініціалізації
    console.log('🔥 ======= TEAMPULSE TURBO NEON STARTUP =======');
    console.log('🔥 Current auth status:', sessionStorage.getItem('teampulse-auth'));
    console.log('🔥 DOM ready state:', document.readyState);
    console.log('🔥 Available elements check:');
    console.log('🔥   - sidebar-left:', !!$('#sidebar-left'));
    console.log('🔥   - start-analysis-btn:', !!$('#start-analysis-btn'));
    console.log('🔥   - new-client-btn:', !!$('#new-client-btn'));
    console.log('🔥   - client-list:', !!$('#client-list'));
    console.log('🔥 Functions exposed in window.TeamPulseDebug for testing');
    
    // Initialize immediately if already authenticated, or wait for auth-success event
    if (sessionStorage.getItem('teampulse-auth') === 'true') {
        console.log('🔥 Auth found, initializing immediately...');
        init();
    } else {
        console.log('🔥 No auth found, waiting for auth-success event...');
        // Start when authenticated
        window.addEventListener('auth-success', () => {
            console.log('🔥 Auth-success event received, initializing...');
            init();
        });
    }

})();