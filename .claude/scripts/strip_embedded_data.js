#!/usr/bin/env node
// Strips the embedded dialogue data + static conversations array from index.html,
// replacing them with a JSON-driven setup. Writes to a TEMP file so the original
// is untouched until verified.
//
// Usage: node .claude/scripts/strip_embedded_data.js  (run from FrenchWeb/)
'use strict';
const fs = require('fs');
const path = require('path');

const INDEX = path.join(__dirname, '..', '..', 'index.html');
const OUT = path.join(__dirname, '..', '..', 'index.new.html');

const text = fs.readFileSync(INDEX, 'utf8');

// ---- Step 1: remove the embedded dialogue-data block --------------------
// From the "const raw=`..." line up to (not including) the
// "// ---------- Conversation listings for landing page ----------" comment.
const rawMarker = 'const raw=`';
const rawIdx = text.indexOf(rawMarker);
if (rawIdx < 0) throw new Error('const raw= marker not found');
const lineStart = text.lastIndexOf('\n', rawIdx) + 1;
const endMarker = '// ---------- Conversation listings for landing page ----------';
const endIdx = text.indexOf(endMarker);
if (endIdx < 0) throw new Error('conversations comment marker not found');
let t = text.slice(0, lineStart) + '\n' + text.slice(endIdx);
console.log('step1: embedded data block removed (start line', rawIdx, '-> end line', endIdx, ')');

// ---- Step 2: replace the static conversations array ----------------------
const convStart = t.indexOf('const conversations = [');
if (convStart < 0) throw new Error('conversations array start not found');
// Find the matching '];' that closes the array (balanced brackets).
let depth = 0, convEnd = -1;
for (let i = t.indexOf('[', convStart); i < t.length; i++) {
  const ch = t[i];
  if (ch === '[') depth++;
  else if (ch === ']') { depth--; if (depth === 0) { convEnd = i; break; } }
}
if (convEnd < 0) throw new Error('conversations array end not found');
// Extend to include the trailing ';' (if present) and newline.
let after = convEnd + 1;
if (t[after] === ';') after++;
const NEW_ARRAY = `// Dialogue content (text, translations, phonetics, template banks) lives in
// dialoguejson/*.json and is loaded at startup by loadJsonDialogues().
const conversations = [];`;
t = t.slice(0, convStart) + NEW_ARRAY + t.slice(after);
console.log('step2: static conversations array replaced with empty (JSON-driven)');

fs.writeFileSync(OUT, t);
console.log('wrote candidate:', OUT, '(', t.length, 'chars, was', text.length, ')');
