# Solución de problemas

GrafcetMaker comprueba tu proyecto mientras trabajas. Los contadores de arriba a la derecha muestran
el número de **errores** (rojo) y de **advertencias** (naranja); haz clic en ellos para abrir la
lista de **Problemas**. Haz clic en un problema para ir al elemento y usa su botón de corrección
cuando lo haya. Los elementos con un problema también llevan un distintivo en el diagrama: pasa el
puntero por encima para ver los detalles.

## Errores {#errors}

**El grafcet G1 no tiene etapa inicial.** Nada puede activarse nunca. Selecciona la primera etapa y
pulsa la corrección **Hacer inicial la etapa …**, o pon su Tipo en _Etapa inicial_.

**Varias etapas tienen el mismo número.** Los números deben ser únicos en un grafcet; si no, `Xn`
sería ambiguo. Usa **Renumerar etapas** o cambia un número con <kbd>F2</kbd>.

**Receptividad vacía.** Cada transición necesita una condición. Usa `1` para una transición siempre
verdadera (la corrección lo hace por ti).

**Variable desconocida.** El nombre no está declarado (un archivo escrito en otro sitio, o una
variable eliminada). Los nombres que escribes en una receptividad o una acción se crean
automáticamente; para los demás, usa la corrección para crear la variable, o elige el nombre
sugerido si es una errata.

**Problemas de expresión** (carácter inesperado, falta un paréntesis…). El recuadro de problema bajo
el campo marca la posición y da una pista. Uno frecuente: `/` significa NO delante de una
condición, así que escribe `a * /b` para «a y no b». Consulta
[Escribir receptividades](expressions.md).

**Una acción asigna una entrada.** Las entradas vienen del proceso y no se pueden escribir. Cambia
el sentido de la variable o usa otra variable.

**Una orden de forzado apunta a un grafcet o una etapa que no existe.** Comprueba el nombre del
grafcet y los números de etapa de la orden.

**Las órdenes de forzado forman un ciclo.** Un grafcet no puede forzar a otro que lo fuerza a él,
directamente o a través de otros. Elimina una de las órdenes, o haz que un tercer grafcet fuerce a
los dos.

**La macroetapa … no tiene grafcet de expansión** (o **La etapa encapsulante … no tiene grafcet
encapsulado**). Su subgrafcet se eliminó. Pon el Tipo de la etapa en _Etapa_ y de nuevo en
_Macroetapa_ (o _Etapa encapsulante_) para obtener uno nuevo, o déjala como etapa normal.

**El grafcet … lo usan varias etapas.** Cada macroetapa y cada etapa encapsulante necesita su
propio subgrafcet. Pon una de las etapas en _Etapa_ y vuelve a su tipo: obtiene un subgrafcet
propio.

## Advertencias {#warnings}

**La etapa … nunca puede activarse.** Ningún camino lleva a ella desde una etapa inicial. Enlázala o
elimínala.

**La etapa … no tiene ninguna transición de salida.** Una vez activa, sigue activa para siempre.
Normalmente falta un bucle de retorno (<kbd>L</kbd>).

**Las ramas alternativas no son excluyentes.** Las dos receptividades pueden ser verdaderas a la
vez, lo que activaría las dos ramas. Hazlas excluyentes, p. ej. `a` y `/a * b`, o usa la corrección
**Dar prioridad a …**.

**Posible evolución fugaz sin fin.** Todas las transiciones de un bucle podrían ser verdaderas a la
vez, así que el grafcet nunca se estabilizaría. Añade una condición que no pueda seguir siendo
verdadera, a menudo un flanco (`↑start`).

**Salida asignada por acciones continuas de etapas que pueden estar activas a la vez.** Dos ramas
paralelas gobiernan la misma salida. Gobiérnala desde un solo sitio, o usa acciones memorizadas.

**Una acción sin etapa está memorizada en la desactivación.** Sin etapa, la acción está siempre
activa y nunca se desactiva, así que nunca se ejecuta. Asóciala a una etapa o cambia su tipo.

**Salida asignada por una acción sin etapa y por otra acción.** La salida es verdadera siempre que
lo sea cualquiera de ellas. Asegúrate de que es lo que quieres.

**Memorizada ante un evento, pero sin evento.** Escribe el evento (p. ej. `↑b`) en el panel
Propiedades.

**La acción condicional … aún no tiene condición.** Actúa como una acción continua hasta que
escribas su condición en el panel Propiedades.

**La simulación ignora las acciones memorizadas de una macroetapa.** Una macroetapa está activa a
través de su expansión: pon las acciones memorizadas en una etapa de la expansión.

**Un grafcet queda forzado a la situación vacía, y nada vuelve a activar sus etapas.** Una orden
como `G2{}` desactiva todas las etapas de G2, y nada vuelve a activarlas. Usa `G2{INIT}` para
reiniciar G2 en su situación inicial.

**La expansión … no se usa** (o **El grafcet encapsulado … no se usa**). Ninguna macroetapa ni
etapa encapsulante apunta a este grafcet. Elimina su pestaña si ya no lo necesitas.

**La expansión necesita exactamente una etapa de entrada y una etapa de salida.** En una expansión
de macroetapa, la etapa de entrada no tiene ninguna transición encima y la etapa de salida ninguna
debajo.

## Información {#information}

**La variable … no se usa.** Está declarada, pero ninguna expresión la usa. Elimínala con la
corrección, o consérvala para más adelante.

## Otras preguntas {#other-questions}

**La simulación se detuvo con un bucle de evolución fugaz.** Consulta la advertencia de arriba: el
simulador se detiene tras 1000 iteraciones sin estabilidad, en el instante indicado.

**Mi temporización no avanza.** Las temporizaciones solo avanzan mientras el reloj corre: pulsa
<kbd>F5</kbd> para ponerlo en marcha, o <kbd>F10</kbd> para saltar a la siguiente temporización.

**Una transición se franquea una y otra vez.** Si su receptividad sigue siendo verdadera, el
grafcet da vueltas tan rápido como puede. Usa un flanco `↑a` para reaccionar una vez por pulsación.

**Perdí mi trabajo.** Mira en **Archivo › Historial local**: las instantáneas se guardan en el
navegador. Tras una recarga o un fallo, GrafcetMaker vuelve a abrir automáticamente tu último
proyecto, cambios sin guardar incluidos.

**El archivo no se abre.** GrafcetMaker abre sus propios archivos `.grafcet.json` y los archivos de
grafcet.io (`.grafcetio`); el mensaje indica por qué se rechazó un archivo. Un archivo guardado con
una versión más reciente de GrafcetMaker necesita esa versión.
