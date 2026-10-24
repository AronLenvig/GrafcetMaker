# Vad är GRAFCET? En komplett guide till IEC 60848

**GRAFCET** är ett grafiskt språk som beskriver hur ett sekventiellt styrsystem beter sig: en
maskin, en produktionslinje, ett trafikljus. Ett GRAFCET-diagram är en serie **steg** (det systemet
gör) förbundna med **övergångar** (villkoren för att gå vidare). Språket är internationellt
standardiserat som **IEC 60848**, i Sverige fastställt som **SS-EN 60848**, och är ursprunget till
språket Sequential Function Chart (SFC) i PLC-system.

Den här guiden förklarar varje element och varje regel i standarden med diagram och exempel. Alla
diagram är ritade med [GrafcetMaker](app:), en kostnadsfri editor och simulator för GRAFCET som körs
i webbläsaren: öppna exemplen och se dem utvecklas steg för steg.

## Vad GRAFCET står för

GRAFCET står för _GRAphe Fonctionnel de Commande Étape-Transition_, franska för ”funktionellt
styrdiagram med steg och övergångar”. Det föreslogs 1977 av en arbetsgrupp inom AFCET, den franska
föreningen för cybernetik, tillsammans med ADEPA, den franska myndigheten för utveckling av
automatiserad produktion. Det växte fram ur Petrinät och utformades som ett tydligt,
teknikoberoende sätt att skriva ned vad ett styrsystem ska göra, innan någon skriver en enda rad
PLC-kod.

- **1982**: fransk standard NF C03-190.
- **1988**: internationell standard IEC 848, _Preparation of function charts for control systems_.
- **2002**: IEC 60848 utgåva 2, _GRAFCET specification language for sequential function charts_.
- **2013**: IEC 60848 utgåva 3, den gällande, även publicerad i Europa som EN 60848 och i Sverige
  som SS-EN 60848.

GRAFCET lärs ut på tekniska gymnasier, i yrkesutbildningar och i ingenjörsutbildningar, framför allt
i fransk-, tysk-, spansk- och portugisisktalande länder. Enligt konvention är _GRAFCET_ språket och
_en grafcet_ ett diagram som är skrivet i det.

## Elementen i en grafcet

<!-- figure: anatomy | Delarna i en grafcet -->

- Ett **steg** är en kvadrat med ett nummer. Det står för en stabil situation i systemet: _väntar_,
  _fyller_, _borrar_. I varje ögonblick är varje steg antingen **aktivt** eller **inaktivt**, och
  mängden aktiva steg är grafcetens **situation**. Stegvariabeln `X1` är sann medan steg 1 är
  aktivt.
- Ett **initialsteg**, ritat som en dubbel kvadrat, är aktivt när systemet startar. Varje grafcet
  behöver minst ett.
- En **övergång** är ett kort vågrätt streck över en länk. Den sitter alltid mellan steg: två steg
  förbinds aldrig direkt, och inte heller två övergångar.
- **Övergångsvillkoret** är villkoret som skrivs bredvid en övergång, till exempel `start` eller
  `pressure > 6`. Övergångsvillkoret `1` är alltid sant.
- **Riktade länkar** förbinder steg och övergångar. De läses uppifrån och ned; en länk som går
  uppåt har en pil.
- **Aktioner** är rektanglar till höger om ett steg: det systemet gör medan steget är aktivt, till
  exempel _kör motorn_.

## De fem utvecklingsreglerna

IEC 60848 definierar exakt hur en grafcet utvecklas, med fem regler.

1. **Initialsituation**: vid start är initialstegen aktiva och alla andra inaktiva.
2. **Passering av en övergång**: en övergång är **möjliggjord** när alla steg direkt ovanför den är
   aktiva. Den **passeras** när den är möjliggjord och dess övergångsvillkor är sant.
3. **De aktiva stegens utveckling**: när en övergång passeras aktiveras alla steg direkt nedanför
   den och avaktiveras alla steg direkt ovanför den.
4. **Samtidig passering**: alla övergångar som kan passeras i samma ögonblick passeras samtidigt.
5. **Samtidig aktivering och avaktivering**: ett steg som aktiveras och avaktiveras i samma
   ögonblick förblir aktivt.

