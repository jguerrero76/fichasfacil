const modal = document.querySelector('#generator');
const form = document.querySelector('#generator-form');
const activity = document.querySelector('#activity');
const result = document.querySelector('#preview-result');
const labels = {
  sumas: 'Sumas', restas: 'Restas', multiplicaciones: 'Multiplicaciones',
  divisiones: 'Divisiones', problemas: 'Problemas matemáticos', lectura: 'Lectura comprensiva', copiado: 'Copiado', ortografia: 'Ortografía', logica: 'Lógica', reloj: 'Horas y reloj', dinero: 'Dinero', medidas: 'Medidas', fracciones: 'Fracciones', geometria: 'Geometría', vocabulario: 'Vocabulario', ordenar: 'Ordenar frases', caligrafia: 'Caligrafía', mixta: 'Ficha mixta', diaria: 'Ficha diaria'
};
const activityDescriptions = {
  sumas: 'Practica sumas colocadas en columna.',
  restas: 'Practica restas colocadas en columna.',
  multiplicaciones: 'Practica multiplicaciones paso a paso.',
  divisiones: 'Resuelve divisiones exactas.',
  problemas: 'Lee, piensa y resuelve situaciones cotidianas.',
  lectura: 'Lee un texto breve y responde preguntas.',
  copiado: 'Copia un texto breve siguiendo una pauta de escritura.',
  ortografia: 'Completa palabras y refuerza las reglas ortográficas.',
  logica: 'Completa series numéricas y descubre el patrón.',
  reloj: 'Lee la hora y resuelve situaciones con el reloj.',
  dinero: 'Practica compras, monedas y cambios.',
  medidas: 'Trabaja longitudes, capacidades y conversiones sencillas.',
  fracciones: 'Reconoce partes de un todo y fracciones básicas.',
  geometria: 'Identifica figuras y conceptos geométricos.',
  vocabulario: 'Relaciona palabras con su significado.',
  ordenar: 'Ordena palabras para construir frases.',
  caligrafia: 'Practica letras, palabras y frases con pauta.',
  mixta: 'Combina cálculo, lectura, lengua y lógica en una sola ficha.',
  diaria: 'Una práctica breve y variada para cada día.'
};
let lastTrigger = null;
const pageBackground = [document.querySelector('.site-header'), document.querySelector('main'), document.querySelector('.site-footer')].filter(Boolean);
const preferenceIds = ['difficulty', 'count', 'operands', 'firstDigits', 'secondDigits', 'paragraphs', 'calligraphyMode', 'carryMode', 'tableNumber', 'specificDivisor', 'divisionMode'];
const preferenceKey = 'fichalia-preferences';
const recentActivityKey = 'fichalia-recent-activity';
const lastConfigKey = 'fichalia-last-config';
let installPrompt = null;
let sharedActivity = '';
let sharedSolutions = false;
let lastReadingTitle = '';
let lastCopyingSequence = -1;
const installButton = document.querySelector('#install-app');
const setSelectValue = (id, value) => {
  const select = document.querySelector(`#${id}`);
  if (!select || ![...select.options].some(option => option.value === value)) return false;
  select.value = value;
  return true;
};
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  if (installButton) installButton.hidden = false;
});
installButton?.addEventListener('click', async () => {
  if (!installPrompt) return;
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  installButton.hidden = true;
});
window.addEventListener('appinstalled', () => { if (installButton) installButton.hidden = true; });
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=20261012-97', { updateViaCache: 'none' }).catch(() => {}));
const updateConfigurationSummary = () => {
  const summary = document.querySelector('#configuration-summary');
  if (summary) {
    const first = document.querySelector('#firstDigits').value;
    const second = document.querySelector('#secondDigits').value;
    const isMath = ['sumas', 'restas', 'multiplicaciones', 'divisiones'].includes(activity.value);
    const digits = isMath ? (first === 'auto' && second === 'auto' ? 'Según la dificultad' : `${first === 'auto' ? 'dificultad' : `${first} cifras`} / ${second === 'auto' ? 'dificultad' : `${second} cifras`}`) : '';
    const countSummary = ['lectura', 'copiado', 'caligrafia', 'mixta', 'diaria'].includes(activity.value) ? '' : ` · ${document.querySelector('#count').selectedOptions[0].textContent}`;
    const paragraphSummary = ['copiado', 'caligrafia'].includes(activity.value) ? ` · ${document.querySelector('#paragraphs').selectedOptions[0].textContent}` : '';
    const extra = activity.value === 'sumas' || activity.value === 'restas' ? document.querySelector('#carryMode').selectedOptions[0].textContent : activity.value === 'multiplicaciones' ? document.querySelector('#tableNumber').value === 'all' ? 'Todas las tablas' : `Tabla del ${document.querySelector('#tableNumber').value}` : activity.value === 'divisiones' ? `${document.querySelector('#divisionMode').selectedOptions[0].textContent}${document.querySelector('#specificDivisor').value === 'all' ? '' : ` · entre ${document.querySelector('#specificDivisor').value}`}` : '';
    summary.textContent = `${document.querySelector('#difficulty').value}${countSummary}${digits ? ` · ${digits}` : ''}${paragraphSummary}${extra ? ` · ${extra}` : ''}`;
  }
};
const updateDigitLabels = () => {
  const names = { multiplicaciones: ['Multiplicando', 'Multiplicador'], divisiones: ['Dividendo', 'Divisor'] }[activity.value] || ['Primer número', 'Segundo número'];
  document.querySelector('#first-digits-label').textContent = names[0];
  document.querySelector('#second-digits-label').textContent = names[1];
};
const updateSubtractionDigitOptions = () => {
  const first = document.querySelector('#firstDigits');
  const second = document.querySelector('#secondDigits');
  const constrainsSubtraction = activity.value === 'restas';
  const gradeMaximum = { Inicial: 9, Medio: 999, Avanzado: 99999 }[document.querySelector('#difficulty').value] || 9;
  const firstMaximum = first.value === 'auto' ? gradeMaximum : (10 ** Number(first.value)) - 1;
  [...second.options].forEach(option => {
    option.disabled = constrainsSubtraction && option.value !== 'auto' && (10 ** (Number(option.value) - 1)) > firstMaximum;
  });
  if (second.selectedOptions[0]?.disabled) second.value = 'auto';
};
const updateDivisionOptions = () => {
  const divisor = document.querySelector('#specificDivisor');
  const isRemainderDivision = activity.value === 'divisiones' && document.querySelector('#divisionMode').value === 'remainder';
  const digits = document.querySelector('#firstDigits').value;
  const difficulty = document.querySelector('#difficulty').value;
  const autoMaximum = { Inicial: 9, Medio: 999, Avanzado: 99999 }[difficulty] || 9;
  const dividendMaximum = digits === 'auto' ? autoMaximum : (10 ** Number(digits)) - 1;
  [...divisor.options].forEach(option => {
    option.disabled = isRemainderDivision && option.value !== 'all' && dividendMaximum <= Number(option.value);
  });
  if (divisor.selectedOptions[0]?.disabled) divisor.value = 'all';
};
const updateActivityFields = () => {
  const isMath = ['sumas', 'restas', 'multiplicaciones', 'divisiones'].includes(activity.value);
  const usesMultipleTerms = activity.value === 'sumas';
  if (activity.value === 'restas') document.querySelector('#operands').value = '2';
  const isCopying = ['copiado', 'caligrafia'].includes(activity.value);
  const isReading = activity.value === 'lectura';
  document.querySelector('#operands-field').classList.toggle('hidden-field', !usesMultipleTerms);
  ['first-digits-field', 'second-digits-field'].forEach(id => document.querySelector(`#${id}`).classList.toggle('hidden-field', !isMath));
  document.querySelector('#count-field').classList.toggle('hidden-field', isReading || isCopying || activity.value === 'diaria');
  document.querySelector('#paragraphs-field').classList.toggle('hidden-field', !isCopying);
  document.querySelector('#calligraphy-field').classList.toggle('hidden-field', activity.value !== 'caligrafia');
  document.querySelector('#solutions-field').classList.toggle('hidden-field', isCopying);
  document.querySelector('#carry-field').classList.toggle('hidden-field', !['sumas', 'restas'].includes(activity.value));
  document.querySelector('#table-field').classList.toggle('hidden-field', activity.value !== 'multiplicaciones');
  document.querySelector('#specific-divisor-field').classList.toggle('hidden-field', activity.value !== 'divisiones' || document.querySelector('#secondDigits').value !== '1');
  document.querySelector('#remainder-field').classList.toggle('hidden-field', activity.value !== 'divisiones');
  updateSubtractionDigitOptions();
  updateDivisionOptions();
};
const savePreferences = () => {
  try { localStorage.setItem(preferenceKey, JSON.stringify(Object.fromEntries(preferenceIds.map(id => [id, document.querySelector(`#${id}`).value])))); } catch (error) { /* almacenamiento opcional */ }
};
try {
  const saved = JSON.parse(localStorage.getItem(preferenceKey) || '{}');
  preferenceIds.forEach(id => { if (saved[id]) setSelectValue(id, saved[id]); });
} catch (error) { /* preferencias opcionales */ }
try {
  const shared = new URLSearchParams(window.location.search);
  sharedActivity = shared.get('actividad') || '';
  if (sharedActivity && labels[sharedActivity]) activity.value = sharedActivity;
  sharedSolutions = shared.get('soluciones') === '1';
  if (sharedSolutions) document.querySelector('#solutions').checked = true;
  preferenceIds.forEach(id => {
    const parameter = ({ difficulty: 'dificultad', count: 'ejercicios', operands: 'numeros', firstDigits: 'cifras1', secondDigits: 'cifras2', paragraphs: 'parrafos', calligraphyMode: 'caligrafia', carryMode: 'llevadas', tableNumber: 'tabla', specificDivisor: 'divisor', divisionMode: 'resto' })[id];
    const value = shared.get(parameter);
    if (value) setSelectValue(id, value);
  });
} catch (error) { /* enlaces compartidos opcionales */ }
if (document.querySelector('#tableNumber').value !== 'all' || document.querySelector('#specificDivisor').value !== 'all') document.querySelector('#secondDigits').value = '1';
updateConfigurationSummary();
updateDigitLabels();
updateActivityFields();

const activitySearch = document.querySelector('#activity-search');
const clearActivitySearch = document.querySelector('#clear-activity-search');
const activityEmpty = document.querySelector('#activity-empty');
const filterActivities = () => {
  const query = activitySearch.value.trim().toLocaleLowerCase('es');
  let visibleCount = 0;
  document.querySelectorAll('.activity-card').forEach(card => {
    const matches = !query || card.textContent.toLocaleLowerCase('es').includes(query);
    card.hidden = false;
    const item = card;
    item.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  if (clearActivitySearch) clearActivitySearch.hidden = !query;
  if (activityEmpty) activityEmpty.hidden = visibleCount > 0;
};
activitySearch?.addEventListener('input', filterActivities);
clearActivitySearch?.addEventListener('click', () => { activitySearch.value = ''; filterActivities(); activitySearch.focus(); });
const saveRecentActivity = type => {
  try { localStorage.setItem(recentActivityKey, JSON.stringify({ type, label: labels[type], savedAt: Date.now() })); } catch (error) { /* almacenamiento opcional */ }
};
const repeatLastButton = document.querySelector('#repeat-last');
const saveLastConfig = config => {
  try {
    const safeConfig = { ...config, student: '', solutions: false };
    localStorage.setItem(lastConfigKey, JSON.stringify(safeConfig));
    if (repeatLastButton) repeatLastButton.hidden = false;
  } catch (error) { /* almacenamiento opcional */ }
};
const loadLastConfig = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(lastConfigKey) || 'null');
    return saved?.type && labels[saved.type] ? saved : null;
  } catch (error) { return null; }
};
try {
  const recent = JSON.parse(localStorage.getItem(recentActivityKey) || 'null');
  if (recent?.label) document.querySelector('.section-help').textContent = `Pulsa una tarjeta para empezar a configurarla. Última: ${recent.label}.`;
} catch (error) { /* historial opcional */ }
if (loadLastConfig() && repeatLastButton) repeatLastButton.hidden = false;

const countSelect = document.querySelector('#count');
if (countSelect && !countSelect.querySelector('option[value="20"]')) {
  countSelect.insertAdjacentHTML('beforeend', '<option value="20">20 ejercicios</option>');
  countSelect.value = '20';
}

const generatorTitle = type => ({ mixta: 'Prepara tu ficha mixta', diaria: 'Prepara tu ficha diaria' }[type] || `Prepara tu ficha de ${labels[type].toLowerCase()}`);
const openGenerator = type => {
  lastTrigger = document.querySelector(`[data-type="${type}"]`);
  document.querySelectorAll('[data-type]').forEach(card => card.setAttribute('aria-expanded', String(card === lastTrigger)));
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  pageBackground.forEach(element => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
  activity.value = type;
  saveRecentActivity(type);
  result.innerHTML = '';
  document.querySelector('#generator-title').textContent = generatorTitle(type);
  document.querySelector('#activity-summary').textContent = labels[type];
  document.querySelector('#modal-note').textContent = activityDescriptions[type];
  updateDigitLabels();
  updateConfigurationSummary();
  updateActivityFields();
  if (sharedSolutions) document.querySelector('#solutions').checked = true;
  document.querySelectorAll('.activity-card').forEach(card => {
    const selected = card.dataset.type === type;
    card.classList.toggle('is-selected', selected);
  });
  document.querySelector('#print-direct').textContent = isMobileDevice() ? 'Descargar PDF' : 'Imprimir ficha';
  setTimeout(() => activity.focus(), 50);
};

repeatLastButton?.addEventListener('click', () => {
  const saved = loadLastConfig();
  if (!saved) return;
  openGenerator(saved.type);
  preferenceIds.forEach(id => setSelectValue(id, saved[id]));
  document.querySelector('#student').value = '';
  document.querySelector('#solutions').checked = false;
  updateDigitLabels();
  updateConfigurationSummary();
  updateActivityFields();
});

document.querySelectorAll('[data-type]').forEach(card => card.addEventListener('click', () => openGenerator(card.dataset.type)));
if (sharedActivity && labels[sharedActivity]) setTimeout(() => openGenerator(sharedActivity), 0);
activity.addEventListener('change', () => {
  document.querySelector('#activity-summary').textContent = labels[activity.value];
  document.querySelector('#generator-title').textContent = generatorTitle(activity.value);
  document.querySelector('#modal-note').textContent = activityDescriptions[activity.value];
  updateDigitLabels();
  updateConfigurationSummary();
  updateActivityFields();
});
preferenceIds.forEach(id => document.querySelector(`#${id}`).addEventListener('change', () => {
  if (id === 'tableNumber' && document.querySelector('#tableNumber').value !== 'all') document.querySelector('#secondDigits').value = '1';
  if (id === 'specificDivisor' && document.querySelector('#specificDivisor').value !== 'all') document.querySelector('#secondDigits').value = '1';
  if (id === 'secondDigits' && document.querySelector('#secondDigits').value !== '1') {
    document.querySelector('#tableNumber').value = 'all';
    document.querySelector('#specificDivisor').value = 'all';
  }
  updateConfigurationSummary(); updateActivityFields(); savePreferences();
}));
document.querySelector('#reset-options').addEventListener('click', () => {
  document.querySelector('#difficulty').value = 'Inicial';
  document.querySelector('#count').value = '20';
  document.querySelector('#operands').value = '2';
  document.querySelector('#firstDigits').value = 'auto';
  document.querySelector('#secondDigits').value = 'auto';
  document.querySelector('#carryMode').value = 'any';
  document.querySelector('#tableNumber').value = 'all';
  document.querySelector('#specificDivisor').value = 'all';
  document.querySelector('#divisionMode').value = 'exact';
  document.querySelector('#paragraphs').value = '1';
  document.querySelector('#calligraphyMode').value = 'sentences';
  document.querySelector('#student').value = '';
  document.querySelector('#solutions').checked = false;
  result.innerHTML = '';
  updateConfigurationSummary();
  savePreferences();
});
document.querySelector('.modal-close').addEventListener('click', () => {
  closeGenerator();
});
modal.addEventListener('click', event => {
  if (event.target === modal) closeGenerator();
});
modal.addEventListener('keydown', event => {
  if (event.key !== 'Tab' || !modal.classList.contains('open')) return;
  const focusable = [...modal.querySelectorAll('button, select, input, [href], [tabindex]:not([tabindex="-1"])')].filter(element => !element.disabled);
  if (!focusable.length) return;
  const first = focusable[0];
  const last = focusable[focusable.length - 1];
  if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
  else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
});
function closeGenerator() {
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
  pageBackground.forEach(element => { element.inert = false; element.removeAttribute('aria-hidden'); });
  document.querySelectorAll('[data-type]').forEach(card => card.setAttribute('aria-expanded', 'false'));
  lastTrigger?.focus();
}
document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal.classList.contains('open')) closeGenerator(); });

