# Aktioner

Aktioner är rektanglarna till höger om ett steg. De anger vad systemet gör medan, eller när, steget
är aktivt. Markera ett steg och tryck på <kbd>A</kbd> för att lägga till en; tryck på <kbd>A</kbd>
igen på en aktion för att lägga till nästa. Välj dess **typ** med bildknapparna i panelen
**Egenskaper**: var och en visar hur diagrammet ritar den typen.

## Kontinuerliga aktioner {#continuous-actions}

Den vanligaste typen. Texten är namnet på en utgång (eller en intern variabel), t.ex. `Pump`.
Utgången är sann **medan** steget är aktivt, och falsk så snart inget aktivt steg styr den.

Välj typen **Villkorad** för att lägga till ett villkor (ett _tilldelningsvillkor_): dess fält visas
under typknapparna, och utgången är sann medan steget är aktivt **och** villkoret är sant. Villkoret
ritas på en kort linje ovanför rutan.

<!-- figure: continuous | Lampan lyser medan steg 4 är aktivt; signalhornet bara när även alarm är sant -->

Tidsfördröjningar i villkoret ger de fördröjda och tidsbegränsade aktionerna från andra notationer:

- `5s/X4` – fördröjd: utgången slås på 5 s efter att steg 4 blev aktivt.
- `/(5s/X4)` – tidsbegränsad: på bara under de första 5 s av steg 4.

> **Obs!** Steg som passeras under en transient utveckling (se
> [Grunderna i GRAFCET](grafcet-basics.md)) utför inte sina kontinuerliga aktioner.

## Lagrade aktioner {#stored-actions}

En lagrad aktion ändrar ett värde **en gång**, och värdet finns kvar tills en annan aktion ändrar
det. Dess text är en tilldelning: `C := C + 1`, `Motor := 0`, `Speed := 2.5`. För att sätta en
BOOL-variabel till TRUE räcker namnet: `Motor` betyder `Motor := 1`.

- **Vid aktivering** – utförs när steget blir aktivt. Ritas med en pil **↑ ovanför** rutan.
- **Vid avaktivering** – utförs när steget blir inaktivt. Ritas med en pil **↓ under** rutan.
- **Vid händelse** – utförs varje gång **händelsen** inträffar medan steget är aktivt, t.ex.
  `↑reset`. Ritas med en **flagga** uppe till höger, bredvid händelsen. Ange händelsen i panelen
  Egenskaper; en aktion vid händelse utan händelse utförs aldrig och rapporteras som ett problem.

<!-- figure: stored | Lagrad vid aktivering (↑), vid avaktivering (↓) och vid händelse (flagga) -->

Aktioner vid aktivering och avaktivering kan också ha ett villkor: de utförs bara om det är sant i
det ögonblicket.

Lagrade aktioner utförs även av steg som bara passeras under en transient utveckling. Använd dem för
att räkna, för att hålla kvar ett värde (`Motor := 1` i ett steg, `Motor := 0` i ett annat) eller
för att komma ihåg att något har hänt.

## Tvångsstyrningar {#forcing-orders}

En tvångsstyrning påtvingar en annan delgrafcet en situation medan dess steg är aktivt: `G2{8}`
aktiverar bara steg 8 i grafcet G2, `G2{*}` fryser G2 i dess aktuella situation, `G2{}` avaktiverar
alla dess steg och `G2{INIT}` återför den till dess initialsituation. Den ritas med en dubbel ram.
Se [Makrosteg, omslutande steg och tvångsstyrning](hierarchy.md).

## Aktioner utan steg {#actions-without-a-step}

En aktion behöver inte höra till ett steg. Tryck på <kbd>A</kbd> när inget är markerat (eller välj
verktyget **Aktion**) och klicka på tom rityta: aktionen ritas för sig själv, utan länk, och den är
**alltid aktiv**.

- En kontinuerlig aktion utan steg sätter sin utgång när dess **tilldelningsvillkor** är sant,
  oavsett stegen: `Lamp` med villkoret `a * b` är logiken `Lamp = a · b`. Utan villkor är utgången
  alltid sann.
- En lagrad aktion vid händelse utförs varje gång händelsen inträffar, t.ex. räknar `C := C + 1`
  vid `↑pulse` pulser. Vid aktivering utförs den en gång när simuleringen startar. Vid avaktivering
  utförs den aldrig, eftersom aktionen aldrig avaktiveras.

Dra en aktion för att flytta den: till ett steg för att fästa den där (steget lyser upp och en
markering visar dess plats bland stegets aktioner), eller till tom rityta för att lämna den utan
steg.

## Flera aktioner {#several-actions}

Ett steg kan ha hur många aktioner som helst; de ritas sida vid sida. Dra en längs raden för att
ändra ordningen, eller använd **Flytta aktionen åt vänster / höger** i panelen Egenskaper, där ett
markerat steg listar sina aktioner som kompakta rader (klicka på en för att fälla ut den). Ta bort
en aktion med <kbd>Del</kbd>.

> **Se upp:** när två steg som kan vara aktiva samtidigt båda styr samma utgång med kontinuerliga
> aktioner blir resultatet svårt att läsa. GrafcetMaker varnar dig för det.
