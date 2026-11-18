// Comparación sin escrituras de un backup legacy con el panel autorizado de KONTROLA.
// La RPC de panel NO expone SHA-256: nunca declarar PDFs idénticos ni aptos para migrar.
const clean=value=>String(value??"").trim();
const code=value=>clean(value).toUpperCase();
const normalize=value=>clean(value).replace(/\s+/g," ").toLocaleUpperCase("es-ES");
const isoDate=value=>{
  const s=clean(value);
  if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s;
  const m=s.match(/^(\d{2})\/(\d{2})\/(\d{2}|\d{4})$/);
  return m?(m[3].length===2?"20"+m[3]:m[3])+"-"+m[2]+"-"+m[1]:"";
};
const validCode=value=>/^LP\d{2}-\d{4,6}$/.test(code(value));
const weight=value=>{
  if(value==null||clean(value)==="")return null;
  const s=clean(value).replace(/\s/g,"").replace(",",".");
  const v=Number(s);
  return Number.isFinite(v)&&v>=0?v:null;
};
export function conciliarCargasLegacy(oldLoads=[],currentLoads=[]){
  if(!Array.isArray(oldLoads)||!Array.isArray(currentLoads))
    throw Error("Los listados de conciliación deben ser arrays.");
  if(oldLoads.length>50000||currentLoads.length>50000)
    throw Error("Los listados superan el máximo de conciliación segura.");
  const oldCodes=new Map();
  for(const old of oldLoads){
    const id=code(old?.id);
    if(validCode(id))oldCodes.set(id,(oldCodes.get(id)||0)+1);
  }
  const current=new Map();
  for(const row of currentLoads){
    const id=code(row?.codigo);
    if(!validCode(id))continue;
    if(!current.has(id))current.set(id,[]);
    current.get(id).push(row);
  }
  const seen=new Set(),items=[];
  for(const old of oldLoads){
    const id=code(old?.id);
    if(!validCode(id)){
      items.push({codigo:id||"(sin código)",tipo:"codigo_invalido",detalles:["Revisar manualmente el código de la copia"]});
      continue;
    }
    if(seen.has(id))continue;
    seen.add(id);
    if(oldCodes.get(id)>1){
      items.push({codigo:id,tipo:"duplicado_legacy",detalles:["La copia antigua contiene "+oldCodes.get(id)+" registros con este código"]});
      continue;
    }
    const options=current.get(id)||[];
    if(!options.length){
      items.push({codigo:id,tipo:"no_encontrada",detalles:["No está en el almacén consultado; puede existir en otra zona o no estar importada"]});
      continue;
    }
    if(options.length!==1){
      items.push({codigo:id,tipo:"duplicado_kontrola",detalles:["El panel devolvió varias filas con el mismo código"]});
      continue;
    }
    const row=options[0],changes=[];
    const fields=[
      ["Fecha",isoDate(old.date),isoDate(row.fecha)],
      ["Ruta",normalize(old.route),normalize(row.ruta)],
      ["Matrícula",normalize(old.plate),normalize(row.matricula)],
      ["Repartidor",normalize(old.driver),normalize(row.repartidor)]
    ];
    for(const [name,left,right] of fields){
      // No confundir metadatos ausentes con un cambio confirmado.
      if(left&&right&&left!==right)changes.push(name+": datos diferentes");
      else if(!left||!right)changes.push(name+": información incompleta para comparar");
    }
    const leftWeight=weight(old.weight),rightWeight=weight(row.peso_kg);
    if(leftWeight!=null&&rightWeight!=null&&Math.abs(leftWeight-rightWeight)>0.001)
      changes.push("Peso: datos diferentes");
    else if(leftWeight==null||rightWeight==null)
      changes.push("Peso: información incompleta para comparar");
    items.push({
      codigo:id,tipo:changes.length?"revisar":"coincidencia_metadatos",
      detalles:changes.length?changes:["Coinciden los datos disponibles; el PDF y los tiempos NO se han comparado"]
    });
  }
  const onlyCurrent=[...current.keys()].filter(id=>!seen.has(id));
  const byType=Object.create(null);
  for(const item of items)byType[item.tipo]=(byType[item.tipo]||0)+1;
  return {
    totalAntiguas:oldLoads.length,totalActuales:currentLoads.length,
    revisadas:items.length,porTipo:byType,soloEnKontrola:onlyCurrent,
    elementos:items,
    advertencia:"Comparación solo de los códigos y metadatos del almacén autorizado. No verifica igualdad de PDF, historial horario, existencias ni archivos IndexedDB. No importa ni sobrescribe registros."
  };
}
