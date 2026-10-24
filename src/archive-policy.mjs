/** KONTROLA: reglas puras de archivado, sin efectos secundarios ni borrado. */
export const ARCHIVE_AFTER_DAYS = 30;
export const STORAGE_WARNING_PERCENT = 70;
const DAY_MS = 24 * 60 * 60 * 1000;

/** No basta con cerrar la preparación: la carga debe estar finalizada. */
export function eligibleForArchive({ status, closedAt }, now = new Date()) {
  if (status !== 'finalizada' || !closedAt) return false;
  const closed = new Date(closedAt).getTime();
  const current = new Date(now).getTime();
  return Number.isFinite(closed) && Number.isFinite(current)
    && closed <= current && current - closed >= ARCHIVE_AFTER_DAYS * DAY_MS;
}

/** Devuelve null si no hay métricas fiables; nunca asume consumo cero. */
export function storageUsagePercent(usedBytes, quotaBytes) {
  if (!Number.isFinite(usedBytes) || !Number.isFinite(quotaBytes)
    || usedBytes < 0 || quotaBytes <= 0) return null;
  return (usedBytes / quotaBytes) * 100;
}

export function storageWarning(usedBytes, quotaBytes) {
  const percent = storageUsagePercent(usedBytes, quotaBytes);
  return percent === null ? { status: 'unknown', percent: null }
    : { status: percent >= STORAGE_WARNING_PERCENT ? 'warning' : 'ok', percent };
}

/** Solo una verificación positiva del contenido recuperado permite confirmar archivo. */
export function archiveVerificationStatus({ originalSha256, recoveredSha256, originalSize, recoveredSize }) {
  const validHash = (s) => typeof s === 'string' && /^[a-f0-9]{64}$/i.test(s);
  if (!validHash(originalSha256) || !validHash(recoveredSha256)
    || !Number.isSafeInteger(originalSize) || originalSize < 0
    || !Number.isSafeInteger(recoveredSize) || recoveredSize < 0) return 'pendiente_de_confirmacion';
  return originalSize === recoveredSize
    && originalSha256.toLowerCase() === recoveredSha256.toLowerCase()
    ? 'archivado_verificado' : 'error_verificacion';
}
