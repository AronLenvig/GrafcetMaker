# Pisanie warunków tranzycji

Warunki tranzycji, warunki akcji i zdarzenia są wyrażeniami logicznymi. Wpisujesz je zwykłym
ASCII; diagram pokazuje je w notacji podręcznikowej (NOT jako nadkreślenie, AND jako `·`). Wyłącz
**Widok › Notacja podręcznikowa**, aby zobaczyć dokładnie to, co wpisano.

## Operatory {#operators}

| Znaczenie             | Wpisz         | Akceptowane także                | Wyświetlane jako  |
| --------------------- | ------------- | -------------------------------- | ----------------- |
| AND                   | `a * b`       | `a AND b`, `a && b`, `a · b`     | a · b             |
| OR                    | `a + b`       | `a OR b`, `a \|\| b`             | a + b             |
| NOT                   | `/a`          | `NOT a`, `!a`, `¬a`              | a z nadkreśleniem |
| Zbocze narastające    | `↑a`          | `RE a` (wpisanie `^a` daje `↑a`) | ↑a                |
| Zbocze opadające      | `↓a`          | `FE a`                           | ↓a                |
| Zawsze prawda / fałsz | `1` / `0`     | `TRUE` / `FALSE`                 | 1 / 0             |
| Nawiasy               | `(a + b) * c` |                                  | (a + b) · c       |

NOT wiąże najsilniej, potem AND, potem OR: `a + b * /c` oznacza `a + (b * (/c))`. W razie
wątpliwości używaj nawiasów.

## Zbocza narastające i opadające {#rising-and-falling-edges}

Zbocze jest prawdziwe tylko w chwili, gdy zmienia się jego operand: **↑a** (zbocze narastające,
_wyzwalanie P_), gdy `a` zmienia się z fałszu na prawdę, **↓a** (zbocze opadające, _wyzwalanie N_),
gdy zmienia się z prawdy na fałsz. Używaj go, aby zareagować jeden raz na naciśnięcie przycisku,
niezależnie od tego, jak długo jest trzymany.

<!-- figure: edges | Lampa świeci od naciśnięcia przycisku do jego zwolnienia -->

Trzy sposoby wpisania zbocza:

- Wpisz `^` przed nazwą: `^start` zamienia się w `↑start` podczas pisania.
- Ustaw kursor tekstowy na nazwie i naciśnij <kbd>Alt+↑</kbd> dla zbocza narastającego lub
  <kbd>Alt+↓</kbd> dla zbocza opadającego. Naciśnij ponownie, aby usunąć zbocze, albo drugi skrót,
  aby je zamienić.
- Kliknij **↑** lub **↓** na pasku symboli, który pojawia się nad polem podczas edycji warunku
  tranzycji.

Akceptowane są także `RE a` i `FE a`. Zbocza działają również na zmiennych kroków: `↑X3` jest
prawdziwe, gdy krok 3 staje się aktywny.

## Zmienne kroków {#step-variables}

`X3` jest prawdziwe, dopóki krok 3 jest aktywny. W projekcie z kilkoma grafcetami `X3` odnosi się
do kroku 3 tego samego grafcetu lub do jedynego kroku 3 w projekcie. Używaj go do synchronizacji
grafcetów, np. aby poczekać, aż inny grafcet osiągnie dany krok.

## Timery {#timers}

`5s/X2` jest prawdziwe 5 sekund po tym, jak `X2` stało się prawdziwe, i znów fałszywe, gdy tylko
`X2` jest fałszywe: typowo „5 s po aktywacji kroku 2”.

<!-- figure: timer | Grzałka pracuje przez 5 s -->

- Jednostki: `ms`, `s`, `min`, `h`, np. `500ms/X4`, `2min/start`.
- Operandem może być dowolny warunek: `3s/(a * b)`.
- `2s/a/5s` jest prawdziwe 2 s po tym, jak `a` stało się prawdziwe, i pozostaje prawdziwe do 5 s po
  tym, jak `a` stało się fałszywe.

## Porównania {#comparisons}

Zmienne liczbowe (INT, REAL, TIME) porównuje się przez `=`, `<>`, `<`, `<=`, `>`, `>=`, a w
porównaniu można używać `+`, `-`, `*`, `/` i `MOD`: `level >= 80`, `C = 3`, `T1 > 2s`,
`(a + b) / 2 < limit`. Porównanie jest warunkiem: łącząc je z innymi, ujmij je w nawias, jak w
`start * (C < 10)`. Bez nawiasu `start * C < 10` porównałoby `start * C` z 10.

## Przypisania w akcjach zapamiętanych {#assignments-in-stored-actions}

Akcje zapamiętane zawierają przypisanie: `C := C + 1`, `Motor := 1`, `Speed := 2.5`,
`Done := FALSE`. Zobacz [Akcje](actions.md).

## Pomoc podczas pisania {#help-while-you-type}

- **Podpowiedzi**: zacznij pisać nazwę i wybierz zmienną lub krok (`X…`) strzałkami, a potem
  <kbd>Enter</kbd> lub <kbd>Tab</kbd>. Reszta podświetlonej nazwy jest widoczna na szaro za
  kursorem; <kbd>Tab</kbd> lub <kbd>→</kbd> ją przyjmuje.
- **Puste pole**: pierwsza zmienna z tabeli, której nic jeszcze nie używa, jest widoczna na szaro
  (wejście dla warunku tranzycji, wyjście dla akcji); <kbd>Tab</kbd> ją przyjmuje.
- **Problemy**: ramka pod polem wyjaśnia, co jest nie tak, podkreśla miejsce i proponuje poprawki:
  **Użyj Start** dla błędnie zapisanej nazwy. Nowa nazwa jest zapowiadana (_Nowa zmienna start:
  BOOL, wejście_) i deklarowana po zatwierdzeniu.
- **Pasek symboli**: przyciski ↑ ↓ NOT AND OR, nawiasy (obejmują zaznaczony tekst) i szablon
  timera.

Wyrażenie z problemem zawsze można zatwierdzić: jest ono pokazywane na diagramie z czerwonym
podkreśleniem i wymienione w **Problemy**, dopóki go nie poprawisz.
