/**
 * Modal Dialogs HTML Generator & Handlers
 * Auslagerung der Modals aus der index.html
 */

const ModalComponents = {
  renderAllModals() {
    const container = document.getElementById('modalsContainer');
    if (!container) return;

    container.innerHTML = `
      <!-- Password Modal -->
      <div class="modal-backdrop" id="modalPassword">
        <div class="modal-card modal-sm">
          <div class="modal-header">
            <div class="modal-seal">🔒</div>
            <h3>Kanzlei-Interna Authentifizierung</h3>
            <p class="modal-sub">Geschützter Arbeitsplatz für Dr. jur. Lars Baumann.</p>
          </div>
          <form onsubmit="app.handleAuthSubmit(event)">
            <div class="input-group">
              <label for="authPassword">Kanzlei-Passwort</label>
              <input type="password" id="authPassword" placeholder="Zugangspasswort eingeben..." required autofocus>
            </div>
            <div id="authErrorMsg" class="form-alert error" style="display: none;">Falsches Passwort! Zugriff verweigert.</div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="app.closeModal('modalPassword')">Abbrechen</button>
              <button type="submit" class="btn btn-primary">Entsperren</button>
            </div>
          </form>
        </div>
      </div>

      <!-- EDIT FEES MODAL -->
      <div class="modal-backdrop" id="modalEditFees">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <div class="modal-seal">💶</div>
            <h3>Gebührensätze anpassen (Dr. Lars Baumann)</h3>
            <p class="modal-sub">Diese Sätze werden sofort in der öffentlichen Kanzleitabelle und im RVG-Rechner aktualisiert.</p>
          </div>
          <form onsubmit="app.handleSaveFees(event)">
            <div class="form-grid">
              <div class="input-group">
                <label for="inputFeeErstberatung">Erstberatung (bis 30 Min.) (€) *</label>
                <input type="number" id="inputFeeErstberatung" required min="0">
              </div>
              <div class="input-group">
                <label for="inputFeeAusfuehrlich">Ausführliche Beratung & Aktenprüfung (€) *</label>
                <input type="number" id="inputFeeAusfuehrlich" required min="0">
              </div>
              <div class="input-group">
                <label for="inputFeeSchriftverkehr">Schriftverkehr Behörden / Polizei (€) *</label>
                <input type="number" id="inputFeeSchriftverkehr" required min="0">
              </div>
              <div class="input-group">
                <label for="inputFeeVergleich">Vergleich & Streitbeilegung (€) *</label>
                <input type="number" id="inputFeeVergleich" required min="0">
              </div>
              <div class="input-group">
                <label for="inputFeeVertragspruefung">Prüfung Arbeits- & Dienstverträge (€) *</label>
                <input type="number" id="inputFeeVertragspruefung" required min="0">
              </div>
              <div class="input-group">
                <label for="inputFeeVertragserstellung">Maßgeschneiderte Vertragswerke (€) *</label>
                <input type="number" id="inputFeeVertragserstellung" required min="0">
              </div>
              <div class="input-group">
                <label for="inputFeeVernehmung">Vernehmung / Polizeigewahrsam (€) *</label>
                <input type="number" id="inputFeeVernehmung" required min="0">
              </div>
              <div class="input-group">
                <label for="inputFeeStrafverteidigung">Komplette Strafverteidigung (€) *</label>
                <input type="number" id="inputFeeStrafverteidigung" required min="0">
              </div>
              <div class="input-group">
                <label for="inputFeeZivilklage">Zivilrechtliche Klagevertretung (€) *</label>
                <input type="number" id="inputFeeZivilklage" required min="0">
              </div>
              <div class="input-group">
                <label for="inputFeeHauptverhandlung">Termingebühr Hauptverhandlung (€/Tag) *</label>
                <input type="number" id="inputFeeHauptverhandlung" required min="0">
              </div>
              <div class="input-group">
                <label for="inputFeeFahrtpauschale">Fahrt- & Einsatzpauschale (€) *</label>
                <input type="number" id="inputFeeFahrtpauschale" required min="0">
              </div>
              <div class="input-group">
                <label for="inputFeeDringlichkeitszuschlag">Dringlichkeitszuschlag (% auf Grundpreis) *</label>
                <input type="number" id="inputFeeDringlichkeitszuschlag" required min="0">
              </div>
            </div>

            <!-- Discord Webhook Integration -->
            <div style="margin-top: 24px; padding-top: 18px; border-top: 1px solid var(--border-color);">
              <h4 style="font-size: 0.95rem; color: var(--accent-gold-light); margin-bottom: 6px; display: flex; align-items: center; gap: 8px;">
                <span>📢 Discord Webhook Benachrichtigung</span>
                <span class="badge" style="background: rgba(59, 130, 246, 0.2); color: #93c5fd; font-size: 0.72rem; padding: 2px 8px; border-radius: 10px;">Optional</span>
              </h4>
              <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 12px;">
                Benachrichtigt Ihren Kanzlei-Discord-Channel bei jedem neuen Mandatseingang in Berlin (insbesondere bei Eilanträgen / Festnahmen).
              </p>
              <div class="input-group">
                <label for="inputDiscordWebhook">Discord Webhook URL</label>
                <input type="url" id="inputDiscordWebhook" placeholder="https://discord.com/api/webhooks/..." style="font-family: var(--font-mono); font-size: 0.85rem;">
                <small class="helper-text">Leer lassen, wenn keine Discord-Pings gewünscht sind.</small>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="app.closeModal('modalEditFees')">Abbrechen</button>
              <button type="submit" class="btn btn-primary">Gebührensätze & Einstellungen speichern</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Manual Case Modal -->
      <div class="modal-backdrop" id="modalNewCase">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <div class="modal-seal">📁</div>
            <h3>Manuelle Aktenanlage Berlin (Direktmandat)</h3>
            <p class="modal-sub">Legt unmittelbar eine neue Akte mit dem passenden Berliner Fach-Aktenzeichen an.</p>
          </div>
          <form onsubmit="app.handleCreateCaseModal(event)">
            <div class="form-grid">
              <div class="input-group">
                <label for="mClientName">Name des Mandanten *</label>
                <input type="text" id="mClientName" required placeholder="z. B. Jonas Weber">
              </div>
              <div class="input-group">
                <label for="mClientPhone">Telefon / Kontakt *</label>
                <input type="text" id="mClientPhone" required placeholder="z. B. 0172 / 9912044">
              </div>
              <div class="input-group">
                <label for="mOpponent">Gegenseite (Berliner Behörde / Person) *</label>
                <input type="text" id="mOpponent" required placeholder="z. B. Polizei Berlin Direktion 2">
              </div>
              <div class="input-group">
                <label for="mCaseType">Falltyp / Rechtsgebiet *</label>
                <select id="mCaseType" required>
                  <option value="Strafverteidigung">Strafverteidigung [StR]</option>
                  <option value="Polizeirecht / Dienstbeschwerde">Polizeirecht / Dienstbeschwerde [PolR]</option>
                  <option value="Zivilrecht / Schadensersatz">Zivilrecht [Ziv]</option>
                  <option value="Waffen- & Lizenzrecht">Waffen- & Lizenzrecht [WaffR]</option>
                  <option value="Dienstaufsicht">Dienstaufsicht [IAD]</option>
                  <option value="Sonstiges">Sonstiges</option>
                </select>
              </div>
              <div class="input-group">
                <label for="mStatus">Initialer Status</label>
                <select id="mStatus">
                  <option value="In Bearbeitung" selected>In Bearbeitung</option>
                  <option value="Eingereicht">Eingereicht</option>
                  <option value="Vor Gericht">Vor Gericht</option>
                  <option value="Archiviert">Archiviert</option>
                </select>
              </div>
              <div class="input-group">
                <label for="mIncidentDate">Tatzeit / Vorfallort in Berlin</label>
                <input type="text" id="mIncidentDate" placeholder="z. B. Gestern Nacht, Berlin-Neukölln">
              </div>
              <div class="input-group full-width">
                <label for="mDescription">Sachverhalt & Vorwürfe *</label>
                <textarea id="mDescription" rows="4" required placeholder="Erste Fallschilderung, Tatvorwurf, Kaution..."></textarea>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" onclick="app.closeModal('modalNewCase')">Abbrechen</button>
              <button type="submit" class="btn btn-primary">Akte anlegen & öffnen</button>
            </div>
          </form>
        </div>
      </div>

      <!-- Custom Success Modal -->
      <div class="modal-backdrop" id="modalSubmissionSuccess">
        <div class="modal-card modal-sm success-modal-card">
          <div class="success-seal-badge">✓</div>
          <h3>Mandat erfolgreich registriert!</h3>
          <p style="font-size: 0.88rem; color: var(--text-muted); margin-bottom: 12px;">
            Kanzlei Dr. jur. Lars Baumann • Berlin
          </p>
          <div class="success-az-box" id="successModalAz">104/26 StR</div>
          <p class="success-info-text" id="successModalDesc">
            Ihre Akte wurde verbindlich im Kanzleiregister aufgenommen. Es gilt das strenge Eingangsprinzip der Kanzleiordnung („Wer zuerst kommt, mahlt zuerst“).
          </p>
          <div class="modal-footer" style="justify-content: center; border: none; padding-top: 0;">
            <button type="button" class="btn btn-primary" onclick="app.closeModal('modalSubmissionSuccess')">
              Verstanden & Schließen
            </button>
          </div>
        </div>
      </div>

      <!-- OFFIZIELLER SCHRIFTSATZ MODAL -->
      <div class="modal-backdrop" id="modalOfficialDocument">
        <div class="modal-card modal-lg">
          <div class="modal-header">
            <div class="modal-seal">📜</div>
            <h3>Offizieller Schriftsatz zur gerichtlichen Vorlage</h3>
            <p class="modal-sub">Druckansicht mit digitalem Kanzlei-Siegel und Signatur von Dr. jur. Lars Baumann.</p>
            <div class="print-tip-box" style="margin-top: 10px; padding: 8px 12px; background: rgba(59, 130, 246, 0.12); border: 1px solid rgba(59, 130, 246, 0.3); border-radius: 6px; font-size: 0.8rem; color: #93c5fd; text-align: left;">
              💡 <strong>Tipp für sauberes PDF:</strong> Deaktivieren Sie im Druckfenster unter <em>Weitere Einstellungen</em> die Option <strong>„Kopf- und Fußzeilen“</strong>, um Datum und URL oben/unten auszublenden.
            </div>
          </div>
          <div id="officialDocContent"></div>
          <div class="modal-footer">
            <button type="button" class="btn btn-primary" onclick="window.print()">
              <span>🖨️ Schriftsatz drucken / Als PDF speichern</span>
            </button>
            <button type="button" class="btn btn-secondary" onclick="app.closeModal('modalOfficialDocument')">Schließen</button>
          </div>
        </div>
      </div>

      <!-- Lightbox Modal -->
      <div class="modal-backdrop lightbox-backdrop" id="modalLightbox" onclick="app.closeLightbox(event)">
        <div class="lightbox-container" onclick="event.stopPropagation()">
          <div class="lightbox-header">
            <span id="lightboxTitle">Beweisfoto</span>
            <button class="close-btn" onclick="app.closeModal('modalLightbox')">✕</button>
          </div>
          <div class="lightbox-body">
            <img id="lightboxImage" src="" alt="Beweis-Vollansicht">
          </div>
          <div class="lightbox-footer">
            <span id="lightboxMeta"></span>
            <button class="btn btn-secondary btn-sm" id="lightboxDownloadBtn">Herunterladen</button>
          </div>
        </div>
      </div>

      <!-- Video Player Modal -->
      <div class="modal-backdrop lightbox-backdrop" id="modalVideoPlayer" onclick="app.closeVideoModal(event)">
        <div class="lightbox-container video-modal-container" onclick="event.stopPropagation()">
          <div class="lightbox-header">
            <span id="videoModalTitle">Beweisvideo / Bodycam-Footage</span>
            <button class="close-btn" onclick="app.closeVideoModal()">✕</button>
          </div>
          <div class="video-modal-body">
            <video id="activeBeweisPlayer" controls autoplay style="width: 100%; max-height: 70vh; background: #000;"></video>
          </div>
          <div class="lightbox-footer">
            <span id="videoModalMeta"></span>
            <button class="btn btn-secondary btn-sm" id="videoDownloadBtn">Original herunterladen</button>
          </div>
        </div>
      </div>
    `;
  }
};
