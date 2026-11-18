import test from "node:test";
import assert from "node:assert/strict";
import {parseDocumentPages} from "../src/core.mjs";

const pageFor=warehouse=>({
  number:1,width:1000,items:[
    {text:`Almacén: ${warehouse}`,x:10,y:10},
    {text:"M E R C A N C Í A",x:10,y:80},
    {text:"A101-1 PRD0000001",x:90,y:110},
    {text:"Producto ?",x:300,y:110},
    {text:"2",x:700,y:110},
    {text:"CAJA",x:900,y:110},
    {text:"Total referencias prod. 1",x:20,y:180},
    {text:"TOTAL:",x:500,y:180},
    {text:"2",x:700,y:180}
  ]
});

test("parses Ferrol from the document warehouse field",()=>{
  const parsed=parseDocumentPages([pageFor("COR_02_NAR")],"LP26-12345.pdf");
  assert.equal(parsed.warehouse,"COR_02_NAR");
  assert.equal(parsed.products.length,1);
  assert.match(parsed.products[0].sourceContext,/\?/);
});

test("keeps unknown warehouse unclassified instead of assigning Coruña",()=>{
  const parsed=parseDocumentPages([pageFor("COR_99_XYZ")],"LP26-12346.pdf");
  assert.equal(parsed.warehouse,"COR_99_XYZ");
  assert.equal(parsed.warehouseKnown,false);
  assert.ok(parsed.warnings.some(item=>/clasificar/i.test(item)));
});


test("reconoce ubicación fragmentada en la misma línea del producto",()=>{
  const page=pageFor("COR_01_COR");
  page.items=page.items.filter(item=>!item.text.includes("A101-1 PRD"));
  page.items.push(
    {text:"A101",x:80,y:110},
    {text:"-",x:116,y:110},
    {text:"12",x:124,y:110},
    {text:"PRD0000001",x:160,y:110}
  );
  const parsed=parseDocumentPages([page],"LP26-12347.pdf");
  assert.equal(parsed.products[0].location,"A101-12");
});

test("no toma ubicación de una fila distinta",()=>{
  const page=pageFor("COR_01_COR");
  page.items=page.items.filter(item=>!item.text.includes("A101-1 PRD"));
  page.items.push({text:"A101-1",x:90,y:96},{text:"PRD0000001",x:160,y:110});
  const parsed=parseDocumentPages([page],"LP26-12348.pdf");
  assert.equal(parsed.products[0].location,"");
});


test("reconstruye LP desde fragmentos separados del texto",()=>{
 const page=pageFor("COR_01_COR");
 page.items.push({text:"LP",x:10,y:30},{text:"26",x:35,y:30},{text:"-",x:55,y:30},{text:"19663",x:65,y:30});
 const parsed=parseDocumentPages([page],"19663.pdf");
 assert.equal(parsed.id,"LP26-19663");
});

test("no inventa LP con un nombre numérico sin referencia verificable",()=>{
 const parsed=parseDocumentPages([pageFor("COR_01_COR")],"19663.pdf");
 assert.equal(parsed.id,"19663");
});


test("lee Observaciones solo de la cabecera, incluso repartidas en varias líneas",()=>{
 const page=pageFor("COR_01_COR");
 page.items.push(
  {text:"Observaciones:",x:12,y:35},
  {text:"Descargar en puerta 4",x:135,y:35},
  {text:"avisar antes de llegar",x:135,y:48},
  {text:"Ruta: Centro",x:12,y:61},
  {text:"Observaciones: IGNORAR producto",x:320,y:110}
 );
 const parsed=parseDocumentPages([page],"LP26-12349.pdf");
 assert.equal(parsed.observations,"Descargar en puerta 4 avisar antes de llegar");
});

test("si Observaciones está vacío o solo en el detalle, no inventa contenido",()=>{
 const page=pageFor("COR_01_COR");
 page.items.push({text:"Observaciones:",x:12,y:35},{text:"Ruta: Norte",x:12,y:47});
 page.items.push({text:"Observaciones: descripción de producto",x:350,y:110});
 assert.equal(parseDocumentPages([page],"LP26-12350.pdf").observations,null);
});

test("el campo de huecos del camión prevalece sobre el código de camión",()=>{
 const page=pageFor("COR_01_COR");
 page.items.push(
  {text:"Camion: CR 9G 6P",x:10,y:22},
  {text:"Huecos plts. camion: 6G 4P",x:10,y:34}
 );
 const parsed=parseDocumentPages([page],"LP26-12351.pdf");
 assert.equal(parsed.palletsLarge,6);
 assert.equal(parsed.palletsSmall,4);
 assert.equal(parsed.palletsTotal,null);
});

test("si solo aparecen grandes, no inventa huecos pequeños",()=>{
 const page=pageFor("COR_01_COR");
 page.items.push({text:"Huecos plts. camion: 8G",x:10,y:22});
 const parsed=parseDocumentPages([page],"LP26-12352.pdf");
 assert.equal(parsed.palletsLarge,8);
 assert.equal(parsed.palletsSmall,null);
});

test("si el campo de huecos trae un total simple, no inventa clases G/P",()=>{
 const page=pageFor("COR_01_COR");
 page.items.push({text:"Huecos plts. camion: 12",x:10,y:22});
 const parsed=parseDocumentPages([page],"LP26-12353.pdf");
 assert.equal(parsed.palletsLarge,null);
 assert.equal(parsed.palletsSmall,null);
 assert.equal(parsed.palletsTotal,12);
});
