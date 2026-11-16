// VISURA PREPARA · Control de Cargas — contrato local de revisión.
// La fuente de mercancía es PRUEBA_3; jamás se escriben sus registros de preparación.
export const PREPARATION_KEY_PREFIX="control_cargas_prueba_integrada_2";
export const REVIEW_KEY_PREFIX="visura_control_revision_v1";
export const loadKey=scope=>PREPARATION_KEY_PREFIX+scope;
export const reviewKey=scope=>REVIEW_KEY_PREFIX+scope;
export function validScope(scope){return /^_visura_[a-f0-9]{24}$/.test(scope);}
export function readLoads(storage,scope){
 if(!validScope(scope))throw Error("Ámbito de usuario no válido");
 const raw=JSON.parse(storage.getItem(loadKey(scope))||"[]");
 if(!Array.isArray(raw))throw Error("Datos de preparación no válidos");
 return raw.filter(r=>r&&typeof r.id==="string"&&Array.isArray(r.products));
}
export function snapshot(load){
 if(!load||!Array.isArray(load.products)||!load.id)throw Error("Carga no válida");
 return {id:load.id,pdfHash:load.pdfHash||null,updatedAt:load.updatedAt||null,
  products:load.products.map((p,i)=>({line:i,sku:String(p.sku||""),location:String(p.location||""),description:String(p.description||""),qty:Number(p.qty),unit:String(p.unit||"")}))};
}
export function sourceSignature(load){return JSON.stringify(snapshot(load));}
export function verificationAllowed(load){
 return load?.verified===true&&Array.isArray(load.products)&&load.products.length>0&&
  load.products.every(p=>p.sku&&Number.isFinite(Number(p.qty))&&Number(p.qty)>=0&&p.unit);
}
export function newReview(load,now=new Date().toISOString()){
 return {schema:1,loadId:load.id,sourceSignature:sourceSignature(load),createdAt:now,updatedAt:now,closedAt:null,lines:{}};
}
export function readReviews(storage,scope){
 if(!validScope(scope))throw Error("Ámbito de usuario no válido");
 const data=JSON.parse(storage.getItem(reviewKey(scope))||"{}");
 if(!data||typeof data!=="object"||Array.isArray(data))throw Error("Revisiones no válidas");
 return data;
}
export function getReview(storage,scope,load){
 const data=readReviews(storage,scope),review=data[load.id];
 if(!review)return {review:newReview(load),stale:false};
 return {review,stale:review.sourceSignature!==sourceSignature(load)};
}
export function markLine(review,load,line,status,actualQty=null,note="",now=new Date().toISOString()){
 if(review.closedAt)throw Error("La revisión está cerrada");
 if(review.sourceSignature!==sourceSignature(load))throw Error("La hoja cambió: revisión bloqueada");
 if(!verificationAllowed(load))throw Error("La extracción de la hoja no está verificada");
 if(!Number.isInteger(line)||line<0||line>=load.products.length)throw Error("Línea inexistente");
 if(!["pending","ok","incident"].includes(status))throw Error("Estado inválido");
 const item=load.products[line];
 if(status==="incident"&&(!Number.isFinite(actualQty)||actualQty<0||actualQty===Number(item.qty)))throw Error("La incidencia requiere una cantidad distinta y válida");
 const lines={...review.lines};
 if(status==="pending")delete lines[line];
 else lines[line]={status,actualQty:status==="incident"?actualQty:null,note:status==="incident"?String(note).slice(0,1000):"",at:now};
 return {...review,lines,updatedAt:now};
}
export function reviewSummary(review,load){
 const values=load.products.map((_,i)=>review.lines[i]?.status||"pending");
 return {total:values.length,checked:values.filter(x=>x!=="pending").length,pending:values.filter(x=>x==="pending").length,incidents:values.filter(x=>x==="incident").length};
}
export function closeReview(review,load,{acceptIncidents=false}={},now=new Date().toISOString()){
 if(review.sourceSignature!==sourceSignature(load)||!verificationAllowed(load))throw Error("Hoja no verificable o modificada");
 const sum=reviewSummary(review,load);
 if(sum.pending)throw Error("Quedan líneas pendientes");
 if(sum.incidents&&!acceptIncidents)throw Error("Las incidencias requieren aceptación expresa");
 return {...review,closedAt:now,incidentsAccepted:sum.incidents>0,updatedAt:now};
}
export function saveReview(storage,scope,review){
 if(!validScope(scope))throw Error("Ámbito de usuario no válido");
 const data=readReviews(storage,scope);
 data[review.loadId]=review;
 storage.setItem(reviewKey(scope),JSON.stringify(data));
 return review;
}
