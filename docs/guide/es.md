# Qué es el GRAFCET: guía completa de la norma IEC 60848

El **GRAFCET** es un lenguaje gráfico que describe el comportamiento de un sistema de control
secuencial: una máquina, una línea de producción, un semáforo. Un grafcet es una sucesión de
**etapas** (lo que hace el sistema) unidas por **transiciones** (las condiciones para avanzar).
Está normalizado internacionalmente como **IEC 60848** y es el origen del lenguaje SFC de los
autómatas programables (PLC).

Esta guía explica todos los elementos y reglas de la norma con esquemas y ejemplos. Todos los
esquemas se dibujaron con [GrafcetMaker](app:), un editor y simulador de GRAFCET gratuito que
funciona en el navegador: abra los ejemplos y véalos evolucionar paso a paso.

## Qué significa GRAFCET

GRAFCET significa _GRAphe Fonctionnel de Commande Étape-Transition_, en francés «gráfico funcional
de control etapa-transición». Lo propuso en 1977 un grupo de trabajo de la AFCET, la asociación
francesa de cibernética, junto con la ADEPA, la agencia francesa para la automatización de la
producción. Se inspiró en las redes de Petri y se pensó como una forma clara e independiente de la
tecnología de describir lo que debe hacer un sistema de control, antes de escribir una sola línea
de programa.

- **1982**: norma francesa NF C03-190.
- **1988**: norma internacional IEC 848, _Preparation of function charts for control systems_.
- **2002**: IEC 60848 segunda edición, _GRAFCET specification language for sequential function
  charts_.
- **2013**: IEC 60848 tercera edición, la vigente, publicada en Europa como EN 60848 (en España,
  UNE-EN 60848).

El GRAFCET se enseña en formación profesional (ciclos de Automatización y Robótica Industrial,
Mecatrónica Industrial, Sistemas Electrotécnicos), en escuelas de ingeniería y universidades de
España, Latinoamérica y otros países. Por convención, el _GRAFCET_ es el lenguaje y un _grafcet_ es
un diagrama escrito en él.

## Los elementos de un grafcet

<!-- figure: anatomy | Los elementos de un grafcet -->

- Una **etapa** es un cuadrado numerado. Representa una situación estable del sistema: _espera_,
  _llenado_, _taladrado_. En cada instante, cada etapa está **activa** o **inactiva**, y el conjunto
  de etapas activas es la **situación** del grafcet. La variable de etapa `X1` es verdadera mientras
  la etapa 1 está activa.
- Una **etapa inicial**, dibujada con un cuadrado doble, está activa al arrancar. Todo grafcet
  necesita al menos una.
- Una **transición** es una pequeña barra horizontal que corta un enlace. Siempre está entre etapas:
  dos etapas nunca se unen directamente, ni tampoco dos transiciones.
- La **receptividad** es la condición escrita junto a una transición, por ejemplo `marcha` o
  `presion > 6`. La receptividad `1` siempre es verdadera.
- Los **enlaces orientados** unen etapas y transiciones. Se leen de arriba abajo; un enlace que sube
  lleva una flecha.
- Las **acciones** son rectángulos a la derecha de una etapa: lo que hace el sistema mientras la
  etapa está activa, por ejemplo _hacer girar el motor_.

## Las cinco reglas de evolución

La norma IEC 60848 define con exactitud cómo evoluciona un grafcet mediante cinco reglas.

1. **Situación inicial**: al arrancar, las etapas iniciales están activas y todas las demás
   inactivas.
2. **Franqueamiento de una transición**: una transición está **validada** cuando todas las etapas
   inmediatamente anteriores están activas. Se **franquea** cuando está validada y su receptividad
   es verdadera.
3. **Evolución de las etapas activas**: franquear una transición activa todas las etapas
   inmediatamente posteriores y desactiva todas las etapas inmediatamente anteriores.
4. **Franqueamiento simultáneo**: todas las transiciones franqueables en el mismo instante se
   franquean simultáneamente.
5. **Activación y desactivación simultáneas**: una etapa que se activa y se desactiva a la vez
   sigue activa.

