/**
 * WorkspaceService - Single Responsibility: Managing workspace operations
 * Follows SOLID principles - only handles workspace logic
 */
class WorkspaceService {
    constructor() {
        this.workspace = [];
        this.selectedItems = new Set();
        this.maxWorkspaceItems = 50;
        this.workspaceStorage = 'teamPulse_workspace';
        
        console.log('📝 WorkspaceService initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize workspace service
    init() {
        this.loadWorkspaceFromStorage();
        this.setupGlobalMethods();
        this.updateWorkspaceDisplay();
        console.log('📝 WorkspaceService ready');
    }
    
    // Single Responsibility: Setup global methods
    setupGlobalMethods() {
        window.addToWorkspace = (item) => this.addToWorkspace(item);
        window.removeFromWorkspace = (itemId) => this.removeFromWorkspace(itemId);
        window.clearWorkspace = () => this.clearWorkspace();
        window.getWorkspaceSelection = () => this.getWorkspaceSelection();
        window.selectWorkspaceItem = (itemId, isSelected) => this.selectWorkspaceItem(itemId, isSelected);
        window.workspaceService = this;
    }
    
    // Single Responsibility: Add item to workspace
    addToWorkspace(item) {
        if (!item || !item.text) {
            console.warn('📝 Invalid item for workspace');
            return false;
        }
        
        if (this.workspace.length >= this.maxWorkspaceItems) {
            alert(`❌ Максимальна кількість елементів у робочому просторі: ${this.maxWorkspaceItems}`);
            return false;
        }
        
        // Check for duplicates
        const exists = this.workspace.some(existing => 
            existing.text === item.text && existing.category === item.category
        );
        
        if (exists) {
            console.warn('📝 Item already in workspace');
            return false;
        }
        
        const workspaceItem = {
            id: Date.now() + Math.random(),
            text: item.text,
            category: item.category || 'neutral',
            label: item.label || 'Без мітки',
            addedAt: new Date().toISOString(),
            source: item.source || 'analysis'
        };
        
        this.workspace.unshift(workspaceItem);
        this.saveWorkspaceToStorage();
        this.updateWorkspaceDisplay();
        this.showWorkspaceNotification(`Додано до робочого простору: ${this.getCategoryName(workspaceItem.category)}`);
        
        console.log('📝 Added to workspace:', workspaceItem.text.substring(0, 50) + '...');
        return true;
    }
    
    // Single Responsibility: Remove item from workspace
    removeFromWorkspace(itemId) {
        const index = this.workspace.findIndex(item => item.id == itemId);
        if (index === -1) {
            console.warn('📝 Item not found in workspace:', itemId);
            return false;
        }
        
        const removedItem = this.workspace.splice(index, 1)[0];
        this.selectedItems.delete(itemId);
        this.saveWorkspaceToStorage();
        this.updateWorkspaceDisplay();
        this.showWorkspaceNotification(`Видалено з робочого простору`);
        
        console.log('📝 Removed from workspace:', removedItem.text.substring(0, 50) + '...');
        return true;
    }
    
    // Single Responsibility: Clear entire workspace
    clearWorkspace() {
        if (this.workspace.length === 0) {
            return;
        }
        
        if (confirm(`Очистити весь робочий простір? (${this.workspace.length} елементів)`)) {
            this.workspace = [];
            this.selectedItems.clear();
            this.saveWorkspaceToStorage();
            this.updateWorkspaceDisplay();
            this.showWorkspaceNotification('Робочий простір очищено');
            console.log('📝 Workspace cleared');
        }
    }
    
    // Single Responsibility: Select/deselect workspace item
    selectWorkspaceItem(itemId, isSelected) {
        if (isSelected) {
            this.selectedItems.add(itemId);
        } else {
            this.selectedItems.delete(itemId);
        }
        
        this.updateSelectionDisplay();
        console.log('📝 Selection updated:', this.selectedItems.size, 'items selected');
    }
    
    // Single Responsibility: Get selected workspace items
    getWorkspaceSelection() {
        return this.workspace.filter(item => this.selectedItems.has(item.id));
    }
    
    // Single Responsibility: Update workspace display
    updateWorkspaceDisplay() {
        const workspaceContainer = document.getElementById('workspace-container');
        const workspaceCount = document.getElementById('workspace-count');
        const workspaceList = document.getElementById('workspace-list');
        
        if (workspaceCount) {
            workspaceCount.textContent = this.workspace.length;
        }
        
        if (!workspaceList) {
            console.log('📝 Workspace UI not implemented yet, skipping display update');
            return;
        }
        
        if (this.workspace.length === 0) {
            workspaceList.innerHTML = `
                <div class="workspace-empty">
                    <p>📝 Робочий простір порожній</p>
                    <p>Додайте фрагменти з результатів аналізу</p>
                </div>
            `;
            return;
        }
        
        workspaceList.innerHTML = this.workspace.map(item => `
            <div class="workspace-item" data-item-id="${item.id}">
                <div class="workspace-item-header">
                    <input type="checkbox" 
                           class="workspace-item-checkbox" 
                           data-item-id="${item.id}"
                           ${this.selectedItems.has(item.id) ? 'checked' : ''}>
                    <span class="workspace-item-category ${item.category}">
                        ${this.getCategoryIcon(item.category)} ${this.getCategoryName(item.category)}
                    </span>
                    <button class="workspace-remove-btn" data-item-id="${item.id}" title="Видалити">
                        ❌
                    </button>
                </div>
                <div class="workspace-item-content">
                    <div class="workspace-item-text">${this.escapeHtml(item.text)}</div>
                    <div class="workspace-item-label">${this.escapeHtml(item.label)}</div>
                    <div class="workspace-item-meta">
                        Додано: ${new Date(item.addedAt).toLocaleString('uk-UA')}
                    </div>
                </div>
            </div>
        `).join('');
        
        this.attachWorkspaceItemHandlers();
        this.updateSelectionDisplay();
    }
    
    // Single Responsibility: Attach event handlers to workspace items
    attachWorkspaceItemHandlers() {
        // Remove item handlers
        document.querySelectorAll('.workspace-remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemId = btn.dataset.itemId;
                this.removeFromWorkspace(itemId);
            });
        });
        
