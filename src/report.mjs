const escapeHtml=value=>String(value??"").replace(/[&<>"']/g,char=>({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
}[char]));
const fold=value=>String(value??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("es-ES");
const number=value=>Number(value).toLocaleString("es-ES",{maximumFractionDigits:3});

export function filterProducts(products=[],query=""){
  const needle=fold(query).trim();
  if(!needle)return [...products];
  return products.filter(product=>[product.sku,product.location,product.description,product.unit].some(value=>fold(value).includes(needle)));
}

export function buildPreparationReport(load){
  const products=load.productos||load.products||[];
  const warehouse=load.almacen||load.warehouse||"PENDIENTE DE CLASIFICAR";
  const weight=load.peso_kg??load.weight??null;
  const grouped=new Map();
  for(const product of products){
    if(Number(product.qty)<=0)continue;
    const location=String(product.location||"").toUpperCase();
    const aisle=location==="ZFRIO"?"FRÍO":location?location[0]:"SIN UBICACIÓN";
    if(!grouped.has(aisle))grouped.set(aisle,[]);
    grouped.get(aisle).push(product);
  }
  const sections=[...grouped.entries()].map(([aisle,lines])=>`
    <section class="report-aisle">
      <h2>Pasillo ${escapeHtml(aisle)}</h2>
      <table><thead><tr><th>Ubicación</th><th>Referencia</th><th>Descripción</th><th>Cantidad</th><th>Unidad</th></tr></thead>
      <tbody>${lines.map(product=>`<tr><td>${escapeHtml(product.location||"SIN UBICACIÓN")}</td><td>${escapeHtml(product.sku)}</td><td>${escapeHtml(product.description)}</td><td class="number">${number(product.qty)}</td><td>${escapeHtml(product.unit)}</td></tr>`).join("")}</tbody></table>
    </section>`).join("");
  return `<article class="preparation-report">
    <header><h1>HOJA DE PREPARACIÓN POR PASILLOS</h1><p>KONTROLA · Exclusivamente mercancía procesada</p></header>
    <dl>
      <div><dt>Carga</dt><dd>${escapeHtml(load.codigo||load.id)}</dd></div>
      <div><dt>Almacén</dt><dd>${escapeHtml(warehouse)}</dd></div>
      <div><dt>Fecha</dt><dd>${escapeHtml(load.fecha||load.date||"—")}</dd></div>
      <div><dt>Matrícula</dt><dd>${escapeHtml(load.matricula||load.plate||"—")}</dd></div>
      <div><dt>Ruta</dt><dd>${escapeHtml(load.ruta||load.route||"—")}</dd></div>
      <div><dt>Repartidor</dt><dd>${escapeHtml(load.repartidor||load.driver||"—")}</dd></div>
      <div><dt>Peso</dt><dd>${weight===null?"—":number(weight)+" kg"}</dd></div>
      <div><dt>Referencias</dt><dd>${escapeHtml(load.referencias??load.refs??products.length)}</dd></div>
    </dl>
    ${sections||"<p>Sin líneas de mercancía.</p>"}
    <footer>Generado por KONTROLA. El picking se registra en Business Central.</footer>
  </article>`;
}
