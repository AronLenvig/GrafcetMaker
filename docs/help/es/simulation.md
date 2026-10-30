# Simulación

El simulador ejecuta tu grafcet exactamente según las reglas de la IEC 60848, para que puedas
probarlo antes de que llegue a un PLC.

## Iniciar y detener {#start-and-stop}

Pulsa <kbd>F5</kbd> (o **Simular › Iniciar simulación**). El diagrama se bloquea, los controles de
simulación sustituyen a las herramientas en la parte superior, el panel **Simulación** aparece a la
izquierda (pliégalo con su flecha para ver más diagrama) y el reloj empieza a correr.
<kbd>Shift+F5</kbd> detiene la simulación y vuelve a la edición.

## Cambiar las entradas {#change-inputs}

El panel **Simulación** muestra las entradas:

- Las entradas **BOOL** tienen un interruptor y un botón **Mantener** para una pulsación momentánea
  (como un pulsador; con el teclado, mantén pulsada <kbd>Space</kbd> sobre él).
- Las entradas **INT**, **REAL** y **TIME** tienen un campo de valor.

También puedes **hacer clic en una entrada BOOL donde está escrita** en una receptividad o una
condición del diagrama (o tocarla con el dedo): se activa o se desactiva. El grafcet evoluciona en
cuanto cambia una entrada.

Durante la simulación, cada variable **INT**, **REAL** o **TIME** escrita en una receptividad o una
condición muestra su valor actual en un pequeño recuadro sobre su nombre, y una acción memorizada
muestra bajo su recuadro el valor de la variable que escribe. **Haz clic en un valor** (o tócalo)
para escribir uno nuevo y pulsa <kbd>Enter</kbd> (<kbd>Escape</kbd> cancela). Sirve para las
entradas y también para las variables internas y las salidas, por ejemplo para probar un contador
cerca de su límite.

**Señala una transición** (o tócala) para ver qué espera: las etapas que deben estar activas antes,
o los términos de su receptividad que aún son falsos, con el tiempo que le queda a una
temporización como `10s/X0`. Un flanco como `↑start` siempre aparece en la lista: solo es verdadero
en el instante en que cambia su entrada.

## Tiempo {#time}

El tiempo del simulador es virtual y determinista.

- <kbd>F5</kbd> pausa el reloj y lo vuelve a poner en marcha. Las temporizaciones (`5s/X2`) solo
  avanzan mientras corre.
- La velocidad va de ×0.25 a ×10. **Rápido** salta directamente del vencimiento de una
  temporización al siguiente.
- <kbd>F10</kbd> salta al siguiente vencimiento de temporización y ejecuta ese ciclo.
- **⟲** reinicia desde la situación inicial.

La barra muestra el tiempo, el número de ciclo y cuándo vence la siguiente temporización. La
velocidad predeterminada está en **Configuración › Simulación**.

## Lo que ves en el diagrama {#what-you-see-on-the-diagram}

- Las **etapas activas** están rellenas y llevan una marca (un punto), con el tiempo que llevan
  activas debajo.
- Las **transiciones validadas** tienen un marcador ▶; las transiciones parpadean al franquearse.
- Las **señales verdaderas** aparecen en verde, en negrita y subrayadas en las receptividades y en
  las condiciones de las acciones: una variable activada, una etapa activa `Xn`, una comparación
  que se cumple. Lo que no está en verde es lo que la transición aún espera. Bajo una barra de NO,
  el color muestra la propia señal: en `/a`, `a` está en verde cuando `a` está activada.
- Las **acciones continuas** que se están ejecutando muestran un ✓; las **acciones memorizadas**
  muestran el valor actual de su variable.
- **Etapa a etapa**: cuando un cambio hace franquear varias transiciones seguidas, el diagrama
  muestra cada etapa por la que pasa durante al menos 0,1 s, para que puedas seguir la marca. Solo
  espera la visualización: en la simulación estas etapas inestables no duran nada, como exige la IEC
  60848, y los valores mostrados ya son los finales.

## Registro de evolución {#evolution-log}

El registro del panel Simulación (plegado: haz clic en **Registro de evolución** para abrirlo)
muestra cada ciclo con lo que lo desencadenó y cada iteración de la búsqueda de estabilidad:
transiciones franqueadas, etapas activadas y desactivadas. Las evoluciones fugaces (etapas
atravesadas sin detenerse) se ven ahí. Haz clic en un ciclo para ver el diagrama tal como estaba en
ese instante.

## Observar varios grafcets {#watching-several-grafcets}

En una vista dividida (<kbd>Ctrl+\</kbd>) los dos paneles muestran la simulación en tiempo real:
observa un grafcet de producción y su grafcet de seguridad, o una macroetapa y su expansión, uno al
lado del otro.

## Cronograma {#chronogram}

El panel **Cronograma** (su botón está abajo a la derecha) dibuja todas las variables y las etapas
del grafcet abierto a lo largo del tiempo. Haz clic o arrastra en él para retroceder en el tiempo:
el diagrama lo sigue. **Volver al tiempo real** regresa al presente.

## Escenarios {#scenarios}

Para repetir una prueba exactamente, grábala:

1. Haz clic en **Grabar**: la simulación se reinicia y graba cada cambio de entrada con su instante.
2. Haz tu prueba; luego detén la grabación y ponle nombre al escenario. Se guarda en el proyecto.
3. **Reproducir** reinicia la simulación y vuelve a reproducir el escenario.

## Cuando el grafcet nunca se estabiliza {#when-the-grafcet-never-settles}

Si las transiciones se franquean unas a otras sin parar (por ejemplo, un bucle en el que todas las
receptividades son verdaderas), la evolución nunca se estabiliza. El simulador se detiene tras 1000
iteraciones e indica un **bucle de evolución fugaz** en Problemas. Añade una condición (a menudo un
flanco `↑a`) para que el bucle no pueda repetirse indefinidamente. Consulta
[Solución de problemas](troubleshooting.md).
