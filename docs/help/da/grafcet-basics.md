# Grundlæggende GRAFCET

GRAFCET (IEC 60848) beskriver opførslen af et sekventielt system – en maskine, en proces, et
trafiklys – som en række **trin** forbundet af **transitioner**. Det er specifikationssproget bag
PLC'ernes SFC-sprog (IEC 61131-3).

<!-- figure: anatomy | Elementerne i en grafcet -->

## Trin {#steps}

Et **trin** er en stabil situation i systemet: _venter_, _fylder_, _borer_. Det tegnes som en
firkant med sit nummer. På ethvert tidspunkt er et trin enten **aktivt** eller **inaktivt**;
mængden af aktive trin er grafcettens **situation**.

- Et **initialtrin** (dobbelt firkant) er aktivt, når systemet starter. En grafcet skal have mindst
  ét.
- Variablen `X3` er sand, mens trin 3 er aktivt. Du kan bruge den i transitionsbetingelser og
  betingelser.

## Transitioner og transitionsbetingelser {#transitions-and-receptivities}

En **transition** (kort vandret streg) forbinder trin. Dens **transitionsbetingelse**, der står ved
siden af den, er betingelsen for at gå videre: en indgang (`start`), en kombination
(`start * /door`), en flanke (`↑b`), en timer (`5s/X2`) eller en sammenligning (`level >= 80`).
Transitionsbetingelsen `1` er altid sand.

- En transition er **frigivet**, når alle trinnene lige over den er aktive.
- En frigivet transition **skifter**, så snart dens transitionsbetingelse er sand.

## Aktioner {#actions}

Rektanglerne til højre for et trin er dets **aktioner**: det, systemet gør, mens trinnet er aktivt,
f.eks. _kør pumpen_. En **kontinuerlig aktion** angiver en udgang, der er sand, mens trinnet er
aktivt. Lagrede aktioner ændrer en værdi én gang: når et trin aktiveres eller deaktiveres, eller
når en hændelse indtræffer. Se [Aktioner](actions.md).

## De fem udviklingsregler {#the-five-evolution-rules}

Disse regler fra IEC 60848 bestemmer, hvordan en grafcet udvikler sig. Simulatoren anvender dem
nøjagtigt.

1. **Initialsituation**: ved start er initialtrinnene aktive.
2. **Betingelse for skift**: en transition skifter, når den er frigivet, og dens
   transitionsbetingelse er sand.
3. **Skift**: når en transition skifter, aktiveres alle trinnene lige under den, og alle trinnene
   lige over den deaktiveres.
4. **Samtidigt skift**: alle transitioner, der kan skifte på samme tid, skifter på samme tid.
5. **Aktiveret og deaktiveret på én gang**: et trin, der aktiveres og deaktiveres på samme tid,
   forbliver aktivt.

Efter en ændring af indgangene anvendes reglerne igen og igen, indtil ingen transition kan skifte:
det er **søgningen efter stabilitet**. Trin, der aktiveres og forlades igen under denne søgning, er
**ustabile** (transiente): deres kontinuerlige aktioner udføres ikke, men det gør deres lagrede
aktioner.

## Vælg mellem veje: ELLER {#choosing-between-paths-or}

Når et trin efterfølges af flere transitioner, tager grafcetten den vej, hvis
transitionsbetingelse er sand: en **alternativ forgrening**, tegnet med en enkelt vandret linje
(**ELLER-forgrening**). Vejene samles igen på en enkelt linje (**ELLER-sammenføring**).

<!-- figure: or | ELLER-forgrening og -sammenføring -->

Gør transitionsbetingelserne **gensidigt udelukkende** (de kan aldrig være sande samtidig), her `a`
og `/a * b`. Ellers ville begge veje blive taget på én gang. GrafcetMaker advarer dig, når den ikke
kan bevise, at alternative transitionsbetingelser udelukker hinanden, og tilbyder at give én gren
forrang.

## Gør flere ting på samme tid: OG {#doing-things-at-the-same-time-and}

Når en transition efterfølges af flere trin, aktiveres de alle sammen: **parallelle grene**, tegnet
med en dobbeltlinje (**OG-forgrening**). Grenene slutter også på en dobbeltlinje
(**OG-sammenføring**): transitionen under den er kun frigivet, når det sidste trin i hver gren er
aktivt, så den venter på, at alle grene bliver færdige.

<!-- figure: and | OG-forgrening og -sammenføring -->

## Tilbageføringer {#loops}

En forbindelse, der går opad, tegnet med en pil, vender tilbage til et tidligere trin: den
almindelige måde at gentage en cyklus på. Tryk på <kbd>L</kbd> på et trin, og klik derefter på det
trin, der skal føres tilbage til.

## Større applikationer {#bigger-applications}

- Et projekt kan indeholde flere **delgrafcets**, der kører sammen, f.eks. én til cyklussen og én
  til sikkerheden. De ser hinandens trin via `Xn`.
- Et **makrotrin** står for en detaljeret sekvens, der tegnes på sit eget ark, dets **ekspansion**.
- Et **omsluttende trin** indeholder en hel grafcet, der kun kører, mens trinnet er aktivt.
- En **tvangsstyring** påtvinger en anden grafcet en situation, f.eks. ved et nødstop.

Se [Makrotrin, omsluttende trin og tvangsstyring](hierarchy.md).

## Læs mere {#learn-more}

- [Skriv transitionsbetingelser](expressions.md) – den fulde syntaks for udtryk.
- [Ordliste](glossary.md) – alle standardbegreber samlet ét sted.
- Den nøjagtige fortolkning af hver regel i GrafcetMaker er dokumenteret i `docs/semantics.md` i
  kildekodens repository.
