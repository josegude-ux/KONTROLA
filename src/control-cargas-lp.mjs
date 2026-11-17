// VISURA PREPARA · identidad LP única para descarte, restauración e importación.
// No convierte otros códigos empresariales ni infiere años o almacenes.
const LP_INPUT=/^LP([0-9]{2})-?([0-9]{4,6})$/;
export function normalizarLP(value){
 const raw=typeof value==="string"?value:value?.id??value?.codigo;
 if(typeof raw!=="string")throw Error("LP ausente o inválido");
 const compact=raw.toUpperCase().replace(/[ \t\r\n]+/g,"");
 const match=LP_INPUT.exec(compact);
 if(!match)throw Error("Formato LP desconocido: no se normaliza sin validación");
 // Solo eliminar ceros excedentes; mantener al menos cuatro cifras.
 const numero=match[2].replace(/^0+(?=[0-9])/,"").padStart(4,"0");
 return "LP"+match[1]+"-"+numero;
}
export function formatoLP(value){
 const raw=typeof value==="string"?value:value?.id??value?.codigo;
 if(typeof raw!=="string")return "desconocido";
 if(/^LP[0-9]{2}-[0-9]{4}$/.test(raw))return "LPyy-4";
 if(/^LP[0-9]{2}-[0-9]{5}$/.test(raw))return "LPyy-5";
 if(/^LP[0-9]{2}-[0-9]{6}$/.test(raw))return "LPyy-6";
 try{normalizarLP(raw);return "variante-convertible";}catch{return "desconocido";}
}
export function auditarLP(cargas){
 if(!Array.isArray(cargas))throw Error("Se necesita una lista de LP");
 const agrupados=new Map(),formatos={},desconocidos=[];
 for(const carga of cargas){
  const original=typeof carga==="string"?carga:carga?.id??carga?.codigo;
  const formato=formatoLP(original);formatos[formato]=(formatos[formato]||0)+1;
  try{
   const key=normalizarLP(original),items=agrupados.get(key)||[];
   items.push(original);agrupados.set(key,items);
  }catch{desconocidos.push(original);}
 }
 const colisiones=[...agrupados.entries()]
  .filter(([,items])=>items.length>1)
  .map(([canonico,originales])=>({canonico,originales}));
 return {total:cargas.length,formatos,desconocidos,colisiones,
  canonicos:agrupados.size,apto:desconocidos.length===0&&colisiones.length===0};
}
