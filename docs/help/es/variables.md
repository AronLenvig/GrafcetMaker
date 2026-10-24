# Variables

Cada nombre usado en una receptividad o en una acción es una **variable** del proyecto. Al
declararla le das un tipo y un sentido, GrafcetMaker puede comprobar tus expresiones y el simulador
puede ofrecer los controles adecuados.

## Tipos de variables {#kinds-of-variables}

- **Sentido**: una **entrada** viene del proceso (sensores, botones) y solo se puede leer; una
  **salida** gobierna el proceso (motores, lámparas); una variable **interna** es una memoria o un
  contador.
- **Tipo**: `BOOL` (verdadero / falso), `INT` (número entero), `REAL` (número decimal) o `TIME`
  (duración, p. ej. `500ms`, `3s`).
- **Valor inicial**: el valor al inicio de una simulación (FALSE o 0 si está vacío).
- **Dirección** y **comentario**: texto libre, p. ej. una dirección de PLC `%I0.0` y qué es la
  señal.

Los nombres no distinguen mayúsculas y minúsculas, usan letras, cifras y `_`, y no pueden ser
palabras reservadas (`AND`, `OR`, `NOT`, `RE`, `FE`, `TRUE`, `FALSE`, `MOD`, `INIT`) ni parecerse a
una variable de etapa (`X12`).

## Crear variables {#creating-variables}

- Mientras escribes una expresión, un nombre desconocido ofrece **Crear BOOL nombre** (como
  entrada, o como salida según dónde lo uses). Es la forma más rápida.
- **Añadir variable** en la lista o la tabla de Variables.
- **Importar** una lista desde Excel o CSV (ver más abajo).

## La tabla de variables {#the-variable-table}

El botón **Variables** de abajo a la derecha abre las variables en el lado derecho de la ventana:
una lista compacta (búsqueda, filtros rápidos, grupos por sentido; haz clic en una variable para
editarla y ver dónde se usa). Ensancha el panel desde su borde izquierdo y se convierte en la
tabla, con todos los campos en columnas. Edita cualquier celda directamente (<kbd>Enter</kbd> o
salir de la celda aplica el cambio, <kbd>Esc</kbd> lo revierte), ordena haciendo clic en el
encabezado de una columna y filtra por texto, sentido y tipo. La tabla sigue siendo rápida con
miles de variables.

La columna **Usos** cuenta las expresiones que usan cada variable; una variable sin usar muestra `0`
en naranja. Haz clic en el número para abrir la variable en la tarjeta de propiedades: edita todos
sus campos y mira **dónde se usa**; haz clic en un uso para ir a esa receptividad o acción en el
diagrama.

El botón de la escoba junto a **⋯** quita de una vez todas las variables no usadas (su distintivo
indica cuántas): las que no usa ninguna receptividad, acción ni condición y no gobierna ningún
escenario. Se deshace en un solo paso (<kbd>Ctrl+Z</kbd>). También está en la paleta de comandos:
**Quitar variables no usadas**.

En un móvil, el panel Variables es en cambio una lista compacta: búsqueda, filtros rápidos
(**Entradas**, **Salidas**, **Internas**), grupos por sentido, y al tocar una variable se abre con
sus usos.

## Cambiar el nombre {#renaming}

Cambiar el nombre de una variable actualiza todas las receptividades, acciones y condiciones que la
usan, en todos los grafcets, como un único cambio que se puede deshacer.

## Excel y CSV {#excel-and-csv}

Usa el menú **⋯** de la lista o la tabla de Variables, o **Archivo › Variables**:

- **Exportar variables como Excel** escribe un libro `.xlsx` con el encabezado inmovilizado, filtros
  y listas desplegables para el tipo y el sentido.
- **Exportar variables como CSV** escribe un archivo de texto para otras herramientas.
- **Importar variables** lee un archivo `.xlsx` o `.csv` (también puedes soltarlo en la ventana).

Las columnas son `name`, `type`, `direction`, `initial`, `address` y `comment` (en cualquier orden;
solo `name` y `type` son obligatorias). Antes de que cambie nada, ves cuántas variables se
añadirán, se actualizarán o se rechazarán, con el motivo de cada fila rechazada. Las variables se
emparejan por nombre; las que no están en el archivo se conservan. La importación es un único cambio
que se puede deshacer.

> **Consejo:** para preparar una lista en Excel, exporta primero: obtienes las columnas correctas y
> las listas desplegables; luego rellena las filas y vuelve a importar el archivo.
