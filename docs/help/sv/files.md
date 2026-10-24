# Filer, sparande och export

Allt sker på din dator: det finns inget konto och inget laddas upp.

## Automatisk sparning och återställning {#autosave-and-recovery}

Varje ändring sparas i webbläsaren en halv sekund efter att du gjort den. Du kan när som helst läsa
in sidan igen eller stänga fliken utan att få någon fråga: nästa gång du öppnar GrafcetMaker är ditt
projekt tillbaka som du lämnade det, osparade ändringar inräknade. En punkt `●` bredvid
projektnamnet betyder att det finns ändringar som ännu inte har sparats i en fil.

**Arkiv › Lokal historik** listar ögonblicksbilder som sparas i webbläsaren: de tas när du sparar,
med några minuters mellanrum medan du redigerar och innan ett projekt stängs. Om du återställer en
öppnas den som osparade ändringar.

> **Viktigt:** webbläsarens lagring hör till den här webbläsaren på den här datorn, och den raderas
> om du rensar webbplatsdata. Spara i en fil allt som du vill behålla.

## Offline och installation {#offline-and-installation}

Efter det första besöket fungerar GrafcetMaker utan nätverk. Använd installationsknappen i
webbläsarens adressfält för att få den som en app med ett eget fönster. När en ny version är klar
erbjuder ett kort i hörnet att läsa in sidan igen: ditt arbete behålls.

## Spara och öppna {#save-and-open}

- **Spara** (<kbd>Ctrl+S</kbd>) skriver projektet till en `.grafcet.json`-fil. I Chrome och Edge
  skrivs samma fil över varje gång; i andra webbläsare laddas filen ned.
- **Spara som** (<kbd>Ctrl+Shift+S</kbd>) väljer en ny fil. **Arkiv › Ladda ned en kopia** laddar
  ned en kopia utan att ändra var Spara skriver.
- **Öppna** (<kbd>Ctrl+O</kbd>), **Arkiv › Öppna senaste**, eller släpp en `.grafcet.json`-fil var
  som helst i fönstret. Om det öppna projektet har osparade ändringar får du en fråga först, och en
  ogiltig fil avvisas med en förklaring utan att ditt projekt påverkas.

`.grafcet.json`-filer är läsbar text, väl lämpade för versionshantering (Git) och kodgranskning.

**Filer från grafcet.io** (`.grafcetio`) öppnas på samma sätt: de konverteras till ett nytt projekt,
med en delgrafcet per diagram (eller per ram), variablerna skapade utifrån det som diagrammen
använder och en prydlig layout. Ett meddelande listar allt som konverteringen ändrade. Spara för att
behålla det som ett GrafcetMaker-projekt; originalfilen ändras inte.

## Dela en länk {#share-a-link}

**Arkiv › Kopiera delningslänk** kopierar en webbadress som innehåller hela projektet,
komprimerat. Klistra in den i en chatt, ett e-postmeddelande eller ett ärende: den som öppnar den
får en egen kopia av projektet, med alla dess grafcetar och variabler, och kan ändra den utan att
påverka din.

- Projektet följer med inuti länken (efter `#`), som webbläsare aldrig skickar till webbservern:
  inget laddas upp, och länkar fungerar även offline och i interna installationer.
- Alla som har länken kan läsa projektet, så dela den som du skulle dela själva filen.
- En länk är en ögonblicksbild: senare ändringar kräver en ny länk.
- Små diagram ger länkar på ett eller två tusen tecken. Om GrafcetMaker varnar för att en länk är
  lång kan vissa chatt- och e-postappar klippa av den; skicka `.grafcet.json`-filen i stället.
- Att öppna en länk fungerar som att öppna en fil: om ditt projekt har osparade ändringar får du en
  fråga först, och en skadad länk avvisas med en förklaring utan att ditt projekt påverkas.

## Redigera tillsammans live {#edit-together-live}

**Arkiv › Livesamarbete…** (eller personknappen uppe till höger) låter flera personer redigera
samma projekt samtidigt, var och en på sin egen dator.

1. Skriv ditt namn och välj **Starta livesession**. Skicka länken som visas till de andra.
2. De öppnar länken, skriver sitt namn och väljer **Gå med**.
3. Alla ser de andras pekare och markeringar med deras namn, och varje ändring visas för alla
   inom ett ögonblick.

- Ändringar slås samman fält för fält: om du flyttar ett steg medan någon byter namn på det behålls
  båda.
- **Ångra** tar bara tillbaka dina egna ändringar.
- Medan du simulerar väntar de andras ändringar så att diagrammet fortsätter att stämma med din
  simulering: **Starta om med ändringarna** i simuleringskontrollerna tar in dem.
