/**
 * VISURA 15 / laboratorio aislado — reutilización del dominio histórico R3/L2.
 * No conecta con INVENTA, Business Central, GitHub ni Supabase.
 * ACL y persistencia empresarial quedan fuera de este módulo puro.
 */
const KINDS = new Set(['WRONG_REFERENCE','QUANTITY_DIFFERENCE','UNLISTED','MISSING','OTHER']);
const copy = value => structuredClone(value);
const assert = (ok, message) => {if (!ok) throw new Error(message);};
const nonempty = value => typeof value === 'string' && value.trim().length > 0;
const clean = value => typeof value === 'string' ? value.trim() : value;
const quantity = value => value === null || value === undefined ? null : String(value).trim();
const validReportedQuantity = value => typeof value === 'string' && /^\d+(?:[.,]\d+)?$/.test(value);
const hasPermission = (permissions, name) => Array.isArray(permissions) && permissions.includes(name);

export function createReturnDraft({recordId, loadId, warehouse, sourceLines = null, exceptional = false, at, actorId}) {
  assert([recordId,loadId,warehouse,at,actorId].every(nonempty), 'Metadatos obligatorios de ficha incompletos');
  assert(!exceptional || sourceLines === null, 'Ficha excepcional no debe inventar hoja original');
  assert(exceptional || Array.isArray(sourceLines), 'Carga normal requiere líneas originales acreditadas');
  const lines = exceptional ? null : sourceLines.map(line => {
    assert([line.lineId,line.sku,line.unit].every(nonempty) && line.quantity !== undefined && line.quantity !== null && nonempty(String(line.quantity)), 'Línea original incompleta');
    return {lineId:clean(line.lineId), sku:clean(line.sku), quantityText:String(line.quantity), unit:clean(line.unit)};
  });
  if (lines) assert(new Set(lines.map(l => l.lineId)).size === lines.length, 'ID de línea original duplicado');
  return {
    recordId:clean(recordId), loadId:clean(loadId), warehouse:clean(warehouse),
    origin:exceptional ? 'EXCEPTIONAL' : 'ORIGINAL_AVAILABLE',
    originalLines:copy(lines), status:'DRAFT', incidents:[], stockCheckCandidates:[],
    history:[{type:'RETURN_DRAFT_CREATED', at, actorId, exceptional}]
  };
}

export function addReturnIncident(current, {
  incidentId, kind, originalLineId = null, reportedActualSku = null,
  reportedActualQuantity = null, reportedActualUnit = null,
  reportedExpectedSku = null, reportedExpectedQuantity = null, reportedExpectedUnit = null,
  note = '', actorId, at
}) {
  assert(current?.status === 'DRAFT', 'Solo se añaden incidencias a borradores');
  assert([incidentId,actorId,at].every(nonempty) && KINDS.has(kind), 'Incidencia o actor inválido');
  assert(!current.incidents.some(i=>i.incidentId===incidentId), 'ID de incidencia duplicado');
  const source = originalLineId ? current.originalLines?.find(x=>x.lineId===originalLineId) : null;
  assert(!originalLineId || source, 'Referencia de línea inexistente en hoja original');
  assert(!source || !reportedExpectedSku, 'No se puede sustituir el dato original por declaración');
  assert(!reportedExpectedSku || current.origin === 'EXCEPTIONAL', 'Referencia esperada declarada solo para ficha excepcional');
  if (kind !== 'UNLISTED' && current.origin === 'ORIGINAL_AVAILABLE')
    assert(source || kind === 'OTHER', 'Seleccionar línea original para esta incidencia');
  if (kind === 'UNLISTED' || kind === 'WRONG_REFERENCE')
    assert(nonempty(reportedActualSku), 'Debe indicarse la referencia efectivamente comunicada');
  if (kind === 'WRONG_REFERENCE' && source)
    assert(clean(reportedActualSku) !== source.sku, 'Referencia declarada igual a la original; usar diferencia de cantidad cuando proceda');
  if (kind !== 'OTHER') assert(validReportedQuantity(quantity(reportedActualQuantity)), 'Cantidad declarada inválida o desconocida: guardar como borrador sin publicar');
  if (reportedActualSku) assert(nonempty(reportedActualUnit), 'Unidad declarada obligatoria');
  if (current.origin === 'EXCEPTIONAL' && reportedExpectedSku)
    assert(nonempty(reportedExpectedUnit) && validReportedQuantity(quantity(reportedExpectedQuantity)), 'Datos esperados declarados incompletos');
  const next = copy(current);
  next.incidents.push({
    incidentId:clean(incidentId), kind, originalLineId:source?.lineId ?? null,
    expected:source ? {sku:source.sku, quantityText:source.quantityText, unit:source.unit, evidence:'ORIGINAL'}
      : (reportedExpectedSku ? {sku:clean(reportedExpectedSku),quantityText:quantity(reportedExpectedQuantity),unit:clean(reportedExpectedUnit),evidence:'DECLARED_UNVERIFIED'} : null),
    actual:reportedActualSku ? {sku:clean(reportedActualSku), quantityText:quantity(reportedActualQuantity),unit:clean(reportedActualUnit),evidence:'DECLARED_NOT_PHYSICALLY_CONFIRMED'}
      : {sku:source?.sku ?? null, quantityText:quantity(reportedActualQuantity),unit:source?.unit ?? null,evidence:'DECLARED_NOT_PHYSICALLY_CONFIRMED'},
    note:String(note || ''), resolution:'OPEN'
  });
  next.history.push({type:'INCIDENT_ADDED',at,actorId,incidentId});
  return next;
}

