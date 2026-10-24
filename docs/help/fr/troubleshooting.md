# Dépannage

GrafcetMaker vérifie votre projet pendant que vous travaillez. Les compteurs en haut à droite
indiquent le nombre d'**erreurs** (en rouge) et d'**avertissements** (en orange) ; cliquez dessus
pour ouvrir la liste des **Problèmes**. Cliquez sur un problème pour aller à l'élément, et utilisez
son bouton de correction quand il y en a un. Les éléments qui ont un problème portent aussi un
badge sur le diagramme : survolez-le pour voir les détails.

## Erreurs {#errors}

**Le grafcet G1 n'a pas d'étape initiale.** Rien ne peut jamais devenir actif. Sélectionnez la
première étape et appliquez la correction **Rendre l'étape … initiale**, ou réglez son Type sur
_Étape initiale_.

**Plusieurs étapes portent le même numéro.** Les numéros doivent être uniques dans un grafcet,
sinon `Xn` serait ambigu. Utilisez **Renuméroter les étapes** ou changez un numéro avec
<kbd>F2</kbd>.

**Réceptivité vide.** Chaque transition a besoin d'une condition. Utilisez `1` pour une transition
toujours vraie (la correction le fait pour vous).

**Variable inconnue.** Le nom n'est pas déclaré (un fichier écrit ailleurs, ou une variable
supprimée). Les noms que vous tapez dans une réceptivité ou une action sont créés pour vous ; pour
les autres, utilisez la correction pour créer la variable, ou choisissez le nom suggéré s'il
s'agit d'une faute de frappe.

**Problèmes d'expression** (caractère inattendu, parenthèse manquante…). L'encadré sous le champ
marque la position et donne une indication. Un cas fréquent : `/` signifie NON devant une
condition, écrivez donc `a * /b` pour « a et non b ». Voir
[Écrire les réceptivités](expressions.md).

**Une action affecte une entrée.** Les entrées viennent du procédé et ne peuvent pas être écrites.
Changez la direction de la variable ou utilisez une autre variable.

**Un ordre de forçage vise un grafcet ou une étape qui n'existe pas.** Vérifiez le nom du grafcet
et les numéros d'étape dans l'ordre.

## Avertissements {#warnings}

**L'étape … ne peut jamais devenir active.** Aucun chemin n'y mène depuis une étape initiale.
Reliez-la, ou supprimez-la.

**L'étape … n'a pas de transition aval.** Une fois active, elle le reste pour toujours. En général,
il manque une reprise de séquence (<kbd>L</kbd>).

**Les branches alternatives ne sont pas exclusives.** Les deux réceptivités peuvent être vraies en
même temps, ce qui activerait les deux branches. Rendez-les exclusives, p. ex. `a` et `/a * b`, ou
utilisez la correction **Donner la priorité à …**.

**Évolution fugace sans fin possible.** Toutes les transitions d'une boucle pourraient être vraies
à la fois, et le grafcet ne se stabiliserait jamais. Ajoutez une condition qui ne peut pas rester
vraie, souvent un front (`↑start`).

**Sortie pilotée par des actions continues d'étapes qui peuvent être actives en même temps.** Deux
branches parallèles pilotent la même sortie. Pilotez-la depuis un seul endroit, ou utilisez des
actions mémorisées.

**Une action sans étape est mémorisée à la désactivation.** Sans étape, l'action est toujours
active et jamais désactivée : elle ne s'exécute donc jamais. Attachez-la à une étape, ou changez
son type.

**Sortie pilotée par une action sans étape et par une autre action.** La sortie est vraie dès que
l'une d'elles l'est. Vérifiez que c'est bien ce que vous voulez.

**Mémorisée sur événement, mais sans événement.** Saisissez l'événement (p. ex. `↑b`) dans le
panneau Propriétés.

**L'expansion doit avoir exactement une étape d'entrée et une étape de sortie.** Dans une
expansion de macro-étape, l'étape d'entrée n'a pas de transition en amont et l'étape de sortie n'en
a pas en aval.

## Information {#information}

**La variable … n'est pas utilisée.** Elle est déclarée, mais aucune expression ne l'utilise.
Supprimez-la avec la correction, ou gardez-la pour plus tard.

## Autres questions {#other-questions}

**La simulation s'est arrêtée sur une évolution fugace sans fin.** Voir l'avertissement ci-dessus :
le simulateur s'arrête après 1000 itérations sans stabilité, à l'instant indiqué.

**Ma temporisation n'avance pas.** Les temporisations n'avancent que pendant que l'horloge tourne :
appuyez sur <kbd>F5</kbd> pour la lancer, ou sur <kbd>F10</kbd> pour sauter à la prochaine
temporisation.

**Une transition est franchie encore et encore.** Si sa réceptivité reste vraie, le grafcet tourne
aussi vite que possible. Utilisez un front `↑a` pour ne réagir qu'une fois par appui.

**J'ai perdu mon travail.** Regardez dans **Fichier › Historique local** : des instantanés sont
conservés dans le navigateur. Après un rechargement ou un plantage, GrafcetMaker rouvre
automatiquement votre dernier projet, modifications non enregistrées comprises.

**Le fichier ne s'ouvre pas.** Seuls les fichiers `.grafcet.json` enregistrés par GrafcetMaker
peuvent être ouverts. Un fichier enregistré par une version plus récente nécessite cette version
plus récente.
