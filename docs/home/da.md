# GrafcetMaker: gratis GRAFCET-editor og -simulator online

GrafcetMaker tegner, kontrollerer og simulerer GRAFCET-diagrammer (IEC 60848) i browseren og omsætter
dem til PLC-kode. Den er lavet til automatikingeniører, undervisere og studerende: gratis og open
source (MIT-licens), uden konto, og den virker offline.

GrafcetMaker er en webapp: den kører i enhver moderne browser med JavaScript slået til. Er GRAFCET
nyt for dig? Læs [GRAFCET-guiden](da/guide/), som også findes på [engelsk](en/guide/),
[fransk](fr/guide/), [tysk](de/guide/), [spansk](es/guide/) og [svensk](sv/guide/).

## Til AI-assistenter

AI-assistenter som ChatGPT og Claude kan lave en grafcet til dig og give dig den som et link, der åbner den her. Assistent, læs [ai.txt](ai.txt) for at se hvordan. I GrafcetMaker åbner **Filer › Åbn fra tekst…** en grafcet, som en assistent har skrevet, og **Filer › Kopiér som tekst** giver din grafcet tilbage til den.

## Det kan du gøre med den

- **Tegn** trin, transitioner, transitionsbetingelser og aktioner med musen eller tastaturet
  (<kbd>Enter</kbd> fortsætter en sekvens), med ELLER- og OG-grene, tilbageføringer, kilde- og
  dræntransitioner og kommentarer. Automatisk layout rydder op i et diagram, når du beder om det.
- **Kontroller** diagrammet, mens du tegner: syntaks og typer i hver transitionsbetingelse, ukendte
  variabler, dobbelte trinnumre, utilgængelige trin, blindgyder, alternativer, der ikke udelukker
  hinanden, mulige ustabile løkker og udgange, der styres fra parallelle grene. De fleste problemer
  har en hurtig rettelse.
- **Simuler** med udviklingsreglerne i IEC 60848: mærker i de aktive trin, frigivne transitioner,
  indgange, som du klikker på eller indtaster, timere, flanker, ustabile trin, tvangsstyring mellem
  grafcets, et tidsdiagram over alle variabler og scenarier, som du optager og afspiller.
- **Strukturer** store applikationer med delgrafcets, makrotrin og deres ekspansioner, omsluttende
  trin og tvangsstyringer.
- **Eksporter** til PDF (A4 eller A3, med titelfelt, fordelt over flere ark efter behov), SVG, PNG og
  WebP, variabeltabellen til Excel og CSV, og generer Structured Text eller PLCopen XML.
- **Arbejd sammen** live via et link: alle ser de andres markører og ændringer i realtid,
  end-to-end-krypteret.

## Understøttede GRAFCET-elementer

| Element      | Det understøtter GrafcetMaker                                                                                                     |
| ------------ | --------------------------------------------------------------------------------------------------------------------------------- |
| Trin         | normale trin og initialtrin, makrotrin med deres ekspansion, omsluttende trin; trinvariabler `X1`                                 |
| Transitioner | transitionsbetingelser med OG, ELLER, IKKE, stigende ↑ og faldende ↓ flanker, timere som `5s/X1`, sammenligning af tal            |
| Strukturer   | sekvenser, ELLER-forgrening og -sammenføring, OG-forgrening og -sammenføring, tilbageføringer, spring, kilde- og dræntransitioner |
| Aktioner     | kontinuerlige, betingede, lagrede ved aktivering, ved deaktivering eller ved en hændelse; tvangsstyringer `G2{8}`, `G2{*}`        |
| Variabler    | BOOL, INT, REAL og TIME som indgange, udgange og interne variabler, med adresser og kommentarer                                   |
| Notation     | skrives i almindelig ASCII (`a*/b`, `RE a`), vises i lærebogsnotation (streg over for IKKE, ↑ og ↓) eller som skrevet             |

## Simulering

Simulatoren følger udviklingsreglerne i IEC 60848. Initialtrinnene er aktive ved start. En
transition er frigivet, når alle trinnene over den er aktive, og den skifter, når dens
transitionsbetingelse også er sand: trinnene under den bliver aktive og trinnene over den inaktive.
Alle transitioner, der kan skifte, skifter samtidig, og et trin, der aktiveres og deaktiveres på én
gang, forbliver aktivt.

