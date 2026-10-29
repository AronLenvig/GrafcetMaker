# GrafcetMaker: kostenloser GRAFCET-Editor und -Simulator online

GrafcetMaker zeichnet, prüft und simuliert GRAFCET-Pläne (IEC 60848) im Browser und setzt sie in
SPS-Code um. Er ist für Automatisierungstechniker, Lehrkräfte und Studierende gemacht: kostenlos und
Open Source (MIT-Lizenz), ohne Konto, und er funktioniert offline.

GrafcetMaker ist eine Web-App: Sie läuft in jedem aktuellen Browser mit eingeschaltetem
JavaScript. Ist GRAFCET neu für Sie? Lesen Sie den [GRAFCET-Leitfaden](de/guide/), auch auf [Englisch](en/guide/), [Französisch](fr/guide/), [Spanisch](es/guide/), [Dänisch](da/guide/), [Schwedisch](sv/guide/), [Portugiesisch](pt/guide/), [Polnisch](pl/guide/), [Russisch](ru/guide/), [Chinesisch](zh/guide/) und [Hindi](hi/guide/).

## Für KI-Assistenten

KI-Assistenten wie ChatGPT und Claude können einen Grafcet für Sie erstellen und ihn Ihnen als Link geben, der ihn hier öffnet. Assistent, lies [ai.txt](ai.txt), um zu erfahren, wie. In GrafcetMaker öffnet **Datei › Aus Text öffnen…** einen Grafcet, den ein Assistent geschrieben hat, und **Datei › Als Text kopieren** gibt Ihren Grafcet an ihn zurück.

## Was Sie damit tun können

- **Zeichnen** Sie Schritte, Transitionen, Transitionsbedingungen und Aktionen mit Maus oder
  Tastatur (<kbd>Enter</kbd> setzt eine Kette fort), mit Alternativ- und Parallelverzweigungen,
  Rückführungen, Quell- und Senkentransitionen und Kommentaren. Das automatische Layout ordnet einen
  Plan auf Wunsch.
- **Prüfen** Sie den Plan schon beim Zeichnen: Syntax und Typen jeder Transitionsbedingung,
  unbekannte Variablen, doppelte Schrittnummern, unerreichbare Schritte, Sackgassen, nicht
  ausschließende Alternativverzweigungen, mögliche endlose instabile Abläufe und Ausgänge, die aus
  parallelen Zweigen gesetzt werden. Für die meisten Probleme gibt es eine Korrektur mit einem Klick.
- **Simulieren** Sie nach den Ablaufregeln der IEC 60848: Marken in den aktiven Schritten,
  freigegebene Transitionen, Eingänge zum Klicken oder Eintippen, Zeitglieder, Flanken, instabile
  Schritte, Zwangssteuerung zwischen Grafcets, ein Zeitdiagramm jeder Variablen und Szenarien zum
  Aufzeichnen und Abspielen.
- **Strukturieren** Sie große Anwendungen mit Teil-Grafcets, Makroschritten und ihren
  Expansionen, einschließenden Schritten und Zwangssteuerungen.
- **Exportieren** Sie als PDF (A4 oder A3, mit Schriftfeld, bei Bedarf auf mehrere Blätter
  verteilt), SVG, PNG und WebP, die Variablentabelle nach Excel und CSV, und erzeugen Sie Structured
  Text oder PLCopen XML.
- **Arbeiten Sie gemeinsam** live über einen Link: Alle sehen die Zeiger und Änderungen der anderen
  in Echtzeit, Ende-zu-Ende-verschlüsselt.

## Unterstützte GRAFCET-Elemente

| Element      | Was GrafcetMaker unterstützt                                                                                                |
| ------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Schritte     | Schritte und Anfangsschritte, Makroschritte mit Expansion, einschließende Schritte; Schrittvariablen `X1`                   |
| Transitionen | Transitionsbedingungen mit UND, ODER, NICHT, steigenden ↑ und fallenden ↓ Flanken, Zeitgliedern wie `5s/X1`, Vergleichen    |
| Strukturen   | Ketten, Alternativ- und Parallelverzweigungen und -zusammenführungen, Rückführungen, Sprünge, Quell- und Senkentransitionen |
| Aktionen     | kontinuierlich, bedingt, speichernd bei Aktivierung, bei Deaktivierung oder bei Ereignis; Zwangssteuerung `G2{8}`, `G2{*}`  |
| Variablen    | Eingänge, Ausgänge und interne Variablen vom Typ BOOL, INT, REAL und TIME, mit Adressen und Kommentaren                     |
| Schreibweise | Eingabe in ASCII (`a*/b`, `RE a`), Anzeige in Lehrbuchschreibweise (Überstrich für NICHT, ↑ und ↓) oder wie eingegeben      |

## Simulation

Der Simulator folgt den Ablaufregeln der IEC 60848. Anfangsschritte sind zu Beginn aktiv. Eine
Transition ist freigegeben, wenn alle vorangehenden Schritte aktiv sind, und sie schaltet, wenn
zusätzlich ihre Transitionsbedingung erfüllt ist: Die nachfolgenden Schritte werden aktiv, die
vorangehenden inaktiv. Alle schaltfähigen Transitionen schalten gleichzeitig, und ein Schritt, der
zugleich aktiviert und deaktiviert wird, bleibt aktiv.