När en ingång ändras tillämpas reglerna om och om igen, med samma ingångar, tills ingen övergång
längre kan passeras. Det är **sökningen efter stabilitet**. Ett steg som aktiveras och lämnas igen
under sökningen är ett **instabilt steg** (eller transient steg): dess kontinuerliga aktioner utförs
aldrig, men dess lagrade aktioner utförs. Om till exempel övergångsvillkoren under steg 1 och 2
redan är sanna när steg 1 blir aktivt går grafceten direkt genom steg 2 till steg 3, och utgångarna
i steg 2 slås aldrig på.

## Övergångsvillkor: villkor, flanker och tidsfördröjningar

Ett övergångsvillkor är ett logiskt uttryck av ingångar, interna variabler, stegvariabler och tid.
Läroboksnotationen och hur du skriver den i GrafcetMaker:

| Notation             | Betydelse                                                             | Skrivs i GrafcetMaker |
| -------------------- | --------------------------------------------------------------------- | --------------------- |
| a · b                | a OCH b                                                               | `a * b`               |
| a + b                | a ELLER b                                                             | `a + b`               |
| a med ett överstreck | ICKE a                                                                | `/a`                  |
| ↑a                   | stigande flank: sann i det ögonblick a blir sant                      | `↑a` eller `RE a`     |
| ↓a                   | fallande flank: sann i det ögonblick a blir falskt                    | `↓a` eller `FE a`     |
| X3                   | steg 3 är aktivt                                                      | `X3`                  |
| 5 s/X2               | sant 5 s efter att steg 2 blev aktivt                                 | `5s/X2`               |
| t1/a/t2              | sant t1 efter att a blir sant, falskt igen t2 efter att a blir falskt | `2s/a/1s`             |
| [level > 80]         | jämförelse av ett numeriskt värde                                     | `level > 80`          |
| = 1                  | alltid sant                                                           | `1`                   |

<!-- figure: timer | Ett övergångsvillkor med tidsfördröjning: elementet är på i 5 sekunder -->

