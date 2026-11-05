/**
 * VISURA 15 R1/L4. Banco de recepción sintética AUTOCONTENIDO y sin red.
 * Reutiliza el dominio de cierre histórico, pero NO crea permisos empresariales.
 * Todos los privilegios proceden de ACL sintéticas inyectadas y se validan en
 * cada comando, independientemente de la interfaz. Persistencia SOLO LOCAL LAB.
 */
import {createReturnDraft,addReturnIncident,closeReturn} from './cierre-reparto-domain.mjs';

const clone=x=>structuredClone(x);
const assert=(ok,msg)=>{if(!ok)throw Error(msg);};
const str=x=>typeof x==='string'&&x.trim().length>0;
const key=x=>`${x.warehouse}|${x.loadId}`;
const same=(a,b)=>JSON.stringify(a)===JSON.stringify(b);

export function createRecepcionLabService({fixtures,actors,storage,clock=()=>new Date().toISOString()}) {
  assert(Array.isArray(fixtures)&&fixtures.length>0,'Solo se admiten fixtures LAB');
  assert(actors && typeof actors==='object','ACL LAB obligatoria');
  assert(storage && typeof storage.load==='function'&&typeof storage.save==='function','Persistencia LAB obligatoria');
  const catalog=new Map();
  for(const item of fixtures){
    assert(str(item.loadId)&&str(item.warehouse),'Identidad de carga LAB inválida');
    assert(!catalog.has(key(item)),'Carga duplicada en catálogo LAB');
    catalog.set(key(item),clone(item));
  }
  let state=storage.load()??{records:{},commands:{}};
  assert(state&&typeof state==='object'&&state.records&&state.commands,'Checkpoint LAB inválido');
  // Fail closed on corrupt/stale source: cannot silently adopt mismatched warehouse/identity/original.
  for(const [k,r] of Object.entries(state.records)){
    const src=catalog.get(k);
    assert(src&&r.warehouse===src.warehouse&&r.loadId===src.loadId&&r.recordId===`RET-LAB:${k}`,'Identidad persistida incompatible');
    assert(Array.isArray(src.originalLines)&&src.originalEvidence?.kind==='LAB_SYNTHETIC_SHEET','Hoja LAB inexistente');
    const exact=src.originalLines.map(x=>({lineId:String(x.lineId),sku:String(x.sku),quantityText:String(x.quantity),unit:String(x.unit)}));
    assert(same(r.originalLines,exact),'La hoja original LAB cambió respecto al checkpoint');
  }
  const identity=actorId=>{
    const a=actors[actorId];
    assert(a?.active===true&&Array.isArray(a.warehouses)&&Array.isArray(a.permissions),'Identidad LAB no autorizada');
    return a;
  };
  const access=(actorId,warehouse,permission)=>{
    const a=identity(actorId);
    assert(a.warehouses.includes(warehouse),'Almacén no autorizado');
    assert(a.permissions.includes(permission),`Permiso LAB ${permission} requerido`);
    return a;
  };
  const fixture=(loadId,warehouse)=>{
    const item=catalog.get(`${warehouse}|${loadId}`);
    assert(item,'Carga LAB no encontrada en el almacén seleccionado');
    return item;
  };
  const permitted=(actorId,loadId,warehouse,permission)=>{
    access(actorId,warehouse,permission);
    return fixture(loadId,warehouse);
  };
  const mutate=({actorId,actionId,loadId,warehouse,kind,payload,permission},operation)=>{
    permitted(actorId,loadId,warehouse,permission);
    assert(str(actionId)&&actionId.length<=120,'Identificador de comando obligatorio');
    const request={actorId,loadId,warehouse,kind,payload};
    const earlier=state.commands[actionId];
    if(earlier){
      assert(same(earlier.request,request),'ID de comando reutilizado con datos distintos');
      return clone(earlier.result);
    }
    const next=clone(state),result=operation(next,fixture(loadId,warehouse));
    next.commands[actionId]={request,result:clone(result)};
    storage.save(next); // atomic from the service viewpoint: failed save does NOT commit memory
    state=next;
    return clone(result);
  };
  const parseEvidence=load=>{
    assert(load.originalEvidence?.kind==='LAB_SYNTHETIC_SHEET'&&str(load.originalEvidence.documentId),'Hoja original no acreditada para LAB');
    assert(Array.isArray(load.originalLines)&&load.originalLines.length>0,'No existe una hoja original LAB verificable');
    return clone(load.originalLines);
  };
  return Object.freeze({
    get(actorId,loadId,warehouse){
      permitted(actorId,loadId,warehouse,'RETURN_READ');
      const load=fixture(loadId,warehouse);
      return {load:clone(load),record:clone(state.records[`${warehouse}|${loadId}`]??null)};
    },
    list(actorId,warehouse,{pendingOnly=true}={}){
      access(actorId,warehouse,'RETURN_READ');
      return [...catalog.values()].filter(l=>l.warehouse===warehouse).map(load=>{
        const r=state.records[key(load)]??null;
        return {loadId:load.loadId,warehouse:load.warehouse,fechaCarga:load.fechaCarga??null,
          fechaRecepcionAcreditada:load.fechaRecepcionAcreditada??null,
          estadoRecepcion:r?.status??'PENDING',incidenciasAbiertas:r?.incidents.filter(i=>i.resolution==='OPEN').length??0,
          hojaOriginalLab:!!(load.originalEvidence?.kind==='LAB_SYNTHETIC_SHEET'&&load.originalLines?.length)};
      }).filter(l=>!pendingOnly||l.estadoRecepcion!=='CLOSED_OPERATIONAL'||l.incidenciasAbiertas>0);
    },
    open({actorId,loadId,warehouse,actionId}){
      return mutate({actorId,loadId,warehouse,actionId,kind:'OPEN',payload:null,permission:'RETURN_OPEN'},(next,load)=>{
        const k=key(load);assert(!next.records[k],'Recepción ya iniciada: abrir ficha existente, no duplicarla');
        const lines=parseEvidence(load);
        const r=createReturnDraft({recordId:`RET-LAB:${k}`,loadId,warehouse,sourceLines:lines,at:clock(),actorId});
        next.records[k]=r;return r;
      });
    },
    incident({actorId,loadId,warehouse,actionId,incident}){
      return mutate({actorId,loadId,warehouse,actionId,kind:'INCIDENT',payload:incident,permission:'RETURN_INCIDENT_ADD'},next=>{
        const k=`${warehouse}|${loadId}`;assert(next.records[k],'Abrir ficha antes de registrar diferencias');
        next.records[k]=addReturnIncident(next.records[k],{...clone(incident),incidentId:actionId,actorId,at:clock()});
        return next.records[k];
      });
    },
    close({actorId,loadId,warehouse,actionId,noIncidentsConfirmed=false}){
      return mutate({actorId,loadId,warehouse,actionId,kind:'CLOSE',payload:{noIncidentsConfirmed},permission:'RETURN_CLOSE'},next=>{
        const k=`${warehouse}|${loadId}`;assert(next.records[k],'No hay ficha de recepción iniciada');
        const granted=identity(actorId).permissions;
        next.records[k]=closeReturn(next.records[k],{actorId,at:clock(),permissions:granted,noIncidentsConfirmed});
        return next.records[k];
      });
    },
    exportLab(actorId,warehouse){
      access(actorId,warehouse,'RETURN_READ');
      return clone(Object.values(state.records).filter(x=>x.warehouse===warehouse));
    }
  });
}

export function memoryLabStorage(initial=null){
  let x=clone(initial);
  return {load:()=>clone(x),save:v=>{x=clone(v);}};
}
