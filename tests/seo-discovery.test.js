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

test('las nuevas prácticas abren el generador con opciones válidas y explícitas', () => {
  const source = read('app.js');
  const home = read('index.html');
  const controls = Object.fromEntries([...home.matchAll(/<select id="([^"]+)"[^>]*>([\s\S]*?)<\/select>/g)].map(m => [m[1], [...m[2].matchAll(/<option(?: value="([^"]*)")?[^>]*>([^<]*)<\/option>/g)].map(o => o[1] ?? o[2])]));
  const preferenceIds = new Function('return ' + source.match(/const preferenceIds = (\[[^;]+\]);/)[1])();
  const start = source.indexOf('  const shared = new URLSearchParams');
  const end = source.indexOf('\n} catch (error) { /* enlaces compartidos opcionales */ }', start);
  assert.ok(start > 0 && end > start);
  const apply = new Function('window', 'document', 'preferenceIds', 'setSelectValue', 'labels', 'const activity = document.querySelector("#activity"); let sharedActivity = ""; let sharedSolutions = false; ' + source.slice(start, end) + '; return sharedActivity;');
  const expected = {
    'sumas-sin-llevadas': ['sumas', 'carryMode', 'no'],
    'sumas-con-llevadas': ['sumas', 'carryMode', 'yes'],
    'restas-sin-llevadas': ['restas', 'carryMode', 'no'],
    'restas-con-llevadas': ['restas', 'carryMode', 'yes'],
    'tablas-de-multiplicar': ['multiplicaciones', 'tableNumber', 'all'],
    'divisiones-exactas': ['divisiones', 'divisionMode', 'exact']
  };
  for (const [slug, [type, field, value]] of Object.entries(expected)) {
    const page = read(slug + '.html');
    assert.ok(home.includes('href="' + slug + '.html"'), slug);
    assert.ok(read('sitemap.xml').includes(base + slug + '.html'), slug);
    const links = [...page.matchAll(/href="(\/\?[^"#]+#actividades)"/g)].map(m => new URL(m[1].replaceAll('&amp;', '&'), base));
    assert.ok(links.length >= 2, slug);
    for (const [i, url] of links.entries()) {
      const state = Object.fromEntries(Object.keys(controls).map(id => [id, { value: 'previous-setting' }]));
      const activity = apply({ location: { search: url.search } }, { querySelector: selector => state[selector.slice(1)] ||= {} }, preferenceIds, (id, selected) => {
        assert.ok(controls[id]?.includes(selected), slug + ': ' + id + '=' + selected);
        state[id].value = selected;
      }, Object.fromEntries(controls.activity.map(v => [v, true])));
      assert.equal(activity, type, slug);
      assert.equal(state.count.value, '10', slug);
      assert.equal(state.difficulty.value, 'Inicial', slug);
      if (i < 2 || slug !== 'tablas-de-multiplicar') assert.equal(state[field].value, value, slug);
      if (type === 'divisiones') assert.equal(state.specificDivisor.value, 'all');
    }
    if (slug === 'tablas-de-multiplicar') {
      assert.equal(links.filter(url => /^[1-9]$/.test(url.searchParams.get('tabla'))).length, 9);
      for (let n = 1; n <= 9; n++) for (let m = 1; m <= 10; m++) assert.ok(page.includes(`${n} × ${m} = ${n*m}</li>`));
    }
  }
});
