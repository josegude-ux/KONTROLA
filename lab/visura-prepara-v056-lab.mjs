// Laboratorio SOLO LOCAL: PDF.js empaquetado en vendor; sin Supabase y sin red.
import {parseDocumentPages,summarize} from "../src/core.mjs";
import {planificarRecortesMercancia,validarParidadDocumento} from "../src/mercancia-v056.mjs";
import {filtrarFilasImpresion,seleccionarTodasImpresion,marcarVisiblesImpresion,conciliarSeleccionImpresion} from "../src/batch-selection-v056.mjs";
const $=id=>document.getElementById(id);
let rows=[],selected=new Set(),generation=0,objectUrls=[];
let pdfModulePromise;
function pdfEngine(){return pdfModulePromise??=import("../vendor/pdf.min.mjs").then(m=>{
  m.GlobalWorkerOptions.workerSrc=new URL("../vendor/pdf.worker.min.mjs",import.meta.url).href;return m;
}).catch(e=>{pdfModulePromise=null;throw e;});}
const clean=()=>{generation++;for(const url of objectUrls)URL.revokeObjectURL(url);objectUrls=[];$("sheets").replaceChildren();$("preview").hidden=true;$("preview").classList.remove("show");};
function status(message,error=false){$("status").textContent=message;$("status").className=error?"error":"";}
const num=x=>Number(x||0).toLocaleString("es-ES",{maximumFractionDigits:2});
function refresh(){
  const warehouse=$("warehouse").value;
  rows=rows.filter(x=>x.warehouse===warehouse);
  selected=conciliarSeleccionImpresion(selected,rows.map(x=>({codigo:x.id})));
  const visible=filtrarFilasImpresion(rows.map(x=>({codigo:x.id,ruta:x.parsed?.route,repartidor:x.parsed?.driver,matricula:x.parsed?.plate})),
    $("search").value).map(x=>x.codigo);
  const filtered=rows.filter(x=>visible.includes(x.id));
  $("total").textContent=rows.length;
  $("refs").textContent=rows.reduce((n,x)=>n+(x.parsed?.refs||0),0)+" referencias";
  $("weight").textContent=num(rows.reduce((n,x)=>n+(x.parsed?.weight||0),0))+" kg";
  $("selectedCount").textContent=selected.size+" seleccionadas";
  $("loads").replaceChildren();
  for(const row of filtered){
    const label=document.createElement("label");label.className="load";
    const checkbox=document.createElement("input");checkbox.type="checkbox";checkbox.checked=selected.has(row.id);
    checkbox.setAttribute("aria-label","Seleccionar carga "+row.id);
    checkbox.addEventListener("change",()=>{checkbox.checked?selected.add(row.id):selected.delete(row.id);clean();refresh();});
    const details=document.createElement("div"),b=document.createElement("b"),small=document.createElement("small");
    b.textContent=row.id;small.textContent=row.file
      ?[(row.parsed?.driver||"Sin repartidor"),row.parsed?.refs+" referencias",num(row.parsed?.weight)+" kg"].join(" · ")
      :"Ejemplo ficticio · sin PDF · no imprimible";
    details.append(b,small);label.append(checkbox,details);$("loads").append(label);
  }
  const chosen=rows.filter(x=>selected.has(x.id));
  $("prepare").disabled=!chosen.length||chosen.length>10||chosen.some(x=>!x.file);
}
function setRows(items){rows=items;selected.clear();clean();refresh();}
function newElement(tag,text,cls){const el=document.createElement(tag);if(text!==undefined)el.textContent=String(text);if(cls)el.className=cls;return el;}
async function parsePdf(file,warehouse){
  if(file.size>15*1024*1024)throw Error("PDF superior a 15 MB");
  if(!/\.pdf$/i.test(file.name))throw Error("No es un PDF");
  const engine=await pdfEngine();
  const task=engine.getDocument({data:new Uint8Array(await file.arrayBuffer())});
  const document=await task.promise;
  try{
    if(document.numPages>24)throw Error("El PDF supera 24 paginas");
    const pages=[];
    for(let i=1;i<=document.numPages;i++){
      const page=await document.getPage(i),content=await page.getTextContent();
      const vp=page.getViewport({scale:1});
      pages.push({number:i,width:vp.width,height:vp.height,items:content.items.filter(x=>typeof x.str==="string")
        .map(x=>({text:x.str,x:x.transform?.[4]??0,y:vp.height-(x.transform?.[5]??0)}))});
    }
    const parsed=parseDocumentPages(pages.map(({number,width,items})=>({number,width,items})),file.name,{warehouse});
    validarParidadDocumento(parsed,{codigo:parsed.id,warehouse});
    const plan=planificarRecortesMercancia(pages,{warehouse});
    return {id:parsed.id,warehouse,parsed,plan,file};
  }finally{await task.destroy();}
}
$("pdfs").addEventListener("change",async event=>{
  const files=[...event.target.files||[]];event.target.value="";
  if(!files.length)return;
  if(files.length>10)return status("Importa como máximo diez PDF en el ensayo.",true);
  const warehouse=$("warehouse").value,seq=++generation;let ok=0,errors=[];
  status("Analizando "+files.length+" PDF sin transferirlos al servidor...");
  for(const file of files){
    try{
      const row=await parsePdf(file,warehouse);
      if(seq!==generation)return;
      rows=rows.filter(x=>x.id!==row.id);rows.push(row);ok++;
    }catch(error){errors.push(file.name+": "+error.message);}
  }
  if(seq!==generation)return;
  rows.sort((a,b)=>(b.parsed?.weight||0)-(a.parsed?.weight||0));
  clean();refresh();
  status(ok+" PDF verificados y preparados para el ensayo."+(errors.length?"\nRechazados:\n"+errors.join("\n"):""),errors.length>0);
});
$("warehouse").addEventListener("change",()=>{setRows([]);status("Cambio de almacén. Vuelve a importar los PDF correspondientes.");$("pdfs").value="";});
$("demo").addEventListener("click",()=>{const w=$("warehouse").value;setRows(["A","B","C"].map(x=>({id:"DEMO-"+x,warehouse:w,parsed:{route:x,driver:"Operario ficticio "+x,refs:0,weight:0},file:null})));status("A/B/C cargadas. Prueba las selecciones y los filtros. No son documentos imprimibles.");});
$("clear").addEventListener("click",()=>{setRows([]);status("Ensayo vaciado sin modificar ningún servidor.");});
$("search").addEventListener("input",()=>refresh());
$("selectAll").addEventListener("click",()=>{selected=seleccionarTodasImpresion(rows.map(x=>({codigo:x.id})));clean();refresh();});
$("markVisible").addEventListener("click",()=>{
  const visible=filtrarFilasImpresion(rows.map(x=>({codigo:x.id,ruta:x.parsed?.route,repartidor:x.parsed?.driver,matricula:x.parsed?.plate})),$("search").value);
  selected=marcarVisiblesImpresion(selected,visible);clean();refresh();
});
$("unselect").addEventListener("click",()=>{selected.clear();clean();refresh();});
$("closePreview").addEventListener("click",clean);
async function renderOriginal(row,segment,container,engine){
  const task=engine.getDocument({data:new Uint8Array(await row.file.arrayBuffer())});
  try{
    const pdf=await task.promise;
    const page=await pdf.getPage(segment.pageNumber);
    const vp=page.getViewport({scale:1.25});
    const canvas=document.createElement("canvas");
    canvas.width=Math.ceil(vp.width);canvas.height=Math.ceil(vp.height);
    await page.render({canvasContext:canvas.getContext("2d",{alpha:false}),viewport:vp}).promise;
    const crop=document.createElement("canvas");
    crop.width=canvas.width;crop.height=Math.max(1,Math.min(canvas.height,Math.ceil(segment.bottom*1.25)));
    const context=crop.getContext("2d",{alpha:false});context.fillStyle="white";
    context.fillRect(0,0,crop.width,crop.height);context.drawImage(canvas,0,0);
    const blob=await new Promise((resolve,reject)=>crop.toBlob(x=>x?resolve(x):reject(Error("Falló el recorte")),"image/png"));
    const url=URL.createObjectURL(blob);objectUrls.push(url);
    const img=document.createElement("img");img.alt="MERCANCÍA original, "+row.id+", página "+segment.pageNumber;
    container.append(img);
    await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error("No se pudo mostrar el recorte"));img.src=url;});
    canvas.width=canvas.height=crop.width=crop.height=0;
  }finally{await task.destroy();}
}
function createSummary(row){
  const article=newElement("article",undefined,"lab-sheet"),heading=newElement("h2","RESUMEN A4 DE MERCANCÍA · "+row.id);
  article.append(heading);
  const meta=newElement("p",[
    "Almacén: "+row.warehouse,"Peso: "+num(row.parsed.weight)+" kg",
    "Referencias: "+row.parsed.refs,"Repartidor: "+(row.parsed.driver||"—"),
    "Matrícula: "+(row.parsed.plate||"—")].join(" · "));article.append(meta);
  const summary=summarize(row.parsed.products);
  const table=newElement("table"),thead=newElement("thead"),tr=newElement("tr");
  for(const col of ["Pasillo","Formato","Cantidad"]){tr.append(newElement("th",col));}
  thead.append(tr);table.append(thead);const tbody=newElement("tbody");
  for(const [aisle,units] of Object.entries(summary.aisles).sort(([a],[b])=>a.localeCompare(b))){
    for(const [unit,qty] of Object.entries(units).sort(([a],[b])=>a.localeCompare(b))){
      const line=newElement("tr");
      for(const cell of [aisle,unit,num(qty)])line.append(newElement("td",cell));
      tbody.append(line);
    }
  }
  table.append(tbody);article.append(table);
  const formats=Object.entries(summary.units).sort(([a],[b])=>a.localeCompare(b)).map(([u,q])=>num(q)+" "+u).join(" · ");
  article.append(newElement("p","Totales por formato: "+(formats||"Sin datos")));
  if(summary.unlocated.length)article.append(newElement("p","SIN UBICACIÓN: "+summary.unlocated.map(x=>x.sku).join(", ")));
  article.append(newElement("small","Suma de cantidades de formatos heterogéneos NO equivale al total de bultos. Documento de ensayo, no usar en operaciones reales."));
  return article;
}
$("prepare").addEventListener("click",async()=>{
  const chosen=rows.filter(x=>selected.has(x.id));
  if(!chosen.length||chosen.length>10||chosen.some(x=>!x.file))return;
  clean();const seq=++generation;
  $("prepare").disabled=true;status("Preparando MERCANCÍA original + resumen; no se enviarán datos a ningún servidor.");
  const engine=await pdfEngine();
  try{
    for(const row of chosen){
      if(seq!==generation)return;
      for(const segment of row.plan.pages){
        const sheet=newElement("section",undefined,"lab-sheet");
        sheet.append(newElement("h2","MERCANCÍA ORIGINAL · "+row.id));
        $("sheets").append(sheet);
        await renderOriginal(row,segment,sheet,engine);
      }
      $("sheets").append(createSummary(row));
    }
    if(seq!==generation)return;
    $("preview").hidden=false;$("preview").classList.add("show");
    $("preview").scrollIntoView({behavior:"smooth"});
    status("Vista previa generada: "+chosen.length+" carga(s). Comprueba recortes y resúmenes antes de imprimir o guardar PDF.");
  }catch(error){
    clean();status("Impresión cancelada por seguridad: "+error.message,true);
  }finally{refresh();}
});
$("print").addEventListener("click",()=>{if(!$("preview").hidden&&$("sheets").childElementCount)window.print();});
refresh();
