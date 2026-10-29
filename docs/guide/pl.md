# Czym jest GRAFCET? Pełny przewodnik po normie IEC 60848

**GRAFCET** to język graficzny opisujący działanie sekwencyjnego układu sterowania: maszyny, linii
produkcyjnej, sygnalizacji świetlnej. Wykres GRAFCET to ciąg **kroków** (co układ robi) połączonych
**tranzycjami** (warunkami przejścia dalej). Jest znormalizowany międzynarodowo jako **IEC 60848**
(w Polsce PN-EN 60848) i dał początek językowi SFC (Sequential Function Chart) sterowników PLC.

Ten przewodnik objaśnia każdy element i każdą regułę normy na diagramach i przykładach. Wszystkie
diagramy narysowano w [GrafcetMaker](app:), darmowym edytorze i symulatorze GRAFCET działającym w
przeglądarce: otwórz przykłady i obserwuj, jak ewoluują krok po kroku.

## Co oznacza skrót GRAFCET

GRAFCET to skrót od _GRAphe Fonctionnel de Commande Étape-Transition_, po francusku „funkcjonalny
wykres sterowania krok–tranzycja”. Zaproponowała go w 1977 roku grupa robocza AFCET, francuskiego
stowarzyszenia cybernetyki, wspólnie z ADEPA, francuską agencją rozwoju produkcji zautomatyzowanej.
Wyrósł z sieci Petriego i powstał jako przejrzysty, niezależny od technologii sposób zapisania, co
ma robić układ sterowania, zanim ktokolwiek napisze choćby jeden wiersz kodu PLC.

- **1982**: norma francuska NF C03-190.
- **1988**: norma międzynarodowa IEC 848, _Preparation of function charts for control systems_.
- **2002**: IEC 60848 wydanie 2, _GRAFCET specification language for sequential function charts_.
- **2013**: IEC 60848 wydanie 3, obecnie obowiązujące, opublikowane też w Europie jako EN 60848 (w
  Polsce PN-EN 60848).

GRAFCET jest nauczany w technikach, na kursach zawodowych i na studiach inżynierskich z automatyki i
robotyki, szczególnie w krajach francusko-, niemiecko-, hiszpańsko- i portugalskojęzycznych.
Zgodnie z konwencją _GRAFCET_ to język, a _grafcet_ to pojedynczy wykres w nim zapisany.

## Elementy grafcetu

<!-- figure: anatomy | Części grafcetu -->

- **Krok** to kwadrat z numerem. Oznacza stabilną sytuację układu: _oczekiwanie_, _napełnianie_,
  _wiercenie_. W każdej chwili każdy krok jest **aktywny** albo **nieaktywny**, a zbiór aktywnych
  kroków to **sytuacja** grafcetu. Zmienna kroku `X1` jest prawdziwa, dopóki krok 1 jest aktywny.
- **Krok początkowy**, rysowany jako podwójny kwadrat, jest aktywny przy starcie układu. Każdy
  grafcet potrzebuje co najmniej jednego.
- **Tranzycja** to krótka pozioma kreska przecinająca połączenie. Zawsze leży między krokami: dwa
  kroki nigdy nie są połączone bezpośrednio, tak samo jak dwie tranzycje.
- **Warunek tranzycji** (receptywność) to warunek zapisany obok tranzycji, na przykład `start` lub
  `pressure > 6`. Warunek `1` jest zawsze prawdziwy.
- **Połączenia skierowane** łączą kroki i tranzycje. Czyta się je z góry w dół; połączenie
  biegnące w górę ma strzałkę.
- **Akcje** to prostokąty na prawo od kroku: co układ robi, gdy krok jest aktywny, na przykład
  _włącz silnik_.

## Pięć reguł ewolucji

IEC 60848 dokładnie określa, jak ewoluuje grafcet, za pomocą pięciu reguł.

1. **Sytuacja początkowa**: przy starcie kroki początkowe są aktywne, a wszystkie pozostałe
   nieaktywne.
