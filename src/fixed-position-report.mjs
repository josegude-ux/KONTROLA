/* VISURA PREPARA · control de posiciones fijas.
 * Contrato de lectura validada. No modifica stock, posiciones, ni Business Central.
 * Reutiliza la semántica de artículos/posiciones de INVENTA, sin su peligroso
 * COALESCE(stock,0) para posiciones sin línea BC.
 */
export const FIXED_CATEGORIES=Object.freeze({
  UNASSIGNED:"sin_fija", ZERO:"cero", NEGATIVE:"negativo", INSUFFICIENT:"insuficientes"
});
const MAX_DECIMALS=6, SCALE=10n**BigInt(MAX_DECIMALS);
const str=v=>String(v??"").trim();
const norm=v=>str(v).toUpperCase();
const key=(...parts)=>JSON.stringify(parts);
function decimal(value){
  const source=str(value).replace(",",".");
  const match=/^(-?)(\d{1,12})(?:\.(\d{1,6}))?$/.exec(source);
  if(!match)return null;
  const frac=(match[3]||"").padEnd(MAX_DECIMALS,"0");
  return (match[1]==="-"?-1n:1n)*(BigInt(match[2])*SCALE+BigInt(frac||0));
}
export function decimalText(value){
  if(value===null||value===undefined)return null;
  const sign=value<0n?"-":"",positive=value<0n?-value:value;
  const whole=positive/SCALE,frac=String(positive%SCALE).padStart(MAX_DECIMALS,"0").replace(/0+$/,"");
  return sign+whole.toString()+(frac?"."+frac:"");
}
function record(article,location,category,reason,quantities,warehouse,meta,possibleReplenishment=false){
  return {
    code:article.code, description:article.description, unit:article.unit,
    warehouse, location:location||null, aisle:location?location.split("-")[0]:"",zone:"",
    category, reason, ...quantities, replenishment:possibleReplenishment,
    source:meta.sourceFile||null, importedAt:meta.importedAt||null
  };
}
/** Entrada siempre acotada a UN almacén en el servidor: respuesta desde RPC administrativa.
 * meta.stockComplete, catalogComplete y positionsComplete requieren prueba explícita.
 * meta.absentStockIsZero solo es verdadero si el exportador BC certifica esa representación.
 */
