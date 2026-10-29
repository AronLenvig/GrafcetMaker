# Symulacja

Symulator wykonuje grafcet dokładnie według reguł IEC 60848, więc możesz go przetestować, zanim
trafi do sterownika PLC.

## Uruchamianie i zatrzymywanie {#start-and-stop}

Naciśnij <kbd>F5</kbd> (lub **Symulacja › Uruchom symulację**). Diagram zostaje zablokowany,
sterowanie symulacją zastępuje narzędzia u góry, po lewej pojawia się panel **Symulacja** (zwiń go
jego strzałką, aby widzieć więcej diagramu), a zegar zaczyna biec. <kbd>Shift+F5</kbd> zatrzymuje
symulację i wraca do edycji.

## Zmiana wejść {#change-inputs}

Panel **Symulacja** wymienia wejścia:

- Wejścia **BOOL** mają przełącznik oraz przycisk **Przytrzymaj** do chwilowego naciśnięcia (jak
  przycisk monostabilny; z klawiatury przytrzymaj na nim <kbd>Space</kbd>).
- Wejścia **INT**, **REAL** i **TIME** mają pole wartości.

Możesz też **kliknąć wejście BOOL tam, gdzie jest napisane** w warunku tranzycji lub warunku akcji
na diagramie (stuknąć je palcem): włącza się lub wyłącza. Grafcet ewoluuje, gdy tylko zmieni się
wejście.

Podczas symulacji każda zmienna **INT**, **REAL** lub **TIME** zapisana w warunku tranzycji lub
warunku akcji pokazuje swoją bieżącą wartość w małej ramce nad nazwą, a akcja zapamiętana pokazuje
pod swoją ramką wartość zmiennej, którą zapisuje. **Kliknij wartość** (lub ją stuknij), aby wpisać
nową, a potem naciśnij <kbd>Enter</kbd> (<kbd>Escape</kbd> anuluje). Działa to dla wejść, a także
dla zmiennych wewnętrznych i wyjść, na przykład aby wypróbować licznik bliski swojej granicy.

**Wskaż tranzycję** (lub ją stuknij), aby zobaczyć, na co czeka: na kroki, które najpierw muszą być
aktywne, lub na wyrazy jej warunku, które są jeszcze fałszywe, wraz z czasem pozostałym na timerze
takim jak `10s/X0`. Zbocze takie jak `↑start` jest zawsze wymienione: jest prawdziwe tylko w
chwili, gdy zmienia się jego wejście.

## Czas {#time}

Czas w symulatorze jest wirtualny i deterministyczny.

- <kbd>F5</kbd> wstrzymuje zegar i uruchamia go ponownie. Timery (`5s/X2`) odliczają tylko, gdy
  zegar biegnie.
- Prędkość wynosi od ×0.25 do ×10. **Szybko** przeskakuje bezpośrednio od upływu jednego timera do
  następnego.
- <kbd>F10</kbd> przeskakuje do upływu następnego timera i wykonuje ten cykl.
- **⟲** uruchamia od nowa z sytuacji początkowej.

Pasek pokazuje czas, numer cyklu i chwilę upływu następnego timera. Domyślna prędkość jest w
**Ustawienia › Symulacja**.

## Co widać na diagramie {#what-you-see-on-the-diagram}

- **Aktywne kroki** są wypełnione i mają kropkę znacznika, a pod nimi czas, od którego są aktywne.
- **Odblokowane tranzycje** mają znacznik ▶; tranzycje migają, gdy zadziałają.
- **Prawdziwe sygnały** są zielone, pogrubione i podkreślone w warunkach tranzycji i warunkach
  akcji: włączona zmienna, aktywny krok `Xn`, spełnione porównanie. To, co nie jest zielone, jest
  tym, na co tranzycja jeszcze czeka. Pod kreską NOT kolor pokazuje sam sygnał: w `/a` zmienna `a`
  jest zielona, gdy `a` jest włączone.
- Wykonywane **akcje ciągłe** pokazują ✓; **akcje zapamiętane** pokazują bieżącą wartość swojej
  zmiennej.

## Dziennik ewolucji {#evolution-log}

Dziennik w panelu Symulacja (zwinięty: kliknij **Dziennik ewolucji**, aby go otworzyć) wymienia
każdy cykl wraz z tym, co go wyzwoliło, i każdą iterację poszukiwania stanu stabilnego: tranzycje,
które zadziałały, oraz kroki aktywowane i dezaktywowane. Widać tam ewolucje chwilowe (kroki, przez
które grafcet przeszedł bez zatrzymania). Kliknij cykl, aby zobaczyć diagram w tamtej chwili.

## Obserwowanie kilku grafcetów {#watching-several-grafcets}

W podziale widoku (<kbd>Ctrl+\</kbd>) oba panele pokazują symulację na żywo: obserwuj obok siebie
grafcet produkcyjny i jego grafcet bezpieczeństwa albo makrokrok i jego rozwinięcie.

## Wykres czasowy {#chronogram}

Panel **Wykres czasowy** (jego przycisk jest w prawym dolnym rogu) rysuje przebieg każdej zmiennej
i kroków otwartego grafcetu w czasie. Kliknij lub przeciągnij w nim, aby cofnąć się w czasie:
diagram podąża za tym. **Wróć do bieżącego** powraca do teraźniejszości.

## Scenariusze {#scenarios}

Aby dokładnie powtórzyć test, nagraj go:

1. Kliknij **Nagrywaj**: symulacja uruchamia się od nowa i nagrywa każdą zmianę wejścia wraz z
   jej czasem.
2. Przeprowadź test, a potem zatrzymaj nagrywanie i nazwij scenariusz. Zostaje zapisany w
   projekcie.
3. **Odtwórz** uruchamia symulację od nowa i odtwarza scenariusz.

## Gdy grafcet nigdy się nie stabilizuje {#when-the-grafcet-never-settles}

Jeśli tranzycje wciąż wywołują nawzajem swoje zadziałania (na przykład pętla, w której każdy
warunek jest prawdziwy), ewolucja nigdy nie osiąga stanu stabilnego. Symulator zatrzymuje się po
1000 iteracjach i zgłasza w Problemach **pętlę chwilową**. Dodaj warunek (często zbocze `↑a`), aby
pętla nie mogła działać bez końca. Zobacz [Rozwiązywanie problemów](troubleshooting.md).
