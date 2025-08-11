(() => {
    'use strict';
  
    // ===== Utilities =====
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
    function showNotification(message, type = 'info') {
      const n = document.createElement('div');
      n.className = `notification-toast notification-${type}`;
      const icon =
        type === 'success'
          ? 'check-circle'
          : type === 'error'
          ? 'exclamation-circle'
          : type === 'warning'
          ? 'exclamation-triangle'
          : 'info-circle';
      n.innerHTML = `<i class="fas fa-${icon}"></i><span>${message}</span>`;
      document.body.appendChild(n);
  
      // стилі тоста, якщо ще не додані
      if (!$('#notification-styles')) {
        const style = document.createElement('style');
        style.id = 'notification-styles';
        style.textContent = `
          .notification-toast{
            position:fixed;bottom:20px;right:20px;z-index:300;
            padding:16px 20px;border-radius:12px;display:flex;gap:12px;align-items:center;
            background:var(--card);backdrop-filter:blur(20px);border:1px solid var(--border);
            font-size:14px;max-width:350px;animation:slide-in .25s ease-out
          }
          .notification-success{border-color:rgba(0,255,136,.3);background:rgba(0,255,136,.1)}
          .notification-error{border-color:rgba(255,0,128,.3);background:rgba(255,0,128,.1)}
          .notification-warning{border-color:rgba(255,234,0,.3);background:rgba(255,234,0,.1)}
          .notification-info i{color:var(--neon-blue)}
          @keyframes slide-in{from{transform:translateX(100%);opacity:0}to{transform:translateX(0);opacity:1}}
          @media (max-width:480px){.notification-toast{left:20px;right:20px;max-width:none}}
        `;
        document.head.appendChild(style);
      }
  
      setTimeout(() => {
        n.style.animation = 'slide-in .25s ease-out reverse';
        setTimeout(() => n.remove(), 250);
      }, 4200);
    }
  
    // ===== Sidebars =====
    const leftSidebar = $('#sidebar-left');
    const rightSidebar = $('#sidebar-right');
    const mobileMenuToggle = $('#mobile-menu-toggle');
    const rightSidebarToggle = $('#right-sidebar-toggle');
  
    function closeSidebar(side) {
      if (side === 'left') leftSidebar?.classList.remove('active');
      if (side === 'right') rightSidebar?.classList.remove('active');
    }
    window.closeSidebar = closeSidebar;
    mobileMenuToggle?.addEventListener('click', () => leftSidebar?.classList.toggle('active'));
    rightSidebarToggle?.addEventListener('click', () => rightSidebar?.classList.toggle('active'));
  
    // ===== Elements =====
    const dropzone = $('#dropzone');
    const fileInput = $('#file');
    const inputTextEl = $('#inputText');
    const analyzeBtn = $('#analyzeBtn');
    const streamEl = $('#stream');
    const exportBtn = $('#exportBtn');
  
    const highlighted = $('#highlighted');
    const annotated = $('#annotated');
  
    const bucket = $('#bucket');
    const adviceBtn = $('#adviceBtn');
    const adviceOut = $('#adviceOut');
  
    const badJsonBanner = $('#badJson');
  
    // ===== Client Deep Profile (left sidebar) =====
    function val(id) {
      return $(`#${id}`)?.value?.trim() || '';
    }
    function num(id) {
      return Number($(`#${id}`)?.value) || 0;
    }
    function gatherProfileDeep() {
      return {
        company: val('company'),
        negotiator: val('negotiator'),
        sector: val('sector'),
        goal: val('goal'),
        criteria: val('criteria'),
        constraints: val('constraints'),
        user_goals: val('user_goals'),
        client_goals: val('client_goals'),
        weekly_hours: num('weekly_hours'),
        offered_services: val('offered_services'),
        deadlines: val('deadlines'),
        notes: val('notes')
      };
    }
    window.clearProfileForm = () => {
      [
        'company',
        'negotiator',
        'sector',
        'goal',
        'criteria',
        'constraints',
        'user_goals',
        'client_goals',
        'weekly_hours',
        'offered_services',
        'deadlines',
        'notes'
      ].forEach((id) => {
        const el = $(`#${id}`);
        if (el) el.value = '';
      });
    };
  
    async function fetchClients() {
      const res = await fetch('/api/clients');
      const j = await res.json();
      return j.clients || [];
    }
    async function saveClientToDB(client) {
      const res = await fetch('/api/clients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(client)
      });
      return await res.json();
    }
    async function deleteClientFromDB(id) {
      await fetch(`/api/clients/${id}`, { method: 'DELETE' });
    }
  
    async function renderClientsFromDB() {
      const container = $('#saved-clients');
      if (!container) return;
      const clients = await fetchClients();
      if (!clients.length) {
        container.innerHTML = '<p class="muted">Немає клієнтів</p>';
        return;
      }
      container.innerHTML = clients
        .map(
          (c) => `
          <div class="client-item" data-id="${c.id}">
            <div class="client-item-info" data-role="load">
              <i class="fas fa-building"></i><span>${escapeHTML(c.company || 'Без назви')}</span>
            </div>
            <div class="client-item-actions">
              <button data-role="delete" title="Видалити"><i class="fas fa-trash"></i></button>
            </div>
          </div>
        `
        )
        .join('');
      container.onclick = async (e) => {
        const item = e.target.closest('.client-item');
        if (!item) return;
        const id = Number(item.getAttribute('data-id'));
        if (e.target.closest('[data-role="load"]')) {
          const cls = (await fetchClients()).find((x) => x.id === id);
          if (!cls) return;
          const set = (id, v) => {
            const el = $(`#${id}`);
            if (el) el.value = v || '';
          };
          set('company', cls.company);
          set('negotiator', cls.negotiator);
          set('sector', cls.sector);
          set('goal', cls.goal);
          set('criteria', cls.decision_criteria);
          set('constraints', cls.constraints);
          set('user_goals', cls.user_goals);
          set('client_goals', cls.client_goals);
          set('weekly_hours', cls.weekly_hours || 0);
          set('offered_services', cls.offered_services);
          set('deadlines', cls.deadlines);
          set('notes', cls.notes);
          showNotification('Клієнта завантажено', 'info');
        } else if (e.target.closest('[data-role="delete"]')) {
          if (confirm('Видалити клієнта?')) {
            await deleteClientFromDB(id);
            renderClientsFromDB();
            showNotification('Клієнта видалено', 'success');
          }
        }
      };
    }
    window.saveClientDeep = async () => {
      const payload = gatherProfileDeep();
      if (!payload.company) {
        showNotification('Введіть назву компанії', 'warning');
        return;
      }
      const res = await saveClientToDB(payload);
      if (res.success) {
        showNotification('Збережено у БД', 'success');
        renderClientsFromDB();
      } else {
        showNotification('Помилка збереження', 'error');
      }
    };
    renderClientsFromDB();
  
    // ===== Dropzone =====
    function updateDropzoneText(fn) {
      if (!dropzone) return;
      dropzone.innerHTML = `<i class="fas fa-file-check"></i><p>Файл обрано</p><span class="muted">${fn}</span>`;
    }
    dropzone?.addEventListener('click', () => fileInput?.click());
    dropzone?.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone?.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone?.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer?.files?.length) {
        const [file] = e.dataTransfer.files;
        const dt = new DataTransfer();
        dt.items.add(file);
        fileInput.files = dt.files;
        updateDropzoneText(file.name);
      }
    });
    fileInput?.addEventListener('change', () => {
      if (fileInput.files?.length) updateDropzoneText(fileInput.files[0].name);
    });
  
    // ===== Highlight helpers =====
    function mapCls(cat) {
      if (cat === 'manipulation') return 'manip';
      if (cat === 'cognitive_bias') return 'cog';
      if (cat === 'rhetological_fallacy') return 'fallacy';
      return 'manip';
    }
    function escapeHTML(s) {
      return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
    }
    function wrapHighlights(text, spans, paraIndex) {
      spans.sort((a, b) => a.start - b.start);
      let i = 0,
        out = '';
      for (const s of spans) {
        if (s.start > i) out += escapeHTML(text.slice(i, s.start));
        const fragText = text.slice(s.start, s.end);
        out += `<span class="highlight-span ${s.cls}" draggable="true"
                   title="${escapeHTML(s.tooltip || '')}"
                   data-text="${escapeHTML(fragText)}"
                   data-paragraph="${paraIndex}"
                   data-start="${s.start}"
                   data-end="${s.end}">${escapeHTML(fragText)}</span>`;
        i = s.end;
      }
      if (i < text.length) out += escapeHTML(text.slice(i));
      return out;
    }
  
    function installHighlightDnD() {
      $('#highlighted')?.addEventListener('dragstart', (e) => {
        const el = e.target.closest('.highlight-span');
        if (!el) return;
        e.dataTransfer.setData(
          'text/plain',
          JSON.stringify({
            text: el.getAttribute('data-text'),
            paragraph_index: Number(el.getAttribute('data-paragraph')),
            char_start: Number(el.getAttribute('data-start')),
            char_end: Number(el.getAttribute('data-end')),
            category: el.classList.contains('manip')
              ? 'manipulation'
              : el.classList.contains('cog')
              ? 'cognitive_bias'
              : 'rhetological_fallacy',
            label: el.getAttribute('title') || ''
          })
        );
      });
      bucket?.addEventListener('dragover', (e) => e.preventDefault());
      bucket?.addEventListener('drop', (e) => {
        e.preventDefault();
        const data = e.dataTransfer.getData('text/plain');
        if (!data) return;
        try {
          const obj = JSON.parse(data);
          addToBucket(obj);
        } catch {
          /* ignore */
        }
      });
      // click to add
      $('#highlighted')?.addEventListener('click', (e) => {
        const el = e.target.closest('.highlight-span');
        if (!el) return;
        addToBucket({
          text: el.getAttribute('data-text'),
          paragraph_index: Number(el.getAttribute('data-paragraph')),
          char_start: Number(el.getAttribute('data-start')),
          char_end: Number(el.getAttribute('data-end')),
          category: el.classList.contains('manip')
            ? 'manipulation'
            : el.classList.contains('cog')
            ? 'cognitive_bias'
            : 'rhetological_fallacy',
          label: el.getAttribute('title') || ''
        });
      });
    }
  
    function addToBucket(item) {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.innerHTML = `
        <div class="history-item-client" style="display:flex;gap:.5rem;align-items:center">
          <span class="legend-item ${item.category === 'manipulation' ? 'manip' : item.category === 'cognitive_bias' ? 'cog' : 'fallacy'}">
            ${escapeHTML(item.category.replace('_', ' '))}
          </span>
          <span style="flex:1">${escapeHTML(item.text || '(фрагмент)')}</span>
          <button class="btn-icon" title="Видалити"><i class="fas fa-times"></i></button>
        </div>
      `;
      row.querySelector('button')?.addEventListener('click', () => row.remove());
      row.dataset.payload = JSON.stringify(item);
      bucket?.appendChild(row);
    }
  
    // ===== Advice =====
    adviceBtn?.addEventListener('click', async () => {
      const items = $$('.history-item', bucket).map((el) => JSON.parse(el.dataset.payload));
      if (!items.length) {
        showNotification('Додайте фрагменти у праву панель', 'warning');
        return;
      }
      adviceBtn.disabled = true;
      adviceBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Думаймо...';
      try {
        const profile = gatherProfileDeep();
        const res = await fetch('/api/advice', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, profile })
        });
        const j = await res.json();
        if (!res.ok) throw new Error(j.error || 'Помилка');
        adviceOut.style.display = 'block';
        adviceOut.textContent = JSON.stringify(j.advice, null, 2);
        showNotification('Рекомендації готові', 'success');
      } catch (e) {
        showNotification(`Помилка: ${e.message}`, 'error');
      } finally {
        adviceBtn.disabled = false;
        adviceBtn.innerHTML = '<i class="fas fa-lightbulb"></i> Отримати рекомендації';
      }
    });
  
    // ===== Analyze (NDJSON SSE with recovery + Abort) =====
    let currentAbort = null;
  
    analyzeBtn?.addEventListener('click', async () => {
      // toggle stop
      if (currentAbort) {
        currentAbort.abort();
        return;
      }
  
      const inputText = inputTextEl?.value?.trim() || '';
      const file = fileInput?.files?.[0];
      const profile = gatherProfileDeep();
  
      if (!inputText && !file) {
        showNotification('Введіть текст або оберіть файл', 'warning');
        return;
      }
  
      const form = new FormData();
      form.append('profile', JSON.stringify(profile));
      if (file) form.append('file', file);
      else form.append('text', inputText);
  
      // UI reset
      if (streamEl) streamEl.textContent = '';
      if (badJsonBanner) badJsonBanner.style.display = 'none';
      if (annotated) annotated.style.display = 'none';
      if (highlighted) highlighted.innerHTML = '';
      resetBarometer();
  
      // для підсвічування
      const fullText = inputText;
      const paras = fullText ? fullText.split(/\n{2,}/) : [];
      const paraSpans = {}; // idx -> [{start,end,cls,tooltip?}]
  
      function autoscroll() {
        if (!streamEl) return;
        streamEl.scrollTop = streamEl.scrollHeight;
      }
  
      function applyMerged(items) {
        if (!fullText) return;
        for (const it of items) {
          const idx = it.paragraph_index;
          if (!paraSpans[idx]) paraSpans[idx] = [];
          paraSpans[idx].push({
            start: it.char_start,
            end: it.char_end,
            cls: mapCls(it.category),
            tooltip: (Array.isArray(it.labels) ? it.labels.join(', ') : it.label) || it.explanation || ''
          });
        }
        const html = paras.map((t, i) => `<p>${wrapHighlights(t, paraSpans[i] || [], i)}</p>`).join('\n');
        highlighted.innerHTML = html;
        annotated.style.display = 'block';
        installHighlightDnD();
      }
  
      // run
      currentAbort = new AbortController();
      analyzeBtn.disabled = false;
      analyzeBtn.innerHTML = '<i class="fas fa-stop"></i> Зупинити';
  
      try {
        const res = await fetch('/api/analyze', { method: 'POST', body: form, signal: currentAbort.signal });
        if (!res.ok || !res.body) {
          let errMsg = res.statusText;
          try {
            const j = await res.json();
            errMsg = j.error || errMsg;
          } catch {}
          throw new Error(errMsg || 'Помилка мережі');
        }
  
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
  
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
  
          // SSE протокол: лінії event: ... / data: ...
          // читаємо пострічково
          const lines = chunk.split('\n');
          for (const raw of lines) {
            const line = raw.trim();
            if (!line) continue;
  
            if (line.startsWith('event:')) {
              const ev = line.slice(6).trim();
              if (ev === 'done') {
                showNotification('Аналіз завершено', 'success');
              } else if (ev === 'error') {
                showNotification('Помилка стріму', 'error');
              }
              continue;
            }
  
            if (line.startsWith('data:')) {
              const payload = line.slice(5).trim();
              if (!payload) continue;
  
              // Показуємо сирий JSON для дебагу/логів
              if (streamEl) {
                streamEl.textContent += payload + '\n';
                autoscroll();
              }
  
              try {
                const obj = JSON.parse(payload);
                // live highlight — можна ігнорити, бо прийде merged
                if (obj.type === 'merged_highlights') {
                  applyMerged(obj.items || []);
                } else if (obj.type === 'summary') {
                  // тут можна намалювати summary у окремому блоці
                } else if (obj.type === 'barometer') {
                  updateBarometer(obj);
                }
              } catch {
                // невалідний NDJSON рядок — не падаємо
                if (badJsonBanner) badJsonBanner.style.display = 'block';
                console.warn('[NDJSON client bad line]', payload);
              }
            }
          }
        }
      } catch (e) {
        if (e.name === 'AbortError') {
          showNotification('Стрім скасовано', 'warning');
        } else {
          if (streamEl) streamEl.textContent += `\nПомилка: ${e.message}`;
          showNotification(`Помилка аналізу: ${e.message}`, 'error');
        }
      } finally {
        analyzeBtn.disabled = false;
        analyzeBtn.innerHTML = '<i class="fas fa-play"></i> Аналізувати';
        currentAbort = null;
      }
    });
  
    // ===== Export stream =====
    exportBtn?.addEventListener('click', () => {
      const content = streamEl?.textContent || '';
      if (!content) {
        showNotification('Немає даних для експорту', 'warning');
        return;
      }
      const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
      const a = document.createElement('a');
      a.download = `neg_analysis_${Date.now()}.txt`;
      a.href = URL.createObjectURL(blob);
      a.click();
      showNotification('Експортовано', 'success');
    });
  
    // ===== Barometer (visual with needle you already have) =====
    function resetBarometer() {
      setBarometer(0, 'Очікуємо...', {
        goal_alignment: 0,
        manipulation_density: 0,
        scope_clarity: 0,
        time_pressure: 0,
        resource_demand: 0
      });
    }
    function updateBarometer(obj) {
      const score = Number(obj.score || 0);
      const label = obj.label || '—';
      const f =
        obj.factors || {
          goal_alignment: 0,
          manipulation_density: 0,
          scope_clarity: 0,
          time_pressure: 0,
          resource_demand: 0
        };
      setBarometer(score, label, f);
    }
    function setBarometer(score, label, factors) {
      const needle = $('.barometer-needle');
      const scoreEl = $('.barometer-score');
      const labelEl = $('.barometer-label');
  
      const deg = Math.min(100, Math.max(0, score)) * 3.6; // 0..360deg
      if (needle) needle.style.transform = `translate(-50%,-100%) rotate(${deg}deg)`;
      if (scoreEl) scoreEl.textContent = String(Math.round(score));
      if (labelEl) labelEl.textContent = label;
  
      const bars = $$('.factor .bar div');
      const vals = [
        factors.goal_alignment || 0,
        factors.manipulation_density || 0,
        factors.scope_clarity || 0,
        factors.time_pressure || 0,
        factors.resource_demand || 0
      ];
      bars.forEach((b, i) => (b.style.width = `${Math.round(vals[i] * 100)}%`));
    }
  
    console.log('TeamPulse Turbo ready ⚡');
  })();
  