# Redigera diagram

GrafcetMaker är byggd så att du sällan behöver placera något för hand: markera ett element och
använd en tangent, så numreras, länkas och placeras de nya elementen åt dig. Tipsen under
verktygsfältet överst på ritytan listar de tangenter som gäller för den aktuella markeringen.

## De viktigaste tangenterna {#the-essential-keys}

| Tangent                                   | När ett steg är markerat                                                 | När en övergång är markerad                               |
| ----------------------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------- |
| <kbd>Enter</kbd>                          | lägg till en övergång och ett steg nedanför, redigera övergångsvillkoret | lägg till ett steg nedanför                               |
| <kbd>A</kbd>                              | lägg till en aktion                                                      | —                                                         |
| <kbd>P</kbd>                              | lägg till en parallell gren (OCH)                                        | lägg till ännu ett steg som den aktiverar                 |
| <kbd>O</kbd>                              | lägg till en alternativ gren (ELLER)                                     | lägg till en alternativ övergång (förbikoppling)          |
| <kbd>L</kbd> och klicka sedan på ett steg | återgång till det steget                                                 | länka till det steget (om den inte leder någonstans ännu) |
| <kbd>F2</kbd> eller dubbelklick           | redigera numret                                                          | redigera övergångsvillkoret                               |
| <kbd>R</kbd>                              | —                                                                        | rotera: uppifrån och ned eller höger till vänster         |
| <kbd>Del</kbd>                            | ta bort och koppla ihop sekvensen                                        | ta bort                                                   |

En övergång som har roterats till **höger till vänster** har ett lodrätt streck: länken från steget
före den kommer in från höger och länken till nästa steg går ut åt vänster, med pilar. Klicka var
som helst på en övergångs streck, nummer eller övergångsvillkor för att markera den.

När inget är markerat fortsätter <kbd>Enter</kbd> sekvensen från dess sista steg. <kbd>Enter</kbd>
på ett steg som redan har en fortsättning infogar den nya övergången och det nya steget och flyttar
ned allt under dem.

Medan du redigerar ett övergångsvillkor eller en aktion verkställer <kbd>Shift+Enter</kbd> den och
öppnar nästa: nästa övergångsvillkor längre ned i sekvensen (en ny övergång och ett nytt steg i
slutet), eller stegets nästa aktion (en ny efter den sista). Skriv en hel sekvens, eller en rad
aktioner, i ett svep.

## Skriva i diagrammet {#typing-on-the-diagram}

<kbd>F2</kbd>, ett dubbelklick eller <kbd>Enter</kbd> öppnar en text precis där den är ritad: skriv
som på ritytan, och rutan runt texten växer medan du skriver. <kbd>Enter</kbd> verkställer
(<kbd>Ctrl+Enter</kbd> i en kommentar), <kbd>Esc</kbd> avbryter, och ett klick någon annanstans
verkställer också. En röd vågig understrykning markerar ett värde som inte är giltigt ännu; rutan
under texten förklarar varför.

## Streckade förslag {#ghosts}

Ett markerat steg visar streckade **förslag** på det som <kbd>A</kbd> och <kbd>Enter</kbd> skulle
lägga till: en aktion efter dess sista aktion och, i slutet av en sekvens, en övergång och ett steg
med det nummer det kommer att få. En övergång som inte leder någonstans visar ett föreslaget steg.
Klicka på ett förslag för att lägga till det; klicka bara på strecket i den föreslagna övergången
för att lägga till enbart övergången: den markeras, och dess eget föreslagna steg kommer härnäst.
Ett nytt steg som har lagts till från sitt förslag markeras, som om du hade klickat på det, så dess
eget förslag är bara ett klick bort; skriv övergångsvillkoren senare (<kbd>F2</kbd> eller
dubbelklick), eller använd <kbd>Enter</kbd> för att skriva vart och ett efter hand. Med ett
placeringsverktyg visar ett förslag under pekaren vad ett klick kommer att placera.

## Mus {#mouse}

- **Klick** markerar; <kbd>Shift</kbd>+klick eller <kbd>Ctrl</kbd>+klick lägger till i eller tar
  bort från markeringen; dra på tom rityta för att markera med en ram (ett steg tar med alla sina
  aktioner); <kbd>Ctrl+A</kbd> markerar allt. Länkarna mellan markerade element framhävs också.
