const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.join(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const base = 'https://fichasfacil.es/';

test('cada URL del sitemap tiene canonical propio y datos estructurados válidos', () => {
  const urls = [...read('sitemap.xml').matchAll(/<loc>([^<]+)<\/loc>/g)].map(m => m[1]);
  assert.equal(new Set(urls).size, urls.length);
  for (const url of urls) {
    assert.ok(url.startsWith(base));
    const file = url.slice(base.length) || 'index.html';
    assert.ok(file.endsWith('.html'), file);
    const html = read(file);
    assert.ok(html.includes('rel="canonical" href="' + url + '"'), file);
    for (const match of html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
      assert.doesNotThrow(() => JSON.parse(match[1]), file);
    }
    if (file !== 'index.html') assert.match(html, /"@type":"BreadcrumbList"/, file);
  }
});

test('las 19 actividades tienen página enlazada desde el HTML inicial', () => {
  const home = read('index.html');
  const match = home.match(/"@type":"ItemList"[\s\S]*?<\/script>/)[0].replace(/<\/script>$/, '');
  const list = JSON.parse('{"@context":"https://schema.org",' + match).itemListElement;
  assert.equal(list.length, 19);
  for (const activity of list) {
    const file = activity.url.slice(base.length);
    assert.ok(file.endsWith('.html'), activity.name);
    assert.ok(home.includes('href="' + file + '"'), activity.name);
    assert.ok(fs.existsSync(path.join(root, file)), file);
  }
  assert.match(read('copiado.html'), /actividad=copiado/);
});
