# GRAFCET einfach erklärt: der Leitfaden zur DIN EN 60848

**GRAFCET** ist eine grafische Sprache, die das Verhalten einer Ablaufsteuerung beschreibt: einer
Maschine, einer Fertigungslinie, einer Ampel. Ein GRAFCET-Plan besteht aus **Schritten** (was das
System gerade tut), die durch **Transitionen** (die Bedingungen zum Weiterschalten) verbunden sind.
GRAFCET ist international als **IEC 60848** genormt, in Deutschland als **DIN EN 60848**, und ist
der Ursprung der Ablaufsprache SFC der SPS.

Dieser Leitfaden erklärt alle Elemente und Regeln der Norm mit Grafiken und Beispielen. Alle
Grafiken wurden mit [GrafcetMaker](app:) gezeichnet, einem kostenlosen GRAFCET-Editor und
-Simulator, der im Browser läuft: Öffnen Sie die Beispiele und verfolgen Sie den Ablauf Schritt für
Schritt.

## Wofür GRAFCET steht

GRAFCET steht für _GRAphe Fonctionnel de Commande Étape-Transition_, französisch für
„funktionaler Steuerungsgraph mit Schritten und Transitionen“. Die Sprache wurde 1977 von einer
Arbeitsgruppe der AFCET, der französischen Gesellschaft für Kybernetik, zusammen mit der ADEPA,
der französischen Agentur für Produktionsautomatisierung, vorgeschlagen. Sie beruht auf den
Petri-Netzen und sollte klar und technologieunabhängig festhalten, was eine Steuerung tun muss,
bevor die erste Zeile SPS-Code entsteht.

- **1982**: französische Norm NF C03-190.
- **1988**: internationale Norm IEC 848, _Preparation of function charts for control systems_.
- **2002**: IEC 60848 Ausgabe 2, _GRAFCET-Spezifikationssprache für Funktionspläne der
  Ablaufsteuerung_.
- **2013**: IEC 60848 Ausgabe 3, die aktuelle Ausgabe, in Europa als EN 60848 und in Deutschland
  als DIN EN 60848 veröffentlicht.

GRAFCET wird in Berufsschulen (zum Beispiel für Mechatroniker und Elektroniker für
Automatisierungstechnik), an Technikerschulen, Hochschulen und Universitäten unterrichtet und ist
Prüfungsstoff in vielen Abschlussprüfungen. Üblicherweise bezeichnet _GRAFCET_ die Sprache und
_ein Grafcet_ einen einzelnen Plan.

## Die Elemente eines Grafcets

<!-- figure: anatomy | Die Elemente eines Grafcets -->

- Ein **Schritt** ist ein Quadrat mit einer Nummer. Er steht für einen stabilen Zustand des
  Systems: _Warten_, _Füllen_, _Bohren_. Jeder Schritt ist zu jedem Zeitpunkt entweder **aktiv**
  oder **inaktiv**; die Menge der aktiven Schritte ist die **Situation** des Grafcets. Die
  Schrittvariable `X1` ist wahr, solange Schritt 1 aktiv ist.
- Ein **Anfangsschritt**, als Doppelquadrat gezeichnet, ist beim Start aktiv. Jeder Grafcet braucht
  mindestens einen.
- Eine **Transition** ist ein kurzer waagerechter Strich auf einer Verbindung. Sie liegt immer
  zwischen Schritten: Zwei Schritte werden nie direkt verbunden, zwei Transitionen auch nicht.
- Die **Transitionsbedingung** steht neben der Transition, zum Beispiel `start` oder `druck > 6`.
  Die Transitionsbedingung `1` ist immer wahr.
- **Wirkverbindungen** verbinden Schritte und Transitionen. Sie werden von oben nach unten gelesen;
  eine Verbindung nach oben trägt einen Pfeil.
- **Aktionen** sind Rechtecke rechts neben einem Schritt: Was das System tut, solange der Schritt
  aktiv ist, zum Beispiel _Motor einschalten_.

## Die fünf Ablaufregeln

Die IEC 60848 legt mit fünf Regeln genau fest, wie sich ein Grafcet entwickelt.

