# GrafcetMaker: darmowy edytor i symulator GRAFCET online

GrafcetMaker rysuje, sprawdza i symuluje wykresy GRAFCET (IEC 60848) w przeglądarce i zamienia je
w kod PLC. Powstał dla automatyków, nauczycieli i studentów: jest darmowy i otwarty (licencja
MIT), nie wymaga konta i działa offline.

GrafcetMaker to aplikacja internetowa: działa w każdej nowoczesnej przeglądarce z włączonym
JavaScriptem. GRAFCET jest dla Ciebie nowy? Przeczytaj [przewodnik GRAFCET](pl/guide/), dostępny
też po [angielsku](en/guide/), [francusku](fr/guide/), [niemiecku](de/guide/),
[hiszpańsku](es/guide/), [duńsku](da/guide/), [szwedzku](sv/guide/), [portugalsku](pt/guide/),
[rosyjsku](ru/guide/), [chińsku](zh/guide/) i w [hindi](hi/guide/).

## Dla asystentów AI

Asystenci AI, tacy jak ChatGPT i Claude, mogą przygotować dla Ciebie wykres i podać go jako link,
który otwiera go tutaj. Asystencie, przeczytaj [ai.txt](ai.txt), aby dowiedzieć się jak. W
GrafcetMaker **Plik › Otwórz z tekstu…** otwiera wykres zapisany przez asystenta, a **Plik ›
Kopiuj jako tekst (dla asystentów AI)** przekazuje mu Twój wykres z powrotem.

## Co można w nim zrobić

- **Rysować** kroki, tranzycje, warunki tranzycji i akcje myszą lub klawiaturą (<kbd>Enter</kbd>
  kontynuuje sekwencję), z gałęziami LUB oraz I, pętlami, tranzycjami źródłowymi i końcowymi oraz
  komentarzami. Automatyczny układ porządkuje wykres na żądanie.
- **Sprawdzać** wykres podczas rysowania: składnię i typy każdego warunku tranzycji, nieznane
  zmienne, powtórzone numery kroków, kroki nieosiągalne, ślepe zaułki, niewykluczające się gałęzie
  alternatywne, możliwe pętle chwilowe i wyjścia ustawiane z gałęzi równoległych. Większość
  problemów ma szybką poprawkę.
- **Symulować** według reguł ewolucji IEC 60848: znaczniki w aktywnych krokach, odblokowane
  tranzycje, wejścia klikane lub wpisywane, timery, zbocza, kroki niestabilne, wymuszanie między
  grafcetami, wykres czasowy każdej zmiennej oraz scenariusze nagrywane i odtwarzane.
- **Strukturyzować** duże aplikacje za pomocą grafcetów częściowych, makrokroków z rozwinięciami,
  kroków obejmujących i rozkazów wymuszania.
- **Eksportować** do PDF (A4 lub A3, z tabliczką, w razie potrzeby na kilku arkuszach), SVG, PNG i
  WebP, tabelę zmiennych do Excela i CSV oraz generować Structured Text lub PLCopen XML.
- **Pracować razem** na żywo przez link: każdy widzi kursory i zmiany innych w czasie
  rzeczywistym, z szyfrowaniem end-to-end.

## Obsługiwane elementy GRAFCET

| Element   | Co obsługuje GrafcetMaker                                                                                                         |
| --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Kroki     | kroki zwykłe i początkowe, makrokroki z rozwinięciem, kroki obejmujące; zmienne kroków `X1`                                       |
| Tranzycje | warunki z AND, OR, NOT, zboczami narastającymi ↑ i opadającymi ↓, timerami takimi jak `5s/X1`, porównaniami liczb                 |
| Struktury | sekwencje, rozgałęzienie i zbieżność LUB, rozgałęzienie i zbieżność I, pętle, skoki, tranzycje źródłowe i końcowe                 |
| Akcje     | ciągłe, warunkowe, zapamiętane przy aktywacji, dezaktywacji lub zdarzeniu; rozkazy wymuszania `G2{8}`, `G2{*}`                    |
| Zmienne   | wejścia, wyjścia i zmienne wewnętrzne BOOL, INT, REAL i TIME, z adresami i komentarzami                                           |
| Notacja   | wpisywana zwykłym ASCII (`a*/b`, `RE a`), wyświetlana w notacji podręcznikowej (nadkreślenie dla NOT, ↑ i ↓) lub tak, jak wpisano |

## Symulacja

Symulator stosuje reguły ewolucji IEC 60848. Kroki początkowe są aktywne na starcie. Tranzycja jest
odblokowana, gdy wszystkie kroki nad nią są aktywne, i zadziała, gdy także jej warunek jest
prawdziwy: kroki pod nią stają się aktywne, a kroki nad nią nieaktywne. Wszystkie tranzycje zdolne
do zadziałania zadziałają jednocześnie, a krok jednocześnie aktywowany i dezaktywowany pozostaje
aktywny.

