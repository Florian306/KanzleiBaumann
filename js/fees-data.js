/**
 * Fee Configuration & Descriptions for Kanzlei Dr. jur. Lars Baumann
 */

const DEFAULT_FEES = {
  erstberatung: 1000,
  ausfuehrlich: 2500,
  schriftverkehr: 4000,
  vergleich: 6000,
  vertragspruefung: 3500,
  vertragserstellung: 5000,
  vernehmung: 7500,
  strafverteidigung: 12000,
  zivilklage: 10000,
  hauptverhandlung: 15000,
  fahrtpauschale: 1500,
  dringlichkeitszuschlag: 50
};

const FEE_GROUPS = [
  {
    title: '💬 Rechtsberatung & Erstgespräch',
    category: 'beratung',
    items: [
      {
        id: 'erstberatung',
        badge: 'Beratung',
        title: 'Erstberatung (bis 30 Min.)',
        desc: 'Kompakte anwaltliche Ersteinschätzung der Rechtslage, Klärung des Sachverhalts und Prüfung der Erfolgsaussichten.'
      },
      {
        id: 'ausfuehrlich',
        badge: 'Intensiv',
        highlight: true,
        title: 'Ausführliche Rechtsberatung & Aktenprüfung',
        desc: 'Tiefgehende Aktenanalyse, juristische Ausarbeitung der Verteidigungsstrategie sowie Vorbereitung formeller Anträge.'
      }
    ]
  },
  {
    title: '✉️ Außergerichtliche Vertretung & Schriftverkehr',
    category: 'aussergerichtlich',
    items: [
      {
        id: 'schriftverkehr',
        badge: 'Behörden',
        title: 'Schriftverkehr Behörden / Polizei',
        desc: 'Offizielle Korrespondenz, Stellungnahmen, Schutzschriften und Akteneinsichtsgesuche bei Polizei und Staatsanwaltschaft.'
      },
      {
        id: 'vergleich',
        badge: 'Einigung',
        title: 'Außergerichtlicher Vergleich & Streitbeilegung',
        desc: 'Verhandlungsführung zur Vermeidung eines Gerichtsverfahrens, rechtssichere Einigungsverträge und Schadensregulierung.'
      }
    ]
  },
  {
    title: '📑 Vertragsgestaltung & Dokumentenprüfung',
    category: 'vertraege',
    items: [
      {
        id: 'vertragspruefung',
        badge: 'Prüfung',
        title: 'Arbeits- & Dienstverträge',
        desc: 'Prüfung und Anpassung bestehender Vertragswerke pro Dokument / Entwurf auf rechtliche Fallstricke und Konformität.'
      },
      {
        id: 'vertragserstellung',
        badge: 'Erstellung',
        title: 'Maßgeschneiderte Vertragswerke',
        desc: 'Individuelle Neuerstellung exklusiver Verträge mit lückenlosem Haftungsschutz, Klauselsicherheit und Kündigungsregelungen.'
      }
    ]
  },
  {
    title: '🛡️ Straf- & Zivilmandat (Verteidigung)',
    category: 'verteidigung',
    items: [
      {
        id: 'vernehmung',
        badge: 'Gewahrsam',
        title: 'Vernehmung / Polizeigewahrsam',
        desc: 'Sofortiger anwaltlicher Beistand bei polizeilichen Vernehmungen, Vorführungen und Schutz vor unzulässigen Befragungen.'
      },
      {
        id: 'strafverteidigung',
        badge: 'Vollmandat',
        highlight: true,
        title: 'Komplette Strafverteidigung',
        desc: 'Vollumfängliche Vertretung im Ermittlungs- und Zwischenverfahren inklusive Akteneinsicht und Einstellungsantrag gem. § 170 StPO.'
      },
      {
        id: 'zivilklage',
        badge: 'Zivilrecht',
        title: 'Zivilrechtliche Klagevertretung',
        desc: 'Geltendmachung oder Abwehr von Schadensersatz-, Schmerzensgeld- und Vermögensansprüchen vor Gericht.'
      }
    ]
  },
  {
    title: '🏛️ Gerichtliche Hauptverhandlung & Nebenkosten',
    category: 'gericht',
    items: [
      {
        id: 'hauptverhandlung',
        badge: 'Prozesstag',
        highlight: true,
        suffix: ' / Tag',
        title: 'Termingebühr Hauptverhandlung',
        desc: 'Gerichtssaal-Vertretung durch Dr. jur. Lars Baumann (fällig pro angetretenem Verhandlungstag am AG Tiergarten / LG Berlin).'
      },
      {
        id: 'fahrtpauschale',
        badge: 'Pauschale',
        title: 'Fahrt- & Einsatzpauschale',
        desc: 'Pauschale für Vor-Ort-Termine, Revierbesuche in Berliner Polizeiabschnitten und Ortstermine.'
      },
      {
        id: 'dringlichkeitszuschlag',
        badge: 'Einsatz Eil',
        isPercent: true,
        title: 'Dringlichkeitszuschlag',
        desc: 'Für Nachteinsätze und Sofort-Vertretungen mit weniger als 2 Stunden Vorlaufzeit (auf den jeweiligen Grundpreis).'
      }
    ]
  }
];

const FAQ_ITEMS = [
  {
    q: 'Wie läuft die Mandatsannahme in der Kanzlei Dr. jur. Lars Baumann ab?',
    a: 'Die Kanzlei arbeitet strikt nach dem Eingangsprinzip („Wer zuerst kommt, mahlt zuerst“). Reichen Sie Ihren Fall über das Online-Portal ein. Nach Prüfung auf etwaige Interessenkollisionen und Eingang der Erstberatungs- bzw. Vertretungsgebühr wird die Akte unverzüglich angelegt und bearbeitet.'
  },
  {
    q: 'Welche Notfall-Maßnahmen gelten bei Festnahme oder Hausdurchsuchung?',
    a: 'Machen Sie von Ihrem gesetzlichen Schweigerecht Gebrauch! Äußern Sie sich nicht zur Sache und verlangen Sie umgehend die Benachrichtigung von Dr. jur. Lars Baumann. Mit unserem Eilservice stehen wir bei Vorführungen am Amtsgericht Tiergarten innerhalb kürzester Zeit an Ihrer Seite.'
  },
  {
    q: 'Wie funktioniert die Akteneinsicht für Bürger und Mandanten?',
    a: 'Jeder Mandant erhält nach Fallerfassung ein Aktenzeichen (z. B. 101/26 StR). Über den Reiter „Akteneinsicht / Status“ auf dieser Website können Sie den aktuellen Bearbeitungsstand jederzeit live und ohne bürokratische Wartezeit online einsehen.'
  },
  {
    q: 'Werden Barzahlungen akzeptiert?',
    a: 'Nein. Aus Gründen der Transparenz und geldwäscherechtlichen Compliance erfolgt die Zahlung sämtlicher Gebühren ausnahmslos per offizieller Rechnungsüberweisung auf das Kanzleikonto.'
  }
];
