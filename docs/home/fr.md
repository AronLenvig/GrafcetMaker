# GrafcetMaker : éditeur et simulateur de GRAFCET gratuit en ligne

GrafcetMaker dessine, vérifie et simule des grafcets (IEC 60848) dans le navigateur, et les
traduit en code automate. Il s'adresse aux automaticiens, aux enseignants et aux étudiants : gratuit
et open source (licence MIT), sans compte, et il fonctionne hors ligne.

GrafcetMaker est une application web : il fonctionne dans tout navigateur récent avec JavaScript
activé. Le GRAFCET est nouveau pour vous ? Lisez le [cours GRAFCET](fr/guide/), aussi en [anglais](en/guide/), en [allemand](de/guide/), en [espagnol](es/guide/), en [danois](da/guide/), en [suédois](sv/guide/), en [portugais](pt/guide/), en [polonais](pl/guide/), en [russe](ru/guide/), en [chinois](zh/guide/) et en [hindi](hi/guide/).

## Pour les assistants IA

Les assistants IA comme ChatGPT et Claude peuvent dessiner un grafcet pour vous et vous le donner sous forme de lien qui l’ouvre ici. Assistant, lisez [ai.txt](ai.txt) pour savoir comment faire. Dans GrafcetMaker, **Fichier › Ouvrir depuis du texte…** ouvre un grafcet écrit par un assistant, et **Fichier › Copier en texte** le lui renvoie.

## Ce que vous pouvez faire

- **Dessiner** des étapes, des transitions, des réceptivités et des actions à la souris ou au
  clavier (<kbd>Enter</kbd> prolonge une séquence), avec des divergences en OU et en ET, des
  reprises de séquence, des transitions source et puits et des commentaires. La mise en page
  automatique range un grafcet à la demande.
- **Vérifier** le grafcet pendant que vous dessinez : la syntaxe et les types de chaque
  réceptivité, les variables inconnues, les numéros d'étape en double, les étapes inaccessibles, les
  impasses, les divergences en OU non exclusives, les évolutions fugaces sans fin possibles et les
  sorties pilotées depuis des branches parallèles. La plupart des problèmes ont une correction en
  un clic.
- **Simuler** selon les règles d'évolution de l'IEC 60848 : jetons dans les étapes actives,
  transitions validées, entrées à cliquer ou à saisir, temporisations, fronts, étapes instables,
  forçage entre grafcets, chronogramme de chaque variable, et scénarios à enregistrer et rejouer.
- **Structurer** les grandes applications avec des grafcets partiels, des macro-étapes et leurs
  expansions, des étapes encapsulantes et des ordres de forçage.
- **Exporter** en PDF (A4 ou A3, avec cartouche, sur plusieurs pages si besoin), SVG, PNG et WebP,
  la table des variables vers Excel et CSV, et générer du Structured Text ou du PLCopen XML.
- **Travailler à plusieurs** en direct à partir d'un lien : chacun voit les pointeurs et les
  modifications des autres en temps réel, chiffrés de bout en bout.

## Éléments du GRAFCET pris en charge

| Élément     | Ce que GrafcetMaker prend en charge                                                                                   |
| ----------- | --------------------------------------------------------------------------------------------------------------------- |
| Étapes      | étapes et étapes initiales, macro-étapes avec leur expansion, étapes encapsulantes ; variables d'étape `X1`           |
| Transitions | réceptivités avec ET, OU, NON, fronts montants ↑ et descendants ↓, temporisations comme `5s/X1`, comparaisons         |
| Structures  | séquences, divergences et convergences en OU et en ET, reprises et sauts de séquence, transitions source et puits     |
| Actions     | continues, conditionnelles, mémorisées à l'activation, à la désactivation ou sur événement ; forçage `G2{8}`, `G2{*}` |
| Variables   | entrées, sorties et variables internes BOOL, INT, REAL et TIME, avec adresses et commentaires                         |
| Notation    | saisie en ASCII (`a*/b`, `RE a`), affichée en notation usuelle (barre pour NON, ↑ et ↓) ou telle que saisie           |

## Simulation

Le simulateur suit les règles d'évolution de l'IEC 60848. Les étapes initiales sont actives au
départ. Une transition est validée quand toutes les étapes qui la précèdent sont actives, et elle
est franchie quand sa réceptivité est vraie : les étapes suivantes deviennent actives et les étapes
précédentes inactives. Toutes les transitions franchissables sont franchies simultanément, et une
étape à la fois activée et désactivée reste active.

