/**
 * OnboardingManager - SOLID compliant onboarding system
 * Single Responsibility: Manages only onboarding flow
 * Open/Closed: Extensible without modification
 * Liskov Substitution: Event handlers are interchangeable
 * Interface Segregation: Separate concerns for UI, state, and events
 * Dependency Inversion: Depends on abstractions, not concrete implementations
 */

class OnboardingManager {
    constructor() {
        this.state = {
            isCompleted: false,
            currentStep: 1,
            maxSteps: 4,
            isVisible: false
        };
        
        this.selectors = {
            modal: '#onboarding-modal',
            skipBtn: '#skip-onboarding',
            nextBtn: '#next-step',
            prevBtn: '#prev-step',
            progressBar: '.progress-fill',
            progressText: '#progress-text',
            steps: '.onboarding-step'
        };
        
        this.storageKey = 'teampulse-onboarding-completed';
        this.eventHandlers = new Map();
        
        console.log('🎓 OnboardingManager initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize only onboarding
    init() {
        this.loadState();
        
        if (this.state.isCompleted) {
            this.hide();
            return;
        }
        
        this.show();
        this.bindEvents();
    }
    
    // Single Responsibility: Load state from storage
    loadState() {
        const completed = localStorage.getItem(this.storageKey);
        this.state.isCompleted = completed === 'true';
        console.log('🎓 State loaded:', this.state);
    }
    
    // Single Responsibility: Save state to storage
    saveState() {
        localStorage.setItem(this.storageKey, this.state.isCompleted.toString());
        console.log('🎓 State saved:', this.state);
    }
    
    // Single Responsibility: Show modal
    show() {
        const modal = document.querySelector(this.selectors.modal);
        if (!modal) {
            console.error('🎓 Modal not found!');
            return;
        }
        
        modal.style.display = 'flex';
        this.state.isVisible = true;
        this.updateStep();
        console.log('🎓 Modal shown');
    }
    
    // Single Responsibility: Hide modal
    hide() {
        const modal = document.querySelector(this.selectors.modal);
        if (modal) {
            modal.style.display = 'none';
            this.state.isVisible = false;
            console.log('🎓 Modal hidden');
        }
    }
    
    // Single Responsibility: Complete onboarding
    complete() {
        console.log('🎓 Completing onboarding...');
        this.state.isCompleted = true;
        this.saveState();
        this.hide();
        this.showSuccessNotification();
    }
    
    // Single Responsibility: Go to next step
    nextStep() {
        console.log('🎓 Next step clicked, current:', this.state.currentStep);
        
        if (this.state.currentStep < this.state.maxSteps) {
            this.state.currentStep++;
            this.updateStep();
        } else {
            this.complete();
        }
    }
    
    // Single Responsibility: Go to previous step
    prevStep() {
        console.log('🎓 Previous step clicked, current:', this.state.currentStep);
        
        if (this.state.currentStep > 1) {
            this.state.currentStep--;
            this.updateStep();
        }
    }
    
    // Single Responsibility: Update UI for current step
    updateStep() {
        this.updateProgress();
        this.updateStepVisibility();
        this.updateButtonStates();
    }
    
    // Single Responsibility: Update progress bar
    updateProgress() {
        const progress = (this.state.currentStep / this.state.maxSteps) * 100;
        
        const progressBar = document.querySelector(this.selectors.progressBar);
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }
        
        const progressText = document.querySelector(this.selectors.progressText);
        if (progressText) {
            progressText.textContent = `Крок ${this.state.currentStep} з ${this.state.maxSteps}`;
        }
    }
    
    // Single Responsibility: Update step visibility
    updateStepVisibility() {
        const steps = document.querySelectorAll(this.selectors.steps);
        steps.forEach((step, index) => {
            const stepNumber = index + 1;
            if (stepNumber === this.state.currentStep) {
                step.classList.add('active');
            } else {
                step.classList.remove('active');
            }
        });
    }
    
    // Single Responsibility: Update button states
    updateButtonStates() {
        const prevBtn = document.querySelector(this.selectors.prevBtn);
        const nextBtn = document.querySelector(this.selectors.nextBtn);
        
        if (prevBtn) {
            prevBtn.style.display = this.state.currentStep > 1 ? 'flex' : 'none';
        }
        
        if (nextBtn) {
            const nextText = nextBtn.querySelector('span') || nextBtn;
            if (this.state.currentStep === this.state.maxSteps) {
                nextText.textContent = 'Завершити';
            } else {
                nextText.textContent = 'Далі';
            }
        }
    }
    
    // Single Responsibility: Bind all events
    bindEvents() {
        console.log('🎓 Binding events...');
        
        // Remove existing events first
        this.unbindEvents();
        
        // Bind new events
        this.bindButtonEvent(this.selectors.skipBtn, () => this.complete());
        this.bindButtonEvent(this.selectors.nextBtn, () => this.nextStep());
        this.bindButtonEvent(this.selectors.prevBtn, () => this.prevStep());
        
        // Escape key
        this.bindKeyboardEvent('Escape', () => this.complete());
        
        console.log('🎓 Events bound successfully');
    }
    
    // Single Responsibility: Bind single button event
    bindButtonEvent(selector, handler) {
        const element = document.querySelector(selector);
        if (!element) {
            console.warn(`🎓 Element not found: ${selector}`);
            return;
        }
        
        // Create wrapper handler that prevents default and logs
        const wrappedHandler = (e) => {
            e.preventDefault();
            e.stopPropagation();
            console.log(`🎓 Button clicked: ${selector}`);
            handler();
        };
        
        // Store handler for cleanup
        this.eventHandlers.set(selector, wrappedHandler);
        
        // Bind event
        element.addEventListener('click', wrappedHandler);
        console.log(`🎓 Event bound: ${selector}`);
    }
    
    // Single Responsibility: Bind keyboard event
    bindKeyboardEvent(key, handler) {
        const wrappedHandler = (e) => {
            if (e.key === key && this.state.isVisible) {
                e.preventDefault();
                console.log(`🎓 Key pressed: ${key}`);
                handler();
            }
        };
        
        this.eventHandlers.set(`keyboard-${key}`, wrappedHandler);
        document.addEventListener('keydown', wrappedHandler);
        console.log(`🎓 Keyboard event bound: ${key}`);
    }
    
    // Single Responsibility: Remove all events
    unbindEvents() {
        this.eventHandlers.forEach((handler, key) => {
            if (key.startsWith('keyboard-')) {
                document.removeEventListener('keydown', handler);
            } else {
                const element = document.querySelector(key);
                if (element) {
                    element.removeEventListener('click', handler);
                }
            }
        });
        
        this.eventHandlers.clear();
        console.log('🎓 Events unbound');
    }
    
    // Single Responsibility: Show success notification
    showSuccessNotification() {
        // Try to use existing notification system
        if (window.showNotification) {
            window.showNotification('Онбординг завершено! 🚀', 'success');
        } else {
            console.log('🎓 Onboarding completed successfully!');
        }
    }
    
    // Interface Segregation: Public API methods
    reset() {
        console.log('🎓 Resetting onboarding...');
        localStorage.removeItem(this.storageKey);
        this.state.isCompleted = false;
        this.state.currentStep = 1;
        this.show();
        this.bindEvents();
    }
    
    destroy() {
        console.log('🎓 Destroying onboarding manager...');
        this.unbindEvents();
        this.hide();
    }
    
    // Debug methods
    getState() {
        return { ...this.state };
    }
    
    forceComplete() {
        console.log('🎓 Force completing onboarding...');
        this.complete();
    }
    
    forceShow() {
        console.log('🎓 Force showing onboarding...');
        this.state.isCompleted = false;
        this.show();
        this.bindEvents();
    }
}

// Export for global use
window.OnboardingManager = OnboardingManager;
console.log('🎓 OnboardingManager class loaded');