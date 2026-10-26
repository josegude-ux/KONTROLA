// Auditoría LOCAL y sin efectos secundarios de copias Control de Cargas v0.5.x.
// Los PDF originales no se exportan en el JSON: permanecen en IndexedDB del dispositivo.
const clean=value=>String(value??"").trim();
const validHash=value=>/^[a-f0-9]{64}$/i.test(clean(value));
const validCode=value=>/^LP[0-9]{2}-[0-9]{4,6}$/.test(clean(value));
const validTime=value=>value&&Number.isFinite(Date.parse(value));
export function auditarCopiaCargas(source){
  const data=typeof source==="string"?JSON.parse(source):source;
  if(!data||data.format!=="control-cargas-backup"
    ||!Array.isArray(data.loads)||!Array.isArray(data.operators)){
    throw Error("Esta copia no tiene el formato original de Control de Cargas.");
  }
  if(data.loads.length>50000||data.operators.length>5000){
    throw Error("La copia supera el límite de auditoría segura.");
  }
  const codes=new Map(),hashes=new Map(),states=Object.create(null);
  let invalidCode=0,missingDate=0,unverified=0,incompleteTimes=0,missingHash=0,unknownRows=0;
  for(const row of data.loads){
    if(!row||typeof row!=="object"||Array.isArray(row)){unknownRows++;continue;}
    const code=clean(row.id),hash=clean(row.pdfHash).toLowerCase();
    const status=clean(row.status)||"Pendiente";
    states[status]=(states[status]||0)+1;
    if(!validCode(code))invalidCode++;
    if(code)codes.set(code,(codes.get(code)||0)+1);
    if(!clean(row.date))missingDate++;
    if(row.verified!==true)unverified++;
    if((row.started&&!validTime(row.started))||(row.finished&&!validTime(row.finished))
      ||(row.finished&&!row.started)||(row.started&&!row.finished))incompleteTimes++;
    if(!validHash(hash))missingHash++;
    else {
      const entries=hashes.get(hash)||new Set();
      if(code)entries.add(code);
      hashes.set(hash,entries);
    }
  }
  const duplicatedCodes=[...codes].filter(([,num])=>num>1).map(([code,num])=>({codigo:code,ocurrencias:num})).sort((a,b)=>a.codigo.localeCompare(b.codigo));
  const crossHashes=[...hashes].filter(([,ids])=>ids.size>1).map(([hash,ids])=>({
    hashCorto:hash.slice(0,12)+"…",codigos:[...ids].sort()
  }));
  return {
    format:data.format,version:clean(data.version),created:clean(data.created),
    total:data.loads.length,operarios:data.operators.length,
    estados:states,invalidCode,missingDate,unverified,incompleteTimes,missingHash,unknownRows,
    duplicatedCodes,crossHashes,
    advertenciaPdf:"La copia JSON no incluye los PDF originales: deben inventariarse por separado en IndexedDB de cada dispositivo."
  };
}
