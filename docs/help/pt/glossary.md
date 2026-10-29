# Glossário

Os termos padrão de GRAFCET (IEC 60848) como são usados no GrafcetMaker.

| Termo                            | Significado                                                                                                         |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Ação**                         | O que o sistema faz em relação a uma etapa; desenhada em um retângulo à direita da etapa.                           |
| **Ação contínua**                | Saída verdadeira enquanto sua etapa está ativa (e sua condição é verdadeira).                                       |
| **Ação memorizada**              | Ação executada uma vez — na ativação, na desativação ou em um evento — cujo efeito permanece.                       |
| **Borda**                        | Mudança instantânea de um sinal: borda de subida ↑a (falso → verdadeiro), borda de descida ↓a (verdadeiro → falso). |
| **Busca de estabilidade**        | Repetir as regras de evolução após uma mudança de entrada até que nenhuma transição possa ser transposta.           |
| **Condição de atribuição**       | Condição de uma ação contínua: a saída só é verdadeira enquanto a condição também for.                              |
| **Convergência em E**            | Linha dupla onde os ramos paralelos terminam; a transição seguinte espera por todos eles.                           |
| **Convergência em OU**           | Linha simples onde os ramos alternativos se juntam de novo.                                                         |
| **Divergência em E**             | Linha dupla após uma transição que ativa várias etapas ao mesmo tempo (ramos paralelos).                            |
| **Divergência em OU**            | Linha simples após uma etapa seguida de várias transições; um caminho é escolhido.                                  |
| **Etapa**                        | Uma situação estável do sistema; desenhada como um quadrado numerado.                                               |
| **Etapa ativa**                  | Uma etapa que faz parte da situação atual; na simulação, ela tem uma ficha.                                         |
| **Etapa encapsulante**           | Etapa que contém um grafcet encapsulado, que só funciona enquanto a etapa está ativa.                               |
| **Etapa inicial**                | Etapa ativa no início; desenhada como um quadrado duplo.                                                            |
| **Etapa transitória (instável)** | Etapa ativada e desativada durante uma mesma busca de estabilidade.                                                 |
| **Evento**                       | Uma borda ou outra condição instantânea que dispara uma ação memorizada em evento.                                  |
| **Expansão**                     | O grafcet desenhado para uma macroetapa, da sua etapa de entrada E até sua etapa de saída S.                        |
| **Grafcet parcial**              | Um dos grafcets de um projeto; todos funcionam juntos.                                                              |
| **Macroetapa**                   | Etapa que representa uma expansão desenhada em folha própria.                                                       |
| **Ordem de forçamento**          | Ação que impõe uma situação a outro grafcet parcial, ex.: `G2{8}`.                                                  |
| **Receptividade**                | A condição escrita ao lado de uma transição.                                                                        |
| **Situação**                     | O conjunto das etapas ativas em um dado instante.                                                                   |
| **Temporização**                 | `t/c`: verdadeira um tempo t depois que a condição c se tornou verdadeira, ex.: `5s/X2`.                            |
| **Transição**                    | Barra entre etapas; o grafcet evolui transpondo transições.                                                         |
| **Transição fonte / sumidouro**  | Uma transição sem etapa acima / abaixo dela.                                                                        |
| **Transição habilitada**         | Uma transição cujas etapas a montante estão todas ativas.                                                           |
| **Transponível**                 | Habilitada e com receptividade verdadeira: a transição será transposta.                                             |
| **Transpor (uma transição)**     | Atravessá-la: ativar as etapas abaixo, desativar as etapas acima.                                                   |
| **Variável de etapa**            | `Xn`: verdadeira enquanto a etapa n está ativa.                                                                     |
