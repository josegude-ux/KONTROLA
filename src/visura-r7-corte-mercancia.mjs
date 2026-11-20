// VISURA-215 LAB · Port del recorte PRUEBA_3 R7.
import {dibujarHojaFrioCorunaR7} from "./visura-r7-frio-coruna.mjs";
// Utiliza PDF.js local empaquetado: sin CDN, sin OCR, sin alterar el PDF BC.
const normalizar=value=>String(value??"").toUpperCase().normalize("NFD")
  .replace(/[\u0300-\u036f]/g,"").replace(/[^A-Z0-9]/g,"");

export function seleccionarCorteMercancia(lineas,alto){
  if(!Array.isArray(lineas)||!Number.isFinite(alto)||alto<=0)throw Error("Geometría PDF inválida.");
  const ordered=[...lineas].filter(line=>Number.isFinite(line?.top))
    .map(line=>({...line,text:normalizar(line.text)})).sort((a,b)=>a.top-b.top);
  const boundary=ordered.find(line=>/^(?:CONTROLENVASES|PALETS(?:DE)?|CONFORMIDADCARGA)/.test(line.text));
  if(boundary)return {tipo:"seccion",bottom:boundary.top-4};
  // «Total referencias» de la cabecera NO es un corte válido.
  const first=ordered.find(line=>line.text.startsWith("PRD")||/^\w*PRD\w*$/.test(line.text));
  const totals=ordered.filter(line=>line.text.includes("TOTALREFERENCIASPROD")||line.text.startsWith("TOTALREFERENCIAS"));
  const total=first?totals.filter(line=>line.top>first.top+3).at(-1):null;
  return total?{tipo:"total",bottom:total.top+17}:null;
}

export function validarPaginasCor1(numeros,total){
  if(!Array.isArray(numeros)||!numeros.length||numeros.length>30||
    !Number.isSafeInteger(total)||total<1||numeros.some(n=>!Number.isSafeInteger(n)||n<1||n>total)||
    new Set(numeros).size!==numeros.length||
    numeros.some((n,i)=>i>0&&n<=numeros[i-1]))throw Error("Páginas originales COR1 no acreditadas.");
  return numeros;
}

function lineasDePagina(items,height){
  const groups=new Map();
  for(const item of items){
    if(typeof item.str!=="string"||!Array.isArray(item.transform))continue;
    const y=Math.round(item.transform[5]/3)*3;
    if(!groups.has(y))groups.set(y,[]);
    groups.get(y).push(item);
  }
  return [...groups.values()].map(row=>{
    row.sort((a,b)=>a.transform[4]-b.transform[4]);
    return {text:row.map(x=>x.str).join(" "),top:height-Math.max(...row.map(x=>x.transform[5]))};
  });
}

