# Editar diagramas

GrafcetMaker está pensado para que casi nunca coloques nada a mano: selecciona un elemento y pulsa
una tecla, y los nuevos elementos se numeran, se enlazan y se colocan por ti. Las sugerencias bajo
la barra de herramientas, en la parte superior del lienzo, muestran las teclas que se aplican a la
selección actual.

## Las teclas esenciales {#the-essential-keys}

| Tecla                            | Con una etapa seleccionada                                        | Con una transición seleccionada                         |
| -------------------------------- | ----------------------------------------------------------------- | ------------------------------------------------------- |
| <kbd>Enter</kbd>                 | añadir una transición y una etapa debajo y editar la receptividad | añadir una etapa debajo                                 |
| <kbd>A</kbd>                     | añadir una acción                                                 | —                                                       |
| <kbd>P</kbd>                     | añadir una rama paralela (Y)                                      | añadir otra etapa que activa                            |
| <kbd>O</kbd>                     | añadir una rama alternativa (O)                                   | añadir una transición alternativa (desvío)              |
| <kbd>L</kbd> y clic en una etapa | bucle de retorno a esa etapa                                      | enlazar con esa etapa (si aún no lleva a ninguna parte) |
| <kbd>F2</kbd> o doble clic       | editar el número                                                  | editar la receptividad                                  |
| <kbd>R</kbd>                     | —                                                                 | girar: de arriba abajo o de derecha a izquierda         |
| <kbd>Del</kbd>                   | eliminar y reconectar la secuencia                                | eliminar                                                |

Una transición girada **de derecha a izquierda** tiene una barra vertical: el enlace desde la etapa
anterior entra por la derecha y el enlace hacia la etapa siguiente sale por la izquierda, con
flechas. Para seleccionar una transición, haz clic en cualquier punto de su barra, de su número o de
su receptividad.

Sin nada seleccionado, <kbd>Enter</kbd> continúa la secuencia desde su última etapa.
<kbd>Enter</kbd> sobre una etapa que ya tiene continuación inserta la nueva transición y la nueva
etapa y desplaza hacia abajo todo lo que hay debajo.

Mientras editas una receptividad o una acción, <kbd>Shift+Enter</kbd> la aplica y abre la
siguiente: la siguiente receptividad de la secuencia (una nueva transición y una nueva etapa al
final), o la siguiente acción de la etapa (una nueva después de la última). Escribe una secuencia
entera, o una fila de acciones, de una sola vez.

## Escribir en el diagrama {#typing-on-the-diagram}

<kbd>F2</kbd>, un doble clic o <kbd>Enter</kbd> abre un texto justo donde está dibujado: escribe
como en el lienzo, y el recuadro que lo rodea crece a medida que escribes. <kbd>Enter</kbd> lo
aplica (<kbd>Ctrl+Enter</kbd> en un comentario), <kbd>Esc</kbd> cancela, y hacer clic en otro sitio
también lo aplica. Un subrayado ondulado rojo marca un valor que aún no es válido; el recuadro bajo
el texto explica por qué.

## Fantasmas {#ghosts}

Una etapa seleccionada muestra **fantasmas** discontinuos de lo que añadirían <kbd>A</kbd> y
<kbd>Enter</kbd>: una acción después de su última acción y, al final de una secuencia, una
transición y una etapa con el número que tendrá. Una transición que no lleva a ninguna parte muestra
una etapa fantasma. Haz clic en un fantasma para añadirlo; haz clic solo en la barra de la
transición fantasma para añadir únicamente la transición: queda seleccionada y su etapa fantasma
viene después. Una etapa nueva añadida desde su fantasma queda seleccionada, como si hubieras hecho
clic en ella, así que su propio fantasma está a un clic; escribe las receptividades después
(<kbd>F2</kbd> o doble clic), o usa <kbd>Enter</kbd> para escribir cada una sobre la marcha. Con
una herramienta de colocación, un fantasma bajo el puntero muestra lo que colocará un clic.

## Ratón {#mouse}

- **Clic** selecciona; <kbd>Shift</kbd>+clic o <kbd>Ctrl</kbd>+clic añade a la selección o quita de
  ella; arrastrar en un espacio vacío del lienzo selecciona con un marco (una etapa incluye todas
  sus acciones); <kbd>Ctrl+A</kbd> lo selecciona todo. Los enlaces entre los elementos
  seleccionados también se resaltan.
- **Arrastra** cualquier elemento seleccionado para mover toda la selección (se ajusta a la
  cuadrícula); las flechas desplazan un poco (<kbd>Shift</kbd> para pasos más largos).
