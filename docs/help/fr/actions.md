# Actions

Les actions sont les rectangles à droite d'une étape. Elles disent ce que fait le système pendant
que l'étape est active, ou au moment où elle l'est. Sélectionnez une étape et appuyez sur
<kbd>A</kbd> pour en ajouter une ; appuyez de nouveau sur <kbd>A</kbd> sur une action pour ajouter
la suivante. Choisissez son **type** avec les boutons illustrés du panneau **Propriétés** : chacun
montre comment le diagramme dessine ce type.

## Actions continues {#continuous-actions}

Le type le plus courant. Le texte est le nom d'une sortie (ou d'une variable interne), p. ex.
`Pump`. La sortie est vraie **tant que** l'étape est active, et fausse dès qu'aucune étape active
ne la pilote.

Choisissez le type **Conditionnelle** pour ajouter une condition (une _condition d'assignation_) :
son champ apparaît sous les boutons de type, et la sortie est vraie tant que l'étape est active
**et** que la condition est vraie. Elle est dessinée sur un petit trait au-dessus du rectangle.

<!-- figure: continuous | Lamp tant que l'étape 4 est active ; Horn seulement si alarm est aussi vraie -->

Des temporisations dans la condition donnent les actions retardées et limitées dans le temps
d'autres notations :

- `5s/X4` : retardée, la sortie s'active 5 s après l'activation de l'étape 4.
- `/(5s/X4)` : limitée dans le temps, active seulement pendant les 5 premières secondes de
  l'étape 4.

> **Remarque :** les étapes traversées pendant une évolution fugace (voir
> [Les bases du GRAFCET](grafcet-basics.md)) n'exécutent pas leurs actions continues.

## Actions mémorisées {#stored-actions}

Une action mémorisée modifie une valeur **une seule fois**, et la valeur reste jusqu'à ce qu'une
autre action la modifie. Son texte est une affectation : `C := C + 1`, `Motor := 0`,
`Speed := 2.5`. Pour mettre une variable BOOL à TRUE, son nom seul suffit : `Motor` signifie
`Motor := 1`.

- **À l'activation** : exécutée quand l'étape devient active. Dessinée avec une flèche **↑ au-dessus**
  du rectangle.
- **À la désactivation** : exécutée quand l'étape devient inactive. Dessinée avec une flèche
  **↓ en dessous** du rectangle.
- **Sur événement** : exécutée chaque fois que l'**événement** se produit pendant que l'étape est
  active, p. ex. `↑reset`. Dessinée avec un **fanion** en haut à droite, à côté de l'événement.
  Saisissez l'événement dans le panneau Propriétés ; une action sur événement sans événement ne
  s'exécute jamais et est signalée comme problème.

<!-- figure: stored | Mémorisées à l'activation (↑), à la désactivation (↓) et sur événement (fanion) -->

Les actions à l'activation et à la désactivation peuvent aussi avoir une condition : elles ne sont
exécutées que si elle est vraie à cet instant.

Les actions mémorisées sont exécutées même par les étapes seulement traversées pendant une
évolution fugace. Utilisez-les pour compter, pour maintenir une valeur (`Motor := 1` dans une
étape, `Motor := 0` dans une autre) ou pour retenir qu'un événement s'est produit.

## Ordres de forçage {#forcing-orders}

Un ordre de forçage impose une situation à un autre grafcet partiel tant que son étape est active :
`G2{8}` active la seule étape 8 du grafcet G2, `G2{*}` fige G2 dans sa situation courante, `G2{}`
désactive toutes ses étapes et `G2{INIT}` le remet dans sa situation initiale. Il est dessiné avec
un double cadre. Voir [Macro-étapes, étapes encapsulantes et forçage](hierarchy.md).

## Actions sans étape {#actions-without-a-step}

Une action n'a pas forcément d'étape. Sans sélection, appuyez sur <kbd>A</kbd> (ou choisissez
l'outil **Action**) et cliquez sur une zone vide du canevas : l'action est dessinée seule, sans
liaison, et elle est **toujours active**.

- Une action continue sans étape met sa sortie à 1 chaque fois que sa **condition d'assignation**
  est vraie, quelles que soient les étapes : `Lamp` avec la condition `a * b` correspond à la
  logique `Lamp = a · b`. Sans condition, la sortie est toujours vraie.
- Une action mémorisée sur événement s'exécute chaque fois que l'événement se produit, p. ex.
  `C := C + 1` sur `↑pulse` compte les impulsions. À l'activation, elle s'exécute une fois au
  démarrage de la simulation. À la désactivation, elle ne s'exécute jamais, puisque l'action n'est
  jamais désactivée.

Faites glisser une action pour la déplacer : sur une étape pour l'y attacher (l'étape s'éclaire et
une marque indique sa place parmi les actions de l'étape), ou sur une zone vide pour la laisser
sans étape.

## Plusieurs actions {#several-actions}

Une étape peut avoir autant d'actions que nécessaire ; elles sont dessinées côte à côte. Faites-en
glisser une le long de la rangée pour changer leur ordre, ou utilisez
**Déplacer l'action à gauche / à droite** dans le panneau Propriétés, où une étape sélectionnée
liste ses actions en lignes compactes (cliquez sur l'une d'elles pour la déplier). Supprimez une
action avec <kbd>Del</kbd>.

> **Attention :** quand deux étapes qui peuvent être actives ensemble pilotent la même sortie par
> des actions continues, le résultat est difficile à lire. GrafcetMaker vous en avertit.