export async function recortarMercanciaCor1(file,numeros,{pdfjs=null}={}){
  if(!file||typeof file.arrayBuffer!=="function"||file.size>26214400)
    throw Error("PDF original inválido o superior al límite permitido.");
  const engine=pdfjs||await import("../vendor/pdf.min.mjs");
  if(!pdfjs)engine.GlobalWorkerOptions.workerSrc=new URL("../vendor/pdf.worker.min.mjs",import.meta.url).href;
  const task=engine.getDocument({data:new Uint8Array(await file.arrayBuffer())});
  const pdf=await task.promise;
  const pages=[];
  try{
    validarPaginasCor1(numeros,pdf.numPages);
    let boundaryFound=false,warehouseSeen=false;
    for(let index=0;index<numeros.length;index++){
      const pageNumber=numeros[index],page=await pdf.getPage(pageNumber);
      const content=await page.getTextContent();
      const text=content.items.map(x=>x.str||"").join(" ");
      const matches=[...text.matchAll(/Almac[eé]n\s*:\s*(COR[\s_-]*0?\d{1,2}[\s_-]*[A-Z]{2,})/gi)]
        .map(m=>m[1].toUpperCase().replace(/[\s-]+/g,"_").replace(/^COR_1_/,"COR_01_").replace(/^COR_2_/,"COR_02_"));
      if(matches.some(x=>x!=="COR_01_COR"))throw Error("Una página contiene otro almacén: no se imprimirá.");
      if(matches.includes("COR_01_COR"))warehouseSeen=true;
      if(index===0&&!warehouseSeen)throw Error("No se ha acreditado COR1 en la primera página.");
      const viewport=page.getViewport({scale:1});
      if(Math.abs(viewport.rotation)%360!==0)throw Error("PDF rotado: revisar antes de recortar.");
      const cut=seleccionarCorteMercancia(lineasDePagina(content.items,viewport.height),viewport.height);
      if(cut&&(cut.bottom<80||cut.bottom>viewport.height))
        throw Error("Corte de mercancía fuera de la página.");
      if(cut&&index!==numeros.length-1)throw Error("Se detectó fin de mercancía antes de la última página COR1.");
      if(!cut&&index===numeros.length-1)throw Error("No se ha localizado el final de MERCANCÍA. No se incluirán envases.");
      const scale=1.5,view=page.getViewport({scale});
      const width=Math.ceil(view.width),height=Math.ceil(view.height);
      if(width*height>11000000)throw Error("Página demasiado grande para recortar de forma segura.");
      const canvas=document.createElement("canvas");
      canvas.width=width;canvas.height=height;
      const context=canvas.getContext("2d",{alpha:false});
      if(!context)throw Error("Canvas no disponible.");
      await page.render({canvasContext:context,viewport:view}).promise;
      const crop=document.createElement("canvas");
      crop.width=width;crop.height=Math.min(height,Math.max(1,Math.ceil((cut?.bottom??viewport.height)*scale)));
      const ctx=crop.getContext("2d",{alpha:false});
      if(!ctx)throw Error("Canvas no disponible.");
      ctx.fillStyle="#fff";ctx.fillRect(0,0,crop.width,crop.height);
      ctx.drawImage(canvas,0,0,crop.width,crop.height,0,0,crop.width,crop.height);
      const blob=await new Promise((resolve,reject)=>crop.toBlob(b=>b?resolve(b):reject(Error("Error al recortar imagen PDF.")),"image/png"));
      pages.push({pageNumber,width:crop.width,height:crop.height,png:new Uint8Array(await blob.arrayBuffer())});
      canvas.width=canvas.height=crop.width=crop.height=0;
      if(cut)boundaryFound=true;
    }
    if(!boundaryFound||!pages.length)throw Error("Mercancía sin corte verificado.");
    return pages;
  }finally{await task.destroy();}
}

// Documento independiente de revisión. No marca «listado generado» ni modifica Supabase.
export async function crearVistaOriginalCor1R7({paginas,detalle,codigo,hojaFrio=null}){
  if(!Array.isArray(paginas)||!paginas.length||paginas.length>30||
    !/^LP\d{2}-\d{4,6}$/.test(String(codigo||"")))throw Error("Original no acreditado.");
  const {PDFDocument,StandardFonts,rgb}=await import("../vendor/pdf-lib.min.mjs");
  const doc=await PDFDocument.create(),font=await doc.embedFont(StandardFonts.HelveticaBold);
  const W=595.28,H=841.89,margin=26;
  for(const image of paginas){
    const png=await doc.embedPng(image.png);
    const scale=Math.min((W-2*margin)/png.width,(H-110)/png.height);
    const width=png.width*scale,height=png.height*scale;
    const page=doc.addPage([W,H]);
    page.drawText("VISURA PREPARA · ORIGINAL BC COR1 · VISTA LAB",{x:margin,y:H-29,size:10,font,color:rgb(.06,.16,.28)});
    page.drawText(String(codigo),{x:W-130,y:H-29,size:10,font,color:rgb(.06,.16,.28)});
    page.drawImage(png,{x:(W-width)/2,y:H-45-height,width,height});
    page.drawText("Corte validado antes de CONTROL ENVASES / fin de mercancía.",{x:margin,y:24,size:8,font,color:rgb(.35,.40,.45)});
  }
  if(detalle?.length){
    const extra=await PDFDocument.load(detalle);
    const copies=await doc.copyPages(extra,extra.getPageIndices());
    for(const page of copies)doc.addPage(page);
  }
  // La hoja individual FRÍO CORUÑA sigue a la LP correspondiente.
  // El reverso en blanco se agrega DESPUÉS de toda la documentación de la LP.
  if(hojaFrio)await dibujarHojaFrioCorunaR7(doc,hojaFrio,{StandardFonts,rgb});
  if(doc.getPageCount()%2)doc.addPage([W,H]);
  return doc.save();
}
