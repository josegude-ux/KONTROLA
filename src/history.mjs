// Historial de consulta. No altera el estado de las cargas ni llama a RPC de escritura.
const clean=value=>String(value??"").trim();
const isDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(clean(value));
const number=value=>value===null||value===undefined||value===""?0:Number(value);
const validNumber=value=>Number.isFinite(number(value))?number(value):0;

export function filtrarHistorial(rows=[],{fecha="",estado="",busqueda=""}={}){
  const query=clean(busqueda).toLocaleLowerCase("es-ES");
  const date=clean(fecha),status=clean(estado);
  return rows.filter(row=>{
    if(date&&(!isDate(row.fecha)||row.fecha!==date))return false;
    if(status&&row.estado!==status)return false;
    if(!query)return true;
    return [row.codigo,row.ruta,row.matricula,row.repartidor]
      .some(value=>clean(value).toLocaleLowerCase("es-ES").includes(query));
  }).sort((a,b)=>{
    const aDate=isDate(a.fecha)?a.fecha:"";
    const bDate=isDate(b.fecha)?b.fecha:"";
    return bDate.localeCompare(aDate)||validNumber(b.peso_kg)-validNumber(a.peso_kg)
      ||clean(a.codigo).localeCompare(clean(b.codigo),"es");
  });
}

export function resumenHistorial(rows=[]){
  return rows.reduce((total,row)=>{
    total.cargas++;
    total.pesoKg+=validNumber(row.peso_kg);
    total.referencias+=validNumber(row.referencias);
    total.incidencias+=validNumber(row.incidencias_pendientes);
    if(row.estado==="cerrada")total.cerradas++;
    return total;
  },{cargas:0,pesoKg:0,referencias:0,cerradas:0,incidencias:0});
}

export function formatoFechaCarga(fecha){
  if(!isDate(fecha))return "Sin fecha";
  const [year,month,day]=fecha.split("-");
  return `${day}/${month}/${year}`;
}