Après chaque changement des entrées, le simulateur recherche la stabilité : il franchit des
transitions jusqu'à ce qu'aucune ne soit franchissable. Les étapes traversées en chemin (étapes
instables) n'exécutent pas leurs actions continues, mais leurs actions mémorisées s'exécutent. Le
temps est virtuel : un grafcet s'exécute en temps réel, plus vite, ou une évolution à la fois, et un
chronogramme enregistre chaque variable.

## Export et code automate

| Format            | Pour                                                                      | S'ouvre dans                                                                                                                                                                           |
| ----------------- | ------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF               | impression et documentation : vectoriel, A4 ou A3, avec cartouche         | tout lecteur PDF                                                                                                                                                                       |
| SVG, PNG, WebP    | rapports, présentations et pages web, aussi copiés dans le presse-papiers | Word, PowerPoint, navigateurs et éditeurs d'images                                                                                                                                     |
| Variables         | la table des variables en Excel ou CSV, et retour                         | Excel, LibreOffice et autres tableurs                                                                                                                                                  |
| Structured Text   | code automate pour chaque grafcet (IEC 61131-3)                           | CODESYS et la plupart des outils IEC 61131-3, Siemens TIA Portal (source SCL pour S7-1200/1500), Beckhoff TwinCAT 3 (fichier POU), Allen-Bradley Studio 5000 (routine Structured Text) |
| PLCopen XML (TC6) | les grafcets sous forme de programmes SFC                                 | outils d'ingénierie automate qui importent le PLCopen XML                                                                                                                              |
| Fichier projet    | tout le projet en `.grafcet.json` lisible                                 | GrafcetMaker                                                                                                                                                                           |

Le Structured Text existe en deux styles : un `CASE` par séquence, comme on l'écrit à la main, ou un
BOOL par étape. Le code généré est un point de départ : relisez-le avant qu'il pilote une machine.

## Exemples

Six projets d'exemple s'ouvrent depuis l'écran d'accueil de l'éditeur :

- **Feu tricolore** avec bouton piéton : temporisations et demande mémorisée.
- **Poste de perçage** : un cycle d'usinage avec compteur de pièces et maintenance toutes les 100
  pièces.
- **Remplissage de cuve** : entrées numériques et comparaisons.
- **Convoyeur en parallèle** : branches parallèles, avec un grafcet de sécurité qui force la ligne.
- **Ligne d'embouteillage** : une macro-étape, trois postes en parallèle, contrôle et compteurs.
- **Modes de marche** : une étape encapsulante, une pause qui fige le cycle et un arrêt d'urgence.

Le [cours GRAFCET](fr/guide/#exemples) dessine les deux premiers et les ouvre dans l'éditeur.

## Questions fréquentes

### GrafcetMaker est-il gratuit ? Y a-t-il des limites ?

Oui, il est gratuit et open source sous licence MIT. Il n'y a ni version payante, ni période
d'essai, ni limite au nombre de projets, de grafcets ou d'étapes.

### Faut-il créer un compte ou installer quelque chose ?

Non. Ouvrez la page et commencez à dessiner ; il n'y a pas de compte. Vous pouvez aussi
l'installer depuis le navigateur comme une application, pour le lancer comme un programme de
bureau.

### Fonctionne-t-il hors ligne ?

Oui. Après la première visite, tout ce dont il a besoin est stocké dans le navigateur : il démarre
et fonctionne sans réseau. Seule la collaboration en direct demande une connexion.

### Où sont stockés mes grafcets ?

Sur votre ordinateur. Les projets sont enregistrés automatiquement dans le navigateur, et dans les
fichiers `.grafcet.json` que vous enregistrez. Rien n'est envoyé et l'application ne fait aucun
suivi. Les sessions en direct sont chiffrées de bout en bout avec une clé qui ne figure que dans
le lien.

### Sur quels navigateurs et appareils fonctionne-t-il ?

Les dernières versions de Chrome, Edge, Firefox et Safari, sous Windows, macOS, Linux, sur
tablettes et téléphones. Les téléphones ont une mise en page adaptée aux petits écrans, et les
écrans tactiles des gestes et des poignées plus grandes.

### Quelle norme suit-il ?

Le GRAFCET tel que défini par l'IEC 60848 (NF EN 60848 en France). Le code généré suit
l'IEC 61131-3.

### Peut-il ouvrir les fichiers d'autres logiciels GRAFCET ?

GrafcetMaker ouvre les fichiers de grafcet.io (`.grafcetio`) et les convertit en projet. Les
tables de variables s'importent depuis Excel et CSV.

### Mon entreprise peut-elle l'héberger sur son propre réseau ?

Oui. GrafcetMaker est un ensemble de fichiers statiques que tout serveur web peut servir, sous
n'importe quel chemin et sans accès à Internet. Une image Docker avec nginx est fournie.
