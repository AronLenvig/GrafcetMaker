# Editar diagramas

O GrafcetMaker foi feito para que você raramente posicione algo à mão: selecione um elemento e use
uma tecla, e os novos elementos são numerados, ligados e posicionados para você. As dicas sob a
barra de ferramentas, no topo da área de desenho, listam as teclas que valem para a seleção atual.

## As teclas essenciais {#the-essential-keys}

| Tecla                                     | Com uma etapa selecionada                                                 | Com uma transição selecionada                           |
| ----------------------------------------- | ------------------------------------------------------------------------- | ------------------------------------------------------- |
| <kbd>Enter</kbd>                          | adicionar uma transição e uma etapa abaixo, depois editar a receptividade | adicionar uma etapa abaixo                              |
| <kbd>A</kbd>                              | adicionar uma ação                                                        | —                                                       |
| <kbd>P</kbd>                              | adicionar um ramo paralelo (E)                                            | adicionar mais uma etapa que ela ativa                  |
| <kbd>O</kbd>                              | adicionar um ramo alternativo (OU)                                        | adicionar uma transição alternativa (desvio)            |
| <kbd>L</kbd> e depois clique em uma etapa | retornar a essa etapa                                                     | ligar a essa etapa (se ainda não leva a lugar nenhum)   |
| <kbd>F2</kbd> ou clique duplo             | editar o número                                                           | editar a receptividade                                  |
| <kbd>R</kbd>                              | —                                                                         | girar: de cima para baixo ou da direita para a esquerda |
| <kbd>J</kbd>                              | —                                                                         | salto para uma etapa: digite `X10` abaixo               |
| <kbd>Del</kbd>                            | excluir e reconectar a sequência                                          | excluir                                                 |

Uma transição girada **da direita para a esquerda** tem uma barra vertical: a ligação vinda da
etapa anterior entra pela direita e a ligação para a próxima etapa sai pela esquerda, com setas.
Clique em qualquer ponto da barra, do número ou da receptividade de uma transição para
selecioná-la.

Sem nada selecionado, <kbd>Enter</kbd> continua a sequência a partir da sua última etapa.
<kbd>Enter</kbd> em uma etapa que já tem continuação insere a nova transição e a nova etapa e
desloca tudo o que está abaixo para baixo.

Enquanto você edita uma receptividade ou uma ação, <kbd>Shift+Enter</kbd> a aplica e abre a
próxima: a próxima receptividade descendo a sequência (uma nova transição e uma nova etapa no
final), ou a próxima ação da etapa (uma nova após a última). Digite uma sequência inteira, ou uma
fileira de ações, de uma só vez.

## Digitar no diagrama {#typing-on-the-diagram}

<kbd>F2</kbd>, um clique duplo ou <kbd>Enter</kbd> abre um texto exatamente onde ele é desenhado:
digite como na área de desenho, e o quadro em volta cresce enquanto você digita. <kbd>Enter</kbd>
o aplica (<kbd>Ctrl+Enter</kbd> em um comentário), <kbd>Esc</kbd> cancela, e clicar em outro
lugar também aplica. Um sublinhado ondulado vermelho marca um valor que ainda não é válido; o
quadro sob o texto diz por quê.

## Fantasmas {#ghosts}

Uma etapa selecionada mostra **fantasmas** tracejados do que <kbd>A</kbd> e <kbd>Enter</kbd>
adicionariam: uma ação após sua última ação e, no fim de uma sequência, uma transição e uma etapa
com o número que ela vai receber. Uma transição que não leva a lugar nenhum mostra uma etapa
fantasma. Clique em um fantasma para adicioná-lo; clique só na barra da transição fantasma para
adicionar apenas a transição: ela fica selecionada, e a etapa fantasma dela vem em seguida. Uma
nova etapa adicionada a partir do seu fantasma fica selecionada, como se você tivesse clicado
nela, então o fantasma seguinte está a um clique; digite as receptividades depois (<kbd>F2</kbd>
ou clique duplo), ou use <kbd>Enter</kbd> para digitar cada uma conforme avança. Com uma
ferramenta de colocação, um fantasma sob o ponteiro mostra o que um clique vai colocar.

## Mouse {#mouse}

- **Clique** seleciona; <kbd>Shift</kbd>+clique ou <kbd>Ctrl</kbd>+clique adiciona à seleção ou
  remove dela; arrastar na área vazia seleciona com um quadro (uma etapa leva todas as suas
  ações); <kbd>Ctrl+A</kbd> seleciona tudo. As ligações entre elementos selecionados também são
  destacadas.
- **Arraste** qualquer elemento selecionado para mover a seleção inteira (ela se ajusta à grade);
  as setas do teclado deslocam (<kbd>Shift</kbd> para passos maiores).
