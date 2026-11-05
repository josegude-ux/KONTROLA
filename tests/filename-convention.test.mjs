import test from "node:test";
import assert from "node:assert/strict";
import {identificarPdfPorAlmacen,parseDocumentPages} from "../src/core.mjs";

const page=(...parts)=>[{number:1,width:800,items:parts.map((text,i)=>({text,x:20,y:20+i*16}))}];
const ferrol="Almacén: COR_02_NAR",coruna="Almacén: COR_01_COR";
const fecha="Fecha carga: 26/10/2026";

test("F19711.pdf propone Ferrol y LP26-19711 desde fecha del PDF",()=>{
 const value=parseDocumentPages(page(ferrol,fecha),"F19711.pdf");
 assert.equal(value.id,"LP26-19711");
 assert.equal(value.warehouse,"COR_02_NAR");
 assert.equal(value.source,"F19711.pdf");
});
test("C19711.pdf propone A Coruña sin añadir letra al identificador",()=>{
 const value=parseDocumentPages(page(coruna,fecha),"C19711.pdf");
 assert.equal(value.id,"LP26-19711");
 assert.equal(value.warehouse,"COR_01_COR");
});
test("minúsculas de nombre y fecha abreviada funcionan sin usar año actual",()=>{
 const value=parseDocumentPages(page(ferrol,"Fecha carga: 26/10/25"),"f19725.PDF");
 assert.equal(value.id,"LP25-19725");
});
test("sin cabecera de almacén se puede proponer F, pero se exige revisión",()=>{
 const value=parseDocumentPages(page(fecha),"F19711.pdf");
 assert.equal(value.warehouse,"COR_02_NAR");
 assert.ok(value.warnings.some(x=>x.includes("requiere revisión administrativa")));
});
test("código LP del propio PDF prevalece, conservando el formato antiguo",()=>{
 const value=parseDocumentPages(page(ferrol,fecha,"LP26-19711"),"19711.pdf");
 assert.equal(value.id,"LP26-19711");
});
test("un PDF con otro LP no puede adquirir el código del nombre",()=>{
 assert.throws(()=>parseDocumentPages(page(ferrol,fecha,"LP26-19712"),"F19711.pdf"),/dentro del PDF aparece LP26-19712/);
});
test("un PDF del almacén opuesto no se acepta según el prefijo",()=>{
 assert.throws(()=>parseDocumentPages(page(coruna,fecha),"F19711.pdf"),/cabecera del PDF indica COR_01_COR/);
});
test("no se admite reclasificar un F como A Coruña mediante la interfaz",()=>{
 assert.throws(()=>parseDocumentPages(page(ferrol,fecha),"F19711.pdf",{warehouse:"COR_01_COR"}),/no se puede clasificar/);
});
test("el año explícito del LP no puede contradecir la fecha del PDF",()=>{
 assert.throws(()=>parseDocumentPages(page(ferrol,fecha,"LP25-19711"),"F19711.pdf"),/no coincide con el año/);
});
test("no se adivina el año a partir del nombre F19711.pdf",()=>{
 assert.throws(()=>parseDocumentPages(page(ferrol),"F19711.pdf"),/no se pudo verificar el año/);
});
test("la nueva nomenclatura admite únicamente las letras C y F",()=>{
 assert.deepEqual(identificarPdfPorAlmacen("C19711.pdf"),{number:"19711",warehouse:"COR_01_COR"});
 assert.deepEqual(identificarPdfPorAlmacen("f19711.PDF"),{number:"19711",warehouse:"COR_02_NAR"});
 assert.equal(identificarPdfPorAlmacen("X19711.pdf"),null);
 assert.equal(identificarPdfPorAlmacen("F19711.docx"),null);
 assert.equal(identificarPdfPorAlmacen("119711.pdf"),null);
});
