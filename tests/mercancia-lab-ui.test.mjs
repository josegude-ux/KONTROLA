import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
test("LAB: rutas y controles visibles de ensayo con A/B/C y PDF local",()=>{
 const html=read("lab/visura-prepara-v056.html");
 const script=read("lab/visura-prepara-v056-lab.mjs");
 for(const id of ["warehouse","pdfs","demo","clear","search","loads","selectAll","markVisible","unselect","prepare","preview","print","closePreview"])assert.match(html,new RegExp('id="'+id+'"'));
 assert.match(html,/script type="module" src="\.\/visura-prepara-v056-lab\.mjs"/);
 assert.match(script,/planificarRecortesMercancia\(/);
 assert.match(script,/validarParidadDocumento\(/);
 assert.match(script,/seleccionarTodasImpresion\(/);
 assert.match(script,/marcarVisiblesImpresion\(/);
 assert.match(script,/window\.print\(\)/);
});
test("LAB: sin envío de documentos ni credenciales empresariales",()=>{
 const script=read("lab/visura-prepara-v056-lab.mjs");
 assert.doesNotMatch(script,/\bfetch\(/);
 assert.doesNotMatch(script,/\b(client|supabase)\s*\.\s*(rpc|from|storage)\b/i);
 assert.doesNotMatch(script,/localStorage|sessionStorage|indexedDB/i);
 assert.match(script,/task\.destroy\(\)/);
 assert.match(script,/15\*1024\*1024/);
});
test("LAB: impresión A4 esconde cabeceras, acciones y no imprime sin límite",()=>{
 const html=read("lab/visura-prepara-v056.html");
 assert.match(html,/@page\{size:A4 portrait;margin:10mm\}/);
 assert.match(html,/#preview>\.actions\{display:none!important\}/);
 assert.match(html,/body>\*:not\(#preview\)\{display:none!important\}/);
 assert.match(read("src/mercancia-v056.mjs"),/No se ha identificado el final de MERCANCIA/);
});
test("LAB: caché incluye el código nuevo sin introducir despliegue",()=>{
 const sw=read("sw.js");
 for(const path of ["src/batch-selection-v056.mjs","src/mercancia-v056.mjs","lab/visura-prepara-v056.html","lab/visura-prepara-v056-lab.mjs"])
  assert.ok(sw.includes("./"+path),path);
 assert.match(sw,/lab95-mercancia-v056/);
});