- **Doble clic** en un elemento para editar su texto; doble clic en un espacio vacío para añadir
  una etapa ahí.
- **Clic derecho** en un elemento para ver lo que puedes hacer con él (añadir una acción, ramas,
  bucle de retorno, editar, convertir en macroetapa, cortar, copiar, eliminar…), en la selección o
  en un espacio vacío del lienzo (añadir una etapa ahí, pegar, organización automática, renumerar,
  ajustar). La tecla de menú lo abre para la selección.
- Una transición cuya receptividad aún no está escrita muestra un **?** gris (haz doble clic en él o
  pulsa <kbd>F2</kbd>); la lista de Problemas la sigue contando hasta que escribas una.
- **Tiradores de enlace**: una etapa o una transición seleccionada o bajo el puntero muestra
  tiradores redondos. Arrastra uno: solo se resaltan los destinos válidos (de una etapa a una
  transición, de una transición a una etapa). Suéltalo en un espacio vacío del lienzo para crear
  ahí el elemento que falta.
- Haz clic en un **enlace** para seleccionarlo; <kbd>Del</kbd> elimina solo ese enlace. Arrastra un
  enlace ascendente (un bucle) hacia un lado para mover su línea lateral, o arrastra su línea
  inferior hacia arriba o hacia abajo; haz doble clic en él para volver al trazado automático. Por
  defecto, un bucle pasa por debajo de las etapas y los enlaces de su propia secuencia en lugar de
  cruzarlos.
- Haz clic en una **línea doble** (divergencia o convergencia en Y) para seleccionarla: se resalta
  junto con los enlaces que une. Arrástrala, o usa las flechas, para moverla con su transición;
  <kbd>Del</kbd> elimina esos enlaces y conserva la transición y las etapas.

## Táctil: móviles y tabletas {#touch-phones-and-tablets}

- **Tocar** selecciona. **Arrastra** un elemento para moverlo; arrastra el lienzo vacío para
  desplazarte; **pellizca** con dos dedos para hacer zoom.
- **Toca dos veces** un elemento para editar su texto, o el lienzo vacío para añadir una etapa ahí.
- **Mantén pulsado y arrastra** en el lienzo vacío para seleccionar todo lo que hay en un marco.
- Con una selección, una **barra de herramientas** en la parte inferior del lienzo hace lo mismo
  que las teclas en un equipo de escritorio: **Etapa** (una transición y una etapa debajo),
  **Acción**, ramas **Paralela** y **Elección**, **Bucle**, **Editar**, **Detalles** (las
  propiedades) y **Eliminar**.
- Una etapa o una transición seleccionada muestra sus **tiradores de enlace** justo encima y
  debajo: arrastra uno hasta un destino resaltado, o hasta un espacio vacío para crear el elemento
  que falta.
- Con una herramienta elegida (etapa, transición, comentario, acción), **toca** donde va el
  elemento.

En un móvil la pantalla está organizada para usarla con una mano: las herramientas, deshacer y
rehacer están abajo, el menú (☰) contiene Archivo, Editar, Ver, Simular y Ayuda, y los paneles
(propiedades, variables, problemas, simulación, cronograma, esquema) se abren como una hoja sobre el
diagrama con el botón de paneles de abajo a la derecha. Arrastra el tirador de la hoja para hacerla
más alta o más baja.

## Herramientas {#tools}

La barra de herramientas de la parte superior de la ventana contiene las herramientas (la letra de
cada botón es su tecla): **Seleccionar** (<kbd>V</kbd>), **Desplazar** (<kbd>H</kbd>), **Etapa**
(<kbd>S</kbd>), **Transición** (<kbd>T</kbd>), **Comentario** (<kbd>C</kbd>) y **Acción**
(<kbd>Shift+A</kbd>). Con una herramienta de colocación, haz clic en un espacio vacío del lienzo
para colocar un elemento; mantén pulsada <kbd>Shift</kbd> para colocar varios. <kbd>Esc</kbd>
vuelve a Seleccionar. La herramienta Acción también añade una acción a una etapa cuando haces clic
en la etapa.

## Ramas y estructuras {#branches-and-structures}

Las divergencias y las convergencias nunca se dibujan a mano; se deducen de los enlaces.

- <kbd>O</kbd> sobre una etapa añade otra transición de salida con su propia etapa: una
  **divergencia en O**.
