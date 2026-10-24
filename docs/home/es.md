# GrafcetMaker: editor y simulador de GRAFCET gratis en línea

GrafcetMaker dibuja, comprueba y simula grafcets (IEC 60848) en el navegador y los convierte en
código de autómata. Está pensado para ingenieros de automatización, docentes y estudiantes: gratis y
de código abierto (licencia MIT), sin cuenta, y funciona sin conexión.

GrafcetMaker es una aplicación web: funciona en cualquier navegador actual con JavaScript activado.
¿Es nuevo para ti el GRAFCET? Lee la [guía de GRAFCET](es/guide/), también en
[inglés](en/guide/), [francés](fr/guide/) y [alemán](de/guide/).

## Lo que puedes hacer

- **Dibujar** etapas, transiciones, receptividades y acciones con el ratón o el teclado
  (<kbd>Enter</kbd> continúa una secuencia), con divergencias en O y en Y, repeticiones de
  secuencia, transiciones fuente y sumidero y comentarios. La organización automática ordena un
  grafcet cuando lo pides.
- **Comprobar** el grafcet mientras dibujas: la sintaxis y los tipos de cada receptividad, las
  variables desconocidas, los números de etapa repetidos, las etapas inalcanzables, los callejones
  sin salida, las divergencias en O no exclusivas, las posibles evoluciones fugaces sin fin y las
  salidas activadas desde ramas paralelas. La mayoría de los problemas tienen una corrección con un
  clic.
- **Simular** con las reglas de evolución de la IEC 60848: marcas en las etapas activas,
  transiciones validadas, entradas que pulsas o escribes, temporizaciones, flancos, etapas
  inestables, forzado entre grafcets, un cronograma de cada variable y escenarios que grabas y
  reproduces.
- **Estructurar** aplicaciones grandes con grafcets parciales, macroetapas y sus expansiones, etapas
  encapsulantes y órdenes de forzado.
- **Exportar** a PDF (A4 o A3, con cajetín, repartido en varias hojas si hace falta), SVG, PNG y
  WebP, la tabla de variables a Excel y CSV, y generar Structured Text o PLCopen XML.
- **Trabajar en equipo** en tiempo real desde un enlace: cada uno ve los punteros y los cambios de
  los demás al instante, con cifrado de extremo a extremo.

## Elementos del GRAFCET compatibles

| Elemento     | Lo que admite GrafcetMaker                                                                                               |
| ------------ | ------------------------------------------------------------------------------------------------------------------------ |
| Etapas       | etapas y etapas iniciales, macroetapas con su expansión, etapas encapsulantes; variables de etapa `X1`                   |
| Transiciones | receptividades con Y, O, NO, flancos ascendentes ↑ y descendentes ↓, temporizaciones como `5s/X1`, comparaciones         |
| Estructuras  | secuencias, divergencias y convergencias en O y en Y, repeticiones y saltos de secuencia, transiciones fuente y sumidero |
| Acciones     | continuas, condicionales, memorizadas en la activación, en la desactivación o ante un evento; forzado `G2{8}`, `G2{*}`   |
| Variables    | entradas, salidas y variables internas BOOL, INT, REAL y TIME, con direcciones y comentarios                             |
| Notación     | escrita en ASCII (`a*/b`, `RE a`), mostrada en notación clásica (barra para NO, ↑ y ↓) o tal como se escribió            |

## Simulación

El simulador sigue las reglas de evolución de la IEC 60848. Las etapas iniciales están activas al
comienzo. Una transición está validada cuando todas las etapas anteriores están activas, y se
franquea cuando además su receptividad es verdadera: las etapas siguientes se activan y las
anteriores se desactivan. Todas las transiciones franqueables se franquean a la vez, y una etapa
activada y desactivada al mismo tiempo sigue activa.

Tras cada cambio de las entradas, el simulador busca la estabilidad: franquea transiciones hasta
que ninguna es franqueable. Las etapas atravesadas por el camino (etapas inestables) no ejecutan sus
acciones continuas, pero sí sus acciones memorizadas. El tiempo es virtual: un grafcet se ejecuta en
tiempo real, más rápido o una evolución cada vez, y un cronograma registra cada variable.

## Exportación y código de autómata

