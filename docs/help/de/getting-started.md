# Erste Schritte

In dieser Einführung zeichnen Sie die Steuerung eines kleinen Tanks: Drückt der Bediener **start**,
füllt eine Pumpe den Tank, bis er **full** (voll) ist, dann leert ein Ventil ihn, bis er **empty**
(leer) ist, und die Anlage wartet auf den nächsten Start. Das dauert etwa zehn Minuten.

<!-- figure: sequence | Der Grafcet, den Sie zeichnen werden -->

## 1. Orientierung {#1-find-your-way-around}

- Die **Zeichenfläche** füllt das Fenster: Dort zeichnen Sie. Alles andere schwebt darüber.
- **Oben**: links das Hauptmenü ☰ und der Projektname; in der Mitte die Werkzeuge (auswählen,
  Ansicht verschieben, Schritt, Transition, Kommentar oder Aktion platzieren); rechts die Probleme
  und **Simulieren**.
- **Unter den Werkzeugen**: Die Hinweise zeigen, was Sie gerade tun können. Achten Sie während
  dieser Einführung darauf.
- **Links**: Die **Eigenschaften** des ausgewählten Elements erscheinen in einer Karte, solange es
  ausgewählt ist.
- **Unten**: links Zoom, Rückgängig und Wiederholen; in der Mitte ein Reiter pro Grafcet; rechts
  die Schaltflächen **Variablen**, **Probleme**, **Zeitdiagramm** und **Gliederung**. Jede öffnet
  ihren Bereich rechts im Fenster.

Ein neues Projekt enthält bereits den Grafcet **G1** mit dem Schritt **0**. Sein Doppelquadrat
zeigt, dass er ein **Anfangsschritt** ist: Er ist aktiv, wenn die Anlage startet.

## 2. Die erste Transition und den ersten Schritt hinzufügen {#2-add-the-first-transition-and-step}

1. Klicken Sie auf Schritt **0**, um ihn auszuwählen.
2. Drücken Sie <kbd>Enter</kbd>. Darunter erscheinen eine Transition und Schritt **1**, und neben
   der Transition öffnet sich ein Eingabefeld für ihre **Transitionsbedingung**, die Bedingung zum
   Weiterschalten.
3. Geben Sie `start` ein und drücken Sie <kbd>Enter</kbd>.

`start` ist noch nicht deklariert: Während Sie tippen, zeigt das Eingabefeld **Neue Variable
start: BOOL, Eingang**, und <kbd>Enter</kbd> fügt sie der Variablenliste hinzu (eine Meldung
bestätigt das).

## 3. Eine Aktion hinzufügen {#3-add-an-action}

Schritt 1 ist noch ausgewählt. Drücken Sie <kbd>A</kbd>, geben Sie `Pump` ein und drücken Sie
<kbd>Enter</kbd>: `Pump` wird als BOOL-Ausgang angelegt. Die Pumpe läuft jetzt, solange Schritt 1
aktiv ist.

## 4. Den Ablauf fortsetzen {#4-continue-the-sequence}

1. Drücken Sie erneut <kbd>Enter</kbd>: Nach Schritt 1 werden eine Transition und Schritt **2**
   hinzugefügt. Geben Sie `full` als Transitionsbedingung ein und legen Sie den Eingang an.
2. Drücken Sie <kbd>A</kbd> und fügen Sie die Aktion `Valve` hinzu (legen Sie den Ausgang an).

## 5. Die Rückführung schließen {#5-close-the-loop}

Der Zyklus muss zu Schritt 0 zurückkehren, wenn der Tank leer ist.

1. Drücken Sie bei ausgewähltem Schritt **2** die Taste <kbd>L</kbd>. Die Hinweise zeigen **Klick
   auf einen Schritt – dorthin zurückführen**.
2. Klicken Sie auf Schritt **0**. Unter Schritt 2 wird eine Transition mit einer Verbindung nach
   oben zu Schritt 0 hinzugefügt; sie trägt einen Pfeil, weil sie nach oben führt.
3. Geben Sie `empty` als ihre Transitionsbedingung ein, drücken Sie <kbd>Enter</kbd> und legen Sie
   den Eingang an.

Ihr Plan entspricht jetzt der Grafik oben auf dieser Seite.

## 6. Prüfen {#6-check-it}

Sehen Sie sich die Zähler oben rechts an: Ein roter Kreis zählt **Fehler**, ein oranges Dreieck
**Warnungen**. Klicken Sie darauf, um die Liste **Probleme** zu öffnen. Jedes Problem sagt, was
falsch ist und wo; klicken Sie darauf, um zum Element zu springen, und verwenden Sie die
Korrekturschaltfläche, wenn es eine gibt. Ein korrekter Plan hat keine Fehler. Die Bedeutung jeder
Meldung finden Sie unter [Problembehebung](troubleshooting.md).

## 7. Simulieren {#7-simulate}

1. Drücken Sie <kbd>F5</kbd>. Das Diagramm wird gesperrt, und links erscheint der Bereich
   **Simulation**. Schritt 0 trägt eine Marke: Er ist aktiv.
2. Schalten Sie im Bereich **start** ein. Die Transition schaltet: Schritt 1 wird aktiv, und seine
   Aktion **Pump** zeigt ein Häkchen ✓.
3. Schalten Sie **start** aus und dann **full** ein: Schritt 2 wird aktiv, und **Valve** schaltet
   ein.
4. Schalten Sie **full** aus und **empty** ein: Der Grafcet kehrt zu Schritt 0 zurück.
5. Öffnen Sie den Reiter **Zeitdiagramm**, um jedes Signal über der Zeit zu sehen. Drücken Sie
   <kbd>Shift+F5</kbd>, um die Simulation zu beenden.

Was passiert, wenn **start** eingeschaltet bleibt, während der Tank leer wird? Probieren Sie es
aus: Sobald Schritt 0 wieder aktiv ist, schaltet seine Transition erneut. Genau so verhält sich der
GRAFCET, wie er gezeichnet ist. Verwenden Sie eine steigende Flanke `↑start`, um nur auf einen neuen
Tastendruck zu reagieren (tippen Sie `^start`, siehe
[Transitionsbedingungen schreiben](expressions.md)).

## 8. Speichern {#8-save}

Ihre Arbeit wird nach jeder Änderung automatisch im Browser gespeichert. Für eine Datei, die Sie
aufbewahren, versenden oder unter Versionsverwaltung stellen können, drücken Sie <kbd>Ctrl+S</kbd>:
Das Projekt wird als `<name>.grafcet.json` gespeichert. Doppelklicken Sie oben auf den
Projektnamen, um es umzubenennen.

## Wie geht es weiter? {#where-next}

- [GRAFCET-Grundlagen](grafcet-basics.md) erklärt die Regeln hinter dem, was Sie gerade gesehen
  haben.
- [Diagramme bearbeiten](editing.md) zeigt Parallel- und Alternativverzweigungen und weitere
  schnelle Griffe.
- [Simulation](simulation.md) behandelt Zeitglieder, das Ablaufprotokoll und Szenarien.
