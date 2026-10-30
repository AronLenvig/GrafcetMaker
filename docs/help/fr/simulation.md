# Simulation

Le simulateur exécute votre grafcet exactement selon les règles de l'IEC 60848 : vous pouvez ainsi
le tester avant qu'il n'arrive dans un automate.

## Démarrer et arrêter {#start-and-stop}

Appuyez sur <kbd>F5</kbd> (ou **Simulation › Démarrer la simulation**). Le diagramme est
verrouillé, les commandes de simulation remplacent les outils en haut, le panneau **Simulation**
apparaît à gauche (repliez-le avec son chevron pour voir une plus grande partie du diagramme) et
l'horloge démarre. <kbd>Shift+F5</kbd> arrête la simulation et revient à l'édition.

## Modifier les entrées {#change-inputs}

Le panneau **Simulation** liste les entrées :

- Les entrées **BOOL** ont un interrupteur et un bouton **Maintenir** pour un appui fugitif (comme
  un bouton poussoir ; au clavier, maintenez <kbd>Space</kbd> dessus).
- Les entrées **INT**, **REAL** et **TIME** ont un champ de valeur.

Vous pouvez aussi **cliquer sur une entrée BOOL là où elle est écrite** dans une réceptivité ou une
condition du diagramme (ou la toucher du doigt) : elle passe à 1 ou à 0. Le grafcet évolue dès
qu'une entrée change.

Pendant la simulation, chaque variable **INT**, **REAL** ou **TIME** écrite dans une réceptivité ou
une condition affiche sa valeur courante dans un petit cadre au-dessus de son nom, et une action
mémorisée affiche sous son cadre la valeur de la variable qu'elle écrit. **Cliquez sur une valeur**
(ou touchez-la) pour en saisir une nouvelle, puis appuyez sur <kbd>Enter</kbd> (<kbd>Escape</kbd>
annule). Cela vaut pour les entrées comme pour les variables internes et les sorties, par exemple
pour essayer un compteur près de sa limite.

**Pointez une transition** (ou touchez-la) pour voir ce qu'elle attend : les étapes qui doivent
d'abord être actives, ou les termes de sa réceptivité encore faux, avec le temps restant d'une
temporisation comme `10s/X0`. Un front comme `↑start` est toujours listé : il n'est vrai qu'à
l'instant où son entrée change.

## Temps {#time}

Le temps du simulateur est virtuel et déterministe.

- <kbd>F5</kbd> met l'horloge en pause et la relance. Les temporisations (`5s/X2`) n'avancent que
  pendant qu'elle tourne.
- La vitesse va de ×0.25 à ×10. **Rapide** saute directement d'une échéance de temporisation à la
  suivante.
- <kbd>F10</kbd> saute à la prochaine échéance de temporisation et exécute ce cycle.
- **⟲** redémarre depuis la situation initiale.

La barre affiche le temps, le numéro du cycle et l'échéance de la prochaine temporisation. La
vitesse par défaut se règle dans **Paramètres › Simulation**.

## Ce que vous voyez sur le diagramme {#what-you-see-on-the-diagram}

- Les **étapes actives** sont remplies et portent un jeton, avec en dessous leur durée d'activité.
- Les **transitions validées** portent un repère ▶ ; les transitions clignotent quand elles sont
  franchies.
- Les **signaux vrais** sont en vert, en gras et soulignés dans les réceptivités et les conditions
  d'actions : une variable à 1, une étape active `Xn`, une comparaison vérifiée. Ce qui n'est pas
  en vert est ce que la transition attend encore. Sous une barre de complément, la couleur montre
  le signal lui-même : dans `/a`, `a` est en vert quand `a` est à 1.
- Les **actions continues** en cours d'exécution affichent un ✓ ; les **actions mémorisées**
  affichent la valeur actuelle de leur variable.
- **Étape par étape** : quand un changement fait franchir plusieurs transitions à la suite, le
  diagramme montre chaque étape traversée pendant au moins 0,1 s, pour suivre le jeton. Seul
  l’affichage attend : dans la simulation ces étapes instables ne durent pas, comme l’exige l’IEC
  60848, et les valeurs affichées sont déjà les valeurs finales.

## Journal d'évolution {#evolution-log}

Le journal du panneau Simulation (replié : cliquez sur **Journal d'évolution** pour l'ouvrir)
liste chaque cycle avec ce qui l'a déclenché et chaque itération de la recherche de stabilité :
transitions franchies, étapes activées et désactivées. Les évolutions fugaces (étapes traversées
sans arrêt) y sont visibles. Cliquez sur un cycle pour voir le diagramme tel qu'il était à ce
moment-là.

## Suivre plusieurs grafcets {#watching-several-grafcets}

En vue partagée (<kbd>Ctrl+\</kbd>), les deux volets affichent la simulation en direct : suivez
côte à côte un grafcet de production et son grafcet de sécurité, ou une macro-étape et son
expansion.

## Chronogramme {#chronogram}

Le panneau **Chronogramme** (son bouton est en bas à droite) trace toutes les variables et les
étapes du grafcet ouvert au cours du temps. Cliquez ou faites glisser dedans pour remonter dans le
temps : le diagramme suit. **Retour au direct** revient au présent.

## Scénarios {#scenarios}

Pour répéter un test à l'identique, enregistrez-le :

1. Cliquez sur **Enregistrer** : la simulation redémarre et enregistre chaque changement d'entrée
   avec son instant.
2. Effectuez votre test, puis arrêtez l'enregistrement et nommez le scénario. Il est enregistré
   dans le projet.
3. **Rejouer** redémarre la simulation et rejoue le scénario.

## Quand le grafcet ne se stabilise jamais {#when-the-grafcet-never-settles}

Si des transitions se franchissent les unes les autres sans fin (par exemple une boucle dont
toutes les réceptivités sont vraies), l'évolution ne devient jamais stable. Le simulateur s'arrête
après 1000 itérations et signale une **évolution fugace sans fin** dans Problèmes. Ajoutez une
condition (souvent un front `↑a`) pour que la boucle ne puisse pas tourner indéfiniment. Voir
[Dépannage](troubleshooting.md).
