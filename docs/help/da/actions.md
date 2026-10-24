# Aktioner

Aktioner er rektanglerne til højre for et trin. De angiver, hvad systemet gør, mens eller når
trinnet er aktivt. Vælg et trin, og tryk på <kbd>A</kbd> for at tilføje en; tryk på <kbd>A</kbd>
igen på en aktion for at tilføje den næste. Vælg dens **type** med billedknapperne i panelet
**Egenskaber**: hver knap viser, hvordan diagrammet tegner den type.

## Kontinuerlige aktioner {#continuous-actions}

Den mest almindelige type. Teksten er navnet på en udgang (eller en intern variabel), f.eks. `Pump`.
Udgangen er sand, **mens** trinnet er aktivt, og falsk, så snart intet aktivt trin styrer den.

Vælg typen **Betinget** for at tilføje en betingelse (en _tildelingsbetingelse_): dens felt vises
under typeknapperne, og udgangen er sand, mens trinnet er aktivt, **og** betingelsen er sand. Den
tegnes på en kort linje over boksen.

<!-- figure: continuous | Lamp, mens trin 4 er aktivt; Horn kun, mens alarm også er sand -->

Timere i betingelsen giver de forsinkede og tidsbegrænsede aktioner fra andre notationer:

- `5s/X4` – forsinket: udgangen tændes 5 s efter, at trin 4 blev aktivt.
- `/(5s/X4)` – tidsbegrænset: kun tændt i de første 5 s af trin 4.

> **Bemærk:** trin, der passeres under en ustabil udvikling (se
> [Grundlæggende GRAFCET](grafcet-basics.md)), udfører ikke deres kontinuerlige aktioner.

## Lagrede aktioner {#stored-actions}

En lagret aktion ændrer en værdi **én gang**, og værdien bevares, indtil en anden aktion ændrer
den. Dens tekst er en tildeling: `C := C + 1`, `Motor := 0`, `Speed := 2.5`. For at sætte en
BOOL-variabel til TRUE er navnet alene nok: `Motor` betyder `Motor := 1`.

- **Ved aktivering** – udføres, når trinnet bliver aktivt. Tegnes med en pil **↑ over** boksen.
- **Ved deaktivering** – udføres, når trinnet bliver inaktivt. Tegnes med en pil **↓ under**
  boksen.
- **Ved hændelse** – udføres, hver gang **hændelsen** indtræffer, mens trinnet er aktivt, f.eks.
  `↑reset`. Tegnes med et **flag** øverst til højre ved siden af hændelsen. Indtast hændelsen i
  panelet Egenskaber; en aktion ved hændelse uden hændelse udføres aldrig og meldes som et problem.

<!-- figure: stored | Lagret ved aktivering (↑), ved deaktivering (↓) og ved en hændelse (flag) -->

Aktioner ved aktivering og deaktivering kan også have en betingelse: de udføres kun, hvis den er
sand i det øjeblik.

Lagrede aktioner udføres selv af trin, der kun passeres under en ustabil udvikling. Brug dem til at
tælle, til at fastholde en værdi (`Motor := 1` i ét trin, `Motor := 0` i et andet) eller til at
huske, at noget er sket.

## Tvangsstyringer {#forcing-orders}

En tvangsstyring påtvinger en anden delgrafcet en situation, mens dens trin er aktivt: `G2{8}`
aktiverer kun trin 8 i grafcetten G2, `G2{*}` fastfryser G2 i dens aktuelle situation, `G2{}`
deaktiverer alle dens trin, og `G2{INIT}` sætter den tilbage i dens initialsituation. Den tegnes
med en dobbelt ramme. Se [Makrotrin, omsluttende trin og tvangsstyring](hierarchy.md).

## Aktioner uden trin {#actions-without-a-step}

En aktion behøver ikke at høre til et trin. Tryk på <kbd>A</kbd>, mens intet er valgt (eller vælg
værktøjet **Aktion**), og klik på det tomme lærred: aktionen tegnes for sig selv, uden forbindelse,
og den er **altid aktiv**.

- En kontinuerlig aktion uden trin sætter sin udgang, når dens **tildelingsbetingelse** er sand,
  uanset trinnene: `Lamp` med betingelsen `a * b` er logikken `Lamp = a · b`. Uden betingelse er
  udgangen altid sand.
- En lagret aktion ved hændelse udføres, hver gang hændelsen indtræffer, f.eks. tæller
  `C := C + 1` ved `↑pulse` impulser. Ved aktivering udføres den én gang, når simuleringen starter.
  Ved deaktivering udføres den aldrig, da aktionen aldrig deaktiveres.

Træk i en aktion for at flytte den: hen på et trin for at knytte den til det (trinnet lyser op, og
en markering viser dens plads blandt trinnets aktioner), eller hen på det tomme lærred for at lade
den være uden trin.

## Flere aktioner {#several-actions}

Et trin kan have et vilkårligt antal aktioner; de tegnes side om side. Træk én langs rækken for at
ændre deres rækkefølge, eller brug **Flyt aktion til venstre / højre** i panelet Egenskaber, hvor et
valgt trin viser sine aktioner som kompakte rækker (klik på én for at folde den ud). Slet en aktion
med <kbd>Del</kbd>.

> **Pas på:** når to trin, der kan være aktive samtidig, begge styrer den samme udgang med
> kontinuerlige aktioner, bliver resultatet svært at overskue. GrafcetMaker advarer dig om det.
