// Estados operativos paralelos: el picking real se registra en BC, no en VISURA.
// Estas funciones sirven SOLO para vistas; los permisos reales se validan en las RPC.
const AVAILABLE = new Set(["publicada","preparacion_en_curso","preparada","verificacion_en_curso","cerrada"]);

export function cargaVisibleParaVerificacion(load,userId){
  if(!load||!load.codigo||!userId||!AVAILABLE.has(load.estado))return false;
  // Si hay preparador registrado, debe ser distinto del verificador.
  if(load.preparador_id===userId)return false;
  // Una verificación ya iniciada pertenece exclusivamente a su verificador.
  if(load.verificador_id&&load.verificador_id!==userId)return false;
  // Las cerradas se muestran únicamente a su verificador, para consulta.
  return load.estado!=="cerrada"||load.verificador_id===userId;
}

export function estadoVerificacionVisible(load){
  if(load?.verificacion_fin)return "Verificación finalizada";
  if(load?.verificador_id)return "Continuar verificación";
  return "Verificación disponible";
}

export function estadoTrasVerificar(load){
  // Un registro de preparación abierto NO se termina desde la verificación.
  return load?.preparacion_inicio&&!load?.preparacion_fin?"preparacion_en_curso":"cerrada";
}

export function estadoTrasPreparar(load){
  // Si la verificación terminó antes, ahora ambos procesos han finalizado.
  if(load?.verificacion_fin)return "cerrada";
  if(load?.verificador_id)return "verificacion_en_curso";
  return "preparada";
}