Cuando cambia una entrada, las reglas se aplican una y otra vez, con las mismas entradas, hasta que
ninguna transición sea franqueable: es la **búsqueda de estabilidad**. Una etapa que se activa y se
abandona durante esa búsqueda es una **etapa inestable** (evolución fugaz): sus acciones continuas no
se ejecutan, pero sus acciones memorizadas sí. Por ejemplo, si las receptividades bajo las etapas 1
y 2 ya son verdaderas cuando se activa la etapa 1, el grafcet atraviesa la etapa 2 hasta la etapa 3
y las salidas de la etapa 2 nunca se encienden.

## Receptividades: condiciones, flancos y temporizaciones

Una receptividad es una expresión lógica de entradas, variables internas, variables de etapa y
tiempo. La notación habitual y cómo se escribe en GrafcetMaker:

| Notación           | Significado                                                                      | En GrafcetMaker |
| ------------------ | -------------------------------------------------------------------------------- | --------------- |
| a · b              | a Y b                                                                            | `a * b`         |
| a + b              | a O b                                                                            | `a + b`         |
| a con barra encima | NO a (negación)                                                                  | `/a`            |
| ↑a                 | flanco ascendente: verdadero en el instante en que a pasa a verdadero            | `↑a` o `RE a`   |
| ↓a                 | flanco descendente: verdadero en el instante en que a pasa a falso               | `↓a` o `FE a`   |
| X3                 | la etapa 3 está activa                                                           | `X3`            |
| 5 s/X2             | verdadero 5 s después de activarse la etapa 2                                    | `5s/X2`         |
| t1/a/t2            | verdadero t1 después de que a sea verdadero, falso t2 después de que a sea falso | `2s/a/1s`       |
| [nivel > 80]       | comparación de un valor numérico                                                 | `nivel > 80`    |
| = 1                | siempre verdadero                                                                | `1`             |

<!-- figure: timer | Una temporización: el calefactor funciona durante 5 segundos -->

