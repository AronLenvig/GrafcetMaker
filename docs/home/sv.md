# GrafcetMaker: kostnadsfri editor och simulator för GRAFCET online

GrafcetMaker ritar, kontrollerar och simulerar GRAFCET-diagram (IEC 60848) i webbläsaren och gör om
dem till PLC-kod. Den är gjord för automationsingenjörer, lärare och studenter: kostnadsfri och med
öppen källkod (MIT-licens), utan konto, och den fungerar offline.

GrafcetMaker är en webbapp: den körs i alla moderna webbläsare med JavaScript påslaget. Är GRAFCET
nytt för dig? Läs [GRAFCET-guiden](sv/guide/), som också finns på [engelska](en/guide/),
[franska](fr/guide/), [tyska](de/guide/), [spanska](es/guide/), [danska](da/guide/), [portugisiska](pt/guide/), [polska](pl/guide/), [ryska](ru/guide/), [kinesiska](zh/guide/) och [hindi](hi/guide/).

## För AI-assistenter

AI-assistenter som ChatGPT och Claude kan göra ett grafcet åt dig och ge dig det som en länk som öppnar det här. Assistent, läs [ai.txt](ai.txt) för att se hur. I GrafcetMaker öppnar **Arkiv › Öppna från text…** ett grafcet som en assistent har skrivit, och **Arkiv › Kopiera som text** ger ditt grafcet tillbaka till den.

## Det här kan du göra

- **Rita** steg, övergångar, övergångsvillkor och aktioner med musen eller tangentbordet
  (<kbd>Enter</kbd> fortsätter en sekvens), med ELLER- och OCH-förgreningar, återgångar, käll- och
  sänkövergångar och kommentarer. Automatisk layout gör ett diagram prydligt när du vill.
- **Kontrollera** diagrammet medan du ritar: syntax och typer i varje övergångsvillkor, okända
  variabler, dubbla stegnummer, steg som inte kan nås, återvändsgränder, alternativ som inte är
  uteslutande, möjliga transienta slingor och utgångar som styrs från parallella grenar. De flesta
  problem har en snabbkorrigering.
- **Simulera** enligt utvecklingsreglerna i IEC 60848: markörer i de aktiva stegen, möjliggjorda
  övergångar, ingångar som du klickar på eller skriver in, tidsfördröjningar, flanker, instabila
  steg, tvångsstyrning mellan grafcetar, ett tidsdiagram över varje variabel och scenarier som du
  spelar in och spelar upp.
- **Strukturera** stora tillämpningar med delgrafcetar, makrosteg och deras expansioner, omslutande
  steg och tvångsstyrningar.
- **Exportera** till PDF (A4 eller A3, med namnruta, vid behov fördelat över flera blad), SVG, PNG
  och WebP, variabeltabellen till Excel och CSV, och generera Structured Text eller PLCopen XML.
- **Arbeta tillsammans** live via en länk: alla ser de andras pekare och ändringar i realtid,
  totalsträckskrypterat.

## GRAFCET-element som stöds

| Element    | Det GrafcetMaker stöder                                                                                                     |
| ---------- | --------------------------------------------------------------------------------------------------------------------------- |
| Steg       | vanliga steg och initialsteg, makrosteg med expansion, omslutande steg; stegvariabler `X1`                                  |
| Övergångar | övergångsvillkor med OCH, ELLER, ICKE, stigande ↑ och fallande ↓ flanker, tidsfördröjningar som `5s/X1`, jämförelser av tal |
| Strukturer | sekvenser, ELLER-förgrening och -sammanföring, OCH-förgrening och -sammanföring, återgångar, hopp, käll- och sänkövergångar |
| Aktioner   | kontinuerliga, villkorade, lagrade vid aktivering, vid avaktivering eller vid händelse; tvångsstyrningar `G2{8}`, `G2{*}`   |
| Variabler  | ingångar, utgångar och interna variabler av typen BOOL, INT, REAL och TIME, med adresser och kommentarer                    |
| Notation   | skrivs i vanlig ASCII (`a*/b`, `RE a`), visas i läroboksnotation (överstreck för ICKE, ↑ och ↓) eller som den skrevs        |

## Simulering

Simulatorn följer utvecklingsreglerna i IEC 60848. Initialstegen är aktiva vid start. En övergång
är möjliggjord när alla steg ovanför den är aktiva, och den passeras när även dess övergångsvillkor
är sant: stegen nedanför blir aktiva och stegen ovanför inaktiva. Alla passerbara övergångar
passeras samtidigt, och ett steg som aktiveras och avaktiveras på en gång förblir aktivt.

