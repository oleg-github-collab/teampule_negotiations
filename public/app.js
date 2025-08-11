// public/app.js - Покращена логіка додатку
(() => {
    'use strict';
  
    // ===== State Management =====
    const state = {
      currentClient: null,
      currentAnalysis: null,
      clients: [],
      analyses: [],
      selectedFragments: [],
      originalText: null
    };
  
    // ===== DOM Elements =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  
    const elements = {
      // Sidebars
      leftSidebar: $('.sidebar-left'),
      rightSidebar: $('.sidebar-right'),
      navToggle: $('#nav-toggle'),
      toolsToggle: $('#tools-toggle'),
  
      // Client management
      clientsList: $('#clients-list'),
      clientSearch: $('#client-search'),
      clearSearch: $('#clear-search'),
      clientCount: $('#client-count'),
      newClientBtn: $('#new-client-btn'),
      saveClientBtn: $('#save-client-btn'),
      cancelClientBtn: $('#cancel-client-btn'),
      currentClientSpan: $('#current-client span'),
  
      // Forms
      clientForm: $('#client-form'),
      analysisSection: $('#analysis-dashboard'),
      welcomeScreen: $('#welcome-screen'),
  
      // Analysis
      dropzone: $('#dropzone'),
      fileInput: $('#file-input'),
      textInput: $('#text-input'),
      analyzeBtn: $('#analyze-btn'),
      clearBtn: $('#clear-btn'),
      exportBtn: $('#export-btn'),
      streamOutput: $('#stream-output'),
      highlightedText: $('#highlighted-text'),
  
      // Tools
      bucket: $('#bucket'),
      adviceBtn: $('#advice-btn'),
      adviceOutput: $('#advice-output'),
      historyList: $('#history-list'),
      analysisHistory: $('#analysis-history'),
  
      // Barometer
      barometerScore: $('#barometer-score'),
      barometerLabel: $('#barometer-label'),
      gaugeNeedle: $('#gauge-needle'),
      gaugeFill: $('#gauge-fill'),
      factorGoal: $('#factor-goal'),
      factorManip: $('#factor-manip'),
      factorScope: $('#factor-scope'),
      factorTime: $('#factor-time'),
      factorResources: $('#factor-resources')
    };
  
    // ===== Utilities =====
    function showNotification(message, type = 'info') {
      const container = $('#notifications');
      const notification = document.createElement('div');
      notification.className = `notification notification-${type}`;
      notification.innerHTML = `
        <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}"></i>
        <span>${message}</span>
      `;
      container.appendChild(notification);
      setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => notification.remove(), 300);
      }, 4000);
    }
  
    function closeSidebar(which) {
      if (which === 'left') {
        elements.leftSidebar?.classList.remove('active');
      }
      if (which === 'right') {
        elements.rightSidebar?.classList.remove('active');
      }
    }
    window.closeSidebar = closeSidebar;
  
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
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
  
    // ===== Client Management =====
    async function loadClients() {
      try {
        logger.debug('Loading clients...');
        const res = await fetch('/api/clients');
        
        if (res.status === 401) {
          // Not authenticated, redirect to login
          logger.warn('Not authenticated, redirecting to login');
          window.location.href = '/login';
          return;
        }
        
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP Error: ${res.status}`);
        }
        
        if (data.clients) {
          state.clients = data.clients;
          logger.info(`Loaded ${data.clients.length} clients`);
        } else {
          state.clients = [];
          logger.warn('No clients data received');
        }
        
        renderClientsList();
      } catch (err) {
        logger.error('Failed to load clients', err);
        showNotification('Помилка завантаження клієнтів', 'error');
      }
    }
  
    function renderClientsList() {
      const searchTerm = elements.clientSearch.value.toLowerCase().trim();
      const filtered = state.clients.filter((c) => {
        if (!searchTerm) return true;
        return (
          c.company?.toLowerCase().includes(searchTerm) ||
          c.sector?.toLowerCase().includes(searchTerm) ||
          c.negotiator?.toLowerCase().includes(searchTerm)
        );
      });
  
      // Update client count
      elements.clientCount.textContent = filtered.length;
      
      // Show/hide clear search button
      elements.clearSearch.style.display = searchTerm ? 'block' : 'none';
  
      if (filtered.length === 0) {
        const emptyMessage = searchTerm ? 'Нічого не знайдено' : 'Немає клієнтів';
        const emptyIcon = searchTerm ? 'fas fa-search' : 'fas fa-users';
        elements.clientsList.innerHTML = `
          <div class="empty-state">
            <i class="${emptyIcon}"></i>
            <p>${emptyMessage}</p>
            ${!searchTerm ? '<button class="btn-primary" onclick="elements.newClientBtn.click()">Створити першого клієнта</button>' : ''}
          </div>
        `;
        return;
      }
  
      // Sort clients by last analysis date (most recent first), then by name
      const sorted = filtered.sort((a, b) => {
        if (a.last_analysis && b.last_analysis) {
          return new Date(b.last_analysis) - new Date(a.last_analysis);
        }
        if (a.last_analysis && !b.last_analysis) return -1;
        if (!a.last_analysis && b.last_analysis) return 1;
        return (a.company || '').localeCompare(b.company || '');
      });
  
      elements.clientsList.innerHTML = sorted
        .map((client) => {
          const isActive = state.currentClient?.id === client.id;
          const analysisText = client.analyses_count 
            ? `${client.analyses_count} аналіз${client.analyses_count === 1 ? '' : 'ів'}`
            : 'Новий';
          
          return `
            <div class="client-item ${isActive ? 'active' : ''}" data-id="${client.id}">
              <div class="client-info">
                <div class="client-name" title="${escapeHtml(client.company)}">
                  ${escapeHtml(client.company)}
                </div>
                <div class="client-meta">
                  ${client.sector ? `<span><i class="fas fa-industry"></i> ${escapeHtml(client.sector)}</span>` : ''}
                  <span><i class="fas fa-chart-bar"></i> ${analysisText}</span>
                  ${client.last_analysis ? `<span title="Останній аналіз"><i class="fas fa-clock"></i> ${formatDate(client.last_analysis)}</span>` : ''}
                </div>
              </div>
              <div class="client-actions">
                <button class="btn-icon btn-edit" title="Редагувати профіль">
                  <i class="fas fa-edit"></i>
                </button>
                <button class="btn-icon btn-delete" title="Видалити клієнта">
                  <i class="fas fa-trash"></i>
                </button>
              </div>
            </div>
          `;
        })
        .join('');
  
      // Attach event listeners with improved UX
      $$('.client-item').forEach((item) => {
        const clientId = Number(item.dataset.id);
        
        // Add hover effect with client preview
        item.addEventListener('mouseenter', () => {
          if (!item.classList.contains('active')) {
            item.style.transform = 'translateX(6px)';
          }
        });
        
        item.addEventListener('mouseleave', () => {
          if (!item.classList.contains('active')) {
            item.style.transform = '';
          }
        });
        
        item.addEventListener('click', (e) => {
          if (e.target.closest('.btn-edit')) {
            e.stopPropagation();
            editClient(clientId);
          } else if (e.target.closest('.btn-delete')) {
            e.stopPropagation();
            deleteClient(clientId);
          } else {
            selectClient(clientId);
          }
        });
      });
      
      logger.debug('Rendered clients list', { total: state.clients.length, filtered: filtered.length, searchTerm });
    }
  
    async function selectClient(id) {
      try {
        const res = await fetch(`/api/clients/${id}`);
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP Error: ${res.status}`);
        }
        
        state.currentClient = data.client;
        state.analyses = data.analyses || [];
  
        // Update UI
        elements.currentClientSpan.textContent = state.currentClient.company;
        elements.analyzeBtn.disabled = false;
        elements.welcomeScreen.style.display = 'none';
        elements.clientForm.style.display = 'none';
        elements.analysisSection.style.display = 'block';
  
        // Show analysis history
        if (state.analyses.length > 0) {
          elements.analysisHistory.style.display = 'block';
          renderAnalysisHistory();
        } else {
          elements.analysisHistory.style.display = 'none';
        }
  
        renderClientsList();
        updateRightPanel();
        showNotification(`Обрано клієнта: ${state.currentClient.company}`, 'success');
      } catch (err) {
        logger.error('Failed to load client', { id, error: err.message });
        showNotification('Помилка завантаження клієнта', 'error');
      }
    }
  
    function renderAnalysisHistory() {
      if (state.analyses.length === 0) {
        elements.historyList.innerHTML = '<p class="muted">Немає аналізів</p>';
        return;
      }
      elements.historyList.innerHTML = state.analyses
        .map((analysis) => {
          const barometer = JSON.parse(analysis.barometer_json || '{}');
          return `
          <div class="history-item" data-id="${analysis.id}">
            <div class="history-info">
              <div class="history-title">${escapeHtml(analysis.title || 'Без назви')}</div>
              <div class="history-meta">
                <span>${formatDate(analysis.created_at)}</span>
                ${barometer.score ? `<span class="score-badge">${Math.round(barometer.score)}</span>` : ''}
              </div>
            </div>
            <button class="btn-icon btn-load" title="Завантажити">
              <i class="fas fa-folder-open"></i>
            </button>
          </div>
        `;
        })
        .join('');
  
      $$('.history-item').forEach((item) => {
        item.addEventListener('click', () => {
          loadAnalysis(Number(item.dataset.id));
        });
      });
    }
  
    async function loadAnalysis(analysisId) {
      try {
        const res = await fetch(`/api/clients/${state.currentClient.id}/analysis/${analysisId}`);
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP Error: ${res.status}`);
        }
        
        // Store original text for highlighting
        state.originalText = data.analysis.original_text || '';
        
        displayAnalysisResults(data.analysis);
        showNotification('Аналіз завантажено', 'success');
      } catch (err) {
        logger.error('Failed to load analysis', { analysisId, error: err.message });
        showNotification('Помилка завантаження аналізу', 'error');
      }
    }
  
    function editClient(id) {
      const client = state.clients.find((c) => c.id === id);
      if (!client) return;
      state.currentClient = client;
      
      logger.debug('Editing client', { clientId: id, company: client.company });
  
      // Fill basic info
      $('#company').value = client.company || '';
      $('#negotiator').value = client.negotiator || '';
      
      // Handle sector dropdown
      const sectorSelect = $('#sector-select');
      const sectorInput = $('#sector');
      if (client.sector) {
        const option = sectorSelect.querySelector(`option[value="${client.sector}"]`);
        if (option) {
          sectorSelect.value = client.sector;
          sectorInput.style.display = 'none';
        } else {
          sectorSelect.value = 'Other';
          sectorInput.style.display = 'block';
          sectorInput.value = client.sector;
        }
      }
      
      // Fill new fields
      $('#company-size').value = client.company_size || '';
      $('#negotiation-type').value = client.negotiation_type || '';
      $('#deal-value').value = client.deal_value || '';
      $('#timeline').value = client.timeline || '';
      $('#competitors').value = client.competitors || '';
      $('#competitive-advantage').value = client.competitive_advantage || '';
      $('#market-position').value = client.market_position || '';
      $('#previous-interactions').value = client.previous_interactions || '';
      
      // Fill existing fields
      $('#goal').value = client.goal || '';
      $('#criteria').value = client.decision_criteria || '';
      $('#constraints').value = client.constraints || '';
      $('#user_goals').value = client.user_goals || '';
      $('#client_goals').value = client.client_goals || '';
      $('#weekly_hours').value = client.weekly_hours || '';
      $('#offered_services').value = client.offered_services || '';
      $('#deadlines').value = client.deadlines || '';
      $('#notes').value = client.notes || '';
  
      // Show form
      elements.welcomeScreen.style.display = 'none';
      elements.analysisSection.style.display = 'none';
      elements.clientForm.style.display = 'block';
    }
  
    async function deleteClient(id) {
      if (!confirm('Видалити клієнта та всі його аналізи?')) return;
      try {
        const res = await fetch(`/api/clients/${id}`, { method: 'DELETE' });
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP Error: ${res.status}`);
        }
  
        if (state.currentClient?.id === id) {
          state.currentClient = null;
          elements.currentClientSpan.textContent = 'Оберіть клієнта';
          elements.analyzeBtn.disabled = true;
          elements.analysisSection.style.display = 'none';
          elements.welcomeScreen.style.display = 'block';
        }
  
        await loadClients();
        showNotification('Клієнта видалено', 'success');
      } catch (err) {
        logger.error('Failed to delete client', { id, error: err.message });
        showNotification('Помилка видалення', 'error');
      }
    }
  
    async function saveClient() {
      // Get sector value (from dropdown or input)
      const sectorSelect = $('#sector-select');
      const sectorInput = $('#sector');
      const sectorValue = sectorSelect.value === 'Other' ? sectorInput.value.trim() : sectorSelect.value;
      
      const clientData = {
        company: $('#company').value.trim(),
        negotiator: $('#negotiator').value.trim(),
        sector: sectorValue,
        company_size: $('#company-size').value,
        negotiation_type: $('#negotiation-type').value,
        deal_value: $('#deal-value').value.trim(),
        timeline: $('#timeline').value,
        goal: $('#goal').value.trim(),
        decision_criteria: $('#criteria').value.trim(),
        constraints: $('#constraints').value.trim(),
        user_goals: $('#user_goals').value.trim(),
        client_goals: $('#client_goals').value.trim(),
        competitors: $('#competitors').value.trim(),
        competitive_advantage: $('#competitive-advantage').value.trim(),
        market_position: $('#market-position').value,
        weekly_hours: $('#weekly_hours').value || 0,
        offered_services: $('#offered_services').value.trim(),
        deadlines: $('#deadlines').value.trim(),
        previous_interactions: $('#previous-interactions').value.trim(),
        notes: $('#notes').value.trim()
      };
      
      if (!clientData.company) {
        showNotification('Введіть назву компанії', 'warning');
        $('#company').focus();
        return;
      }
      
      const isUpdate = state.currentClient && state.currentClient.id;
      logger.debug('Saving client', { isUpdate, company: clientData.company });
  
      try {
        const url = isUpdate ? `/api/clients/${state.currentClient.id}` : '/api/clients';
        const method = isUpdate ? 'PUT' : 'POST';
        
        const res = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
  
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP Error: ${res.status}`);
        }
        
        logger.info('Client saved successfully', { clientId: data.id, isUpdate });
  
        await loadClients();
        selectClient(data.id);
  
        showNotification(isUpdate ? 'Клієнта оновлено' : 'Клієнта створено', 'success');
      } catch (err) {
        logger.error('Failed to save client', { clientData, error: err.message });
        showNotification(`Помилка збереження: ${err.message}`, 'error');
      }
    }
  
    // ===== Analysis Functions =====
    let currentAbortController = null;
  
    async function runAnalysis() {
      const text = elements.textInput.value.trim();
      const file = elements.fileInput.files?.[0];
      if (!text && !file) {
        showNotification('Введіть текст або оберіть файл', 'warning');
        return;
      }
  
      if (!state.currentClient) {
        showNotification('Спочатку оберіть клієнта', 'warning');
        return;
      }
  
      // Prepare form data
      const formData = new FormData();
      formData.append('client_id', state.currentClient.id);
  
      const profile = {
        company: state.currentClient.company,
        negotiator: state.currentClient.negotiator,
        sector: state.currentClient.sector,
        goal: state.currentClient.goal,
        criteria: state.currentClient.decision_criteria,
        constraints: state.currentClient.constraints,
        user_goals: state.currentClient.user_goals,
        client_goals: state.currentClient.client_goals,
        weekly_hours: state.currentClient.weekly_hours,
        offered_services: state.currentClient.offered_services,
        deadlines: state.currentClient.deadlines,
        notes: state.currentClient.notes
      };
  
      formData.append('profile', JSON.stringify(profile));
      if (file) {
        formData.append('file', file);
      } else {
        formData.append('text', text);
      }
  
      // Store original text for highlighting (will be updated from server response for file uploads)
      state.originalText = text || '[File content will be processed...]';
      
      // Reset UI
      elements.streamOutput.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Аналізую...</div>';
      elements.highlightedText.innerHTML = '<div class="empty-state"><i class="fas fa-highlighter"></i><p>Обробка...</p></div>';
      resetBarometer();
      state.selectedFragments = [];
      elements.bucket.innerHTML = '';
      elements.adviceBtn.disabled = true;
      elements.exportBtn.disabled = true;
  
      // Toggle analyze button
      currentAbortController = new AbortController();
      elements.analyzeBtn.innerHTML = '<i class="fas fa-stop"></i> Зупинити';
      elements.analyzeBtn.onclick = () => {
        currentAbortController?.abort();
        currentAbortController = null;
        elements.analyzeBtn.innerHTML = '<i class="fas fa-play"></i> Аналізувати';
        elements.analyzeBtn.onclick = runAnalysis;
      };
  
      try {
        const res = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
          signal: currentAbortController.signal
        });
  
        if (!res.ok || !res.body) {
          throw new Error('Помилка аналізу');
        }
  
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let outputHtml = '';
        let highlights = [];
        let barometerData = null;
  
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
  
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split('\n');
  
          for (const line of lines) {
            if (!line.trim()) continue;
  
            if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              if (!data) continue;
  
              try {
                const obj = JSON.parse(data);
  
                if (obj.type === 'highlight') {
                  outputHtml += `<div class="stream-item highlight">${escapeHtml(JSON.stringify(obj))}</div>`;
                } else if (obj.type === 'merged_highlights') {
                  highlights = obj.items || [];
                  renderHighlights(highlights);
                } else if (obj.type === 'barometer') {
                  barometerData = obj;
                  updateBarometer(obj);
                  outputHtml += `<div class="stream-item barometer">Barometer: ${obj.score} - ${obj.label}</div>`;
                } else if (obj.type === 'summary') {
                  outputHtml += `<div class="stream-item summary">${escapeHtml(JSON.stringify(obj))}</div>`;
                } else if (obj.type === 'analysis_saved') {
                  // Update original text from server response
                  if (obj.original_text) {
                    state.originalText = obj.original_text;
                  }
                  await loadClients(); // Refresh to show new analysis count
                  if (state.currentClient?.id === obj.client_id) {
                    const r2 = await fetch(`/api/clients/${obj.client_id}`);
                    const d2 = await r2.json();
                    state.analyses = d2.analyses || [];
                    renderAnalysisHistory();
                  }
                }
  
                elements.streamOutput.innerHTML = outputHtml;
                elements.streamOutput.scrollTop = elements.streamOutput.scrollHeight;
              } catch (err) {
                console.warn('Parse error:', err);
              }
            }
          }
        }
  
        elements.exportBtn.disabled = false;
        showNotification('Аналіз завершено', 'success');
      } catch (err) {
        if (err.name === 'AbortError') {
          logger.info('Analysis aborted by user');
          showNotification('Аналіз скасовано', 'warning');
        } else {
          logger.error('Analysis failed', { error: err.message, clientId: state.currentClient?.id });
          showNotification(`Помилка: ${err.message}`, 'error');
        }
        elements.streamOutput.innerHTML = `<div class="error">Помилка: ${err.message}</div>`;
      } finally {
        currentAbortController = null;
        elements.analyzeBtn.innerHTML = '<i class="fas fa-play"></i> Аналізувати';
        elements.analyzeBtn.onclick = runAnalysis;
      }
    }
  
    function displayAnalysisResults(analysis) {
      // Display highlights
      const highlights = analysis.highlights || [];
      renderHighlights(highlights);
  
      // Display barometer
      if (analysis.barometer) {
        updateBarometer(analysis.barometer);
      }
  
      // Display summary
      if (analysis.summary) {
        elements.streamOutput.innerHTML = `
          <div class="summary-display">
            <h4>Підсумок аналізу</h4>
            <pre>${JSON.stringify(analysis.summary, null, 2)}</pre>
          </div>
        `;
      }
  
      elements.exportBtn.disabled = false;
    }
  
    function renderHighlights(highlights) {
      if (highlights.length === 0) {
        elements.highlightedText.innerHTML =
          '<div class="empty-state"><i class="fas fa-highlighter"></i><p>Немає підсвічених фрагментів</p></div>';
        return;
      }
      
      // Render both the paragraph view with inline highlights and the list view
      const inlineText = renderInlineHighlights(highlights);
      const listHtml = highlights
        .map((h) => {
          const cls =
            h.category === 'manipulation'
              ? 'manip'
              : h.category === 'cognitive_bias'
              ? 'cog'
              : 'fallacy';
          const labels = Array.isArray(h.labels) ? h.labels.join(', ') : h.label || '';
  
          return `
          <div class="highlight-item ${cls}" data-highlight='${JSON.stringify(h)}'>
            <div class="highlight-header">
              <span class="highlight-category">${h.category}</span>
              <span class="highlight-label">${escapeHtml(labels)}</span>
            </div>
            <div class="highlight-text">${escapeHtml(h.text || '[Fragment]')}</div>
            ${h.explanation ? `<div class="highlight-explanation">${escapeHtml(h.explanation)}</div>` : ''}
            <button class="btn-icon btn-add-fragment" title="Додати до інструментів">
              <i class="fas fa-plus"></i>
            </button>
          </div>
        `;
        })
        .join('');

      // Create tabbed view
      elements.highlightedText.innerHTML = `
        <div class="highlight-tabs">
          <button class="tab-btn active" data-tab="inline">📄 Текст з підсвіткою</button>
          <button class="tab-btn" data-tab="list">📋 Список фрагментів</button>
        </div>
        <div class="tab-content active" data-content="inline">
          <div class="inline-highlights">
            ${inlineText}
          </div>
        </div>
        <div class="tab-content" data-content="list">
          <div class="highlights-list">
            ${listHtml}
          </div>
        </div>
      `;
      
      // Add tab switching
      $$('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          const tab = btn.dataset.tab;
          $$('.tab-btn').forEach(b => b.classList.remove('active'));
          $$('.tab-content').forEach(c => c.classList.remove('active'));
          btn.classList.add('active');
          $(`[data-content="${tab}"]`).classList.add('active');
        });
      });
  
      // Add click handlers for list view
      $$('.btn-add-fragment').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const item = e.target.closest('.highlight-item');
          const highlight = JSON.parse(item.dataset.highlight);
          addFragmentToBucket(highlight);
        });
      });
      
      // Add click handlers for inline highlights
      $$('.highlight-span').forEach((span) => {
        span.addEventListener('click', (e) => {
          const highlight = JSON.parse(span.dataset.highlight);
          addFragmentToBucket(highlight);
          showNotification('Фрагмент додано з тексту', 'success');
        });
      });
    }
    
    function renderInlineHighlights(highlights) {
      if (!state.originalText) return '<p>Оригінальний текст недоступний</p>';
      
      // Sort highlights by position for proper rendering
      const sortedHighlights = highlights.sort((a, b) => (a.char_start || 0) - (b.char_start || 0));
      
      let result = '';
      let lastOffset = 0;
      
      // Split text into paragraphs first
      const paragraphs = state.originalText.split(/\n\s*\n/);
      let currentOffset = 0;
      
      paragraphs.forEach((paragraph, paragraphIndex) => {
        const paragraphStart = currentOffset;
        const paragraphEnd = currentOffset + paragraph.length;
        
        // Find highlights that belong to this paragraph
        const paragraphHighlights = sortedHighlights.filter(h => 
          h.paragraph_index === paragraphIndex || 
          (h.char_start >= paragraphStart && h.char_end <= paragraphEnd)
        );
        
        let paragraphResult = '';
        let paragraphOffset = 0;
        
        paragraphHighlights.forEach(highlight => {
          const start = (highlight.char_start || 0) - paragraphStart;
          const end = (highlight.char_end || start + 10) - paragraphStart;
          
          if (start >= 0 && end <= paragraph.length) {
            // Add text before highlight
            paragraphResult += escapeHtml(paragraph.slice(paragraphOffset, start));
            
            // Add highlighted text
            const cls = highlight.category === 'manipulation' ? 'manip' : 
                       highlight.category === 'cognitive_bias' ? 'cog' : 'fallacy';
            const text = paragraph.slice(start, end);
            const labels = Array.isArray(highlight.labels) ? highlight.labels.join(', ') : highlight.label || '';
            
            paragraphResult += `<span class="highlight-span ${cls}" 
              title="${escapeHtml(labels)}: ${escapeHtml(highlight.explanation || '')}" 
              data-highlight='${JSON.stringify(highlight)}'>
              ${escapeHtml(text)}
            </span>`;
            
            paragraphOffset = end;
          }
        });
        
        // Add remaining text
        paragraphResult += escapeHtml(paragraph.slice(paragraphOffset));
        
        if (paragraphResult.trim()) {
          result += `<p class="original-paragraph">${paragraphResult}</p>`;
        }
        
        currentOffset = paragraphEnd + 2; // +2 for \n\n
      });
      
      return result || '<p>Помилка рендерингу тексту</p>';
    }
  
    function addFragmentToBucket(fragment) {
      state.selectedFragments.push(fragment);
      const item = document.createElement('div');
      item.className = 'bucket-item';
      const catClass =
        fragment.category === 'manipulation'
          ? 'manip'
          : fragment.category === 'cognitive_bias'
          ? 'cog'
          : 'fallacy';
      item.innerHTML = `
        <div class="bucket-content">
          <span class="bucket-category ${catClass}">
            ${fragment.category}
          </span>
          <span class="bucket-text">${escapeHtml(fragment.text || '')}</span>
        </div>
        <button class="btn-icon btn-remove" title="Видалити">
          <i class="fas fa-times"></i>
        </button>
      `;
  
      item.querySelector('.btn-remove').addEventListener('click', () => {
        const idx = state.selectedFragments.indexOf(fragment);
        if (idx > -1) state.selectedFragments.splice(idx, 1);
        item.remove();
        elements.adviceBtn.disabled = state.selectedFragments.length === 0;
      });
  
      elements.bucket.appendChild(item);
      elements.adviceBtn.disabled = false;
  
      showNotification('Фрагмент додано', 'success');
    }
  
    // ===== Barometer =====
    function resetBarometer() {
      elements.barometerScore.textContent = '—';
      elements.barometerLabel.textContent = 'Очікування...';
      updateGauge(0);
      updateFactors({});
    }
  
    function updateBarometer(data) {
      const score = Math.round(data.score || 0);
      elements.barometerScore.textContent = score;
      elements.barometerLabel.textContent = data.label || '';
      updateGauge(score);
      updateFactors(data.factors || {});
    }
  
    function updateGauge(score) {
      const angle = -90 + (score / 100) * 180;
      elements.gaugeNeedle.setAttribute('x2', 100 + 70 * Math.cos((angle * Math.PI) / 180));
      elements.gaugeNeedle.setAttribute('y2', 100 + 70 * Math.sin((angle * Math.PI) / 180));
      const arcPath = describeArc(100, 100, 80, -90, -90 + (score / 100) * 180);
      elements.gaugeFill.setAttribute('d', arcPath);
    }
  
    function describeArc(x, y, radius, startAngle, endAngle) {
      const start = polarToCartesian(x, y, radius, endAngle);
      const end = polarToCartesian(x, y, radius, startAngle);
      const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
      return `M ${end.x} ${end.y} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${start.x} ${start.y}`;
    }
  
    function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
      const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
      return {
        x: centerX + radius * Math.cos(angleInRadians),
        y: centerY + radius * Math.sin(angleInRadians)
      };
    }
  
    function updateFactors(factors) {
      elements.factorGoal.style.width = `${(factors.goal_alignment || 0) * 100}%`;
      elements.factorManip.style.width = `${(factors.manipulation_density || 0) * 100}%`;
      elements.factorScope.style.width = `${(factors.scope_clarity || 0) * 100}%`;
      elements.factorTime.style.width = `${(factors.time_pressure || 0) * 100}%`;
      elements.factorResources.style.width = `${(factors.resource_demand || 0) * 100}%`;
    }
  
    // ===== Advice =====
    async function getAdvice() {
      if (state.selectedFragments.length === 0) {
        showNotification('Додайте фрагменти для аналізу', 'warning');
        return;
      }
      elements.adviceBtn.disabled = true;
      elements.adviceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Обробка...';
  
      try {
        const res = await fetch('/api/advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            items: state.selectedFragments,
            profile: state.currentClient || {}
          })
        });
  
        const data = await res.json();
        
        if (!res.ok || !data.success) {
          throw new Error(data.error || `HTTP Error: ${res.status}`);
        }
  
        if (data.advice) {
          elements.adviceOutput.innerHTML = `
            <div class="advice-content">
              <h4>Рекомендації</h4>
              <pre>${JSON.stringify(data.advice, null, 2)}</pre>
            </div>
          `;
          elements.adviceOutput.style.display = 'block';
          showNotification('Рекомендації готові', 'success');
        }
      } catch (err) {
        logger.error('Failed to get advice', { fragmentsCount: state.selectedFragments.length, error: err.message });
        showNotification('Помилка отримання рекомендацій', 'error');
      } finally {
        elements.adviceBtn.disabled = false;
        elements.adviceBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Отримати рекомендації';
      }
    }
  
    // ===== Export =====
    function exportResults() {
      const content = elements.streamOutput.textContent || '';
      if (!content) {
        showNotification('Немає даних для експорту', 'warning');
        return;
      }
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `analysis_${Date.now()}.txt`;
      a.click();
      URL.revokeObjectURL(url);
  
      showNotification('Дані експортовано', 'success');
    }
  
    // ===== Event Listeners =====
    elements.navToggle?.addEventListener('click', () => {
      elements.leftSidebar?.classList.toggle('active');
    });
    elements.toolsToggle?.addEventListener('click', () => {
      const panel = $('#recommendations-panel');
      panel?.classList.toggle('active');
      panel?.classList.toggle('collapsed');
    });
    
    // Right panel event listeners
    $('#refresh-panel')?.addEventListener('click', () => {
      updateRightPanel();
      showNotification('Панель оновлено', 'info');
    });
    
    $('#toggle-panel')?.addEventListener('click', () => {
      const panel = $('#recommendations-panel');
      panel?.classList.toggle('collapsed');
    });
    
    $('#quick-new-client')?.addEventListener('click', () => {
      document.getElementById('new-client-btn')?.click();
    });
    
    $('#get-advice-btn')?.addEventListener('click', getAdvice);
    elements.clientSearch?.addEventListener('input', renderClientsList);
    elements.clearSearch?.addEventListener('click', () => {
      elements.clientSearch.value = '';
      elements.clearSearch.style.display = 'none';
      renderClientsList();
      elements.clientSearch.focus();
    });
  
    elements.newClientBtn?.addEventListener('click', () => {
      state.currentClient = null;
      logger.debug('Creating new client');
      
      // Clear all form fields
      $$('#client-form input, #client-form textarea, #client-form select').forEach((el) => {
        el.value = '';
      });
      
      // Reset sector dropdown
      $('#sector-select').value = '';
      $('#sector').style.display = 'none';
      
      elements.welcomeScreen.style.display = 'none';
      elements.analysisSection.style.display = 'none';
      elements.clientForm.style.display = 'block';
      
      // Focus on company name field
      setTimeout(() => $('#company').focus(), 100);
    });
    
    // Handle sector dropdown change
    $('#sector-select')?.addEventListener('change', (e) => {
      const sectorInput = $('#sector');
      if (e.target.value === 'Other') {
        sectorInput.style.display = 'block';
        sectorInput.focus();
      } else {
        sectorInput.style.display = 'none';
        sectorInput.value = '';
      }
    });
  
    elements.saveClientBtn?.addEventListener('click', saveClient);
    elements.cancelClientBtn?.addEventListener('click', () => {
      elements.clientForm.style.display = 'none';
      if (state.currentClient) {
        elements.analysisSection.style.display = 'block';
      } else {
        elements.welcomeScreen.style.display = 'block';
      }
    });
  
    elements.dropzone?.addEventListener('click', () => {
      elements.fileInput?.click();
    });
    elements.dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      elements.dropzone.classList.add('dragover');
    });
    elements.dropzone?.addEventListener('dragleave', () => {
      elements.dropzone.classList.remove('dragover');
    });
    elements.dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      elements.dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        elements.fileInput.files = e.dataTransfer.files;
        updateDropzoneText(e.dataTransfer.files[0].name);
      }
    });
    elements.fileInput?.addEventListener('change', () => {
      if (elements.fileInput.files.length > 0) {
        updateDropzoneText(elements.fileInput.files[0].name);
      }
    });
  
    function updateDropzoneText(filename) {
      elements.dropzone.innerHTML = `
        <i class="fas fa-file"></i>
        <p>Файл обрано</p>
        <span>${escapeHtml(filename)}</span>
      `;
    }
  
    elements.analyzeBtn?.addEventListener('click', runAnalysis);
    elements.clearBtn?.addEventListener('click', () => {
      elements.textInput.value = '';
      elements.fileInput.value = '';
      elements.dropzone.innerHTML = `
        <i class="fas fa-cloud-upload-alt"></i>
        <p>Перетягніть файл сюди</p>
        <span>або натисніть для вибору</span>
      `;
    });
    elements.exportBtn?.addEventListener('click', exportResults);
    elements.adviceBtn?.addEventListener('click', getAdvice);
    $('#logout-btn')?.addEventListener('click', async () => {
      await fetch('/api/logout', { method: 'POST' });
      location.href = '/login';
    });
  
    // ===== Onboarding System =====
    const onboarding = {
      currentStep: 1,
      totalSteps: 4,
      modal: $('#onboarding-modal'),
      
      init() {
        // Show onboarding for first-time users
        const hasSeenOnboarding = localStorage.getItem('teampulse_onboarding_completed');
        if (!hasSeenOnboarding && state.clients.length === 0) {
          this.show();
        }
        
        this.bindEvents();
      },
      
      show() {
        this.modal.classList.add('active');
        this.updateStep();
        console.log('📚 Onboarding started');
      },
      
      hide() {
        this.modal.classList.remove('active');
        localStorage.setItem('teampulse_onboarding_completed', 'true');
        console.log('📚 Onboarding completed');
      },

      complete() {
        this.hide();
        // Automatically open client creation form
        elements.newClientBtn.click();
        showNotification('Ласкаво просимо до TeamPulse Turbo! 🚀', 'success');
      },
      
      nextStep() {
        if (this.currentStep < this.totalSteps) {
          this.currentStep++;
          this.updateStep();
        } else {
          this.complete();
        }
      },
      
      prevStep() {
        if (this.currentStep > 1) {
          this.currentStep--;
          this.updateStep();
        }
      },
      
      updateStep() {
        // Hide all steps
        $$('.onboarding-step').forEach(step => step.style.display = 'none');
        
        // Show current step
        $(`#step-${this.currentStep}`).style.display = 'block';
        
        // Update progress
        const progress = (this.currentStep / this.totalSteps) * 100;
        $('#progress-fill').style.width = `${progress}%`;
        $('#progress-text').textContent = `Крок ${this.currentStep} з ${this.totalSteps}`;
        
        // Update buttons
        const prevBtn = $('#prev-step');
        const nextBtn = $('#next-step');
        
        prevBtn.style.display = this.currentStep > 1 ? 'block' : 'none';
        
        if (this.currentStep === this.totalSteps) {
          nextBtn.innerHTML = 'Почати <i class="fas fa-rocket"></i>';
        } else {
          nextBtn.innerHTML = 'Далі <i class="fas fa-arrow-right"></i>';
        }
      },
      
      complete() {
        this.hide();
        // Auto-create first client
        elements.newClientBtn.click();
        showNotification('Ласкаво просимо! Створіть свого першого клієнта', 'success');
      },
      
      bindEvents() {
        $('#skip-onboarding')?.addEventListener('click', () => this.hide());
        $('#next-step')?.addEventListener('click', () => this.nextStep());
        $('#prev-step')?.addEventListener('click', () => this.prevStep());
        
        // Close on outside click
        this.modal?.addEventListener('click', (e) => {
          if (e.target === this.modal) this.hide();
        });
      }
    };
    
    // ===== Enhanced Logging System =====
    const logger = {
      levels: { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 },
      currentLevel: 2, // INFO level by default
      
      log(level, message, data = null) {
        if (this.levels[level] <= this.currentLevel) {
          const timestamp = new Date().toISOString();
          const prefix = `[${timestamp}] [${level}]`;
          
          if (data) {
            console.log(`${prefix} ${message}`, data);
          } else {
            console.log(`${prefix} ${message}`);
          }
          
          // Send critical errors to server if needed
          if (level === 'ERROR' && window.navigator?.sendBeacon) {
            try {
              const errorData = { level, message, data, timestamp, url: location.href };
              fetch('/api/log-error', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(errorData)
              }).catch(() => {/* Silent fail for logging */});
            } catch (e) {
              // Silent fail for logging
            }
          }
        }
      },
      
      error: (msg, data) => logger.log('ERROR', msg, data),
      warn: (msg, data) => logger.log('WARN', msg, data),
      info: (msg, data) => logger.log('INFO', msg, data),
      debug: (msg, data) => logger.log('DEBUG', msg, data)
    };
  
    // ===== Token Management =====
    async function loadTokenUsage() {
      try {
        const res = await fetch('/api/usage');
        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(`HTTP Error: ${res.status}`);
        }
        
        updateTokenDisplay(data);
      } catch (err) {
        logger.error('Failed to load token usage', err);
      }
    }

    function updateTokenDisplay(data) {
      const usedTokens = $('#used-tokens');
      const totalTokens = $('#total-tokens');
      const tokenProgressFill = $('#token-progress-fill');
      
      if (!usedTokens || !totalTokens || !tokenProgressFill) return;
      
      const used = data.used_tokens || 0;
      const total = data.total_tokens || 100000;
      const percentage = data.percentage || 0;
      
      usedTokens.textContent = formatNumber(used);
      totalTokens.textContent = formatNumber(total);
      tokenProgressFill.style.width = `${Math.min(percentage, 100)}%`;
      
      // Change color based on usage
      tokenProgressFill.className = 'token-progress-fill';
      if (percentage > 90) {
        tokenProgressFill.classList.add('danger');
      } else if (percentage > 75) {
        tokenProgressFill.classList.add('warning');
      }
      
      logger.debug('Token usage updated', { used, total, percentage });
    }

    function formatNumber(num) {
      if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
      if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
      return num.toString();
    }

    // ===== Text Statistics =====
    function updateTextStats() {
      const text = elements.textInput?.value || '';
      const chars = text.length;
      const words = text.trim() ? text.trim().split(/\s+/).length : 0;
      
      const charCount = $('#char-count');
      const wordCount = $('#word-count');
      
      if (charCount) charCount.textContent = `${chars} символів`;
      if (wordCount) wordCount.textContent = `${words} слів`;
    }

    // Update onboarding to be mandatory
    onboarding.init = function() {
      // Always show onboarding for new users or when no clients exist
      const hasSeenOnboarding = localStorage.getItem('teampulse_onboarding_completed');
      if (!hasSeenOnboarding || state.clients.length === 0) {
        this.show();
      }
      this.bindEvents();
    };

    onboarding.bindEvents = function() {
      // Make onboarding mandatory - remove skip functionality
      $('#skip-onboarding')?.addEventListener('click', (e) => {
        e.preventDefault();
        showNotification('Онбординг обов\'язковий для нових користувачів', 'warning');
      });
      
      $('#next-step')?.addEventListener('click', () => this.nextStep());
      $('#prev-step')?.addEventListener('click', () => this.prevStep());
      
      // Prevent closing on outside click
      this.modal?.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    };
    
    // Global function to show onboarding help
    window.showOnboardingHelp = function() {
      onboarding.currentStep = 1;
      onboarding.show();
      showNotification('📚 Онбординг запущено повторно', 'info');
    };

    // ===== Step-based Analysis =====
    let currentStep = 1;
    let selectedUploadMethod = null;
    let analysisResults = null;

    function initStepAnalysis() {
      // Initialize step navigation
      const steps = $$('.step');
      const stepPanels = $$('.step-content-panel');
      
      steps.forEach((step, index) => {
        step.addEventListener('click', () => {
          if (step.classList.contains('completed') || index + 1 === currentStep) {
            goToStep(index + 1);
          }
        });
      });

      // Upload method selection
      const uploadMethods = $$('.upload-method');
      uploadMethods.forEach(method => {
        method.addEventListener('click', () => {
          uploadMethods.forEach(m => m.classList.remove('active'));
          method.classList.add('active');
          selectedUploadMethod = method.dataset.method;
          
          // Show appropriate input area
          const fileArea = $('.upload-zone');
          const textArea = $('.text-input-area');
          
          if (selectedUploadMethod === 'file') {
            fileArea.style.display = 'block';
            textArea.style.display = 'none';
          } else {
            fileArea.style.display = 'none';
            textArea.style.display = 'block';
          }
          
          updateStepNavigation();
        });
      });

      // Step navigation buttons
      const prevBtn = $('#step-prev');
      const nextBtn = $('#step-next');
      const analyzeBtn = $('#step-analyze');
      
      if (prevBtn) {
        prevBtn.addEventListener('click', () => {
          if (currentStep > 1) goToStep(currentStep - 1);
        });
      }
      
      if (nextBtn) {
        nextBtn.addEventListener('click', () => {
          if (currentStep < 3) goToStep(currentStep + 1);
        });
      }
      
      if (analyzeBtn) {
        analyzeBtn.addEventListener('click', startStepAnalysis);
      }

      // Text input stats
      const textInput = $('.text-input-area textarea');
      if (textInput) {
        textInput.addEventListener('input', updateTextStats);
      }

      // File upload handling
      setupFileUpload();
    }

    function goToStep(step) {
      if (step < 1 || step > 3) return;
      
      currentStep = step;
      
      // Update step indicators
      const steps = $$('.step');
      const stepsContainer = $('.analysis-steps');
      
      steps.forEach((stepEl, index) => {
        stepEl.classList.remove('active');
        if (index + 1 < step) {
          stepEl.classList.add('completed');
        } else {
          stepEl.classList.remove('completed');
        }
        
        if (index + 1 === step) {
          stepEl.classList.add('active');
        }
      });
      
      // Update progress line
      if (stepsContainer) {
        stepsContainer.className = `analysis-steps step-${step}`;
      }
      
      // Show appropriate panel
      const panels = $$('.step-content-panel');
      panels.forEach((panel, index) => {
        panel.classList.remove('active');
        if (index + 1 === step) {
          panel.classList.add('active');
        }
      });
      
      updateStepNavigation();
    }

    function updateStepNavigation() {
      const prevBtn = $('#step-prev');
      const nextBtn = $('#step-next');
      const analyzeBtn = $('#step-analyze');
      
      if (prevBtn) {
        prevBtn.disabled = currentStep === 1;
      }
      
      if (nextBtn) {
        if (currentStep === 1) {
          // Enable next if upload method is selected and has content
          const canProceed = selectedUploadMethod && (
            (selectedUploadMethod === 'file' && $('.upload-zone input')?.files?.length > 0) ||
            (selectedUploadMethod === 'text' && $('.text-input-area textarea')?.value?.trim())
          );
          nextBtn.disabled = !canProceed;
        } else {
          nextBtn.disabled = currentStep >= 3;
        }
      }
      
      if (analyzeBtn) {
        analyzeBtn.style.display = currentStep === 1 ? 'inline-flex' : 'none';
        const canAnalyze = selectedUploadMethod && (
          (selectedUploadMethod === 'file' && $('.upload-zone input')?.files?.length > 0) ||
          (selectedUploadMethod === 'text' && $('.text-input-area textarea')?.value?.trim())
        );
        analyzeBtn.disabled = !canAnalyze;
      }
    }

    function updateTextStats() {
      const textarea = $('.text-input-area textarea');
      const stats = $('.text-stats');
      
      if (!textarea || !stats) return;
      
      const text = textarea.value;
      const charCount = text.length;
      const wordCount = text.trim() ? text.trim().split(/\s+/).length : 0;
      const lineCount = text.split('\n').length;
      
      stats.innerHTML = `
        <span><i class="fas fa-font"></i> ${charCount.toLocaleString()} символів</span>
        <span><i class="fas fa-file-word"></i> ${wordCount.toLocaleString()} слів</span>
        <span><i class="fas fa-list-ol"></i> ${lineCount} рядків</span>
      `;
      
      updateStepNavigation();
    }

    function setupFileUpload() {
      const dropzone = $('.upload-zone');
      const fileInput = $('.upload-zone input[type="file"]');
      
      if (!dropzone || !fileInput) return;
      
      // Drag and drop
      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
      });
      
      dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
      });
      
      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const files = e.dataTransfer.files;
        if (files.length > 0) {
          fileInput.files = files;
          updateFileDisplay();
        }
      });
      
      dropzone.addEventListener('click', () => {
        fileInput.click();
      });
      
      fileInput.addEventListener('change', updateFileDisplay);
    }

    function updateFileDisplay() {
      const fileInput = $('.upload-zone input[type="file"]');
      const dropzone = $('.upload-zone');
      
      if (!fileInput || !dropzone) return;
      
      const file = fileInput.files[0];
      if (file) {
        const size = (file.size / 1024).toFixed(1);
        dropzone.innerHTML = `
          <i class="fas fa-file-check upload-icon"></i>
          <h4>${file.name}</h4>
          <p>Розмір: ${size} KB • Готовий до аналізу</p>
        `;
        dropzone.classList.add('has-file');
      }
      
      updateStepNavigation();
    }

    async function startStepAnalysis() {
      if (!state.currentClient) {
        showNotification('Спочатку оберіть клієнта', 'warning');
        return;
      }
      
      // Move to analysis step
      goToStep(2);
      
      // Show progress
      showAnalysisProgress();
      
      try {
        // Prepare form data
        const formData = new FormData();
        
        if (selectedUploadMethod === 'file') {
          const fileInput = $('.upload-zone input[type="file"]');
          const file = fileInput?.files[0];
          if (file) {
            formData.append('file', file);
          }
        } else {
          const text = $('.text-input-area textarea')?.value;
          if (text) {
            formData.append('text', text);
          }
        }
        
        formData.append('client_id', state.currentClient.id);
        
        // Start analysis
        const response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error('Помилка аналізу');
        }
        
        // Process streaming response
        await processAnalysisStream(response);
        
      } catch (error) {
        console.error('Analysis error:', error);
        showNotification(`Помилка: ${error.message}`, 'error');
        goToStep(1); // Go back to upload step
      }
    }

    function showAnalysisProgress() {
      const progressText = $('.progress-text');
      const progressDetail = $('.progress-detail');
      const progressLogs = $('.progress-logs');
      
      if (progressText) progressText.textContent = 'Аналізую текст переговорів...';
      if (progressDetail) progressDetail.textContent = 'Обробляю контент та виявляю маніпулятивні техніки';
      if (progressLogs) progressLogs.innerHTML = '';
      
      // Add some progress log items
      setTimeout(() => addProgressLog('Завантаження тексту...'), 500);
      setTimeout(() => addProgressLog('Токенізація контенту...'), 1500);
      setTimeout(() => addProgressLog('Аналіз маніпуляцій...'), 3000);
    }

    function addProgressLog(message) {
      const progressLogs = $('.progress-logs');
      if (!progressLogs) return;
      
      const logItem = document.createElement('div');
      logItem.className = 'progress-log-item';
      logItem.innerHTML = `
        <i class="fas fa-check-circle"></i>
        <span>${message}</span>
      `;
      progressLogs.appendChild(logItem);
      progressLogs.scrollTop = progressLogs.scrollHeight;
    }

    async function processAnalysisStream(response) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let highlights = [];
      let summary = null;
      let barometer = null;
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (!line.trim() || !line.startsWith('data:')) continue;
          
          const data = line.slice(5).trim();
          if (!data) continue;
          
          try {
            const obj = JSON.parse(data);
            
            if (obj.type === 'highlight') {
              addProgressLog(`Знайдено: ${obj.label}`);
            } else if (obj.type === 'merged_highlights') {
              highlights = obj.items || [];
              addProgressLog(`Оброблено ${highlights.length} елементів`);
            } else if (obj.type === 'summary') {
              summary = obj;
              addProgressLog('Генерую підсумок...');
            } else if (obj.type === 'barometer') {
              barometer = obj;
              addProgressLog(`Оцінка складності: ${obj.label}`);
            } else if (obj.type === 'analysis_saved') {
              addProgressLog('Збереження результатів...');
              // Move to results step
              setTimeout(() => {
                showAnalysisResults(highlights, summary, barometer);
                goToStep(3);
              }, 1000);
            }
          } catch (err) {
            console.warn('Parse error:', err);
          }
        }
      }
    }

    function showAnalysisResults(highlights, summary, barometer) {
      analysisResults = { highlights, summary, barometer };
      
      // Update summary stats
      const summaryStats = $('.summary-stats');
      if (summaryStats && summary) {
        const counts = summary.counts_by_category || {};
        summaryStats.innerHTML = `
          <div class="summary-stat">
            <div class="stat-number manip">${counts.manipulation || 0}</div>
            <div class="stat-label">Маніпуляції</div>
          </div>
          <div class="summary-stat">
            <div class="stat-number cog">${counts.cognitive_bias || 0}</div>
            <div class="stat-label">Когнітивні спотворення</div>
          </div>
          <div class="summary-stat">
            <div class="stat-number fallacy">${counts.rhetological_fallacy || 0}</div>
            <div class="stat-label">Логічні помилки</div>
          </div>
        `;
      }
      
      // Show highlights
      const highlightsList = $('.highlights-list');
      if (highlightsList && highlights) {
        highlightsList.innerHTML = highlights.map(highlight => `
          <div class="highlight-item ${highlight.category?.replace('_', '') || 'manip'}">
            <div class="highlight-header">
              <span class="highlight-label">${highlight.label || 'Без назви'}</span>
              <div class="highlight-severity">
                ${Array.from({length: 3}, (_, i) => 
                  `<div class="severity-dot${i < (highlight.severity || 0) ? ' active' : ''}"></div>`
                ).join('')}
              </div>
            </div>
            <div class="highlight-explanation">${highlight.explanation || ''}</div>
          </div>
        `).join('');
      }
      
      // Show barometer
      const barometerDisplay = $('.barometer-display');
      if (barometerDisplay && barometer) {
        const labelClass = barometer.label?.toLowerCase().replace(/\s+/g, '') || 'medium';
        barometerDisplay.innerHTML = `
          <div class="barometer-score" style="color: ${getBarometerColor(barometer.score)}">${barometer.score}</div>
          <div class="barometer-label ${labelClass}">${barometer.label || 'Medium'}</div>
          <div class="barometer-rationale">${barometer.rationale || ''}</div>
        `;
      }
    }

    function getBarometerColor(score) {
      if (score <= 20) return '#00ff88';
      if (score <= 40) return '#00aaff';
      if (score <= 60) return '#ffaa00';
      if (score <= 80) return '#ff6600';
      return '#ff0066';
    }

    function resetStepAnalysis() {
      currentStep = 1;
      selectedUploadMethod = null;
      analysisResults = null;
      
      // Reset upload methods
      $$('.upload-method').forEach(method => {
        method.classList.remove('active');
      });
      
      // Reset inputs
      const fileInput = $('.upload-zone input[type="file"]');
      if (fileInput) fileInput.value = '';
      
      const textInput = $('.text-input-area textarea');
      if (textInput) textInput.value = '';
      
      // Reset UI
      const dropzone = $('.upload-zone');
      if (dropzone) {
        dropzone.innerHTML = `
          <i class="fas fa-cloud-upload-alt upload-icon"></i>
          <p>Перетягніть файл сюди або натисніть для вибору</p>
          <span>Підтримуються: .txt, .docx</span>
          <input type="file" accept=".txt,.docx" style="display: none;">
        `;
        dropzone.classList.remove('has-file');
      }
      
      updateTextStats();
      goToStep(1);
    }

    // ===== Right Panel Management =====
    function updateRightPanel() {
      updateClientInfo();
      updateAnalysisHistory();
      updateSelectedFragments();
      updateStats();
    }
    
    function updateClientInfo() {
      const clientCard = $('#client-info-card');
      if (!clientCard) return;
      
      if (state.currentClient) {
        clientCard.innerHTML = `
          <div class="client-card-content">
            <div class="client-header">
              <h5>${escapeHtml(state.currentClient.company)}</h5>
              <span class="client-sector">${escapeHtml(state.currentClient.sector || 'Не вказано')}</span>
            </div>
            <div class="client-stats">
              <div class="stat-item">
                <i class="fas fa-chart-bar"></i>
                <span>${state.analyses.length} аналізів</span>
              </div>
              <div class="stat-item">
                <i class="fas fa-user"></i>
                <span>${escapeHtml(state.currentClient.negotiator || 'Не вказано')}</span>
              </div>
            </div>
          </div>
        `;
      } else {
        clientCard.innerHTML = `
          <div class="client-placeholder">
            <i class="fas fa-user-plus"></i>
            <p>Оберіть або створіть клієнта</p>
          </div>
        `;
      }
    }
    
    function updateAnalysisHistory() {
      const historySection = $('#history-section');
      const historyList = $('#analysis-history-list');
      
      if (!historySection || !historyList) return;
      
      if (state.currentClient && state.analyses.length > 0) {
        historySection.style.display = 'block';
        historyList.innerHTML = state.analyses.slice(0, 5).map(analysis => {
          const barometer = JSON.parse(analysis.barometer_json || '{}');
          const score = barometer.score ? Math.round(barometer.score) : '—';
          return `
            <div class="history-item-mini" data-id="${analysis.id}" title="Завантажити аналіз">
              <div class="history-content">
                <div class="history-title">${escapeHtml(analysis.title || 'Без назви')}</div>
                <div class="history-meta">
                  <span class="history-date">${formatDate(analysis.created_at)}</span>
                  <span class="history-score">📊 ${score}</span>
                </div>
              </div>
              <button class="btn-icon-mini" onclick="loadAnalysis(${analysis.id})">
                <i class="fas fa-eye"></i>
              </button>
            </div>
          `;
        }).join('');
      } else {
        historySection.style.display = 'none';
      }
    }
    
    function updateSelectedFragments() {
      const fragmentsList = $('#selected-fragments-list');
      const adviceBtn = $('#get-advice-btn');
      
      if (!fragmentsList || !adviceBtn) return;
      
      if (state.selectedFragments.length > 0) {
        fragmentsList.innerHTML = state.selectedFragments.slice(0, 3).map(fragment => {
          const catClass = fragment.category === 'manipulation' ? 'manip' : 
                          fragment.category === 'cognitive_bias' ? 'cog' : 'fallacy';
          return `
            <div class="fragment-mini ${catClass}">
              <div class="fragment-text">${escapeHtml(fragment.text?.slice(0, 60) || '')}...</div>
              <div class="fragment-label">${escapeHtml(fragment.label || '')}</div>
            </div>
          `;
        }).join('') + (state.selectedFragments.length > 3 ? 
          `<div class="fragment-more">+${state.selectedFragments.length - 3} більше</div>` : '');
        
        adviceBtn.disabled = false;
      } else {
        fragmentsList.innerHTML = `
          <div class="fragments-placeholder">
            <i class="fas fa-highlighter"></i>
            <p>Аналізуйте текст щоб побачити фрагменти</p>
          </div>
        `;
        adviceBtn.disabled = true;
      }
    }
    
    function updateStats() {
      const totalClients = $('#total-clients');
      const totalAnalyses = $('#total-analyses');
      const avgScore = $('#avg-score');
      
      if (totalClients) totalClients.textContent = state.clients.length;
      
      const totalAnalysisCount = state.clients.reduce((sum, client) => 
        sum + (client.analyses_count || 0), 0);
      if (totalAnalyses) totalAnalyses.textContent = totalAnalysisCount;
      
      if (avgScore && state.currentClient && state.analyses.length > 0) {
        const scores = state.analyses
          .map(a => JSON.parse(a.barometer_json || '{}').score)
          .filter(s => s !== undefined);
        const avg = scores.length > 0 ? 
          Math.round(scores.reduce((sum, s) => sum + s, 0) / scores.length) : 0;
        avgScore.textContent = avg || '—';
      } else if (avgScore) {
        avgScore.textContent = '—';
      }
    }
    
    // ===== Initialize =====
    loadClients().then(() => {
      onboarding.init();
      initStepAnalysis();
      loadTokenUsage();
      updateRightPanel();
      // Refresh token usage every 5 minutes
      setInterval(loadTokenUsage, 5 * 60 * 1000);
    });
    
    // Add text input listener
    elements.textInput?.addEventListener('input', updateTextStats);
    
    resetBarometer();
    // Global error handling
    window.addEventListener('error', (event) => {
      const errorData = {
        error: event.error?.message || event.message || 'Unknown error',
        url: event.filename || window.location.href,
        line: event.lineno || 0,
        column: event.colno || 0,
        stack: event.error?.stack || ''
      };
      
      // Log to server
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(() => {}); // Silent fail for logging
      
      // Show user-friendly error
      showNotification('Виникла технічна помилка. Будь ласка, оновіть сторінку.', 'error');
    });

    // Handle unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      const errorData = {
        error: event.reason?.message || event.reason || 'Unhandled promise rejection',
        url: window.location.href,
        stack: event.reason?.stack || ''
      };
      
      fetch('/api/log-error', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(errorData)
      }).catch(() => {});
      
      // Prevent the error from showing in console (optional)
      // event.preventDefault();
    });

    // Enhanced performance monitoring
    if ('performance' in window && 'measure' in window.performance) {
      window.performance.mark('app-start');
      window.addEventListener('load', () => {
        window.performance.mark('app-loaded');
        window.performance.measure('app-init', 'app-start', 'app-loaded');
        const measure = window.performance.getEntriesByName('app-init')[0];
        logger.info(`📊 App initialization took ${Math.round(measure.duration)}ms`);
      });
    }

    logger.info('⚡ TeamPulse Turbo v3.0 initialized', { 
      version: '3.0.0',
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      viewport: `${window.innerWidth}x${window.innerHeight}`
    });
  })();
  