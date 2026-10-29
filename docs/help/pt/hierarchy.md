# Macroetapas, etapas encapsulantes e forçamento

Aplicações grandes ficam mais fáceis de ler quando são divididas. O GRAFCET oferece três
ferramentas, todas disponíveis no GrafcetMaker.

## Vários grafcets parciais {#several-partial-grafcets}

Um projeto pode conter vários **grafcets parciais**, um por aba na parte inferior da janela, ex.:
_G1_ para o ciclo de produção e _G2_ para a lógica de segurança. Todos funcionam ao mesmo tempo e
podem observar uns aos outros por meio das variáveis de etapa (`X21` em G1 é verdadeira enquanto a
etapa 21 de G2 está ativa).

- Clique em **+** ao lado das abas para adicionar um. Os números das etapas dele começam na
  próxima dezena livre (20, 30…), para que as referências `Xn` continuem sem ambiguidade.
- Clique duas vezes em uma aba (ou pressione <kbd>F2</kbd> nela) para renomeá-la; arraste-a para o
  lado para mudar a ordem; pressione <kbd>Del</kbd> nela para excluí-la. <kbd>Ctrl</kbd>+clique ou
  <kbd>Shift</kbd>+clique escolhe várias abas para excluí-las juntas. Clique com o botão direito em
  uma aba para mais opções. Muitas abas rolam com a roda do mouse ou com os botões ‹ ›.

## Macroetapas {#macro-steps}

Uma **macroetapa** representa uma sequência detalhada desenhada em folha própria, sua
**expansão**. Ela é desenhada como uma etapa com duas linhas horizontais.

<!-- figure: macro | Uma macroetapa na sequência principal -->

1. Selecione uma etapa e defina seu **Tipo** como _Macroetapa_ no painel Propriedades (ou
   **Editar › Transformar em macroetapa (com expansão)**).
2. Uma nova aba abre com a expansão: uma etapa de entrada **E** e uma etapa de saída **S** ligadas
   por uma transição. Desenhe a sequência detalhada entre elas.
3. Clique duas vezes na macroetapa (ou pressione <kbd>Alt+↓</kbd>) para abrir sua expansão;
   <kbd>Alt+↑</kbd> volta à macroetapa.

Quando a macroetapa é ativada, sua etapa de entrada se torna ativa; a transição após a macroetapa
só fica habilitada quando a etapa de saída está ativa. A macroetapa conta como ativa enquanto
qualquer etapa da sua expansão estiver ativa.

## Etapas encapsulantes {#enclosing-steps}

Uma **etapa encapsulante** contém um grafcet inteiro, o **grafcet encapsulado**, que só funciona
enquanto a etapa encapsulante está ativa. Use-a para modos: _automático_, _manual_, _ajuste_. Ela
é desenhada como uma etapa com duas linhas verticais.

1. Defina o **Tipo** da etapa como _Etapa encapsulante_ (ou **Editar › Transformar em etapa
   encapsulante (com grafcet encapsulado)**).
2. Uma nova aba contém o grafcet encapsulado. As etapas marcadas ali com `*` se tornam ativas
   quando a etapa encapsulante é ativada.
3. Quando a etapa encapsulante é deixada, todas as etapas do grafcet encapsulado são desativadas.

As abas de expansões e de grafcets encapsulados levam um selo **M** ou **E**.

## Ordens de forçamento {#forcing-orders}

Uma **ordem de forçamento** é uma ação que impõe uma situação a outro grafcet parcial enquanto sua
etapa está ativa. O grafcet forçado não evolui nesse meio-tempo.

| Ordem      | Efeito em G2                    |
| ---------- | ------------------------------- |
| `G2{8}`    | só a etapa 8 está ativa         |
| `G2{8, 9}` | só as etapas 8 e 9 estão ativas |
| `G2{*}`    | congelado na sua situação atual |
| `G2{}`     | nenhuma etapa está ativa        |
| `G2{INIT}` | de volta à sua situação inicial |

O forçamento é a forma padrão de descrever paradas de emergência e mudanças de modo: um grafcet de
segurança força o grafcet de produção à sua situação inicial, por exemplo. Um grafcet não pode
forçar a si mesmo, e dois grafcets não podem forçar um ao outro.

## Verificações {#checks}

O GrafcetMaker verifica se cada macroetapa e cada etapa encapsulante tem seu próprio subgrafcet do
tipo certo, se as expansões têm uma etapa de entrada e uma de saída, e se as ordens de forçamento
apontam para grafcets e etapas existentes.
