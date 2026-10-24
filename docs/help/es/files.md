# Archivos, guardado y exportación

Todo ocurre en tu equipo: no hay cuenta y no se sube nada.

## Guardado automático y recuperación {#autosave-and-recovery}

Cada cambio se guarda en tu navegador medio segundo después de hacerlo. Puedes recargar o cerrar la
pestaña en cualquier momento sin que se te pregunte nada: la próxima vez que abras GrafcetMaker, tu
proyecto estará como lo dejaste, cambios sin guardar incluidos. Un punto `●` junto al nombre del
proyecto indica que hay cambios que aún no se han guardado en un archivo.

**Archivo › Historial local** muestra las instantáneas guardadas en el navegador: se toman al
guardar, cada pocos minutos mientras editas y antes de cerrar un proyecto. Al restaurar una, se abre
como cambios sin guardar.

> **Importante:** el almacenamiento del navegador pertenece a este navegador en este equipo, y
> borrar los datos del sitio lo elimina. Guarda en un archivo todo lo que quieras conservar.

## Sin conexión e instalación {#offline-and-installation}

Después de la primera visita, GrafcetMaker funciona sin red. Usa el botón de instalación de la
barra de direcciones de tu navegador para tenerlo como una aplicación con su propia ventana. Cuando
hay una nueva versión lista, una tarjeta en la esquina te ofrece recargar: tu trabajo se conserva.

## Guardar y abrir {#save-and-open}

- **Guardar** (<kbd>Ctrl+S</kbd>) escribe el proyecto en un archivo `.grafcet.json`. En Chrome y
  Edge vuelve a escribir en el mismo archivo cada vez; en otros navegadores descarga el archivo.
- **Guardar como** (<kbd>Ctrl+Shift+S</kbd>) elige un archivo nuevo. **Archivo › Descargar una
  copia** descarga una copia sin cambiar dónde escribe Guardar.
- **Abrir** (<kbd>Ctrl+O</kbd>), **Archivo › Abrir reciente**, o suelta un archivo `.grafcet.json`
  en cualquier lugar de la ventana. Si el proyecto abierto tiene cambios sin guardar, primero se te
  pregunta, y un archivo no válido se rechaza con una explicación sin tocar tu proyecto.

Los archivos `.grafcet.json` son texto legible, muy adecuado para el control de versiones (Git) y la
revisión de código.

Los **archivos de grafcet.io** (`.grafcetio`) se abren de la misma forma: se convierten en un
proyecto nuevo, con un grafcet parcial por diagrama (o por marco), las variables creadas a partir de
lo que usan los diagramas y una disposición ordenada. Un mensaje indica todo lo que cambió la
conversión. Guárdalo para conservarlo como proyecto de GrafcetMaker; el archivo original no se
modifica.

## Compartir un enlace {#share-a-link}

**Archivo › Copiar enlace para compartir** copia una dirección web que contiene todo el proyecto,
comprimido. Pégala en un chat, un correo o una incidencia: quien la abra obtiene su propia copia
del proyecto, con todos sus grafcets y variables, y puede cambiarla sin afectar a la tuya.

- El proyecto viaja dentro del enlace (después del `#`), que los navegadores nunca envían al
  servidor web: no se sube nada, y los enlaces también funcionan sin conexión y en instalaciones
  internas.
- Cualquiera que tenga el enlace puede leer el proyecto, así que compártelo como compartirías el
  propio archivo.
- Un enlace es una instantánea: los cambios posteriores necesitan un enlace nuevo.
- Los diagramas pequeños dan enlaces de uno o dos mil caracteres. Si GrafcetMaker avisa de que un
  enlace es largo, algunas aplicaciones de chat y de correo pueden cortarlo; envía en su lugar el
  archivo `.grafcet.json`.
- Abrir un enlace funciona como abrir un archivo: si tu proyecto tiene cambios sin guardar, primero
  se te pregunta, y un enlace dañado se rechaza con una explicación sin tocar tu proyecto.

## Editar en equipo en tiempo real {#edit-together-live}

**Archivo › Colaboración en tiempo real…** (o el botón de personas de arriba a la derecha) permite
que varias personas editen el mismo proyecto a la vez, cada una en su propio equipo.

1. Escribe tu nombre y elige **Iniciar sesión en tiempo real**. Envía a los demás el enlace que
   aparece.
2. Ellos abren el enlace, escriben su nombre y eligen **Unirse**.
3. Todos ven los punteros y las selecciones de los demás con sus nombres, y cada cambio aparece para
   todos en un instante.

- Los cambios se combinan campo por campo: si mueves una etapa mientras otra persona le cambia el
  nombre, se conservan los dos cambios.
- **Deshacer** solo revierte tus propios cambios.
- Mientras simulas, los cambios de los demás esperan para que el diagrama siga coincidiendo con tu
  simulación: **Reiniciar con los cambios** en los controles de simulación los incorpora.
