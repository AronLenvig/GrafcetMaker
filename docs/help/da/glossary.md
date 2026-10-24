# Ordliste

De standardiserede GRAFCET-begreber (IEC 60848), som de bruges i GrafcetMaker.

| Begreb                        | Betydning                                                                                                          |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| **Aktion**                    | Det, systemet gør i forbindelse med et trin; tegnes i et rektangel til højre for trinnet.                          |
| **Aktivt trin**               | Et trin, der er en del af den aktuelle situation; det har et mærke under simulering.                               |
| **Delgrafcet**                | En af projektets grafcets; de kører alle sammen.                                                                   |
| **Ekspansion**                | Den grafcet, der tegnes for et makrotrin, fra dets indgangstrin E til dets udgangstrin S.                          |
| **ELLER-forgrening**          | Enkelt linje efter et trin, der efterfølges af flere transitioner; én vej vælges.                                  |
| **ELLER-sammenføring**        | Enkelt linje, hvor alternative grene samles igen.                                                                  |
| **Flanke**                    | Øjeblikkelig ændring af et signal: stigende flanke ↑a (falsk → sand), faldende flanke ↓a (sand → falsk).           |
| **Frigivet transition**       | En transition, hvis foregående trin alle er aktive.                                                                |
| **Hændelse**                  | En flanke eller en anden øjeblikkelig betingelse, der udløser en lagret aktion ved hændelse.                       |
| **Initialtrin**               | Trin, der er aktivt ved start; tegnes som en dobbelt firkant.                                                      |
| **Kan skifte**                | Frigivet og med en sand transitionsbetingelse: transitionen vil skifte.                                            |
| **Kilde- / dræntransition**   | En transition uden trin over sig / under sig.                                                                      |
| **Kontinuerlig aktion**       | Udgang, der er sand, mens dens trin er aktivt (og dens betingelse er sand).                                        |
| **Lagret aktion**             | Aktion, der udføres én gang – ved aktivering, ved deaktivering eller ved en hændelse – og hvis virkning varer ved. |
| **Makrotrin**                 | Trin, der står for en ekspansion, som tegnes på sit eget ark.                                                      |
| **OG-forgrening**             | Dobbeltlinje efter en transition, der aktiverer flere trin på én gang (parallelle grene).                          |
| **OG-sammenføring**           | Dobbeltlinje, hvor parallelle grene slutter; den næste transition venter på dem alle.                              |
| **Omsluttende trin**          | Trin, der indeholder en omsluttet grafcet, som kun kører, mens trinnet er aktivt.                                  |
| **Situation**                 | Mængden af aktive trin på et givet tidspunkt.                                                                      |
| **Skifte (om en transition)** | Passere den: aktivere trinnene under den og deaktivere trinnene over den.                                          |
| **Søgning efter stabilitet**  | Gentagelse af udviklingsreglerne efter en ændring af indgangene, indtil ingen transition kan skifte.               |
| **Tildelingsbetingelse**      | Betingelse for en kontinuerlig aktion: udgangen er kun sand, mens betingelsen også er opfyldt.                     |
| **Timer**                     | `t/c`: sand en tid t efter, at betingelsen c blev sand, f.eks. `5s/X2`.                                            |
| **Transition**                | Streg mellem trin; grafcetten udvikler sig ved, at transitioner skifter.                                           |
| **Transitionsbetingelse**     | Betingelsen, der står ved siden af en transition.                                                                  |
| **Trin**                      | En stabil situation i systemet; tegnes som en nummereret firkant.                                                  |
| **Trinvariabel**              | `Xn`: sand, mens trin n er aktivt.                                                                                 |
| **Tvangsstyring**             | Aktion, der påtvinger en anden delgrafcet en situation, f.eks. `G2{8}`.                                            |
| **Ustabilt (transient) trin** | Trin, der aktiveres og deaktiveres under én og samme søgning efter stabilitet.                                     |
