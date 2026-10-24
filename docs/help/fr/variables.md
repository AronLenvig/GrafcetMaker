# Variables

Chaque nom utilisé dans une réceptivité ou une action est une **variable** du projet. La déclarer
lui donne un type et une direction, permet à GrafcetMaker de vérifier vos expressions et au
simulateur de proposer les bonnes commandes.

## Sortes de variables {#kinds-of-variables}

- **Direction** : une **entrée** vient du procédé (capteurs, boutons) et ne peut qu'être lue ; une
  **sortie** commande le procédé (moteurs, voyants) ; une variable **interne** est une mémoire ou
  un compteur.
- **Type** : `BOOL` (vrai / faux), `INT` (nombre entier), `REAL` (nombre décimal) ou `TIME`
  (durée, p. ex. `500ms`, `3s`).
- **Valeur initiale** : la valeur au début d'une simulation (FALSE ou 0 si vide).
- **Adresse** et **commentaire** : texte libre, p. ex. une adresse automate `%I0.0` et la
  description du signal.

Les noms ne distinguent pas majuscules et minuscules, utilisent des lettres, des chiffres et `_`,
et ne peuvent être ni des mots réservés (`AND`, `OR`, `NOT`, `RE`, `FE`, `TRUE`, `FALSE`, `MOD`,
`INIT`) ni ressembler à une variable d'étape (`X12`).

## Créer des variables {#creating-variables}

- Pendant la saisie d'une expression, un nom inconnu propose
  **Nouvelle variable nom (BOOL, entrée)** (ou sortie, selon l'endroit où vous l'utilisez). C'est
  le moyen le plus rapide.
- **Ajouter une variable** dans la liste ou la table des variables.
- **Importer** une liste depuis Excel ou CSV (voir plus bas).

## La table des variables {#the-variable-table}

Le bouton **Variables** en bas à droite ouvre les variables sur la droite de la fenêtre : une
liste compacte (recherche, filtres, regroupement par direction ; cliquez sur une variable pour la
modifier et voir où elle est utilisée). Élargissez le panneau par son bord gauche et il devient la
table, avec tous les champs en colonnes. Modifiez n'importe quelle cellule sur place
(<kbd>Enter</kbd> ou quitter la cellule valide, <kbd>Esc</kbd> rétablit), triez en cliquant sur un
en-tête de colonne, filtrez par texte, direction et type. La table reste rapide avec des milliers
de variables.

La colonne **Utilisations** compte les expressions qui utilisent chaque variable ; une variable
inutilisée affiche `0` en orange. Cliquez sur le nombre pour ouvrir la variable dans la carte des
propriétés : modifiez tous ses champs et voyez **où elle est utilisée** ; cliquez sur une
utilisation pour aller à cette réceptivité ou à cette action sur le diagramme.

Le bouton balai à côté de **⋯** supprime d'un coup toutes les variables inutilisées (son badge
indique combien) : celles qu'aucune réceptivité, action ou condition n'utilise et qu'aucun scénario
ne pilote. Une seule annulation suffit pour revenir en arrière (<kbd>Ctrl+Z</kbd>). Cette commande
se trouve aussi dans la palette de commandes : **Supprimer les variables inutilisées**.

Sur un téléphone, le panneau Variables est une liste compacte : recherche, filtres (**Entrées**,
**Sorties**, **Internes**), regroupement par direction, et un toucher ouvre une variable avec ses
utilisations.

## Renommer {#renaming}

Renommer une variable met à jour toutes les réceptivités, actions et conditions qui l'utilisent,
dans tous les grafcets, en une seule modification annulable.

## Excel et CSV {#excel-and-csv}

Utilisez le menu **⋯** de la liste ou de la table des variables, ou **Fichier › Variables** :

- **Exporter les variables en Excel** écrit un classeur `.xlsx` avec un en-tête figé, des filtres
  et des listes déroulantes pour le type et la direction.
- **Exporter les variables en CSV** écrit un fichier texte pour d'autres outils.
- **Importer des variables** lit un fichier `.xlsx` ou `.csv` (vous pouvez aussi le déposer sur la
  fenêtre).

Les colonnes sont `name`, `type`, `direction`, `initial`, `address` et `comment` (dans n'importe
quel ordre ; seules `name` et `type` sont obligatoires). Avant toute modification, vous voyez
combien de variables seront ajoutées, mises à jour ou rejetées, avec la raison de chaque rejet. Les
variables sont associées par leur nom ; celles qui ne figurent pas dans le fichier sont conservées.
L'import est une seule modification annulable.

> **Astuce :** pour préparer une liste dans Excel, commencez par exporter : vous obtenez les bonnes
> colonnes et les listes déroulantes, puis remplissez les lignes et réimportez le fichier.
