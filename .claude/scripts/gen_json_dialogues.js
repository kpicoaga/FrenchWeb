#!/usr/bin/env node
// Generates dialogue1..dialogue5.json from the embedded data block in index.html
// (raw/raw2..raw5, translations*, spanishPhonetic*, expressions*), then writes a
// manifest index.json listing every dialogue*.json in dialoguejson/.
//
// Usage: node .claude/scripts/gen_json_dialogues.js
//        (run from FrenchWeb/)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const INDEX = path.join(ROOT, 'index.html');
const OUTDIR = path.join(ROOT, 'dialoguejson');

const html = fs.readFileSync(INDEX, 'utf8');
const lines = html.split('\n');

// 1) Extract the embedded data block: from "const raw=" (line 219, 1-based)
//    to just before "// ---------- Conversation listings for landing page ----------"
const startIdx = lines.findIndex(l => /^\s*const raw=`/.test(l));
const endMarker = '// ---------- Conversation listings for landing page ----------';
const endIdx = lines.findIndex((l, i) => i > startIdx && l.includes(endMarker));
if (startIdx < 0 || endIdx < 0) {
  console.error('Boundary markers not found:', { startIdx, endIdx });
  process.exit(1);
}
const block = lines.slice(startIdx, endIdx).join('\n');

// 2) Evaluate it. It only defines consts; put everything on a sandbox object.
const sandbox = {};
vm.createContext(sandbox);
vm.runInContext(block, sandbox, { filename: 'index.html-embedded-data.js' });

// 3) Extract the five dialogues.
// NOTE: the block declares top-level `const`s. `vm.runInContext('name', sandbox)`
// reads them from the context's global lexical scope; they are NOT sandbox props.
function readVar(name) {
  try { return vm.runInContext(name, sandbox, { filename: 'index.html-embedded-data.js' }); }
  catch (e) { return undefined; }
}
const ids = ['dialogue1', 'dialogue2', 'dialogue3', 'dialogue4', 'dialogue5'];
const meta = {
  dialogue1: {
    title: "Inscription aux cours de français",
    description: "Appel téléphonique pour s'inscrire à des cours de français du soir pour préparer l'examen TCF Canada.",
    topic: "4. Education",
    task: "tache2",
    labels: { E: 'Interlocuteur', C: 'Candidat(e)' },
    roles: { 'Speaker 1': 'E', 'Speaker 2': 'C' },
  },
  dialogue2: {
    title: "Ouverture de compte bancaire",
    description: "Appel téléphonique pour ouvrir un nouveau compte en banque.",
    topic: "13. Administrative & banking",
    task: "tache2",
    labels: { E: 'Interlocuteur', C: 'Candidat(e)' },
    roles: { 'Speaker 1': 'E', 'Speaker 2': 'C' },
  },
  dialogue3: {
    title: "Garder l'appartement d'un ami",
    description: "Un ami part quelques jours et vous demande de vous occuper de son appartement : plantes, courrier, poubelles et urgences.",
    topic: "1. Housing",
    task: "tache2",
    labels: { E: 'Votre ami(e)', C: 'Vous' },
    roles: { 'Speaker 1': 'E', 'Speaker 2': 'C' },
  },
  dialogue4: {
    title: "Louer un appartement",
    description: "Appel à une agence immobilière pour se renseigner sur un appartement : loyer, charges, dépôt de garantie, bail et visite.",
    topic: "1. Housing",
    task: "tache2",
    labels: { E: 'Agence immobilière', C: 'Vous' },
    roles: { 'Speaker 1': 'E', 'Speaker 2': 'C' },
  },
  dialogue5: {
    title: "Apprendre une langue étrangère dès l'enfance",
    description: "Simulation TCF : réponse argumentée sur l'apprentissage précoce des langues — avantages linguistiques, cognitifs et culturels.",
    topic: "4. Education",
    task: "tache3",
    labels: { E: 'Examinatrice', C: 'Candidat(e)' },
    roles: { 'Speaker 1': 'E', 'Speaker 2': 'C' },
  },
};

function readConv(name) {
  try { return vm.runInContext(name, convSandbox, { filename: 'index.html-conversations.js' }); }
  catch (e) { return undefined; }
}
// Template bank metadata comes from the SAME conversations array the page uses,
// so the templateBank JSON matches index.html's templateBank object verbatim.
const convStart = lines.findIndex(l => l.includes('const conversations = ['));
const convEnd = lines.findIndex(l => l.trim() === '];' && l.trim().length === 2 && l.indexOf('];') >= 0 ? l.trim() === '];' : false);
// Simpler: find the '];' that closes conversations, after convStart.
let convEndIdx = -1;
{
  let depth = 0;
  for (let i = convStart; i < lines.length; i++) {
    const t = lines[i].trim();
    depth += (t.match(/\[/g) || []).length - (t.match(/\]/g) || []).length;
    if (depth <= 0 && t.includes('];') && i > convStart) { convEndIdx = i; break; }
  }
}
if (convEndIdx < 0) { console.error('conversations array end not found'); process.exit(1); }
const convBlock = lines.slice(convStart, convEndIdx + 1).join('\n');
const convSandbox = {};
vm.createContext(convSandbox);
vm.runInContext(convBlock, convSandbox, { filename: 'index.html-conversations.js' });
const conversations = readConv('conversations');

function buildJson(id) {
  const m = meta[id];
  const n = id.replace('dialogue', ''); // '1'..'5'
  const turnsRaw = readVar('raw' + (n === '1' ? '' : n));
  const dataArr = readVar('data' + (n === '1' ? '' : n));
  const translationsArr = readVar('translations' + (n === '1' ? '' : n));
  const phoneticsArr = readVar('spanishPhonetic' + (n === '1' ? '' : n));
  const expressionsArr = readVar('expressions' + (n === '1' ? '' : n));
  if (!turnsRaw || !dataArr) { throw new Error('Missing data for ' + id); }

  // Map the parsed data back to "raw line" objects: raw lines are E| or C| prefixed.
  // The data parser already split them; we can reconstruct each turn from dataArr,
  // then attach translation/phonetic by index.
  const lines = turnsRaw.split('\n').map(l => l.trim()).filter(Boolean);
  if (lines.length !== dataArr.length) {
    throw new Error(id + ': raw line count ' + lines.length + ' != data count ' + dataArr.length);
  }

  // Re-parse each raw line with the SAME logic as index.html's data mapper.
  function parseLine(line, i) {
    let rest = line.trim();
    let role = rest.startsWith('C') ? 'C' : 'E';
    if (rest.startsWith('C|') || rest.startsWith('E|')) { role = rest[0]; rest = rest.slice(2); }
    const idx = rest.lastIndexOf(' [');
    if (idx >= 0) {
      return { speaker: role === 'C' ? 'Speaker 2' : 'Speaker 1', text: rest.slice(0, idx).trim(), annotation: rest.slice(idx + 2, -1).trim() };
    }
    return { speaker: role === 'C' ? 'Speaker 2' : 'Speaker 1', text: rest.trim(), annotation: '' };
  }

  const turns = lines.map(parseLine).map((t, i) => ({
    speaker: t.speaker,
    text: t.text,
    en: translationsArr ? (translationsArr[i] || '') : '',
    es: phoneticsArr ? (phoneticsArr[i] || '') : '',
    note: t.annotation,
  }));

  const conv = conversations.find(c => c.id === id) || {};
  const tb = conv.templateBank || null;

  const json = {
    title: m.title,
    task: m.task,
    topic: m.topic,
    description: m.description,
    labels: m.labels,
    roles: m.roles,
    expressions: expressionsArr || [],
    templateBank: tb,
    model: 'google/gemini-3.8-flash-lite-tts',
    speakers: {
      'Speaker 1': { voice: 'Kore' },
      'Speaker 2': { voice: 'Puck' },
    },
    turns,
  };
  return json;
}

fs.mkdirSync(OUTDIR, { recursive: true });
const written = [];
for (const id of ids) {
  const json = buildJson(id);
  const out = path.join(OUTDIR, id + '.json');
  fs.writeFileSync(out, JSON.stringify(json, null, 4) + '\n');
  written.push(id + '.json');
  console.log('wrote', out, '(' + fs.statSync(out).size + ' bytes)');
}

// 4) Manifest index.json: list every dialogue*.json, dialogue1..5 first.
const files = fs.readdirSync(OUTDIR).filter(f => /^dialogue\d+\.json$/i.test(f));
files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
const manifest = files.map(f => f);
fs.writeFileSync(path.join(OUTDIR, 'index.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log('wrote', path.join(OUTDIR, 'index.json'), JSON.stringify(manifest));
console.log('DONE');
