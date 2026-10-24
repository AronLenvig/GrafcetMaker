# Aktionen

Aktionen sind die Rechtecke rechts neben einem Schritt. Sie sagen, was das System tut, während oder
wenn der Schritt aktiv ist. Wählen Sie einen Schritt aus und drücken Sie <kbd>A</kbd>, um eine
hinzuzufügen; drücken Sie <kbd>A</kbd> erneut auf einer Aktion, um die nächste hinzuzufügen. Wählen
Sie ihre **Art** mit den Bildschaltflächen im Bereich **Eigenschaften**: Jede zeigt, wie das
Diagramm diese Art darstellt.

## Kontinuierlich wirkende Aktionen {#continuous-actions}

Die häufigste Art. Der Text ist der Name eines Ausgangs (oder einer internen Variablen), z. B.
`Pump`. Der Ausgang ist wahr, **solange** der Schritt aktiv ist, und falsch, sobald kein aktiver
Schritt ihn ansteuert.

Wählen Sie die Art **Bedingt**, um eine Bedingung hinzuzufügen (eine _Zuweisungsbedingung_): Ihr
Eingabefeld erscheint unter den Schaltflächen für die Art, und der Ausgang ist wahr, solange der
Schritt aktiv **und** die Bedingung wahr ist. Sie wird auf einer kurzen Linie über dem Rechteck
gezeichnet.

<!-- figure: continuous | Lamp, solange Schritt 4 aktiv ist; Horn nur, wenn zusätzlich alarm wahr ist -->

Zeitglieder in der Bedingung ergeben die verzögerten und zeitbegrenzten Aktionen anderer
Notationen:

- `5s/X4` – verzögert: Der Ausgang schaltet 5 s nach der Aktivierung von Schritt 4 ein.
- `/(5s/X4)` – zeitbegrenzt: nur in den ersten 5 s von Schritt 4 eingeschaltet.

> **Hinweis:** Schritte, die während einer transienten Entwicklung durchlaufen werden (siehe
> [GRAFCET-Grundlagen](grafcet-basics.md)), führen ihre kontinuierlich wirkenden Aktionen nicht
> aus.

## Speichernd wirkende Aktionen {#stored-actions}

Eine speichernd wirkende Aktion ändert einen Wert **einmal**, und der Wert bleibt erhalten, bis eine
andere Aktion ihn ändert. Ihr Text ist eine Zuweisung: `C := C + 1`, `Motor := 0`, `Speed := 2.5`.
Um eine BOOL-Variable auf TRUE zu setzen, genügt ihr Name: `Motor` bedeutet `Motor := 1`.

- **Bei Aktivierung** – ausgeführt, wenn der Schritt aktiv wird. Gezeichnet mit einem Pfeil **↑
  über** dem Rechteck.
- **Bei Deaktivierung** – ausgeführt, wenn der Schritt inaktiv wird. Gezeichnet mit einem Pfeil **↓
  unter** dem Rechteck.
- **Bei Ereignis** – ausgeführt jedes Mal, wenn das **Ereignis** eintritt, während der Schritt
  aktiv ist, z. B. `↑reset`. Gezeichnet mit einer **Fahne** oben rechts neben dem Ereignis. Geben
  Sie das Ereignis im Bereich Eigenschaften ein; eine Aktion bei Ereignis ohne Ereignis wird nie
  ausgeführt und als Problem gemeldet.

<!-- figure: stored | Speichernd bei Aktivierung (↑), bei Deaktivierung (↓) und bei einem Ereignis (Fahne) -->

Aktionen bei Aktivierung und bei Deaktivierung können ebenfalls eine Bedingung haben: Sie werden
nur ausgeführt, wenn diese in dem Moment wahr ist.

Speichernd wirkende Aktionen werden auch von Schritten ausgeführt, die während einer transienten
Entwicklung nur durchlaufen werden. Verwenden Sie sie zum Zählen, zum Speichern eines Werts
(`Motor := 1` in einem Schritt, `Motor := 0` in einem anderen) oder um sich zu merken, dass etwas
geschehen ist.

## Zwangssteuerungen {#forcing-orders}

Eine Zwangssteuerung gibt einem anderen Teil-Grafcet eine Situation vor, solange ihr Schritt aktiv
ist: `G2{8}` aktiviert in Grafcet G2 nur Schritt 8, `G2{*}` friert G2 in seiner aktuellen
Situation ein, `G2{}` deaktiviert alle seine Schritte, und `G2{INIT}` setzt ihn in seine
Anfangssituation zurück. Sie wird mit einem Doppelrahmen gezeichnet. Siehe
[Makroschritte, einschließende Schritte und Zwangssteuerung](hierarchy.md).

## Aktionen ohne Schritt {#actions-without-a-step}

Eine Aktion muss nicht zu einem Schritt gehören. Drücken Sie ohne Auswahl <kbd>A</kbd> (oder wählen
Sie das Werkzeug **Aktion**) und klicken Sie auf eine leere Stelle der Zeichenfläche: Die Aktion
wird für sich allein gezeichnet, ohne Verbindung, und ist **immer aktiv**.

- Eine kontinuierlich wirkende Aktion ohne Schritt setzt ihren Ausgang, sobald ihre
  **Zuweisungsbedingung** wahr ist, unabhängig von den Schritten: `Lamp` mit der Bedingung `a * b`
  ist die Logik `Lamp = a · b`. Ohne Bedingung ist der Ausgang immer wahr.
- Eine speichernd wirkende Aktion bei Ereignis wird bei jedem Eintreten des Ereignisses ausgeführt,
  z. B. zählt `C := C + 1` bei `↑pulse` Impulse. Bei Aktivierung wird sie einmal beim Start der
  Simulation ausgeführt. Bei Deaktivierung wird sie nie ausgeführt, da die Aktion nie deaktiviert
  wird.

Ziehen Sie eine Aktion, um sie zu verschieben: auf einen Schritt, um sie dort anzuhängen (der
Schritt leuchtet auf, und eine Markierung zeigt ihren Platz unter den Aktionen des Schritts), oder
auf eine leere Fläche, um sie ohne Schritt zu lassen.

## Mehrere Aktionen {#several-actions}

Ein Schritt kann beliebig viele Aktionen haben; sie werden nebeneinander gezeichnet. Ziehen Sie
eine entlang der Reihe, um ihre Reihenfolge zu ändern, oder verwenden Sie **Aktion nach links /
rechts verschieben** im Bereich Eigenschaften, wo ein ausgewählter Schritt seine Aktionen als
kompakte Zeilen auflistet (klicken Sie auf eine, um sie aufzuklappen). Löschen Sie eine Aktion mit
<kbd>Del</kbd>.

> **Achtung:** Wenn zwei Schritte, die gleichzeitig aktiv sein können, denselben Ausgang mit
> kontinuierlich wirkenden Aktionen ansteuern, ist das Ergebnis schwer zu lesen. GrafcetMaker warnt
> Sie davor.
