# Makrotrin, omsluttende trin og tvangsstyring

Store applikationer er lettere at overskue, når de er delt op. GRAFCET tilbyder tre værktøjer til
det, og de findes alle i GrafcetMaker.

## Flere delgrafcets {#several-partial-grafcets}

Et projekt kan indeholde flere **delgrafcets**, én pr. fane nederst i vinduet, f.eks. _G1_ til
produktionscyklussen og _G2_ til sikkerhedslogikken. De kører alle samtidig og kan følge hinanden
via trinvariabler (`X21` i G1 er sand, mens trin 21 i G2 er aktivt).

- Klik på **+** ved siden af fanerne for at tilføje en. Dens trinnumre starter ved den næste ledige
  tier (20, 30…), så henvisninger `Xn` forbliver entydige.
- Dobbeltklik på en fane (eller tryk på <kbd>F2</kbd> på den) for at omdøbe den; træk den til siden
  for at ændre rækkefølgen; tryk på <kbd>Del</kbd> på den for at slette den. <kbd>Ctrl</kbd>+klik
  eller <kbd>Shift</kbd>+klik vælger flere faner, så du kan slette dem samlet. Højreklik på en fane
  for mere. Mange faner rulles med musehjulet eller knapperne ‹ ›.

## Makrotrin {#macro-steps}

Et **makrotrin** står for en detaljeret sekvens, der tegnes på sit eget ark, dets **ekspansion**.
Det tegnes som et trin med to vandrette linjer.

<!-- figure: macro | Et makrotrin i hovedsekvensen -->

1. Vælg et trin, og sæt dets **Type** til _Makrotrin_ i panelet Egenskaber (eller
   **Rediger › Gør til makrotrin**).
2. En ny fane åbner med ekspansionen: et indgangstrin **E** og et udgangstrin **S** forbundet af en
   transition. Tegn den detaljerede sekvens mellem dem.
3. Dobbeltklik på makrotrinnet (eller tryk på <kbd>Alt+↓</kbd>) for at åbne dets ekspansion;
   <kbd>Alt+↑</kbd> går tilbage til makrotrinnet.

Når makrotrinnet aktiveres, bliver dets indgangstrin aktivt; transitionen efter makrotrinnet er
først frigivet, når udgangstrinnet er aktivt. Makrotrinnet regnes for aktivt, så længe et af
trinnene i dets ekspansion er det.

## Omsluttende trin {#enclosing-steps}

Et **omsluttende trin** indeholder en hel grafcet, den **omsluttede grafcet**, der kun kører, mens
det omsluttende trin er aktivt. Brug det til driftsformer: _automatisk_, _manuel_, _indstilling_.
Det tegnes som et trin med to lodrette linjer.

1. Sæt trinnets **Type** til _Omsluttende trin_ (eller **Rediger › Gør til omsluttende trin**).
2. En ny fane indeholder den omsluttede grafcet. Trin, der er markeret med `*` der, bliver aktive,
   når det omsluttende trin aktiveres.
3. Når det omsluttende trin forlades, deaktiveres alle trin i den omsluttede grafcet.

Faner med ekspansioner og omsluttede grafcets har et mærkat **M** eller **E**.

## Tvangsstyringer {#forcing-orders}

En **tvangsstyring** er en aktion, der påtvinger en anden delgrafcet en situation, mens dens trin er
aktivt. Den tvangsstyrede grafcet udvikler sig ikke imens.

| Tvangsstyring | Virkning på G2                       |
| ------------- | ------------------------------------ |
| `G2{8}`       | kun trin 8 er aktivt                 |
| `G2{8, 9}`    | kun trin 8 og 9 er aktive            |
| `G2{*}`       | fastfrosset i sin aktuelle situation |
| `G2{}`        | intet trin er aktivt                 |
| `G2{INIT}`    | tilbage i sin initialsituation       |

Tvangsstyring er standardmåden at beskrive nødstop og skift af driftsform på: en sikkerhedsgrafcet
tvangsstyrer f.eks. produktionsgrafcetten til dens initialsituation. En grafcet kan ikke
tvangsstyre sig selv, og to grafcets kan ikke tvangsstyre hinanden.

## Kontroller {#checks}

GrafcetMaker kontrollerer, at hvert makrotrin og hvert omsluttende trin har sin egen undergrafcet af
den rette type, at ekspansioner har ét indgangstrin og ét udgangstrin, og at tvangsstyringer peger
på eksisterende grafcets og trin.
