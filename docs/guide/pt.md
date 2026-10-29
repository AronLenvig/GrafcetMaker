# O que é GRAFCET? Guia completo da norma IEC 60848

O **GRAFCET** é uma linguagem gráfica que descreve como se comporta um sistema de comando
sequencial: uma máquina, uma linha de produção, um semáforo. Um diagrama GRAFCET é uma série de
**etapas** (o que o sistema está fazendo) ligadas por **transições** (as condições para avançar).
Ele é padronizado internacionalmente pela **IEC 60848** e deu origem à linguagem SFC (Sequential
Function Chart) dos CLPs.

Este guia explica cada elemento e cada regra da norma com diagramas e exemplos. Todos os diagramas
foram desenhados com o [GrafcetMaker](app:), um editor e simulador de GRAFCET gratuito que funciona
no navegador: abra os exemplos e veja-os evoluir etapa por etapa.

## O que significa GRAFCET

GRAFCET é a sigla de _GRAphe Fonctionnel de Commande Étape-Transition_, em francês "gráfico
funcional de comando etapa-transição". Foi proposto em 1977 por um grupo de trabalho da AFCET, a
associação francesa de cibernética, junto com a ADEPA, a agência francesa para o desenvolvimento da
produção automatizada. Derivado das redes de Petri, foi concebido como uma forma clara e
independente da tecnologia de registrar o que um sistema de comando deve fazer, antes que alguém
escreva uma linha de código de CLP.

- **1982**: norma francesa NF C03-190.
- **1988**: norma internacional IEC 848, _Preparation of function charts for control systems_.
- **2002**: IEC 60848 edição 2, _GRAFCET specification language for sequential function charts_.
- **2013**: IEC 60848 edição 3, a atual, também publicada na Europa como EN 60848 (DIN EN 60848 na
  Alemanha).

O GRAFCET é ensinado em escolas técnicas, na formação profissional e nos cursos de engenharia,
sobretudo nos países de língua francesa, alemã, espanhola e portuguesa. Por convenção, _GRAFCET_ é
a linguagem e um _grafcet_ é um diagrama escrito nela.

## Os elementos de um grafcet

<!-- figure: anatomy | As partes de um grafcet -->

- Uma **etapa** é um quadrado com um número. Ela representa uma situação estável do sistema:
  _aguardando_, _enchendo_, _furando_. A cada instante, cada etapa está **ativa** ou **inativa**, e
  o conjunto das etapas ativas é a **situação** do grafcet. A variável de etapa `X1` é verdadeira
  enquanto a etapa 1 está ativa.
- Uma **etapa inicial**, desenhada como um quadrado duplo, está ativa quando o sistema inicia. Todo
  grafcet precisa de pelo menos uma.
- Uma **transição** é uma barra horizontal curta que corta uma ligação. Ela fica sempre entre
  etapas: duas etapas nunca são ligadas diretamente, e duas transições também não.
- A **receptividade** é a condição escrita ao lado de uma transição, por exemplo `start` ou
  `pressure > 6`. A receptividade `1` é sempre verdadeira.
- As **ligações orientadas** conectam etapas e transições. Elas são lidas de cima para baixo; uma
  ligação que sobe leva uma seta.
- As **ações** são retângulos à direita de uma etapa: o que o sistema faz enquanto a etapa está
  ativa, por exemplo _acionar o motor_.

## As cinco regras de evolução

A IEC 60848 define exatamente como um grafcet evolui, com cinco regras.

1. **Situação inicial**: no início, as etapas iniciais estão ativas e todas as outras, inativas.
2. **Transposição de uma transição**: uma transição está **habilitada** quando todas as etapas
   imediatamente acima dela estão ativas. Ela é **transposta** (atravessada) quando está habilitada
   e sua receptividade é verdadeira.
3. **Evolução das etapas ativas**: transpor uma transição ativa todas as etapas imediatamente abaixo
   dela e desativa todas as etapas imediatamente acima dela.
4. **Transposições simultâneas**: todas as transições que podem ser transpostas no mesmo instante
   são transpostas simultaneamente.
5. **Ativação e desativação simultâneas**: uma etapa que é ativada e desativada no mesmo instante
   permanece ativa.

