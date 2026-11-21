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
const syncPresetState = () => {
  const current = { difficulty: document.querySelector('#difficulty')?.value, count: document.querySelector('#count')?.value, firstDigits: document.querySelector('#firstDigits')?.value, secondDigits: document.querySelector('#secondDigits')?.value };
  const presets = {
    start: { difficulty: 'Inicial', count: '10', firstDigits: 'auto', secondDigits: 'auto' },
    balanced: { difficulty: 'Medio', count: '20', firstDigits: 'auto', secondDigits: 'auto' },
    review: { difficulty: 'Avanzado', count: '10', firstDigits: 'auto', secondDigits: 'auto' }
  };
  document.querySelectorAll('[data-preset]').forEach(button => {
    const preset = presets[button.dataset.preset];
    const selected = preset && Object.keys(preset).every(key => current[key] === preset[key]);
    button.setAttribute('aria-pressed', String(Boolean(selected)));
  });
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
if ('serviceWorker' in navigator) window.addEventListener('load', () => navigator.serviceWorker.register('./sw.js?v=20261121-29', { updateViaCache: 'none' }).catch(() => {}));
const updateConfigurationSummary = () => {
  const summary = document.querySelector('#configuration-summary');
  if (summary) {
    const first = document.querySelector('#firstDigits').value;
    const second = document.querySelector('#secondDigits').value;
    const isMath = ['sumas', 'restas', 'multiplicaciones', 'divisiones'].includes(activity.value);
    const digits = isMath ? (first === 'auto' && second === 'auto' ? 'Según la dificultad' : `${first === 'auto' ? 'dificultad' : `${first} cifras`} / ${second === 'auto' ? 'dificultad' : `${second} cifras`}`) : '';
    const countSummary = activity.value === 'lectura' ? ' · 1 lectura' : activity.value === 'diaria' ? ' · 5 actividades' : ['copiado', 'caligrafia', 'mixta'].includes(activity.value) ? '' : ` · ${document.querySelector('#count').selectedOptions[0].textContent}`;
    const paragraphSummary = ['copiado', 'caligrafia'].includes(activity.value) ? ` · ${document.querySelector('#paragraphs').selectedOptions[0].textContent}` : '';
    const extra = activity.value === 'sumas' || activity.value === 'restas' ? document.querySelector('#carryMode').selectedOptions[0].textContent : activity.value === 'multiplicaciones' ? document.querySelector('#tableNumber').value === 'all' ? 'Todas las tablas' : `Tabla del ${document.querySelector('#tableNumber').value}` : activity.value === 'divisiones' ? `${document.querySelector('#divisionMode').selectedOptions[0].textContent}${document.querySelector('#specificDivisor').value === 'all' ? '' : ` · entre ${document.querySelector('#specificDivisor').value}`}` : '';
    summary.textContent = `${document.querySelector('#difficulty').value}${countSummary}${digits ? ` · ${digits}` : ''}${paragraphSummary}${extra ? ` · ${extra}` : ''}`;
    syncPresetState();
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
  const gradeMaximum = { Inicial: 20, Medio: 99, Avanzado: 9999 }[document.querySelector('#difficulty').value] || 9;
  const firstMaximum = first.value === 'auto' ? gradeMaximum : (10 ** Number(first.value)) - 1;
  [...second.options].forEach(option => {
    option.disabled = constrainsSubtraction && option.value !== 'auto' && (10 ** (Number(option.value) - 1)) > firstMaximum;
  });
  if (second.selectedOptions[0]?.disabled) second.value = 'auto';
};
const updateDivisionOptions = () => {
  const divisor = document.querySelector('#specificDivisor');
  const isDivision = activity.value === 'divisiones';
  const isRemainderDivision = isDivision && document.querySelector('#divisionMode').value === 'remainder';
  const digits = document.querySelector('#firstDigits').value;
  const difficulty = document.querySelector('#difficulty').value;
  const autoMaximum = { Inicial: 20, Medio: 99, Avanzado: 9999 }[difficulty] || 9;
  const dividendMaximum = digits === 'auto' ? autoMaximum : (10 ** Number(digits)) - 1;
  const divisorDigits = document.querySelector('#secondDigits');
  if (isDivision) {
    [...divisorDigits.options].forEach(option => {
      if (option.value === 'auto') return;
      const minimumDivisor = option.value === '1' ? 2 : 10 ** (Number(option.value) - 1);
      option.disabled = isRemainderDivision ? minimumDivisor >= dividendMaximum : minimumDivisor > dividendMaximum;
    });
    if (divisorDigits.selectedOptions[0]?.disabled) divisorDigits.value = 'auto';
  }
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
  const borrowUnavailable = activity.value === 'restas' && document.querySelector('#firstDigits').value === '1';
  const carryMode = document.querySelector('#carryMode');
  carryMode.querySelector('option[value="yes"]').disabled = borrowUnavailable;
  if (borrowUnavailable && carryMode.value === 'yes') carryMode.value = 'any';
  document.querySelector('#carry-note').textContent = borrowUnavailable ? 'Para restar con llevadas, el primer número necesita al menos dos cifras.' : '';
  document.querySelector('#table-field').classList.toggle('hidden-field', activity.value !== 'multiplicaciones');
  document.querySelector('#specific-divisor-field').classList.toggle('hidden-field', activity.value !== 'divisiones' || document.querySelector('#secondDigits').value !== '1');
  document.querySelector('#remainder-field').classList.toggle('hidden-field', activity.value !== 'divisiones');
  updateSubtractionDigitOptions();
  updateDivisionOptions();
  document.querySelector('#specific-divisor-field').classList.toggle('hidden-field', activity.value !== 'divisiones' || document.querySelector('#secondDigits').value !== '1');
  updateCountOptions();
};
function updateCountOptions() {
  if (typeof getUniqueExerciseLimit !== 'function') return;
  const select = document.querySelector('#count');
  const note = document.querySelector('#count-limit-note');
  const previous = Number(select.value) || 20;
  const limit = Math.min(20, getUniqueExerciseLimit(activity.value, document.querySelector('#difficulty').value));
  const values = [...new Set([5, 10, 15, 20, limit])].filter(value => value <= limit).sort((a, b) => a - b);
  select.replaceChildren(...values.map(value => new Option(value + ' ejercicios', String(value))));
  const selected = values.includes(previous) ? previous : values.filter(value => value <= previous).at(-1) || values[0];
  select.value = String(selected);
  note.textContent = limit < 20 ? 'Hasta ' + limit + ' ejercicios diferentes disponibles para esta actividad y nivel.' : '';
  updateConfigurationSummary();
}
const savePreferences = () => {
  try { localStorage.setItem(preferenceKey, JSON.stringify(Object.fromEntries(preferenceIds.map(id => [id, document.querySelector(`#${id}`).value])))); } catch (error) { /* almacenamiento opcional */ }
};
const applyPreset = preset => {
  const values = {
    start: { difficulty: 'Inicial', count: '10', firstDigits: 'auto', secondDigits: 'auto' },
    balanced: { difficulty: 'Medio', count: '20', firstDigits: 'auto', secondDigits: 'auto' },
    review: { difficulty: 'Avanzado', count: '10', firstDigits: 'auto', secondDigits: 'auto' }
  }[preset];
  if (!values) return;
  Object.entries(values).forEach(([id, value]) => setSelectValue(id, value));
  document.querySelector('#solutions').checked = false;
  document.querySelectorAll('[data-preset]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.preset === preset)));
  updateDigitLabels();
  updateConfigurationSummary();
  updateActivityFields();
  savePreferences();
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
const activitySubject = document.querySelector('#activity-subject');
const subjectTypes = { matematicas: ['sumas', 'restas', 'multiplicaciones', 'divisiones', 'problemas', 'reloj', 'dinero', 'medidas', 'fracciones', 'geometria'], lengua: ['lectura', 'copiado', 'ortografia', 'vocabulario', 'ordenar', 'caligrafia'], razonamiento: ['logica', 'mixta', 'diaria'] };
const activityEmpty = document.querySelector('#activity-empty');
const activityResultCount = document.querySelector('#activity-result-count');
const activityCount = document.querySelector('#activity-count');
const normalizeSearchText = value => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('es');
const connectionStatus = document.querySelector('#connection-status');
const updateConnectionStatus = () => {
  if (!connectionStatus) return;
  const offline = navigator.onLine === false;
  connectionStatus.hidden = !offline;
  connectionStatus.textContent = offline ? 'Sin conexión: solo estarán disponibles los recursos ya guardados en este dispositivo.' : '';
};
window.addEventListener('online', updateConnectionStatus);
window.addEventListener('offline', updateConnectionStatus);
updateConnectionStatus();
const activityCards = [...document.querySelectorAll('.activity-card')].map(card => ({ element: card, text: normalizeSearchText(card.textContent + (card.dataset.type === 'lectura' ? ' lectura' : '')) }));
let activitySearchFrame = 0;
const filterActivities = () => {
  const query = normalizeSearchText(activitySearch.value.trim());
  let visibleCount = 0;
  activityCards.forEach(({ element, text }) => {
    const matches = (!query || text.includes(query)) && (activitySubject.value === 'todas' || subjectTypes[activitySubject.value].includes(element.dataset.type));
    element.hidden = !matches;
    if (matches) visibleCount += 1;
  });
  if (clearActivitySearch) clearActivitySearch.hidden = !query;
  if (activityEmpty) activityEmpty.hidden = visibleCount > 0;
  if (activityResultCount) activityResultCount.textContent = (query || activitySubject.value !== 'todas')
    ? `${visibleCount} ${visibleCount === 1 ? 'actividad encontrada' : 'actividades encontradas'}`
    : '';
  if (activityCount) activityCount.textContent = (query || activitySubject.value !== 'todas') ? `${visibleCount} de 19` : '19 actividades';
};
activitySubject?.addEventListener('change', filterActivities);
activitySearch?.addEventListener('input', () => {
  cancelAnimationFrame(activitySearchFrame);
  activitySearchFrame = requestAnimationFrame(filterActivities);
});
clearActivitySearch?.addEventListener('click', () => { activitySearch.value = ''; filterActivities(); activitySearch.focus(); });
activitySearch?.addEventListener('keydown', event => {
  if (event.key === 'Escape' && activitySearch.value) { activitySearch.value = ''; filterActivities(); }
});
const saveRecentActivity = type => {
  try { localStorage.setItem(recentActivityKey, JSON.stringify({ type, label: labels[type], savedAt: Date.now() })); } catch (error) { /* almacenamiento opcional */ }
};
const repeatLastButton = document.querySelector('#repeat-last');
const updateRepeatButton = config => {
  if (!repeatLastButton || !config?.type || !labels[config.type]) return;
  repeatLastButton.textContent = `Repetir ${labels[config.type]}`;
  repeatLastButton.setAttribute('aria-label', `Repetir la última ficha: ${labels[config.type]}`);
  repeatLastButton.hidden = false;
};
const saveLastConfig = config => {
  try {
    const safeConfig = { ...config, student: '', solutions: false };
    localStorage.setItem(lastConfigKey, JSON.stringify(safeConfig));
    updateRepeatButton(safeConfig);
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
const savedLastConfig = loadLastConfig();
if (savedLastConfig) updateRepeatButton(savedLastConfig);
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => applyPreset(button.dataset.preset)));

const countSelect = document.querySelector('#count');
if (countSelect && !countSelect.querySelector('option[value="20"]')) {
  countSelect.insertAdjacentHTML('beforeend', '<option value="20">20 ejercicios</option>');
  countSelect.value = '20';
}

const generatorTitle = type => ({ mixta: 'Prepara tu ficha mixta', diaria: 'Prepara tu ficha diaria' }[type] || `Prepara tu ficha de ${labels[type].toLowerCase()}`);
const syncActivityCardSelection = type => {
  lastTrigger = document.querySelector(`[data-type="${type}"]`);
  document.querySelectorAll('[data-type]').forEach(card => {
    const selected = card.dataset.type === type;
    card.classList.toggle('is-selected', selected);
    card.setAttribute('aria-expanded', String(selected && modal.classList.contains('open')));
  });
};

let worksheetEnginePromise = null;
function ensureWorksheetEngine() {
  if (worksheetEnginePromise) return worksheetEnginePromise;
  worksheetEnginePromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = 'worksheet-engine.js?v=20261121-29';
    script.async = true;
    const timeout = setTimeout(() => { script.remove(); reject(new Error('El generador tarda demasiado en cargar.')); }, 15000);
    script.onload = () => { clearTimeout(timeout); resolve(); };
    script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('No se ha podido cargar el generador.')); };
    document.head.appendChild(script);
  }).catch(error => { worksheetEnginePromise = null; throw error; });
  return worksheetEnginePromise;
}