- **Clique duas vezes** em um elemento para editar seu texto; clique duas vezes na área vazia para
  adicionar uma etapa ali.
- **Clique com o botão direito** em um elemento para ver o que você pode fazer com ele (adicionar
  uma ação, ramos, retornar, editar, transformar em macroetapa, recortar, copiar, excluir…), na
  seleção, ou na área vazia (adicionar uma etapa ali, colar, organização automática, renumerar,
  ajustar). A tecla de menu o abre para a seleção.
- Uma transição cuja receptividade ainda não foi escrita mostra um **?** cinza (clique duas vezes
  nele ou pressione <kbd>F2</kbd>); a lista de Problemas continua a contá-la até você digitar uma.
- **Alças de ligação**: uma etapa ou transição selecionada ou sob o ponteiro mostra alças
  redondas. Arraste uma: só os destinos válidos (uma etapa para uma transição, uma transição para
  uma etapa) são destacados. Solte na área vazia para criar ali o elemento que falta.
- Clique em uma **ligação** para selecioná-la; <kbd>Del</kbd> remove só essa ligação. Arraste uma
  ligação ascendente (um retorno) para o lado para mover sua linha lateral, ou arraste sua linha
  inferior para cima ou para baixo; clique duas vezes nela para voltar ao traçado automático.
  Automaticamente, um retorno passa abaixo das etapas e fios da sua própria sequência em vez de
  cruzá-los.
- Clique em uma **linha dupla** (divergência ou convergência em E) para selecioná-la: ela é
  destacada com as ligações que une. Arraste-a, ou pressione as setas, para movê-la com sua
  transição; <kbd>Del</kbd> remove essas ligações e mantém a transição e as etapas.

## Toque: celulares e tablets {#touch-phones-and-tablets}

- **Toque** seleciona. **Arraste** um elemento para movê-lo; arraste a área vazia para mover a
  vista; faça **pinça** com dois dedos para dar zoom.
- **Toque duas vezes** em um elemento para editar seu texto, ou na área vazia para adicionar uma
  etapa ali.
- **Segure e arraste** na área vazia para selecionar tudo dentro de um quadro.
- Com uma seleção, uma **barra de ferramentas** na parte inferior da área de desenho faz o que as
  teclas fazem em um computador: **Etapa** (uma transição e uma etapa abaixo), **Ação**, ramos
  **Paralelo** e **Escolha**, **Retorno**, **Editar**, **Detalhes** (as propriedades) e
  **Excluir**.
- Uma etapa ou transição selecionada mostra suas **alças de ligação** logo acima e abaixo dela:
  arraste uma até um destino destacado, ou até a área vazia para criar o elemento que falta.
- Com uma ferramenta escolhida (etapa, transição, comentário, ação), **toque** onde o elemento
  deve ficar.

Em um celular, a tela é organizada para uma mão: as ferramentas, desfazer e refazer ficam
embaixo, o menu (☰) contém Arquivo, Editar, Exibir, Simular e Ajuda, e os painéis (propriedades,
variáveis, problemas, simulação, cronograma, estrutura) abrem como uma folha sobre o diagrama com
o botão de painéis no canto inferior direito. Arraste a alça da folha para deixá-la mais alta ou
mais baixa.

## Ferramentas {#tools}

A barra de ferramentas no topo da janela contém as ferramentas (a letra em cada botão é sua
tecla): **Selecionar** (<kbd>V</kbd>), **Mover vista** (<kbd>H</kbd>), **Etapa** (<kbd>S</kbd>),
**Transição** (<kbd>T</kbd>), **Comentário** (<kbd>C</kbd>) e **Ação** (<kbd>Shift+A</kbd>). Com
uma ferramenta de colocação, clique na área vazia para colocar um elemento; mantenha
<kbd>Shift</kbd> pressionada para colocar vários. <kbd>Esc</kbd> volta a Selecionar. A ferramenta
Ação também adiciona uma ação a uma etapa quando você clica na etapa.

## Ramos e estruturas {#branches-and-structures}

Divergências e convergências nunca são desenhadas à mão; elas decorrem das ligações.

- <kbd>O</kbd> em uma etapa adiciona outra transição de saída com sua própria etapa: uma
  **divergência em OU**.
- <kbd>P</kbd> em uma etapa adiciona uma etapa em paralelo com ela, iniciada pela mesma transição e
  unida pela seguinte: uma **divergência em E** e uma **convergência em E**.
- Ligar uma segunda etapa a uma transição cria uma convergência em E; ligar uma segunda transição
  a uma etapa cria uma convergência em OU.
- **Editar › Transição fonte acima da etapa / Transição sumidouro abaixo da etapa** adiciona uma
  transição sem etapa acima ou abaixo.
