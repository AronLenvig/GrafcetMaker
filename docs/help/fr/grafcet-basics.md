# Les bases du GRAFCET

Le GRAFCET (IEC 60848) décrit le comportement d'un système séquentiel (une machine, un procédé, un
feu tricolore) sous la forme d'une suite d'**étapes** reliées par des **transitions**. C'est le
langage de spécification dont est issu le langage SFC des automates programmables (IEC 61131-3).

<!-- figure: anatomy | Les éléments d'un grafcet -->

## Étapes {#steps}

Une **étape** est une situation stable du système : _attente_, _remplissage_, _perçage_. Elle est
dessinée par un carré portant son numéro. À chaque instant, une étape est soit **active**, soit
**inactive** ; l'ensemble des étapes actives forme la **situation** du grafcet.

- Une **étape initiale** (double carré) est active au démarrage du système. Un grafcet en possède
  au moins une.
- La variable `X3` est vraie tant que l'étape 3 est active. Vous pouvez l'utiliser dans les
  réceptivités et les conditions.

## Transitions et réceptivités {#transitions-and-receptivities}

Une **transition** (petit trait horizontal) relie des étapes. Sa **réceptivité**, écrite à côté,
est la condition pour passer à la suite : une entrée (`start`), une combinaison (`start * /door`),
un front (`↑b`), une temporisation (`5s/X2`) ou une comparaison (`level >= 80`). La réceptivité
`1` est toujours vraie.

- Une transition est **validée** lorsque toutes les étapes immédiatement en amont sont actives.
- Une transition validée est **franchie** dès que sa réceptivité est vraie.

## Actions {#actions}

Les rectangles à droite d'une étape sont ses **actions** : ce que fait le système tant que l'étape
est active, par exemple _faire tourner la pompe_. Une **action continue** nomme une sortie qui est
vraie tant que l'étape est active. Les actions mémorisées modifient une valeur une seule fois, à
l'activation ou à la désactivation d'une étape, ou quand un événement se produit. Voir
[Actions](actions.md).

## Les cinq règles d'évolution {#the-five-evolution-rules}

Ces règles de l'IEC 60848 déterminent l'évolution d'un grafcet. Le simulateur les applique
exactement.

1. **Situation initiale** : au démarrage, les étapes initiales sont actives.
2. **Condition de franchissement** : une transition est franchie lorsqu'elle est validée et que sa
   réceptivité est vraie.
3. **Franchissement** : le franchissement d'une transition active toutes les étapes immédiatement
   en aval et désactive toutes les étapes immédiatement en amont.
4. **Franchissements simultanés** : toutes les transitions franchissables au même instant sont
   franchies simultanément.
5. **Activation et désactivation simultanées** : une étape à la fois activée et désactivée reste
   active.

Après un changement d'entrée, les règles sont appliquées encore et encore jusqu'à ce qu'aucune
transition ne soit plus franchissable : c'est la **recherche de stabilité**. Les étapes activées
puis quittées au cours de cette recherche sont **instables** (évolution fugace) : leurs actions
continues ne sont pas exécutées, mais leurs actions mémorisées le sont.

## Choisir un chemin : OU {#choosing-between-paths-or}

Lorsqu'une étape est suivie de plusieurs transitions, le grafcet prend le chemin dont la
réceptivité est vraie : c'est une **branche alternative**, dessinée avec un simple trait
horizontal (**divergence en OU**). Les chemins se rejoignent sur un simple trait (**convergence en
OU**).

<!-- figure: or | Divergence et convergence en OU -->

Rendez les réceptivités **exclusives** (jamais vraies en même temps), ici `a` et `/a * b`. Sinon,
les deux chemins seraient pris à la fois. GrafcetMaker vous avertit lorsqu'il ne peut pas prouver
que des réceptivités alternatives sont exclusives, et propose de donner la priorité à une branche.

## Faire plusieurs choses en même temps : ET {#doing-things-at-the-same-time-and}

Lorsqu'une transition est suivie de plusieurs étapes, elles sont toutes activées ensemble : ce sont
des **branches parallèles**, dessinées avec un double trait (**divergence en ET**). Les branches se
terminent aussi sur un double trait (**convergence en ET**) : la transition située dessous n'est
validée que lorsque la dernière étape de chaque branche est active ; elle attend donc la fin de
toutes les branches.

<!-- figure: and | Divergence et convergence en ET -->

## Reprises de séquence {#loops}

Une liaison qui remonte, dessinée avec une flèche, revient à une étape précédente : c'est la façon
habituelle de répéter un cycle. Appuyez sur <kbd>L</kbd> sur une étape, puis cliquez sur l'étape à
laquelle revenir.

## Applications plus grandes {#bigger-applications}

- Un projet peut contenir plusieurs **grafcets partiels** qui évoluent ensemble, par exemple un
  pour le cycle et un pour la sécurité. Ils voient les étapes des autres grâce à `Xn`.
- Une **macro-étape** représente une séquence détaillée dessinée sur une feuille à part, son
  **expansion**.
- Une **étape encapsulante** contient un grafcet complet qui n'évolue que tant qu'elle est active.
- Un **ordre de forçage** impose une situation à un autre grafcet, par exemple lors d'un arrêt
  d'urgence.

Voir [Macro-étapes, étapes encapsulantes et forçage](hierarchy.md).

## En savoir plus {#learn-more}

- [Écrire les réceptivités](expressions.md) : la syntaxe complète des expressions.
- [Glossaire](glossary.md) : tous les termes normalisés réunis.
- L'interprétation exacte de chaque règle dans GrafcetMaker est documentée dans
  `docs/semantics.md` du dépôt des sources (en anglais).
