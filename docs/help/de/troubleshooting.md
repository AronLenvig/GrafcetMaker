# Problembehebung

GrafcetMaker prüft Ihr Projekt, während Sie arbeiten. Die Zähler oben rechts zeigen die Anzahl der
**Fehler** (rot) und **Warnungen** (orange); klicken Sie darauf, um die Liste **Probleme** zu
öffnen. Klicken Sie auf ein Problem, um zum Element zu springen, und verwenden Sie seine
Korrekturschaltfläche, wenn es eine gibt. Elemente mit einem Problem tragen im Diagramm außerdem
ein Kennzeichen: Fahren Sie mit der Maus darüber, um die Details zu sehen.

## Fehler {#errors}

**Grafcet G1 hat keinen Anfangsschritt.** Nichts kann je aktiv werden. Wählen Sie den ersten
Schritt aus und verwenden Sie die Korrektur **Schritt … zum Anfangsschritt machen**, oder stellen
Sie seine Art auf _Anfangsschritt_.

**Mehrere Schritte haben dieselbe Nummer.** Nummern müssen in einem Grafcet eindeutig sein, sonst
wäre `Xn` mehrdeutig. Verwenden Sie **Schritte neu nummerieren** oder ändern Sie eine Nummer mit
<kbd>F2</kbd>.

**Leere Transitionsbedingung.** Jede Transition braucht eine Bedingung. Verwenden Sie `1` für eine
Transition, die immer wahr ist (die Korrektur erledigt das für Sie).

**Unbekannte Variable.** Der Name ist nicht deklariert (eine anderswo geschriebene Datei oder eine
gelöschte Variable). Namen, die Sie in eine Transitionsbedingung oder eine Aktion tippen, werden
für Sie angelegt; für die anderen legen Sie die Variable mit der Korrektur an oder wählen den
vorgeschlagenen Namen, wenn es ein Tippfehler ist.

**Probleme in Ausdrücken** (unerwartetes Zeichen, fehlende Klammer…). Der Problemkasten unter dem
Feld markiert die Stelle und gibt einen Hinweis. Ein häufiger Fall: `/` bedeutet NICHT vor einer
Bedingung; schreiben Sie also `a * /b` für „a und nicht b“. Siehe
[Transitionsbedingungen schreiben](expressions.md).

**Eine Aktion weist einem Eingang etwas zu.** Eingänge kommen vom Prozess und können nicht
geschrieben werden. Ändern Sie die Richtung der Variablen oder verwenden Sie eine andere Variable.

**Eine Zwangssteuerung verweist auf einen fehlenden Grafcet oder Schritt.** Prüfen Sie den Namen
des Grafcets und die Schrittnummern in der Zwangssteuerung.

**Die Zwangssteuerungen bilden einen Kreis.** Ein Grafcet kann keinen Grafcet zwangssteuern, der
ihn selbst zwangssteuert, weder direkt noch über andere. Entfernen Sie eine der Zwangssteuerungen,
oder lassen Sie beide von einem dritten Grafcet zwangssteuern.

**Makroschritt … hat keinen Expansions-Grafcet** (oder **Der einschließende Schritt … hat keinen
eingeschlossenen Grafcet**). Sein Unter-Grafcet wurde gelöscht. Stellen Sie die Art des Schritts
auf _Schritt_ und wieder zurück auf _Makroschritt_ (oder _Einschließender Schritt_), um einen
neuen zu erhalten, oder lassen Sie ihn ein normaler Schritt bleiben.

**Grafcet … wird von mehreren Schritten verwendet.** Jeder Makroschritt und jeder einschließende
Schritt braucht seinen eigenen Unter-Grafcet. Stellen Sie einen der Schritte auf _Schritt_ und
wieder zurück: Er erhält einen eigenen Unter-Grafcet.

## Warnungen {#warnings}

**Schritt … kann nie aktiv werden.** Kein Weg führt von einem Anfangsschritt zu ihm. Verbinden Sie
ihn oder löschen Sie ihn.

**Schritt … hat keine nachfolgende Transition.** Einmal aktiv, bleibt er für immer aktiv. Meist
fehlt eine Rückführung (<kbd>L</kbd>).

**Die Alternativzweige schließen sich nicht gegenseitig aus.** Beide Transitionsbedingungen können
gleichzeitig wahr sein und würden beide Zweige aktivieren. Formulieren Sie sie sich ausschließend,
z. B. `a` und `/a * b`, oder verwenden Sie die Korrektur **„…“ Vorrang geben**.

