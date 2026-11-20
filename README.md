# FichasFacil

Generador web gratuito de fichas educativas para Infantil y Primaria. Permite crear actividades de matemáticas, lengua, lectura, escritura y lógica, configurarlas en el navegador e imprimirlas en A4 o compartir su configuración mediante un enlace.

## Demo

- Producción: <https://fichasfacil.es/>
- Páginas de contenido: [Blog](blog.html) · [Guía](guia.html) · [Páginas SEO](sitemap.xml)

## Qué incluye

La portada ofrece 19 tipos de ficha:

- Matemáticas: sumas, restas, multiplicaciones, divisiones y problemas.
- Lengua: comprensión lectora, copiado, ortografía, vocabulario y ordenar frases.
- Competencias prácticas: horas y reloj, dinero, medidas, fracciones y geometría.
- Escritura y repaso: caligrafía, lógica, ficha mixta y ficha diaria.

El generador permite seleccionar dificultad, número de ejercicios, cifras, número de operandos y opciones específicas según la actividad. También admite nombre del alumno, soluciones, impresión directa, copia/compartición del enlace y guardado local de preferencias.

## Funcionamiento

Es una aplicación estática: no tiene backend, cuentas, base de datos ni proceso de build. Todo el contenido se genera en el navegador con JavaScript.

1. `index.html` presenta la aplicación, las actividades, la FAQ y los enlaces de contenido.
2. `app.js` controla el modal, las preferencias, la generación de ejercicios, las soluciones, la impresión y los enlaces compartibles.
3. `styles.css` contiene el diseño responsive, los estilos de accesibilidad y los ajustes de impresión.
4. `sw.js` registra el service worker y mantiene una caché de aplicación para poder recuperar la web cuando no hay conexión.
5. `manifest.webmanifest`, `pwa-icon.svg` y `favicon.svg` permiten instalar la web como PWA.

La impresión se prepara en un `iframe` aislado y se entrega al diálogo de impresión del navegador. No se genera ni se sube ningún PDF al servidor.

## Ejecutar en local

Se necesita Python 3, sin dependencias adicionales:

```bash
python3 -m http.server 4173
```

Después, abre <http://localhost:4173/>. No se debe abrir `index.html` directamente con `file://`, porque el service worker y algunas APIs del navegador requieren HTTP o HTTPS.

## Comprobaciones rápidas

Antes de publicar, comprueba:

```bash
node --check app.js
node --check sw.js
git diff --check
```

En el navegador, prueba al menos una actividad matemática y una de texto, la impresión con y sin soluciones, el enlace compartido, la navegación móvil y las páginas `blog.html` y `guia.html`.

## Publicación

El repositorio está preparado para desplegarse en Vercel como sitio estático. En Vercel, importa este repositorio, usa `main` como rama de producción y deja vacío el comando de build: la raíz del repositorio contiene directamente `index.html` y los recursos públicos. El archivo `vercel.json` añade cabeceras de seguridad, caché de assets y la configuración de URLs limpias.

Mientras el dominio propio no esté conectado, GitHub Pages sigue siendo la demo pública:

- Demo actual: <https://fichasfacil.es/>
- Dominio previsto: <https://fichasfacil.es/>

```bash
git add .
git commit -m "Describe the change"
git push origin main
```

La configuración de Pages debe usar GitHub Actions como fuente de despliegue. Al publicar cambios en HTML, CSS o JavaScript, actualiza también las versiones de consulta (`?v=...`) en los documentos afectados y revisa la lista `APP_SHELL` de `sw.js` si cambia el conjunto de recursos esenciales. Así se evita que una caché antigua mantenga una combinación incompatible de archivos.

### Avisos por Telegram

La notificación de fichas generadas funciona en Vercel mediante `api/telegram-notify.js`. Configura en el proyecto de Vercel estas variables privadas:

- `TELEGRAM_BOT_TOKEN`: token del bot creado con BotFather.
- `TELEGRAM_CHAT_ID`: chat o grupo que recibirá los avisos.

El navegador solo envía actividad, dificultad y número de ejercicios. El token, el chat y el nombre del alumno no se exponen ni se envían.

## Estructura relevante

| Archivo | Responsabilidad |
| --- | --- |
| `index.html` | Aplicación principal y generador |
| `app.js` | Lógica de actividades, generación, impresión y compartir |
| `styles.css` | Interfaz, responsive, accesibilidad e impresión |
| `blog.html` | Artículos educativos estáticos |
| `guia.html` | Guía de uso |
| `sumas.html` … `fracciones.html` | Landing pages SEO por actividad |
| `404.html` | Página de error para enlaces no encontrados |
| `manifest.webmanifest` | Metadatos de instalación PWA |
| `sw.js` | Caché y fallback offline |
| `robots.txt` / `sitemap.xml` | Rastreo e indexación |
| `llms.txt` / `llms-full.txt` | Información legible por asistentes y buscadores |
| `.github/workflows/pages.yml` | Despliegue en GitHub Pages |

`iconos.html` es una página interna de exploración visual y está marcada como `noindex, nofollow`; no forma parte de la navegación pública.

## Decisiones y límites actuales

- Los ejercicios y textos son deterministas en estructura, pero se generan aleatoriamente al crear cada ficha.
- Las operaciones se generan al azar; las lecturas y copiados se seleccionan de bancos cerrados por nivel, y el resto de actividades recorre bancos cerrados ampliados de ejercicios, palabras y frases.
- La configuración compartida viaja en la URL; el nombre del alumno no se incluye en ella.
- Las preferencias se guardan solo en `localStorage` del navegador.
- La impresión y el guardado como PDF dependen del diálogo del navegador y de sus permisos para ventanas emergentes.
- El sitio no recopila datos ni requiere registro.
- La integración de IA no está implementada en esta versión; cualquier ampliación debe mantener el funcionamiento local y revisar privacidad, coste y accesibilidad.

## Seguridad y SEO

- Las páginas públicas incluyen una Content Security Policy restrictiva: solo permiten recursos del propio sitio, bloquean objetos y marcos, y deshabilitan scripts y estilos inline no autorizados.
- También declaran una Permissions Policy que desactiva cámara, micrófono, geolocalización, pagos, USB y sensores que la aplicación no necesita.
- El contenido introducido por el usuario se escapa antes de incorporarse a la ficha generada. Los enlaces externos abiertos en otra pestaña usan `noopener noreferrer`.
- La web incluye títulos y descripciones por página, URLs canónicas, Open Graph, Twitter Cards, JSON-LD, breadcrumbs, `robots.txt` y `sitemap.xml`.
- En Vercel, `vercel.json` configura CSP, `Permissions-Policy`, `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy` y caché de recursos. Las etiquetas meta se mantienen como respaldo para la demo de GitHub Pages.

## Licencia

No se ha declarado una licencia de código en este repositorio. Antes de reutilizar o redistribuir el proyecto, añade una licencia explícita y revisa los derechos de los textos, iconos y recursos incluidos.
