const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'worksheet-engine.js'), 'utf8') + '\nconst readConfig = null;\n' + fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const mathStart = source.indexOf('function randomInt(');
const mathEnd = source.indexOf('const digitMarkup =');
assert.notEqual(mathStart, -1);
assert.notEqual(mathEnd, -1);
const mathApi = new Function(`let lastReadingTitle = ''; let lastCopyingSequence = -1; ${source.slice(mathStart, mathEnd)}; return { makeOperation, makeContent };`)();
const markupStart = source.indexOf('function exerciseMarkup(');
const markupEnd = source.indexOf('\nfunction printableHtml(', markupStart);
const escapeForTest = value => String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
const markupApi = new Function('labels', 'escapeHtml', 'geometrySvg', `${source.slice(markupStart, markupEnd)}; return exerciseMarkup;`)({ sumas: 'Sumas', restas: 'Restas', multiplicaciones: 'Multiplicaciones', divisiones: 'Divisiones' }, escapeForTest, figure => `<svg data-figure="${figure}"></svg>`);
const printableStart = markupEnd + 1;
const printableEnd = source.indexOf('\nconst readConfig', printableStart);
const printableApi = new Function('labels', 'escapeHtml', 'exerciseMarkup', `${source.slice(printableStart, printableEnd)}; return printableHtml;`)({ sumas: 'Sumas', restas: 'Restas', multiplicaciones: 'Multiplicaciones', divisiones: 'Divisiones', problemas: 'Problemas matemáticos', lectura: 'Lectura comprensiva', copiado: 'Copiado', ortografia: 'Ortografía', logica: 'Lógica', reloj: 'Horas y reloj', dinero: 'Dinero', medidas: 'Medidas', fracciones: 'Fracciones', geometria: 'Geometría', vocabulario: 'Vocabulario', ordenar: 'Ordenar frases', caligrafia: 'Caligrafía', mixta: 'Ficha mixta', diaria: 'Ficha diaria' }, value => String(value), markupApi);
const pdfStart = source.indexOf('function downloadPdf(');
const pdfEnd = source.indexOf('\nfunction isMobileDevice(', pdfStart);
const labelsMatch = source.match(/const labels = (\{[\s\S]*?\n\});/);
assert.ok(labelsMatch, 'no se encuentran los nombres de actividades');
const labels = new Function(`return (${labelsMatch[1]});`)();

class PdfProbe {
  constructor() { this.page = 1; this.texts = []; this.pages = [this.texts]; this.pageCount = 1; PdfProbe.latest = this; }
  setProperties() {} setTextColor() {} setFont() {} setFontSize() {} setDrawColor() {} setFillColor() {} setLineWidth() {}
  text(value, _x, y) { this.texts.push({ value: Array.isArray(value) ? value.join(' ') : String(value), y }); }
  line(x1, y1, x2, y2) { this.lines ||= []; this.lines.push({ x1, y1, x2, y2 }); } circle() {} rect() {} arc() {} roundedRect(...args) { this.roundedRects ||= []; this.roundedRects.push(args); }
  getTextWidth(value) { return String(value).length * 2.4; }
  splitTextToSize(value, width) {
    const maxCharacters = Math.max(12, Math.floor(width / 2.4));
    const words = String(value).split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      if (line && `${line} ${word}`.length > maxCharacters) { lines.push(line); line = word; }
      else line = line ? `${line} ${word}` : word;
    }
    if (line) lines.push(line);
    return lines;
  }
  addPage() { this.page += 1; this.texts = []; this.pages.push(this.texts); this.pageCount += 1; }
  setPage(page) { this.page = page; this.texts = this.pages[page - 1]; }
  getNumberOfPages() { return this.pageCount; }
  save() { this.saved = { pages: this.pages, pageCount: this.pageCount }; }
}
const makePdf = new Function('window', 'labels', `${source.slice(pdfStart, pdfEnd)}; return downloadPdf;`)({ jspdf: { jsPDF: PdfProbe } }, labels);

const poolStart = source.indexOf('function difficultyTier(');
const poolEnd = source.indexOf('const geometryFigureFor =');
assert.notEqual(poolStart, -1);
assert.notEqual(poolEnd, -1);
const poolApi = new Function(`${source.slice(poolStart, poolEnd)}; return { activityQuestionPool };`)();
const practicalStart = source.indexOf('const practicalActivities =');
const practicalEnd = source.indexOf('const geometryFigureFor =');
assert.notEqual(practicalStart, -1);
assert.notEqual(practicalEnd, -1);
const difficultyHelper = source.slice(source.indexOf('function difficultyTier('), source.indexOf('function rangeForDigits('));
const practicalApi = new Function(`const spellingActivities = []; const logicActivities = []; ${difficultyHelper}${source.slice(practicalStart, practicalEnd)}; return { practicalActivitiesByDifficulty };`)();

