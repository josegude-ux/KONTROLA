// Selector puro de presentación. No altera registros ni concede acceso.
// Solo acepta archivo confirmado explícitamente por una consulta autorizada.
export function filtrarArchivoLogico(cargas, { vista = "activas" } = {}) {
  if (!Array.isArray(cargas)) return [];
  if (!["activas", "archivadas", "todas"].includes(vista)) return [];
  return cargas.filter(c => {
    if (!c || typeof c !== "object" || Array.isArray(c)) return false;
    // Un valor ausente o ambiguo NO se interpreta como archivado.
    if (vista === "archivadas") return c.archivado === true;
    if (vista === "activas") return c.archivado !== true;
    return true;
  });
}
