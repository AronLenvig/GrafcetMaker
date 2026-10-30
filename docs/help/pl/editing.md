# Edycja diagramów

GrafcetMaker jest zbudowany tak, abyś rzadko cokolwiek umieszczał ręcznie: zaznacz element i użyj
klawisza, a nowe elementy zostaną ponumerowane, połączone i rozmieszczone za Ciebie. Podpowiedzi
pod paskiem narzędzi u góry obszaru roboczego wymieniają klawisze działające dla bieżącego
zaznaczenia.

## Najważniejsze klawisze {#the-essential-keys}

| Klawisz                          | Przy zaznaczonym kroku                                         | Przy zaznaczonej tranzycji                                |
| -------------------------------- | -------------------------------------------------------------- | --------------------------------------------------------- |
| <kbd>Enter</kbd>                 | dodaj tranzycję i krok poniżej, potem edytuj warunek tranzycji | dodaj krok poniżej                                        |
| <kbd>A</kbd>                     | dodaj akcję                                                    | —                                                         |
| <kbd>P</kbd>                     | dodaj gałąź równoległą (I)                                     | dodaj kolejny aktywowany przez nią krok                   |
| <kbd>O</kbd>                     | dodaj gałąź alternatywną (LUB)                                 | dodaj tranzycję alternatywną (obejście)                   |
| <kbd>L</kbd>, potem kliknij krok | pętla z powrotem do tego kroku                                 | połącz z tym krokiem (jeśli jeszcze nigdzie nie prowadzi) |
| <kbd>F2</kbd> lub dwuklik        | edytuj numer                                                   | edytuj warunek tranzycji                                  |
| <kbd>R</kbd>                     | —                                                              | obróć: z góry w dół lub z prawej w lewo                   |
| <kbd>J</kbd>                     | —                                                              | skok do kroku: wpisz pod nią `X10`                        |
| <kbd>Del</kbd>                   | usuń i połącz sekwencję                                        | usuń                                                      |

Tranzycja obrócona **z prawej w lewo** ma pionową kreskę: połączenie od kroku poprzedzającego
wchodzi z prawej, a połączenie do następnego kroku wychodzi z lewej, ze strzałkami. Kliknij
tranzycję w dowolnym miejscu jej kreski, numeru lub warunku, aby ją zaznaczyć.

Gdy nic nie jest zaznaczone, <kbd>Enter</kbd> kontynuuje sekwencję od jej ostatniego kroku.
<kbd>Enter</kbd> na kroku, po którym sekwencja już biegnie dalej, wstawia nową tranzycję i krok i
przesuwa wszystko poniżej w dół.

Podczas edycji warunku tranzycji lub akcji <kbd>Shift+Enter</kbd> zatwierdza ją i otwiera
następną: kolejny warunek w dół sekwencji (nową tranzycję i krok na jej końcu) lub następną akcję
kroku (nową za ostatnią). Wpisz całą sekwencję albo rząd akcji za jednym razem.

## Pisanie na diagramie {#typing-on-the-diagram}

<kbd>F2</kbd>, dwuklik lub <kbd>Enter</kbd> otwiera tekst dokładnie tam, gdzie jest narysowany:
piszesz jak na obszarze roboczym, a ramka wokół tekstu rośnie w trakcie pisania. <kbd>Enter</kbd>
go zatwierdza (<kbd>Ctrl+Enter</kbd> w komentarzu), <kbd>Esc</kbd> anuluje, a kliknięcie gdzie
indziej również zatwierdza. Czerwone faliste podkreślenie oznacza wartość, która nie jest jeszcze
prawidłowa; ramka pod tekstem mówi dlaczego.

## Zarysy {#ghosts}

