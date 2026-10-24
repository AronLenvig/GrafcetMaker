# Escribir receptividades

Las receptividades, las condiciones de las acciones y los eventos son expresiones lógicas. Las
escribes en ASCII simple; el diagrama las muestra en notación clásica (el NO como una barra encima,
el Y como `·`). Desactiva **Ver › Notación clásica** para ver exactamente lo que escribiste.

## Operadores {#operators}

| Significado               | Escribe       | También se acepta                         | Se muestra como        |
| ------------------------- | ------------- | ----------------------------------------- | ---------------------- |
| Y                         | `a * b`       | `a AND b`, `a && b`, `a · b`              | a · b                  |
| O                         | `a + b`       | `a OR b`, `a \|\| b`                      | a + b                  |
| NO                        | `/a`          | `NOT a`, `!a`, `¬a`                       | a con una barra encima |
| Flanco ascendente         | `↑a`          | `RE a` (al escribir `^a` se obtiene `↑a`) | ↑a                     |
| Flanco descendente        | `↓a`          | `FE a`                                    | ↓a                     |
| Siempre verdadero / falso | `1` / `0`     | `TRUE` / `FALSE`                          | 1 / 0                  |
| Paréntesis                | `(a + b) * c` |                                           | (a + b) · c            |

El NO tiene la mayor prioridad, luego el Y y luego el O: `a + b * /c` significa `a + (b * (/c))`.
Usa paréntesis si tienes dudas.

## Flancos ascendentes y descendentes {#rising-and-falling-edges}

Un flanco solo es verdadero en el instante en que cambia su operando: **↑a** (flanco ascendente,
_disparo P_) cuando `a` pasa de falso a verdadero, **↓a** (flanco descendente, _disparo N_) cuando
pasa de verdadero a falso. Úsalo para reaccionar una sola vez a la pulsación de un botón, por mucho
tiempo que se mantenga pulsado.

<!-- figure: edges | Lámpara encendida desde que se pulsa el botón hasta que se suelta -->

Tres formas de escribir un flanco:

- Escribe `^` delante del nombre: `^start` se convierte en `↑start` mientras escribes.
- Pon el cursor de texto sobre un nombre y pulsa <kbd>Alt+↑</kbd> para un flanco ascendente o
  <kbd>Alt+↓</kbd> para un flanco descendente. Vuelve a pulsarlo para quitar el flanco, o pulsa el
  otro para cambiarlo.
- Haz clic en **↑** o **↓** en la barra de símbolos que aparece encima del campo mientras editas una
  receptividad.

También se aceptan `RE a` y `FE a`. Los flancos funcionan también con las variables de etapa: `↑X3`
es verdadero cuando la etapa 3 se activa.

## Variables de etapa {#step-variables}

`X3` es verdadera mientras la etapa 3 está activa. En un proyecto con varios grafcets, `X3` se
refiere a la etapa 3 del mismo grafcet, o a la única etapa 3 del proyecto. Úsala para sincronizar
grafcets, p. ej. para esperar a que otro grafcet llegue a una etapa.

## Temporizaciones {#timers}

`5s/X2` es verdadera 5 segundos después de que `X2` pase a verdadera, y vuelve a ser falsa en
cuanto `X2` es falsa: normalmente, «5 s después de activarse la etapa 2».

<!-- figure: timer | El calefactor funciona durante 5 s -->

- Unidades: `ms`, `s`, `min`, `h`, p. ej. `500ms/X4`, `2min/start`.
- El operando puede ser cualquier condición: `3s/(a * b)`.
- `2s/a/5s` es verdadera 2 s después de que `a` pase a verdadera y sigue siendo verdadera hasta 5 s
  después de que `a` pase a falsa.

## Comparaciones {#comparisons}

Las variables numéricas (INT, REAL, TIME) se comparan con `=`, `<>`, `<`, `<=`, `>`, `>=`, y pueden
usar `+`, `-`, `*`, `/` y `MOD` dentro de la comparación: `level >= 80`, `C = 3`, `T1 > 2s`,
`(a + b) / 2 < limit`. Una comparación es una condición: cuando la combines con otras, ponla entre
paréntesis, como en `start * (C < 10)`. Sin ellos, `start * C < 10` compararía `start * C` con 10.

## Asignaciones en las acciones memorizadas {#assignments-in-stored-actions}

Las acciones memorizadas contienen una asignación: `C := C + 1`, `Motor := 1`, `Speed := 2.5`,
`Done := FALSE`. Consulta [Acciones](actions.md).

## Ayuda mientras escribes {#help-while-you-type}

- **Sugerencias**: empieza a escribir un nombre y elige una variable o una etapa (`X…`) con las
  flechas; luego pulsa <kbd>Enter</kbd> o <kbd>Tab</kbd>. El resto del nombre resaltado aparece en
  gris después del cursor; <kbd>Tab</kbd> o <kbd>→</kbd> lo acepta.
- **Campo vacío**: la primera variable de la tabla que aún no se usa en ningún sitio aparece en gris
  (una entrada para una receptividad, una salida para una acción); <kbd>Tab</kbd> la acepta.
- **Problemas**: un recuadro bajo el campo explica qué está mal, subraya dónde y ofrece
  correcciones: **Usar Start** para un nombre mal escrito, **Crear BOOL start** para uno nuevo.
- **Barra de símbolos**: botones para ↑ ↓ NO Y O, paréntesis (rodean el texto seleccionado) y una
  plantilla de temporización.

Siempre puedes confirmar una expresión con un problema: se muestra subrayada en rojo en el diagrama
y aparece en **Problemas** hasta que la corrijas.