- **Dra** ett markerat element för att flytta hela markeringen (den fästs vid rutnätet);
  piltangenterna flyttar stegvis (<kbd>Shift</kbd> för större förflyttningar).
- **Dubbelklicka** på ett element för att redigera dess text; dubbelklicka på tom rityta för att
  lägga till ett steg där.
- **Högerklicka** på ett element för det du kan göra med det (lägga till en aktion, förgreningar,
  återgång, redigera, göra till makrosteg, klippa ut, kopiera, ta bort…), på markeringen eller på
  tom rityta (lägga till ett steg där, klistra in, automatisk layout, numrera om, anpassa).
  Menytangenten öppnar menyn för markeringen.
- En övergång vars övergångsvillkor inte är skrivet ännu visar ett grått **?** (dubbelklicka på det
  eller tryck på <kbd>F2</kbd>); listan Problem räknar det tills du har skrivit ett.
- **Länkhandtag**: ett markerat steg eller en markerad övergång, eller en som pekaren vilar på,
  visar runda handtag. Dra i ett: bara giltiga mål (ett steg till en övergång, en övergång till ett
  steg) framhävs. Släpp på tom rityta för att skapa det saknade elementet där.
- Klicka på en **länk** för att markera den; <kbd>Del</kbd> tar bort bara den länken. Dra en
  uppåtgående länk (en återgång) åt sidan för att flytta dess sidolinje, eller dra dess nedre linje
  uppåt eller nedåt; dubbelklicka på den för att återgå till den automatiska dragningen. Automatiskt
  går en återgång under stegen och ledningarna i sin egen sekvens i stället för att korsa dem.

## Pekskärm: mobiler och surfplattor {#touch-phones-and-tablets}

- **Tryck** markerar. **Dra** ett element för att flytta det; dra den tomma ritytan för att
  panorera; **nyp** med två fingrar för att zooma.
- **Dubbeltryck** på ett element för att redigera dess text, eller på den tomma ritytan för att
  lägga till ett steg där.
- **Håll kvar och dra** på den tomma ritytan för att markera allt i en ram.
- När något är markerat gör ett **verktygsfält** längst ned på ritytan det som tangenterna gör på
  en dator: **Steg** (en övergång och ett steg nedanför), **Aktion**, förgreningarna **Parallell**
  och **Alternativ**, **Återgång**, **Redigera**, **Detaljer** (egenskaperna) och **Ta bort**.
- Ett markerat steg eller en markerad övergång visar sina **länkhandtag** strax ovanför och nedanför
  sig: dra ett till ett framhävt mål, eller till tom rityta för att skapa det saknade elementet.
- När ett verktyg är valt (steg, övergång, kommentar, aktion) **trycker** du där elementet ska
  placeras.

På en mobil är skärmen ordnad för en hand: verktygen, ångra och gör om finns längst ned, menyn (☰)
innehåller Arkiv, Redigera, Visa, Simulera och Hjälp, och panelerna (egenskaper, variabler,
problem, simulering, tidsdiagram, översikt) öppnas som ett ark över diagrammet med panelknappen
nere till höger. Dra i arkets handtag för att göra det högre eller lägre.

## Verktyg {#tools}

Verktygsfältet överst i fönstret innehåller verktygen (bokstaven i varje knapp är dess tangent):
**Markera** (<kbd>V</kbd>), **Panorera** (<kbd>H</kbd>), **Steg** (<kbd>S</kbd>), **Övergång**
(<kbd>T</kbd>), **Kommentar** (<kbd>C</kbd>) och **Aktion** (<kbd>Shift+A</kbd>). Med ett
placeringsverktyg klickar du på tom rityta för att placera ett element; håll ned <kbd>Shift</kbd>
för att placera flera. <kbd>Esc</kbd> återgår till Markera. Verktyget Aktion lägger också till en
aktion i ett steg när du klickar på steget.

## Förgreningar och strukturer {#branches-and-structures}

Förgreningar och sammanföringar ritas aldrig för hand; de följer av länkarna.

- <kbd>O</kbd> på ett steg lägger till ännu en utgående övergång med ett eget steg: en
  **ELLER-förgrening**.
