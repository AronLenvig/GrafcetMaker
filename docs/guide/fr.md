# Le GRAFCET : cours complet sur la norme IEC 60848

Le **GRAFCET** est un langage graphique qui décrit le comportement d'un système de commande
séquentiel : une machine, une ligne de production, un feu tricolore. Un grafcet est une suite
d'**étapes** (ce que fait le système) reliées par des **transitions** (les conditions pour passer à
la suite). Il est normalisé au niveau international sous la référence **IEC 60848** (en France NF
EN 60848) et il est à l'origine du langage SFC des automates programmables.

Ce cours présente tous les éléments et toutes les règles de la norme, avec des schémas et des
exemples. Tous les schémas ont été dessinés avec [GrafcetMaker](app:), un éditeur et simulateur de
GRAFCET gratuit qui fonctionne dans le navigateur : ouvrez les exemples et regardez-les évoluer pas
à pas.

## Que signifie GRAFCET ?

GRAFCET signifie _GRAphe Fonctionnel de Commande Étape-Transition_. Il a été proposé en 1977 par un
groupe de travail de l'AFCET (Association française pour la cybernétique économique et technique)
avec l'ADEPA (Agence nationale pour le développement de la production automatisée). Inspiré des
réseaux de Petri, il devait permettre d'écrire clairement, indépendamment de la technologie, ce
qu'un système de commande doit faire, avant d'écrire la moindre ligne de programme.

- **1982** : norme française NF C03-190.
- **1988** : norme internationale IEC 848, _Établissement des diagrammes fonctionnels pour systèmes
  de commande_.
- **2002** : IEC 60848 deuxième édition, _Langage de spécification GRAFCET pour diagrammes
  fonctionnels en séquence_.
- **2013** : IEC 60848 troisième édition, l'édition en vigueur, reprise en Europe sous la référence
  EN 60848.

Le GRAFCET est enseigné au lycée technique (STI2D, bac pro MELEC et MSPC), en BTS (CRSA, CIRA,
Électrotechnique), en IUT et en école d'ingénieurs, ainsi que dans de nombreux pays francophones,
germanophones, hispanophones et lusophones. Par convention, le _GRAFCET_ est le langage et un
_grafcet_ est un diagramme écrit dans ce langage.

## Les éléments d'un grafcet

<!-- figure: anatomy | Les éléments d'un grafcet -->

- Une **étape** est un carré numéroté. Elle représente une situation stable du système :
  _attente_, _remplissage_, _perçage_. À chaque instant, une étape est **active** ou **inactive** ;
  l'ensemble des étapes actives forme la **situation** du grafcet. La variable d'étape `X1` est
  vraie tant que l'étape 1 est active.
- Une **étape initiale**, dessinée par un double carré, est active au démarrage. Tout grafcet en
  possède au moins une.
- Une **transition** est un petit trait horizontal qui coupe une liaison. Elle se trouve toujours
  entre des étapes : deux étapes ne sont jamais reliées directement, deux transitions non plus.
- La **réceptivité** est la condition écrite à côté d'une transition, par exemple `dcy` ou
  `pression > 6`. La réceptivité `1` est toujours vraie.
- Les **liaisons orientées** relient étapes et transitions. Elles se lisent de haut en bas ; une
  liaison qui remonte porte une flèche.
- Les **actions** sont des rectangles à droite d'une étape : ce que fait le système tant que
  l'étape est active, par exemple _faire tourner le moteur_.

## Les cinq règles d'évolution

La norme IEC 60848 définit précisément l'évolution d'un grafcet par cinq règles.

1. **Situation initiale** : au démarrage, les étapes initiales sont actives et toutes les autres
   inactives.
2. **Franchissement d'une transition** : une transition est **validée** lorsque toutes les étapes
   immédiatement en amont sont actives. Elle est **franchie** lorsqu'elle est validée et que sa
   réceptivité est vraie.
3. **Évolution des étapes actives** : le franchissement d'une transition active toutes les étapes
   immédiatement en aval et désactive toutes les étapes immédiatement en amont.
4. **Évolutions simultanées** : toutes les transitions franchissables au même instant sont
   franchies simultanément.
5. **Activation et désactivation simultanées** : une étape à la fois activée et désactivée reste
   active.

