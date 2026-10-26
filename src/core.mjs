// Lector por coordenadas para hojas de carga VolDistribución.
// Los formatos pueden incluir cantidades decimales (por ejemplo KG).
const numeric = raw => raw==null ? null : Number(String(raw).trim().replace(/\./g,'').replace(',','.'));
// La columna de unidades puede llevar tres decimales: «110.000» significa 110.
// No usar la interpretación de millares propia del campo Peso carga.
const numericQty = raw => {
  if(raw==null)return null;
  const text=String(raw).trim().replace(/\s/g,'');
  if(!/^\d+(?:[,.]\d+)?$/.test(text))return null;
  return Number(text.replace(',','.'));
};
const isQty = text => /^\d+(?:[,.]\d+)?$/.test(String(text).trim());
const validQty = val => typeof val==='number' && Number.isFinite(val) && val>=0;
export const normalizeWarehouseCode=raw=>{
 const cleaned=String(raw||'').toUpperCase().trim().replace(/[\s-]+/g,'_').replace(/_+/g,'_');
 return cleaned.replace(/^COR_1_/,'COR_01_').replace(/^COR_2_/,'COR_02_')||null;
};
const KNOWN_WAREHOUSES=new Set(['COR_01_COR','COR_02_NAR']);
// Capacity code (6G 1E) is not "Huecos plts. camión: 0".
export function extraerFormatoCamion(truckLine="",huecosLine=""){
 const expr=/(?:^|[^A-Z0-9])(\d{1,2})\s*G(?:\s*[-\/ ]?\s*(\d{1,2})\s*([EP]))?(?=\b|$)/i;
 const cap=String(huecosLine).match(expr)||String(truckLine).match(expr);
 if(cap){
  const second=cap[2]==null?null:Number(cap[2]);
  return {palletsLarge:Number(cap[1]),palletsSmall:cap[3]?.toUpperCase()==="P"?second:null,
    palletsEuropean:cap[3]?.toUpperCase()==="E"?second:null,palletsTotal:null};
 }
 const plain=String(huecosLine).match(/^\s*(\d{1,3})(?=\s|$)/);
 return {palletsLarge:null,palletsSmall:null,palletsEuropean:null,
   palletsTotal:plain?Number(plain[1]):null};
}
// Extraer solo las observaciones de la cabecera (nunca las del detalle de mercancía).
export function leerObservacionesCabecera(pages=[]){
 const nextField=/\b(?:Almac[eé]n|Fecha\s*carga|Cam[ií][oó]n|Matr[ií]cula|Ruta|Repartidor|Peso\s*carga|Huecos\s*(?:plts?\.?|palets?)|N[º°o.]?\s*(?:visitas|copias)|Total\s*referencias)\s*:/i;
 for(const page of pages){
  const items=(page.items||[]).filter(item=>String(item.text||"").trim()&&Number.isFinite(item.y)&&Number.isFinite(item.x))
   .sort((a,b)=>a.y-b.y||a.x-b.x);
  const goods=items.find(item=>/M\s*E\s*R\s*C\s*A\s*N\s*C\s*[IÍ]\s*A/i.test(item.text));
  const total=items.find(item=>/Total\s*referencias\s*prod/i.test(item.text));
  const limit=goods?.y??total?.y??Infinity;
  const rows=[];
  for(const item of items.filter(item=>item.y<limit-1)){
   const last=rows[rows.length-1];
   if(last&&Math.abs(last.y-item.y)<=3)last.items.push(item);
   else rows.push({y:item.y,items:[item]});
  }
  for(let i=0;i<rows.length;i++){
   const row=rows[i];
   const line=row.items.map(item=>item.text.trim()).join(" ").replace(/\s+/g," ").trim();
   const match=/\bObservaciones?\s*:?\s*/i.exec(line);
   if(!match)continue;
   const chunks=[];
   const immediate=line.slice(match.index+match[0].length).split(nextField)[0].trim();
   if(immediate)chunks.push(immediate);
   // Las observaciones pueden estar en la línea siguiente en los PDF de BC.
   const obsX=row.items.find(item=>/Observaciones?\s*:/i.test(item.text))?.x??row.items[0].x;
   for(let j=i+1;j<rows.length&&j<=i+2;j++){
    if(rows[j].y-rows[j-1].y>22)break;
    const value=rows[j].items.map(item=>item.text.trim()).join(" ").replace(/\s+/g," ").trim();
    if(!value||nextField.test(value)||/\b(?:Observaciones?|M\s*E\s*R\s*C\s*A\s*N\s*C\s*[IÍ]\s*A)\b/i.test(value))break;
    if(/^(?:Devoluciones?|unidad|C[oó]d\.?|situaci[oó]n|Prevista|Real)\b/i.test(value))break;
    if(Math.abs(rows[j].items[0].x-obsX)>120)break;
    chunks.push(value.split(nextField)[0].trim());
    if(nextField.test(value))break;
   }
   const observation=chunks.join(" ").replace(/\s+/g," ").trim();
   return observation||null;
  }
 }
 return null;
}

