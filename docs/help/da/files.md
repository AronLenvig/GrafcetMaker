# Filer, lagring og eksport

Alt foregår på din computer: der er ingen konto, og intet uploades.

## Automatisk lagring og gendannelse {#autosave-and-recovery}

Hver ændring gemmes i din browser et halvt sekund efter, at du har lavet den. Du kan genindlæse
eller lukke fanen når som helst uden at blive spurgt: næste gang du åbner GrafcetMaker, er dit
projekt tilbage, som du forlod det, inklusive ikke-gemte ændringer. En prik `●` ved siden af
projektnavnet betyder, at der er ændringer, som endnu ikke er gemt i en fil.

**Filer › Lokal historik** viser øjebliksbilleder gemt i browseren: de tages, når du gemmer, med få
minutters mellemrum, mens du redigerer, og før et projekt lukkes. Gendanner du et, åbnes det som
ikke-gemte ændringer.

> **Vigtigt:** browserens lager hører til denne browser på denne computer, og hvis du rydder
> webstedsdata, slettes det. Gem i en fil, hvad du vil beholde.

## Offline og installation {#offline-and-installation}

Efter det første besøg virker GrafcetMaker uden netværk. Brug installationsknappen i browserens
adresselinje for at få den som en app med sit eget vindue. Når en ny version er klar, tilbyder et
kort i hjørnet at genindlæse: dit arbejde bevares.

## Gem og åbn {#save-and-open}

- **Gem** (<kbd>Ctrl+S</kbd>) skriver projektet til en `.grafcet.json`-fil. I Chrome og Edge skriver
  den tilbage til den samme fil hver gang; i andre browsere downloades filen.
- **Gem som** (<kbd>Ctrl+Shift+S</kbd>) vælger en ny fil. **Filer › Download en kopi** downloader en
  kopi uden at ændre, hvor Gem skriver.
- **Åbn** (<kbd>Ctrl+O</kbd>), **Filer › Åbn seneste**, eller slip en `.grafcet.json`-fil et
  vilkårligt sted i vinduet. Har det åbne projekt ikke-gemte ændringer, bliver du spurgt først, og
  en ugyldig fil afvises med en forklaring, uden at dit projekt berøres.

`.grafcet.json`-filer er læsbar tekst, velegnet til versionsstyring (Git) og kodegennemgang.

**grafcet.io-filer** (`.grafcetio`) åbnes på samme måde: de konverteres til et nyt projekt med én
delgrafcet pr. diagram (eller pr. ramme), variablerne oprettet ud fra det, diagrammerne bruger, og
et ryddeligt layout. En meddelelse viser alt, hvad konverteringen har ændret. Gem for at beholde det
som et GrafcetMaker-projekt; den oprindelige fil ændres ikke.

## Del et link {#share-a-link}

**Filer › Kopier delingslink** kopierer en webadresse, der indeholder hele projektet, komprimeret.
Indsæt den i en chat, en e-mail eller en sag: den, der åbner den, får sin egen kopi af projektet,
med alle dets grafcets og variabler, og kan ændre den uden at påvirke din.

- Projektet rejser inde i linket (efter `#`), som browsere aldrig sender til webserveren: intet
  uploades, og links virker også offline og på interne installationer.
- Alle, der har linket, kan læse projektet, så del det, som du ville dele selve filen.
- Et link er et øjebliksbillede: senere ændringer kræver et nyt link.
- Små diagrammer giver links på et eller to tusind tegn. Advarer GrafcetMaker om, at et link er
  langt, kan nogle chat- og mailprogrammer afkorte det; send i stedet `.grafcet.json`-filen.
- At åbne et link virker som at åbne en fil: har dit projekt ikke-gemte ændringer, bliver du spurgt
  først, og et beskadiget link afvises med en forklaring, uden at dit projekt berøres.

## Grafcets fra en AI-assistent {#charts-from-ai-assistants}