Lorsqu'une entrée change, les règles sont appliquées de nouveau, avec les mêmes entrées, jusqu'à ce
qu'aucune transition ne soit plus franchissable : c'est la **recherche de stabilité**. Une étape
activée puis désactivée au cours de cette recherche est une **étape instable** (évolution fugace) :
ses actions continues ne sont pas exécutées, mais ses actions mémorisées le sont. Par exemple, si
les réceptivités sous les étapes 1 et 2 sont déjà vraies quand l'étape 1 s'active, le grafcet
traverse l'étape 2 jusqu'à l'étape 3 et les sorties de l'étape 2 ne s'allument jamais.

## Les réceptivités : conditions, fronts et temporisations

Une réceptivité est une expression logique sur les entrées, les variables internes, les variables
d'étape et le temps. Notation usuelle et saisie dans GrafcetMaker :

| Notation      | Signification                                                      | Saisie dans GrafcetMaker |
| ------------- | ------------------------------------------------------------------ | ------------------------ |
| a · b         | a ET b                                                             | `a * b`                  |
| a + b         | a OU b                                                             | `a + b`                  |
| a surligné    | NON a (complément)                                                 | `/a`                     |
| ↑a            | front montant : vrai à l'instant où a devient vrai                 | `↑a` ou `RE a`           |
| ↓a            | front descendant : vrai à l'instant où a devient faux              | `↓a` ou `FE a`           |
| X3            | l'étape 3 est active                                               | `X3`                     |
| 5 s/X2        | vrai 5 s après l'activation de l'étape 2                           | `5s/X2`                  |
| t1/a/t2       | vrai t1 après que a devient vrai, faux t2 après que a devient faux | `2s/a/1s`                |
| [niveau > 80] | comparaison d'une valeur numérique                                 | `niveau > 80`            |
| = 1           | toujours vrai                                                      | `1`                      |

<!-- figure: timer | Une temporisation : le chauffage fonctionne pendant 5 secondes -->

