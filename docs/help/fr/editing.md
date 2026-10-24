# Modifier les diagrammes

GrafcetMaker est conçu pour que vous placiez rarement quoi que ce soit à la main : sélectionnez un
élément et appuyez sur une touche, et les nouveaux éléments sont numérotés, reliés et positionnés
pour vous. Les indications sous la barre d'outils, en haut du canevas, listent les touches
utilisables avec la sélection en cours.

## Les touches essentielles {#the-essential-keys}

| Touche                               | Avec une étape sélectionnée                                                | Avec une transition sélectionnée                         |
| ------------------------------------ | -------------------------------------------------------------------------- | -------------------------------------------------------- |
| <kbd>Enter</kbd>                     | ajouter une transition et une étape en dessous, puis saisir la réceptivité | ajouter une étape en dessous                             |
| <kbd>A</kbd>                         | ajouter une action                                                         | —                                                        |
| <kbd>P</kbd>                         | ajouter une branche parallèle (ET)                                         | ajouter une étape de plus qu'elle active                 |
| <kbd>O</kbd>                         | ajouter une branche alternative (OU)                                       | ajouter une transition alternative (dérivation)          |
| <kbd>L</kbd> puis clic sur une étape | revenir à cette étape (reprise de séquence)                                | relier à cette étape (si elle ne mène encore nulle part) |
| <kbd>F2</kbd> ou double-clic         | modifier le numéro                                                         | modifier la réceptivité                                  |
| <kbd>R</kbd>                         | —                                                                          | pivoter : de haut en bas ou de droite à gauche           |
| <kbd>Del</kbd>                       | supprimer et reconnecter la séquence                                       | supprimer                                                |

Une transition orientée **de droite à gauche** a un trait vertical : la liaison venant de l'étape
précédente arrive par la droite et la liaison vers l'étape suivante part par la gauche, avec des
flèches. Cliquez n'importe où sur le trait, le numéro ou la réceptivité d'une transition pour la
sélectionner.

Sans sélection, <kbd>Enter</kbd> poursuit la séquence à partir de sa dernière étape.
<kbd>Enter</kbd> sur une étape qui a déjà une suite insère la nouvelle transition et la nouvelle
étape, et décale vers le bas tout ce qui se trouve en dessous.

Pendant que vous modifiez une réceptivité ou une action, <kbd>Shift+Enter</kbd> la valide et
ouvre la suivante : la réceptivité suivante dans la séquence (une nouvelle transition et une
nouvelle étape à sa fin), ou l'action suivante de l'étape (une nouvelle après la dernière). Tapez
ainsi toute une séquence, ou toute une rangée d'actions, d'un seul trait.

## Fantômes {#ghosts}

Une étape sélectionnée affiche en pointillés des **fantômes** de ce qu'ajouteraient <kbd>A</kbd> et
<kbd>Enter</kbd> : une action après sa dernière action et, en fin de séquence, une transition et
une étape avec le numéro qu'elle recevra. Une transition qui ne mène nulle part affiche une étape
fantôme. Cliquez sur un fantôme pour l'ajouter. Une nouvelle étape ajoutée depuis son fantôme est
sélectionnée, comme si vous aviez cliqué dessus : son propre fantôme est donc à un clic ; saisissez
les réceptivités plus tard (<kbd>F2</kbd> ou double-clic), ou utilisez <kbd>Enter</kbd> pour les
saisir une à une au fur et à mesure. Avec un outil de placement, un fantôme sous le pointeur montre
ce qu'un clic va placer.

## Souris {#mouse}

- Un **clic** sélectionne ; <kbd>Shift</kbd>+clic ou <kbd>Ctrl</kbd>+clic ajoute à la sélection ou
  en retire ; glisser sur une zone vide sélectionne avec un cadre ; <kbd>Ctrl+A</kbd> sélectionne
  tout.
- **Glisser** déplace (avec aimantation à la grille), les flèches décalent (<kbd>Shift</kbd> pour
  aller plus loin).
- **Double-cliquez** sur un élément pour modifier son texte ; double-cliquez sur une zone vide pour
  y ajouter une étape.
