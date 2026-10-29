# Pliki, zapis i eksport

Wszystko dzieje się na Twoim komputerze: nie ma konta i nic nie jest wysyłane.

## Autozapis i odzyskiwanie {#autosave-and-recovery}

Każda zmiana jest przechowywana w przeglądarce pół sekundy po jej wprowadzeniu. W każdej chwili
możesz przeładować lub zamknąć kartę bez żadnego pytania: przy następnym otwarciu GrafcetMaker
projekt wraca w takim stanie, w jakim go zostawiono, łącznie z niezapisanymi zmianami. Kropka `●`
obok nazwy projektu oznacza zmiany, które nie zostały jeszcze zapisane do pliku.

**Plik › Historia lokalna** wyświetla migawki przechowywane w przeglądarce: tworzone przy zapisie,
co kilka minut podczas edycji i przed zamknięciem projektu. Przywrócenie migawki otwiera ją jako
niezapisane zmiany.

> **Ważne:** pamięć przeglądarki należy do tej przeglądarki na tym komputerze, a wyczyszczenie
> danych witryny ją kasuje. Zapisz do pliku wszystko, co chcesz zachować.

## Praca offline i instalacja {#offline-and-installation}

Po pierwszej wizycie GrafcetMaker działa bez sieci. Użyj przycisku instalacji na pasku adresu
przeglądarki, aby mieć go jako aplikację we własnym oknie. Gdy nowa wersja jest gotowa, karta w
rogu proponuje przeładowanie: Twoja praca zostaje zachowana.

## Zapis i otwieranie {#save-and-open}

- **Zapisz** (<kbd>Ctrl+S</kbd>) zapisuje projekt do pliku `.grafcet.json`. W Chrome i Edge za
  każdym razem zapisuje do tego samego pliku; w innych przeglądarkach pobiera plik.
- **Zapisz jako…** (<kbd>Ctrl+Shift+S</kbd>) wybiera nowy plik. **Plik › Pobierz kopię** pobiera
  kopię bez zmiany miejsca, do którego zapisuje Zapisz.
- **Otwórz…** (<kbd>Ctrl+O</kbd>), **Plik › Otwórz ostatnie** lub upuść plik `.grafcet.json` w
  dowolnym miejscu okna. Jeśli otwarty projekt ma niezapisane zmiany, najpierw padnie pytanie, a
  nieprawidłowy plik zostaje odrzucony z wyjaśnieniem, bez naruszania Twojego projektu.

Pliki `.grafcet.json` to czytelny tekst, dobrze nadający się do kontroli wersji (Git) i przeglądu
kodu.

**Pliki grafcet.io** (`.grafcetio`) otwiera się tak samo: są konwertowane na nowy projekt, z jednym
grafcetem częściowym na wykres (lub na ramkę), zmiennymi utworzonymi z tego, czego używają wykresy,
i uporządkowanym układem. Komunikat wymienia wszystko, co konwersja zmieniła. Zapisz, aby zachować
go jako projekt GrafcetMaker; oryginalny plik nie jest modyfikowany.

## Udostępnianie linku {#share-a-link}

**Plik › Kopiuj link udostępniania** kopiuje adres WWW zawierający cały projekt w postaci
skompresowanej. Wklej go na czacie, w e-mailu lub zgłoszeniu: każdy, kto go otworzy, dostaje
własną kopię projektu ze wszystkimi grafcetami i zmiennymi i może ją zmieniać bez wpływu na Twoją.

- Projekt podróżuje wewnątrz linku (po `#`), którego przeglądarki nigdy nie wysyłają do serwera
  WWW: nic nie jest wysyłane, a linki działają także offline i w instalacjach firmowych.
- Każdy, kto ma link, może odczytać projekt, więc udostępniaj go jak sam plik.
- Link jest migawką: późniejsze zmiany wymagają nowego linku.
- Małe wykresy dają linki długości jednego lub dwóch tysięcy znaków. Jeśli GrafcetMaker ostrzega,
  że link jest długi, niektóre komunikatory i programy pocztowe mogą go obciąć; wyślij wtedy plik
  `.grafcet.json`.
