// Decisiones de lectura para la importación de PDF. El servidor conserva la autoridad final.
export function revisarSustitucion(cargaActual,hashNuevo){
  if(!cargaActual)return {tipo:"nueva"};
  if(cargaActual.documento_hash===hashNuevo){
    return {tipo:"repetida",mensaje:"Este PDF coincide con la versión vigente de la carga."};
  }
  if(cargaActual.estado!=="publicada"){
    return {
      tipo:"bloqueada",
      mensaje:"La carga "+cargaActual.codigo+" ya no está pendiente de preparar (estado: "+
        (cargaActual.estado||"desconocido")+"). No se puede sustituir su documento."
    };
  }
  return {
    tipo:"confirmar",
    mensaje:"La carga "+cargaActual.codigo+" ya tiene publicada la revisión "+
      (Number(cargaActual.revision)||1)+
      " ("+(cargaActual.almacen||"almacén sin identificar")+").\n\n"+
      "El PDF seleccionado tiene contenido diferente. Si continúas, quedará pendiente de revisión "+
      "administrativa y solo podrá reemplazar el documento vigente ANTES de comenzar la preparación. "+
      "El original anterior seguirá guardado en el historial.\n\n"+
      "¿Quieres importar esta nueva versión para revisarla?"
  };
}
