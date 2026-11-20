// VISURA PREPARA · Adaptación segura de los listados auxiliares de PRUEBA_3.
// Solo lectura sobre las cargas YA autorizadas por la RPC de Administración.
import {destinoAcreditado} from "./visura-print-r7-core.mjs";
const fechaDe=row=>String(row?.fecha??"").slice(0,10);
const texto=s=>String(s??"").trim();
const pesoDe=row=>{
 const raw=row?.peso_kg;
 if(raw===null||raw===undefined||raw==="")return null;
 const n=typeof raw==="number"?raw:Number(raw);
 return Number.isFinite(n)&&n>=0?n:null;
};
const placaDe=row=>texto(row?.matricula);
const conductorDe=row=>texto(row?.repartidor).split(/[;,]/)[0].replace(/^\s*[A-Z]{1,3}\d{2,4}\s+/,"").trim();
const seguro=rows=>Array.isArray(rows)?rows.filter(row=>row&&typeof row==="object"&&texto(row.codigo)):[];
const ordenByDate=(a,b)=>a.fecha.localeCompare(b.fecha)||a.codigo.localeCompare(b.codigo,"es");
const fechaES=iso=>/^\d{4}-\d{2}-\d{2}$/.test(iso)?iso.slice(8)+"/"+iso.slice(5,7)+"/"+iso.slice(0,4):iso;

export function seleccionarCorunaAcreditada(rows){
 const valid=seguro(rows);
 const accepted=valid.filter(row=>destinoAcreditado(row)==="CORUÑA");
 const unknown=valid.filter(row=>!destinoAcreditado(row)).length;
 const ferrol=valid.filter(row=>destinoAcreditado(row)==="FERROL").length;
 return {accepted,unknown,ferrol};
}
function requireCoruna(rows){
 const d=seleccionarCorunaAcreditada(rows);
 if(!d.accepted.length)throw Error("No hay destinos CORUÑA acreditados en la consulta compartida. No se permite confundir COR_01_COR (origen) con destino de reparto.");
 return d;
}
const agruparFecha=rows=>{
 const m=new Map();
 for(const row of rows){const fecha=fechaDe(row)||"SIN FECHA";if(!m.has(fecha))m.set(fecha,[]);m.get(fecha).push(row)}
 return [...m.entries()].sort(([a],[b])=>a.localeCompare(b));
};

export function listaMatriculasR7(rows){
 const {accepted,unknown,ferrol}=requireCoruna(rows);
 const pages=agruparFecha(accepted).map(([fecha,loads])=>{
  const ordered=[...loads].sort((a,b)=>(pesoDe(b)??-Infinity)-(pesoDe(a)??-Infinity)||texto(a.codigo).localeCompare(texto(b.codigo),"es"));
  const filas=ordered.map(row=>({codigo:texto(row.codigo),matricula:placaDe(row)||"—",repartidor:conductorDe(row)||"—",peso:pesoDe(row)}));
  const pesoTotal=filas.reduce((sum,row)=>sum+(row.peso??0),0);
  return {tipo:"matriculas",titulo:"MATRÍCULAS POR PESO · CORUÑA",fecha:fechaES(fecha),filas,pesoTotal,
    nota:"Solo destinos CORUÑA acreditados. "+unknown+" sin destino y "+ferrol+" FERROL excluidos."};
 });
 return {pages,summary:pages.reduce((n,p)=>n+p.filas.length,0)+" cargas CORUÑA; "+unknown+" sin destino acreditado, "+ferrol+" FERROL omitidas."};
}

const conFrio=row=>Array.isArray(row.productos)&&row.productos.some(p=>String(p?.location??"").toUpperCase()==="ZFRIO"&&Number(p.qty)>0);
const excluido=row=>{
 // CRALM/CRVEN son códigos de camión; una matrícula convencional no basta.
 const truck=texto(row?.camion??row?.codigo_camion??row?.matricula).replace(/\s/g,"").toUpperCase();
 const driver=texto(row?.repartidor).toUpperCase();
 return truck.startsWith("CRALM")||truck.startsWith("CRVEN")||/^CC0(?:$|\b|\d)/.test(driver);
};
export function hojaRepartoR7(rows){
 const {accepted,unknown,ferrol}=requireCoruna(rows);
 const pages=agruparFecha(accepted).map(([fecha,loads])=>{
  const groups=new Map(),incidencias=[];
  for(const row of loads){
   if(excluido(row))continue;
   const name=conductorDe(row);
   if(!name){incidencias.push("LP "+texto(row.codigo)+": sin repartidor acreditado");continue}
   if(pesoDe(row)===null){incidencias.push("LP "+texto(row.codigo)+": peso no acreditado");continue}
   const key=name.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase();
   if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(row);
  }
  const filas=[];
  for(const [name,list] of groups){
   // Si un reparto tiene candidatas sin peso, la selección de mayor peso no es fiable.
   const matching=loads.filter(r=>conductorDe(r).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toUpperCase()===name&&!excluido(r));
   if(matching.some(r=>pesoDe(r)===null)){incidencias.push(name+": pesos no comparables");continue}
   const largest=[...list].sort((a,b)=>pesoDe(b)-pesoDe(a)||texto(a.codigo).localeCompare(texto(b.codigo),"es"))[0];
   if(!Array.isArray(largest.productos)){incidencias.push(name+": productos de frío no acreditados");continue}
   filas.push({codigo:texto(largest.codigo),matricula:placaDe(largest)||"—",repartidor:conductorDe(largest),frio:conFrio(largest),peso:pesoDe(largest)});
  }
  filas.sort((a,b)=>Number(b.frio)-Number(a.frio)||a.repartidor.localeCompare(b.repartidor,"es"));
  return {tipo:"reparto",titulo:"HOJA DE REPARTO · CORUÑA",fecha:fechaES(fecha),filas,incidencias,
    nota:"Solo destinos CORUÑA acreditados. "+unknown+" sin destino y "+ferrol+" FERROL excluidos."};
 });
 return {pages,summary:pages.reduce((n,p)=>n+p.filas.length,0)+" repartidores seleccionados; "+pages.reduce((n,p)=>n+p.incidencias.length,0)+" incidencias."};
}