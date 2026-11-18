// VISURA 15 · Control de Cargas / Jornada R1/L3 · Solo lectura de fechas acreditadas.
import {fechaAlmacen} from './business-date.mjs';
const ISO=/^\d{4}-(0[1-9]|1[0-2])-([0-2]\d|3[01])$/;
export function fechaAcreditada(value){
  const v=String(value??'').trim();
  if(!ISO.test(v))return null;
  const [y,m,d]=v.split('-').map(Number);
  const utc=new Date(Date.UTC(y,m-1,d));
  return utc.getUTCFullYear()===y&&utc.getUTCMonth()===m-1&&utc.getUTCDate()===d?v:null;
}
export function fechaCargaAcreditada(row){
  const dates=[row?.fecha,row?.fecha_carga].filter(x=>x!==null&&x!==undefined&&String(x).trim()!=='');
  if(!dates.length)return null;
  const parsed=dates.map(fechaAcreditada);
  return parsed.every(x=>x&&x===parsed[0])?parsed[0]:null;
}
export function fechaRecepcionAcreditada(row){return fechaAcreditada(row?.fecha_recepcion);}
export function fechaOperativa(instant=new Date()){return fechaAlmacen(instant);}
export function esVerificablePor(row,userId){
 return Boolean(userId&&row?.preparador_id&&row.preparador_id!==userId&&
  ['preparacion_en_curso','preparada','verificacion_en_curso','cerrada'].includes(row.estado)&&
  (!row.verificador_id||row.verificador_id===userId));
}
export function verificablesHoy(rows=[],{hoy=fechaOperativa(),almacen,userId}={}){
 if(!fechaAcreditada(hoy)||!almacen||!userId)return [];
 return rows.filter(r=>(!r.almacen||r.almacen===almacen)&&esVerificablePor(r,userId)&&fechaCargaAcreditada(r)===hoy);
}
export function sinFechaVerificables(rows=[],{almacen,userId}={}){
 return rows.filter(r=>(!r.almacen||r.almacen===almacen)&&esVerificablePor(r,userId)&&!fechaCargaAcreditada(r));
}
export function pendientesRecepcion(rows=[],{almacen}={}){
 if(!almacen)return [];
 return rows.filter(r=>(!r.almacen||r.almacen===almacen)&&
  (['preparada','verificacion_en_curso'].includes(r.estado)||
   (r.estado==='cerrada'&&Number(r.incidencias_pendientes)>0)));
}
export function resetJornada({instant=new Date()}={}){
 // Pure: no storage, ninguna mutación de filas ni estados.
 return {fecha:fechaOperativa(instant),busqueda:''};
}