2. **Zadziałanie tranzycji**: tranzycja jest **odblokowana**, gdy wszystkie kroki bezpośrednio nad
   nią są aktywne. **Zadziała** (zostaje przekroczona), gdy jest odblokowana i jej warunek jest
   prawdziwy.
3. **Ewolucja kroków aktywnych**: zadziałanie tranzycji aktywuje wszystkie kroki bezpośrednio pod
   nią i dezaktywuje wszystkie kroki bezpośrednio nad nią.
4. **Jednoczesne zadziałanie**: wszystkie tranzycje, które mogą zadziałać w tej samej chwili,
   zadziałają jednocześnie.
5. **Jednoczesna aktywacja i dezaktywacja**: krok, który w tej samej chwili jest aktywowany i
   dezaktywowany, pozostaje aktywny.

Gdy zmienia się wejście, reguły są stosowane raz za razem, przy tych samych wejściach, aż żadna
tranzycja nie może już zadziałać. To **poszukiwanie stanu stabilnego**. Krok, który zostaje
aktywowany i opuszczony w trakcie tego poszukiwania, to **krok niestabilny** (krok chwilowy): jego
akcje ciągłe nigdy się nie wykonują, ale akcje zapamiętane tak. Jeśli na przykład warunki pod
krokami 1 i 2 są już oba prawdziwe, gdy krok 1 staje się aktywny, grafcet przechodzi przez krok 2
prosto do kroku 3, a wyjścia kroku 2 nigdy się nie włączają.

## Warunki tranzycji: warunki, zbocza i timery

Warunek tranzycji to wyrażenie logiczne z wejść, zmiennych wewnętrznych, zmiennych kroków i czasu.
Notacja podręcznikowa i sposób jej wpisywania w GrafcetMaker:

| Notacja           | Znaczenie                                                                  | Wpisywane w GrafcetMaker |
| ----------------- | -------------------------------------------------------------------------- | ------------------------ |
| a · b             | a I b                                                                      | `a * b`                  |
| a + b             | a LUB b                                                                    | `a + b`                  |
| a z nadkreśleniem | NIE a                                                                      | `/a`                     |
| ↑a                | zbocze narastające: prawdziwe w chwili, gdy a staje się prawdziwe          | `↑a` lub `RE a`          |
| ↓a                | zbocze opadające: prawdziwe w chwili, gdy a staje się fałszywe             | `↓a` lub `FE a`          |
| X3                | krok 3 jest aktywny                                                        | `X3`                     |
| 5 s/X2            | prawdziwe 5 s po aktywacji kroku 2                                         | `5s/X2`                  |
| t1/a/t2           | prawdziwe t1 po tym, jak a staje się prawdziwe, znów fałszywe t2 po spadku | `2s/a/1s`                |
| [level > 80]      | porównanie wartości liczbowej                                              | `level > 80`             |
| = 1               | zawsze prawdziwe                                                           | `1`                      |

<!-- figure: timer | Warunek z timerem: grzałka pracuje przez 5 sekund -->