const openGenerator = async type => {
  const trigger = document.querySelector(`[data-type="${type}"]`);
  const loadingStatus = document.querySelector('#generator-loading-status');
  trigger?.setAttribute('aria-busy', 'true');
  loadingStatus.textContent = 'Preparando el generador…';
  try { await ensureWorksheetEngine(); }
  catch (error) { loadingStatus.textContent = 'No se ha podido abrir el generador. Comprueba la conexión y pulsa de nuevo la actividad.'; return; }
  finally { trigger?.removeAttribute('aria-busy'); }
  loadingStatus.textContent = '';
  preparedWorksheet = null;
  syncActivityCardSelection(type);
  document.querySelectorAll('[data-type]').forEach(card => card.setAttribute('aria-expanded', String(card === lastTrigger)));
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  pageBackground.forEach(element => { element.inert = true; element.setAttribute('aria-hidden', 'true'); });
  activity.value = type;
  saveRecentActivity(type);
  result.innerHTML = '';
  result.setAttribute('role', 'status');
  result.setAttribute('aria-live', 'polite');
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
  const mobile = isMobileDevice();
  const printButton = document.querySelector('#print-direct');
  printButton.hidden = mobile;
  printButton.textContent = 'Imprimir ficha';
  document.querySelector('.form-actions').classList.toggle('mobile-actions', mobile);
  setTimeout(() => document.querySelector('#difficulty').focus(), 50);
};

