/**
 * Kanzlei-Interna Zusatzmodule (Termine, Finanzen, To-Do, Status, DB-Import)
 * Kanzlei Dr. jur. Lars Baumann – Berlin
 */

const InternaModules = {
  keys: {
    appointments: 'kanzlei_baumann_appointments_v1',
    finances: 'kanzlei_baumann_finances_v1',
    todos: 'kanzlei_baumann_todos_v1',
    status: 'kanzlei_baumann_live_status_v1'
  },

  init() {
    this.applySavedLiveStatus();
    this.renderAll();
  },

  renderAll() {
    this.renderAppointments();
    this.renderFinanceServicesSelector();
    this.renderFinances();
    this.renderTodos();
  },

  // --- DASHBOARD TAB SWITCHING ---
  switchDashboardTab(tabId, btnEl) {
    document.querySelectorAll('.dash-tab-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.dash-tab-panel').forEach(p => p.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    const panel = document.getElementById(`dash-tab-${tabId}`);
    if (panel) panel.classList.add('active');
  },

  // --- LIVE KANZLEI-STATUS (TOPBAR) ---
  applySavedLiveStatus() {
    const saved = localStorage.getItem(this.keys.status) || 'Mandatsprüfung Aktiv|live';
    const [text, mode] = saved.split('|');
    this.updateTopbarStatusUI(text, mode);
    const sel = document.getElementById('dashLiveStatusSelect');
    if (sel) sel.value = saved;
  },

  changeLiveStatus(val) {
    localStorage.setItem(this.keys.status, val);
    const [text, mode] = val.split('|');
    this.updateTopbarStatusUI(text, mode);
    if (window.app) {
      app.syncSettingToCloud('liveStatus', val);
      app.showToast(`Kanzlei-Status geändert: ${text}`, 'success');
    }
  },

  updateTopbarStatusUI(text, mode) {
    const el = document.getElementById('topbarLiveStatus');
    if (!el) return;
    el.className = `status-indicator ${mode || 'live'}`;
    el.innerHTML = `<span class="dot"></span> ${text}`;
  },

  // --- DB BACKUP IMPORT ---
  triggerDbImport() {
    const input = document.getElementById('dbImportFileInput');
    if (input) input.click();
  },

  handleDbImport(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const imported = JSON.parse(ev.target.result);
        if (!Array.isArray(imported)) throw new Error('Ungültiges Format');
        if (window.app) {
          app.cases = imported;
          app.saveCases();
          app.renderCasesTable();
          app.updateMetrics();
          app.showToast(`${imported.length} Akten erfolgreich importiert!`, 'success');
        }
      } catch (err) {
        if (window.app) app.showToast('Fehler beim Import: Ungültige JSON-Datei.', 'error');
      }
      e.target.value = '';
    };
    reader.readAsText(file);
  },

  // --- 1. TERMINE & FRISTEN ---
  getAppointments() {
    try { return JSON.parse(localStorage.getItem(this.keys.appointments)) || []; }
    catch { return []; }
  },

  saveAppointments(list) {
    localStorage.setItem(this.keys.appointments, JSON.stringify(list));
    if (window.app) app.syncSettingToCloud('appointments', list);
    this.renderAppointments();
  },

  addAppointment(e) {
    e.preventDefault();
    const title = document.getElementById('appTitle').value.trim();
    const date = document.getElementById('appDate').value;
    const time = document.getElementById('appTime').value || '09:00';
    const location = document.getElementById('appLocation').value.trim() || 'AG Tiergarten, Berlin';
    const az = document.getElementById('appAz').value.trim();

    if (!title || !date) return;
    const list = this.getAppointments();
    list.push({
      id: 'app_' + Date.now(),
      title, date, time, location, az
    });
    list.sort((a, b) => new Date(`${a.date}T${a.time}`) - new Date(`${b.date}T${b.time}`));
    this.saveAppointments(list);
    e.target.reset();
    if (window.app) app.showToast('Gerichtstermin / Frist eingetragen!', 'success');
  },

  deleteAppointment(id) {
    const list = this.getAppointments().filter(item => item.id !== id);
    this.saveAppointments(list);
  },

  renderAppointments() {
    const container = document.getElementById('appointmentsListContainer');
    if (!container) return;
    const list = this.getAppointments();

    if (list.length === 0) {
      container.innerHTML = `<div class="interna-empty">📅 Keine anstehenden Gerichtstermine oder Fristen eingetragen.</div>`;
      return;
    }

    const now = Date.now();
    container.innerHTML = list.map(item => {
      const targetMs = new Date(`${item.date}T${item.time}`).getTime();
      const diffHours = (targetMs - now) / (1000 * 3600);
      const isUrgent = diffHours >= -2 && diffHours <= 48;
      const dateFormatted = new Date(item.date).toLocaleDateString('de-DE');

      return `
        <div class="interna-item-card ${isUrgent ? 'urgent-border' : ''}">
          <div class="interna-item-main">
            <div class="interna-item-top">
              <span class="interna-date-badge ${isUrgent ? 'urgent' : ''}">
                ${isUrgent ? '🚨 ' : '📅 '}${dateFormatted} • ${item.time} Uhr
              </span>
              ${item.az ? `<span class="az-tag" style="font-size:0.75rem; padding:2px 8px;">${app.escapeHtml(item.az)}</span>` : ''}
            </div>
            <div class="interna-item-title">${app.escapeHtml(item.title)}</div>
            <div class="interna-item-sub">📍 ${app.escapeHtml(item.location)}</div>
          </div>
          <button class="btn btn-danger-outline btn-sm" onclick="InternaModules.deleteAppointment('${item.id}')" title="Termin entfernen">✕</button>
        </div>
      `;
    }).join('');
  },

  // --- 2. FINANZEN & HONORARE ---
  renderFinanceServicesSelector() {
    const container = document.getElementById('finServicesSelector');
    if (!container || typeof FEE_GROUPS === 'undefined') return;

    const fees = (window.app && app.fees) ? app.fees : (typeof DEFAULT_FEES !== 'undefined' ? DEFAULT_FEES : {});
    const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

    let html = '';
    FEE_GROUPS.forEach(group => {
      group.items.forEach(item => {
        const val = fees[item.id] !== undefined ? fees[item.id] : 0;
        const priceLabel = item.isPercent ? `+${val} %` : `${fmt(val)}${item.unitSuffix || ''}`;
        html += `
          <label class="fin-service-option">
            <input type="checkbox" class="fin-service-cb" value="${item.id}" data-title="${app ? app.escapeHtml(item.title) : item.title}" data-percent="${item.isPercent ? '1' : '0'}" onchange="InternaModules.updateFinanceBreakdown()">
            <span class="fin-service-name">${item.title}</span>
            <span class="fin-service-price">${priceLabel}</span>
          </label>
        `;
      });
    });

    container.innerHTML = html;
    this.updateFinanceBreakdown();
  },

  updateFinanceBreakdown() {
    const box = document.getElementById('finBreakdownBox');
    const amountInput = document.getElementById('finAmount');
    if (!box || !amountInput) return;

    const fees = (window.app && app.fees) ? app.fees : (typeof DEFAULT_FEES !== 'undefined' ? DEFAULT_FEES : {});
    const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

    const checkboxes = Array.from(document.querySelectorAll('.fin-service-cb:checked'));
    if (checkboxes.length === 0) {
      box.style.display = 'none';
      box.innerHTML = '';
      amountInput.value = '';
      return [];
    }

    let baseSum = 0;
    const lines = [];
    let urgencyPct = 0;

    checkboxes.forEach(cb => {
      const id = cb.value;
      const title = cb.getAttribute('data-title');
      const isPercent = cb.getAttribute('data-percent') === '1';
      const val = fees[id] !== undefined ? fees[id] : 0;

      if (isPercent) {
        urgencyPct = val;
      } else {
        baseSum += val;
        lines.push({ title, amount: val });
      }
    });

    let total = baseSum;
    if (urgencyPct > 0 && baseSum > 0) {
      const surcharge = Math.round(baseSum * (urgencyPct / 100));
      total += surcharge;
      lines.push({ title: `Dringlichkeitszuschlag (+${urgencyPct} %)`, amount: surcharge });
    }

    amountInput.value = total;
    box.style.display = 'block';
    box.innerHTML = `
      <div class="fin-breakdown-title">Kostenaufschlüsselung:</div>
      ${lines.map(l => `
        <div class="fin-breakdown-row">
          <span>${app.escapeHtml(l.title)}</span>
          <strong>${fmt(l.amount)}</strong>
        </div>
      `).join('')}
      <div class="fin-breakdown-total">
        <span>Gesamthonorar</span>
        <strong>${fmt(total)}</strong>
      </div>
    `;

    return lines;
  },

  getFinances() {
    try { return JSON.parse(localStorage.getItem(this.keys.finances)) || []; }
    catch { return []; }
  },

  saveFinances(list) {
    localStorage.setItem(this.keys.finances, JSON.stringify(list));
    if (window.app) app.syncSettingToCloud('finances', list);
    this.renderFinances();
  },

  addFinanceEntry(e) {
    e.preventDefault();
    const client = document.getElementById('finClient').value.trim();
    const amount = parseFloat(document.getElementById('finAmount').value) || 0;
    const status = document.getElementById('finStatus').value;
    const breakdown = this.updateFinanceBreakdown();

    if (!client || breakdown.length === 0 || amount <= 0) {
      if (window.app) app.showToast('Bitte Mandant und mindestens eine Leistung auswählen.', 'error');
      return;
    }

    const desc = breakdown.map(b => b.title).join(' + ');
    const list = this.getFinances();
    list.unshift({
      id: 'fin_' + Date.now(),
      client, desc, breakdown, amount, status,
      date: new Date().toLocaleDateString('de-DE')
    });
    this.saveFinances(list);
    e.target.reset();
    this.updateFinanceBreakdown();
    if (window.app) app.showToast('Honorareintrag verbucht!', 'success');
  },

  toggleFinanceStatus(id) {
    const list = this.getFinances().map(item => {
      if (item.id === id) {
        item.status = item.status === 'Bezahlt' ? 'Offen' : 'Bezahlt';
      }
      return item;
    });
    this.saveFinances(list);
  },

  deleteFinanceEntry(id) {
    const list = this.getFinances().filter(item => item.id !== id);
    this.saveFinances(list);
  },

  renderFinances() {
    const container = document.getElementById('financesListContainer');
    const sumPaidEl = document.getElementById('finTotalPaid');
    const sumOpenEl = document.getElementById('finTotalOpen');
    if (!container) return;

    const list = this.getFinances();
    const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);

    const paidSum = list.filter(i => i.status === 'Bezahlt').reduce((s, i) => s + i.amount, 0);
    const openSum = list.filter(i => i.status === 'Offen').reduce((s, i) => s + i.amount, 0);

    if (sumPaidEl) sumPaidEl.textContent = fmt(paidSum);
    if (sumOpenEl) sumOpenEl.textContent = fmt(openSum);

    if (list.length === 0) {
      container.innerHTML = `<div class="interna-empty">💰 Noch keine Honorare oder Vorschüsse verbucht.</div>`;
      return;
    }

    container.innerHTML = list.map(item => `
      <div class="interna-item-card">
        <div class="interna-item-main" style="width: 100%;">
          <div class="interna-item-top">
            <span class="fin-status-pill ${item.status === 'Bezahlt' ? 'paid' : 'open'}" onclick="InternaModules.toggleFinanceStatus('${item.id}')" title="Klicken zum Umschalten">
              ${item.status === 'Bezahlt' ? '✓ Bezahlt' : '⏳ Offen (Überweisung)'}
            </span>
            <span style="font-size:0.78rem; color:var(--text-muted);">${item.date}</span>
          </div>
          <div class="interna-item-title">${app.escapeHtml(item.client)} — <strong style="color:var(--accent-gold-light);">${fmt(item.amount)}</strong></div>
          ${Array.isArray(item.breakdown) && item.breakdown.length > 0 ? `
            <div class="fin-saved-breakdown">
              ${item.breakdown.map(b => `<div class="fin-saved-line"><span>• ${app.escapeHtml(b.title)}</span><span>${fmt(b.amount)}</span></div>`).join('')}
            </div>
          ` : `<div class="interna-item-sub">${app.escapeHtml(item.desc)}</div>`}
        </div>
        <button class="btn btn-danger-outline btn-sm" onclick="InternaModules.deleteFinanceEntry('${item.id}')" title="Eintrag löschen">✕</button>
      </div>
    `).join('');
  },

  // --- 3. INTERNE NOTIZEN & TO-DO ---
  getTodos() {
    try { return JSON.parse(localStorage.getItem(this.keys.todos)) || []; }
    catch { return []; }
  },

  saveTodos(list) {
    localStorage.setItem(this.keys.todos, JSON.stringify(list));
    if (window.app) app.syncSettingToCloud('todos', list);
    this.renderTodos();
  },

  addTodo(e) {
    e.preventDefault();
    const text = document.getElementById('todoText').value.trim();
    const prio = document.getElementById('todoPrio').value;
    if (!text) return;

    const list = this.getTodos();
    list.unshift({
      id: 'todo_' + Date.now(),
      text, prio, done: false
    });
    this.saveTodos(list);
    e.target.reset();
  },

  toggleTodo(id) {
    const list = this.getTodos().map(t => {
      if (t.id === id) t.done = !t.done;
      return t;
    });
    this.saveTodos(list);
  },

  deleteTodo(id) {
    const list = this.getTodos().filter(t => t.id !== id);
    this.saveTodos(list);
  },

  renderTodos() {
    const container = document.getElementById('todosListContainer');
    if (!container) return;
    const list = this.getTodos();

    if (list.length === 0) {
      container.innerHTML = `<div class="interna-empty">📝 Keine offenen Kanzlei-Aufgaben vorhanden.</div>`;
      return;
    }

    container.innerHTML = list.map(t => `
      <div class="interna-todo-row ${t.done ? 'done' : ''}">
        <label class="todo-check-label">
          <input type="checkbox" ${t.done ? 'checked' : ''} onchange="InternaModules.toggleTodo('${t.id}')">
          <span class="todo-text">${app.escapeHtml(t.text)}</span>
        </label>
        <div style="display:flex; align-items:center; gap:8px;">
          <span class="todo-prio-badge prio-${t.prio.toLowerCase()}">${t.prio}</span>
          <button class="btn btn-danger-outline btn-sm" style="padding:2px 8px;" onclick="InternaModules.deleteTodo('${t.id}')">✕</button>
        </div>
      </div>
    `).join('');
  }
};
