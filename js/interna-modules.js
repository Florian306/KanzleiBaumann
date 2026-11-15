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

    const customTitle = document.getElementById('finCustomTitle')?.value.trim() || '';
    const customAmount = parseFloat(document.getElementById('finCustomAmount')?.value || '0') || 0;
    if (customTitle && customAmount !== 0) {
      baseSum += customAmount;
      lines.push({ title: customTitle, amount: customAmount, isCustom: true });
    }

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

  populateCaseSelect() {
    const select = document.getElementById('finCaseSelect');
    if (!select || typeof StorageService === 'undefined') return;
    const cases = StorageService.getCases ? StorageService.getCases() : [];
    select.innerHTML = `<option value="">— Manuell eingeben —</option>` +
      cases.map(c => `<option value="${c.id}">${app.escapeHtml(c.az || '')} — ${app.escapeHtml(c.clientName || c.title || 'Unbekannt')}</option>`).join('');
  },

  fillFromCase(caseId) {
    if (!caseId || typeof StorageService === 'undefined') return;
    const c = (StorageService.getCases() || []).find(x => x.id === caseId);
    if (!c) return;
    const clientEl = document.getElementById('finClient');
    const phoneEl = document.getElementById('finClientPhone');
    const refEl = document.getElementById('finCaseRef');
    if (clientEl) clientEl.value = c.clientName || '';
    if (phoneEl && c.clientPhone) phoneEl.value = c.clientPhone;
    if (refEl && c.az) refEl.value = c.az;
  },

  openNewInvoiceModal() {
    const form = document.getElementById('finInvoiceForm');
    if (form) form.reset();
    const editIdEl = document.getElementById('finEditingId');
    if (editIdEl) editIdEl.value = '';
    const titleEl = document.getElementById('finModalTitle');
    if (titleEl) titleEl.textContent = '🧾 Neue Rechnung erstellen';
    this.populateCaseSelect();
    this.updateFinanceBreakdown();
    if (window.app) app.openModal('modalNewInvoice');
  },

  editFinanceEntry(id) {
    const item = this.getFinances().find(i => i.id === id);
    if (!item) return;
    this.openNewInvoiceModal();

    const editIdEl = document.getElementById('finEditingId');
    if (editIdEl) editIdEl.value = item.id;
    const titleEl = document.getElementById('finModalTitle');
    if (titleEl) titleEl.textContent = `✏️ Rechnung ${item.invoiceNo || ''} bearbeiten`;

    document.getElementById('finClient').value = item.client || '';
    if (document.getElementById('finClientPhone')) document.getElementById('finClientPhone').value = item.clientPhone || '';
    if (document.getElementById('finClientAddress')) document.getElementById('finClientAddress').value = item.clientAddress || '';
    if (document.getElementById('finCaseRef')) document.getElementById('finCaseRef').value = item.caseRef || '';
    if (document.getElementById('finStatus')) document.getElementById('finStatus').value = item.status || 'Offen';
    if (document.getElementById('finDueDays') && item.dueDays !== undefined) document.getElementById('finDueDays').value = String(item.dueDays);

    const breakdownTitles = new Set((item.breakdown || []).map(b => b.title));
    document.querySelectorAll('.fin-service-cb').forEach(cb => {
      cb.checked = breakdownTitles.has(cb.dataset.title) || (cb.dataset.type === 'pct' && (item.breakdown || []).some(b => b.title.startsWith('Dringlichkeitszuschlag')));
    });

    const customLine = (item.breakdown || []).find(b => b.isCustom);
    if (document.getElementById('finCustomTitle')) document.getElementById('finCustomTitle').value = customLine ? customLine.title : '';
    if (document.getElementById('finCustomAmount')) document.getElementById('finCustomAmount').value = customLine ? customLine.amount : '';

    this.updateFinanceBreakdown();
  },

  addFinanceEntry(e) {
    e.preventDefault();
    const editingId = document.getElementById('finEditingId')?.value.trim() || '';
    const client = document.getElementById('finClient').value.trim();
    const clientPhone = document.getElementById('finClientPhone')?.value.trim() || '';
    const clientAddress = document.getElementById('finClientAddress')?.value.trim() || '';
    const caseRef = document.getElementById('finCaseRef')?.value.trim() || '';
    const amount = parseFloat(document.getElementById('finAmount').value) || 0;
    const status = document.getElementById('finStatus').value;
    const dueDays = parseInt(document.getElementById('finDueDays')?.value ?? '14', 10);
    const breakdown = this.updateFinanceBreakdown();

    if (!client || breakdown.length === 0 || amount <= 0) {
      if (window.app) app.showToast('Bitte Mandant und mindestens eine Leistung auswählen.', 'error');
      return;
    }

    const desc = breakdown.map(b => b.title).join(' + ');
    let list = this.getFinances();
    const dueDateObj = new Date();
    dueDateObj.setDate(dueDateObj.getDate() + dueDays);
    const dueDate = dueDays === 0 ? 'Sofort' : dueDateObj.toLocaleDateString('de-DE');

    if (editingId) {
      list = list.map(item => item.id === editingId ? {
        ...item,
        client, clientPhone, clientAddress, caseRef, desc, breakdown, amount, status,
        dueDays, dueDate
      } : item);
    } else {
      const invoiceNo = `RE-${new Date().getFullYear()}-${String(101 + list.length).padStart(3, '0')}`;
      list.unshift({
        id: 'fin_' + Date.now(),
        invoiceNo,
        client, clientPhone, clientAddress, caseRef, desc, breakdown, amount, status,
        dueDays, dueDate,
        date: new Date().toLocaleDateString('de-DE')
      });
    }
    this.saveFinances(list);
    e.target.reset();
    if (document.getElementById('finEditingId')) document.getElementById('finEditingId').value = '';
    this.updateFinanceBreakdown();
    if (window.app) {
      app.closeModal('modalNewInvoice');
      app.showToast(editingId ? 'Rechnung aktualisiert!' : 'Rechnung erfolgreich erstellt!', 'success');
    }
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

    const searchQuery = (document.getElementById('finSearchInput')?.value || '').trim().toLowerCase();
    const statusFilter = document.getElementById('finStatusFilter')?.value || 'all';

    const filtered = list.filter((item, idx) => {
      if (statusFilter !== 'all' && item.status !== statusFilter) return false;
      if (searchQuery) {
        const invNo = (item.invoiceNo || `RE-2026-${String(101 + idx).padStart(3, '0')}`).toLowerCase();
        const hay = `${item.client} ${invNo} ${item.caseRef || ''} ${item.desc || ''}`.toLowerCase();
        if (!hay.includes(searchQuery)) return false;
      }
      return true;
    });

    if (filtered.length === 0) {
      container.innerHTML = `<div class="interna-empty">🔍 Keine Rechnungen passend zum Filter gefunden.</div>`;
      return;
    }

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    container.innerHTML = filtered.map((item, idx) => {
      const invNo = item.invoiceNo || `RE-2026-${String(101 + idx).padStart(3, '0')}`;
      let isOverdue = false;
      if (item.status !== 'Bezahlt' && item.dueDate && item.dueDate !== 'Sofort') {
        const parts = item.dueDate.split('.');
        if (parts.length === 3) {
          const dueObj = new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
          if (dueObj < todayStart) isOverdue = true;
        }
      }
      return `
      <div class="interna-item-card fin-invoice-card">
        <div class="interna-item-main" style="width: 100%;">
          <div class="interna-item-top">
            <span class="az-tag" style="font-size:0.74rem; padding:2px 8px;">${invNo}</span>
            <span class="fin-status-pill ${item.status === 'Bezahlt' ? 'paid' : 'open'}" onclick="InternaModules.toggleFinanceStatus('${item.id}')" title="Klicken zum Umschalten">
              ${item.status === 'Bezahlt' ? '✓ Bezahlt' : '⏳ Offen (Überweisung)'}
            </span>
            ${isOverdue ? `<span style="background: rgba(239, 68, 68, 0.18); color: #fca5a5; border: 1px solid rgba(239, 68, 68, 0.45); font-size: 0.72rem; font-weight: 700; padding: 2px 8px; border-radius: 999px;">⚠️ Überfällig</span>` : ''}
            <span style="font-size:0.78rem; color:var(--text-muted);">${item.date}${item.dueDate && item.status !== 'Bezahlt' ? ` • Fällig: ${item.dueDate}` : ''}</span>
          </div>
          <div class="interna-item-title">${app.escapeHtml(item.client)} — <strong style="color:var(--accent-gold-light);">${fmt(item.amount)}</strong></div>
          ${Array.isArray(item.breakdown) && item.breakdown.length > 0 ? `
            <div class="fin-saved-breakdown">
              ${item.breakdown.map(b => `<div class="fin-saved-line"><span>• ${app.escapeHtml(b.title)}</span><span>${fmt(b.amount)}</span></div>`).join('')}
            </div>
          ` : `<div class="interna-item-sub">${app.escapeHtml(item.desc)}</div>`}
        </div>
        <div class="fin-card-actions">
          <button class="btn btn-secondary btn-sm" onclick="InternaModules.exportInvoicePdf('${item.id}')" title="Offizielle Rechnung als PDF drucken">📄 Rechnung PDF</button>
          <button class="btn btn-secondary btn-sm" onclick="InternaModules.editFinanceEntry('${item.id}')" title="Rechnung bearbeiten">✏️</button>
          <button class="btn btn-danger-outline btn-sm" onclick="InternaModules.deleteFinanceEntry('${item.id}')" title="Eintrag löschen">✕</button>
        </div>
      </div>
    `;}).join('');
  },

  exportInvoicePdf(id) {
    const item = this.getFinances().find(i => i.id === id);
    if (!item || !window.app) return;

    const modalBody = document.getElementById('officialDocContent');
    if (!modalBody) return;

    const fmt = (n) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
    const invNo = item.invoiceNo || `RE-${new Date().getFullYear()}-101`;
    const rows = Array.isArray(item.breakdown) && item.breakdown.length > 0
      ? item.breakdown
      : [{ title: item.desc || 'Anwaltliche Leistung', amount: item.amount }];

    modalBody.innerHTML = `
      <div class="official-letterhead-card invoice-pdf-card">
        <div class="letterhead-header" style="align-items: center;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <img src="assets/logo.jpg" alt="Kanzlei Logo" style="width: 68px; height: 68px; border-radius: 50%; object-fit: cover; border: 2px solid #b8862d;">
            <div>
              <div class="letterhead-firm-title">KANZLEI DR. JUR. LARS BAUMANN</div>
              <div class="letterhead-firm-sub">Rechtsanwalt • Fachanwaltschaft für Strafrecht & Zivilrecht</div>
              <div class="letterhead-firm-sub">Kurfürstendamm 182 • 10707 Berlin • Tel: 907-999-3919</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--font-mono); font-size: 1.05rem; font-weight: 700; color: #1e3a8a;">${invNo}</div>
            <div style="font-size: 0.85rem; color: #475569;">Berlin, den ${item.date}</div>
            <div style="font-size: 0.78rem; font-weight: 700; margin-top: 4px; color: ${item.status === 'Bezahlt' ? '#059669' : '#b45309'};">
              Status: ${item.status === 'Bezahlt' ? 'BEZAHLT' : 'ZAHLUNG OFFEN'}
            </div>
          </div>
        </div>

        <div class="letterhead-court-info" style="margin-bottom: 24px;">
          <span style="font-size: 0.8rem; color: #64748b; text-transform: uppercase;">Rechnungsempfänger / Mandant:</span><br>
          <strong style="font-size: 1.15rem;">${app.escapeHtml(item.client)}</strong>
          ${item.clientAddress ? `<div style="font-size: 0.92rem; color: #334155; margin-top: 2px;">${app.escapeHtml(item.clientAddress)}</div>` : ''}
          ${item.clientPhone ? `<div style="font-size: 0.9rem; color: #475569; margin-top: 2px;">Tel: ${app.escapeHtml(item.clientPhone)}</div>` : ''}
          ${item.caseRef ? `<div style="font-size: 0.88rem; color: #1e3a8a; font-weight: 600; margin-top: 4px;">Aktenzeichen: ${app.escapeHtml(item.caseRef)}</div>` : ''}
        </div>

        <h3 style="font-size: 1.25rem; margin-bottom: 12px; color: #0f172a; border-bottom: 1px solid #cbd5e1; padding-bottom: 6px;">
          Honorarnote gemäß offizieller Gebührenordnung
        </h3>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 0.96rem;">
          <thead>
            <tr style="background: #f1f5f9; border-bottom: 2px solid #0f172a; text-align: left;">
              <th style="padding: 10px 12px; width: 50px;">Pos.</th>
              <th style="padding: 10px 12px;">Anwaltliche Leistung / Auslagen</th>
              <th style="padding: 10px 12px; text-align: right;">Betrag</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 10px 12px; color: #475569;">${i + 1}.</td>
                <td style="padding: 10px 12px; font-weight: 600;">${app.escapeHtml(r.title)}</td>
                <td style="padding: 10px 12px; text-align: right; font-family: var(--font-mono);">${fmt(r.amount)}</td>
              </tr>
            `).join('')}
          </tbody>
          <tfoot>
            <tr style="border-top: 2px solid #0f172a; background: #f8fafc;">
              <td colspan="2" style="padding: 12px; font-weight: 700; font-size: 1.05rem;">Gesamthonorar (feste Pauschale)</td>
              <td style="padding: 12px; text-align: right; font-family: var(--font-mono); font-weight: 800; font-size: 1.15rem; color: #1e3a8a;">${fmt(item.amount)}</td>
            </tr>
          </tfoot>
        </table>

        <div style="background: #f8fafc; border-left: 4px solid #b8862d; padding: 12px 16px; font-size: 0.88rem; color: #334155; margin-bottom: ${item.dueDate ? '14px' : '28px'};">
          <strong>Zahlungsmodalitäten:</strong> Die Entrichtung erfolgt ausschließlich per offizieller Rechnungsüberweisung an die Kanzlei Dr. jur. Lars Baumann unter Angabe der Rechnungsnummer <strong>${invNo}</strong>. Barzahlungen sind grundsätzlich ausgeschlossen.
        </div>
        ${item.dueDate ? `
          <div style="background: #fffbeb; border: 1.5px solid #d97706; border-left: 5px solid #b45309; padding: 12px 16px; border-radius: 6px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center; gap: 12px;">
            <div style="font-size: 0.92rem; color: #78350f;">
              <strong>⏳ Zahlungsfrist:</strong> ${item.dueDate === 'Sofort' ? 'Sofort fällig ohne Abzug.' : `Zahlbar innerhalb von <strong>${item.dueDays || 14} Tagen</strong>`}
            </div>
            <div style="font-family: var(--font-mono); font-size: 1rem; font-weight: 800; color: #92400e; background: #fef3c7; padding: 4px 12px; border-radius: 4px; border: 1px solid #f59e0b;">
              ${item.dueDate === 'Sofort' ? 'SOFORT FÄLLIG' : `Fällig bis: ${item.dueDate}`}
            </div>
          </div>
        ` : ''}
        <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 10px 14px; font-size: 0.82rem; color: #7f1d1d; margin-bottom: 28px;">
          <strong>Hinweis bei Zahlungsverzug:</strong> Bei nicht fristgerechter Begleichung der Honorarnote gerät der Mandant automatisch in Zahlungsverzug (§ 286 BGB). Die Kanzlei behält sich in diesem Fall vor, gesetzliche Verzugszinsen, Mahngebühren sowie ein gerichtliches Mahn- und Vollstreckungsverfahren einzuleiten und das Mandat niederzulegen.
        </div>

        <div class="letterhead-footer-sign">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <img src="assets/logo.jpg" alt="Kanzleisiegel Dr. jur. Lars Baumann" style="width: 86px; height: 86px; border-radius: 50%; object-fit: cover; border: 2px solid #b8862d; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);">
            <span style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 600;">Kanzleisiegel</span>
          </div>
          <div class="signature-block">
            <div class="signature-svg">Dr. Lars Baumann</div>
            <div style="font-size: 0.85rem; font-weight: 600; color: #334155; margin-top: 4px;">
              Dr. jur. Lars Baumann<br>
              Rechtsanwalt & Kanzleiinhaber
            </div>
          </div>
        </div>
      </div>
    `;

    app.openModal('modalOfficialDocument');
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