- Utan anslutning kan du fortsätta arbeta; ändringarna utbyts när anslutningen är tillbaka.
- **Lämna sessionen** behåller projektet på din enhet som din egen kopia.
- Projektet är totalsträckskrypterat med en nyckel som bara finns i länken: alla som har länken kan
  se och ändra projektet, så dela den som du skulle dela själva filen.

## Exportera {#export}

**Arkiv › Exportera…** (<kbd>Ctrl+E</kbd>, eller knappen **Exportera** uppe till höger) öppnar en
dialogruta för alla format, med en direkt förhandsgranskning. Dess inställningar sparas per
projekt. **Arkiv › Exportera som** öppnar den direkt med ett visst format.

| Format                | Används för                                                                                                        |
| --------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **PDF**               | utskrift och dokumentation: vektor, A4 eller A3, anpassat till sidan eller fördelat över flera blad, med namnruta  |
| **SVG**               | dokument och webben: vektor, skarp i alla storlekar                                                                |
| **PNG**               | presentationer, chattar och ärenden: upplösning 1×, 2× eller 4×, med transparent bakgrund om du vill               |
| **WebP**              | samma som PNG med mindre filer                                                                                     |
| **Variabler (Excel)** | variabeltabellen som en `.xlsx`-arbetsbok                                                                          |
| **Variabler (CSV)**   | variabeltabellen för andra verktyg                                                                                 |
| **Structured Text**   | PLC-kod som kör varje grafcet: IEC 61131-3, Siemens TIA Portal (SCL), Beckhoff TwinCAT 3 eller Allen-Bradley Logix |
| **PLCopen XML**       | import av grafcetarna i ett PLC-verktyg som SFC-program                                                            |

Exporterna är som standard svart på vitt; välj **Aktuellt tema** för att behålla skärmens färger.
Exportera den aktuella grafceten, markeringen eller alla grafcetar.

**Arkiv › Kopiera diagrammet som PNG / SVG** lägger markeringen (eller hela grafceten) i urklipp,
redo att klistras in i en rapport.

## PLC-kod {#plc-code}

**Structured Text** och **PLCopen XML** gör om dina grafcetar till PLC-kod. Välj PLC-system under
**PLC**:

- **IEC 61131-3**: ett funktionsblock (`.st`) för CODESYS och de flesta andra verktyg.
- **Siemens TIA Portal (SCL)**: en SCL-källa (`.scl`) för S7-1200/1500. I TIA Portal lägger du till
  den under **External source files** och väljer **Generate blocks from source**.
- **Beckhoff TwinCAT 3**: en POU-fil (`.TcPOU`). Högerklicka på en mapp i PLC-projektet ›
  **Add › Existing Item**.
- **Allen-Bradley Studio 5000**: en Structured Text-rutin. Skapa taggarna som listas i dess huvud
  (program scope) och klistra sedan in koden i en ST-rutin. Timrar använder TONR/TOFR, flanker
  OSRI/OSFI, och den första cykeln (`S:FS`) sätter startvärdena.

Structured Text finns i två stilar:

- **CASE per sekvens** (standard): en INT-variabel per sekvens håller numret på dess aktiva steg,
  och en `CASE` listar övergångarna från varje steg (`IF receptivity THEN step_G1 := 2;`).
  Utgångarna följer med en rad var, t.ex. `Motor := step_G1 >= 2 AND step_G1 <= 4;`. Sekvenser med
  parallella grenar behåller en BOOL per steg.
- **En BOOL per steg**: varje övergång, sedan varje steg, sedan timrarna, flankerna och aktionerna,
  en gång per PLC-cykel; kryssa i **Sök efter stabilitet i varje PLC-cykel** för att passera kedjor
  av sanna övergångar inom en och samma cykel, som GRAFCET gör.

En lagrad aktion som `Q1 := 1` vid aktivering utförs en gång, och Q1 behåller sitt värde när steget
har lämnats. Kryssa i **Håll lagrade aktioner med ett konstant värde** för att i stället tilldela
den i varje PLC-cykel medan dess steg är aktivt.

PLCopen-filen innehåller ett SFC-program per grafcet för import i engineeringverktyg.
Förhandsgranskningen listar allt som formatet inte kan uttrycka. Granska alltid genererad kod innan
den körs på en maskin.

## Inställningar {#settings}

**Arkiv › Inställningar…** (<kbd>Ctrl+,</kbd>) innehåller tema, notation, välkomstskärm, rutnät,
tips och simuleringsinställningar, och visar hur mycket av webbläsarens lagring som används. Där kan
du rensa den lokala historiken och listan över senaste filer.

## Språk {#language}

Välj språk med flaggan nere till höger (på en mobil längst ned i menyn ☰); valet sparas på den här
enheten. Varje språk har också en egen adress, till exempel `…/de/` för tyska, så
att en länk öppnas på det språk den skickades på.