Les fronts sont utiles lorsqu'un signal reste vrai : avec `↑dcy`, le cycle démarre une fois par
appui sur le bouton et pas une seconde fois tant qu'il reste enfoncé. La syntaxe complète de
l'éditeur est décrite dans l'aide [Writing receptivities](app:#help/expressions) (en anglais).

## Les actions

<!-- figure: actions | Actions continue, conditionnelle et mémorisées sur l'étape 4 -->

- Une **action continue** est vraie tant que son étape est active : _Lampe_ est allumée tant que
  l'étape 4 est active.
- Une **action conditionnelle** est une action continue avec une **condition d'assignation** écrite
  au-dessus de son rectangle : _Klaxon_ sonne seulement si l'étape 4 est active **et** que `alarme`
  est vraie.
- Les actions **retardées** et **limitées dans le temps** sont des actions conditionnelles dont la
  condition contient une temporisation : avec `3s/X4`, la sortie s'active 3 s après l'activation de
  l'étape 4 ; avec `/(3s/X4)`, elle n'est active que pendant les 3 premières secondes.
- Une **action mémorisée** affecte une valeur une seule fois, et la valeur reste jusqu'à ce qu'une
  autre action la modifie. Elle s'exécute à l'**activation** de l'étape (flèche vers le haut), à sa
  **désactivation** (flèche vers le bas) ou **sur événement** pendant que l'étape est active (un
  fanion avec l'événement, ici `↑raz`). Les compteurs comme `C := C + 1` sont des actions
  mémorisées typiques.

Une sortie pilotée par des actions continues suit les étapes automatiquement. Une sortie mise à 1
par une action mémorisée le reste jusqu'à ce qu'une autre action mémorisée la remette à 0 : prévoyez
où cela se produit.

## Séquences, aiguillages et parallélisme

### Choisir un chemin : la divergence en OU

Lorsqu'une étape est suivie de plusieurs transitions, le grafcet prend le chemin dont la
réceptivité est vraie : c'est un **aiguillage** ou sélection de séquence, dessiné avec un simple
trait horizontal (**divergence en OU**). Les chemins se rejoignent sur un simple trait
(**convergence en OU**).

<!-- figure: or | Divergence et convergence en OU : une branche ou l'autre -->

Rendez les réceptivités **exclusives**, c'est-à-dire jamais vraies en même temps, comme `a` et
`/a * b` ici. Sinon, les deux transitions sont franchies ensemble (règle 4) et les deux branches
deviennent actives. GrafcetMaker vous avertit lorsqu'il ne peut pas prouver que des réceptivités
en OU sont exclusives.

### Faire plusieurs choses en même temps : la divergence en ET

Lorsqu'une transition est suivie de plusieurs étapes, elles sont toutes activées ensemble : ce sont
des **séquences simultanées** (parallélisme), dessinées avec un double trait (**divergence en
ET**). Les branches se terminent aussi sur un double trait (**convergence en ET**) : la transition
située dessous n'est validée que lorsque la dernière étape de chaque branche est active. Elle
attend donc la fin de toutes les branches : c'est la **synchronisation**.

<!-- figure: and | Divergence et convergence en ET : percer et serrer en même temps -->

### Reprises, sauts, transitions source et puits

- Une **reprise de séquence** (boucle) revient à une étape précédente par une liaison qui remonte,
  avec une flèche : c'est la façon habituelle de répéter un cycle.
- Un **saut d'étapes** est une divergence en OU dont une branche mène directement à une étape plus
  loin, par exemple pour sauter une opération facultative.
- Une **transition source** n'a pas d'étape en amont. Elle est toujours validée et donc franchie
  chaque fois que sa réceptivité est vraie ; utilisez un front comme `↑a`.
- Une **transition puits** n'a pas d'étape en aval : son franchissement désactive seulement les
  étapes en amont.

## Structurer une application

Les machines réelles sont décrites par plusieurs grafcets qui fonctionnent ensemble.

- Les **grafcets partiels** décrivent chacun une partie du système, par exemple le cycle de
  production, les modes de marche et d'arrêt (GEMMA) et la sécurité. Ils évoluent en même temps et
  voient les étapes des autres grâce aux variables d'étape `Xn`. Ensemble, ils forment le grafcet
  global.
- Une **macro-étape** représente une séquence détaillée dessinée à part, son **expansion**.
  L'expansion possède une étape d'entrée **E** et une étape de sortie **S**. Le franchissement de la
  transition au-dessus de la macro-étape active l'étape E ; la transition sous la macro-étape est
  validée lorsque l'étape S est active.
- Une **étape encapsulante** contient un ou plusieurs grafcets complets qui n'existent que tant
  qu'elle est active. À son activation, les étapes encapsulées marquées d'un astérisque deviennent
  actives ; à sa désactivation, toutes les étapes encapsulées sont désactivées.
- Un **ordre de forçage**, dessiné dans un rectangle d'action à double cadre, impose une situation à
  un autre grafcet : `G2{8}` force G2 avec la seule étape 8 active, `G2{*}` fige G2 dans sa
  situation courante et `G2{}` désactive toutes ses étapes. Un grafcet forcé ne peut pas évoluer de
  lui-même. Le forçage est la manière normalisée de décrire l'arrêt d'urgence et l'initialisation.

<!-- figure: macro | Une macro-étape : deux traits horizontaux dans le carré -->

## GRAFCET et SFC

Le langage SFC (Sequential Function Chart) de la norme IEC 61131-3 est dérivé du GRAFCET et lui
ressemble beaucoup, mais les deux n'ont pas le même rôle.

|            | GRAFCET (IEC 60848)                                                          | SFC (IEC 61131-3)                                            |
| ---------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Rôle       | Spécification : le comportement attendu, indépendamment de la technologie    | Langage de programmation exécuté par l'automate              |
| Évolution  | Toutes les transitions franchissables à la fois, puis recherche de stabilité | En général une évolution par cycle automate, selon le modèle |
| Actions    | Continues, conditionnelles, retardées, limitées dans le temps, mémorisées    | Qualificatifs N, S, R, P, P0, P1, L, D, SD, DS et SL         |
| Hiérarchie | Grafcets partiels, macro-étapes, étapes encapsulantes, ordres de forçage     | Par la structure du programme                                |

En pratique, on écrit et on vérifie d'abord le GRAFCET, puis on le traduit en SFC, en ladder (LD)
ou en texte structuré (ST). GrafcetMaker génère du texte structuré et du PLCopen TC6 XML à partir
d'un grafcet, comme point de départ ; relisez toujours le code généré avant de l'utiliser.

## Exemples

### Feu tricolore avec bouton piéton

<!-- figure: example-trafficLight | Feu tricolore : temporisations et demande mémorisée -->

L'étape 0 donne le vert aux piétons pendant 10 s (`10s/X0`), puis l'étape 1 laisse passer les
voitures. Elles gardent le vert pendant 30 s, mais un appui sur le bouton piéton réduit ce temps à
10 s : l'appui est mémorisé par une action sur l'événement `↑request` et oublié quand l'étape 0
redevient active. L'étape 2 allume l'orange pendant 3 s. (Les variables de l'exemple sont en
anglais.)

### Poste de perçage avec compteur de pièces

<!-- figure: example-drillingStation | Poste de perçage : cycle d'usinage et maintenance toutes les 100 pièces -->

Un cycle d'usinage : serrer la pièce, descendre le foret, remonter, desserrer. Le serrage est mis à
1 et à 0 par des actions mémorisées, et l'étape 4 compte les pièces. Après l'étape 4, une
divergence en OU aux réceptivités exclusives revient au départ, ou passe en maintenance toutes les
100 pièces.

L'éditeur propose deux autres exemples, un remplissage de cuve avec des entrées numériques et un
convoyeur en parallèle avec un grafcet de sécurité qui force la ligne : ouvrez-les depuis l'écran
d'accueil de [GrafcetMaker](app:).

## Dessiner et simuler un GRAFCET en ligne

[GrafcetMaker](app:) est un éditeur de GRAFCET gratuit et open source, conçu pour les
automaticiens, les enseignants et les élèves. Il fonctionne entièrement dans le navigateur, hors
ligne et sans compte ; vos grafcets restent sur votre ordinateur.

- Dessinez étapes, transitions, actions et branches à la souris ou au clavier, avec une mise en page
  automatique.
- Écrivez les réceptivités avec l'autocomplétion et une table des variables, et obtenez des erreurs
  claires avec des corrections rapides.
- Simulez selon les règles de l'IEC 60848 : étapes actives, temporisations, fronts, étapes
  instables, forçage et chronogramme de toutes les variables.
- Structurez vos projets avec des grafcets partiels, des macro-étapes, des étapes encapsulantes et
  des ordres de forçage.
- Exportez en PDF avec cartouche, en SVG et PNG, ou en texte structuré et PLCopen TC6 XML, et
  partagez un projet complet par un simple lien.

L'interface de l'éditeur est en anglais ; les grafcets, eux, s'écrivent dans votre langue.

[Ouvrir l'éditeur de GRAFCET gratuit](app:)

## Questions fréquentes

### À quoi sert le GRAFCET ?

À spécifier le comportement des systèmes automatisés séquentiels : machines, lignes d'assemblage,
conditionnement, procédés par lots, ascenseurs, feux de circulation. Le grafcet est la référence
commune de ceux qui conçoivent la machine, programment l'automate et la mettent en service.

### Le GRAFCET et le SFC, est-ce la même chose ?

Non. Le SFC (IEC 61131-3) est dérivé du GRAFCET et utilise les mêmes symboles, mais le GRAFCET est
un langage de spécification aux règles d'évolution précises, alors que le SFC est un langage de
programmation dont l'exécution dépend de l'automate. Voir [GRAFCET et SFC](#grafcet-et-sfc).

### Quelle est la différence entre une étape et une transition ?

Une étape est une situation qui dure (le système remplit la cuve) ; une transition est l'instant où
le système passe d'une situation à la suivante, quand sa réceptivité devient vraie (la cuve est
pleine).

### Que signifie X1 ?

`X1` est la variable d'étape de l'étape 1 : elle est vraie tant que l'étape 1 est active. On
l'utilise dans les réceptivités, dans les conditions d'actions et dans les autres grafcets, par
exemple `5s/X1` ou `X1 * /X5`.

### Qu'est-ce qu'une étape instable ?

Une étape activée puis désactivée au cours d'une même recherche de stabilité, parce que la
réceptivité située dessous était déjà vraie. Ses actions continues ne sont pas exécutées ; ses
actions mémorisées le sont.

### Comment traduire un GRAFCET en programme automate ?

Chaque étape devient un bit mémoire, chaque transition une condition qui active les étapes en aval
et désactive les étapes en amont, et les sorties sont écrites à partir des bits d'étape. Vous
pouvez le faire à la main en ladder ou en texte structuré, utiliser le langage SFC de votre
automate, ou laisser GrafcetMaker générer du texte structuré ou du PLCopen XML comme point de
départ.

### Existe-t-il un logiciel GRAFCET gratuit ?

Oui : [GrafcetMaker](app:) est gratuit et open source (licence MIT). Il fonctionne dans tout
navigateur récent sous Windows, macOS, Linux, sur tablette et sur téléphone, et les entreprises
peuvent l'héberger sur leur propre réseau.