Quando uma entrada muda, as regras são aplicadas repetidamente, com as mesmas entradas, até que
nenhuma transição possa mais ser transposta. Essa é a **busca de estabilidade**. Uma etapa que é
ativada e abandonada de novo durante essa busca é uma **etapa instável** (ou transitória): suas
ações contínuas nunca são executadas, mas suas ações memorizadas sim. Por exemplo, se as
receptividades abaixo das etapas 1 e 2 já forem verdadeiras quando a etapa 1 se torna ativa, o
grafcet passa direto pela etapa 2 até a etapa 3, e as saídas da etapa 2 nunca são acionadas.

## Receptividades: condições, bordas e temporizações

Uma receptividade é uma expressão lógica de entradas, variáveis internas, variáveis de etapa e
tempo. A notação dos livros e a forma de digitá-la no GrafcetMaker:

| Notação             | Significado                                                               | Digitado no GrafcetMaker |
| ------------------- | ------------------------------------------------------------------------- | ------------------------ |
| a · b               | a E b                                                                     | `a * b`                  |
| a + b               | a OU b                                                                    | `a + b`                  |
| a com barra em cima | NÃO a                                                                     | `/a`                     |
| ↑a                  | borda de subida: verdadeira no instante em que a se torna verdadeira      | `↑a` ou `RE a`           |
| ↓a                  | borda de descida: verdadeira no instante em que a se torna falsa          | `↓a` ou `FE a`           |
| X3                  | a etapa 3 está ativa                                                      | `X3`                     |
| 5 s/X2              | verdadeira 5 s depois que a etapa 2 se tornou ativa                       | `5s/X2`                  |
| t1/a/t2             | verdadeira t1 depois que a se torna verdadeira, falsa t2 depois que a cai | `2s/a/1s`                |
| [level > 80]        | comparação de um valor numérico                                           | `level > 80`             |
| = 1                 | sempre verdadeira                                                         | `1`                      |

<!-- figure: timer | Uma receptividade com temporização: o aquecedor funciona por 5 segundos -->

