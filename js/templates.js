/**
 * Schriftsatz-Vorlagen für Kanzlei Dr. jur. Lars Baumann (Berlin)
 * Zuständige Gerichte: Amtsgericht Tiergarten, Landgericht Berlin, Verwaltungsgericht Berlin etc.
 */

const SchriftsatzTemplates = {
  getHaftbeschwerde(c, dateNow) {
    return `KANZLEI DR. JUR. LARS BAUMANN
Rechtsanwalt & Fachanwalt für Strafrecht
Kurfürstendamm 182, 10707 Berlin
Tel: 030 / 889 204 00 • E-Mail: baumann@kanzlei-berlin-strafrecht.de

Aktenzeichen: ${c.az}
Berlin, den ${dateNow}

AN DAS
AMTSGERICHT TIERGARTEN
– HAFTABTEILUNG / ERSTVORFÜHRUNG –
Kirchstraße 6, 10557 Berlin

EILT SEHR! HAFTFRAGE GEMÄSS § 128 StPO!

In dem Ermittlungsverfahren gegen
Herrn/Frau ${c.clientName}
– Beschuldigte(r) –

Verteidiger: Rechtsanwalt Dr. jur. Lars Baumann

zeige ich hiermit unter Überreichung der Vollmacht die Verteidigung an.

Es wird beantragt:
1. Den gegen die/den Beschuldigte(n) bestehenden Haftbefehl bzw. die vorläufige Festnahme der Polizei Berlin unverzüglich aufzuheben und die sofortige Entlassung aus dem Polizeigewahrsam anzuordnen.
2. Äußerst hilfsweise den Vollzug des Haftbefehls gegen geeignete Auflagen (Meldeauflage beim Polizeiabschnitt, Kautionsleistung) auszusetzen.
3. Vollständige und ungeschwärzte Einsicht in die Ermittlungsakten der Staatsanwaltschaft Berlin sowie Aushändigung aller sichergestellten Bodycam-Aufnahmen der beteiligten Beamten (${c.opponent}).

BEGRÜNDUNG:
Der dringende Tatverdacht ist nach dem bisherigen Erkenntnisstand unbegründet. Ein gesetzlicher Haftgrund gem. § 112 StPO – insbesondere Flucht- oder Verdunkelungsgefahr – liegt nicht vor. Der Mandant verfügt über einen festen Wohnsitz und soziale Bindungen in Berlin. Die Frist zur Vorführung läuft unweigerlich ab.

Mit kollegialen Grüßen,

Dr. jur. Lars Baumann
Rechtsanwalt`;
  },

  getDienstbeschwerde(c, dateNow) {
    return `KANZLEI DR. JUR. LARS BAUMANN
Rechtsanwalt Dr. jur. Lars Baumann • Berlin
Kurfürstendamm 182, 10707 Berlin
Aktenzeichen: ${c.az}
Berlin, den ${dateNow}

AN DEN
POLIZEIPRÄSIDENTEN IN BERLIN
– Direktion Zentrale Aufgaben / Abteilung Interne Ermittlungen –
Platz der Luftbrücke 6, 12101 Berlin

DIENSTAUFSICHTSBESCHWERDE & STRAFANZEIGE WEGEN KÖRPERVERLETZUNG IM AMT

Namens und im Auftrag unseres Mandanten:
${c.clientName} (Kontakt: ${c.clientPhone})

Gegen:
Die an der Amtshandlung beteiligten Polizeikräfte des Abschnitts: ${c.opponent}

Wegen:
Rechtswidriger Amtsausübung, unzulässiger Freiheitsentziehung und unverhältnismäßiger Zwangsmaßnahmen.

VORFALL / SACHVERHALT:
Am ${c.incidentDate || '[Datum]'} kam es im Berliner Stadtgebiet zu einem rechtswidrigen Polizeieinsatz zum Nachteil meines Mandanten.
${c.description}

Es wird um unverzügliche disziplinarische sowie strafrechtliche Würdigung und schriftliche Stellungnahme ersucht.

Dr. jur. Lars Baumann
Rechtsanwalt`;
  },

  getSchadensersatz(c, dateNow) {
    return `KANZLEI DR. JUR. LARS BAUMANN
Kurfürstendamm 182, 10707 Berlin
Aktenzeichen: ${c.az}
Berlin, den ${dateNow}

AN: ${c.opponent}

VORGERICHTLICHE ZAHLUNGSAUFFORDERUNG / SCHADENSERSATZ & SCHMERZENSGELD

Sehr geehrte Damen und Herren,

in der vorbezeichneten Angelegenheit vertrete ich die rechtlichen Interessen von ${c.clientName}.

Infolge des Vorfalls vom ${c.incidentDate || '[Datum]'} in Berlin entstand meinem Mandanten durch Ihr schuldhaftes und rechtswidriges Handeln ein erheblicher Schaden.

Forderungsgrundlagen:
1. Materieller Sach- und Vermögensschaden
2. Angemessenes Schmerzensgeld wegen erlittener Verletzungen
3. Vorgerichtliche Rechtsanwaltsgebühren Dr. Baumann

Ich setze Ihnen zur verbindlichen Erklärung der Kostenübernahme eine Frist bis zum:
[Datum + 10 Werktage].

Nach fruchtlosem Fristablauf werde ich unverzüglich Klage vor dem Landgericht Berlin erheben.

Mit vorzüglicher Hochachtung,
Dr. jur. Lars Baumann
Rechtsanwalt`;
  }
};
