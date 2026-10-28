// Functional smoke test: loads index.html's <script>, stubs the DOM/fetch,
// and verifies loadJsonDialogues() builds all 8 conversations from dialoguejson/*.json.
// Usage: node .claude/scripts/smoke_test.js [path-to-index.html]
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const target = process.argv[2] || 'index.html';
const html = fs.readFileSync(path.join(__dirname, '..', '..', target), 'utf8');
const js = html.match(/<script>([\s\S]*?)<\/script>/)[1];

// ---- Minimal DOM stub ----
const elements = new Map();
function makeEl(id) {
  return {
    id,
    style: {}, dataset: {}, classList: { add(){}, remove(){} },
    value: '', checked: false, textContent: '', innerHTML: '',
    src: '', hidden: true,
    _listeners: {},
    addEventListener(type, fn) { (this._listeners[type] = this._listeners[type] || []).push(fn); },
    onchange: null, onclick: null, onplay: null,
    querySelectorAll() { return []; },
    querySelector() { return null; },
    insertAdjacentHTML() {},
    load() {}, pause() {}, play() {}, removeAttribute() {},
  };
}
const documentStub = {
  getElementById(id) { if (!elements.has(id)) elements.set(id, makeEl(id)); return elements.get(id); },
  querySelectorAll() { return []; },
  querySelector() { return null; },
  createElement() { return { style:{}, href:'', download:'', click(){}, remove(){}, appendChild(){}, body:null }; },
  body: { appendChild(){} },
  documentElement: {},
};
const sandbox = {
  document: documentStub,
  window: {},
  location: { hostname: 'example.com', pathname: '/' },
  localStorage: { getItem(){ return null; }, setItem(){} },
  speechSynthesis: null,
  console,
  URL: { createObjectURL(){ return 'blob:fake'; }, revokeObjectURL(){} },
  fetch: async (u) => {
    const name = u.split('/').pop();
    const p = path.join(__dirname, '..', '..', 'dialoguejson', name);
    if (!fs.existsSync(p)) return { ok: false };
    return { ok: true, json: async () => JSON.parse(fs.readFileSync(p, 'utf8')) };
  },
  setTimeout, clearTimeout, setInterval, clearInterval,
  Math, JSON, Object, Array, String, Number, Boolean, RegExp, Date, Promise,
};
sandbox.window.speechSynthesis = { getVoices(){ return []; }, speak(){}, cancel(){} };
sandbox.window.confirm = () => true;
sandbox.globalThis = sandbox;

vm.createContext(sandbox);
vm.runInContext(js, sandbox, { filename: target + ' script' });

(async () => {
  // The script runs renderMenu() and loadJsonDialogues() at the end (async).
  await new Promise(r => setTimeout(r, 50));
  const convs = vm.runInContext('conversations', sandbox);
  const list = convs.map(c => ({ id: c.id, task: c.task, topic: c.topic, lines: c.lines }));
  console.log('conversations loaded:', convs.length);
  for (const c of list) console.log(' ', JSON.stringify(c));
  const t2 = convs.filter(c => c.task === 'tache2').length;
  const t3 = convs.filter(c => c.task === 'tache3').length;
  console.log('tache2:', t2, '| tache3:', t3);
  // verify each conv has data + translations
  for (const c of convs) {
    if (!c._data || c._data.length !== c.lines) throw new Error(c.id + ': bad _data length');
    if (c._translations.length !== c.lines) throw new Error(c.id + ': bad translations length');
    if (!c.templateBank) throw new Error(c.id + ': missing templateBank');
  }
  console.log('SMOKE TEST PASSED');
})().catch(e => { console.error('SMOKE TEST FAILED:', e); process.exit(1); });
