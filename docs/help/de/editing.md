# Diagramme bearbeiten

GrafcetMaker ist so gebaut, dass Sie selten etwas von Hand platzieren: Wählen Sie ein Element aus
und drücken Sie eine Taste, und die neuen Elemente werden für Sie nummeriert, verbunden und
angeordnet. Die Hinweise unter der Werkzeugleiste oben auf der Zeichenfläche listen die Tasten auf,
die für die aktuelle Auswahl gelten.

## Die wichtigsten Tasten {#the-essential-keys}

| Taste                                      | Bei ausgewähltem Schritt                                                         | Bei ausgewählter Transition                                     |
| ------------------------------------------ | -------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| <kbd>Enter</kbd>                           | Transition und Schritt darunter hinzufügen, dann Transitionsbedingung bearbeiten | Schritt darunter hinzufügen                                     |
| <kbd>A</kbd>                               | Aktion hinzufügen                                                                | —                                                               |
| <kbd>P</kbd>                               | Parallelzweig hinzufügen (UND)                                                   | einen weiteren Schritt hinzufügen, den sie aktiviert            |
| <kbd>O</kbd>                               | Alternativzweig hinzufügen (ODER)                                                | alternative Transition hinzufügen (Umgehung)                    |
| <kbd>L</kbd>, dann Klick auf einen Schritt | zu diesem Schritt zurückführen                                                   | mit diesem Schritt verbinden (wenn sie noch nirgendwohin führt) |
| <kbd>F2</kbd> oder Doppelklick             | Nummer bearbeiten                                                                | Transitionsbedingung bearbeiten                                 |
| <kbd>R</kbd>                               | —                                                                                | drehen: von oben nach unten oder von rechts nach links          |
| <kbd>J</kbd>                               | —                                                                                | Sprung zu einem Schritt: `X10` darunter eingeben                |
| <kbd>Del</kbd>                             | löschen und die Kette wieder schließen                                           | löschen                                                         |

Eine Transition **von rechts nach links** hat einen senkrechten Strich: Die Verbindung vom
vorangehenden Schritt kommt von rechts, die Verbindung zum nächsten Schritt geht nach links ab,
mit Pfeilen. Klicken Sie irgendwo auf den Strich, die Nummer oder die Transitionsbedingung einer
Transition, um sie auszuwählen.

Ohne Auswahl setzt <kbd>Enter</kbd> den Ablauf an seinem letzten Schritt fort. <kbd>Enter</kbd> auf
einem Schritt, auf den bereits etwas folgt, fügt die neue Transition und den neuen Schritt ein und
schiebt alles darunter nach unten.

Beim Bearbeiten einer Transitionsbedingung oder einer Aktion übernimmt <kbd>Shift+Enter</kbd> die
Eingabe und öffnet die nächste: die nächste Transitionsbedingung im Ablauf (eine neue Transition
und ein neuer Schritt an seinem Ende) oder die nächste Aktion des Schritts (eine neue nach der
letzten). So tippen Sie einen ganzen Ablauf oder eine Reihe von Aktionen in einem Zug.

## Direkt im Diagramm tippen {#typing-on-the-diagram}

<kbd>F2</kbd>, ein Doppelklick oder <kbd>Enter</kbd> öffnet einen Text genau dort, wo er
gezeichnet ist: Tippen Sie wie auf der Zeichenfläche, und der Rahmen um ihn wächst beim Tippen mit.
<kbd>Enter</kbd> übernimmt ihn (<kbd>Ctrl+Enter</kbd> in einem Kommentar), <kbd>Esc</kbd> bricht
ab, und ein Klick an eine andere Stelle übernimmt ihn ebenfalls. Eine rote Wellenlinie markiert
einen Wert, der noch nicht gültig ist; der Kasten unter dem Text sagt, warum.

## Platzhalter {#ghosts}

Ein ausgewählter Schritt zeigt gestrichelte **Platzhalter** dessen, was <kbd>A</kbd> und
<kbd>Enter</kbd> hinzufügen würden: eine Aktion nach seiner letzten Aktion und, am Ende eines
Ablaufs, eine Transition und einen Schritt mit der Nummer, die er erhalten wird. Eine Transition,
die nirgendwohin führt, zeigt einen Platzhalter-Schritt. Klicken Sie auf einen Platzhalter, um ihn
hinzuzufügen; klicken Sie nur auf den Balken der Platzhalter-Transition, um allein die Transition
hinzuzufügen: Sie wird ausgewählt, und ihr Platzhalter-Schritt folgt. Ein aus seinem Platzhalter
hinzugefügter Schritt wird ausgewählt, als hätten Sie ihn angeklickt, sodass sein eigener
Platzhalter nur einen Klick entfernt ist; tippen Sie die Transitionsbedingungen später
(<kbd>F2</kbd> oder Doppelklick) oder verwenden Sie <kbd>Enter</kbd>, um jede gleich mitzutippen.
Mit einem Platzierungswerkzeug zeigt ein Platzhalter unter dem Mauszeiger, was ein Klick
platzieren wird.

