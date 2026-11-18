/** VISURA PREPARA 15 — R1/L5 — Informe SOLO LAB sintético y lectura local.
 * Entrada: servicio autorizado de fixtures. No Supabase, BC, RPC ni network.
 * La hora del cierre operativo NO acredita una fecha de recepción del reparto.
 */
const fail=message=>{throw new Error(message);};
const own=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
const present=x=>typeof x==='string'&&x.trim()!=='';
const csvValue=value=>{
  let text=String(value??'');
  // Excel, Numbers y otras hojas: neutralizar fórmulas incluso tras espacios.
  if(/^[\s\u200B-\u200D]*[=+\-@]/u.test(text))text="'"+text;
  return '"'+text.replaceAll('"','""')+'"';
};
const safeDay=v=>present(v)?v:'SIN_ACREDITAR';
export function crearInformeRecepcionLab({cargas,registros,almacen}){
  if(!present(almacen)||!Array.isArray(cargas)||!Array.isArray(registros))fail('Fuente LAB de informe inválida');
  const keys=new Set();
  const byKey=new Map();
  for(const r of registros){
    if(r?.warehouse!==almacen)fail('Registro recibido de almacén distinto');
    if(!present(r.loadId)||byKey.has(r.loadId))fail('Registro de recepción duplicado/inválido');
    byKey.set(r.loadId,r);
  }
  const rows=cargas.map(c=>{
    if(c?.warehouse!==almacen||!present(c.loadId)||keys.has(c.loadId))fail('Catálogo de cargas LAB incompatible o duplicado');
    keys.add(c.loadId);
    const r=byKey.get(c.loadId);
    if(r&&r.status!==c.estadoRecepcion)fail('Estado de cierre incongruente con ficha LAB');
    if(r&&(!Array.isArray(r.incidents)||!Array.isArray(r.history)||!Array.isArray(r.stockCheckCandidates)))fail('Historial LAB incompleto');
    if(r&&r.incidents.filter(x=>x.resolution==='OPEN').length!==c.incidenciasAbiertas)fail('Cantidad de incidencias OPEN incoherente');
    const cerrada=c.estadoRecepcion==='CLOSED_OPERATIONAL';
    if(r&& !['DRAFT','CLOSED_OPERATIONAL'].includes(r.status))fail('Estado de ficha desconocido');
    if(cerrada&&(!present(r?.closedAt)||!present(r?.closedBy)||r.history.filter(h=>h.type==='RETURN_CLOSED_OPERATIONAL').length!==1))fail('Cierre sin trazabilidad suficiente');
    const abiertas=c.incidenciasAbiertas||0;
    const candidatos=(r?.stockCheckCandidates||[]).filter(x=>x.state==='PENDING_BRIDGE').length;
    const sinHoja=c.hojaOriginalLab!==true;
    return Object.freeze({
      carga:c.loadId,almacen,fechaCarga:safeDay(c.fechaCarga),
      fechaRecepcionAcreditada:safeDay(c.fechaRecepcionAcreditada),
      cierre:cerrada?'CERRADA_OPERATIVA':c.estadoRecepcion==='DRAFT'?'BORRADOR':'PENDIENTE',
      incidenciasOpen:abiertas,candidaturasLocalPendientes:candidatos,
      hojaOriginalSintetica:sinHoja?'NO_ACREDITADA':'ACREDITADA_LAB',
      seguimiento:cerrada&&abiertas===0?'SIN_PENDIENTES':
        abiertas>0?'INCIDENCIAS_OPEN':sinHoja?'SIN_HOJA':'PENDIENTE_CIERRE',
      fechaCierreOperativoLab:r?.closedAt??'NO_CERRADA',
    });
  });
  for(const r of registros)if(!keys.has(r.loadId))fail('Registro sin carga original en el catálogo LAB');
  const total=rows.length;
  const cerradas=rows.filter(x=>x.cierre==='CERRADA_OPERATIVA').length;
  const incidenciasAbiertas=rows.reduce((n,x)=>n+x.incidenciasOpen,0);
  const pendientes=rows.filter(x=>x.cierre!=='CERRADA_OPERATIVA'||x.incidenciasOpen>0).length;
  const sinFechaRecepcion=rows.filter(x=>x.fechaRecepcionAcreditada==='SIN_ACREDITAR').length;
  const sinHoja=rows.filter(x=>x.hojaOriginalSintetica==='NO_ACREDITADA').length;
  return Object.freeze({almacen,totales:Object.freeze({total,cerradas,pendientes,incidenciasAbiertas,sinFechaRecepcion,sinHoja}),filas:Object.freeze(rows)});
}
export function csvInformeRecepcionLab(informe){
  if(!informe?.filas||!informe?.totales||!present(informe.almacen))fail('Informe LAB no acreditado');
  const keys=['carga','almacen','fechaCarga','fechaRecepcionAcreditada','cierre','incidenciasOpen','candidaturasLocalPendientes','hojaOriginalSintetica','seguimiento','fechaCierreOperativoLab'];
  const labels=['Carga LAB','Almacén LAB','Fecha carga','Fecha recepción acreditada','Cierre operativo LAB','Incidencias OPEN','Candidatos PENDING_BRIDGE LAB','Hoja original sintética','Seguimiento','Instante cierre operativo LAB (NO fecha acreditada)'];
  const header=labels.map(csvValue).join(';');
  const body=informe.filas.map(f=>keys.map(k=>csvValue(own(f,k)?f[k]:'')).join(';'));
  return '\ufeff'+['"VISURA PREPARA - INFORME LAB SINTÉTICO - SIN EFECTOS EMPRESARIALES"',header,...body].join('\r\n')+'\r\n';
}
