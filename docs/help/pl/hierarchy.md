# Makrokroki, kroki obejmujące i wymuszanie

Duże aplikacje łatwiej czytać, gdy są podzielone. GRAFCET oferuje do tego trzy narzędzia, wszystkie
dostępne w GrafcetMaker.

## Kilka grafcetów częściowych {#several-partial-grafcets}

Projekt może zawierać kilka **grafcetów częściowych**, po jednej karcie na dole okna, np. _G1_ dla
cyklu produkcyjnego i _G2_ dla logiki bezpieczeństwa. Wszystkie działają jednocześnie i mogą się
nawzajem obserwować przez zmienne kroków (`X21` w G1 jest prawdziwe, dopóki krok 21 grafcetu G2
jest aktywny).

- Kliknij **+** obok kart, aby dodać grafcet. Numery jego kroków zaczynają się od następnej wolnej
  dziesiątki (20, 30…), więc odwołania `Xn` pozostają jednoznaczne.
- Kliknij kartę dwukrotnie (lub naciśnij na niej <kbd>F2</kbd>), aby zmienić jej nazwę; przeciągnij
  ją w bok, aby zmienić kolejność; naciśnij na niej <kbd>Del</kbd>, aby ją usunąć.
  <kbd>Ctrl</kbd>+klik lub <kbd>Shift</kbd>+klik wybiera kilka kart, aby usunąć je razem. Prawy
  przycisk na karcie daje więcej opcji. Wiele kart przewija się kółkiem myszy lub przyciskami ‹ ›.

## Makrokroki {#macro-steps}

**Makrokrok** zastępuje szczegółową sekwencję narysowaną na osobnym arkuszu, jego **rozwinięcie**.
Rysuje się go jako krok z dwiema poziomymi liniami.

<!-- figure: macro | Makrokrok w sekwencji głównej -->

1. Zaznacz krok i ustaw jego **Rodzaj** na _Makrokrok_ w panelu Właściwości (lub
   **Edycja › Zamień w makrokrok (z rozwinięciem)**).
2. Otwiera się nowa karta z rozwinięciem: krokiem wejściowym **E** i krokiem wyjściowym **S**
   połączonymi tranzycją. Narysuj szczegółową sekwencję między nimi.
3. Kliknij dwukrotnie makrokrok (lub naciśnij <kbd>Alt+↓</kbd>), aby otworzyć jego rozwinięcie;
   <kbd>Alt+↑</kbd> wraca do makrokroku.

Gdy makrokrok zostaje aktywowany, aktywny staje się jego krok wejściowy; tranzycja za makrokrokiem
jest odblokowana dopiero wtedy, gdy aktywny jest krok wyjściowy. Makrokrok liczy się jako aktywny,
dopóki aktywny jest którykolwiek krok jego rozwinięcia.

## Kroki obejmujące {#enclosing-steps}

**Krok obejmujący** zawiera cały grafcet, **grafcet objęty**, który działa tylko, dopóki krok
obejmujący jest aktywny. Używaj go dla trybów pracy: _automatyczny_, _ręczny_, _ustawianie_.
Rysuje się go jako krok z dwiema pionowymi liniami.

1. Ustaw **Rodzaj** kroku na _Krok obejmujący_ (lub
   **Edycja › Zamień w krok obejmujący (z grafcetem objętym)**).
2. Nowa karta zawiera grafcet objęty. Oznaczone tam `*` kroki stają się aktywne, gdy krok
   obejmujący zostaje aktywowany.
3. Gdy krok obejmujący zostaje opuszczony, każdy krok grafcetu objętego jest dezaktywowany.

Karty rozwinięć i grafcetów objętych mają oznaczenie **M** lub **E**.

## Rozkazy wymuszania {#forcing-orders}

**Rozkaz wymuszania** to akcja, która narzuca sytuację innemu grafcetowi częściowemu, dopóki jej
krok jest aktywny. Wymuszany grafcet w tym czasie nie ewoluuje.

| Rozkaz     | Skutek dla G2                                |
| ---------- | -------------------------------------------- |
| `G2{8}`    | aktywny jest tylko krok 8                    |
| `G2{8, 9}` | aktywne są tylko kroki 8 i 9                 |
| `G2{*}`    | zamrożony w bieżącej sytuacji                |
| `G2{}`     | żaden krok nie jest aktywny (sytuacja pusta) |
| `G2{INIT}` | powrót do sytuacji początkowej               |

Wymuszanie to standardowy sposób opisywania zatrzymań awaryjnych i zmian trybu: na przykład
grafcet bezpieczeństwa wymusza na grafcecie produkcyjnym jego sytuację początkową. Grafcet nie
może wymuszać samego siebie, a dwa grafcety nie mogą wymuszać się nawzajem.

## Sprawdzenia {#checks}

GrafcetMaker sprawdza, czy każdy makrokrok i krok obejmujący ma własny podgrafcet właściwego
rodzaju, czy rozwinięcia mają jeden krok wejściowy i jeden krok wyjściowy oraz czy rozkazy
wymuszania wskazują istniejące grafcety i kroki.