export function parseDocumentPages(pages, fileName='Documento.pdf', options={}) {
 // Business Central puede incluir varios almacenes dentro del MISMO LP.
 const warehouseOf=page=>{
  const line=page.items.map(it=>it.text||'').join(' ');
  const hit=line.match(/Almac[eé]n\s*:\s*([A-Z]{2,8}[\s_-]*0?\d{1,3}[\s_-]*[A-Z0-9]{2,12})/i);
  if(!hit)return null;
  return normalizeWarehouseCode(hit[1]);
 };
 const identified=pages.map(warehouseOf);
 const warehouses=[...new Set(identified.filter(Boolean))];
 const mixedWarehouse=warehouses.length>1;
 const requestedWarehouse=normalizeWarehouseCode(options.warehouse);
 const warehouse=requestedWarehouse||(warehouses.length===1?warehouses[0]:null);
 const warehouseWarnings=[];
 if(requestedWarehouse&&!warehouses.includes(requestedWarehouse))warehouseWarnings.push('El almacén seleccionado no aparece en el documento');
 if(mixedWarehouse&&!warehouse)warehouseWarnings.push('El documento contiene varios almacenes; debe seleccionarse uno antes de revisar');
 if(!warehouses.length)warehouseWarnings.push('El documento no indica un almacén reconocible; queda pendiente de clasificar');
 if(warehouse&&!KNOWN_WAREHOUSES.has(warehouse))warehouseWarnings.push('Almacén '+warehouse+' pendiente de clasificar');
 if(warehouses.length&&warehouse){
  let active=null;
  pages=pages.filter((page,index)=>{
   if(identified[index])active=identified[index];
   return active===warehouse;
  });
 }else if(mixedWarehouse){
  pages=[];
 }
 const every=pages.flatMap(p=>p.items.map(it=>({...it,page:p.number})));
 const textAll=every.map(i=>i.text).join(' ').replace(/\s+/g,' ');
 const extract=(regexp,source=textAll)=>source.match(regexp)?.[1]??null;
 // El texto de PDF.js puede fragmentar LP, año, guion y número.
 let id=extract(/\b(LP\s*\d{2}\s*[-–_ ]\s*\d{4,6})\b/i);
 if(!id)id=(fileName.match(/LP\d{2}[-_ ]\d{4,6}/i)||[])[0];
 if(id)id=id.toUpperCase().replace(/\s+/g,'').replace(/[-–_]/g,'-');
 // Los PDF de BC se descargan a veces como 19663.pdf. Reconstruir LP
 // únicamente si la fecha de carga explícita determina el año y el
 // documento contiene la misma numeración de carga.
 if(!id&&/^\d{4,6}\.pdf$/i.test(fileName)){
   const number=fileName.replace(/\.pdf$/i,'');
   const dateMatch=textAll.match(/Fecha\s*carga\s*:?\s*(\d{2}\/\d{2}\/(\d{4}|\d{2}))/i);
   const year=dateMatch?.[2]?.slice(-2);
   const numberInDocument=new RegExp('(?:N[º°o.]?\\s*(?:carga|documento)|N[uú]mero\\s*(?:carga|documento)|Carga)\\s*:?\\s*'+number+'\\b','i').test(textAll);
   if(year&&numberInDocument)id='LP'+year+'-'+number;
 }
 id=id||fileName.replace(/\.pdf$/i,'');
 const weight=numeric(extract(/Peso\s*carga\s*:?\s*([\d.]+,\d+|\d+(?:\.\d+)?)/i));
 const refs=numeric(extract(/Total\s*referencias\s*prod\.?\s*:?\s*(\d+)/i));
 // «TOTAL» del bloque MERCANCÍA de BC: bultos, no referencias ni devoluciones.
 // La lectura por coordenadas de declaredTotal excluye CONTROL ENVASES y PALETS.
 const visits=numeric(extract(/N[º°o.]?\s*visitas\s*:?\s*(\d+)/i));
 const driver=(extract(/Repartidor\s*:\s*(.{1,65}?)(?=N[º°o.]?\s*copias|N[º°o.]?\s*visitas|Peso\s*carga|Almac[eé]n|$)/i)||'').trim();
 const plate=extract(/Matr[ií]cula\s*:?\s*([A-Z0-9-]{5,12})/i)||extract(/Cami[oó]n\s*:\s*CR(\d{4}[A-Z]{3})/i)||'';
 // En el encabezado real "6G 1E" declara capacidad (G grandes, E europeos).
 // El campo separado "Huecos plts. camión: 0" no reemplaza el formato del vehículo.
 const truckLine=extract(/Cami[oó]n\s*:\s*(.{1,120}?)(?=\s*Matr[ií]cula\s*:|\s*Huecos\s*plts\.?\s*cami[oó]n\s*:|\s*Almac[eé]n\s*:|$)/i)||'';
 const huecosLine=extract(/Huecos\s*(?:plts?\.?|palets?)\s*(?:del?\s*)?cami[oó]n\s*:\s*(.{1,90}?)(?=\s*(?:Matr[ií]cula|Almac[eé]n|Ruta|Repartidor|Fecha\s*carga|Observaciones?|Peso\s*carga)\s*:|$)/i)||"";
 const {palletsLarge,palletsSmall,palletsEuropean,palletsTotal}=extraerFormatoCamion(truckLine,huecosLine);
 const observations=leerObservacionesCabecera(pages);
 const date=extract(/Fecha\s*carga\s*:\s*(\d{2}\/\d{2}\/\d{2,4})/i);
 const route=(extract(/Ruta\s*:\s*(.{1,60}?)(?=\s+(?:Repartidor|Matr[ií]cula|Cami[oó]n|Fecha|Peso|Almac[eé]n|N[º°o.]?\s*(?:copias|visitas))\s*:|$)/i)||'').trim();
 let merchandise=false,declaredTotal=null;
 const products=[],warnings=[...warehouseWarnings];
 for(const page of pages){
  const items=page.items.filter(it=>it.text&&it.text.trim()).sort((a,b)=>a.y-b.y||a.x-b.x);
  const goodsTitle=items.find(it=>/M\s*E\s*R\s*C\s*A\s*N\s*C\s*[IÍ]\s*A/i.test(it.text));
  if(goodsTitle)merchandise=true;
  const refsLabel=items.find(it=>/Total\s+referencias\s+prod/i.test(it.text));
  const controlLabel=items.find(it=>/C\s*O\s*N\s*T\s*R\s*O\s*L\s*\s*E\s*N\s*V\s*A\s*S\s*E\s*S/i.test(it.text));
  const palletsLabel=items.find(it=>/P\s*A\s*L\s*E\s*T\s*S/i.test(it.text));
  if(!merchandise&&page.number===1&&refsLabel)merchandise=true;
  if(!merchandise)continue;
  const stop=Math.min(refsLabel?.y??Infinity,controlLabel?.y??Infinity,palletsLabel?.y??Infinity);
  const begin=goodsTitle?goodsTitle.y+2:0;
  const zone=items.filter(it=>it.y>=begin&&it.y<stop);
  const rows=[];
  for(const i of zone){
   if(i.x>page.width*.4)continue;
   const hit=i.text.match(/\bPRD\d{7}\b/i);
   if(!hit)continue;
   // Ubicación estandar y variante impresa K109-3 (pertenece al pasillo K).
   // PDF.js puede separar una ubicación en varios fragmentos de texto.
   // Buscar solo en la misma fila y a la izquierda del SKU evita copiar
   // ubicaciones de productos vecinos.
   const locPattern=/\b([A-Z]\d{2,3}\s*-\s*P?\d{1,3}|ZFRIO)\b/i;
   const prev=zone.filter(p=>p.x<=i.x+3&&Math.abs(p.y-i.y)<8)
     .sort((a,b)=>a.x-b.x).map(p=>p.text).join(' ');
   const loc=((i.text.match(locPattern)||[])[0]||(prev.match(locPattern)||[])[0]||'')
     .toUpperCase().replace(/\s+/g,'');
   rows.push({sku:hit[0].toUpperCase(),location:loc.toUpperCase(),y:i.y});
  }
  rows.sort((a,b)=>a.y-b.y);
  const unique=[];
  for(const row of rows){if(!unique.some(v=>v.sku===row.sku&&Math.abs(v.y-row.y)<5))unique.push(row)}
  for(let n=0;n<unique.length;n++){
   const r=unique[n];
   const top=n?(unique[n-1].y+r.y)/2:r.y-8;
   const bottom=n+1<unique.length?(r.y+unique[n+1].y)/2:Math.min(stop,r.y+45);
   const cells=zone.filter(i=>i.y>=top&&i.y<bottom);
   const amounts=cells.filter(i=>i.x>page.width*.68&&i.x<page.width*.77&&isQty(i.text)).sort((a,b)=>Math.abs(a.y-r.y)-Math.abs(b.y-r.y));
   // Un campo Total unidades vacío significa mercancía no solicitada: 0, no error.
   // No se toma el número de la columna Devoluciones previstas.
   const qty=amounts.length?numericQty(amounts[0].text):0;
   const units=cells.filter(i=>i.x>=page.width*.88).sort((a,b)=>a.y-b.y||a.x-b.x).map(i=>i.text.trim());
   const rawUnit=units.join('').toUpperCase().replace(/[^A-ZÁÉÍÓÚÑ]/g,'');
   let unit=rawUnit;
   if(/^BOTELLAS?$|^BOTELLA?$/.test(rawUnit))unit='BOTELLA';
   else if(/^PAQUETES?$/.test(rawUnit))unit='PAQUETE';
   else if(/^CAJAS?$/.test(rawUnit))unit='CAJA';
   else if(/^PACKS?$/.test(rawUnit))unit='PACK';
   else if(/^BOLSAS?$/.test(rawUnit))unit='BOLSA';
   else if(/^BARRILES?$/.test(rawUnit))unit='BARRIL';
   else if(/^PALETS?$/.test(rawUnit))unit='PALET';
   else if(/^KGS?$|^KILOS?$|^KILOGRAMOS?$/.test(rawUnit))unit='KG';
   const description=cells.filter(i=>i.x>page.width*.18&&i.x<page.width*.67).sort((a,b)=>a.y-b.y||a.x-b.x).map(i=>i.text.trim()).filter(Boolean).join(' ').replace(/\s+/g,' ');
   const sourceContext=cells.sort((a,b)=>a.x-b.x||a.y-b.y).map(i=>i.text.trim()).filter(Boolean).join(' ');
   const product={...r,qty,unit,description,sourceContext};
   if(!validQty(qty)||(qty>0&&!unit))warnings.push('Cantidad o unidad sin reconocer en '+r.sku);
   products.push(product);
  }
  if(refsLabel){
   const totalItem=items.find(i=>i.text.trim().toUpperCase()==='TOTAL:'&&Math.abs(i.y-refsLabel.y)<12);
   if(totalItem){const q=items.filter(i=>i.x>page.width*.68&&i.x<page.width*.78&&Math.abs(i.y-totalItem.y)<9&&isQty(i.text)).sort((a,b)=>Math.abs(a.y-totalItem.y)-Math.abs(b.y-totalItem.y))[0];if(q)declaredTotal=numericQty(q.text)}
   merchandise=false;
  }else if(controlLabel||palletsLabel){merchandise=false}
 }
 if(warehouse&&warehouses.length&&!pages.length)warnings.push('El PDF no contiene mercancía del almacén '+warehouse);
 const sum=products.reduce((a,p)=>a+Number(p.qty||0),0);
 const countOK=refs!==null&&refs===products.length;
 const amountOK=declaredTotal===null?null:Math.abs(declaredTotal-sum)<0.000001;
 if(!countOK)warnings.push('Referencias detectadas: '+products.length+' / declaradas: '+(refs??'no consta'));
 if(amountOK===false)warnings.push('Suma detectada: '+sum.toFixed(3)+' / declarada: '+declaredTotal);
 if(declaredTotal===null)warnings.push('No se pudo contrastar el total del PDF');
 const verified=countOK&&amountOK===true&&warnings.length===0;
 return {id,weight,refs,bultos:declaredTotal,visits,driver,plate,palletsLarge,palletsSmall,palletsEuropean,palletsTotal,observations,date,route,source:fileName,products,declaredTotal,actualTotal:sum,verified,warnings,warehouse,warehouseKnown:KNOWN_WAREHOUSES.has(warehouse),mixedWarehouse,availableWarehouses:warehouses};
}
export function summarize(products){
 const units={},aisles={},unlocated=[];
 for(const p of products){
  const qty=p.qty;
  if(!validQty(qty)||qty===0)continue;
  const unit=p.unit||'DESCONOCIDO';units[unit]=(units[unit]||0)+qty;
  const aisle=p.location==='ZFRIO'?'FRÍO':p.location?p.location[0]:'SIN UBICACIÓN';
  if(!aisles[aisle])aisles[aisle]={};aisles[aisle][unit]=(aisles[aisle][unit]||0)+qty;
  if(!p.location)unlocated.push(p);
 }
 return {units,aisles,unlocated};
}
