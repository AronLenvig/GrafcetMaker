# Hvad er GRAFCET? En komplet guide til IEC 60848

**GRAFCET** er et grafisk sprog, der beskriver, hvordan et sekventielt styresystem opfører sig: en
maskine, en produktionslinje, et trafiklys. Et GRAFCET-diagram er en række **trin** (det, systemet
gør) forbundet af **transitioner** (betingelserne for at gå videre). Sproget er standardiseret
internationalt som **IEC 60848** (i Danmark DS/EN 60848) og er ophavet til PLC'ernes sprog
Sequential Function Chart (SFC).

Denne guide forklarer alle standardens elementer og regler med diagrammer og eksempler. Alle
diagrammerne er tegnet med [GrafcetMaker](app:), en gratis GRAFCET-editor og -simulator, der kører i
din browser: åbn eksemplerne, og se dem udvikle sig trin for trin.

## Hvad GRAFCET står for

GRAFCET står for _GRAphe Fonctionnel de Commande Étape-Transition_, fransk for »funktionelt
styringsdiagram med trin og transitioner«. Det blev foreslået i 1977 af en arbejdsgruppe under
AFCET, den franske forening for kybernetik, sammen med ADEPA, det franske agentur for udvikling af
automatiseret produktion. Det udsprang af Petri-net og blev udformet som en klar,
teknologiuafhængig måde at skrive ned, hvad et styresystem skal gøre, før nogen skriver en linje
PLC-kode.

- **1982**: fransk standard NF C03-190.
- **1988**: international standard IEC 848, _Preparation of function charts for control systems_.
- **2002**: IEC 60848 udgave 2, _GRAFCET specification language for sequential function charts_.
- **2013**: IEC 60848 udgave 3, den gældende, også udgivet i Europa som EN 60848 (DS/EN 60848 i
  Danmark).

GRAFCET undervises på tekniske skoler, erhvervsuddannelser og ingeniøruddannelser, især i fransk-,
tysk-, spansk- og portugisisktalende lande. Efter konvention er _GRAFCET_ sproget og en _grafcet_
ét diagram skrevet i det.

## Elementerne i en grafcet

<!-- figure: anatomy | Elementerne i en grafcet -->

- Et **trin** er en firkant med et nummer. Det står for en stabil situation i systemet: _venter_,
  _fylder_, _borer_. På ethvert tidspunkt er hvert trin enten **aktivt** eller **inaktivt**, og
  mængden af aktive trin er grafcettens **situation**. Trinvariablen `X1` er sand, mens trin 1 er
  aktivt.
- Et **initialtrin**, tegnet som en dobbelt firkant, er aktivt, når systemet starter. Hver grafcet
  skal have mindst ét.
- En **transition** er en kort vandret streg på tværs af en forbindelse. Den sidder altid mellem
  trin: to trin forbindes aldrig direkte, og det gør to transitioner heller ikke.
- **Transitionsbetingelsen** er den betingelse, der står ved siden af en transition, for eksempel
  `start` eller `pressure > 6`. Transitionsbetingelsen `1` er altid sand.
- **Orienterede forbindelser** forbinder trin og transitioner. De læses oppefra og ned; en
  forbindelse, der går opad, har en pil.
- **Aktioner** er rektangler til højre for et trin: det, systemet gør, mens trinnet er aktivt, for
  eksempel _kør motoren_.

## De fem udviklingsregler

IEC 60848 definerer præcist, hvordan en grafcet udvikler sig, med fem regler.

1. **Initialsituation**: ved start er initialtrinnene aktive, og alle de andre er inaktive.
2. **Skift af en transition**: en transition er **frigivet**, når alle trinnene lige over den er
   aktive. Den **skifter** (passeres), når den er frigivet, og dens transitionsbetingelse er sand.
3. **Udvikling af de aktive trin**: når en transition skifter, aktiveres alle trinnene lige under
   den, og alle trinnene lige over den deaktiveres.
4. **Samtidigt skift**: alle de transitioner, der kan skifte i samme øjeblik, skifter samtidig.
5. **Samtidig aktivering og deaktivering**: et trin, der aktiveres og deaktiveres i samme øjeblik,
   forbliver aktivt.

