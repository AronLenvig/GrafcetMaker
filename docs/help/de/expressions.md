# Transitionsbedingungen schreiben

Transitionsbedingungen, Bedingungen von Aktionen und Ereignisse sind logische Ausdrücke. Sie geben
sie in einfachem ASCII ein; das Diagramm zeigt sie in Lehrbuchschreibweise (NICHT als Überstrich,
UND als `·`). Schalten Sie **Ansicht › Lehrbuchschreibweise** aus, um genau zu sehen, was Sie
eingegeben haben.

## Operatoren {#operators}

| Bedeutung           | Eingabe       | Ebenfalls möglich            | Anzeige          |
| ------------------- | ------------- | ---------------------------- | ---------------- |
| UND                 | `a * b`       | `a AND b`, `a && b`, `a · b` | a · b            |
| ODER                | `a + b`       | `a OR b`, `a \|\| b`         | a + b            |
| NICHT               | `/a`          | `NOT a`, `!a`, `¬a`          | a mit Überstrich |
| Steigende Flanke    | `↑a`          | `RE a` (aus `^a` wird `↑a`)  | ↑a               |
| Fallende Flanke     | `↓a`          | `FE a`                       | ↓a               |
| Immer wahr / falsch | `1` / `0`     | `TRUE` / `FALSE`             | 1 / 0            |
| Klammern            | `(a + b) * c` |                              | (a + b) · c      |

NICHT bindet am stärksten, dann UND, dann ODER: `a + b * /c` bedeutet `a + (b * (/c))`. Setzen Sie
im Zweifel Klammern.

## Steigende und fallende Flanken {#rising-and-falling-edges}

Eine Flanke ist nur in dem Moment wahr, in dem sich ihr Operand ändert: **↑a** (steigende Flanke,
_P-Trigger_), wenn `a` von falsch nach wahr wechselt, **↓a** (fallende Flanke, _N-Trigger_), wenn
es von wahr nach falsch wechselt. Damit reagieren Sie einmal auf einen Tastendruck, egal wie lange
die Taste gedrückt bleibt.

<!-- figure: edges | Lampe ein vom Drücken des Tasters bis zum Loslassen -->

Drei Wege, eine Flanke einzugeben:

- Tippen Sie `^` vor den Namen: Aus `^start` wird beim Tippen `↑start`.
- Setzen Sie den Textcursor auf einen Namen und drücken Sie <kbd>Alt+↑</kbd> für eine steigende
  oder <kbd>Alt+↓</kbd> für eine fallende Flanke. Erneutes Drücken entfernt die Flanke, die andere
  Taste tauscht sie.
- Klicken Sie auf **↑** oder **↓** in der Symbolleiste, die beim Bearbeiten einer
  Transitionsbedingung über dem Feld erscheint.

`RE a` und `FE a` werden ebenfalls akzeptiert. Flanken funktionieren auch mit Schrittvariablen:
`↑X3` ist wahr, wenn Schritt 3 aktiv wird.

## Schrittvariablen {#step-variables}

`X3` ist wahr, solange Schritt 3 aktiv ist. In einem Projekt mit mehreren Grafcets bezeichnet `X3`
Schritt 3 desselben Grafcets oder den einzigen Schritt 3 des Projekts. Damit synchronisieren Sie
Grafcets, z. B. um zu warten, bis ein anderer Grafcet einen Schritt erreicht.

## Zeitglieder {#timers}

`5s/X2` ist wahr 5 Sekunden, nachdem `X2` wahr geworden ist, und wieder falsch, sobald `X2` falsch
ist: typischerweise „5 s nach der Aktivierung von Schritt 2“.

<!-- figure: timer | Die Heizung läuft 5 s -->

- Einheiten: `ms`, `s`, `min`, `h`, z. B. `500ms/X4`, `2min/start`.
- Der Operand kann eine beliebige Bedingung sein: `3s/(a * b)`.
- `2s/a/5s` ist wahr 2 s, nachdem `a` wahr geworden ist, und bleibt wahr bis 5 s, nachdem `a`
  falsch geworden ist.

## Vergleiche {#comparisons}

Numerische Variablen (INT, REAL, TIME) werden mit `=`, `<>`, `<`, `<=`, `>`, `>=` verglichen und
können im Vergleich `+`, `-`, `*`, `/` und `MOD` verwenden: `level >= 80`, `C = 3`, `T1 > 2s`,
`(a + b) / 2 < limit`. Ein Vergleich ist eine Bedingung: Wenn Sie ihn mit anderen verknüpfen,
setzen Sie ihn in Klammern, wie in `start * (C < 10)`. Ohne Klammern würde `start * C < 10` den
Wert `start * C` mit 10 vergleichen.

## Zuweisungen in speichernd wirkenden Aktionen {#assignments-in-stored-actions}

Speichernd wirkende Aktionen enthalten eine Zuweisung: `C := C + 1`, `Motor := 1`, `Speed := 2.5`,
`Done := FALSE`. Siehe [Aktionen](actions.md).

## Hilfe beim Tippen {#help-while-you-type}

- **Vorschläge**: Beginnen Sie, einen Namen zu tippen, und wählen Sie mit den Pfeiltasten eine
  Variable oder einen Schritt (`X…`), dann <kbd>Enter</kbd> oder <kbd>Tab</kbd>. Der Rest des
  markierten Namens erscheint grau hinter dem Cursor; <kbd>Tab</kbd> oder <kbd>→</kbd> übernimmt
  ihn.
- **Leeres Feld**: Die erste Variable der Tabelle, die noch nirgends verwendet wird, erscheint grau
  (ein Eingang bei einer Transitionsbedingung, ein Ausgang bei einer Aktion); <kbd>Tab</kbd>
  übernimmt sie.
- **Probleme**: Ein Kasten unter dem Feld erklärt, was falsch ist, unterstreicht die Stelle und
  bietet Korrekturen an: **Start verwenden** bei einem falsch geschriebenen Namen, **BOOL start
  anlegen** bei einem neuen.
- **Symbolleiste**: Schaltflächen für ↑ ↓ NICHT UND ODER, Klammern (sie umschließen den markierten
  Text) und eine Vorlage für ein Zeitglied.

Sie können einen Ausdruck mit einem Problem jederzeit bestätigen: Er wird im Diagramm rot
unterstrichen und unter **Probleme** aufgeführt, bis Sie ihn korrigieren.
