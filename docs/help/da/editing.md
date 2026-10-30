# Rediger diagrammer

GrafcetMaker er bygget, så du sjældent placerer noget i hånden: vælg et element, og brug en tast,
så bliver de nye elementer nummereret, forbundet og placeret for dig. Tipsene under
værktøjslinjen øverst på lærredet viser de taster, der gælder for den aktuelle markering.

## De vigtigste taster {#the-essential-keys}

| Tast                                     | Med et trin valgt                                                             | Med en transition valgt                                           |
| ---------------------------------------- | ----------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| <kbd>Enter</kbd>                         | tilføj en transition og et trin nedenunder, og rediger transitionsbetingelsen | tilføj et trin nedenunder                                         |
| <kbd>A</kbd>                             | tilføj en aktion                                                              | –                                                                 |
| <kbd>P</kbd>                             | tilføj en parallel gren (OG)                                                  | tilføj endnu et trin, som den aktiverer                           |
| <kbd>O</kbd>                             | tilføj en alternativ gren (ELLER)                                             | tilføj en alternativ transition (omløb)                           |
| <kbd>L</kbd> og klik derefter på et trin | tilbageføring til det trin                                                    | forbind med det trin (hvis den endnu ikke fører nogen steder hen) |
| <kbd>F2</kbd> eller dobbeltklik          | rediger nummeret                                                              | rediger transitionsbetingelsen                                    |
| <kbd>R</kbd>                             | –                                                                             | drej: oppefra og ned eller fra højre mod venstre                  |
| <kbd>J</kbd>                             | —                                                                             | spring til et trin: skriv `X10` under den                         |
| <kbd>Del</kbd>                           | slet, og genforbind sekvensen                                                 | slet                                                              |

En transition, der er drejet til **fra højre mod venstre**, har en lodret streg: forbindelsen fra
trinnet før den kommer ind fra højre, og forbindelsen til det næste trin går ud til venstre, med
pile. Klik et vilkårligt sted på en transitions streg, nummer eller transitionsbetingelse for at
vælge den.

Når intet er valgt, fortsætter <kbd>Enter</kbd> sekvensen fra dens sidste trin. <kbd>Enter</kbd>
på et trin, der allerede fortsætter, indsætter den nye transition og det nye trin og flytter alt
nedenunder længere ned.

Mens du redigerer en transitionsbetingelse eller en aktion, anvender <kbd>Shift+Enter</kbd> den og
åbner den næste: den næste transitionsbetingelse ned gennem sekvensen (en ny transition og et nyt
trin i dens ende) eller trinnets næste aktion (en ny efter den sidste). Skriv en hel sekvens eller
en række aktioner i ét stræk.

## Skriv direkte på diagrammet {#typing-on-the-diagram}

<kbd>F2</kbd>, et dobbeltklik eller <kbd>Enter</kbd> åbner en tekst lige der, hvor den er tegnet:
skriv som på lærredet, og feltet omkring teksten vokser, mens du skriver. <kbd>Enter</kbd> anvender
den (<kbd>Ctrl+Enter</kbd> i en kommentar), <kbd>Esc</kbd> annullerer, og et klik et andet sted
anvender den også. En rød bølget understregning markerer en værdi, der endnu ikke er gyldig; boksen
under teksten forklarer hvorfor.

## Pladsholdere {#ghosts}

Et valgt trin viser stiplede **pladsholdere** for det, som <kbd>A</kbd> og <kbd>Enter</kbd> ville
tilføje: en aktion efter dets sidste aktion og, i slutningen af en sekvens, en transition og et trin
med det nummer, det vil få. En transition, der ikke fører nogen steder hen, viser et
pladsholdertrin. Klik på en pladsholder for at tilføje den; klik kun på pladsholdertransitionens
streg for at tilføje transitionen alene: den bliver valgt, og dens eget pladsholdertrin kommer
derefter. Et nyt trin, der tilføjes fra sin pladsholder, bliver valgt, som om du havde klikket på
det, så dets egen pladsholder er ét klik væk; skriv transitionsbetingelserne senere (<kbd>F2</kbd>
eller dobbeltklik), eller brug <kbd>Enter</kbd> til at skrive hver enkelt undervejs. Med et
placeringsværktøj viser en pladsholder under markøren, hvad et klik vil placere.

## Mus {#mouse}

- **Klik** vælger; <kbd>Shift</kbd>+klik eller <kbd>Ctrl</kbd>+klik føjer til eller fjerner fra
  markeringen; træk på tomt lærred for at vælge med en ramme (et trin tager alle sine aktioner med);
  <kbd>Ctrl+A</kbd> vælger alt. Forbindelserne mellem valgte elementer fremhæves også.
- **Træk** i et hvilket som helst valgt element for at flytte hele markeringen (den fastgøres til
  gitteret); piletasterne skubber (<kbd>Shift</kbd> for større skridt).
