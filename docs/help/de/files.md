# Dateien, Speichern und Export

Alles geschieht auf Ihrem Rechner: Es gibt kein Konto, und nichts wird hochgeladen.

## Automatisches Speichern und Wiederherstellung {#autosave-and-recovery}

Jede Änderung wird eine halbe Sekunde, nachdem Sie sie vorgenommen haben, in Ihrem Browser
aufbewahrt. Sie können den Tab jederzeit neu laden oder schließen, ohne gefragt zu werden: Wenn Sie
GrafcetMaker das nächste Mal öffnen, ist Ihr Projekt wieder so da, wie Sie es verlassen haben,
einschließlich ungespeicherter Änderungen. Ein Punkt `●` neben dem Projektnamen bedeutet, dass es
Änderungen gibt, die noch nicht in einer Datei gespeichert sind.

**Datei › Lokaler Verlauf** listet die im Browser aufbewahrten Versionen auf: Sie entstehen beim
Speichern, alle paar Minuten während der Bearbeitung und bevor ein Projekt geschlossen wird. Beim
Wiederherstellen wird eine Version als ungespeicherte Änderungen geöffnet.

> **Wichtig:** Der Browserspeicher gehört zu diesem Browser auf diesem Rechner, und das Löschen der
> Websitedaten löscht ihn. Speichern Sie alles, was Sie behalten möchten, in einer Datei.

## Offline und Installation {#offline-and-installation}

Nach dem ersten Besuch funktioniert GrafcetMaker ohne Netzwerk. Verwenden Sie die
Installationsschaltfläche in der Adressleiste Ihres Browsers, um es als App mit eigenem Fenster zu
erhalten. Wenn eine neue Version bereitsteht, bietet eine Karte in der Ecke an, neu zu laden: Ihre
Arbeit bleibt erhalten.

## Speichern und öffnen {#save-and-open}

- **Speichern** (<kbd>Ctrl+S</kbd>) schreibt das Projekt in eine `.grafcet.json`-Datei. In Chrome
  und Edge wird jedes Mal in dieselbe Datei geschrieben; in anderen Browsern wird die Datei
  heruntergeladen.
- **Speichern unter** (<kbd>Ctrl+Shift+S</kbd>) wählt eine neue Datei. **Datei › Kopie
  herunterladen** lädt eine Kopie herunter, ohne zu ändern, wohin Speichern schreibt.
- **Öffnen** (<kbd>Ctrl+O</kbd>), **Datei › Zuletzt geöffnet** oder eine `.grafcet.json`-Datei
  irgendwo auf das Fenster ziehen. Hat das geöffnete Projekt ungespeicherte Änderungen, werden Sie
  zuerst gefragt, und eine ungültige Datei wird mit einer Erklärung abgelehnt, ohne Ihr Projekt
  anzutasten.

`.grafcet.json`-Dateien sind lesbarer Text und eignen sich gut für Versionsverwaltung (Git) und
Code-Reviews.

**grafcet.io-Dateien** (`.grafcetio`) öffnen Sie auf dieselbe Weise: Sie werden in ein neues
Projekt umgewandelt, mit einem Teil-Grafcet pro Plan (oder pro Rahmen), den Variablen, die aus der
Verwendung in den Plänen angelegt werden, und einem aufgeräumten Layout. Eine Meldung listet alles
auf, was die Umwandlung geändert hat. Speichern Sie, um es als GrafcetMaker-Projekt zu behalten;
die Originaldatei wird nicht verändert.

## Einen Link teilen {#share-a-link}

**Datei › Link zum Teilen kopieren** kopiert eine Webadresse, die das ganze Projekt komprimiert
enthält. Fügen Sie sie in einen Chat, eine E-Mail oder ein Ticket ein: Wer sie öffnet, erhält eine
eigene Kopie des Projekts mit allen Grafcets und Variablen und kann sie ändern, ohne Ihre zu
beeinflussen.

- Das Projekt steckt im Link (nach dem `#`), den Browser nie an den Webserver senden: Nichts wird
  hochgeladen, und Links funktionieren auch offline und bei Installationen im eigenen Haus.