Efter varje ändring av ingångarna söker simulatorn efter stabilitet: den fortsätter att passera
övergångar tills ingen fler kan passeras. Steg som passeras på vägen (instabila steg) utför inte
sina kontinuerliga aktioner, men deras lagrade aktioner utförs. Tiden är virtuell, så ett diagram
kan köras i realtid, snabbare eller en utveckling i taget, och ett tidsdiagram registrerar varje
variabel.

## Export och PLC-kod

| Format            | Används för                                               | Öppnas i                                                                                                                                                                    |
| ----------------- | --------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF               | utskrift och dokumentation: vektor, A4 eller A3, namnruta | alla PDF-läsare                                                                                                                                                             |
| SVG, PNG, WebP    | rapporter, presentationer och webbsidor, även via urklipp | Word, PowerPoint, webbläsare och bildredigerare                                                                                                                             |
| Variabler         | variabeltabellen som Excel eller CSV, och tillbaka        | Excel, LibreOffice och andra kalkylprogram                                                                                                                                  |
| Structured Text   | PLC-kod för varje grafcet (IEC 61131-3)                   | CODESYS och de flesta IEC 61131-3-verktyg, Siemens TIA Portal (SCL-källa för S7-1200/1500), Beckhoff TwinCAT 3 (POU-fil), Allen-Bradley Studio 5000 (Structured Text-rutin) |
| PLCopen XML (TC6) | grafcetarna som SFC-program                               | PLC-verktyg med import av PLCopen XML                                                                                                                                       |
| Projektfil        | hela projektet som läsbar `.grafcet.json`                 | GrafcetMaker                                                                                                                                                                |

Structured Text finns i två stilar: en `CASE` per sekvens, som när man skriver för hand, eller en
BOOL per steg. Genererad kod är en utgångspunkt: granska den innan den körs på en maskin.

## Exempel

Sex exempelprojekt kan öppnas från editorns startskärm:

- **Trafikljus** med knapp för fotgängare: tidsfördröjningar och en lagrad begäran.
- **Borrstation**: en bearbetningscykel med detaljräknare och underhåll var 100:e detalj.
- **Tankfyllning**: numeriska ingångar och jämförelser.
- **Parallellt transportband**: parallella grenar, med en säkerhetsgrafcet som tvångsstyr linjen.
- **Tappningslinje**: ett makrosteg, tre stationer parallellt, kontroll och räknare.
- **Driftlägen**: ett omslutande steg, en paus som fryser cykeln och ett nödstopp.

[GRAFCET-guiden](sv/guide/#exempel) ritar de två första och öppnar dem i editorn.

## Vanliga frågor

### Är GrafcetMaker kostnadsfri? Finns det några begränsningar?

Ja, den är kostnadsfri och har öppen källkod under MIT-licensen. Det finns ingen betalversion, ingen
provperiod och ingen gräns för antalet projekt, grafcetar eller steg.

### Måste jag registrera mig eller installera något?

Nej. Öppna sidan och börja rita; det finns inget konto. Du kan också installera den från
webbläsaren som en app, för att starta den som ett vanligt datorprogram.

### Fungerar den offline?

Ja. Efter det första besöket finns allt den behöver i webbläsaren, så den startar och fungerar utan
nätverk. Bara livesamarbete kräver en anslutning.

### Var sparas mina diagram?

På din dator. Projekten sparas automatiskt i webbläsaren och i de `.grafcet.json`-filer som du
sparar. Inget laddas upp och appen har ingen spårning. Livesessioner är totalsträckskrypterade med
en nyckel som bara finns i länken.

### Vilka webbläsare och enheter fungerar den på?

De senaste versionerna av Chrome, Edge, Firefox och Safari, på Windows, macOS, Linux, surfplattor
och mobiler. Mobiler får en layout för små skärmar, och pekskärmar får gester och större handtag.

### Vilken standard följer den?

GRAFCET enligt IEC 60848 (EN 60848 i Europa, SS-EN 60848 i Sverige). Genererad kod följer
IEC 61131-3.

### Kan den öppna filer från andra GRAFCET-program?

GrafcetMaker öppnar filer från grafcet.io (`.grafcetio`) och konverterar dem till ett projekt.
Variabeltabeller kan importeras från Excel och CSV.

### Kan mitt företag driva den i sitt eget nätverk?

Ja. GrafcetMaker är en uppsättning statiska filer som vilken webbserver som helst kan leverera,
under vilken sökväg som helst och utan internetåtkomst. En Docker-avbild med nginx medföljer.
