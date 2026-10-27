# Simulation

Der Simulator führt Ihren Grafcet genau nach den Regeln der IEC 60848 aus, sodass Sie ihn testen
können, bevor er auf eine SPS kommt.

## Starten und beenden {#start-and-stop}

Drücken Sie <kbd>F5</kbd> (oder **Simulieren › Simulation starten**). Das Diagramm wird gesperrt,
die Simulationssteuerung ersetzt oben die Werkzeuge, links erscheint der Bereich **Simulation**
(klappen Sie ihn mit seinem Pfeil ein, um mehr vom Diagramm zu sehen), und die Uhr beginnt zu
laufen. <kbd>Shift+F5</kbd> beendet die Simulation und kehrt zur Bearbeitung zurück.

## Eingänge ändern {#change-inputs}

Der Bereich **Simulation** listet die Eingänge auf:

- **BOOL**-Eingänge haben einen Schalter und eine Schaltfläche **Halten** für einen kurzen Druck
  (wie ein Taster; mit der Tastatur halten Sie darauf <kbd>Space</kbd> gedrückt).
- **INT**-, **REAL**- und **TIME**-Eingänge haben ein Wertfeld.

Sie können auch **auf einen BOOL-Eingang klicken, wo er im Diagramm steht**, in einer
Transitionsbedingung oder einer Bedingung (mit dem Finger antippen): Er schaltet ein oder aus. Der
Grafcet entwickelt sich, sobald sich ein Eingang ändert.

Während der Simulation zeigt jede **INT**-, **REAL**- oder **TIME**-Variable, die in einer
Transitionsbedingung oder einer Bedingung steht, ihren aktuellen Wert in einem kleinen Kasten über
ihrem Namen, und eine speichernd wirkende Aktion zeigt unter ihrem Kasten den Wert der Variable,
die sie schreibt. **Klicken Sie auf einen Wert** (oder tippen Sie ihn an), um einen neuen
einzugeben, und drücken Sie <kbd>Enter</kbd> (<kbd>Escape</kbd> bricht ab). Das gilt für Eingänge
ebenso wie für interne Variablen und Ausgänge, etwa um einen Zähler nahe an seiner Grenze zu testen.

**Zeigen Sie auf eine Transition** (oder tippen Sie sie an), um zu sehen, worauf sie wartet: die
Schritte, die zuerst aktiv sein müssen, oder die Terme ihrer Transitionsbedingung, die noch falsch
sind, mit der verbleibenden Zeit eines Zeitglieds wie `10s/X0`. Eine Flanke wie `↑start` wird
immer aufgeführt: Sie ist nur in dem Moment wahr, in dem sich ihr Eingang ändert.

## Zeit {#time}

Die Zeit im Simulator ist virtuell und deterministisch.

- <kbd>F5</kbd> hält die Uhr an und lässt sie wieder laufen. Zeitglieder (`5s/X2`) laufen nur,
  solange die Uhr läuft.
- Die Geschwindigkeit reicht von ×0.25 bis ×10. **Schnell** springt direkt vom Ablauf eines
  Zeitglieds zum nächsten.
- <kbd>F10</kbd> springt zum nächsten Ablauf eines Zeitglieds und führt diesen Zyklus aus.
- **⟲** startet neu aus der Anfangssituation.

Die Leiste zeigt die Zeit, die Zyklusnummer und wann das nächste Zeitglied abläuft. Die
Standardgeschwindigkeit finden Sie unter **Einstellungen › Simulation**.

## Was Sie im Diagramm sehen {#what-you-see-on-the-diagram}

- **Aktive Schritte** sind gefüllt und tragen eine Marke, darunter die Zeit, seit der sie aktiv
  sind.
- **Freigegebene Transitionen** haben eine Markierung ▶; Transitionen blinken auf, wenn sie
  schalten.
- **Wahre Signale** sind in Transitionsbedingungen und Bedingungen von Aktionen grün, fett und
  unterstrichen: eine eingeschaltete Variable, ein aktiver Schritt `Xn`, ein erfüllter Vergleich.
  Was nicht grün ist, ist das, worauf die Transition noch wartet. Unter einem NICHT-Strich zeigt die
  Farbe das Signal selbst: In `/a` ist `a` grün, wenn `a` eingeschaltet ist.
- **Kontinuierlich wirkende Aktionen**, die ausgeführt werden, zeigen ein ✓; **speichernd wirkende
  Aktionen** zeigen den aktuellen Wert ihrer Variablen.

## Ablaufprotokoll {#evolution-log}

Das Protokoll des Bereichs Simulation (eingeklappt: klicken Sie auf **Ablaufprotokoll**, um es zu
öffnen) listet jeden Zyklus mit seinem Auslöser und jede Iteration der Suche nach Stabilität auf:
geschaltete Transitionen, aktivierte und deaktivierte Schritte. Transiente Entwicklungen (Schritte,
die ohne Halt durchlaufen werden) sind dort sichtbar. Klicken Sie auf einen Zyklus, um das
Diagramm so zu sehen, wie es in diesem Moment war.

## Mehrere Grafcets beobachten {#watching-several-grafcets}

In einer geteilten Ansicht (<kbd>Ctrl+\</kbd>) zeigen beide Bereiche die Simulation live: Beobachten
Sie einen Produktions-Grafcet und seinen Sicherheits-Grafcet oder einen Makroschritt und seine
Expansion nebeneinander.

## Zeitdiagramm {#chronogram}

Der Bereich **Zeitdiagramm** (seine Schaltfläche ist unten rechts) zeichnet jede Variable und die
Schritte des geöffneten Grafcets über der Zeit. Klicken oder ziehen Sie darin, um in der Zeit
zurückzugehen: Das Diagramm folgt. **Zurück zu live** kehrt in die Gegenwart zurück.

## Szenarien {#scenarios}

Um einen Test genau zu wiederholen, nehmen Sie ihn auf:

1. Klicken Sie auf **Aufnehmen**: Die Simulation startet neu und zeichnet jede Änderung eines
   Eingangs mit ihrer Zeit auf.
2. Führen Sie Ihren Test durch, beenden Sie dann die Aufnahme und benennen Sie das Szenario. Es
   wird im Projekt gespeichert.
3. **Abspielen** startet die Simulation neu und spielt das Szenario ab.

## Wenn der Grafcet nie zur Ruhe kommt {#when-the-grafcet-never-settles}

Wenn Transitionen sich immer weiter gegenseitig schalten (zum Beispiel eine Rückführung, bei der
jede Transitionsbedingung wahr ist), wird der Ablauf nie stabil. Der Simulator hält nach 1000
Iterationen an und meldet eine **transiente Schleife** unter Probleme. Fügen Sie eine Bedingung
hinzu (oft eine Flanke `↑a`), damit die Schleife nicht endlos laufen kann. Siehe
[Problembehebung](troubleshooting.md).
