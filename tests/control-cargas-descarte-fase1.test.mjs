import test from "node:test";
import assert from "node:assert/strict";
import {
 DESCARTE_SCHEMA,descarteKey,registroActivo,codigoEstable,prepararMigracionLocal,
 proyectarDescarte,progresoVerificado,validacionDescarte,permisoDescarte
} from "../src/control-cargas-descarte-model.mjs";
const scope="_visura_"+"a".repeat(24);
const load=(id="LP26-0012")=>({id,date:"16/11/2026",pdfHash:"FICTICIO",verified:true,
 products:[{sku:"FAKE-1",qty:10,unit:"CAJA"},{sku:"FAKE-2",qty:5,unit:"BOTELLA"}]});
const review=(lines={},closedAt=null)=>({lines,closedAt,updatedAt:"2026-11-17T01:00:00Z",audit:[]});
test("F1: migración aditiva por LP, inerte y sin alterar las revisiones originales",()=>{
 const l=load(),reviews={[l.id]:review({0:{status:"ok"}})};
 const src=JSON.stringify({l,reviews});
 const result=prepararMigracionLocal({scope,loads:[l],reviews});
 assert.equal(result.ledger.schema,DESCARTE_SCHEMA);
 assert.equal(result.ledger.items[l.id].estado_descarte,"activa");
 assert.equal(result.ledger.items[l.id].progreso_al_descartar,null);
 assert.equal(result.diagnostico.aplicada,false);
 assert.equal(result.diagnostico.requiereBackup,true);
 assert.equal(result.diagnostico.nuevos,1);
 assert.equal(JSON.stringify({l,reviews}),src);
 assert.equal(descarteKey(scope),"visura_prepara_descarte_v1"+scope);
});
test("F1: una reimportación conceptual conserva el descarte anterior sin reactivación",()=>{
 const l=load(),e={...registroActivo(),estado_descarte:"descartada",
  descartada_en:"2026-11-16T20:00:00Z",descartada_por:"usuario-ficticio",
  motivo_descarte:"Salió a reparto",progreso_al_descartar:{total:2,checked:1,pending:1,incidents:0},
  version_descarte:1,historial_descarte:[{accion:"descartar",actor:"usuario-ficticio"}]};
 const earlier={schema:1,scope,items:{[l.id]:e}};
 const before=JSON.stringify(earlier);
 const second=prepararMigracionLocal({scope,loads:[{...l,pdfHash:"OTRO-PDF",route:"RUTA 3"}],
  ledgerAnterior:earlier});
 assert.equal(second.diagnostico.nuevos,0);
 assert.equal(second.diagnostico.preservados,1);
 assert.equal(proyectarDescarte(l,second.ledger).estado_descarte,"descartada");
 assert.deepEqual(second.ledger.items[l.id],e);
 assert.equal(JSON.stringify(earlier),before);
});
test("F1: no se pierden entradas antiguas aunque un LP desaparezca del importador",()=>{
 const old=load("LP26-0042");
 const ledger=prepararMigracionLocal({scope,loads:[old]}).ledger;
 const result=prepararMigracionLocal({scope,loads:[],ledgerAnterior:ledger});
 assert.equal(result.diagnostico.entradasConservadasSinCarga,1);
 assert.equal(result.ledger.items[old.id].estado_descarte,"activa");
});
test("F1: rechazo preventivo de duplicados, scopes incompatibles y datos corruptos",()=>{
 const l=load();
 assert.throws(()=>prepararMigracionLocal({scope,loads:[l,{...l}]}),/duplicado/);
 assert.throws(()=>prepararMigracionLocal({scope:"_visura_ERR",loads:[]}),/Ámbito/);
 assert.throws(()=>prepararMigracionLocal({scope,loads:[l],ledgerAnterior:{schema:1,scope:"_visura_"+"b".repeat(24),items:{}}}),/incompatible/);
 assert.throws(()=>codigoEstable({id:"../secreto"}),/Formato LP/);
});
test("F1: modelo impide descarte si está cerrada o totalmente comprobada",()=>{
 const l=load();
 assert.equal(validacionDescarte(l,review({}, "2026-11-16T23:00:00Z")).apta,false);
 assert.equal(validacionDescarte(l,review({0:{status:"ok"},1:{status:"incident"}})).apta,false);
 assert.equal(validacionDescarte(l,review({0:{status:"ok"}})).apta,true);
 assert.equal(validacionDescarte(l,review({0:{status:"incident"}})).progreso.incidents,1);
 assert.deepEqual(progresoVerificado(l,review({0:{status:"ok"}})),
  {total:2,checked:1,pending:1,incidents:0,revision_actualizada_en:"2026-11-17T01:00:00Z"});
 assert.equal(validacionDescarte({...l,products:[]},review()).apta,false);
});
test("F2: operario y administrador activos, con validación definitiva pendiente del servidor",()=>{
 assert.equal(permisoDescarte({id:"fake-admin",rol:"administrador",activo:true}),true);
 assert.equal(permisoDescarte({id:"fake-operator",rol:"operario",activo:true}),true);
 assert.equal(permisoDescarte({id:"fake-admin",rol:"administrador",activo:false}),false);
 assert.equal(permisoDescarte({id:"",rol:"administrador",activo:true}),false);
});
