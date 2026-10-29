# Rozwiązywanie problemów

GrafcetMaker sprawdza projekt podczas pracy. Liczniki w prawym górnym rogu pokazują liczbę
**błędów** (czerwone) i **ostrzeżeń** (pomarańczowe); kliknij je, aby otworzyć listę **Problemy**.
Kliknij problem, aby przejść do elementu, i użyj jego przycisku poprawki, jeśli jest. Elementy z
problemem mają też na diagramie oznaczenie: wskaż je kursorem, aby zobaczyć szczegóły.

## Błędy {#errors}

**Grafcet G1 nie ma kroku początkowego.** Nic nie może się nigdy stać aktywne. Zaznacz pierwszy
krok i użyj poprawki **Ustaw krok … jako początkowy** albo ustaw jego Rodzaj na _Krok początkowy_.

**Kilka kroków ma ten sam numer.** Numery muszą być unikalne w grafcecie, inaczej `Xn` byłoby
niejednoznaczne. Użyj **Ponumeruj kroki** lub zmień numer klawiszem <kbd>F2</kbd>.

**Pusty warunek tranzycji.** Każda tranzycja potrzebuje warunku. Użyj `1` dla tranzycji zawsze
prawdziwej (poprawka zrobi to za Ciebie).

**Nieznana zmienna.** Nazwa nie jest zadeklarowana (plik zapisany gdzie indziej albo zmienna
usunięta). Nazwy wpisane w warunku tranzycji lub akcji są tworzone automatycznie; dla pozostałych
użyj poprawki, aby utworzyć zmienną, albo wybierz proponowaną nazwę, jeśli to literówka.

**Problemy z wyrażeniem** (nieoczekiwany znak, brak nawiasu…). Ramka problemu pod polem zaznacza
miejsce i daje wskazówkę. Częsty przypadek: `/` przed warunkiem oznacza NOT, więc napisz `a * /b`
dla „a i nie b”. Zobacz [Pisanie warunków tranzycji](expressions.md).

**Akcja przypisuje wejście.** Wejścia pochodzą z procesu i nie można ich zapisywać. Zmień kierunek
zmiennej lub użyj innej zmiennej.

**Rozkaz wymuszania wskazuje nieistniejący grafcet lub krok.** Sprawdź w rozkazie nazwę grafcetu i
numery kroków.

**Rozkazy wymuszania tworzą cykl.** Grafcet nie może wymuszać grafcetu, który wymusza jego,
bezpośrednio lub przez inne. Usuń jeden z rozkazów albo pozwól trzeciemu grafcetowi wymuszać oba.

**Makrokroki i kroki obejmujące tworzą cykl.** Grafcet nie może zawierać samego siebie: makrokrok
lub krok obejmujący prowadzi z powrotem, bezpośrednio lub przez inne, do własnego grafcetu. Zmień
ten krok na _Krok_ i z powrotem: otrzyma własny podgrafcet.

**Makrokrok … nie ma grafcetu rozwinięcia** (lub **Krok obejmujący … nie ma grafcetu objętego**).
Jego podgrafcet został usunięty. Ustaw Rodzaj kroku na _Krok_ i z powrotem na _Makrokrok_ (lub
_Krok obejmujący_), aby otrzymać nowy, albo pozostaw go zwykłym krokiem.

**Grafcet … jest używany przez kilka kroków.** Każdy makrokrok i krok obejmujący potrzebuje
własnego podgrafcetu. Zmień jeden z kroków na _Krok_ i z powrotem: otrzyma własny podgrafcet.

## Ostrzeżenia {#warnings}

**Krok … nigdy nie może stać się aktywny.** Nie prowadzi do niego żadna droga od kroku
początkowego. Połącz go lub usuń.

**Krok … nie ma tranzycji wyjściowej.** Raz aktywny, pozostaje aktywny na zawsze. Zwykle brakuje
pętli powrotnej (<kbd>L</kbd>).