Flanker spelar roll när en signal förblir sann: med `↑start` startar cykeln en gång per tryck på
knappen och inte igen så länge den hålls nedtryckt. Editorns fullständiga syntax beskrivs i
[Skriva övergångsvillkor](app:#help/expressions).

## Aktioner

<!-- figure: actions | Kontinuerliga, villkorade och lagrade aktioner i steg 4 -->

- En **kontinuerlig aktion** är sann så länge dess steg är aktivt: _Lampa_ lyser medan steg 4 är
  aktivt.
- En **villkorad aktion** är en kontinuerlig aktion med ett **tilldelningsvillkor** skrivet ovanför
  dess ruta: _Siren_ ljuder bara medan steg 4 är aktivt **och** `alarm` är sant.
- **Fördröjda** och **tidsbegränsade** aktioner är villkorade aktioner vars villkor använder en
  tidsfördröjning: med `3s/X4` slås utgången på 3 s efter att steg 4 blev aktivt; med `/(3s/X4)` är
  den på bara under de första 3 s.
- En **lagrad aktion** tilldelar ett värde en gång, och värdet finns kvar tills en annan aktion
  ändrar det. Den utförs när steget **aktiveras** (pil uppåt), när det **avaktiveras** (pil nedåt)
  eller **vid en händelse** medan steget är aktivt (en flagga med händelsen, här `↑reset`). Räknare
  som `C := C + 1` är typiska lagrade aktioner.

En utgång som styrs av kontinuerliga aktioner följer stegen automatiskt. En utgång som sätts av en
lagrad aktion förblir satt tills en annan lagrad aktion återställer den, så planera var det sker.

## Sekvenser, alternativ och parallella grenar

### Välja mellan vägar: ELLER-förgrening

När ett steg följs av flera övergångar tar grafceten den väg vars övergångsvillkor är sant: en
**alternativ förgrening**, ritad med en enkel vågrät linje (**ELLER-förgrening**, kallad _selection
of sequence_ i SFC). Vägarna möts igen på en enkel linje (**ELLER-sammanföring**).

<!-- figure: or | ELLER-förgrening och ELLER-sammanföring: den ena grenen eller den andra -->

Gör övergångsvillkoren **ömsesidigt uteslutande**, så att de aldrig kan vara sanna samtidigt, som
`a` och `/a * b` här. Annars passeras båda övergångarna på en gång (regel 4) och båda grenarna blir
aktiva. GrafcetMaker varnar dig när den inte kan bevisa att alternativa övergångsvillkor är
uteslutande.

### Göra saker samtidigt: OCH-förgrening

När en övergång följs av flera steg aktiveras de alla tillsammans: **parallella grenar**, ritade
med en dubbel linje (**OCH-förgrening**, en _simultaneous sequence_ i SFC). Grenarna slutar också på
en dubbel linje (**OCH-sammanföring**): övergången nedanför den är möjliggjord först när det sista
steget i varje gren är aktivt, så den väntar tills alla grenar är klara. Det är så en grafcet
**synkroniserar** uppgifter.

<!-- figure: and | OCH-förgrening och OCH-sammanföring: borra och fixera samtidigt -->

### Återgångar, hopp, källor och sänkor

- En **återgång** går tillbaka till ett tidigare steg via en uppåtgående länk med en pil: det
  vanliga sättet att upprepa en cykel.
- Ett **hopp** (stegöverhopp) är en ELLER-förgrening där en av grenarna leder direkt till ett
  senare steg, till exempel för att hoppa över en valfri operation.
- En **källövergång** har inget steg ovanför sig. Den är alltid möjliggjord, så den passeras varje
  gång dess övergångsvillkor är sant; använd en flank som `↑a`.
- En **sänkövergång** har inget steg nedanför sig: när den passeras avaktiveras bara stegen ovanför
  den.

## Strukturera stora tillämpningar

Verkliga maskiner beskrivs med flera grafcetar som arbetar tillsammans.

- **Delgrafcetar** beskriver var och en en del av systemet, till exempel produktionscykeln,
  driftlägena och säkerheten. De körs samtidigt och ser varandras steg genom stegvariablerna `Xn`.
  Tillsammans bildar de den globala grafceten.
- Ett **makrosteg** står för en detaljerad sekvens som ritas på ett eget blad, dess **expansion**.
  Expansionen har ett ingångssteg **E** och ett utgångssteg **S**. När övergången ovanför
  makrosteget passeras aktiveras steg E; övergången nedanför makrosteget är möjliggjord när steg S
  är aktivt.
- Ett **omslutande steg** innehåller en eller flera hela grafcetar som bara lever medan steget är
  aktivt. När det aktiveras blir de omslutna stegen som är markerade med en asterisk aktiva; när det
  avaktiveras avaktiveras alla omslutna steg.
- En **tvångsstyrning**, ritad i en aktionsruta med dubbel ram, påtvingar en annan grafcet en
  situation: `G2{8}` tvingar bara steg 8 i G2 att vara aktivt, `G2{*}` fryser G2 i dess aktuella
  situation och `G2{}` avaktiverar alla dess steg. En tvångsstyrd grafcet kan inte utvecklas av sig
  själv. Tvångsstyrning är standardsättet att beskriva nödstopp och initiering.

<!-- figure: macro | Ett makrosteg: två vågräta linjer inne i kvadraten -->

## GRAFCET och SFC

Språket Sequential Function Chart (SFC) i IEC 61131-3 härleddes ur GRAFCET och ser nästan likadant
ut, men de två har inte samma syfte.

|            | GRAFCET (IEC 60848)                                                   | SFC (IEC 61131-3)                                            |
| ---------- | --------------------------------------------------------------------- | ------------------------------------------------------------ |
| Syfte      | Specifikation: det krävda beteendet, oberoende av tekniken            | Programspråk som exekveras av ett PLC-system                 |
| Utveckling | Alla passerbara övergångar på en gång, sedan sökning efter stabilitet | Oftast en utveckling per PLC-cykel, beroende på PLC-system   |
| Aktioner   | Kontinuerliga, villkorade, fördröjda, tidsbegränsade och lagrade      | Aktionskvalificerare N, S, R, P, P0, P1, L, D, SD, DS och SL |
| Hierarki   | Delgrafcetar, makrosteg, omslutande steg och tvångsstyrningar         | Genom programmets struktur                                   |

Ett vanligt arbetssätt är att först skriva och kontrollera grafceten och sedan implementera den i
SFC, ladder (kontaktschema) eller Structured Text. GrafcetMaker genererar Structured Text och
PLCopen TC6 XML från ett diagram som utgångspunkt för den implementeringen; granska alltid den
genererade koden före användning.

## Exempel

### Trafikljus med knapp för fotgängare

<!-- figure: example-trafficLight | Trafikljus: tidsfördröjningar och en lagrad begäran -->

Steg 0 ger fotgängarna grönt ljus i 10 s (`10s/X0`), sedan låter steg 1 bilarna köra. Bilarna har
grönt i 30 s, men ett tryck på fotgängarknappen förkortar det till 10 s: trycket minns av en lagrad
aktion vid händelsen `↑request` och glöms när steg 0 blir aktivt igen. Steg 2 visar gult i 3 s.
(Exemplets variabler har engelska namn.)

### Borrstation med detaljräknare

<!-- figure: example-drillingStation | Borrstation: en bearbetningscykel med underhåll var 100:e detalj -->

En bearbetningscykel: spänn fast detaljen, borra ned, dra tillbaka, lossa. Fastspänningen sätts och
återställs av lagrade aktioner, och steg 4 räknar detaljerna. Efter steg 4 leder en
ELLER-förgrening med uteslutande övergångsvillkor tillbaka till början, eller till underhåll var
100:e detalj.

Editorn har fler exempel: en tankfyllning med numeriska ingångar, ett parallellt transportband med
en säkerhetsgrafcet som tvångsstyr linjen, en tappningslinje (makrosteg, tre stationer parallellt,
kontroll och räknare) och driftlägen (ett omslutande steg, en paus som fryser cykeln, ett
nödstopp). Öppna dem från startskärmen i [GrafcetMaker](app:).

## Rita och simulera GRAFCET online

[GrafcetMaker](app:) är en kostnadsfri GRAFCET-editor med öppen källkod, gjord för
automationsingenjörer, lärare och studenter. Den körs helt i webbläsaren, fungerar offline och
kräver inget konto; dina diagram stannar på din dator.

- Rita steg, övergångar, aktioner och förgreningar med musen eller tangentbordet, och håll allt
  prydligt med automatisk layout.
- Skriv övergångsvillkor med automatisk komplettering och en variabeltabell, och få tydliga
  felmeddelanden med snabbkorrigeringar.
- Simulera enligt reglerna i IEC 60848: aktiva steg, tidsfördröjningar, flanker, instabila steg,
  tvångsstyrning och ett tidsdiagram över varje variabel.
- Strukturera projekt med delgrafcetar, makrosteg, omslutande steg och tvångsstyrningar.
- Exportera till PDF med namnruta, SVG och PNG, eller till Structured Text och PLCopen TC6 XML, och
  dela ett helt projekt som en länk.

[Öppna den kostnadsfria GRAFCET-editorn](app:)

## Vanliga frågor

### Vad används GRAFCET till?

Till att specificera beteendet hos automatiserade system med sekvenser: maskiner, monteringslinjer,
förpackning, satsprocesser, hissar, trafikljus. Diagrammet är den gemensamma referensen för dem som
konstruerar maskinen, programmerar PLC-systemet och testar det.

### Är GRAFCET samma sak som SFC?

Nej. SFC (IEC 61131-3) härleddes ur GRAFCET och använder samma symboler, men GRAFCET är ett
specifikationsspråk med exakta utvecklingsregler, och SFC är ett programspråk för PLC-system vars
exekvering beror på styrsystemet. Se [GRAFCET och SFC](#grafcet-och-sfc).

### Vad är skillnaden mellan ett steg och en övergång?

Ett steg är en situation som varar (systemet fyller tanken); en övergång är ögonblicket då systemet
går från en situation till nästa, när dess övergångsvillkor blir sant (tanken är full).

### Vad betyder X1?

`X1` är stegvariabeln för steg 1: den är sann medan steg 1 är aktivt. Den används i
övergångsvillkor, i villkor för aktioner och i andra grafcetar, till exempel `5s/X1` eller
`X1 * /X5`.

### Vad är ett instabilt steg?

Ett steg som aktiveras och avaktiveras igen inom en och samma sökning efter stabilitet, eftersom
övergångsvillkoret under det redan var sant. Dess kontinuerliga aktioner utförs inte; dess lagrade
aktioner utförs.

### Hur gör jag om en GRAFCET till ett PLC-program?

Varje steg blir en minnesbit, varje övergång ett villkor som sätter stegen nedanför och återställer
stegen ovanför, och utgångarna skrivs utifrån stegbitarna. Du kan göra det för hand i ladder eller
Structured Text, använda SFC-språket i ditt PLC-system, eller låta GrafcetMaker generera Structured
Text eller PLCopen XML som utgångspunkt.

### Finns det kostnadsfri programvara för GRAFCET?

Ja: [GrafcetMaker](app:) är kostnadsfri och har öppen källkod (MIT-licens). Den körs i alla
moderna webbläsare på Windows, macOS, Linux, surfplattor och mobiler, och företag kan driva den i
sitt eget nätverk.
