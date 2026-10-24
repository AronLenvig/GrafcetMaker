# Variablen

Jeder Name, der in einer Transitionsbedingung oder einer Aktion vorkommt, ist eine **Variable** des
Projekts. Die Deklaration gibt ihr einen Typ und eine Richtung, ermöglicht GrafcetMaker die Prüfung
Ihrer Ausdrücke und lässt den Simulator die passenden Bedienelemente anbieten.

## Arten von Variablen {#kinds-of-variables}

- **Richtung**: Ein **Eingang** kommt vom Prozess (Sensoren, Taster) und kann nur gelesen werden;
  ein **Ausgang** steuert den Prozess (Motoren, Lampen); eine **interne** Variable ist ein Merker
  oder Zähler.
- **Typ**: `BOOL` (wahr / falsch), `INT` (ganze Zahl), `REAL` (Dezimalzahl) oder `TIME` (Dauer,
  z. B. `500ms`, `3s`).
- **Anfangswert**: der Wert zu Beginn einer Simulation (FALSE bzw. 0, wenn leer).
- **Adresse** und **Kommentar**: freier Text, z. B. eine SPS-Adresse `%I0.0` und was das Signal
  ist.

Bei Namen wird Groß- und Kleinschreibung nicht unterschieden; sie bestehen aus Buchstaben, Ziffern
und `_` und dürfen weder reservierte Wörter sein (`AND`, `OR`, `NOT`, `RE`, `FE`, `TRUE`, `FALSE`,
`MOD`, `INIT`) noch wie eine Schrittvariable aussehen (`X12`).

## Variablen anlegen {#creating-variables}

- Beim Tippen eines Ausdrucks bietet ein unbekannter Name **BOOL name anlegen** an, als Eingang
  oder Ausgang, je nachdem, wo Sie ihn verwenden. Das ist der schnellste Weg.
- **Variable hinzufügen** in der Variablenliste oder -tabelle.
- Eine Liste aus Excel oder CSV **importieren** (siehe unten).

## Die Variablentabelle {#the-variable-table}

Die Schaltfläche **Variablen** unten rechts öffnet die Variablen rechts im Fenster: eine kompakte
Liste (Suche, Filter-Chips, Gruppen nach Richtung; klicken Sie auf eine Variable, um sie zu
bearbeiten und zu sehen, wo sie verwendet wird). Verbreitern Sie den Bereich an seinem linken
Rand, und er wird zur Tabelle mit allen Feldern in Spalten. Bearbeiten Sie jede Zelle direkt
(<kbd>Enter</kbd> oder das Verlassen der Zelle übernimmt, <kbd>Esc</kbd> verwirft), sortieren Sie
per Klick auf eine Spaltenüberschrift, filtern Sie nach Text, Richtung und Typ. Die Tabelle bleibt
auch mit Tausenden von Variablen schnell.

Die Spalte **Verwendungen** zählt die Ausdrücke, die jede Variable verwenden; eine unbenutzte
Variable zeigt eine orange `0`. Klicken Sie auf die Zahl, um die Variable in der
Eigenschaften-Karte zu öffnen: Bearbeiten Sie alle ihre Felder und sehen Sie, **wo sie verwendet
wird**; klicken Sie auf eine Verwendung, um im Diagramm zu dieser Transitionsbedingung oder Aktion
zu springen.

Die Besen-Schaltfläche neben **⋯** entfernt alle unbenutzten Variablen auf einmal (ihr Zähler zeigt,
wie viele): die, die keine Transitionsbedingung, keine Aktion und keine Bedingung verwendet und die
kein Szenario ansteuert. Das lässt sich mit einem Schritt rückgängig machen (<kbd>Ctrl+Z</kbd>). Den
Befehl gibt es auch in der Befehlspalette: **Unbenutzte Variablen entfernen**.

Auf einem Smartphone ist der Bereich Variablen stattdessen eine kompakte Liste: Suche, Filter-Chips
(**Eingänge**, **Ausgänge**, **Interne**), Gruppen nach Richtung, und ein Tippen öffnet eine
Variable mit ihren Verwendungen.

## Umbenennen {#renaming}

Das Umbenennen einer Variablen aktualisiert jede Transitionsbedingung, Aktion und Bedingung, die
sie verwendet, in allen Grafcets, als eine Änderung, die sich rückgängig machen lässt.

## Excel und CSV {#excel-and-csv}

Verwenden Sie das Menü **⋯** der Variablenliste oder -tabelle oder **Datei › Variablen**:

- **Variablen als Excel exportieren** schreibt eine `.xlsx`-Arbeitsmappe mit fixierter Kopfzeile,
  Filtern und Auswahllisten für Typ und Richtung.
- **Variablen als CSV exportieren** schreibt eine Textdatei für andere Werkzeuge.
- **Variablen importieren** liest eine `.xlsx`- oder `.csv`-Datei (Sie können sie auch auf das
  Fenster ziehen).

Die Spalten sind `name`, `type`, `direction`, `initial`, `address` und `comment` (in beliebiger
Reihenfolge; nur `name` und `type` sind Pflicht). Bevor sich etwas ändert, sehen Sie, wie viele
Variablen hinzugefügt, aktualisiert oder abgelehnt werden, mit dem Grund für jede abgelehnte Zeile.
Variablen werden über ihren Namen zugeordnet; Variablen, die nicht in der Datei stehen, bleiben
erhalten. Der Import ist eine Änderung, die sich rückgängig machen lässt.

> **Tipp:** Um eine Liste in Excel vorzubereiten, exportieren Sie zuerst: So erhalten Sie die
> richtigen Spalten und Auswahllisten, füllen dann Zeilen aus und importieren die Datei wieder.
