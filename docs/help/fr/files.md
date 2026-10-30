# Fichiers, enregistrement et export

Tout se passe sur votre ordinateur : il n'y a pas de compte et rien n'est envoyé.

## Enregistrement automatique et récupération {#autosave-and-recovery}

Chaque modification est conservée dans votre navigateur une demi-seconde après que vous l'avez
faite. Vous pouvez recharger ou fermer l'onglet à tout moment sans confirmation : la prochaine fois
que vous ouvrez GrafcetMaker, votre projet est là tel que vous l'avez laissé, modifications non
enregistrées comprises. Un point `●` à côté du nom du projet signale des modifications pas encore
enregistrées dans un fichier.

**Fichier › Historique local** liste les instantanés conservés dans le navigateur : pris à chaque
enregistrement, toutes les quelques minutes pendant que vous modifiez le projet et avant la
fermeture d'un projet. En restaurer un l'ouvre comme modifications non enregistrées.

> **Important :** le stockage du navigateur appartient à ce navigateur sur cet ordinateur, et
> l'effacement des données du site le supprime. Enregistrez dans un fichier tout ce que vous voulez
> conserver.

## Hors ligne et installation {#offline-and-installation}

Après la première visite, GrafcetMaker fonctionne sans réseau. Utilisez le bouton d'installation
de la barre d'adresse de votre navigateur pour l'obtenir sous forme d'application dans sa propre
fenêtre. Quand une nouvelle version est prête, une carte dans le coin propose de recharger : votre
travail est conservé.

## Enregistrer et ouvrir {#save-and-open}

- **Enregistrer** (<kbd>Ctrl+S</kbd>) écrit le projet dans un fichier `.grafcet.json`. Dans Chrome
  et Edge, il réécrit le même fichier à chaque fois ; dans les autres navigateurs, il télécharge le
  fichier.
- **Enregistrer sous** (<kbd>Ctrl+Shift+S</kbd>) choisit un nouveau fichier.
  **Fichier › Télécharger une copie** en télécharge une sans changer le fichier dans lequel
  Enregistrer écrit.
- **Ouvrir** (<kbd>Ctrl+O</kbd>), **Fichier › Ouvrir un projet récent**, ou déposez un fichier
  `.grafcet.json` n'importe où sur la fenêtre. Si le projet ouvert a des modifications non
  enregistrées, la question vous est d'abord posée, et un fichier invalide est refusé avec une
  explication, sans toucher à votre projet.

Les fichiers `.grafcet.json` sont du texte lisible, bien adapté à la gestion de versions (Git) et
à la revue de code.

Les **fichiers grafcet.io** (`.grafcetio`) s'ouvrent de la même façon : ils sont convertis en un
nouveau projet, avec un grafcet partiel par diagramme (ou par cadre), les variables créées d'après
ce qu'utilisent les diagrammes, et une mise en page soignée. Un message liste tout ce que la
conversion a modifié. Enregistrez pour le conserver comme projet GrafcetMaker ; le fichier
d'origine n'est pas modifié.

## Partager un lien {#share-a-link}

**Fichier › Copier le lien de partage** copie une adresse web qui contient tout le projet,
compressé. Collez-la dans une messagerie, un e-mail ou un ticket : la personne qui l'ouvre obtient
sa propre copie du projet, avec tous ses grafcets et ses variables, et peut la modifier sans
toucher à la vôtre.

- Le projet voyage dans le lien (après le `#`), que les navigateurs n'envoient jamais au serveur
  web : rien n'est envoyé, et les liens fonctionnent aussi hors ligne et sur les installations
  internes.
- Toute personne qui a le lien peut lire le projet : partagez-le comme le fichier lui-même.
- Un lien est un instantané : les modifications ultérieures nécessitent un nouveau lien.
- Les petits grafcets donnent des liens d'un ou deux milliers de caractères. Si GrafcetMaker vous
  avertit qu'un lien est long, certaines messageries risquent de le tronquer ; envoyez plutôt le
  fichier `.grafcet.json`.
- Ouvrir un lien revient à ouvrir un fichier : si votre projet a des modifications non
  enregistrées, la question vous est d'abord posée, et un lien endommagé est refusé avec une
  explication, sans toucher à votre projet.

## Grafcets d’un assistant IA {#charts-from-ai-assistants}