- <kbd>P</kbd> sobre una etapa añade una etapa en paralelo con ella, iniciada por la misma
  transición y unida por la siguiente: una **divergencia en Y** y una **convergencia en Y**.
- Enlazar una segunda etapa a una transición crea una convergencia en Y; enlazar una segunda
  transición a una etapa crea una convergencia en O.
- **Editar › Transición fuente sobre la etapa / Transición sumidero bajo la etapa** añade una
  transición sin etapa encima o debajo.

## Ordenar {#tidy-up}

- **Editar › Organizar el grafcet automáticamente** coloca todas las etapas en filas, centra las
  ramas bajo su divergencia y traza los bucles por el lado. **Organizar la selección
  automáticamente** lo hace solo con la selección. La organización nunca ocurre por sí sola y se
  puede deshacer.
- **Editar › Renumerar etapas** numera las etapas en orden a lo largo del flujo y actualiza todas
  las referencias `Xn` y las órdenes de forzado.

## Deshacer, copiar y pegar {#undo-copy-and-paste}

- <kbd>Ctrl+Z</kbd> deshace, <kbd>Ctrl+Shift+Z</kbd> o <kbd>Ctrl+Y</kbd> rehace. Un arrastre
  completo es un solo paso de deshacer; el menú Editar indica qué se va a deshacer.
- <kbd>Ctrl+C</kbd>, <kbd>Ctrl+X</kbd>, <kbd>Ctrl+V</kbd> funcionan entre grafcets, proyectos y
  pestañas del navegador. Las etapas pegadas se renumeran si sus números ya están ocupados, y las
  variables que usan se copian con ellas.

## Navegar {#navigate}

- Gira la rueda para desplazarte; <kbd>Ctrl</kbd>+rueda o pellizcar para hacer zoom;
  <kbd>Space</kbd>+arrastrar, el botón central del ratón o el botón derecho mantenido pulsado
  también desplazan la vista (un clic derecho sin mover sigue abriendo el menú).
- <kbd>Shift+1</kbd> ajusta todo el grafcet, <kbd>Shift+2</kbd> la selección, <kbd>Shift+0</kbd>
  vuelve al 100 %.
- <kbd>Ctrl+K</kbd> abre la paleta de comandos: escribe cualquier comando o el nombre de un grafcet.

## Comentarios y nombres {#comments-and-names}

- Los comentarios (herramienta <kbd>C</kbd>) son notas libres en el diagrama; el simulador los
  ignora.
- Las etiquetas de etapa (panel Propiedades) son descripciones cortas que se muestran a la izquierda
  de la etapa.
- Haz doble clic en el nombre del proyecto, arriba, para cambiar el nombre del proyecto, y en una
  pestaña de grafcet para cambiar el nombre del grafcet.

## Dos grafcets a la vez {#two-grafcets-at-once}

Pulsa <kbd>Ctrl+\</kbd> (o **Ver › Vista dividida**) para mostrar un segundo grafcet junto al
primero, o haz clic derecho en una pestaña y elige **Abrir al lado** o **Abrir debajo**. Cada panel
tiene su propio selector de grafcet en la parte superior. Haz clic en un panel para trabajar en él:
su encabezado se resalta, y las pestañas, el teclado y el panel Propiedades lo siguen. Arrastra la
barra entre los paneles para cambiar su tamaño; × cierra un panel.

## Propiedades y paneles {#properties-and-panels}

El diagrama ocupa toda la ventana; el resto flota sobre él y aparece cuando hace falta. Selecciona
algo y sus **propiedades** aparecen en una tarjeta a la izquierda: el tipo de una etapa o de una
acción se elige con botones con imagen que muestran su símbolo. La × de la tarjeta la oculta para
esta selección; sin nada seleccionado, el botón de propiedades junto al nombre del proyecto muestra
el grafcet y el proyecto. Los paneles **Variables**, **Problemas**, **Cronograma** y **Esquema** se
abren con los botones de abajo a la derecha, en una tarjeta a la derecha que puedes ensanchar desde
su borde izquierdo. Durante la simulación, el panel de simulación (entradas, valores, registro,
escenarios) flota a la izquierda.

Con varios elementos seleccionados, la tarjeta muestra un resumen: cuántas etapas, transiciones,
acciones y comentarios (haz clic en uno para quedarte solo con esos) y la selección como árbol en
orden de lectura, cada etapa con sus acciones y transiciones seleccionadas debajo (una etapa
mostrada solo por ellas va en cursiva). Haz clic en una línea para seleccionar solo ese elemento;
<kbd>Ctrl</kbd>+clic lo quita de la selección.
