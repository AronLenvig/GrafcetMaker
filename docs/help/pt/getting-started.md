# Primeiros passos

Neste tutorial você desenha o comando de um pequeno tanque: quando o operador pressiona **start**,
uma bomba enche o tanque até ele ficar cheio (**full**), depois uma válvula o esvazia até ele ficar
vazio (**empty**), e o sistema aguarda a próxima partida. Leva cerca de dez minutos.

<!-- figure: sequence | O grafcet que você vai desenhar -->

## 1. Oriente-se {#1-find-your-way-around}

- A **área de desenho** ocupa a janela: é ali que você desenha. Todo o resto flutua sobre ela,
  levemente esmaecido até você apontar para ele, para que o diagrama fique em primeiro plano.
- **Em cima**: o menu principal ☰ e o nome do projeto à esquerda; as ferramentas no meio
  (selecionar, mover vista, colocar etapa, transição, comentário ou ação), terminando com ▶
  **Simular**; os contadores de problemas, **Exportar** e o compartilhamento à direita.
- **Sob as ferramentas**: as dicas mostram o que você pode fazer agora. Observe-as enquanto segue
  este tutorial.
- **À esquerda**: as **Propriedades** do que você seleciona aparecem em um cartão enquanto o
  elemento estiver selecionado.
- **Embaixo**: zoom, desfazer e refazer à esquerda; uma aba por grafcet no meio; os botões
  **Variáveis**, **Problemas**, **Cronograma** e **Estrutura** à direita, cada um abrindo seu
  painel no lado direito da janela, depois a ajuda, o feedback e a bandeira que muda o idioma.

Um projeto novo já contém o grafcet **G1** com a etapa **0**. O quadrado duplo indica que ela é uma
**etapa inicial**: ela está ativa quando o sistema inicia.

## 2. Adicione a primeira transição e a primeira etapa {#2-add-the-first-transition-and-step}

1. Clique na etapa **0** para selecioná-la.
2. Pressione <kbd>Enter</kbd>. Uma transição e a etapa **1** aparecem abaixo, e você digita a
   **receptividade** da transição, a condição para avançar, exatamente onde ela é desenhada.
3. Digite `start` e pressione <kbd>Enter</kbd>.

`start` ainda não está declarada: enquanto você digita, o editor indica **Nova variável start:
BOOL entrada**, e pressionar <kbd>Enter</kbd> a adiciona à lista de variáveis (uma mensagem
avisa).

## 3. Adicione uma ação {#3-add-an-action}

A etapa 1 continua selecionada. Pressione <kbd>A</kbd>, digite `Pump` e pressione
<kbd>Enter</kbd>: `Pump` é criada como saída BOOL. A bomba agora funciona enquanto a etapa 1
estiver ativa.

## 4. Continue a sequência {#4-continue-the-sequence}

1. Pressione <kbd>Enter</kbd> de novo: uma transição e a etapa **2** são adicionadas após a
   etapa 1. Digite `full` como receptividade e crie a entrada.
2. Pressione <kbd>A</kbd> e adicione a ação `Valve` (crie a saída).

> **Dica:** prefere o mouse? Uma etapa selecionada mostra **fantasmas** tracejados do que
> <kbd>Enter</kbd> e <kbd>A</kbd> adicionariam; clique em um deles para adicioná-lo (veja
> [Editar diagramas](editing.md#ghosts)).

## 5. Feche o ciclo {#5-close-the-loop}

O ciclo precisa voltar à etapa 0 quando o tanque estiver vazio.

1. Com a etapa **2** selecionada, pressione <kbd>L</kbd>. As dicas dizem **Clique em uma etapa
   para retornar a ela**.
2. Clique na etapa **0**. Uma transição é adicionada abaixo da etapa 2, com uma ligação que sobe
   até a etapa 0, desenhada com uma seta porque vai para cima.
3. Digite `empty` como receptividade, pressione <kbd>Enter</kbd> e crie a entrada.

Seu diagrama agora corresponde à figura no topo desta página.

## 6. Verifique {#6-check-it}

Veja os contadores no canto superior direito: um círculo vermelho conta os **erros**, um
triângulo laranja conta os **avisos**. Clique neles para abrir a lista de **Problemas**. Cada
problema diz o que está errado e onde; clique nele para ir até o elemento, e use o botão de
correção quando houver um. Um diagrama correto não tem erros. Veja
[Solução de problemas](troubleshooting.md) para o significado de cada mensagem.

## 7. Simule {#7-simulate}

1. Pressione <kbd>F5</kbd>. O diagrama fica bloqueado e o painel **Simulação** aparece à esquerda.
   A etapa 0 tem uma ficha: ela está ativa.
2. No painel, ligue **start** (ou clique em `start` onde está escrito no diagrama). A transição é
   transposta: a etapa 1 fica ativa e sua ação **Pump** mostra uma marca de seleção ✓.
3. Desligue **start** e depois ligue **full**: a etapa 2 fica ativa e **Valve** liga.
4. Desligue **full** e ligue **empty**: o grafcet volta à etapa 0.
5. Clique em **Cronograma** no canto inferior direito para ver todos os sinais ao longo do tempo.
   Pressione <kbd>Shift+F5</kbd> para parar.

O que acontece se **start** continuar ligada quando o tanque ficar vazio? Experimente: assim que a
etapa 0 volta a ficar ativa, sua transição é transposta de novo. É o GRAFCET se comportando
exatamente como foi desenhado. Use uma borda de subida `↑start` para reagir apenas a um novo
acionamento (digite `^start`, veja [Escrever receptividades](expressions.md)).

## 8. Salve {#8-save}

Seu trabalho é salvo automaticamente no navegador após cada alteração. Para obter um arquivo que
você possa guardar, enviar ou colocar sob controle de versão, pressione <kbd>Ctrl+S</kbd>: o
projeto é salvo como `<name>.grafcet.json`. Clique duas vezes no nome do projeto, no topo, para
renomeá-lo.

## E agora? {#where-next}

- [Noções básicas de GRAFCET](grafcet-basics.md) explica as regras por trás do que você acabou de
  ver.
- [Editar diagramas](editing.md) mostra ramos paralelos e alternativos e outros atalhos rápidos.
- [Simulação](simulation.md) trata de temporizadores, do registro da evolução e dos cenários.
