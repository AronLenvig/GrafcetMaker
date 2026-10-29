# Ações

As ações são os retângulos à direita de uma etapa. Elas dizem o que o sistema faz enquanto, ou
quando, a etapa está ativa. Selecione uma etapa e pressione <kbd>A</kbd> para adicionar uma;
pressione <kbd>A</kbd> de novo em uma ação para adicionar a próxima. Escolha o **tipo** com os
botões ilustrados do painel **Propriedades**: cada um mostra como o diagrama desenha esse tipo.

## Ações contínuas {#continuous-actions}

O tipo mais comum. O texto é o nome de uma saída (ou variável interna), ex.: `Pump`. A saída é
verdadeira **enquanto** a etapa está ativa, e falsa assim que nenhuma etapa ativa a aciona.

Escolha o tipo **Condicional** para adicionar uma condição (uma _condição de atribuição_): o campo
dela aparece sob os botões de tipo, e a saída é verdadeira enquanto a etapa está ativa **e** a
condição é verdadeira. Ela é desenhada em uma linha curta acima do retângulo.

<!-- figure: continuous | Lamp enquanto a etapa 4 está ativa; Horn só enquanto alarm também é verdadeira -->

As temporizações na condição dão as ações retardadas e limitadas no tempo de outras notações:

- `5s/X4` — retardada: a saída liga 5 s depois que a etapa 4 se tornou ativa.
- `/(5s/X4)` — limitada no tempo: ligada apenas durante os primeiros 5 s da etapa 4.

> **Observação:** as etapas atravessadas durante uma evolução transitória (veja
> [Noções básicas de GRAFCET](grafcet-basics.md)) não executam suas ações contínuas.

## Ações memorizadas {#stored-actions}

Uma ação memorizada muda um valor **uma vez**, e o valor permanece até que outra ação o mude. Seu
texto é uma atribuição: `C := C + 1`, `Motor := 0`, `Speed := 2.5`. Para colocar uma variável BOOL
em TRUE, basta o nome: `Motor` significa `Motor := 1`.

- **Na ativação** — executada quando a etapa se torna ativa. Desenhada com uma seta **↑ acima** do
  retângulo.
- **Na desativação** — executada quando a etapa se torna inativa. Desenhada com uma seta **↓
  abaixo** do retângulo.
- **Em evento** — executada a cada vez que o **evento** ocorre enquanto a etapa está ativa, ex.:
  `↑reset`. Desenhada com uma **bandeira** no canto superior direito, ao lado do evento. Digite o
  evento no painel Propriedades; uma ação em evento sem evento nunca é executada e é indicada como
  problema.

<!-- figure: stored | Memorizada na ativação (↑), na desativação (↓) e em um evento (bandeira) -->

As ações na ativação e na desativação também podem ter uma condição: elas só são executadas se ela
for verdadeira naquele instante.

As ações memorizadas são executadas até pelas etapas que são apenas atravessadas durante uma
evolução transitória. Use-as para contar, para reter um valor (`Motor := 1` em uma etapa,
`Motor := 0` em outra) ou para lembrar que algo aconteceu.

## Ordens de forçamento {#forcing-orders}

Uma ordem de forçamento impõe uma situação a outro grafcet parcial enquanto sua etapa está ativa:
`G2{8}` ativa somente a etapa 8 do grafcet G2, `G2{*}` congela G2 na sua situação atual, `G2{}`
desativa todas as suas etapas e `G2{INIT}` o recoloca na sua situação inicial. Ela é desenhada com
uma moldura dupla. Veja [Macroetapas, etapas encapsulantes e forçamento](hierarchy.md).

## Ações sem etapa {#actions-without-a-step}

Uma ação não precisa pertencer a uma etapa. Sem nada selecionado, pressione <kbd>A</kbd> (ou
escolha a ferramenta **Ação**) e clique na área vazia: a ação é desenhada sozinha, sem ligação, e
fica **sempre ativa**.

- Uma ação contínua sem etapa aciona sua saída sempre que sua **condição de atribuição** é
  verdadeira, quaisquer que sejam as etapas: `Lamp` com a condição `a * b` é a lógica
  `Lamp = a · b`. Sem condição, a saída é sempre verdadeira.
- Uma ação memorizada em evento é executada a cada vez que o evento ocorre, ex.: `C := C + 1` em
  `↑pulse` conta pulsos. Na ativação, ela é executada uma vez quando a simulação começa. Na
  desativação, ela nunca é executada, já que a ação nunca é desativada.

Arraste qualquer ação para movê-la: sobre uma etapa para associá-la a ela (a etapa se ilumina e
uma marca mostra seu lugar entre as ações da etapa), ou sobre a área vazia para deixá-la sem
etapa.

## Várias ações {#several-actions}

Uma etapa pode ter qualquer número de ações; elas são desenhadas lado a lado. Arraste uma ao longo
da fileira para mudar a ordem, ou use **Mover ação para a esquerda / direita** no painel
Propriedades, onde uma etapa selecionada lista suas ações em linhas compactas (clique em uma para
expandi-la). Exclua uma ação com <kbd>Del</kbd>.

> **Atenção:** quando duas etapas que podem estar ativas juntas acionam a mesma saída com ações
> contínuas, o resultado é difícil de ler. O GrafcetMaker avisa sobre isso.