Zaznaczony krok pokazuje przerywane **zarysy** tego, co dodałyby <kbd>A</kbd> i <kbd>Enter</kbd>:
akcję za jego ostatnią akcją oraz, na końcu sekwencji, tranzycję i krok z numerem, który otrzyma.
Tranzycja, która nigdzie nie prowadzi, pokazuje zarys kroku. Kliknij zarys, aby go dodać; kliknij
tylko kreskę zarysu tranzycji, aby dodać samą tranzycję: zostaje ona zaznaczona, a następny jest
jej własny zarys kroku. Nowy krok dodany z zarysu jest zaznaczony, jakbyś go kliknął, więc jego
własny zarys jest o jedno kliknięcie dalej; warunki tranzycji wpisz później (<kbd>F2</kbd> lub
dwuklik) albo użyj <kbd>Enter</kbd>, aby wpisywać każdy na bieżąco. Przy narzędziu umieszczania
zarys pod kursorem pokazuje, co umieści kliknięcie.

## Mysz {#mouse}

- **Kliknięcie** zaznacza; <kbd>Shift</kbd>+klik lub <kbd>Ctrl</kbd>+klik dodaje do zaznaczenia
  lub z niego usuwa; przeciągnięcie po pustym miejscu zaznacza ramką (krok zabiera wszystkie swoje
  akcje); <kbd>Ctrl+A</kbd> zaznacza wszystko. Połączenia między zaznaczonymi elementami także są
  podświetlane.
- **Przeciągnij** dowolny zaznaczony element, aby przesunąć całe zaznaczenie (przyciąga się do
  siatki); strzałki przesuwają lekko (<kbd>Shift</kbd> dla większych kroków).
- **Dwuklik** na elemencie edytuje jego tekst; dwuklik w puste miejsce dodaje tam krok.
- **Prawy przycisk** na elemencie pokazuje, co można z nim zrobić (dodać akcję, gałęzie, pętlę,
  edytować, zamienić w makrokrok, wyciąć, kopiować, usunąć…), na zaznaczeniu lub na pustym miejscu
  (dodać tam krok, wkleić, autoukład, ponumerować, dopasować). Klawisz menu otwiera je dla
  zaznaczenia.
- Tranzycja, której warunek nie jest jeszcze wpisany, pokazuje szary **?** (kliknij go dwukrotnie
  lub naciśnij <kbd>F2</kbd>); lista Problemy liczy ją, dopóki go nie wpiszesz.
- **Uchwyty połączeń**: zaznaczony lub wskazany krok albo tranzycja pokazuje okrągłe uchwyty.
  Przeciągnij jeden: podświetlane są tylko prawidłowe cele (krok do tranzycji, tranzycja do kroku).
  Upuść w pustym miejscu, aby utworzyć tam brakujący element.
- Kliknij **połączenie**, aby je zaznaczyć; <kbd>Del</kbd> usuwa tylko to połączenie. Przeciągnij
  połączenie biegnące w górę (pętlę) w bok, aby przesunąć jego boczną linię, lub przeciągnij jego
  dolną linię w górę albo w dół; dwuklik przywraca trasę automatyczną. Automatycznie pętla
  przechodzi pod krokami i połączeniami własnej sekwencji, zamiast je przecinać.
- Kliknij **podwójną linię** (rozgałęzienie lub zbieżność I), aby ją zaznaczyć: zostaje
  podświetlona razem z łączonymi przez nią połączeniami. Przeciągnij ją lub naciśnij strzałki, aby
  przesunąć ją razem z tranzycją; <kbd>Del</kbd> usuwa te połączenia i zachowuje tranzycję oraz
  kroki.

## Dotyk: telefony i tablety {#touch-phones-and-tablets}

- **Stuknięcie** zaznacza. **Przeciągnij** element, aby go przesunąć; przeciągnij puste miejsce,
  aby przesunąć widok; **uszczypnij** dwoma palcami, aby powiększyć.
- **Stuknij dwa razy** element, aby edytować jego tekst, lub puste miejsce, aby dodać tam krok.
- **Przytrzymaj i przeciągnij** po pustym miejscu, aby zaznaczyć wszystko w ramce.
- Przy zaznaczeniu **pasek narzędzi** na dole obszaru roboczego robi to, co klawisze na
  komputerze: **Krok** (tranzycja i krok poniżej), **Akcja**, gałęzie **Równoległa** i **Wybór**,
  **Pętla**, **Edytuj**, **Szczegóły** (właściwości) i **Usuń**.