export function classifyFixedPositions({warehouse,products=[],fixed=[],stock=[],locations=[],meta={}}){
  const selected=norm(warehouse);
  if(!selected)throw Error("Se requiere un almacén.");
  if(!Array.isArray(products)||!Array.isArray(fixed)||!Array.isArray(stock)||!Array.isArray(locations))
    throw Error("Respuesta de inventario inválida.");
  if(meta.warehouse&&norm(meta.warehouse)!==selected)throw Error("Respuesta de otro almacén.");
  if(meta.authorized!==true)throw Error("La fuente no acredita autorización administrativa.");
  const catalogue=new Map(),assignments=new Map(),locationData=new Map(),perPlace=new Map(),
    totals=new Map(),duplicateLots=new Map(),invalid=new Set(),allCodes=new Set();
  let globalInvalid=false;
  for(const place of locations){
    if(place.warehouse&&norm(place.warehouse)!==selected)throw Error("Ubicación de otro almacén.");
    const loc=norm(place.code||place.location_code);
    if(loc)locationData.set(loc,{aisle:str(place.aisle)||loc.split("-")[0],zone:str(place.zone)});
  }
  for(const p of products){
    if(p.warehouse&&norm(p.warehouse)!==selected)throw Error("Catálogo de otro almacén.");
    const code=norm(p.code||p.product_code);
    if(!code){globalInvalid=true;continue;}
    allCodes.add(code);
    const previous=catalogue.get(code);
    const entry={code,description:str(p.description),unit:str(p.unit)};
    if(previous&&(previous.description!==entry.description||previous.unit!==entry.unit))invalid.add(code);
    catalogue.set(code,entry);
  }
  for(const f of fixed){
    if(f.warehouse&&norm(f.warehouse)!==selected)throw Error("Posición fija de otro almacén.");
    const code=norm(f.product_code||f.code),loc=norm(f.location_code||f.location);
    if(!code||!loc){globalInvalid=true;continue;}
    allCodes.add(code);
    if(!assignments.has(code))assignments.set(code,new Set());
    assignments.get(code).add(loc);
  }
  for(const line of stock){
    if(line.warehouse&&norm(line.warehouse)!==selected)throw Error("Stock de otro almacén.");
    const code=norm(line.product_code||line.code),loc=norm(line.location_code||line.location);
    if(!code||!loc){globalInvalid=true;continue;}
    allCodes.add(code);
    const qty=decimal(line.quantity),lot=str(line.lot);
    if(qty===null){invalid.add(code);continue;}
    const u=str(line.unit);
    if(u&&catalogue.has(code)&&catalogue.get(code).unit&&u!==catalogue.get(code).unit){
      invalid.add(code);continue;
    }
    const lotKey=key(code,loc,lot);
    if(duplicateLots.has(lotKey)){
      if(duplicateLots.get(lotKey)!==qty)invalid.add(code);
      continue; // Los duplicados idénticos no alteran las existencias.
    }
    duplicateLots.set(lotKey,qty);
    const placeKey=key(code,loc);
    perPlace.set(placeKey,(perPlace.get(placeKey)||0n)+qty);
    totals.set(code,(totals.get(code)||0n)+qty);
  }
  const full=meta.stockComplete===true&&meta.catalogComplete===true&&
    meta.positionsComplete===true&&Boolean(meta.importedAt)&&Boolean(meta.sourceFile)&&!globalInvalid;
  const result=[];
  for(const code of [...allCodes].sort()){
    const article=catalogue.get(code)||{code,description:"",unit:""};
    const fixedLocs=[...(assignments.get(code)||[])].sort();
    const total=totals.has(code)?totals.get(code):null;
    const presentPlaces=[...perPlace].filter(([k])=>JSON.parse(k)[0]===code)
      .map(([k,q])=>({location:JSON.parse(k)[1],quantity:decimalText(q)}))
      .sort((a,b)=>a.location.localeCompare(b.location));
    const issue= !full||!catalogue.has(code)||!article.description||!article.unit||invalid.has(code);
    const totalText=decimalText(total);
    if(!fixedLocs.length){
      result.push({...record(article,null,issue?FIXED_CATEGORIES.INSUFFICIENT:FIXED_CATEGORIES.UNASSIGNED,
        issue?"Catálogo, posiciones o importación sin validar":"Artículo sin posición fija",
        {positionQuantity:null,warehouseQuantity:totalText,otherQuantity:totalText},
        selected,meta),locations:presentPlaces});
      continue;
    }
    for(const loc of fixedLocs){
      const at=perPlace.get(key(code,loc));
      const other=total!==null&&at!==undefined?total-at:null;
      const zeroCertified=meta.absentStockIsZero===true&&full;
      const unavailable=issue||(at===undefined&&!zeroCertified);
      const position=at===undefined?(zeroCertified?0n:null):at;
      const category=unavailable?FIXED_CATEGORIES.INSUFFICIENT:
        position<0n?FIXED_CATEGORIES.NEGATIVE:position===0n?FIXED_CATEGORIES.ZERO:null;
      if(!category)continue;
      const zone=locationData.get(loc)||{aisle:loc.split("-")[0],zone:""};
      const others=other===null&&zeroCertified?total:other;
      const q={positionQuantity:decimalText(position),warehouseQuantity:totalText,
        otherQuantity:decimalText(others)};
      result.push({...record(article,loc,category,unavailable?
        (at===undefined?"No consta línea BC en esta ubicación fija":"Datos maestros o BC sin validación"):
        category===FIXED_CATEGORIES.ZERO?"Posición fija sin unidades":"Existencia negativa en posición fija",
        q,selected,meta,!unavailable&&position===0n&&others!==null&&others>0n),
        aisle:zone.aisle,zone:zone.zone,locations:presentPlaces});
    }
  }
  const byCategory=Object.fromEntries(Object.values(FIXED_CATEGORIES).map(category=>{
    const rows=result.filter(r=>r.category===category);
    return [category,{references:new Set(rows.map(x=>x.code)).size,positions:rows.filter(x=>x.location).length,rows:rows.length}];
  }));
  return {warehouse:selected,meta:{...meta,warehouse:selected},rows:result,byCategory,
    affectedReferences:new Set(result.map(x=>x.code)).size,
    affectedPositions:new Set(result.filter(x=>x.location).map(x=>key(x.code,x.location))).size,
    complete:full&&invalid.size===0};
}
export function filterFixedRows(rows,{category="todos",search="",aisle="",zone="",other="todos",sort="severity"}={}){
  const term=str(search).toLocaleLowerCase("es");
  const severity={[FIXED_CATEGORIES.NEGATIVE]:0,[FIXED_CATEGORIES.ZERO]:1,
    [FIXED_CATEGORIES.UNASSIGNED]:2,[FIXED_CATEGORIES.INSUFFICIENT]:3};
  const filtered=rows.filter(row=>{
    if(category!=="todos"&&row.category!==category)return false;
    if(aisle&&row.aisle!==aisle||zone&&row.zone!==zone)return false;
    if(term&&![row.code,row.description,row.location,row.aisle,row.zone].join(" ").toLocaleLowerCase("es").includes(term))return false;
    if(other!=="todos"){
      if(row.otherQuantity===null)return false;
      if((decimal(row.otherQuantity)>0n)!==(other==="si"))return false;
    }
    return true;
  });
  filtered.sort((a,b)=>{
    let d=0;
    if(sort==="severity")d=severity[a.category]-severity[b.category];
    if(sort==="location")d=(a.location||"").localeCompare(b.location||"");
    if(sort==="quantity")d=(decimal(a.positionQuantity||"0")??0n)<(decimal(b.positionQuantity||"0")??0n)?-1:
      (decimal(a.positionQuantity||"0")??0n)>(decimal(b.positionQuantity||"0")??0n)?1:0;
    if(sort==="code")d=a.code.localeCompare(b.code);
    return d||a.code.localeCompare(b.code)||(a.location||"").localeCompare(b.location||"");
  });
  return filtered;
}
export function safeCsvCell(value){
  let text=str(value);
  if(/^[\s\uFEFF]*[=+\-@\t\r\n]/.test(text))text="'"+text;
  return '"'+text.replace(/"/g,'""')+'"';
}
export function fixedReportCsv(rows,{warehouse,sourceFile,importedAt,generatedAt,filters={}}){
  const head=["Categoría","Artículo","Descripción","Almacén","Ubicación fija","Pasillo","Zona",
    "Stock posición fija","Stock total almacén","Stock otras ubicaciones","Unidad",
    "Posible reposición","Fecha importación","Origen BC","Observación"];
  const data=rows.map(r=>[r.category,r.code,r.description,r.warehouse,r.location||"SIN POSICIÓN FIJA",
    r.aisle,r.zone,r.positionQuantity??"SIN DATOS",r.warehouseQuantity??"SIN DATOS",
    r.otherQuantity??"SIN DATOS",r.unit,r.replenishment?"Sí":"No",r.importedAt,r.source,r.reason]);
  const info=[["Informe","VISURA PREPARA · Control de posiciones fijas"],["Almacén",warehouse],
    ["Origen",sourceFile||"Sin exportación completa"],["Importado",importedAt||"Sin fecha"],
    ["Generado",generatedAt],["Filtros",JSON.stringify(filters)],["Registros",rows.length]];
  const quoteRow=a=>a.map(safeCsvCell).join(";");
  return "\uFEFF"+info.map(quoteRow).join("\r\n")+"\r\n\r\n"+[head,...data].map(quoteRow).join("\r\n")+"\r\n";
}