As bordas importam quando um sinal permanece verdadeiro: com `↑start`, o ciclo começa uma vez por
toque no botão, e não de novo enquanto ele estiver pressionado. A sintaxe completa do editor está
descrita em [Escrever receptividades](app:#help/expressions).

## Ações

<!-- figure: actions | Ações contínua, condicional e memorizadas na etapa 4 -->

- Uma **ação contínua** é verdadeira enquanto sua etapa está ativa: _Lamp_ fica acesa enquanto a
  etapa 4 está ativa.
- Uma **ação condicional** é uma ação contínua com uma **condição de atribuição** escrita acima do
  seu retângulo: _Horn_ soa somente enquanto a etapa 4 está ativa **e** `alarm` é verdadeira.
- As ações **retardadas** e **limitadas no tempo** são ações condicionais cuja condição usa uma
  temporização: com `3s/X4` a saída liga 3 s depois que a etapa 4 se tornou ativa; com `/(3s/X4)`
  ela fica ligada apenas nos primeiros 3 s.
- Uma **ação memorizada** atribui um valor uma vez, e o valor permanece até que outra ação o mude.
  Ela é executada quando a etapa é **ativada** (seta para cima), quando é **desativada** (seta para
  baixo) ou **em um evento** enquanto a etapa está ativa (uma bandeira com o evento, aqui
  `↑reset`). Contadores como `C := C + 1` são ações memorizadas típicas.

Uma saída comandada por ações contínuas acompanha as etapas automaticamente. Uma saída acionada por
uma ação memorizada permanece acionada até que outra ação memorizada a desligue, então planeje onde
isso acontece.

## Sequências, alternativas e ramos paralelos

### Escolher entre caminhos: divergência em OU

Quando uma etapa é seguida de várias transições, o grafcet segue o caminho cuja receptividade é
verdadeira: um **ramo alternativo**, desenhado com uma linha horizontal simples (**divergência em
OU**, chamada de _seleção de sequência_ no SFC). Os caminhos se juntam novamente em uma linha
simples (**convergência em OU**).

<!-- figure: or | Divergência e convergência em OU: um ramo ou o outro -->

Torne as receptividades **exclusivas**, de modo que nunca possam ser verdadeiras ao mesmo tempo,
como `a` e `/a * b` aqui. Caso contrário, as duas transições são transpostas juntas (regra 4) e os
dois ramos ficam ativos. O GrafcetMaker avisa quando não consegue provar que receptividades
alternativas são exclusivas.

### Fazer coisas ao mesmo tempo: divergência em E

Quando uma transição é seguida de várias etapas, todas são ativadas juntas: **ramos paralelos**,
desenhados com uma linha dupla (**divergência em E**, uma _sequência simultânea_ no SFC). Os ramos
também terminam em uma linha dupla (**convergência em E**): a transição abaixo dela só fica
habilitada quando a última etapa de cada ramo está ativa, então ela espera todos os ramos
terminarem. É assim que um grafcet **sincroniza** tarefas.

<!-- figure: and | Divergência e convergência em E: furar e fixar ao mesmo tempo -->

### Retornos, saltos, transições fonte e sumidouro

- Um **retorno** (laço) volta a uma etapa anterior por uma ligação ascendente com seta: a forma
  usual de repetir um ciclo.
- Um **salto** (salto de etapas) é uma divergência em OU em que um dos ramos leva direto a uma etapa
  posterior, por exemplo para pular uma operação opcional.
- Uma **transição fonte** não tem etapa acima dela. Ela está sempre habilitada, então é transposta
  sempre que sua receptividade é verdadeira; use uma borda como `↑a`.
- Uma **transição sumidouro** não tem etapa abaixo dela: transpô-la apenas desativa as etapas acima
  dela.

## Estruturar aplicações grandes

Máquinas reais são descritas com vários grafcets que trabalham juntos.

- Os **grafcets parciais** descrevem, cada um, uma parte do sistema, por exemplo o ciclo de
  produção, os modos de operação e a segurança. Eles funcionam ao mesmo tempo e enxergam as etapas
  uns dos outros pelas variáveis de etapa `Xn`. Juntos formam o grafcet global.
- Uma **macroetapa** representa uma sequência detalhada desenhada em folha própria, a sua
  **expansão**. A expansão tem uma etapa de entrada **E** e uma etapa de saída **S**. Transpor a
  transição acima da macroetapa ativa a etapa E; a transição abaixo da macroetapa fica habilitada
  quando a etapa S está ativa.
- Uma **etapa encapsulante** contém um ou mais grafcets inteiros que só existem enquanto ela está
  ativa. Quando ela é ativada, as etapas encapsuladas marcadas com asterisco se tornam ativas;
  quando ela é desativada, todas as etapas encapsuladas são desativadas.
- Uma **ordem de forçamento**, desenhada em um retângulo de ação com moldura dupla, impõe uma
  situação a outro grafcet: `G2{8}` força apenas a etapa 8 de G2 a ficar ativa, `G2{*}` congela G2
  na sua situação atual e `G2{}` desativa todas as suas etapas. Um grafcet forçado não pode evoluir
  por si só. O forçamento é a forma padrão de descrever paradas de emergência e a inicialização.

<!-- figure: macro | Uma macroetapa: duas linhas horizontais dentro do quadrado -->

## GRAFCET e SFC

A linguagem SFC (Sequential Function Chart) da IEC 61131-3 foi derivada do GRAFCET e é quase
idêntica na aparência, mas as duas não têm a mesma finalidade.

|            | GRAFCET (IEC 60848)                                                         | SFC (IEC 61131-3)                                            |
| ---------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Finalidade | Especificação: o comportamento exigido, independente da tecnologia          | Linguagem de programação executada por um CLP                |
| Evolução   | Todas as transições transponíveis de uma vez, depois busca de estabilidade  | Em geral uma evolução por ciclo do CLP, conforme o CLP       |
| Ações      | Ações contínuas, condicionais, retardadas, limitadas no tempo e memorizadas | Qualificadores de ação N, S, R, P, P0, P1, L, D, SD, DS e SL |
| Hierarquia | Grafcets parciais, macroetapas, etapas encapsulantes e ordens de forçamento | Pela estrutura do programa                                   |

Um fluxo de trabalho comum é escrever e verificar primeiro o GRAFCET e depois implementá-lo em SFC,
ladder ou Texto Estruturado. O GrafcetMaker gera Texto Estruturado e PLCopen TC6 XML a partir de um
diagrama como ponto de partida para essa implementação; revise sempre o código gerado antes de
usá-lo.

## Exemplos

### Semáforo com botão de pedestre

<!-- figure: example-trafficLight | Semáforo: temporizações e um pedido memorizado -->

A etapa 0 dá o sinal verde aos pedestres por 10 s (`10s/X0`), depois a etapa 1 libera os carros.
Os carros ficam com o verde por 30 s, mas um toque no botão de pedestre reduz isso para 10 s: o
toque é memorizado por uma ação memorizada no evento `↑request` e esquecido quando a etapa 0 volta
a ficar ativa. A etapa 2 mostra o amarelo por 3 s.

### Estação de furação com contador de peças

<!-- figure: example-drillingStation | Estação de furação: um ciclo de usinagem com manutenção a cada 100 peças -->

Um ciclo de usinagem: fixar a peça, descer a broca, recuar, soltar. A fixação é acionada e
desligada por ações memorizadas, e a etapa 4 conta as peças. Após a etapa 4, uma divergência em OU
com receptividades exclusivas volta ao início ou, a cada 100 peças, vai para a manutenção.

O editor tem mais exemplos: um enchimento de tanque com entradas numéricas, esteiras em paralelo com
um grafcet de segurança que força a linha, uma linha de engarrafamento (macroetapa, três estações
em paralelo, inspeção e contadores) e modos de operação (uma etapa encapsulante, uma pausa que
congela o ciclo, uma parada de emergência). Abra-os na tela inicial do [GrafcetMaker](app:).

## Desenhar e simular GRAFCET online

O [GrafcetMaker](app:) é um editor de GRAFCET gratuito e de código aberto, feito para engenheiros de
automação, professores e estudantes. Ele funciona inteiramente no navegador, funciona off-line e não
exige conta; seus diagramas ficam no seu computador.

- Desenhe etapas, transições, ações e ramos com o mouse ou o teclado, e mantenha tudo organizado
  com a organização automática.
- Escreva receptividades com preenchimento automático e uma tabela de variáveis, e receba erros
  claros com correções rápidas.
- Simule com as regras da IEC 60848: etapas ativas, temporizações, bordas, etapas instáveis,
  forçamento e um cronograma de cada variável.
- Estruture projetos com grafcets parciais, macroetapas, etapas encapsulantes e ordens de
  forçamento.
- Exporte para PDF com carimbo, SVG e PNG, ou para Texto Estruturado e PLCopen TC6 XML, e
  compartilhe um projeto inteiro como link.

[Abrir o editor de GRAFCET gratuito](app:)

## Perguntas frequentes

### Para que serve o GRAFCET?

Para especificar o comportamento de sistemas automatizados com sequências: máquinas, linhas de
montagem, embalagem, processos em batelada, elevadores, semáforos. O diagrama é a referência
compartilhada por quem projeta a máquina, programa o CLP e a testa.

### GRAFCET é a mesma coisa que SFC?

Não. O SFC (IEC 61131-3) foi derivado do GRAFCET e usa os mesmos símbolos, mas o GRAFCET é uma
linguagem de especificação com regras de evolução precisas, e o SFC é uma linguagem de programação
de CLP cuja execução depende do controlador. Veja [GRAFCET e SFC](#grafcet-e-sfc).

### Qual é a diferença entre etapa e transição?

Uma etapa é uma situação que dura (o sistema está enchendo o tanque); uma transição é o instante em
que o sistema passa de uma situação para a seguinte, quando sua receptividade se torna verdadeira (o
tanque está cheio).

### O que significa X1?

`X1` é a variável de etapa da etapa 1: ela é verdadeira enquanto a etapa 1 está ativa. É usada em
receptividades, em condições de ações e em outros grafcets, por exemplo `5s/X1` ou `X1 * /X5`.

### O que é uma etapa instável?

Uma etapa que é ativada e desativada de novo dentro de uma única busca de estabilidade, porque a
receptividade abaixo dela já era verdadeira. Suas ações contínuas não são executadas; suas ações
memorizadas sim.

### Como transformar um GRAFCET em um programa de CLP?

Cada etapa vira um bit de memória, cada transição uma condição que liga as etapas abaixo e desliga
as etapas acima, e as saídas são escritas a partir dos bits de etapa. Você pode fazer isso à mão em
ladder ou Texto Estruturado, usar a linguagem SFC do seu CLP ou deixar o GrafcetMaker gerar Texto
Estruturado ou PLCopen XML como ponto de partida.

### Existe software de GRAFCET gratuito?

Sim: o [GrafcetMaker](app:) é gratuito e de código aberto (licença MIT). Ele funciona em qualquer
navegador moderno no Windows, macOS, Linux, tablets e celulares, e as empresas podem hospedá-lo na
sua própria rede.
