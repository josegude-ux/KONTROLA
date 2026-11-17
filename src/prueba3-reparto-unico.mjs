// VISURA PREPARA · PRUEBA_3 · selección pura de hoja de reparto.
// Sin E/S, sin cambios de cargas y sin autoridad sobre COR2 ni el servidor.
const canon=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/[^A-Z0-9]+/g,' ').trim().replace(/\s+/g,' ');
const code=s=>String(s??'').toUpperCase().replace(/\s+/g,'');
const tieneFrio=r=>Array.isArray(r.cold)&&r.cold.some(p=>p?.location==='ZFRIO'&&typeof p.qty==='number'&&Number.isFinite(p.qty)&&p.qty>0);
function conductor(r){
 const raw=String(r?.driver??'').split(/[;,]/)[0].trim();
 const primer=raw.replace(/^\s*[A-Z]{1,3}\d{2,4}\s+/i,'').trim();
 return {raw,normalizado:canon(primer)};
}
const pesoComparable=r=>typeof r.weight==='number'&&Number.isFinite(r.weight)&&r.weight>=0&&r.verified===true&&r.hasCor===true&&r.mixedWarehouse!==true;
const ordenEstable=(a,b)=>{
 const campos=r=>[r.id,r.pdfHash,r.truck,r.source,r.driver].map(v=>canon(v)).join('|');
 return campos(a).localeCompare(campos(b),'es');
};
/**
 * Elige UNA carga por (almacén acreditado, fecha, repartidor normalizado).
 * Si algún peso del grupo carece de acreditación, no se puede afirmar cuál es el mayor.
 * Los motivos son informativos y nunca alteran estado, tiempos ni archivos.
 */
export function seleccionarRepartoUnico(cargas,{almacenPermitido='COR_01_COR'}={}){
 if(!Array.isArray(cargas))throw Error('Conjunto de cargas inválido');
 const grupos=new Map(),incidencias=[],excluidas=[];
 for(const r of cargas){
  if(!r||typeof r!=='object'){incidencias.push({fecha:'',almacen:'',repartidor:'',motivo:'Carga no válida'});continue;}
  const truck=code(r.truck);
  const nombre=conductor(r);
  if(truck.startsWith('CRALM')||truck.startsWith('CRVEN')||/^CC0(?:$| )/.test(nombre.normalizado)){
   excluidas.push({id:r.id??null,fecha:r.date??'',almacen:r.warehouse??r.almacen??'',motivo:truck.startsWith('CRALM')?'CRALM':truck.startsWith('CRVEN')?'CRVEN':'CC0'});
   continue;
  }
  const almacen=String(r.warehouse??r.almacen??'').toUpperCase().trim(),fecha=String(r.date??'').trim();
  if(almacen!==almacenPermitido||r.hasCor!==true){
   incidencias.push({fecha,almacen,repartidor:nombre.raw,motivo:'Almacén COR1 no acreditado para esta carga'});continue;
  }
  if(!/^\d{2}\/\d{2}\/\d{4}$/.test(fecha)||!nombre.normalizado){
   incidencias.push({fecha,almacen,repartidor:nombre.raw,motivo:!nombre.normalizado?'Repartidor no identificado':'Fecha no acreditada'});continue;
  }
  const key=JSON.stringify([almacen,fecha,nombre.normalizado]);
  if(!grupos.has(key))grupos.set(key,{fecha,almacen,repartidor:nombre.normalizado,candidatas:[]});
  grupos.get(key).candidatas.push(r);
 }
 const filas=[];
 for(const g of grupos.values()){
  if(g.candidatas.some(r=>!pesoComparable(r))){
   incidencias.push({fecha:g.fecha,almacen:g.almacen,repartidor:g.repartidor,motivo:'Pesos no comparables o sin acreditar'});
   continue;
  }
  // Orden independiente del orden de llegada, incluso en empates de peso.
  const ordenadas=[...g.candidatas].sort((a,b)=>b.weight-a.weight||ordenEstable(a,b));
  const elegida=ordenadas[0];
  if(!Array.isArray(elegida.cold)){
   incidencias.push({fecha:g.fecha,almacen:g.almacen,repartidor:g.repartidor,motivo:'Frío no acreditado en la carga de mayor peso'});
   continue;
  }
  filas.push({carga:elegida,fecha:g.fecha,almacen:g.almacen,repartidor:g.repartidor,conFrio:tieneFrio(elegida)});
 }
 filas.sort((a,b)=>a.fecha.split('/').reverse().join('').localeCompare(b.fecha.split('/').reverse().join(''))||a.almacen.localeCompare(b.almacen)||a.repartidor.localeCompare(b.repartidor,'es')||ordenEstable(a.carga,b.carga));
 incidencias.sort((a,b)=>[a.fecha,a.almacen,a.repartidor,a.motivo].join('|').localeCompare([b.fecha,b.almacen,b.repartidor,b.motivo].join('|')));
 return Object.freeze({filas,incidencias,excluidas,total:filas.length,conFrio:filas.filter(f=>f.conFrio).length,sinFrio:filas.filter(f=>!f.conFrio).length});
}