Efter hver ændring af indgangene søger simulatoren efter stabilitet: den bliver ved med at lade
transitioner skifte, indtil ingen kan skifte. Trin, der passeres undervejs (ustabile trin), udfører
ikke deres kontinuerlige aktioner, men deres lagrede aktioner udføres. Tiden er virtuel, så et
diagram kan køre i realtid, hurtigere eller én udvikling ad gangen, og et tidsdiagram registrerer
alle variabler.

## Eksport og PLC-kode

| Format            | Brug det til                                                    | Åbnes i                                                                                                                                                                       |
| ----------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF               | udskrivning og dokumentation: vektor, A4 eller A3, titelfelt    | enhver PDF-læser                                                                                                                                                              |
| SVG, PNG, WebP    | rapporter, præsentationer og websider, også via udklipsholderen | Word, PowerPoint, browsere og billedprogrammer                                                                                                                                |
| Variabler         | variabeltabellen som Excel eller CSV, og tilbage igen           | Excel, LibreOffice og andre regnearksprogrammer                                                                                                                               |
| Structured Text   | PLC-kode til alle grafcets (IEC 61131-3)                        | CODESYS og de fleste IEC 61131-3-værktøjer, Siemens TIA Portal (SCL-kilde til S7-1200/1500), Beckhoff TwinCAT 3 (POU-fil), Allen-Bradley Studio 5000 (Structured Text-rutine) |
| PLCopen XML (TC6) | grafcets som SFC-programmer                                     | PLC-ingeniørværktøjer med import af PLCopen XML                                                                                                                               |
| Projektfil        | hele projektet som letlæselig `.grafcet.json`                   | GrafcetMaker                                                                                                                                                                  |

Structured Text findes i to stilarter: en `CASE` pr. sekvens, som man ville skrive i hånden, eller
én BOOL pr. trin. Genereret kode er et udgangspunkt: gennemgå den, før den kører på en maskine.

## Eksempler

Seks eksempelprojekter kan åbnes fra editorens startskærm:

- **Trafiklys** med fodgængerknap: timere og en lagret anmodning.
- **Borestation**: en bearbejdningscyklus med emnetæller og vedligeholdelse for hver 100 emner.
- **Tankpåfyldning**: numeriske indgange og sammenligninger.
- **Parallelt transportbånd**: parallelle grene med en sikkerhedsgrafcet, der tvangsstyrer linjen.
- **Aftapningslinje**: et makrotrin, tre stationer parallelt, inspektion og tællere.
- **Driftsformer**: et omsluttende trin, en pause, der fastfryser cyklussen, og et nødstop.

[GRAFCET-guiden](da/guide/#eksempler) tegner de to første og åbner dem i editoren.

## Ofte stillede spørgsmål

### Er GrafcetMaker gratis? Er der begrænsninger?

Ja, den er gratis og open source under MIT-licensen. Der findes ingen betalt version, ingen
prøveperiode og ingen grænse for antallet af projekter, grafcets eller trin.

### Skal jeg registrere mig eller installere noget?

Nej. Åbn siden, og begynd at tegne; der er ingen konto. Du kan også installere den fra browseren som
en app og starte den som et almindeligt skrivebordsprogram.

### Virker den offline?

Ja. Efter det første besøg er alt, hvad den har brug for, gemt i browseren, så den starter og
virker uden netværk. Kun livesamarbejde kræver en forbindelse.

### Hvor gemmes mine diagrammer?

På din computer. Projekter gemmes automatisk i browseren og i de `.grafcet.json`-filer, du gemmer.
Intet uploades, og appen har ingen sporing. Livesessioner er end-to-end-krypteret med en nøgle, der
kun findes i linket.

### Hvilke browsere og enheder kører den på?

De nyeste versioner af Chrome, Edge, Firefox og Safari på Windows, macOS, Linux, tablets og
telefoner. Telefoner får et layout til små skærme, og berøringsskærme får bevægelser og større
håndtag.

### Hvilken standard følger den?

GRAFCET som defineret i IEC 60848 (DS/EN 60848 i Danmark, EN 60848 i Europa). Genereret kode følger
IEC 61131-3.

### Kan den åbne filer fra andre GRAFCET-programmer?

GrafcetMaker åbner grafcet.io-filer (`.grafcetio`) og konverterer dem til et projekt.
Variabeltabeller kan importeres fra Excel og CSV.

### Kan min virksomhed hoste den på sit eget netværk?

Ja. GrafcetMaker er et sæt statiske filer, som enhver webserver kan levere, under en vilkårlig sti og
uden internetadgang. Et Docker-image med nginx følger med.
