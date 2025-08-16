/**
 * NavigationService - Single Responsibility: Managing navigation and filtering
 * Follows SOLID principles - only handles navigation/filtering logic
 */
class NavigationService {
    constructor() {
        this.currentResults = [];
        this.filteredResults = [];
        this.currentFilters = {
            category: 'all',
            label: 'all',
            severity: 'all',
            search: ''
        };
        this.currentSort = {
            field: 'position',
            order: 'asc'
        };
        this.resultsPerPage = 10;
        this.currentPage = 1;
        
        console.log('🧭 NavigationService initialized');
        this.init();
    }
    
    // Single Responsibility: Initialize navigation service
    init() {
        this.setupGlobalMethods();
        this.setupNavigationControls();
        console.log('🧭 NavigationService ready');
    }
    
    // Single Responsibility: Setup global methods
    setupGlobalMethods() {
        window.applyFilters = () => this.applyFilters();
        window.sortResults = (field, order) => this.sortResults(field, order);
        window.navigateToPage = (page) => this.navigateToPage(page);
        window.setResultsPerPage = (count) => this.setResultsPerPage(count);
        window.searchResults = (query) => this.searchResults(query);
        window.navigationService = this;
    }
    
    // Single Responsibility: Setup navigation controls
    setupNavigationControls() {
        // Category filter
        const categoryFilter = document.getElementById('category-filter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', (e) => {
                this.currentFilters.category = e.target.value;
                this.applyFilters();
            });
        }
        
        // Label filter
        const labelFilter = document.getElementById('label-filter');
        if (labelFilter) {
            labelFilter.addEventListener('change', (e) => {
                this.currentFilters.label = e.target.value;
                this.applyFilters();
            });
        }
        
        // Severity filter
        const severityFilter = document.getElementById('severity-filter');
        if (severityFilter) {
            severityFilter.addEventListener('change', (e) => {
                this.currentFilters.severity = e.target.value;
                this.applyFilters();
            });
        }
        
