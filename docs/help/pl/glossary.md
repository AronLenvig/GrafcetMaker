# Słowniczek

Standardowe terminy GRAFCET (IEC 60848) w znaczeniu używanym w GrafcetMaker.

| Termin                            | Znaczenie                                                                                       |
| --------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Akcja**                         | To, co układ robi w związku z krokiem; rysowana w prostokącie na prawo od kroku.                |
| **Akcja ciągła**                  | Wyjście prawdziwe, dopóki jego krok jest aktywny (i jego warunek jest prawdziwy).               |
| **Akcja zapamiętana**             | Akcja wykonywana raz — przy aktywacji, dezaktywacji lub zdarzeniu — której skutek trwa.         |
| **Grafcet częściowy**             | Jeden z grafcetów projektu; wszystkie działają razem.                                           |
| **Krok**                          | Stabilna sytuacja układu; rysowany jako ponumerowany kwadrat.                                   |
| **Krok aktywny**                  | Krok należący do bieżącej sytuacji; w symulacji ma znacznik.                                    |
| **Krok niestabilny (chwilowy)**   | Krok aktywowany i dezaktywowany podczas jednego poszukiwania stanu stabilnego.                  |
| **Krok obejmujący**               | Krok zawierający grafcet objęty, który działa tylko, dopóki krok jest aktywny.                  |
| **Krok początkowy**               | Krok aktywny na starcie; rysowany jako podwójny kwadrat.                                        |
| **Makrokrok**                     | Krok zastępujący rozwinięcie narysowane na osobnym arkuszu.                                     |
| **Poszukiwanie stanu stabilnego** | Powtarzanie reguł ewolucji po zmianie wejścia, aż żadna tranzycja nie może zadziałać.           |
| **Rozgałęzienie I**               | Podwójna linia za tranzycją, która aktywuje kilka kroków naraz (gałęzie równoległe).            |
| **Rozgałęzienie LUB**             | Pojedyncza linia za krokiem, po którym następuje kilka tranzycji; wybierana jest jedna droga.   |
| **Rozkaz wymuszania**             | Akcja narzucająca sytuację innemu grafcetowi częściowemu, np. `G2{8}`.                          |
| **Rozwinięcie**                   | Grafcet narysowany dla makrokroku, od jego kroku wejściowego E do kroku wyjściowego S.          |
| **Sytuacja**                      | Zbiór aktywnych kroków w danej chwili.                                                          |
| **Timer**                         | `t/c`: prawdziwy po czasie t od chwili, gdy warunek c stał się prawdziwy, np. `5s/X2`.          |
| **Tranzycja**                     | Kreska między krokami; grafcet ewoluuje przez zadziałania tranzycji.                            |
| **Tranzycja odblokowana**         | Tranzycja, której wszystkie kroki poprzedzające są aktywne.                                     |
| **Tranzycja źródłowa / końcowa**  | Tranzycja bez kroku nad nią / pod nią.                                                          |
| **Warunek przypisania**           | Warunek akcji ciągłej: wyjście jest prawdziwe tylko, dopóki także ten warunek jest spełniony.   |
| **Warunek tranzycji**             | Warunek zapisany obok tranzycji.                                                                |
| **Zadziałanie (tranzycji)**       | Przekroczenie jej: aktywacja kroków poniżej, dezaktywacja kroków powyżej.                       |
| **Zbieżność I**                   | Podwójna linia, na której kończą się gałęzie równoległe; następna tranzycja czeka na wszystkie. |
| **Zbieżność LUB**                 | Pojedyncza linia, na której gałęzie alternatywne łączą się ponownie.                            |
| **Zbocze**                        | Chwilowa zmiana sygnału: zbocze narastające ↑a (fałsz → prawda), opadające ↓a (prawda → fałsz). |
| **Zdarzenie**                     | Zbocze lub inny chwilowy warunek, który wyzwala akcję zapamiętaną przy zdarzeniu.               |
| **Zdolna do zadziałania**         | Odblokowana i z prawdziwym warunkiem: tranzycja zadziała.                                       |
| **Zmienna kroku**                 | `Xn`: prawdziwa, dopóki krok n jest aktywny.                                                    |
