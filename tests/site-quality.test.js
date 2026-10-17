const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('las páginas públicas tienen título, descripción y canonical', () => {
  const pages = fs.readdirSync(root).filter(file => file.endsWith('.html') && file !== 'iconos.html' && file !== '404.html');
  for (const page of pages) {
    const html = read(page);
    assert.match(html, /<title>[^<]+<\/title>/, `${page}: falta title`);
    assert.match(html, /name="description"[^>]+content="[^"]{40,}"/, `${page}: descripción demasiado corta o ausente`);
    assert.match(html, /rel="canonical"[^>]+href="https:\/\//, `${page}: falta canonical`);
  }
});

test('el sitemap solo referencia páginas existentes y públicas', () => {
  const sitemap = read('sitemap.xml');
  const urls = [...sitemap.matchAll(/<loc>https:\/\/joseguerreromariscal\.github\.io\/fichas\/([^<]*)<\/loc>/g)].map(match => match[1] || 'index.html');
  for (const url of urls) assert.ok(fs.existsSync(path.join(root, url)), `sitemap: no existe ${url}`);
  assert.ok(urls.length >= 12, 'sitemap demasiado reducido');
});

test('el service worker usa la versión actual de los recursos principales', () => {
  const index = read('index.html');
  const sw = read('sw.js');
  const appVersion = index.match(/app\.js\?v=([^"']+)/)?.[1];
  assert.ok(appVersion, 'index: falta versión de app.js');
  assert.ok(sw.includes(`app.js?v=${appVersion}`), 'sw.js: app.js desactualizado');
  assert.match(sw, /const CACHE_NAME = 'fichasfacil-v\d+'/);
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
    assert.match(document, /https:\/\/joseguerreromariscal\.github\.io\/fichas\//);
    assert.match(document, /19 actividades/);
    assert.match(document, /PDF/);
    assert.match(document, /sin registro/i);
    assert.doesNotMatch(document, /endpoint MCP remoto.*actualmente/i);
  }
  assert.match(read('index.html'), /llms-full\.txt/);
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
