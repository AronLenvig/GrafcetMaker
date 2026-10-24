# Glosario

Los términos normalizados del GRAFCET (IEC 60848) tal como se usan en GrafcetMaker.

| Término                               | Significado                                                                                                           |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| **Acción**                            | Lo que hace el sistema en relación con una etapa; se dibuja en un rectángulo a la derecha de la etapa.                |
| **Acción continua**                   | Salida verdadera mientras su etapa está activa (y su condición es verdadera).                                         |
| **Acción memorizada**                 | Acción ejecutada una sola vez (en la activación, en la desactivación o ante un evento) cuyo efecto perdura.           |
| **Búsqueda de estabilidad**           | Repetición de las reglas de evolución tras un cambio de entrada hasta que ninguna transición pueda franquearse.       |
| **Condición de asignación**           | Condición de una acción continua: la salida solo es verdadera mientras la condición también se cumple.                |
| **Convergencia en O**                 | Línea simple donde vuelven a unirse las ramas alternativas.                                                           |
| **Convergencia en Y**                 | Línea doble donde terminan las ramas paralelas; la transición siguiente espera a todas.                               |
| **Divergencia en O**                  | Línea simple tras una etapa seguida de varias transiciones; se elige un camino.                                       |
| **Divergencia en Y**                  | Línea doble tras una transición que activa varias etapas a la vez (ramas paralelas).                                  |
| **Etapa**                             | Una situación estable del sistema; se dibuja como un cuadrado numerado.                                               |
| **Etapa activa**                      | Una etapa que forma parte de la situación actual; en simulación lleva una marca.                                      |
| **Etapa encapsulante**                | Etapa que contiene un grafcet encapsulado, que solo funciona mientras la etapa está activa.                           |
| **Etapa inestable (evolución fugaz)** | Etapa activada y desactivada durante una misma búsqueda de estabilidad.                                               |
| **Etapa inicial**                     | Etapa activa al arrancar; se dibuja como un cuadrado doble.                                                           |
| **Evento**                            | Un flanco u otra condición instantánea que desencadena una acción memorizada ante un evento.                          |
| **Expansión**                         | El grafcet dibujado para una macroetapa, desde su etapa de entrada E hasta su etapa de salida S.                      |
| **Flanco**                            | Cambio instantáneo de una señal: flanco ascendente ↑a (falso → verdadero), flanco descendente ↓a (verdadero → falso). |
| **Franqueable**                       | Validada y con una receptividad verdadera: la transición se va a franquear.                                           |
| **Franquear (una transición)**        | Atravesarla: activar las etapas de debajo y desactivar las de encima.                                                 |
| **Grafcet parcial**                   | Uno de los grafcets de un proyecto; todos funcionan a la vez.                                                         |
| **Macroetapa**                        | Etapa que representa una expansión dibujada en su propia hoja.                                                        |
| **Orden de forzado**                  | Acción que impone una situación a otro grafcet parcial, p. ej. `G2{8}`.                                               |
| **Receptividad**                      | La condición escrita junto a una transición.                                                                          |
| **Situación**                         | El conjunto de etapas activas en un instante dado.                                                                    |
| **Temporización**                     | `t/c`: verdadera un tiempo t después de que la condición c pase a verdadera, p. ej. `5s/X2`.                          |
| **Transición**                        | Barra entre etapas; el grafcet evoluciona franqueando transiciones.                                                   |
| **Transición fuente / sumidero**      | Una transición sin etapa encima / debajo.                                                                             |
| **Transición validada**               | Una transición cuyas etapas anteriores están todas activas.                                                           |
| **Variable de etapa**                 | `Xn`: verdadera mientras la etapa n está activa.                                                                      |
