// Application State Management Module
export const AppState = {
    // Current application state
    data: {
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
    },

    // State management methods
    get(key) {
        return key ? this.data[key] : this.data;
    },

    set(key, value) {
        if (typeof key === 'object') {
            Object.assign(this.data, key);
        } else {
            this.data[key] = value;
        }
        this.save();
    },

    save() {
        try {
            localStorage.setItem('teampulse-app-state', JSON.stringify({
                currentClient: this.data.currentClient,
                selectedFragments: this.data.selectedFragments,
                onboardingCompleted: this.data.onboardingCompleted,
                ui: this.data.ui
            }));
        } catch (error) {
            console.warn('Failed to save app state:', error);
        }
    },

    load() {
        try {
            const savedState = localStorage.getItem('teampulse-app-state');
            if (savedState) {
                const parsed = JSON.parse(savedState);
                Object.assign(this.data, parsed);
            }
        } catch (error) {
            console.warn('Failed to load app state:', error);
        }
    }
};