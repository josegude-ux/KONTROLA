import test from "node:test";
import assert from "node:assert/strict";
import {prepararCopiaIntegra,comprobarCopiaIntegra,leerBaseSoloLectura} from "../src/control-cargas-descarte-backup.mjs";

const scope="_visura_"+"a".repeat(24), lp="LP26-0099";
const storage=()=>{
 const values=new Map([
  ["control_cargas_prueba_integrada_2"+scope,JSON.stringify([{id:lp,products:[{sku:"FICTICIO"}]}])],
  ["visura_control_revision_v1"+scope,JSON.stringify({[lp]:{lines:{0:{status:"ok"}},audit:[]}})],
  ["control_cargas_operarios_prueba_2"+scope,JSON.stringify(["OPERARIO FICTICIO"])],
  ["sb-SECRET-supabase-auth-token","TOKEN QUE NO DEBE EXPORTARSE"]
 ]);
 return {getItem:k=>values.get(k)??null,setItem:()=>{throw Error("ESCRITURA NO PERMITIDA")}};
};
const readFake=async (name,requested)=>{
 if(name.startsWith("control_cargas_originales_")){
  return {exists:true,stores:[{name:"originales",exists:true,entries:[
   {key:lp,value:new Blob(["%PDF-1.7\nFICTICIO"],{type:"application/pdf"})},
   {key:lp+"::hash",value:new Blob(["%PDF-1.4\nVERSION ANTERIOR"],{type:"application/pdf"})}
  ]}]};
 }
 return {exists:true,stores:[
  {name:"cola",exists:true,entries:[{key:"op-fake",value:{id:"op-fake",status:"pendiente"}}]},
  {name:"cache",exists:true,entries:[{key:"rows",value:[{codigo:lp,estado:"finalizada"}]}]}
 ]};
};
test("F1: el respaldo inerte incluye originales/versiones, revisiones y cola/caché",async()=>{
 const backup=await prepararCopiaIntegra({scope,storage:storage(),readDatabase:readFake});
 assert.equal(backup.manifest.completo,true);
 assert.equal(backup.manifest.aplicado,false);
 assert.equal(backup.manifest.soloLectura,true);
 assert.equal(backup.manifest.originals.length,2);
 assert.equal(backup.manifest.registrosIdb,2);
 assert.equal(backup.manifest.cargas,1);
 assert.equal(backup.payload.indexedDbFiles.find(x=>x.key===lp).bytes,17);
 assert.equal(backup.payload.indexedDbRecords.find(x=>x.store==="cola").value.id,"op-fake");
 assert.equal(await comprobarCopiaIntegra(backup),true);
 assert.equal(JSON.stringify(backup).includes("TOKEN QUE NO DEBE EXPORTARSE"),false);
});
test("F1: alteraciones de PDF o de revisión son detectadas por SHA-256",async()=>{
 const b=await prepararCopiaIntegra({scope,storage:storage(),readDatabase:readFake});
 b.payload.indexedDbFiles[0].base64=b.payload.indexedDbFiles[0].base64.slice(0,-4)+"AAAA";
 assert.equal(await comprobarCopiaIntegra(b),false);
 const c=await prepararCopiaIntegra({scope,storage:storage(),readDatabase:readFake});
 c.payload.localStorage["visura_control_revision_v1"+scope]="{}";
 assert.equal(await comprobarCopiaIntegra(c),false);
});
test("F1: si falta original para carga local, aborta sin afirmar respaldo íntegro",async()=>{
 const fake=async name=>({exists:true,stores:name.startsWith("control_cargas_originales_")
  ?[{name:"originales",exists:true,entries:[]}]
  :[{name:"cola",exists:true,entries:[]},{name:"cache",exists:true,entries:[]}]});
 await assert.rejects(prepararCopiaIntegra({scope,storage:storage(),readDatabase:fake}),/no recuperables/);
});
test("F1: si IndexedDB no permite comprobar existencia de DB sin escribir, falla cerrado",async()=>{
 await assert.rejects(leerBaseSoloLectura("fake",["cola"],{factory:{}}),/sin crear bases/);
});
test("F1: no hay exportación incompleta si la base o sus stores devuelven error",async()=>{
 const broken=async()=>({exists:true,stores:[]});
 await assert.rejects(prepararCopiaIntegra({scope,storage:storage(),readDatabase:broken}),/obligatorio ausente/);
});
