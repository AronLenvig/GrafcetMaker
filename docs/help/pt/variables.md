# Variáveis

Cada nome usado em uma receptividade ou ação é uma **variável** do projeto. Declará-la dá a ela um
tipo e uma direção, permite que o GrafcetMaker verifique suas expressões e que o simulador ofereça
os controles certos.

## Tipos de variáveis {#kinds-of-variables}

- **Direção**: uma **entrada** vem do processo (sensores, botões) e só pode ser lida; uma
  **saída** aciona o processo (motores, lâmpadas); uma variável **interna** é uma memória ou um
  contador.
- **Tipo**: `BOOL` (verdadeiro / falso), `INT` (número inteiro), `REAL` (número decimal) ou `TIME`
  (duração, ex.: `500ms`, `3s`).
- **Valor inicial**: o valor no início de uma simulação (FALSE ou 0 quando vazio).
- **Endereço** e **comentário**: texto livre, ex.: um endereço de CLP `%I0.0` e o que o sinal é.

Os nomes não diferenciam maiúsculas de minúsculas, usam letras, dígitos e `_`, e não podem ser
palavras reservadas (`AND`, `OR`, `NOT`, `RE`, `FE`, `TRUE`, `FALSE`, `MOD`, `INIT`) nem parecer
uma variável de etapa (`X12`).

## Criar variáveis {#creating-variables}

- Enquanto você digita uma expressão, um nome novo é declarado quando você confirma: uma entrada
  em uma receptividade, uma saída em uma ação. É a forma mais rápida.
- **Adicionar variável** na lista ou na tabela de Variáveis.
- **Importar** uma lista do Excel ou de um CSV (veja abaixo).

## A tabela de variáveis {#the-variable-table}

O botão **Variáveis** no canto inferior direito abre as variáveis no lado direito da janela: uma
lista compacta (busca, filtros rápidos, grupos por direção; clique em uma variável para editá-la e
ver onde é usada). Alargue o painel pela borda esquerda e ele vira a tabela, com cada campo em
colunas. Edite qualquer célula no lugar (<kbd>Enter</kbd> ou sair da célula aplica, <kbd>Esc</kbd>
reverte), ordene clicando no cabeçalho de uma coluna, filtre por texto, direção e tipo. A tabela
continua rápida com milhares de variáveis.

A coluna **Usos** conta as expressões que usam cada variável; uma variável não usada mostra `0` em
laranja. Clique no número para abrir a variável no cartão de propriedades: edite todos os seus
campos e veja **onde ela é usada**; clique em um uso para ir até essa receptividade ou ação no
diagrama.

O botão de vassoura ao lado de **⋯** remove de uma vez todas as variáveis não usadas (seu selo
diz quantas): aquelas que nenhuma receptividade, ação ou condição usa e que nenhum cenário aciona.
É um único passo para desfazer (<kbd>Ctrl+Z</kbd>). Também está na paleta de comandos: **Remover
variáveis não usadas**.

Em um celular, o painel Variáveis é uma lista compacta: busca, filtros rápidos (**Entradas**,
**Saídas**, **Internas**), grupos por direção, e um toque abre uma variável com seus usos.

## Renomear {#renaming}

Renomear uma variável atualiza cada receptividade, ação e condição que a usa, em todos os
grafcets, como uma única alteração que pode ser desfeita.

## Excel e CSV {#excel-and-csv}

Use o menu **⋯** da lista ou da tabela de Variáveis, ou **Arquivo › Variáveis**:

- **Exportar variáveis como Excel** grava uma pasta de trabalho `.xlsx` com cabeçalho congelado,
  filtros e listas suspensas para tipo e direção.
- **Exportar variáveis como CSV** grava um arquivo de texto para outras ferramentas.
- **Importar variáveis (CSV ou Excel)…** lê um arquivo `.xlsx` ou `.csv` (você também pode soltá-lo
  na janela).

As colunas são `name`, `type`, `direction`, `initial`, `address` e `comment` (em qualquer ordem;
só `name` e `type` são obrigatórias). Antes de qualquer mudança, você vê quantas variáveis serão
adicionadas, atualizadas ou rejeitadas, com o motivo de cada linha rejeitada. As variáveis são
associadas pelo nome; as que não estão no arquivo são mantidas. A importação é uma única alteração
que pode ser desfeita.

> **Dica:** para preparar uma lista no Excel, exporte primeiro: você obtém as colunas e listas
> suspensas certas, depois preenche as linhas e importa o arquivo de volta.