const parseOperation = question => {
  const match = question.match(/^(\d+)\s+([+−×÷])\s+(\d+)(?:\s+([+−])\s+(\d+))?\s*=$/);
  assert.ok(match, `Formato de operación inesperado: ${question}`);
  return match;
};

test('los niveles de operaciones respetan rangos razonables y el resultado es exacto', () => {
  for (const type of ['sumas', 'restas', 'multiplicaciones']) {
    for (const difficulty of ['Inicial', 'Medio', 'Avanzado']) {
      for (let index = 0; index < 120; index += 1) {
        const item = mathApi.makeOperation(type, difficulty);
        const match = parseOperation(item.question);
        const first = Number(match[1]);
        const second = Number(match[3]);
        const third = match[5] ? Number(match[5]) : null;
        const expected = type === 'sumas' ? first + second + (third || 0)
          : type === 'restas' ? first - second - (third || 0)
            : first * second;
        assert.equal(item.answer, expected);
        assert.ok(first < 100000, `${difficulty}: primer operando fuera de rango (${first})`);
        assert.ok(second < 100000, `${difficulty}: segundo operando fuera de rango (${second})`);
      }
    }
  }
});

test('las cifras elegidas se aplican también a operaciones de tres términos', () => {
  for (let index = 0; index < 40; index += 1) {
    const item = mathApi.makeOperation('sumas', 'Medio', '', 3, '2', '1');
    const match = item.question.match(/^(\d+) \+ (\d+) \+ (\d+) =$/);
    assert.ok(match);
    assert.equal(match[1].length, 2);
    assert.equal(match[2].length, 1);
    assert.equal(match[3].length, 1);
    assert.equal(item.answer, Number(match[1]) + Number(match[2]) + Number(match[3]));
  }
});

test('la tabla elegida no se ignora y las soluciones de multiplicación son correctas', () => {
  for (let table = 1; table <= 9; table += 1) {
    for (const difficulty of ['Inicial', 'Medio', 'Avanzado']) {
      const item = mathApi.makeOperation('multiplicaciones', difficulty, '', 2, 'auto', 'auto', { tableNumber: String(table) });
      const match = parseOperation(item.question);
      assert.equal(Number(match[3]), table);
      assert.equal(item.answer, Number(match[1]) * table);
    }
  }
});

test('las cifras personalizadas se mantienen en suma, resta y multiplicación', () => {
  for (const type of ['sumas', 'restas', 'multiplicaciones']) {
    for (let index = 0; index < 80; index += 1) {
      const item = mathApi.makeOperation(type, 'Avanzado', '', 2, '3', '2');
      const match = parseOperation(item.question);
      assert.equal(match[1].length, 3, item.question);
      assert.equal(match[3].length, 2, item.question);
      if (type === 'sumas') assert.equal(item.answer, Number(match[1]) + Number(match[3]));
      if (type === 'restas') assert.equal(item.answer, Number(match[1]) - Number(match[3]));
      if (type === 'multiplicaciones') assert.equal(item.answer, Number(match[1]) * Number(match[3]));
    }
  }
});

test('las divisiones respetan el divisor y el modo de resto configurados', () => {
  for (let index = 0; index < 80; index += 1) {
    const exact = mathApi.makeOperation('divisiones', 'Avanzado', '', 2, '4', '1', { specificDivisor: '7', divisionMode: 'exact' });
    const exactMatch = parseOperation(exact.question);
    assert.equal(Number(exactMatch[3]), 7);
    assert.equal(Number(exactMatch[1]) % 7, 0);
    assert.equal(exact.answer, Number(exactMatch[1]) / 7);

    const withRemainder = mathApi.makeOperation('divisiones', 'Avanzado', '', 2, '4', '1', { specificDivisor: '7', divisionMode: 'remainder' });
    const remainderMatch = parseOperation(withRemainder.question);
    assert.equal(Number(remainderMatch[3]), 7);
    assert.notEqual(Number(remainderMatch[1]) % 7, 0);
    const answer = String(withRemainder.answer).match(/^(\d+) · resto (\d+)$/);
    assert.ok(answer, withRemainder.answer);
    assert.equal(Number(remainderMatch[1]), 7 * Number(answer[1]) + Number(answer[2]));
  }
  for (let index = 0; index < 60; index += 1) {
    const shortDivision = mathApi.makeOperation('divisiones', 'Inicial', '', 2, '1', '1', { specificDivisor: '7', divisionMode: 'remainder' });
    const match = parseOperation(shortDivision.question);
    assert.equal(Number(match[3]), 7);
    assert.ok(Number(match[1]) <= 9);
    assert.notEqual(Number(match[1]) % 7, 0);
    assert.match(String(shortDivision.answer), /^\d+ · resto [1-6]$/);
  }
});