En AI-assistent som ChatGPT eller Claude kan tegne en grafcet til dig. Bed den først om at læse
[grafcet.org/ai.txt](https://grafcet.org/ai.txt): der lærer den GRAFCET-tekst, en tekstform af
grafcetten, og hvordan den laver et link, der åbner den her.

- **Et link fra assistenten** åbner grafcetten, placeret automatisk, i stedet for det åbne projekt
  (du bliver spurgt først, hvis det har ændringer, der ikke er gemt).
- **Filer › Åbn fra tekst…** åbner en grafcet, som assistenten har skrevet som tekst: indsæt den,
  og klik på **Åbn**. En linje, der ikke kan læses, bliver nævnt med problemet; du kan rette den
  eller sende beskeden tilbage til assistenten.
- **Filer › Kopiér som tekst (til AI-assistenter)** kopierer din grafcet som GRAFCET-tekst, så du
  kan indsætte den i chatten og bede om ændringer, en forklaring eller en gennemgang.

Placeringer er ikke en del af teksten: en grafcet åbnet fra tekst placeres automatisk.

## Rediger sammen live {#edit-together-live}

**Filer › Livesamarbejde…** (eller personknappen øverst til højre) lader flere personer redigere det
samme projekt på samme tid, hver på sin egen computer.

1. Skriv dit navn, og vælg **Start livesession**. Send det link, der vises, til de andre.
2. De åbner linket, skriver deres navn og vælger **Deltag**.
3. Alle ser de andres markører og markeringer med deres navne, og hver ændring vises hos alle i
   løbet af et øjeblik.

- Ændringer flettes felt for felt: flytter du et trin, mens en anden omdøber det, bevares begge
  dele.
- **Fortryd** tager kun dine egne ændringer tilbage.
- Mens du simulerer, venter de andres ændringer, så diagrammet fortsat svarer til din simulering:
  **Genstart med ændringer** i simuleringsknapperne tager dem med.
- Uden forbindelse kan du arbejde videre; ændringerne udveksles, når den er tilbage.
- **Forlad sessionen** beholder projektet på din enhed som din egen kopi.
- Projektet er end-to-end-krypteret med en nøgle, der kun findes i linket: alle, der har linket,
  kan se og ændre projektet, så del det, som du ville dele selve filen.

## Eksport {#export}

**Filer › Eksporter…** (<kbd>Ctrl+E</kbd>, eller knappen **Eksport** øverst til højre) åbner én
dialogboks til alle formater med en live forhåndsvisning. Dens indstillinger huskes for hvert
projekt. **Filer › Eksporter som** åbner den direkte på et bestemt format.

| Format                | Brug det til                                                                                                           |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| **PDF**               | udskrivning og dokumentation: vektor, A4 eller A3, tilpasset siden eller fordelt over flere ark, med titelfelt         |
| **SVG**               | dokumenter og web: vektor, skarp i alle størrelser                                                                     |
| **PNG**               | præsentationer, chats og sager: opløsning 1×, 2× eller 4×, eventuelt gennemsigtig                                      |
| **WebP**              | det samme som PNG med mindre filer                                                                                     |
| **Variabler (Excel)** | variabeltabellen som `.xlsx`-projektmappe                                                                              |
| **Variabler (CSV)**   | variabeltabellen til andre værktøjer                                                                                   |
| **Structured Text**   | PLC-kode, der kører alle grafcets: IEC 61131-3, Siemens TIA Portal (SCL), Beckhoff TwinCAT 3 eller Allen-Bradley Logix |
| **PLCopen XML**       | import af grafcets i et PLC-værktøj som SFC-programmer                                                                 |

Eksporter er som standard sort på hvidt; vælg **Aktuelt tema** for at beholde skærmens farver.
Eksporter den aktuelle grafcet, markeringen eller alle grafcets.

**Filer › Kopier diagram som PNG / SVG** lægger markeringen (eller hele grafcetten) i
udklipsholderen, klar til at blive sat ind i en rapport.

## PLC-kode {#plc-code}

**Structured Text** og **PLCopen XML** omsætter dine grafcets til PLC-kode. Vælg PLC'en under
**PLC**:

- **IEC 61131-3**: en funktionsblok (`.st`) til CODESYS og de fleste andre værktøjer.
- **Siemens TIA Portal (SCL)**: en SCL-kilde (`.scl`) til S7-1200/1500. I TIA Portal tilføjer du den
  under **External source files** og vælger **Generate blocks from source**.
- **Beckhoff TwinCAT 3**: en POU-fil (`.TcPOU`). Højreklik på en mappe i PLC-projektet ›
  **Add › Existing Item**.
- **Allen-Bradley Studio 5000**: en Structured Text-rutine. Opret de tags, der står i dens hoved
  (program scope), og sæt derefter koden ind i en ST-rutine. Timere bruger TONR/TOFR, flanker
  OSRI/OSFI, og den første scanning (`S:FS`) sætter startværdierne.

Structured Text findes i to stilarter:

- **CASE pr. sekvens** (standard): én INT-variabel pr. sekvens holder nummeret på dens aktive trin,
  og en `CASE` viser transitionerne for hvert trin (`IF receptivity THEN step_G1 := 2;`). Udgangene
  følger med én linje hver, f.eks. `Motor := step_G1 >= 2 AND step_G1 <= 4;`. Sekvenser med
  parallelle grene beholder én BOOL pr. trin.
- **Én BOOL pr. trin**: alle transitioner, så alle trin, så timere, flanker og aktioner, én gang pr.
  PLC-scanning; sæt flueben ved **Søg efter stabilitet i hver scanning** for at passere kæder af
  sande transitioner inden for én scanning, som GRAFCET gør.

En lagret aktion som `Q1 := 1` ved aktivering udføres én gang, og Q1 beholder sin værdi, efter at
trinnet er forladt. Sæt flueben ved **Hold lagrede aktioner med en konstant værdi** for i stedet at
tildele den i hver scanning, mens dens trin er aktivt.

PLCopen-filen indeholder ét SFC-program pr. grafcet til import i ingeniørværktøjer.
Forhåndsvisningen viser alt det, formatet ikke kan udtrykke. Gennemgå altid genereret kode, før den
kører på en maskine.

## Indstillinger {#settings}

**Filer › Indstillinger…** (<kbd>Ctrl+,</kbd>) rummer tema, notation, velkomstskærm, gitter, tips
og simuleringspræferencer og viser, hvor meget af browserens lager der er brugt. Du kan rydde den
lokale historik og listen over seneste filer der.

## Sprog {#language}

Vælg sproget med flaget nederst til højre (på en telefon nederst i menuen ☰); valget huskes på
denne enhed. Hvert sprog har også sin egen adresse, f.eks. `…/de/` for tysk, så et link
åbner på det sprog, det blev sendt på.