Når en indgang ændres, anvendes reglerne igen og igen, med de samme indgange, indtil ingen
transition længere kan skifte. Det er **søgningen efter stabilitet**. Et trin, der aktiveres og
forlades igen under denne søgning, er et **ustabilt trin** (eller transient trin): dets
kontinuerlige aktioner udføres aldrig, men det gør dets lagrede aktioner. Hvis for eksempel
transitionsbetingelserne under trin 1 og 2 begge allerede er sande, når trin 1 bliver aktivt, går
grafcetten direkte gennem trin 2 til trin 3, og udgangene i trin 2 tændes aldrig.

## Transitionsbetingelser: betingelser, flanker og timere

En transitionsbetingelse er et logisk udtryk af indgange, interne variabler, trinvariabler og tid.
Lærebogsnotationen og den måde, du skriver den på i GrafcetMaker:

| Notation            | Betydning                                                               | Skrives i GrafcetMaker |
| ------------------- | ----------------------------------------------------------------------- | ---------------------- |
| a · b               | a OG b                                                                  | `a * b`                |
| a + b               | a ELLER b                                                               | `a + b`                |
| a med en streg over | IKKE a                                                                  | `/a`                   |
| ↑a                  | stigende flanke: sand i det øjeblik, a bliver sand                      | `↑a` eller `RE a`      |
| ↓a                  | faldende flanke: sand i det øjeblik, a bliver falsk                     | `↓a` eller `FE a`      |
| X3                  | trin 3 er aktivt                                                        | `X3`                   |
| 5 s/X2              | sand 5 s efter, at trin 2 blev aktivt                                   | `5s/X2`                |
| t1/a/t2             | sand t1 efter, at a bliver sand, falsk igen t2 efter, at a bliver falsk | `2s/a/1s`              |
| [level > 80]        | sammenligning af en numerisk værdi                                      | `level > 80`           |
| = 1                 | altid sand                                                              | `1`                    |

<!-- figure: timer | En timer som transitionsbetingelse: varmen er tændt i 5 sekunder -->