- <kbd>J</kbd> numa transição faz um **salto** para uma etapa em vez de desenhar uma ligação: digite
  a etapa abaixo da transição (`X10`, ou só `10`) e pressione <kbd>Enter</kbd>. A transição termina
  numa seta marcada **X10**, e uma etapa alcançada só por saltos recebe uma seta marcada com as
  etapas de onde eles vêm. Clique duas vezes em X10 para mudá-lo; apague-o para remover o salto.
  Clique com o botão direito numa ligação ou numa transição com salto: **Desenhar a ligação como
  salto** e **Desenhar o salto como ligação**. Só o desenho muda: a transição continua levando a
  essa etapa, na simulação e no código gerado.

## Organizar {#tidy-up}

- **Editar › Organizar grafcet automaticamente** coloca todas as etapas em fileiras, centraliza os
  ramos sob sua divergência e traça os retornos pela lateral. **Organizar seleção
  automaticamente** faz isso só para a seleção. A organização nunca acontece sozinha e pode ser
  desfeita.
- **Editar › Renumerar etapas** numera as etapas em ordem ao longo do fluxo e atualiza cada
  referência `Xn` e cada ordem de forçamento.

## Desfazer, copiar e colar {#undo-copy-and-paste}

- <kbd>Ctrl+Z</kbd> desfaz, <kbd>Ctrl+Shift+Z</kbd> ou <kbd>Ctrl+Y</kbd> refaz. Um arraste inteiro
  é um único passo de desfazer; o menu Editar diz o que será desfeito.
- <kbd>Ctrl+C</kbd>, <kbd>Ctrl+X</kbd>, <kbd>Ctrl+V</kbd> funcionam entre grafcets, projetos e
  abas do navegador. As etapas coladas são renumeradas se seus números já estiverem em uso, e as
  variáveis que elas usam vêm junto.

## Navegar {#navigate}

- Role para mover a vista; <kbd>Ctrl</kbd>+roda ou pinça para dar zoom; <kbd>Space</kbd>+arrastar,
  o botão do meio do mouse ou o botão direito mantido pressionado também movem a vista (um clique
  direito sem mover continua abrindo o menu).
- <kbd>Shift+1</kbd> ajusta o grafcet inteiro, <kbd>Shift+2</kbd> a seleção, <kbd>Shift+0</kbd> é
  100 %.
- <kbd>Ctrl+K</kbd> abre a paleta de comandos: digite qualquer comando ou o nome de um grafcet.

## Comentários e nomes {#comments-and-names}

- Os comentários (ferramenta <kbd>C</kbd>) são notas livres no diagrama; o simulador os ignora.
- Os rótulos das etapas (painel Propriedades) são descrições curtas mostradas à esquerda da etapa.
- Clique duas vezes no nome do projeto, no topo, para renomear o projeto, e na aba de um grafcet
  para renomear o grafcet.

## Dois grafcets ao mesmo tempo {#two-grafcets-at-once}

Pressione <kbd>Ctrl+\</kbd> (ou **Exibir › Vista dividida**) para mostrar um segundo grafcet ao
lado do primeiro, ou clique com o botão direito em uma aba e escolha **Abrir ao lado** ou **Abrir
abaixo**. Cada painel tem seu próprio seletor de grafcet no topo. Clique em um painel para
trabalhar nele: seu cabeçalho é destacado, e as abas, o teclado e o painel Propriedades o
acompanham. Arraste a barra entre os painéis para redimensioná-los; × fecha um painel.

## Propriedades e painéis {#properties-and-panels}

O diagrama tem a janela inteira; o resto flutua sobre ele e aparece quando necessário. Selecione
algo e suas **propriedades** aparecem em um cartão à esquerda: o tipo de uma etapa ou ação é
escolhido com botões ilustrados que mostram seu símbolo. O × do cartão o oculta para essa seleção;
sem nada selecionado, o botão de propriedades ao lado do nome do projeto mostra o grafcet e o
projeto. Os painéis **Variáveis**, **Problemas**, **Cronograma** e **Estrutura** abrem pelos botões
no canto inferior direito, em um cartão à direita que você pode alargar pela borda esquerda.
Durante a simulação, o painel de simulação (entradas, valores, registro, cenários) flutua à
esquerda.

Com vários elementos selecionados, o cartão dá uma visão geral: quantas etapas, transições, ações e
comentários (clique em um para manter só esses) e a seleção como uma árvore na ordem de leitura,
cada etapa com suas ações e transições selecionadas abaixo dela (uma etapa mostrada só por causa
delas fica em itálico). Clique em uma linha para selecionar só esse elemento; <kbd>Ctrl</kbd>+clique
a remove da seleção.
