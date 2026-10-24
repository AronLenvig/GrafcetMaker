# Premiers pas

Dans ce tutoriel, vous dessinez la commande d'une petite cuve : quand l'opérateur appuie sur
**start**, une pompe remplit la cuve jusqu'à ce qu'elle soit pleine (**full**), puis une vanne la
vide jusqu'à ce qu'elle soit vide (**empty**), et le système attend le départ suivant. Comptez une
dizaine de minutes.

<!-- figure: sequence | Le grafcet que vous allez dessiner -->

## 1. Se repérer {#1-find-your-way-around}

- Le **canevas** occupe toute la fenêtre : c'est là que vous dessinez. Tout le reste flotte
  par-dessus, légèrement estompé jusqu'à ce que vous le survoliez, pour que le diagramme reste au
  premier plan.
- **En haut** : le menu principal ☰ et le nom du projet à gauche ; les outils au milieu
  (sélection, déplacement de la vue, placement d'une étape, d'une transition, d'un commentaire ou
  d'une action), terminés par ▶ **Simuler** ; les compteurs de problèmes, **Exporter** et le
  partage à droite.
- **Sous les outils** : les indications montrent ce que vous pouvez faire à l'instant. Suivez-les
  pendant ce tutoriel.
- **À gauche** : les **Propriétés** de l'élément sélectionné apparaissent dans une carte tant
  qu'il est sélectionné.
- **En bas** : le zoom, Annuler et Rétablir à gauche ; un onglet par grafcet au milieu ; les
  boutons **Variables**, **Problèmes**, **Chronogramme** et **Plan** à droite, chacun ouvrant son
  panneau sur la droite de la fenêtre, puis l'aide, l'envoi d'un avis et le drapeau qui change la
  langue.

Un nouveau projet contient déjà le grafcet **G1** avec l'étape **0**. Son double carré indique
qu'il s'agit d'une **étape initiale** : elle est active au démarrage du système.

## 2. Ajouter la première transition et la première étape {#2-add-the-first-transition-and-step}

1. Cliquez sur l'étape **0** pour la sélectionner.
2. Appuyez sur <kbd>Enter</kbd>. Une transition et l'étape **1** apparaissent en dessous, et vous
   saisissez la **réceptivité** de la transition, la condition pour passer à la suite, à l'endroit
   même où elle est dessinée.
3. Tapez `start` et appuyez sur <kbd>Enter</kbd>.

`start` n'est pas encore déclarée : pendant la saisie, l'éditeur indique
**Nouvelle variable start (BOOL, entrée)**, et <kbd>Enter</kbd> l'ajoute à la liste des variables
(un message le confirme).

## 3. Ajouter une action {#3-add-an-action}

L'étape 1 est toujours sélectionnée. Appuyez sur <kbd>A</kbd>, tapez `Pump` et appuyez sur
<kbd>Enter</kbd> : `Pump` est créée comme sortie BOOL. La pompe fonctionne maintenant tant que
l'étape 1 est active.

## 4. Poursuivre la séquence {#4-continue-the-sequence}

1. Appuyez de nouveau sur <kbd>Enter</kbd> : une transition et l'étape **2** sont ajoutées après
   l'étape 1. Tapez `full` comme réceptivité et créez l'entrée.
2. Appuyez sur <kbd>A</kbd> et ajoutez l'action `Valve` (créez la sortie).

> **Astuce :** vous préférez la souris ? Une étape sélectionnée affiche en pointillés des
> **fantômes** de ce qu'ajouteraient <kbd>Enter</kbd> et <kbd>A</kbd> ; cliquez sur l'un d'eux pour
> l'ajouter (voir [Modifier les diagrammes](editing.md#ghosts)).

## 5. Boucler le cycle {#5-close-the-loop}

Le cycle doit revenir à l'étape 0 quand la cuve est vide.

1. L'étape **2** étant sélectionnée, appuyez sur <kbd>L</kbd>. Les indications affichent
   **Clic sur une étape pour y revenir**.
2. Cliquez sur l'étape **0**. Une transition est ajoutée sous l'étape 2, avec une liaison qui
   remonte à l'étape 0, dessinée avec une flèche parce qu'elle va vers le haut.
3. Tapez `empty` comme réceptivité, appuyez sur <kbd>Enter</kbd> et créez l'entrée.

Votre grafcet correspond maintenant à la figure en haut de cette page.

## 6. Vérifier {#6-check-it}

Regardez les compteurs en haut à droite : un cercle rouge compte les **erreurs**, un triangle
orange les **avertissements**. Cliquez dessus pour ouvrir la liste des **Problèmes**. Chaque
problème indique ce qui ne va pas et où ; cliquez dessus pour aller à l'élément, et utilisez le
bouton de correction quand il y en a un. Un grafcet correct n'a aucune erreur. Voir
[Dépannage](troubleshooting.md) pour la signification de chaque message.

## 7. Simuler {#7-simulate}

1. Appuyez sur <kbd>F5</kbd>. Le diagramme est verrouillé et le panneau **Simulation** apparaît à
   gauche. L'étape 0 porte un jeton : elle est active.
2. Dans le panneau, mettez **start** à 1 (ou cliquez sur `start` là où elle est écrite sur le
   diagramme). La transition est franchie : l'étape 1 devient active et son action **Pump**
   affiche une coche ✓.
3. Mettez **start** à 0, puis **full** à 1 : l'étape 2 devient active et **Valve** s'allume.
4. Mettez **full** à 0 et **empty** à 1 : le grafcet revient à l'étape 0.
5. Cliquez sur **Chronogramme** en bas à droite pour voir tous les signaux au cours du temps.
   Appuyez sur <kbd>Shift+F5</kbd> pour arrêter.

Que se passe-t-il si **start** reste à 1 quand la cuve devient vide ? Essayez : dès que l'étape 0
est de nouveau active, sa transition est de nouveau franchie. Le GRAFCET se comporte exactement
comme il est dessiné. Utilisez un front montant `↑start` pour ne réagir qu'à un nouvel appui
(tapez `^start`, voir [Écrire les réceptivités](expressions.md)).

## 8. Enregistrer {#8-save}

Votre travail est enregistré automatiquement dans le navigateur après chaque modification. Pour
obtenir un fichier que vous pouvez conserver, envoyer ou placer sous gestion de versions, appuyez
sur <kbd>Ctrl+S</kbd> : le projet est enregistré sous `<name>.grafcet.json`. Double-cliquez sur le
nom du projet en haut pour le renommer.

## Et ensuite ? {#where-next}

- [Les bases du GRAFCET](grafcet-basics.md) explique les règles qui sous-tendent ce que vous venez
  de voir.
- [Modifier les diagrammes](editing.md) présente les branches parallèles et alternatives et
  d'autres gestes rapides.
- [Simulation](simulation.md) traite des temporisations, du journal d'évolution et des scénarios.
