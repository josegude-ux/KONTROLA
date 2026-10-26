import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const html = readFileSync(new URL("../index.html", import.meta.url), "utf8");
const sw = readFileSync(new URL("../sw.js", import.meta.url), "utf8");
const cards = [
  ["openPreparation", "Preparación", "kontrola-preparacion-3d.webp"],
  ["openReview", "Control de Cargas", "kontrola-verificacion-3d.webp"],
  ["openCargas", "Operaciones", "kontrola-control-cargas-3d.webp"],
  ["openAdmin", "Administración", "kontrola-administracion-3d.webp"]
];
for (const [id, label, image] of cards) {
  test(`tarjeta ${id}: mantiene ID, etiqueta y recurso de imagen`, () => {
    const match = html.match(new RegExp(`<button id="${id}"[\\s\\S]*?</button>`));
    assert.ok(match, `Falta tarjeta ${id}`);
    assert.match(match[0], new RegExp(`<b>${label}</b>`));
    assert.ok(match[0].includes(image));
    assert.ok(sw.includes(image), `Imagen no precargada: ${image}`);
  });
}
test("el menú conserva las cuatro acciones distintas", () => {
  assert.equal(new Set(cards.map(([id]) => id)).size, 4);
  for (const [id] of cards) assert.equal((html.match(new RegExp(`id="${id}"`, "g")) || []).length, 1);
});