- <kbd>P</kbd> på ett steg lägger till ett steg parallellt med det, som startas av samma övergång
  och förenas av nästa: en **OCH-förgrening** och en **OCH-sammanföring**.
- Att länka ett andra steg in i en övergång ger en OCH-sammanföring; att länka en andra övergång in
  i ett steg ger en ELLER-sammanföring.
- **Redigera › Källövergång ovanför steget / Sänkövergång nedanför steget** lägger till en övergång
  utan steg ovanför eller nedanför.

## Städa upp {#tidy-up}

- **Redigera › Automatisk layout av grafcet** placerar alla steg i rader, centrerar grenar under
  sin förgrening och drar återgångar vid sidan. **Automatisk layout av markering** gör samma sak
  bara för markeringen. Layouten sker aldrig av sig själv och kan ångras.
- **Redigera › Numrera om steg** numrerar stegen i ordning längs flödet och uppdaterar varje
  `Xn`-referens och tvångsstyrning.

## Ångra, kopiera och klistra in {#undo-copy-and-paste}

- <kbd>Ctrl+Z</kbd> ångrar, <kbd>Ctrl+Shift+Z</kbd> eller <kbd>Ctrl+Y</kbd> gör om. En hel dragning
  är ett ångrasteg; menyn Redigera anger vad som kommer att ångras.
- <kbd>Ctrl+C</kbd>, <kbd>Ctrl+X</kbd>, <kbd>Ctrl+V</kbd> fungerar mellan grafcetar, projekt och
  flikar i webbläsaren. Inklistrade steg numreras om om deras nummer är upptagna, och variablerna de
  använder följer med.

## Navigera {#navigate}

- Rulla för att panorera; <kbd>Ctrl</kbd>+rullning eller nyp för att zooma; <kbd>Space</kbd>+dra
  eller musens mittknapp panorerar också.
- <kbd>Shift+1</kbd> anpassar hela grafceten, <kbd>Shift+2</kbd> markeringen, <kbd>Shift+0</kbd>
  ger 100 %.
- <kbd>Ctrl+K</kbd> öppnar kommandopaletten: skriv ett kommando eller ett grafcetnamn.

## Kommentarer och namn {#comments-and-names}

- Kommentarer (verktyget <kbd>C</kbd>) är fria anteckningar i diagrammet; simulatorn ignorerar dem.
- Stegens etiketter (panelen Egenskaper) är korta beskrivningar som visas till vänster om steget.
- Dubbelklicka på projektnamnet överst för att byta namn på projektet, och på en grafcetflik för att
  byta namn på grafceten.

## Två grafcetar på en gång {#two-grafcets-at-once}

Tryck på <kbd>Ctrl+\</kbd> (eller **Visa › Delad vy**) för att visa en andra grafcet bredvid den
första, eller högerklicka på en flik och välj **Öppna bredvid** eller **Öppna nedanför**. Varje ruta
har en egen grafcetväljare överst. Klicka i en ruta för att arbeta i den: dess rubrik framhävs, och
flikarna, tangentbordet och panelen Egenskaper följer den. Dra i strecket mellan rutorna för att
ändra deras storlek; × stänger en ruta.

## Egenskaper och paneler {#properties-and-panels}

Diagrammet har hela fönstret; resten svävar ovanpå och visas när det behövs. Markera något så visas
dess **egenskaper** i ett kort till vänster: typen av ett steg eller en aktion väljs med
bildknappar som visar dess symbol. Kortets × döljer det för den här markeringen; när inget är
markerat visar egenskapsknappen bredvid projektnamnet grafceten och projektet. Panelerna
**Variabler**, **Problem**, **Tidsdiagram** och **Översikt** öppnas från knapparna nere till höger,
i ett kort till höger som du kan göra bredare i dess vänstra kant. Under simulering svävar
simuleringspanelen (ingångar, värden, logg, scenarier) till vänster.

När flera element är markerade ger kortet en översikt: hur många steg, övergångar, aktioner och
kommentarer (klicka på en för att bara behålla dem) och markeringen som ett träd i läsordning, varje
steg med sina markerade aktioner och övergångar under sig (ett steg som bara visas för deras skull
står i kursiv). Klicka på en rad för att bara markera det elementet; <kbd>Ctrl</kbd>+klick tar bort
det från markeringen.
