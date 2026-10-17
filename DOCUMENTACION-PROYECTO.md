# Documentación técnica de FichasFacil

## 1. Descripción general

FichasFacil es una aplicación web estática para crear fichas educativas imprimibles destinadas principalmente a alumnado de Infantil y Primaria.

La aplicación permite seleccionar una actividad, configurar su nivel y opciones, generar ejercicios en el navegador, mostrar las soluciones opcionalmente e imprimir el resultado en formato A4 o guardarlo como PDF desde el diálogo de impresión del navegador.

El proyecto no necesita cuentas de usuario, base de datos ni un proceso de compilación.

## 2. Estructura del proyecto

```text
Fichas/
├── index.html                         Aplicación principal
├── app.js                             Lógica del generador y la impresión
├── styles.css                         Estilos de pantalla e impresión
├── sw.js                              Service Worker y caché offline
├── manifest.webmanifest               Configuración de instalación PWA
├── favicon.svg                        Favicon del sitio
├── pwa-icon.svg                       Icono de la PWA
├── portada-fichas-reales.svg          Ilustración de portada
├── social-preview.svg                 Imagen para compartir el sitio
├── assets/
│   ├── jspdf.umd.min.js               Biblioteca jsPDF incluida localmente
│   ├── portada-fichas-reales-v2.png   Recurso gráfico de portada
│   └── iconos/                         Iconos de sitios relacionados
├── api/
│   └── telegram-notify.js             Función serverless opcional para Telegram
├── output/pdf/                        PDFs generados y publicados
├── tests/
│   └── generator-levels.test.js       Pruebas de generadores y PDFs
├── .github/workflows/pages.yml        Despliegue en GitHub Pages
├── vercel.json                        Cabeceras y configuración de Vercel
├── robots.txt                          Reglas para buscadores
├── sitemap.xml                         Mapa de URLs públicas
├── llms.txt                            Resumen legible por asistentes
├── llms-full.txt                       Descripción ampliada para asistentes
├── README.md                           Introducción y guía rápida
└── DOCUMENTACION-PROYECTO.md          Este documento
```

## 3. Páginas públicas

La portada principal es `index.html`. También existen páginas específicas para actividades y contenidos:

- `sumas.html`
- `restas.html`
- `multiplicaciones.html`
- `divisiones.html`
- `problemas-matematicos.html`
- `fracciones.html`
- `geometria.html`
- `caligrafia.html`
- `comprension-lectora.html`
- `blog.html`
- `guia.html`

Las páginas legales son `privacidad.html`, `cookies.html` y `aviso-legal.html`. `404.html` gestiona las URLs no encontradas. `iconos.html` es una página interna de exploración visual y no forma parte de la navegación pública.

## 4. Funcionamiento de la aplicación

### 4.1 Inicio

1. El navegador carga `index.html`.
2. `styles.css` aplica los estilos de pantalla, responsive, accesibilidad e impresión.
3. `app.js` inicializa la interfaz, las preferencias y los generadores.
4. `sw.js` se registra para proporcionar recursos cacheados y funcionamiento básico offline.

### 4.2 Selección y configuración

El usuario selecciona una de las actividades disponibles y configura, según corresponda:

- Nivel: inicial, medio o avanzado.
- Número de ejercicios.
- Número de cifras.
- Número de operandos.
- Tabla de multiplicar.
- Tipo de división y resto.
- Nombre del alumno.
- Inclusión de soluciones.

Las opciones se guardan localmente cuando corresponde mediante `localStorage`. El nombre del alumno no se incluye en los enlaces compartidos.

### 4.3 Generación de ejercicios

Los generadores viven en `app.js`. La estructura de cada actividad es determinista, pero los ejercicios se seleccionan o calculan aleatoriamente al crear una ficha.

Las operaciones matemáticas comprueban los rangos, los operandos y el resultado esperado. Las actividades de lengua, lectura, lógica y competencias prácticas utilizan bancos internos diferenciados por nivel.

La aplicación genera contenido para 19 actividades:

- Sumas.
- Restas.
- Multiplicaciones.
- Divisiones.
- Problemas matemáticos.
- Comprensión lectora.
- Copiado.
- Ortografía.
- Vocabulario.
- Ordenar frases.
- Horas y reloj.
- Dinero.
- Medidas.
- Fracciones.
- Geometría.
- Caligrafía.
- Lógica.
- Ficha mixta.
- Ficha diaria.

### 4.4 Soluciones

Cuando el usuario activa las soluciones, el sistema crea una versión adicional de la ficha con las respuestas. Las soluciones se generan desde los mismos datos de ejercicios para evitar que la respuesta mostrada no corresponda con el enunciado.