## Maus {#mouse}

- **Klick** wählt aus; <kbd>Shift</kbd>+Klick oder <kbd>Ctrl</kbd>+Klick fügt zur Auswahl hinzu
  oder entfernt aus ihr; Ziehen auf einer leeren Fläche wählt mit einem Rahmen aus (ein Schritt
  bringt alle seine Aktionen mit); <kbd>Ctrl+A</kbd> wählt alles aus. Auch die Verbindungen
  zwischen ausgewählten Elementen werden hervorgehoben.
- **Ziehen** Sie ein beliebiges ausgewähltes Element, um die ganze Auswahl zu verschieben (sie
  rastet am Raster ein); die Pfeiltasten verschieben schrittweise (<kbd>Shift</kbd> für größere
  Schritte).
- **Doppelklick** auf ein Element bearbeitet seinen Text; Doppelklick auf eine leere Fläche fügt
  dort einen Schritt hinzu.
- **Rechtsklick** auf ein Element zeigt, was Sie damit tun können (Aktion hinzufügen,
  Verzweigungen, Rückführung, bearbeiten, in Makroschritt umwandeln, ausschneiden, kopieren,
  löschen…), ebenso auf die Auswahl oder auf eine leere Fläche (dort einen Schritt hinzufügen,
  einfügen, automatisches Layout, neu nummerieren, einpassen). Die Menütaste öffnet das Menü für
  die Auswahl.
- Eine Transition, deren Transitionsbedingung noch nicht geschrieben ist, zeigt ein graues **?**
  (doppelklicken Sie darauf oder drücken Sie <kbd>F2</kbd>); die Liste Probleme zählt sie, bis Sie
  eine eingeben.
- **Verbindungsgriffe**: Ein ausgewählter oder überfahrener Schritt bzw. eine Transition zeigt
  runde Griffe. Ziehen Sie einen: Nur gültige Ziele (ein Schritt zu einer Transition, eine
  Transition zu einem Schritt) werden hervorgehoben. Lassen Sie ihn auf einer leeren Fläche los, um
  dort das fehlende Element anzulegen.
- Klicken Sie auf eine **Verbindung**, um sie auszuwählen; <kbd>Del</kbd> entfernt nur diese
  Verbindung. Ziehen Sie eine Verbindung nach oben (eine Rückführung) seitlich, um ihre seitliche
  Linie zu verschieben, oder ziehen Sie ihre untere Linie nach oben oder unten; ein Doppelklick
  stellt den automatischen Verlauf wieder her. Automatisch verläuft eine Rückführung unterhalb der
  Schritte und Leitungen ihres eigenen Ablaufs, statt sie zu kreuzen.
- Klicken Sie auf eine **Doppellinie** (UND-Verzweigung oder UND-Zusammenführung), um sie
  auszuwählen: Sie wird mit den Verbindungen hervorgehoben, die sie zusammenfasst. Ziehen Sie sie
  oder nutzen Sie die Pfeiltasten, um sie mit ihrer Transition zu verschieben; <kbd>Del</kbd>
  entfernt diese Verbindungen und behält die Transition und die Schritte.

## Touch: Smartphones und Tablets {#touch-phones-and-tablets}

- **Tippen** wählt aus. **Ziehen** Sie ein Element, um es zu verschieben; ziehen Sie die leere
  Fläche, um die Ansicht zu verschieben; **ziehen Sie zwei Finger zusammen** oder auseinander, um
  zu zoomen.
- **Doppeltippen** auf ein Element bearbeitet seinen Text, auf eine leere Fläche fügt es dort einen
  Schritt hinzu.
- **Halten, dann ziehen** auf der leeren Fläche wählt alles in einem Rahmen aus.
- Bei einer Auswahl erledigt eine **Werkzeugleiste** unten auf der Zeichenfläche, was am Computer
  die Tasten tun: **Schritt** (eine Transition und ein Schritt darunter), **Aktion**, Verzweigungen
  **Parallel** und **Alternativ**, **Rückführung**, **Bearbeiten**, **Details** (die Eigenschaften)
  und **Löschen**.
