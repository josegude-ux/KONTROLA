// Seleccion de hojas de PREPARA ALMACEN. Sin acceso a red, DOM ni base de datos.
// Contrato funcional: Control de Cargas v0.5.6 (commit 9ef4235bbf0b81d67eb681da2900cbd7cd08ad86).
const codigo = row => String(row?.codigo ?? "").trim();
const normalizar = value => String(value ?? "").normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-ES").trim();

export function filtrarFilasImpresion(rows, busqueda="") {
  const palabras=normalizar(busqueda).split(/\s+/).filter(Boolean);
  if(!palabras.length)return [...rows];
  return rows.filter(row=>{
    const texto=normalizar([row.codigo,row.ruta,row.repartidor,row.matricula].join(" "));
    return palabras.every(palabra=>texto.includes(palabra));
  });
}

export function seleccionarTodasImpresion(rows) {
  return new Set(rows.map(codigo).filter(Boolean));
}

export function marcarVisiblesImpresion(seleccion,visibles) {
  const resultado=new Set(seleccion);
  for(const row of visibles){const id=codigo(row);if(id)resultado.add(id);}
  return resultado;
}

export function conciliarSeleccionImpresion(seleccion,autorizadas) {
  const validos=new Set(autorizadas.map(codigo).filter(Boolean));
  return new Set([...seleccion].filter(id=>validos.has(id)));
}

// La seleccion reproduce v0.5.6: nunca se trunca silenciosamente.
// El limite actual del backend se aplica SOLO al preparar un lote.
export function evaluarLoteImpresion(seleccion,maximo=20) {
  const cantidad=seleccion.size;
  return {cantidad,puedePreparar:cantidad>0&&cantidad<=maximo,
    superaLimite:cantidad>maximo,limite:maximo};
}
