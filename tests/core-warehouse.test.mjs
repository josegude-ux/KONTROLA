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
