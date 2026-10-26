import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const html = readFileSync(resolve(root, "index.html"), "utf8");
const sw = readFileSync(resolve(root, "sw.js"), "utf8");
const cards = [
  ["openPreparation", "Preparación", "kontrola-preparacion-3d.webp"],
  ["openReview", "Control de Cargas", "kontrola-verificacion-3d.webp"],
  ["openCargas", "Operaciones", "kontrola-control-cargas-3d.webp"],
  ["openAdmin", "Administración", "kontrola-administracion-3d.webp"]
];
for (const [id, label, image] of cards) {
  test(`tarjeta ${id}: mantiene ID, etiqueta e imagen de respaldo`, () => {
    const match = html.match(new RegExp(`<button id="${id}"[\\s\\S]*?</button>`));
    assert.ok(match, `Falta tarjeta ${id}`);
    assert.ok(match[0].includes(`<b>${label}</b>`));
    const src = match[0].match(/src="([^"]+\.webp)"/)?.[1];
    assert.ok(src?.endsWith(image), `Imagen incorrecta para ${id}`);
    assert.ok(existsSync(resolve(root, src)), `No existe el recurso ${src}`);
    assert.ok(sw.includes(src), `Imagen no precargada: ${src}`);
  });
}
test("el menú conserva las cuatro acciones distintas", () => {
  assert.equal(new Set(cards.map(([id]) => id)).size, 4);
  for (const [id] of cards) assert.equal(html.split(`id="${id}"`).length - 1, 1);
});
