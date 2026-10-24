# Kom godt i gang

I denne vejledning tegner du styringen af en lille tank: når operatøren trykker på **start**, fylder
en pumpe tanken, indtil den er fuld (**full**), derefter tømmer en ventil den, indtil den er tom
(**empty**), og systemet venter på den næste start. Det tager omkring ti minutter.

<!-- figure: sequence | Den grafcet, du skal tegne -->

## 1. Find rundt {#1-find-your-way-around}

- **Lærredet** fylder hele vinduet: det er der, du tegner. Alt andet svæver oven på det, let
  nedtonet, indtil du peger på det, så diagrammet forbliver i forgrunden.
- **Øverst**: hovedmenuen ☰ og projektnavnet til venstre; værktøjerne i midten (vælg, panorer,
  placer trin, transition, kommentar eller aktion), efterfulgt af ▶ **Simuler**; problemtællerne,
  **Eksport** og deling til højre.
- **Under værktøjerne**: tipsene viser, hvad du kan gøre lige nu. Hold øje med dem, mens du følger
  denne vejledning.
- **Til venstre**: **Egenskaber** for det, du vælger, vises i et kort, så længe det er valgt.
- **Nederst**: zoom, fortryd og gentag til venstre; en fane pr. grafcet i midten; knapperne
  **Variabler**, **Problemer**, **Tidsdiagram** og **Oversigt** til højre, som hver åbner sit panel
  i højre side af vinduet, og derefter hjælp, feedback og flaget, der skifter sprog.

Et nyt projekt indeholder allerede grafcetten **G1** med trin **0**. Den dobbelte firkant betyder,
at det er et **initialtrin**: det er aktivt, når systemet starter.

## 2. Tilføj den første transition og det første trin {#2-add-the-first-transition-and-step}

1. Klik på trin **0** for at vælge det.
2. Tryk på <kbd>Enter</kbd>. En transition og trin **1** dukker op nedenunder, og du skriver
   transitionens **transitionsbetingelse**, betingelsen for at gå videre, lige der, hvor den er
   tegnet.
3. Skriv `start`, og tryk på <kbd>Enter</kbd>.

`start` er ikke erklæret endnu: mens du skriver, viser redigeringsfeltet **Ny variabel start: BOOL
indgang**, og når du trykker på <kbd>Enter</kbd>, føjes den til variabellisten (en meddelelse
fortæller det).

## 3. Tilføj en aktion {#3-add-an-action}

Trin 1 er stadig valgt. Tryk på <kbd>A</kbd>, skriv `Pump`, og tryk på <kbd>Enter</kbd>: `Pump`
oprettes som en BOOL-udgang. Pumpen kører nu, så længe trin 1 er aktivt.

## 4. Fortsæt sekvensen {#4-continue-the-sequence}

1. Tryk på <kbd>Enter</kbd> igen: en transition og trin **2** tilføjes efter trin 1. Skriv `full`
   som transitionsbetingelse, og opret indgangen.
2. Tryk på <kbd>A</kbd>, og tilføj aktionen `Valve` (opret udgangen).

> **Tip:** foretrækker du musen? Et valgt trin viser stiplede **pladsholdere** for det, som
> <kbd>Enter</kbd> og <kbd>A</kbd> ville tilføje; klik på en for at tilføje den (se
> [Rediger diagrammer](editing.md#ghosts)).

## 5. Luk løkken {#5-close-the-loop}

Cyklussen skal gå tilbage til trin 0, når tanken er tom.

1. Tryk på <kbd>L</kbd>, mens trin **2** er valgt. Tipsene siger **Klik på et trin for at føre
   tilbage til det**.
2. Klik på trin **0**. En transition tilføjes under trin 2 med en forbindelse op til trin 0, tegnet
   med en pil, fordi den går opad.
3. Skriv `empty` som dens transitionsbetingelse, tryk på <kbd>Enter</kbd>, og opret indgangen.

Dit diagram svarer nu til figuren øverst på denne side.

## 6. Kontroller det {#6-check-it}

Se på tællerne øverst til højre: en rød cirkel tæller **fejl**, en orange trekant tæller
**advarsler**. Klik på dem for at åbne listen **Problemer**. Hvert problem fortæller, hvad der er
galt, og hvor; klik på det for at springe til elementet, og brug rettelsesknappen, når der er en.
Et korrekt diagram har ingen fejl. Se [Fejlfinding](troubleshooting.md) for betydningen af hver
meddelelse.

## 7. Simuler {#7-simulate}

1. Tryk på <kbd>F5</kbd>. Diagrammet låses, og panelet **Simulering** vises til venstre. Trin 0
   har et mærke: det er aktivt.
2. Slå **start** til i panelet (eller klik på `start`, der hvor den står på diagrammet).
   Transitionen skifter: trin 1 bliver aktivt, og dets aktion **Pump** viser et flueben ✓.
3. Slå **start** fra og derefter **full** til: trin 2 bliver aktivt, og **Valve** tændes.
4. Slå **full** fra og **empty** til: grafcetten går tilbage til trin 0.
5. Klik på **Tidsdiagram** nederst til højre for at se alle signaler over tid. Tryk på
   <kbd>Shift+F5</kbd> for at stoppe.

Hvad sker der, hvis **start** forbliver slået til, når tanken bliver tom? Prøv det: så snart trin 0
er aktivt igen, skifter dets transition igen. Det er GRAFCET, der opfører sig præcis som tegnet.
Brug en stigende flanke `↑start` for kun at reagere på et nyt tryk (skriv `^start`, se
[Skriv transitionsbetingelser](expressions.md)).

## 8. Gem {#8-save}

Dit arbejde gemmes automatisk i browseren efter hver ændring. For at få en fil, som du kan beholde,
sende eller lægge under versionsstyring, skal du trykke på <kbd>Ctrl+S</kbd>: projektet gemmes som
`<name>.grafcet.json`. Dobbeltklik på projektnavnet øverst for at omdøbe det.

## Hvad nu? {#where-next}

- [Grundlæggende GRAFCET](grafcet-basics.md) forklarer reglerne bag det, du lige har set.
- [Rediger diagrammer](editing.md) viser parallelle og alternative grene og andre hurtige greb.
- [Simulering](simulation.md) handler om timere, udviklingsloggen og scenarier.