test('las actividades de lógica y ortografía seleccionan bancos según el nivel', () => {
  const spelling = [
    ['Completa con b o v', '...', '...'], ['Completa con m o n', '...', '...'],
    ['Completa con gü o gu', '...', '...'], ['Coloca las tildes', '...', '...']
  ];
  const earlySkills = poolApi.activityQuestionPool(spelling, 'Inicial', 'ortografia');
  const midSkills = poolApi.activityQuestionPool(spelling, 'Medio', 'ortografia');
  const advancedSkills = poolApi.activityQuestionPool(spelling, 'Avanzado', 'ortografia');
  assert.deepEqual(earlySkills.map(item => item[0]), ['Completa con b o v']);
  assert.deepEqual(midSkills.map(item => item[0]), ['Completa con m o n', 'Coloca las tildes']);
  assert.deepEqual(advancedSkills.map(item => item[0]), ['Completa con gü o gu', 'Coloca las tildes']);

  const logic = [['2, 4, 6, 8, __', '10'], ['12, 18, 24, 30, __', '36'], ['2, 6, 18, 54, __', '162']];
  const logicPools = ['Inicial', 'Medio', 'Avanzado'].map(level => poolApi.activityQuestionPool(logic, level, 'logica'));
  assert.deepEqual(logicPools.map(pool => pool.length), [1, 1, 1]);
  assert.notEqual(logicPools[0][0][0], logicPools[1][0][0]);
  assert.notEqual(logicPools[1][0][0], logicPools[2][0][0]);
});

test('cada actividad práctica tiene bancos distintos y no vacíos para los tres niveles', () => {
  const pools = practicalApi.practicalActivitiesByDifficulty;
  assert.deepEqual(Object.keys(pools).sort(), ['Avanzado', 'Inicial', 'Medio']);
  for (const type of ['reloj', 'dinero', 'medidas', 'fracciones', 'geometria', 'vocabulario', 'ordenar']) {
    const initial = pools.Inicial[type];
    const medium = pools.Medio[type];
    const advanced = pools.Avanzado[type];
    assert.ok(initial.length && medium.length && advanced.length, `${type}: banco vacío`);
    assert.notDeepEqual(initial, medium, `${type}: inicial y medio son idénticos`);
    assert.notDeepEqual(medium, advanced, `${type}: medio y avanzado son idénticos`);
  }
});

test('los generadores de contenido cambian realmente entre niveles', () => {
  for (const type of ['reloj', 'dinero', 'medidas', 'fracciones', 'geometria', 'vocabulario', 'ordenar', 'ortografia', 'logica', 'mixta']) {
    const generated = ['Inicial', 'Medio', 'Avanzado'].map(difficulty => mathApi.makeContent(type, 30, difficulty, '', 2, 'auto', 'auto', 3, { calligraphyMode: 'sentences' }));
    const questionSets = generated.map(items => new Set(items.map(item => item.question)));
    assert.notDeepEqual(questionSets[0], questionSets[1], `${type}: Inicial y Medio generan lo mismo`);
    assert.notDeepEqual(questionSets[1], questionSets[2], `${type}: Medio y Avanzado generan lo mismo`);
  }

  const readings = ['Inicial', 'Medio', 'Avanzado'].map(level => mathApi.makeContent('lectura', 20, level, '', 2, 'auto', 'auto')[0]);
  assert.equal(new Set(readings.map(item => item.level)).size, 3);
  assert.equal(new Set(readings.map(item => item.title)).size, 3);

  const problems = mathApi.makeContent('problemas', 12, 'Medio', '', 2, 'auto', 'auto');
  assert.deepEqual(new Set(problems.map(item => item.operation)), new Set(['sumas', 'restas', 'multiplicaciones', 'divisiones']));
});

test('el copiado no añade párrafos genéricos que rompan la historia', () => {
  assert.match(source, /return copyingSequences\[sequenceIndex\]\.slice\(0, paragraphs\)/);
  assert.doesNotMatch(source, /const sequence = \[\.\.\.copyingSequences\[sequenceIndex\], \.\.\.copyingExtraParagraphs\]/);
  const paragraphSelect = source.match(/id="paragraphs"[\s\S]*?<\/select>/)?.[0] || '';
  assert.doesNotMatch(paragraphSelect, /value="[6-8]"/);
});

