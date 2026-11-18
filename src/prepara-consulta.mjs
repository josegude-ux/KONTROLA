/* PREPARA 15 · Consultas auxiliares de cargas. Solo lectura, sin datos de stock BC. */
const clean = value => String(value ?? "").trim();
const fold = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("es-ES");

export function articulosDeCargas(cargas = [], almacen = "") {
  if (!Array.isArray(cargas)) return [];
  const rows = [];
  for (const carga of cargas) {
    if (!carga || !Array.isArray(carga.productos) || (almacen && carga.almacen && carga.almacen !== almacen)) continue;
    const codigoCarga = clean(carga.codigo);
    for (const p of carga.productos) {
      if (!p || !clean(p.sku)) continue;
      rows.push({
        sku: clean(p.sku).slice(0, 80),
        descripcion: clean(p.description).slice(0, 240),
        ubicacion: clean(p.location).slice(0, 90).toUpperCase(),
        cantidadCarga: Number.isFinite(Number(p.qty)) && Number(p.qty) >= 0 ? Number(p.qty) : null,
        unidad: clean(p.unit).slice(0, 40),
        carga: codigoCarga.slice(0, 80)
      });
      if (rows.length >= 10000) return rows;
    }
  }
  return rows;
}

export function buscarArticulosDeCargas(rows, query, limit = 80) {
  const q = fold(query).slice(0, 120);
  if (q.length < 2) return [];
  const out = [];
  for (const r of Array.isArray(rows) ? rows : []) {
    if ([r.sku,r.descripcion,r.ubicacion,r.carga].some(value => fold(value).includes(q))) out.push(r);
    if (out.length >= Math.min(Math.max(1, Number(limit) || 80), 100)) break;
  }
  return out;
}

export function ubicacionesEnCargas(rows) {
  const found = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    if (!row.sku || !row.ubicacion) continue;
    const key = row.sku + "|" + row.ubicacion;
    if (!found.has(key)) found.set(key, {key, sku:row.sku, ubicacion:row.ubicacion, descripcion:row.descripcion});
  }
  return [...found.values()].sort((a,b) => a.sku.localeCompare(b.sku,"es",{numeric:true}) || a.ubicacion.localeCompare(b.ubicacion,"es"));
}

export function validarVistaPreviaMovimiento({origenKey, destino, cantidad}, ubicaciones) {
  const errors=[];
  const source = (Array.isArray(ubicaciones) ? ubicaciones : []).find(row => row.key === origenKey);
  if (!source) errors.push("Selecciona un artículo y ubicación de las cargas consultables.");
  const target = clean(destino).toUpperCase();
  if (!/^[A-Z0-9ÁÉÍÓÚÜÑ][A-Z0-9ÁÉÍÓÚÜÑ._/\-]{0,59}$/.test(target)) errors.push("Indica una ubicación destino válida, sin espacios ni caracteres especiales.");
  if (source && source.ubicacion === target) errors.push("La ubicación destino debe ser distinta de la de origen.");
  const raw = clean(cantidad).replace(",", ".");
  const validAmount = /^(?:0|[1-9]\d{0,5})(?:\.\d{1,3})?$/.test(raw);
  const amount = validAmount ? Number(raw) : NaN;
  if (!validAmount || !Number.isFinite(amount) || amount <= 0 || amount > 999999) errors.push("Indica una cantidad positiva (máximo 999999 y tres decimales).");
  return {ok:errors.length===0,errores:errors,propuesta:errors.length ? null : {
    referencia:source.sku,descripcion:source.descripcion,origen:source.ubicacion,destino:target,cantidad:amount,
    advertencia:"BORRADOR LOCAL: no verifica existencias ni realiza movimientos de almacén."
  }};
}
