import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {estadoTarjetaVerificacion} from "../src/control-cargas-checklist-ui.mjs";

const ui=readFileSync(new URL("../src/control-cargas-checklist-ui.mjs",import.meta.url),"utf8");
const css=readFileSync(new URL("../styles.css",import.meta.url),"utf8");

test("Verificación: pendiente cuando ninguna línea se ha comprobado",()=>{
 assert.equal(estadoTarjetaVerificacion({closedAt:null},{checked:0,total:92}),"pendiente");
});
test("Verificación: en proceso con progreso parcial o completo aún sin cerrar",()=>{
 assert.equal(estadoTarjetaVerificacion({closedAt:null},{checked:13,total:70}),"en-proceso");
 assert.equal(estadoTarjetaVerificacion({closedAt:null},{checked:70,total:70}),"en-proceso");
});
test("Verificación: solo el cierre real muestra Finalizada",()=>{
 assert.equal(estadoTarjetaVerificacion({closedAt:"2026-11-17T11:00:00Z"},{checked:72,total:72}),"finalizada");
 assert.equal(estadoTarjetaVerificacion({closedAt:null},{checked:0,total:72}),"pendiente");
});
test("Tarjetas: matrícula de PRUEBA_3 visible y buscable, nunca una matrícula de ejemplo",()=>{
 assert.match(ui,/String\(load\.plate\|\|load\.matricula\|\|""\)/);
 assert.match(ui,/class="cc-load-plate"/);
 assert.match(ui,/load\.plate\|\|load\.matricula/);
 assert.match(ui,/No indicada/);
 assert.doesNotMatch(ui,/4863JPP|2554JRM|4686FRG/);
});
test("Tarjetas: estados con etiquetas y colores, gesto seguro, sin nuevas escrituras",()=>{
 for(const value of ["pendiente","en-proceso","finalizada"])assert.ok(css.includes("cc-load-card--"+value));
 assert.match(ui,/cc-load-state/);
 assert.match(ui,/button\[data-load\]/);
 assert.match(ui,/if\(!isShortClick\(event\)\)return;/);
 assert.doesNotMatch(ui,/client\.rpc\(|createClient\(|visura_p3_comando/);
});

test("Matrícula: una sola línea, tamaño fluido y columna prioritaria en móvil",()=>{
 const rule=css.match(/#controlChecklistView \.cc-load-plate strong\s*\{([^}]+)\}/);
 assert.ok(rule,"falta la regla de matrícula");
 assert.match(rule[1],/white-space:nowrap/);
 assert.match(rule[1],/font-size:clamp\(18px,4\.8vw,25px\)/);
 assert.match(rule[1],/word-break:normal/);
 assert.match(css,/grid-template-columns:minmax\(0,1\.4fr\) minmax\(0,\.8fr\) 14px/);
 assert.match(css,/@media\(max-width:380px\)/);
 assert.match(css,/cc-load-plate strong\{font-size:clamp\(19px,5\.4vw,24px\);white-space:nowrap\}/);
});