test('las fichas imprimibles incluyen respuestas en soluciones y espacio para resolver', () => {
  for (const [type, question, answer] of [
    ['sumas', '24 + 18 =', 42],
    ['restas', '54 − 12 =', 42],
    ['multiplicaciones', '6 × 7 =', 42],
    ['divisiones', '84 ÷ 2 =', 42]
  ]) {
    const config = { type };
    const item = { question, answer };
    const solution = markupApi(config, item, 0, true);
    assert.ok(type === 'divisiones' ? solution.includes('>42</span>') : solution.includes('>42</td>'), `${type}: no muestra la respuesta en la ficha de soluciones`);
    const worksheet = markupApi(config, item, 0, false);
    if (type === 'sumas' || type === 'restas') assert.ok(worksheet.includes('border-top:1px solid #aeb6bf;border-bottom:1px solid #aeb6bf'), `${type}: falta el renglón pautado gris`);
    if (type === 'multiplicaciones') assert.equal((worksheet.match(/border-top:1px solid #aeb6bf;border-bottom:1px solid #aeb6bf/g) || []).length, 3, 'multiplicación: faltan los tres renglones pautados para trabajar');
  }
});

test('todas las pautas tienen dos líneas y separación entre renglones', () => {
  const textItem = { question: 'Escribe una respuesta completa.', answer: 'Respuesta de ejemplo.' };
  const markup = markupApi({ type: 'problemas' }, textItem, 0, false);
  assert.match(markup, /border-top:1px solid #aeb6bf(?:!important)?;border-bottom:1px solid #aeb6bf(?:!important)?/);
  assert.match(markup, /gap:3mm/);
  const reading = markupApi({ type: 'lectura' }, { kind: 'reading', title: 'Lectura', text: 'Texto.', questions: ['¿Qué ocurre?'], answers: ['Respuesta.'] }, 0, false);
  assert.match(reading, /height:8mm;box-sizing:border-box;border-top:1px solid #aeb6bf;border-bottom:1px solid #aeb6bf/);
});

test('el contenido textual de las fichas se escapa antes de insertarse en HTML', () => {
  const item = { question: '<texto>', answer: '<respuesta>' };
  const markup = markupApi({ type: 'problemas' }, item, 0, true);
  assert.ok(markup.includes('&lt;texto&gt;'));
  assert.ok(markup.includes('&lt;respuesta&gt;'));
  assert.doesNotMatch(markup, /<texto>|<respuesta>/);
});

test('geometría muestra primero el enunciado, después la figura y tres renglones pautados', () => {
  const item = { question: 'Observa la figura. ¿Cuántos lados tiene?', answer: 'Tiene tres lados.', figure: 'triangle' };
  const worksheet = markupApi({ type: 'geometria' }, item, 0, false);
  assert.ok(worksheet.indexOf('<strong') < worksheet.indexOf('<svg data-figure="triangle">'));
  assert.ok(worksheet.indexOf('<svg data-figure="triangle">') < worksheet.indexOf('aria-label="Tres renglones pautados para responder"'));
  assert.equal((worksheet.match(/<tr>/g) || []).length, 3, 'debe dibujar tres bandas pautadas');
  assert.equal((worksheet.match(/border-top:1px solid #aeb6bf;border-bottom:1px solid #aeb6bf/g) || []).length, 3, 'cada renglón debe tener línea superior e inferior grises');
  const solution = markupApi({ type: 'geometria' }, item, 0, true);
  assert.ok(solution.indexOf('<strong') < solution.indexOf('<svg data-figure="triangle">'));
  assert.ok(solution.indexOf('<svg data-figure="triangle">') < solution.indexOf(item.answer));
  assert.equal(makePdf({ type: 'geometria', difficulty: 'Medio' }, [item], false), true);
  assert.ok(PdfProbe.latest.saved.pageCount >= 1, 'geometría debe producir un PDF');
  const writingRules = PdfProbe.latest.lines.filter(line => line.x2 - line.x1 > 100 && line.y1 < 260).slice(-4);
  assert.deepEqual(writingRules.map(line => line.y2 - line.y1), [0, 0, 0, 0]);
  assert.deepEqual(writingRules.slice(1).map((line, index) => line.y1 - writingRules[index].y1), [8, 3, 8], 'las pautas deben tener línea superior/inferior con separación entre renglones');
  assert.ok(PdfProbe.latest.saved.pages.flat().some(entry => entry.value === 'FichasFácil'), 'el PDF debe incluir el nombre junto al logotipo del pie');
  assert.equal(PdfProbe.latest.roundedRects.length, 5, 'el pie debe incluir el icono de cuatro colores y su contenedor');
});

test('las 19 actividades producen PDF y sus hojas de soluciones sin respuestas vacías', () => {
  const types = ['sumas', 'restas', 'multiplicaciones', 'divisiones', 'problemas', 'lectura', 'copiado', 'ortografia', 'logica', 'reloj', 'dinero', 'medidas', 'fracciones', 'geometria', 'vocabulario', 'ordenar', 'caligrafia', 'mixta', 'diaria'];
  for (const type of types) {
    const config = { type, difficulty: 'Avanzado', carryMode: 'yes', divisionMode: 'remainder', calligraphyMode: 'sentences' };
    const items = mathApi.makeContent(type, 20, config.difficulty, '', 2, 'auto', 'auto', 5, config);
    assert.ok(items.length > 0, `${type}: no genera ejercicios`);
    for (const solutions of [false, true]) {
      assert.equal(makePdf(config, items, solutions), true, `${type}: no se pudo crear el PDF`);
      const pdf = PdfProbe.latest;
      assert.ok(pdf.saved?.pageCount >= 1, `${type}: PDF sin páginas`);
      const pdfTexts = pdf.saved.pages.flat().map(entry => entry.value);
      pdf.saved.pages.forEach((page, index) => {
        const values = page.map(entry => entry.value);
        assert.ok(values.includes('FichasFácil'), `${type}: falta la marca en página ${index + 1}`);
        assert.ok(values.includes(`Página ${index + 1}/${pdf.saved.pageCount}`), `${type}: falta numeración en página ${index + 1}`);
      });
      assert.ok(pdf.roundedRects.length >= 5 * pdf.saved.pageCount, `${type}: falta el icono de marca en alguna página`);
      const printed = pdfTexts.join(' ');
      if (solutions) {
        const expectedAnswers = items.flatMap(item => item.kind === 'reading' ? item.answers : [item.answer ?? item.text]);
        for (const answer of expectedAnswers) assert.ok(printed.includes(String(answer)), `${type}: falta respuesta «${answer}»`);
      }
    }
  }
});

test('la ruta de impresión del navegador prepara HTML A4 válido para las 19 actividades', () => {
  const types = ['sumas', 'restas', 'multiplicaciones', 'divisiones', 'problemas', 'lectura', 'copiado', 'ortografia', 'logica', 'reloj', 'dinero', 'medidas', 'fracciones', 'geometria', 'vocabulario', 'ordenar', 'caligrafia', 'mixta', 'diaria'];
  for (const type of types) {
    const config = { type, difficulty: 'Medio', carryMode: 'any', divisionMode: 'exact', calligraphyMode: 'sentences', student: '' };
    const items = mathApi.makeContent(type, 20, config.difficulty, '', 2, 'auto', 'auto', 5, config);
    for (const solutions of [false, true]) {
      const html = printableApi(config, items, solutions);
      assert.match(html, /^<!doctype html><html lang="es">/, `${type}: HTML incompleto`);
      assert.match(html, /@page\{size:A4;margin:0\}/, `${type}: falta tamaño de impresión A4`);
      assert.ok(html.includes(`<title>${labels[type]}`), `${type}: falta título de ficha`);
      assert.match(source, /bottom:5mm!important[\s\S]*border-top:1px solid #dce4ec!important[\s\S]*gap:4mm/, `${type}: el pie debe quedar fijado y separado del contenido`);
      assert.match(source, /html,body\{height:auto!important;min-height:0!important\}/, `${type}: la impresión no debe forzar una página vacía`);
      assert.match(source, /aria-label="FichasFácil"[\s\S]*?<span>FichasFácil<\/span>/, `${type}: la impresión web debe añadir el pie con marca`);
      if (solutions && items[0].kind !== 'copying') {
        const answer = items[0].kind === 'reading' ? items[0].answers[0] : items[0].answer;
        assert.ok(html.includes(String(answer)), `${type}: faltan respuestas en la vista de impresión`);
      }
    }
  }
});

test('las páginas y textos públicos no mencionan las pautas por la marca anterior', () => {
  for (const file of ['index.html', 'blog.html', 'guia.html', 'caligrafia.html', 'comprension-lectora.html', 'llms.txt', 'llms-full.txt']) {
    const content = fs.readFileSync(path.join(__dirname, '..', file), 'utf8');
    assert.doesNotMatch(content, /lamela/i, `${file}: quitar la mención de la web`);
  }
  assert.match(source, /border-top:1px solid #aeb6bf;border-bottom:1px solid #aeb6bf/, 'las pautas deben tener dos líneas grises');
  assert.match(source, /aria-label="Tres renglones pautados para responder"/, 'la ficha diaria debe usar el mismo tipo de renglón');
  assert.match(source, /Pauta de renglones con dos líneas grises por renglón/, 'copiado y caligrafía deben tener pauta de dos líneas');
});



test('los problemas muestran una operación que justifica cada respuesta', () => {
  for (const difficulty of ['Inicial', 'Medio', 'Avanzado']) {
    const items = mathApi.makeContent('problemas', 40, difficulty, '', 2, 'auto', 'auto');
    for (const item of items) {
      const match = item.explanation.match(/^(\d+) ([+−×÷]) (\d+) = (\d+)$/);
      assert.ok(match, item.question);
      const a = Number(match[1]);
      const b = Number(match[3]);
      const result = match[2] === '+' ? a + b : match[2] === '−' ? a - b : match[2] === '×' ? a * b : a / b;
      assert.equal(result, item.answer);
      assert.equal(Number(match[4]), item.answer);
    }
  }
});


test('las figuras corresponden a los enunciados de geometría', () => {
  const start = source.indexOf('const geometryFigureFor =');
  const end = source.indexOf('function randomReadingActivity', start);
  const figureFor = new Function(source.slice(start, end) + '; return geometryFigureFor;')();
  assert.equal(figureFor('Observa el ángulo. ¿Es menor, igual o mayor que un ángulo recto?'), 'acuteAngle');
  assert.equal(figureFor('¿Cómo se llama un cuadrilátero de cuatro lados iguales y cuatro ángulos rectos?'), 'square');
  assert.equal(figureFor('Observa el ángulo. ¿Cómo se llama si forma una esquina como la de un cuadrado?'), 'angle');
  assert.equal(figureFor('Observa la figura. ¿Qué tipo de línea cambia de dirección formando esquinas?'), 'brokenLine');
  assert.equal(figureFor('¿Cómo se llama un ángulo mayor que uno recto?'), 'obtuseAngle');
});


test('ordenar frases conserva todas las palabras de la solución', () => {
  const start = source.indexOf('const spellingActivities =');
  const end = source.indexOf('function activityQuestionPool', start);
  const activities = new Function(source.slice(start, end) + '; return practicalActivities;')();
  const words = text => (text.toLocaleLowerCase('es').match(/[\p{L}]+/gu) || []).sort();
  for (const [question, answer] of activities.ordenar) {
    assert.deepEqual(words(question.replace(/^Ordena:/, '')), words(answer), question);
  }
});


test('cada lectura tiene texto, tres preguntas y tres respuestas completas', () => {
  const start = source.indexOf('const makeReading =');
  const end = source.indexOf('const copyingSequences =', start);
  const readings = new Function(source.slice(start, end) + '; return readingActivities;')();
  assert.ok(readings.length > 100);
  for (const reading of readings) {
    assert.ok(reading.title && reading.text, reading.title);
    assert.equal(reading.questions.length, 3, reading.title);
    assert.equal(reading.answers.length, 3, reading.title);
    for (const value of [...reading.questions, ...reading.answers]) assert.ok(value.trim(), reading.title);
  }
});


test('los huecos de ortografía se resuelven con las letras indicadas', () => {
  const start = source.indexOf('const spellingActivities =');
  const end = source.indexOf('function activityQuestionPool', start);
  const items = new Function(source.slice(start, end) + '; return spellingActivities;')();
  const escape = text => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [instruction, question, answer] of items) {
    if (!instruction.startsWith('Completa con ')) continue;
    const choices = instruction.replace('Completa con ', '').split(' o ');
    const expression = question.split(/_+/).map(escape).join('(' + choices.map(escape).join('|') + ')');
    assert.match(answer, new RegExp('^' + expression + '$', 'iu'), question);
  }
});

test('las soluciones de las series siguen el patrón numérico', () => {
  const start = source.indexOf('const spellingActivities =');
  const end = source.indexOf('function activityQuestionPool', start);
  const items = new Function(source.slice(start, end) + '; return logicActivities;')();
  for (const [question, answer] of items) {
    const values = question.match(/\d+/g).map(Number);
    const differences = values.slice(1).map((value, index) => value - values[index]);
    const ratios = values.slice(1).map((value, index) => value / values[index]);
    const secondDifferences = differences.slice(1).map((value, index) => value - differences[index]);
    let expected;
    if (differences.every(value => value === differences[0])) expected = values.at(-1) + differences[0];
    else if (ratios.every(value => value === ratios[0])) expected = values.at(-1) * ratios[0];
    else if (secondDifferences.every(value => value === secondDifferences[0])) expected = values.at(-1) + differences.at(-1) + secondDifferences[0];
    assert.equal(expected, Number(answer), question);
  }
});


test('las fichas de bancos fijos no repiten preguntas aunque se soliciten veinte', () => {
  for (const type of ['ortografia', 'logica', 'reloj', 'dinero', 'medidas', 'fracciones', 'geometria', 'vocabulario', 'ordenar', 'mixta']) {
    for (const difficulty of ['Inicial', 'Medio', 'Avanzado']) {
      const items = mathApi.makeContent(type, 20, difficulty, '', 2, 'auto', 'auto');
      assert.ok(items.length > 0, type);
      assert.equal(new Set(items.map(item => item.question)).size, items.length, type + ' ' + difficulty);
    }
  }
});


test('las actividades nuevas de cálculo práctico tienen respuestas correctas', () => {
  const start = source.indexOf('const spellingActivities =');
  const end = source.indexOf('function activityQuestionPool', start);
  const banks = new Function(source.slice(start, end) + '; return practicalActivitiesByDifficulty;')();
  for (const bank of Object.values(banks)) {
    for (const [question, answer] of bank.dinero) {
      const match = question.match(/^Un material cuesta (\d+) €. Pagas con (\d+) €/);
      if (match) assert.equal(Number(answer.match(/\d+/)[0]), Number(match[2]) - Number(match[1]));
    }
    for (const [question, answer] of bank.medidas) {
      const match = question.match(/^Una cinta mide (\d+) metros. ¿Cuántos centímetros son/);
      if (match) assert.equal(Number(answer.match(/\d+/)[0]), Number(match[1]) * 100);
    }
    for (const [question, answer] of bank.fracciones) {
      const match = question.match(/^Una figura está dividida en (\d+) partes iguales y se colorean (\d+)/);
      if (match) assert.equal(answer, match[2] + '/' + match[1] + '.');
    }
    for (const [question, answer] of bank.reloj) {
      const match = question.match(/^(?:Son las|Es la) (\d+):00. ¿Qué hora será dentro de (\d+) minutos/);
      if (match) {
        const total = Number(match[1]) * 60 + Number(match[2]);
        const answerHour = Math.floor(total / 60);
        assert.equal(answer, (answerHour === 1 ? 'La ' : 'Las ') + answerHour + ':' + String(total % 60).padStart(2, '0') + '.');
      }
    }
  }
});

test('el PDF mantiene cada problema junto a su solución y representa la resta', () => {
  const items = Array.from({ length: 20 }, (_, index) => ({ question: 'Problema ' + (index + 1) + ': una caja contiene objetos y se retiran algunos.', answer: index + 1, explanation: (index + 3) + ' − 2 = ' + (index + 1) }));
  assert.equal(makePdf({ type: 'problemas', difficulty: 'Inicial', student: '' }, items, true), true);
  const pages = PdfProbe.latest.saved.pages;
  for (let index = 0; index < items.length; index += 1) {
    const page = pages.find(entries => entries.some(entry => entry.value.includes((index + 1) + '. Problema ' + (index + 1) + ':')));
    assert.ok(page, 'problema ' + (index + 1));
    assert.ok(page.some(entry => entry.value.includes('Respuesta: ' + (index + 3) + ' - 2 = ' + (index + 1))), 'solución ' + (index + 1));
  }
});


test('las lecturas evitan la plantilla repetida y los niveles de geometría se diferencian', () => {
  const startReading = source.indexOf('const makeReading =');
  const endReading = source.indexOf('const copyingSequences =', startReading);
  const readings = new Function(source.slice(startReading, endReading) + '; return readingActivities;')();
  assert.ok(readings.every(reading => !reading.text.includes('Después revisó la actividad y dejó todo preparado para el día siguiente.')));
  const startBanks = source.indexOf('const spellingActivities =');
  const endBanks = source.indexOf('function activityQuestionPool', startBanks);
  const banks = new Function(source.slice(startBanks, endBanks) + '; return practicalActivitiesByDifficulty;')();
  assert.ok(banks.Avanzado.geometria.some(([question]) => question.includes('diagonales')));
  assert.ok(!banks.Inicial.geometria.some(([question]) => question.includes('diagonales')));
});

test('las sumas sin llevadas respetan cifras y número de sumandos', () => {
  for (const operands of [2, 3]) {
    for (let firstDigits = 1; firstDigits <= 6; firstDigits += 1) {
      for (let secondDigits = 1; secondDigits <= 6; secondDigits += 1) {
        for (let sample = 0; sample < 5; sample += 1) {
          const item = mathApi.makeOperation('sumas', 'Avanzado', '', operands, String(firstDigits), String(secondDigits), { carryMode: 'no' });
          const numbers = item.question.match(/\d+/g).map(Number);
          assert.equal(numbers.length, operands);
          assert.equal(String(numbers[0]).length, firstDigits);
          numbers.slice(1).forEach(number => assert.equal(String(number).length, secondDigits));
          assert.equal(item.answer, numbers.reduce((sum, number) => sum + number, 0));
          const width = Math.max(...numbers.map(number => String(number).length));
          for (let position = 0; position < width; position += 1) {
            const column = numbers.reduce((sum, number) => sum + Number(String(number).at(-1 - position) || 0), 0);
            assert.ok(column < 10, item.question);
          }
        }
      }
    }
  }
});

test('las divisiones respetan las cifras en las combinaciones posibles', () => {
  for (const divisionMode of ['exact', 'remainder']) {
    for (let firstDigits = 1; firstDigits <= 4; firstDigits += 1) {
      for (let secondDigits = 1; secondDigits <= firstDigits; secondDigits += 1) {
        for (let sample = 0; sample < 30; sample += 1) {
          const item = mathApi.makeOperation('divisiones', 'Inicial', '', 2, String(firstDigits), String(secondDigits), { divisionMode });
          const [, dividend, , divisor] = parseOperation(item.question);
          const a = Number(dividend);
          const b = Number(divisor);
          assert.equal(String(a).length, firstDigits, item.question);
          assert.equal(String(b).length, secondDigits, item.question);
          if (divisionMode === 'exact') assert.equal(a % b, 0, item.question);
          else assert.notEqual(a % b, 0, item.question);
        }
      }
    }
  }
});

test('las restas sin llevadas respetan las cifras en todas las combinaciones posibles', () => {
  for (let firstDigits = 1; firstDigits <= 6; firstDigits += 1) {
    for (let secondDigits = 1; secondDigits <= firstDigits; secondDigits += 1) {
      for (let sample = 0; sample < 10; sample += 1) {
        const item = mathApi.makeOperation('restas', 'Avanzado', '', 2, String(firstDigits), String(secondDigits), { carryMode: 'no' });
        const [minuend, subtrahend] = item.question.match(/\d+/g).map(Number);
        assert.equal(String(minuend).length, firstDigits);
        assert.equal(String(subtrahend).length, secondDigits);
        assert.ok(minuend > subtrahend);
        assert.equal(item.answer, minuend - subtrahend);
        for (let position = 0; position < firstDigits; position += 1) {
          const upper = Number(String(minuend).at(-1 - position) || 0);
          const lower = Number(String(subtrahend).at(-1 - position) || 0);
          assert.ok(upper >= lower, item.question);
        }
      }
    }
  }
});

test('las multiplicaciones largas reservan espacio y se reparten en páginas', () => {
  const items = Array.from({ length: 20 }, () => ({ question: '123456 × 234567 =', answer: 28958703552 }));
  assert.equal(makePdf({ type: 'multiplicaciones', difficulty: 'Avanzado', student: '' }, items, false), true);
  const pdf = PdfProbe.latest;
  assert.equal(pdf.saved.pageCount, 2);
  const answerLines = pdf.lines.filter(line => line.x2 - line.x1 >= 30 && Math.abs(line.y2 - line.y1) < 0.001 && line.y1 > 55 && line.y1 < 260);
  assert.ok(answerLines.length >= 20 * 7, 'debe haber siete líneas amplias por operación');
});

test('la vista imprimible reserva siete renglones para multiplicar por seis cifras', () => {
  const config = { type: 'multiplicaciones', student: '', difficulty: 'Avanzado' };
  const items = [{ question: '123456 × 234567 =', answer: 28958703552 }];
  const html = printableApi(config, items, false);
  assert.equal((html.match(/height="8mm"/g) || []).length, 7);
  assert.match(html, /break-inside:avoid;page-break-inside:avoid/);
});

test('la solución de división se sitúa debajo del divisor y se escapa', () => {
  const markup = markupApi({ type: 'divisiones' }, { question: '17 ÷ 5 =', answer: '3 · resto 2' }, 0, true);
  assert.match(markup, /class="division-answer"[^>]*top:30px/);
  assert.match(markup, /3 · resto 2/);
  const escaped = markupApi({ type: 'divisiones' }, { question: '17 ÷ 5 =', answer: '<prueba>' }, 0, true);
  assert.match(escaped, /&lt;prueba&gt;/);
});

test('el PDF sitúa la línea de división entre divisor y cociente', () => {
  assert.equal(makePdf({ type: 'divisiones', difficulty: 'Inicial', student: '' }, [{ question: '17 ÷ 5 =', answer: '3 · resto 2' }], true), true);
  const lines = PdfProbe.latest.lines;
  assert.ok(lines.some(line => Math.abs(line.y1 - 60) < 0.001 && Math.abs(line.y2 - 60) < 0.001 && Math.abs(line.x2 - line.x1 - 28) < 0.001));
  assert.ok(!lines.some(line => Math.abs(line.y1 - 48) < 0.001 && Math.abs(line.y2 - 48) < 0.001 && Math.abs(line.x2 - line.x1 - 28) < 0.001));
});

test('la lectura sobre medición conserva los datos que justifican su respuesta', () => {
  const start = source.indexOf('const makeReading =');
  const end = source.indexOf('const copyingSequences =', start);
  const readings = new Function(source.slice(start, end) + '; return readingActivities;')();
  const reading = readings.find(item => item.title === 'Dos maneras de medir');
  assert.ok(reading);
  assert.match(reading.text, /12 centímetros/);
  assert.match(reading.text, /16 centímetros/);
  assert.match(reading.answers[2], /12 y 16 centímetros/);
});


test('caligrafía ofrece diez modelos diferentes por tipo y nivel', () => {
  for (const calligraphyMode of ['letters', 'syllables', 'words', 'sentences']) {
    for (const difficulty of ['Inicial', 'Medio', 'Avanzado']) {
      const items = mathApi.makeContent('caligrafia', 20, difficulty, '', 2, 'auto', 'auto', 5, { calligraphyMode });
      assert.equal(items.length, 10);
      assert.equal(new Set(items.map(item => item.text)).size, 10, calligraphyMode + ' ' + difficulty);
    }
  }
});


test('los problemas nuevos de dinero varían y sus operaciones son correctas', () => {
  for (const tier of ['Inicial', 'Medio', 'Avanzado']) {
    const items = practicalApi.practicalActivitiesByDifficulty[tier].dinero.slice(-20);
    assert.equal(items.length, 20);
    assert.equal(new Set(items.map(([q]) => q.match(/^(En una caja hay|Una hucha tiene|En un sobre hay|Una caja tiene)/)[0])).size, 4);
    for (const [question, answer] of items) {
      const values = [...question.matchAll(/(\d+) €/g)].map(match => Number(match[1]));
      assert.equal(values.length, 2);
      const expected = question.startsWith('En una caja hay') ? values[0] + values[1] : question.startsWith('En un sobre hay') ? values[1] - values[0] : values[0] - values[1];
      assert.equal(Number.parseInt(answer, 10), expected, question);
    }
  }
});