Po każdej zmianie wejść symulator prowadzi poszukiwanie stanu stabilnego: tranzycje zadziałają
dalej, aż żadna nie może już zadziałać. Kroki, przez które grafcet przechodzi po drodze (kroki
niestabilne), nie wykonują swoich akcji ciągłych, ale ich akcje zapamiętane są wykonywane. Czas
jest wirtualny, więc wykres działa w czasie rzeczywistym, szybciej lub po jednej ewolucji naraz, a
wykres czasowy rejestruje każdą zmienną.

## Eksport i kod PLC

| Format            | Zastosowanie                                             | Otwiera się w                                                                                                                                                                     |
| ----------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF               | druk i dokumentacja: wektor, A4 lub A3, tabliczka        | dowolnym czytniku PDF                                                                                                                                                             |
| SVG, PNG, WebP    | raporty, slajdy i strony WWW, także kopiowane do schowka | Wordzie, PowerPoincie, przeglądarkach i edytorach grafiki                                                                                                                         |
| Zmienne           | tabela zmiennych jako Excel lub CSV, i z powrotem        | Excelu, LibreOffice i innych arkuszach kalkulacyjnych                                                                                                                             |
| Structured Text   | kod PLC dla każdego grafcetu (IEC 61131-3)               | CODESYS i większości narzędzi IEC 61131-3, Siemens TIA Portal (źródło SCL dla S7-1200/1500), Beckhoff TwinCAT 3 (plik POU), Allen-Bradley Studio 5000 (procedura Structured Text) |
| PLCopen XML (TC6) | grafcety jako programy SFC                               | narzędziach inżynierskich PLC z importem PLCopen XML                                                                                                                              |
| Plik projektu     | cały projekt jako czytelny `.grafcet.json`               | GrafcetMaker                                                                                                                                                                      |

Structured Text występuje w dwóch stylach: `CASE` na sekwencję, jak pisany ręcznie, lub jeden BOOL
na krok. Wygenerowany kod jest punktem wyjścia: sprawdź go, zanim zostanie uruchomiony na maszynie.

## Przykłady

Sześć przykładowych projektów otwiera się z ekranu startowego edytora:

- **Sygnalizacja świetlna** z przyciskiem dla pieszych: timery i zapamiętane żądanie.
- **Stanowisko wiercenia**: cykl obróbki z licznikiem detali i konserwacją co 100 detali.
- **Napełnianie zbiornika**: wejścia liczbowe i porównania.
- **Przenośniki równoległe**: gałęzie równoległe z grafcetem bezpieczeństwa wymuszającym linię.
- **Linia rozlewnicza**: makrokrok, trzy stanowiska równolegle, kontrola i liczniki.
- **Tryby pracy**: krok obejmujący, pauza zamrażająca cykl i zatrzymanie awaryjne.

[Przewodnik GRAFCET](pl/guide/#przykłady) rysuje dwa pierwsze i otwiera je w edytorze.

## Najczęściej zadawane pytania

### Czy GrafcetMaker jest darmowy? Czy ma ograniczenia?

Tak, jest darmowy i otwarty na licencji MIT. Nie ma wersji płatnej, okresu próbnego ani limitu
liczby projektów, grafcetów czy kroków.

### Czy trzeba się rejestrować lub coś instalować?

Nie. Otwórz stronę i zacznij rysować; konto nie jest potrzebne. Można go też zainstalować z
przeglądarki jako aplikację, aby uruchamiać go jak program na komputerze.

### Czy działa offline?

Tak. Po pierwszej wizycie wszystko, czego potrzebuje, jest przechowywane w przeglądarce, więc
uruchamia się i działa bez sieci. Tylko współpraca na żywo wymaga połączenia.

### Gdzie są przechowywane moje wykresy?

Na Twoim komputerze. Projekty są automatycznie zapisywane w przeglądarce oraz w zapisywanych przez
Ciebie plikach `.grafcet.json`. Nic nie jest wysyłane, a aplikacja nie ma śledzenia. Sesje na żywo
są szyfrowane end-to-end kluczem, który jest tylko w linku.

### W jakich przeglądarkach i na jakich urządzeniach działa?

W najnowszych wersjach Chrome, Edge, Firefox i Safari, na Windows, macOS, Linux, tabletach i
telefonach. Telefony mają układ dla małych ekranów, a ekrany dotykowe gesty i większe uchwyty.

### Jakiej normy przestrzega?

GRAFCET zdefiniowanego w IEC 60848 (w Europie EN 60848, w Polsce PN-EN 60848). Wygenerowany kod
jest zgodny z IEC 61131-3.

### Czy otwiera pliki z innych programów GRAFCET?

GrafcetMaker otwiera pliki grafcet.io (`.grafcetio`) i konwertuje je na projekt. Tabele zmiennych
można importować z Excela i CSV.

### Czy moja firma może hostować go we własnej sieci?

Tak. GrafcetMaker to zestaw plików statycznych, które może serwować dowolny serwer WWW, pod dowolną
ścieżką i bez dostępu do internetu. Dostępny jest obraz Docker z nginx.
