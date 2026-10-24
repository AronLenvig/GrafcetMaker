# Macroetapas, etapas encapsulantes y forzado

Las aplicaciones grandes son más fáciles de leer cuando se dividen. El GRAFCET ofrece tres
herramientas para ello, todas disponibles en GrafcetMaker.

## Varios grafcets parciales {#several-partial-grafcets}

Un proyecto puede contener varios **grafcets parciales**, uno por pestaña, p. ej. _G1_ para el
ciclo de producción y _G2_ para la lógica de seguridad. Todos funcionan a la vez y pueden observarse
unos a otros mediante las variables de etapa (`X21` en G1 es verdadera mientras la etapa 21 de G2
está activa).

- Haz clic en **+** junto a las pestañas para añadir uno. Sus números de etapa empiezan en la
  siguiente decena libre (20, 30…), así que las referencias `Xn` no son ambiguas.
- Haz doble clic en una pestaña (o pulsa <kbd>F2</kbd> sobre ella) para cambiarle el nombre;
  arrástrala hacia un lado para cambiar el orden; pulsa <kbd>Del</kbd> sobre ella para eliminarla.
  <kbd>Ctrl</kbd>+clic o <kbd>Shift</kbd>+clic elige varias pestañas para eliminarlas juntas. Haz
  clic derecho en una pestaña para ver más opciones. Si hay muchas pestañas, se desplazan con la
  rueda del ratón o con los botones ‹ ›.

## Macroetapas {#macro-steps}

Una **macroetapa** representa una secuencia detallada dibujada en su propia hoja, su **expansión**.
Se dibuja como una etapa con dos líneas horizontales.

<!-- figure: macro | Una macroetapa en la secuencia principal -->

1. Selecciona una etapa y pon su **Tipo** en _Macroetapa_ en el panel Propiedades (o
   **Editar › Convertir en macroetapa**).
2. Se abre una pestaña nueva con la expansión: una etapa de entrada **E** y una etapa de salida
   **S** unidas por una transición. Dibuja la secuencia detallada entre ellas.
3. Haz doble clic en la macroetapa (o pulsa <kbd>Alt+↓</kbd>) para abrir su expansión;
   <kbd>Alt+↑</kbd> vuelve a la macroetapa.

Cuando la macroetapa se activa, su etapa de entrada pasa a estar activa; la transición posterior a
la macroetapa solo está validada cuando la etapa de salida está activa. La macroetapa cuenta como
activa mientras lo esté cualquier etapa de su expansión.

## Etapas encapsulantes {#enclosing-steps}

Una **etapa encapsulante** contiene un grafcet completo, el **grafcet encapsulado**, que solo
funciona mientras la etapa encapsulante está activa. Úsala para los modos: _automático_, _manual_,
_ajuste_. Se dibuja como una etapa con dos líneas verticales.

1. Pon el **Tipo** de la etapa en _Etapa encapsulante_ (o
   **Editar › Convertir en etapa encapsulante**).
2. Una pestaña nueva contiene el grafcet encapsulado. Las etapas marcadas con `*` en él se activan
   cuando se activa la etapa encapsulante.
3. Cuando se abandona la etapa encapsulante, se desactivan todas las etapas del grafcet encapsulado.

Las pestañas de las expansiones y de los grafcets encapsulados llevan un distintivo **M** o **E**.

## Órdenes de forzado {#forcing-orders}

Una **orden de forzado** es una acción que impone una situación a otro grafcet parcial mientras su
etapa está activa. Mientras tanto, el grafcet forzado no evoluciona.

| Orden      | Efecto sobre G2                     |
| ---------- | ----------------------------------- |
| `G2{8}`    | solo la etapa 8 está activa         |
| `G2{8, 9}` | solo las etapas 8 y 9 están activas |
| `G2{*}`    | congelado en su situación actual    |
| `G2{}`     | ninguna etapa está activa           |
| `G2{INIT}` | vuelve a su situación inicial       |

El forzado es la forma normalizada de describir las paradas de emergencia y los cambios de modo:
por ejemplo, un grafcet de seguridad fuerza el grafcet de producción a su situación inicial. Un
grafcet no puede forzarse a sí mismo, y dos grafcets no pueden forzarse mutuamente.

## Comprobaciones {#checks}

GrafcetMaker comprueba que cada macroetapa y cada etapa encapsulante tenga su propio subgrafcet del
tipo correcto, que las expansiones tengan una etapa de entrada y una de salida, y que las órdenes de
forzado apunten a grafcets y etapas existentes.