**Mögliche endlose transiente Entwicklung.** Eine Schleife von Transitionen könnte gleichzeitig
wahr sein, sodass der Grafcet nie zur Ruhe käme. Fügen Sie eine Bedingung hinzu, oft eine Flanke
(`↑start`), die nicht wahr bleiben kann.

**Ausgang, der von kontinuierlich wirkenden Aktionen gleichzeitig aktiver Schritte gesetzt wird.**
Zwei Parallelzweige steuern denselben Ausgang an. Steuern Sie ihn von einer Stelle aus an oder
verwenden Sie speichernd wirkende Aktionen.

**Eine Aktion ohne Schritt wirkt speichernd bei Deaktivierung.** Ohne Schritt ist die Aktion immer
aktiv und wird nie deaktiviert, also wird sie nie ausgeführt. Hängen Sie sie an einen Schritt an
oder ändern Sie ihre Art.

**Ausgang, der von einer Aktion ohne Schritt und von einer anderen Aktion gesetzt wird.** Der
Ausgang ist wahr, sobald eine von ihnen wahr ist. Prüfen Sie, ob Sie das so wollen.

**Speichernd bei einem Ereignis, aber ohne Ereignis.** Geben Sie das Ereignis (z. B. `↑b`) im
Bereich Eigenschaften ein.

**Die bedingte Aktion … hat noch keine Bedingung.** Sie wirkt wie eine kontinuierlich wirkende
Aktion, bis Sie ihre Bedingung im Bereich Eigenschaften eingeben.

**Speichernd wirkende Aktionen am Makroschritt … werden ignoriert.** Ein Makroschritt ist über
seine Expansion aktiv: Legen Sie die speichernd wirkenden Aktionen auf einen Schritt der
Expansion.

**Ein Grafcet wird in die leere Situation gezwungen, und nichts aktiviert seine Schritte wieder.**
Eine Zwangssteuerung wie `G2{}` deaktiviert alle Schritte von G2, und nichts aktiviert sie wieder.
Verwenden Sie `G2{INIT}`, um G2 in seiner Anfangssituation neu zu starten.

**Die Expansion … wird nicht verwendet** (oder **Der eingeschlossene Grafcet … wird nicht
verwendet**). Weder ein Makroschritt noch ein einschließender Schritt verweist darauf. Löschen Sie
den zugehörigen Reiter, wenn Sie ihn nicht mehr brauchen.

**Die Expansion braucht genau einen Eingangsschritt und einen Ausgangsschritt.** In einer
Makroschritt-Expansion hat der Eingangsschritt keine Transition darüber und der Ausgangsschritt
keine darunter.

## Information {#information}

**Die Variable … wird nicht verwendet.** Sie ist deklariert, aber kein Ausdruck verwendet sie.
Löschen Sie sie mit der Korrektur oder behalten Sie sie für später.

## Weitere Fragen {#other-questions}

**Die Simulation wurde mit einer transienten Schleife angehalten.** Siehe die Warnung oben: Der
Simulator hält nach 1000 Iterationen ohne Stabilität an, zu der angezeigten Zeit.

**Mein Zeitglied läuft nicht.** Zeitglieder laufen nur, solange die Uhr läuft: Drücken Sie
<kbd>F5</kbd> zum Ausführen oder <kbd>F10</kbd>, um zum nächsten Zeitglied zu springen.

**Eine Transition schaltet immer wieder.** Bleibt ihre Transitionsbedingung wahr, läuft der Grafcet
so schnell er kann im Kreis. Verwenden Sie eine Flanke `↑a`, um einmal pro Tastendruck zu
reagieren.

**Meine Arbeit ist verloren.** Sehen Sie unter **Datei › Lokaler Verlauf** nach: Dort werden
Versionen im Browser aufbewahrt. Nach einem Neuladen oder einem Absturz öffnet GrafcetMaker Ihr
letztes Projekt automatisch wieder, einschließlich ungespeicherter Änderungen.

**Die Datei lässt sich nicht öffnen.** GrafcetMaker öffnet seine eigenen `.grafcet.json`-Dateien
und grafcet.io-Dateien (`.grafcetio`); die Meldung sagt, warum eine Datei abgelehnt wurde. Eine
Datei, die mit einer neueren Version von GrafcetMaker gespeichert wurde, braucht diese neuere
Version.
