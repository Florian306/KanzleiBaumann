/**
 * Main Application Controller (Modular Edition)
 * Kanzlei Dr. jur. Lars Baumann – Berlin
 */

class KanzleiApp {
  constructor() {
    this.storage = new StorageService();
    this.storageKey = 'kanzlei_lars_baumann_berlin_cases_v4';
    this.feesKey = 'kanzlei_lars_baumann_fees_v1';
    this.webhookKey = 'kanzlei_lars_baumann_discord_webhook_v1';
    this.authKey = 'kanzlei_lars_baumann_authenticated';
    this.passwordHash = 'baumann2026';

    this.currentView = 'portal';
    this.currentCaseId = null;
    this.currentDetailTab = 'stammdaten';

    this.fees = this.loadFees();
    this.discordWebhookUrl = localStorage.getItem(this.webhookKey) || '';
    this.cases = this.loadCases();
    this.pubSelectedFiles = []; // Temporary storage for public case submission attachments
    this.clearDemoCasesOnce(); // Remove legacy demo cases if user desires clean live database
  }

  init() {
    this.updateClock();
    setInterval(() => this.updateClock(), 1000);

    // Dynamic rendering of modular components
    if (typeof ModalComponents !== 'undefined') {
      ModalComponents.renderAllModals();
    }
    this.renderPublicFees();
    this.renderFAQ();
    this.renderCasesTable();
    this.updateMetrics();
    this.updateAzPreview();
    if (typeof InternaModules !== 'undefined') {
      InternaModules.init();
    }
    this.syncFromCloud();
  }

  async syncFromCloud() {
    try {
      const [casesRes, internaRes] = await Promise.all([
        fetch('/api/cases'),
        fetch('/api/interna')
      ]);

      if (casesRes.ok) {
        const data = await casesRes.json();
        if (Array.isArray(data.cases)) {
          this.cases = data.cases;
          localStorage.setItem(this.storageKey, JSON.stringify(this.cases));
          this.renderCasesTable();
          this.updateMetrics();
          this.updateAzPreview();
        }
      }

      if (internaRes.ok) {
        const { data } = await internaRes.json();
        if (data) {
          if (data.fees) {
            this.fees = { ...DEFAULT_FEES, ...data.fees };
            localStorage.setItem(this.feesKey, JSON.stringify(this.fees));
            this.renderPublicFees();
          }
          if (data.webhook !== undefined) {
            this.discordWebhookUrl = data.webhook;
            localStorage.setItem(this.webhookKey, data.webhook);
          }
          if (typeof InternaModules !== 'undefined') {
            if (data.appointments) localStorage.setItem(InternaModules.keys.appointments, JSON.stringify(data.appointments));
            if (data.finances) localStorage.setItem(InternaModules.keys.finances, JSON.stringify(data.finances));
            if (data.todos) localStorage.setItem(InternaModules.keys.todos, JSON.stringify(data.todos));
            if (data.liveStatus) localStorage.setItem(InternaModules.keys.status, data.liveStatus);
            InternaModules.init();
          }
        }
      }
    } catch (e) {
      // Offline / Local mode: silently use localStorage
    }
  }

