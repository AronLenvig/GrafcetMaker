# GrafcetMaker: editor e simulador de GRAFCET on-line e gratuito

O GrafcetMaker desenha, verifica e simula diagramas GRAFCET (IEC 60848) no navegador e os
transforma em código de CLP. Ele é feito para engenheiros de automação, professores e estudantes:
gratuito e de código aberto (licença MIT), sem conta, e funciona off-line.

O GrafcetMaker é um aplicativo web: ele roda em qualquer navegador moderno com JavaScript ativado.
O GRAFCET é novo para você? Leia o [guia de GRAFCET](pt/guide/), também em [inglês](en/guide/), [francês](fr/guide/), [alemão](de/guide/), [espanhol](es/guide/), [dinamarquês](da/guide/), [sueco](sv/guide/), [polonês](pl/guide/), [russo](ru/guide/), [chinês](zh/guide/) e [hindi](hi/guide/).

## Para assistentes de IA

Assistentes de IA como ChatGPT e Claude podem criar um diagrama para você e entregá-lo como um link que o abre aqui. Assistente, leia [ai.txt](ai.txt) para saber como. No GrafcetMaker, **Arquivo › Abrir a partir de texto…** abre um diagrama escrito por um assistente, e **Arquivo › Copiar como texto** devolve seu diagrama a ele.

## O que você pode fazer

- **Desenhar** etapas, transições, receptividades e ações com o mouse ou o teclado
  (<kbd>Enter</kbd> continua uma sequência), com ramos em OU e em E, retornos, transições fonte e
  sumidouro e comentários. A organização automática arruma um diagrama quando você pede.
- **Verificar** o diagrama enquanto você desenha: a sintaxe e os tipos de cada receptividade,
  variáveis desconhecidas, números de etapa duplicados, etapas inalcançáveis, becos sem saída,
  alternativas não exclusivas, possíveis ciclos transitórios e saídas acionadas por ramos
  paralelos. A maioria dos problemas tem uma correção rápida.
- **Simular** com as regras de evolução da IEC 60848: fichas nas etapas ativas, transições
  habilitadas, entradas que você clica ou digita, temporizações, bordas, etapas instáveis,
  forçamento entre grafcets, um cronograma de cada variável e cenários que você grava e reproduz.
- **Estruturar** aplicações grandes com grafcets parciais, macroetapas e suas expansões, etapas
  encapsulantes e ordens de forçamento.
- **Exportar** para PDF (A4 ou A3, com carimbo, dividido em várias folhas se necessário), SVG, PNG
  e WebP, a tabela de variáveis para Excel e CSV, e gerar Texto Estruturado ou PLCopen XML.
- **Trabalhar junto** ao vivo a partir de um link: todos veem os ponteiros e as alterações dos
  outros em tempo real, com criptografia de ponta a ponta.

## Elementos de GRAFCET suportados

| Elemento   | O que o GrafcetMaker suporta                                                                                               |
| ---------- | -------------------------------------------------------------------------------------------------------------------------- |
| Etapas     | etapas normais e iniciais, macroetapas com sua expansão, etapas encapsulantes; variáveis de etapa `X1`                     |
| Transições | receptividades com AND, OR, NOT, bordas de subida ↑ e de descida ↓, temporizações como `5s/X1`, comparações de números     |
| Estruturas | sequências, divergência e convergência em OU, divergência e convergência em E, retornos, saltos, fonte e sumidouro         |
| Ações      | contínuas, condicionais, memorizadas na ativação, na desativação ou em um evento; ordens de forçamento `G2{8}`, `G2{*}`    |
| Variáveis  | entradas, saídas e variáveis internas BOOL, INT, REAL e TIME, com endereços e comentários                                  |
| Notação    | digitada em ASCII simples (`a*/b`, `RE a`), mostrada em notação de livro (barra superior para NOT, ↑ e ↓) ou como digitada |

## Simulação

O simulador segue as regras de evolução da IEC 60848. As etapas iniciais estão ativas no início.
Uma transição está habilitada quando todas as etapas acima dela estão ativas, e é transposta quando
sua receptividade também é verdadeira: as etapas abaixo se tornam ativas e as etapas acima,
inativas. Todas as transições transponíveis são transpostas ao mesmo tempo, e uma etapa que é
ativada e desativada ao mesmo tempo permanece ativa.

