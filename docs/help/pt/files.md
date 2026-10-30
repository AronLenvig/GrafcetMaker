# Arquivos, salvamento e exportação

Tudo acontece no seu computador: não há conta e nada é enviado.

## Salvamento automático e recuperação {#autosave-and-recovery}

Cada alteração é guardada no navegador meio segundo depois de feita. Você pode recarregar ou
fechar a aba a qualquer momento sem nenhuma pergunta: na próxima vez que abrir o GrafcetMaker, seu
projeto estará como você o deixou, incluindo as alterações não salvas. Um ponto `●` ao lado do
nome do projeto indica que há alterações ainda não salvas em um arquivo.

**Arquivo › Histórico local…** lista os instantâneos guardados no navegador: criados quando você
salva, a cada poucos minutos enquanto você edita e antes de um projeto ser fechado. Restaurar um
deles o abre como alterações não salvas.

> **Importante:** o armazenamento do navegador pertence a este navegador neste computador, e
> limpar os dados do site o apaga. Salve em um arquivo tudo o que você quiser guardar.

## Off-line e instalação {#offline-and-installation}

Após a primeira visita, o GrafcetMaker funciona sem rede. Use o botão de instalação da barra de
endereços do navegador para tê-lo como aplicativo com janela própria. Quando uma nova versão
estiver pronta, um cartão no canto oferece recarregar: seu trabalho é mantido.

## Salvar e abrir {#save-and-open}

- **Salvar** (<kbd>Ctrl+S</kbd>) grava o projeto em um arquivo `.grafcet.json`. No Chrome e no
  Edge, ele grava no mesmo arquivo a cada vez; nos outros navegadores, ele baixa o arquivo.
- **Salvar como…** (<kbd>Ctrl+Shift+S</kbd>) escolhe um novo arquivo. **Arquivo › Baixar uma
  cópia** baixa uma cópia sem mudar onde Salvar grava.
- **Abrir…** (<kbd>Ctrl+O</kbd>), **Arquivo › Abrir recente**, ou solte um arquivo
  `.grafcet.json` em qualquer lugar da janela. Se o projeto aberto tiver alterações não salvas,
  você é consultado antes, e um arquivo inválido é rejeitado com uma explicação sem tocar no seu
  projeto.

Os arquivos `.grafcet.json` são texto legível, bem adequados a controle de versão (Git) e revisão
de código.

Os **arquivos do grafcet.io** (`.grafcetio`) abrem da mesma forma: eles são convertidos em um novo
projeto, com um grafcet parcial por diagrama (ou por quadro), as variáveis criadas a partir do que
os diagramas usam e uma disposição organizada. Uma mensagem lista tudo o que a conversão mudou.
Salve para mantê-lo como projeto do GrafcetMaker; o arquivo original não é modificado.

## Compartilhar um link {#share-a-link}

**Arquivo › Copiar link de compartilhamento** copia um endereço web que contém o projeto inteiro,
comprimido. Cole-o em um chat, um e-mail ou um chamado: quem o abrir recebe sua própria cópia do
projeto, com todos os seus grafcets e variáveis, e pode alterá-la sem afetar a sua.

- O projeto viaja dentro do link (após o `#`), que os navegadores nunca enviam ao servidor web:
  nada é enviado, e os links também funcionam off-line e em instalações internas.
- Qualquer pessoa que tenha o link pode ler o projeto, então compartilhe-o como o próprio arquivo.
- Um link é um instantâneo: alterações posteriores precisam de um novo link.
- Diagramas pequenos geram links de mil ou dois mil caracteres. Se o GrafcetMaker avisar que um
  link é longo, alguns aplicativos de chat e e-mail podem cortá-lo; envie o arquivo
  `.grafcet.json` em vez disso.
- Abrir um link funciona como abrir um arquivo: se o seu projeto tiver alterações não salvas, você
  é consultado antes, e um link danificado é rejeitado com uma explicação sem tocar no seu projeto.

## Diagramas de assistentes de IA {#charts-from-ai-assistants}

