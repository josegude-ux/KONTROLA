import test from "node:test";
import assert from "node:assert/strict";
import {PDFDocument} from "pdf-lib";
import {crearMatrizPasillos,crearListadoPasillosA4} from "../src/aisle-matrix.mjs";
import {generarPdfHojas} from "../src/print-pdf.mjs";

const productos=[
 {sku:"PRD0000001",location:"A00-P01",qty:2,unit:"CAJA",description:"Cajas A"},
 {sku:"PRD0000002",location:"A01-P01",qty:24,unit:"BOTELLA",description:"Botellas A"},
 {sku:"PRD0000003",location:"J01-P01",qty:3,unit:"CAJA",description:"Cajas J"},
 {sku:"PRD0000004",location:"J02-P02",qty:61,unit:"BOTELLA",description:"Botellas J"},
 {sku:"PRD0000005",location:"L02-P03",qty:7,unit:"CAJA",description:"Cajas L"},
 {sku:"PRD0000006",location:"L01-P01",qty:1,unit:"PACK",description:"Pack L"},
 {sku:"PRD0000007",location:"ZFRIO",qty:2,unit:"PAQUETE",description:"Zona fría"},
 {sku:"PRD0004185",location:"",qty:2,unit:"CAJA",description:"KAS LIMON VIDRIO RET 20CL CAJA 24U"},
 {sku:"PRD0004350",location:"",qty:8,unit:"CAJA",description:"LA CASERA GASEOSA PET 50CL CAJA 12U"},
 {sku:"PRD0003302",location:"",qty:6,unit:"BOTELLA",description:"GINEBRA BEEFEATER 70CL 1L"},
 {sku:"IGNORAR",location:"Z01",qty:0,unit:"CAJA",description:"No pertenece"},
];
const carga={codigo:"LP26-19448",almacen:"COR_01_COR",fecha:"2026-10-22",
 repartidor:"CC112 JOSE ANTONIO RICO",productos};

test("matriz reutiliza agrupación por pasillos y separa cada tipo de unidad",()=>{
 const x=crearMatrizPasillos(productos);
 assert.deepEqual(x.unidades,["CAJA","BOTELLA","PACK","PAQUETE"]);
 assert.deepEqual(x.pasillos.map(r=>r.nombre),["A","J","L","FRÍO","SIN UBICACIÓN"]);
 assert.equal(x.referencias,10);
 assert.equal(x.total,116);
 assert.equal(x.pasillos.find(r=>r.nombre==="J").valores.BOTELLA,61);
 assert.equal(x.pasillos.find(r=>r.nombre==="SIN UBICACIÓN").total,16);
 assert.deepEqual(x.totales,{CAJA:22,BOTELLA:91,PACK:1,PAQUETE:2});
 assert.deepEqual(x.sinUbicacion.map(x=>x.sku).sort(),["PRD0004185","PRD0004350","PRD0003302"].sort());
});
test("agrupación no modifica el original ni asigna un pasillo falso",()=>{
 const before=JSON.stringify(productos);
 const matrix=crearMatrizPasillos(productos);
 assert.equal(JSON.stringify(productos),before);
 assert.ok(matrix.sinUbicacion.every(x=>x.location==="SIN UBICACIÓN"));
 assert.equal(matrix.pasillos.find(x=>x.nombre==="SIN UBICACIÓN").referencias,3);
});
test("listado COR1 produce exactamente un A4 y conserva el detalle sin ubicación",async()=>{
 const sheet=crearListadoPasillosA4(carga);
 const bytes=generarPdfHojas([sheet]);
 const pdf=await PDFDocument.load(bytes);
 assert.equal(pdf.getPageCount(),1);
 const size=pdf.getPage(0).getSize();
 assert.ok(Math.abs(size.width-595.28)<1);
 assert.ok(Math.abs(size.height-841.89)<1);
 const raw=new TextDecoder().decode(bytes);
 for(const value of ["LP26-19448","PASILLO","HECHO","PRD0004185","PRD0004350","PRD0003302"])
   assert.ok(raw.includes(value),"No debe faltar "+value);
});
test("solo las cargas COR1 pueden generar el listado operativo; COR2 sigue informativo",()=>{
 assert.throws(()=>crearListadoPasillosA4({...carga,almacen:"COR_02_NAR"}),/solo admite COR1/);
});
test("no se generan hojas A4 vacías",()=>{
 assert.throws(()=>crearListadoPasillosA4({...carga,productos:[]}),/No hay líneas/);
});
test("muchas ubicaciones sin dato nunca se ocultan para encajar la hoja",()=>{
 const many=Array.from({length:40},(_,i)=>({
   sku:"PRD"+String(i).padStart(8,"0"),location:"",qty:1,unit:"CAJA",description:"Producto "+i
 }));
 const sheet=crearListadoPasillosA4({...carga,productos:many});
 assert.equal(sheet.sinUbicacion.length,40);
 assert.throws(()=>generarPdfHojas([sheet]),/no cabe|demasiado|legiblemente/i);
});
test("más de nueve columnas de unidad se rechaza con explicación, sin perder datos",()=>{
 const many=Array.from({length:10},(_,i)=>({sku:"P"+i,location:"A01",qty:1,unit:"TIPO"+i}));
 assert.throws(()=>crearListadoPasillosA4({...carga,productos:many}),/Más de 9 tipos/);
});
test("no contiene llamadas de persistencia: la hoja se construye en memoria",async()=>{
 const {readFileSync}=await import("node:fs");
 const source=readFileSync(new URL("../src/aisle-matrix.mjs",import.meta.url),"utf8");
 for(const str of ['.rpc(','.insert(','.update(','.delete(','.upsert(','fetch('])
   assert.equal(source.includes(str),false,"No se autoriza escritura o red en "+str);
});