- **Cliquez avec le bouton droit** sur un élément pour voir ce que vous pouvez en faire (ajouter
  une action, des branches, une reprise, le modifier, le convertir en macro-étape, couper, copier,
  supprimer…), sur la sélection, ou sur une zone vide (y ajouter une étape, coller, mise en page
  automatique, renuméroter, ajuster). La touche menu l'ouvre pour la sélection.
- Une transition dont la réceptivité n'est pas encore écrite affiche un **?** gris (double-cliquez
  dessus ou appuyez sur <kbd>F2</kbd>) ; la liste des problèmes la compte jusqu'à ce que vous en
  saisissiez une.
- **Poignées de liaison** : une étape ou une transition sélectionnée ou survolée affiche des
  poignées rondes. Faites-en glisser une : seules les cibles valides (une étape vers une
  transition, une transition vers une étape) sont mises en surbrillance. Relâchez sur une zone vide
  pour y créer l'élément manquant.
- Cliquez sur une **liaison** pour la sélectionner ; <kbd>Del</kbd> supprime seulement cette
  liaison. Faites glisser latéralement une liaison montante (une reprise) pour déplacer son trait
  latéral, ou faites glisser son trait du bas vers le haut ou le bas ; double-cliquez dessus pour
  revenir au tracé automatique. Automatiquement, une reprise passe sous les étapes et les liaisons
  de sa propre séquence au lieu de les croiser.

## Tactile : téléphones et tablettes {#touch-phones-and-tablets}

- **Toucher** sélectionne. **Faites glisser** un élément pour le déplacer ; faites glisser le
  canevas vide pour déplacer la vue ; **pincez** avec deux doigts pour zoomer.
- **Touchez deux fois** un élément pour modifier son texte, ou le canevas vide pour y ajouter une
  étape.
- **Maintenez, puis glissez** sur le canevas vide pour sélectionner tout ce qui se trouve dans un
  cadre.
- Avec une sélection, une **barre d'outils** en bas du canevas fait ce que font les touches sur un
  ordinateur : **Étape** (une transition et une étape en dessous), **Action**, branches
  **Parallèle** et **Choix**, **Reprise**, **Modifier**, **Détails** (les propriétés) et
  **Supprimer**.
- Une étape ou une transition sélectionnée affiche ses **poignées de liaison** juste au-dessus et
  en dessous : faites-en glisser une vers une cible en surbrillance, ou vers une zone vide pour
  créer l'élément manquant.
- Avec un outil choisi (étape, transition, commentaire, action), **touchez** l'endroit où placer
  l'élément.

Sur un téléphone, l'écran est organisé pour une seule main : les outils, Annuler et Rétablir sont
en bas, le menu (☰) contient Fichier, Édition, Affichage, Simulation et Aide, et les panneaux
(propriétés, variables, problèmes, simulation, chronogramme, plan) s'ouvrent dans un panneau
coulissant par-dessus le diagramme avec le bouton des panneaux en bas à droite. Faites glisser la
poignée de ce panneau pour l'agrandir ou le réduire.

## Outils {#tools}

La barre d'outils en haut de la fenêtre contient les outils (la lettre de chaque bouton est sa
touche) : **Sélection** (<kbd>V</kbd>), **Déplacer la vue** (<kbd>H</kbd>), **Étape**
(<kbd>S</kbd>), **Transition** (<kbd>T</kbd>), **Commentaire** (<kbd>C</kbd>) et **Action**
(<kbd>Shift+A</kbd>). Avec un outil de placement, cliquez sur une zone vide pour placer un
élément ; maintenez <kbd>Shift</kbd> pour en placer plusieurs. <kbd>Esc</kbd> revient à
Sélection. L'outil Action ajoute aussi une action à une étape quand vous cliquez sur l'étape.

## Branches et structures {#branches-and-structures}

Les divergences et les convergences ne se dessinent jamais à la main ; elles découlent des
liaisons.

- <kbd>O</kbd> sur une étape ajoute une autre transition aval avec sa propre étape : une
  **divergence en OU**.
