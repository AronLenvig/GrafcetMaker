# Variabler

Hvert navn, der bruges i en transitionsbetingelse eller en aktion, er en **variabel** i projektet.
Når du erklærer den, får den en type og en retning, så GrafcetMaker kan kontrollere dine udtryk, og
simulatoren kan tilbyde de rigtige betjeningselementer.

## Typer af variabler {#kinds-of-variables}

- **Retning**: en **indgang** kommer fra processen (sensorer, knapper) og kan kun læses; en
  **udgang** styrer processen (motorer, lamper); en **intern** variabel er en hukommelse eller en
  tæller.
- **Type**: `BOOL` (sand / falsk), `INT` (heltal), `REAL` (decimaltal) eller `TIME` (varighed,
  f.eks. `500ms`, `3s`).
- **Startværdi**: værdien ved starten af en simulering (FALSE eller 0, hvis feltet er tomt).
- **Adresse** og **kommentar**: fri tekst, f.eks. en PLC-adresse `%I0.0` og hvad signalet er.

Der skelnes ikke mellem store og små bogstaver i navne; de består af bogstaver, cifre og `_`, og de
må hverken være reserverede ord (`AND`, `OR`, `NOT`, `RE`, `FE`, `TRUE`, `FALSE`, `MOD`, `INIT`)
eller ligne en trinvariabel (`X12`).

## Opret variabler {#creating-variables}

- Mens du skriver et udtryk, erklæres et nyt navn, når du bekræfter: en indgang i en
  transitionsbetingelse, en udgang i en aktion. Det er den hurtigste måde.
- **Tilføj variabel** i variabellisten eller -tabellen.
- **Importer** en liste fra Excel eller CSV (se nedenfor).

## Variabeltabellen {#the-variable-table}

Knappen **Variabler** nederst til højre åbner variablerne i højre side af vinduet: en kompakt liste
(søgning, filterknapper, grupper efter retning; klik på en variabel for at redigere den og se, hvor
den bruges). Gør panelet bredere ved dets venstre kant, så bliver det til tabellen med alle felter
i kolonner. Rediger en hvilken som helst celle direkte (<kbd>Enter</kbd> eller at forlade cellen
anvender ændringen, <kbd>Esc</kbd> fortryder den), sorter ved at klikke på en kolonneoverskrift, og
filtrer efter tekst, retning og type. Tabellen forbliver hurtig, selv med tusindvis af variabler.

Kolonnen **Brug** tæller de udtryk, der bruger hver variabel; en ubrugt variabel viser `0` med
orange. Klik på tallet for at åbne variablen i egenskabskortet: rediger alle dens felter, og se
**hvor den bruges**; klik på en anvendelse for at springe til den transitionsbetingelse eller
aktion på diagrammet.

Kosteknappen ved siden af **⋯** fjerner alle ubrugte variabler på én gang (dens mærkat viser hvor
mange): dem, som ingen transitionsbetingelse, aktion eller betingelse bruger, og som intet scenarie
styrer. Det er ét trin at fortryde (<kbd>Ctrl+Z</kbd>). Den findes også i kommandopaletten:
**Fjern ubrugte variabler**.

På en telefon er panelet Variabler i stedet en kompakt liste: søgning, filterknapper
(**Indgange**, **Udgange**, **Interne**), grupper efter retning, og et tryk åbner en variabel med
dens anvendelser.

## Omdøbning {#renaming}

Når du omdøber en variabel, opdateres alle transitionsbetingelser, aktioner og betingelser, der
bruger den, i alle grafcets, som én ændring, der kan fortrydes.

## Excel og CSV {#excel-and-csv}

Brug menuen **⋯** i variabellisten eller -tabellen, eller **Filer › Variabler**:

- **Eksporter variabler som Excel** skriver en `.xlsx`-projektmappe med fastfrosset overskrift,
  filtre og rullelister for type og retning.
- **Eksporter variabler som CSV** skriver en tekstfil til andre værktøjer.
- **Importer variabler** læser en `.xlsx`- eller `.csv`-fil (du kan også slippe den på vinduet).

Kolonnerne er `name`, `type`, `direction`, `initial`, `address` og `comment` (i vilkårlig
rækkefølge; kun `name` og `type` er påkrævet). Før noget ændres, ser du, hvor mange variabler der
vil blive tilføjet, opdateret eller afvist, med årsagen for hver afvist række. Variabler matches
efter navn; de, der ikke er i filen, bevares. Importen er én ændring, der kan fortrydes.

> **Tip:** for at forberede en liste i Excel skal du eksportere først: så får du de rigtige
> kolonner og rullelister, og derefter udfylder du rækkerne og importerer filen igen.
