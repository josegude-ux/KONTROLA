// Enriquecimiento local y de solo lectura de cabeceras de PDF de cargas antiguas.
// Nunca guarda, publica, sustituye ni modifica revisiones documentales.
const validDocumentPath=(code,path)=>
  /^LP\d{2}-\d{4,6}$/.test(String(code||""))&&
  new RegExp("^documentos/"+String(code)+"/[a-f0-9]{64}\\.pdf$","i").test(String(path||""));

const present=value=>value!==null&&value!==undefined&&String(value).trim()!=="";
const positive=value=>present(value)&&Number.isInteger(Number(value))&&Number(value)>0;

export function cargaHuecosPendientes(load){
  // En BC el campo "Huecos plts. camión" puede ser 0 aunque Camión indique 8G 4E.
  // Sin formatos positivos, un 0 obliga a releer el original antes de darlo por cierto.
  return !positive(load?.huecos_palets_grandes)&&!positive(load?.huecos_palets_pequenos)&&
    !positive(load?.huecos_palets_europeos)&&!positive(load?.huecos_palets_total)&&
    validDocumentPath(load?.codigo,load?.documento_ruta);
}
export function cabeceraSinMetadatos(load){
  return !present(load?.observaciones)&&
    !positive(load?.huecos_palets_pequenos)&&
    !positive(load?.huecos_palets_europeos)&&!positive(load?.huecos_palets_grandes)&&
    !positive(load?.huecos_palets_total);
}

export function cargasCabeceraPendiente(loads=[],search="",limit=5){
  const query=String(search||"").trim().toLocaleLowerCase("es-ES");
  const max=Math.max(0,Math.min(5,Number.isInteger(limit)?limit:5));
  if(!Array.isArray(loads)||!max)return [];
  return loads.filter(load=>
    cabeceraSinMetadatos(load)&&
    validDocumentPath(load.codigo,load.documento_ruta)&&
    [load.codigo,load.ruta,load.matricula,load.repartidor].some(value=>
      String(value||"").toLocaleLowerCase("es-ES").includes(query)
    )
  ).slice(0,max);
}

export function cabeceraLeida(load,parsed,warehouse){
  if(!load||!parsed||parsed.id!==load.codigo||parsed.warehouse!==warehouse||load.almacen!==warehouse){
    return null;
  }
  const numeric=value=>Number.isInteger(value)&&value>=0?value:null;
  const observations=typeof parsed.observations==="string"?parsed.observations.replace(/\s+/g," ").trim():null;
  return {
    observaciones:observations||null,
    huecos_palets_grandes:numeric(parsed.palletsLarge),
    huecos_palets_pequenos:numeric(parsed.palletsSmall),
    huecos_palets_europeos:numeric(parsed.palletsEuropean),
    huecos_palets_total:numeric(parsed.palletsTotal)
  };
}
