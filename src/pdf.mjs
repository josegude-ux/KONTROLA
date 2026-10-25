import {parseDocumentPages} from "./core.mjs";

let pdfjsPromise;
async function pdfEngine(){
  if(!pdfjsPromise)pdfjsPromise=import("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.min.mjs").then(module=>{
    module.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs";
    return module;
  }).catch(error=>{pdfjsPromise=null;throw error;});
  return pdfjsPromise;
}

export async function parsePdfFile(file,options={}){
  const engine=await pdfEngine();
  const pdf=await engine.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
  const pages=[];
  try{
    for(let number=1;number<=pdf.numPages;number++){
      const page=await pdf.getPage(number);
      const content=await page.getTextContent();
      const viewport=page.getViewport({scale:1});
      const items=content.items.filter(item=>typeof item.str==="string").map(item=>({
        text:item.str,x:item.transform?.[4]??0,y:viewport.height-(item.transform?.[5]??0)
      }));
      pages.push({number,width:viewport.width,items});
    }
    return parseDocumentPages(pages,file.name,options);
  }finally{
    await pdf.destroy();
  }
}
