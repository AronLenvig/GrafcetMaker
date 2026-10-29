# Simulação

O simulador executa seu grafcet exatamente de acordo com as regras da IEC 60848, para que você
possa testá-lo antes que ele chegue a um CLP.

## Iniciar e parar {#start-and-stop}

Pressione <kbd>F5</kbd> (ou **Simular › Iniciar simulação**). O diagrama fica bloqueado, os
controles da simulação substituem as ferramentas no topo, o painel **Simulação** aparece à
esquerda (recolha-o com sua divisa para ver mais do diagrama) e o relógio começa a correr.
<kbd>Shift+F5</kbd> para a simulação e volta à edição.

## Mudar entradas {#change-inputs}

O painel **Simulação** lista as entradas:

- As entradas **BOOL** têm um interruptor e um botão **Manter** para um acionamento momentâneo
  (como um botão de pressão; com o teclado, mantenha <kbd>Space</kbd> pressionada sobre ele).
- As entradas **INT**, **REAL** e **TIME** têm um campo de valor.

Você também pode **clicar em uma entrada BOOL onde ela está escrita** em uma receptividade ou
condição no diagrama (ou tocá-la com o dedo): ela liga ou desliga. O grafcet evolui assim que uma
entrada muda.

Durante a simulação, cada variável **INT**, **REAL** ou **TIME** escrita em uma receptividade ou
condição mostra seu valor atual em uma pequena caixa acima do nome, e uma ação memorizada mostra o
valor da variável que ela escreve abaixo do seu retângulo. **Clique em um valor** (ou toque nele)
para digitar um novo, depois pressione <kbd>Enter</kbd> (<kbd>Escape</kbd> cancela). Isso funciona
para entradas e também para variáveis internas e saídas, por exemplo para testar um contador
perto do seu limite.

**Aponte para uma transição** (ou toque nela) para ver o que ela aguarda: as etapas que precisam
estar ativas antes, ou os termos da sua receptividade que ainda são falsos, com o tempo restante
de uma temporização como `10s/X0`. Uma borda como `↑start` é sempre listada: ela só é verdadeira
no instante em que sua entrada muda.

## Tempo {#time}

O tempo no simulador é virtual e determinístico.

- <kbd>F5</kbd> pausa o relógio e o faz correr de novo. As temporizações (`5s/X2`) só avançam
  enquanto ele corre.
- A velocidade vai de ×0,25 a ×10. **Rápido** salta direto do vencimento de um temporizador para o
  próximo.
- <kbd>F10</kbd> salta para o próximo vencimento de temporizador e executa esse ciclo.
- **⟲** reinicia a partir da situação inicial.

A barra mostra o tempo, o número do ciclo e quando o próximo temporizador vence. A velocidade
padrão fica em **Configurações › Simulação**.

## O que você vê no diagrama {#what-you-see-on-the-diagram}

- As **etapas ativas** são preenchidas e têm uma ficha, com o tempo em que estão ativas abaixo.
- As **transições habilitadas** têm um marcador ▶; as transições piscam ao serem transpostas.
- Os **sinais verdadeiros** ficam verdes, em negrito e sublinhados nas receptividades e nas
  condições das ações: uma variável ligada, uma etapa ativa `Xn`, uma comparação satisfeita. O que
  não está verde é o que a transição ainda aguarda. Sob uma barra de NOT, a cor mostra o próprio
  sinal: em `/a`, `a` fica verde quando `a` está ligada.
- As **ações contínuas** em execução mostram um ✓; as **ações memorizadas** mostram o valor atual
  da sua variável.

## Registro da evolução {#evolution-log}

O registro do painel Simulação (recolhido: clique em **Registro da evolução** para abri-lo) lista
cada ciclo com o que o disparou e cada iteração da busca de estabilidade: transições transpostas,
etapas ativadas e desativadas. As evoluções transitórias (etapas atravessadas sem parar) ficam
visíveis ali. Clique em um ciclo para ver o diagrama como estava naquele instante.

## Acompanhar vários grafcets {#watching-several-grafcets}

Em uma vista dividida (<kbd>Ctrl+\</kbd>), os dois painéis mostram a simulação ao vivo: acompanhe
um grafcet de produção e seu grafcet de segurança, ou uma macroetapa e sua expansão, lado a lado.

## Cronograma {#chronogram}

O painel **Cronograma** (seu botão fica no canto inferior direito) desenha cada variável e as
etapas do grafcet aberto ao longo do tempo. Clique ou arraste nele para voltar no tempo: o diagrama
acompanha. **Voltar ao vivo** retorna ao presente.

## Cenários {#scenarios}

Para repetir um teste exatamente, grave-o:

1. Clique em **Gravar**: a simulação reinicia e grava cada mudança de entrada com seu instante.
2. Faça seu teste, depois pare a gravação e dê um nome ao cenário. Ele é salvo no projeto.
3. **Reproduzir** reinicia a simulação e reproduz o cenário.

## Quando o grafcet nunca se estabiliza {#when-the-grafcet-never-settles}

Se as transições continuarem transpondo umas às outras (por exemplo, um ciclo em que todas as
receptividades são verdadeiras), a evolução nunca se torna estável. O simulador para após 1000
iterações e indica um **ciclo transitório** em Problemas. Adicione uma condição (muitas vezes uma
borda `↑a`) para que o ciclo não possa rodar indefinidamente. Veja
[Solução de problemas](troubleshooting.md).