- **Dobbeltklik** på et element for at redigere dets tekst; dobbeltklik på tomt lærred for at
  tilføje et trin der.
- **Højreklik** på et element for at se, hvad du kan gøre med det (tilføje en aktion, grene,
  tilbageføring, redigere, gøre det til makrotrin, klippe, kopiere, slette…), på markeringen eller
  på tomt lærred (tilføj et trin der, sæt ind, automatisk layout, omnummerer, tilpas). Menutasten
  åbner menuen for markeringen.
- En transition, hvis transitionsbetingelse endnu ikke er skrevet, viser et gråt **?**
  (dobbeltklik på det, eller tryk på <kbd>F2</kbd>); listen Problemer tæller den stadig med, indtil
  du skriver en.
- **Forbindelseshåndtag**: et valgt trin eller en valgt transition, eller et, som markøren er over,
  viser runde håndtag. Træk i ét: kun gyldige mål (et trin til en transition, en transition til et
  trin) fremhæves. Slip på tomt lærred for at oprette det manglende element der.
- Klik på en **forbindelse** for at vælge den; <kbd>Del</kbd> fjerner kun den forbindelse. Træk en
  opadgående forbindelse (en tilbageføring) til siden for at flytte dens sidelinje, eller træk dens
  nederste linje op eller ned; dobbeltklik på den for at vende tilbage til den automatiske rute.
  Automatisk går en tilbageføring under trinnene og ledningerne i sin egen sekvens i stedet for at
  krydse dem.
- Klik på en **dobbeltlinje** (OG-forgrening eller OG-sammenføring) for at vælge den: den
  fremhæves sammen med de forbindelser, den samler. Træk den, eller brug piletasterne, for at
  flytte den sammen med dens transition; <kbd>Del</kbd> fjerner de forbindelser og beholder
  transitionen og trinnene.

## Berøring: telefoner og tablets {#touch-phones-and-tablets}

- **Tryk** vælger. **Træk** i et element for at flytte det; træk i det tomme lærred for at
  panorere; **knib** med to fingre for at zoome.
- **Dobbelttryk** på et element for at redigere dets tekst, eller på det tomme lærred for at
  tilføje et trin der.
- **Hold, og træk så** på det tomme lærred for at vælge alt i en ramme.
- Når noget er valgt, gør en **værktøjslinje** nederst på lærredet det samme som tasterne på en
  computer: **Trin** (en transition og et trin nedenunder), **Aktion**, grenene **Parallel** og
  **Valg**, **Løkke**, **Rediger**, **Detaljer** (egenskaberne) og **Slet**.
- Et valgt trin eller en valgt transition viser sine **forbindelseshåndtag** lige over og under
  sig: træk ét hen til et fremhævet mål eller til tomt lærred for at oprette det manglende element.
- Når et værktøj er valgt (trin, transition, kommentar, aktion), **trykker** du der, hvor elementet
  skal placeres.

På en telefon er skærmen indrettet til betjening med én hånd: værktøjerne, fortryd og gentag er
nederst, menuen (☰) rummer Filer, Rediger, Vis, Simuler og Hjælp, og panelerne (egenskaber,
variabler, problemer, simulering, tidsdiagram, oversigt) åbner som et ark over diagrammet med
panelknappen nederst til højre. Træk i arkets håndtag for at gøre det højere eller lavere.

## Værktøjer {#tools}

Værktøjslinjen øverst i vinduet rummer værktøjerne (bogstavet i hver knap er dens tast): **Vælg**
(<kbd>V</kbd>), **Panorer** (<kbd>H</kbd>), **Trin** (<kbd>S</kbd>), **Transition**
(<kbd>T</kbd>), **Kommentar** (<kbd>C</kbd>) og **Aktion** (<kbd>Shift+A</kbd>). Med et
placeringsværktøj klikker du på tomt lærred for at placere et element; hold <kbd>Shift</kbd> nede
for at placere flere. <kbd>Esc</kbd> vender tilbage til Vælg. Værktøjet Aktion tilføjer også en
aktion til et trin, når du klikker på trinnet.

## Grene og strukturer {#branches-and-structures}

Forgreninger og sammenføringer tegnes aldrig i hånden; de følger af forbindelserne.

- <kbd>O</kbd> på et trin tilføjer endnu en udgående transition med sit eget trin: en
  **ELLER-forgrening**.
- <kbd>P</kbd> på et trin tilføjer et trin parallelt med det, startet af den samme transition og
  samlet af den næste: en **OG-forgrening** og en **OG-sammenføring**.
- Forbinder du et andet trin ind i en transition, får du en OG-sammenføring; forbinder du en anden
  transition ind i et trin, får du en ELLER-sammenføring.
- **Rediger › Kildetransition over trin / Dræntransition under trin** tilføjer en transition uden
  trin over eller under sig.