**Gałęzie alternatywne nie wykluczają się.** Oba warunki mogą być prawdziwe jednocześnie, co
aktywowałoby obie gałęzie. Spraw, aby się wykluczały, np. `a` i `/a * b`, albo użyj poprawki
**Daj pierwszeństwo „…”**.

**Możliwa nieskończona ewolucja chwilowa.** Pętla tranzycji mogłaby być prawdziwa w całości naraz,
więc grafcet nigdy by się nie ustabilizował. Dodaj warunek, który nie może pozostać prawdziwy,
często zbocze (`↑start`).

**Wyjście ustawiane przez akcje ciągłe kroków, które mogą być aktywne jednocześnie.** Dwie gałęzie
równoległe ustawiają to samo wyjście. Ustawiaj je w jednym miejscu albo użyj akcji zapamiętanych.

**Akcja bez kroku jest zapamiętana przy dezaktywacji.** Bez kroku akcja jest zawsze aktywna i
nigdy nie jest dezaktywowana, więc nigdy się nie wykona. Dołącz ją do kroku lub zmień jej rodzaj.

**Wyjście ustawiane przez akcję bez kroku i przez inną akcję.** Wyjście jest prawdziwe, gdy
którakolwiek z nich jest. Upewnij się, że o to chodzi.

**Zapamiętana przy zdarzeniu, ale bez zdarzenia.** Wpisz zdarzenie (np. `↑b`) w panelu
Właściwości.

**Akcja warunkowa bez warunku.** Działa jak akcja ciągła, dopóki nie wpiszesz jej warunku w panelu
Właściwości.

**Akcje zapamiętane makrokroku są ignorowane.** Makrokrok jest aktywny poprzez swoje rozwinięcie:
umieść akcje zapamiętane na kroku rozwinięcia.

**Wymuszenie sytuacji pustej, nigdy niecofnięte.** Rozkaz taki jak `G2{}` dezaktywuje każdy krok
G2 i nic nie aktywuje ich ponownie. Użyj `G2{INIT}`, aby uruchomić G2 od nowa w jego sytuacji
początkowej.

**Rozwinięcie (lub grafcet objęty) … nie jest używane.** Nie wskazuje na nie żaden makrokrok ani
krok obejmujący. Usuń jego kartę, jeśli nie jest już potrzebna.

**Rozwinięcie potrzebuje dokładnie jednego kroku wejściowego i jednego kroku wyjściowego.** W
rozwinięciu makrokroku krok wejściowy nie ma tranzycji nad sobą, a krok wyjściowy żadnej pod sobą.

## Informacje {#information}

**Zmienna … nie jest używana.** Jest zadeklarowana, ale żadne wyrażenie jej nie używa. Usuń ją
poprawką albo zachowaj na później.

## Inne pytania {#other-questions}

**Symulacja zatrzymała się z pętlą chwilową.** Zobacz ostrzeżenie powyżej: symulator zatrzymuje
się po 1000 iteracjach bez osiągnięcia stanu stabilnego, w pokazanej chwili.

**Mój timer nie odlicza.** Timery odliczają tylko, gdy zegar biegnie: naciśnij <kbd>F5</kbd>, aby
go uruchomić, lub <kbd>F10</kbd>, aby przeskoczyć do następnego timera.

**Tranzycja zadziała raz za razem.** Jeśli jej warunek pozostaje prawdziwy, grafcet krąży tak
szybko, jak potrafi. Użyj zbocza `↑a`, aby reagować raz na każde naciśnięcie.

**Straciłem pracę.** Zajrzyj do **Plik › Historia lokalna**: migawki są przechowywane w
przeglądarce. Po przeładowaniu lub awarii GrafcetMaker automatycznie otwiera ponownie ostatni
projekt, łącznie z niezapisanymi zmianami.

**Plik się nie otwiera.** GrafcetMaker otwiera własne pliki `.grafcet.json` oraz pliki grafcet.io
(`.grafcetio`); komunikat mówi, dlaczego plik został odrzucony. Plik zapisany w nowszej wersji
GrafcetMaker wymaga tej nowszej wersji.
