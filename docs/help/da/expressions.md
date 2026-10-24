# Skriv transitionsbetingelser

Transitionsbetingelser, betingelser for aktioner og hændelser er logiske udtryk. Du skriver dem i
almindelig ASCII; diagrammet viser dem i lærebogsnotation (IKKE som en streg over, OG som `·`). Slå
**Vis › Lærebogsnotation** fra for at se præcis det, du skrev.

## Operatorer {#operators}

| Betydning          | Skriv         | Accepteres også                       | Vises som           |
| ------------------ | ------------- | ------------------------------------- | ------------------- |
| OG                 | `a * b`       | `a AND b`, `a && b`, `a · b`          | a · b               |
| ELLER              | `a + b`       | `a OR b`, `a \|\| b`                  | a + b               |
| IKKE               | `/a`          | `NOT a`, `!a`, `¬a`                   | a med en streg over |
| Stigende flanke    | `↑a`          | `RE a` (skriver du `^a`, får du `↑a`) | ↑a                  |
| Faldende flanke    | `↓a`          | `FE a`                                | ↓a                  |
| Altid sand / falsk | `1` / `0`     | `TRUE` / `FALSE`                      | 1 / 0               |
| Parenteser         | `(a + b) * c` |                                       | (a + b) · c         |

IKKE binder stærkest, derefter OG og så ELLER: `a + b * /c` betyder `a + (b * (/c))`. Brug
parenteser, når du er i tvivl.

## Stigende og faldende flanker {#rising-and-falling-edges}

En flanke er kun sand i det øjeblik, dens operand ændrer sig: **↑a** (stigende flanke, _P-trigger_),
når `a` går fra falsk til sand, **↓a** (faldende flanke, _N-trigger_), når den går fra sand til
falsk. Brug den til at reagere én gang på et tryk på en knap, uanset hvor længe knappen holdes
nede.

<!-- figure: edges | Lampen lyser fra et tryk på knappen, til den slippes -->

Tre måder at skrive en flanke på:

- Skriv `^` foran navnet: `^start` bliver til `↑start`, mens du skriver.
- Stil tekstmarkøren på et navn, og tryk på <kbd>Alt+↑</kbd> for en stigende flanke eller
  <kbd>Alt+↓</kbd> for en faldende flanke. Tryk igen for at fjerne flanken, eller på den anden for
  at bytte den om.
- Klik på **↑** eller **↓** i symbollinjen, der vises over feltet, mens du redigerer en
  transitionsbetingelse.

`RE a` og `FE a` accepteres også. Flanker virker også på trinvariabler: `↑X3` er sand, når trin 3
bliver aktivt.

## Trinvariabler {#step-variables}

`X3` er sand, mens trin 3 er aktivt. I et projekt med flere grafcets henviser `X3` til trin 3 i den
samme grafcet eller til projektets eneste trin 3. Brug den til at synkronisere grafcets, f.eks. for
at vente på, at en anden grafcet når et bestemt trin.

## Timere {#timers}

`5s/X2` er sand 5 sekunder efter, at `X2` blev sand, og falsk igen, så snart `X2` er falsk:
typisk »5 s efter, at trin 2 blev aktiveret«.

<!-- figure: timer | Varmelegemet kører i 5 s -->

- Enheder: `ms`, `s`, `min`, `h`, f.eks. `500ms/X4`, `2min/start`.
- Operanden kan være en hvilken som helst betingelse: `3s/(a * b)`.
- `2s/a/5s` er sand 2 s efter, at `a` blev sand, og forbliver sand indtil 5 s efter, at `a` blev
  falsk.

## Sammenligninger {#comparisons}

Numeriske variabler (INT, REAL, TIME) sammenlignes med `=`, `<>`, `<`, `<=`, `>`, `>=` og kan bruge
`+`, `-`, `*`, `/` og `MOD` inde i sammenligningen: `level >= 80`, `C = 3`, `T1 > 2s`,
`(a + b) / 2 < limit`. En sammenligning er en betingelse: når du kombinerer den med andre, så sæt
den i parentes, som i `start * (C < 10)`. Uden parentes ville `start * C < 10` sammenligne
`start * C` med 10.

## Tildelinger i lagrede aktioner {#assignments-in-stored-actions}

Lagrede aktioner indeholder en tildeling: `C := C + 1`, `Motor := 1`, `Speed := 2.5`,
`Done := FALSE`. Se [Aktioner](actions.md).

## Hjælp, mens du skriver {#help-while-you-type}

- **Forslag**: begynd at skrive et navn, og vælg en variabel eller et trin (`X…`) med piletasterne
  og derefter <kbd>Enter</kbd> eller <kbd>Tab</kbd>. Resten af det fremhævede navn vises med gråt
  efter markøren; <kbd>Tab</kbd> eller <kbd>→</kbd> accepterer det.
- **Tomt felt**: den første variabel i tabellen, som endnu ikke bruges, vises med gråt (en indgang
  for en transitionsbetingelse, en udgang for en aktion); <kbd>Tab</kbd> accepterer den.
- **Problemer**: en boks under feltet forklarer, hvad der er galt, understreger hvor og tilbyder
  rettelser: **Brug Start** ved et fejlstavet navn. Et nyt navn annonceres (_Ny variabel start:
  BOOL indgang_) og erklæres, når du bekræfter.
- **Symbollinje**: knapper til ↑ ↓ IKKE OG ELLER, parenteser (de omslutter den markerede tekst) og
  en skabelon til en timer.

Du kan altid bekræfte et udtryk med et problem: det vises med rød understregning på diagrammet og
står i **Problemer**, indtil du retter det.
