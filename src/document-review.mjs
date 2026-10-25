const KNOWN_WAREHOUSES={
  COR_01_COR:{zone:"coruna",label:"A Coruña"},
  COR_02_NAR:{zone:"ferrol",label:"Ferrol"}
};
const clean=value=>String(value??"").trim();
const finding=(code,severity,message,line=null,context="")=>({
  id:[code,line??"document"].join(":"),code,severity,message,line,context
});

export function warehouseZone(raw){
  const code=clean(raw).toUpperCase()||null;
  const known=code&&KNOWN_WAREHOUSES[code];
  return known?{code,zone:known.zone,label:known.label,known:true}:{
    code,zone:"pending",label:"Pendiente de clasificar",known:false
  };
}

export function analyzeDocument(parsed={}){
  const findings=[];
  const warehouse=warehouseZone(parsed.warehouse);
  if(!warehouse.known)findings.push(finding(
    "unknown_warehouse","error","El almacén no es COR_01_COR ni COR_02_NAR.",null,warehouse.code||"No indicado"
  ));
  if(parsed.mixedWarehouse)findings.push(finding(
    "mixed_warehouse","error","El documento contiene varios almacenes; debe dividirse y reprocesarse.",null,
    (parsed.availableWarehouses||[]).join(", ")
  ));
  for(const [index,message] of (Array.isArray(parsed.warnings)?parsed.warnings:[]).entries()){
    findings.push(finding("parser_warning","warning","El motor requiere revisión manual del PDF.",index+1,clean(message)));
  }
  const products=Array.isArray(parsed.products)?parsed.products:[];
  if(!products.length)findings.push(finding("no_products","error","No se reconocieron líneas de mercancía."));
  products.forEach((product,index)=>{
    const line=index+1,qty=Number(product?.qty),sku=clean(product?.sku),unit=clean(product?.unit);
    if(!/^PRD\d{7}$/i.test(sku))findings.push(finding("unknown_reference","error","Referencia sin identificar.",line,sku));
    if(!clean(product?.location))findings.push(finding("missing_location","warning","La línea no tiene ubicación.",line,sku));
    if(!Number.isFinite(qty)||qty<0)findings.push(finding("invalid_quantity","error","Cantidad no interpretable.",line,clean(product?.qty)));
    if(Number.isFinite(qty)&&qty>0&&!unit)findings.push(finding("missing_unit","error","Unidad no interpretable.",line,sku));
    if(!clean(product?.description))findings.push(finding("incomplete_row","warning","La línea no tiene descripción.",line,sku));
    const context=clean(product?.sourceContext)||[sku,product?.description,product?.location,product?.unit].map(clean).join(" ");
    if(context.includes("?"))findings.push(finding("special_marker","warning","La línea contiene el marcador especial ?; revisar su contexto sin alterar cantidades automáticamente.",line,context));
  });
  if(parsed.refs!=null&&Number(parsed.refs)!==products.length)findings.push(finding(
    "reference_total_mismatch","error","El número de referencias no coincide con el total documental.",null,
    `${products.length}/${parsed.refs}`
  ));
  if(parsed.refs==null)findings.push(finding(
    "missing_reference_total","error","No se pudo contrastar el número total de referencias del PDF."
  ));
  if(parsed.declaredTotal!=null&&Math.abs(Number(parsed.declaredTotal)-Number(parsed.actualTotal))>0.000001)findings.push(finding(
    "quantity_total_mismatch","error","La suma extraída no coincide con el total documental.",null,
    `${parsed.actualTotal}/${parsed.declaredTotal}`
  ));
  if(parsed.declaredTotal==null)findings.push(finding(
    "missing_quantity_total","error","No se pudo contrastar la cantidad total del PDF."
  ));
  if(parsed.verified===false)findings.push(finding(
    "unverified_document","warning","El documento requiere confirmación administrativa."
  ));
  return findings;
}

export function applyLineCorrection(parsed,lineNumber,changes,userId,at=new Date().toISOString()){
  const products=(parsed.products||[]).map(product=>({...product,pdfOriginal:product.pdfOriginal?{...product.pdfOriginal}:undefined}));
  const index=Number(lineNumber)-1;
  if(!products[index])throw Error("Línea de documento inexistente.");
  const allowed=new Set(["sku","description","location","qty","unit"]);
  const corrections=[...(parsed.corrections||[])];
  const product=products[index];
  if(!product.pdfOriginal)product.pdfOriginal={
    sku:product.sku??"",description:product.description??"",location:product.location??"",
    qty:product.qty,unit:product.unit??""
  };
  for(const [field,value] of Object.entries(changes||{})){
    if(!allowed.has(field))throw Error("Campo de corrección no permitido.");
    const next=field==="qty"?Number(value):clean(value);
    if(field==="qty"&&(!Number.isFinite(next)||next<0))throw Error("Cantidad corregida inválida.");
    if(Object.is(product[field],next))continue;
    corrections.push({line:Number(lineNumber),field,before:product[field]??"",after:next,by:userId,at});
    product[field]=next;
  }
  products[index]=product;
  const actualTotal=products.reduce((sum,item)=>sum+Number(item.qty||0),0);
  return {...parsed,products,actualTotal,verified:false,corrections};
}

export function publicationReadiness(findings=[],acknowledgedIds=[]){
  const acknowledged=new Set(acknowledgedIds);
  const errors=findings.filter(item=>item.severity==="error");
  const pendingWarnings=findings.filter(item=>item.severity==="warning"&&!acknowledged.has(item.id));
  return {ready:errors.length===0&&pendingWarnings.length===0,errors,pendingWarnings};
}
