# Primeros pasos

En este tutorial dibujas el control de un pequeño depósito: cuando el operario pulsa **start**, una
bomba llena el depósito hasta que el sensor **full** indica que está lleno; luego una válvula lo
vacía hasta que **empty** indica que está vacío, y el sistema espera el siguiente arranque. Lleva
unos diez minutos.

<!-- figure: sequence | El grafcet que vas a dibujar -->

## 1. Oriéntate {#1-find-your-way-around}

- El **lienzo** ocupa toda la ventana: ahí es donde dibujas. Todo lo demás flota sobre él,
  ligeramente atenuado hasta que pasas el puntero por encima, para que el diagrama quede en primer
  plano.
- **Arriba**: el menú principal ☰ y el nombre del proyecto a la izquierda; las herramientas en el
  centro (seleccionar, desplazar, colocar etapa, transición, comentario o acción), que terminan con
  ▶ **Simular**; los contadores de problemas, **Exportar** y el botón para compartir a la derecha.
- **Bajo las herramientas**: las sugerencias muestran lo que puedes hacer en este momento. Fíjate en
  ellas mientras sigues este tutorial.
- **Izquierda**: las **Propiedades** de lo que seleccionas aparecen en una tarjeta mientras está
  seleccionado.
- **Abajo**: zoom, deshacer y rehacer a la izquierda; una pestaña por grafcet en el centro; los
  botones **Variables**, **Problemas**, **Cronograma** y **Esquema** a la derecha, cada uno de los
  cuales abre su panel en el lado derecho de la ventana, y después la ayuda, los comentarios y la
  bandera que cambia el idioma.

Un proyecto nuevo ya contiene el grafcet **G1** con la etapa **0**. Su cuadrado doble indica que es
una **etapa inicial**: está activa cuando el sistema arranca.

## 2. Añade la primera transición y etapa {#2-add-the-first-transition-and-step}

1. Haz clic en la etapa **0** para seleccionarla.
2. Pulsa <kbd>Enter</kbd>. Debajo aparecen una transición y la etapa **1**, y escribes la
   **receptividad** de la transición, la condición para avanzar, justo donde está dibujada.
3. Escribe `start` y pulsa <kbd>Enter</kbd>.

`start` aún no está declarada: mientras escribes, el editor indica **Nueva variable start: BOOL,
entrada**, y al pulsar <kbd>Enter</kbd> se añade a la lista de variables (un mensaje lo indica).

## 3. Añade una acción {#3-add-an-action}

La etapa 1 sigue seleccionada. Pulsa <kbd>A</kbd>, escribe `Pump` y pulsa <kbd>Enter</kbd>: `Pump`
se crea como salida BOOL. Ahora la bomba funciona mientras la etapa 1 está activa.

## 4. Continúa la secuencia {#4-continue-the-sequence}

1. Vuelve a pulsar <kbd>Enter</kbd>: se añaden una transición y la etapa **2** después de la etapa
   1. Escribe `full` como receptividad y crea la entrada.
2. Pulsa <kbd>A</kbd> y añade la acción `Valve` (crea la salida).

> **Consejo:** ¿prefieres el ratón? Una etapa seleccionada muestra **fantasmas** discontinuos de lo
> que añadirían <kbd>Enter</kbd> y <kbd>A</kbd>; haz clic en uno para añadirlo (consulta
> [Editar diagramas](editing.md#ghosts)).

## 5. Cierra el bucle {#5-close-the-loop}

El ciclo tiene que volver a la etapa 0 cuando el depósito está vacío.

1. Con la etapa **2** seleccionada, pulsa <kbd>L</kbd>. Las sugerencias dicen **Clic en una etapa
   para volver a ella con un bucle**.
2. Haz clic en la etapa **0**. Se añade una transición debajo de la etapa 2 con un enlace que sube
   hasta la etapa 0, dibujado con una flecha porque va hacia arriba.
3. Escribe `empty` como receptividad, pulsa <kbd>Enter</kbd> y crea la entrada.

Tu diagrama ya coincide con la figura del principio de esta página.

## 6. Compruébalo {#6-check-it}

Mira los contadores de arriba a la derecha: un círculo rojo cuenta los **errores** y un triángulo
naranja, las **advertencias**. Haz clic en ellos para abrir la lista de **Problemas**. Cada problema
dice qué está mal y dónde; haz clic en él para ir al elemento y usa el botón de corrección cuando lo
haya. Un diagrama correcto no tiene errores. Consulta [Solución de problemas](troubleshooting.md)
para saber qué significa cada mensaje.

## 7. Simula {#7-simulate}

1. Pulsa <kbd>F5</kbd>. El diagrama se bloquea y el panel **Simulación** aparece a la izquierda. La
   etapa 0 lleva una marca: está activa.
2. En el panel, activa **start** (o haz clic en `start` donde está escrita en el diagrama). La
   transición se franquea: la etapa 1 se activa y su acción **Pump** muestra un ✓.
3. Desactiva **start** y luego activa **full**: la etapa 2 se activa y **Valve** se enciende.
4. Desactiva **full** y activa **empty**: el grafcet vuelve a la etapa 0.
5. Haz clic en **Cronograma**, abajo a la derecha, para ver todas las señales a lo largo del
   tiempo. Pulsa <kbd>Shift+F5</kbd> para detener la simulación.

¿Qué pasa si **start** sigue activada cuando el depósito se vacía? Pruébalo: en cuanto la etapa 0
vuelve a estar activa, su transición se franquea de nuevo. Es el GRAFCET comportándose exactamente
como está dibujado. Usa un flanco ascendente `↑start` para reaccionar solo a una nueva pulsación
(escribe `^start`, consulta [Escribir receptividades](expressions.md)).

## 8. Guarda {#8-save}

Tu trabajo se guarda automáticamente en el navegador después de cada cambio. Para obtener un
archivo que puedas conservar, enviar o poner bajo control de versiones, pulsa <kbd>Ctrl+S</kbd>: el
proyecto se guarda como `<name>.grafcet.json`. Haz doble clic en el nombre del proyecto, arriba,
para cambiarlo.

## ¿Y ahora qué? {#where-next}

- [Conceptos básicos de GRAFCET](grafcet-basics.md) explica las reglas que hay detrás de lo que
  acabas de ver.
- [Editar diagramas](editing.md) muestra las ramas paralelas y alternativas y otros gestos rápidos.
- [Simulación](simulation.md) trata las temporizaciones, el registro de evolución y los escenarios.