function randomInt(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function shuffledIndexes(length) {
  const order = Array.from({ length }, (_, index) => index);
  for (let index = order.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [order[index], order[swapIndex]] = [order[swapIndex], order[index]];
  }
  return order;
}

function escapeHtml(value) {
  return String(value).replace(/[&<>'"]/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

function levelIndex(level) {
  if (level === 'Infantil') return 0;
  const match = level.match(/([1-6])/);
  return match ? Number(match[1]) : 0;
}

function difficultyIndex(difficulty) {
  if (difficulty === 'Inicial' || difficulty === 'Tranquila') return 1;
  if (difficulty === 'Medio' || difficulty === 'Estándar') return 3;
  return 5;
}

function difficultyTier(difficulty) {
  if (difficulty === 'Inicial' || difficulty === 'Tranquila') return 'Inicial';
  if (difficulty === 'Medio' || difficulty === 'Estándar') return 'Medio';
  return 'Avanzado';
}

function rangeForDigits(digits, fallback, minimum = 1) {
  if (digits === 'auto') return fallback;
  const size = Number(digits);
  return [size === 1 ? minimum : 10 ** (size - 1), 10 ** size - 1];
}

const hasAdditionCarry = (...values) => {
  let carry = 0;
  const width = Math.max(...values.map(value => String(value).length));
  for (let position = 0; position < width; position += 1) {
    const column = values.reduce((sum, value) => sum + Number(String(value).at(-1 - position) || 0), carry);
    if (column > 9) return true;
    carry = Math.floor(column / 10);
  }
  return carry > 0;
};
const hasSubtractionBorrow = (minuend, subtrahend) => Array.from({ length: String(minuend).length }, (_, position) => Number(String(minuend).at(-1 - position) || 0) < Number(String(subtrahend).at(-1 - position) || 0)).some(Boolean);

function makeOperation(type, difficulty, level = '', operands = 2, firstDigits = 'auto', secondDigits = 'auto', options = {}, attempt = 0) {
  const grade = level ? levelIndex(level) : difficultyIndex(difficulty);
  if (type === 'multiplicaciones') {
    const rangesByGrade = [[1, 9, 2, 5], [1, 20, 2, 5], [10, 99, 2, 9], [100, 999, 2, 9], [1000, 9999, 2, 9], [1000, 99999, 2, 12], [10000, 999999, 10, 99]];
    const ranges = rangesByGrade[grade] || rangesByGrade[1];
    const firstRange = rangeForDigits(firstDigits, ranges.slice(0, 2));
    const secondRange = rangeForDigits(secondDigits, ranges.slice(2, 4), 2);
    const a = randomInt(firstRange[0], firstRange[1]);
    const table = options.tableNumber && options.tableNumber !== 'all' ? Number(options.tableNumber) : null;
    // La tabla seleccionada tiene prioridad: siempre debe poder reconocerse en la ficha.
    const b = table || randomInt(secondRange[0], secondRange[1]);
    return { question: `${a} × ${b} =`, answer: a * b };
  }
  const rangesByGrade = [[1, 9], [1, 20], [10, 99], [10, 999], [100, 9999], [1000, 99999], [10000, 999999]];
  const range = rangesByGrade[grade] || rangesByGrade[1];
  const [minimum, maximum] = range;
  if (type === 'divisiones') {
    const dividendRange = rangeForDigits(firstDigits, [minimum, maximum]);
    const divisorRange = rangeForDigits(secondDigits, [2, grade >= 5 ? 12 : 9], 2);
    const remainderMode = options.divisionMode === 'remainder';
    const specificDivisor = options.specificDivisor && options.specificDivisor !== 'all' ? Number(options.specificDivisor) : null;
    if (specificDivisor && Number(secondDigits) === 1) divisorRange[0] = divisorRange[1] = specificDivisor;
    if (remainderMode) divisorRange[1] = Math.min(divisorRange[1], dividendRange[1] - 1);
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const divisor = randomInt(divisorRange[0], divisorRange[1]);
      const minQuotient = remainderMode
        ? Math.max(1, Math.ceil((dividendRange[0] - divisor + 1) / divisor))
        : Math.ceil(dividendRange[0] / divisor);
      const maxQuotient = remainderMode
        ? Math.floor((dividendRange[1] - 1) / divisor)
        : Math.floor(dividendRange[1] / divisor);
      if (minQuotient <= maxQuotient) {
        const quotient = randomInt(Math.max(1, minQuotient), Math.max(1, maxQuotient));
        const minimumRemainder = remainderMode ? Math.max(1, dividendRange[0] - divisor * quotient) : 0;
        const maximumRemainder = remainderMode ? Math.min(divisor - 1, dividendRange[1] - divisor * quotient) : 0;
        if (remainderMode && minimumRemainder > maximumRemainder) continue;
        const remainder = remainderMode ? randomInt(minimumRemainder, maximumRemainder) : 0;
        const dividend = divisor * quotient + remainder;
        if (dividend <= dividendRange[1]) return { question: `${dividend} ÷ ${divisor} =`, answer: remainder ? `${quotient} · resto ${remainder}` : quotient };
      }
    }
    const fallbackDivisor = Math.max(2, Math.min(divisorRange[0], Math.floor(dividendRange[1] / 2)));
    const fallbackQuotient = Math.max(1, Math.floor(dividendRange[1] / fallbackDivisor));
    return { question: `${fallbackDivisor * fallbackQuotient} ÷ ${fallbackDivisor} =`, answer: fallbackQuotient };
  }
  const firstRange = rangeForDigits(firstDigits, range);
  const secondRange = rangeForDigits(secondDigits, type === 'restas' && secondDigits === 'auto' ? firstRange : range);
  let a = randomInt(firstRange[0], firstRange[1]);
  let b = randomInt(secondRange[0], secondRange[1]);
  if (type === 'restas' && operands === 2) {
    const highestValidSubtrahend = Math.min(secondRange[1], firstRange[1] - 1);
    if (highestValidSubtrahend >= secondRange[0]) {
      b = randomInt(secondRange[0], highestValidSubtrahend);
      a = randomInt(Math.max(firstRange[0], b + 1), firstRange[1]);
    }
  }
  if (operands === 3 && ['sumas', 'restas'].includes(type)) {
    let c = randomInt(secondRange[0], secondRange[1]);
    if (type === 'restas') [a, b, c] = [a, b, c].sort((first, second) => second - first);
    if (attempt < 80 && options.carryMode && options.carryMode !== 'any') {
      const carries = type === 'sumas' ? hasAdditionCarry(a, b, c) : hasSubtractionBorrow(a, b) || hasSubtractionBorrow(a - b, c);
      if (carries !== (options.carryMode === 'yes')) return makeOperation(type, difficulty, level, operands, firstDigits, secondDigits, options, attempt + 1);
    }
    const symbol = type === 'sumas' ? '+' : '−';
    const answer = type === 'sumas' ? a + b + c : a - b - c;
    return { question: `${a} ${symbol} ${b} ${symbol} ${c} =`, answer };
  }
  if (type === 'restas' && b > a) [a, b] = [b, a];
  if (attempt < 80 && ['sumas', 'restas'].includes(type) && options.carryMode && options.carryMode !== 'any') {
    const hasCarry = type === 'sumas' ? hasAdditionCarry(a, b) : hasSubtractionBorrow(a, b);
    if (hasCarry !== (options.carryMode === 'yes')) return makeOperation(type, difficulty, level, operands, firstDigits, secondDigits, options, attempt + 1);
  }
  const symbols = { sumas: '+', restas: '−', multiplicaciones: '×' };
  const answer = type === 'sumas' ? a + b : type === 'restas' ? a - b : a * b;
  return { question: `${a} ${symbols[type]} ${b} =`, answer };
}

const makeReading = (level, data) => {
  const [title, text, ...pairs] = data;
  return { level, title, text, questions: pairs.filter((_, index) => index % 2 === 0), answers: pairs.filter((_, index) => index % 2 === 1) };
};

const readingActivitiesByLevel = {
  Inicial: [
    ["La caja de semillas", "Nora ayuda a su abuelo en el huerto. Llenan una maceta y plantan semillas de tomate. Después, Nora riega la tierra.", "¿A quién ayuda Nora?", "A su abuelo.", "¿Qué plantan?", "Semillas de tomate.", "¿Qué hace Nora después?", "Riega la tierra."],
    ["El balón rojo", "Leo tiene un balón rojo. Sale al parque con su hermana y juegan cerca de un árbol. Cuando empieza a llover, vuelven a casa.", "¿De qué color es el balón?", "Rojo.", "¿Con quién sale Leo?", "Con su hermana.", "¿Por qué vuelven a casa?", "Porque empieza a llover."],
    ["La merienda", "Paula prepara una merienda con pan y queso. Guarda una manzana en su mochila y se sienta a comer con sus amigos.", "¿Qué prepara Paula?", "Una merienda.", "¿Qué guarda en la mochila?", "Una manzana.", "¿Con quién come?", "Con sus amigos."],
    ["El gato blanco", "El gato de Ana es blanco y duerme en una cesta. Por la mañana, Ana le pone agua y un poco de comida.", "¿De qué color es el gato?", "Blanco.", "¿Dónde duerme?", "En una cesta.", "¿Qué le pone Ana?", "Agua y comida."],
    ["La mochila azul", "Tomás prepara su mochila azul para ir al colegio. Mete un cuaderno, dos lápices y una goma.", "¿De qué color es la mochila?", "Azul.", "¿Dónde va Tomás?", "Al colegio.", "¿Cuántos lápices mete?", "Dos."],
    ["Las botas de agua", "Clara se pone sus botas porque ha llovido. Camina despacio y salta sobre un charco pequeño.", "¿Por qué se pone las botas?", "Porque ha llovido.", "¿Cómo camina Clara?", "Despacio.", "¿Sobre qué salta?", "Sobre un charco."],
    ["El dibujo de Mario", "Mario dibuja una casa con ventanas y una puerta. Luego pinta el tejado de color naranja.", "¿Qué dibuja Mario?", "Una casa.", "¿Qué tiene la casa?", "Ventanas y una puerta.", "¿De qué color pinta el tejado?", "Naranja."],
    ["La planta pequeña", "Lola tiene una planta pequeña en su habitación. Cada mañana la coloca junto a la ventana y le da un poco de agua.", "¿Dónde está la planta?", "En su habitación.", "¿Cuándo la cuida?", "Cada mañana.", "¿Dónde la coloca?", "Junto a la ventana."],
    ["El desayuno", "Álex desayuna leche y una tostada. Antes de salir, guarda la servilleta y deja el plato en la cocina.", "¿Qué desayuna Álex?", "Leche y una tostada.", "¿Qué guarda?", "La servilleta.", "¿Dónde deja el plato?", "En la cocina."],
    ["La cometa", "Sara lleva una cometa amarilla al campo. El viento sopla fuerte y la cometa sube muy alto.", "¿De qué color es la cometa?", "Amarilla.", "¿Dónde la lleva Sara?", "Al campo.", "¿Qué hace el viento?", "Sopla fuerte."],
    ["El libro nuevo", "Diego recibe un libro nuevo sobre animales. Lo abre después de cenar y lee una página antes de dormir.", "¿Sobre qué trata el libro?", "Sobre animales.", "¿Cuándo lo abre?", "Después de cenar.", "¿Cuánto lee?", "Una página."],
    ["La pelota perdida", "Marta busca su pelota debajo de la mesa. La encuentra junto a una silla y la guarda en una caja.", "¿Qué busca Marta?", "Su pelota.", "¿Dónde la encuentra?", "Junto a una silla.", "¿Dónde la guarda?", "En una caja."],
    ["El autobús escolar", "El autobús llega temprano a la parada. Bruno saluda al conductor y se sienta junto a la ventana.", "¿Cuándo llega el autobús?", "Temprano.", "¿A quién saluda Bruno?", "Al conductor.", "¿Dónde se sienta?", "Junto a la ventana."],
    ["La sopa caliente", "Mamá sirve sopa en un cuenco. Julia espera un poco porque está caliente y después la prueba con una cuchara.", "¿Qué sirve mamá?", "Sopa.", "¿Por qué espera Julia?", "Porque está caliente.", "¿Con qué la prueba?", "Con una cuchara."],
    ["El jardín", "En el jardín hay flores rojas y amarillas. Hugo lleva una regadera y moja la tierra con cuidado.", "¿Qué hay en el jardín?", "Flores.", "¿De qué colores son?", "Rojas y amarillas.", "¿Qué lleva Hugo?", "Una regadera."],
    ["La bufanda", "Hace frío y Elena se pone una bufanda verde. Su padre le abrocha el abrigo antes de salir.", "¿Qué tiempo hace?", "Hace frío.", "¿De qué color es la bufanda?", "Verde.", "¿Quién le abrocha el abrigo?", "Su padre."],
    ["El pez dorado", "En la pecera vive un pez dorado. Óscar le da comida por la mañana y observa cómo nada.", "¿Dónde vive el pez?", "En una pecera.", "¿De qué color es?", "Dorado.", "¿Cuándo le da comida Óscar?", "Por la mañana."],
    ["El castillo de arena", "En la playa, Inés construye un castillo de arena. Decora la torre con una concha grande.", "¿Dónde construye Inés?", "En la playa.", "¿Qué construye?", "Un castillo de arena.", "¿Con qué decora la torre?", "Con una concha."],
    ["La bicicleta", "Pablo limpia su bicicleta con un paño. Luego comprueba que las ruedas tienen aire.", "¿Con qué limpia la bicicleta?", "Con un paño.", "¿Qué comprueba?", "Que las ruedas tienen aire.", "¿De quién es la bicicleta?", "De Pablo."],
    ["La fiesta", "Hoy es el cumpleaños de Carmen. Sus amigos llevan globos y cantan una canción antes de comer la tarta.", "¿Qué celebra Carmen?", "Su cumpleaños.", "¿Qué llevan sus amigos?", "Globos.", "¿Qué comen?", "Tarta."],
    ["El paraguas amarillo", "Samuel ve nubes oscuras y coge su paraguas amarillo. Llega al colegio sin mojarse.", "¿Qué ve Samuel?", "Nubes oscuras.", "¿De qué color es el paraguas?", "Amarillo.", "¿Dónde llega?", "Al colegio."],
    ["La caja de colores", "Amina ordena sus pinturas en una caja. Coloca juntos el azul, el verde y el morado.", "¿Qué ordena Amina?", "Sus pinturas.", "¿Dónde las coloca?", "En una caja.", "¿Qué colores junta?", "Azul, verde y morado."],
    ["El paseo", "Nico pasea con su perro por la plaza. El perro se para junto a una fuente y bebe agua.", "¿Con quién pasea Nico?", "Con su perro.", "¿Dónde pasean?", "Por la plaza.", "¿Qué hace el perro?", "Bebe agua."],
    ["La carta", "Vera escribe una carta para su abuela. Dibuja una flor en el sobre y la deja junto a la puerta.", "¿Para quién escribe Vera?", "Para su abuela.", "¿Qué dibuja?", "Una flor.", "¿Dónde deja la carta?", "Junto a la puerta."],
    ["La ventana", "Por la mañana, Lucas abre la ventana de su habitación. Entra aire fresco y escucha a los pájaros.", "¿Cuándo abre Lucas la ventana?", "Por la mañana.", "¿Qué entra?", "Aire fresco.", "¿Qué escucha?", "A los pájaros."]
  ],
  Medio: [
    ["Una visita a la biblioteca", "El martes, Iván fue a la biblioteca con su clase. La bibliotecaria explicó cómo cuidar los libros y les enseñó cuentos de aventuras. Iván eligió una historia sobre un barco y apuntó la fecha de devolución.", "¿Con quién fue Iván?", "Con su clase.", "¿Qué explicó la bibliotecaria?", "Cómo cuidar los libros.", "¿Qué apuntó Iván?", "La fecha de devolución."],
    ["El paseo en bicicleta", "Claudia preparó su bicicleta para ir al parque. Revisó las ruedas, se puso el casco y guardó agua en la mochila. Allí encontró a Pablo y juntos continuaron hasta el estanque para observar los patos.", "¿Qué revisó Claudia?", "Las ruedas.", "¿Qué llevaba en la mochila?", "Agua.", "¿Qué observaron en el estanque?", "Los patos."],
    ["La receta de galletas", "Marta preparó galletas para la merienda. Mezcló harina, azúcar y un huevo. Su padre extendió la masa con ella y después esperaron a que las galletas estuvieran doradas.", "¿Para qué preparó las galletas?", "Para la merienda.", "¿Quién la ayudó con la masa?", "Su padre.", "¿Cómo supieron que estaban listas?", "Cuando estuvieron doradas."],
    ["El huerto del colegio", "La clase de tercero comenzó un pequeño huerto. Cada equipo se ocupó de una tarea: unos prepararon la tierra, otros plantaron lechugas y el último grupo colocó carteles con los nombres de las plantas.", "¿Qué comenzó la clase?", "Un pequeño huerto.", "¿Qué plantó uno de los equipos?", "Lechugas.", "¿Para qué sirvieron los carteles?", "Para poner los nombres de las plantas."],
    ["El paraguas amarillo", "Samuel salió de casa cuando empezaba a llover. Cogió un paraguas amarillo y se puso las botas. En la entrada del colegio encontró un charco, lo rodeó y llegó a clase con los pies secos.", "¿Qué hizo Samuel antes de salir?", "Cogió el paraguas y se puso las botas.", "¿Dónde encontró el charco?", "En la entrada del colegio.", "¿Por qué lo rodeó?", "Para mantener secos los pies."],
    ["El gato de la vecina", "Elena escuchó maullidos cerca del jardín y descubrió al gato de su vecina sobre un muro. Dejó agua junto a la valla y avisó a la dueña. La vecina llegó poco después y llevó al animal a casa.", "¿Dónde estaba el gato?", "Sobre un muro.", "¿Qué dejó Elena?", "Agua.", "¿Qué hizo la vecina?", "Llevó al gato a casa."],
    ["La brújula", "En una excursión, el grupo de Marcos aprendió a usar una brújula. La monitora explicó que la aguja señala el norte. Después, los niños compararon el instrumento con el mapa para encontrar el camino de vuelta.", "¿Qué aprendió el grupo?", "A usar una brújula.", "¿Qué señala la aguja?", "El norte.", "¿Con qué compararon la brújula?", "Con el mapa."],
    ["El banco de semillas", "La asociación del barrio guardó semillas de varias plantas en pequeños sobres. Escribieron el nombre y la fecha en cada uno. Así podrían plantarlas en primavera y recordar cuánto tiempo habían estado guardadas.", "¿Dónde guardaron las semillas?", "En pequeños sobres.", "¿Qué escribieron en cada sobre?", "El nombre y la fecha.", "¿Para qué las guardarían?", "Para plantarlas en primavera."],
    ["La exposición de minerales", "La clase visitó una exposición de minerales. Lucía se fijó en una piedra brillante y el guía explicó que algunos minerales forman cristales. Antes de irse, cada alumno anotó el nombre de su pieza favorita.", "¿Qué visitó la clase?", "Una exposición de minerales.", "¿Qué explicó el guía?", "Que algunos minerales forman cristales.", "¿Qué anotaron los alumnos?", "El nombre de su pieza favorita."],
    ["La radio del colegio", "Un grupo de alumnos preparó un programa de radio para el colegio. Primero eligieron las noticias, después repartieron los papeles y finalmente grabaron sus voces. Tuvieron que repetir una parte porque se oyó demasiado ruido.", "¿Qué prepararon los alumnos?", "Un programa de radio.", "¿Qué hicieron después de elegir las noticias?", "Repartieron los papeles.", "¿Por qué repitieron una parte?", "Porque había demasiado ruido."],
    ["El puente de madera", "Durante una salida, el camino terminó frente a un pequeño arroyo. El profesor pidió al grupo que esperara mientras comprobaba el puente de madera. Cuando vio que era seguro, cruzaron de uno en uno para no moverlo demasiado.", "¿Qué había al final del camino?", "Un pequeño arroyo.", "¿Qué comprobó el profesor?", "El puente.", "¿Cómo cruzaron?", "De uno en uno."],
    ["El calendario de plantas", "Sara observó una semilla durante varias semanas. Dibujó el tallo cada lunes y midió su altura con una regla. Al final comparó los dibujos y descubrió que la planta había crecido más después de recibir luz.", "¿Qué observó Sara?", "Una semilla.", "¿Cuándo dibujaba el tallo?", "Cada lunes.", "¿Qué descubrió?", "Que creció más después de recibir luz."],
    ["El mercado de la plaza", "En el mercado, Tomás acompañó a su padre a comprar fruta. Compararon dos puestos y eligieron el que tenía naranjas más maduras. Al volver, colocaron la compra en una cesta para que no se aplastara.", "¿A quién acompañó Tomás?", "A su padre.", "¿Qué compararon?", "Dos puestos.", "¿Por qué usaron una cesta?", "Para que la fruta no se aplastara."],
    ["La sombra del árbol", "Durante el recreo, el patio estaba muy soleado. Unos niños se sentaron bajo un árbol porque allí había sombra y podían leer tranquilos. Después observaron que la sombra cambiaba de lugar a medida que avanzaba la mañana.", "¿Por qué se sentaron bajo el árbol?", "Porque había sombra.", "¿Qué hicieron allí?", "Leyeron.", "¿Qué observaron después?", "Que la sombra cambiaba de lugar."],
    ["El cuaderno de recetas", "La abuela de Julia guardaba recetas en un cuaderno antiguo. Julia copió la de la sopa de verduras y dibujó al lado los ingredientes. Así podría prepararla algún día y conservar una parte de la historia familiar.", "¿Dónde guardaba las recetas la abuela?", "En un cuaderno.", "¿Qué receta copió Julia?", "La de la sopa de verduras.", "¿Por qué la copió?", "Para poder prepararla y conservar la historia familiar."],
    ["El club de ajedrez", "Álvaro se apuntó al club de ajedrez del colegio. Al principio le costaba recordar cómo se movían algunas piezas, pero practicó con una compañera. Después de varias partidas, empezó a pensar antes de mover.", "¿A qué club se apuntó Álvaro?", "Al club de ajedrez.", "¿Qué le costaba al principio?", "Recordar cómo se movían algunas piezas.", "¿Qué empezó a hacer después?", "Pensar antes de mover."],
    ["La lluvia de estrellas", "La familia de Noa salió al campo para observar una lluvia de estrellas. Llevaron mantas y esperaron a que oscureciera. Como había una nube sobre el horizonte, cambiaron de sitio y pudieron ver varias estrellas fugaces.", "¿Para qué salió la familia?", "Para observar una lluvia de estrellas.", "¿Qué llevaron?", "Mantas.", "¿Por qué cambiaron de sitio?", "Porque había una nube."],
    ["El mural del pasillo", "Los alumnos decoraron el pasillo con un mural sobre los paisajes. Unos pintaron montañas, otros dibujaron un río y un tercer grupo escribió los nombres de los lugares. Antes de colgarlo, revisaron que todos los equipos aparecieran.", "¿Sobre qué era el mural?", "Sobre los paisajes.", "¿Qué dibujó un grupo?", "Un río.", "¿Qué revisaron antes de colgarlo?", "Que aparecieran todos los equipos."],
    ["La caja de herramientas", "A Diego le regalaron una caja de herramientas para construir pequeños objetos. Su madre le enseñó a guardar cada pieza en su sitio y a pedir ayuda para usar las herramientas difíciles. Diego empezó haciendo un pequeño barco de madera.", "¿Qué recibió Diego?", "Una caja de herramientas.", "¿Qué le enseñó su madre?", "A guardar cada pieza y pedir ayuda.", "¿Qué construyó primero?", "Un barco de madera."],
    ["El sendero de los pinos", "El grupo siguió un sendero marcado con señales azules. Cuando llegaron a una bifurcación, consultaron el mapa y escogieron el camino que llevaba al mirador. Desde allí pudieron ver el lago que aparecía en la guía.", "¿De qué color eran las señales?", "Azules.", "¿Qué consultaron en la bifurcación?", "El mapa.", "¿Qué vieron desde el mirador?", "El lago."],
    ["La carta del intercambio", "Amina recibió una carta de una niña de otro colegio. En ella contaba cómo era su pueblo y describía una fiesta de primavera. Amina respondió explicando las actividades que hacían en su barrio y añadió un dibujo.", "¿De quién recibió Amina la carta?", "De una niña de otro colegio.", "¿Qué describía la carta?", "Una fiesta de primavera.", "¿Qué añadió Amina a su respuesta?", "Un dibujo."],
    ["El experimento del hielo", "En clase, los alumnos colocaron cubitos de hielo en tres lugares: al sol, a la sombra y dentro de un armario. Anotaron la hora y observaron cuál se derretía antes. El cubito del sol desapareció primero.", "¿Dónde colocaron los cubitos?", "Al sol, a la sombra y en un armario.", "¿Qué anotaron?", "La hora.", "¿Cuál se derritió primero?", "El cubito del sol."],
    ["El refugio de aves", "El colegio construyó un refugio para aves con madera reciclada. Lo colocaron en un árbol tranquilo y dejaron semillas cerca. Durante los días siguientes, los alumnos observaron desde lejos para no asustar a los pájaros.", "¿Con qué construyeron el refugio?", "Con madera reciclada.", "¿Dónde lo colocaron?", "En un árbol tranquilo.", "¿Por qué observaron desde lejos?", "Para no asustar a los pájaros."],
    ["La carrera solidaria", "La clase organizó una carrera para recoger alimentos. Cada participante buscó patrocinadores entre sus familiares y llevó una bolsa al colegio. Al terminar, contaron las bolsas y las entregaron a una asociación del barrio.", "¿Para qué organizaron la carrera?", "Para recoger alimentos.", "¿Qué llevó cada participante?", "Una bolsa.", "¿A quién entregaron los alimentos?", "A una asociación del barrio."],
    ["El reloj de la torre", "Durante una excursión, el grupo llegó a una plaza con una torre antigua. El guía explicó que el reloj ayudaba a los vecinos a saber la hora antes de que hubiera relojes en todas las casas. Los alumnos dibujaron la torre en sus cuadernos.", "¿Qué había en la plaza?", "Una torre antigua.", "¿Para qué servía el reloj?", "Para que los vecinos supieran la hora.", "¿Qué hicieron los alumnos?", "Dibujaron la torre."]
  ],
  Avanzado: [
    ["El banco de tiempo", "En el barrio de Valdemar, varias personas crearon un banco de tiempo. Allí no se intercambiaba dinero: cada vecino ofrecía una hora de ayuda y podía recibir otra a cambio. Así, una persona que enseñaba informática podía pedir ayuda para cuidar sus plantas.", "¿Qué se intercambiaba en el banco?", "Horas de ayuda.", "¿Qué podía ofrecer una persona?", "Enseñar informática.", "¿Qué podía pedir a cambio?", "Ayuda para cuidar sus plantas."],
    ["El mapa de los sonidos", "La clase de Lucía realizó un mapa sonoro del colegio. Durante varios días anotaron qué sonidos escuchaban en cada lugar y a qué hora aparecían. Descubrieron que el patio era el espacio más ruidoso, mientras que la biblioteca tenía sonidos suaves y breves.", "¿Qué elaboró la clase?", "Un mapa sonoro del colegio.", "¿Qué anotaron?", "Los sonidos de cada lugar y su horario.", "¿Qué descubrieron de la biblioteca?", "Que tenía sonidos suaves y breves."],
    ["La semilla viajera", "Una semilla de arce llegó al jardín de Celia después de recorrer varios metros impulsada por el viento. Celia no la arrancó: la dejó en una maceta y observó cómo cambiaba. Semanas después apareció un tallo, aunque todavía no sabía si conseguiría convertirse en un árbol.", "¿Cómo llegó la semilla al jardín?", "Impulsada por el viento.", "¿Qué hizo Celia con ella?", "La dejó en una maceta y la observó.", "¿Qué apareció semanas después?", "Un tallo."],
    ["El taller de reparación", "El centro juvenil organizó un taller para reparar objetos en lugar de tirarlos. Los participantes aprendieron a cambiar una cremallera, ajustar una lámpara y arreglar una rueda. Además de ahorrar materiales, descubrieron que comprender cómo funciona un objeto facilita encontrar la avería.", "¿Qué objetivo tenía el taller?", "Reparar objetos en vez de tirarlos.", "¿Qué aprendieron a ajustar?", "Una lámpara.", "¿Qué facilita encontrar una avería?", "Comprender cómo funciona el objeto."],
    ["La carta náutica", "En el museo marítimo, Omar observó una carta náutica dibujada hace más de cien años. No tenía la precisión de los mapas actuales, pero mostraba la costa, los puertos y algunos peligros para los barcos. El guía explicó que los navegantes la completaban con sus propios viajes.", "¿Cuándo se dibujó la carta?", "Hace más de cien años.", "¿Qué mostraba?", "La costa, los puertos y peligros.", "¿Cómo se completaba?", "Con la información de los viajes de los navegantes."],
    ["El jardín de lluvia", "Para evitar que el agua se acumulara en el patio, el colegio transformó una zona de cemento en un jardín de lluvia. Plantaron especies capaces de soportar periodos húmedos y secos. Cuando llueve, el terreno absorbe parte del agua y la libera poco a poco.", "¿Por qué crearon el jardín?", "Para evitar que el agua se acumulara.", "¿Qué plantas eligieron?", "Especies resistentes a periodos húmedos y secos.", "¿Qué ocurre cuando llueve?", "El terreno absorbe y libera el agua poco a poco."],
    ["La entrevista", "Para un trabajo de historia, Irene entrevistó a su bisabuela sobre la escuela de su infancia. Descubrió que entonces había menos libros, pero los alumnos compartían materiales y aprendían canciones de memoria. Irene comprendió que comparar épocas no consiste en decidir cuál es mejor, sino en observar sus diferencias.", "¿A quién entrevistó Irene?", "A su bisabuela.", "¿Qué compartían los alumnos?", "Los materiales.", "¿Qué comprendió Irene al comparar épocas?", "Que se deben observar sus diferencias sin decidir cuál es mejor."],
    ["El faro y la niebla", "Una mañana de niebla, la luz del faro apenas se distinguía desde el puerto. La guardiana revisó el mecanismo y comprobó que funcionaba correctamente. El problema no estaba en la lámpara, sino en la humedad del aire, que impedía que la luz viajara con claridad.", "¿Qué dificultaba ver la luz?", "La niebla.", "¿Qué revisó la guardiana?", "El mecanismo del faro.", "¿Cuál era el problema?", "La humedad del aire."],
    ["El cuaderno de campo", "Mateo llevaba un cuaderno de campo durante sus paseos. No se limitaba a dibujar animales: anotaba la hora, el lugar y el tiempo que hacía. Gracias a esos datos, pudo comprobar que veía más mariposas en las zonas con flores y durante las horas de mayor luz.", "¿Qué anotaba Mateo además de dibujar?", "La hora, el lugar y el tiempo.", "¿Qué pudo comprobar?", "Que veía más mariposas en zonas con flores.", "¿Cuándo veía más mariposas?", "Durante las horas de mayor luz."],
    ["La biblioteca viajera", "Un pueblo sin biblioteca fija creó una biblioteca viajera. Cada semana, una furgoneta llevaba libros distintos a una plaza. Los vecinos podían devolverlos allí o en la siguiente parada, lo que permitió que muchas familias leyeran sin desplazarse a otra localidad.", "¿Por qué crearon una biblioteca viajera?", "Porque el pueblo no tenía biblioteca fija.", "¿Dónde paraba la furgoneta?", "En una plaza.", "¿Qué facilitó el servicio?", "Que las familias leyeran sin desplazarse a otra localidad."],
    ["El puente de los animales", "En una carretera cercana al bosque, los atropellos de animales aumentaron durante el otoño. El ayuntamiento construyó un paso cubierto sobre la vía y colocó vallas para guiar a los animales hasta él. Al cabo de unos meses, las cámaras mostraron que lo utilizaban erizos, zorros y tejones.", "¿Qué problema había en la carretera?", "Aumentaron los atropellos de animales.", "¿Cómo guiaron a los animales?", "Con vallas.", "¿Qué animales utilizaron el paso?", "Erizos, zorros y tejones."],
    ["La energía del sol", "El laboratorio escolar instaló una pequeña placa solar para alimentar un sensor de temperatura. Los alumnos midieron la energía producida a distintas horas y comprobaron que no dependía solo de que hubiera luz: la inclinación de la placa y las nubes también influían.", "¿Para qué servía la placa solar?", "Para alimentar un sensor de temperatura.", "¿Qué midieron los alumnos?", "La energía producida a distintas horas.", "¿Qué factores influían además de la luz?", "La inclinación de la placa y las nubes."],
    ["El silencio del museo", "Durante una visita, el guía pidió al grupo que guardara silencio en una sala concreta. No era una norma arbitraria: allí se conservaban documentos muy frágiles y las vibraciones podían dañarlos. Los estudiantes entendieron que cuidar el patrimonio también implica modificar nuestro comportamiento.", "¿Por qué debían guardar silencio?", "Para proteger documentos frágiles.", "¿Qué podían causar las vibraciones?", "Podían dañarlos.", "¿Qué entendieron los estudiantes?", "Que cuidar el patrimonio exige adaptar nuestro comportamiento."],
    ["La ruta del agua", "El grupo siguió el recorrido de una gota desde la montaña hasta el mar. Pasó por un arroyo, una planta de tratamiento y una tubería antes de llegar a las casas. La actividad mostró que el agua no desaparece al cerrar el grifo: continúa formando parte de un ciclo que debemos cuidar.", "¿Qué recorrido siguió el grupo?", "El de una gota desde la montaña hasta el mar.", "¿Qué lugares atravesó el agua?", "Un arroyo, una planta de tratamiento y una tubería.", "¿Qué idea principal aprendieron?", "Que el agua forma parte de un ciclo y debemos cuidarla."],
    ["El teatro de sombras", "Para representar una leyenda, el grupo de teatro utilizó una pantalla blanca y figuras de cartón. La distancia entre la luz y las figuras cambiaba el tamaño de las sombras. Después de varios ensayos, decidieron colocar la lámpara más lejos para que todos los personajes cupieran en la pantalla.", "¿Qué materiales utilizaron?", "Una pantalla blanca y figuras de cartón.", "¿Qué cambiaba el tamaño de las sombras?", "La distancia entre la luz y las figuras.", "¿Por qué alejaron la lámpara?", "Para que todos los personajes cupieran en la pantalla."],
    ["El archivo de fotografías", "Nadia ordenó las fotografías antiguas de su familia. En lugar de guardarlas solo por fechas, escribió también quién aparecía y dónde se había tomado cada una. Así, sus primos podrían comprender las imágenes aunque no hubieran conocido a las personas retratadas.", "¿Cómo ordenó Nadia las fotografías?", "Por fechas, personas y lugares.", "¿Qué escribió además de la fecha?", "Quién aparecía y dónde se tomó cada foto.", "¿Para qué lo hizo?", "Para que sus primos comprendieran las imágenes."],
    ["El bosque después del incendio", "Tras un incendio, el bosque parecía vacío, pero los técnicos encontraron brotes bajo la ceniza y semillas protegidas en el suelo. Decidieron retirar algunos restos peligrosos y dejar otras zonas sin tocar. Querían evitar la erosión y permitir que la recuperación comenzara de forma natural.", "¿Qué encontraron los técnicos?", "Brotes y semillas protegidas.", "¿Qué zonas decidieron dejar sin tocar?", "Algunas zonas del bosque.", "¿Qué querían evitar?", "La erosión."],
    ["La fábrica de papel", "En una visita a una fábrica de papel, Elena observó cómo el papel usado se convertía en una pasta nueva. El proceso necesitaba agua, energía y máquinas, por lo que reciclar no significaba que el material no tuviera ningún coste. Aun así, reutilizar fibras reducía la cantidad de residuos y de árboles necesarios.", "¿En qué se convertía el papel usado?", "En una pasta nueva.", "¿Qué necesitaba el proceso?", "Agua, energía y máquinas.", "¿Qué ventaja tenía reutilizar fibras?", "Reducir residuos y la cantidad de árboles necesarios."],
    ["El observatorio", "Desde el observatorio, Sara observó la Luna durante cuatro noches. Dibujó la parte iluminada y comparó los cambios. Comprendió que la Luna no cambiaba de forma, sino que desde la Tierra veíamos distintas zonas iluminadas por el Sol.", "¿Durante cuánto tiempo observó Sara la Luna?", "Durante cuatro noches.", "¿Qué dibujó?", "La parte iluminada.", "¿Qué comprendió?", "Que vemos distintas zonas iluminadas por el Sol."],
    ["El debate del recreo", "En el colegio surgió un debate sobre si debía haber más bancos en el patio. Un grupo defendía que ayudarían a descansar y otro prefería reservar espacio para jugar. La clase recogió opiniones, midió la zona disponible y propuso colocar los bancos junto a la pared.", "¿Sobre qué debatieron?", "Sobre colocar más bancos.", "¿Qué hizo la clase antes de proponer una solución?", "Recogió opiniones y midió el espacio.", "¿Dónde propuso colocar los bancos?", "Junto a la pared."],
    ["La abeja y las flores", "Elena observó que las abejas visitaban varias flores antes de volver a la colmena. Al consultar una guía, descubrió que al transportar polen ayudan a que algunas plantas produzcan frutos. Desde entonces dejó una zona del jardín sin cortar para ofrecerles alimento.", "¿Qué transportaban las abejas?", "Polen.", "¿Cómo ayudan a las plantas?", "Favorecen que produzcan frutos.", "¿Qué decidió hacer Elena?", "Dejar una zona del jardín sin cortar."],
    ["El tren nocturno", "El tren salió de la estación al anochecer y atravesó varias comarcas. Durante el viaje, Daniel observó cómo las luces de las ciudades desaparecían y aumentaban las estrellas visibles. Pensó que la oscuridad del campo no significaba que hubiera menos vida, sino menos iluminación artificial.", "¿Cuándo salió el tren?", "Al anochecer.", "¿Qué observó Daniel en el viaje?", "Que aumentaban las estrellas visibles.", "¿Qué pensó sobre el campo?", "Que tenía menos iluminación artificial, no menos vida."],
    ["La decisión de Inés", "Inés debía elegir entre comprar un cuaderno nuevo o reparar el que ya tenía. Revisó las páginas y comprobó que solo se había soltado la tapa. Como aún quedaban muchas hojas limpias, decidió repararlo con cartón y reservar el dinero para los materiales de clase.", "¿Qué problema tenía el cuaderno?", "Se había soltado la tapa.", "¿Por qué decidió repararlo?", "Porque tenía muchas hojas limpias.", "¿Para qué reservó el dinero?", "Para los materiales de clase."],
    ["La exposición de inventos", "En la exposición escolar, cada equipo presentó un invento para ahorrar agua. Algunos construyeron un avisador para grifos abiertos y otros diseñaron un sistema para recoger el agua de lluvia. El jurado destacó que una buena idea debía ser útil, pero también fácil de mantener.", "¿Qué tema tenían los inventos?", "Ahorrar agua.", "¿Qué recogía uno de los sistemas?", "El agua de lluvia.", "¿Qué debía cumplir una buena idea?", "Ser útil y fácil de mantener."],
    ["Una decisión compartida", "Cuando la asociación vecinal tuvo que elegir el destino de una pequeña ayuda, no votó inmediatamente. Primero pidió propuestas, calculó los costes y comprobó cuántas personas se beneficiarían de cada opción. El resultado fue instalar una rampa, porque era la propuesta que mejoraba el acceso de todo el edificio.", "¿Qué hizo la asociación antes de votar?", "Pidió propuestas, calculó costes y estudió sus beneficios.", "¿Qué instalaron finalmente?", "Una rampa.", "¿Por qué la eligieron?", "Porque mejoraba el acceso de todo el edificio."]
  ]
};

const additionalReadingActivitiesByLevel = {
  Inicial: [
    ['El paraguas compartido', 'Cuando empezó a llover, Irene vio que su compañero no llevaba paraguas. Se acercaron bajo el suyo y caminaron juntos hasta la entrada.', '¿Qué tiempo hacía?', 'Llovía.', '¿Qué no llevaba el compañero?', 'Un paraguas.', '¿Dónde llegaron?', 'A la entrada.'],
    ['La caja de música', 'Alicia encontró una caja de música en un armario. La limpió con cuidado y llamó a su madre para escuchar la melodía.', '¿Dónde encontró la caja?', 'En un armario.', '¿Qué hizo Alicia primero?', 'La limpió.', '¿Con quién quiso escucharla?', 'Con su madre.'],
    ['El bocadillo', 'Héctor preparó un bocadillo de queso antes de salir. Lo envolvió en una servilleta y lo guardó en la mochila.', '¿De qué era el bocadillo?', 'De queso.', '¿Dónde lo guardó?', 'En la mochila.', '¿Con qué lo envolvió?', 'Con una servilleta.'],
    ['La cometa azul', 'Valentina llevó una cometa azul a la colina. Esperó a que soplara el viento y pidió ayuda para levantarla.', '¿De qué color era la cometa?', 'Azul.', '¿Dónde la llevó?', 'A la colina.', '¿Qué necesitaba para volar?', 'Viento.'],
    ['La caja de pinturas', 'Bruno ordenó sus pinturas por colores antes de empezar un dibujo. Dejó el pincel en un vaso y cubrió la mesa con papel.', '¿Qué ordenó Bruno?', 'Sus pinturas.', '¿Dónde dejó el pincel?', 'En un vaso.', '¿Qué puso sobre la mesa?', 'Papel.'],
    ['El caracol', 'Marta encontró un caracol junto a una hoja después de la lluvia. Lo observó un momento y luego lo dejó donde estaba.', '¿Cuándo encontró el caracol?', 'Después de la lluvia.', '¿Dónde estaba?', 'Junto a una hoja.', '¿Qué hizo Marta al final?', 'Lo dejó donde estaba.'],
    ['La pelota naranja', 'Álvaro llevó una pelota naranja al patio. Jugó con su primo y la guardó en una bolsa cuando terminó.', '¿De qué color era la pelota?', 'Naranja.', '¿Con quién jugó Álvaro?', 'Con su primo.', '¿Dónde guardó la pelota?', 'En una bolsa.'],
    ['La receta familiar', 'Mía ayudó a su padre a preparar una ensalada. Lavó los tomates, cortó la lechuga con ayuda y colocó todo en un cuenco.', '¿Qué prepararon?', 'Una ensalada.', '¿Qué lavó Mía?', 'Los tomates.', '¿Dónde colocó los ingredientes?', 'En un cuenco.']
  ],
  Medio: [
    ['El cuaderno de campo', 'Durante una excursión, Diego anotó las plantas que encontraba junto al sendero. Dibujó una hoja grande y comparó su forma con la de otra más pequeña.', '¿Qué anotó Diego?', 'Las plantas que encontraba.', '¿Qué dibujó?', 'Una hoja grande.', '¿Qué comparó?', 'La forma de dos hojas.'],
    ['La estación meteorológica', 'La clase construyó una estación meteorológica con materiales sencillos. Cada mañana medían la temperatura y observaban la dirección del viento.', '¿Qué construyó la clase?', 'Una estación meteorológica.', '¿Cuándo hacían las mediciones?', 'Cada mañana.', '¿Qué observaban además de la temperatura?', 'La dirección del viento.'],
    ['El mapa del barrio', 'Lucía dibujó un mapa del barrio para explicar a su primo cómo llegar a la biblioteca. Marcó la plaza, el parque y el paso de peatones.', '¿Para qué dibujó el mapa?', 'Para explicar cómo llegar a la biblioteca.', '¿Qué lugares marcó?', 'La plaza, el parque y el paso de peatones.', '¿A quién quería ayudar?', 'A su primo.'],
    ['El taller de reparación', 'En el taller del colegio, los alumnos aprendieron a reparar una cremallera y ajustar una rueda. Antes de empezar, organizaron las herramientas sobre la mesa.', '¿Qué aprendieron a reparar?', 'Una cremallera y una rueda.', '¿Qué hicieron antes de empezar?', 'Organizaron las herramientas.', '¿Dónde las colocaron?', 'Sobre la mesa.'],
    ['El plano de la escuela', 'La clase dibujó un plano de la escuela para localizar las salidas y los espacios comunes. Primero recorrieron el edificio y después compararon sus anotaciones.', '¿Qué dibujó la clase?', 'Un plano de la escuela.', '¿Qué localizaron?', 'Las salidas y los espacios comunes.', '¿Qué hicieron antes de comparar?', 'Recorrieron el edificio.'],
    ['La biblioteca viajera', 'Cada viernes, una caja de libros visitaba una clase diferente. El alumnado elegía un título, escribía su nombre en una hoja y devolvía el libro la semana siguiente.', '¿Cuándo visitaba las clases la caja?', 'Cada viernes.', '¿Qué hacía el alumnado al elegir un libro?', 'Escribía su nombre.', '¿Cuándo lo devolvía?', 'La semana siguiente.'],
    ['El sonido del patio', 'Un grupo investigó qué sonidos se escuchaban en el patio a distintas horas. Descubrió que por la mañana predominaban las voces y, durante el recreo, aumentaban los sonidos de los juegos.', '¿Qué investigó el grupo?', 'Los sonidos del patio.', '¿Cuándo predominaban las voces?', 'Por la mañana.', '¿Qué aumentaba durante el recreo?', 'Los sonidos de los juegos.'],
    ['La ruta del agua', 'Los alumnos siguieron el recorrido del agua desde el depósito hasta los grifos del colegio. Después propusieron colocar carteles para recordar que había que cerrarlos bien.', '¿Qué recorrido siguieron?', 'El del agua hasta los grifos.', '¿Desde dónde partía el agua?', 'Desde el depósito.', '¿Qué propusieron?', 'Colocar carteles.']
  ],
  Avanzado: [
    ['El jardín de polinizadores', 'El colegio reservó una zona del jardín para plantas que atraen abejas y mariposas. El alumnado investigó qué especies florecían en cada estación y preparó carteles para explicar su importancia.', '¿Para qué reservó el colegio una zona?', 'Para plantas que atraen abejas y mariposas.', '¿Qué investigó el alumnado?', 'Qué especies florecían en cada estación.', '¿Para qué preparó carteles?', 'Para explicar su importancia.'],
    ['La energía del edificio', 'Un grupo estudió cómo reducir el consumo de energía del colegio. Comparó los datos de varias semanas y propuso aprovechar mejor la luz natural antes de encender las lámparas.', '¿Qué quería reducir el grupo?', 'El consumo de energía.', '¿Qué comparó?', 'Los datos de varias semanas.', '¿Qué propuso?', 'Aprovechar mejor la luz natural.'],
    ['El archivo sonoro', 'Para conservar las historias de las personas mayores del barrio, la biblioteca grabó sus recuerdos sobre antiguos oficios. Después organizó los audios por temas y añadió una breve explicación a cada uno.', '¿Qué quería conservar la biblioteca?', 'Los recuerdos sobre antiguos oficios.', '¿Cómo organizó los audios?', 'Por temas.', '¿Qué añadió a cada audio?', 'Una breve explicación.'],
    ['La decisión del equipo', 'El equipo tuvo que escoger entre presentar un experimento sencillo o uno más llamativo pero difícil de explicar. Tras valorar el tiempo disponible y los materiales, eligió la primera opción para poder explicar cada paso con claridad.', '¿Qué tuvo que escoger el equipo?', 'Entre dos experimentos.', '¿Qué valoró antes de decidir?', 'El tiempo y los materiales.', '¿Por qué eligió el experimento sencillo?', 'Para explicar cada paso con claridad.'],
    ['La ciudad de los árboles', 'Un grupo comparó dos calles del barrio: una tenía muchos árboles y otra apenas ofrecía sombra. Midió la temperatura en varios puntos y propuso plantar nuevos ejemplares donde el calor era mayor.', '¿Qué comparó el grupo?', 'Dos calles del barrio.', '¿Qué midió?', 'La temperatura.', '¿Dónde propuso plantar árboles?', 'Donde el calor era mayor.'],
    ['El museo de la memoria', 'El museo pidió a los vecinos objetos relacionados con antiguos trabajos del pueblo. Cada pieza llegó acompañada de una historia, y el equipo decidió mostrar ambas para que el objeto no perdiera su significado.', '¿Qué pidió el museo?', 'Objetos relacionados con antiguos trabajos.', '¿Qué acompañaba a cada pieza?', 'Una historia.', '¿Por qué mostrarían las historias?', 'Para conservar el significado del objeto.'],
    ['La huella digital', 'La clase analizó cómo una fotografía publicada puede circular fuera del grupo que la recibió. A partir de varios ejemplos, redactó unas normas para pedir permiso y revisar la información antes de compartirla.', '¿Qué analizó la clase?', 'Cómo puede circular una fotografía.', '¿Qué redactó?', 'Unas normas.', '¿Qué debía revisar antes de compartir?', 'El permiso y la información.'],
    ['El río y el pueblo', 'Después de varias lluvias, el río cambió su recorrido cerca del pueblo. Los estudiantes consultaron mapas antiguos, hablaron con vecinos y observaron la vegetación para entender qué había sucedido.', '¿Qué cambió?', 'El recorrido del río.', '¿Qué consultaron?', 'Mapas antiguos.', '¿Qué observaron además de hablar con vecinos?', 'La vegetación.']
  ]
};

const readingExpansionByLevel = {
  Inicial: [
    ['El gorro de lana', 'Pablo se puso un gorro de lana antes de salir. Hacía frío y su madre le recordó que llevara también los guantes.', '¿Qué se puso Pablo?', 'Un gorro de lana.', '¿Qué tiempo hacía?', 'Hacía frío.', '¿Qué más debía llevar?', 'Los guantes.'],
    ['La caja de galletas', 'Marta encontró una caja de galletas en la cocina. Preguntó antes de coger una y después dejó la caja en la mesa.', '¿Dónde encontró la caja?', 'En la cocina.', '¿Qué hizo antes de coger una?', 'Preguntó.', '¿Dónde dejó la caja?', 'En la mesa.'],
    ['El lápiz verde', 'Álvaro perdió su lápiz verde durante la clase. Lo encontró debajo de la mesa y volvió a guardarlo en el estuche.', '¿De qué color era el lápiz?', 'Verde.', '¿Dónde lo encontró?', 'Debajo de la mesa.', '¿Dónde lo guardó?', 'En el estuche.'],
    ['La visita al zoo', 'Elena visitó el zoo con su familia. Vieron elefantes, monos y una jirafa que comía hojas.', '¿Con quién fue Elena?', 'Con su familia.', '¿Qué animales vieron?', 'Elefantes, monos y una jirafa.', '¿Qué comía la jirafa?', 'Hojas.'],
    ['El abrigo rojo', 'Nico dejó su abrigo rojo en el perchero del colegio. Al terminar la clase, lo encontró junto a su mochila.', '¿De qué color era el abrigo?', 'Rojo.', '¿Dónde lo dejó?', 'En el perchero.', '¿Junto a qué lo encontró?', 'Junto a su mochila.'],
    ['La flor amarilla', 'Sara dibujó una flor amarilla en una hoja blanca. Después regaló el dibujo a su abuela.', '¿Qué dibujó Sara?', 'Una flor.', '¿De qué color era?', 'Amarilla.', '¿A quién regaló el dibujo?', 'A su abuela.']
  ],
  Medio: [
    ['El huerto de aromáticas', 'El grupo plantó romero, menta y albahaca en tres espacios del huerto. Colocaron etiquetas para recordar el nombre de cada planta.', '¿Qué plantó el grupo?', 'Romero, menta y albahaca.', '¿Cuántos espacios utilizaron?', 'Tres.', '¿Para qué colocaron etiquetas?', 'Para recordar los nombres.'],
    ['La biblioteca digital', 'La clase aprendió a buscar libros en el catálogo digital de la biblioteca. Practicaron con palabras clave y anotaron los resultados que les parecían más interesantes.', '¿Qué aprendió la clase?', 'A buscar libros en un catálogo digital.', '¿Qué practicaron?', 'El uso de palabras clave.', '¿Qué anotaron?', 'Los resultados interesantes.'],
    ['La brújula del sendero', 'Durante una salida, el profesor entregó una brújula a cada equipo. Compararon la dirección del norte con el mapa antes de continuar por el sendero.', '¿Qué entregó el profesor?', 'Una brújula a cada equipo.', '¿Con qué compararon el norte?', 'Con el mapa.', '¿Cuándo continuaron?', 'Después de comparar la dirección.'],
    ['El concurso de carteles', 'Los equipos prepararon carteles para recordar cómo separar los residuos. Antes de exponerlos, revisaron que los dibujos y las instrucciones fueran fáciles de entender.', '¿Para qué eran los carteles?', 'Para recordar cómo separar los residuos.', '¿Qué revisaron?', 'Los dibujos y las instrucciones.', '¿Cómo debían ser?', 'Fáciles de entender.'],
    ['La maqueta del barrio', 'Irene y su equipo construyeron una maqueta del barrio con cartón. Añadieron calles, árboles y una plaza para representar los lugares más importantes.', '¿Con qué construyeron la maqueta?', 'Con cartón.', '¿Qué añadieron?', 'Calles, árboles y una plaza.', '¿Qué representaron?', 'Los lugares más importantes.'],
    ['El diario del tiempo', 'Durante un mes, Hugo anotó si hacía sol, viento o lluvia. Al final contó los días de cada tipo y comparó los resultados con sus compañeros.', '¿Durante cuánto tiempo anotó Hugo?', 'Durante un mes.', '¿Qué registró?', 'El sol, el viento o la lluvia.', '¿Qué hizo al final?', 'Contó y comparó los resultados.']
  ],
  Avanzado: [
    ['El archivo de fotografías', 'La biblioteca digitalizó fotografías antiguas del barrio. Para ordenarlas, el equipo anotó la fecha, el lugar y las personas que aparecían en cada imagen.', '¿Qué digitalizó la biblioteca?', 'Fotografías antiguas del barrio.', '¿Qué datos anotaron?', 'La fecha, el lugar y las personas.', '¿Para qué lo hicieron?', 'Para ordenar las imágenes.'],
    ['El consumo de agua', 'Un grupo comparó el consumo de agua de varias familias durante una semana. Después propuso observar los momentos en que se gastaba más para buscar alternativas.', '¿Qué comparó el grupo?', 'El consumo de agua de varias familias.', '¿Durante cuánto tiempo?', 'Durante una semana.', '¿Qué propuso después?', 'Buscar alternativas al gasto mayor.'],
    ['El debate del aula', 'La clase debatió si era mejor trabajar en silencio o compartir algunas ideas mientras resolvía un problema. Al final acordaron que dependía de la fase de la actividad.', '¿Sobre qué debatió la clase?', 'Sobre la forma de trabajar.', '¿Qué acuerdo alcanzaron?', 'Que dependía de la fase de la actividad.', '¿Qué hicieron para decidir?', 'Compartieron y valoraron ideas.'],
    ['La ruta accesible', 'El ayuntamiento pidió al alumnado que señalara obstáculos para las personas con movilidad reducida. Los equipos recorrieron varias calles y propusieron mejoras concretas.', '¿Qué pidió el ayuntamiento?', 'Señalar obstáculos.', '¿Qué recorrieron los equipos?', 'Varias calles.', '¿Qué propusieron?', 'Mejoras concretas.'],
    ['El experimento de sombras', 'Los estudiantes midieron la sombra de un palo a distintas horas. Observaron que cambiaba de longitud y dirección, y relacionaron los datos con la posición del sol.', '¿Qué midieron?', 'La sombra de un palo.', '¿Qué cambiaba?', 'Su longitud y dirección.', '¿Con qué relacionaron los datos?', 'Con la posición del sol.'],
    ['La revista escolar', 'El equipo editorial decidió publicar una revista digital. Repartió las tareas, revisó las fuentes y estableció un calendario para que cada texto llegara a tiempo.', '¿Qué decidió publicar el equipo?', 'Una revista digital.', '¿Qué revisó?', 'Las fuentes.', '¿Para qué estableció un calendario?', 'Para entregar los textos a tiempo.']
  ]
};

const readingActivities = Object.entries(readingActivitiesByLevel)
  .flatMap(([level, activities]) => [...activities, ...(additionalReadingActivitiesByLevel[level] || []), ...(readingExpansionByLevel[level] || [])].map(activity => makeReading(level, activity)));

const buildShortReadings = (level, entries) => entries.map(([title, subject, action, object, place]) => makeReading(level, [
  title,
  `${subject} ${action} ${object} en ${place}. Después revisó la actividad y dejó todo preparado para el día siguiente.`,
  '¿Quién realizó la actividad?', subject,
  '¿Qué hizo?', `${action} ${object}.`,
  '¿Dónde la realizó?', place + '.'
]));

readingActivities.push(
  ...buildShortReadings('Inicial', [
    ['La postal', 'Vera', 'dibujó', 'una postal', 'su habitación'], ['El tambor', 'Leo', 'guardó', 'un tambor', 'el armario'],
    ['La cometa', 'Nora', 'preparó', 'una cometa', 'el patio'], ['El cuento', 'Hugo', 'eligió', 'un cuento', 'la biblioteca'],
    ['La taza', 'Mía', 'lavó', 'una taza', 'la cocina'], ['El puzle', 'Álex', 'terminó', 'un puzle', 'la mesa'],
    ['La gorra', 'Irene', 'encontró', 'una gorra', 'el banco'], ['El cuaderno', 'Bruno', 'ordenó', 'un cuaderno', 'la mochila'],
    ['La pelota', 'Celia', 'compartió', 'una pelota', 'el parque'], ['El pañuelo', 'Dani', 'dobló', 'un pañuelo', 'su cajón'],
    ['La semilla', 'Lola', 'plantó', 'una semilla', 'una maceta'], ['El dibujo', 'Mario', 'coloreó', 'un dibujo', 'la clase'],
    ['La linterna', 'Sara', 'encendió', 'una linterna', 'la tienda'], ['El zumo', 'Pablo', 'preparó', 'un zumo', 'la merienda'],
    ['La cuerda', 'Aina', 'recogió', 'una cuerda', 'el gimnasio'], ['El disfraz', 'Tomás', 'guardó', 'un disfraz', 'el baúl'],
    ['La regla', 'Elena', 'utilizó', 'una regla', 'su escritorio'], ['El regalo', 'Nico', 'envolvió', 'un regalo', 'el salón'],
    ['La hoja', 'Clara', 'recogió', 'una hoja', 'el jardín'], ['El cubo', 'Óscar', 'llenó', 'un cubo', 'el patio'],
    ['La foto', 'Alicia', 'pegó', 'una foto', 'su álbum'], ['El botón', 'Mateo', 'cosió', 'un botón', 'la mesa'],
    ['La canción', 'Julia', 'escuchó', 'una canción', 'su habitación'], ['El mapa', 'Diego', 'miró', 'un mapa', 'la clase'],
    ['La caja', 'Emma', 'cerró', 'una caja', 'el dormitorio'], ['El vaso', 'Héctor', 'llenó', 'un vaso', 'la cocina'],
    ['La planta', 'Olivia', 'regó', 'una planta', 'la ventana']
  ]),
  ...buildShortReadings('Medio', [
    ['El plano del parque', 'Claudia', 'dibujó', 'un plano', 'la biblioteca'], ['La tabla de datos', 'Iván', 'completó', 'una tabla de datos', 'el aula'],
    ['El cartel informativo', 'Marta', 'redactó', 'un cartel informativo', 'el pasillo'], ['La caja de muestras', 'Sergio', 'clasificó', 'una caja de muestras', 'el laboratorio'],
    ['La entrevista', 'Lucía', 'preparó', 'una entrevista', 'el colegio'], ['El diario de campo', 'Adrián', 'escribió', 'un diario de campo', 'el sendero'],
    ['La maqueta', 'Noa', 'construyó', 'una maqueta', 'el taller'], ['La encuesta', 'Valeria', 'revisó', 'una encuesta', 'la biblioteca'],
    ['El experimento', 'Samuel', 'repitió', 'un experimento', 'el laboratorio'], ['La exposición', 'Carla', 'organizó', 'una exposición', 'el vestíbulo'],
    ['El calendario', 'Raúl', 'actualizó', 'un calendario', 'la clase'], ['La brújula', 'Irene', 'comprobó', 'una brújula', 'el sendero'],
    ['El inventario', 'Daniel', 'anotó', 'un inventario', 'el almacén'], ['La noticia', 'Ainhoa', 'contrastó', 'una noticia', 'la sala de lectura'],
    ['El registro', 'Mario', 'completó', 'un registro', 'el huerto'], ['La colección', 'Nerea', 'ordenó', 'una colección', 'el museo'],
    ['El itinerario', 'Lucas', 'calculó', 'un itinerario', 'el mapa'], ['La propuesta', 'Carmen', 'escribió', 'una propuesta', 'la reunión'],
    ['El modelo', 'Hugo', 'mejoró', 'un modelo', 'el taller'], ['La observación', 'Vega', 'anotó', 'una observación', 'el cuaderno'],
    ['El folleto', 'Pablo', 'diseñó', 'un folleto', 'la sala de informática'], ['La comparación', 'Elisa', 'preparó', 'una comparación', 'el aula'],
    ['El recorrido', 'Álvaro', 'marcó', 'un recorrido', 'el plano'], ['La explicación', 'Sofía', 'ensayó', 'una explicación', 'el salón de actos'],
    ['El informe', 'Gonzalo', 'revisó', 'un informe', 'la biblioteca'], ['La experiencia', 'Mara', 'describió', 'una experiencia', 'el cuaderno'],
    ['El proyecto', 'Javier', 'presentó', 'un proyecto', 'la clase']
  ]),
  ...buildShortReadings('Avanzado', [
    ['El informe energético', 'Lucía', 'analizó', 'un informe energético', 'el aula'], ['La propuesta vecinal', 'Mateo', 'defendió', 'una propuesta vecinal', 'la reunión'],
    ['El archivo histórico', 'Sara', 'consultó', 'un archivo histórico', 'el museo'], ['La hipótesis', 'Nora', 'formuló', 'una hipótesis', 'el laboratorio'],
    ['El mapa climático', 'Diego', 'interpretó', 'un mapa climático', 'la biblioteca'], ['La entrevista científica', 'Alicia', 'preparó', 'una entrevista científica', 'el estudio'],
    ['El debate', 'Héctor', 'moderó', 'un debate', 'el salón de actos'], ['La investigación', 'Elena', 'documentó', 'una investigación', 'el cuaderno'],
    ['El presupuesto', 'Bruno', 'calculó', 'un presupuesto', 'la oficina'], ['La campaña', 'Irene', 'planificó', 'una campaña', 'el centro juvenil'],
    ['El prototipo', 'Óscar', 'probó', 'un prototipo', 'el taller'], ['La reseña', 'Clara', 'escribió', 'una reseña', 'la biblioteca'],
    ['El análisis', 'Nico', 'comparó', 'un análisis', 'el laboratorio'], ['La cronología', 'Vera', 'ordenó', 'una cronología', 'el archivo'],
    ['El acuerdo', 'Pablo', 'redactó', 'un acuerdo', 'la asamblea'], ['La encuesta pública', 'Marta', 'interpretó', 'una encuesta pública', 'el centro cívico'],
    ['El diseño', 'Leo', 'revisó', 'un diseño', 'el estudio'], ['La conclusión', 'Emma', 'explicó', 'una conclusión', 'la clase'],
    ['El recurso digital', 'Adrián', 'organizó', 'un recurso digital', 'la biblioteca'], ['La guía', 'Celia', 'editó', 'una guía', 'el equipo'],
    ['El diagnóstico', 'Tomás', 'completó', 'un diagnóstico', 'el laboratorio'], ['La alternativa', 'Julia', 'valoró', 'una alternativa', 'la reunión'],
    ['El registro de campo', 'Sergio', 'revisó', 'un registro de campo', 'el sendero'], ['La memoria oral', 'Noa', 'transcribió', 'una memoria oral', 'el archivo'],
    ['El plan de mejora', 'Valeria', 'presentó', 'un plan de mejora', 'el consejo escolar'], ['La síntesis', 'Daniel', 'preparó', 'una síntesis', 'el aula'],
    ['El resultado', 'Ainhoa', 'comunicó', 'un resultado', 'la exposición']
  ])
);

const copyingSequences = [
  [
    'El sábado por la mañana, Lucía salió al parque con su abuelo. El día estaba despejado y los dos tenían ganas de dar un paseo tranquilo.',
    'Llevaron una cesta pequeña y una botella de agua para el camino. Lucía también guardó una libreta porque quería dibujar lo que encontraran.',
    'Primero caminaron junto al estanque y observaron los patos. Uno de ellos se acercó a la orilla, pero después volvió a nadar con los demás.',
    'Más tarde se sentaron bajo un árbol para descansar y merendar. El abuelo le contó a Lucía que aquel árbol llevaba muchos años en el parque.',
    'Antes de volver a casa, Lucía recogió la basura de la merienda. Su abuelo le explicó que cuidar los lugares compartidos es responsabilidad de todos.'
  ],
  [
    'En la clase de ciencias, el grupo decidió cuidar una planta. La profesora les pidió que observaran sus cambios durante varias semanas.',
    'Cada alumno escribió su nombre en una lista de turnos. Así sabrían quién debía revisar la maceta cada día.',
    'El lunes, Mateo comprobó que la tierra estaba demasiado seca. También vio que una de las hojas empezaba a inclinarse.',
    'Añadió un poco de agua y colocó la maceta cerca de la ventana. Después anotó lo que había hecho para que sus compañeros lo supieran.',
    'Durante las semanas siguientes, todos observaron cómo crecía. La clase descubrió que una planta necesita cuidados constantes y no solo agua de vez en cuando.'
  ],
  [
    'Clara preparó su mochila antes de salir hacia la biblioteca. Quería devolver un libro y buscar una historia nueva para el fin de semana.',
    'Guardó un cuaderno, un lápiz y la tarjeta de préstamo. También comprobó que llevaba la merienda para el camino de vuelta.',
    'En la sala infantil encontró un libro sobre animales del bosque. La portada mostraba un zorro entre los árboles y le llamó mucho la atención.',
    'Lo leyó en silencio y anotó una palabra que no conocía. Al llegar a casa pensaba buscar su significado en el diccionario.',
    'Al terminar, devolvió el libro en el mostrador de entrada. La bibliotecaria le recomendó otro título para su próxima visita.'
  ],
  [
    'La familia de Hugo decidió preparar una merienda en el campo. Querían aprovechar la tarde y caminar por un sendero cercano.',
    'Cada persona llevó algo distinto dentro de su mochila. Antes de salir, revisaron la lista para no olvidar el agua.',
    'Su madre llevó fruta y su hermano preparó unos bocadillos. Hugo se encargó de guardar unas servilletas y una bolsa para los residuos.',
    'Cuando llegaron, extendieron una manta junto a los árboles. Desde allí podían escuchar el viento y ver las montañas a lo lejos.',
    'Al marcharse, revisaron el lugar para dejarlo limpio. La familia pensó que disfrutar de la naturaleza también implica protegerla.'
  ],
  [
    'El colegio organizó una pequeña exposición sobre el agua. La actividad invitaba a pensar cómo utilizarla sin desperdiciarla.',
    'Cada equipo preparó un cartel con una idea para ahorrar agua. Unos hablaron de la ducha y otros de la cocina.',
    'El grupo de Sara explicó por qué conviene cerrar bien los grifos. También recordaron que una pequeña fuga puede desperdiciar mucha agua.',
    'Además, enseñaron un recipiente para recoger el agua de lluvia. Querían mostrar que algunos recursos pueden aprovecharse de nuevo.',
    'Al final, todos eligieron una costumbre para practicar en casa. Sara decidió cerrar el grifo mientras se cepillaba los dientes.'
  ],
  [
    'Martín encontró una caja de madera en el desván de su casa. Estaba detrás de unas mantas y tenía una pequeña cerradura oxidada.',
    'Dentro había fotografías antiguas y una carta doblada. Algunas imágenes mostraban una casa que Martín no había visto nunca.',
    'Su abuela le explicó quién aparecía en las fotografías. También le contó cómo era el pueblo cuando ella era pequeña.',
    'Juntos ordenaron las imágenes y escribieron las fechas detrás. Martín escuchó con atención para no confundir los nombres de la familia.',
    'Después guardaron la caja en un lugar seguro para volver a verla. Martín comprendió que las fotografías también pueden conservar recuerdos e historias.'
  ],
  [
    'El lunes, Valeria llevó una libreta nueva a clase. Quería anotar las preguntas que se le ocurrieran durante el experimento.',
    'El grupo mezcló agua, arena y piedras en tres recipientes. Después observó qué materiales se quedaban arriba y cuáles bajaban al fondo.',
    'Valeria dibujó cada recipiente y escribió una palabra para describirlo. Su equipo comparó los dibujos antes de ordenar los resultados.',
    'Al terminar, limpiaron la mesa y devolvieron cada material a su caja. La profesora les recordó que observar también significa cuidar el espacio de trabajo.',
    'En casa, Valeria contó el experimento a su hermano. Juntos pensaron en otras mezclas que podrían investigar otro día.'
  ],
  [
    'Óscar encontró una semilla dentro de una vaina durante el paseo. La guardó en un sobre para enseñársela a su profesora.',
    'En clase, observaron la forma, el color y el tamaño de la semilla. Después buscaron una fotografía de la planta adulta.',
    'Cada alumno escribió una hipótesis sobre lo que necesitaría para crecer. Óscar pensó que la tierra, el agua y la luz serían importantes.',
    'Plantaron varias semillas en macetas iguales y colocaron cada una en un lugar distinto. Así podrían comparar los cambios con el paso de los días.',
    'Al cabo de una semana, anotaron sus observaciones. La clase descubrió que una pregunta bien planteada ayuda a mirar con más atención.'
  ],
  [
    'Nerea preparó una tarjeta para felicitar a su amiga por su cumpleaños. Eligió un papel amarillo y buscó lápices de varios colores.',
    'Primero dibujó unas flores en la portada. Después escribió una frase corta y revisó que todas las palabras estuvieran completas.',
    'Su hermano le sugirió añadir una fecha. Nerea la escribió en una esquina para recordar cuándo había preparado la tarjeta.',
    'Antes de guardarla en el sobre, Nerea leyó el mensaje en voz alta. Cambió una palabra para que la frase sonara más cercana.',
    'Al día siguiente entregó la tarjeta después de clase. Su amiga sonrió al descubrir que estaba hecha a mano.'
  ],
  [
    'Samuel decidió construir un avión de papel para probar qué diseño volaba más lejos. Preparó varias hojas y las dobló siguiendo instrucciones diferentes.',
    'En el patio, su equipo marcó una línea de salida y lanzó cada avión tres veces. Anotaron la distancia de cada lanzamiento en una tabla.',
    'Uno de los aviones giró hacia un lado y cayó enseguida. Samuel revisó el doblez de una esquina y lo ajustó antes de volver a lanzarlo.',
    'Al comparar los resultados, descubrieron que el avión más sencillo había llegado más lejos. No siempre el diseño con más dobleces era el mejor.',
    'Samuel guardó la tabla para repetir la prueba otro día. Quería comprobar si el viento cambiaba las distancias.'
  ],
  [
    'La clase preparó una exposición sobre animales nocturnos. Cada grupo eligió una especie y buscó información en varios libros.',
    'Irene escogió el murciélago y anotó cuándo sale, qué come y cómo se orienta. Después dibujó sus alas para el cartel.',
    'El equipo revisó los textos para separar los datos importantes de las curiosidades. También comprobó que las imágenes correspondieran al animal.',
    'El día de la exposición, Irene explicó su parte a las familias. Sus compañeros le hicieron preguntas y ella buscó las respuestas en sus notas.',
    'Al terminar, guardaron los carteles para enseñarlos a otra clase. La investigación les había ayudado a hablar con más seguridad.'
  ],
  [
    'Durante una semana, la familia de Nora anotó cuánto tiempo utilizaba cada aparato eléctrico. Querían descubrir qué hábitos podían cambiar.',
    'Nora observó que algunas luces permanecían encendidas aunque nadie estuviera en la habitación. Lo apuntó en una tabla junto con la hora.',
    'El sábado revisaron todos los datos y eligieron dos medidas sencillas. Apagarían las luces al salir y desconectarían los cargadores que no usaran.',
    'Una semana después volvieron a medir el consumo. La diferencia no era enorme, pero habían aprendido que varios gestos pequeños podían sumarse.',
    'Nora preparó un cartel para recordar las medidas. Lo colocó cerca del interruptor de la entrada.'
  ]
];

const copyingExtraParagraphs = [
  'Al finalizar la actividad, cada alumno revisó su trabajo con calma. Leer de nuevo ayuda a descubrir pequeños detalles y a mejorar la presentación.',
  'Después compartieron sus ideas y escucharon las explicaciones de los demás. Aprender también consiste en observar, preguntar y colaborar.',
  'Antes de guardar la ficha, comprobaron que todo estaba completo y ordenado. El esfuerzo diario permite avanzar paso a paso.'
];

copyingSequences.push(
  ['El grupo preparó una excursión al museo de ciencias. Primero consultaron el horario y decidieron qué salas querían visitar.', 'Cada alumno llevó una libreta para anotar preguntas. La profesora recordó que observar con atención era tan importante como leer los carteles.', 'En la sala de minerales descubrieron rocas de colores y formas diferentes. Después compararon sus notas por parejas.', 'En el descanso compartieron la merienda y comentaron qué objeto les había sorprendido más. A todos les interesó el meteorito.', 'Al volver a clase, organizaron las preguntas y prepararon un mural con lo aprendido.'],
  ['La clase quiso construir un pequeño jardín vertical. Antes de empezar, midieron la pared y eligieron plantas que necesitaran poca agua.', 'Un equipo preparó los recipientes y otro mezcló la tierra. Todos trabajaron con cuidado para no romper las raíces.', 'Después colocaron las plantas a distintas alturas y escribieron sus nombres en unas etiquetas.', 'Durante las semanas siguientes se turnaron para revisar la humedad y retirar las hojas secas.', 'El jardín cambió el aspecto del pasillo y recordó a la clase que un proyecto necesita constancia.'],
  ['Alicia decidió ordenar las fotografías de sus vacaciones. Las separó por lugares y escribió una fecha aproximada detrás de cada grupo.', 'Para no perder ninguna, guardó una copia digital en una carpeta con un nombre claro.', 'Su hermano le ayudó a reconocer una playa que habían visitado años antes. Juntos buscaron el nombre en un mapa.', 'Luego eligieron algunas imágenes para preparar un pequeño álbum familiar.', 'Alicia comprendió que ordenar la información facilita encontrarla más adelante.'],
  ['El colegio organizó una jornada de juegos cooperativos. Cada equipo recibió una tarjeta con una prueba diferente.', 'Antes de comenzar, leyeron las reglas y repartieron las tareas para que todos pudieran participar.', 'En una de las pruebas tuvieron que construir una torre con piezas de cartón sin que se cayera.', 'Cuando algo no funcionaba, cambiaban la estrategia y volvían a intentarlo.', 'Al final comprobaron que escuchar las ideas de los demás les había ayudado a completar los retos.']
);

const calligraphySamples = {
  letters: ['a  a  a  a  a', 'e  e  e  e  e', 'i  i  i  i  i', 'o  o  o  o  o', 'u  u  u  u  u', 'm  m  m  m  m', 'p  p  p  p  p', 's  s  s  s  s', 'l  l  l  l  l', 't  t  t  t  t', 'n  n  n  n  n', 'r  r  r  r  r', 'd  d  d  d  d', 'c  c  c  c  c'],
  syllables: ['ma  me  mi  mo  mu', 'pa  pe  pi  po  pu', 'la  le  li  lo  lu', 'sa  se  si  so  su', 'bra  bre  bri  bro  bru', 'pla  ple  pli  plo  plu', 'tra  tre  tri  tro  tru', 'cla  cle  cli  clo  clu', 'que  qui  qua  quo  cu', 'ña  ñe  ñi  ño  ñu'],
  words: ['mariposa', 'pelota', 'camino', 'familia', 'escuela', 'ventana', 'primavera', 'biblioteca', 'montaña', 'elefante', 'cuaderno', 'amistad', 'jardín', 'aventura'],
  sentences: ['Mi casa tiene un jardín.', 'La rana salta junto al lago.', 'Hoy aprendemos algo nuevo.', 'Mi mochila está preparada.', 'Los amigos juegan en el parque.', 'Cuidamos juntos nuestro planeta.', 'La tortuga camina despacio.', 'Mi familia prepara la merienda.', 'El sol ilumina la ventana.', 'Compartir nos ayuda a aprender.', 'El tren llega a la estación.', 'Cada día practico un poco.']
};
calligraphySamples.letters.push('b  b  b  b  b', 'f  f  f  f  f', 'g  g  g  g  g', 'h  h  h  h  h', 'v  v  v  v  v', 'z  z  z  z  z', 'ñ  ñ  ñ  ñ  ñ');
calligraphySamples.syllables.push('da  de  di  do  du', 'fa  fe  fi  fo  fu', 'ga  ge  gi  go  gu', 'ña  ñe  ñi  ño  ñu', 'va  ve  vi  vo  vu', 'za  ze  zi  zo  zu', 'cha  che  chi  cho  chu');
calligraphySamples.words.push('naranja', 'mariposa', 'amistad', 'cuidadoso', 'camiseta', 'estrella', 'regadera');
calligraphySamples.sentences.push('La estrella brilla por la noche.', 'Mi perro corre por el jardín.', 'La clase cuida los libros.', 'El barco navega despacio.', 'Preparamos juntos la mochila.', 'La lluvia moja las hojas.', 'Cada pregunta nos ayuda a aprender.');

const spellingActivities = [
  ['Completa con b o v', 'La _icicleta de Bea es _erde.', 'La bicicleta de Bea es verde.'],
  ['Completa con g o j', 'El _inete monta un gara_e.', 'El jinete monta un garaje.'],
  ['Completa con h', 'Ayer _icimos una excursión y _allamos un tesoro.', 'Ayer hicimos una excursión y hallamos un tesoro.'],
  ['Completa con c o z', 'El _apato está junto a la _anahoria.', 'El zapato está junto a la zanahoria.'],
  ['Coloca las mayúsculas', 'marta vive en sevilla y visita el museo.', 'Marta vive en Sevilla y visita el museo.'],
  ['Coloca las tildes', 'El camaleon cambio de color junto al arbol.', 'El camaleón cambió de color junto al árbol.'],
  ['Completa con ll o y', 'El po_ito corre detrás de la _egua.', 'El pollito corre detrás de la yegua.'],
  ['Completa con r o rr', 'El pe_o corre alrededor del ca_o.', 'El perro corre alrededor del carro.'],
  ['Completa con m o n', 'La ca_pana suena junto al ta_bor.', 'La campana suena junto al tambor.'],
  ['Completa con mp o mb', 'El ca__o tiene una bo__a.', 'El campo tiene una bomba.'],
  ['Completa con gü o gu', 'La ci_eña vuela sobre el para_as.', 'La cigüeña vuela sobre el paraguas.'],
  ['Completa con qu o c', 'El _eso está en la _ocina.', 'El queso está en la cocina.'],
  ['Completa con s o x', 'El e_amen fue muy sencillo y e_plicó la respuesta.', 'El examen fue muy sencillo y explicó la respuesta.'],
  ['Coloca los signos y las tildes', 'que sorpresa has preparado', '¡Qué sorpresa has preparado!'],
  ['Coloca las tildes', 'El pajaro llevo una ramita al arbol.', 'El pájaro llevó una ramita al árbol.'],
  ['Completa con y o i', 'La _glesia está junto al ra_o.', 'La iglesia está junto al rayo.']
];

const logicActivities = [
  ['2, 4, 6, 8, __', '10'], ['5, 10, 15, 20, __', '25'], ['30, 27, 24, 21, __', '18'],
  ['1, 3, 5, 7, __', '9'], ['4, 8, 12, 16, __', '20'], ['50, 45, 40, 35, __', '30'],
  ['3, 6, 12, 24, __', '48'], ['1, 2, 4, 8, __', '16'], ['100, 90, 80, 70, __', '60'],
  ['7, 14, 21, 28, __', '35'], ['10, 20, 30, 40, __', '50'], ['81, 72, 63, 54, __', '45'],
  ['2, 5, 8, 11, __', '14'], ['6, 12, 18, 24, __', '30'], ['64, 32, 16, 8, __', '4'],
  ['9, 18, 27, 36, __', '45'], ['40, 36, 32, 28, __', '24'], ['1, 4, 7, 10, __', '13'],
  ['2, 6, 18, 54, __', '162'], ['200, 180, 160, 140, __', '120']
];

logicActivities.push(
  ['13, 16, 19, 22, __', '25'], ['84, 77, 70, 63, __', '56'], ['1, 3, 6, 10, __', '15'],
  ['9, 18, 36, 72, __', '144'], ['6, 10, 14, 18, __', '22'], ['150, 135, 120, 105, __', '90'],
  ['2, 4, 8, 16, __', '32'], ['17, 22, 27, 32, __', '37'], ['49, 42, 35, 28, __', '21'],
  ['3, 6, 9, 12, __', '15'], ['5, 10, 20, 40, __', '80'], ['36, 33, 30, 27, __', '24'],
  ['2, 8, 14, 20, __', '26'], ['7, 11, 15, 19, __', '23'], ['100, 95, 90, 85, __', '80'],
  ['4, 16, 64, 256, __', '1024'], ['1, 10, 19, 28, __', '37'], ['80, 72, 64, 56, __', '48'],
  ['10, 13, 16, 19, __', '22'], ['200, 190, 180, 170, __', '160']
);

spellingActivities.push(
  ['Completa con b o v', 'El _urro llevaba una _olsa.', 'El burro llevaba una bolsa.'],
  ['Completa con g o j', 'La _elatina tiene sabor a _engibre.', 'La gelatina tiene sabor a jengibre.'],
  ['Completa con h', 'Mi _ija _izo los deberes.', 'Mi hija hizo los deberes.'],
  ['Completa con c o z', 'La _igüeña cruza la _ona húmeda.', 'La cigüeña cruza la zona húmeda.'],
  ['Completa con ll o y', 'La _ave está cerca de la _egua.', 'La llave está cerca de la yegua.'],
  ['Completa con r o rr', 'El pe_o siguió el ca_o.', 'El perro siguió el carro.'],
  ['Completa con m o n', 'El i_vierno llegó con mucho _ieve.', 'El invierno llegó con mucha nieve.'],
  ['Completa con mp o mb', 'La ta__ora sonó junto al ca__o.', 'La tambora sonó junto al campo.'],
  ['Completa con gü o gu', 'El para_as está junto a la ci_eña.', 'El paraguas está junto a la cigüeña.'],
  ['Completa con qu o c', 'El pa__ete llegó a la _iudad.', 'El paquete llegó a la ciudad.'],
  ['Completa con s o x', 'La e_cursión pasó junto al e_tanque.', 'La excursión pasó junto al estanque.'],
  ['Coloca las tildes', 'El lapiz quedo junto al sofa.', 'El lápiz quedó junto al sofá.'],
  ['Coloca los signos', 'Has terminado la actividad', '¿Has terminado la actividad?'],
  ['Coloca las mayúsculas', 'ana vive en toledo y escucha canciones.', 'Ana vive en Toledo y escucha canciones.'],
  ['Completa con y o i', 'La _glesia tiene un ra_o en la torre.', 'La iglesia tiene un rayo en la torre.'],
  ['Completa con b o v', 'La _aca bebe agua junto al _arco.', 'La vaca bebe agua junto al barco.']
);

const practicalActivities = {
  reloj: [
    ['¿Qué hora marca un reloj si la aguja corta está en el 3 y la larga en el 12?', 'Las tres en punto.'],
    ['Una película empieza a las 17:00 y dura una hora y media. ¿A qué hora termina?', 'A las 18:30.'],
    ['¿Cuántos minutos hay en media hora?', '30 minutos.'],
    ['Si son las 9:45, ¿qué hora será dentro de 30 minutos?', 'Las 10:15.'],
    ['¿Cuántos cuartos de hora forman una hora?', '4 cuartos de hora.'],
    ['Si son las 14:20, ¿qué hora será dentro de 40 minutos?', 'Las 15:00.'],
    ['¿Cuántos minutos hay en un cuarto de hora?', '15 minutos.'],
    ['Una clase empieza a las 9:00 y dura 45 minutos. ¿A qué hora termina?', 'A las 9:45.'],
    ['¿Qué hora es si la aguja corta está en el 6 y la larga en el 12?', 'Las seis en punto.']
  ],
  dinero: [
    ['Una libreta cuesta 2 € y un lápiz 1 €. ¿Cuánto pagas por los dos?', '3 €.'],
    ['Tienes 5 € y compras un cuento de 3 €. ¿Cuánto te sobra?', '2 €.'],
    ['¿Cuántas monedas de 50 céntimos necesitas para reunir 2 €?', '4 monedas.'],
    ['Una mochila cuesta 12 € y tienes 10 €. ¿Cuánto te falta?', '2 €.'],
    ['Compras tres pegatinas de 20 céntimos. ¿Cuánto pagas?', '60 céntimos.'],
    ['Una pelota cuesta 7 € y pagas con 10 €. ¿Qué cambio recibes?', '3 €.'],
    ['¿Cuántas monedas de 20 céntimos forman 1 €?', '5 monedas.'],
    ['Un libro cuesta 8 € y un cuaderno 2 €. ¿Cuánto pagas?', '10 €.'],
    ['Tienes 15 € y gastas 6 €. ¿Cuánto dinero te queda?', '9 €.']
  ],
  medidas: [
    ['¿Cuántos centímetros hay en un metro?', '100 centímetros.'],
    ['¿Qué unidad usarías para medir la capacidad de una botella?', 'Litros.'],
    ['Una cinta mide 2 metros y otra 50 centímetros. ¿Cuánto miden juntas?', '2 metros y 50 centímetros.'],
    ['¿Qué pesa más: 1 kilogramo o 500 gramos?', '1 kilogramo.'],
    ['¿Cuántos mililitros hay en un litro?', '1000 mililitros.'],
    ['¿Cuántos milímetros hay en un centímetro?', '10 milímetros.'],
    ['Una botella tiene 750 mililitros. ¿Le falta mucho para llegar a 1 litro?', '250 mililitros.'],
    ['¿Qué unidad usarías para pesar una sandía?', 'Kilogramos.'],
    ['¿Cuántos gramos hay en un kilogramo?', '1000 gramos.']
  ],
  fracciones: [
    ['Una pizza se divide en 4 partes iguales y comes 1. ¿Qué fracción comes?', '1/4.'],
    ['¿Qué fracción representa la mitad?', '1/2.'],
    ['¿Cuántas partes iguales tiene un tercio?', '3 partes.'],
    ['De 8 partes iguales, 3 están coloreadas. ¿Qué fracción está coloreada?', '3/8.'],
    ['¿Qué es mayor: 1/2 o 1/4?', '1/2.'],
    ['Una tarta tiene 6 partes y comes 2. ¿Qué fracción comes?', '2/6.'],
    ['¿Qué fracción representa un cuarto?', '1/4.'],
    ['De 10 partes iguales, 7 están coloreadas. ¿Qué fracción está coloreada?', '7/10.'],
    ['¿Qué es menor: 1/3 o 1/2?', '1/3.']
  ],
  geometria: [
    ['Observa la figura. ¿Cuántos lados y vértices tiene este triángulo?', '3 lados y 3 vértices.'],
    ['Observa la figura. ¿Cuántos vértices tiene el cuadrado? ¿Son todos sus lados iguales?', '4 vértices. Sí, sus lados son iguales.'],
    ['Observa la figura redonda. ¿Cómo se llama y qué característica tienen sus puntos respecto al centro?', 'La circunferencia. Todos sus puntos están a la misma distancia del centro.'],
    ['Observa el pentágono. ¿Cuántos lados tiene y cómo se llama?', '5 lados. Pentágono.'],
    ['Observa la figura. ¿Cuántos lados tiene el rectángulo y cómo son sus lados opuestos?', '4 lados. Los lados opuestos son iguales.'],
    ['Observa el hexágono. ¿Cuántos lados tiene y cómo se llama?', '6 lados. Hexágono.'],
    ['Observa la figura. ¿Cuántos lados y vértices tiene el pentágono?', '5 lados y 5 vértices.'],
    ['Observa la figura. ¿Qué nombre recibe y qué puedes decir de sus cuatro lados?', 'Cuadrado. Sus cuatro lados son iguales.'],
    ['Observa el ángulo. ¿Es menor, igual o mayor que un ángulo recto? ¿Cómo se llama?', 'Es menor que un ángulo recto: ángulo agudo.']
  ],
  vocabulario: [
    ['Escribe un sinónimo de “contento”.', 'Feliz.'],
    ['Escribe un antónimo de “grande”.', 'Pequeño.'],
    ['¿Qué significa “rápido”?', 'Que se mueve o sucede con velocidad.'],
    ['Escribe una palabra de la familia de “pan”.', 'Panadero, panadería o panecillo.'],
    ['¿Cuál no pertenece al grupo: manzana, pera, mesa, plátano?', 'Mesa.'],
    ['Escribe un sinónimo de “rápido”.', 'Veloz.'],
    ['Escribe un antónimo de “cerca”.', 'Lejos.'],
    ['¿Qué significa “enorme”?', 'Muy grande.'],
    ['Escribe una palabra de la familia de “flor”.', 'Florero, florista o floristería.'],
    ['¿Cuál no pertenece al grupo: rojo, azul, silla, verde?', 'Silla.']
  ],
  ordenar: [
    ['Ordena: parque / juega / Ana / en el.', 'Ana juega en el parque.'],
    ['Ordena: azul / coche / El / es.', 'El coche es azul.'],
    ['Ordena: temprano / levantó / Pablo / se.', 'Pablo se levantó temprano.'],
    ['Ordena: flores / jardín / hay / En / el.', 'En el jardín hay flores.'],
    ['Ordena: libro / un / Leo / lee.', 'Leo lee un libro.'],
    ['Ordena: mañana / temprano / salimos / por la.', 'Salimos temprano por la mañana.'],
    ['Ordena: música / escucha / Marta / tranquila.', 'Marta escucha música tranquila.'],
    ['Ordena: reciclamos / papel / el / En / colegio.', 'En el colegio reciclamos el papel.'],
    ['Ordena: sobre / vuela / mar / la / gaviota / el.', 'La gaviota vuela sobre el mar.'],
    ['Ordena: una / prepara / sopa / Elena.', 'Elena prepara una sopa.']
  ]
};

spellingActivities.push(
  ['Completa con b o v', 'La _aca bebe agua junto al _arco.', 'La vaca bebe agua junto al barco.'],
  ['Completa con g o j', 'La _irafa come ho_as del árbol.', 'La jirafa come hojas del árbol.'],
  ['Completa con h', 'Mi _ermano _izo una tarta.', 'Mi hermano hizo una tarta.'],
  ['Coloca las tildes', 'La musica sono en el salon.', 'La música sonó en el salón.'],
  ['Completa con ll o y', 'La _ave tiene una _anta amarilla.', 'La llave tiene una llanta amarilla.'],
  ['Completa con r o rr', 'El ca_o llegó por la ca_etera.', 'El carro llegó por la carretera.'],
  ['Coloca las mayúsculas', 'el lunes viajamos a granada.', 'El lunes viajamos a Granada.'],
  ['Completa con c o z', 'La _ebra cruza la _ona de hierba.', 'La cebra cruza la zona de hierba.']
);

logicActivities.push(
  ['12, 15, 18, 21, __', '24'], ['90, 80, 70, 60, __', '50'], ['2, 3, 5, 8, __', '12'],
  ['5, 15, 25, 35, __', '45'], ['72, 63, 54, 45, __', '36'], ['4, 12, 36, 108, __', '324'],
  ['11, 22, 33, 44, __', '55'], ['1, 5, 9, 13, __', '17'], ['96, 84, 72, 60, __', '48'],
  ['8, 16, 24, 32, __', '40']
);

spellingActivities.push(
  ['Completa con b o v', 'El _urro vive junto al _osque.', 'El burro vive junto al bosque.'],
  ['Completa con g o j', 'La _elatina está en la nevera.', 'La gelatina está en la nevera.'],
  ['Completa con h', 'El _ielo cubría la _ierba.', 'El hielo cubría la hierba.'],
  ['Coloca las tildes', 'El camion paso junto al rio.', 'El camión pasó junto al río.'],
  ['Coloca los signos', 'Has terminado la actividad', '¿Has terminado la actividad?'],
  ['Completa con ll o y', 'El _ate navega cerca de la _egua.', 'El yate navega cerca de la yegua.'],
  ['Completa con r o rr', 'La to_uga cruza el ca_il.', 'La tortuga cruza el carril.'],
  ['Coloca las mayúsculas', 'lucas viaja a madrid en verano.', 'Lucas viaja a Madrid en verano.'],
  ['Completa con c o z', 'La _ebra corre por la _ona.', 'La cebra corre por la zona.'],
  ['Completa con qu o c', 'El pa__ete llegó a la _iudad.', 'El paquete llegó a la ciudad.']
);

logicActivities.push(
  ['14, 18, 22, 26, __', '30'], ['60, 55, 50, 45, __', '40'], ['3, 9, 27, 81, __', '243'],
  ['2, 7, 12, 17, __', '22'], ['45, 40, 35, 30, __', '25'], ['6, 11, 16, 21, __', '26'],
  ['4, 8, 16, 32, __', '64'], ['120, 110, 100, 90, __', '80'], ['1, 4, 9, 16, __', '25'],
  ['7, 12, 17, 22, __', '27']
);

const additionalPracticalActivities = {
  reloj: [
    ['Un partido empieza a las 16:15 y dura una hora. ¿A qué hora termina?', 'A las 17:15.'],
    ['Si son las 11:50, ¿qué hora será dentro de 20 minutos?', 'Las 12:10.'],
    ['¿Cuántas horas tiene un día completo?', '24 horas.'],
    ['Una excursión comienza a las 8:30 y termina a las 13:00. ¿Cuánto dura?', '4 horas y 30 minutos.'],
    ['¿Qué hora marca un reloj si la aguja corta está en el 9 y la larga en el 12?', 'Las nueve en punto.']
  ],
  dinero: [
    ['Un zumo cuesta 1,50 € y una fruta 0,50 €. ¿Cuánto pagas?', '2 €.'],
    ['Tienes 20 € y compras un juego de 14 €. ¿Qué cambio recibes?', '6 €.'],
    ['¿Cuántas monedas de 10 céntimos forman 1 €?', '10 monedas.'],
    ['Dos cuadernos cuestan 3 € cada uno. ¿Cuánto pagas?', '6 €.'],
    ['Una entrada cuesta 5 € y compras dos. ¿Cuánto necesitas?', '10 €.']
  ],
  medidas: [
    ['¿Cuántos metros hay en un kilómetro?', '1000 metros.'],
    ['¿Qué unidad usarías para medir la longitud de un lápiz?', 'Centímetros.'],
    ['Una cuerda mide 3 metros y cortas 1 metro. ¿Cuánto queda?', '2 metros.'],
    ['¿Cuántos litros son 2 medios litros?', '1 litro.'],
    ['¿Qué pesa más: 2 kilogramos o 1500 gramos?', '2 kilogramos.']
  ],
  fracciones: [
    ['Una barra tiene 8 partes y comes 4. ¿Qué fracción comes?', '4/8.'],
    ['¿Qué fracción es mayor: 3/4 o 1/4?', '3/4.'],
    ['De 5 partes iguales, 2 están coloreadas. ¿Qué fracción está coloreada?', '2/5.'],
    ['¿Qué fracción representa un entero dividido en dos partes iguales?', '2/2.'],
    ['¿Qué es mayor: 2/3 o 1/3?', '2/3.']
  ],
  geometria: [
    ['Observa la figura. ¿Cuántos ángulos tiene el triángulo?', '3 ángulos.'],
    ['Observa la figura. ¿Qué cuadrilátero tiene dos lados largos y dos cortos?', 'El rectángulo.'],
    ['Observa el octógono. ¿Cuántos lados tiene y cómo se llama?', '8 lados. Octógono.'],
    ['Observa la línea. ¿Tiene principio o final?', 'No, es una línea recta infinita.'],
    ['Observa la figura. ¿Cuántos vértices tiene el pentágono?', '5 vértices.'],
    ['Observa la figura. ¿Cuántos lados tiene el hexágono?', '6 lados.'],
    ['Observa la figura. ¿Cómo se llama el polígono que tiene ocho lados?', 'Octógono.'],
    ['Observa la figura. ¿Cuántos lados paralelos tiene el rectángulo?', 'Tiene dos pares de lados paralelos.'],
    ['Observa la figura. ¿Cómo se llama un triángulo que tiene sus tres lados iguales?', 'Triángulo equilátero.'],
    ['Observa el ángulo. ¿Cómo se llama si forma una esquina como la de un cuadrado?', 'Ángulo recto.'],
    ['Observa la figura. ¿Qué diferencia hay entre un círculo y una circunferencia?', 'El círculo es la superficie interior y la circunferencia es su línea exterior.']
  ],
  vocabulario: [
    ['Escribe un sinónimo de “bonito”.', 'Hermoso.'],
    ['Escribe un antónimo de “lento”.', 'Rápido.'],
    ['¿Qué significa “observar”?', 'Mirar con atención.'],
    ['Escribe una palabra de la familia de “mar”.', 'Marino, marinero o marea.'],
    ['¿Cuál no pertenece al grupo: correr, saltar, azul, nadar?', 'Azul.']
  ],
  ordenar: [
    ['Ordena: ventana / abre / Lucía / la.', 'Lucía abre la ventana.'],
    ['Ordena: flores / riega / Pedro / las.', 'Pedro riega las flores.'],
    ['Ordena: camino / seguimos / el / largo.', 'Seguimos el camino largo.'],
    ['Ordena: cuento / antes / leo / dormir / de.', 'Leo un cuento antes de dormir.'],
    ['Ordena: contentos / vuelven / casa / a / Los niños.', 'Los niños vuelven contentos a casa.']
  ]
};
Object.entries(additionalPracticalActivities).forEach(([type, items]) => practicalActivities[type].push(...items));

const practicalActivitiesByDifficulty = {
  Inicial: Object.fromEntries(Object.entries(practicalActivities).map(([type, items]) => [type, items.slice(0, items.length - additionalPracticalActivities[type].length)])),
  Medio: Object.fromEntries(Object.entries(additionalPracticalActivities).map(([type, items]) => [type, [...items]]))
};

const expandedPracticalActivities = {
  reloj: [
    ['Si son las 7:30, ¿qué hora será dentro de 45 minutos?', 'Las 8:15.'],
    ['¿Cuántos minutos hay en dos horas?', '120 minutos.'],
    ['Una clase empieza a las 10:15 y dura 30 minutos. ¿Cuándo termina?', 'A las 10:45.'],
    ['¿Qué hora marca un reloj si la aguja corta está en el 12 y la larga en el 6?', 'Las doce y media.'],
    ['Si son las 18:00, ¿qué hora era hace una hora?', 'Las 17:00.']
  ],
  dinero: [
    ['Un lápiz cuesta 0,80 € y una goma 0,50 €. ¿Cuánto pagas?', '1,30 €.'],
    ['Tienes 10 € y compras dos cuentos de 4 €. ¿Cuánto te sobra?', '2 €.'],
    ['¿Cuántas monedas de 2 € necesitas para reunir 10 €?', '5 monedas.'],
    ['Una camiseta cuesta 15 € y tiene una rebaja de 5 €. ¿Cuánto cuesta ahora?', '10 €.'],
    ['Compras una regla de 1,20 € y pagas con 2 €. ¿Qué cambio recibes?', '0,80 €.']
  ],
  medidas: [
    ['¿Cuántos centímetros hay en medio metro?', '50 centímetros.'],
    ['Una botella contiene 2 litros y bebes medio litro. ¿Cuánto queda?', '1 litro y medio.'],
    ['¿Cuántos gramos hay en medio kilogramo?', '500 gramos.'],
    ['Una mesa mide 120 centímetros. ¿Cuántos metros y centímetros son?', '1 metro y 20 centímetros.'],
    ['¿Qué unidad usarías para medir la distancia entre dos ciudades?', 'Kilómetros.']
  ],
  fracciones: [
    ['Una tarta tiene 8 partes y comes 1. ¿Qué fracción comes?', '1/8.'],
    ['¿Qué fracción es menor: 2/5 o 4/5?', '2/5.'],
    ['De 6 partes iguales, 5 están coloreadas. ¿Qué fracción está coloreada?', '5/6.'],
    ['¿Cuántos cuartos forman un entero?', '4 cuartos.'],
    ['Una tableta tiene 10 trozos y quedan 3. ¿Qué fracción queda?', '3/10.']
  ],
  geometria: [
    ['Observa la figura. ¿Cuántas diagonales puedes dibujar en un cuadrado?', '2 diagonales.'],
    ['¿Cómo se llama un polígono de tres lados?', 'Triángulo.'],
    ['Observa la figura redonda. ¿Qué figura tiene todos sus puntos a la misma distancia del centro?', 'La circunferencia.'],
    ['¿Cuántos lados tiene un heptágono?', '7 lados.'],
    ['Observa la figura. ¿Qué tipo de línea cambia de dirección formando esquinas?', 'Una línea quebrada.']
  ],
  vocabulario: [
    ['Escribe un sinónimo de “enorme”.', 'Gigante.'],
    ['Escribe un antónimo de “limpio”.', 'Sucio.'],
    ['¿Qué significa “valiente”?', 'Que no tiene miedo ante una dificultad.'],
    ['Escribe una palabra de la familia de “mar”.', 'Marea.'],
    ['¿Cuál no pertenece al grupo: cuchara, tenedor, plato, montaña?', 'Montaña.']
  ],
  ordenar: [
    ['Ordena: escuela / vamos / a / La.', 'Vamos a la escuela.'],
    ['Ordena: rojo / tiene / Pedro / un / balón.', 'Pedro tiene un balón rojo.'],
    ['Ordena: despacio / camina / tortuga / La.', 'La tortuga camina despacio.'],
    ['Ordena: una / dibuja / estrella / Carla.', 'Carla dibuja una estrella.'],
    ['Ordena: ventana / entra / por la / luz / La.', 'La luz entra por la ventana.']
  ]
};
Object.entries(expandedPracticalActivities).forEach(([type, items]) => practicalActivities[type].push(...items));

const finalPracticalExpansion = {
  reloj: [
    ['Si son las 12:25, ¿qué hora será dentro de 35 minutos?', 'La una en punto.'],
    ['Una actividad comienza a las 15:30 y dura 45 minutos. ¿Cuándo termina?', 'A las 16:15.'],
    ['¿Cuántos minutos hay en tres cuartos de hora?', '45 minutos.'],
    ['Si son las 20:10, ¿qué hora era hace 20 minutos?', 'Las 19:50.'],
    ['¿Cuántos minutos tiene una hora y cuarto?', '75 minutos.'],
    ['Una excursión sale a las 9:15 y llega a las 10:00. ¿Cuánto dura?', '45 minutos.']
  ],
  dinero: [
    ['Una carpeta cuesta 2,50 € y un lápiz 0,50 €. ¿Cuánto pagas?', '3 €.'],
    ['Tienes 12 € y gastas 7,50 €. ¿Cuánto te queda?', '4,50 €.'],
    ['¿Cuántas monedas de 25 céntimos forman 1 €?', '4 monedas.'],
    ['Tres entradas cuestan 4 € cada una. ¿Cuánto pagas?', '12 €.'],
    ['Una merienda cuesta 2,80 € y pagas con 5 €. ¿Qué cambio recibes?', '2,20 €.'],
    ['Un libro cuesta 9 € y una libreta 1,50 €. ¿Cuánto cuestan juntos?', '10,50 €.']
  ],
  medidas: [
    ['¿Cuántos centímetros hay en 3 metros?', '300 centímetros.'],
    ['¿Cuántos mililitros hay en medio litro?', '500 mililitros.'],
    ['Una cuerda mide 5 metros y cortas 2 metros. ¿Cuánto queda?', '3 metros.'],
    ['¿Cuántos kilogramos son 3000 gramos?', '3 kilogramos.'],
    ['Una jarra tiene 1 litro y añades medio litro. ¿Cuánto contiene?', '1 litro y medio.'],
    ['¿Qué unidad usarías para medir el peso de un lápiz?', 'Gramos.']
  ],
  fracciones: [
    ['Una tableta tiene 12 trozos y comes 3. ¿Qué fracción comes?', '3/12.'],
    ['¿Qué es mayor: 2/4 o 1/4?', '2/4.'],
    ['De 9 partes iguales, 4 están coloreadas. ¿Qué fracción está coloreada?', '4/9.'],
    ['¿Cuántos medios forman un entero?', '2 medios.'],
    ['¿Qué es menor: 3/8 o 6/8?', '3/8.'],
    ['Una pizza tiene 8 partes y quedan 5. ¿Qué fracción queda?', '5/8.']
  ],
  geometria: [
    ['¿Cuántos lados tiene un octógono?', '8 lados.'],
    ['¿Cuántos vértices tiene un rectángulo?', '4 vértices.'],
    ['¿Cómo se llama una figura de cuatro lados iguales?', 'Cuadrado.'],
    ['¿Qué figura tiene tres lados y tres vértices?', 'Triángulo.'],
    ['¿Cuántos lados tiene un heptágono?', '7 lados.'],
    ['¿Cómo se llama un ángulo mayor que uno recto?', 'Ángulo obtuso.']
  ],
  vocabulario: [
    ['Escribe un sinónimo de “alegre”.', 'Contento.'],
    ['Escribe un antónimo de “oscuro”.', 'Claro.'],
    ['¿Qué significa “cuidar”?', 'Proteger o atender algo.'],
    ['Escribe una palabra de la familia de “pan”.', 'Panadería, panadero o panecillo.'],
    ['¿Cuál no pertenece al grupo: rojo, amarillo, correr, azul?', 'Correr.'],
    ['Escribe un sinónimo de “comenzar”.', 'Empezar.']
  ],
  ordenar: [
    ['Ordena: colegio / en / estudia / Marta / el.', 'Marta estudia en el colegio.'],
    ['Ordena: la / ventana / cierra / Pablo.', 'Pablo cierra la ventana.'],
    ['Ordena: despacio / río / corre / El.', 'El río corre despacio.'],
    ['Ordena: prepara / Ana / ensalada / una.', 'Ana prepara una ensalada.'],
    ['Ordena: leen / biblioteca / en la / Los niños.', 'Los niños leen en la biblioteca.'],
    ['Ordena: una / tiene / bicicleta / Luis.', 'Luis tiene una bicicleta.']
  ]
};
Object.entries(finalPracticalExpansion).forEach(([type, items]) => practicalActivities[type].push(...items));
Object.entries(expandedPracticalActivities).forEach(([type, items]) => {
  practicalActivitiesByDifficulty.Avanzado ??= {};
  practicalActivitiesByDifficulty.Avanzado[type] = [...items, ...(finalPracticalExpansion[type] || [])];
});

function activityQuestionPool(items, difficulty, type) {
  const level = difficultyTier(difficulty);
  if (type === 'ortografia') {
    const skillGroups = {
      Inicial: /b o v|g o j|con h|c o z|mayúsculas|ll o y|r o rr/i,
      Medio: /m o n|mp o mb|qu o c|tildes|signos/i,
      Avanzado: /gü o gu|s o x|y o i|tildes|signos/i
    };
    const selected = items.filter(item => skillGroups[level].test(item[0]));
    return selected.length ? selected : items;
  }
  if (type === 'logica') {
    const scored = items.map(item => {
      const values = item[0].match(/\d+/g).map(Number);
      const differences = values.slice(1).map((value, index) => value - values[index]);
      const constantStep = differences.every(value => value === differences[0]);
      const step = Math.abs(differences[0] || 0);
      const geometric = values.slice(2).every((value, index) => value * values[index] === values[index + 1] ** 2);
      const complexity = geometric || !constantStep ? 2 : step <= 3 && Math.max(...values) <= 30 ? 0 : step <= 10 && Math.max(...values) <= 100 ? 1 : 2;
      return { item, complexity };
    });
    const target = { Inicial: 0, Medio: 1, Avanzado: 2 }[level];
    const selected = scored.filter(entry => entry.complexity === target).map(entry => entry.item);
    return selected.length ? selected : scored.filter(entry => Math.abs(entry.complexity - target) === Math.min(...scored.map(candidate => Math.abs(candidate.complexity - target)))).map(entry => entry.item);
  }
  return items;
}

function copyingSequencePool(difficulty) {
  const ranked = copyingSequences.map((sequence, index) => {
    const text = sequence.join(' ');
    const sentences = text.split(/[.!?]+/).filter(Boolean);
    const averageWords = sentences.reduce((total, sentence) => total + sentence.trim().split(/\s+/).length, 0) / Math.max(1, sentences.length);
    return { index, averageWords };
  }).sort((first, second) => first.averageWords - second.averageWords);
  const tier = { Inicial: 0, Medio: 1, Avanzado: 2 }[difficultyTier(difficulty)];
  const start = Math.floor(ranked.length * tier / 3);
  const end = Math.max(start + 1, Math.floor(ranked.length * (tier + 1) / 3));
  return ranked.slice(start, end).map(entry => entry.index);
}

const geometryFigureFor = question => {
  const text = question.toLowerCase();
  if (text.includes('triángulo')) return 'triangle';
  if (text.includes('tres lados') || text.includes('tres ángulos')) return 'triangle';
  if (text.includes('ángulo') && !text.includes('rectángulo')) return 'angle';
  if (text.includes('cuadrado')) return 'square';
  if (text.includes('círculo') || text.includes('redonda')) return 'circle';
  if (text.includes('rectángulo') || text.includes('cuadrilátero')) return 'rectangle';
  if (text.includes('pentágono')) return 'pentagon';
  if (text.includes('hexágono')) return 'hexagon';
  if (text.includes('octógono') || text.includes('ocho lados')) return 'octagon';
  if (text.includes('heptágono') || text.includes('siete lados')) return 'heptagon';
  if (text.includes('línea')) return 'line';
  return 'square';
};

function randomReadingActivity(difficulty) {
  const level = difficulty === 'Inicial' || difficulty === 'Tranquila' ? 'Inicial' : difficulty === 'Medio' || difficulty === 'Estándar' ? 'Medio' : 'Avanzado';
  const available = readingActivities.filter(activity => activity.level === level && activity.title !== lastReadingTitle);
  const selected = available[randomInt(0, available.length - 1)] || readingActivities.find(activity => activity.level === level) || readingActivities[0];
  lastReadingTitle = selected.title;
  return selected;
}

function makeContent(type, count, difficulty, level, operands, firstDigits, secondDigits, paragraphs = 1, options = {}) {
  if (['sumas', 'restas', 'multiplicaciones', 'divisiones'].includes(type)) {
    return Array.from({ length: count }, () => makeOperation(type, difficulty, level, operands, firstDigits, secondDigits, options));
  }
  if (type === 'lectura') return [{ kind: 'reading', ...randomReadingActivity(difficulty) }];
  if (type === 'caligrafia') {
    const samples = calligraphySamples[options.calligraphyMode] || calligraphySamples.sentences;
    const tier = { Inicial: 0, Medio: 1, Avanzado: 2 }[difficultyTier(difficulty)];
    const chunkSize = Math.max(1, Math.ceil(samples.length / 3));
    const levelSamples = samples.slice(tier * chunkSize, (tier + 1) * chunkSize);
    const selectedSamples = levelSamples.length ? levelSamples : samples;
    const order = shuffledIndexes(selectedSamples.length);
    return Array.from({ length: Math.max(3, paragraphs * 2) }, (_, index) => ({ kind: 'copying', text: selectedSamples[order[index % order.length]] }));
  }
  if (type === 'copiado') {
    const levelSequences = copyingSequencePool(difficulty);
    const available = levelSequences.filter(index => index !== lastCopyingSequence);
    const sequenceIndex = available[randomInt(0, available.length - 1)] ?? 0;
    lastCopyingSequence = sequenceIndex;
    return copyingSequences[sequenceIndex].slice(0, paragraphs).map(text => ({ kind: 'copying', text }));
  }
  if (type === 'ortografia') {
    const pool = activityQuestionPool(spellingActivities, difficulty, type);
    const order = shuffledIndexes(pool.length);
    return Array.from({ length: count }, (_, index) => {
      const item = pool[order[index % order.length]];
      return { question: `${item[0]}: ${item[1]}`, answer: item[2] };
    });
  }
  if (type === 'logica') {
    const pool = activityQuestionPool(logicActivities, difficulty, type);
    const order = shuffledIndexes(pool.length);
    return Array.from({ length: count }, (_, index) => {
      const item = pool[order[index % order.length]];
      return { question: `Completa la serie: ${item[0]}`, answer: item[1] };
    });
  }
  if (practicalActivities[type]) {
    const pool = practicalActivitiesByDifficulty[difficultyTier(difficulty)]?.[type] || practicalActivities[type];
    const order = shuffledIndexes(pool.length);
    return Array.from({ length: count }, (_, index) => {
      const item = pool[order[index % order.length]];
      return { question: item[0], answer: item[1], ...(type === 'geometria' ? { figure: geometryFigureFor(item[0]) } : {}) };
    });
  }
  if (type === 'mixta' || type === 'diaria') {
    const mixedByDifficulty = {
      Inicial: [
      { question: 'Calcula: 7 + 8 =', answer: '15' },
      { question: 'Completa con b o v: La _icicleta es _erde.', answer: 'La bicicleta es verde.' },
      { question: 'Completa la serie: 3, 6, 9, 12, __', answer: '15' },
      { question: 'Escribe un sinónimo de “bonito”.', answer: 'Hermoso o bello.' },
      { question: '¿Cuántos lados tiene un triángulo?', answer: '3 lados.' },
      { question: 'Una entrada cuesta 4 € y pagas con 5 €. ¿Qué cambio recibes?', answer: '1 €.' },
      { question: '¿Qué hora será una hora después de las 10:30?', answer: 'Las 11:30.' },
      { question: 'Lee: “Marta plantó una semilla y la regó”. ¿Qué hizo Marta después de plantar?', answer: 'La regó.' },
      { question: '¿Cuántos centímetros hay en medio metro?', answer: '50 centímetros.' }
      ],
      Medio: [
        { question: 'Calcula: 248 + 376 =', answer: '624' },
        { question: 'Calcula: 805 − 267 =', answer: '538' },
        { question: 'Calcula: 24 × 13 =', answer: '312' },
        { question: 'Calcula: 864 ÷ 8 =', answer: '108' },
        { question: 'Completa la serie: 7, 12, 17, 22, __', answer: '27' },
        { question: 'Coloca las tildes: El camion llego al almacen.', answer: 'El camión llegó al almacén.' },
        { question: '¿Cuánto son 2 metros y 35 centímetros en centímetros?', answer: '235 centímetros.' },
        { question: '¿Qué fracción es mayor: 3/8 o 5/8?', answer: '5/8.' },
        { question: 'Una película empieza a las 16:35 y dura 50 minutos. ¿A qué hora termina?', answer: 'A las 17:25.' }
      ],
      Avanzado: [
        { question: 'Calcula: 4.875 + 2.968 =', answer: '7.843' },
        { question: 'Calcula: 8.002 − 3.756 =', answer: '4.246' },
        { question: 'Calcula: 236 × 48 =', answer: '11.328' },
        { question: 'Calcula: 9.576 ÷ 24 =', answer: '399' },
        { question: 'Completa la serie: 2, 6, 18, 54, __', answer: '162' },
        { question: 'Escribe el antónimo de “efímero”.', answer: 'Duradero o permanente.' },
        { question: '¿Cuánto son 3/4 de 120?', answer: '90.' },
        { question: 'Un artículo cuesta 48,50 € y tiene un descuento de 12,75 €. ¿Cuál es el precio final?', answer: '35,75 €.' },
        { question: 'Una excursión sale a las 8:45 y termina a las 13:20. ¿Cuánto dura?', answer: '4 horas y 35 minutos.' }
      ]
    };
    const mixed = mixedByDifficulty[difficultyTier(difficulty)];
    if (type === 'diaria') {
      const dailyOrder = shuffledIndexes(mixed.length);
      return dailyOrder.slice(0, 5).map(index => mixed[index]);
    }
    return Array.from({ length: Math.max(8, count) }, (_, index) => mixed[index % mixed.length]);
  }
  if (type === 'problemas') {
    const grade = difficultyIndex(difficulty);
    const operationOrder = shuffledIndexes(4).map(index => ['sumas', 'restas', 'multiplicaciones', 'divisiones'][index]);
    const people = ['Lucía', 'Mario', 'Sara', 'Leo', 'Amina', 'Hugo', 'Nora', 'Diego', 'Clara', 'Pablo', 'Irene', 'Mateo'];
    const objects = ['libros', 'lápices', 'pegatinas', 'cuadernos', 'semillas', 'tarjetas', 'piezas', 'cromos'];
    const feminineObjects = new Set(['pegatinas', 'semillas', 'tarjetas', 'piezas']);
    return Array.from({ length: count }, (_, index) => {
      const operation = operationOrder[index % operationOrder.length];
      const person = people[index % people.length];
      const object = objects[index % objects.length];
      const howMany = feminineObjects.has(object) ? 'Cuántas' : 'Cuántos';
      let first;
      let second;
      let question;
      let answer;
      if (operation === 'sumas') {
        const minimum = grade <= 1 ? 1 : grade <= 3 ? 10 : 100;
        const maximum = grade <= 1 ? 20 : grade <= 3 ? 999 : 9999;
        first = randomInt(minimum, maximum);
        second = randomInt(minimum, maximum);
        question = `${person} tenía ${first} ${object} y recibió ${second} más. ¿${howMany} ${object} tiene ahora?`;
        answer = first + second;
      } else if (operation === 'restas') {
        const minimum = grade <= 1 ? 2 : grade <= 3 ? 20 : 100;
        const maximum = grade <= 1 ? 20 : grade <= 3 ? 999 : 9999;
        first = randomInt(minimum, maximum);
        second = randomInt(1, first - 1);
        question = `En el aula había ${first} ${object}. Se utilizaron ${second}. ¿${howMany} ${object} quedan?`;
        answer = first - second;
      } else if (operation === 'multiplicaciones') {
        const firstRange = grade <= 1 ? [2, 10] : grade <= 3 ? [2, 20] : [12, 99];
        const secondRange = grade <= 1 ? [2, 5] : grade <= 3 ? [2, 12] : [10, 99];
        first = randomInt(firstRange[0], firstRange[1]);
        second = randomInt(secondRange[0], secondRange[1]);
        question = `Se prepararon ${first} cajas con ${second} ${object} en cada una. ¿Cuántos ${object} hay en total?`;
        answer = first * second;
      } else {
        const divisorRange = grade <= 1 ? [2, 5] : grade <= 3 ? [2, 12] : [11, 99];
        const quotientRange = grade <= 1 ? [2, 10] : grade <= 3 ? [10, 99] : [10, 99];
        second = randomInt(divisorRange[0], divisorRange[1]);
        answer = randomInt(quotientRange[0], quotientRange[1]);
        first = second * answer;
        question = `Se reparten ${first} ${object} por igual entre ${second} grupos. ¿Cuántos recibe cada grupo?`;
      }
      return { question, answer, operation };
    });
  }
  const people = ['Lucía', 'Mario', 'Sara', 'Leo', 'Amina', 'Hugo', 'Nora', 'Diego', 'Clara', 'Pablo', 'Irene', 'Mateo', 'Valeria', 'Álvaro', 'Marta', 'Elena', 'Bruno', 'Inés', 'Óscar', 'Sofía'];
  const objects = ['pegatinas', 'lápices', 'canicas', 'cromos', 'libros', 'rotuladores', 'cuadernos', 'cartas', 'piezas', 'semillas', 'botones', 'monedas', 'figuras', 'fotografías', 'globos', 'caracolas', 'tarjetas', 'pinceles', 'borradores', 'hojas'];
  const feminineObjects = new Set(['pegatinas', 'canicas', 'cartas', 'semillas', 'monedas', 'figuras', 'fotografías', 'caracolas', 'tarjetas', 'hojas']);
  return Array.from({ length: count }, (_, i) => {
    const first = i + 2;
    const second = i + 3;
    const person = people[i % people.length];
    const object = objects[i % objects.length];
    return { question: `${person} tiene ${first} cajas con ${second} ${object} en cada una. ¿Cuánt${feminineObjects.has(object) ? 'as' : 'os'} ${object} tiene en total?`, answer: first * second };
  });
}

const digitMarkup = value => `<span class="digit-value">${String(value).split('').map(digit => `<b>${digit}</b>`).join('')}</span>`;

const geometrySvg = figure => {
  const common = 'width="76" height="58" viewBox="0 0 76 58" aria-hidden="true" style="display:block;flex:0 0 76px"';
  const stroke = 'fill="none" stroke="#315c9b" stroke-width="2.4" stroke-linejoin="round"';
  const shapes = {
    triangle: `<polygon points="38,7 8,51 68,51" ${stroke}/>`,
    square: `<rect x="13" y="10" width="48" height="38" ${stroke}/>`,
    rectangle: `<rect x="6" y="16" width="64" height="27" ${stroke}/>`,
    circle: `<circle cx="38" cy="29" r="21" ${stroke}/><circle cx="38" cy="29" r="2.5" fill="#ef8e69"/>`,
    pentagon: `<polygon points="38,6 67,27 56,53 20,53 9,27" ${stroke}/>`,
    hexagon: `<polygon points="20,7 56,7 70,29 56,51 20,51 6,29" ${stroke}/>`,
    heptagon: `<polygon points="38,5 64,16 70,39 52,53 24,53 6,39 12,16" ${stroke}/>`,
    octagon: `<polygon points="22,5 54,5 70,21 70,37 54,53 22,53 6,37 6,21" ${stroke}/>`,
    angle: `<path d="M12 47 L12 14 M12 47 L62 47" ${stroke}/><path d="M12 33 A14 14 0 0 1 26 47" stroke="#ef8e69" stroke-width="2" fill="none"/>`,
    line: `<path d="M8 29 H68" stroke="#315c9b" stroke-width="2.4"/><path d="M8 20 V38 M68 20 V38" stroke="#ef8e69" stroke-width="2"/>`
  };
  return `<svg ${common}>${shapes[figure] || shapes.square}</svg>`;
};

function exerciseMarkup(config, item, index, solutions) {
  if (item.kind === 'copying') return `<article class="copying-sheet"><p class="copying-text">${item.text}</p></article>`;
  if (item.kind === 'reading') {
    const questions = item.questions.map((question, questionIndex) => `<div class="reading-question"><span>${questionIndex + 1}.</span><strong>${question}</strong>${solutions ? `<b>${item.answers[questionIndex]}</b>` : '<i aria-label="espacio para responder"></i>'}</div>`).join('');
    return `<article class="reading-sheet"><h3>${item.title}</h3><p class="reading-text">${item.text}</p><h4>Responde a las preguntas</h4>${questions}</article>`;
  }
  if (config.type === 'diaria') {
    const response = solutions
      ? `<font face="Arial,Helvetica,sans-serif" size="3"><b>${escapeHtml(item.answer)}</b></font>`
      : `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tbody>${Array.from({ length: 3 }, () => '<tr><td height="20" valign="bottom"><hr width="100%" size="1" color="#aeb6bf" noshade></td></tr>').join('')}</tbody></table>`;
    return `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td width="7%" valign="top"><font face="Arial,Helvetica,sans-serif" size="3" color="#315c9b"><b>${index + 1}.</b></font></td><td valign="top"><font face="Arial,Helvetica,sans-serif" size="3" color="#20283f">${escapeHtml(item.question)}</font></td></tr><tr><td>&nbsp;</td><td>${response}</td></tr><tr><td colspan="2" height="12">&nbsp;</td></tr></tbody></table>`;
  }
  if (config.type === 'geometria') return `<div class="geometry-exercise" style="display:flex;align-items:flex-start;gap:10px;min-height:118px;padding:10px 4px;break-inside:avoid;page-break-inside:avoid"><span style="font-size:11px;color:#6b7486;padding-top:3px;flex:0 0 18px">${index + 1}.</span>${geometrySvg(item.figure)}<div style="flex:1;font-size:15px;line-height:1.35"><strong style="display:block">${item.question}</strong>${solutions ? `<b style="display:block;margin-top:8px;color:#275fac">${item.answer}</b>` : '<span aria-label="espacio para responder" style="display:block;height:46px;margin-top:8px;background:repeating-linear-gradient(to bottom,#aeb6bf 0,#aeb6bf 1px,transparent 1px,transparent 17px,#aeb6bf 17px,#aeb6bf 18px,transparent 18px,transparent 24px)"></span>'}</div></div>`;
  const arithmetic = ['sumas', 'restas', 'multiplicaciones', 'divisiones'].includes(config.type);
  if (arithmetic) {
    if (config.type === 'divisiones') {
      const division = item.question.match(/^(\d+)\s+÷\s+(\d+)\s*=/);
      if (division) {
        const dividend = String(division[1]).split('').join('&nbsp;');
        const divisor = String(division[2]).split('').join('&nbsp;');
        const quotient = solutions ? `<span style="position:absolute;left:0;right:0;top:-22px;text-align:center;font-size:14px;font-weight:700">${item.answer}</span>` : '';
        return `<div class="division-exercise" style="display:flex;align-items:center;justify-content:center;min-height:76px;padding:10px 2px 16px;font:700 18px/1.2 Arial,Helvetica,sans-serif;color:#20283f;white-space:nowrap"><span style="display:block;min-width:42px;text-align:right;padding-right:8px;letter-spacing:1px">${dividend}</span><span style="position:relative;display:grid;grid-template-rows:26px 2px;min-width:46px;padding-left:8px;border-left:2px solid #20283f;text-align:center">${quotient}<span style="letter-spacing:1px">${divisor}</span><span style="display:block;width:100%;border-bottom:1.5px solid #20283f"></span></span></div>`;
      }
    }
    const threeTermMatch = item.question.match(/^(\d+)\s+([+−])\s+(\d+)\s+([+−])\s+(\d+)\s*=/);
    const digitMarkup = value => [...String(value)].map(digit => `<span style="display:inline-block;width:1ch;text-align:center">${digit}</span>`).join('');
    const numberRow = (operator, value) => `<tr><td width="20%" align="center" valign="middle" style="font:700 14pt 'Courier New',monospace">${operator || '&nbsp;'}</td><td width="80%" align="right" valign="middle" style="font:700 14pt 'Courier New',monospace"><span style="display:inline-flex;justify-content:flex-end">${digitMarkup(value)}</span></td></tr>`;
    const answerRows = solutions
      ? `<tr><td colspan="2" height="8mm" align="right" valign="middle" style="font:700 13pt Arial,Helvetica,sans-serif;padding-right:2mm;color:#20283f">${item.answer}</td></tr>`
      : config.type === 'multiplicaciones'
        ? Array.from({ length: 3 }, () => '<tr><td colspan="2" height="25" align="center" valign="bottom"><hr width="100%" size="1" color="#c4cbd4" noshade></td></tr>').join('')
        : '';
    const operationRows = threeTermMatch
      ? `${numberRow('', threeTermMatch[1])}${numberRow(threeTermMatch[2], threeTermMatch[3])}${numberRow(threeTermMatch[4], threeTermMatch[5])}`
      : (() => {
        const match = item.question.match(/^(\d+)\s+([+−×÷])\s+(\d+)\s*=/);
        return match ? `${numberRow('', match[1])}${numberRow(match[2], match[3])}` : '';
      })();
    if (operationRows) return `<table role="presentation" width="120" align="center" border="0" cellspacing="0" cellpadding="0"><tbody>${operationRows}<tr><td colspan="2" align="center"><hr width="100%" size="1" color="#20283f" noshade></td></tr>${answerRows}</tbody></table>`;
  }
  const responseRows = config.type === 'problemas' ? 6 : 3;
  const answerSpace = solutions
    ? `<b>${item.answer}</b>`
    : `<div class="answer-lines" aria-label="espacio para responder" style="grid-column:2;display:grid;grid-template-rows:repeat(${responseRows},22px);gap:4px;width:100%;height:${responseRows * 22 + (responseRows - 1) * 4}px">${Array.from({ length: responseRows }, () => '<i></i>').join('')}</div>`;
  return `<div class="print-row text-exercise" style="grid-template-rows:auto auto;min-height:110px;align-items:start"><span class="number">${index + 1}.</span><strong>${item.question}</strong>${answerSpace}</div>`;
}

function printableHtml(config, items, solutions) {
  const name = config.student.trim();
  const title = labels[config.type];
  const arithmetic = ['sumas', 'restas', 'multiplicaciones', 'divisiones'].includes(config.type);
  const rows = items.map((item, index) => exerciseMarkup(config, item, index, solutions)).join('');
  const guideIsCopying = config.type === 'copiado';
  const simpleWritingGuide = ['copiado', 'caligrafia'].includes(config.type) ? `<section class="copying-final-guide" style="display:block;break-inside:avoid;page-break-inside:avoid;width:180mm;margin:7mm auto 0"><h3 style="font-size:14px;margin:0 0 7px;color:#697772">Escribe el texto</h3><svg role="img" aria-label="Pauta de renglones con dos líneas grises por renglón" viewBox="0 0 1000 360" preserveAspectRatio="none" style="display:block;width:100%;height:95mm">${Array.from({ length: 10 }, (_, index) => `<line x1="8" y1="${10 + index * 35}" x2="992" y2="${10 + index * 35}" stroke="#aeb6bf" stroke-width="2"/><line x1="8" y1="${28 + index * 35}" x2="992" y2="${28 + index * 35}" stroke="#aeb6bf" stroke-width="2"/>`).join('')}</svg></section>` : '';
  const worksheetHeader = `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0"><tbody><tr><td width="12%" align="left" valign="middle"><font face="Arial,Helvetica,sans-serif" size="2">Nombre:</font></td><td width="65%" align="left" valign="bottom"><font face="Arial,Helvetica,sans-serif" size="2">${name ? escapeHtml(name) : '&nbsp;'}</font><hr width="100%" size="1" color="#20283f" noshade></td><td width="8%" align="right" valign="middle"><font face="Arial,Helvetica,sans-serif" size="2">Fecha:</font></td><td width="15%" align="left" valign="bottom"><hr width="100%" size="1" color="#20283f" noshade></td></tr></tbody></table>`;
  let worksheetContent;
  if (arithmetic) {
    const cellsPerRow = config.type === 'divisiones' ? 3 : 4;
    const cellWidth = 100 / cellsPerRow;
    const operationRows = [];
    const rowHeightMm = Math.min(90, Math.floor(230 / Math.ceil(items.length / cellsPerRow)));
    const rowHeightPx = Math.round(rowHeightMm * 96 / 25.4);
    for (let start = 0; start < items.length; start += cellsPerRow) {
      const cells = items.slice(start, start + cellsPerRow).map((item, offset) => `<td width="${cellWidth}%" height="${rowHeightPx}" align="center" valign="middle" style="height:${rowHeightPx}px;padding:1mm 2mm">${exerciseMarkup(config, item, start + offset, solutions)}</td>`);
      while (cells.length < cellsPerRow) cells.push(`<td width="${cellWidth}%" height="${rowHeightPx}" style="height:${rowHeightPx}px">&nbsp;</td>`);
      operationRows.push(`<tr>${cells.join('')}</tr>`);
    }
    worksheetContent = `<table role="presentation" width="100%" border="0" cellspacing="0" cellpadding="0" style="table-layout:fixed;border-collapse:collapse"><tbody><tr><td colspan="${cellsPerRow}" height="45">&nbsp;</td></tr>${operationRows.join('')}</tbody></table>`;
  } else {
    worksheetContent = `<div class="exercise-grid text-grid">${rows}</div>${simpleWritingGuide}`;
  }
  return `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; base-uri 'none'; form-action 'none'; style-src 'unsafe-inline'"><title>${escapeHtml(title)} · FichasFacil</title><style>
*{box-sizing:border-box}html{background:#fff}body{font-family:ui-rounded,'Arial Rounded MT Bold','Trebuchet MS',Arial,sans-serif;color:#20283f;margin:0;padding:20mm 15mm;width:210mm;min-height:297mm;background:#fff;-webkit-print-color-adjust:exact;print-color-adjust:exact}h1{text-align:center;font-size:28px;margin:0 0 14px;color:#20283f}h2{text-align:center;font-size:14px;font-weight:normal;margin:0 0 18px;color:#697772}.worksheet-header{display:flex;justify-content:flex-start;gap:30px;border-bottom:1.5px solid #20283f;padding-bottom:11px;margin-bottom:24px;font-size:13px;font-weight:700}.worksheet-header span{display:inline-block;min-width:145px;border-bottom:1px solid #20283f;margin-left:6px;height:16px}.exercise-grid{display:grid;gap:15px 20px}.math-grid{grid-template-columns:repeat(4,minmax(0,1fr))}.text-grid{grid-template-columns:1fr}.print-row{break-inside:avoid;page-break-inside:avoid}.arithmetic{display:flex;align-items:flex-start;gap:5px;min-height:102px;padding:4px 2px}.print-row .number{font-size:11px;color:#6b7486;padding-top:3px}.operation{width:100%;font-size:22px;font-weight:700;line-height:1.05}.top-number,.extra-number{text-align:right;padding-right:5px;letter-spacing:5px;min-height:28px}.bottom-number{display:grid;grid-template-columns:1fr auto;gap:6px;text-align:right;padding-right:5px}.bottom-number span:first-child{text-align:left;font-weight:400}.operation-rule{border-bottom:1.5px solid #20283f;margin-top:4px}.answer-space{height:28px;border-bottom:1px solid #7f8998}.solution{font-size:20px;text-align:right;color:#ef8e69;padding:6px 5px 0}.text-exercise{display:grid;grid-template-columns:25px 1fr;grid-template-rows:auto 25px;align-items:end;gap:5px 7px;min-height:78px;padding:8px 4px;border-bottom:1px solid #e4ebe5}.text-exercise strong{font-size:19px;line-height:1.25}.text-exercise i{display:block;border-bottom:1.5px solid #82958b;height:22px}.text-exercise b{font-size:20px;color:#ef8e69;grid-column:2}.copying-sheet{break-inside:avoid;page-break-inside:avoid;margin:0 auto 9mm;max-width:180mm}.copying-text{font-size:17px;line-height:1.55;margin:0}.copying-final-guide{break-inside:avoid;page-break-inside:avoid;max-width:180mm;margin:7mm auto 0}.copying-final-guide h3{font-size:14px;margin:0 0 7px;color:#697772}.lamela-guide{height:108mm;border-top:1.2px solid #647b9b}.lamela-guide span,.lamela-guide div{display:block;height:9mm;border-bottom:1px solid #9aaabd}.lamela-line-0{border-bottom:1.2px solid #7890af!important}.lamela-line-1{border-bottom:1px dashed #b7c4d2!important}.lamela-line-2{border-bottom:1.2px solid #ef9b9b!important}.foot{position:fixed;bottom:8mm;font-size:10px;color:#89958f}@page{size:A4;margin:0}@media print{body{padding:13mm 12mm}.exercise-grid{gap:13px 18px}}@media(max-width:650px){body{padding:18px 14px;max-width:none;min-height:0;overflow-x:hidden}h1{font-size:24px}.worksheet-header{font-size:11px;gap:12px}.worksheet-header span{min-width:90px}.math-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 20px}.arithmetic{min-height:105px}.operation{font-size:22px}}</style></head><body><h1 align="center"><font face="Arial,Helvetica,sans-serif" size="4">${title}</font></h1>${worksheetHeader}${worksheetContent}</body></html>`;
}

const readConfig = () => ({ type: activity.value, level: '', difficulty: document.querySelector('#difficulty').value, count: Number(document.querySelector('#count').value), operands: Number(document.querySelector('#operands').value), firstDigits: document.querySelector('#firstDigits').value, secondDigits: document.querySelector('#secondDigits').value, paragraphs: Number(document.querySelector('#paragraphs').value), calligraphyMode: document.querySelector('#calligraphyMode').value, carryMode: document.querySelector('#carryMode').value, tableNumber: document.querySelector('#tableNumber').value, specificDivisor: document.querySelector('#specificDivisor').value, divisionMode: document.querySelector('#divisionMode').value, student: document.querySelector('#student').value.trim(), solutions: document.querySelector('#solutions')?.checked });

const shareUrl = config => {
  const url = new URL(window.location.href);
  url.hash = 'actividades';
  url.search = new URLSearchParams({ actividad: config.type, dificultad: config.difficulty, ejercicios: String(config.count), numeros: String(config.operands), cifras1: config.firstDigits, cifras2: config.secondDigits, parrafos: String(config.paragraphs), caligrafia: config.calligraphyMode, llevadas: config.carryMode, tabla: config.tableNumber, divisor: config.specificDivisor, resto: config.divisionMode, ...(config.solutions ? { soluciones: '1' } : {}) }).toString();
  return url.toString();
};

function downloadPdf(config, items, solutions = false) {
  const PdfDocument = window.jspdf?.jsPDF;
  if (!PdfDocument) return false;
  const doc = new PdfDocument({ unit: 'mm', format: 'a4' });
  const margin = 15;
  const pageWidth = 210;
  const pageHeight = 297;
  let y = 17;
  doc.setTextColor(32, 40, 63);
  const mathTypes = ['sumas', 'restas', 'multiplicaciones', 'divisiones'];
  const isMath = mathTypes.includes(config.type);
  const mathTitle = config.type === 'restas' && config.carryMode === 'no'
    ? 'Restas sin llevadas'
    : config.type === 'restas' && config.carryMode === 'yes'
      ? 'Restas con llevadas'
      : labels[config.type];
  doc.setProperties({
    title: `${mathTitle} · FichasFacil`,
    subject: 'Ficha educativa imprimible en A4',
    author: 'FichasFacil',
    creator: 'FichasFacil'
  });
  const drawHeader = title => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nombre:', margin, 17);
    doc.line(margin + 16, 17.5, 135, 17.5);
    doc.text('Fecha:', 166, 17);
    doc.line(180, 17.5, pageWidth - margin, 17.5);
    doc.setTextColor(32, 40, 63);
    doc.setFontSize(15);
    doc.text(title, pageWidth / 2, 32, { align: 'center' });
    y = 48;
  };
  const drawMathOperation = (item, x, topY) => {
    const division = item.question.match(/^(\d+)\s+÷\s+(\d+)\s*=/);
    const operation = item.question.match(/^(\d+)\s+([+−×])\s+(\d+)(?:\s+([+−])\s+(\d+))?\s*=/);
    doc.setFont('courier', 'normal');
    doc.setFontSize(12);
    if (division) {
      doc.text(division[1], x - 9, topY, { align: 'right' });
      doc.line(x + 2, topY - 7, x + 30, topY - 7);
      doc.line(x + 2, topY - 7, x + 2, topY + 5);
      doc.text(division[2], x + 16, topY, { align: 'center' });
      if (solutions) doc.text(String(item.answer), x + 16, topY + 13, { align: 'center' });
      return;
    }
    if (!operation) return;
    const first = operation[1];
    const second = operation[3];
    const operator = operation[2] === '−' ? '-' : operation[2] === '×' ? 'x' : operation[2];
    const third = operation[5];
    const numberWidth = Math.max(doc.getTextWidth(first), doc.getTextWidth(second), third ? doc.getTextWidth(third) : 0);
    const numberRight = x + numberWidth / 2 + 2;
    const operatorX = x - numberWidth / 2 - 2;
    doc.text(first, numberRight, topY, { align: 'right' });
    doc.text(operator, operatorX, topY + 7, { align: 'center' });
    doc.text(second, numberRight, topY + 7, { align: 'right' });
    let lineY = topY + 9;
    if (third) {
      doc.text(operation[4], operatorX, topY + 14, { align: 'center' });
      doc.text(third, numberRight, topY + 14, { align: 'right' });
      lineY = topY + 16;
    }
    doc.line(operatorX - 3, lineY, numberRight + 1, lineY);
    if (solutions) doc.text(String(item.answer), numberRight, lineY + 8, { align: 'right' });
  };
  const drawGeometryFigure = (figure, x, topY) => {
    doc.setDrawColor(49, 92, 155);
    doc.setLineWidth(0.8);
    if (figure === 'circle') {
      doc.circle(x, topY + 9, 9);
      doc.setFillColor(239, 142, 105);
      doc.circle(x, topY + 9, 1.2, 'F');
    } else if (figure === 'triangle') {
      doc.line(x, topY, x - 10, topY + 17);
      doc.line(x - 10, topY + 17, x + 10, topY + 17);
      doc.line(x + 10, topY + 17, x, topY);
    } else if (figure === 'rectangle') {
      doc.rect(x - 12, topY + 3, 24, 12);
    } else if (figure === 'pentagon' || figure === 'hexagon' || figure === 'heptagon' || figure === 'octagon') {
      const sides = figure === 'pentagon' ? 5 : figure === 'hexagon' ? 6 : figure === 'heptagon' ? 7 : 8;
      const points = Array.from({ length: sides }, (_, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / sides;
        return [x + Math.cos(angle) * 10, topY + 9 + Math.sin(angle) * 10];
      });
      points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        doc.line(point[0], point[1], next[0], next[1]);
      });
    } else if (figure === 'angle') {
      doc.line(x - 10, topY + 16, x - 10, topY);
      doc.line(x - 10, topY + 16, x + 11, topY + 16);
      doc.setDrawColor(239, 142, 105);
      doc.arc?.(x - 10, topY + 16, 6, 270, 360);
    } else if (figure === 'line') {
      doc.line(x - 12, topY + 14, x + 12, topY + 14);
      doc.circle(x - 12, topY + 14, 1, 'F');
      doc.circle(x + 12, topY + 14, 1, 'F');
    } else {
      doc.rect(x - 9, topY, 18, 18);
    }
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
  };
  const ensureSpace = height => {
    if (y + height <= pageHeight - margin) return;
    doc.addPage();
    y = margin;
  };
  const write = (text, size = 11, options = {}) => {
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(text), pageWidth - margin * 2);
    const lineHeight = size * 0.48 + 2;
    ensureSpace(lines.length * lineHeight + (options.gap ?? 2));
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + (options.gap ?? 2);
  };
  const writeAnswerLines = (count = 3) => {
    ensureSpace(count * 10 + 8);
    for (let row = 0; row < count; row += 1) {
      doc.setDrawColor(174, 182, 191);
      doc.line(margin + 4, y, pageWidth - margin - 4, y);
      doc.line(margin + 4, y + 6, pageWidth - margin - 4, y + 6);
      y += 8;
    }
    doc.setDrawColor(0, 0, 0);
    y += 3;
  };
  const writeWritingGuide = () => {
    const lineCount = 10;
    const spacing = 9;
    const rowHeight = 7;
    ensureSpace(12 + lineCount * spacing + 6);
    write('Escribe el texto', 12, { bold: true, gap: 3 });
    doc.setDrawColor(174, 182, 191);
    doc.setLineWidth(0.35);
    for (let row = 0; row < lineCount; row += 1) {
      const lineY = y + row * spacing;
      doc.line(margin + 4, lineY, pageWidth - margin - 4, lineY);
      doc.line(margin + 4, lineY + rowHeight, pageWidth - margin - 4, lineY + rowHeight);
    }
    doc.setLineWidth(0.2);
    y += lineCount * spacing + 6;
  };
  if (isMath) {
    drawHeader(mathTitle);
    if (config.type === 'divisiones') {
      const columns = 3;
      const columnWidth = (pageWidth - margin * 2) / columns;
      const startY = 55;
      const rowHeight = 54;
      items.forEach((item, index) => {
        if (index > 0 && index % 10 === 0) {
          doc.addPage();
          drawHeader(mathTitle);
        }
        const localIndex = index % 10;
        const column = localIndex % columns;
        const row = Math.floor(localIndex / columns);
        drawMathOperation(item, margin + columnWidth * (column + 0.5), startY + row * rowHeight);
      });
    } else {
      const columns = 4;
      const columnWidth = (pageWidth - margin * 2) / columns;
      const startY = 55;
      const rowHeight = 43;
      items.forEach((item, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        drawMathOperation(item, margin + columnWidth * (column + 0.5), startY + row * rowHeight);
      });
    }
  } else {
    drawHeader(labels[config.type]);
    items.forEach((item, index) => {
    if (config.type === 'geometria') {
      const questionLines = doc.splitTextToSize(`${index + 1}. ${item.question}`, pageWidth - margin * 2 - 34);
      ensureSpace(42);
      drawGeometryFigure(item.figure, margin + 12, y + 2);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(questionLines, margin + 30, y + 5);
      y += questionLines.length * 6 + 8;
      if (solutions) {
        const answerLines = doc.splitTextToSize(`Respuesta: ${item.answer}`, pageWidth - margin * 2 - 34);
        ensureSpace(answerLines.length * 5 + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(39, 95, 172);
        doc.text(answerLines, margin + 30, y);
        doc.setTextColor(32, 40, 63);
        y += answerLines.length * 5 + 5;
      } else writeAnswerLines(2);
      return;
    }
    if (item.kind === 'reading') {
      write(item.title, 14, { bold: true, gap: 3 });
      write(item.text, 11, { gap: 5 });
      item.questions.forEach((question, questionIndex) => {
        write(`${questionIndex + 1}. ${question}`, 11, { bold: true, gap: 2 });
        if (solutions) write(`Respuesta: ${item.answers[questionIndex]}`, 10, { gap: 5 });
        else writeAnswerLines(3);
      });
      return;
    }
    if (item.kind === 'copying') {
      write(`${index + 1}. ${item.text}`, 12, { bold: true, gap: 4 });
      if (solutions) write(`Respuesta: ${item.answer || item.text}`, 10, { gap: 4 });
      return;
    }
    const answerLineCount = config.type === 'problemas' ? 6 : 3;
    if (!solutions) {
      const questionLines = doc.splitTextToSize(`${index + 1}. ${item.question}`, pageWidth - margin * 2);
      const questionHeight = questionLines.length * (12 * 0.48 + 2) + 3;
      ensureSpace(Math.max(questionHeight + answerLineCount * 10 + 15, config.type === 'problemas' ? 70 : 0));
    }
    write(`${index + 1}. ${item.question}`, 12, { bold: true, gap: 3 });
    if (solutions) write(`Respuesta: ${item.answer}`, 10, { gap: 5 });
    else writeAnswerLines(answerLineCount);
    });
    if (!solutions && ['copiado', 'caligrafia'].includes(config.type)) writeWritingGuide();
  }
  const footerPages = doc.getNumberOfPages();
  for (let page = 1; page <= footerPages; page += 1) {
    doc.setPage(page);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(137, 149, 143);
    const logoX = pageWidth / 2 - 17;
    const logoY = pageHeight - 14;
    doc.setFillColor(32, 56, 95);
    doc.roundedRect(logoX, logoY, 6, 6, 1.4, 1.4, 'F');
    doc.setFillColor(244, 201, 28);
    doc.roundedRect(logoX + 1, logoY + 1, 1.6, 1.6, 0.35, 0.35, 'F');
    doc.setFillColor(237, 126, 53);
    doc.roundedRect(logoX + 3.4, logoY + 1, 1.6, 1.6, 0.35, 0.35, 'F');
    doc.setFillColor(126, 185, 255);
    doc.roundedRect(logoX + 1, logoY + 3.4, 1.6, 1.6, 0.35, 0.35, 'F');
    doc.setFillColor(139, 209, 170);
    doc.roundedRect(logoX + 3.4, logoY + 3.4, 1.6, 1.6, 0.35, 0.35, 'F');
    doc.setTextColor(32, 56, 95);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('FichasFácil', logoX + 8, logoY + 4.2);
  }
  const fileSuffix = solutions ? '-soluciones' : '';
  doc.save(`FichasFacil-${labels[config.type].toLowerCase().replaceAll(' ', '-')}${fileSuffix}.pdf`);
  return true;
}

