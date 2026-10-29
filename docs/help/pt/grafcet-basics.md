# Noções básicas de GRAFCET

O GRAFCET (IEC 60848) descreve o comportamento de um sistema sequencial — uma máquina, um
processo, um semáforo — como uma série de **etapas** ligadas por **transições**. É a linguagem de
especificação por trás da linguagem SFC dos CLPs (IEC 61131-3).

<!-- figure: anatomy | As partes de um grafcet -->

## Etapas {#steps}

Uma **etapa** é uma situação estável do sistema: _aguardando_, _enchendo_, _furando_. Ela é
desenhada como um quadrado com seu número. A cada instante, uma etapa está **ativa** ou
**inativa**; o conjunto das etapas ativas é a **situação** do grafcet.

- Uma **etapa inicial** (quadrado duplo) está ativa quando o sistema inicia. Um grafcet precisa de
  pelo menos uma.
- A variável `X3` é verdadeira enquanto a etapa 3 está ativa. Você pode usá-la em receptividades e
  condições.

## Transições e receptividades {#transitions-and-receptivities}

Uma **transição** (barra horizontal curta) liga etapas. Sua **receptividade**, escrita ao lado
dela, é a condição para avançar: uma entrada (`start`), uma combinação (`start * /door`), uma
borda (`↑b`), uma temporização (`5s/X2`) ou uma comparação (`level >= 80`). A receptividade `1` é
sempre verdadeira.

- Uma transição está **habilitada** quando todas as etapas imediatamente acima dela estão ativas.
- Uma transição habilitada é **transposta** assim que sua receptividade é verdadeira.

## Ações {#actions}

Os retângulos à direita de uma etapa são suas **ações**: o que o sistema faz enquanto a etapa está
ativa, ex.: _ligar a bomba_. Uma **ação contínua** nomeia uma saída que é verdadeira enquanto a
etapa está ativa. As ações memorizadas mudam um valor uma vez, quando uma etapa é ativada ou
desativada ou quando ocorre um evento. Veja [Ações](actions.md).

## As cinco regras de evolução {#the-five-evolution-rules}

Estas regras, da IEC 60848, decidem como um grafcet evolui. O simulador as aplica exatamente.

1. **Situação inicial**: no início, as etapas iniciais estão ativas.
2. **Condição de transposição**: uma transição é transposta quando está habilitada e sua
   receptividade é verdadeira.
3. **Transposição**: transpor uma transição ativa todas as etapas imediatamente abaixo dela e
   desativa todas as etapas imediatamente acima dela.
4. **Transposição simultânea**: todas as transições que podem ser transpostas ao mesmo tempo são
   transpostas ao mesmo tempo.
5. **Ativada e desativada ao mesmo tempo**: uma etapa que é ativada e desativada ao mesmo tempo
   permanece ativa.

Após uma mudança de entrada, as regras são aplicadas repetidamente até que nenhuma transição possa
ser transposta: é a **busca de estabilidade**. As etapas ativadas e deixadas de novo durante essa
busca são **instáveis** (transitórias): suas ações contínuas não são executadas, mas suas ações
memorizadas são.

## Escolher entre caminhos: OU {#choosing-between-paths-or}

Quando uma etapa é seguida de várias transições, o grafcet segue o caminho cuja receptividade é
verdadeira: um **ramo alternativo**, desenhado com uma linha horizontal simples (**divergência em
OU**). Os caminhos se juntam de novo em uma linha simples (**convergência em OU**).

<!-- figure: or | Divergência e convergência em OU -->

Torne as receptividades **exclusivas** (nunca podem ser verdadeiras juntas), aqui `a` e `/a * b`.
Caso contrário, os dois caminhos seriam seguidos ao mesmo tempo. O GrafcetMaker avisa quando não
consegue provar que receptividades alternativas são exclusivas, e oferece dar prioridade a um dos
ramos.

## Fazer coisas ao mesmo tempo: E {#doing-things-at-the-same-time-and}

Quando uma transição é seguida de várias etapas, todas são ativadas juntas: **ramos paralelos**,
desenhados com uma linha dupla (**divergência em E**). Os ramos também terminam em uma linha dupla
(**convergência em E**): a transição abaixo dela só fica habilitada quando a última etapa de cada
ramo está ativa, então ela espera todos os ramos terminarem.

<!-- figure: and | Divergência e convergência em E -->

## Retornos {#loops}

Uma ligação que sobe, desenhada com uma seta, volta a uma etapa anterior: a forma habitual de
repetir um ciclo. Pressione <kbd>L</kbd> em uma etapa e depois clique na etapa para onde voltar.

## Aplicações maiores {#bigger-applications}

- Um projeto pode conter vários **grafcets parciais** que funcionam juntos, ex.: um para o ciclo e
  um para a segurança. Eles veem as etapas uns dos outros por meio de `Xn`.
- Uma **macroetapa** representa uma sequência detalhada desenhada em folha própria, sua
  **expansão**.
- Uma **etapa encapsulante** contém um grafcet inteiro, que só funciona enquanto ela está ativa.
- Uma **ordem de forçamento** impõe uma situação a outro grafcet, ex.: uma parada de emergência.

Veja [Macroetapas, etapas encapsulantes e forçamento](hierarchy.md).

## Saiba mais {#learn-more}

- [Escrever receptividades](expressions.md) — a sintaxe completa das expressões.
- [Glossário](glossary.md) — todos os termos padrão em um só lugar.
- A interpretação exata de cada regra no GrafcetMaker está documentada em `docs/semantics.md` do
  repositório do código-fonte.