Um assistente de IA como ChatGPT ou Claude pode desenhar um diagrama para você. Peça a ele que leia
[grafcet.org/ai.txt](https://grafcet.org/ai.txt) antes: lá é explicado o texto GRAFCET, uma forma
de diagrama em texto simples, e como criar um link que abre o diagrama aqui.

- **Um link do assistente** abre o diagrama, organizado automaticamente, no lugar do projeto
  aberto (você é consultado antes se ele tiver alterações não salvas).
- **Arquivo › Abrir a partir de texto…** abre um diagrama que o assistente escreveu como texto:
  cole-o e clique em **Abrir**. Uma linha que não pode ser lida é indicada, com o que está errado;
  você pode corrigi-la ou mandar a mensagem de volta ao assistente.
- **Arquivo › Copiar como texto (para assistentes de IA)** copia seu diagrama como texto GRAFCET,
  para colar no chat e pedir alterações, uma explicação ou uma revisão.

As posições não fazem parte do texto: um diagrama aberto a partir de texto é organizado
automaticamente.

## Editar junto ao vivo {#edit-together-live}

**Arquivo › Colaboração ao vivo…** (ou o botão de pessoas no canto superior direito) permite que
várias pessoas editem o mesmo projeto ao mesmo tempo, cada uma no seu computador.

1. Digite seu nome e escolha **Iniciar sessão ao vivo**. Envie aos outros o link que aparece.
2. Eles abrem o link, digitam o nome e escolhem **Entrar**.
3. Todos veem os ponteiros e as seleções dos outros com seus nomes, e cada alteração aparece para
   todos em um instante.

- As alterações são mescladas campo a campo: mover uma etapa enquanto alguém a renomeia mantém as
  duas coisas.
- **Desfazer** desfaz apenas as suas próprias alterações.
- Enquanto você simula, as alterações dos outros aguardam para que o diagrama continue
  correspondendo à sua simulação: **Reiniciar com as alterações**, nos controles da simulação, as
  incorpora.
- Sem conexão, você pode continuar trabalhando; as alterações são trocadas quando ela voltar.
- **Sair da sessão** mantém o projeto no seu dispositivo como cópia sua.
- O projeto tem criptografia de ponta a ponta com uma chave que está só no link: qualquer pessoa
  que tenha o link pode ver e alterar o projeto, então compartilhe-o como o próprio arquivo.

## Exportação {#export}

**Arquivo › Exportar…** (<kbd>Ctrl+E</kbd>, ou o botão **Exportar** no canto superior direito)
abre uma única caixa de diálogo para todos os formatos, com pré-visualização ao vivo. Suas
configurações são lembradas por projeto. **Arquivo › Exportar como** a abre diretamente em um
formato.

| Formato               | Use para                                                                                                                      |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **PDF**               | impressão e documentação: vetorial, A4 ou A3, ajustado à página ou dividido em várias folhas, com carimbo                     |
| **SVG**               | documentos e web: vetorial, nítido em qualquer tamanho                                                                        |
| **PNG**               | apresentações, chats e chamados: resolução 1×, 2× ou 4×, opcionalmente transparente                                           |
| **WebP**              | o mesmo que PNG, com arquivos menores                                                                                         |
| **Variáveis (Excel)** | a tabela de variáveis como pasta de trabalho `.xlsx`                                                                          |
| **Variáveis (CSV)**   | a tabela de variáveis para outras ferramentas                                                                                 |
| **Texto Estruturado** | código de CLP que executa todos os grafcets: IEC 61131-3, Siemens TIA Portal (SCL), Beckhoff TwinCAT 3 ou Allen-Bradley Logix |
| **PLCopen XML**       | importar os grafcets em uma ferramenta de CLP como programas SFC                                                              |

Por padrão, as exportações são em preto no branco; escolha **Tema atual** para manter as cores da
tela. Exporte o grafcet atual, a seleção ou todos os grafcets.

**Arquivo › Copiar diagrama como PNG / SVG** coloca a seleção (ou o grafcet inteiro) na área de
transferência, pronta para colar em um relatório.

## Código de CLP {#plc-code}

**Texto Estruturado** e **PLCopen XML** transformam seus grafcets em código de CLP. Escolha o CLP
em **CLP**:

- **IEC 61131-3**: um bloco de função (`.st`) para CODESYS e a maioria das outras ferramentas.
- **Siemens TIA Portal (SCL)**: uma fonte SCL (`.scl`) para S7-1200/1500. No TIA Portal,
  adicione-a em **External source files** e escolha **Generate blocks from source**.
- **Beckhoff TwinCAT 3**: um arquivo POU (`.TcPOU`). Clique com o botão direito em uma pasta do
  projeto de CLP › **Add › Existing Item**.
- **Allen-Bradley Studio 5000**: uma rotina em Texto Estruturado. Crie as tags listadas no
  cabeçalho (escopo do programa) e depois cole o código em uma rotina ST. Os temporizadores usam
  TONR/TOFR, as bordas OSRI/OSFI, e a primeira varredura (`S:FS`) define os valores iniciais.

O Texto Estruturado vem em dois estilos:

- **CASE por sequência** (padrão): uma variável INT por sequência guarda o número da sua etapa
  ativa, e um `CASE` lista as transições de cada etapa (`IF receptivity THEN step_G1 := 2;`). As
  saídas vêm em seguida, uma linha cada, ex.: `Motor := step_G1 >= 2 AND step_G1 <= 4;`.
  Sequências com ramos paralelos mantêm um BOOL por etapa.
- **Um BOOL por etapa**: todas as transições, depois todas as etapas, depois os temporizadores, as
  bordas e as ações, uma vez por varredura do CLP; marque **Busca de estabilidade em cada
  varredura** para transpor cadeias de transições verdadeiras em uma única varredura, como faz o
  GRAFCET.

Uma ação memorizada como `Q1 := 1` na ativação é executada uma vez, e Q1 mantém seu valor depois
que a etapa é deixada. Marque **Manter as ações memorizadas com um valor constante** para
atribuí-la em cada varredura enquanto sua etapa estiver ativa.

O arquivo PLCopen contém um programa SFC por grafcet para importação em ferramentas de engenharia.
A pré-visualização lista tudo o que o formato não consegue expressar. Sempre revise o código
gerado antes de executá-lo em uma máquina.

## Configurações {#settings}

**☰ › Configurações…** (<kbd>Ctrl+,</kbd>) reúne as preferências de tema, notação, tela de
boas-vindas, grade, dicas e simulação, e mostra quanto armazenamento do navegador está em uso. Lá
você pode limpar o histórico local e a lista de arquivos recentes.

## Idioma {#language}

Escolha o idioma com a bandeira no canto inferior direito (em um celular, na parte inferior do menu
☰); a escolha é lembrada neste dispositivo. Cada idioma também tem seu próprio endereço, como
`…/de/` para o alemão, de modo que um link abre no idioma em que foi enviado.
