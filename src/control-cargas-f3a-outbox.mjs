// VISURA PREPARA ALMACEN · FASE 3A · OUTBOX INERTE / SIN RED / SIN UI.
// No sincroniza revisiones completas. Nunca interpreta una pulsacion local como
// un check confirmado por Supabase. La integracion con markLine queda PENDIENTE.
// Una intencion se escribe ANTES de la revision local, y solo despues se valida.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LP=/^LP[0-9]{2}-[0-9]{4,6}$/;
const HASH=/^[a-f0-9]{64}$/;
const SCOPE=/^_visura_[a-f0-9]{24}$/;
const STATES=new Set(['pending','ok','incident']);
const copy=o=>JSON.parse(JSON.stringify(o));
const refuse=s=>{throw Error('F3A outbox: '+s);};
const int=x=>Number.isSafeInteger(x)&&x>=0;
const identity=x=>x&&typeof x.almacen==='string'&&x.almacen.length>0&&x.almacen.length<=100&&
  LP.test(x.lp||'')&&HASH.test(x.pdfHash||'');
const keyOf=(scope,i)=>`${scope}|${i.almacen}|${i.lp}`;
const leaseMs=12000; // caduca; la seguridad real la proporcionan UUID y CAS en PostgreSQL.

export function crearCoordinadorCheckF3A({scope,repo,now=()=>Date.now()}){
 if(!SCOPE.test(scope)||!repo||typeof repo.read!=='function'||typeof repo.atomicUpdate!=='function')
  refuse('scope o repositorio de transacciones invalidos');
 const lookup=i=>{if(!identity(i))refuse('identidad LP/PDF invalida');return keyOf(scope,i);};
 const fresh=i=>({key:keyOf(scope,i),scope,almacen:i.almacen,lp:i.lp,pdfHash:i.pdfHash,
  pendientes:[],bloqueo:null,versionConfirmada:null});
 function assertSource(row,i){if(row&&row.pdfHash!==i.pdfHash)refuse('PDF cambiado: conciliacion manual');}
 return Object.freeze({
  async guardarIntencion({identity:i,operacionId,linea,estado,auditIndex,sourceSignature}){
   const k=lookup(i);
   if(!UUID.test(operacionId||'')||!int(linea)||!int(auditIndex)||!STATES.has(estado)||
       typeof sourceSignature!=='string'||!sourceSignature.length)refuse('evento incompleto');
   return repo.atomicUpdate(k,row=>{
    assertSource(row,i);const next=row||fresh(i);
    if(next.pendientes.some(p=>p.id===operacionId))refuse('operacion ya registrada');
    if(next.pendientes.some(p=>p.auditIndex===auditIndex))refuse('auditoria local duplicada');
    // La existencia de una operacion incierta NO certifica que llego al servidor.
    next.pendientes.push({id:operacionId,linea,estado,auditIndex,sourceSignature,
     status:'intencion',versionEsperada:null,recibo:null,creadaEn:now()});
    return {next,value:{id:operacionId,status:'intencion'}};
   });
  },
  async acreditarRegistroLocal({identity:i,operacionId,revision}){
   const k=lookup(i);
   return repo.atomicUpdate(k,row=>{
    assertSource(row,i);if(!row)refuse('intencion ausente');
    const p=row.pendientes.find(x=>x.id===operacionId);
    if(!p||p.status!=='intencion')refuse('estado de intencion incompatible');
    if(revision?.sourceSignature!==p.sourceSignature||!Array.isArray(revision.audit))
      refuse('revision de otro PDF o sin auditoria');
    const e=revision.audit[p.auditIndex];
    if(!e||e.line!==p.linea||e.to!==p.estado)refuse('evento local no coincide');
    p.status='lista';return {next:row,value:{id:p.id,status:p.status}};
   });
  },
  async reservarEnvio({identity:i,tabId,online,versionServidor}){
   const k=lookup(i);if(!UUID.test(tabId||''))refuse('tabId invalido');
   if(online!==true)return {status:'offline',enviado:false};
   return repo.atomicUpdate(k,row=>{
    assertSource(row,i);if(!row||row.pendientes.length===0)return {next:row,value:{status:'vacia'}};
    const hora=now();
    if(row.bloqueo&&row.bloqueo.hasta>hora&&row.bloqueo.tabId!==tabId)
      return {next:row,value:{status:'otra_pestana'}};
    const p=row.pendientes.find(x=>x.status!=='confirmada');
    if(!p)return {next:row,value:{status:'vacia'}};
    if(p.status==='intencion'||p.status==='bloqueada')return {next:row,value:{status:p.status}};
    if(p.status==='lista'){
     if(!int(versionServidor)|| (row.versionConfirmada!==null&&row.versionConfirmada!==versionServidor))
       return {next:row,value:{status:'reconciliacion_necesaria'}};
     p.versionEsperada=versionServidor;
     p.status='incierta'; // persistir el envelope ANTES de enviar; timeout => mismo UUID.
    } else if(p.status!=='incierta')refuse('estado de cola incompatible');
    row.bloqueo={tabId,hasta:hora+leaseMs};
    return {next:row,value:{status:'reservada',enviado:false,id:p.id,peticion:{
     p_almacen:i.almacen,p_lp:i.lp,p_pdf_hash:i.pdfHash,p_linea:p.linea,
     p_estado:p.estado,p_version_esperada:p.versionEsperada,p_operacion:p.id
    }}};
   });
  },
  async marcarSinRespuesta({identity:i,operacionId,tabId}){
   const k=lookup(i);
   return repo.atomicUpdate(k,row=>{
    assertSource(row,i);const p=row?.pendientes.find(x=>x.id===operacionId);
    if(!p||p.status!=='incierta')refuse('no existe envio incierto');
    if(row.bloqueo?.tabId!==tabId)refuse('sin lease');
    row.bloqueo=null;
    return {next:row,value:{status:'incierta',reintentarMismoId:true}};
   });
  },
  async aceptarRecibo({identity:i,operacionId,tabId,recibo,actorSesion}){
   const k=lookup(i);
   return repo.atomicUpdate(k,row=>{
    assertSource(row,i);const p=row?.pendientes.find(x=>x.id===operacionId);
    if(!p||p.status!=='incierta'||row.bloqueo?.tabId!==tabId)refuse('sin operacion reservada');
    // La RPC R4.1 entrega los cuatro recuentos del servidor. Nunca acreditar
    // un recibo incompleto o incoherente, aunque UUID y versión coincidan.
    // Los contadores NO certifican comprobación física: solo estado registrado.
    // Vincular actor a usuario actualmente autenticado; una sesión cambiada NO acredita.
    // actorSesion debe venir del usuario autenticado verificado (no del recibo mismo).
    if(!recibo||recibo.operacion_id!==p.id||recibo.almacen!==i.almacen||
       recibo.lp!==i.lp||recibo.pdf_hash!==i.pdfHash||recibo.linea!==p.linea||
       recibo.estado!==p.estado||recibo.version!==p.versionEsperada+1||
       recibo.procedencia!=='evento_registrado_en_servidor'||
       recibo.verificacion_fisica_acreditada!==false||!UUID.test(actorSesion||'')||
       !UUID.test(recibo.actor||'')||recibo.actor.toLowerCase()!==actorSesion.toLowerCase()||
       !Number.isFinite(Date.parse(recibo.hora_servidor||''))||
       !int(recibo.total)||recibo.total<1||recibo.total>3000||
       !int(recibo.checked)||!int(recibo.pending)||!int(recibo.incidents)||
       recibo.checked+recibo.pending!==recibo.total||
       recibo.incidents>recibo.checked||
       (p.estado==='ok'&&recibo.checked<1)||
       (p.estado==='incident'&&recibo.incidents<1)||
       (p.estado==='pending'&&recibo.pending<1))refuse('recibo no acreditado');
    p.status='confirmada';p.recibo=copy(recibo);
    row.versionConfirmada=recibo.version;row.bloqueo=null;
    return {next:row,value:{status:'confirmada',version:recibo.version}};
   });
  },
  async bloquearConflicto({identity:i,operacionId,tabId}){
   const k=lookup(i);
   return repo.atomicUpdate(k,row=>{
    assertSource(row,i);const p=row?.pendientes.find(x=>x.id===operacionId);
    if(!p||p.status!=='incierta'||row.bloqueo?.tabId!==tabId)refuse('sin envio reservado');
    p.status='bloqueada';row.bloqueo=null;
    return {next:row,value:{status:'bloqueada',requiereConciliacion:true}};
   });
  },
  async estado({identity:i}){
   const k=lookup(i);const r=await repo.read(k);assertSource(r,i);
   return r?copy(r):null;
  }
 });
}

