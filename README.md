# Kanzlei Dr. jur. Lars Baumann – Berlin

Moderne, modulare Web-Applikation für die Anwaltskanzlei **Dr. jur. Lars Baumann** (Berlin).

## ⚖️ Features

- **Public Portal:** Kanzleipräsenz, Berliner Unabhängigkeits-Charta & Kanzleiordnung („Wer zuerst kommt, mahlt zuerst“).
- **Transparente Gebührenordnung:** Öffentlich einsehbare Sätze nach RVG & Zeithonorar, direkt im internen Dashboard anpassbar.
- **Bürger-Status-Tracker:** Öffentliche Akteneinsicht mit 4-stufiger Status-Timeline (`Eingereicht` ➔ `In Bearbeitung` ➔ `Vor Gericht` ➔ `Archiviert`).
- **Fall-Einreichungsportal:** Bürger & Beamte können Fälle online einreichen; automatisierte Vergabe deutscher Fach-Aktenzeichen (z. B. `101/26 StR`, `102/26 PolR`, `103/26 WaffR`, `104/26 Ziv`).
- **Internes Kanzlei-Dashboard (Passwortgeschützt):**
  - KPI-Metriken & Übersichts-Register
  - Volltextsuche, Sortierung & Filter nach Status und Rechtsgebiet
  - Manuelle Aktenanlage & Direktexport der Datenbank (JSON-Backup)
  - Gebührensatz-Konfigurator
- **Digitales Fallbuch (Akten-Detailansicht):**
  - Stammdatenverwaltung (Mandant, Gegenseite, Tatzeitpunkt, Rechtsschutzziel)
  - Sicherheitsstufen (`Normal`, `Erhöht`, `Verschlusssache (VS § 203 StGB)`)
  - 24h/48h Haftprüfungs-Countdown (§ 128 StPO Berlin / Amtsgericht Tiergarten)
  - Große Editoren für Sachverhalt, Zeugen und anwaltliche Handakte
- **Multimediales Beweismittelsystem (IndexedDB):**
  - Drag & Drop Upload isoliert pro Akte
  - Fotobeweise mit Lightbox-Vorschau
  - Dokumentenarchiv (PDFs)
  - Dashcam- & Bodycam-Footage mit integriertem Video-Player und **Zeitstempel-Timeline-Markern**
- **Schriftsatz-Generator & RVG-Kostennote:**
  - Praxiserprobte Berliner Muster (AG Tiergarten Haftprüfung, Polizei Berlin Dienstaufsichtsbeschwerde, Zivilklage)
  - RVG-Gebührenrechner mit automatischer Kostennoten-Generierung
  - Druckfertiger Schriftsatz auf Kanzlei-Briefpapier mit rotem Kanzlei-Wachssiegel und anwaltlicher Signatur

## 📁 Struktur

```text
Kanzleiwebsite/
├── index.html          # Single-Page-Application mit Multi-Page-Views
├── css/
│   └── main.css        # Slate-Anthrazit Dark Mode & Behörden-Design
├── js/
│   ├── storage.js      # Hybrid-Speicher (localStorage + IndexedDB)
│   ├── templates.js    # Berliner Schriftsatz-Vorlagen
│   └── app.js          # App-Controller, Player, Filter, Rechner & Tracker
├── assets/             # Grafiken, Logos & Asservate
└── README.md
```

## 🚀 Nutzung

Einfach `index.html` in einem modernen Webbrowser (Chrome, Edge, Firefox) öffnen. Es ist kein separater Webserver erforderlich.
Standard-Passwort für das Kanzlei-Dashboard: `baumann2026`.