- Sin conexión puedes seguir trabajando; los cambios se intercambian cuando vuelve.
- **Salir de la sesión** conserva el proyecto en tu dispositivo como tu propia copia.
- El proyecto está cifrado de extremo a extremo con una clave que solo está en el enlace: cualquiera
  que tenga el enlace puede ver y cambiar el proyecto, así que compártelo como compartirías el
  propio archivo.

## Exportar {#export}

**Archivo › Exportar…** (<kbd>Ctrl+E</kbd>, o el botón **Exportar** de arriba a la derecha) abre un
único cuadro de diálogo para todos los formatos, con vista previa inmediata. Sus ajustes se
recuerdan para cada proyecto. **Archivo › Exportar como** lo abre directamente en un formato
concreto.

| Formato                | Úsalo para                                                                                                                    |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| **PDF**                | imprimir y documentar: vectorial, A4 o A3, ajustado a la página o en mosaico sobre varias hojas, con cajetín                  |
| **SVG**                | documentos y la web: vectorial, nítido a cualquier tamaño                                                                     |
| **PNG**                | presentaciones, chats e incidencias: resolución 1×, 2× o 4×, con fondo transparente opcional                                  |
| **WebP**               | lo mismo que PNG, con archivos más pequeños                                                                                   |
| **Variables (Excel)**  | la tabla de variables como libro `.xlsx`                                                                                      |
| **Variables (CSV)**    | la tabla de variables para otras herramientas                                                                                 |
| **Texto estructurado** | código de PLC que ejecuta todos los grafcets: IEC 61131-3, Siemens TIA Portal (SCL), Beckhoff TwinCAT 3 o Allen-Bradley Logix |
| **PLCopen XML**        | importar los grafcets en una herramienta de PLC como programas SFC                                                            |

Las exportaciones son en negro sobre blanco de forma predeterminada; elige **Tema actual** para
conservar los colores de la pantalla. Exporta el grafcet actual, la selección o todos los grafcets.

**Archivo › Copiar diagrama como PNG / SVG** pone la selección (o el grafcet completo) en el
portapapeles, lista para pegarla en un informe.

## Código de PLC {#plc-code}

**Texto estructurado** y **PLCopen XML** convierten tus grafcets en código de PLC. Elige el PLC en
**PLC**:

- **IEC 61131-3**: un bloque de función (`.st`) para CODESYS y la mayoría de las demás
  herramientas.
- **Siemens TIA Portal (SCL)**: una fuente SCL (`.scl`) para S7-1200/1500. En TIA Portal, añádela en
  **External source files** y elige **Generate blocks from source**.
- **Beckhoff TwinCAT 3**: un archivo POU (`.TcPOU`). Haz clic derecho en una carpeta del proyecto
  PLC › **Add › Existing Item**.
- **Allen-Bradley Studio 5000**: una rutina de texto estructurado. Crea los tags indicados en su
  cabecera (ámbito de programa) y pega el código en una rutina ST. Las temporizaciones usan
  TONR/TOFR, los flancos OSRI/OSFI, y el primer ciclo (`S:FS`) fija los valores iniciales.

El texto estructurado tiene dos estilos:

- **CASE por secuencia** (predeterminado): una variable INT por secuencia guarda el número de su
  etapa activa, y un `CASE` enumera las transiciones de cada etapa
  (`IF receptivity THEN step_G1 := 2;`). Después vienen las salidas, una línea cada una, p. ej.
  `Motor := step_G1 >= 2 AND step_G1 <= 4;`. Las secuencias con ramas paralelas mantienen un BOOL
  por etapa.
- **Un BOOL por etapa**: todas las transiciones, luego todas las etapas, luego las temporizaciones,
  los flancos y las acciones, una vez por ciclo del PLC; marca **Búsqueda de estabilidad en cada
  ciclo** para atravesar cadenas de transiciones verdaderas en un solo ciclo, como hace el GRAFCET.

Una acción memorizada como `Q1 := 1` en la activación se ejecuta una vez, y Q1 conserva su valor
después de abandonar la etapa. Marca **Mantener las acciones memorizadas con un valor constante**
para asignarla en cada ciclo mientras su etapa esté activa.

El archivo PLCopen contiene un programa SFC por grafcet para importarlo en herramientas de
ingeniería. La vista previa indica todo lo que el formato no puede expresar. Revisa siempre el
código generado antes de ejecutarlo en una máquina.

## Configuración {#settings}

**Archivo › Configuración…** (<kbd>Ctrl+,</kbd>) contiene el tema, la notación, la pantalla de
bienvenida, la cuadrícula, las sugerencias y las preferencias de simulación, y muestra cuánto
almacenamiento del navegador se usa. Ahí puedes borrar el historial local y la lista de archivos
recientes.

## Idioma {#language}

Elige el idioma con la bandera de abajo a la derecha (en un teléfono, en la parte inferior del
menú ☰); la elección se recuerda en este dispositivo. Cada idioma tiene además su
propia dirección, como `…/de/` para el alemán, así que un enlace se abre en el idioma en que se
envió.
