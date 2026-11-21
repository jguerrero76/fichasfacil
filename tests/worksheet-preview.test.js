const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '..', 'app.js'), 'utf8');
const start = source.indexOf('let preparedWorksheet = null;');
const end = source.indexOf('\nconst shareUrl', start);
const createCache = makeContent => new Function('makeContent', source.slice(start, end) + '; return getWorksheetItems;')(makeContent);

test('vista previa y exportaciones conservan ejercicios al cambiar soluciones o nombre', () => {
  let generations = 0;
  const itemsFor = createCache(() => [{question: `ejercicio ${++generations}`}]);
  const config = {type:'sumas',count:10,difficulty:'Inicial',student:'',solutions:false};
  const preview = itemsFor(config);
  assert.strictEqual(itemsFor({...config,solutions:true}), preview);
  assert.strictEqual(itemsFor({...config,student:'Alumno'}), preview);
  assert.strictEqual(itemsFor(config), preview);
  assert.equal(generations, 1);
  assert.notStrictEqual(itemsFor(config, true), preview);
  assert.equal(generations, 2);
});

test('cambiar la actividad o las opciones genera una ficha nueva', () => {
  let generations = 0;
  const itemsFor = createCache(() => [{question: `ejercicio ${++generations}`}]);
  const config = {type:'sumas',count:10,difficulty:'Inicial'};
  const first = itemsFor(config);
  assert.notStrictEqual(itemsFor({...config,type:'restas'}), first);
  assert.notStrictEqual(itemsFor({...config,count:20}), first);
  assert.equal(generations, 3);
});

test('cambiar de nivel crea ejercicios nuevos y conserva los mostrados al descargar', () => {
  let generations = 0;
  const itemsFor = createCache((type, count, difficulty) => [{question: `${difficulty} ${++generations}`}]);
  const initial = {type:'lectura',count:10,difficulty:'Inicial',student:'',solutions:false};
  const first = itemsFor(initial);
  const advanced = {...initial, difficulty:'Avanzado'};
  const preview = itemsFor(advanced);
  assert.notStrictEqual(preview, first);
  assert.match(preview[0].question, /^Avanzado/);
  assert.strictEqual(itemsFor({...advanced, solutions:true}), preview);
  assert.strictEqual(itemsFor(advanced), preview);
  assert.equal(generations, 2);
});
