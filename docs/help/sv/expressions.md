# Skriva övergångsvillkor

Övergångsvillkor, aktionsvillkor och händelser är logiska uttryck. Du skriver dem i vanlig ASCII;
diagrammet visar dem i läroboksnotation (ICKE som ett överstreck, OCH som `·`). Stäng av
**Visa › Läroboksnotation** för att se exakt vad du skrev.

## Operatorer {#operators}

| Betydelse            | Skriv         | Accepteras också             | Visas som            |
| -------------------- | ------------- | ---------------------------- | -------------------- |
| OCH                  | `a * b`       | `a AND b`, `a && b`, `a · b` | a · b                |
| ELLER                | `a + b`       | `a OR b`, `a \|\| b`         | a + b                |
| ICKE                 | `/a`          | `NOT a`, `!a`, `¬a`          | a med ett överstreck |
| Stigande flank       | `↑a`          | `RE a` (`^a` blir `↑a`)      | ↑a                   |
| Fallande flank       | `↓a`          | `FE a`                       | ↓a                   |
| Alltid sant / falskt | `1` / `0`     | `TRUE` / `FALSE`             | 1 / 0                |
| Parenteser           | `(a + b) * c` |                              | (a + b) · c          |

ICKE binder starkast, sedan OCH, sedan ELLER: `a + b * /c` betyder `a + (b * (/c))`. Använd
parenteser när du är osäker.

## Stigande och fallande flanker {#rising-and-falling-edges}

En flank är sann bara i det ögonblick dess operand ändras: **↑a** (stigande flank, _P-trigger_) när
`a` går från falskt till sant, **↓a** (fallande flank, _N-trigger_) när den går från sant till
falskt. Använd den för att reagera en gång på ett knapptryck, oavsett hur länge knappen hålls
nedtryckt.

<!-- figure: edges | Lampan lyser från ett tryck på knappen tills den släpps -->

Tre sätt att skriva en flank:

- Skriv `^` före namnet: `^start` blir `↑start` medan du skriver.
- Placera textmarkören på ett namn och tryck på <kbd>Alt+↑</kbd> för en stigande flank eller
  <kbd>Alt+↓</kbd> för en fallande flank. Tryck igen för att ta bort flanken, eller på den andra
  för att byta.
- Klicka på **↑** eller **↓** i symbolfältet som visas ovanför fältet medan du redigerar ett
  övergångsvillkor.

`RE a` och `FE a` accepteras också. Flanker fungerar även på stegvariabler: `↑X3` är sant när steg
3 blir aktivt.

## Stegvariabler {#step-variables}

`X3` är sant medan steg 3 är aktivt. I ett projekt med flera grafcetar syftar `X3` på steg 3 i samma
grafcet, eller på det enda steg 3 i projektet. Använd den för att synkronisera grafcetar, t.ex. för
att vänta på att en annan grafcet når ett visst steg.

## Tidsfördröjningar {#timers}

`5s/X2` är sant 5 sekunder efter att `X2` blev sant, och falskt igen så snart `X2` är falskt:
typiskt ”5 s efter att steg 2 aktiverades”.

<!-- figure: timer | Värmaren är på i 5 s -->

- Enheter: `ms`, `s`, `min`, `h`, t.ex. `500ms/X4`, `2min/start`.
- Operanden kan vara vilket villkor som helst: `3s/(a * b)`.
- `2s/a/5s` är sant 2 s efter att `a` blev sant och förblir sant till 5 s efter att `a` blev
  falskt.

## Jämförelser {#comparisons}

Numeriska variabler (INT, REAL, TIME) jämförs med `=`, `<>`, `<`, `<=`, `>`, `>=`, och kan använda
`+`, `-`, `*`, `/` och `MOD` i jämförelsen: `level >= 80`, `C = 3`, `T1 > 2s`,
`(a + b) / 2 < limit`. En jämförelse är ett villkor: när du kombinerar den med andra sätter du den
inom parentes, som i `start * (C < 10)`. Utan dem skulle `start * C < 10` jämföra `start * C` med 10.

## Tilldelningar i lagrade aktioner {#assignments-in-stored-actions}

Lagrade aktioner innehåller en tilldelning: `C := C + 1`, `Motor := 1`, `Speed := 2.5`,
`Done := FALSE`. Se [Aktioner](actions.md).

## Hjälp medan du skriver {#help-while-you-type}

- **Förslag**: börja skriva ett namn och välj en variabel eller ett steg (`X…`) med piltangenterna,
  sedan <kbd>Enter</kbd> eller <kbd>Tab</kbd>. Resten av det markerade namnet visas i grått efter
  markören; <kbd>Tab</kbd> eller <kbd>→</kbd> godtar det.
- **Tomt fält**: den första variabeln i tabellen som inget använder ännu visas i grått (en ingång
  för ett övergångsvillkor, en utgång för en aktion); <kbd>Tab</kbd> godtar den.
- **Problem**: en ruta under fältet förklarar vad som är fel, stryker under var och föreslår
  åtgärder: **Använd Start** för ett felstavat namn. Ett nytt namn meddelas (_Ny variabel start:
  BOOL, ingång_) och deklareras när du bekräftar.
- **Symbolfält**: knappar för ↑ ↓ ICKE OCH ELLER, parenteser (de omsluter den markerade texten) och
  en mall för tidsfördröjning.

Du kan alltid bekräfta ett uttryck som har ett problem: det visas understruket med rött i diagrammet
och listas under **Problem** tills du åtgärdar det.