Flanker har betydning, når et signal forbliver sandt: med `↑start` starter cyklussen én gang pr.
tryk på knappen og ikke igen, så længe knappen holdes nede. Editorens fulde syntaks er beskrevet i
[Skriv transitionsbetingelser](app:#help/expressions).

## Aktioner

<!-- figure: actions | Kontinuerlige, betingede og lagrede aktioner på trin 4 -->

- En **kontinuerlig aktion** er sand, så længe dens trin er aktivt: _Lampe_ lyser, mens trin 4 er
  aktivt.
- En **betinget aktion** er en kontinuerlig aktion med en **tildelingsbetingelse** skrevet over sin
  boks: _Horn_ lyder kun, mens trin 4 er aktivt, **og** `alarm` er sand.
- **Forsinkede** og **tidsbegrænsede** aktioner er betingede aktioner, hvis betingelse bruger en
  timer: med `3s/X4` tændes udgangen 3 s efter, at trin 4 blev aktivt; med `/(3s/X4)` er den kun
  tændt i de første 3 s.
- En **lagret aktion** tildeler en værdi én gang, og værdien bevares, indtil en anden aktion ændrer
  den. Den udføres, når trinnet **aktiveres** (pil, der peger opad), når det **deaktiveres** (pil,
  der peger nedad), eller **ved en hændelse**, mens trinnet er aktivt (et flag med hændelsen, her
  `↑reset`). Tællere som `C := C + 1` er typiske lagrede aktioner.

En udgang, der styres af kontinuerlige aktioner, følger automatisk trinnene. En udgang, der sættes
af en lagret aktion, forbliver sat, indtil en anden lagret aktion nulstiller den, så planlæg, hvor
det sker.

## Sekvenser, alternativer og parallelle grene

### Vælg mellem veje: ELLER-forgrening

Når et trin efterfølges af flere transitioner, tager grafcetten den vej, hvis transitionsbetingelse
er sand: en **alternativ forgrening**, tegnet med en enkelt vandret linje (**ELLER-forgrening**,
kaldet _selection of sequence_, sekvensvalg, i SFC). Vejene samles igen på en enkelt linje
(**ELLER-sammenføring**).

<!-- figure: or | ELLER-forgrening og -sammenføring: den ene eller den anden gren -->

Gør transitionsbetingelserne **gensidigt udelukkende**, så de aldrig kan være sande samtidig, som `a`
og `/a * b` her. Ellers skifter begge transitioner på én gang (regel 4), og begge grene bliver
aktive. GrafcetMaker advarer dig, når den ikke kan bevise, at alternative transitionsbetingelser
udelukker hinanden.

### Gør flere ting på samme tid: OG-forgrening

Når en transition efterfølges af flere trin, aktiveres de alle sammen: **parallelle grene**, tegnet
med en dobbeltlinje (**OG-forgrening**, en _simultaneous sequence_, samtidig sekvens, i SFC).
Grenene slutter også på en dobbeltlinje (**OG-sammenføring**): transitionen under den er kun
frigivet, når det sidste trin i hver gren er aktivt, så den venter på, at alle grene bliver
færdige. Sådan **synkroniserer** en grafcet opgaver.

<!-- figure: and | OG-forgrening og -sammenføring: boring og fastspænding på samme tid -->

### Tilbageføringer, spring, kilder og dræn

- En **tilbageføring** går tilbage til et tidligere trin via en opadgående forbindelse med en pil:
  den almindelige måde at gentage en cyklus på.
- Et **spring** (overspringning af trin) er en ELLER-forgrening, hvis ene gren fører direkte til et
  senere trin, for eksempel for at springe en valgfri operation over.
- En **kildetransition** har intet trin over sig. Den er altid frigivet, så den skifter, hver gang
  dens transitionsbetingelse er sand; brug en flanke som `↑a`.
- En **dræntransition** har intet trin under sig: når den skifter, deaktiveres kun trinnene over
  den.

## Strukturering af store applikationer

Virkelige maskiner beskrives med flere grafcets, der arbejder sammen.

- **Delgrafcets** beskriver hver en del af systemet, for eksempel produktionscyklussen,
  driftsformerne og sikkerheden. De kører samtidig og ser hinandens trin via trinvariablerne `Xn`.
  Tilsammen udgør de den globale grafcet.
- Et **makrotrin** står for en detaljeret sekvens, der tegnes på sit eget ark, dets **ekspansion**.
  Ekspansionen har ét indgangstrin **E** og ét udgangstrin **S**. Når transitionen over makrotrinnet
  skifter, aktiveres trin E; transitionen under makrotrinnet er frigivet, når trin S er aktivt.
- Et **omsluttende trin** indeholder en eller flere hele grafcets, der kun lever, mens det er
  aktivt. Når det aktiveres, bliver de omsluttede trin, der er markeret med en stjerne, aktive; når
  det deaktiveres, deaktiveres alle omsluttede trin.
- En **tvangsstyring**, tegnet i en aktionsboks med dobbelt ramme, påtvinger en anden grafcet en
  situation: `G2{8}` tvinger kun trin 8 i G2 til at være aktivt, `G2{*}` fastfryser G2 i dens
  aktuelle situation, og `G2{}` deaktiverer alle dens trin. En tvangsstyret grafcet kan ikke udvikle
  sig af sig selv. Tvangsstyring er standardmåden at beskrive nødstop og initialisering på.

<!-- figure: macro | Et makrotrin: to vandrette linjer inde i firkanten -->

## GRAFCET og SFC

Sproget Sequential Function Chart (SFC) i IEC 61131-3 er afledt af GRAFCET og ser næsten ens ud,
men de to har ikke samme formål.

|           | GRAFCET (IEC 60848)                                                           | SFC (IEC 61131-3)                                              |
| --------- | ----------------------------------------------------------------------------- | -------------------------------------------------------------- |
| Formål    | Specifikation: den krævede opførsel, uafhængigt af teknologien                | Programmeringssprog, som en PLC udfører                        |
| Udvikling | Alle transitioner, der kan skifte, på én gang, og så søgning efter stabilitet | Som regel én udvikling pr. PLC-cyklus, afhængigt af PLC'en     |
| Aktioner  | Kontinuerlige, betingede, forsinkede, tidsbegrænsede og lagrede aktioner      | Aktionskvalifikatorerne N, S, R, P, P0, P1, L, D, SD, DS og SL |
| Hierarki  | Delgrafcets, makrotrin, omsluttende trin og tvangsstyringer                   | Via programmets struktur                                       |

En almindelig arbejdsgang er først at skrive og kontrollere grafcetten og derefter implementere den
i SFC, ladder eller Structured Text. GrafcetMaker genererer Structured Text og PLCopen TC6 XML ud fra
et diagram som udgangspunkt for den implementering; gennemgå altid den genererede kode før brug.

## Eksempler

### Trafiklys med fodgængerknap

<!-- figure: example-trafficLight | Trafiklys: timere og en lagret anmodning -->

Trin 0 giver fodgængerne grønt lys i 10 s (`10s/X0`), og derefter lader trin 1 bilerne køre.
Bilerne har grønt i 30 s, men et tryk på fodgængerknappen afkorter det til 10 s: trykket huskes af
en lagret aktion ved hændelsen `↑request` og glemmes, når trin 0 bliver aktivt igen. Trin 2 viser
gult i 3 s.

### Borestation med emnetæller

<!-- figure: example-drillingStation | Borestation: en bearbejdningscyklus med vedligeholdelse for hver 100 emner -->

En bearbejdningscyklus: spænd emnet fast, bor ned, kør tilbage, løsn emnet. Fastspændingen sættes
og nulstilles af lagrede aktioner, og trin 4 tæller emnerne. Efter trin 4 fører en ELLER-forgrening
med gensidigt udelukkende transitionsbetingelser tilbage til starten eller, for hver 100 emner, til
vedligeholdelse.

Editoren har flere eksempler: en tankpåfyldning med numeriske indgange, et parallelt transportbånd
med en sikkerhedsgrafcet, der tvangsstyrer linjen, en aftapningslinje (makrotrin, tre stationer
parallelt, inspektion og tællere) og driftsformer (et omsluttende trin, en pause, der fastfryser
cyklussen, et nødstop). Åbn dem fra startskærmen i [GrafcetMaker](app:).

## Tegn og simuler GRAFCET online

[GrafcetMaker](app:) er en gratis GRAFCET-editor med åben kildekode, lavet til automatikingeniører,
undervisere og studerende. Den kører helt i din browser, virker offline og kræver ingen konto; dine
diagrammer bliver på din computer.

- Tegn trin, transitioner, aktioner og grene med musen eller tastaturet, og hold alt ryddeligt med
  automatisk layout.
- Skriv transitionsbetingelser med autofuldførelse og en variabeltabel, og få klare fejlmeddelelser
  med hurtige rettelser.
- Simuler med reglerne i IEC 60848: aktive trin, timere, flanker, ustabile trin, tvangsstyring og et
  tidsdiagram over alle variabler.
- Strukturer projekter med delgrafcets, makrotrin, omsluttende trin og tvangsstyringer.
- Eksporter til PDF med titelfelt, SVG og PNG, eller til Structured Text og PLCopen TC6 XML, og del
  et helt projekt som et link.

[Åbn den gratis GRAFCET-editor](app:)

## Ofte stillede spørgsmål

### Hvad bruges GRAFCET til?

Til at specificere opførslen af automatiserede systemer med sekvenser: maskiner, samlelinjer,
pakkemaskiner, batchprocesser, elevatorer, trafiklys. Diagrammet er den fælles reference for dem,
der konstruerer maskinen, programmerer PLC'en og tester den.

### Er GRAFCET det samme som SFC?

Nej. SFC (IEC 61131-3) er afledt af GRAFCET og bruger de samme symboler, men GRAFCET er et
specifikationssprog med præcise udviklingsregler, og SFC er et programmeringssprog til PLC'er, hvis
afvikling afhænger af styringen. Se [GRAFCET og SFC](#grafcet-og-sfc).

### Hvad er forskellen på et trin og en transition?

Et trin er en situation, der varer (systemet fylder tanken); en transition er det øjeblik, hvor
systemet går fra én situation til den næste, når dens transitionsbetingelse bliver sand (tanken er
fuld).

### Hvad betyder X1?

`X1` er trinvariablen for trin 1: den er sand, mens trin 1 er aktivt. Den bruges i
transitionsbetingelser, i betingelser for aktioner og i andre grafcets, for eksempel `5s/X1` eller
`X1 * /X5`.

### Hvad er et ustabilt trin?

Et trin, der aktiveres og deaktiveres igen inden for én og samme søgning efter stabilitet, fordi
transitionsbetingelsen under det allerede var sand. Dets kontinuerlige aktioner udføres ikke; det
gør dets lagrede aktioner.

### Hvordan bliver en GRAFCET til et PLC-program?

Hvert trin bliver en hukommelsesbit, hver transition en betingelse, der sætter trinnene under den og
nulstiller trinnene over den, og udgangene skrives ud fra trinbittene. Du kan gøre det i hånden i
ladder eller Structured Text, bruge din PLC's SFC-sprog eller lade GrafcetMaker generere Structured
Text eller PLCopen XML som udgangspunkt.

### Findes der gratis GRAFCET-software?

Ja: [GrafcetMaker](app:) er gratis og open source (MIT-licens). Den kører i enhver moderne browser
på Windows, macOS, Linux, tablets og telefoner, og virksomheder kan hoste den på deres eget netværk.
