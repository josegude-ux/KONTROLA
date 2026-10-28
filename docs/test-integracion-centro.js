const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = __dirname;
const one = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const two = fs.readFileSync(path.join(root, 'VISURA_ORDENES.html'), 'utf8');
assert.equal(one, two, 'Los dos HTML publicados deben permanecer idénticos');
const ids = [...one.matchAll(/id="funcion-(\d+)"/g)].map(match=>Number(match[1])).sort((a,b)=>a-b);
assert.deepEqual(ids, Array.from({length:11},(_,i)=>i+1));
for (const needle of [
 'data-open-order="funcion-1"', 'data-open-order="funcion-11"',
 'CONTINUAR DESARROLLO', 'DIAGNOSTICAR PARADA Y REANUDAR',
 'id="copy-safe-continuity-all"', 'id="recovery-copy-diagnostic"',
 'id="recovery-copy-prompt"', 'id="recovery-verify"',
 'id="manager-list"', 'id="manager-import-file"',
 'src="./visura-recovery.js"', 'src="./chatgpt-import.js"',
 'href="./visura-recovery.css"', 'href="./assets/icons/apple-touch-icon.png"'
]) assert.ok(one.includes(needle), `Falta ${needle}`);
const recovery = require(path.join(root, 'visura-recovery.js'));
const imp = require(path.join(root, 'chatgpt-import.js'));
assert.equal(typeof recovery.analyze, 'function');
assert.equal(typeof recovery.askDiagnostic, 'function');
assert.equal(typeof recovery.verifyOutcome, 'function');
assert.equal(typeof imp.extractMetadata, 'function');
assert.equal(typeof imp.planImport, 'function');
const id='a'.repeat(32);
const source=imp.extractMetadata([{id,title:'03.1 - VISURA',mapping:{dontSave:{private:'message'}}}]);
assert.deepEqual(source.chats.map(x=>({id:x.id,title:x.title})),[{id,title:'03.1 - VISURA'}]);
assert.ok(!JSON.stringify(source).includes('private'));
const resumed=recovery.analyze('PROYECTO: VISURA\nCAUSA: error de streaming\nTRABAJO PENDIENTE: revisar commits');
assert.equal(resumed.type,'B');
assert.ok(recovery.recoveryPrompt(resumed).includes('TIPO B'));
console.log('OK: integración estática, scripts, icono y clasificación (requiere checkout completo)');