| Formato             | Para                                                                | Se abre en                                                                                                                                                                                    |
| ------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| PDF                 | impresión y documentación: vectorial, A4 o A3, con cajetín          | cualquier lector de PDF                                                                                                                                                                       |
| SVG, PNG, WebP      | informes, presentaciones y páginas web, también por el portapapeles | Word, PowerPoint, navegadores y editores de imágenes                                                                                                                                          |
| Variables           | la tabla de variables en Excel o CSV, y de vuelta                   | Excel, LibreOffice y otras hojas de cálculo                                                                                                                                                   |
| Structured Text     | código de autómata para cada grafcet (IEC 61131-3)                  | CODESYS y la mayoría de las herramientas IEC 61131-3, Siemens TIA Portal (fuente SCL para S7-1200/1500), Beckhoff TwinCAT 3 (archivo POU), Allen-Bradley Studio 5000 (rutina Structured Text) |
| PLCopen XML (TC6)   | los grafcets como programas SFC                                     | herramientas de ingeniería de autómatas que importan PLCopen XML                                                                                                                              |
| Archivo de proyecto | todo el proyecto en un `.grafcet.json` legible                      | GrafcetMaker                                                                                                                                                                                  |

El Structured Text tiene dos estilos: un `CASE` por secuencia, como se escribe a mano, o un BOOL por
etapa. El código generado es un punto de partida: revísalo antes de que mueva una máquina.

## Ejemplos

Seis proyectos de ejemplo se abren desde la pantalla de inicio del editor:

- **Semáforo** con pulsador para peatones: temporizaciones y una petición memorizada.
- **Estación de taladrado**: un ciclo de mecanizado con contador de piezas y mantenimiento cada 100
  piezas.
- **Llenado de depósito**: entradas numéricas y comparaciones.
- **Cintas en paralelo**: ramas paralelas y un grafcet de seguridad que fuerza la línea.
- **Línea de embotellado**: una macroetapa, tres estaciones en paralelo, inspección y contadores.
- **Modos de marcha**: una etapa encapsulante, una pausa que congela el ciclo y una parada de
  emergencia.

La [guía de GRAFCET](es/guide/#ejemplos) dibuja los dos primeros y los abre en el editor.

## Preguntas frecuentes

### ¿GrafcetMaker es gratis? ¿Tiene límites?

Sí, es gratis y de código abierto con licencia MIT. No hay versión de pago, ni periodo de prueba,
ni límite de proyectos, grafcets o etapas.

### ¿Hay que registrarse o instalar algo?

No. Abre la página y empieza a dibujar; no hay cuenta. También puedes instalarlo desde el navegador
como una aplicación, para abrirlo como un programa de escritorio.

### ¿Funciona sin conexión?

Sí. Tras la primera visita, todo lo que necesita queda guardado en el navegador, así que arranca y
funciona sin red. Solo la colaboración en tiempo real necesita conexión.

### ¿Dónde se guardan mis grafcets?

En tu ordenador. Los proyectos se guardan automáticamente en el navegador y en los archivos
`.grafcet.json` que guardes. No se sube nada y la aplicación no hace ningún seguimiento. Las
sesiones en tiempo real van cifradas de extremo a extremo con una clave que solo está en el enlace.

### ¿En qué navegadores y dispositivos funciona?

En las últimas versiones de Chrome, Edge, Firefox y Safari, en Windows, macOS, Linux, tabletas y
teléfonos. Los teléfonos tienen un diseño para pantallas pequeñas, y las pantallas táctiles gestos y
tiradores más grandes.

### ¿Qué norma sigue?

El GRAFCET tal como lo define la IEC 60848 (UNE-EN 60848). El código generado sigue la IEC 61131-3.

### ¿Puede abrir archivos de otros programas de GRAFCET?

GrafcetMaker abre los archivos de grafcet.io (`.grafcetio`) y los convierte en un proyecto. Las
tablas de variables se importan desde Excel y CSV.

### ¿Puede mi empresa alojarlo en su propia red?

Sí. GrafcetMaker es un conjunto de archivos estáticos que cualquier servidor web puede servir, bajo
cualquier ruta y sin acceso a Internet. Se incluye una imagen Docker con nginx.
