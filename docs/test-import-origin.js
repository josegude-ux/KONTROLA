const assert = require('node:assert/strict');
const { canUseImportAtLocation } = require('./chatgpt-import.js');
const loc = (protocol, hostname) => ({protocol, hostname});
const denied = [
  loc('https:', 'rawcdn.githack.com'), loc('https:', 'raw.githack.com'),
  loc('https:', 'josegude-ux.github.io'), loc('https:', 'example.com'),
  loc('https:', 'visura-centro.pages.dev'), loc('http:', 'example.com'),
  loc('file:', ''), null, {}
];
for (const candidate of denied) assert.equal(canUseImportAtLocation(candidate), false, JSON.stringify(candidate));
for (const candidate of [loc('http:', 'localhost'), loc('http:', '127.0.0.1'), loc('https:', 'localhost'), loc('http:', '[::1]')]) assert.equal(canUseImportAtLocation(candidate), true, JSON.stringify(candidate));
console.log('13/13 pruebas de protección de origen correctas');