        // Search input
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            let searchTimeout;
            searchInput.addEventListener('input', (e) => {
                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    this.currentFilters.search = e.target.value.trim().toLowerCase();
                    this.applyFilters();
                }, 300);
            });
        }
        
        // Sort controls
        const sortField = document.getElementById('sort-field');
        const sortOrder = document.getElementById('sort-order');
        
        if (sortField) {
            sortField.addEventListener('change', (e) => {
                this.currentSort.field = e.target.value;
                this.sortResults();
            });
        }
        
        if (sortOrder) {
            sortOrder.addEventListener('change', (e) => {
                this.currentSort.order = e.target.value;
                this.sortResults();
            });
        }
        
        // Results per page
        const perPageSelect = document.getElementById('results-per-page');
        if (perPageSelect) {
            perPageSelect.addEventListener('change', (e) => {
                this.setResultsPerPage(parseInt(e.target.value));
            });
        }
        
        // Clear filters button
        const clearFiltersBtn = document.getElementById('clear-filters-btn');
        if (clearFiltersBtn) {
            clearFiltersBtn.addEventListener('click', () => this.clearAllFilters());
        }
        
        console.log('🧭 Navigation controls attached');
    }
    
    // Single Responsibility: Set results data
    setResults(results) {
        this.currentResults = Array.isArray(results) ? results : [];
        this.currentPage = 1;
        this.applyFilters();
        this.updateFilterOptions();
        console.log('🧭 Results updated:', this.currentResults.length, 'items');
    }
    
    // Single Responsibility: Apply all filters
    applyFilters() {
        let filtered = [...this.currentResults];
        
        // Category filter
        if (this.currentFilters.category !== 'all') {
            filtered = filtered.filter(item => 
                item.category === this.currentFilters.category
            );
        }
        
        // Label filter
        if (this.currentFilters.label !== 'all') {
            filtered = filtered.filter(item => 
                item.label === this.currentFilters.label
            );
        }
        
        // Severity filter
        if (this.currentFilters.severity !== 'all') {
            filtered = filtered.filter(item => {
                const severity = this.calculateSeverity(item);
                return severity === this.currentFilters.severity;
            });
        }
        
        // Search filter
        if (this.currentFilters.search) {
            const query = this.currentFilters.search;
            filtered = filtered.filter(item => 
                item.text?.toLowerCase().includes(query) ||
                item.label?.toLowerCase().includes(query) ||
                item.category?.toLowerCase().includes(query)
            );
        }
        
        this.filteredResults = filtered;
        this.sortResults();
        this.updateResultsDisplay();
        this.updatePagination();
        this.updateFilterStats();
        
        console.log('🧭 Filters applied:', this.filteredResults.length, 'of', this.currentResults.length, 'results');
    }
    
    // Single Responsibility: Sort results
    sortResults(field = null, order = null) {
        if (field) this.currentSort.field = field;
        if (order) this.currentSort.order = order;
        
        const { field: sortField, order: sortOrder } = this.currentSort;
        
        this.filteredResults.sort((a, b) => {
            let aValue, bValue;
            
            switch (sortField) {
                case 'position':
                    aValue = a.start_pos || 0;
                    bValue = b.start_pos || 0;
                    break;
                case 'category':
                    aValue = a.category || '';
                    bValue = b.category || '';
                    break;
                case 'label':
                    aValue = a.label || '';
                    bValue = b.label || '';
                    break;
                case 'length':
                    aValue = a.text?.length || 0;
                    bValue = b.text?.length || 0;
                    break;
                case 'severity':
                    aValue = this.getSeverityWeight(this.calculateSeverity(a));
                    bValue = this.getSeverityWeight(this.calculateSeverity(b));
                    break;
                default:
                    aValue = a.start_pos || 0;
                    bValue = b.start_pos || 0;
            }
            
            if (typeof aValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }
            
            let comparison = 0;
            if (aValue < bValue) comparison = -1;
            if (aValue > bValue) comparison = 1;
            
            return sortOrder === 'desc' ? -comparison : comparison;
        });
        
        this.updateResultsDisplay();
        console.log('🧭 Results sorted by:', sortField, sortOrder);
    }
    
    // Single Responsibility: Navigate to specific page
    navigateToPage(page) {
        const totalPages = Math.ceil(this.filteredResults.length / this.resultsPerPage);
        
        if (page < 1) page = 1;
        if (page > totalPages) page = totalPages;
        
        this.currentPage = page;
        this.updateResultsDisplay();
        this.updatePagination();
        
        console.log('🧭 Navigated to page:', page);
    }
    
    // Single Responsibility: Set results per page
    setResultsPerPage(count) {
        this.resultsPerPage = count;
        this.currentPage = 1;
        this.updateResultsDisplay();
        this.updatePagination();
        
        console.log('🧭 Results per page set to:', count);
    }
    
    // Single Responsibility: Search results
    searchResults(query) {
        this.currentFilters.search = query.trim().toLowerCase();
        this.applyFilters();
        
        const searchInput = document.getElementById('search-input');
        if (searchInput && searchInput.value !== query) {
            searchInput.value = query;
        }
        
        console.log('🧭 Search query:', query);
    }
    
    // Single Responsibility: Clear all filters
    clearAllFilters() {
        this.currentFilters = {
            category: 'all',
            label: 'all',
            severity: 'all',
            search: ''
        };
        
        this.currentSort = {
            field: 'position',
            order: 'asc'
        };
        
        this.currentPage = 1;
        
        // Update UI controls
        const categoryFilter = document.getElementById('category-filter');
        const labelFilter = document.getElementById('label-filter');
        const severityFilter = document.getElementById('severity-filter');
        const searchInput = document.getElementById('search-input');
        const sortField = document.getElementById('sort-field');
        const sortOrder = document.getElementById('sort-order');
        
        if (categoryFilter) categoryFilter.value = 'all';
        if (labelFilter) labelFilter.value = 'all';
        if (severityFilter) severityFilter.value = 'all';
        if (searchInput) searchInput.value = '';
        if (sortField) sortField.value = 'position';
        if (sortOrder) sortOrder.value = 'asc';
        
        this.applyFilters();
        console.log('🧭 All filters cleared');
    }
    
    // Single Responsibility: Update results display
    updateResultsDisplay() {
        const resultsContainer = document.getElementById('analysis-results-list');
        if (!resultsContainer) {
            console.warn('🧭 Results container not found');
            return;
        }
        
        const startIndex = (this.currentPage - 1) * this.resultsPerPage;
        const endIndex = startIndex + this.resultsPerPage;
        const pageResults = this.filteredResults.slice(startIndex, endIndex);
        
        if (pageResults.length === 0) {
            resultsContainer.innerHTML = `
                <div class="no-results">
                    <p>🔍 Результатів не знайдено</p>
                    <p>Спробуйте змінити фільтри або пошуковий запит</p>
                </div>
            `;
            return;
        }
        
        resultsContainer.innerHTML = pageResults.map((item, index) => {
            const globalIndex = startIndex + index + 1;
            const severity = this.calculateSeverity(item);
            const severityClass = severity.toLowerCase().replace(' ', '-');
            
            return `
                <div class="analysis-result-item ${severityClass}" data-item-index="${globalIndex - 1}">
                    <div class="result-header">
                        <span class="result-number">#${globalIndex}</span>
                        <span class="result-category ${item.category}">
                            ${this.getCategoryIcon(item.category)} ${this.getCategoryName(item.category)}
                        </span>
                        <span class="result-severity severity-${severityClass}">
                            ${this.getSeverityIcon(severity)} ${severity}
                        </span>
                        <div class="result-actions">
                            <button class="add-to-workspace-btn" data-item='${JSON.stringify(item)}' title="Додати до робочого простору">
                                📝 Workspace
                            </button>
                        </div>
                    </div>
                    <div class="result-content">
                        <div class="result-text">${this.highlightSearchTerm(this.escapeHtml(item.text))}</div>
                        <div class="result-label">${this.escapeHtml(item.label || 'Без мітки')}</div>
                        <div class="result-meta">
                            Позиція: ${item.start_pos || 0}-${item.end_pos || 0} | 
                            Довжина: ${item.text?.length || 0} символів
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        this.attachResultHandlers();
    }
    
    // Single Responsibility: Update pagination
    updatePagination() {
        const paginationContainer = document.getElementById('pagination-container');
        if (!paginationContainer) return;
        
        const totalPages = Math.ceil(this.filteredResults.length / this.resultsPerPage);
        
        if (totalPages <= 1) {
            paginationContainer.innerHTML = '';
            return;
        }
        
        let paginationHTML = '<div class="pagination">';
        
        // Previous button
        if (this.currentPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="navigationService.navigateToPage(${this.currentPage - 1})">← Попередня</button>`;
        }
        
        // Page numbers
        const showPages = 5;
        let startPage = Math.max(1, this.currentPage - Math.floor(showPages / 2));
        let endPage = Math.min(totalPages, startPage + showPages - 1);
        
        if (endPage - startPage < showPages - 1) {
            startPage = Math.max(1, endPage - showPages + 1);
        }
        
        if (startPage > 1) {
            paginationHTML += `<button class="pagination-btn" onclick="navigationService.navigateToPage(1)">1</button>`;
            if (startPage > 2) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
        }
        
        for (let i = startPage; i <= endPage; i++) {
            const activeClass = i === this.currentPage ? 'active' : '';
            paginationHTML += `<button class="pagination-btn ${activeClass}" onclick="navigationService.navigateToPage(${i})">${i}</button>`;
        }
        
        if (endPage < totalPages) {
            if (endPage < totalPages - 1) {
                paginationHTML += '<span class="pagination-ellipsis">...</span>';
            }
            paginationHTML += `<button class="pagination-btn" onclick="navigationService.navigateToPage(${totalPages})">${totalPages}</button>`;
        }
        
        // Next button
        if (this.currentPage < totalPages) {
            paginationHTML += `<button class="pagination-btn" onclick="navigationService.navigateToPage(${this.currentPage + 1})">Наступна →</button>`;
        }
        
        paginationHTML += '</div>';
        paginationContainer.innerHTML = paginationHTML;
    }
    
    // Single Responsibility: Update filter options
    updateFilterOptions() {
        this.updateCategoryFilter();
        this.updateLabelFilter();
        this.updateSeverityFilter();
    }
    
    // Single Responsibility: Update category filter options
    updateCategoryFilter() {
        const categoryFilter = document.getElementById('category-filter');
        if (!categoryFilter) return;
        
        const categories = [...new Set(this.currentResults.map(item => item.category).filter(Boolean))];
        
        categoryFilter.innerHTML = `
            <option value="all">Усі категорії</option>
            ${categories.map(category => `
                <option value="${category}" ${this.currentFilters.category === category ? 'selected' : ''}>
                    ${this.getCategoryIcon(category)} ${this.getCategoryName(category)}
                </option>
            `).join('')}
        `;
    }
    
    // Single Responsibility: Update label filter options
    updateLabelFilter() {
        const labelFilter = document.getElementById('label-filter');
        if (!labelFilter) return;
        
        const labels = [...new Set(this.currentResults.map(item => item.label).filter(Boolean))];
        
        labelFilter.innerHTML = `
            <option value="all">Усі мітки</option>
            ${labels.map(label => `
                <option value="${label}" ${this.currentFilters.label === label ? 'selected' : ''}>
                    ${this.escapeHtml(label)}
                </option>
            `).join('')}
        `;
    }
    
    // Single Responsibility: Update severity filter options
    updateSeverityFilter() {
        const severityFilter = document.getElementById('severity-filter');
        if (!severityFilter) return;
        
        const severities = ['Критичний', 'Високий', 'Середній', 'Низький'];
        
        severityFilter.innerHTML = `
            <option value="all">Усі рівні</option>
            ${severities.map(severity => `
                <option value="${severity}" ${this.currentFilters.severity === severity ? 'selected' : ''}>
                    ${this.getSeverityIcon(severity)} ${severity}
                </option>
            `).join('')}
        `;
    }
    
    // Single Responsibility: Update filter statistics
    updateFilterStats() {
        const statsContainer = document.getElementById('filter-stats');
        if (!statsContainer) return;
        
        const total = this.currentResults.length;
        const filtered = this.filteredResults.length;
        const showing = Math.min(this.resultsPerPage, filtered - (this.currentPage - 1) * this.resultsPerPage);
        
        statsContainer.innerHTML = `
            Показано: ${showing} з ${filtered} (загалом: ${total})
        `;
    }
    
    // Single Responsibility: Attach result item handlers
    attachResultHandlers() {
        // Workspace buttons
        document.querySelectorAll('.add-to-workspace-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const itemData = JSON.parse(btn.dataset.item);
                if (window.workspaceService) {
                    window.workspaceService.addToWorkspace(itemData);
                }
            });
        });
    }
    
    // Single Responsibility: Calculate item severity
    calculateSeverity(item) {
        if (!item) return 'Низький';
        
        const category = item.category || '';
        const textLength = item.text?.length || 0;
        
        // Category-based severity
        let baseSeverity = 1;
        if (category === 'manipulation') baseSeverity = 4;
        else if (category === 'cognitive_bias') baseSeverity = 3;
        else if (category === 'rhetological_fallacy') baseSeverity = 2;
        
        // Length modifier
        if (textLength > 200) baseSeverity += 1;
        else if (textLength < 50) baseSeverity -= 1;
        
        // Position modifier (earlier = more important)
        const position = item.start_pos || 0;
        if (position < 100) baseSeverity += 1;
        
        // Convert to severity level
        if (baseSeverity >= 5) return 'Критичний';
        if (baseSeverity >= 4) return 'Високий';
        if (baseSeverity >= 3) return 'Середній';
        return 'Низький';
    }
    
    // Single Responsibility: Get severity weight for sorting
    getSeverityWeight(severity) {
        const weights = {
            'Критичний': 4,
            'Високий': 3,
            'Середній': 2,
            'Низький': 1
        };
        return weights[severity] || 1;
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
    
    // Single Responsibility: Get severity icon
    getSeverityIcon(severity) {
        const icons = {
            'Критичний': '🔴',
            'Високий': '🟠',
            'Середній': '🟡',
            'Низький': '🟢'
        };
        return icons[severity] || '⚪';
    }
    
    // Single Responsibility: Highlight search terms
    highlightSearchTerm(text) {
        if (!this.currentFilters.search) return text;
        
        const query = this.currentFilters.search;
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<mark>$1</mark>');
    }
    
    // Single Responsibility: Escape HTML
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Export for module use
window.NavigationService = NavigationService;