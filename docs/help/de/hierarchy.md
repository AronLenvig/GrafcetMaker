# Makroschritte, einschließende Schritte und Zwangssteuerung

Große Anwendungen sind leichter zu lesen, wenn sie aufgeteilt werden. GRAFCET bietet dafür drei
Mittel, und alle stehen in GrafcetMaker zur Verfügung.

## Mehrere Teil-Grafcets {#several-partial-grafcets}

Ein Projekt kann mehrere **Teil-Grafcets** enthalten, einen pro Reiter über der Zeichenfläche, z. B.
_G1_ für den Produktionszyklus und _G2_ für die Sicherheitslogik. Sie laufen alle gleichzeitig und
können einander über Schrittvariablen beobachten (`X21` in G1 ist wahr, solange Schritt 21 von G2
aktiv ist).

- Klicken Sie auf **+** neben den Reitern, um einen hinzuzufügen. Seine Schrittnummern beginnen beim
  nächsten freien Zehner (20, 30…), damit Verweise `Xn` eindeutig bleiben.
- Doppelklicken Sie auf einen Reiter (oder drücken Sie darauf <kbd>F2</kbd>), um ihn umzubenennen;
  ziehen Sie ihn seitlich, um die Reihenfolge zu ändern; drücken Sie darauf <kbd>Del</kbd>, um ihn
  zu löschen. <kbd>Ctrl</kbd>+Klick oder <kbd>Shift</kbd>+Klick wählt mehrere Reiter aus, um sie
  gemeinsam zu löschen. Ein Rechtsklick auf einen Reiter bietet mehr. Viele Reiter lassen sich mit
  dem Mausrad oder den Schaltflächen ‹ › durchblättern.

## Makroschritte {#macro-steps}

Ein **Makroschritt** steht für einen ausführlichen Ablauf, der auf einem eigenen Blatt gezeichnet
ist, seine **Expansion**. Er wird als Schritt mit zwei waagerechten Linien gezeichnet.

<!-- figure: macro | Ein Makroschritt im Hauptablauf -->

1. Wählen Sie einen Schritt aus und stellen Sie im Bereich Eigenschaften seine **Art** auf
   _Makroschritt_ (oder **Bearbeiten › In Makroschritt umwandeln**).
2. Ein neuer Reiter öffnet sich mit der Expansion: ein Eingangsschritt **E** und ein
   Ausgangsschritt **S**, verbunden durch eine Transition. Zeichnen Sie den ausführlichen Ablauf
   dazwischen.
3. Doppelklicken Sie auf den Makroschritt (oder drücken Sie <kbd>Alt+↓</kbd>), um seine Expansion
   zu öffnen; <kbd>Alt+↑</kbd> führt zum Makroschritt zurück.

Wird der Makroschritt aktiviert, wird sein Eingangsschritt aktiv; die Transition nach dem
Makroschritt ist erst freigegeben, wenn der Ausgangsschritt aktiv ist. Der Makroschritt gilt als
aktiv, solange ein beliebiger Schritt seiner Expansion aktiv ist.

## Einschließende Schritte {#enclosing-steps}

Ein **einschließender Schritt** enthält einen ganzen Grafcet, den **eingeschlossenen Grafcet**, der
nur läuft, solange der einschließende Schritt aktiv ist. Verwenden Sie ihn für Betriebsarten:
_Automatik_, _Hand_, _Einrichten_. Er wird als Schritt mit zwei senkrechten Linien gezeichnet.

1. Stellen Sie die **Art** des Schritts auf _Einschließender Schritt_ (oder **Bearbeiten › In
   einschließenden Schritt umwandeln**).
2. Ein neuer Reiter enthält den eingeschlossenen Grafcet. Die dort mit `*` markierten Schritte
   werden aktiv, wenn der einschließende Schritt aktiviert wird.
3. Wird der einschließende Schritt verlassen, wird jeder Schritt des eingeschlossenen Grafcets
   deaktiviert.

Reiter von Expansionen und eingeschlossenen Grafcets tragen ein Kennzeichen **M** oder **E**.

## Zwangssteuerungen {#forcing-orders}

Eine **Zwangssteuerung** ist eine Aktion, die einem anderen Teil-Grafcet eine Situation vorgibt,
solange ihr Schritt aktiv ist. Der zwangsgesteuerte Grafcet entwickelt sich in dieser Zeit nicht
weiter.

| Zwangssteuerung | Wirkung auf G2                            |
| --------------- | ----------------------------------------- |
| `G2{8}`         | nur Schritt 8 ist aktiv                   |
| `G2{8, 9}`      | nur die Schritte 8 und 9 sind aktiv       |
| `G2{*}`         | in seiner aktuellen Situation eingefroren |
| `G2{}`          | kein Schritt ist aktiv                    |
| `G2{INIT}`      | zurück in seine Anfangssituation          |

Die Zwangssteuerung ist der normgerechte Weg, Not-Halt und Betriebsartenwechsel zu beschreiben: Ein
Sicherheits-Grafcet zwingt zum Beispiel den Produktions-Grafcet in seine Anfangssituation. Ein
Grafcet kann sich nicht selbst zwangssteuern, und zwei Grafcets können sich nicht gegenseitig
zwangssteuern.

## Prüfungen {#checks}

GrafcetMaker prüft, dass jeder Makroschritt und jeder einschließende Schritt einen eigenen
Unter-Grafcet der richtigen Art hat, dass Expansionen genau einen Eingangs- und einen
Ausgangsschritt haben und dass Zwangssteuerungen auf vorhandene Grafcets und Schritte verweisen.
