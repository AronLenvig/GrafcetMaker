# Variabler

Varje namn som används i ett övergångsvillkor eller en aktion är en **variabel** i projektet. När du
deklarerar den får den en typ och en riktning, och då kan GrafcetMaker kontrollera dina uttryck och
simulatorn erbjuda rätt reglage.

## Typer av variabler {#kinds-of-variables}

- **Riktning**: en **ingång** kommer från processen (givare, knappar) och kan bara läsas; en
  **utgång** styr processen (motorer, lampor); en **intern** variabel är ett minne eller en räknare.
- **Typ**: `BOOL` (sant / falskt), `INT` (heltal), `REAL` (decimaltal) eller `TIME` (varaktighet,
  t.ex. `500ms`, `3s`).
- **Startvärde**: värdet i början av en simulering (FALSE eller 0 om fältet är tomt).
- **Adress** och **kommentar**: fri text, t.ex. en PLC-adress `%I0.0` och vad signalen är.

Namn skiljer inte på versaler och gemener, använder bokstäverna a–z, siffror och `_`, och får inte
vara reserverade ord (`AND`, `OR`, `NOT`, `RE`, `FE`, `TRUE`, `FALSE`, `MOD`, `INIT`) eller se ut
som en stegvariabel (`X12`).

## Skapa variabler {#creating-variables}

- När du skriver ett uttryck deklareras ett nytt namn när du bekräftar: en ingång i ett
  övergångsvillkor, en utgång i en aktion. Det är det snabbaste sättet.
- **Lägg till variabel** i listan eller tabellen Variabler.
- **Importera** en lista från Excel eller CSV (se nedan).

## Variabeltabellen {#the-variable-table}

Knappen **Variabler** nere till höger öppnar variablerna till höger i fönstret: en kompakt lista
(sökning, filterknappar, grupper efter riktning; klicka på en variabel för att redigera den och se
var den används). Gör panelen bredare i dess vänstra kant så blir den tabellen, med varje fält i en
kolumn. Redigera en cell direkt (<kbd>Enter</kbd> eller att lämna cellen verkställer, <kbd>Esc</kbd>
återställer), sortera genom att klicka på en kolumnrubrik, filtrera på text, riktning och typ.
Tabellen förblir snabb även med tusentals variabler.

Kolumnen **Användningar** räknar de uttryck som använder varje variabel; en oanvänd variabel visar
`0` i orange. Klicka på siffran för att öppna variabeln i egenskapskortet: redigera alla dess fält
och se **var den används**; klicka på en användning för att hoppa till det övergångsvillkoret eller
den aktionen i diagrammet.

Kvastknappen bredvid **⋯** tar bort alla oanvända variabler på en gång (dess etikett anger hur
många): de som inget övergångsvillkor, ingen aktion eller inget villkor använder och inget scenario
styr. Det är ett enda steg att ångra (<kbd>Ctrl+Z</kbd>). Det finns också i kommandopaletten:
**Ta bort oanvända variabler**.

På en mobil är panelen Variabler i stället en kompakt lista: sökning, filterknappar (**Ingångar**,
**Utgångar**, **Interna**), grupper efter riktning, och ett tryck öppnar en variabel med dess
användningar.

## Byta namn {#renaming}

När du byter namn på en variabel uppdateras varje övergångsvillkor, aktion och villkor som använder
den, i alla grafcetar, som en enda ändring som kan ångras.

## Excel och CSV {#excel-and-csv}

Använd menyn **⋯** i listan eller tabellen Variabler, eller **Arkiv › Variabler**:

- **Exportera variabler som Excel** skriver en `.xlsx`-arbetsbok med låst rubrikrad, filter och
  listrutor för typ och riktning.
- **Exportera variabler som CSV** skriver en textfil för andra verktyg.
- **Importera variabler** läser en `.xlsx`- eller `.csv`-fil (du kan också släppa den i fönstret).

Kolumnerna är `name`, `type`, `direction`, `initial`, `address` och `comment` (i valfri ordning;
bara `name` och `type` krävs). Innan något ändras ser du hur många variabler som kommer att läggas
till, uppdateras eller avvisas, med orsaken för varje avvisad rad. Variablerna matchas efter namn;
de som inte finns i filen behålls. Importen är en enda ändring som kan ångras.

> **Tips:** för att förbereda en lista i Excel exporterar du först: då får du rätt kolumner och
> listrutor, fyller sedan i rader och importerar tillbaka filen.