- Jeder, der den Link hat, kann das Projekt lesen; teilen Sie ihn also wie die Datei selbst.
- Ein Link ist eine Momentaufnahme: Spätere Änderungen brauchen einen neuen Link.
- Kleine Pläne ergeben Links mit ein- bis zweitausend Zeichen. Warnt GrafcetMaker, dass ein Link
  lang ist, kürzen ihn manche Chat- und E-Mail-Programme vielleicht; senden Sie dann stattdessen die
  `.grafcet.json`-Datei.
- Das Öffnen eines Links funktioniert wie das Öffnen einer Datei: Hat Ihr Projekt ungespeicherte
  Änderungen, werden Sie zuerst gefragt, und ein beschädigter Link wird mit einer Erklärung
  abgelehnt, ohne Ihr Projekt anzutasten.

## Live gemeinsam bearbeiten {#edit-together-live}

**Datei › Live-Zusammenarbeit…** (oder die Personen-Schaltfläche oben rechts) lässt mehrere
Personen gleichzeitig dasselbe Projekt bearbeiten, jede an ihrem eigenen Rechner.

1. Geben Sie Ihren Namen ein und wählen Sie **Live-Sitzung starten**. Senden Sie den angezeigten
   Link an die anderen.
2. Sie öffnen den Link, geben ihren Namen ein und wählen **Beitreten**.
3. Alle sehen die Mauszeiger und Auswahlen der anderen mit ihren Namen, und jede Änderung erscheint
   nach einem Augenblick bei allen.

- Änderungen werden Feld für Feld zusammengeführt: Verschiebt jemand einen Schritt, während ein
  anderer ihn umbenennt, bleibt beides erhalten.
- **Rückgängig** nimmt nur Ihre eigenen Änderungen zurück.
- Während Sie simulieren, warten die Änderungen der anderen, damit das Diagramm weiter zu Ihrer
  Simulation passt: **Mit Änderungen neu starten** in der Simulationssteuerung übernimmt sie.
- Ohne Verbindung können Sie weiterarbeiten; die Änderungen werden ausgetauscht, sobald sie wieder
  besteht.
- **Sitzung verlassen** behält das Projekt auf Ihrem Gerät als Ihre eigene Kopie.
- Das Projekt ist Ende-zu-Ende-verschlüsselt, mit einem Schlüssel, der nur im Link steht: Jeder, der
  den Link hat, kann das Projekt sehen und ändern; teilen Sie ihn also wie die Datei selbst.

## Exportieren {#export}

**Datei › Exportieren…** (<kbd>Ctrl+E</kbd> oder die Schaltfläche **Exportieren** oben rechts)
öffnet einen Dialog für alle Formate, mit Live-Vorschau. Seine Einstellungen werden pro Projekt
gespeichert. **Datei › Exportieren als** öffnet ihn direkt mit einem bestimmten Format.

| Format                | Wofür                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| **PDF**               | Drucken und Dokumentation: Vektor, A4 oder A3, an die Seite angepasst oder auf mehrere Blätter verteilt, mit Schriftfeld |
| **SVG**               | Dokumente und Web: Vektor, in jeder Größe scharf                                                                         |
| **PNG**               | Präsentationen, Chats und Tickets: Auflösung 1×, 2× oder 4×, wahlweise transparent                                       |
| **WebP**              | wie PNG, mit kleineren Dateien                                                                                           |
| **Variablen (Excel)** | die Variablentabelle als `.xlsx`-Arbeitsmappe                                                                            |
| **Variablen (CSV)**   | die Variablentabelle für andere Werkzeuge                                                                                |
| **Structured Text**   | SPS-Code, der jeden Grafcet ausführt: IEC 61131-3, Siemens TIA Portal (SCL), Beckhoff TwinCAT 3 oder Allen-Bradley Logix |
| **PLCopen XML**       | Import der Grafcets als SFC-Programme in ein SPS-Werkzeug                                                                |