const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
/** Vista HTML única usada tal cual por previsualización y por la impresión/PDF existente. */
export function renderHojaRepartoUnica(cargas,{dates=[],skipped=0,driverOf=r=>r.driver||'',companionOf=r=>r.companion||'',plateOf=r=>r.plate||r.truck||''}={}){
 const seleccion=seleccionarRepartoUnico(cargas);
 const fechas=[...new Set([...seleccion.filas.map(x=>x.fecha),...seleccion.incidencias.map(x=>x.fecha).filter(Boolean)])]
  .sort((a,b)=>a.split('/').reverse().join('').localeCompare(b.split('/').reverse().join('')));
 if(!fechas.length)throw Error('No hay filas ni incidencias documentadas para la hoja de reparto.');
 const section=(title,rows,conFrio)=>{
  const head='<div class="lst-band">'+title+' ('+rows.length+')</div>';
  if(!rows.length)return head+'<div class="lst-empty">SIN CAMIONES EN ESTA SECCION</div>';
  const body=rows.map(f=>{const r=f.carga;
   return '<tr><td>'+esc(r.truck||plateOf(r))+'</td><td>'+esc(driverOf(r))+'</td><td>'+esc(companionOf(r))+'</td><td class="c">'+(conFrio?'SI':'')+'</td></tr>';
  }).join('');
  return head+'<table class="lst-table dark"><colgroup><col style="width:17%"><col style="width:41%"><col style="width:33%"><col style="width:9%"></colgroup><thead><tr><th>Cod. camion</th><th>Nombre repartidor</th><th>Acompañante</th><th>FRIO</th></tr></thead><tbody>'+body+'</tbody></table>';
 };
 const pages=fechas.map(fecha=>{
  const filas=seleccion.filas.filter(f=>f.fecha===fecha),conFrio=filas.filter(f=>f.conFrio),sinFrio=filas.filter(f=>!f.conFrio);
  const incidencias=seleccion.incidencias.filter(i=>i.fecha===fecha);
  const issues=incidencias.length?'<div class="lst-band">INCIDENCIAS ('+incidencias.length+')</div><ul>'+incidencias.map(i=>'<li>'+esc(i.repartidor||'Sin repartidor')+': '+esc(i.motivo)+'</li>').join('')+'</ul>':'';
  return '<article class="lst-page"><h1>HOJA DE REPARTO</h1><div class="lst-date">Fecha: '+esc(fecha)+'</div>'+section('CAMIONES QUE COGEN FRIO',conFrio,true)+section('CAMIONES SIN FRIO',sinFrio,false)+issues+'<div class="lst-band sum">RESUMEN: '+filas.length+' repartidores | Con frio: '+conFrio.length+' | Sin frio: '+sinFrio.length+' | Incidencias: '+incidencias.length+'</div></article>';
 }).join('');
 return {html:pages,summary:'Hoja de reparto · Coruña: '+seleccion.total+' repartidores · Con frio: '+seleccion.conFrio+' · Sin frio: '+seleccion.sinFrio+' · Incidencias: '+seleccion.incidencias.length+' · '+fechas.join(', ')+(skipped?' · '+skipped+' de Ferrol omitidas':'')+(seleccion.excluidas.length?' · '+seleccion.excluidas.length+' cargas excluidas':''),seleccion};
}