        // Checkbox handlers
        document.querySelectorAll('.workspace-item-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const itemId = checkbox.dataset.itemId;
                this.selectWorkspaceItem(itemId, checkbox.checked);
            });
        });
    }
    
    // Single Responsibility: Update selection display
    updateSelectionDisplay() {
        const selectedCount = document.getElementById('selected-count');
        const adviceBtn = document.getElementById('get-advice-btn');
        
        if (selectedCount) {
            selectedCount.textContent = this.selectedItems.size;
        }
        
        if (adviceBtn) {
            adviceBtn.disabled = this.selectedItems.size === 0;
            adviceBtn.textContent = this.selectedItems.size > 0 
                ? `Отримати пораду (${this.selectedItems.size})` 
                : 'Оберіть фрагменти';
        }
    }
    
    // Single Responsibility: Show workspace notification
    showWorkspaceNotification(message) {
        // Create notification element if it doesn't exist
        let notification = document.getElementById('workspace-notification');
        if (!notification) {
            notification = document.createElement('div');
            notification.id = 'workspace-notification';
            notification.className = 'workspace-notification';
            document.body.appendChild(notification);
        }
        
        notification.textContent = message;
        notification.style.display = 'block';
        notification.style.opacity = '1';
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.style.display = 'none';
            }, 300);
        }, 2000);
    }
    
    // Single Responsibility: Save workspace to localStorage
    saveWorkspaceToStorage() {
        try {
            localStorage.setItem(this.workspaceStorage, JSON.stringify({
                workspace: this.workspace,
                selectedItems: Array.from(this.selectedItems),
                lastUpdated: new Date().toISOString()
            }));
        } catch (error) {
            console.warn('📝 Failed to save workspace to storage:', error);
        }
    }
    
    // Single Responsibility: Load workspace from localStorage
    loadWorkspaceFromStorage() {
        try {
            const stored = localStorage.getItem(this.workspaceStorage);
            if (stored) {
                const data = JSON.parse(stored);
                this.workspace = data.workspace || [];
                this.selectedItems = new Set(data.selectedItems || []);
                console.log('📝 Loaded workspace from storage:', this.workspace.length, 'items');
            }
        } catch (error) {
            console.warn('📝 Failed to load workspace from storage:', error);
            this.workspace = [];
            this.selectedItems = new Set();
        }
    }
    
    // Single Responsibility: Get category display name
    getCategoryName(category) {
        const names = {
            manipulation: 'Маніпуляція',
            cognitive_bias: 'Когнітивне спотворення',
            rhetological_fallacy: 'Риторична помилка',
            neutral: 'Нейтральний'
        };
        return names[category] || 'Невідомо';
    }
    
    // Single Responsibility: Get category icon
    getCategoryIcon(category) {
        const icons = {
            manipulation: '🎭',
            cognitive_bias: '🧠',
            rhetological_fallacy: '💬',
            neutral: '📄'
        };
        return icons[category] || '❓';
    }
    
    // Single Responsibility: Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // Single Responsibility: Export workspace data
    exportWorkspace() {
        const exportData = {
            workspace: this.workspace,
            exportedAt: new Date().toISOString(),
            totalItems: this.workspace.length,
            selectedItems: this.selectedItems.size
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], {
            type: 'application/json'
        });
        
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `teamPulse_workspace_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        console.log('📝 Workspace exported');
    }
    
    // Single Responsibility: Import workspace data
    async importWorkspace(file) {
        try {
            const text = await file.text();
            const data = JSON.parse(text);
            
            if (data.workspace && Array.isArray(data.workspace)) {
                if (confirm(`Імпортувати ${data.workspace.length} елементів? Поточний робочий простір буде замінено.`)) {
                    this.workspace = data.workspace;
                    this.selectedItems.clear();
                    this.saveWorkspaceToStorage();
                    this.updateWorkspaceDisplay();
                    this.showWorkspaceNotification(`Імпортовано ${data.workspace.length} елементів`);
                    console.log('📝 Workspace imported:', data.workspace.length, 'items');
                    return true;
                }
            } else {
                throw new Error('Невірний формат файлу');
            }
        } catch (error) {
            console.error('📝 Import error:', error);
            alert('❌ Помилка імпорту: ' + error.message);
            return false;
        }
    }
    
    // Single Responsibility: Get workspace statistics
    getWorkspaceStats() {
        const stats = {
            total: this.workspace.length,
            selected: this.selectedItems.size,
            categories: {},
            oldestItem: null,
            newestItem: null
        };
        
        this.workspace.forEach(item => {
            // Count by category
            stats.categories[item.category] = (stats.categories[item.category] || 0) + 1;
            
            // Find oldest and newest
            const itemDate = new Date(item.addedAt);
            if (!stats.oldestItem || itemDate < new Date(stats.oldestItem.addedAt)) {
                stats.oldestItem = item;
            }
            if (!stats.newestItem || itemDate > new Date(stats.newestItem.addedAt)) {
                stats.newestItem = item;
            }
        });
        
        return stats;
    }
}

// Export for module use
window.WorkspaceService = WorkspaceService;