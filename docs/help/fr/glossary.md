# Glossaire

Les termes normalisés du GRAFCET (IEC 60848) tels qu'ils sont utilisés dans GrafcetMaker.

| Terme                         | Signification                                                                                                               |
| ----------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| **Action**                    | Ce que fait le système en relation avec une étape ; dessinée dans un rectangle à droite de l'étape.                         |
| **Action continue**           | Sortie vraie tant que son étape est active (et que sa condition est vraie).                                                 |
| **Action mémorisée**          | Action exécutée une seule fois (à l'activation, à la désactivation ou sur événement) et dont l'effet dure.                  |
| **Condition d'assignation**   | Condition d'une action continue : la sortie n'est vraie que tant que la condition est vraie elle aussi.                     |
| **Convergence en ET**         | Double trait où se terminent des branches parallèles ; la transition suivante les attend toutes.                            |
| **Convergence en OU**         | Simple trait où des branches alternatives se rejoignent.                                                                    |
| **Divergence en ET**          | Double trait après une transition qui active plusieurs étapes à la fois (branches parallèles).                              |
| **Divergence en OU**          | Simple trait après une étape suivie de plusieurs transitions ; un seul chemin est choisi.                                   |
| **Étape**                     | Une situation stable du système ; dessinée par un carré numéroté.                                                           |
| **Étape active**              | Une étape qui fait partie de la situation courante ; elle porte un jeton en simulation.                                     |
| **Étape encapsulante**        | Étape qui contient un grafcet encapsulé, qui n'évolue que tant que l'étape est active.                                      |
| **Étape initiale**            | Étape active au démarrage ; dessinée par un double carré.                                                                   |
| **Étape instable (fugace)**   | Étape activée et désactivée au cours d'une même recherche de stabilité.                                                     |
| **Événement**                 | Un front ou une autre condition instantanée qui déclenche une action mémorisée sur événement.                               |
| **Expansion**                 | Le grafcet dessiné pour une macro-étape, de son étape d'entrée E à son étape de sortie S.                                   |
| **Franchir (une transition)** | La passer : activer les étapes en aval, désactiver les étapes en amont.                                                     |
| **Franchissable**             | Validée et dont la réceptivité est vraie : la transition va être franchie.                                                  |
| **Front**                     | Changement instantané d'un signal : front montant ↑a (faux → vrai), front descendant ↓a (vrai → faux).                      |
| **Grafcet partiel**           | L'un des grafcets d'un projet ; ils évoluent tous ensemble.                                                                 |
| **Macro-étape**               | Étape qui représente une expansion dessinée sur une feuille à part.                                                         |
| **Ordre de forçage**          | Action qui impose une situation à un autre grafcet partiel, p. ex. `G2{8}`.                                                 |
| **Réceptivité**               | La condition écrite à côté d'une transition.                                                                                |
| **Recherche de stabilité**    | Répétition des règles d'évolution après un changement d'entrée, jusqu'à ce qu'aucune transition ne soit plus franchissable. |
| **Situation**                 | L'ensemble des étapes actives à un instant donné.                                                                           |
| **Temporisation**             | `t/c` : vraie un temps t après que la condition c est devenue vraie, p. ex. `5s/X2`.                                        |
| **Transition**                | Trait entre les étapes ; le grafcet évolue par le franchissement des transitions.                                           |
| **Transition source / puits** | Une transition sans étape en amont / en aval.                                                                               |
| **Transition validée**        | Une transition dont toutes les étapes amont sont actives.                                                                   |
| **Variable d'étape**          | `Xn` : vraie tant que l'étape n est active.                                                                                 |
