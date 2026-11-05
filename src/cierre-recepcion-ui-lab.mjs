/** VISURA PREPARA 15 · R1/L4 · SOLO sintéticos en loopback (nunca en la PWA publicada). */
import {createRecepcionLabService} from './cierre-recepcion-lab-service.mjs';
import {LAB_LOADS,LAB_ACTORS} from '../lab/recepcion-fixtures.mjs';
import {crearInformeRecepcionLab,csvInformeRecepcionLab} from './cierre-recepcion-informe-lab.mjs';
import {crearExpedienteRecepcionLab} from './cierre-recepcion-expediente-lab.mjs';
const id=x=>document.getElementById(x);
const copy=x=>structuredClone(x);
const COMMAND_KEY='visura15-r1l4-recepcion-LAB-sintetica-v1';
const memoryStore={
  load(){const saved=localStorage.getItem(COMMAND_KEY);return saved?JSON.parse(saved):null;},
  save(x){localStorage.setItem(COMMAND_KEY,JSON.stringify(x));}
};
const service=createRecepcionLabService({fixtures:LAB_LOADS,actors:LAB_ACTORS,storage:memoryStore});
const command=()=>globalThis.crypto?.randomUUID?.()||`LAB-${Date.now()}-${Math.random()}`;
let current=null,working=false;
const actor=()=>id('labRecepcionActor').value;
const warehouse=()=>id('labRecepcionWarehouse').value;
const msg=(text,level='')=>{const x=id('labCierreStatus');x.className='status '+level;x.textContent=text;};
const elt=(name,text,className='')=>{const node=document.createElement(name);node.textContent=text;node.className=className;return node;};
const lineSummary=l=>`${l.lineId} · ${l.sku} · ${l.quantityText} ${l.unit}`;
function controls(record){
  const editable=record?.status==='DRAFT';
  const permissions=LAB_ACTORS[actor()]?.permissions??[];
  const allow=permissions.includes('RETURN_CLOSE') && editable;
  id('labAbrir').hidden=!!record;
  id('labAbrir').disabled=!!record||!permissions.includes('RETURN_OPEN');
  id('labIncidenciaPanel').hidden=!editable;
  id('labAgregarIncidencia').disabled=!editable||!permissions.includes('RETURN_INCIDENT_ADD');
  id('labCerrarSinIncidencias').disabled=!allow||record.incidents.length!==0;
  id('labCerrarConIncidencias').disabled=!allow||record.incidents.length===0;
  id('labSoloLectura').textContent=allow?'El cierre se guardará SOLO en este laboratorio.':'Cuenta de simulación sin permiso de cierre o ficha ya cerrada.';
  id('labExpedienteDescargar').disabled=!current;
}
// Informes visibles SOLO en el módulo LAB cargado bajo loopback.
function createReportPanel(){
  const panel=document.createElement('section');panel.className='panel lab-informe-panel';panel.id='labInformePanel';
  const title=elt('h2','Informe local de recepción (LAB)');
  const info=elt('p','Este informe no es un cierre empresarial ni modifica fichas, stock o fechas.','muted');
  const summary=elt('p','Informe no calculado.','lab-informe-resumen');summary.id='labInformeResumen';
  summary.setAttribute('role','status');summary.setAttribute('aria-live','polite');
  const button=elt('button','Descargar CSV sintético (solo LAB)');button.id='labInformeDescargar';
  button.type='button';button.className='secondary';button.disabled=true;
  panel.append(title,info,summary,button);
  id('controlRecepcionView').appendChild(panel);
  button.addEventListener('click',()=>{
    try{
      const report=crearInformeRecepcionLab({cargas:service.list(actor(),warehouse(),{pendingOnly:false}),
        registros:service.exportLab(actor(),warehouse()),almacen:warehouse()});
      const blob=new Blob([csvInformeRecepcionLab(report)],{type:'text/csv;charset=utf-8'});
      const url=URL.createObjectURL(blob),anchor=document.createElement('a');
      anchor.href=url;anchor.download=`visura15_recepcion_LAB_${warehouse()}.csv`;
      document.body.append(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
    }catch(error){id('labInformeResumen').textContent='Informe bloqueado: '+error.message;}
  });
}
// Copia de lectura del expediente de UNA carga sintética, sin alterar su estado.
function createEvidencePanel(){
  const panel=document.createElement('section');panel.id='labExpedientePanel';panel.className='panel lab-expediente-panel';
  const title=elt('h2','Expediente de evidencia (LAB)');
  const note=elt('p','Incluye hoja sintética, incidencias e historial. La huella SHA-256 NO es firma ni prueba de recepción real.','muted');
  const button=elt('button','Descargar expediente JSON con SHA-256');button.type='button';button.id='labExpedienteDescargar';
  button.className='secondary';button.disabled=true;
  panel.append(title,note,button);id('recepcionCierreLabView').appendChild(panel);
  button.addEventListener('click',async()=>{
    button.disabled=true;
    try{
      if(!current)throw Error('Seleccionar una carga');
      // Servicio revalida perfil y almacén, nunca confiar en el selector visual.
      const {load,record}=service.get(actor(),current,warehouse());
      const evidence=await crearExpedienteRecepcionLab({load,record});
      const blob=new Blob([JSON.stringify(evidence,null,2)+'\n'],{type:'application/json;charset=utf-8'});
      const url=URL.createObjectURL(blob),anchor=document.createElement('a');
      anchor.href=url;
      anchor.download=`visura15_recepcion_LAB_${warehouse().replace(/[^a-zA-Z0-9_-]/g,'_')}_${current.replace(/[^a-zA-Z0-9_-]/g,'_')}.json`;
      document.body.append(anchor);anchor.click();anchor.remove();
      setTimeout(()=>URL.revokeObjectURL(url),1500);
      msg('Expediente LAB exportado con huella SHA-256. No firmado ni enviado.','success');
    }catch(error){msg('Exportación bloqueada: '+error.message,'error');}
    finally{button.disabled=!current;}
  });
}
function refreshReport(){
  const summary=id('labInformeResumen'),button=id('labInformeDescargar');
  button.disabled=true;summary.textContent='Informe no disponible para esta selección.';
  try{
    const report=crearInformeRecepcionLab({cargas:service.list(actor(),warehouse(),{pendingOnly:false}),
      registros:service.exportLab(actor(),warehouse()),almacen:warehouse()});
    const t=report.totales;
    summary.textContent=`${t.total} cargas LAB · ${t.cerradas} cerradas · ${t.pendientes} pendientes (incluye incidencias OPEN) · ${t.incidenciasAbiertas} incidencias OPEN · ${t.sinFechaRecepcion} sin fecha de recepción acreditada · ${t.sinHoja} sin hoja sintética.`;
    button.disabled=false;
  }catch(error){summary.textContent='Informe no accesible: '+error.message;}
}
function render(){
  if(!current)return;
  const {load,record}=service.get(actor(),current,warehouse());
  id('labCierreTitulo').textContent=load.loadId;
  id('labCierreOrigen').textContent=`Hoja original SINTÉTICA ${load.originalEvidence?.documentId??'NO ACREDITADA'} · Almacén ${load.warehouse} · Fecha de carga ${load.fechaCarga||'no acreditada'} · Fecha de recepción acreditada ${load.fechaRecepcionAcreditada||'no disponible'}.`;
  const lines=id('labCierreLineas');lines.replaceChildren();
  if(!load.originalLines?.length)lines.appendChild(elt('p','Sin hoja original sintética acreditada; apertura bloqueada.','status error'));
  else for(const line of load.originalLines)lines.appendChild(elt('div',`${line.lineId} · ${line.sku} · ${line.quantity} ${line.unit}`,'lab-cierre-linea'));
  const select=id('labLineaOriginal');select.replaceChildren();
  const blank=document.createElement('option');blank.value='';blank.textContent='Sin línea original (artículo no previsto)';select.append(blank);
  for(const line of load.originalLines??[]){const option=document.createElement('option');option.value=line.lineId;option.textContent=`${line.lineId} · ${line.sku} · ${line.quantity} ${line.unit}`;select.append(option);}
  const incidents=id('labCierreIncidencias');incidents.replaceChildren();
  if(!record?.incidents.length)incidents.appendChild(elt('p','Sin diferencias registradas en esta ficha LAB.','muted'));
  for(const issue of record?.incidents??[])incidents.appendChild(elt('p',`${issue.kind} · ${issue.expected?.sku||'No previsto'} → ${issue.actual?.sku||'Sin referencia'} · Cantidad comunicada ${issue.actual?.quantityText??'no acreditada'} · ${issue.resolution}`,'lab-issue'));
  const state=record?`${record.status} · ${record.incidents.length} incidencia(s) · ${record.incidentStatus||'SIN CIERRE'}`:'Ficha pendiente de apertura';
  id('labCierreEstado').textContent=state;
  id('labCierreHistorico').textContent=record?.history.map(h=>`${h.type} · ${h.at} · ${h.actorId}`).join('\n')||'Sin acciones registradas';
  controls(record);
}
function apply(fn){
  if(working)return;
  working=true;
  for(const n of ['labAbrir','labAgregarIncidencia','labCerrarSinIncidencias','labCerrarConIncidencias'])id(n).disabled=true;
  try{
    const result=fn();
    render();refreshReport();
    msg(`Operación LAB registrada localmente: ${result.status}. Sin escritura empresarial.`,'success');
  }catch(e){msg(e.message,'error');render();}
  finally{working=false;}
}
export function createRecepcionLabUI({switchView,refreshRecepcion,setWarehouse}){
  createReportPanel();createEvidencePanel();refreshReport();
  id('labRecepcionBanner').hidden=false;
  id('labRecepcionActor').addEventListener('change',()=>{
    if(!id('recepcionCierreLabView').hidden)switchView('controlRecepcionView');
    refreshReport();refreshRecepcion().catch(e=>msg(e.message,'error'));
  });
  id('labRecepcionWarehouse').addEventListener('change',()=>{
    setWarehouse(warehouse());
    if(!id('recepcionCierreLabView').hidden)switchView('controlRecepcionView');
    refreshReport();refreshRecepcion().catch(e=>msg(e.message,'error'));
  });
  id('labAbrir').addEventListener('click',()=>apply(()=>service.open({actorId:actor(),loadId:current,warehouse:warehouse(),actionId:command()})));
  id('labAgregarIncidencia').addEventListener('click',()=>apply(()=>{
    const kind=id('labIncidenciaTipo').value;
    const line=id('labLineaOriginal').value||null;
    const issue={kind,originalLineId:line,reportedActualSku:id('labIncidenciaSku').value.trim()||null,
      reportedActualQuantity:id('labIncidenciaCantidad').value.trim()||null,
      reportedActualUnit:id('labIncidenciaUnidad').value.trim()||null,
      note:id('labIncidenciaNota').value.trim()};
    return service.incident({actorId:actor(),warehouse:warehouse(),loadId:current,actionId:command(),incident:issue});
  }));
  id('labCerrarSinIncidencias').addEventListener('click',()=>apply(()=>service.close({actorId:actor(),warehouse:warehouse(),loadId:current,actionId:command(),noIncidentsConfirmed:true})));
  id('labCerrarConIncidencias').addEventListener('click',()=>apply(()=>service.close({actorId:actor(),warehouse:warehouse(),loadId:current,actionId:command(),noIncidentsConfirmed:false})));
  id('labVolverRecepcion').addEventListener('click',()=>{switchView('controlRecepcionView');refreshRecepcion().catch(()=>{});});
  return Object.freeze({
    actor,warehouse,
    list(){return service.list(actor(),warehouse());},
    rpcPanel(w){
      const rows=service.list(actor(),w);
      return rows.map(row=>{
        const original=LAB_LOADS.find(l=>l.warehouse===w&&l.loadId===row.loadId);
        return {codigo:row.loadId,almacen:w,fecha:row.fechaCarga,fecha_recepcion:row.fechaRecepcionAcreditada,
          estado:row.estadoRecepcion==='CLOSED_OPERATIONAL'?'cerrada':'preparada',
          incidencias_pendientes:row.incidenciasAbiertas,
          productos:original?.originalLines?.map(l=>({sku:l.sku,qty:l.quantity,unit:l.unit}))??[]};
      });
    },
    open(loadId){
      current=loadId;
      try{service.get(actor(),current,warehouse());render();msg('Modo LAB sintético. Ningún retorno empresarial está registrado.');
        switchView('recepcionCierreLabView');}catch(e){msg(e.message,'error');}
    },
    refresh(){render();refreshReport();}
  });
}
