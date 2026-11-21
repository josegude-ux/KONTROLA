import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {destinoAcreditado} from "../src/visura-print-r7-core.mjs";
import {seleccionarCorunaAcreditada,listaMatriculasR7,hojaRepartoR7} from "../src/visura-print-r7-lists.mjs";
import {generarPdfHojas} from "../src/print-pdf.mjs";

const row=(codigo,destino,peso_kg,otros={})=>({
 codigo,destino,peso_kg,fecha:"2026-11-20",matricula:"1234ABC",repartidor:"ANA",
 productos:[{location:"ZFRIO",qty:2,unit:"CAJA",sku:"PRD0001"}],...otros
});
const pdfPages=bytes=>[...new TextDecoder().decode(bytes).matchAll(/\/Type\s*\/Page\b/g)].length;
const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("excluye siempre las cargas de Ferrol y las que solo acreditan origen COR1",()=>{
 const rows=[row("LP26-00001","FERROL",1000),row("LP26-00002",undefined,800,{almacen:"COR_01_COR"}),
   row("LP26-00003","CORUÑA",700)];
 assert.equal(destinoAcreditado(rows[1]),null);
 const selected=seleccionarCorunaAcreditada(rows);
 assert.deepEqual(selected.accepted.map(r=>r.codigo),["LP26-00003"]);
 assert.equal(selected.unknown,1);
 assert.equal(selected.ferrol,1);
});

test("sin destino CORUÑA explícito no se pueden generar auxiliares",()=>{
 const rows=[row("LP26-00001","FERROL",1000),row("LP26-00002",null,800)];
 assert.throws(()=>listaMatriculasR7(rows),/No hay destinos CORUÑA acreditados/);
 assert.throws(()=>hojaRepartoR7(rows),/No hay destinos CORUÑA acreditados/);
});

test("matrículas por peso: fechas independientes, orden descendente, sin sumar pesos desconocidos",()=>{
 const rows=[row("LP26-00001","CORUÑA",800,{matricula:"AAA"}),
             row("LP26-00002","CORUÑA",1300,{matricula:"BBB"}),
             row("LP26-00003","CORUÑA",null,{matricula:"CCC"}),
             row("LP26-00004","FERROL",7000,{matricula:"FER"})];
 const {pages}=listaMatriculasR7(rows);
 assert.equal(pages.length,1);
 assert.deepEqual(pages[0].filas.map(r=>r.matricula),["BBB","AAA","CCC"]);
 assert.equal(pages[0].pesoTotal,2100);
 assert.equal(pages[0].filas[2].peso,null);
 assert.equal(pdfPages(generarPdfHojas(pages)),1);
});

test("reparto: elige un camión por repartidor con mayor peso y frío acreditado",()=>{
 const rows=[row("LP26-00001","CORUÑA",400),
             row("LP26-00002","CORUÑA",1200,{matricula:"CCC"}),
             row("LP26-00003","CORUÑA",900,{matricula:"DDD",repartidor:"LUIS",productos:[]}),
             row("LP26-00004","CORUÑA",800,{camion:"CRALM10",repartidor:"ALMACEN"}),
             row("LP26-00005","CORUÑA",700,{repartidor:"CC001 ALMACEN"}),
             row("LP26-00006","FERROL",1300)];
 const {pages}=hojaRepartoR7(rows);
 assert.equal(pages.length,1);
 assert.deepEqual(pages[0].filas.map(x=>x.codigo),["LP26-00002","LP26-00003"]);
 assert.equal(pages[0].filas[0].frio,true);
 assert.equal(pdfPages(generarPdfHojas(pages)),1);
});

test("auxiliares no escriben en estados de impresión ni incluyen HTML sin escapar",()=>{
 const script=read("src/admin-print-batch.mjs");
 const list=read("src/visura-print-r7-lists.mjs");
 assert.match(script,/listaMatriculasR7/);
 assert.match(script,/hojaRepartoR7/);
 assert.match(script,/document\.createElement/);
 assert.doesNotMatch(list,/localStorage|sessionStorage|\.insert\(|\.update\(/);
 assert.match(script,/client\.rpc\("kontrola_panel_cargas_impresion"/);
});