- Otwarcie linku działa jak otwarcie pliku: jeśli projekt ma niezapisane zmiany, najpierw padnie
  pytanie, a uszkodzony link zostaje odrzucony z wyjaśnieniem, bez naruszania Twojego projektu.

## Wykresy od asystentów AI {#charts-from-ai-assistants}

Asystent AI, taki jak ChatGPT lub Claude, może narysować wykres za Ciebie. Poproś go, aby najpierw
przeczytał [grafcet.org/ai.txt](https://grafcet.org/ai.txt): wyjaśnia on tekst GRAFCET, czyli
tekstową postać wykresu, oraz jak utworzyć link, który otwiera wykres tutaj.

- **Link od asystenta** otwiera wykres, automatycznie rozmieszczony, w miejsce otwartego projektu
  (jeśli ma on niezapisane zmiany, najpierw padnie pytanie).
- **Plik › Otwórz z tekstu…** otwiera wykres, który asystent zapisał jako tekst: wklej go i
  kliknij **Otwórz**. Wiersz, którego nie da się odczytać, jest wskazany wraz z opisem błędu;
  możesz go poprawić lub odesłać komunikat asystentowi.
- **Plik › Kopiuj jako tekst (dla asystentów AI)** kopiuje Twój wykres jako tekst GRAFCET, aby
  wkleić go na czacie i poprosić o zmiany, wyjaśnienie lub przegląd.

Położenia nie są częścią tekstu: wykres otwarty z tekstu jest rozmieszczany automatycznie.

## Wspólna edycja na żywo {#edit-together-live}

**Plik › Współpraca na żywo…** (lub przycisk z osobami w prawym górnym rogu) pozwala kilku osobom
edytować ten sam projekt jednocześnie, każdej na własnym komputerze.

1. Wpisz swoje imię i wybierz **Rozpocznij sesję na żywo**. Wyślij pozostałym link, który się
   pojawi.
2. Otwierają oni link, wpisują swoje imię i wybierają **Dołącz**.
3. Każdy widzi kursory i zaznaczenia innych z ich imionami, a każda zmiana pojawia się u
   wszystkich po chwili.

- Zmiany są scalane pole po polu: przesunięcie kroku, gdy ktoś inny zmienia jego nazwę, zachowuje
  obie zmiany.
- **Cofnij** wycofuje tylko Twoje własne zmiany.
- Podczas symulacji zmiany innych czekają, aby diagram zgadzał się z Twoją symulacją: **Uruchom od
  nowa ze zmianami** w sterowaniu symulacją je wczytuje.
- Bez połączenia możesz pracować dalej; zmiany są wymieniane po jego przywróceniu.
- **Opuść sesję** zachowuje projekt na Twoim urządzeniu jako Twoją własną kopię.
- Projekt jest szyfrowany end-to-end kluczem, który jest tylko w linku: każdy, kto ma link, może
  zobaczyć i zmienić projekt, więc udostępniaj go jak sam plik.

## Eksport {#export}

**Plik › Eksportuj…** (<kbd>Ctrl+E</kbd> lub przycisk **Eksport** w prawym górnym rogu) otwiera
jedno okno dla wszystkich formatów, z podglądem na żywo. Jego ustawienia są zapamiętywane dla
każdego projektu. **Plik › Eksportuj jako** otwiera je od razu w wybranym formacie.

| Format              | Zastosowanie                                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **PDF**             | druk i dokumentacja: wektor, A4 lub A3, dopasowany do strony lub podzielony na kilka arkuszy, z tabliczką           |
| **SVG**             | dokumenty i WWW: wektor, ostry w każdym rozmiarze                                                                   |
| **PNG**             | slajdy, czaty i zgłoszenia: rozdzielczość 1×, 2× lub 4×, opcjonalnie przezroczysty                                  |
| **WebP**            | to samo co PNG, z mniejszymi plikami                                                                                |
| **Zmienne (Excel)** | tabela zmiennych jako skoroszyt `.xlsx`                                                                             |
| **Zmienne (CSV)**   | tabela zmiennych dla innych narzędzi                                                                                |
| **Structured Text** | kod PLC wykonujący każdy grafcet: IEC 61131-3, Siemens TIA Portal (SCL), Beckhoff TwinCAT 3 lub Allen-Bradley Logix |
| **PLCopen XML**     | import grafcetów do narzędzia PLC jako programy SFC                                                                 |

Eksporty są domyślnie czarne na białym; wybierz **Bieżący motyw**, aby zachować kolory ekranu.
Eksportuj bieżący grafcet, zaznaczenie lub wszystkie grafcety.

**Plik › Kopiuj diagram jako PNG / SVG** umieszcza zaznaczenie (lub cały grafcet) w schowku,
gotowe do wklejenia do raportu.

## Kod PLC {#plc-code}

**Structured Text** i **PLCopen XML** zamieniają Twoje grafcety w kod PLC. Wybierz sterownik w
polu **PLC**:

- **IEC 61131-3**: blok funkcyjny (`.st`) dla CODESYS i większości innych narzędzi.
- **Siemens TIA Portal (SCL)**: źródło SCL (`.scl`) dla S7-1200/1500. W TIA Portal dodaj je w
  **External source files** i wybierz **Generate blocks from source**.
- **Beckhoff TwinCAT 3**: plik POU (`.TcPOU`). Kliknij prawym przyciskiem folder projektu PLC ›
  **Add › Existing Item**.
- **Allen-Bradley Studio 5000**: procedura Structured Text. Utwórz tagi wymienione w jej nagłówku
  (zakres programu), a potem wklej kod do procedury ST. Timery używają TONR/TOFR, zbocza
  OSRI/OSFI, a pierwszy cykl (`S:FS`) ustawia wartości początkowe.

Structured Text występuje w dwóch stylach:

- **CASE na sekwencję** (domyślnie): jedna zmienna INT na sekwencję przechowuje numer jej
  aktywnego kroku, a `CASE` wymienia tranzycje każdego kroku (`IF receptivity THEN step_G1 := 2;`).
  Wyjścia następują po jednym wierszu każde, np. `Motor := step_G1 >= 2 AND step_G1 <= 4;`.
  Sekwencje z gałęziami równoległymi zachowują jeden BOOL na krok.
- **Jeden BOOL na krok**: każda tranzycja, potem każdy krok, potem timery, zbocza i akcje, raz na
  cykl PLC; zaznacz **Poszukiwanie stanu stabilnego w każdym cyklu**, aby w jednym cyklu przejść
  przez łańcuchy prawdziwych tranzycji, jak robi to GRAFCET.

Akcja zapamiętana, taka jak `Q1 := 1` przy aktywacji, wykonuje się raz, a Q1 zachowuje swoją
wartość po opuszczeniu kroku. Zaznacz **Utrzymuj akcje zapamiętane stałą wartością**, aby zamiast
tego przypisywać ją w każdym cyklu, dopóki jej krok jest aktywny.

Plik PLCopen zawiera jeden program SFC na grafcet, do importu w narzędziach inżynierskich. Podgląd
wymienia wszystko, czego format nie potrafi wyrazić. Zawsze sprawdzaj wygenerowany kod, zanim
zostanie uruchomiony na maszynie.

## Ustawienia {#settings}

**Plik › Ustawienia…** (<kbd>Ctrl+,</kbd>) zawiera preferencje motywu, notacji, ekranu powitalnego,
siatki, podpowiedzi i symulacji oraz pokazuje, ile pamięci przeglądarki jest zajęte. Można tam
wyczyścić historię lokalną i listę ostatnich plików.

## Język {#language}

Wybierz język flagą w prawym dolnym rogu (na telefonie na dole menu ☰); wybór jest zapamiętywany
na tym urządzeniu. Każdy język ma też własny adres, np. `…/de/` dla niemieckiego, więc link
otwiera się w języku, w którym go wysłano.
