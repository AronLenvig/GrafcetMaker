# GRAFCET-Grundlagen

GRAFCET (IEC 60848) beschreibt das Verhalten einer Ablaufsteuerung – einer Maschine, eines
Prozesses, einer Ampel – als Folge von **Schritten**, die durch **Transitionen** verbunden sind. Es
ist die Spezifikationssprache, auf der die Ablaufsprache SFC der SPS (IEC 61131-3) beruht.

<!-- figure: anatomy | Die Elemente eines Grafcets -->

## Schritte {#steps}

Ein **Schritt** ist ein stabiler Zustand des Systems: _Warten_, _Füllen_, _Bohren_. Er wird als
Quadrat mit seiner Nummer gezeichnet. Zu jedem Zeitpunkt ist ein Schritt entweder **aktiv** oder
**inaktiv**; die Menge der aktiven Schritte ist die **Situation** des Grafcets.

- Ein **Anfangsschritt** (Doppelquadrat) ist aktiv, wenn das System startet. Ein Grafcet braucht
  mindestens einen.
- Die Variable `X3` ist wahr, solange Schritt 3 aktiv ist. Sie können sie in
  Transitionsbedingungen und Bedingungen verwenden.

## Transitionen und Transitionsbedingungen {#transitions-and-receptivities}

Eine **Transition** (kurzer waagerechter Strich) verbindet Schritte. Ihre
**Transitionsbedingung**, die neben ihr steht, ist die Bedingung zum Weiterschalten: ein Eingang
(`start`), eine Verknüpfung (`start * /door`), eine Flanke (`↑b`), eine Zeitbedingung (`5s/X2`)
oder ein Vergleich (`level >= 80`). Die Transitionsbedingung `1` ist immer wahr.

- Eine Transition ist **freigegeben**, wenn alle Schritte unmittelbar darüber aktiv sind.
- Eine freigegebene Transition **schaltet**, sobald ihre Transitionsbedingung wahr ist.

## Aktionen {#actions}

Die Rechtecke rechts neben einem Schritt sind seine **Aktionen**: was das System tut, solange der
Schritt aktiv ist, z. B. _Pumpe einschalten_. Eine **kontinuierlich wirkende Aktion** nennt einen
Ausgang, der wahr ist, solange der Schritt aktiv ist. Speichernd wirkende Aktionen ändern einen
Wert einmal: wenn ein Schritt aktiviert oder deaktiviert wird oder wenn ein Ereignis eintritt.
Siehe [Aktionen](actions.md).

## Die fünf Ablaufregeln {#the-five-evolution-rules}

Diese Regeln der IEC 60848 legen fest, wie sich ein Grafcet entwickelt. Der Simulator wendet sie
genau an.

1. **Anfangssituation**: Beim Start sind die Anfangsschritte aktiv.
2. **Schaltbedingung**: Eine Transition schaltet, wenn sie freigegeben und ihre
   Transitionsbedingung wahr ist.
3. **Schalten**: Das Schalten einer Transition aktiviert alle Schritte unmittelbar darunter und
   deaktiviert alle Schritte unmittelbar darüber.
4. **Gleichzeitiges Schalten**: Alle Transitionen, die zum selben Zeitpunkt schalten können,
   schalten gleichzeitig.
5. **Gleichzeitig aktiviert und deaktiviert**: Ein Schritt, der gleichzeitig aktiviert und
   deaktiviert wird, bleibt aktiv.

Nach einer Änderung eines Eingangs werden die Regeln immer wieder angewendet, bis keine Transition
mehr schalten kann: die **Suche nach einer stabilen Situation**. Schritte, die bei dieser Suche
aktiviert und gleich wieder verlassen werden, sind **instabil** (transient): Ihre kontinuierlich
wirkenden Aktionen werden nicht ausgeführt, ihre speichernd wirkenden Aktionen schon.

## Einen Weg wählen: ODER {#choosing-between-paths-or}

Folgen auf einen Schritt mehrere Transitionen, nimmt der Grafcet den Weg, dessen
Transitionsbedingung wahr ist: eine **Alternativverzweigung**, gezeichnet mit einer einfachen
waagerechten Linie (**ODER-Verzweigung**). Die Wege treffen sich wieder an einer einfachen Linie
(**ODER-Zusammenführung**).

<!-- figure: or | ODER-Verzweigung und -Zusammenführung -->

Formulieren Sie die Transitionsbedingungen **gegenseitig ausschließend** (sie können nie
gleichzeitig wahr sein), hier `a` und `/a * b`. Sonst würden beide Wege zugleich genommen.
GrafcetMaker warnt Sie, wenn es nicht beweisen kann, dass sich alternative Transitionsbedingungen
ausschließen, und bietet an, einem Zweig Vorrang zu geben.

## Mehreres gleichzeitig tun: UND {#doing-things-at-the-same-time-and}

Folgen auf eine Transition mehrere Schritte, werden sie alle gemeinsam aktiviert:
**Parallelverzweigungen**, gezeichnet mit einer Doppellinie (**UND-Verzweigung**). Die Zweige enden
ebenfalls an einer Doppellinie (**UND-Zusammenführung**): Die Transition darunter ist erst
freigegeben, wenn der letzte Schritt jedes Zweigs aktiv ist; sie wartet also, bis alle Zweige
fertig sind.

<!-- figure: and | UND-Verzweigung und -Zusammenführung -->

## Rückführungen {#loops}

Eine Verbindung nach oben, gezeichnet mit einem Pfeil, führt zu einem früheren Schritt zurück: der
übliche Weg, einen Zyklus zu wiederholen. Drücken Sie <kbd>L</kbd> auf einem Schritt und klicken
Sie dann auf den Schritt, zu dem es zurückgehen soll.

## Größere Anwendungen {#bigger-applications}

- Ein Projekt kann mehrere **Teil-Grafcets** enthalten, die gemeinsam laufen, z. B. einen für den
  Zyklus und einen für die Sicherheit. Sie sehen die Schritte der anderen über `Xn`.
- Ein **Makroschritt** steht für einen ausführlichen Ablauf, der auf einem eigenen Blatt
  gezeichnet ist, seine **Expansion**.
- Ein **einschließender Schritt** enthält einen ganzen Grafcet, der nur läuft, solange er aktiv
  ist.
- Eine **Zwangssteuerung** gibt einem anderen Grafcet eine Situation vor, z. B. bei einem Not-Halt.

Siehe [Makroschritte, einschließende Schritte und Zwangssteuerung](hierarchy.md).

## Mehr erfahren {#learn-more}

- [Transitionsbedingungen schreiben](expressions.md) – die vollständige Syntax der Ausdrücke.
- [Glossar](glossary.md) – alle genormten Begriffe an einem Ort.
- Wie GrafcetMaker jede Regel genau auslegt, ist in `docs/semantics.md` im Quellcode-Repository
  dokumentiert.
