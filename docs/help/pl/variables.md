# Zmienne

Każda nazwa użyta w warunku tranzycji lub akcji jest **zmienną** projektu. Jej deklaracja nadaje
jej typ i kierunek, pozwala GrafcetMaker sprawdzać wyrażenia, a symulatorowi proponować właściwe
elementy sterujące.

## Rodzaje zmiennych {#kinds-of-variables}

- **Kierunek**: **wejście** pochodzi z procesu (czujniki, przyciski) i można je tylko odczytywać;
  **wyjście** steruje procesem (silniki, lampy); zmienna **wewnętrzna** to pamięć lub licznik.
- **Typ**: `BOOL` (prawda / fałsz), `INT` (liczba całkowita), `REAL` (liczba dziesiętna) lub
  `TIME` (czas trwania, np. `500ms`, `3s`).
- **Wartość początkowa**: wartość na starcie symulacji (FALSE lub 0, gdy pusta).
- **Adres** i **komentarz**: dowolny tekst, np. adres PLC `%I0.0` i opis sygnału.

W nazwach wielkość liter nie ma znaczenia; używa się w nich liter, cyfr i `_`, i nie mogą być
słowami zastrzeżonymi (`AND`, `OR`, `NOT`, `RE`, `FE`, `TRUE`, `FALSE`, `MOD`, `INIT`) ani wyglądać
jak zmienna kroku (`X12`).

## Tworzenie zmiennych {#creating-variables}

- Podczas pisania wyrażenia nowa nazwa jest deklarowana po zatwierdzeniu: jako wejście w warunku
  tranzycji, jako wyjście w akcji. To najszybszy sposób.
- **Dodaj zmienną** na liście lub w tabeli Zmienne.
- **Importuj** listę z Excela lub CSV (poniżej).

## Tabela zmiennych {#the-variable-table}

Przycisk **Zmienne** w prawym dolnym rogu otwiera zmienne po prawej stronie okna: zwartą listę
(wyszukiwanie, filtry, grupy według kierunku; kliknij zmienną, aby ją edytować i zobaczyć, gdzie
jest używana). Poszerz panel za jego lewą krawędź, a stanie się tabelą ze wszystkimi polami w
kolumnach. Edytuj dowolną komórkę na miejscu (<kbd>Enter</kbd> lub opuszczenie komórki zatwierdza,
<kbd>Esc</kbd> cofa), sortuj, klikając nagłówek kolumny, filtruj według tekstu, kierunku i typu.
Tabela pozostaje szybka nawet przy tysiącach zmiennych.

Kolumna **Użycia** liczy wyrażenia, w których występuje każda zmienna; nieużywana zmienna pokazuje
`0` na pomarańczowo. Kliknij liczbę, aby otworzyć zmienną na karcie właściwości: edytuj wszystkie
jej pola i zobacz, **gdzie jest używana**; kliknij użycie, aby przejść do tego warunku tranzycji
lub tej akcji na diagramie.

Przycisk z miotłą obok **⋯** usuwa naraz wszystkie nieużywane zmienne (jego oznaczenie mówi ile):
te, których nie używa żaden warunek tranzycji, akcja ani warunek akcji i których nie ustawia żaden
scenariusz. Cofa się to jednym krokiem (<kbd>Ctrl+Z</kbd>). Jest to też w palecie poleceń:
**Usuń nieużywane zmienne**.

Na telefonie panel Zmienne jest zamiast tego zwartą listą: wyszukiwanie, filtry (**Wejścia**,
**Wyjścia**, **Wewnętrzne**), grupy według kierunku, a stuknięcie otwiera zmienną z jej użyciami.

## Zmiana nazwy {#renaming}

Zmiana nazwy zmiennej aktualizuje każdy warunek tranzycji, akcję i warunek akcji, które jej używają,
we wszystkich grafcetach, jako jedna zmiana do cofnięcia.

## Excel i CSV {#excel-and-csv}

Użyj menu **⋯** na liście lub w tabeli Zmienne albo **Plik › Zmienne**:

- **Eksportuj zmienne do Excela** zapisuje skoroszyt `.xlsx` z zablokowanym nagłówkiem, filtrami i
  listami rozwijanymi typu i kierunku.
- **Eksportuj zmienne do CSV** zapisuje plik tekstowy dla innych narzędzi.
- **Importuj zmienne (CSV lub Excel)…** wczytuje plik `.xlsx` lub `.csv` (można go też upuścić na
  okno).

Kolumny to `name`, `type`, `direction`, `initial`, `address` i `comment` (w dowolnej kolejności;
wymagane są tylko `name` i `type`). Zanim cokolwiek się zmieni, widzisz, ile zmiennych zostanie
dodanych, zaktualizowanych lub odrzuconych, z powodem dla każdego odrzuconego wiersza. Zmienne są
dopasowywane po nazwie; te, których nie ma w pliku, zostają zachowane. Import to jedna zmiana do
cofnięcia.

> **Wskazówka:** aby przygotować listę w Excelu, najpierw wyeksportuj: otrzymasz właściwe kolumny
> i listy rozwijane, potem uzupełnij wiersze i zaimportuj plik z powrotem.