Un assistant IA comme ChatGPT ou Claude peut dessiner un grafcet pour vous. Demandez-lui d’abord
de lire [grafcet.org/ai.txt](https://grafcet.org/ai.txt) : il y apprend le texte GRAFCET, une
forme texte du grafcet, et comment faire un lien qui l’ouvre ici.

- **Un lien de l’assistant** ouvre le grafcet, disposé automatiquement, à la place du projet
  ouvert (après confirmation s’il a des modifications non enregistrées).
- **Fichier › Ouvrir depuis du texte…** ouvre un grafcet que l’assistant a écrit en texte :
  collez-le et cliquez sur **Ouvrir**. Une ligne illisible est indiquée avec le problème ; vous
  pouvez la corriger ou renvoyer le message à l’assistant.
- **Fichier › Copier en texte (pour les assistants IA)** copie votre grafcet en texte GRAFCET,
  à coller dans la conversation pour demander des modifications, une explication ou une relecture.

Les positions ne font pas partie du texte : un grafcet ouvert depuis du texte est disposé
automatiquement.

## Modifier ensemble en direct {#edit-together-live}

**Fichier › Collaboration en direct…** (ou le bouton des personnes en haut à droite) permet à
plusieurs personnes de modifier le même projet en même temps, chacune sur son ordinateur.

1. Tapez votre nom et choisissez **Démarrer une session en direct**. Envoyez aux autres le lien
   qui apparaît.
2. Ils ouvrent le lien, tapent leur nom et choisissent **Rejoindre**.
3. Chacun voit les pointeurs et les sélections des autres avec leur nom, et chaque modification
   apparaît chez tout le monde en un instant.

- Les modifications fusionnent champ par champ : déplacer une étape pendant que quelqu'un la
  renomme conserve les deux.
- **Annuler** ne revient que sur vos propres modifications.
- Pendant que vous simulez, les modifications des autres attendent, pour que le diagramme
  corresponde toujours à votre simulation : **Redémarrer avec les modifications** dans les
  commandes de simulation les intègre.
- Sans connexion, vous pouvez continuer à travailler ; les modifications sont échangées à son
  retour.
- **Quitter la session** conserve le projet sur votre appareil comme votre propre copie.
- Le projet est chiffré de bout en bout avec une clé qui se trouve uniquement dans le lien : toute
  personne qui a le lien peut voir et modifier le projet, partagez-le donc comme le fichier
  lui-même.

## Export {#export}

**Fichier › Exporter…** (<kbd>Ctrl+E</kbd>, ou le bouton **Exporter** en haut à droite) ouvre une
seule boîte de dialogue pour tous les formats, avec un aperçu en direct. Ses réglages sont
mémorisés par projet. **Fichier › Exporter en** l'ouvre directement sur un format donné.

| Format                | Utilisation                                                                                                                    |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| **PDF**               | impression et documentation : vectoriel, A4 ou A3, ajusté à la page ou réparti sur plusieurs feuilles, avec un cartouche       |
| **SVG**               | documents et web : vectoriel, net à toutes les tailles                                                                         |
| **PNG**               | présentations, messageries et tickets : résolution 1×, 2× ou 4×, fond transparent en option                                    |
| **WebP**              | comme PNG, avec des fichiers plus légers                                                                                       |
| **Variables (Excel)** | la table des variables sous forme de classeur `.xlsx`                                                                          |
| **Variables (CSV)**   | la table des variables pour d'autres outils                                                                                    |
| **Texte structuré**   | code automate qui exécute tous les grafcets : IEC 61131-3, Siemens TIA Portal (SCL), Beckhoff TwinCAT 3 ou Allen-Bradley Logix |
| **PLCopen XML**       | import des grafcets dans un outil automate sous forme de programmes SFC                                                        |

Les exports sont en noir sur blanc par défaut ; choisissez **Thème actuel** pour garder les
couleurs de l'écran. Exportez le grafcet courant, la sélection ou tous les grafcets.

**Fichier › Copier le diagramme en PNG / SVG** place la sélection (ou tout le grafcet) dans le
presse-papiers, prête à être collée dans un rapport.

## Code automate {#plc-code}

**Texte structuré** et **PLCopen XML** transforment vos grafcets en code automate. Choisissez
l'automate sous **Automate** :

- **IEC 61131-3** : un bloc fonctionnel (`.st`) pour CODESYS et la plupart des autres outils.
- **Siemens TIA Portal (SCL)** : une source SCL (`.scl`) pour S7-1200/1500. Dans TIA Portal,
  ajoutez-la sous **Sources externes** et choisissez **Générer des blocs à partir de la source**.
- **Beckhoff TwinCAT 3** : un fichier POU (`.TcPOU`). Clic droit sur un dossier du projet
  automate › **Add › Existing Item**.
- **Allen-Bradley Studio 5000** : une routine en texte structuré. Créez les tags listés dans son
  en-tête (portée programme), puis collez le code dans une routine ST. Les temporisations
  utilisent TONR/TOFR, les fronts OSRI/OSFI, et le premier cycle (`S:FS`) fixe les valeurs
  initiales.

Le texte structuré existe en deux styles :

- **CASE par séquence** (par défaut) : une variable INT par séquence contient le numéro de son
  étape active, et un `CASE` liste les transitions de chaque étape
  (`IF receptivity THEN step_G1 := 2;`). Les sorties suivent, une ligne chacune, p. ex.
  `Motor := step_G1 >= 2 AND step_G1 <= 4;`. Les séquences avec branches parallèles gardent un
  BOOL par étape.
- **Un BOOL par étape** : toutes les transitions, puis toutes les étapes, puis les
  temporisations, les fronts et les actions, une fois par cycle automate ; cochez
  **Recherche de stabilité à chaque cycle** pour franchir les chaînes de transitions vraies dans
  un même cycle, comme le fait le GRAFCET.

Une action mémorisée comme `Q1 := 1` à l'activation s'exécute une fois, et Q1 garde sa valeur
après la désactivation de l'étape. Cochez **Maintenir les actions mémorisées à valeur constante**
pour l'affecter plutôt à chaque cycle tant que son étape est active.

Le fichier PLCopen contient un programme SFC par grafcet pour l'import dans les outils
d'ingénierie. L'aperçu liste tout ce que le format ne peut pas exprimer. Relisez toujours le code
généré avant qu'il ne s'exécute sur une machine.

## Paramètres {#settings}

**☰ › Paramètres…** (<kbd>Ctrl+,</kbd>) contient le thème, la notation, l'écran d'accueil,
la grille, les indications et les préférences de simulation, et indique l'espace de stockage du
navigateur utilisé. Vous pouvez y effacer l'historique local et la liste des fichiers récents.

## Langue {#language}

Choisissez la langue avec le drapeau en bas à droite (sur un téléphone, en bas du menu ☰) ; ce
choix est mémorisé sur cet appareil. Chaque langue a aussi sa propre adresse, par
exemple `…/de/` pour l'allemand : un lien s'ouvre ainsi dans la langue dans laquelle il a été
envoyé.
