# Podstawy GRAFCET

GRAFCET (IEC 60848) opisuje zachowanie układu sekwencyjnego — maszyny, procesu, sygnalizacji
świetlnej — jako ciąg **kroków** połączonych **tranzycjami**. Jest to język specyfikacji, na
którym opiera się język SFC sterowników PLC (IEC 61131-3).

<!-- figure: anatomy | Elementy grafcetu -->

## Kroki {#steps}

**Krok** to stabilna sytuacja układu: _oczekiwanie_, _napełnianie_, _wiercenie_. Rysuje się go jako
kwadrat z numerem. W każdej chwili krok jest albo **aktywny**, albo **nieaktywny**; zbiór
aktywnych kroków to **sytuacja** grafcetu.

- **Krok początkowy** (podwójny kwadrat) jest aktywny, gdy układ startuje. Grafcet potrzebuje
  co najmniej jednego.
- Zmienna `X3` jest prawdziwa, dopóki krok 3 jest aktywny. Można jej używać w warunkach tranzycji
  i warunkach akcji.

## Tranzycje i warunki tranzycji {#transitions-and-receptivities}

**Tranzycja** (krótka pozioma kreska) łączy kroki. Jej **warunek tranzycji**, zapisany obok,
jest warunkiem przejścia dalej: wejście (`start`), kombinacja (`start * /door`), zbocze (`↑b`),
timer (`5s/X2`) lub porównanie (`level >= 80`). Warunek `1` jest zawsze prawdziwy.

- Tranzycja jest **odblokowana**, gdy wszystkie kroki bezpośrednio nad nią są aktywne.
- Odblokowana tranzycja **zadziała** (zostaje przekroczona), gdy tylko jej warunek jest prawdziwy.

## Akcje {#actions}

Prostokąty na prawo od kroku to jego **akcje**: to, co układ robi, dopóki krok jest aktywny, np.
_uruchom pompę_. **Akcja ciągła** wskazuje wyjście, które jest prawdziwe, dopóki krok jest
aktywny. Akcje zapamiętane zmieniają wartość jednorazowo: przy aktywacji lub dezaktywacji kroku
albo przy wystąpieniu zdarzenia. Zobacz [Akcje](actions.md).

## Pięć reguł ewolucji {#the-five-evolution-rules}

Te reguły z IEC 60848 decydują o tym, jak grafcet ewoluuje. Symulator stosuje je dokładnie.

1. **Sytuacja początkowa**: na starcie aktywne są kroki początkowe.
2. **Warunek zadziałania**: tranzycja zadziała, gdy jest odblokowana, a jej warunek jest
   prawdziwy.
3. **Zadziałanie**: zadziałanie tranzycji aktywuje wszystkie kroki bezpośrednio pod nią i
   dezaktywuje wszystkie kroki bezpośrednio nad nią.
4. **Jednoczesne zadziałanie**: wszystkie tranzycje, które mogą zadziałać w tej samej chwili,
   zadziałają jednocześnie.
5. **Jednoczesna aktywacja i dezaktywacja**: krok, który jest jednocześnie aktywowany i
   dezaktywowany, pozostaje aktywny.

Po zmianie wejścia reguły są stosowane raz za razem, aż żadna tranzycja nie może zadziałać: jest
to **poszukiwanie stanu stabilnego**. Kroki aktywowane i ponownie opuszczane podczas tego
poszukiwania są **niestabilne** (chwilowe): ich akcje ciągłe nie są wykonywane, ale ich akcje
zapamiętane tak.

## Wybór drogi: LUB {#choosing-between-paths-or}

Gdy po kroku następuje kilka tranzycji, grafcet wybiera drogę, której warunek jest prawdziwy:
**gałąź alternatywną**, rysowaną pojedynczą poziomą linią (**rozgałęzienie LUB**). Drogi łączą się
znów na pojedynczej linii (**zbieżność LUB**).

<!-- figure: or | Rozgałęzienie i zbieżność LUB -->

Spraw, aby warunki były **wzajemnie wykluczające się** (nigdy nie mogą być prawdziwe razem), tu `a`
i `/a * b`. W przeciwnym razie obie drogi zostałyby wybrane naraz. GrafcetMaker ostrzega, gdy nie
może udowodnić, że warunki gałęzi alternatywnych się wykluczają, i proponuje dać jednej gałęzi
pierwszeństwo.

## Kilka rzeczy naraz: I {#doing-things-at-the-same-time-and}

Gdy po tranzycji następuje kilka kroków, wszystkie są aktywowane razem: **gałęzie równoległe**,
rysowane podwójną linią (**rozgałęzienie I**). Gałęzie także kończą się na podwójnej linii
(**zbieżność I**): tranzycja pod nią jest odblokowana dopiero wtedy, gdy ostatni krok każdej gałęzi
jest aktywny, więc czeka, aż wszystkie gałęzie się zakończą.

<!-- figure: and | Rozgałęzienie i zbieżność I -->

## Pętle {#loops}

Połączenie biegnące w górę, rysowane ze strzałką, wraca do wcześniejszego kroku: to zwykły sposób
powtarzania cyklu. Naciśnij <kbd>L</kbd> na kroku, a potem kliknij krok, do którego chcesz wrócić.

## Większe aplikacje {#bigger-applications}

- Projekt może zawierać kilka **grafcetów częściowych**, które działają razem, np. jeden dla cyklu
  i jeden dla bezpieczeństwa. Widzą nawzajem swoje kroki przez `Xn`.
- **Makrokrok** zastępuje szczegółową sekwencję narysowaną na osobnym arkuszu, jego
  **rozwinięcie**.
- **Krok obejmujący** zawiera cały grafcet, który działa tylko, dopóki krok jest aktywny.
- **Rozkaz wymuszania** narzuca sytuację innemu grafcetowi, np. przy zatrzymaniu awaryjnym.

Zobacz [Makrokroki, kroki obejmujące i wymuszanie](hierarchy.md).

## Więcej informacji {#learn-more}

- [Pisanie warunków tranzycji](expressions.md) — pełna składnia wyrażeń.
- [Słowniczek](glossary.md) — wszystkie standardowe terminy w jednym miejscu.
- Dokładna interpretacja każdej reguły w GrafcetMaker jest opisana w `docs/semantics.md` w
  repozytorium kodu źródłowego.
