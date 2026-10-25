/** Contrato preliminar de rutas MOVENTA/KONTROLA, sin SSO entre proyectos. */
export const KONTROLA_MODULE_ID = "kontrola";
export const KONTROLA_BACKEND_PROJECT = "oevetnszmfxeukcncwji";
/** moduleUrl se resuelve dentro del directorio del lanzador, nunca fuera de él. */
export function resolveKontrolaMount({hostOrigin, moduleUrl}) {
  const host = new URL(hostOrigin);
  if (!["https:", "http:"].includes(host.protocol) || host.username || host.password || host.search || host.hash)
    throw new Error("Origen MOVENTA no válido");
  const base = new URL(host.pathname.endsWith("/") ? host.href : new URL("./", host).href);
  const module = new URL(moduleUrl, base);
  const expected = new URL("kontrola/", base);
  if (module.origin !== base.origin || (module.pathname !== expected.pathname && module.pathname !== expected.pathname + "index.html"))
    throw new Error("Ruta KONTROLA fuera del ámbito MOVENTA");
  if (module.username || module.password || module.search || module.hash)
    throw new Error("La ruta del módulo no puede contener credenciales ni parámetros");
  return module.href;
}
/** La comparación de UUID solo sirve tras una identidad común comprobada en servidor. */
export function assertKontrolaIdentity({moventaUserId, kontrolaUserId, authorized, sharedAuthVerified}) {
  if (sharedAuthVerified !== true || !moventaUserId || !kontrolaUserId || moventaUserId !== kontrolaUserId || authorized !== true)
    throw new Error("KONTROLA requiere identidad común verificada y permiso");
  return true;
}
