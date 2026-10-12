const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const mathStart = source.indexOf('function randomInt(');
const mathEnd = source.indexOf('const digitMarkup =');
assert.notEqual(mathStart, -1);
assert.notEqual(mathEnd, -1);
const mathApi = new Function(`let lastReadingTitle = ''; let lastCopyingSequence = -1; ${source.slice(mathStart, mathEnd)}; return { makeOperation, makeContent };`)();
const markupStart = source.indexOf('function exerciseMarkup(');
const markupEnd = source.indexOf('\nfunction printableHtml(', markupStart);
const markupApi = new Function('labels', 'escapeHtml', 'geometrySvg', `${source.slice(markupStart, markupEnd)}; return exerciseMarkup;`)({ sumas: 'Sumas', restas: 'Restas', multiplicaciones: 'Multiplicaciones', divisiones: 'Divisiones' }, value => String(value), () => '');

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
    if (type === 'sumas' || type === 'restas') assert.ok(worksheet.includes('color="#c4cbd4"'), `${type}: falta línea de respuesta`);
    if (type === 'multiplicaciones') assert.equal((worksheet.match(/color="#c4cbd4"/g) || []).length, 3, 'multiplicación: faltan líneas de espacio de trabajo');
  }
});

