# Felsökning

GrafcetMaker kontrollerar ditt projekt medan du arbetar. Räknarna uppe till höger visar antalet
**fel** (rött) och **varningar** (orange); klicka på dem för att öppna listan **Problem**. Klicka på
ett problem för att hoppa till elementet, och använd dess åtgärdsknapp när det finns en. Element med
ett problem har också en etikett i diagrammet: håll pekaren över den för att se detaljerna.

## Fel {#errors}

**Grafcet G1 har inget initialsteg.** Inget kan någonsin bli aktivt. Markera det första steget och
tryck på åtgärden **Gör steg … till initialsteg**, eller ställ in dess Typ till _Initialsteg_.

**Flera steg har samma nummer.** Numren måste vara unika i en grafcet, annars skulle `Xn` vara
tvetydigt. Använd **Numrera om steg** eller ändra ett nummer med <kbd>F2</kbd>.

**Tomt övergångsvillkor.** Varje övergång behöver ett villkor. Använd `1` för en övergång som alltid
är sann (åtgärden gör det åt dig).

**Okänd variabel.** Namnet är inte deklarerat (en fil som skrivits någon annanstans, eller en
variabel som tagits bort). Namn som du skriver i ett övergångsvillkor eller en aktion skapas åt dig;
för de andra använder du åtgärden för att skapa variabeln, eller väljer det föreslagna namnet om det
är ett stavfel.

**Problem i uttryck** (oväntat tecken, saknad parentes…). Problemrutan under fältet markerar
positionen och ger ett tips. Ett vanligt fall: `/` betyder ICKE före ett villkor, så skriv `a * /b`
för ”a och inte b”. Se [Skriva övergångsvillkor](expressions.md).

**En aktion tilldelar en ingång.** Ingångar kommer från processen och kan inte skrivas. Ändra
variabelns riktning eller använd en annan variabel.

**Tvångsstyrningen pekar på en grafcet eller ett steg som saknas.** Kontrollera grafcetens namn och
stegnumren i tvångsstyrningen.

**Tvångsstyrningarna bildar en cykel.** En grafcet kan inte tvångsstyra en grafcet som tvångsstyr
den, direkt eller via andra. Ta bort en av tvångsstyrningarna, eller låt en tredje grafcet
tvångsstyra båda.

**Makrosteg och omslutande steg bildar en cykel.** En grafcet kan inte innehålla sig själv: ett
makrosteg eller omslutande steg leder, direkt eller via andra, tillbaka till sin egen grafcet.
Ställ in stegets Typ till _Steg_ och sedan tillbaka för att få en egen undergrafcet.

**Makrosteg … har ingen expansionsgrafcet** (eller **Omslutande steg … har ingen omsluten
grafcet**). Dess undergrafcet har tagits bort. Ställ in stegets Typ till _Steg_ och sedan tillbaka
till _Makrosteg_ (eller _Omslutande steg_) för att få en ny, eller behåll det som ett vanligt steg.

**Grafcet … används av flera steg.** Varje makrosteg och omslutande steg behöver en egen
undergrafcet. Ställ in ett av stegen till _Steg_ och sedan tillbaka: då får det en egen
undergrafcet.

## Varningar {#warnings}

**Steg … kan aldrig bli aktivt.** Ingen väg leder dit från ett initialsteg. Länka det, eller ta bort
det.

**Steg … har ingen utgående övergång.** När det väl är aktivt förblir det aktivt för alltid.
Oftast saknas en återgång (<kbd>L</kbd>).

**De alternativa grenarna är inte ömsesidigt uteslutande.** Båda övergångsvillkoren kan vara sanna
samtidigt, vilket skulle aktivera båda grenarna. Gör dem uteslutande, t.ex. `a` och `/a * b`, eller
använd åtgärden **Ge företräde åt …**.

**Möjlig oändlig transient utveckling.** En slinga av övergångar kan alla vara sanna samtidigt, så
att grafceten aldrig stabiliseras. Lägg till ett villkor, ofta en flank (`↑start`), som inte kan
förbli sant.

**Utgången sätts av kontinuerliga aktioner i steg som kan vara aktiva samtidigt.** Två parallella
grenar styr samma utgång. Styr den från ett ställe, eller använd lagrade aktioner.

**En aktion utan steg är lagrad vid avaktivering.** Utan steg är aktionen alltid aktiv och
avaktiveras aldrig, så den utförs aldrig. Fäst den vid ett steg, eller ändra dess typ.

**Utgången sätts av en aktion utan steg och av en annan aktion.** Utgången är sann så snart någon av
dem är det. Kontrollera att det är vad du vill.

**Lagrad vid händelse men ingen händelse.** Ange händelsen (t.ex. `↑b`) i panelen Egenskaper.

**Villkorad aktion utan villkor.** Den fungerar som en kontinuerlig aktion tills du anger dess
villkor i panelen Egenskaper.

**Lagrade aktioner i ett makrosteg ignoreras.** Ett makrosteg är aktivt genom sin expansion: lägg
de lagrade aktionerna i ett steg i expansionen.

**Tvångsstyrd till den tomma situationen, som aldrig upphävs.** En tvångsstyrning som `G2{}`
avaktiverar alla steg i G2, och inget aktiverar dem igen. Använd `G2{INIT}` för att starta om G2 i
dess initialsituation.

**Expansionen (eller den omslutna grafceten) … används inte.** Inget makrosteg eller omslutande steg
pekar på den. Ta bort dess flik om du inte längre behöver den.

**Expansionen behöver exakt ett ingångssteg och ett utgångssteg.** I en makrostegsexpansion har
ingångssteget ingen övergång ovanför sig och utgångssteget ingen nedanför sig.

## Information {#information}

**Variabeln … används inte.** Den är deklarerad men inget uttryck använder den. Ta bort den med
åtgärden, eller behåll den till senare.

## Andra frågor {#other-questions}

**Simuleringen stoppades med en transient slinga.** Se varningen ovan: simulatorn stoppar efter
1000 iterationer utan stabilitet, vid den tid som visas.

**Min tidsfördröjning går inte.** Tidsfördröjningar löper bara medan klockan går: tryck på
<kbd>F5</kbd> för att köra, eller på <kbd>F10</kbd> för att hoppa till nästa tidsfördröjning.

**En övergång passeras om och om igen.** Om dess övergångsvillkor förblir sant går grafceten runt
så fort den kan. Använd en flank `↑a` för att reagera en gång per tryck.

**Jag har förlorat mitt arbete.** Titta under **Arkiv › Lokal historik**: ögonblicksbilder sparas i
webbläsaren. Efter en omladdning eller en krasch öppnar GrafcetMaker ditt senaste projekt
automatiskt igen, osparade ändringar inräknade.

**Filen öppnas inte.** GrafcetMaker öppnar sina egna `.grafcet.json`-filer och filer från
grafcet.io (`.grafcetio`); meddelandet anger varför en fil avvisades. En fil som har sparats av en
nyare version av GrafcetMaker kräver den nyare versionen.