### 4.5 Impresión y PDF

La impresión se prepara en un `iframe` aislado con HTML específico para A4. El navegador abre su diálogo de impresión y permite imprimir o guardar como PDF.

No se genera ni se sube un PDF al servidor durante el uso normal de la web. Los PDFs que aparecen en `output/pdf/` son archivos generados y publicados dentro del repositorio.

## 5. Compartir configuraciones

La configuración de una ficha puede codificarse en la URL para compartirla con otra persona. El enlace contiene las opciones necesarias para reconstruir la ficha, pero no incluye el nombre del alumno.

Al abrir un enlace compartido, `app.js` recupera los parámetros, restaura la configuración y permite generar la ficha con esos valores.

## 6. Service Worker y PWA

`sw.js` registra una caché de aplicación con los recursos esenciales del sitio. Esto permite recuperar la interfaz y parte del contenido cuando no hay conexión.

Cuando se modifican archivos principales como HTML, CSS o JavaScript, hay que revisar:

1. Las versiones de consulta `?v=...` utilizadas en los documentos.
2. La lista de recursos esenciales de `sw.js`.
3. La estrategia de invalidación de caché.

Esto evita que el navegador combine versiones antiguas y nuevas de los recursos.

## 7. API opcional de Telegram

`api/telegram-notify.js` es una función serverless pensada para Vercel. Puede enviar avisos sobre la generación de fichas.

Variables privadas necesarias en Vercel:

- `TELEGRAM_BOT_TOKEN`: token del bot.
- `TELEGRAM_CHAT_ID`: chat o grupo de destino.

El navegador envía únicamente datos operativos como actividad, dificultad y número de ejercicios. El token, el chat y el nombre del alumno no se exponen al cliente.

## 8. Despliegue

### GitHub Pages

El flujo `.github/workflows/pages.yml` publica el contenido estático del repositorio. La rama de producción es `main`.

### Vercel

`vercel.json` configura el proyecto como sitio estático en la raíz del repositorio. No hay comando de build.

También define:

- Cabeceras de seguridad.
- Política CSP.
- Política de permisos del navegador.
- Caché de assets.
- URLs sin trailing slash.

Comandos habituales:

```bash
git add .
git commit -m "Describe the change"
git push origin main
```

## 9. Seguridad y privacidad

La configuración de Vercel incluye, entre otras, estas medidas:

- `Content-Security-Policy` restrictiva.
- `X-Content-Type-Options: nosniff`.
- `X-Frame-Options: DENY`.
- `Referrer-Policy` restrictiva.
- `Permissions-Policy` sin cámara, micrófono, geolocalización, pagos, USB ni sensores.
- `Strict-Transport-Security`.

El contenido introducido por el usuario se escapa antes de incorporarse a la ficha. Los enlaces externos abiertos en otra pestaña utilizan `noopener noreferrer`.

La aplicación no requiere registro ni recopila datos personales durante el uso normal. Las preferencias se almacenan únicamente en el navegador.

## 10. Tests y comprobaciones

Comprobaciones rápidas:

```bash
node --check app.js
node --check sw.js
git diff --check
node --test tests/generator-levels.test.js
```

La suite actual comprueba, entre otros aspectos:

- Rangos razonables de las operaciones.
- Aplicación correcta de cifras y operandos.
- Multiplicaciones y divisiones.
- Diferencias entre niveles.
- Bancos de contenido no vacíos.
- Respuestas de las fichas.
- Generación de PDFs y hojas de soluciones.
- HTML válido para la ruta de impresión.
- Ausencia de textos obsoletos en páginas públicas.

Antes de publicar cambios, también conviene probar manualmente:

1. Una actividad matemática.
2. Una actividad de texto.
3. Impresión con y sin soluciones.
4. Compartición mediante enlace.
5. Navegación en móvil.
6. Funcionamiento de `blog.html` y `guia.html`.
7. Recuperación tras activar el modo offline.

## 11. Limitaciones actuales

- No existe backend general, autenticación ni base de datos.
- Las preferencias dependen del navegador y su almacenamiento local.
- La impresión y el guardado como PDF dependen del navegador.
- El contenido se basa en bancos cerrados, aunque ampliados y diferenciados por nivel.
- El repositorio contiene PDFs generados y recursos binarios de tamaño considerable.
- No hay una licencia de código declarada actualmente.
- La integración de IA no está implementada.

## 12. Estado de referencia

En la revisión actual:

- Rama: `main`.
- Remoto: `origin`.
- Estado de trabajo: limpio.
- Tests automatizados: 14 correctos.
- Último commit revisado: `9491abc` (`Publish generated PDF worksheets`).
