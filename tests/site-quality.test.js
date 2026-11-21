const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('las páginas públicas tienen título, descripción y canonical', () => {
  const pages = fs.readdirSync(root).filter(file => file.endsWith('.html') && file !== 'iconos.html' && file !== '404.html' && file !== 'worksheet-preview-frame.html');
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /<title>[^<]+<\/title>/, `${page}: falta title`);
    assert.match(html, /name="description"[^>]+content="[^"]{40,}"/, `${page}: descripción demasiado corta o ausente`);
    assert.match(html, /rel="canonical"[^>]+href="https:\/\//, `${page}: falta canonical`);
  }
});

test('las páginas públicas mantienen una jerarquía principal clara', () => {
  const pages = fs.readdirSync(root).filter(file => file.endsWith('.html') && file !== 'iconos.html' && file !== '404.html' && file !== 'worksheet-preview-frame.html');
  for (const page of pages) {
    const headings = read(page).match(/<h1\b/gi) || [];
    assert.equal(headings.length, 1, `${page}: debe tener exactamente un h1`);
  }
});

test('el sitemap solo referencia páginas existentes y públicas', () => {
  const sitemap = read('sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>https:\/\/fichasfacil\.es\/([^<]*)<\/loc>/g)].map(match => match[1] || 'index.html');
  for (const url of urls) assert.ok(fs.existsSync(path.join(root, url)), `sitemap: no existe ${url}`);
  assert.ok(urls.length >= 12, 'sitemap demasiado reducido');
});

test('el service worker usa la versión actual de los recursos principales', () => {
  const index = read('index.html');
  const sw = read('sw.js');
  const appVersion = index.match(/app\.js\?v=([^"']+)/)?.[1];
  const stylesVersion = index.match(/styles\.css\?v=([^"']+)/)?.[1];
  assert.ok(appVersion, 'index: falta versión de app.js');
  assert.ok(stylesVersion, 'index: falta versión de styles.css');
  assert.ok(sw.includes(`app.js?v=${appVersion}`), 'sw.js: app.js desactualizado');
  assert.ok(sw.includes(`styles.css?v=${stylesVersion}`), 'sw.js: styles.css desactualizado');
  assert.match(read('app.js'), /register\('\.\/sw\.js\?v=20261121-9'/, 'app.js: registro del service worker desactualizado');
  assert.match(sw, /const CACHE_NAME = 'fichasfacil-v\d+'/);
});

test('la optimización de búsqueda y caché permanece activa', () => {
  const app = read('app.js');
  const sw = read('sw.js');
  assert.match(app, /const activityCards = \[\.\.\.document\.querySelectorAll\('\.activity-card'\)/, 'app.js: tarjetas no cacheadas');
  assert.match(app, /requestAnimationFrame\(filterActivities\)/, 'app.js: búsqueda sin agrupación de frames');
  assert.match(sw, /fichasfacil-v119/, 'sw.js: caché sin versionar para la última pasada');
  assert.doesNotMatch(sw.split('];')[0], /jspdf|worksheet-engine|blog\.html/, 'sw.js: precarga recursos no esenciales');
});

test('la compartición y los fallos de red tienen recuperación segura', () => {
  const app = read('app.js');
  const sw = read('sw.js');
  const vercel = read('vercel.json');
  assert.match(app, /new URL\(window\.location\.pathname, window\.location\.origin\)/, 'app.js: el enlace compartido hereda URL mutable');
  assert.match(app, /pdfLibraryPromise = null/, 'app.js: jsPDF no permite reintentar tras un fallo');
  assert.match(app, /AbortController\(\)/, 'app.js: falta timeout de notificación');
  assert.match(app, /id="retry-download"|retry-download/, 'app.js: falta reintento de descarga');
  assert.match(app, /form\.requestSubmit\(\)/, 'app.js: falta reintento de impresión');
  assert.match(sw, /caches\.match\('\.\/index\.html'\)/, 'sw.js: navegación configurada sin fallback offline');
  assert.match(vercel, /Cross-Origin-Resource-Policy/, 'vercel.json: falta política de recursos cruzados');
});

test('la búsqueda y los presets responden a cambios humanos', () => {
  const app = read('app.js');
  const sw = read('sw.js');
  assert.match(app, /normalize\('NFD'\)/, 'app.js: búsqueda sensible a acentos');
  assert.match(app, /event\.key === 'Escape'/, 'app.js: búsqueda sin limpieza rápida');
  assert.match(app, /const syncPresetState = \(\) =>/, 'app.js: preset visual desincronizado');
  assert.match(app, /shareButton\.setAttribute\('aria-busy', 'true'\)/, 'app.js: compartir sin estado accesible');
  assert.match(sw, /navigationPreload\.enable\(\)/, 'sw.js: navegación sin preload');
  assert.doesNotMatch(sw, /'\.\/blog\.html',[\s\S]*'\.\/blog\.html'/, 'sw.js: blog duplicado en el shell');
});

test('la interfaz refleja la actividad y el filtro actuales', () => {
  const index = read('index.html');
  const app = read('app.js');
  assert.match(index, /id="activity-count"/, 'index: falta contador dinámico de actividades');
  assert.match(app, /activityCount\.textContent = \(query/, 'app.js: el contador no sigue la búsqueda');
  assert.match(app, /const syncActivityCardSelection = type =>/, 'app.js: tarjetas no sincronizadas al cambiar actividad');
  assert.match(app, /syncActivityCardSelection\(activity\.value\)/, 'app.js: selector de actividad sin sincronización visual');
});

test('el modo offline no acumula enlaces compartidos indefinidamente', () => {
  const sw = read('sw.js');
  const index = read('index.html');
  const shellPaths = [...read('sw.js').matchAll(/'\.\/([^']+)'/g)].map(match => match[1].split('?')[0]);
  for (const file of shellPaths) assert.ok(fs.existsSync(path.join(root, file)), `sw.js: recurso precacheado inexistente ${file}`);
  assert.match(sw, /!requestUrl\.search/, 'sw.js: cachea cada variante de URL compartida');
  assert.match(index, /Enlace compartido|Compartir enlace/, 'index: falta acción de compartir');
});

test('la configuración y las soluciones comunican su estado', () => {
  const app = read('app.js');
  const vercel = read('vercel.json');
  assert.match(app, /activity\.value === 'lectura' \? ' · 1 lectura'/, 'app.js: resumen de lectura incompleto');
  assert.match(app, /Preparando soluciones…/, 'app.js: soluciones sin estado de carga');
  assert.match(vercel, /Cache-Control[\s\S]*max-age=0, must-revalidate/, 'vercel.json: HTML sin revalidación inmediata');
});

test('el PDF se carga bajo demanda y los controles exponen estados de espera', () => {
  const index = read('index.html');
  const app = read('app.js');
  assert.doesNotMatch(index, /<script[^>]+jspdf/i, 'index: jsPDF no debe bloquear la carga inicial');
  assert.match(app, /script\.src = 'assets\/jspdf\.umd\.min\.js\?v=/, 'app.js: falta carga diferida de jsPDF');
  assert.match(app, /button\.textContent = 'Preparando PDF…'/, 'app.js: falta estado de descarga');
  assert.match(app, /submitButton\.setAttribute\('aria-busy', 'true'\)/, 'app.js: falta estado accesible de impresión');
});

test('las páginas y la aplicación no usan handlers inline', () => {
  const pages = fs.readdirSync(root).filter(file => file.endsWith('.html'));
  for (const page of pages) assert.doesNotMatch(read(page), /\son[a-z]+\s*=\s*["']/i, `${page}: handler inline no permitido`);
  assert.doesNotMatch(read('app.js'), /\beval\s*\(|new Function\s*\(/, 'app.js: ejecución dinámica no permitida');
});

test('el contenido añadido no contiene marcadores ni respuestas vacías', () => {
  const source = read('app.js');
  assert.doesNotMatch(source, /\bninety\b|TODO|FIXME|respuesta pendiente/);
  assert.doesNotMatch(source, /answer:\s*['"]\s*['"]/);
  assert.doesNotMatch(source, /question:\s*['"]\s*['"]/);
});

test('los documentos para asistentes describen el producto real', () => {
  const short = read('llms.txt');
  const full = read('llms-full.txt');
  for (const document of [short, full]) {
    assert.match(document, /https:\/\/fichasfacil\.es\//);
    assert.match(document, /19 actividades/);
    assert.match(document, /PDF/);
    assert.match(document, /sin registro/i);
    assert.doesNotMatch(document, /endpoint MCP remoto.*actualmente/i);
  }
  assert.match(read('index.html'), /llms-full\.txt/);
  assert.match(short, /Intenciones de búsqueda cubiertas/);
  assert.match(full, /Consultas que puede resolver el sitio/);
  assert.match(full, /Última revisión: 2026-11-20/);
  assert.match(read('index.html'), /"numberOfItems":19/);
});

test('los enlaces HTML relativos apuntan a recursos existentes', () => {
  const pages = fs.readdirSync(root).filter(file => file.endsWith('.html'));
  for (const page of pages) {
    const html = read(page);
    for (const match of html.matchAll(/(?:href|src)="([^"]+)"/g)) {
      const target = match[1];
      if (!target || target.startsWith('#') || target.startsWith('http') || target.startsWith('mailto:') || target.startsWith('data:')) continue;
      const localPath = target.split('?')[0].split('#')[0];
      assert.ok(fs.existsSync(path.join(root, localPath)), `${page}: recurso local inexistente ${localPath}`);
    }
  }
});

test('las señales SEO y de descubrimiento mantienen una fuente coherente', () => {
  assert.doesNotThrow(() => JSON.parse(read('vercel.json')), 'vercel.json: JSON inválido');
  const sitemap = read('sitemap.xml');
  assert.match(sitemap, /<lastmod>2026-11-20<\/lastmod>/, 'sitemap: falta la fecha de actualización actual');
  const full = read('llms-full.txt');
  assert.equal((full.match(/^\| [^|]+ \| \[.*?\]\(/gm) || []).length, 19, 'llms-full: el mapa no contiene las 19 actividades');
  const index = read('index.html');
  assert.match(index, /"numberOfItems":19/, 'index: ItemList incompleto');
  assert.match(index, /applicationSubCategory/, 'index: falta categoría específica de la aplicación');
});

test('la búsqueda anuncia resultados y la API valida entradas', () => {
  const index = read('index.html');
  const app = read('app.js');
  const api = read('api/telegram-notify.js');
  assert.match(index, /id="activity-result-count"[^>]+role="status"/, 'index: falta contador accesible de búsqueda');
  assert.match(index, /aria-controls="activity-grid"/, 'index: falta relación entre búsqueda y resultados');
  assert.match(app, /actividades encontradas/, 'app.js: falta anuncio del número de resultados');
  assert.match(api, /allowedActivities = new Set/, 'API: falta lista de actividades permitidas');
  assert.match(api, /allowedDifficulties = new Set/, 'API: falta lista de dificultades permitidas');
  assert.match(api, /AbortController/, 'API: falta límite de tiempo para Telegram');
  assert.match(api, /Cache-Control', 'no-store'/, 'API: falta impedir caché de notificaciones');
});

test('el generador ofrece configuraciones rápidas reutilizables', () => {
  const index = read('index.html');
  const app = read('app.js');
  assert.match(index, /data-preset="start"/, 'index: falta preset para empezar');
  assert.match(index, /data-preset="balanced"/, 'index: falta preset equilibrado');
  assert.match(index, /data-preset="review"/, 'index: falta preset de repaso');
  assert.match(app, /const applyPreset = preset =>/, 'app.js: falta aplicación de presets');
  assert.match(app, /addEventListener\('click', \(\) => applyPreset/, 'app.js: presets sin interacción');
});

test('repetir y restablecer mantienen una interfaz comprensible', () => {
  const index = read('index.html');
  const app = read('app.js');
  assert.match(index, /id="repeat-last"[^>]+type="button"/, 'index: falta acción de repetición segura');
  assert.match(app, /Repetir \$\{labels\[config\.type\]\}/, 'app.js: la repetición no identifica la actividad');
  assert.match(app, /document\.querySelector\('#difficulty'\)\.focus\(\)/, 'app.js: falta foco inicial en la configuración principal');
  assert.match(app, /updateActivityFields\(\);\n  document\.querySelectorAll\('\[data-preset\]'\)/, 'app.js: restablecer no refresca controles relacionados');
});

test('la interfaz principal conserva una semántica accesible', () => {
  const index = read('index.html');
  const app = read('app.js');
  assert.match(index, /<h2 id="activities-title">Elige una actividad<\/h2>/, 'index: actividades necesita un encabezado real');
  assert.match(index, /class="hero-preview" role="img"/, 'index: la vista previa debe describirse como imagen');
  assert.match(index, /class="quick-presets" role="group" aria-labelledby="quick-presets-label"/, 'index: presets sin grupo semántico');
  assert.match(index, /aria-describedby="generator-help configuration-summary modal-note"/, 'index: diálogo sin descripción completa');
  assert.match(app, /result\.setAttribute\('role', downloaded \? 'status' : 'alert'\)/, 'app.js: errores de PDF sin anuncio prioritario');
  assert.match(app, /result\.setAttribute\('role', printed \? 'status' : 'alert'\)/, 'app.js: errores de impresión sin anuncio prioritario');
});

test('los documentos mantienen IDs únicos e imágenes descritas', () => {
  const pages = fs.readdirSync(root).filter(file => file.endsWith('.html'));
  for (const page of pages) {
    const html = read(page);
    const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
    assert.equal(new Set(ids).size, ids.length, `${page}: IDs duplicados`);
    for (const image of html.matchAll(/<img\b[^>]*>/gi)) assert.match(image[0], /\balt="/i, `${page}: imagen sin alt`);
  }
});
