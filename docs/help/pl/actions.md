# Akcje

Akcje to prostokąty na prawo od kroku. Mówią, co układ robi, dopóki krok jest aktywny lub gdy się
nim staje. Zaznacz krok i naciśnij <kbd>A</kbd>, aby dodać akcję; naciśnij <kbd>A</kbd> ponownie na
akcji, aby dodać następną. Wybierz jej **rodzaj** przyciskami z obrazkami w panelu **Właściwości**:
każdy pokazuje, jak diagram rysuje dany rodzaj.

## Akcje ciągłe {#continuous-actions}

Najczęstszy rodzaj. Tekst to nazwa wyjścia (lub zmiennej wewnętrznej), np. `Pump`. Wyjście jest
prawdziwe, **dopóki** krok jest aktywny, i fałszywe, gdy tylko żaden aktywny krok go nie ustawia.

Wybierz rodzaj **Warunkowa**, aby dodać warunek (_warunek przypisania_): jego pole pojawia się pod
przyciskami rodzaju, a wyjście jest prawdziwe, dopóki krok jest aktywny **i** warunek jest
prawdziwy. Jest rysowany na krótkiej linii nad ramką.

<!-- figure: continuous | Lamp, dopóki krok 4 jest aktywny; Horn tylko, gdy także alarm jest prawdziwy -->

Timery w warunku dają akcje opóźnione i ograniczone w czasie znane z innych notacji:

- `5s/X4` — opóźniona: wyjście włącza się 5 s po tym, jak krok 4 stał się aktywny.
- `/(5s/X4)` — ograniczona w czasie: włączona tylko przez pierwsze 5 s kroku 4.

> **Uwaga:** kroki, przez które grafcet przechodzi podczas ewolucji chwilowej (zobacz
> [Podstawy GRAFCET](grafcet-basics.md)), nie wykonują swoich akcji ciągłych.

## Akcje zapamiętane {#stored-actions}

Akcja zapamiętana zmienia wartość **jeden raz**, a wartość pozostaje, dopóki inna akcja jej nie
zmieni. Jej tekst to przypisanie: `C := C + 1`, `Motor := 0`, `Speed := 2.5`. Aby ustawić zmienną
BOOL na TRUE, wystarczy sama nazwa: `Motor` oznacza `Motor := 1`.

- **Przy aktywacji** — wykonywana, gdy krok staje się aktywny. Rysowana ze strzałką **↑ nad**
  ramką.
- **Przy dezaktywacji** — wykonywana, gdy krok staje się nieaktywny. Rysowana ze strzałką **↓ pod**
  ramką.
- **Przy zdarzeniu** — wykonywana za każdym razem, gdy przy aktywnym kroku wystąpi **zdarzenie**,
  np. `↑reset`. Rysowana z **chorągiewką** w prawym górnym rogu, obok zdarzenia. Wpisz zdarzenie w
  panelu Właściwości; akcja przy zdarzeniu bez zdarzenia nigdy się nie wykona i jest zgłaszana jako
  problem.

<!-- figure: stored | Zapamiętane przy aktywacji (↑), przy dezaktywacji (↓) i przy zdarzeniu (chorągiewka) -->

Akcje przy aktywacji i dezaktywacji również mogą mieć warunek: wykonują się tylko wtedy, gdy jest
on prawdziwy w tej chwili.

Akcje zapamiętane są wykonywane nawet przez kroki, przez które grafcet tylko przechodzi podczas
ewolucji chwilowej. Używaj ich do liczenia, do zatrzaśnięcia wartości (`Motor := 1` w jednym
kroku, `Motor := 0` w innym) albo do zapamiętania, że coś się wydarzyło.

## Rozkazy wymuszania {#forcing-orders}

Rozkaz wymuszania narzuca sytuację innemu grafcetowi częściowemu, dopóki jego krok jest aktywny:
`G2{8}` aktywuje tylko krok 8 grafcetu G2, `G2{*}` zamraża G2 w bieżącej sytuacji, `G2{}`
dezaktywuje wszystkie jego kroki, a `G2{INIT}` przywraca jego sytuację początkową. Jest rysowany z
podwójną ramką. Zobacz [Makrokroki, kroki obejmujące i wymuszanie](hierarchy.md).

## Akcje bez kroku {#actions-without-a-step}

Akcja nie musi należeć do kroku. Gdy nic nie jest zaznaczone, naciśnij <kbd>A</kbd> (lub wybierz
narzędzie **Umieść akcję**) i kliknij puste miejsce obszaru roboczego: akcja jest rysowana
samodzielnie, bez połączenia, i jest **zawsze aktywna**.

- Akcja ciągła bez kroku ustawia swoje wyjście zawsze, gdy jej **warunek przypisania** jest
  prawdziwy, niezależnie od kroków: `Lamp` z warunkiem `a * b` to logika `Lamp = a · b`. Bez
  warunku wyjście jest zawsze prawdziwe.
- Akcja zapamiętana przy zdarzeniu wykonuje się za każdym razem, gdy wystąpi zdarzenie, np.
  `C := C + 1` przy `↑pulse` liczy impulsy. Przy aktywacji wykonuje się raz, gdy startuje
  symulacja. Przy dezaktywacji nigdy się nie wykonuje, bo akcja nigdy nie jest dezaktywowana.

Przeciągnij dowolną akcję, aby ją przenieść: na krok, aby ją do niego dołączyć (krok się
podświetla, a znacznik pokazuje jej miejsce wśród akcji kroku), lub na puste miejsce, aby
pozostawić ją bez kroku.

## Kilka akcji {#several-actions}

Krok może mieć dowolnie wiele akcji; są rysowane obok siebie. Przeciągnij jedną wzdłuż rzędu, aby
zmienić ich kolejność, albo użyj **Przesuń akcję w lewo / w prawo** w panelu Właściwości, gdzie
zaznaczony krok pokazuje swoje akcje jako zwarte wiersze (kliknij jeden, aby go rozwinąć). Usuń
akcję klawiszem <kbd>Del</kbd>.

> **Uwaga:** gdy dwa kroki, które mogą być aktywne jednocześnie, ustawiają to samo wyjście akcjami
> ciągłymi, wynik jest trudny do odczytania. GrafcetMaker ostrzega przed tym.