// Adaptador IDB independiente: transacción readwrite serializable POR REGISTRO y
// DB aislada por hash de usuario. No usa localStorage ni DB de tiempos PRUEBA_3.
// NO probado en Safari físico. No se crean DB hasta llamar a sus métodos.
export function crearRepositorioIndexedDBChecksF3A({scope,idb=globalThis.indexedDB}){
 if(!SCOPE.test(scope)||!idb?.open)refuse('IndexedDB no disponible o scope invalido');
 let opened=null;
 const open=()=>opened??=new Promise((resolve,reject)=>{
  const req=idb.open('visura_f3a_checks_outbox_v1'+scope,1);
  req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('colas'))req.result.createObjectStore('colas',{keyPath:'key'});};
  req.onsuccess=()=>resolve(req.result);
  req.onerror=()=>reject(req.error);
 });
 return Object.freeze({
  async read(key){const db=await open();return new Promise((resolve,reject)=>{
   const t=db.transaction('colas','readonly'),q=t.objectStore('colas').get(key);
   q.onsuccess=()=>resolve(q.result?copy(q.result):null);q.onerror=()=>reject(q.error);
  });},
  async atomicUpdate(key,update){const db=await open();return new Promise((resolve,reject)=>{
   const tx=db.transaction('colas','readwrite'),store=tx.objectStore('colas');
   let outcome=null, aborted=false;
   const q=store.get(key);
   q.onsuccess=()=>{
    try{
     outcome=update(q.result?copy(q.result):null);
     if(outcome?.next)store.put(outcome.next);
    }catch(e){aborted=true;try{tx.abort()}catch{};reject(e);}
   };
   tx.onerror=()=>{if(!aborted)reject(tx.error)};
   tx.onabort=()=>{if(!aborted)reject(tx.error||Error('IDB transaccion abortada'));};
   tx.oncomplete=()=>resolve(outcome?.value);
  });}
 });
}