Nach jeder Änderung der Eingänge sucht der Simulator die stabile Situation: Er schaltet
Transitionen, bis keine mehr schaltfähig ist. Dabei durchlaufene Schritte (instabile Schritte)
führen ihre kontinuierlich wirkenden Aktionen nicht aus, ihre speichernd wirkenden Aktionen aber
schon. Die Zeit ist virtuell: Ein Plan läuft in Echtzeit, schneller oder Schaltschritt für
Schaltschritt, und ein Zeitdiagramm zeichnet jede Variable auf.

## Export und SPS-Code

| Format            | Wofür                                                                | Öffnet in                                                                                                                                                                             |
| ----------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF               | Druck und Dokumentation: vektoriell, A4 oder A3, mit Schriftfeld     | jedem PDF-Reader                                                                                                                                                                      |
| SVG, PNG, WebP    | Berichte, Präsentationen und Webseiten, auch über die Zwischenablage | Word, PowerPoint, Browsern und Bildbearbeitungen                                                                                                                                      |
| Variablen         | die Variablentabelle als Excel oder CSV, und zurück                  | Excel, LibreOffice und anderen Tabellenkalkulationen                                                                                                                                  |
| Structured Text   | SPS-Code für jeden Grafcet (IEC 61131-3)                             | CODESYS und den meisten IEC-61131-3-Werkzeugen, Siemens TIA Portal (SCL-Quelle für S7-1200/1500), Beckhoff TwinCAT 3 (POU-Datei), Allen-Bradley Studio 5000 (Structured-Text-Routine) |
| PLCopen XML (TC6) | die Grafcets als SFC-Programme                                       | SPS-Engineering-Werkzeugen mit PLCopen-XML-Import                                                                                                                                     |
| Projektdatei      | das ganze Projekt als lesbare `.grafcet.json`                        | GrafcetMaker                                                                                                                                                                          |

Structured Text gibt es in zwei Stilen: ein `CASE` pro Kette, wie von Hand geschrieben, oder ein
BOOL pro Schritt. Erzeugter Code ist ein Ausgangspunkt: Prüfen Sie ihn, bevor er eine Maschine
steuert.

## Beispiele

Sechs Beispielprojekte öffnen sich vom Startbildschirm des Editors:

- **Ampel** mit Fußgängertaster: Zeitglieder und eine gespeicherte Anforderung.
- **Bohrstation**: ein Bearbeitungszyklus mit Teilezähler und Wartung alle 100 Teile.
- **Tankbefüllung**: numerische Eingänge und Vergleiche.
- **Paralleles Förderband**: Parallelzweige und ein Sicherheits-Grafcet, der die Anlage
  zwangssteuert.
- **Abfülllinie**: ein Makroschritt, drei Stationen parallel, Prüfung und Zähler.
- **Betriebsarten**: ein einschließender Schritt, eine Pause, die den Zyklus einfriert, und ein
  Not-Halt.

Der [GRAFCET-Leitfaden](de/guide/#beispiele) zeichnet die ersten beiden und öffnet sie im Editor.

## Häufige Fragen

### Ist GrafcetMaker kostenlos? Gibt es Grenzen?

Ja, er ist kostenlos und Open Source unter der MIT-Lizenz. Es gibt keine Bezahlversion, keine
Testphase und keine Begrenzung der Zahl der Projekte, Grafcets oder Schritte.

### Muss ich mich registrieren oder etwas installieren?

Nein. Öffnen Sie die Seite und zeichnen Sie los; ein Konto gibt es nicht. Sie können GrafcetMaker
auch aus dem Browser als App installieren und wie ein Desktop-Programm starten.

### Funktioniert er offline?

Ja. Nach dem ersten Besuch liegt alles Nötige im Browser, sodass er ohne Netzwerk startet und
arbeitet. Nur die Live-Zusammenarbeit braucht eine Verbindung.

### Wo werden meine Pläne gespeichert?

Auf Ihrem Computer. Projekte werden automatisch im Browser gespeichert und in den
`.grafcet.json`-Dateien, die Sie speichern. Nichts wird hochgeladen, und die App erfasst keine
Nutzungsdaten. Live-Sitzungen sind Ende-zu-Ende-verschlüsselt, mit einem Schlüssel, der nur im Link
steht.

### Auf welchen Browsern und Geräten läuft er?

Auf den aktuellen Versionen von Chrome, Edge, Firefox und Safari unter Windows, macOS, Linux, auf
Tablets und Smartphones. Smartphones bekommen ein Layout für kleine Bildschirme, Touchscreens Gesten
und größere Griffe.

### Welcher Norm folgt er?

GRAFCET nach IEC 60848 (DIN EN 60848). Erzeugter Code folgt der IEC 61131-3.

### Kann er Dateien anderer GRAFCET-Programme öffnen?

GrafcetMaker öffnet Dateien von grafcet.io (`.grafcetio`) und wandelt sie in ein Projekt um.
Variablentabellen lassen sich aus Excel und CSV importieren.

### Kann mein Unternehmen ihn im eigenen Netz betreiben?

Ja. GrafcetMaker besteht aus statischen Dateien, die jeder Webserver ausliefern kann, unter jedem
Pfad und ohne Internetzugang. Ein Docker-Image mit nginx wird mitgeliefert.
