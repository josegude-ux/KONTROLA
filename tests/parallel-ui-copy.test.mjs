import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const html=readFileSync(new URL("../index.html",import.meta.url),"utf8");

test("la navegación no promete cronómetros y comunica los flujos paralelos aprobados",()=>{
  assert.doesNotMatch(html,/Inicia el reloj|su reloj sigue abierto|Aparecen cargas preparadas por otra persona/);
  assert.match(html,/Consultar un documento no inicia ningún proceso operativo/);
  assert.match(html,/Registra el inicio al comenzar y finaliza al concluir el trabajo físico/);
  assert.match(html,/Comprueba la mercancía disponible sin esperar a que termine Preparación/);
  assert.match(html,/Puedes iniciar la verificación desde que se publica la carga/);
  assert.match(html,/No puedes verificar una carga preparada por ti/);
});