repeatLastButton?.addEventListener('click', async () => {
  const saved = loadLastConfig();
  if (!saved) return;
  await openGenerator(saved.type);
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
  syncActivityCardSelection(activity.value);
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
  updateDigitLabels();
  updateActivityFields();
  document.querySelectorAll('[data-preset]').forEach(button => button.setAttribute('aria-pressed', 'false'));
  savePreferences();
  document.querySelector('#difficulty').focus();
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
  (lastTrigger || activitySearch)?.focus();
}
document.addEventListener('keydown', event => { if (event.key === 'Escape' && modal.classList.contains('open') && !document.querySelector('#worksheet-preview').open) closeGenerator(); });


const readConfig = () => ({ type: activity.value, level: '', difficulty: document.querySelector('#difficulty').value, count: Number(document.querySelector('#count').value), operands: Number(document.querySelector('#operands').value), firstDigits: document.querySelector('#firstDigits').value, secondDigits: document.querySelector('#secondDigits').value, paragraphs: Number(document.querySelector('#paragraphs').value), calligraphyMode: document.querySelector('#calligraphyMode').value, carryMode: document.querySelector('#carryMode').value, tableNumber: document.querySelector('#tableNumber').value, specificDivisor: document.querySelector('#specificDivisor').value, divisionMode: document.querySelector('#divisionMode').value, student: document.querySelector('#student').value.trim(), solutions: document.querySelector('#solutions')?.checked });


// Keep the exercises stable across preview, print, PDF and answer sheets.
let preparedWorksheet = null;
function getWorksheetItems(config, fresh = false) {
  const { student, solutions, ...contentConfig } = config;
  const key = JSON.stringify(contentConfig);
  if (fresh || !preparedWorksheet || preparedWorksheet.key !== key) {
    preparedWorksheet = {
      key,
      items: makeContent(config.type, config.count, config.difficulty, config.level, config.operands, config.firstDigits, config.secondDigits, config.paragraphs, config)
    };
  }
  return preparedWorksheet.items;
}

const shareUrl = config => {
  const url = new URL(window.location.pathname, window.location.origin);
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
  // Reservar una franja fija para el pie evita que el último ejercicio lo tape.
  const contentBottom = pageHeight - margin - 28;
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
  const headerTitle = `${mathTitle}${solutions ? ' · Soluciones' : ''}`;
  const drawHeader = title => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text('Nombre:', margin, 17);
    doc.line(margin + 16, 17.5, 135, 17.5);
    if (config.student) doc.text(config.student, margin + 18, 17);
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
      doc.line(x + 2, topY + 5, x + 30, topY + 5);
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
    if (solutions) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.text(String(item.answer), numberRight, lineY + 8, { align: 'right' });
    } else if (config.type === 'multiplicaciones') {
      doc.setDrawColor(196, 203, 212);
      doc.setLineWidth(0.25);
      const answerRows = Math.max(3, second.length + 1);
      const answerWidth = doc.getTextWidth("0".repeat(first.length + second.length));
      const answerLeft = Math.max(margin, Math.min(operatorX - 3, numberRight - answerWidth - 2));
      for (let row = 1; row <= answerRows; row += 1) {
        const answerY = lineY + row * 7;
        doc.line(answerLeft, answerY, numberRight + 1, answerY);
      }
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
    } else if (config.type === 'sumas' || config.type === 'restas' || config.type === 'divisiones') {
      doc.setDrawColor(196, 203, 212);
      doc.setLineWidth(0.25);
      doc.line(operatorX - 3, lineY + 8, numberRight + 1, lineY + 8);
      doc.line(operatorX - 3, lineY + 16, numberRight + 1, lineY + 16);
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(0.2);
    }
  };
  const drawGeometryFigure = (figure, x, topY) => {
    doc.setDrawColor(49, 92, 155);
    doc.setLineWidth(0.8);
    if (figure === 'circle') {
      doc.circle(x, topY + 14, 14);
      doc.setFillColor(239, 142, 105);
      doc.circle(x, topY + 14, 1.8, 'F');
    } else if (figure === 'triangle') {
      const triangleHeight = 15 * Math.sqrt(3);
      doc.line(x, topY, x - 15, topY + triangleHeight);
      doc.line(x - 15, topY + triangleHeight, x + 15, topY + triangleHeight);
      doc.line(x + 15, topY + triangleHeight, x, topY);
    } else if (figure === 'rectangle') {
      doc.rect(x - 18, topY + 5, 36, 18);
    } else if (figure === 'pentagon' || figure === 'hexagon' || figure === 'heptagon' || figure === 'octagon') {
      const sides = figure === 'pentagon' ? 5 : figure === 'hexagon' ? 6 : figure === 'heptagon' ? 7 : 8;
      const points = Array.from({ length: sides }, (_, index) => {
        const angle = -Math.PI / 2 + (index * Math.PI * 2) / sides;
        return [x + Math.cos(angle) * 15, topY + 14 + Math.sin(angle) * 15];
      });
      points.forEach((point, index) => {
        const next = points[(index + 1) % points.length];
        doc.line(point[0], point[1], next[0], next[1]);
      });
    } else if (figure === 'brokenLine') {
      doc.line(x - 18, topY + 23, x - 7, topY + 6);
      doc.line(x - 7, topY + 6, x + 4, topY + 20);
      doc.line(x + 4, topY + 20, x + 18, topY + 3);
    } else if (figure === 'obtuseAngle') {
      doc.line(x, topY + 24, x - 16, topY + 2);
      doc.line(x, topY + 24, x + 18, topY + 24);
    } else if (figure === 'acuteAngle') {
      doc.line(x - 15, topY + 24, x + 10, topY + 3);
      doc.line(x - 15, topY + 24, x + 16, topY + 24);
    } else if (figure === 'angle') {
      doc.line(x - 15, topY + 24, x - 15, topY);
      doc.line(x - 15, topY + 24, x + 16, topY + 24);
      doc.setDrawColor(239, 142, 105);
      doc.arc?.(x - 15, topY + 24, 9, 270, 360);
    } else if (figure === 'line') {
      doc.line(x - 18, topY + 21, x + 18, topY + 21);
      doc.line(x - 18, topY + 21, x - 14, topY + 18);
      doc.line(x - 18, topY + 21, x - 14, topY + 24);
      doc.line(x + 18, topY + 21, x + 14, topY + 18);
      doc.line(x + 18, topY + 21, x + 14, topY + 24);
    } else {
      doc.rect(x - 9, topY, 18, 18);
    }
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
  };
  const ensureSpace = height => {
    if (y + height <= contentBottom) return;
    doc.addPage();
    drawHeader(headerTitle);
  };
  const write = (text, size = 11, options = {}) => {
    doc.setFont('helvetica', options.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lines = doc.splitTextToSize(String(text).replaceAll('−', '-'), pageWidth - margin * 2);
    const lineHeight = size * 0.48 + 2;
    ensureSpace(lines.length * lineHeight + (options.gap ?? 2));
    doc.text(lines, margin, y);
    y += lines.length * lineHeight + (options.gap ?? 2);
  };
  const writeAnswerLines = (count = 3) => {
    ensureSpace(count * 11 + 4);
    for (let row = 0; row < count; row += 1) {
      doc.setDrawColor(174, 182, 191);
      doc.line(margin + 4, y, pageWidth - margin - 4, y);
      doc.line(margin + 4, y + 8, pageWidth - margin - 4, y + 8);
      y += 11;
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
    drawHeader(headerTitle);
    if (config.type === 'divisiones') {
      const columns = 3;
      const columnWidth = (pageWidth - margin * 2) / columns;
      const startY = 55;
      const rowHeight = 54;
      items.forEach((item, index) => {
        if (index > 0 && index % 10 === 0) {
          doc.addPage();
          drawHeader(headerTitle);
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
      const multiplierDigits = config.type === 'multiplicaciones'
        ? Math.max(1, ...items.map(item => (item.question.match(/×\s*(\d+)/)?.[1] || '').length))
        : 0;
      const answerRows = Math.max(3, multiplierDigits + 1);
      const rowHeight = config.type === 'multiplicaciones' ? Math.max(43, 20 + answerRows * 7) : 43;
      const rowsPerPage = Math.max(1, Math.floor((pageHeight - 25 - startY) / rowHeight));
      const itemsPerPage = rowsPerPage * columns;
      items.forEach((item, index) => {
        if (index > 0 && index % itemsPerPage === 0) {
          doc.addPage();
          drawHeader(headerTitle);
        }
        const localIndex = index % itemsPerPage;
        const column = localIndex % columns;
        const row = Math.floor(localIndex / columns);
        drawMathOperation(item, margin + columnWidth * (column + 0.5), startY + row * rowHeight);
      });
    }
  } else {
    drawHeader(headerTitle);
    items.forEach((item, index) => {
    if (config.type === 'geometria') {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      const questionLines = doc.splitTextToSize(`${index + 1}. ${item.question}`, pageWidth - margin * 2);
      const figureHeight = 34;
      const answerHeight = solutions ? 12 : 34;
      ensureSpace(questionLines.length * 6 + figureHeight + answerHeight + 12);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text(questionLines, margin, y + 5);
      y += questionLines.length * 6 + 4;
      drawGeometryFigure(item.figure, margin + 12, y + 1);
      y += figureHeight;
      if (solutions) {
        const answerLines = doc.splitTextToSize(`Respuesta: ${item.answer}`, pageWidth - margin * 2 - 34);
        ensureSpace(answerLines.length * 5 + 5);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(39, 95, 172);
        doc.text(answerLines, margin + 30, y);
        doc.setTextColor(32, 40, 63);
        y += answerLines.length * 5 + 5;
      } else writeAnswerLines(3);
      return;
    }
    if (item.kind === 'reading') {
      write(item.title, 14, { bold: true, gap: 3 });
      write(item.text, 11, { gap: 5 });
      item.questions.forEach((question, questionIndex) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        const questionLines = doc.splitTextToSize(`${questionIndex + 1}. ${question}`, pageWidth - margin * 2);
        if (solutions) {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(10);
          const answerLines = doc.splitTextToSize(`Respuesta posible (se aceptan respuestas equivalentes): ${item.answers[questionIndex]}`, pageWidth - margin * 2);
          ensureSpace(questionLines.length * (11 * 0.48 + 2) + 2 + answerLines.length * (10 * 0.48 + 2) + 5);
        } else {
          ensureSpace(questionLines.length * (11 * 0.48 + 2) + 3 * 10 + 20);
        }
        write(`${questionIndex + 1}. ${question}`, 11, { bold: true, gap: 2 });
        if (solutions) write(`Respuesta posible (se aceptan respuestas equivalentes): ${item.answers[questionIndex]}`, 10, { gap: 5 });
        else writeAnswerLines(4);
      });
      return;
    }
    if (item.kind === 'copying') {
      write(`${index + 1}. ${item.text}`, 12, { bold: true, gap: 4 });
      if (solutions) write(`Respuesta: ${item.answer || item.text}`, 10, { gap: 4 });
      return;
    }
    const answerLineCount = config.type === 'problemas' ? 6 : 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    const questionLines = doc.splitTextToSize(`${index + 1}. ${item.question}`, pageWidth - margin * 2);
    const questionHeight = questionLines.length * (12 * 0.48 + 2) + 3;
    const rawAnswer = item.explanation || item.answer;
    const answerText = /^Respuesta (posible|orientativa):/.test(String(rawAnswer)) ? String(rawAnswer) : `Respuesta: ${rawAnswer}`;
    if (solutions) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      const answerLines = doc.splitTextToSize(answerText, pageWidth - margin * 2);
      ensureSpace(questionHeight + answerLines.length * (10 * 0.48 + 2) + 5);
    } else {
      ensureSpace(Math.max(questionHeight + answerLineCount * 10 + 15, config.type === 'problemas' ? 70 : 0));
    }
    write(`${index + 1}. ${item.question}`, 12, { bold: true, gap: 3 });
    if (solutions) write(answerText, 10, { gap: 5 });
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
    const logoX = pageWidth / 2 - 16;
    const footerRuleY = pageHeight - 25;
    const logoY = pageHeight - 18;
    doc.setDrawColor(220, 228, 236);
    doc.setLineWidth(0.25);
    doc.line(margin, footerRuleY, pageWidth - margin, footerRuleY);
    doc.setFillColor(32, 56, 95);
    doc.roundedRect(logoX, logoY, 9, 9, 1.8, 1.8, 'F');
    doc.setFillColor(244, 201, 28);
    doc.roundedRect(logoX + 1.4, logoY + 1.4, 2.4, 2.4, 0.45, 0.45, 'F');
    doc.setFillColor(237, 126, 53);
    doc.roundedRect(logoX + 5.2, logoY + 1.4, 2.4, 2.4, 0.45, 0.45, 'F');
    doc.setFillColor(126, 185, 255);
    doc.roundedRect(logoX + 1.4, logoY + 5.2, 2.4, 2.4, 0.45, 0.45, 'F');
    doc.setFillColor(139, 209, 170);
    doc.roundedRect(logoX + 5.2, logoY + 5.2, 2.4, 2.4, 0.45, 0.45, 'F');
    doc.setTextColor(32, 56, 95);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('FichasFácil', logoX + 15, logoY + 6.2);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Página ${page}/${footerPages}`, pageWidth - margin, logoY + 6.2, { align: 'right' });
  }
  const fileSuffix = solutions ? '-soluciones' : '';
  doc.save(`FichasFacil-${labels[config.type].toLowerCase().replaceAll(' ', '-')}${fileSuffix}.pdf`);
  return true;
}

async function safeDownloadPdf(config, items, solutions = false) {
  try {
    if (!await loadPdfLibrary()) return false;
    return downloadPdf(config, items, solutions);
  } catch (error) {
    console.error('No se pudo generar el PDF.', error);
    return false;
  }
}

function isMobileDevice() {
  return window.matchMedia?.('(pointer: coarse)').matches || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
}

let pdfLibraryPromise;
function loadPdfLibrary() {
  if (window.jspdf?.jsPDF) return Promise.resolve(true);
  if (pdfLibraryPromise) return pdfLibraryPromise;
  pdfLibraryPromise = new Promise(resolve => {
    const script = document.createElement('script');
    script.src = 'assets/jspdf.umd.min.js?v=20261115-2';
    script.onload = () => { const loaded = Boolean(window.jspdf?.jsPDF); if (!loaded) pdfLibraryPromise = null; resolve(loaded); };
    script.onerror = () => { pdfLibraryPromise = null; resolve(false); };
    document.head.appendChild(script);
  });
  return pdfLibraryPromise;
}

function notifyTelegram(config) {
  const payload = {
    activity: labels[config.type],
    difficulty: config.difficulty,
    count: config.count
  };
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  fetch('/api/telegram-notify', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
    keepalive: true,
    signal: controller.signal
  }).catch(() => {}).finally(() => clearTimeout(timeout));
}

function createSheets(config) {
  const items = getWorksheetItems(config);
  const simpleMath = ['sumas', 'restas', 'multiplicaciones', 'divisiones'].includes(config.type);
  const textStyles = '.text-exercise i{grid-column:2;width:100%}.text-exercise strong{font-size:17px;line-height:1.35}.reading-sheet{max-width:180mm;margin:0 auto}.reading-sheet h3{font-size:24px;margin:0 0 14px}.reading-text{font-size:16px;line-height:1.55;margin:0 0 20px}.reading-sheet h4{font-size:14px;margin:0 0 10px}.reading-question{display:grid;grid-template-columns:22px 1fr;gap:5px 7px;min-height:78px;align-items:start;margin-bottom:9px;break-inside:avoid;page-break-inside:avoid}.reading-question span{font-weight:700}.reading-question strong{font-size:15px;line-height:1.35}.reading-question i{grid-column:2;height:48px;border-bottom:1px solid #82958b;background:repeating-linear-gradient(to bottom,transparent 0,transparent 22px,#d9e2ea 22px,#d9e2ea 23px)}.reading-question b{grid-column:2;color:#275fac}.copying-sheet{break-inside:avoid;page-break-inside:avoid;margin:0 auto 9mm;max-width:180mm}.copying-text{font-size:17px;line-height:1.55;margin:0}.copying-final-guide{break-inside:avoid;page-break-inside:avoid;max-width:180mm;margin:7mm auto 0}.copying-final-guide h3{font-size:14px;margin:0 0 7px;color:#697772}.lamela-guide{height:108mm;border-top:1.2px solid #647b9b}.lamela-guide span{display:block;height:9mm;border-bottom:1px solid #9aaabd}.lamela-line-0{border-bottom:1.2px solid #7890af!important}.lamela-line-1{border-bottom:1px dashed #b7c4d2!important}.lamela-line-2{border-bottom:1.2px solid #ef9b9b!important}';
  const printPolish = '<style>html,body{width:210mm!important;min-width:210mm!important;max-width:210mm!important}body{font-family:ui-rounded,"Arial Rounded MT Bold","Trebuchet MS",Arial,sans-serif!important;color:#20283f!important;background:#fff!important;padding:13mm 12mm!important;overflow:visible!important;-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}h1{text-align:center!important;font-size:15px!important;font-weight:700!important;line-height:1.2!important;color:#20283f!important;margin:0 0 19px!important}.worksheet-header{display:flex!important;justify-content:space-between!important;gap:20px!important;margin-bottom:24px!important;padding:0 8px!important;border:0!important;font-size:10px!important;font-weight:700!important}.worksheet-header>div:first-child{flex:1}.worksheet-header>div:last-child{min-width:72px}.worksheet-header span{min-width:100px;height:13px}.worksheet-header>div:last-child span{min-width:62px}.math-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(5,minmax(0,1fr))!important;gap:0 22px!important;min-height:246mm!important;padding:0 2mm!important}.math-grid .arithmetic{width:100%!important;min-height:0!important;justify-content:center!important;align-items:center!important;padding:0!important}.math-grid .operation{display:block!important;flex:0 0 116px!important;width:116px!important;min-width:116px!important;max-width:116px!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;font-size:17px!important;line-height:1.15!important}.math-grid .digit-value{display:inline-flex!important;gap:3px!important;letter-spacing:0!important}.math-grid .digit-value b{letter-spacing:0!important}.math-grid .top-number,.math-grid .extra-number{padding-right:0!important;letter-spacing:0!important;min-height:23px!important;white-space:nowrap!important}.math-grid .bottom-number{grid-template-columns:18px 1fr!important;gap:0!important;padding-right:0!important;letter-spacing:0!important;line-height:1.15!important;white-space:nowrap!important}.math-grid .bottom-number .operator{text-align:center!important;letter-spacing:0!important}.math-grid .bottom-number .digit-value{justify-self:end!important}.math-grid .operation-rule{display:block!important;width:116px!important;max-width:116px!important;margin-top:5px!important}.math-grid .answer-space{display:none!important}@media print{h1{letter-spacing:-.02em}.worksheet-header{break-inside:avoid;page-break-inside:avoid}.text-exercise,.reading-question{break-inside:avoid;page-break-inside:avoid}.reading-sheet{break-inside:avoid;page-break-inside:avoid}.copying-sheet{break-inside:avoid;page-break-inside:avoid}p,h1,h2,h3,h4{orphans:3;widows:3}}</style>';
  const screenLayout = '<style>body{width:210mm!important;min-width:210mm!important;max-width:210mm!important;padding:13mm 12mm!important;overflow:visible!important}.worksheet-header{display:flex!important;align-items:flex-end!important;justify-content:space-between!important;gap:18px!important}.worksheet-header>div:first-child{flex:1}.worksheet-header>div{white-space:nowrap!important}.worksheet-header strong{color:#315c9b!important}.math-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;grid-template-rows:repeat(5,minmax(0,1fr))!important;gap:0 22px!important;min-height:246mm!important;align-items:center!important}.math-grid .arithmetic{min-height:0!important;justify-content:center!important}.math-grid .operation{display:block!important;flex:0 0 116px!important;width:116px!important;min-width:116px!important;max-width:116px!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace!important;font-size:17px!important;line-height:1.15!important}.math-grid .extra-number{display:grid!important;grid-template-columns:18px 1fr!important;gap:0!important;white-space:nowrap!important}.math-grid .extra-number .operator{text-align:center!important}.math-grid .extra-number .digit-value{justify-self:end!important}.math-grid .print-row .number{display:none!important}.math-grid .answer-space{display:block!important;height:20px!important;border-bottom:1px solid #9aaabd!important}@media(max-width:650px){body{padding:18px 14px!important}.math-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:0 22px!important}}</style>';
  // La altura mínima del body puede crear una página fantasma cuando el pie es fijo.
  const finalPdfLayout = '<style>html,body{height:auto!important;min-height:0!important}.math-grid{min-height:198mm!important}.text-exercise{min-height:160px!important}.reading-question{min-height:145px!important}</style>';
  const writingGuideLayout = '<style>.text-exercise i{height:8mm!important;min-height:8mm!important;box-sizing:border-box!important;border:0!important;border-top:1px solid #aeb6bf!important;border-bottom:1px solid #aeb6bf!important;background:none!important}.reading-question i{grid-column:2!important;display:grid!important;gap:3mm!important;height:auto!important;border:0!important;background:none!important}.reading-question i span{display:block!important;height:8mm!important;box-sizing:border-box!important;border-top:1px solid #aeb6bf!important;border-bottom:1px solid #aeb6bf!important}.geometry-exercise>table td{border-top:1px solid #aeb6bf!important;border-bottom:1px solid #aeb6bf!important}.geometry-exercise>table{border-spacing:0 3mm!important}div[role="img"][aria-label="FichasFácil"]{bottom:9mm!important;font-size:11px!important}div[role="img"][aria-label="FichasFácil"] svg{width:9mm!important;height:9mm!important}</style>';
  // Los cuadros de margen del navegador imprimen contadores reales en cada página.
  const pageNumberLayout = '<style>@page{size:A4;margin:0 0 10mm;@bottom-right{content:"Página " counter(page) "/" counter(pages);font:8pt Arial,sans-serif;color:#20385f;padding-right:12mm;vertical-align:middle}}@media print{.worksheet-print-math>tbody>tr>td[height=\"174\"]{height:145px!important}}</style>';
  const preparePrint = html => {
    const inlineLayout = (simpleMath ? html.replace('<table role=\"presentation\" width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"table-layout:fixed;border-collapse:collapse\">', '<table class=\"worksheet-print-math\" role=\"presentation\" width=\"100%\" border=\"0\" cellspacing=\"0\" cellpadding=\"0\" style=\"table-layout:fixed;border-collapse:collapse\">') : html)
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
    .replace('</body>', '<div role="img" aria-label="FichasFácil" style="position:fixed!important;left:0!important;right:0!important;top:auto!important;bottom:5mm!important;height:10mm!important;box-sizing:border-box!important;border-top:1px solid #dce4ec!important;padding-top:2mm!important;width:100%!important;z-index:1000;display:flex;align-items:center;justify-content:center;gap:4mm;color:#20385f;font:700 9px Arial,sans-serif;background:#fff"><svg aria-hidden="true" width="6mm" height="6mm" viewBox="0 0 64 64"><rect width="64" height="64" rx="16" fill="#20385f"/><rect x="10" y="10" width="19" height="19" rx="5" fill="#f4c91c"/><rect x="35" y="10" width="19" height="19" rx="5" fill="#ed7e35"/><rect x="10" y="35" width="19" height="19" rx="5" fill="#7eb9ff"/><rect x="35" y="35" width="19" height="19" rx="5" fill="#8bd1aa"/></svg><span>FichasFácil</span></div></body>')
    .replace('<style>', `<style>@page{size:A4;margin:0}${simpleMath ? 'h1{display:block!important;font-size:15px;letter-spacing:0;margin:0 0 19px}.worksheet-header{display:flex!important;justify-content:space-between;gap:20px;margin-bottom:24px;padding:0 8px;border:0;font-size:10px}.worksheet-header>div:first-child{flex:1}.worksheet-header>div:last-child{min-width:72px}.worksheet-header span{min-width:100px;height:13px}.worksheet-header>div:last-child span{min-width:62px}.math-grid{grid-template-columns:repeat(4,minmax(0,1fr));grid-template-rows:repeat(5,minmax(0,1fr));gap:0 22px;min-height:246mm;align-items:center;padding:0 2mm}.arithmetic{width:100%;min-height:0;justify-content:center;align-items:center;padding:0}.arithmetic-three .operation{min-height:54px}.print-row .number{display:none}.arithmetic .operation{display:block!important;flex:0 0 116px!important;width:116px!important;min-width:116px!important;max-width:116px!important;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:17px;line-height:1.15}.digit-value{display:inline-flex;gap:3px;letter-spacing:0}.digit-value b{letter-spacing:0}.top-number,.extra-number{padding-right:0;letter-spacing:0;font-variant-numeric:tabular-nums;white-space:nowrap;min-height:23px}.bottom-number{grid-template-columns:18px 1fr;gap:0;padding-right:0;letter-spacing:0;font-variant-numeric:tabular-nums;white-space:nowrap;line-height:1.15}.bottom-number .operator{text-align:center;letter-spacing:0}.bottom-number .digit-value{justify-self:end}.arithmetic .operation-rule{display:block!important;width:116px!important;max-width:116px!important;margin-top:5px}.answer-space{display:none}' : textStyles}`)
    .replaceAll('@media(max-width:650px)', simpleMath ? '@media print and (max-width:0px)' : '@media screen and (max-width:650px)')
    .replace('</head>', `${printPolish}${screenLayout}${finalPdfLayout}${writingGuideLayout}${pageNumberLayout}</head>`);
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
      setTimeout(removeFrame, 60000);
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
  shareButton.setAttribute('aria-busy', 'true');
  const fallbackMarkup = (message, linkLabel = 'Abrir enlace') => `<div class="success-box"><strong>Enlace listo para compartir</strong><span class="print-hint">${message}</span><a class="share-url" href="${escapeHtml(shareData.url)}">${linkLabel}</a></div>`;
  try {
    if (navigator.share) {
      await navigator.share(shareData);
      result.innerHTML = '<div class="success-box"><strong>Enlace compartido</strong><span class="print-hint">La configuración de esta ficha se ha enviado correctamente.</span></div>';
    }
    else if (navigator.clipboard) { await navigator.clipboard.writeText(`${shareText} ${shareData.url}`); result.innerHTML = fallbackMarkup('Hemos copiado el enlace con la configuración de esta ficha. También puedes abrirlo o copiarlo manualmente.'); }
    else result.innerHTML = fallbackMarkup('Copia o abre este enlace para compartir la configuración.');
  } catch (error) {
    if (error.name === 'AbortError') result.innerHTML = fallbackMarkup('Has cancelado la ventana de compartir. Puedes abrir el enlace directamente.');
    else result.innerHTML = fallbackMarkup('El navegador no permite compartir automáticamente. Puedes abrir el enlace directamente.');
  }
  finally { shareButton.disabled = false; shareButton.removeAttribute('aria-busy'); }
  result.setAttribute('role', 'status');
  result.setAttribute('aria-live', 'polite');
});

document.querySelector('#download-direct')?.addEventListener('click', async () => {
  const config = readConfig();
  const button = document.querySelector('#download-direct');
  const originalLabel = button.textContent;
  button.disabled = true;
  document.querySelector('#preview-download').disabled = true;
  button.setAttribute('aria-busy', 'true');
  button.textContent = 'Preparando PDF…';
  let items = [];
  let downloaded = false;
  try {
    items = getWorksheetItems(config);
    downloaded = await safeDownloadPdf(config, items, false);
  } catch (error) {
    console.error('No se pudo preparar la descarga.', error);
  }
  result.innerHTML = `<div class="success-box"><strong>${downloaded ? 'PDF descargado' : 'No se ha podido crear el PDF'}</strong><span class="print-hint">${downloaded ? `${labels[config.type]} · Puedes abrirlo, imprimirlo o compartirlo.` : 'Comprueba que el navegador permite descargas y vuelve a intentarlo.'}</span>${downloaded && config.solutions ? '<button class="solutions-link" id="download-solutions" type="button">Descargar soluciones</button>' : ''}${!downloaded ? '<button class="solutions-link" id="retry-download" type="button">Reintentar descarga</button>' : ''}</div>`;
  if (worksheetPreview.open) previewMessage.textContent = downloaded ? 'PDF preparado con los mismos ejercicios de la vista previa. Revisa las descargas de tu navegador.' : 'No se ha podido preparar el PDF. Vuelve a intentarlo.';
  result.setAttribute('role', downloaded ? 'status' : 'alert');
  result.setAttribute('aria-live', downloaded ? 'polite' : 'assertive');
  document.querySelector('#download-solutions')?.addEventListener('click', async event => {
    const solutionButton = event.currentTarget;
    solutionButton.disabled = true;
    const originalLabel = solutionButton.textContent;
    solutionButton.textContent = 'Preparando soluciones…';
    await safeDownloadPdf(config, items, true);
    solutionButton.disabled = false;
    solutionButton.textContent = originalLabel;
  });
  document.querySelector('#retry-download')?.addEventListener('click', () => button.click());
  if (downloaded) { saveLastConfig(config); notifyTelegram(config); }
  setTimeout(() => { button.disabled = false; document.querySelector('#preview-download').disabled = false; button.removeAttribute('aria-busy'); button.textContent = originalLabel; }, 500);
});

function supportsPrintPageNumbers() {
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync('@page { @bottom-right { content: "Página " counter(page) "/" counter(pages); } }');
    const marginRule = sheet.cssRules[0]?.cssRules?.[0];
    return Boolean(marginRule && marginRule.cssText.startsWith('@bottom-right') && marginRule.style?.content?.includes('counter(pages)'));
  } catch (error) { return false; }
}

form.addEventListener('submit', async event => {
  event.preventDefault();
  const pdfPrint = isMobileDevice() || !supportsPrintPageNumbers();
  const submitButton = document.querySelector('#print-direct');
  const originalSubmitLabel = submitButton.textContent;
  submitButton.disabled = true;
  submitButton.setAttribute('aria-busy', 'true');
  submitButton.textContent = pdfPrint ? 'Preparando PDF…' : 'Preparando impresión…';
  const config = readConfig();
  form.setAttribute('aria-busy', 'true');
  let printed = false;
  let answerSheet = '';
  let print = () => false;
  let items = [];
  let preparationFailed = false;
  try {
    const sheets = createSheets(config);
    answerSheet = sheets.answerSheet;
    print = sheets.print;
    items = sheets.items;
    printed = pdfPrint ? await safeDownloadPdf(config, items) : print(sheets.worksheet);
  } catch (error) {
    preparationFailed = true;
    console.error('No se pudo preparar la ficha.', error);
  }
  const mobile = pdfPrint;
  setTimeout(() => { submitButton.disabled = false; submitButton.removeAttribute('aria-busy'); submitButton.textContent = originalSubmitLabel; form.setAttribute('aria-busy', 'false'); }, 500);
  const contentSummary = config.type === 'diaria' ? '5 actividades breves'
    : ['copiado', 'caligrafia'].includes(config.type)
    ? `${config.paragraphs} ${config.paragraphs === 1 ? 'párrafo' : 'párrafos'}`
    : config.type === 'lectura' ? '1 lectura' : `${config.count} ejercicios`;
  const failureMessage = preparationFailed
    ? 'Ha ocurrido un error inesperado. Revisa las opciones y vuelve a intentarlo.'
    : mobile
      ? 'El navegador no ha podido generar el PDF.'
      : 'El navegador ha bloqueado la ventana de impresión.';
  result.innerHTML = `<div class="success-box"><strong>${printed ? (mobile ? 'PDF descargado' : 'Ficha lista para imprimir') : 'No se ha podido preparar la ficha'}</strong><span class="print-hint">${printed ? `${labels[config.type]} · ${contentSummary}${mobile ? ' · Abre el PDF numerado para imprimirlo o compartirlo.' : ''}` : failureMessage}</span>${config.solutions && !preparationFailed ? `<button class="solutions-link" id="print-solutions" type="button">${mobile ? 'Descargar soluciones' : 'Imprimir soluciones'}</button>` : ''}${printed ? '<button class="solutions-link new-sheet" id="new-sheet" type="button">Crear otra ficha</button>' : ''}${!printed ? '<button class="solutions-link" id="retry-print" type="button">Reintentar</button>' : ''}</div>`;
  result.setAttribute('role', printed ? 'status' : 'alert');
  result.setAttribute('aria-live', printed ? 'polite' : 'assertive');
  document.querySelector('#print-solutions')?.addEventListener('click', async event => {
    const solutionButton = event.currentTarget;
    solutionButton.disabled = true;
    const originalLabel = solutionButton.textContent;
    solutionButton.textContent = mobile ? 'Preparando soluciones…' : 'Preparando impresión…';
    if (mobile) await safeDownloadPdf(config, items, true); else print(answerSheet);
    solutionButton.disabled = false;
    solutionButton.textContent = originalLabel;
  });
  document.querySelector('#retry-print')?.addEventListener('click', () => form.requestSubmit());
  if (printed) {
    saveLastConfig(config);
    notifyTelegram(config);
  }
  document.querySelector('#new-sheet')?.addEventListener('click', () => {
    preparedWorksheet = null;
    result.innerHTML = '';
    document.querySelector(isMobileDevice() ? '#download-direct' : '#print-direct').focus();
  });
});


const worksheetPreview = document.querySelector('#worksheet-preview');
const previewFrame = document.querySelector('#worksheet-frame');
const previewSolutions = document.querySelector('#preview-solutions');
const previewDifficulty = document.querySelector('#preview-difficulty');
const previewCount = document.querySelector('#preview-count');
const previewCountField = document.querySelector('#preview-count-field');
const previewMessage = document.querySelector('#worksheet-preview-message');
function renderWorksheetPreview(fresh = false) {
  const config = readConfig();
  document.querySelector('#preview-download').disabled = false;
  document.querySelector('#preview-print').disabled = false;
  previewDifficulty.value = config.difficulty;
  const countSelect = document.querySelector('#count');
  previewCountField.hidden = ['lectura', 'copiado', 'caligrafia', 'diaria'].includes(config.type);
  previewCount.replaceChildren(...Array.from(countSelect.options, option => new Option(option.textContent, option.value, false, option.selected)));
  previewCount.value = countSelect.value;
  if (fresh) getWorksheetItems(config, true);
  const sheets = createSheets(config);
  document.querySelector('#worksheet-preview-title').textContent = `${labels[config.type]} · Vista previa`;
  const count = previewCountField.hidden ? '' : ` · ${sheets.items.length} ${sheets.items.length === 1 ? 'ejercicio' : 'ejercicios'}`;
  document.querySelector('#worksheet-preview-summary').textContent = `Nivel ${config.difficulty}${count} · Formato A4 · ${previewSolutions.checked ? 'Soluciones' : 'Ficha para resolver'}`;
  const fitScale = Math.min(1, (previewFrame.clientWidth || Math.min(window.innerWidth - 32, 958)) / 794);
  const scale = document.querySelector('#preview-scale').value === 'actual' ? 1 : fitScale;
  const screenStyle = `<style>@media screen{html{zoom:${scale}!important}div[role="img"][aria-label="FichasFácil"]{position:static!important;margin-top:28px!important}}</style>`;
  const previewHtml = (previewSolutions.checked ? sheets.answerSheet : sheets.worksheet).replace('</head>', screenStyle + '</head>');
  previewFrame.dataset.previewHtml = previewHtml;
  previewFrame.onload = () => {
    previewFrame.onload = null;
    if (!worksheetPreview.open) return;
    const frameDocument = previewFrame.contentDocument;
    if (!frameDocument) { previewMessage.textContent = 'No se ha podido mostrar la ficha. Puedes descargarla como PDF.'; return; }
    frameDocument.open();
    frameDocument.write(previewHtml);
    frameDocument.close();
  };
  previewFrame.src = 'worksheet-preview-frame.html';
  previewMessage.textContent = 'Estos ejercicios se conservarán al imprimir o descargar. Puedes desplazarte dentro de la ficha para verla completa.';
}
document.querySelector('#preview-direct').addEventListener('click', () => {
  try {
    previewSolutions.checked = false;
    renderWorksheetPreview();
    worksheetPreview.showModal();
  } catch (error) {
    result.textContent = 'No se ha podido preparar la vista previa. Puedes volver a intentarlo o descargar el PDF.';
    result.setAttribute('role', 'alert');
  }
});
document.querySelector('#close-worksheet-preview').addEventListener('click', () => worksheetPreview.close());
worksheetPreview.addEventListener('close', () => {
  previewFrame.onload = null;
  previewFrame.removeAttribute('src');
  delete previewFrame.dataset.previewHtml;
  document.querySelector('#preview-direct').focus();
});
worksheetPreview.addEventListener('keydown', event => {
  if (event.key === 'Escape') event.stopPropagation();
});
previewDifficulty.addEventListener('change', () => {
  const difficulty = document.querySelector('#difficulty');
  const previousValues = Object.fromEntries(preferenceIds.map(id => [id, document.querySelector(`#${id}`).value]));
  try {
    difficulty.value = previewDifficulty.value;
    difficulty.dispatchEvent(new Event('change', { bubbles: true }));
    renderWorksheetPreview();
    const config = readConfig();
    const customDigits = ['sumas', 'restas', 'multiplicaciones', 'divisiones'].includes(config.type) && (config.firstDigits !== 'auto' || config.secondDigits !== 'auto');
    previewMessage.textContent = customDigits
      ? `Nivel ${config.difficulty}. Se mantienen las cifras elegidas en las opciones. Los ejercicios mostrados se conservarán al imprimir o descargar.`
      : `Nivel ${config.difficulty}. Los ejercicios mostrados se conservarán al imprimir o descargar.`;
  } catch (error) {
    Object.entries(previousValues).forEach(([id, value]) => setSelectValue(id, value));
    updateActivityFields();
    savePreferences();
    try { renderWorksheetPreview(); } catch (restoreError) {
      document.querySelector('#preview-download').disabled = true;
      document.querySelector('#preview-print').disabled = true;
    }
    previewMessage.textContent = 'No se ha podido cambiar el nivel. Vuelve a las opciones e inténtalo de nuevo.';
  }
});
previewCount.addEventListener('change', () => {
  const countSelect = document.querySelector('#count');
  const previous = countSelect.value;
  try {
    countSelect.value = previewCount.value;
    countSelect.dispatchEvent(new Event('change', { bubbles: true }));
    renderWorksheetPreview();
    previewMessage.textContent = `Ficha actualizada: ${countSelect.selectedOptions[0].textContent}. Se conservarán al imprimir o descargar.`;
  } catch (error) {
    countSelect.value = previous;
    countSelect.dispatchEvent(new Event('change', { bubbles: true }));
    try { renderWorksheetPreview(); } catch (restoreError) {
      document.querySelector('#preview-download').disabled = true;
      document.querySelector('#preview-print').disabled = true;
    }
    previewMessage.textContent = 'No se ha podido cambiar el número de ejercicios. Vuelve a las opciones e inténtalo de nuevo.';
  }
});
previewSolutions.addEventListener('change', () => renderWorksheetPreview());
document.querySelector('#preview-scale').addEventListener('change', () => renderWorksheetPreview());
document.querySelector('#preview-refresh').addEventListener('click', () => {
  try { renderWorksheetPreview(true); }
  catch (error) { previewMessage.textContent = 'No se han podido preparar otros ejercicios. Vuelve a intentarlo.'; }
});
document.querySelector('#preview-print').addEventListener('click', () => {
  worksheetPreview.close();
  form.requestSubmit();
});
document.querySelector('#preview-download').addEventListener('click', () => {
  previewMessage.textContent = 'Preparando PDF…';
  document.querySelector('#download-direct').click();
});