Los flancos son útiles cuando una señal permanece activa: con `↑marcha`, el ciclo arranca una vez
por pulsación y no vuelve a arrancar mientras el botón siga pulsado. La sintaxis completa del
editor está en la ayuda [Writing receptivities](app:#help/expressions) (en inglés).

## Acciones

<!-- figure: actions | Acciones continua, condicional y memorizadas en la etapa 4 -->

- Una **acción continua** es verdadera mientras su etapa está activa: _Lampara_ está encendida
  mientras la etapa 4 está activa.
- Una **acción condicional** es una acción continua con una **condición de asignación** escrita
  encima de su rectángulo: _Bocina_ suena solo si la etapa 4 está activa **y** `alarma` es
  verdadera.
- Las acciones **retardadas** y **limitadas en el tiempo** son acciones condicionales cuya condición
  contiene una temporización: con `3s/X4` la salida se activa 3 s después de activarse la etapa 4;
  con `/(3s/X4)` solo está activa durante los 3 primeros segundos.
- Una **acción memorizada** asigna un valor una sola vez, y el valor se mantiene hasta que otra
  acción lo cambie. Se ejecuta al **activarse** la etapa (flecha hacia arriba), al **desactivarse**
  (flecha hacia abajo) o **ante un evento** mientras la etapa está activa (un banderín con el
  evento, aquí `↑reset`). Los contadores como `C := C + 1` son acciones memorizadas típicas.

Una salida gobernada por acciones continuas sigue a las etapas automáticamente. Una salida puesta a
1 por una acción memorizada se mantiene hasta que otra acción memorizada la ponga a 0: prevea dónde
ocurre.

## Secuencias, selección y paralelismo

### Elegir un camino: la divergencia en O

Cuando a una etapa le siguen varias transiciones, el grafcet toma el camino cuya receptividad es
verdadera: una **selección de secuencia**, dibujada con una línea horizontal simple (**divergencia
en O**). Los caminos vuelven a unirse en una línea simple (**convergencia en O**).

<!-- figure: or | Divergencia y convergencia en O: una rama o la otra -->

Haga que las receptividades sean **excluyentes**, es decir, que nunca sean verdaderas a la vez,
como `a` y `/a * b` aquí. Si no, las dos transiciones se franquean juntas (regla 4) y las dos ramas
se activan. GrafcetMaker le avisa cuando no puede demostrar que las receptividades alternativas son
excluyentes.

### Hacer varias cosas a la vez: la divergencia en Y

Cuando a una transición le siguen varias etapas, todas se activan juntas: son **secuencias
simultáneas**, dibujadas con una línea doble (**divergencia en Y**). Las ramas terminan también en
una línea doble (**convergencia en Y**): la transición situada debajo solo está validada cuando la
última etapa de cada rama está activa. Por tanto espera a que terminen todas las ramas: así se
**sincronizan** las tareas.

<!-- figure: and | Divergencia y convergencia en Y: taladrar y sujetar a la vez -->

### Bucles, saltos, transiciones fuente y sumidero

- Un **bucle** (retorno) vuelve a una etapa anterior mediante un enlace que sube, con una flecha: es
  la forma habitual de repetir un ciclo.
- Un **salto de etapas** es una divergencia en O en la que una de las ramas lleva directamente a una
  etapa posterior, por ejemplo para saltarse una operación opcional.
- Una **transición fuente** no tiene etapa anterior. Siempre está validada, así que se franquea cada
  vez que su receptividad es verdadera; use un flanco como `↑a`.
- Una **transición sumidero** no tiene etapa posterior: al franquearla solo se desactivan las etapas
  anteriores.

## Estructurar aplicaciones grandes

Las máquinas reales se describen con varios grafcets que trabajan juntos.

- Los **grafcets parciales** describen cada uno una parte del sistema, por ejemplo el ciclo de
  producción, los modos de marcha y parada (GEMMA) y la seguridad. Evolucionan a la vez y ven las
  etapas de los demás mediante las variables de etapa `Xn`. Juntos forman el grafcet global.
- Una **macroetapa** representa una secuencia detallada dibujada aparte, su **expansión**. La
  expansión tiene una etapa de entrada **E** y una etapa de salida **S**. Franquear la transición
  situada encima de la macroetapa activa la etapa E; la transición situada debajo está validada
  cuando la etapa S está activa.
- Una **etapa encapsulante** contiene uno o varios grafcets completos que solo existen mientras ella
  está activa. Al activarse, las etapas encapsuladas marcadas con un asterisco se activan; al
  desactivarse, todas las etapas encapsuladas se desactivan.
- Una **orden de forzado**, dibujada en un rectángulo de acción con doble marco, impone una
  situación a otro grafcet: `G2{8}` fuerza G2 con solo la etapa 8 activa, `G2{*}` congela G2 en su
  situación actual y `G2{}` desactiva todas sus etapas. Un grafcet forzado no puede evolucionar por
  sí mismo. El forzado es la forma normalizada de describir la parada de emergencia y la
  inicialización.

<!-- figure: macro | Una macroetapa: dos líneas horizontales dentro del cuadrado -->

## GRAFCET y SFC

El lenguaje SFC (Sequential Function Chart) de la norma IEC 61131-3 se deriva del GRAFCET y se le
parece mucho, pero los dos no tienen el mismo propósito.

|           | GRAFCET (IEC 60848)                                                         | SFC (IEC 61131-3)                                                |
| --------- | --------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Propósito | Especificación: el comportamiento requerido, independiente de la tecnología | Lenguaje de programación que ejecuta el PLC                      |
| Evolución | Todas las transiciones franqueables a la vez, luego búsqueda de estabilidad | Normalmente una evolución por ciclo del PLC, según el fabricante |
| Acciones  | Continuas, condicionales, retardadas, limitadas en el tiempo y memorizadas  | Calificadores N, S, R, P, P0, P1, L, D, SD, DS y SL              |
| Jerarquía | Grafcets parciales, macroetapas, etapas encapsulantes y órdenes de forzado  | Mediante la estructura del programa                              |

Lo habitual es escribir y comprobar primero el GRAFCET y después implementarlo en SFC, en ladder
(LD) o en texto estructurado (ST). GrafcetMaker genera texto estructurado y PLCopen TC6 XML a partir
de un grafcet como punto de partida; revise siempre el código generado antes de usarlo.

## Ejemplos

### Semáforo con pulsador para peatones

<!-- figure: example-trafficLight | Semáforo: temporizaciones y una petición memorizada -->

La etapa 0 da verde a los peatones durante 10 s (`10s/X0`) y luego la etapa 1 deja pasar a los
coches. Los coches tienen verde 30 s, pero una pulsación del botón de peatones lo reduce a 10 s: la
pulsación se memoriza con una acción ante el evento `↑request` y se olvida cuando la etapa 0 vuelve
a activarse. La etapa 2 muestra ámbar durante 3 s. (Las variables del ejemplo están en inglés.)

### Estación de taladrado con contador de piezas

<!-- figure: example-drillingStation | Estación de taladrado: ciclo de mecanizado con mantenimiento cada 100 piezas -->

Un ciclo de mecanizado: sujetar la pieza, bajar el taladro, subir, soltar. La sujeción se activa y
desactiva con acciones memorizadas, y la etapa 4 cuenta las piezas. Tras la etapa 4, una
divergencia en O con receptividades excluyentes vuelve al inicio o pasa a mantenimiento cada 100
piezas.

El editor incluye dos ejemplos más, un llenado de depósito con entradas numéricas y una cinta
transportadora en paralelo con un grafcet de seguridad que fuerza la línea: ábralos desde la
pantalla de inicio de [GrafcetMaker](app:).

## Dibujar y simular GRAFCET en línea

[GrafcetMaker](app:) es un editor de GRAFCET gratuito y de código abierto pensado para ingenieros de
automatización, profesores y estudiantes. Funciona por completo en el navegador, sin conexión y sin
cuenta; sus diagramas se quedan en su ordenador.

- Dibuje etapas, transiciones, acciones y ramas con el ratón o el teclado, con organización
  automática del diagrama.
- Escriba las receptividades con autocompletado y una tabla de variables, y obtenga errores claros
  con correcciones rápidas.
- Simule con las reglas de la IEC 60848: etapas activas, temporizaciones, flancos, etapas
  inestables, forzado y un cronograma de todas las variables.
- Estructure sus proyectos con grafcets parciales, macroetapas, etapas encapsulantes y órdenes de
  forzado.
- Exporte a PDF con cajetín, SVG y PNG, o a texto estructurado y PLCopen TC6 XML, y comparta un
  proyecto completo con un enlace.

La interfaz del editor está en inglés; sus grafcets los escribe en su propio idioma.

[Abrir el editor de GRAFCET gratuito](app:)

## Preguntas frecuentes

### ¿Para qué sirve el GRAFCET?

Para especificar el comportamiento de sistemas automatizados secuenciales: máquinas, líneas de
montaje, envasado, procesos por lotes, ascensores, semáforos. El grafcet es la referencia común de
quienes diseñan la máquina, programan el PLC y la ponen en marcha.

### ¿GRAFCET y SFC son lo mismo?

No. El SFC (IEC 61131-3) se deriva del GRAFCET y usa los mismos símbolos, pero el GRAFCET es un
lenguaje de especificación con reglas de evolución precisas y el SFC es un lenguaje de programación
cuya ejecución depende del PLC. Vea [GRAFCET y SFC](#grafcet-y-sfc).

### ¿Qué diferencia hay entre una etapa y una transición?

Una etapa es una situación que dura (el sistema llena el depósito); una transición es el instante
en que el sistema pasa de una situación a la siguiente, cuando su receptividad se hace verdadera (el
depósito está lleno).

### ¿Qué significa X1?

`X1` es la variable de etapa de la etapa 1: es verdadera mientras la etapa 1 está activa. Se usa en
receptividades, en condiciones de acciones y en otros grafcets, por ejemplo `5s/X1` o `X1 * /X5`.

### ¿Qué es una etapa inestable?

Una etapa que se activa y se desactiva dentro de una misma búsqueda de estabilidad, porque la
receptividad situada debajo ya era verdadera. Sus acciones continuas no se ejecutan; sus acciones
memorizadas sí.

### ¿Cómo se pasa un GRAFCET a un programa de PLC?

Cada etapa se convierte en una marca (bit de memoria), cada transición en una condición que activa
las etapas posteriores y desactiva las anteriores, y las salidas se escriben a partir de las marcas
de etapa. Puede hacerse a mano en ladder o en texto estructurado, con el lenguaje SFC de su PLC, o
dejando que GrafcetMaker genere texto estructurado o PLCopen XML como punto de partida.

### ¿Hay algún programa gratuito para hacer GRAFCET?

Sí: [GrafcetMaker](app:) es gratuito y de código abierto (licencia MIT). Funciona en cualquier
navegador actual en Windows, macOS y Linux, en tabletas y móviles, y las empresas pueden alojarlo
en su propia red.
