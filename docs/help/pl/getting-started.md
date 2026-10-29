# Pierwsze kroki

W tym samouczku rysujesz sterowanie małego zbiornika: gdy operator naciśnie **start**, pompa
napełnia zbiornik, aż będzie pełny (**full**), potem zawór go opróżnia, aż będzie pusty
(**empty**), a układ czeka na następny start. Zajmuje to około dziesięciu minut.

<!-- figure: sequence | Grafcet, który narysujesz -->

## 1. Orientacja w aplikacji {#1-find-your-way-around}

- **Obszar roboczy** wypełnia okno: tam rysujesz. Wszystko inne unosi się nad nim, lekko
  przygaszone, dopóki nie wskażesz tego kursorem, aby diagram pozostał na pierwszym planie.
- **U góry**: menu główne ☰ i nazwa projektu po lewej; narzędzia pośrodku (zaznaczanie,
  przesuwanie widoku, umieszczanie kroku, tranzycji, komentarza lub akcji), zakończone przyciskiem
  ▶ **Symuluj**; liczniki problemów, **Eksport** i udostępnianie po prawej.
- **Pod narzędziami**: podpowiedzi pokazują, co można zrobić w tej chwili. Obserwuj je podczas
  tego samouczka.
- **Po lewej**: **Właściwości** zaznaczonego elementu pojawiają się na karcie, dopóki jest on
  zaznaczony.
- **Na dole**: powiększenie, cofanie i ponawianie po lewej; jedna karta na grafcet pośrodku;
  przyciski **Zmienne**, **Problemy**, **Wykres czasowy** i **Konspekt** po prawej, każdy
  otwierający swój panel po prawej stronie okna, a dalej pomoc, opinie i flaga zmieniająca język.

Nowy projekt zawiera już grafcet **G1** z krokiem **0**. Jego podwójny kwadrat oznacza **krok
początkowy**: jest on aktywny, gdy układ startuje.

## 2. Dodaj pierwszą tranzycję i krok {#2-add-the-first-transition-and-step}

1. Kliknij krok **0**, aby go zaznaczyć.
2. Naciśnij <kbd>Enter</kbd>. Poniżej pojawią się tranzycja i krok **1**, a Ty wpisujesz
   **warunek tranzycji**, czyli warunek przejścia dalej, dokładnie tam, gdzie jest narysowany.
3. Wpisz `start` i naciśnij <kbd>Enter</kbd>.

`start` nie jest jeszcze zadeklarowana: podczas pisania edytor pokazuje **Nowa zmienna start:
BOOL, wejście**, a naciśnięcie <kbd>Enter</kbd> dodaje ją do listy zmiennych (informuje o tym
komunikat).

## 3. Dodaj akcję {#3-add-an-action}

Krok 1 jest nadal zaznaczony. Naciśnij <kbd>A</kbd>, wpisz `Pump` i naciśnij <kbd>Enter</kbd>:
`Pump` zostaje utworzona jako wyjście BOOL. Pompa pracuje teraz, dopóki krok 1 jest aktywny.

## 4. Kontynuuj sekwencję {#4-continue-the-sequence}

1. Naciśnij ponownie <kbd>Enter</kbd>: za krokiem 1 zostają dodane tranzycja i krok **2**. Wpisz
   `full` jako warunek tranzycji i utwórz wejście.
2. Naciśnij <kbd>A</kbd> i dodaj akcję `Valve` (utwórz wyjście).

> **Wskazówka:** wolisz mysz? Zaznaczony krok pokazuje przerywane **zarysy** tego, co dodałyby
> <kbd>Enter</kbd> i <kbd>A</kbd>; kliknij jeden z nich, aby go dodać (zobacz
> [Edycja diagramów](editing.md#ghosts)).

## 5. Zamknij pętlę {#5-close-the-loop}

Cykl musi wrócić do kroku 0, gdy zbiornik jest pusty.

1. Przy zaznaczonym kroku **2** naciśnij <kbd>L</kbd>. Podpowiedzi mówią **Kliknij krok, do
   którego ma wracać pętla**.
2. Kliknij krok **0**. Pod krokiem 2 zostaje dodana tranzycja z połączeniem prowadzącym w górę do
   kroku 0, narysowanym ze strzałką, bo biegnie w górę.
3. Wpisz `empty` jako jej warunek, naciśnij <kbd>Enter</kbd> i utwórz wejście.

Twój wykres odpowiada teraz rysunkowi na górze tej strony.

## 6. Sprawdź go {#6-check-it}

Spójrz na liczniki w prawym górnym rogu: czerwone kółko liczy **błędy**, pomarańczowy trójkąt
liczy **ostrzeżenia**. Kliknij je, aby otworzyć listę **Problemy**. Każdy problem mówi, co jest
nie tak i gdzie; kliknij go, aby przejść do elementu, i użyj przycisku poprawki, jeśli jest. Poprawny
wykres nie ma błędów. Znaczenie każdego komunikatu opisuje
[Rozwiązywanie problemów](troubleshooting.md).

## 7. Symuluj {#7-simulate}

1. Naciśnij <kbd>F5</kbd>. Diagram zostaje zablokowany, a po lewej pojawia się panel
   **Symulacja**. Krok 0 ma znacznik: jest aktywny.
2. W panelu włącz **start** (lub kliknij `start` tam, gdzie jest napisane na diagramie).
   Tranzycja zadziała: krok 1 staje się aktywny, a jego akcja **Pump** pokazuje znak ✓.
3. Wyłącz **start**, a potem włącz **full**: krok 2 staje się aktywny, a **Valve** się włącza.
4. Wyłącz **full** i włącz **empty**: grafcet wraca do kroku 0.
5. Kliknij **Wykres czasowy** w prawym dolnym rogu, aby zobaczyć przebieg każdego sygnału w
   czasie. Naciśnij <kbd>Shift+F5</kbd>, aby zatrzymać.

Co się stanie, jeśli **start** pozostanie włączony, gdy zbiornik stanie się pusty? Wypróbuj: gdy
tylko krok 0 znów jest aktywny, jego tranzycja zadziała ponownie. To GRAFCET działający dokładnie
tak, jak go narysowano. Użyj zbocza narastającego `↑start`, aby reagować tylko na nowe naciśnięcie
(wpisz `^start`, zobacz [Pisanie warunków tranzycji](expressions.md)).

## 8. Zapisz {#8-save}

Twoja praca jest automatycznie zapisywana w przeglądarce po każdej zmianie. Aby otrzymać plik,
który możesz zachować, wysłać lub umieścić w systemie kontroli wersji, naciśnij <kbd>Ctrl+S</kbd>:
projekt zostaje zapisany jako `<name>.grafcet.json`. Kliknij dwukrotnie nazwę projektu u góry, aby
zmienić jego nazwę.

## Co dalej? {#where-next}

- [Podstawy GRAFCET](grafcet-basics.md) wyjaśniają reguły stojące za tym, co właśnie zobaczyłeś.
- [Edycja diagramów](editing.md) pokazuje gałęzie równoległe i alternatywne oraz inne szybkie
  ruchy.
- [Symulacja](simulation.md) omawia timery, dziennik ewolucji i scenariusze.
