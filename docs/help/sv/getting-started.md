# Kom igång

I den här handledningen ritar du styrningen av en liten tank: när operatören trycker på **start**
fyller en pump tanken tills den är **full**, sedan tömmer en ventil den tills den är **empty** (tom),
och systemet väntar på nästa start. Det tar ungefär tio minuter.

<!-- figure: sequence | Grafceten du kommer att rita -->

## 1. Hitta rätt {#1-find-your-way-around}

- **Ritytan** fyller fönstret: det är där du ritar. Allt annat svävar ovanpå den, lite blekt tills
  du pekar på det, så att diagrammet hamnar i förgrunden.
- **Överst**: huvudmenyn ☰ och projektnamnet till vänster; verktygen i mitten (markera, panorera,
  placera steg, övergång, kommentar eller aktion), med ▶ **Simulera** sist; problemräknarna,
  **Exportera** och delning till höger.
- **Under verktygen**: tipsen visar vad du kan göra just nu. Håll ett öga på dem medan du följer
  handledningen.
- **Till vänster**: **Egenskaper** för det du markerar visas i ett kort så länge det är markerat.
- **Nederst**: zoom, ångra och gör om till vänster; en flik per grafcet i mitten; knapparna
  **Variabler**, **Problem**, **Tidsdiagram** och **Översikt** till höger, som var och en öppnar
  sin panel till höger i fönstret, och sedan hjälp, feedback och flaggan som byter språk.

Ett nytt projekt innehåller redan grafceten **G1** med steg **0**. Den dubbla kvadraten betyder att
det är ett **initialsteg**: det är aktivt när systemet startar.

## 2. Lägg till den första övergången och det första steget {#2-add-the-first-transition-and-step}

1. Klicka på steg **0** för att markera det.
2. Tryck på <kbd>Enter</kbd>. En övergång och steg **1** visas nedanför, och du skriver
   övergångens **övergångsvillkor**, villkoret för att gå vidare, direkt där det ritas.
3. Skriv `start` och tryck på <kbd>Enter</kbd>.

`start` är inte deklarerad ännu: medan du skriver visar fältet **Ny variabel start: BOOL, ingång**,
och när du trycker på <kbd>Enter</kbd> läggs den till i variabellistan (ett meddelande bekräftar
det).

## 3. Lägg till en aktion {#3-add-an-action}

Steg 1 är fortfarande markerat. Tryck på <kbd>A</kbd>, skriv `Pump` och tryck på <kbd>Enter</kbd>:
`Pump` skapas som en BOOL-utgång. Pumpen går nu så länge steg 1 är aktivt.

## 4. Fortsätt sekvensen {#4-continue-the-sequence}

1. Tryck på <kbd>Enter</kbd> igen: en övergång och steg **2** läggs till efter steg 1. Skriv `full`
   som övergångsvillkor och skapa ingången.
2. Tryck på <kbd>A</kbd> och lägg till aktionen `Valve` (ventil; skapa utgången).

> **Tips:** föredrar du musen? Ett markerat steg visar streckade **förslag** på det som
> <kbd>Enter</kbd> och <kbd>A</kbd> skulle lägga till; klicka på ett för att lägga till det (se
> [Redigera diagram](editing.md#ghosts)).

## 5. Gör en återgång {#5-close-the-loop}

Cykeln ska gå tillbaka till steg 0 när tanken är tom.

1. Tryck på <kbd>L</kbd> medan steg **2** är markerat. Tipsen säger **Klicka på ett steg för att
   återgå till det**.
2. Klicka på steg **0**. En övergång läggs till under steg 2 med en länk som går upp till steg 0,
   ritad med en pil eftersom den går uppåt.
3. Skriv `empty` som dess övergångsvillkor, tryck på <kbd>Enter</kbd> och skapa ingången.

Ditt diagram ser nu ut som bilden överst på sidan.

## 6. Kontrollera det {#6-check-it}

Titta på räknarna uppe till höger: en röd cirkel räknar **fel**, en orange triangel räknar
**varningar**. Klicka på dem för att öppna listan **Problem**. Varje problem säger vad som är fel
och var; klicka på det för att hoppa till elementet, och använd åtgärdsknappen när det finns en.
Ett korrekt diagram har inga fel. Under [Felsökning](troubleshooting.md) står vad varje meddelande
betyder.

## 7. Simulera {#7-simulate}

1. Tryck på <kbd>F5</kbd>. Diagrammet låses och panelen **Simulering** visas till vänster. Steg 0
   har en markör: det är aktivt.
2. Slå på **start** i panelen (eller klicka på `start` där det står i diagrammet). Övergången
   passeras: steg 1 blir aktivt och dess aktion **Pump** visar en bock ✓.
3. Slå av **start** och sedan på **full**: steg 2 blir aktivt och **Valve** slås på.
4. Slå av **full** och på **empty**: grafceten går tillbaka till steg 0.
5. Klicka på **Tidsdiagram** nere till höger för att se varje signal över tid. Tryck på
   <kbd>Shift+F5</kbd> för att stoppa.

Vad händer om **start** fortfarande är på när tanken blir tom? Prova: så snart steg 0 är aktivt
igen passeras dess övergång igen. Det är GRAFCET som beter sig precis som det är ritat. Använd en
stigande flank `↑start` för att bara reagera på ett nytt tryck (skriv `^start`, se
[Skriva övergångsvillkor](expressions.md)).

## 8. Spara {#8-save}

Ditt arbete sparas automatiskt i webbläsaren efter varje ändring. För att få en fil som du kan
behålla, skicka eller versionshantera trycker du på <kbd>Ctrl+S</kbd>: projektet sparas som
`<name>.grafcet.json`. Dubbelklicka på projektnamnet överst för att byta namn på det.

## Hur går du vidare? {#where-next}

- [Grunderna i GRAFCET](grafcet-basics.md) förklarar reglerna bakom det du just såg.
- [Redigera diagram](editing.md) visar parallella och alternativa förgreningar och andra snabba
  grepp.
- [Simulering](simulation.md) tar upp tidsfördröjningar, utvecklingsloggen och scenarier.