1. **Anfangssituation**: Beim Start sind die Anfangsschritte aktiv und alle anderen inaktiv.
2. **Schalten einer Transition**: Eine Transition ist **freigegeben**, wenn alle unmittelbar
   vorangehenden Schritte aktiv sind. Sie **schaltet**, wenn sie freigegeben und ihre
   Transitionsbedingung wahr ist.
3. **Entwicklung der aktiven Schritte**: Das Schalten einer Transition aktiviert alle unmittelbar
   nachfolgenden Schritte und deaktiviert alle unmittelbar vorangehenden Schritte.
4. **Gleichzeitiges Schalten**: Alle Transitionen, die zum selben Zeitpunkt schalten können,
   schalten gleichzeitig.
5. **Gleichzeitiges Aktivieren und Deaktivieren**: Ein Schritt, der gleichzeitig aktiviert und
   deaktiviert wird, bleibt aktiv.

Ändert sich ein Eingang, werden die Regeln mit denselben Eingangswerten so lange wiederholt, bis
keine Transition mehr schalten kann: die **Suche nach einer stabilen Situation**. Ein Schritt, der
dabei aktiviert und gleich wieder verlassen wird, ist ein **instabiler Schritt** (transiente
Entwicklung): Seine kontinuierlich wirkenden Aktionen werden nicht ausgeführt, seine speichernd
wirkenden Aktionen schon. Sind zum Beispiel die Transitionsbedingungen unter Schritt 1 und 2 schon
wahr, wenn Schritt 1 aktiv wird, läuft der Grafcet über Schritt 2 direkt bis Schritt 3, und die
Ausgänge von Schritt 2 werden nie eingeschaltet.

## Transitionsbedingungen: Verknüpfungen, Flanken und Zeiten

Eine Transitionsbedingung ist ein logischer Ausdruck aus Eingängen, internen Variablen,
Schrittvariablen und Zeit. Die übliche Schreibweise und die Eingabe in GrafcetMaker:

| Schreibweise      | Bedeutung                                                           | Eingabe in GrafcetMaker |
| ----------------- | ------------------------------------------------------------------- | ----------------------- |
| a · b             | a UND b                                                             | `a * b`                 |
| a + b             | a ODER b                                                            | `a + b`                 |
| a mit Überstrich  | NICHT a                                                             | `/a`                    |
| ↑a                | steigende Flanke: wahr in dem Moment, in dem a wahr wird            | `↑a` oder `RE a`        |
| ↓a                | fallende Flanke: wahr in dem Moment, in dem a falsch wird           | `↓a` oder `FE a`        |
| X3                | Schritt 3 ist aktiv                                                 | `X3`                    |
| 5 s/X2            | wahr 5 s nach der Aktivierung von Schritt 2                         | `5s/X2`                 |
| t1/a/t2           | wahr t1 nachdem a wahr wird, wieder falsch t2 nachdem a falsch wird | `2s/a/1s`               |
| [fuellstand > 80] | Vergleich eines Zahlenwerts                                         | `fuellstand > 80`       |
| = 1               | immer wahr                                                          | `1`                     |

<!-- figure: timer | Eine Zeitbedingung: Die Heizung läuft 5 Sekunden -->

