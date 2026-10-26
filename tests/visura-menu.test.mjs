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
  ["openPreparation", "Preparación", "visura-prepara-preparacion-3d.webp"],
  ["openReview", "Control de Cargas", "visura-prepara-control-cargas-3d.webp"],
  ["openCargas", "Operaciones", "visura-prepara-operaciones-3d.webp"],
  ["openAdmin", "Administración", "visura-prepara-administracion-3d.webp"]
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

test("acciones de las cuatro tarjetas siguen conectadas a controladores originales", () => {
  const app = readFileSync(resolve(root, "src/app.mjs"), "utf8");
  const bindings = [
    ["openPreparation", "openLoadsMenu()"],
    ["openReview", "openReviewMenu()"],
    ["openCargas", 'switchView("cargasMenuView")'],
    ["openAdmin", 'openAdminMenu("homeView")']
  ];
  for (const [id, handler] of bindings) {
    const escaped = handler.replace(/[.*+?^\x24{}()|[\]\\]/g, "\\$&");
    const re = new RegExp('\\$\\("'+id+'"\\)\\.addEventListener\\("click",[\\s\\S]{0,140}?'+escaped);
    assert.match(app, re, `No se encuentra el manejador original para ${id}`);
  }
});

test("administración permanece oculta por defecto hasta autorizar su visibilidad", () => {
  const card = html.match(/<button id="openAdmin"[^>]*>/)?.[0];
  assert.ok(card, "Falta la tarjeta de administración");
  assert.match(card, /\shidden(?:\s|>)/, "Administración no debe mostrarse antes de validar permisos");
});

test("las ilustraciones de las cuatro funciones son distintas y están optimizadas", () => {
  const sources = cards.map(([id]) => {
    const card = html.match(new RegExp(`<button id="${id}"[\\s\\S]*?</button>`))?.[0];
    assert.ok(card, `Falta la tarjeta ${id}`);
    const src = card.match(/<img[^>]*src="([^"]+)"/)?.[1];
    assert.ok(src?.endsWith(".webp"), `Se requiere WEBP en ${id}`);
    return src;
  });
  assert.equal(new Set(sources).size, 4, "No se deben reutilizar imágenes entre tarjetas");
});

test("la precarga PWA conserva las cuatro ilustraciones para uso sin conexión", () => {
  const assets = sw.match(/const ASSETS=(\[[^;]+\]);/)?.[1];
  assert.ok(assets, "No se encuentra la lista de precarga");
  for (const [id] of cards) {
    const card = html.match(new RegExp(`<button id="${id}"[\\s\\S]*?</button>`))?.[0];
    const src = card?.match(/<img[^>]*src="([^"]+)"/)?.[1];
    assert.ok(src && assets.includes(JSON.stringify(src)), `No está precargada la imagen de ${id}`);
  }
});

test("las tarjetas principales conservan los tipos de boton para evitar envios accidentales", () => {
  for (const [id] of cards) {
    const tag = html.match(new RegExp(`<button id="${id}"[^>]*>`))?.[0];
    assert.ok(tag, `Falta el boton ${id}`);
    assert.match(tag, /\stype="button"/, `El boton ${id} no debe enviar formularios`);
  }
});

test("las ilustraciones decorativas no se anuncian como contenido funcional", () => {
  for (const [id] of cards) {
    const card = html.match(new RegExp(`<button id="${id}"[\\s\\S]*?<\\/button>`))?.[0];
    assert.ok(card, `Falta la tarjeta ${id}`);
    assert.match(card, /class="feature-art" aria-hidden="true"/);
    assert.match(card, /<img[^>]*alt=""/);
  }
});


test("las cuatro imagenes oficiales son WEBP validos y optimizados", () => {
  for (const [id, , image] of cards) {
    const match = html.match(new RegExp(`<button id="${id}"[\\s\\S]*?</button>`));
    const src = match?.[0].match(/<img[^>]*src="([^"]+)"/)?.[1];
    assert.ok(src, `Falta src de ${id}`);
    const bytes = readFileSync(resolve(root, src));
    assert.equal(bytes.toString("ascii", 0, 4), "RIFF", `Cabecera RIFF invalida: ${src}`);
    assert.equal(bytes.toString("ascii", 8, 12), "WEBP", `Cabecera WEBP invalida: ${src}`);
    assert.ok(bytes.length > 1000 && bytes.length <= 2_000_000, `Tamano inesperado: ${src}`);
    assert.equal(src.split("/").pop(), image);
  }
});

test("la caché PWA usa la version v064 tras cambiar las ilustraciones oficiales", () => {
  assert.match(sw, /kontrola-integral-visura-v070/);
});
