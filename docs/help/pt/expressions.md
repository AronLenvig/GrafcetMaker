# Escrever receptividades

Receptividades, condições de ações e eventos são expressões lógicas. Você as digita em ASCII
simples; o diagrama as mostra em notação de livro (NOT como barra superior, AND como `·`).
Desative **Exibir › Notação de livro** para ver exatamente o que você digitou.

## Operadores {#operators}

| Significado               | Digite        | Também aceito                   | Mostrado como     |
| ------------------------- | ------------- | ------------------------------- | ----------------- |
| AND                       | `a * b`       | `a AND b`, `a && b`, `a · b`    | a · b             |
| OR                        | `a + b`       | `a OR b`, `a \|\| b`            | a + b             |
| NOT                       | `/a`          | `NOT a`, `!a`, `¬a`             | a com barra acima |
| Borda de subida           | `↑a`          | `RE a` (digitar `^a` gera `↑a`) | ↑a                |
| Borda de descida          | `↓a`          | `FE a`                          | ↓a                |
| Sempre verdadeiro / falso | `1` / `0`     | `TRUE` / `FALSE`                | 1 / 0             |
| Parênteses                | `(a + b) * c` |                                 | (a + b) · c       |

NOT tem a maior precedência, depois AND, depois OR: `a + b * /c` significa `a + (b * (/c))`. Use
parênteses na dúvida.

## Bordas de subida e de descida {#rising-and-falling-edges}

Uma borda só é verdadeira no instante em que seu operando muda: **↑a** (borda de subida, _gatilho
P_) quando `a` passa de falso a verdadeiro, **↓a** (borda de descida, _gatilho N_) quando passa de
verdadeiro a falso. Use-a para reagir uma única vez ao acionamento de um botão, por mais tempo que
ele fique pressionado.

<!-- figure: edges | Lamp liga do acionamento do botão até sua liberação -->

Três formas de digitar uma borda:

- Digite `^` antes do nome: `^start` vira `↑start` enquanto você digita.
- Coloque o cursor de texto em um nome e pressione <kbd>Alt+↑</kbd> para uma borda de subida ou
  <kbd>Alt+↓</kbd> para uma borda de descida. Pressione de novo para remover a borda, ou a outra
  tecla para trocá-la.
- Clique em **↑** ou **↓** na barra de símbolos que aparece acima do campo enquanto você edita uma
  receptividade.

`RE a` e `FE a` também são aceitos. As bordas também funcionam com variáveis de etapa: `↑X3` é
verdadeira quando a etapa 3 se torna ativa.

## Variáveis de etapa {#step-variables}

`X3` é verdadeira enquanto a etapa 3 está ativa. Em um projeto com vários grafcets, `X3` se refere
à etapa 3 do mesmo grafcet, ou à única etapa 3 do projeto. Use-a para sincronizar grafcets, ex.:
esperar que outro grafcet chegue a uma etapa.

## Temporizações {#timers}

`5s/X2` é verdadeira 5 segundos depois que `X2` se tornou verdadeira, e volta a ser falsa assim que
`X2` é falsa: tipicamente "5 s depois que a etapa 2 foi ativada".

<!-- figure: timer | O aquecedor funciona por 5 s -->

- Unidades: `ms`, `s`, `min`, `h`, ex.: `500ms/X4`, `2min/start`.
- O operando pode ser qualquer condição: `3s/(a * b)`.
- `2s/a/5s` é verdadeira 2 s depois que `a` se tornou verdadeira e permanece verdadeira até 5 s
  depois que `a` se tornou falsa.

## Comparações {#comparisons}

As variáveis numéricas (INT, REAL, TIME) são comparadas com `=`, `<>`, `<`, `<=`, `>`, `>=`, e
podem usar `+`, `-`, `*`, `/` e `MOD` dentro da comparação: `level >= 80`, `C = 3`, `T1 > 2s`,
`(a + b) / 2 < limit`. Uma comparação é uma condição: quando você a combina com outras, coloque-a
entre parênteses, como em `start * (C < 10)`. Sem eles, `start * C < 10` compararia `start * C`
com 10.

## Atribuições em ações memorizadas {#assignments-in-stored-actions}

As ações memorizadas contêm uma atribuição: `C := C + 1`, `Motor := 1`, `Speed := 2.5`,
`Done := FALSE`. Veja [Ações](actions.md).

## Ajuda durante a digitação {#help-while-you-type}

- **Sugestões**: comece a digitar um nome e escolha uma variável ou etapa (`X…`) com as setas,
  depois <kbd>Enter</kbd> ou <kbd>Tab</kbd>. O resto do nome destacado aparece em cinza após o
  cursor; <kbd>Tab</kbd> ou <kbd>→</kbd> o aceita.
- **Campo vazio**: a primeira variável da tabela que nada usa ainda aparece em cinza (uma entrada
  para uma receptividade, uma saída para uma ação); <kbd>Tab</kbd> a aceita.
- **Problemas**: um quadro sob o campo explica o que está errado, sublinha onde e oferece
  correções: **Usar Start** para um nome digitado errado. Um nome novo é anunciado (_Nova variável
  start: BOOL entrada_) e declarado quando você confirma.
- **Barra de símbolos**: botões para ↑ ↓ NOT AND OR, parênteses (envolvem o texto selecionado) e
  um modelo de temporização.

Você sempre pode confirmar uma expressão com problema: ela aparece sublinhada em vermelho no
diagrama e listada em **Problemas** até você corrigi-la.
