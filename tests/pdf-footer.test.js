const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const root = path.join(__dirname, '..');
const available = spawnSync('pdftotext', ['-v'], { encoding: 'utf8' }).error == null;

test('los PDF publicados incluyen marca y numeración en cada página', { skip: !available && 'requiere pdftotext' }, () => {
  const filesIn = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
    const file = path.join(directory, entry.name);
    return entry.isDirectory() ? filesIn(file) : entry.name.endsWith('.pdf') ? [file] : [];
  });
  const files = [...filesIn(path.join(root, 'fichas')), ...filesIn(path.join(root, 'output', 'pdf'))];
  assert.ok(files.length > 0);
  for (const file of files) {
    const result = spawnSync('pdftotext', ['-layout', file, '-'], { encoding: 'utf8' });
    assert.equal(result.status, 0, file);
    const pages = result.stdout.split('\f').filter(page => page.trim());
    assert.ok(pages.length > 0, file);
    pages.forEach((page, index) => {
      assert.equal((page.match(/FichasFácil/g) || []).length, 1, `${file}: marca en página ${index + 1}`);
      assert.ok(page.includes(`Página ${index + 1}/${pages.length}`), `${file}: numeración en página ${index + 1}`);
    });
  }
});
