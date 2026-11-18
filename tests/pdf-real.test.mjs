import test from "node:test";
import assert from "node:assert/strict";
import {resolve} from "node:path";
import {PDFDocument,StandardFonts} from "pdf-lib";
import {getDocument} from "pdfjs-dist/legacy/build/pdf.mjs";
import {parseDocumentPages} from "../src/core.mjs";

async function fixturePdf(warehouse,id){
  const document=await PDFDocument.create();
  const font=await document.embedFont(StandardFonts.Helvetica);
  const page=document.addPage([1000,800]);
  const text=(value,x,y,size=11)=>page.drawText(value,{x,y,size,font});
  text(`Almacén: ${warehouse}`,20,770);
  text("Camion: CR 9G 6P",20,760);
  text("Huecos plts. camion: 6G 4P",20,745);
  text("Observaciones: Entregar en puerta 2",20,730);
  text("M E R C A N C I A",20,700,14);
  text("A101-1 PRD0000001",90,650);
  text("Producto de prueba ?",300,650);
  text("2",700,650);
  text("CAJA",900,650);
  text("Total referencias prod. 1",20,580);
  text("TOTAL:",500,580);
  text("2",700,580);
  const logistics=document.addPage([1000,800]);
  logistics.drawText("CONTROL ENVASES",{x:20,y:700,size:14,font});
  logistics.drawText("PALETS 8",{x:20,y:650,size:11,font});
  return {id,bytes:await document.save()};
}

async function parseFixture(warehouse,id){
  const fixture=await fixturePdf(warehouse,id);
  const task=getDocument({
    data:fixture.bytes,disableWorker:true,
    standardFontDataUrl:resolve("node_modules/pdfjs-dist/standard_fonts")+"/"
  });
  const pdf=await task.promise;
  const pages=[];
  try{
    for(let number=1;number<=pdf.numPages;number++){
      const page=await pdf.getPage(number),content=await page.getTextContent(),viewport=page.getViewport({scale:1});
      pages.push({
        number,width:viewport.width,
        items:content.items.filter(item=>typeof item.str==="string").map(item=>({
          text:item.str,x:item.transform?.[4]??0,y:viewport.height-(item.transform?.[5]??0)
        }))
      });
    }
  }finally{await task.destroy();}
  return parseDocumentPages(pages,`${id}.pdf`);
}

for(const [warehouse,id] of [["COR_01_COR","LP26-40001"],["COR_02_NAR","LP26-40002"]]){
  test(`interprets a real generated ${warehouse} PDF without mixing logistics sections`,async()=>{
    const parsed=await parseFixture(warehouse,id);
    assert.equal(parsed.id,id);
    assert.equal(parsed.warehouse,warehouse);
    assert.equal(parsed.products.length,1);
    assert.equal(parsed.products[0].qty,2);
    assert.equal(parsed.products[0].unit,"CAJA");
    assert.match(parsed.products[0].sourceContext,/\?/);
    assert.equal(parsed.actualTotal,2);
    assert.equal(parsed.palletsLarge,6);
    assert.equal(parsed.palletsSmall,4);
    assert.equal(parsed.observations,"Entregar en puerta 2");
  });
}