export function closeReturn(current, {actorId, at, permissions = [], noIncidentsConfirmed = false}) {
  assert(current?.status === 'DRAFT', 'No se permite cerrar dos veces la misma ficha');
  assert([actorId,at].every(nonempty), 'Responsable y fecha obligatorios');
  assert(hasPermission(permissions,'RETURN_CLOSE'), 'Permiso efectivo RETURN_CLOSE requerido');
  assert(current.incidents.length > 0 || noIncidentsConfirmed === true, 'Confirmación explícita SIN INCIDENCIAS requerida');
  assert(current.incidents.length === 0 || noIncidentsConfirmed === false, 'No se puede declarar SIN INCIDENCIAS si hay diferencias');
  const next = copy(current);
  next.status = 'CLOSED_OPERATIONAL';
  next.incidentStatus = next.incidents.length ? 'OPEN' : 'NONE';
  next.closedAt = at; next.closedBy = actorId;
  // Generación LOCAL de propuestas: no se envía nada a INVENTA.
  // Una ficha excepcional queda retenida hasta conciliar su hoja original.
  if (next.origin === 'ORIGINAL_AVAILABLE') {
    const bySku = new Map();
    for (const item of next.incidents) for (const portion of [item.expected,item.actual]) {
      if (!portion?.sku) continue;
      // Evitar colapsar la misma referencia expresada en unidades distintas.
      const key = `${next.recordId}|${next.warehouse}|${portion.sku}|${portion.unit}`;
      if (!bySku.has(key)) bySku.set(key,{key,sku:portion.sku,unit:portion.unit,warehouse:next.warehouse,
        sourceRecordId:next.recordId,sourceLoadId:next.loadId,sourceIncidentIds:[],
        state:'PENDING_BRIDGE',trigger:'RETURN_INCIDENT'});
      const candidate=bySku.get(key);
      if (!candidate.sourceIncidentIds.includes(item.incidentId)) candidate.sourceIncidentIds.push(item.incidentId);
    }
    next.stockCheckCandidates=[...bySku.values()];
  }
  next.history.push({type:'RETURN_CLOSED_OPERATIONAL',at,actorId,incidentCount:next.incidents.length,
    checkCandidateCount:next.stockCheckCandidates.length});
  return next;
}

export function dismissStockCheckCandidate(current,{key, actorId, at, reason, permissions=[]}) {
  assert(current?.status === 'CLOSED_OPERATIONAL', 'Cierre operativo previo requerido');
  assert(hasPermission(permissions,'RETURN_CHECK_DISMISS'), 'No existe permiso efectivo para descartar comprobaciones');
  assert([key,actorId,at,reason].every(nonempty) && reason.trim().length >= 8, 'Descarte requiere responsable, fecha y justificación');
  const next = copy(current);
  const candidate = next.stockCheckCandidates.find(x=>x.key===key);
  assert(candidate && candidate.state==='PENDING_BRIDGE', 'Solicitud inexistente o ya gestionada');
  candidate.state='DISMISSED'; candidate.dismissReason=reason.trim(); candidate.dismissedBy=actorId;
  candidate.dismissedAt=at;
  next.history.push({type:'STOCK_CHECK_DISMISSED',key,at,actorId,reason:reason.trim()});
  return next;
}
