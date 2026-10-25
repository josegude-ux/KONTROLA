// Evaluación local conservadora. No consulta ni modifica Supabase.
const DAY_MS = 24 * 60 * 60 * 1000;
export const RETENTION_DAYS = 90;

export function evaluarArchivoCarga(carga, { ahora = new Date() } = {}) {
  const motivos = [];
  if (!carga || typeof carga !== "object" || Array.isArray(carga)) return { elegible: false, motivos: ["datos_no_verificados"] };
  if (carga.estado !== "cerrada") motivos.push("estado_no_cerrado");
  if (carga.verificacionCompleta !== true) motivos.push("verificacion_no_acreditada");
  if (carga.incidenciasResueltas !== true) motivos.push("incidencias_no_acreditadas");
  if (carga.sinBloqueos !== true) motivos.push("bloqueos_no_acreditados");
  if (carga.dependenciasVerificadas !== true) motivos.push("dependencias_no_acreditadas");
  const fecha = carga.cierreDefinitivoEn;
  const cierre = typeof fecha === "string" && /^\d{4}-\d{2}-\d{2}T/.test(fecha) && /(?:Z|[+-]\d{2}:\d{2})$/.test(fecha) ? Date.parse(fecha) : NaN;
  const instante = ahora instanceof Date ? ahora.getTime() : NaN;
  if (!Number.isFinite(cierre) || !Number.isFinite(instante) || cierre > instante) motivos.push("fecha_cierre_no_verificable");
  else if (instante - cierre < RETENTION_DAYS * DAY_MS) motivos.push("plazo_insuficiente");
  return { elegible: motivos.length === 0, motivos };
}
