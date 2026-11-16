import test from "node:test";
import assert from "node:assert/strict";
import {readLoads,loadKey,reviewKey,newReview,markLine,reviewSummary,closeReview,saveReview,getReview,verificationAllowed} from "../src/control-cargas-checklist.mjs";
const scope="_visura_"+"a".repeat(24);
const storage=()=>{const m=new Map();return {getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v)}};
const load=()=>({id:"LP26-1234",pdfHash:"hash-1",verified:true,products:[{sku:"PRD1234567",description:"Ficticio",location:"A01-P01",qty:12,unit:"CAJA"},{sku:"PRD7654321",description:"Ficticio 2",location:"A01-P02",qty:4,unit:"CAJA"}]});
test("lee PRUEBA_3 sin modificar los datos de preparación",()=>{
 const s=storage(),l=load(),original=JSON.stringify([l]);s.setItem(loadKey(scope),original);
 assert.equal(readLoads(s,scope)[0].id,l.id);
 let r=newReview(l);r=markLine(r,l,0,"ok");saveReview(s,scope,r);
 assert.equal(s.getItem(loadKey(scope)),original);
 assert.ok(s.getItem(reviewKey(scope)));
});
test("aislamiento por usuario y carga",()=>{
 const s=storage(),l=load();saveReview(s,scope,markLine(newReview(l),l,0,"ok"));
 assert.equal(getReview(s,scope,l).review.lines[0].status,"ok");
 assert.equal(getReview(s,"_visura_"+"b".repeat(24),l).review.lines[0],undefined);
 const other={...l,id:"LP26-4321"};
 assert.equal(getReview(s,scope,other).review.lines[0],undefined);
});
test("incidencias solo con cantidad diferente; cierre exige aceptación",()=>{
 const l=load();let r=newReview(l);
 assert.throws(()=>markLine(r,l,0,"incident",12));
 r=markLine(r,l,0,"incident",10,"faltan dos");
 r=markLine(r,l,1,"ok");
 assert.deepEqual(reviewSummary(r,l),{total:2,checked:2,pending:0,incidents:1});
 assert.throws(()=>closeReview(r,l));
 const closed=closeReview(r,l,{acceptIncidents:true});
 assert.ok(closed.closedAt);
 assert.throws(()=>markLine(closed,l,1,"pending"));
});
test("reimportación invalida revisión; extracción no verificada bloquea",()=>{
 const l=load(),r=newReview(l);
 assert.throws(()=>markLine(r,{...l,pdfHash:"hash-2"},0,"ok"));
 assert.equal(verificationAllowed({...l,verified:false}),false);
 assert.throws(()=>markLine(r,{...l,verified:false},0,"ok"));
});
test("no se cierra con líneas pendientes",()=>{
 const l=load();const r=markLine(newReview(l),l,0,"ok");
 assert.throws(()=>closeReview(r,l));
});

test("cantidad cero sin unidad sigue siendo verificable como en PRUEBA_3",()=>{
 const l=load();l.products[0]={...l.products[0],qty:0,unit:""};
 assert.equal(verificationAllowed(l),true);
 const r=markLine(newReview(l),l,0,"ok");
 assert.equal(r.lines[0].status,"ok");
});
