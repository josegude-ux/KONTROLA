/** Contrato de integración de KONTROLA en MOVENTA. Sin intercambio de JWT entre proyectos. */
export const KONTROLA_MODULE_ID = "kontrola";
export const KONTROLA_BACKEND_PROJECT = "oevetnszmfxeukcncwji";
export function resolveKontrolaMount({hostOrigin, moduleUrl}) {
  const host = new URL(hostOrigin);
  const module = new URL(moduleUrl, host);
  if (!["https:", "http:"].includes(host.protocol) || module.origin !== host.origin)
    throw new Error("El módulo debe alojarse en el mismo origen de MOVENTA");
  if (module.username || module.password || module.search || module.hash)
    throw new Error("La ruta del módulo no puede contener credenciales ni parámetros");
  if (!module.pathname.endsWith("/kontrola/") && !module.pathname.endsWith("/kontrola/index.html"))
    throw new Error("Ruta KONTROLA no autorizada");
  return module.href;
}
export function assertKontrolaIdentity({moventaUserId, kontrolaUserId, authorized}) {
  if (!moventaUserId || !kontrolaUserId || moventaUserId !== kontrolaUserId || authorized !== true)
    throw new Error("KONTROLA no puede abrirse sin identidad y permiso verificados");
  return true;
}