Zbocza mają znaczenie, gdy sygnał pozostaje prawdziwy: z `↑start` cykl rusza raz na każde
naciśnięcie przycisku i nie rusza ponownie, dopóki przycisk jest trzymany. Pełna składnia edytora
jest opisana w pomocy, w rozdziale [Pisanie warunków tranzycji](app:#help/expressions).

## Akcje

<!-- figure: actions | Akcje ciągła, warunkowa i zapamiętane kroku 4 -->

- **Akcja ciągła** jest prawdziwa, dopóki jej krok jest aktywny: _Lamp_ świeci, dopóki krok 4 jest
  aktywny.
- **Akcja warunkowa** to akcja ciągła z **warunkiem przypisania** zapisanym nad jej ramką: _Horn_
  brzmi tylko, gdy krok 4 jest aktywny **i** `alarm` jest prawdziwy.
- Akcje **opóźnione** i **ograniczone w czasie** to akcje warunkowe, których warunek zawiera timer:
  z `3s/X4` wyjście włącza się 3 s po aktywacji kroku 4; z `/(3s/X4)` jest włączone tylko przez
  pierwsze 3 s.
- **Akcja zapamiętana** przypisuje wartość jednorazowo, a wartość pozostaje, dopóki inna akcja jej
  nie zmieni. Wykonuje się przy **aktywacji** kroku (strzałka w górę), przy jego **dezaktywacji**
  (strzałka w dół) lub **przy zdarzeniu**, gdy krok jest aktywny (chorągiewka ze zdarzeniem, tutaj
  `↑reset`). Liczniki takie jak `C := C + 1` to typowe akcje zapamiętane.

Wyjście sterowane akcjami ciągłymi automatycznie podąża za krokami. Wyjście ustawione akcją
zapamiętaną pozostaje ustawione, dopóki inna akcja zapamiętana go nie skasuje, więc zaplanuj, gdzie
to nastąpi.

## Sekwencje, rozgałęzienia LUB i gałęzie równoległe

### Wybór drogi: rozgałęzienie LUB

Gdy po kroku następuje kilka tranzycji, grafcet wybiera drogę, której warunek jest prawdziwy:
**gałąź alternatywną**, rysowaną pojedynczą poziomą linią (**rozgałęzienie LUB**, w SFC _wybór
sekwencji_). Drogi łączą się ponownie na pojedynczej linii (**zbieżność LUB**).

<!-- figure: or | Rozgałęzienie i zbieżność LUB: jedna gałąź albo druga -->

Warunki powinny się **wykluczać**, tak aby nigdy nie były prawdziwe jednocześnie, jak tutaj `a` i
`/a * b`. W przeciwnym razie obie tranzycje zadziałają naraz (reguła 4) i obie gałęzie staną się
aktywne. GrafcetMaker ostrzega, gdy nie może udowodnić, że warunki gałęzi alternatywnych się
wykluczają.

### Kilka czynności naraz: rozgałęzienie I

Gdy po tranzycji następuje kilka kroków, wszystkie są aktywowane razem: to **gałęzie równoległe**,
rysowane podwójną linią (**rozgałęzienie I**, w SFC _sekwencja współbieżna_). Gałęzie również
kończą się podwójną linią (**zbieżność I**): tranzycja pod nią jest odblokowana dopiero, gdy
ostatni krok każdej gałęzi jest aktywny, więc czeka na zakończenie wszystkich gałęzi. W ten sposób
grafcet **synchronizuje** zadania.

<!-- figure: and | Rozgałęzienie i zbieżność I: wiercenie i mocowanie jednocześnie -->

### Pętle, skoki, tranzycje źródłowe i końcowe

- **Pętla** wraca do wcześniejszego kroku połączeniem w górę ze strzałką: zwykły sposób na
  powtarzanie cyklu.
- **Skok** (pominięcie kroków) to rozgałęzienie LUB, którego jedna gałąź prowadzi prosto do
  późniejszego kroku, na przykład aby pominąć opcjonalną operację.
- **Tranzycja źródłowa** nie ma nad sobą kroku. Jest zawsze odblokowana, więc zadziała za każdym
  razem, gdy jej warunek jest prawdziwy; użyj zbocza, np. `↑a`.
- **Tranzycja końcowa** (ujście) nie ma pod sobą kroku: jej zadziałanie tylko dezaktywuje kroki nad
  nią.

## Strukturyzacja dużych aplikacji

Rzeczywiste maszyny opisuje się kilkoma współpracującymi grafcetami.

- **Grafcety częściowe** opisują każdy jedną część układu, na przykład cykl produkcyjny, tryby
  pracy i bezpieczeństwo. Działają jednocześnie i widzą nawzajem swoje kroki przez zmienne kroków
  `Xn`. Razem tworzą grafcet globalny.
- **Makrokrok** zastępuje szczegółową sekwencję narysowaną na osobnym arkuszu, jego
  **rozwinięcie**. Rozwinięcie ma jeden krok wejściowy **E** i jeden krok wyjściowy **S**.
  Zadziałanie tranzycji nad makrokrokiem aktywuje krok E; tranzycja pod makrokrokiem jest
  odblokowana, gdy krok S jest aktywny.
- **Krok obejmujący** zawiera jeden lub więcej całych grafcetów, które żyją tylko, gdy jest on
  aktywny. Gdy zostaje aktywowany, kroki objęte oznaczone gwiazdką stają się aktywne; gdy zostaje
  dezaktywowany, wszystkie kroki objęte są dezaktywowane.
- **Rozkaz wymuszania**, rysowany w ramce akcji z podwójnym obramowaniem, narzuca sytuację innemu
  grafcetowi: `G2{8}` wymusza, by aktywny był tylko krok 8 grafcetu G2, `G2{*}` zamraża G2 w
  bieżącej sytuacji, a `G2{}` dezaktywuje wszystkie jego kroki. Wymuszany grafcet nie może
  ewoluować samodzielnie. Wymuszanie to standardowy sposób opisu zatrzymań awaryjnych i
  inicjalizacji.

<!-- figure: macro | Makrokrok: dwie poziome linie wewnątrz kwadratu -->

## GRAFCET a SFC

Język SFC (Sequential Function Chart) z normy IEC 61131-3 wywodzi się z GRAFCET i wygląda niemal
tak samo, ale oba służą innym celom.

|            | GRAFCET (IEC 60848)                                                    | SFC (IEC 61131-3)                                         |
| ---------- | ---------------------------------------------------------------------- | --------------------------------------------------------- |
| Cel        | Specyfikacja: wymagane działanie, niezależne od technologii            | Język programowania wykonywany przez sterownik PLC        |
| Ewolucja   | Wszystkie możliwe tranzycje naraz, potem poszukiwanie stanu stabilnego | Zwykle jedna ewolucja na cykl PLC, zależnie od sterownika |
| Akcje      | Akcje ciągłe, warunkowe, opóźnione, ograniczone w czasie i zapamiętane | Kwalifikatory akcji N, S, R, P, P0, P1, L, D, SD, DS i SL |
| Hierarchia | Grafcety częściowe, makrokroki, kroki obejmujące i rozkazy wymuszania  | Przez strukturę programu                                  |

Typowy sposób pracy to najpierw zapisać i sprawdzić GRAFCET, a potem zaimplementować go w SFC, LD
lub Structured Text. GrafcetMaker generuje z wykresu Structured Text i PLCopen TC6 XML jako punkt
wyjścia tej implementacji; zawsze sprawdź wygenerowany kod przed użyciem.

## Przykłady

### Sygnalizacja świetlna z przyciskiem dla pieszych

<!-- figure: example-trafficLight | Sygnalizacja świetlna: timery i zapamiętane żądanie -->

Krok 0 daje pieszym zielone światło przez 10 s (`10s/X0`), potem krok 1 przepuszcza samochody.
Samochody mają zielone przez 30 s, ale naciśnięcie przycisku dla pieszych skraca ten czas do 10 s:
naciśnięcie jest zapamiętywane akcją zapamiętaną przy zdarzeniu `↑request` i zapominane, gdy krok 0
znów staje się aktywny. Krok 2 pokazuje żółte przez 3 s.

### Stanowisko wiercenia z licznikiem detali

<!-- figure: example-drillingStation | Stanowisko wiercenia: cykl obróbki z konserwacją co 100 detali -->

Cykl obróbki: zamocuj detal, wierć w dół, wycofaj, odmocuj. Uchwyt jest ustawiany i kasowany akcjami
zapamiętanymi, a krok 4 liczy detale. Po kroku 4 rozgałęzienie LUB z wykluczającymi się warunkami
wraca do początku albo co 100 detali przechodzi do konserwacji.

Edytor zawiera więcej przykładów: napełnianie zbiornika z wejściami liczbowymi, przenośniki
równoległe z grafcetem bezpieczeństwa wymuszającym linię, linię rozlewniczą (makrokrok, trzy
stanowiska równolegle, kontrola i liczniki) oraz tryby pracy (krok obejmujący, pauza zamrażająca
cykl, zatrzymanie awaryjne). Otwórz je z ekranu startowego [GrafcetMaker](app:).

## Rysowanie i symulacja GRAFCET online

[GrafcetMaker](app:) to darmowy edytor GRAFCET o otwartym kodzie, stworzony dla automatyków,
nauczycieli i studentów. Działa w całości w przeglądarce, również offline, i nie wymaga konta;
Twoje wykresy zostają na Twoim komputerze.

- Rysuj kroki, tranzycje, akcje i gałęzie myszą lub klawiaturą i utrzymuj porządek dzięki
  automatycznemu układowi.
- Pisz warunki tranzycji z autouzupełnianiem i tabelą zmiennych oraz otrzymuj jasne komunikaty o
  błędach z szybkimi poprawkami.
- Symuluj zgodnie z regułami IEC 60848: kroki aktywne, timery, zbocza, kroki niestabilne,
  wymuszanie i wykres czasowy każdej zmiennej.
- Strukturyzuj projekty grafcetami częściowymi, makrokrokami, krokami obejmującymi i rozkazami
  wymuszania.
- Eksportuj do PDF z tabliczką, SVG i PNG albo do Structured Text i PLCopen TC6 XML, i udostępniaj
  cały projekt jako link.

[Otwórz darmowy edytor GRAFCET](app:)

## Najczęściej zadawane pytania

### Do czego służy GRAFCET?

Do specyfikowania działania układów automatyki z sekwencjami: maszyn, linii montażowych, pakowania,
procesów wsadowych, wind, sygnalizacji świetlnej. Wykres jest wspólnym punktem odniesienia dla
osób, które projektują maszynę, programują sterownik PLC i ją testują.

### Czy GRAFCET to to samo co SFC?

Nie. SFC (IEC 61131-3) wywodzi się z GRAFCET i używa tych samych symboli, ale GRAFCET jest językiem
specyfikacji o precyzyjnych regułach ewolucji, a SFC jest językiem programowania PLC, którego
wykonanie zależy od sterownika. Zobacz [GRAFCET a SFC](#grafcet-a-sfc).

### Czym różni się krok od tranzycji?

Krok to sytuacja, która trwa (układ napełnia zbiornik); tranzycja to chwila, w której układ
przechodzi z jednej sytuacji do następnej, gdy jej warunek staje się prawdziwy (zbiornik jest
pełny).

### Co oznacza X1?

`X1` to zmienna kroku 1: jest prawdziwa, dopóki krok 1 jest aktywny. Używa się jej w warunkach
tranzycji, w warunkach akcji i w innych grafcetach, na przykład `5s/X1` lub `X1 * /X5`.

### Czym jest krok niestabilny?

To krok, który zostaje aktywowany i ponownie dezaktywowany w ramach jednego poszukiwania stanu
stabilnego, ponieważ warunek pod nim był już prawdziwy. Jego akcje ciągłe nie są wykonywane; jego
akcje zapamiętane tak.

### Jak zamienić GRAFCET na program PLC?

Każdy krok staje się bitem pamięci, każda tranzycja warunkiem, który ustawia kroki pod nią i kasuje
kroki nad nią, a wyjścia są wyznaczane z bitów kroków. Można to zrobić ręcznie w LD lub Structured
Text, użyć języka SFC swojego sterownika albo pozwolić GrafcetMaker wygenerować Structured Text lub
PLCopen XML jako punkt wyjścia.

### Czy istnieje darmowy program do GRAFCET?

Tak: [GrafcetMaker](app:) jest darmowy i ma otwarty kod (licencja MIT). Działa w każdej nowoczesnej
przeglądarce na Windows, macOS, Linux, tabletach i telefonach, a firmy mogą hostować go we własnej
sieci.