Exporte sind standardmäßig schwarz auf weiß; wählen Sie **Aktuelles Farbschema**, um die
Bildschirmfarben zu behalten. Exportieren Sie den aktuellen Grafcet, die Auswahl oder alle
Grafcets.

**Datei › Diagramm als PNG / SVG kopieren** legt die Auswahl (oder den ganzen Grafcet) in die
Zwischenablage, bereit zum Einfügen in einen Bericht.

## SPS-Code {#plc-code}

**Structured Text** und **PLCopen XML** machen aus Ihren Grafcets SPS-Code. Wählen Sie die
Steuerung unter **SPS**:

- **IEC 61131-3**: ein Funktionsbaustein (`.st`) für CODESYS und die meisten anderen Werkzeuge.
- **Siemens TIA Portal (SCL)**: eine SCL-Quelle (`.scl`) für S7-1200/1500. Fügen Sie sie im TIA
  Portal unter **Externe Quellen** hinzu und wählen Sie **Bausteine aus Quelle generieren**.
- **Beckhoff TwinCAT 3**: eine POU-Datei (`.TcPOU`). Rechtsklick auf einen Ordner des SPS-Projekts
  › **Hinzufügen › Vorhandenes Element**.
- **Allen-Bradley Studio 5000**: eine Structured-Text-Routine. Legen Sie die in ihrem Kopf
  aufgeführten Tags an (Programmbereich) und fügen Sie dann den Code in eine ST-Routine ein.
  Zeitglieder verwenden TONR/TOFR, Flanken OSRI/OSFI, und der erste Zyklus (`S:FS`) setzt die
  Anfangswerte.

Structured Text gibt es in zwei Stilen:

- **CASE pro Kette** (Standard): Eine INT-Variable pro Kette enthält die Nummer ihres aktiven
  Schritts, und ein `CASE` listet die Transitionen jedes Schritts auf
  (`IF receptivity THEN step_G1 := 2;`). Die Ausgänge folgen mit je einer Zeile, z. B.
  `Motor := step_G1 >= 2 AND step_G1 <= 4;`. Ketten mit Parallelverzweigungen behalten ein BOOL pro
  Schritt.
- **Ein BOOL pro Schritt**: jede Transition, dann jeder Schritt, dann die Zeitglieder, Flanken und
  Aktionen, einmal pro SPS-Zyklus; aktivieren Sie **Suche nach Stabilität in jedem Zyklus**, um
  Ketten wahrer Transitionen innerhalb eines Zyklus zu durchlaufen, wie GRAFCET es tut.

Eine speichernd wirkende Aktion wie `Q1 := 1` bei Aktivierung wird einmal ausgeführt, und Q1
behält seinen Wert, nachdem der Schritt verlassen wurde. Aktivieren Sie **Speichernd wirkende
Aktionen mit konstantem Wert halten**, um sie stattdessen in jedem Zyklus zuzuweisen, solange ihr
Schritt aktiv ist.

Die PLCopen-Datei enthält ein SFC-Programm pro Grafcet für den Import in Engineering-Werkzeuge. Die
Vorschau listet alles auf, was das Format nicht ausdrücken kann. Prüfen Sie generierten Code
immer, bevor er auf einer Maschine läuft.

## Einstellungen {#settings}

**Datei › Einstellungen…** (<kbd>Ctrl+,</kbd>) enthält das Farbschema, die Schreibweise, den
Startbildschirm, das Raster, die Hinweise und die Simulationseinstellungen und zeigt, wie viel
Browserspeicher belegt ist. Dort können Sie den lokalen Verlauf und die Liste der zuletzt
geöffneten Dateien leeren.

## Sprache {#language}

Wählen Sie die Sprache mit der Flagge unten rechts (auf dem Smartphone unten im Menü ☰); die Wahl
wird auf diesem Gerät gespeichert. Jede Sprache hat außerdem ihre eigene
Adresse, etwa `…/de/` für Deutsch, sodass sich ein Link in der Sprache öffnet, in der er gesendet
wurde.