- <kbd>P</kbd> sur une étape ajoute une étape en parallèle, lancée par la même transition et
  rejointe par la suivante : une **divergence en ET** et une **convergence en ET**.
- Relier une deuxième étape à une transition crée une convergence en ET ; relier une deuxième
  transition à une étape crée une convergence en OU.
- **Édition › Transition source au-dessus de l'étape / Transition puits sous l'étape** ajoute une
  transition sans étape en amont ou en aval.

## Mettre en ordre {#tidy-up}

- **Édition › Mise en page automatique du grafcet** place toutes les étapes en rangées, centre les
  branches sous leur divergence et fait passer les reprises sur le côté.
  **Mise en page automatique de la sélection** fait de même pour la sélection seulement. La mise
  en page n'a jamais lieu d'elle-même et peut être annulée.
- **Édition › Renuméroter les étapes** numérote les étapes dans l'ordre du flux et met à jour
  toutes les références `Xn` et tous les ordres de forçage.

## Annuler, copier et coller {#undo-copy-and-paste}

- <kbd>Ctrl+Z</kbd> annule, <kbd>Ctrl+Shift+Z</kbd> ou <kbd>Ctrl+Y</kbd> rétablit. Un glissement
  entier compte pour une seule annulation ; le menu Édition indique ce qui sera annulé.
- <kbd>Ctrl+C</kbd>, <kbd>Ctrl+X</kbd>, <kbd>Ctrl+V</kbd> fonctionnent entre grafcets, projets et
  onglets du navigateur. Les étapes collées sont renumérotées si leurs numéros sont déjà pris, et
  les variables qu'elles utilisent sont copiées avec elles.

## Naviguer {#navigate}

- Faites défiler pour déplacer la vue ; <kbd>Ctrl</kbd>+molette ou le pincement pour zoomer ;
  <kbd>Space</kbd>+glisser ou le bouton du milieu de la souris déplacent aussi la vue.
- <kbd>Shift+1</kbd> ajuste à tout le grafcet, <kbd>Shift+2</kbd> à la sélection,
  <kbd>Shift+0</kbd> revient à 100 %.
- <kbd>Ctrl+K</kbd> ouvre la palette de commandes : tapez n'importe quelle commande ou un nom de
  grafcet.

## Commentaires et noms {#comments-and-names}

- Les commentaires (outil <kbd>C</kbd>) sont des notes libres sur le diagramme ; le simulateur les
  ignore.
- Les libellés d'étape (panneau Propriétés) sont de courtes descriptions affichées à gauche de
  l'étape.
- Double-cliquez sur le nom du projet en haut pour renommer le projet, et sur un onglet de grafcet
  pour renommer le grafcet.

## Deux grafcets à la fois {#two-grafcets-at-once}

Appuyez sur <kbd>Ctrl+\</kbd> (ou **Affichage › Vue partagée**) pour afficher un second grafcet à
côté du premier, ou cliquez avec le bouton droit sur un onglet et choisissez **Ouvrir à côté** ou
**Ouvrir en dessous**. Chaque volet a son propre sélecteur de grafcet en haut. Cliquez dans un
volet pour y travailler : son en-tête est mis en évidence, et les onglets, le clavier et le panneau
Propriétés le suivent. Faites glisser la barre entre les volets pour les redimensionner ; × ferme
un volet.

## Propriétés et panneaux {#properties-and-panels}

Le diagramme occupe toute la fenêtre ; le reste flotte par-dessus et s'affiche quand il le faut.
Sélectionnez un élément et ses **propriétés** apparaissent dans une carte à gauche : le type d'une
étape ou d'une action se choisit avec des boutons illustrés qui montrent son symbole. Le × de la
carte la masque pour cette sélection ; sans sélection, le bouton des propriétés à côté du nom du
projet affiche le grafcet et le projet. Les panneaux **Variables**, **Problèmes**,
**Chronogramme** et **Plan** s'ouvrent depuis les boutons en bas à droite, dans une carte à droite
que vous pouvez élargir par son bord gauche. Pendant la simulation, le panneau de simulation
(entrées, valeurs, journal, scénarios) flotte à gauche.