  async syncCaseToCloud(c) {
    if (!c) return;
    try {
      const res = await fetch('/api/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(c)
      });
      if (!res.ok) {
        const errText = await res.text();
        console.error('Cloud sync failed:', res.status, errText);
        this.showToast(`DB-Fehler (${res.status}) beim Speichern!`, 'error');
      }
    } catch (e) {
      console.error('Cloud sync error:', e);
    }
  }

  async syncSettingToCloud(key, value) {
    try {
      await fetch('/api/interna', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value })
      });
    } catch (e) { /* Ignore offline */ }
  }

  updateClock() {
    const el = document.getElementById('systemTime');
    if (!el) return;
    const now = new Date();
    const dStr = now.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
    const tStr = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    el.textContent = `BERLIN • ${dStr} • ${tStr} UHR`;
  }

  // --- GEBÜHRENORDNUNG (DYNAMISCH & MODULAR) ---
  loadFees() {
    try {
      const raw = localStorage.getItem(this.feesKey);
      if (raw) return { ...DEFAULT_FEES, ...JSON.parse(raw) };
    } catch (e) {
      console.error('Fees loading error:', e);
    }
    return { ...DEFAULT_FEES };
  }

  saveFees(newFees) {
    this.fees = { ...this.fees, ...newFees };
    localStorage.setItem(this.feesKey, JSON.stringify(this.fees));
    this.renderPublicFees();
    this.showToast('Kanzlei-Gebührensätze aktualisiert!', 'success');
  }

  renderPublicFees() {
    const container = document.getElementById('feesDynamicContainer');
    if (!container || typeof FEE_GROUPS === 'undefined') return;

    const formatEuro = (num) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(num);

    let html = '';
    FEE_GROUPS.forEach(group => {
      html += `
        <div class="fee-group-block">
          <h3 class="fee-group-title">${group.title}</h3>
          <div class="fees-grid">
            ${group.items.map(item => {
              const val = this.fees[item.id] || 0;
              let displayPrice = formatEuro(val);
              if (item.isPercent) displayPrice = `+${val} %`;
              else if (item.suffix) displayPrice = `${formatEuro(val)}${item.suffix}`;

              return `
                <div class="fee-card ${item.highlight ? 'highlight' : ''}">
                  <div class="fee-card-top">
                    <span class="fee-category-badge">${item.badge}</span>
                    <div class="fee-card-title">${item.title}</div>
                    <div class="fee-card-desc">${item.desc}</div>
                  </div>
                  <div class="fee-card-price" id="fee-${item.id}">${displayPrice}</div>
                </div>
              `;
            }).join('')}
          </div>
        </div>
      `;
    });

    // Add Policy Card
    html += `
      <div class="fee-policy-card">
        <div class="fee-policy-header">
          <span class="fee-policy-icon">📋</span>
          <div>
            <h4>Vorschuss & Zahlungsmodalitäten</h4>
            <p>Verbindliche Richtlinien für die Mandatsabwicklung</p>
          </div>
        </div>
        <div class="fee-policy-grid">
          <div class="policy-item">
            <strong>Sonderfälle:</strong> Nicht explizit aufgeführte Leistungen werden unkompliziert im Rahmen einer erweiterten Rechtsberatung oder nach individuellem Aufwand berechnet.
          </div>
          <div class="policy-item">
            <strong>Vorauszahlung / Vorschuss:</strong> Bei bestimmten Mandaten (insbesondere nächtlichen Einsätzen oder vor Gerichtsverhandlungen) kann eine Vorauszahlung vor Tätigkeitsbeginn erhoben werden.
          </div>
          <div class="policy-item full">
            <strong>Zahlungsmittel:</strong> Die Entrichtung erfolgt ausschließlich per offizieller Rechnungsüberweisung an die Kanzlei. <u>Barzahlungen sind grundsätzlich ausgeschlossen.</u>
          </div>
        </div>
        <div class="fee-policy-footer">
          <span>Hinweis: Abrechnung erfolgt transparent als feste Pauschale pro Leistung nach Mandatsannahme. Keine versteckten Stundensätze.</span>
          <strong style="color: var(--accent-gold-light);">Kanzleiinhaber Dr. jur. Lars Baumann</strong>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // --- FAQ RENDERING ---
  renderFAQ() {
    const container = document.getElementById('faqAccordionContainer');
    if (!container || typeof FAQ_ITEMS === 'undefined') return;

    container.innerHTML = FAQ_ITEMS.map((faq, idx) => `
      <div class="faq-item" id="faqItem-${idx}">
        <div class="faq-question" onclick="app.toggleFAQ(${idx})">
          <span>${faq.q}</span>
          <span class="faq-icon" id="faqIcon-${idx}">+</span>
        </div>
        <div class="faq-answer" id="faqAnswer-${idx}">
          <p>${faq.a}</p>
        </div>
      </div>
    `).join('');
  }

  toggleFAQ(idx) {
    const answer = document.getElementById(`faqAnswer-${idx}`);
    const icon = document.getElementById(`faqIcon-${idx}`);
    const item = document.getElementById(`faqItem-${idx}`);
    if (!answer || !icon || !item) return;

    const isOpen = item.classList.contains('open');
    if (isOpen) {
      item.classList.remove('open');
      icon.textContent = '+';
      answer.style.maxHeight = null;
    } else {
      item.classList.add('open');
      icon.textContent = '−';
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
  }

  openFeeSettingsModal() {
    if (!this.isAuthenticated()) {
      this.openModal('modalPassword');
      return;
    }
    const ids = [
      'Erstberatung', 'Ausfuehrlich', 'Schriftverkehr', 'Vergleich',
      'Vertragspruefung', 'Vertragserstellung', 'Vernehmung', 'Strafverteidigung',
      'Zivilklage', 'Hauptverhandlung', 'Fahrtpauschale', 'Dringlichkeitszuschlag'
    ];
    ids.forEach(capId => {
      const lowerId = capId.toLowerCase();
      const el = document.getElementById(`inputFee${capId}`);
      if (el) el.value = this.fees[lowerId] || DEFAULT_FEES[lowerId] || 0;
    });

    const whInput = document.getElementById('inputDiscordWebhook');
    if (whInput) whInput.value = this.discordWebhookUrl;

    this.openModal('modalEditFees');
  }

  handleSaveFees(e) {
    e.preventDefault();
    const updated = {
      erstberatung: parseFloat(document.getElementById('inputFeeErstberatung')?.value) || 1000,
      ausfuehrlich: parseFloat(document.getElementById('inputFeeAusfuehrlich')?.value) || 2500,
      schriftverkehr: parseFloat(document.getElementById('inputFeeSchriftverkehr')?.value) || 4000,
      vergleich: parseFloat(document.getElementById('inputFeeVergleich')?.value) || 6000,
      vertragspruefung: parseFloat(document.getElementById('inputFeeVertragspruefung')?.value) || 3500,
      vertragserstellung: parseFloat(document.getElementById('inputFeeVertragserstellung')?.value) || 5000,
      vernehmung: parseFloat(document.getElementById('inputFeeVernehmung')?.value) || 7500,
      strafverteidigung: parseFloat(document.getElementById('inputFeeStrafverteidigung')?.value) || 12000,
      zivilklage: parseFloat(document.getElementById('inputFeeZivilklage')?.value) || 10000,
      hauptverhandlung: parseFloat(document.getElementById('inputFeeHauptverhandlung')?.value) || 15000,
      fahrtpauschale: parseFloat(document.getElementById('inputFeeFahrtpauschale')?.value) || 1500,
      dringlichkeitszuschlag: parseFloat(document.getElementById('inputFeeDringlichkeitszuschlag')?.value) || 50
    };
    this.saveFees(updated);

    const whInput = document.getElementById('inputDiscordWebhook');
    if (whInput) {
      this.discordWebhookUrl = whInput.value.trim();
      localStorage.setItem(this.webhookKey, this.discordWebhookUrl);
    }

    this.closeModal('modalEditFees');
  }

  // --- PERSISTENCE ---
  loadCases() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to load cases:', e);
    }
    return [];
  }

  saveCases(changedCase = null) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.cases));
      this.updateMetrics();
      if (changedCase) this.syncCaseToCloud(changedCase);
    } catch (e) {
      console.error('Failed to save cases:', e);
      this.showToast('Speicherfehler (LocalStorage Limit)!', 'error');
    }
  }

  generateJuridicalAktenzeichen(caseType) {
    const yearShort = new Date().getFullYear().toString().slice(-2);

    let code = 'Allg';
    if (caseType.includes('Straf')) code = 'StR';
    else if (caseType.includes('Polizei') || caseType.includes('Dienst')) code = 'PolR';
    else if (caseType.includes('Zivil') || caseType.includes('Schaden')) code = 'Ziv';
    else if (caseType.includes('Waffen') || caseType.includes('Lizenz')) code = 'WaffR';
    else if (caseType.includes('Dienstaufsicht')) code = 'IAD';

    let highestNum = 100;
    const regex = new RegExp(`^(\\d+)/${yearShort}\\s`);

    this.cases.forEach(c => {
      if (c.az) {
        const match = c.az.match(regex);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > highestNum) highestNum = num;
        }
      }
    });

    const nextNum = highestNum + 1;
    return `${nextNum}/${yearShort} ${code}`;
  }

  clearDemoCasesOnce() {
    // Filter out the initial 3 demo mock cases (Alexander Wendt, Miriam Al-Hassan, SpreeLogistik)
    const demoIds = ['case_berlin_01', 'case_berlin_02', 'case_berlin_03'];
    const hasDemo = this.cases.some(c => demoIds.includes(c.id));
    if (hasDemo) {
      this.cases = this.cases.filter(c => !demoIds.includes(c.id));
      this.saveCases();
    }
  }

  // --- NAVIGATION ---
  navigate(viewId) {
    document.querySelectorAll('.view-section').forEach(sec => sec.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));

    const targetSec = document.getElementById(`view-${viewId}`);
    const targetNav = document.getElementById(`nav-${viewId}`);

    if (targetSec) targetSec.classList.add('active');
    if (targetNav) targetNav.classList.add('active');

    this.currentView = viewId;
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewId === 'dashboard') {
      this.renderCasesTable();
      this.updateMetrics();
    }
  }

  scrollToSection(sectionId) {
    if (this.currentView !== 'portal') {
      this.navigate('portal');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 150);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }

  // --- AUTHENTICATION ---
  isAuthenticated() {
    return sessionStorage.getItem(this.authKey) === 'true';
  }

  openInternalPortal() {
    if (this.isAuthenticated()) {
      this.navigate('dashboard');
    } else {
      this.openModal('modalPassword');
    }
  }

  handleAuthSubmit(e) {
    e.preventDefault();
    const pwInput = document.getElementById('authPassword');
    const errBox = document.getElementById('authErrorMsg');

    if (pwInput.value.trim() === this.passwordHash) {
      sessionStorage.setItem(this.authKey, 'true');
      this.closeModal('modalPassword');
      pwInput.value = '';
      errBox.style.display = 'none';
      this.showToast('Angemeldet: Dr. jur. Lars Baumann (Berlin)', 'success');
      this.navigate('dashboard');
    } else {
      errBox.style.display = 'block';
      pwInput.focus();
    }
  }

  lockInternalPortal() {
    sessionStorage.removeItem(this.authKey);
    this.showToast('Kanzlei-Interna gesperrt.', 'info');
    this.navigate('portal');
  }

  // --- CASE SUBMISSION (WITH EVIDENCE / ATTACHMENTS & URGENCY) ---
  updateAzPreview() {
    const select = document.getElementById('pubCaseType');
    const badge = document.getElementById('pubAzPreviewCode');
    if (!select || !badge) return;

    const caseType = select.value;
    const previewAz = this.generateJuridicalAktenzeichen(caseType);
    badge.textContent = previewAz;
  }

  toggleUrgencyMode(isUrgent) {
    const card = document.getElementById('urgencyToggleCard');
    if (!card) return;
    if (isUrgent) {
      card.classList.add('active-urgent');
      this.showToast('🚨 Eilmodus aktiviert: Sofortige Prioritätsprüfung für Gewahrsamsfälle.', 'warning');
    } else {
      card.classList.remove('active-urgent');
    }
  }

  async sendDiscordWebhookNotification(caseData) {
    if (!this.discordWebhookUrl) return;

    try {
      const isUrgent = caseData.securityLevel === 'notfall';
      const color = isUrgent ? 0xef4444 : 0xd4af37; // Red or Gold

      const payload = {
        username: "Kanzlei Dr. Lars Baumann — Fallregister",
        avatar_url: "https://raw.githubusercontent.com/Florian306/KanzleiBaumann/main/assets/seal.png",
        embeds: [
          {
            title: isUrgent ? "🚨 EILMANDAT / GEWAHRSAMSEINSATZ BERLIN" : "⚖️ Neues Mandat im Kanzleiregister eingereicht",
            description: `Ein neuer Sachverhalt wurde über das Kanzleiportal Berlin eingereicht.`,
            color: color,
            fields: [
              { name: "Aktenzeichen", value: `\`${caseData.az}\``, inline: true },
              { name: "Rechtsgebiet", value: caseData.caseType, inline: true },
              { name: "Priorität", value: isUrgent ? "🚨 **HOCH (GEWAHRSAM)**" : "Normal", inline: true },
              { name: "Mandant", value: caseData.clientName, inline: true },
              { name: "Kontakt / Funk", value: caseData.clientPhone, inline: true },
              { name: "Gegenseite", value: caseData.opponent, inline: true },
              { name: "Tatort / Vorfall", value: caseData.incidentDate || "Berlin", inline: false },
              { name: "Sachverhalt", value: (caseData.description.length > 400 ? caseData.description.substring(0, 397) + "..." : caseData.description), inline: false },
              { name: "Beweismittel", value: `${caseData.filesCount} Datei(en) in Kanzleidatenbank gesichert`, inline: true }
            ],
            footer: {
              text: "Kanzlei Dr. jur. Lars Baumann • Kurfürstendamm 182, 10707 Berlin"
            },
            timestamp: new Date().toISOString()
          }
        ]
      };

      await fetch(this.discordWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
    } catch (err) {
      console.warn('Discord webhook notification could not be sent:', err);
    }
  }

  handlePubDragOver(e) {
    e.preventDefault();
    e.stopPropagation();
    const zone = document.getElementById('pubDropzone');
    if (zone) zone.classList.add('dragover');
  }

  handlePubDragLeave(e) {
    e.preventDefault();
    e.stopPropagation();
    const zone = document.getElementById('pubDropzone');
    if (zone) zone.classList.remove('dragover');
  }

  handlePubDrop(e) {
    e.preventDefault();
    e.stopPropagation();
    const zone = document.getElementById('pubDropzone');
    if (zone) zone.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      this.addPublicFiles(files);
    }
  }

  handlePubFileInput(e) {
    const files = e.target.files;
    if (files && files.length > 0) {
      this.addPublicFiles(files);
    }
    // reset input so same file can be selected again if needed
    e.target.value = '';
  }

  addPublicFiles(files) {
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // Avoid duplicate names in same upload session
      if (!this.pubSelectedFiles.some(f => f.name === file.name && f.size === file.size)) {
        this.pubSelectedFiles.push(file);
      }
    }
    this.renderPubSelectedFilesList();
  }

  removePubFile(index) {
    this.pubSelectedFiles.splice(index, 1);
    this.renderPubSelectedFilesList();
  }

  renderPubSelectedFilesList() {
    const listContainer = document.getElementById('pubSelectedFilesList');
    if (!listContainer) return;

    if (this.pubSelectedFiles.length === 0) {
      listContainer.style.display = 'none';
      listContainer.innerHTML = '';
      return;
    }

    listContainer.style.display = 'flex';
    listContainer.innerHTML = `
      <div class="pub-files-header">
        <span>Ausgewählte Beweismittel (${this.pubSelectedFiles.length}):</span>
        <button type="button" class="btn btn-secondary btn-sm" onclick="app.clearPubFiles()">Alle entfernen</button>
      </div>
      <div class="pub-files-chips">
        ${this.pubSelectedFiles.map((file, idx) => {
          let icon = '📄';
          if (file.type.startsWith('image/')) icon = '📸';
          else if (file.type.startsWith('video/')) icon = '🎥';
          return `
            <div class="pub-file-chip">
              <span class="pub-chip-icon">${icon}</span>
              <span class="pub-chip-name" title="${this.escapeHtml(file.name)}">${this.escapeHtml(file.name)}</span>
              <span class="pub-chip-size">(${this.formatFileSize(file.size)})</span>
              <button type="button" class="pub-chip-remove" onclick="app.removePubFile(${idx})">✕</button>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  clearPubFiles() {
    this.pubSelectedFiles = [];
    this.renderPubSelectedFilesList();
  }

  async handlePublicSubmit(e) {
    e.preventDefault();

    const submitBtn = document.getElementById('btnSubmitCase');
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Akte & Beweise werden übertragen...</span>';
    }

    const clientName = document.getElementById('pubClientName').value.trim();
    const clientPhone = document.getElementById('pubClientPhone').value.trim();
    const caseType = document.getElementById('pubCaseType').value;
    const opponent = document.getElementById('pubOpponent').value.trim();
    const incidentDate = document.getElementById('pubIncidentDate').value.trim();
    const description = document.getElementById('pubDescription').value.trim();
    const demands = document.getElementById('pubDemands').value.trim();
    const isUrgent = document.getElementById('pubIsUrgent')?.checked || false;

    const newAz = this.generateJuridicalAktenzeichen(caseType);
    const caseId = 'case_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);

    // Save attached evidence files into IndexedDB
    let attachedFilesCount = 0;
    if (this.pubSelectedFiles && this.pubSelectedFiles.length > 0) {
      for (const file of this.pubSelectedFiles) {
        let category = 'document';
        if (file.type.startsWith('image/')) category = 'image';
        else if (file.type.startsWith('video/')) category = 'video';

        try {
          const base64Data = await this.readFileAsDataURL(file);
          const fileRecord = {
            id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
            caseId: caseId,
            name: file.name,
            type: file.type || 'application/octet-stream',
            category: category,
            size: file.size,
            data: base64Data,
            uploadedAt: new Date().toISOString()
          };
          await this.storage.saveFile(fileRecord);
          attachedFilesCount++;
        } catch (err) {
          console.error('Error saving public submission attachment:', err);
        }
      }
    }

    const newCase = {
      id: caseId,
      az: newAz,
      clientName,
      clientPhone,
      opponent,
      caseType,
      status: 'Eingereicht',
      incidentDate,
      description,
      demands,
      notes: isUrgent ? '🚨 EILMANDAT: Mandant meldet akuten Polizeigewahrsam / Festnahme in Berlin!' : '',
      witnesses: '',
      schriftsatz: '',
      securityLevel: isUrgent ? 'notfall' : 'normal',
      deadlineTimestamp: isUrgent ? (Date.now() + (24 * 3600 * 1000)) : null,
      markers: [],
      feeGrundgebuehr: this.fees.erstberatung || 1000,
      feeVerfahrensgebuehr: 0,
      feeTerminsgebuehr: 0,
      createdAt: new Date().toISOString(),
      filesCount: attachedFilesCount
    };

    this.cases.unshift(newCase);
    this.saveCases(newCase);

    // Trigger async Discord webhook notification (if configured)
    this.sendDiscordWebhookNotification(newCase);

    // Reset form, urgency switch and file cache
    document.getElementById('publicCaseForm').reset();
    this.toggleUrgencyMode(false);
    this.clearPubFiles();
    this.updateAzPreview();

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = '<span>Akte registrieren & Aktenzeichen anfordern</span><span class="arrow">✓</span>';
    }

    const filesMsg = attachedFilesCount > 0 ? ` (${attachedFilesCount} Beweismittel gesichert)` : '';
    this.showToast(`Fall eingereicht! Aktenzeichen: ${newAz}${filesMsg}`, 'success');

    const azBox = document.getElementById('successModalAz');
    const descBox = document.getElementById('successModalDesc');
    if (azBox) azBox.textContent = newAz;
    if (descBox) {
      const attachInfo = attachedFilesCount > 0 
        ? `<br><br>Es wurden <strong>${attachedFilesCount} Beweismittel (Fotos/Videos/Dokumente)</strong> revisionssicher in Ihrer Akte hinterlegt.`
        : '';
      descBox.innerHTML = `Ihre Akte für <strong>${this.escapeHtml(clientName)}</strong> wurde verbindlich im Berliner Kanzleiregister aufgenommen.${attachInfo}<br><br>Es gilt die Kanzleiordnung („Wer zuerst kommt, mahlt zuerst“). Wir setzen uns unter <strong>${this.escapeHtml(clientPhone)}</strong> mit Ihnen in Verbindung.`;
    }
    this.openModal('modalSubmissionSuccess');

    this.navigate('portal');
  }

  openNewCaseModal() {
    this.openModal('modalNewCase');
  }

  handleCreateCaseModal(e) {
    e.preventDefault();
    const clientName = document.getElementById('mClientName').value.trim();
    const clientPhone = document.getElementById('mClientPhone').value.trim();
    const opponent = document.getElementById('mOpponent').value.trim();
    const caseType = document.getElementById('mCaseType').value;
    const status = document.getElementById('mStatus').value;
    const incidentDate = document.getElementById('mIncidentDate').value.trim();
    const description = document.getElementById('mDescription').value.trim();

    const newAz = this.generateJuridicalAktenzeichen(caseType);
    const newCase = {
      id: 'case_' + Date.now(),
      az: newAz,
      clientName,
      clientPhone,
      opponent,
      caseType,
      status,
      incidentDate: incidentDate || 'Berlin',
      description,
      demands: '',
      notes: '',
      witnesses: '',
      schriftsatz: '',
      securityLevel: 'normal',
      deadlineTimestamp: null,
      markers: [],
      feeGrundgebuehr: 1000,
      feeVerfahrensgebuehr: 4000,
      feeTerminsgebuehr: 0,
      createdAt: new Date().toISOString(),
      filesCount: 0
    };

    this.cases.unshift(newCase);
    this.saveCases(newCase);

    this.closeModal('modalNewCase');
    this.showToast(`Akte ${newAz} angelegt!`, 'success');
    this.openCaseDetail(newCase.id);
  }

  // --- BÜRGER STATUS TRACKER ---
  handlePublicTracker(e) {
    e.preventDefault();
    const azInput = document.getElementById('trackerInputAz').value.trim().toLowerCase();
    const phoneInput = document.getElementById('trackerInputPhone').value.trim().toLowerCase();
    const resBox = document.getElementById('trackerResultBox');
    const errBox = document.getElementById('trackerErrorMsg');

    const found = this.cases.find(c => {
      const matchAz = c.az.toLowerCase().replace(/\s+/g, '') === azInput.replace(/\s+/g, '');
      const matchPhone = c.clientPhone.toLowerCase().includes(phoneInput) || phoneInput.length === 0;
      return matchAz && matchPhone;
    });

    if (found) {
      errBox.style.display = 'none';
      resBox.style.display = 'block';

      document.getElementById('trackClientName').textContent = found.clientName;
      document.getElementById('trackAz').textContent = found.az;
      document.getElementById('trackOpponent').textContent = found.opponent;
      document.getElementById('trackStatusText').textContent = found.status;

      const step1 = document.getElementById('trackStep1');
      const step2 = document.getElementById('trackStep2');
      const step3 = document.getElementById('trackStep3');
      const step4 = document.getElementById('trackStep4');

      [step1, step2, step3, step4].forEach(s => s.className = 'tracker-step');
      step1.classList.add('completed');

      if (found.status === 'Eingereicht') {
        step1.classList.add('active');
      } else if (found.status === 'In Bearbeitung') {
        step2.classList.add('completed', 'active');
      } else if (found.status === 'Vor Gericht') {
        step2.classList.add('completed');
        step3.classList.add('completed', 'active');
      } else if (found.status === 'Archiviert') {
        step2.classList.add('completed');
        step3.classList.add('completed');
        step4.classList.add('completed', 'active');
      }
    } else {
      resBox.style.display = 'none';
      errBox.style.display = 'block';
    }
  }

  // --- DASHBOARD TABLE ---
  updateMetrics() {
    const total = this.cases.length;
    const submitted = this.cases.filter(c => c.status === 'Eingereicht').length;
    const inProgress = this.cases.filter(c => c.status === 'In Bearbeitung').length;
    const inCourt = this.cases.filter(c => c.status === 'Vor Gericht').length;
    const archived = this.cases.filter(c => c.status === 'Archiviert').length;

    const elTotal = document.getElementById('metricTotalCases');
    const elSub = document.getElementById('metricSubmitted');
    const elProg = document.getElementById('metricInProgress');
    const elCourt = document.getElementById('metricInCourt');
    const elArch = document.getElementById('metricArchived');

    if (elTotal) elTotal.textContent = total;
    if (elSub) elSub.textContent = submitted;
    if (elProg) elProg.textContent = inProgress;
    if (elCourt) elCourt.textContent = inCourt;
    if (elArch) elArch.textContent = archived;
  }

  renderCasesTable() {
    const tbody = document.getElementById('casesTableBody');
    const emptyNotice = document.getElementById('tableEmptyNotice');
    if (!tbody) return;

    const searchVal = (document.getElementById('caseSearchInput')?.value || '').toLowerCase();
    const filterStatus = document.getElementById('filterStatus')?.value || 'ALL';
    const filterType = document.getElementById('filterType')?.value || 'ALL';
    const sortOrder = document.getElementById('sortOrder')?.value || 'newest';

    let filtered = this.cases.filter(c => {
      const matchSearch =
        c.az.toLowerCase().includes(searchVal) ||
        c.clientName.toLowerCase().includes(searchVal) ||
        c.opponent.toLowerCase().includes(searchVal) ||
        (c.description && c.description.toLowerCase().includes(searchVal));

      const matchStatus = (filterStatus === 'ALL') || (c.status === filterStatus);
      const matchType = (filterType === 'ALL') || (c.caseType === filterType);

      return matchSearch && matchStatus && matchType;
    });

    filtered.sort((a, b) => {
      if (sortOrder === 'newest') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortOrder === 'oldest') return new Date(a.createdAt) - new Date(b.createdAt);
      if (sortOrder === 'az_asc') return a.az.localeCompare(b.az);
      if (sortOrder === 'az_desc') return b.az.localeCompare(a.az);
      return 0;
    });

    tbody.innerHTML = '';

    if (filtered.length === 0) {
      if (emptyNotice) emptyNotice.style.display = 'block';
      return;
    } else {
      if (emptyNotice) emptyNotice.style.display = 'none';
    }

    filtered.forEach(c => {
      const tr = document.createElement('tr');
      const dateStr = new Date(c.createdAt).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const statusClass = `status-${c.status.toLowerCase().replace(/\s+/g, '-')}`;

      let secTag = '<span class="sec-level-pill sec-normal">Normal</span>';
      if (c.securityLevel === 'erhoeht') secTag = '<span class="sec-level-pill sec-erhoeht">Erhöht</span>';
      if (c.securityLevel === 'vs') secTag = '<span class="sec-level-pill sec-vs">VS-Vertraulich</span>';
      if (c.securityLevel === 'notfall') secTag = '<span class="sec-level-pill sec-notfall">🚨 EILBEDARF</span>';

      tr.innerHTML = `
        <td>
          <div class="az-badge-container">
            <span class="az-tag">${c.az}</span>
            ${secTag}
          </div>
        </td>
        <td>
          <strong style="color: var(--text-main);">${this.escapeHtml(c.clientName)}</strong><br>
          <small style="color: var(--text-dark);">${this.escapeHtml(c.clientPhone)}</small>
        </td>
        <td>${this.escapeHtml(c.opponent)}</td>
        <td><span style="font-size: 0.85rem; font-weight: 500; color: var(--text-muted);">${c.caseType}</span></td>
        <td><span style="font-family: var(--font-mono); font-size: 0.82rem; color: var(--text-dark);">${dateStr}</span></td>
        <td>
          <span class="evidence-count-pill" id="badge-files-${c.id}">📁 ${c.filesCount || 0}</span>
        </td>
        <td>
          <span class="status-badge ${statusClass}">
            <span class="badge-dot"></span>
            ${c.status}
          </span>
        </td>
        <td style="text-align: right;">
          <button class="btn btn-secondary btn-sm" onclick="app.openCaseDetail('${c.id}')" title="Akte öffnen">
            <span>Öffnen ↗</span>
          </button>
        </td>
      `;

      tbody.appendChild(tr);

      this.storage.getFilesByCaseId(c.id).then(files => {
        const p = document.getElementById(`badge-files-${c.id}`);
        if (p) p.textContent = `📁 ${files.length}`;
      });
    });
  }

  // --- CASE DETAIL VIEW ---
  async openCaseDetail(caseId) {
    if (!this.isAuthenticated()) {
      this.openModal('modalPassword');
      return;
    }

    const currentCase = this.cases.find(c => c.id === caseId);
    if (!currentCase) {
      this.showToast('Akte nicht gefunden!', 'error');
      return;
    }

    this.currentCaseId = caseId;
    this.currentDetailTab = 'stammdaten';

    await this.renderCaseDetailView(currentCase);
    this.navigate('case-detail');
    this.startDeadlineCountdown(currentCase);
  }

  async renderCaseDetailView(c) {
    const container = document.getElementById('caseDetailContent');
    if (!container) return;

    const files = await this.storage.getFilesByCaseId(c.id);
    const images = files.filter(f => f.category === 'image');
    const videos = files.filter(f => f.category === 'video');
    const docs = files.filter(f => f.category === 'document');

    const statusOptions = ['Eingereicht', 'In Bearbeitung', 'Vor Gericht', 'Archiviert'];
    const secOptions = [
      { val: 'normal', label: '🟢 Normaler Vorgang' },
      { val: 'erhoeht', label: '🟡 Erhöhte Sicherheitsstufe' },
      { val: 'vs', label: '🔴 Verschlusssache (VS § 203 StGB)' }
    ];

    container.innerHTML = `
      <div class="case-subnav">
        <div class="subnav-left">
          <button class="btn btn-secondary btn-sm" onclick="app.navigate('dashboard')">
            <span>← Zurück zur Aktenübersicht</span>
          </button>
          <span style="color: var(--border-color);">|</span>
          <span style="font-family: var(--font-mono); font-size: 0.88rem; font-weight: 700; color: var(--accent-gold);">
            DIGITALES FALLBUCH BERLIN
          </span>
        </div>
        <div class="subnav-right" style="display: flex; gap: 8px;">
          <button class="btn btn-secondary btn-sm" onclick="app.exportOfficialDocument('${c.id}')">
            <span>📜 Offizieller Schriftsatz (Druck)</span>
          </button>
          <button class="btn btn-danger-outline btn-sm" onclick="app.deleteCaseConfirm('${c.id}')">
            <span>🗑️ Akte vernichten</span>
          </button>
        </div>
      </div>

      <!-- FRISTEN- & HAFT-COUNTDOWN BANNER -->
      <div class="deadline-badge-card">
        <div class="deadline-info">
          <span class="deadline-icon">⏱️</span>
          <div>
            <strong style="color: var(--text-main);">Eilbedürftigkeit & Haftprüfungsfrist (§ 128 StPO Berlin)</strong><br>
            <span style="font-size: 0.82rem; color: var(--text-muted);">Gesetzliche Vorführungsfrist beim Amtsgericht Tiergarten</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 14px;">
          <div class="deadline-timer" id="deadlineClockDisplay">Keine Frist aktiv</div>
          <button class="btn btn-secondary btn-sm" onclick="app.setHaftCountdown24h('${c.id}')">+ 24h Frist starten</button>
        </div>
      </div>

      <div class="case-main-header">
        <div class="case-header-info">
          <div class="case-header-az">${c.az}</div>
          <div class="case-header-meta">
            <div class="case-header-client">${this.escapeHtml(c.clientName)} <span style="font-weight: 400; font-size: 0.95rem; color: var(--text-muted);">vs. ${this.escapeHtml(c.opponent)}</span></div>
            <div class="case-header-sub">
              Erfasst am: ${new Date(c.createdAt).toLocaleDateString('de-DE')} • Rechtsgebiet: ${c.caseType} • Tel: ${this.escapeHtml(c.clientPhone)}
            </div>
          </div>
        </div>

        <div style="display: flex; gap: 10px; align-items: center; flex-wrap: wrap;">
          <div class="case-status-control">
            <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted);">Status:</label>
            <select onchange="app.updateCaseStatus('${c.id}', this.value)">
              ${statusOptions.map(st => `<option value="${st}" ${c.status === st ? 'selected' : ''}>${st}</option>`).join('')}
            </select>
          </div>
          <div class="case-status-control">
            <label style="font-size: 0.82rem; font-weight: 600; color: var(--text-muted);">Sicherheit:</label>
            <select onchange="app.saveFieldChange('${c.id}', 'securityLevel', this.value)">
              ${secOptions.map(so => `<option value="${so.val}" ${(c.securityLevel || 'normal') === so.val ? 'selected' : ''}>${so.label}</option>`).join('')}
            </select>
          </div>
        </div>
      </div>

      <div class="case-tabs-nav">
        <button class="tab-link active" onclick="app.switchDetailTab('stammdaten', this)">
          <span>📋 Stammdaten & Sachverhalt</span>
        </button>
        <button class="tab-link" onclick="app.switchDetailTab('evidence', this)">
          <span>📸 Beweise & Footage (${files.length})</span>
        </button>
        <button class="tab-link" onclick="app.switchDetailTab('schriftsatz', this)">
          <span>⚖️ Schriftsätze (Berlin)</span>
        </button>
        <button class="tab-link" onclick="app.switchDetailTab('rvg', this)">
          <span>💰 RVG Gebühren & Rechnung</span>
        </button>
      </div>

      <!-- TAB 1: STAMMDATEN -->
      <div id="tab-stammdaten" class="tab-content-panel active">
        <div class="case-grid-two-col">
          <div class="case-sidebar-card">
            <div class="sidebar-title">Verfahrensdaten</div>
            <div class="stammdaten-list">
              <div class="stamm-item">
                <label>Aktenzeichen (Kanzleiregister)</label>
                <input type="text" value="${c.az}" readonly style="font-family: var(--font-mono); font-weight: 700; color: #60a5fa; background: var(--bg-input);">
              </div>
              <div class="stamm-item">
                <label>Mandant / Antragsteller</label>
                <input type="text" id="detailClientName" value="${this.escapeHtml(c.clientName)}" onchange="app.saveFieldChange('${c.id}', 'clientName', this.value)">
              </div>
              <div class="stamm-item">
                <label>Telefon / Kontakt</label>
                <input type="text" id="detailClientPhone" value="${this.escapeHtml(c.clientPhone)}" onchange="app.saveFieldChange('${c.id}', 'clientPhone', this.value)">
              </div>
              <div class="stamm-item">
                <label>Gegenseite / Berliner Behörde</label>
                <input type="text" id="detailOpponent" value="${this.escapeHtml(c.opponent)}" onchange="app.saveFieldChange('${c.id}', 'opponent', this.value)">
              </div>
              <div class="stamm-item">
                <label>Tatzeit / Vorfallort in Berlin</label>
                <input type="text" id="detailIncidentDate" value="${this.escapeHtml(c.incidentDate || '')}" onchange="app.saveFieldChange('${c.id}', 'incidentDate', this.value)">
              </div>
              <div class="stamm-item">
                <label>Konkretes Rechtschutzziel</label>
                <input type="text" id="detailDemands" value="${this.escapeHtml(c.demands || '')}" onchange="app.saveFieldChange('${c.id}', 'demands', this.value)">
              </div>
            </div>
          </div>

          <div class="case-editors-column">
            <div class="editor-card">
              <div class="editor-header">
                <h3>Vollständige Schilderung des Sachverhalts</h3>
                <span style="font-size: 0.8rem; color: var(--text-muted);">Mandantenschilderung & Vorwürfe</span>
              </div>
              <textarea class="editor-textarea" id="detailDescription" rows="6" onchange="app.saveFieldChange('${c.id}', 'description', this.value)">${this.escapeHtml(c.description || '')}</textarea>
            </div>

            <div class="editor-card">
              <div class="editor-header">
                <h3>Zeugen & Aussagen</h3>
                <span style="font-size: 0.8rem; color: var(--text-muted);">Dienstnummern der Berliner Polizei, Augenzeugen</span>
              </div>
              <textarea class="editor-textarea" id="detailWitnesses" rows="4" placeholder="Zeugenaussagen, Dienstnummern von Polizisten, Augenzeugen..." onchange="app.saveFieldChange('${c.id}', 'witnesses', this.value)">${this.escapeHtml(c.witnesses || '')}</textarea>
            </div>

            <div class="editor-card">
              <div class="editor-header">
                <h3>Anwaltliche Handakte & Verteidigungsstrategie</h3>
                <span style="font-size: 0.8rem; font-weight: 700; color: var(--accent-gold);">STRIKT VERTRAULICH (DR. LARS BAUMANN)</span>
              </div>
              <textarea class="editor-textarea" id="detailNotes" rows="5" placeholder="Prozesstaktik, Beweisanträge beim AG Tiergarten / LG Berlin..." onchange="app.saveFieldChange('${c.id}', 'notes', this.value)">${this.escapeHtml(c.notes || '')}</textarea>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: BEWEISMITTEL & VIDEO TIMELINE MARKER -->
      <div id="tab-evidence" class="tab-content-panel">
        <div class="evidence-section">
          <div class="upload-dropzone" id="dropzone-${c.id}" 
               ondragover="app.handleDragOver(event)" 
               ondragleave="app.handleDragLeave(event)" 
               ondrop="app.handleDrop(event, '${c.id}')"
               onclick="document.getElementById('fileInput-${c.id}').click()">
            <input type="file" id="fileInput-${c.id}" style="display: none;" multiple accept="image/*,video/*,application/pdf" onchange="app.handleFileInput(event, '${c.id}')">
            <div class="dropzone-icon">📥</div>
            <div class="dropzone-title">Beweismittel per Drag & Drop hier ablegen oder klicken</div>
            <div class="dropzone-desc">
              Dateien werden felsenfest und ausschließlich dieser Akte (${c.az}) in der lokalen Datenbank zugeordnet.
            </div>
            <div class="dropzone-types">
              <span class="type-pill">📸 Bilder (PNG, JPG)</span>
              <span class="type-pill">🎥 Dashcam & Bodycam (MP4, WebM)</span>
              <span class="type-pill">📄 Akten & Protokolle (PDF)</span>
            </div>
          </div>

          <div class="evidence-category-block">
            <div class="evidence-category-header">
              <h4>🎥 Dashcam-, Bodycam- & Videoaufnahmen (${videos.length})</h4>
              <small style="color: var(--text-muted); font-weight: 500;">Integrierter Video Player mit Zeitstempel-Analyse</small>
            </div>
            <div class="media-grid-videos" id="videoGrid-${c.id}">
              ${videos.length === 0 ? '<div style="color: var(--text-muted); font-size: 0.9rem; padding: 10px;">Keine Videoaufnahmen hinterlegt. Ziehen Sie MP4/WebM Videos in die Upload-Box oben.</div>' : ''}
              ${videos.map((v, idx) => `
                <div class="video-card">
                  <div class="video-player-frame">
                    <video id="inlineVideoPlayer-${c.id}-${idx}" src="${v.data}" controls preload="metadata"></video>
                  </div>
                  <div class="video-card-body">
                    <div class="video-card-title">${this.escapeHtml(v.name)}</div>
                    <div class="video-card-meta">
                      <span>${this.formatFileSize(v.size)}</span>
                      <span>${new Date(v.uploadedAt).toLocaleDateString('de-DE')}</span>
                    </div>

                    <div class="video-annotation-panel">
                      <div style="display: flex; gap: 8px;">
                        <button class="btn btn-secondary btn-sm" onclick="app.addVideoMarker('${c.id}', 'inlineVideoPlayer-${c.id}-${idx}')">
                          📍 Zeitstempel markieren
                        </button>
                        <button class="btn btn-secondary btn-sm" onclick="app.openVideoModal('${v.id}')">Vollbild</button>
                        <button class="btn btn-danger-outline btn-sm" onclick="app.removeFile('${v.id}')">Löschen</button>
                      </div>

                      <div class="timeline-markers-list" id="markersList-${c.id}">
                        ${(c.markers || []).map((m, mIdx) => `
                          <div class="marker-row">
                            <span class="marker-time" onclick="app.jumpVideoToTime('inlineVideoPlayer-${c.id}-${idx}', ${m.time})">
                              ⏱️ ${app.formatTime(m.time)}
                            </span>
                            <span class="marker-desc">${this.escapeHtml(m.desc)}</span>
                            <button class="btn btn-danger-outline btn-sm" style="padding: 2px 6px;" onclick="app.deleteMarker('${c.id}', ${mIdx})">✕</button>
                          </div>
                        `).join('')}
                      </div>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Images -->
          <div class="evidence-category-block">
            <div class="evidence-category-header">
              <h4>📸 Fotobeweise & Screenshots (${images.length})</h4>
              <small style="color: var(--text-muted); font-weight: 500;">Klick zur Vollbild-Vergrößerung (Lightbox)</small>
            </div>
            <div class="media-grid-images" id="imageGrid-${c.id}">
              ${images.length === 0 ? '<div style="color: var(--text-muted); font-size: 0.9rem; padding: 10px;">Keine Bildbeweise hinterlegt.</div>' : ''}
              ${images.map(img => `
                <div class="image-card" onclick="app.openLightbox('${img.id}')">
                  <img src="${img.data}" alt="${this.escapeHtml(img.name)}">
                  <div class="media-hover-overlay">
                    <div class="media-card-title">${this.escapeHtml(img.name)}</div>
                    <div class="media-actions" onclick="event.stopPropagation()">
                      <button class="btn btn-secondary btn-sm" onclick="app.openLightbox('${img.id}')">Vorschau</button>
                      <button class="btn btn-danger-outline btn-sm" onclick="app.removeFile('${img.id}')">✕</button>
                    </div>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>

          <!-- Documents -->
          <div class="evidence-category-block">
            <div class="evidence-category-header">
              <h4>📄 Dokumente & Schriftstücke (PDF) (${docs.length})</h4>
              <small style="color: var(--text-muted); font-weight: 500;">Ermittlungsakten, Haftbefehle, Durchsuchungsprotokolle</small>
            </div>
            <div class="documents-list" id="docList-${c.id}">
              ${docs.length === 0 ? '<div style="color: var(--text-muted); font-size: 0.9rem; padding: 10px;">Keine Dokumente hinterlegt.</div>' : ''}
              ${docs.map(doc => `
                <div class="doc-item-row">
                  <div class="doc-info">
                    <span class="doc-icon">📑</span>
                    <div>
                      <div class="doc-name">${this.escapeHtml(doc.name)}</div>
                      <div class="doc-meta">${this.formatFileSize(doc.size)} • Hochgeladen am ${new Date(doc.uploadedAt).toLocaleDateString('de-DE')}</div>
                    </div>
                  </div>
                  <div style="display: flex; gap: 8px;">
                    <a href="${doc.data}" download="${doc.name}" class="btn btn-secondary btn-sm">Herunterladen</a>
                    <button class="btn btn-danger-outline btn-sm" onclick="app.removeFile('${doc.id}')">Löschen</button>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: SCHRIFTSÄTZE -->
      <div id="tab-schriftsatz" class="tab-content-panel">
        <div class="schriftsatz-builder">
          <div class="editor-header" style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap;">
            <h3 style="margin: 0;">Gerichtsfeste Schriftsätze formulieren (Gerichte Berlin)</h3>
            <div class="schriftsatz-templates">
              <select class="btn btn-secondary btn-sm" style="padding: 8px 12px; text-align: left;" onchange="if(this.value){ app.applySchriftsatzTemplate('${c.id}', this.value); this.value=''; }">
                <option value="">📄 Vorlage einfügen...</option>
                <option value="akteneinsicht">📂 Akteneinsicht (§ 147 StPO)</option>
                <option value="verteidigungsanzeige">🛡️ Verteidigungsanzeige</option>
                <option value="haftbeschwerde">⚖️ AG Tiergarten: Haftbeschwerde</option>
                <option value="einspruch">✋ Einspruch (Strafbefehl / Bußgeld)</option>
                <option value="dienstbeschwerde">🚨 Polizei Berlin: Dienstaufsichtsbeschwerde</option>
                <option value="schadensersatz">💶 Zahlungsaufforderung Schadensersatz</option>
              </select>
            </div>
          </div>

          <textarea class="editor-textarea" id="detailSchriftsatz" rows="18" style="font-family: 'Times New Roman', serif; font-size: 1.05rem;" placeholder="Hier formuliert Dr. Lars Baumann den Schriftsatz..." oninput="app.updatePleadingStats()" onchange="app.saveFieldChange('${c.id}', 'schriftsatz', this.value)">${this.escapeHtml(c.schriftsatz || '')}</textarea>

          <div style="display: flex; justify-content: space-between; align-items: center; gap: 12px; flex-wrap: wrap; margin-top: 14px;">
            <div id="pleadingStats" style="font-size: 0.8rem; color: var(--text-muted); font-family: var(--font-mono);">
              ${(() => {
                const txt = (c.schriftsatz || '').trim();
                const words = txt ? txt.split(/\s+/).length : 0;
                const chars = txt.length;
                const pages = Math.max(1, Math.ceil(chars / 1800));
                return `${words} Wörter • ${chars} Zeichen • ca. ${pages} Seite${pages > 1 ? 'n' : ''}`;
              })()}
            </div>
            <div style="display: flex; gap: 10px; flex-wrap: wrap;">
              <button class="btn btn-secondary" onclick="app.attachPleadingToCase('${c.id}')" title="Aktuellen Schriftsatz mit Zeitstempel in der Akten-Historie ablegen">
                📎 An Akte anhängen
              </button>
              <button class="btn btn-secondary" onclick="app.saveFieldChange('${c.id}', 'schriftsatz', document.getElementById('detailSchriftsatz').value)">
                💾 Schriftsatz sichern
              </button>
              <button class="btn btn-primary" onclick="app.exportOfficialDocument('${c.id}')">
                🖨️ Offizieller Schriftsatz mit Siegel
              </button>
            </div>
          </div>

          <div style="margin-top: 24px; border-top: 1px solid var(--border-color); padding-top: 18px;">
            <h4 style="margin: 0 0 12px 0; font-size: 0.95rem; color: var(--accent-gold-light);">📁 Angehängte Schriftsätze (Akten-Historie)</h4>
            <div id="pleadingHistoryList" style="display: flex; flex-direction: column; gap: 8px;">
              ${(Array.isArray(c.pleadingsHistory) && c.pleadingsHistory.length > 0) ? c.pleadingsHistory.map(p => `
                <div class="interna-item-card" style="padding: 12px 14px;">
                  <div class="interna-item-main">
                    <div class="interna-item-top">
                      <span class="az-tag" style="font-size: 0.72rem; padding: 2px 8px;">🕒 ${this.escapeHtml(p.timestamp)}</span>
                      <strong style="font-size: 0.9rem;">${this.escapeHtml(p.title)}</strong>
                    </div>
                    <div class="interna-item-sub" style="font-size: 0.8rem; margin-top: 4px;">${this.escapeHtml(p.preview)}</div>
                  </div>
                  <div style="display: flex; gap: 6px; flex-shrink: 0;">
                    <button class="btn btn-secondary btn-sm" onclick="app.loadPleadingFromHistory('${c.id}', '${p.id}')">Laden</button>
                    <button class="btn btn-danger-outline btn-sm" onclick="app.deletePleadingHistory('${c.id}', '${p.id}')">✕</button>
                  </div>
                </div>
              `).join('') : `<div style="font-size: 0.84rem; color: var(--text-muted);">Noch keine Schriftsätze mit Zeitstempel an diese Akte angehängt.</div>`}
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 4: RVG GEBÜHRENRECHNER -->
      <div id="tab-rvg" class="tab-content-panel">
        <div class="fee-calculator-panel">
          <div class="editor-header">
            <h3>RVG-Gebührenrechner & anwaltliche Kostennote</h3>
            <span style="font-size: 0.8rem; color: var(--text-muted);">Rechtsanwaltsvergütungsgesetz San Andreas / Berlin</span>
          </div>

          <div class="fee-calc-grid">
            <div class="fee-calc-row">
              <label>Grundgebühr</label>
              <input type="number" id="calcGrundgebuehr" value="${c.feeGrundgebuehr || 1000}" onchange="app.updateFeeCalculator('${c.id}')">
            </div>
            <div class="fee-calc-row">
              <label>Verfahrensgebühr</label>
              <input type="number" id="calcVerfahrensgebuehr" value="${c.feeVerfahrensgebuehr || 4000}" onchange="app.updateFeeCalculator('${c.id}')">
            </div>
            <div class="fee-calc-row">
              <label>Terminsgebühr (Gericht)</label>
              <input type="number" id="calcTerminsgebuehr" value="${c.feeTerminsgebuehr || 0}" onchange="app.updateFeeCalculator('${c.id}')">
            </div>
          </div>

          <div class="invoice-summary-box">
            <div>
              <div style="font-size: 0.85rem; color: var(--text-muted);">Gesamthonorar netto zzgl. Auslagen (20 €) & 19% MwSt.:</div>
              <div class="invoice-total" id="calcTotalInvoice">0,00 €</div>
            </div>
            <button class="btn btn-gold" onclick="app.copyInvoiceText('${c.id}')">
              📋 Kostennote in Zwischenablage kopieren
            </button>
          </div>
        </div>
      </div>
    `;

    this.updateFeeCalculator(c.id);
  }

  // --- TIMELINE MARKER LOGIC ---
  addVideoMarker(caseId, videoElemId) {
    const video = document.getElementById(videoElemId);
    if (!video) return;

    const currentSec = Math.floor(video.currentTime);
    const desc = prompt(`Tatzeitpunkt bei ${this.formatTime(currentSec)} markieren:\n(z. B. "Widerrechtlicher Zugriff", "Dienstwaffe gezogen")`);
    if (!desc) return;

    const c = this.cases.find(item => item.id === caseId);
    if (!c) return;

    if (!c.markers) c.markers = [];
    c.markers.push({ time: currentSec, desc });
    c.markers.sort((a, b) => a.time - b.time);

    this.saveCases();
    this.showToast(`Marker bei ${this.formatTime(currentSec)} hinzugefügt!`, 'success');
    this.renderCaseDetailView(c);
    const activeTabBtn = document.querySelector(`.case-tabs-nav .tab-link:nth-child(2)`);
    if (activeTabBtn) this.switchDetailTab('evidence', activeTabBtn);
  }

  deleteMarker(caseId, markerIdx) {
    const c = this.cases.find(item => item.id === caseId);
    if (!c || !c.markers) return;

    c.markers.splice(markerIdx, 1);
    this.saveCases();
    this.renderCaseDetailView(c);
    const activeTabBtn = document.querySelector(`.case-tabs-nav .tab-link:nth-child(2)`);
    if (activeTabBtn) this.switchDetailTab('evidence', activeTabBtn);
  }

  jumpVideoToTime(videoElemId, sec) {
    const video = document.getElementById(videoElemId);
    if (video) {
      video.currentTime = sec;
      video.play();
    }
  }

  formatTime(seconds) {
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  // --- HAFT COUNTDOWN LOGIC ---
  setHaftCountdown24h(caseId) {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return;

    c.deadlineTimestamp = Date.now() + (24 * 3600 * 1000);
    this.saveCases();
    this.showToast('24-Stunden-Haftprüfungsfrist gestartet!', 'warning');
    this.startDeadlineCountdown(c);
  }

  startDeadlineCountdown(c) {
    const display = document.getElementById('deadlineClockDisplay');
    if (!display) return;

    if (!c.deadlineTimestamp) {
      display.textContent = 'Keine aktive Haftfrist';
      display.className = 'deadline-timer normal';
      return;
    }

    const updateTimer = () => {
      const now = Date.now();
      const diff = c.deadlineTimestamp - now;

      if (diff <= 0) {
        display.textContent = '⚠️ FRIST ABGELAUFEN! Sofortige Entlassung (§ 128 StPO)';
        display.className = 'deadline-timer urgent';
        return;
      }

      const h = Math.floor(diff / (1000 * 60 * 60));
      const m = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const s = Math.floor((diff % (1000 * 60)) / 1000);

      display.textContent = `Noch ${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')} Std. bis Haftprüfung`;

      if (h < 4) {
        display.className = 'deadline-timer urgent';
      } else if (h < 12) {
        display.className = 'deadline-timer warning';
      } else {
        display.className = 'deadline-timer normal';
      }
    };

    updateTimer();
    if (this.activeCountdownInterval) clearInterval(this.activeCountdownInterval);
    this.activeCountdownInterval = setInterval(updateTimer, 1000);
  }

  // --- RVG RECHNER LOGIC ---
  updateFeeCalculator(caseId) {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return;

    const g = parseFloat(document.getElementById('calcGrundgebuehr')?.value) || 0;
    const v = parseFloat(document.getElementById('calcVerfahrensgebuehr')?.value) || 0;
    const t = parseFloat(document.getElementById('calcTerminsgebuehr')?.value) || 0;

    c.feeGrundgebuehr = g;
    c.feeVerfahrensgebuehr = v;
    c.feeTerminsgebuehr = t;
    this.saveCases();

    const netto = g + v + t + 20;
    const brutto = netto * 1.19;

    const totalEl = document.getElementById('calcTotalInvoice');
    if (totalEl) {
      totalEl.textContent = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(brutto);
    }
  }

  copyInvoiceText(caseId) {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return;

    const g = c.feeGrundgebuehr || 0;
    const v = c.feeVerfahrensgebuehr || 0;
    const t = c.feeTerminsgebuehr || 0;
    const auslagen = 20;
    const netto = g + v + t + auslagen;
    const mwst = netto * 0.19;
    const brutto = netto + mwst;

    const invoiceText = `KOSTENNOTE / ANWALTLICHE GEBÜHRENABRECHNUNG
Kanzlei Dr. jur. Lars Baumann • Kurfürstendamm 182, 10707 Berlin
In der Sache: ${c.clientName} vs. ${c.opponent}
Aktenzeichen: ${c.az}

1. Grundgebühr:                     ${g.toFixed(2)} €
2. Verfahrensgebühr:                ${v.toFixed(2)} €
3. Terminsgebühr:                   ${t.toFixed(2)} €
4. Post- und Telekommunikation:     ${auslagen.toFixed(2)} €
--------------------------------------------------------
Nettobetrag:                        ${netto.toFixed(2)} €
Zzgl. 19% gesetzliche MwSt.:        ${mwst.toFixed(2)} €
========================================================
GESAMTBETRAG:                       ${brutto.toFixed(2)} €

Zahlbar binnen 14 Tagen auf das Kanzleikonto Dr. Lars Baumann. Barzahlungen sind ausgeschlossen.`;

    navigator.clipboard.writeText(invoiceText).then(() => {
      this.showToast('Kostennote in Zwischenablage kopiert!', 'success');
    });
  }

  // --- OFFIZIELLER SCHRIFTSATZ ---
  exportOfficialDocument(caseId) {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return;

    const dateNow = new Date().toLocaleDateString('de-DE');
    const schriftsatzText = c.schriftsatz || 'Es liegt noch kein ausformulierter Schriftsatztext vor.';

    const modalBody = document.getElementById('officialDocContent');
    if (!modalBody) return;

    const rawBlocks = schriftsatzText
      .split(/\n{2,}/)
      .map(block => block.trim())
      .filter(block => {
        if (!block) return false;
        if (/^(Berlin,\s*den\s|Unser Zeichen:)/i.test(block)) return false;
        if (/^(Mit (freundlichen Grüßen|vorzüglicher Hochachtung)|Dr\. jur\. Lars Baumann|Rechtsanwalt)/i.test(block)) return false;
        if (/^(In der Sache:|Strafsache gegen:|Gegenstand:|Wegen:|Vorwurf:)/i.test(block)) return false;
        return true;
      });

    let recipientHtml = '';
    const bodyBlocks = [];
    rawBlocks.forEach((block, idx) => {
      if (idx === 0 && /^An (das|die)\b/i.test(block)) {
        recipientHtml = this.escapeHtml(block).replace(/\n/g, '<br>');
      } else {
        bodyBlocks.push(block);
      }
    });

    const formattedBody = bodyBlocks
      .map(block => {
        const escaped = this.escapeHtml(block).replace(/\n/g, '<br>');
        if (/^\s{2,}/.test(block) || /^(EINSPRUCH|vollständige Akteneinsicht|BESCHWERDE|ANTRAG)/i.test(block)) {
          return `<div style="margin: 16px 0; padding: 10px 18px; background: #f8fafc; border-left: 3px solid #1e3a8a; font-weight: 700; text-align: center; letter-spacing: 0.04em;">${escaped}</div>`;
        }
        if (/^(In der Sache:|Strafsache gegen:|Gegenstand:|Wegen:|Vorwurf:)/i.test(block)) {
          return `<div style="margin: 0 0 14px 0; padding: 10px 14px; background: #f8fafc; border-left: 3px solid #b8862d; font-size: 0.94rem; line-height: 1.5;"><strong>${escaped}</strong></div>`;
        }
        return `<p style="margin: 0 0 12px 0; text-align: justify; line-height: 1.65;">${escaped}</p>`;
      })
      .join('');

    modalBody.innerHTML = `
      <div class="official-letterhead-card">
        <div class="letterhead-header" style="align-items: center;">
          <div style="display: flex; align-items: center; gap: 16px;">
            <img src="assets/logo.jpg" alt="Kanzlei Logo" style="width: 64px; height: 64px; border-radius: 50%; object-fit: cover; border: 2px solid #b8862d;">
            <div>
              <div class="letterhead-firm-title">KANZLEI DR. JUR. LARS BAUMANN</div>
              <div class="letterhead-firm-sub">Fachanwaltschaft für Strafrecht, Polizeirecht & Zivilansprüche</div>
              <div class="letterhead-firm-sub">Kurfürstendamm 182 • 10707 Berlin • Tel: 907-999-3919</div>
            </div>
          </div>
          <div style="text-align: right;">
            <div style="font-family: var(--font-mono); font-size: 1.05rem; font-weight: 700; color: #1e3a8a;">AZ: ${c.az}</div>
            <div style="font-size: 0.85rem; color: #64748b;">Berlin, den ${dateNow}</div>
          </div>
        </div>

        ${recipientHtml ? `
          <div style="margin: 18px 0 22px 0;">
            <div style="font-size: 0.7rem; color: #64748b; text-decoration: underline; margin-bottom: 4px;">Kanzlei Dr. jur. Lars Baumann • Kurfürstendamm 182 • 10707 Berlin</div>
            <div style="font-size: 0.98rem; font-weight: 600; color: #0f172a; line-height: 1.45;">${recipientHtml}</div>
          </div>
        ` : ''}

        <div class="letterhead-court-info" style="margin-bottom: 18px;">
          <strong>Betreff:</strong> ${this.escapeHtml(c.clientName)} ./. ${this.escapeHtml(c.opponent)} — <em>${this.escapeHtml(c.caseType)}</em>
        </div>

        <div class="letterhead-body-text" style="white-space: normal;">${formattedBody}</div>

        <div class="letterhead-footer-sign">
          <div style="display: flex; flex-direction: column; align-items: center; gap: 4px;">
            <img src="assets/logo.jpg" alt="Kanzleisiegel Dr. jur. Lars Baumann" style="width: 86px; height: 86px; border-radius: 50%; object-fit: cover; border: 2px solid #b8862d; box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);">
            <span style="font-size: 0.68rem; text-transform: uppercase; letter-spacing: 0.08em; color: #64748b; font-weight: 600;">Kanzleisiegel</span>
          </div>
          <div class="signature-block">
            <div class="signature-svg">Dr. Lars Baumann</div>
            <div style="font-size: 0.85rem; font-weight: 600; color: #334155; margin-top: 4px;">
              Dr. jur. Lars Baumann<br>
              Rechtsanwalt
            </div>
          </div>
        </div>

        <div style="margin-top: 24px; padding-top: 10px; border-top: 1px solid #e2e8f0; text-align: center; font-size: 0.72rem; color: #64748b;">
          Kanzlei Dr. jur. Lars Baumann • Kurfürstendamm 182 • 10707 Berlin • Tel: 907-999-3919 • E-Mail: baumann@kanzlei-berlin-strafrecht.de
        </div>
      </div>
    `;

    this.openModal('modalOfficialDocument');
  }

  switchDetailTab(tabName, clickedBtn) {
    document.querySelectorAll('.case-tabs-nav .tab-link').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('.tab-content-panel').forEach(p => p.classList.remove('active'));

    clickedBtn.classList.add('active');
    const panel = document.getElementById(`tab-${tabName}`);
    if (panel) panel.classList.add('active');
    this.currentDetailTab = tabName;
  }

  saveFieldChange(caseId, field, value) {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return;

    c[field] = value;
    this.saveCases(c);
    this.showToast(`Gespeichert: ${field}`, 'info');
  }

  updateCaseStatus(caseId, newStatus) {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return;
    c.status = newStatus;
    this.saveCases(c);
    this.showToast(`Status auf "${newStatus}" aktualisiert!`, 'success');
  }

  deleteCaseConfirm(caseId) {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return;

    if (confirm(`Achtung: Akte ${c.az} (${c.clientName}) unwiderruflich vernichten? Alle Notizen und Beweise werden gelöscht.`)) {
      this.cases = this.cases.filter(item => item.id !== caseId);
      this.saveCases();
      fetch(`/api/cases?id=${encodeURIComponent(caseId)}`, { method: 'DELETE' }).catch(() => {});
      this.showToast(`Akte ${c.az} vernichtet.`, 'info');
      this.navigate('dashboard');
    }
  }

  clearAllCasesPrompt() {
    if (this.cases.length === 0) {
      this.showToast('Das Aktenregister ist bereits leer.', 'info');
      return;
    }
    const entered = prompt('ACHTUNG: Möchten Sie wirklich ALLE Akten aus dem Kanzleiregister löschen?\n\nGeben Sie zur Bestätigung "LEEREN" ein:');
    if (entered === 'LEEREN') {
      this.cases = [];
      this.saveCases();
      fetch('/api/cases?id=ALL', { method: 'DELETE' }).catch(() => {});
      this.renderCasesTable();
      this.updateMetrics();
      this.showToast('Alle Akten wurden vollständig aus dem Register entfernt.', 'success');
    }
  }

  // --- MULTIMEDIA UPLOAD ---
  handleDragOver(e) {
    e.preventDefault();
    e.currentTarget.classList.add('dragover');
  }

  handleDragLeave(e) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');
  }

  handleDrop(e, caseId) {
    e.preventDefault();
    e.currentTarget.classList.remove('dragover');

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      this.processUploadedFiles(files, caseId);
    }
  }

  handleFileInput(e, caseId) {
    const files = e.target.files;
    if (files.length > 0) {
      this.processUploadedFiles(files, caseId);
    }
  }

  async processUploadedFiles(fileList, caseId) {
    const currentCase = this.cases.find(c => c.id === caseId);
    if (!currentCase) return;

    let processedCount = 0;

    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      let category = 'document';
      if (file.type.startsWith('image/')) category = 'image';
      else if (file.type.startsWith('video/')) category = 'video';

      try {
        const base64Data = await this.readFileAsDataURL(file);

        const fileRecord = {
          id: 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
          caseId: caseId,
          name: file.name,
          type: file.type || 'application/octet-stream',
          category: category,
          size: file.size,
          data: base64Data,
          uploadedAt: new Date().toISOString()
        };

        await this.storage.saveFile(fileRecord);
        processedCount++;
      } catch (err) {
        console.error('Error processing file:', err);
        this.showToast(`Fehler bei ${file.name}`, 'error');
      }
    }

    if (processedCount > 0) {
      currentCase.filesCount = (currentCase.filesCount || 0) + processedCount;
      this.saveCases();
      this.showToast(`${processedCount} Beweismittel zu Akte ${currentCase.az} hinzugefügt!`, 'success');

      await this.renderCaseDetailView(currentCase);
      const activeTabBtn = document.querySelector(`.case-tabs-nav .tab-link:nth-child(2)`);
      if (activeTabBtn) this.switchDetailTab('evidence', activeTabBtn);
    }
  }

  readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(file);
    });
  }

  async removeFile(fileId) {
    if (!confirm('Dieses Beweismittel unwiderruflich aus der Akte löschen?')) return;
    await this.storage.deleteFile(fileId);
    this.showToast('Beweismittel gelöscht.', 'info');

    const currentCase = this.cases.find(c => c.id === this.currentCaseId);
    if (currentCase) {
      const remaining = await this.storage.getFilesByCaseId(currentCase.id);
      currentCase.filesCount = remaining.length;
      this.saveCases();
      await this.renderCaseDetailView(currentCase);
      const activeTabBtn = document.querySelector(`.case-tabs-nav .tab-link:nth-child(2)`);
      if (activeTabBtn) this.switchDetailTab('evidence', activeTabBtn);
    }
  }

  // --- LIGHTBOX & VIDEO MODALS ---
  async openLightbox(fileId) {
    const record = await this.storage.getFileById(fileId);
    if (!record) return;

    const img = document.getElementById('lightboxImage');
    const title = document.getElementById('lightboxTitle');
    const meta = document.getElementById('lightboxMeta');
    const downloadBtn = document.getElementById('lightboxDownloadBtn');

    img.src = record.data;
    title.textContent = `Beweisfoto: ${record.name}`;
    meta.textContent = `${this.formatFileSize(record.size)} • Hochgeladen: ${new Date(record.uploadedAt).toLocaleString('de-DE')}`;
    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = record.data;
      a.download = record.name;
      a.click();
    };

    this.openModal('modalLightbox');
  }

  closeLightbox() {
    this.closeModal('modalLightbox');
  }

  async openVideoModal(fileId) {
    const record = await this.storage.getFileById(fileId);
    if (!record) return;

    const video = document.getElementById('activeBeweisPlayer');
    const title = document.getElementById('videoModalTitle');
    const meta = document.getElementById('videoModalMeta');
    const downloadBtn = document.getElementById('videoDownloadBtn');

    video.src = record.data;
    title.textContent = `Beweisvideo / Footage: ${record.name}`;
    meta.textContent = `${this.formatFileSize(record.size)} • ${new Date(record.uploadedAt).toLocaleString('de-DE')}`;

    downloadBtn.onclick = () => {
      const a = document.createElement('a');
      a.href = record.data;
      a.download = record.name;
      a.click();
    };

    this.openModal('modalVideoPlayer');
  }

  closeVideoModal() {
    const video = document.getElementById('activeBeweisPlayer');
    if (video) {
      video.pause();
      video.src = '';
    }
    this.closeModal('modalVideoPlayer');
  }

  applySchriftsatzTemplate(caseId, templateType) {
    const c = this.cases.find(item => item.id === caseId);
    if (!c) return;

    const dateNow = new Date().toLocaleDateString('de-DE');
    let text = '';

    if (templateType === 'haftbeschwerde') {
      text = SchriftsatzTemplates.getHaftbeschwerde(c, dateNow);
    } else if (templateType === 'dienstbeschwerde') {
      text = SchriftsatzTemplates.getDienstbeschwerde(c, dateNow);
    } else if (templateType === 'schadensersatz') {
      text = SchriftsatzTemplates.getSchadensersatz(c, dateNow);
    } else if (templateType === 'akteneinsicht') {
      text = SchriftsatzTemplates.getAkteneinsicht(c, dateNow);
    } else if (templateType === 'verteidigungsanzeige') {
      text = SchriftsatzTemplates.getVerteidigungsanzeige(c, dateNow);
    } else if (templateType === 'einspruch') {
      text = SchriftsatzTemplates.getEinspruch(c, dateNow);
    }

    const field = document.getElementById('detailSchriftsatz');
    if (field) {
      field.value = text;
      this.updatePleadingStats();
      this.saveFieldChange(caseId, 'schriftsatz', text);
    }
  }

  updatePleadingStats() {
    const field = document.getElementById('detailSchriftsatz');
    const statsEl = document.getElementById('pleadingStats');
    if (!field || !statsEl) return;
    const txt = field.value.trim();
    const words = txt ? txt.split(/\s+/).length : 0;
    const chars = txt.length;
    const pages = Math.max(1, Math.ceil(chars / 1800));
    statsEl.textContent = `${words} Wörter • ${chars} Zeichen • ca. ${pages} Seite${pages > 1 ? 'n' : ''}`;
  }

  async attachPleadingToCase(caseId) {
    const c = this.cases.find(item => item.id === caseId);
    const field = document.getElementById('detailSchriftsatz');
    if (!c || !field) return;
    const content = field.value.trim();
    if (!content) {
      this.showToast('Bitte zuerst einen Schriftsatz formulieren.', 'error');
      return;
    }

    const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    const titleLine = (lines[0] && /^An (das|die)$/i.test(lines[0]) && lines[1]) ? lines[1] : (lines[0] || 'Schriftsatz');
    const now = new Date();
    const timestamp = `${now.toLocaleDateString('de-DE')}, ${now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`;

    if (!Array.isArray(c.pleadingsHistory)) c.pleadingsHistory = [];
    c.pleadingsHistory.unshift({
      id: 'pl_' + Date.now(),
      timestamp,
      title: titleLine.slice(0, 65),
      preview: content.replace(/\s+/g, ' ').slice(0, 110) + (content.length > 110 ? '...' : ''),
      content
    });
    c.schriftsatz = field.value;
    localStorage.setItem(this.storageKey, JSON.stringify(this.cases));
    this.updateMetrics();
    await this.syncCaseToCloud(c);
    this.openCaseDetail(caseId, 'schriftsatz');
    this.showToast('Schriftsatz mit Zeitstempel an Akte angehängt!', 'success');
  }

  loadPleadingFromHistory(caseId, entryId) {
    const c = this.cases.find(item => item.id === caseId);
    if (!c || !Array.isArray(c.pleadingsHistory)) return;
    const entry = c.pleadingsHistory.find(p => p.id === entryId);
    if (!entry) return;
    c.schriftsatz = entry.content;
    this.saveCases(c);
    const field = document.getElementById('detailSchriftsatz');
    if (field) {
      field.value = entry.content;
      this.updatePleadingStats();
    }
    this.exportOfficialDocument(caseId);
  }

  deletePleadingHistory(caseId, entryId) {
    const c = this.cases.find(item => item.id === caseId);
    if (!c || !Array.isArray(c.pleadingsHistory)) return;
    c.pleadingsHistory = c.pleadingsHistory.filter(p => p.id !== entryId);
    this.saveCases(c);
    this.openCaseDetail(caseId, 'schriftsatz');
  }

  exportAllDatabase() {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(this.cases, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    dlAnchor.setAttribute('download', `Kanzlei_Lars_Baumann_Berlin_Backup_${new Date().toISOString().slice(0, 10)}.json`);
    dlAnchor.click();
    this.showToast('Datenbank-Backup heruntergeladen!', 'success');
  }

  openModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.add('active');
  }

  closeModal(modalId) {
    const m = document.getElementById(modalId);
    if (m) m.classList.remove('active');
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✓';
    if (type === 'error') icon = '⚠️';

    toast.innerHTML = `<span>${icon}</span> <span>${this.escapeHtml(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

const app = new KanzleiApp();
window.app = app;

document.addEventListener('DOMContentLoaded', () => {
  app.init();
});
