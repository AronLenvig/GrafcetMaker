# Conceptos básicos de GRAFCET

El GRAFCET (IEC 60848) describe el comportamiento de un sistema secuencial (una máquina, un
proceso, un semáforo) como una sucesión de **etapas** unidas por **transiciones**. Es el lenguaje de
especificación del que deriva el lenguaje SFC de los PLC (IEC 61131-3).

<!-- figure: anatomy | Los elementos de un grafcet -->

## Etapas {#steps}

Una **etapa** es una situación estable del sistema: _espera_, _llenado_, _taladrado_. Se dibuja
como un cuadrado con su número. En cada instante, una etapa está **activa** o **inactiva**; el
conjunto de etapas activas es la **situación** del grafcet.

- Una **etapa inicial** (cuadrado doble) está activa cuando el sistema arranca. Un grafcet necesita
  al menos una.
- La variable `X3` es verdadera mientras la etapa 3 está activa. Puedes usarla en receptividades y
  condiciones.

## Transiciones y receptividades {#transitions-and-receptivities}

Una **transición** (barra horizontal corta) une etapas. Su **receptividad**, escrita a su lado, es
la condición para avanzar: una entrada (`start`), una combinación (`start * /door`), un flanco
(`↑b`), una temporización (`5s/X2`) o una comparación (`level >= 80`). La receptividad `1` siempre
es verdadera.

- Una transición está **validada** cuando todas las etapas inmediatamente anteriores están activas.
- Una transición validada se **franquea** (se atraviesa) en cuanto su receptividad es verdadera.

## Acciones {#actions}

Los rectángulos a la derecha de una etapa son sus **acciones**: lo que hace el sistema mientras la
etapa está activa, p. ej. _hacer funcionar la bomba_. Una **acción continua** nombra una salida que
es verdadera mientras la etapa está activa. Las acciones memorizadas cambian un valor una sola vez,
cuando una etapa se activa o se desactiva o cuando ocurre un evento. Consulta
[Acciones](actions.md).

## Las cinco reglas de evolución {#the-five-evolution-rules}

Estas reglas, de la IEC 60848, deciden cómo evoluciona un grafcet. El simulador las aplica con
exactitud.

1. **Situación inicial**: al arrancar, las etapas iniciales están activas.
2. **Condición de franqueamiento**: una transición se franquea cuando está validada y su
   receptividad es verdadera.
3. **Franqueamiento**: franquear una transición activa todas las etapas inmediatamente posteriores
   y desactiva todas las etapas inmediatamente anteriores.
4. **Franqueamiento simultáneo**: todas las transiciones que pueden franquearse en el mismo instante
   se franquean simultáneamente.
5. **Activación y desactivación simultáneas**: una etapa que se activa y se desactiva a la vez
   sigue activa.

Tras un cambio de entrada, las reglas se aplican una y otra vez hasta que ninguna transición sea
franqueable: es la **búsqueda de estabilidad**. Las etapas que se activan y se abandonan durante
esta búsqueda son **inestables** (evolución fugaz): sus acciones continuas no se ejecutan, pero sus
acciones memorizadas sí.

## Elegir entre caminos: O {#choosing-between-paths-or}

Cuando a una etapa le siguen varias transiciones, el grafcet toma el camino cuya receptividad es
verdadera: una **rama alternativa**, dibujada con una línea horizontal simple (**divergencia en
O**). Los caminos vuelven a unirse en una línea simple (**convergencia en O**).

<!-- figure: or | Divergencia y convergencia en O -->

Haz que las receptividades sean **excluyentes** (nunca pueden ser verdaderas a la vez), aquí `a` y
`/a * b`. Si no, se tomarían los dos caminos a la vez. GrafcetMaker te avisa cuando no puede
demostrar que las receptividades alternativas son excluyentes, y te ofrece dar prioridad a una
rama.

## Hacer varias cosas a la vez: Y {#doing-things-at-the-same-time-and}

Cuando a una transición le siguen varias etapas, todas se activan juntas: son **ramas paralelas**,
dibujadas con una línea doble (**divergencia en Y**). Las ramas terminan también en una línea doble
(**convergencia en Y**): la transición situada debajo solo está validada cuando la última etapa de
cada rama está activa, así que espera a que terminen todas las ramas.

<!-- figure: and | Divergencia y convergencia en Y -->

## Bucles {#loops}

Un enlace que sube, dibujado con una flecha, vuelve a una etapa anterior: es la forma habitual de
repetir un ciclo. Pulsa <kbd>L</kbd> sobre una etapa y haz clic en la etapa a la que quieres volver.

## Aplicaciones más grandes {#bigger-applications}

- Un proyecto puede contener varios **grafcets parciales** que funcionan a la vez, p. ej. uno para
  el ciclo y otro para la seguridad. Cada uno ve las etapas de los demás mediante `Xn`.
- Una **macroetapa** representa una secuencia detallada dibujada en su propia hoja, su
  **expansión**.
- Una **etapa encapsulante** contiene un grafcet completo que solo funciona mientras ella está
  activa.
- Una **orden de forzado** impone una situación a otro grafcet, p. ej. una parada de emergencia.

Consulta [Macroetapas, etapas encapsulantes y forzado](hierarchy.md).

## Más información {#learn-more}

- [Escribir receptividades](expressions.md) — la sintaxis completa de las expresiones.
- [Glosario](glossary.md) — todos los términos normalizados en un solo lugar.
- La interpretación exacta de cada regla en GrafcetMaker está documentada en `docs/semantics.md`
  del repositorio del código fuente.
