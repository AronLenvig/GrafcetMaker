# Acciones

Las acciones son los rectángulos a la derecha de una etapa. Indican lo que hace el sistema mientras
la etapa está activa, o cuando se activa. Selecciona una etapa y pulsa <kbd>A</kbd> para añadir una;
vuelve a pulsar <kbd>A</kbd> sobre una acción para añadir la siguiente. Elige su **tipo** con los
botones con imagen del panel **Propiedades**: cada uno muestra cómo dibuja el diagrama ese tipo.

## Acciones continuas {#continuous-actions}

El tipo más habitual. El texto es el nombre de una salida (o de una variable interna), p. ej.
`Pump`. La salida es verdadera **mientras** la etapa está activa, y falsa en cuanto ninguna etapa
activa la gobierna.

Elige el tipo **Condicional** para añadir una condición (una _condición de asignación_): su campo
aparece bajo los botones de tipo, y la salida es verdadera mientras la etapa está activa **y** la
condición es verdadera. Se dibuja sobre una línea corta encima del rectángulo.

<!-- figure: continuous | Lamp mientras la etapa 4 está activa; Horn solo si además alarm es verdadera -->

Las temporizaciones en la condición dan las acciones retardadas y limitadas en el tiempo de otras
notaciones:

- `5s/X4` — retardada: la salida se activa 5 s después de que la etapa 4 se active.
- `/(5s/X4)` — limitada en el tiempo: activa solo durante los 5 primeros segundos de la etapa 4.

> **Nota:** las etapas atravesadas durante una evolución fugaz (consulta
> [Conceptos básicos de GRAFCET](grafcet-basics.md)) no ejecutan sus acciones continuas.

## Acciones memorizadas {#stored-actions}

Una acción memorizada cambia un valor **una sola vez**, y el valor se mantiene hasta que otra acción
lo cambie. Su texto es una asignación: `C := C + 1`, `Motor := 0`, `Speed := 2.5`. Para poner una
variable BOOL a TRUE basta con su nombre: `Motor` significa `Motor := 1`.

- **En la activación** — se ejecuta cuando la etapa se activa. Se dibuja con una flecha **↑
  encima** del rectángulo.
- **En la desactivación** — se ejecuta cuando la etapa se desactiva. Se dibuja con una flecha **↓
  debajo** del rectángulo.
- **Ante un evento** — se ejecuta cada vez que ocurre el **evento** mientras la etapa está activa,
  p. ej. `↑reset`. Se dibuja con un **banderín** arriba a la derecha, junto al evento. Escribe el
  evento en el panel Propiedades; una acción ante un evento sin evento nunca se ejecuta y se indica
  como problema.

<!-- figure: stored | Memorizadas en la activación (↑), en la desactivación (↓) y ante un evento (banderín) -->

Las acciones en la activación y en la desactivación también pueden tener una condición: solo se
ejecutan si es verdadera en ese instante.

Las acciones memorizadas se ejecutan incluso en las etapas que solo se atraviesan durante una
evolución fugaz. Úsalas para contar, para memorizar un valor (`Motor := 1` en una etapa,
`Motor := 0` en otra) o para recordar que algo ha ocurrido.

## Órdenes de forzado {#forcing-orders}

Una orden de forzado impone una situación a otro grafcet parcial mientras su etapa está activa:
`G2{8}` activa solo la etapa 8 del grafcet G2, `G2{*}` congela G2 en su situación actual, `G2{}`
desactiva todas sus etapas y `G2{INIT}` lo devuelve a su situación inicial. Se dibuja con un marco
doble. Consulta [Macroetapas, etapas encapsulantes y forzado](hierarchy.md).

## Acciones sin etapa {#actions-without-a-step}

Una acción no tiene por qué pertenecer a una etapa. Sin nada seleccionado, pulsa <kbd>A</kbd> (o
elige la herramienta **Acción**) y haz clic en un espacio vacío del lienzo: la acción se dibuja
sola, sin enlace, y está **siempre activa**.

- Una acción continua sin etapa activa su salida siempre que su **condición de asignación** es
  verdadera, sean cuales sean las etapas: `Lamp` con la condición `a * b` es la lógica
  `Lamp = a · b`. Sin condición, la salida es siempre verdadera.
- Una acción memorizada ante un evento se ejecuta cada vez que ocurre el evento, p. ej.
  `C := C + 1` con `↑pulse` cuenta impulsos. Si es en la activación, se ejecuta una vez al iniciar
  la simulación; si es en la desactivación, nunca se ejecuta, porque la acción nunca se desactiva.

Arrastra cualquier acción para moverla: sobre una etapa para asociarla a ella (la etapa se ilumina
y una marca indica su lugar entre las acciones de la etapa), o sobre un espacio vacío del lienzo
para dejarla sin etapa.

## Varias acciones {#several-actions}

Una etapa puede tener cualquier número de acciones; se dibujan una al lado de otra. Arrastra una a
lo largo de la fila para cambiar su orden, o usa **Mover la acción a la izquierda / a la derecha**
en el panel Propiedades, donde una etapa seleccionada muestra sus acciones como filas compactas
(haz clic en una para desplegarla). Elimina una acción con <kbd>Del</kbd>.

> **Cuidado:** cuando dos etapas que pueden estar activas a la vez gobiernan la misma salida con
> acciones continuas, el resultado es difícil de interpretar. GrafcetMaker te avisa.