- Zaznaczony krok lub tranzycja pokazuje swoje **uchwyty połączeń** tuż nad i pod sobą: przeciągnij
  jeden na podświetlony cel albo na puste miejsce, aby utworzyć brakujący element.
- Przy wybranym narzędziu (krok, tranzycja, komentarz, akcja) **stuknij** tam, gdzie ma się znaleźć
  element.

Na telefonie ekran jest urządzony do obsługi jedną ręką: narzędzia, cofanie i ponawianie są na
dole, menu (☰) zawiera Plik, Edycja, Widok, Symulacja i Pomoc, a panele (właściwości, zmienne,
problemy, symulacja, wykres czasowy, konspekt) otwierają się jako arkusz nad diagramem przyciskiem
paneli w prawym dolnym rogu. Przeciągnij uchwyt arkusza, aby go wydłużyć lub skrócić.

## Narzędzia {#tools}

Pasek narzędzi u góry okna zawiera narzędzia (litera na każdym przycisku to jego klawisz):
**Zaznacz** (<kbd>V</kbd>), **Przesuń widok** (<kbd>H</kbd>), **Krok** (<kbd>S</kbd>),
**Tranzycja** (<kbd>T</kbd>), **Komentarz** (<kbd>C</kbd>) i **Akcja** (<kbd>Shift+A</kbd>). Przy
narzędziu umieszczania kliknij puste miejsce, aby umieścić element; przytrzymaj <kbd>Shift</kbd>,
aby umieścić kilka. <kbd>Esc</kbd> wraca do narzędzia Zaznacz. Narzędzie Akcja dodaje też akcję do
kroku, gdy klikniesz ten krok.

## Gałęzie i struktury {#branches-and-structures}

Rozgałęzień i zbieżności nigdy nie rysuje się ręcznie; wynikają z połączeń.

- <kbd>O</kbd> na kroku dodaje kolejną tranzycję wyjściową z własnym krokiem: **rozgałęzienie
  LUB**.
- <kbd>P</kbd> na kroku dodaje krok równoległy do niego, uruchamiany przez tę samą tranzycję i
  łączony przez następną: **rozgałęzienie I** i **zbieżność I**.
- Połączenie drugiego kroku z tranzycją tworzy zbieżność I; połączenie drugiej tranzycji z krokiem
  tworzy zbieżność LUB.
- **Edycja › Tranzycja źródłowa nad krokiem / Tranzycja końcowa pod krokiem** dodaje tranzycję bez
  kroku nad nią lub pod nią.

## Skoki {#jumps}

<kbd>J</kbd> na tranzycji tworzy **skok** do kroku zamiast rysować do niego połączenie: wpisz krok
pod tranzycją (`X10` lub samo `10`) i naciśnij <kbd>Enter</kbd>. Tranzycja kończy się strzałką
oznaczoną **X10**, a krok osiągany tylko skokami dostaje strzałkę z krokami, z których one wychodzą.
Kliknij dwukrotnie X10, aby go zmienić; wyczyść, aby usunąć skok. Prawy przycisk na połączeniu lub
tranzycji ze skokiem: **Rysuj połączenie jako skok** i **Rysuj skok jako połączenie**. Zmienia się
tylko rysunek: tranzycja nadal prowadzi do tego kroku, w symulacji i w wygenerowanym kodzie. Skok
usuniesz też, klikając jego strzałkę i naciskając <kbd>Del</kbd>. Pod tranzycją, która jeszcze
nigdzie nie prowadzi, zarys strzałki **X…** obok zarysu kroku działa tak samo jak <kbd>J</kbd>.

## Porządkowanie {#tidy-up}

- **Edycja › Autoukład grafcetu** układa wszystkie kroki w rzędach, centruje gałęzie pod ich
  rozgałęzieniem i prowadzi pętle z boku. **Autoukład zaznaczenia** robi to tylko dla zaznaczenia.
  Układ nigdy nie zmienia się sam i można go cofnąć.