Flanken sind wichtig, wenn ein Signal anstehen bleibt: Mit `↑start` startet der Zyklus einmal pro
Tastendruck und nicht erneut, solange die Taste gedrückt bleibt. Die vollständige Syntax des
Editors steht in der Hilfe unter [Writing receptivities](app:#help/expressions) (auf Englisch).

## Aktionen

<!-- figure: actions | Kontinuierliche, bedingte und speichernde Aktionen an Schritt 4 -->

- Eine **kontinuierlich wirkende Aktion** ist wahr, solange ihr Schritt aktiv ist: _Lampe_ leuchtet,
  solange Schritt 4 aktiv ist.
- Eine **bedingte Aktion** ist eine kontinuierlich wirkende Aktion mit einer **Zuweisungsbedingung**
  über ihrem Rechteck: _Hupe_ ertönt nur, wenn Schritt 4 aktiv **und** `alarm` wahr ist.
- **Verzögerte** und **zeitbegrenzte** Aktionen sind bedingte Aktionen mit einer Zeit in der
  Bedingung: Mit `3s/X4` schaltet der Ausgang 3 s nach der Aktivierung von Schritt 4 ein, mit
  `/(3s/X4)` ist er nur in den ersten 3 s eingeschaltet.
- Eine **speichernd wirkende Aktion** weist einen Wert einmal zu, und der Wert bleibt erhalten, bis
  eine andere Aktion ihn ändert. Sie wird beim **Aktivieren** des Schritts (Pfeil nach oben), beim
  **Deaktivieren** (Pfeil nach unten) oder **bei einem Ereignis** ausgeführt, solange der Schritt
  aktiv ist (eine Fahne mit dem Ereignis, hier `↑reset`). Zähler wie `Z := Z + 1` sind typische
  speichernd wirkende Aktionen.

Ein Ausgang, der über kontinuierlich wirkende Aktionen angesteuert wird, folgt den Schritten
automatisch. Ein Ausgang, der durch eine speichernd wirkende Aktion gesetzt wird, bleibt gesetzt,
bis eine andere speichernde Aktion ihn zurücksetzt: Planen Sie, wo das geschieht.

## Ketten, Alternativ- und Parallelverzweigungen

### Einen Weg wählen: die ODER-Verzweigung

Folgen auf einen Schritt mehrere Transitionen, nimmt der Grafcet den Weg, dessen
Transitionsbedingung wahr ist: eine **Alternativverzweigung**, gezeichnet mit einer einfachen
waagerechten Linie (**ODER-Verzweigung**). Die Wege treffen sich wieder an einer einfachen Linie
(**ODER-Zusammenführung**).

<!-- figure: or | ODER-Verzweigung und -Zusammenführung: der eine oder der andere Zweig -->

Formulieren Sie die Transitionsbedingungen **gegenseitig ausschließend**, sodass sie nie
gleichzeitig wahr sind, wie hier `a` und `/a * b`. Sonst schalten beide Transitionen zugleich
(Regel 4) und beide Zweige werden aktiv. GrafcetMaker warnt, wenn es nicht beweisen kann, dass
alternative Transitionsbedingungen sich ausschließen.

### Mehreres gleichzeitig tun: die UND-Verzweigung

Folgen auf eine Transition mehrere Schritte, werden sie alle gemeinsam aktiviert: eine
**Parallelverzweigung**, gezeichnet mit einer Doppellinie (**UND-Verzweigung**). Die Zweige enden
ebenfalls an einer Doppellinie (**UND-Zusammenführung**): Die Transition darunter ist erst
freigegeben, wenn der letzte Schritt jedes Zweigs aktiv ist. Sie wartet also, bis alle Zweige
fertig sind; so werden Abläufe **synchronisiert**.

<!-- figure: and | UND-Verzweigung und -Zusammenführung: Bohren und Spannen gleichzeitig -->

### Rückführungen, Sprünge, Quellen und Senken

- Eine **Rückführung** (Schleife) springt über eine Verbindung mit Pfeil nach oben zu einem
  früheren Schritt zurück: der übliche Weg, einen Zyklus zu wiederholen.
- Ein **Sprung** ist eine ODER-Verzweigung, deren einer Zweig direkt zu einem späteren Schritt
  führt, zum Beispiel um einen optionalen Arbeitsgang zu überspringen.
- Eine **Transition ohne vorangehenden Schritt** (Quelle) ist immer freigegeben und schaltet
  deshalb jedes Mal, wenn ihre Bedingung wahr ist; verwenden Sie eine Flanke wie `↑a`.
- Eine **Transition ohne nachfolgenden Schritt** (Senke) deaktiviert beim Schalten nur die Schritte
  davor.

## Große Anwendungen strukturieren

Reale Maschinen werden mit mehreren Grafcets beschrieben, die zusammenarbeiten.

- **Teil-Grafcets** beschreiben jeweils einen Teil des Systems, zum Beispiel den
  Produktionsablauf, die Betriebsarten und die Sicherheit. Sie laufen gleichzeitig und sehen die
  Schritte der anderen über die Schrittvariablen `Xn`. Zusammen bilden sie den Gesamt-Grafcet.
- Ein **Makroschritt** steht für einen ausführlichen Ablauf, der auf einem eigenen Blatt
  gezeichnet ist, seine **Expansion**. Die Expansion hat einen Eingangsschritt **E** und einen
  Ausgangsschritt **S**. Das Schalten der Transition über dem Makroschritt aktiviert Schritt E; die
  Transition unter dem Makroschritt ist freigegeben, wenn Schritt S aktiv ist.
- Ein **einschließender Schritt** enthält einen oder mehrere ganze Grafcets, die nur leben,
  solange er aktiv ist. Wird er aktiviert, werden die mit einem Sternchen markierten
  eingeschlossenen Schritte aktiv; wird er deaktiviert, werden alle eingeschlossenen Schritte
  deaktiviert.
- Eine **Zwangssteuerung**, gezeichnet in einem Aktionsrechteck mit Doppelrahmen, gibt einem anderen
  Grafcet eine Situation vor: `G2{8}` erzwingt in G2 nur Schritt 8 als aktiv, `G2{*}` friert G2 in
  seiner aktuellen Situation ein und `G2{}` deaktiviert alle seine Schritte. Ein zwangsgesteuerter
  Grafcet kann sich nicht selbst weiterentwickeln. Mit Zwangssteuerungen beschreibt man normgerecht
  Not-Halt und Initialisierung.

<!-- figure: macro | Ein Makroschritt: zwei waagerechte Linien im Quadrat -->

## GRAFCET und SFC (Ablaufsprache)

Die Ablaufsprache SFC (Sequential Function Chart) der IEC 61131-3 wurde aus GRAFCET abgeleitet und
sieht fast gleich aus, hat aber einen anderen Zweck.

|            | GRAFCET (IEC 60848)                                                    | SFC (IEC 61131-3)                                          |
| ---------- | ---------------------------------------------------------------------- | ---------------------------------------------------------- |
| Zweck      | Spezifikation: das geforderte Verhalten, unabhängig von der Technik    | Programmiersprache, die von der SPS ausgeführt wird        |
| Ablauf     | Alle schaltfähigen Transitionen zugleich, dann Suche nach Stabilität   | Meist ein Weiterschalten pro SPS-Zyklus, je nach Steuerung |
| Aktionen   | Kontinuierlich, bedingt, verzögert, zeitbegrenzt und speichernd        | Bestimmungszeichen N, S, R, P, P0, P1, L, D, SD, DS und SL |
| Hierarchie | Teil-Grafcets, Makroschritte, einschließende Schritte, Zwangssteuerung | Über die Struktur des Programms                            |

Üblicherweise wird zuerst der GRAFCET geschrieben und geprüft und dann in AS (SFC), KOP oder ST
umgesetzt. GrafcetMaker erzeugt aus einem Grafcet Structured Text und PLCopen-TC6-XML als
Ausgangspunkt für diese Umsetzung; prüfen Sie den erzeugten Code immer vor dem Einsatz.

## Beispiele

### Ampel mit Fußgängertaster

<!-- figure: example-trafficLight | Ampel: Zeiten und eine gespeicherte Anforderung -->

Schritt 0 gibt den Fußgängern 10 s lang Grün (`10s/X0`), danach lässt Schritt 1 die Autos fahren.
Die Autos haben 30 s Grün, ein Druck auf den Fußgängertaster verkürzt das aber auf 10 s: Der Druck
wird durch eine speichernd wirkende Aktion beim Ereignis `↑request` gespeichert und wieder
vergessen, wenn Schritt 0 aktiv wird. Schritt 2 zeigt 3 s lang Gelb. (Die Variablen des Beispiels
sind englisch benannt.)

### Bohrstation mit Teilezähler

<!-- figure: example-drillingStation | Bohrstation: Bearbeitungszyklus mit Wartung alle 100 Teile -->

Ein Bearbeitungszyklus: Teil spannen, bohren, zurückfahren, entspannen. Die Spannvorrichtung wird
durch speichernd wirkende Aktionen gesetzt und zurückgesetzt, und Schritt 4 zählt die Teile. Nach
Schritt 4 führt eine ODER-Verzweigung mit sich ausschließenden Bedingungen zurück zum Anfang oder
alle 100 Teile zur Wartung.

Der Editor enthält zwei weitere Beispiele, eine Tankbefüllung mit analogen Eingängen und ein
paralleles Förderband mit einem Sicherheits-Grafcet, der die Anlage zwangssteuert: Öffnen Sie sie
über den Startbildschirm von [GrafcetMaker](app:).

## GRAFCET online zeichnen und simulieren

[GrafcetMaker](app:) ist ein kostenloser Open-Source-GRAFCET-Editor für Automatisierungstechniker,
Lehrkräfte, Auszubildende und Studierende. Er läuft vollständig im Browser, auch offline und ohne
Konto; Ihre Pläne bleiben auf Ihrem Rechner.

- Zeichnen Sie Schritte, Transitionen, Aktionen und Verzweigungen mit Maus oder Tastatur, mit
  automatischem Layout.
- Schreiben Sie Transitionsbedingungen mit Autovervollständigung und Variablentabelle und erhalten
  Sie klare Fehlermeldungen mit Schnellkorrekturen.
- Simulieren Sie nach den Regeln der IEC 60848: aktive Schritte, Zeiten, Flanken, instabile
  Schritte, Zwangssteuerung und ein Zeitdiagramm aller Variablen.
- Strukturieren Sie Projekte mit Teil-Grafcets, Makroschritten, einschließenden Schritten und
  Zwangssteuerungen.
- Exportieren Sie als PDF mit Schriftfeld, SVG und PNG oder als Structured Text und PLCopen-TC6-XML,
  und teilen Sie ein ganzes Projekt als Link.

Die Oberfläche des Editors ist auf Englisch; Ihre Grafcets schreiben Sie in Ihrer Sprache.

[Den kostenlosen GRAFCET-Editor öffnen](app:)

## Häufige Fragen

### Wofür wird GRAFCET verwendet?

Um das Verhalten automatisierter Ablaufsteuerungen festzulegen: Maschinen, Montagelinien,
Verpackungsanlagen, Chargenprozesse, Aufzüge, Ampeln. Der Grafcet ist die gemeinsame Grundlage für
alle, die die Maschine konstruieren, die SPS programmieren und die Anlage in Betrieb nehmen.

### Ist GRAFCET dasselbe wie SFC (Ablaufsprache)?

Nein. SFC (IEC 61131-3) wurde aus GRAFCET abgeleitet und verwendet dieselben Symbole, aber GRAFCET
ist eine Spezifikationssprache mit genauen Ablaufregeln, SFC eine Programmiersprache, deren
Ausführung von der Steuerung abhängt. Siehe [GRAFCET und SFC](#grafcet-und-sfc-ablaufsprache).

### Was ist der Unterschied zwischen Schritt und Transition?

Ein Schritt ist ein Zustand, der andauert (das System füllt den Tank); eine Transition ist der
Moment, in dem das System in den nächsten Zustand wechselt, wenn ihre Bedingung wahr wird (der
Tank ist voll).

### Was bedeutet X1?

`X1` ist die Schrittvariable von Schritt 1: Sie ist wahr, solange Schritt 1 aktiv ist. Man
verwendet sie in Transitionsbedingungen, in Bedingungen von Aktionen und in anderen Grafcets, zum
Beispiel `5s/X1` oder `X1 * /X5`.

### Was ist ein instabiler Schritt?

Ein Schritt, der innerhalb derselben Suche nach Stabilität aktiviert und wieder deaktiviert wird,
weil die Bedingung darunter schon wahr war. Seine kontinuierlich wirkenden Aktionen werden nicht
ausgeführt, seine speichernd wirkenden Aktionen schon.

### Wie wird aus einem GRAFCET ein SPS-Programm?

Jeder Schritt wird ein Merker, jede Transition eine Bedingung, die die nachfolgenden Schritte setzt
und die vorangehenden zurücksetzt, und die Ausgänge werden aus den Schrittmerkern gebildet. Das
geht von Hand in KOP oder ST, mit der Ablaufsprache Ihrer SPS, oder Sie lassen GrafcetMaker
Structured Text oder PLCopen-XML als Ausgangspunkt erzeugen.

### Gibt es kostenlose GRAFCET-Software?

Ja: [GrafcetMaker](app:) ist kostenlos und Open Source (MIT-Lizenz). Er läuft in jedem aktuellen
Browser unter Windows, macOS und Linux, auf Tablets und Smartphones, und Firmen können ihn in ihrem
eigenen Netz betreiben.