- Ein ausgewählter Schritt oder eine ausgewählte Transition zeigt ihre **Verbindungsgriffe** direkt
  darüber und darunter: Ziehen Sie einen zu einem hervorgehobenen Ziel oder auf eine leere Fläche,
  um das fehlende Element anzulegen.
- Ist ein Werkzeug gewählt (Schritt, Transition, Kommentar, Aktion), **tippen** Sie dorthin, wo das
  Element hin soll.

Auf einem Smartphone ist der Bildschirm für die Bedienung mit einer Hand eingerichtet: Werkzeuge,
Rückgängig und Wiederholen liegen unten, das Menü (☰) enthält Datei, Bearbeiten, Ansicht,
Simulieren und Hilfe, und die Bereiche (Eigenschaften, Variablen, Probleme, Simulation,
Zeitdiagramm, Gliederung) öffnen sich als Blatt über dem Diagramm, mit der Schaltfläche für die
Bereiche unten rechts. Ziehen Sie den Griff des Blatts, um es höher oder niedriger zu machen.

## Werkzeuge {#tools}

Die Werkzeugleiste oben im Fenster enthält die Werkzeuge (der Buchstabe auf jeder Schaltfläche ist
ihre Taste): **Auswählen** (<kbd>V</kbd>), **Ansicht verschieben** (<kbd>H</kbd>), **Schritt**
(<kbd>S</kbd>), **Transition** (<kbd>T</kbd>), **Kommentar** (<kbd>C</kbd>) und **Aktion**
(<kbd>Shift+A</kbd>). Klicken Sie mit einem Platzierungswerkzeug auf eine leere Fläche, um ein
Element zu platzieren; halten Sie <kbd>Shift</kbd>, um mehrere zu platzieren. <kbd>Esc</kbd> kehrt
zu Auswählen zurück. Das Werkzeug Aktion fügt einem Schritt auch eine Aktion hinzu, wenn Sie auf
den Schritt klicken.

## Verzweigungen und Strukturen {#branches-and-structures}

Verzweigungen und Zusammenführungen werden nie von Hand gezeichnet; sie ergeben sich aus den
Verbindungen.

- <kbd>O</kbd> auf einem Schritt fügt eine weitere nachfolgende Transition mit eigenem Schritt
  hinzu: eine **ODER-Verzweigung**.
- <kbd>P</kbd> auf einem Schritt fügt einen parallelen Schritt hinzu, der von derselben Transition
  gestartet und von der nächsten zusammengeführt wird: eine **UND-Verzweigung** und eine
  **UND-Zusammenführung**.
- Verbinden Sie einen zweiten Schritt mit einer Transition, entsteht eine UND-Zusammenführung;
  verbinden Sie eine zweite Transition mit einem Schritt, entsteht eine ODER-Zusammenführung.
- **Bearbeiten › Quelltransition über dem Schritt / Senkentransition unter dem Schritt** fügt eine
  Transition ohne Schritt darüber bzw. darunter hinzu.

## Sprünge {#jumps}

<kbd>J</kbd> auf einer Transition setzt einen **Sprung** zu einem Schritt, statt eine Linie zu ihm
zu ziehen: Geben Sie den Schritt unter der Transition ein (`X10` oder nur `10`) und drücken Sie
<kbd>Enter</kbd>. Die Transition endet in einem Pfeil mit **X10**, und ein Schritt, der nur über
Sprünge erreicht wird, erhält einen Pfeil mit den Schritten, von denen sie kommen. Doppelklicken Sie
auf X10, um es zu ändern; leeren Sie es, um den Sprung zu entfernen. Rechtsklick auf eine Verbindung
oder eine springende Transition: **Verbindung als Sprung zeichnen** und **Sprung als Verbindung
zeichnen**. Nur die Zeichnung ändert sich: Die Transition führt weiterhin zu diesem Schritt, in der
Simulation wie im erzeugten Code. Einen Sprung entfernen Sie auch, indem Sie seinen Pfeil anklicken
und <kbd>Del</kbd> drücken. Unter einer Transition, die noch nirgends hinführt, macht der
Platzhalter-Pfeil **X…** neben dem Platzhalter-Schritt dasselbe wie <kbd>J</kbd>.

## Aufräumen {#tidy-up}

- **Bearbeiten › Automatisches Layout des Grafcets** ordnet alle Schritte in Reihen an, zentriert
  Zweige unter ihrer Verzweigung und führt Rückführungen seitlich. **Automatisches Layout der
  Auswahl** tut das nur für die Auswahl. Das Layout geschieht nie von selbst und lässt sich
  rückgängig machen.