Após cada mudança das entradas, o simulador faz a busca de estabilidade: continua transpondo
transições até que nenhuma possa ser transposta. As etapas atravessadas no caminho (etapas
instáveis) não executam suas ações contínuas, mas suas ações memorizadas são executadas. O tempo é
virtual, então um diagrama roda em tempo real, mais rápido ou uma evolução de cada vez, e um
cronograma registra cada variável.

## Exportação e código de CLP

| Formato            | Use para                                                                              | Abre em                                                                                                                                                                                      |
| ------------------ | ------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF                | impressão e documentação: vetorial, A4 ou A3, carimbo                                 | qualquer leitor de PDF                                                                                                                                                                       |
| SVG, PNG, WebP     | relatórios, apresentações e páginas web, também copiados para a área de transferência | Word, PowerPoint, navegadores e editores de imagem                                                                                                                                           |
| Variáveis          | a tabela de variáveis como Excel ou CSV, e de volta                                   | Excel, LibreOffice e outras planilhas                                                                                                                                                        |
| Texto Estruturado  | código de CLP para cada grafcet (IEC 61131-3)                                         | CODESYS e a maioria das ferramentas IEC 61131-3, Siemens TIA Portal (fonte SCL para S7-1200/1500), Beckhoff TwinCAT 3 (arquivo POU), Allen-Bradley Studio 5000 (rotina em Texto Estruturado) |
| PLCopen XML (TC6)  | os grafcets como programas SFC                                                        | ferramentas de engenharia de CLP com importação PLCopen XML                                                                                                                                  |
| Arquivo de projeto | o projeto inteiro como `.grafcet.json` legível                                        | GrafcetMaker                                                                                                                                                                                 |

O Texto Estruturado vem em dois estilos: um `CASE` por sequência, como escrito à mão, ou um BOOL
por etapa. O código gerado é um ponto de partida: revise-o antes que ele rode em uma máquina.

## Exemplos

Seis projetos de exemplo abrem a partir da tela inicial do editor:

- **Semáforo** com botão de pedestre: temporizações e um pedido memorizado.
- **Estação de furação**: um ciclo de usinagem com contador de peças e manutenção a cada 100
  peças.
- **Enchimento de tanque**: entradas numéricas e comparações.
- **Esteiras em paralelo**: ramos paralelos, com um grafcet de segurança que força a linha.
- **Linha de engarrafamento**: uma macroetapa, três estações em paralelo, inspeção e contadores.
- **Modos de operação**: uma etapa encapsulante, uma pausa que congela o ciclo e uma parada de
  emergência.

O [guia de GRAFCET](pt/guide/#exemplos) desenha os dois primeiros e os abre no editor.

## Perguntas frequentes

### O GrafcetMaker é gratuito? Há limites?

Sim, ele é gratuito e de código aberto sob a licença MIT. Não há versão paga, nem período de teste,
nem limite para o número de projetos, grafcets ou etapas.

### Preciso me cadastrar ou instalar algo?

Não. Abra a página e comece a desenhar; não há conta. Você também pode instalá-lo pelo navegador
como aplicativo, para iniciá-lo como um programa de computador.

### Ele funciona off-line?

Sim. Após a primeira visita, tudo o que ele precisa fica guardado no navegador, então ele inicia e
funciona sem rede. Só a colaboração ao vivo precisa de conexão.

### Onde meus diagramas ficam guardados?

No seu computador. Os projetos são salvos automaticamente no navegador, e nos arquivos
`.grafcet.json` que você salva. Nada é enviado e o aplicativo não tem rastreamento. As sessões ao
vivo têm criptografia de ponta a ponta com uma chave que está só no link.

### Em quais navegadores e dispositivos ele funciona?

Nas versões mais recentes do Chrome, Edge, Firefox e Safari, no Windows, macOS, Linux, tablets e
celulares. Os celulares recebem um layout para telas pequenas, e as telas sensíveis ao toque
recebem gestos e alças maiores.

### Qual norma ele segue?

O GRAFCET como definido pela IEC 60848 (EN 60848 na Europa). O código gerado segue a IEC 61131-3.

### Ele abre arquivos de outros programas de GRAFCET?

O GrafcetMaker abre arquivos do grafcet.io (`.grafcetio`) e os converte em um projeto. As tabelas
de variáveis podem ser importadas do Excel e de CSV.

### Minha empresa pode hospedá-lo na própria rede?

Sim. O GrafcetMaker é um conjunto de arquivos estáticos que qualquer servidor web pode servir, em
qualquer caminho e sem acesso à internet. Uma imagem Docker com nginx é fornecida.