function isMobileDevice() {
  return window.matchMedia?.('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

function notifyTelegram(config) {
  const payload = {
    activity: labels[config.type],
    difficulty: config.difficulty,
    count: config.count
  };
  fetch('/api/telegram-notify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true
  }).catch(() => {});
}

function createSheets(config) {
  const items = makeContent(config.type, config.count, config.difficulty, config.level, config.operands, config.firstDigits, config.secondDigits, config.paragraphs, config);
  const simpleMath = ['sumas', 'restas', 'multiplicaciones', 'divisiones'].includes(config.type);
  const textStyles = '.text-exercise i{grid-column:2;width:100%}.text-exercise strong{font-size:17px;line-height:1.35}.reading-sheet{max-width:180mm;margin:0 auto}.reading-sheet h3{font-size:24px;margin:0 0 14px}.reading-text{font-size:16px;line-height:1.55;margin:0 0 20px}.reading-sheet h4{font-size:14px;margin:0 0 10px}.reading-question{display:grid;grid-template-columns:22px 1fr;gap:5px 7px;min-height:78px;align-items:start;margin-bottom:9px;break-inside:avoid;page-break-inside:avoid}.reading-question span{font-weight:700}.reading-question strong{font-size:15px;line-height:1.35}.reading-question i{grid-column:2;height:48px;border-bottom:1px solid #82958b;background:repeating-linear-gradient(to bottom,transparent 0,transparent 22px,#d9e2ea 22px,#d9e2ea 23px)}.reading-question b{grid-column:2;color:#275fac}.copying-sheet{break-inside:avoid;page-break-inside:avoid;margin:0 auto 9mm;max-width:180mm}.copying-text{font-size:17px;line-height:1.55;margin:0}.copying-final-guide{break-inside:avoid;page-break-inside:avoid;max-width:180mm;margin:7mm auto 0}.copying-final-guide h3{font-size:14px;margin:0 0 7px;color:#697772}.lamela-guide{height:108mm;border-top:1.2px solid #647b9b}.lamela-guide span{display:block;height:9mm;border-bottom:1px solid #9aaabd}.lamela-line-0{border-bottom:1.2px solid #7890af!important}.lamela-line-1{border-bottom:1px dashed #b7c4d2!important}.lamela-line-2{border-bottom:1.2px solid #ef9b9b!important}';
  const printPolish = '<style>html,body{width:210mm!important;min-width:210mm!important;max-width:210mm!important}body{font-family:ui-rounded,"Arial Rounded MT Bold","Trebuchet MS",Arial,sans-serif!important;color:#20283f!important;background:#fff!important;padding:13mm 12mm!important;overflow:visible!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}h1{text-align:center!important;font-size:15px!important;font-weight:700!important;line-height:1.2!important;color:#20283f!important;margin:0 0 19px!important}.worksheet-header{display:flex!important;justify-content:space-between!important;gap:20px!important;margin-bottom:24px!important;padding:0 8px!important;border:0!important;font-size:10px!important;font-weight:700!important}.worksheet-header>div:first-child{flex:1}.worksheet-header>div:last-child{min-width:72px}.worksheet-header span{min-width:100px;height:13px}.worksheet-header>div:last-child span{min-width:62px}.math-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(5,minmax(0,1fr))!important;gap:0 22px!important;min-height:246mm!important;padding:0 2mm!important}.math-grid .arithmetic{width:100%!important;min-height:0!important;justify-content:center!important;align-items:center!important;padding:0!important}.math-grid .operation{display:block!important;flex:0 0 116px!important;width:116px!important;min-width:116px!important;max-width:116px!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;font-size:17px!important;line-height:1.15!important}.math-grid .digit-value{display:inline-flex!important;gap:3px!important;letter-spacing:0!important}.math-grid .digit-value b{letter-spacing:0!important}.math-grid .top-number,.math-grid .extra-number{padding-right:0!important;letter-spacing:0!important;min-height:23px!important;white-space:nowrap!important}.math-grid .bottom-number{grid-template-columns:18px 1fr!important;gap:0!important;padding-right:0!important;letter-spacing:0!important;line-height:1.15!important;white-space:nowrap!important}.math-grid .bottom-number .operator{text-align:center!important;letter-spacing:0!important}.math-grid .bottom-number .digit-value{justify-self:end!important}.math-grid .operation-rule{display:block!important;width:116px!important;max-width:116px!important;margin-top:5px!important}.math-grid .answer-space{display:none!important}@media print{h1{letter-spacing:-.02em}.worksheet-header{break-inside:avoid;page-break-inside:avoid}.text-exercise,.reading-question{break-inside:avoid;page-break-inside:avoid}.reading-sheet{break-inside:avoid;page-break-inside:avoid}.copying-sheet{break-inside:avoid;page-break-inside:avoid}p,h1,h2,h3,h4{orphans:3;widows:3}}</style>';
  const screenLayout = '<style>body{width:210mm!important;min-width:210mm!important;max-width:210mm!important;padding:13mm 12mm!important;overflow:visible!important}.worksheet-header{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:18px!important}.worksheet-header>div:first-child{flex:1}.worksheet-header>div{white-space:nowrap!important}.worksheet-header strong{color:#315c9b!important}.math-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(5,minmax(0,1fr))!important;gap:0 22px!important;min-height:246mm!important;align-items:center!important}.math-grid .arithmetic{min-height:0!important;justify-content:center!important}.math-grid .operation{display:block!important;flex:0 0 116px!important;width:116px!important;min-width:116px!important;max-width:116px!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;font-size:17px!important;line-height:1.15!important}.math-grid .extra-number{display:grid!important;grid-template-columns:18px 1fr!important;gap:0!important;white-space:nowrap!important}.math-grid .extra-number .operator{text-align:center!important}.math-grid .extra-number .digit-value{justify-self:end!important}.math-grid .print-row .number{display:none!important}.math-grid .answer-space{display:block!important;height:20px!important;border-bottom:1px solid #9aaabd!important}@media(max-width:650px){body{padding:18px 14px!important}.math-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0 22px!important}}</style>';
  const finalPdfLayout = '<style>.math-grid{min-height:198mm!important}</style>';
  const writingGuideLayout = '<style>.text-exercise i{height:18px!important;border:0!important;border-top:1px solid #aeb6bf!important;border-bottom:1px solid #aeb6bf!important;background:none!important}.reading-question i{height:48px!important;border:0!important;background:repeating-linear-gradient(to bottom,#aeb6bf 0,#aeb6bf 1px,transparent 1px,transparent 18px,#aeb6bf 18px,#aeb6bf 19px,transparent 19px,transparent 24px)!important}</style>';
  const preparePrint = html => {
    const inlineLayout = html
      .replace('<body>', '<body style="margin:0;background:#fff;color:#20283f;font-family:Arial,Helvetica,sans-serif;width:210mm;min-height:297mm;padding:13mm 12mm;box-sizing:border-box;overflow:visible;-webkit-print-color-adjust:exact;print-color-adjust:exact">')
      .replace(/<h1>/, '<h1 style="display:block;text-align:center;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.2;font-weight:700;color:#20283f;margin:0 0 19px">')
      .replace(/<div class="worksheet-header">/, '<div class="worksheet-header" style="display:flex;align-items:flex-end;justify-content:space-between;gap:18px;margin:0 0 24px;padding:0 8px;font:700 10px Arial,Helvetica,sans-serif;white-space:nowrap">')
      .replace(/<div class="exercise-grid math-grid">/, '<div class="exercise-grid math-grid" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(5,minmax(0,1fr));gap:0 22px;min-height:198mm;align-items:center">')
      .replaceAll('class="print-row arithmetic arithmetic-three"', 'class="print-row arithmetic arithmetic-three" style="display:flex;align-items:center;justify-content:center;min-height:0;padding:0;break-inside:avoid"')
      .replaceAll('class="print-row arithmetic"', 'class="print-row arithmetic" style="display:flex;align-items:center;justify-content:center;min-height:0;padding:0;break-inside:avoid"')
      .replaceAll('class="operation"', 'class="operation" style="display:block;flex:0 0 116px;width:116px;min-width:116px;max-width:116px;font:700 17px/1.15 ui-monospace,SFMono-Regular,Menlo,monospace"')
      .replaceAll('class="top-number"', 'class="top-number" style="text-align:right;min-height:23px;white-space:nowrap"')
      .replaceAll('class="extra-number"', 'class="extra-number" style="display:grid;grid-template-columns:18px 1fr;gap:0;min-height:23px;white-space:nowrap"')
      .replaceAll('class="bottom-number"', 'class="bottom-number" style="display:grid;grid-template-columns:18px 1fr;gap:0;line-height:1.15;white-space:nowrap"')
      .replaceAll('class="operation-rule"', 'class="operation-rule" style="width:116px;border-bottom:1.5px solid #20283f;margin-top:5px"')
      .replaceAll('class="answer-space"', 'class="answer-space" style="display:block;height:20px;border-bottom:1px solid #9aaabd"');
    return inlineLayout
    .replace('</body>', '<div role="img" aria-label="FichasFácil" style="position:fixed!important;left:0!important;right:0!important;top:auto!important;bottom:7mm!important;width:100%!important;z-index:1000;display:flex;align-items:center;justify-content:center;gap:2mm;color:#20385f;font:700 9px Arial,sans-serif"><svg aria-hidden="true" width="6mm" height="6mm" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#20385f"/><rect x="10" y="10" width="19" height="19" rx="5" fill="#f4c91c"/><rect x="35" y="10" width="19" height="19" rx="5" fill="#ed7e35"/><rect x="10" y="35" width="19" height="19" rx="5" fill="#7eb9ff"/><rect x="35" y="35" width="19" height="19" rx="5" fill="#8bd1aa"/></svg><span>FichasFácil</span></div></body>')
    .replace('<style>', `<style>@page{size:A4;margin:0}${simpleMath ? 'h1{display:block!important;font-size:15px;letter-spacing:0;margin:0 0 19px}.worksheet-header{display:flex!important;justify-content:space-between;gap:20px;margin-bottom:24px;padding:0 8px;border:0;font-size:10px}.worksheet-header>div:first-child{flex:1}.worksheet-header>div:last-child{min-width:72px}.worksheet-header span{min-width:100px;height:13px}.worksheet-header>div:last-child span{min-width:62px}.math-grid{grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(5,minmax(0,1fr));gap:0 22px;min-height:246mm;align-items:center;padding:0 2mm}.arithmetic{width:100%;min-height:0;justify-content:center;align-items:center;padding:0}.arithmetic-three .operation{min-height:54px}.print-row .number{display:none}.arithmetic .operation{display:block!important;flex:0 0 116px!important;width:116px!important;min-width:116px!important;max-width:116px!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:17px;line-height:1.15}.digit-value{display:inline-flex;gap:3px;letter-spacing:0}.digit-value b{letter-spacing:0}.top-number,.extra-number{padding-right:0;letter-spacing:0;font-variant-numeric:tabular-nums;white-space:nowrap;min-height:23px}.bottom-number{grid-template-columns:18px 1fr;gap:0;padding-right:0;letter-spacing:0;font-variant-numeric:tabular-nums;white-space:nowrap;line-height:1.15}.bottom-number .operator{text-align:center;letter-spacing:0}.bottom-number .digit-value{justify-self:end}.arithmetic .operation-rule{display:block!important;width:116px!important;max-width:116px!important;margin-top:5px}.answer-space{display:none}' : textStyles}`)
    .replaceAll('@media(max-width:650px)', simpleMath ? '@media print and (max-width:0px)' : '@media screen and (max-width:650px)')
    .replace('</head>', `${printPolish}${screenLayout}${finalPdfLayout}${writingGuideLayout}</head>`);
  };
  const worksheet = preparePrint(printableHtml(config, items, false));
  const answerSheet = preparePrint(printableHtml(config, items, true));
  const print = html => {
    const frame = document.createElement('iframe');
    frame.title = 'Ficha preparada para imprimir';
    frame.setAttribute('aria-hidden', 'true');
    frame.tabIndex = -1;
    frame.style.cssText = 'position:fixed;inset:0;z-index:2147483647;width:100%;height:100%;border:0;background:#fff;';
    let printed = false;
    const removeFrame = () => { if (frame.isConnected) frame.remove(); };
    const printFrame = () => {
      if (printed) return;
      const printWindow = frame.contentWindow;
      if (!printWindow) { removeFrame(); return; }
      printed = true;
      printWindow.addEventListener('afterprint', removeFrame, { once: true });
      printWindow.focus();
      printWindow.print();
      setTimeout(removeFrame, 300000);
    };
    try {
      frame.addEventListener('load', () => setTimeout(printFrame, 250), { once: true });
      frame.srcdoc = html;
      document.body.appendChild(frame);
      setTimeout(printFrame, 1500);
      return true;
    } catch (error) {
      removeFrame();
      return false;
    }
  };
  return { worksheet, answerSheet, print, items };
}

document.querySelector('#share-direct').addEventListener('click', async () => {
  const config = readConfig();
  const shareText = `He preparado una ficha de ${labels[config.type]} con FichasFacil.`;
  const shareData = { title: `${labels[config.type]} · FichasFacil`, text: shareText, url: shareUrl(config) };
  const shareButton = document.querySelector('#share-direct');
  shareButton.disabled = true;
  const fallbackMarkup = (message, linkLabel = 'Abrir enlace') => `<div class="success-box"><strong>Enlace listo para compartir</strong><span class="print-hint">${message}</span><a class="share-url" href="${escapeHtml(shareData.url)}">${linkLabel}</a></div>`;
  try {
    if (navigator.share) await navigator.share(shareData);
    else if (navigator.clipboard) { await navigator.clipboard.writeText(`${shareText} ${shareData.url}`); result.innerHTML = fallbackMarkup('Hemos copiado el enlace con la configuración de esta ficha. También puedes abrirlo o copiarlo manualmente.'); }
    else result.innerHTML = fallbackMarkup('Copia o abre este enlace para compartir la configuración.');
  } catch (error) {
    if (error.name === 'AbortError') result.innerHTML = fallbackMarkup('Has cancelado la ventana de compartir. Puedes abrir el enlace directamente.');
    else result.innerHTML = fallbackMarkup('El navegador no permite compartir automáticamente. Puedes abrir el enlace directamente.');
  }
  finally { shareButton.disabled = false; }
});

form.addEventListener('submit', event => {
  event.preventDefault();
  const submitButton = document.querySelector('#print-direct');
  submitButton.disabled = true;
  const config = readConfig();
  form.setAttribute('aria-busy', 'true');
  const { worksheet, answerSheet, print, items } = createSheets(config);
  const mobile = isMobileDevice();
  const printed = mobile ? downloadPdf(config, items) : print(worksheet);
  setTimeout(() => { submitButton.disabled = false; form.setAttribute('aria-busy', 'false'); }, 500);
  const contentSummary = config.type === 'diaria' ? '5 actividades breves'
    : ['copiado', 'caligrafia'].includes(config.type)
    ? `${config.paragraphs} ${config.paragraphs === 1 ? 'párrafo' : 'párrafos'}`
    : config.type === 'lectura' ? '1 lectura' : `${config.count} ejercicios`;
  result.innerHTML = `<div class="success-box"><strong>${printed ? (mobile ? 'PDF descargado' : 'Ficha lista para imprimir') : 'No se ha podido preparar la ficha'}</strong><span class="print-hint">${printed ? `${labels[config.type]} · ${contentSummary}${mobile ? ' · Abre el PDF para imprimirlo o compartirlo.' : ''}` : (mobile ? 'El navegador no ha podido generar el PDF.' : 'El navegador ha bloqueado la ventana de impresión.')}</span>${config.solutions ? `<button class="solutions-link" id="print-solutions" type="button">${mobile ? 'Descargar soluciones' : 'Imprimir soluciones'}</button>` : ''}${printed ? '<button class="solutions-link new-sheet" id="new-sheet" type="button">Crear otra ficha</button>' : ''}</div>`;
  document.querySelector('#print-solutions')?.addEventListener('click', () => mobile ? downloadPdf(config, items, true) : print(answerSheet));
  if (printed) {
    saveLastConfig(config);
    notifyTelegram(config);
  }
  document.querySelector('#new-sheet')?.addEventListener('click', () => {
    result.innerHTML = '';
    document.querySelector('#print-direct').focus();
  });
});