- **Bearbeiten › Schritte neu nummerieren** nummeriert die Schritte der Reihe nach entlang des
  Ablaufs und aktualisiert jeden Verweis `Xn` und jede Zwangssteuerung.

## Rückgängig, Kopieren und Einfügen {#undo-copy-and-paste}

- <kbd>Ctrl+Z</kbd> macht rückgängig, <kbd>Ctrl+Shift+Z</kbd> oder <kbd>Ctrl+Y</kbd> wiederholt.
  Ein ganzer Ziehvorgang ist ein Rückgängig-Schritt; das Menü Bearbeiten nennt, was rückgängig
  gemacht wird.
- <kbd>Ctrl+C</kbd>, <kbd>Ctrl+X</kbd>, <kbd>Ctrl+V</kbd> funktionieren zwischen Grafcets,
  Projekten und Browser-Tabs. Eingefügte Schritte werden neu nummeriert, wenn ihre Nummern vergeben
  sind, und die Variablen, die sie verwenden, kommen mit.

## Navigieren {#navigate}

- Scrollen verschiebt die Ansicht; <kbd>Ctrl</kbd>+Scrollen oder zwei Finger zusammenziehen zoomt;
  <kbd>Space</kbd>+Ziehen, die mittlere Maustaste oder die gedrückt gehaltene rechte Maustaste
  verschieben die Ansicht ebenfalls (ein Rechtsklick ohne Bewegung öffnet weiterhin das Menü).
- <kbd>Shift+1</kbd> passt den ganzen Grafcet ein, <kbd>Shift+2</kbd> die Auswahl,
  <kbd>Shift+0</kbd> stellt 100 % ein.
- <kbd>Ctrl+K</kbd> öffnet die Befehlspalette: Geben Sie einen beliebigen Befehl oder einen
  Grafcet-Namen ein.

## Kommentare und Namen {#comments-and-names}

- Kommentare (Werkzeug <kbd>C</kbd>) sind freie Notizen im Diagramm; der Simulator ignoriert sie.
- Schrittbezeichnungen (Bereich Eigenschaften) sind kurze Beschreibungen, die links neben dem
  Schritt stehen.
- Doppelklicken Sie oben auf den Projektnamen, um das Projekt umzubenennen, und auf einen
  Grafcet-Reiter, um den Grafcet umzubenennen.

## Zwei Grafcets gleichzeitig {#two-grafcets-at-once}

Drücken Sie <kbd>Ctrl+\</kbd> (oder **Ansicht › Geteilte Ansicht**), um einen zweiten Grafcet neben
dem ersten anzuzeigen, oder klicken Sie mit der rechten Maustaste auf einen Reiter und wählen Sie
**Daneben öffnen** oder **Darunter öffnen**. Jeder Bereich hat oben eine eigene Grafcet-Auswahl.
Klicken Sie in einen Bereich, um darin zu arbeiten: Seine Kopfzeile wird hervorgehoben, und die
Reiter, die Tastatur und der Bereich Eigenschaften folgen ihm. Ziehen Sie die Leiste zwischen den
Bereichen, um ihre Größe zu ändern; × schließt einen Bereich.

## Eigenschaften und Bereiche {#properties-and-panels}

Das Diagramm nutzt das ganze Fenster; alles andere schwebt darüber und erscheint bei Bedarf. Wählen
Sie etwas aus, und seine **Eigenschaften** erscheinen links in einer Karte: Die Art eines Schritts
oder einer Aktion wählen Sie mit Bildschaltflächen, die ihr Symbol zeigen. Das × der Karte blendet
sie für diese Auswahl aus; ist nichts ausgewählt, zeigt die Eigenschaften-Schaltfläche neben dem
Projektnamen den Grafcet und das Projekt. Die Bereiche **Variablen**, **Probleme**,
**Zeitdiagramm** und **Gliederung** öffnen sich über die Schaltflächen unten rechts in einer Karte
rechts, die Sie an ihrem linken Rand verbreitern können. Während der Simulation schwebt der
Simulationsbereich (Eingänge, Werte, Protokoll, Szenarien) links.

Sind mehrere Elemente ausgewählt, zeigt die Karte eine Übersicht: wie viele Schritte, Transitionen,
Aktionen und Kommentare (ein Klick auf eine Anzahl behält nur diese) und die Auswahl als Baum in
Lesereihenfolge, jeder Schritt mit seinen ausgewählten Aktionen und Transitionen darunter (ein
Schritt, der nur ihretwegen erscheint, ist kursiv). Ein Klick auf eine Zeile wählt nur dieses
Element aus; <kbd>Ctrl</kbd>+Klick nimmt es aus der Auswahl.
