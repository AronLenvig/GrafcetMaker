# Macro-étapes, étapes encapsulantes et forçage

Les grandes applications sont plus faciles à lire quand elles sont découpées. Le GRAFCET offre
trois outils pour cela, tous disponibles dans GrafcetMaker.

## Plusieurs grafcets partiels {#several-partial-grafcets}

Un projet peut contenir plusieurs **grafcets partiels**, un par onglet, p. ex.
_G1_ pour le cycle de production et _G2_ pour la logique de sécurité. Ils évoluent tous en même
temps et peuvent s'observer les uns les autres grâce aux variables d'étape (`X21` dans G1 est vraie
tant que l'étape 21 de G2 est active).

- Cliquez sur **+** à côté des onglets pour en ajouter un. Ses numéros d'étape commencent à la
  dizaine libre suivante (20, 30…), pour que les références `Xn` restent sans ambiguïté.
- Double-cliquez sur un onglet (ou appuyez sur <kbd>F2</kbd> dessus) pour le renommer ;
  faites-le glisser latéralement pour changer l'ordre ; appuyez sur <kbd>Del</kbd> dessus pour le
  supprimer. <kbd>Ctrl</kbd>+clic ou <kbd>Shift</kbd>+clic choisit plusieurs onglets pour les
  supprimer ensemble. Cliquez avec le bouton droit sur un onglet pour plus d'options. Quand les
  onglets sont nombreux, ils défilent avec la molette de la souris ou les boutons ‹ ›.

## Macro-étapes {#macro-steps}

Une **macro-étape** représente une séquence détaillée dessinée sur une feuille à part, son
**expansion**. Elle est dessinée comme une étape avec deux traits horizontaux.

<!-- figure: macro | Une macro-étape dans la séquence principale -->

1. Sélectionnez une étape et réglez son **Type** sur _Macro-étape_ dans le panneau Propriétés (ou
   **Édition › Convertir en macro-étape**).
2. Un nouvel onglet s'ouvre avec l'expansion : une étape d'entrée **E** et une étape de sortie
   **S** reliées par une transition. Dessinez la séquence détaillée entre les deux.
3. Double-cliquez sur la macro-étape (ou appuyez sur <kbd>Alt+↓</kbd>) pour ouvrir son expansion ;
   <kbd>Alt+↑</kbd> revient à la macro-étape.

Quand la macro-étape est activée, son étape d'entrée devient active ; la transition qui suit la
macro-étape n'est validée que lorsque l'étape de sortie est active. La macro-étape compte comme
active tant qu'une étape de son expansion l'est.

## Étapes encapsulantes {#enclosing-steps}

Une **étape encapsulante** contient un grafcet complet, le **grafcet encapsulé**, qui n'évolue que
tant que l'étape encapsulante est active. Utilisez-la pour les modes : _automatique_, _manuel_,
_réglage_. Elle est dessinée comme une étape avec deux traits verticaux.

1. Réglez le **Type** de l'étape sur _Étape encapsulante_ (ou
   **Édition › Convertir en étape encapsulante**).
2. Un nouvel onglet contient le grafcet encapsulé. Les étapes marquées d'un `*` y deviennent
   actives quand l'étape encapsulante est activée.
3. Quand l'étape encapsulante est quittée, toutes les étapes du grafcet encapsulé sont
   désactivées.

Les onglets des expansions et des grafcets encapsulés portent un badge **M** ou **E**.

## Ordres de forçage {#forcing-orders}

Un **ordre de forçage** est une action qui impose une situation à un autre grafcet partiel tant
que son étape est active. Pendant ce temps, le grafcet forcé n'évolue pas.

| Ordre      | Effet sur G2                          |
| ---------- | ------------------------------------- |
| `G2{8}`    | seule l'étape 8 est active            |
| `G2{8, 9}` | seules les étapes 8 et 9 sont actives |
| `G2{*}`    | figé dans sa situation courante       |
| `G2{}`     | aucune étape n'est active             |
| `G2{INIT}` | retour à sa situation initiale        |

Le forçage est la manière normalisée de décrire les arrêts d'urgence et les changements de mode :
par exemple, un grafcet de sécurité force le grafcet de production dans sa situation initiale. Un
grafcet ne peut pas se forcer lui-même, et deux grafcets ne peuvent pas se forcer mutuellement.

## Vérifications {#checks}

GrafcetMaker vérifie que chaque macro-étape et chaque étape encapsulante a son propre
sous-grafcet du bon type, que les expansions ont une étape d'entrée et une étape de sortie, et que
les ordres de forçage désignent des grafcets et des étapes qui existent.
