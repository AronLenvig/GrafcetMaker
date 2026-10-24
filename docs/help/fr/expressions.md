# Écrire les réceptivités

Les réceptivités, les conditions d'actions et les événements sont des expressions logiques. Vous
les tapez en ASCII simple ; le diagramme les affiche en notation usuelle (NON par une barre
au-dessus, ET par `·`). Désactivez **Affichage › Notation usuelle** pour voir exactement ce que
vous avez tapé.

## Opérateurs {#operators}

| Signification        | Saisie        | Aussi accepté                  | Affichage   |
| -------------------- | ------------- | ------------------------------ | ----------- |
| ET                   | `a * b`       | `a AND b`, `a && b`, `a · b`   | a · b       |
| OU                   | `a + b`       | `a OR b`, `a \|\| b`           | a + b       |
| NON                  | `/a`          | `NOT a`, `!a`, `¬a`            | a surligné  |
| Front montant        | `↑a`          | `RE a` (taper `^a` donne `↑a`) | ↑a          |
| Front descendant     | `↓a`          | `FE a`                         | ↓a          |
| Toujours vrai / faux | `1` / `0`     | `TRUE` / `FALSE`               | 1 / 0       |
| Parenthèses          | `(a + b) * c` |                                | (a + b) · c |

NON est prioritaire, puis ET, puis OU : `a + b * /c` signifie `a + (b * (/c))`. Utilisez des
parenthèses en cas de doute.

## Fronts montants et descendants {#rising-and-falling-edges}

Un front n'est vrai qu'à l'instant où son opérande change : **↑a** (front montant, _déclenchement
P_) quand `a` passe de faux à vrai, **↓a** (front descendant, _déclenchement N_) quand il passe de
vrai à faux. Utilisez-le pour réagir une seule fois à un appui sur un bouton, quelle que soit la
durée de l'appui.

<!-- figure: edges | Lampe allumée de l'appui sur le bouton jusqu'à son relâchement -->

Trois façons de saisir un front :

- Tapez `^` devant le nom : `^start` devient `↑start` pendant la saisie.
- Placez le curseur de texte sur un nom et appuyez sur <kbd>Alt+↑</kbd> pour un front montant ou
  sur <kbd>Alt+↓</kbd> pour un front descendant. Appuyez de nouveau pour retirer le front, ou sur
  l'autre raccourci pour l'inverser.
- Cliquez sur **↑** ou **↓** dans la barre de symboles qui apparaît au-dessus du champ pendant que
  vous modifiez une réceptivité.

`RE a` et `FE a` sont aussi acceptés. Les fronts fonctionnent aussi sur les variables d'étape :
`↑X3` est vrai quand l'étape 3 devient active.

## Variables d'étape {#step-variables}

`X3` est vraie tant que l'étape 3 est active. Dans un projet à plusieurs grafcets, `X3` désigne
l'étape 3 du même grafcet, ou la seule étape 3 du projet. Utilisez-la pour synchroniser des
grafcets, par exemple pour attendre qu'un autre grafcet atteigne une étape.

## Temporisations {#timers}

`5s/X2` est vraie 5 secondes après que `X2` est devenue vraie, et redevient fausse dès que `X2`
est fausse : typiquement « 5 s après l'activation de l'étape 2 ».

<!-- figure: timer | Le chauffage fonctionne pendant 5 s -->

- Unités : `ms`, `s`, `min`, `h`, p. ex. `500ms/X4`, `2min/start`.
- L'opérande peut être n'importe quelle condition : `3s/(a * b)`.
- `2s/a/5s` est vraie 2 s après que `a` est devenue vraie et le reste jusqu'à 5 s après que `a`
  est devenue fausse.

## Comparaisons {#comparisons}

Les variables numériques (INT, REAL, TIME) se comparent avec `=`, `<>`, `<`, `<=`, `>`, `>=`, et
peuvent utiliser `+`, `-`, `*`, `/` et `MOD` dans la comparaison : `level >= 80`, `C = 3`,
`T1 > 2s`, `(a + b) / 2 < limit`. Une comparaison est une condition : quand vous la combinez avec
d'autres, mettez-la entre parenthèses, comme dans `start * (C < 10)`. Sans elles,
`start * C < 10` comparerait `start * C` à 10.

## Affectations dans les actions mémorisées {#assignments-in-stored-actions}

Les actions mémorisées contiennent une affectation : `C := C + 1`, `Motor := 1`, `Speed := 2.5`,
`Done := FALSE`. Voir [Actions](actions.md).

## Aide pendant la saisie {#help-while-you-type}

- **Suggestions** : commencez à taper un nom et choisissez une variable ou une étape (`X…`) avec
  les flèches, puis <kbd>Enter</kbd> ou <kbd>Tab</kbd>. La fin du nom en surbrillance s'affiche en
  gris après le curseur ; <kbd>Tab</kbd> ou <kbd>→</kbd> l'accepte.
- **Champ vide** : la première variable de la table que rien n'utilise encore s'affiche en gris
  (une entrée pour une réceptivité, une sortie pour une action) ; <kbd>Tab</kbd> l'accepte.
- **Problèmes** : un encadré sous le champ explique ce qui ne va pas, souligne l'endroit et
  propose des corrections : **Utiliser Start** pour un nom mal orthographié,
  **Nouvelle variable start (BOOL, entrée)** pour un nouveau nom.
- **Barre de symboles** : des boutons pour ↑ ↓ NON ET OU, les parenthèses (elles entourent le
  texte sélectionné) et un modèle de temporisation.

Vous pouvez toujours valider une expression qui comporte un problème : elle est soulignée en
rouge sur le diagramme et listée dans **Problèmes** jusqu'à ce que vous la corrigiez.
