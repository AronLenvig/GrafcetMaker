# Fejlfinding

GrafcetMaker kontrollerer dit projekt, mens du arbejder. Tællerne øverst til højre viser antallet af
**fejl** (rød) og **advarsler** (orange); klik på dem for at åbne listen **Problemer**. Klik på et
problem for at springe til elementet, og brug dets rettelsesknap, når der er en. Elementer med et
problem har også et mærkat på diagrammet: hold markøren over det for at se detaljerne.

## Fejl {#errors}

**Grafcet G1 har intet initialtrin.** Intet kan nogensinde blive aktivt. Vælg det første trin, og
brug rettelsen **Gør trin … til initialtrin**, eller sæt dets Type til _Initialtrin_.

**Flere trin har samme nummer.** Numrene skal være entydige i en grafcet, ellers ville `Xn` være
tvetydig. Brug **Omnummerer trin**, eller skift et nummer med <kbd>F2</kbd>.

**Tom transitionsbetingelse.** Hver transition skal have en betingelse. Brug `1` for en transition,
der altid er sand (rettelsen gør det for dig).

**Ukendt variabel.** Navnet er ikke erklæret (en fil, der er skrevet andetsteds, eller en slettet
variabel). Navne, du skriver i en transitionsbetingelse eller en aktion, oprettes for dig; for de
andre kan du bruge rettelsen til at oprette variablen, eller vælge det foreslåede navn, hvis det er
en tastefejl.

**Problemer i udtryk** (uventet tegn, manglende parentes…). Problemboksen under feltet markerer
positionen og giver et tip. Et hyppigt problem: `/` betyder IKKE foran en betingelse, så skriv
`a * /b` for »a og ikke b«. Se [Skriv transitionsbetingelser](expressions.md).

**En aktion tildeler en indgang en værdi.** Indgange kommer fra processen og kan ikke skrives.
Skift variablens retning, eller brug en anden variabel.

**Tvangsstyringen peger på en grafcet eller et trin, der ikke findes.** Kontroller grafcetnavnet og
trinnumrene i tvangsstyringen.

**Tvangsstyringerne danner en cyklus.** En grafcet kan ikke tvangsstyre en grafcet, der
tvangsstyrer den selv, hverken direkte eller via andre. Fjern en af tvangsstyringerne, eller lad en
tredje grafcet tvangsstyre dem begge.

**Makrotrin og omsluttende trin danner en cyklus.** En grafcet kan ikke indeholde sig selv: et
makrotrin eller omsluttende trin fører, direkte eller via andre, tilbage til sin egen grafcet.
Sæt trinnets Type til _Trin_ og tilbage for at få en ny undergrafcet.

**Makrotrin … har ingen ekspansionsgrafcet** (eller **Det omsluttende trin … har ingen omsluttet
grafcet**). Dets undergrafcet er blevet slettet. Sæt trinnets Type til _Trin_ og tilbage til
_Makrotrin_ (eller _Omsluttende trin_) for at få en ny, eller behold det som et normalt trin.

**Grafcet … bruges af flere trin.** Hvert makrotrin og hvert omsluttende trin skal have sin egen
undergrafcet. Sæt et af trinnene til _Trin_ og tilbage igen: så får det sin egen undergrafcet.

## Advarsler {#warnings}

**Trin … kan aldrig blive aktivt.** Ingen vej fører til det fra et initialtrin. Forbind det, eller
slet det.

**Trin … har ingen udgående transition.** Når det først er aktivt, forbliver det aktivt for altid.
Som regel mangler der en tilbageføring (<kbd>L</kbd>).

**De alternative grene udelukker ikke hinanden.** Begge transitionsbetingelser kan være sande
samtidig, og så aktiveres begge grene. Gør dem gensidigt udelukkende, f.eks. `a` og `/a * b`, eller
brug rettelsen **Giv … forrang**.

**Mulig endeløs ustabil udvikling.** En løkke af transitioner kan være sande alle på én gang, så
grafcetten aldrig falder til ro. Tilføj en betingelse, ofte en flanke (`↑start`), der ikke kan
forblive sand.

**Udgang sat af kontinuerlige aktioner i trin, der kan være aktive samtidig.** To parallelle grene
styrer den samme udgang. Styr den fra ét sted, eller brug lagrede aktioner.

**En aktion uden trin er lagret ved deaktivering.** Uden trin er aktionen altid aktiv og deaktiveres
aldrig, så den udføres aldrig. Knyt den til et trin, eller skift dens type.

**Udgang sat af en aktion uden trin og af en anden aktion.** Udgangen er sand, når blot én af dem
er. Sørg for, at det er det, du ønsker.

**Lagret ved hændelse, men ingen hændelse.** Indtast hændelsen (f.eks. `↑b`) i panelet Egenskaber.

**Betinget aktion uden betingelse.** Den virker som en kontinuerlig aktion, indtil du indtaster dens
betingelse i panelet Egenskaber.

**Lagrede aktioner på et makrotrin ignoreres.** Et makrotrin er aktivt via sin ekspansion: læg de
lagrede aktioner på et trin i ekspansionen.

**Tvangsstyret til den tomme situation, som aldrig ophæves.** En tvangsstyring som `G2{}`
deaktiverer alle trin i G2, og intet aktiverer dem igen. Brug `G2{INIT}` for at genstarte G2 i dens
initialsituation.

**Ekspansionen (eller den omsluttede grafcet) … bruges ikke.** Intet makrotrin eller omsluttende
trin peger på den. Slet dens fane, hvis du ikke længere har brug for den.

**Ekspansionen skal have præcis ét indgangstrin og ét udgangstrin.** I en ekspansion af et
makrotrin har indgangstrinnet ingen transition over sig og udgangstrinnet ingen under sig.

## Information {#information}

**Variablen … bruges ikke.** Den er erklæret, men intet udtryk bruger den. Slet den med rettelsen,
eller behold den til senere.

## Andre spørgsmål {#other-questions}

**Simuleringen stoppede med en ustabil løkke.** Se advarslen ovenfor: simulatoren stopper efter
1000 iterationer uden stabilitet, på det viste tidspunkt.

**Min timer kører ikke.** Timere tæller kun, mens uret går: tryk på <kbd>F5</kbd> for at køre, eller
på <kbd>F10</kbd> for at springe til næste timer.

**En transition skifter igen og igen.** Hvis dens transitionsbetingelse forbliver sand, kører
grafcetten rundt så hurtigt, den kan. Brug en flanke `↑a` for at reagere én gang pr. tryk.

**Jeg har mistet mit arbejde.** Se under **Filer › Lokal historik**: øjebliksbilleder gemmes i
browseren. Efter en genindlæsning eller et nedbrud genåbner GrafcetMaker automatisk dit seneste
projekt, inklusive ikke-gemte ændringer.

**Filen kan ikke åbnes.** GrafcetMaker åbner sine egne `.grafcet.json`-filer og grafcet.io-filer
(`.grafcetio`); meddelelsen fortæller, hvorfor en fil blev afvist. En fil, der er gemt af en nyere
version af GrafcetMaker, kræver den nyere version.
