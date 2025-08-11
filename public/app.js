// public/app.js - Покращена логіка додатку
(() => {
    'use strict';
  
    // ===== State Management =====
    const state = {
      currentClient: null,
      currentAnalysis: null,
      clients: [],
      analyses: [],
      selectedFragments: []
    };
  
    // ===== DOM Elements =====
    const $ = (sel) => document.querySelector(sel);
    const $$ = (sel) => Array.from(document.querySelectorAll(sel));
  
    const elements = {
      // Sidebars
      leftSidebar: $('#sidebar-left'),
      rightSidebar: $('#sidebar-right'),
      navToggle: $('#nav-toggle'),
      toolsToggle: $('#tools-toggle'),
  
      // Client management
      clientsList: $('#clients-list'),
      clientSearch: $('#client-search'),
      newClientBtn: $('#new-client-btn'),
      saveClientBtn: $('#save-client-btn'),
      cancelClientBtn: $('#cancel-client-btn'),
      currentClientSpan: $('#current-client span'),
  
      // Forms
      clientForm: $('#client-form'),
      analysisSection: $('#analysis-section'),
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
      if (which === 'left') elements.leftSidebar?.classList.remove('active');
      if (which === 'right') elements.rightSidebar?.classList.remove('active');
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
        const res = await fetch('/api/clients');
        const data = await res.json();
        state.clients = data.clients || [];
        renderClientsList();
      } catch (err) {
        showNotification('Помилка завантаження клієнтів', 'error');
      }
    }
  
    function renderClientsList() {
      const filtered = state.clients.filter(
        (c) =>
          !elements.clientSearch.value ||
          c.company?.toLowerCase().includes(elements.clientSearch.value.toLowerCase())
      );
  
      if (filtered.length === 0) {
        elements.clientsList.innerHTML = `
          <div class="empty-state">
            <i class="fas fa-users"></i>
            <p>Немає клієнтів</p>
          </div>
        `;
        return;
      }
  
      elements.clientsList.innerHTML = filtered
        .map(
          (client) => `
        <div class="client-item ${state.currentClient?.id === client.id ? 'active' : ''}" data-id="${client.id}">
          <div class="client-info">
            <div class="client-name">${escapeHtml(client.company)}</div>
            <div class="client-meta">
              ${client.sector ? `<span>${escapeHtml(client.sector)}</span>` : ''}
              ${client.analyses_count ? `<span>${client.analyses_count} аналізів</span>` : ''}
            </div>
          </div>
          <div class="client-actions">
            <button class="btn-icon btn-edit" title="Редагувати">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn-icon btn-delete" title="Видалити">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      `
        )
        .join('');
  
      // Attach event listeners
      $$('.client-item').forEach((item) => {
        item.addEventListener('click', (e) => {
          if (e.target.closest('.btn-edit')) {
            editClient(Number(item.dataset.id));
          } else if (e.target.closest('.btn-delete')) {
            deleteClient(Number(item.dataset.id));
          } else {
            selectClient(Number(item.dataset.id));
          }
        });
      });
    }
  
    async function selectClient(id) {
      try {
        const res = await fetch(`/api/clients/${id}`);
        const data = await res.json();
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
        showNotification(`Обрано клієнта: ${state.currentClient.company}`, 'success');
      } catch (err) {
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
        displayAnalysisResults(data.analysis);
        showNotification('Аналіз завантажено', 'success');
      } catch (err) {
        showNotification('Помилка завантаження аналізу', 'error');
      }
    }
  
    function editClient(id) {
      const client = state.clients.find((c) => c.id === id);
      if (!client) return;
      state.currentClient = client;
  
      // Fill form
      $('#company').value = client.company || '';
      $('#negotiator').value = client.negotiator || '';
      $('#sector').value = client.sector || '';
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
        await fetch(`/api/clients/${id}`, { method: 'DELETE' });
  
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
        showNotification('Помилка видалення', 'error');
      }
    }
  
    async function saveClient() {
      const clientData = {
        company: $('#company').value.trim(),
        negotiator: $('#negotiator').value.trim(),
        sector: $('#sector').value.trim(),
        goal: $('#goal').value.trim(),
        criteria: $('#criteria').value.trim(),
        constraints: $('#constraints').value.trim(),
        user_goals: $('#user_goals').value.trim(),
        client_goals: $('#client_goals').value.trim(),
        weekly_hours: $('#weekly_hours').value || 0,
        offered_services: $('#offered_services').value.trim(),
        deadlines: $('#deadlines').value.trim(),
        notes: $('#notes').value.trim()
      };
      if (!clientData.company) {
        showNotification('Введіть назву компанії', 'warning');
        return;
      }
  
      try {
        const res = await fetch('/api/clients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(clientData)
        });
  
        const data = await res.json();
  
        await loadClients();
        selectClient(data.id);
  
        showNotification(data.updated ? 'Клієнта оновлено' : 'Клієнта створено', 'success');
      } catch (err) {
        showNotification('Помилка збереження', 'error');
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
        let barometer = null;
  
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
                  barometer = obj;
                  updateBarometer(obj);
                  outputHtml += `<div class="stream-item barometer">Barometer: ${obj.score} - ${obj.label}</div>`;
                } else if (obj.type === 'summary') {
                  outputHtml += `<div class="stream-item summary">${escapeHtml(JSON.stringify(obj))}</div>`;
                } else if (obj.type === 'analysis_saved') {
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
          showNotification('Аналіз скасовано', 'warning');
        } else {
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
      const html = highlights
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
  
      elements.highlightedText.innerHTML = html;
  
      // Add click handlers
      $$('.btn-add-fragment').forEach((btn) => {
        btn.addEventListener('click', (e) => {
          const item = e.target.closest('.highlight-item');
          const highlight = JSON.parse(item.dataset.highlight);
          addFragmentToBucket(highlight);
        });
      });
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
      elements.leftSidebar.classList.toggle('active');
    });
    elements.toolsToggle?.addEventListener('click', () => {
      elements.rightSidebar.classList.toggle('active');
    });
    elements.clientSearch?.addEventListener('input', renderClientsList);
  
    elements.newClientBtn?.addEventListener('click', () => {
      state.currentClient = null;
      // Clear form
      $$('#client-form input, #client-form textarea').forEach((el) => (el.value = ''));
      elements.welcomeScreen.style.display = 'none';
      elements.analysisSection.style.display = 'none';
      elements.clientForm.style.display = 'block';
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
  
    // Demo function
    window.showDemo = () => {
      elements.textInput.value = `Ми пропонуємо вам унікальну можливість, яка доступна лише сьогодні. Якщо ви не приймете рішення зараз, ця пропозиція більше не повториться. Всі успішні компанії вже працюють з нами. Ви ж не хочете залишитися позаду? Ціна може збільшитися вже завтра, тому краще підписати контракт негайно.`;
      showNotification('Демо текст завантажено', 'info');
    };
  
    // ===== Initialize =====
    loadClients();
    resetBarometer();
    console.log('⚡ TeamPulse Turbo initialized');
  })();
  