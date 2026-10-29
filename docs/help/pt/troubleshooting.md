# Solução de problemas

O GrafcetMaker verifica seu projeto enquanto você trabalha. Os contadores no canto superior
direito mostram o número de **erros** (vermelho) e **avisos** (laranja); clique neles para abrir a
lista de **Problemas**. Clique em um problema para ir até o elemento, e use seu botão de correção
quando houver um. Os elementos com problema também levam um selo no diagrama: aponte para ele para
ver os detalhes.

## Erros {#errors}

**O grafcet G1 não tem etapa inicial.** Nada pode jamais se tornar ativo. Selecione a primeira
etapa e use a correção **Tornar a etapa … inicial**, ou defina seu Tipo como _Etapa inicial_.

**Várias etapas têm o mesmo número.** Os números devem ser únicos em um grafcet, senão `Xn` seria
ambíguo. Use **Renumerar etapas** ou mude um número com <kbd>F2</kbd>.

**Receptividade vazia.** Toda transição precisa de uma condição. Use `1` para uma transição sempre
verdadeira (a correção faz isso por você).

**Variável desconhecida.** O nome não está declarado (um arquivo escrito em outro lugar, ou uma
variável excluída). Os nomes que você digita em uma receptividade ou ação são criados para você;
para os outros, use a correção para criá-la, ou escolha o nome sugerido se for um erro de
digitação.

**Problemas de expressão** (caractere inesperado, parêntese faltando…). O quadro de problema sob o
campo marca a posição e dá uma dica. Um caso frequente: `/` significa NOT antes de uma condição,
então escreva `a * /b` para "a e não b". Veja [Escrever receptividades](expressions.md).

**Uma ação atribui uma entrada.** As entradas vêm do processo e não podem ser escritas. Mude a
direção da variável ou use outra variável.

**A ordem de forçamento aponta para um grafcet ou etapa inexistente.** Verifique o nome do grafcet
e os números das etapas na ordem.

**As ordens de forçamento formam um ciclo.** Um grafcet não pode forçar outro que o força,
diretamente ou por meio de outros. Remova uma das ordens, ou deixe um terceiro grafcet forçar os
dois.

**As macroetapas e etapas encapsulantes formam um ciclo.** Um grafcet não pode conter a si mesmo:
uma macroetapa ou etapa encapsulante leva de volta, diretamente ou por meio de outras, ao seu
próprio grafcet. Mude essa etapa para _Etapa_ e de volta: ela recebe um subgrafcet próprio.

**A macroetapa … não tem grafcet de expansão** (ou **A etapa encapsulante … não tem grafcet
encapsulado**). Seu subgrafcet foi excluído. Mude o Tipo da etapa para _Etapa_ e de volta para
_Macroetapa_ (ou _Etapa encapsulante_) para obter um novo, ou mantenha-a como etapa normal.

**O grafcet … é usado por várias etapas.** Cada macroetapa e etapa encapsulante precisa do seu
próprio subgrafcet. Mude uma das etapas para _Etapa_ e de volta: ela recebe um subgrafcet próprio.

## Avisos {#warnings}

**A etapa … nunca pode se tornar ativa.** Nenhum caminho leva até ela a partir de uma etapa
inicial. Ligue-a, ou exclua-a.

**A etapa … não tem transição de saída.** Uma vez ativa, ela permanece ativa para sempre.
Geralmente falta um retorno (<kbd>L</kbd>).

**Os ramos alternativos não são exclusivos.** As duas receptividades podem ser verdadeiras juntas,
o que ativaria os dois ramos. Torne-as exclusivas, ex.: `a` e `/a * b`, ou use a correção **Dar
prioridade a …**.

**Possível evolução transitória sem fim.** Um ciclo de transições poderia ser todo verdadeiro ao
mesmo tempo, então o grafcet nunca se estabilizaria. Adicione uma condição, muitas vezes uma borda
(`↑start`), que não possa permanecer verdadeira.

**Saída acionada por ações contínuas de etapas que podem estar ativas juntas.** Dois ramos
paralelos acionam a mesma saída. Acione-a de um só lugar, ou use ações memorizadas.

**Uma ação sem etapa é memorizada na desativação.** Sem etapa, a ação está sempre ativa e nunca é
desativada, então nunca é executada. Associe-a a uma etapa, ou mude seu tipo.

**Saída acionada por uma ação sem etapa e por outra ação.** A saída é verdadeira sempre que
qualquer uma delas for. Confirme se é isso que você quer.

**Memorizada em evento, mas sem evento.** Digite o evento (ex.: `↑b`) no painel Propriedades.

**Ação condicional sem condição.** Ela se comporta como uma ação contínua até você digitar sua
condição no painel Propriedades.

**As ações memorizadas de uma macroetapa são ignoradas.** Uma macroetapa fica ativa por meio da
sua expansão: coloque as ações memorizadas em uma etapa da expansão.

**Forçado à situação vazia, nunca desfeita.** Uma ordem como `G2{}` desativa todas as etapas de
G2, e nada volta a ativá-las. Use `G2{INIT}` para reiniciar G2 na sua situação inicial.

**A expansão (ou o grafcet encapsulado) … não é usada.** Nenhuma macroetapa ou etapa encapsulante
aponta para ela. Exclua sua aba se não precisar mais dela.

**A expansão precisa de exatamente uma etapa de entrada e uma etapa de saída.** Em uma expansão
de macroetapa, a etapa de entrada não tem transição acima dela e a etapa de saída não tem nenhuma
abaixo dela.

## Informação {#information}

**A variável … não é usada.** Ela está declarada, mas nenhuma expressão a usa. Exclua-a com a
correção, ou mantenha-a para depois.

## Outras perguntas {#other-questions}

**A simulação parou com um ciclo transitório.** Veja o aviso acima: o simulador para após 1000
iterações sem estabilidade, no instante indicado.

**Meu temporizador não corre.** As temporizações só avançam enquanto o relógio corre: pressione
<kbd>F5</kbd> para executar, ou <kbd>F10</kbd> para saltar ao próximo temporizador.

**Uma transição é transposta sem parar.** Se sua receptividade continua verdadeira, o grafcet dá
voltas o mais rápido que pode. Use uma borda `↑a` para reagir uma vez por acionamento.

**Perdi meu trabalho.** Veja em **Arquivo › Histórico local…**: os instantâneos são guardados no
navegador. Após uma recarga ou uma falha, o GrafcetMaker reabre seu último projeto
automaticamente, incluindo as alterações não salvas.

**O arquivo não abre.** O GrafcetMaker abre seus próprios arquivos `.grafcet.json` e os arquivos
do grafcet.io (`.grafcetio`); a mensagem diz por que um arquivo foi rejeitado. Um arquivo salvo
por uma versão mais recente do GrafcetMaker precisa dessa versão mais recente.