- <kbd>J</kbd> på en transition laver et **spring** til et trin i stedet for en streg til det: skriv
  trinnet under transitionen (`X10` eller blot `10`) og tryk <kbd>Enter</kbd>. Transitionen ender i
  en pil mærket **X10**, og et trin, der kun nås ved spring, får en pil mærket med de trin, de
  kommer fra. Dobbeltklik på X10 for at ændre det; slet teksten for at fjerne springet. Højreklik på
  en forbindelse eller en transition med spring: **Tegn forbindelsen som spring** og **Tegn springet
  som forbindelse**. Kun tegningen ændres: transitionen fører stadig til trinnet, i simuleringen og
  i den genererede kode. Et spring kan også fjernes ved at klikke på pilen og trykke <kbd>Del</kbd>.
  Under en transition, der endnu ikke fører nogen steder hen, gør pladsholder-pilen **X…** ved siden
  af pladsholder-trinnet det samme som <kbd>J</kbd>.

## Ryd op {#tidy-up}

- **Rediger › Automatisk layout af grafcet** placerer alle trin i rækker, centrerer grene under
  deres forgrening og fører tilbageføringer i siden. **Automatisk layout af markering** gør det kun
  for markeringen. Layout sker aldrig af sig selv og kan fortrydes.
- **Rediger › Omnummerer trin** nummererer trinnene i rækkefølge langs forløbet og opdaterer alle
  henvisninger `Xn` og tvangsstyringer.

## Fortryd, kopier og sæt ind {#undo-copy-and-paste}

- <kbd>Ctrl+Z</kbd> fortryder, <kbd>Ctrl+Shift+Z</kbd> eller <kbd>Ctrl+Y</kbd> gentager. Et helt
  træk er ét fortrydelsestrin; menuen Rediger viser, hvad der vil blive fortrudt.
- <kbd>Ctrl+C</kbd>, <kbd>Ctrl+X</kbd>, <kbd>Ctrl+V</kbd> virker mellem grafcets, projekter og
  browserfaner. Indsatte trin omnummereres, hvis deres numre er optaget, og de variabler, de bruger,
  kommer med.

## Naviger {#navigate}

- Rul for at panorere; <kbd>Ctrl</kbd>+rul eller knib for at zoome; <kbd>Space</kbd>+træk, den
  midterste museknap eller højre museknap holdt nede panorerer også (et højreklik uden at flytte
  musen åbner stadig menuen).
- <kbd>Shift+1</kbd> tilpasser hele grafcetten, <kbd>Shift+2</kbd> markeringen, <kbd>Shift+0</kbd>
  er 100 %.
- <kbd>Ctrl+K</kbd> åbner kommandopaletten: skriv en hvilken som helst kommando eller et
  grafcetnavn.

## Kommentarer og navne {#comments-and-names}

- Kommentarer (værktøjet <kbd>C</kbd>) er frie noter på diagrammet; simulatoren ignorerer dem.
- Trinbetegnelser (panelet Egenskaber) er korte beskrivelser, der vises til venstre for trinnet.
- Dobbeltklik på projektnavnet øverst for at omdøbe projektet, og på en grafcets fane for at omdøbe
  grafcetten.

## To grafcets på én gang {#two-grafcets-at-once}

Tryk på <kbd>Ctrl+\</kbd> (eller **Vis › Delt visning**) for at vise en anden grafcet ved siden af
den første, eller højreklik på en fane, og vælg **Åbn ved siden af** eller **Åbn nedenunder**. Hver
rude har sin egen grafcetvælger øverst. Klik i en rude for at arbejde i den: dens overskrift
fremhæves, og fanerne, tastaturet og panelet Egenskaber følger den. Træk i linjen mellem ruderne for
at ændre deres størrelse; × lukker en rude.

## Egenskaber og paneler {#properties-and-panels}

Diagrammet har hele vinduet; resten svæver oven på det og vises, når der er brug for det. Vælg
noget, så vises dets **egenskaber** i et kort til venstre: typen af et trin eller en aktion vælges
med billedknapper, der viser dens symbol. Kortets × skjuler det for denne markering; når intet er
valgt, viser egenskabsknappen ved siden af projektnavnet grafcetten og projektet. Panelerne
**Variabler**, **Problemer**, **Tidsdiagram** og **Oversigt** åbnes med knapperne nederst til
højre, i et kort til højre, som du kan gøre bredere ved dets venstre kant. Under simulering svæver
simuleringspanelet (indgange, værdier, log, scenarier) til venstre.

Når flere elementer er valgt, giver kortet et overblik: hvor mange trin, transitioner, aktioner og
kommentarer (klik på et af dem for kun at beholde dem) og markeringen som et træ i læserækkefølge,
hvert trin med dets valgte aktioner og transitioner under sig (et trin, der kun vises for deres
skyld, står i kursiv). Klik på en linje for kun at vælge det element; <kbd>Ctrl</kbd>+klik fjerner
det fra markeringen.
