import test from "node:test";
import assert from "node:assert/strict";
import {planAnexoFrioCargaR7,anexarInformesFrioR7} from "../src/visura-r7-anexos-frio.mjs";
import {componerLoteOriginalR7} from "../src/visura-r7-lote-original.mjs";

const product=(sku,location,unit,qty=2)=>({sku,location,unit,qty,description:"Producto "+sku});
const load=(codigo,destino,productos)=>({codigo,almacen:"COR_01_COR",destino,
 fecha:"2026-11-20",repartidor:"BORJA FROIZ ARES",matricula:"1234ABC",productos});
const parsed=row=>({id:row.codigo,warehouse:"COR_01_COR",verified:true,pageNumbers:[1],products:row.productos});
const coruna=load("LP26-00001","CORUÑA",[product("PRD001","ZFRIO","CAJA",3)]);
const ferrol=load("LP26-00002","FERROL",[product("PRD002","ZFRIO","CAJA"),product("PRD003","A01","BARRIL")]);

test("anexos independientes Coruña y Ferrol; barriles solo Ferrol",()=>{
 const a=planAnexoFrioCargaR7(coruna,parsed(coruna));
 const b=planAnexoFrioCargaR7(ferrol,parsed(ferrol));
 assert.equal(a.frio.length,1);assert.equal(a.barriles.length,0);
 assert.equal(b.frio.length,1);assert.equal(b.barriles.length,1);
 assert.equal(planAnexoFrioCargaR7({...coruna,destino:null},parsed(coruna)),null);
});

test("rechaza el frío cuando no coincide cantidad o verificación del PDF",()=>{
 assert.throws(()=>planAnexoFrioCargaR7(coruna,{...parsed(coruna),
   products:[product("PRD001","ZFRIO","CAJA",4)]}),/distintas/);
 assert.throws(()=>planAnexoFrioCargaR7(coruna,{...parsed(coruna),verified:false}),/no verificado/);
});

function fakeEngine(){
 const font={widthOfTextAtSize:(s,size)=>String(s).length*size*.50};
 return {StandardFonts:{Helvetica:"Helvetica",HelveticaBold:"HelveticaBold"},rgb:(...v)=>v,
  PDFDocument:{
   create:async()=>{const pages=[];return{
     embedFont:async()=>font,getPageCount:()=>pages.length,
     addPage:value=>{const page=Array.isArray(value)?
       {size:value,content:[],drawText:function(s){this.content.push(s)},drawRectangle:()=>{}}:value;
       pages.push(page);return page;},
     copyPages:async(_source,indices)=>indices.map(i=>({copied:i})),
     save:async()=>new Uint8Array([pages.length])};},
   load:async b=>({getPageCount:()=>b[0],getPageIndices:()=>Array.from({length:b[0]},(_,i)=>i)})
  }
 };
}

test("lote de dos LP añade anexos solo al final manteniendo paridad",async()=>{
 const result=await componerLoteOriginalR7({rows:[coruna,ferrol],pdfLib:fakeEngine(),
  preparar:async row=>({codigo:row.codigo,bytes:new Uint8Array([row.codigo===coruna.codigo?4:6]),
   hojasFrio:row.codigo===coruna.codigo?1:0,anexo:planAnexoFrioCargaR7(row,parsed(row))})});
 assert.equal(result.paginas,14);
 assert.deepEqual(result.paginasPorLP.map(x=>x.paginas),[4,6]);
 assert.deepEqual(result.anexos,{paginas:4,grupos:2});
});

test("sin anexos, el compositor preserva los dos folios de cada LP",async()=>{
 const result=await componerLoteOriginalR7({rows:[{...coruna,destino:null}],pdfLib:fakeEngine(),
   preparar:async row=>({codigo:row.codigo,bytes:new Uint8Array([4]),anexo:null,sinDestinoFrio:true})});
 assert.equal(result.paginas,4);
 assert.deepEqual(result.anexos,{paginas:0,grupos:0});
 assert.equal(result.avisos.length,1);
});

test("más líneas en frío se paginan sin mezclarse con otra LP",async()=>{
 const many=load("LP26-10001","CORUÑA",Array.from({length:42},(_,i)=>
   product("PRD"+String(i).padStart(4,"0"),"ZFRIO","CAJA",1)));
 const result=await componerLoteOriginalR7({rows:[many],pdfLib:fakeEngine(),
   preparar:async row=>({codigo:row.codigo,bytes:new Uint8Array([4]),anexo:planAnexoFrioCargaR7(row,parsed(row))})});
 assert.equal(result.paginas%2,0);
 assert.ok(result.anexos.paginas>=4);
});