- **Edycja › Ponumeruj kroki** numeruje kroki po kolei wzdłuż przebiegu i aktualizuje każde
  odwołanie `Xn` oraz rozkaz wymuszania.

## Cofanie, kopiowanie i wklejanie {#undo-copy-and-paste}

- <kbd>Ctrl+Z</kbd> cofa, <kbd>Ctrl+Shift+Z</kbd> lub <kbd>Ctrl+Y</kbd> ponawia. Całe przeciągnięcie
  to jeden krok cofania; menu Edycja podaje, co zostanie cofnięte.
- <kbd>Ctrl+C</kbd>, <kbd>Ctrl+X</kbd>, <kbd>Ctrl+V</kbd> działają między grafcetami, projektami i
  kartami przeglądarki. Wklejone kroki są przenumerowywane, jeśli ich numery są zajęte, a używane
  przez nie zmienne są przenoszone razem z nimi.

## Nawigacja {#navigate}

- Przewijanie przesuwa widok; <kbd>Ctrl</kbd>+kółko lub uszczypnięcie powiększa;
  <kbd>Space</kbd>+przeciągnięcie, środkowy przycisk myszy lub przytrzymany prawy przycisk myszy
  także przesuwają widok (prawy przycisk bez ruchu nadal otwiera menu).
- <kbd>Shift+1</kbd> dopasowuje cały grafcet, <kbd>Shift+2</kbd> zaznaczenie, <kbd>Shift+0</kbd>
  ustawia 100 %.
- <kbd>Ctrl+K</kbd> otwiera paletę poleceń: wpisz dowolne polecenie lub nazwę grafcetu.

## Komentarze i nazwy {#comments-and-names}

- Komentarze (narzędzie <kbd>C</kbd>) to dowolne notatki na diagramie; symulator je ignoruje.
- Etykiety kroków (panel Właściwości) to krótkie opisy wyświetlane na lewo od kroku.
- Kliknij dwukrotnie nazwę projektu u góry, aby zmienić nazwę projektu, a kartę grafcetu, aby
  zmienić nazwę grafcetu.

## Dwa grafcety naraz {#two-grafcets-at-once}

Naciśnij <kbd>Ctrl+\</kbd> (lub **Widok › Podział widoku**), aby pokazać drugi grafcet obok
pierwszego, albo kliknij kartę prawym przyciskiem i wybierz **Otwórz obok** lub **Otwórz poniżej**.
Każdy panel ma u góry własny wybór grafcetu. Kliknij w panelu, aby w nim pracować: jego nagłówek
zostaje podświetlony, a karty, klawiatura i panel Właściwości podążają za nim. Przeciągnij pasek
między panelami, aby zmienić ich rozmiar; × zamyka panel.

## Właściwości i panele {#properties-and-panels}

Diagram ma do dyspozycji całe okno; reszta unosi się nad nim i pokazuje się, gdy jest potrzebna.
Zaznacz coś, a jego **właściwości** pojawią się na karcie po lewej: rodzaj kroku lub akcji wybiera
się przyciskami z obrazkami pokazującymi jego symbol. × na karcie ukrywa ją dla tego zaznaczenia;
gdy nic nie jest zaznaczone, przycisk właściwości obok nazwy projektu pokazuje grafcet i projekt.
Panele **Zmienne**, **Problemy**, **Wykres czasowy** i **Konspekt** otwierają się przyciskami w
prawym dolnym rogu, na karcie po prawej, którą można poszerzyć za jej lewą krawędź. Podczas
symulacji panel symulacji (wejścia, wartości, dziennik, scenariusze) unosi się po lewej.

Przy kilku zaznaczonych elementach karta daje przegląd: ile jest kroków, tranzycji, akcji i
komentarzy (kliknij jedno z nich, aby zachować tylko te) oraz zaznaczenie jako drzewo w kolejności
czytania, każdy krok z zaznaczonymi akcjami i tranzycjami pod nim (krok pokazany tylko dla nich
jest kursywą). Kliknij wiersz, aby zaznaczyć tylko ten element; <kbd>Ctrl</kbd>+klik usuwa go z
zaznaczenia.
