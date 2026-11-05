// Validaciones de lote antes de leer o subir documentos. No publica automáticamente.
export function validarLotePdf(files){
  const list=Array.from(files||[]);
  if(!list.length)throw Error("Selecciona al menos un archivo PDF.");
  if(list.length>20)throw Error("Para evitar sobrecargar el móvil, importa como máximo 20 PDF de una vez.");
  for(const file of list){
    if(!file||!/\.pdf$/i.test(String(file.name||""))
      ||file.type&&file.type!=="application/pdf")
      throw Error("Todos los archivos seleccionados deben ser PDF.");
    if(!Number.isFinite(file.size)||file.size<=0||file.size>25*1024*1024)
      throw Error("Cada PDF debe tener contenido y ocupar como máximo 25 MB.");
  }
  return list;
}
export function resumenLotePdf(outcomes=[]){
  const count=name=>outcomes.filter(item=>item.estado===name).length;
  const errors=outcomes.filter(item=>item.estado==="error");
  return {
    total:outcomes.length,nuevos:count("nuevo"),recuperados:count("recuperado"),
    repetidos:count("repetido"),cancelados:count("cancelado"),errores:errors.length,
    hayErrores:errors.length>0
  };
}
