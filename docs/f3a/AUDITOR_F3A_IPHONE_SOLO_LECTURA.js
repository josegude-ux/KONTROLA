/* VISURA F3A · Diagnóstico iPhone de revisiones y ledger F2 · SOLO LECTURA.
   No consulta servidores, ni escribe localStorage/IndexedDB, ni transmite datos.
   Este diagnóstico NO certifica la verificación física de las mercancías. */
(() => {
 'use strict';
 const param=new URLSearchParams(location.search).get('visura_scope')||'';
 const scope=/^[a-f0-9]{24}$/.test(param)?'_visura_'+param:null;
 const report=['VISURA F3A · AUDITORÍA LOCAL DE PRUEBA_3 · SOLO LECTURA',
  'Hora informativa del dispositivo: '+new Date().toISOString(),
  'Ningún check queda acreditado en servidor por esta auditoría.'];
 const read=(prefix)=>{
  if(!scope)return {error:'Sin ámbito válido'};
  try{const raw=localStorage.getItem(prefix+scope);
   return raw===null?{absent:true}:{value:JSON.parse(raw)};
  }catch(e){return {error:'Registro ilegible ('+(e?.name||'error')+')'};}
 };
 const loads=read('control_cargas_prueba_integrada_2');
 const reviews=read('visura_control_revision_v1');
 const primary=read('visura_prepara_descarte_v1');
 const reserve=read('visura_prepara_descarte_cache_v1');
 const loadRows=Array.isArray(loads.value)?loads.value:[];
 const reviewRows=reviews.value&&typeof reviews.value==='object'&&!Array.isArray(reviews.value)?reviews.value:{};
 const normal=raw=>{if(typeof raw!=='string')throw Error('LP');
  const match=/^LP([0-9]{2})-?([0-9]{4,6})$/.exec(raw.toUpperCase().replace(/[ \t\r\n]+/g,''));
  if(!match)throw Error('LP');
  return 'LP'+match[1]+'-'+match[2].replace(/^0+(?=[0-9])/,'').padStart(4,'0');
 };
 const signature=load=>JSON.stringify({id:load.id,pdfHash:load.pdfHash||null,
  products:load.products.map((p,i)=>({line:i,sku:String(p.sku||''),
   location:String(p.location||''),description:String(p.description||''),
   qty:Number(p.qty),unit:String(p.unit||'')}))});
 const counts={cargas:loadRows.length,lp_invalidos:0,lp_duplicados:0,
  cargas_sin_revision:0,revisiones_coherentes:0,revisiones_desactualizadas:0,
  revisiones_auditoria_inconsistente:0,revisiones_cerradas:0,
  cargas_con_pendientes:0,cargas_sin_pendientes:0};
 const lpSet=new Set();
 for(const l of loadRows){
  if(!l||!Array.isArray(l.products)){counts.lp_invalidos++;continue;}
  let lp;try{lp=normal(l.id);}catch{counts.lp_invalidos++;continue;}
  if(lpSet.has(lp))counts.lp_duplicados++;lpSet.add(lp);
  const r=reviewRows[l.id];
  if(!r){counts.cargas_sin_revision++;continue;}
  if(r.closedAt)counts.revisiones_cerradas++;
  if(r.sourceSignature!==signature(l)||r.loadId!==l.id||r.schema!==1){counts.revisiones_desactualizadas++;continue;}
  if(!r.lines||typeof r.lines!=='object'||Array.isArray(r.lines)||!Array.isArray(r.audit)){
   counts.revisiones_auditoria_inconsistente++;continue;
  }
  const states=Array(l.products.length).fill('pending');let corrupt=false;
  for(const event of r.audit){
   if(!event||!Number.isInteger(event.line)||event.line<0||event.line>=states.length||
    !['pending','ok','incident'].includes(event.to)||event.from!==states[event.line]){corrupt=true;break;}
   states[event.line]=event.to;
  }
  for(let i=0;i<states.length&&!corrupt;i++){
   if(states[i]==='pending'?(r.lines[i]!==undefined):
      (r.lines[i]?.status!==states[i]))corrupt=true;
  }
  if(corrupt){counts.revisiones_auditoria_inconsistente++;continue;}
  counts.revisiones_coherentes++;
  if(states.includes('pending'))counts.cargas_con_pendientes++;
  else counts.cargas_sin_pendientes++;
 }
 report.push('Ámbito de usuario: '+(scope?'válido (omitido)':'NO ENCONTRADO'));
 if(loads.error||loads.absent)report.push('Cargas: '+(loads.error||'clave ausente'));
 if(reviews.error||reviews.absent)report.push('Revisiones: '+(reviews.error||'clave ausente'));
 for(const [key,value] of Object.entries(counts))report.push(key+': '+value);
 const ledgerValid=v=>v&&typeof v==='object'&&v.scope===scope&&v.schema===1&&
  v.items&&typeof v.items==='object'&&!Array.isArray(v.items);
 const p=ledgerValid(primary.value)?primary.value:null;
 const b=ledgerValid(reserve.value)?reserve.value:null;
 report.push('Ledger principal: '+(primary.error|| (p?'válido':primary.absent?'ausente':'inválido')));
 report.push('Ledger reserva: '+(reserve.error|| (b?'válido':reserve.absent?'ausente':'inválido')));
 if(p&&b){
  const keys=new Set([...Object.keys(p.items),...Object.keys(b.items)]);
  const diff=[...keys].filter(k=>JSON.stringify(p.items[k])!==JSON.stringify(b.items[k]));
  report.push('LP divergentes entre copias: '+diff.length);
  report.push('LP descartados según copia principal: '+Object.values(p.items).filter(v=>v?.estado_descarte==='descartada').length);
 }else report.push('Cruce de ledger: INDETERMINADO, no asumir ausencia de descartes');
 report.push('Sin listado de LP ni datos de personas; no se realizó ninguna petición de red.');
 const panel=document.createElement('div');
 panel.style.cssText='position:fixed;z-index:2147483647;inset:8px;background:#fff;color:#111;padding:16px;display:flex;flex-direction:column;gap:12px;border:2px solid #333;border-radius:12px';
 const heading=document.createElement('strong');heading.textContent='VISURA F3A · auditoría local';
 const area=document.createElement('textarea');area.readOnly=true;area.value=report.join('\n');
 area.style.cssText='flex:1;width:100%;min-height:160px;font:13px monospace';
 const copy=document.createElement('button');copy.textContent='Copiar informe';
 copy.onclick=async()=>{try{await navigator.clipboard.writeText(area.value);copy.textContent='Copiado';}
  catch{area.focus();area.select();copy.textContent='Seleccionado: toca Copiar';}};
 const close=document.createElement('button');close.textContent='Cerrar';close.onclick=()=>panel.remove();
 panel.append(heading,area,copy,close);document.body.append(panel);
})();
