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
