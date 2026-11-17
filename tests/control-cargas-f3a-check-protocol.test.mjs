import test from 'node:test';
import assert from 'node:assert/strict';
import {sourceSignature} from '../src/control-cargas-checklist.mjs';
import {prepararEventoCheck,resumenDesdeEventos,comprobarDescarteConEventos} from '../src/control-cargas-f3a-check-protocol.mjs';
const U='a71d3ee7-181f-4c2a-9000-000000000001',V='a71d3ee7-181f-4c2a-9000-000000000002';
const H='a'.repeat(64);
const carga=()=>({id:'LP26-21230',pdfHash:H,verified:true,products:[{sku:'A',qty:3,unit:'CAJA'},{sku:'B',qty:4,unit:'CAJA'},{sku:'C',qty:5,unit:'CAJA'}]});
const servidor=()=>({almacen:'COR_01_COR',codigo:'LP26-21230',pdf_hash:H,referencias:3,estado:'en_preparacion',fin:null});
const revision=(c=carga())=>({schema:1,loadId:c.id,sourceSignature:sourceSignature(c),createdAt:'2026-11-17T10:01:00Z',updatedAt:'2026-11-17T10:02:00Z',closedAt:null,lines:{0:{status:'ok'}},audit:[{line:0,from:'pending',to:'ok',at:'2026-11-17T10:02:00Z'}]});
const req=()=>({carga:carga(),revision:revision(),servidor:servidor(),linea:0,estado:'ok',versionEsperada:0,operacionId:U,conectado:true});
const evento=(version,linea,estado,id=version===1?U:V)=>({version,linea,estado,operacion_id:id,actor:U,hora_servidor:'2026-11-17T10:0'+version+':00Z'});
const head=()=>({almacen:'COR_01_COR',lp:'LP26-21230',pdf_hash:H,version:1});
test('N1 petición mínima: ni revision, ni resumen, ni PDF ni hora/actor del cliente',()=>{
 const p=prepararEventoCheck(req());assert.deepEqual(Object.keys(p).sort(),['p_almacen','p_estado','p_linea','p_lp','p_operacion','p_pdf_hash','p_version_esperada'].sort());
 assert.equal(JSON.stringify(p).includes('checked'),false);
});
test('N2 no aceptar revisión de PDF distinto',()=>{const p=req();p.carga.pdfHash='b'.repeat(64);assert.throws(()=>prepararEventoCheck(p),/revisión|coinciden/)});
test('N3 no respaldar check sin su evento audit local',()=>{const p=req();p.revision.audit=[];assert.throws(()=>prepararEventoCheck(p),/pendiente marcada|evento/)});
test('N4 evento de otra linea no equivale a check confirmado',()=>{const p=req();p.linea=1;assert.throws(()=>prepararEventoCheck(p),/ultimo cambio/)});
test('N5 sin red no declarar check confirmado y no subir en lote',()=>{const p=req();p.conectado=false;assert.throws(()=>prepararEventoCheck(p),/sin conexion/)});
test('N6 version esperada y operación obligatorias',()=>{const p=req();p.versionEsperada=undefined;assert.throws(()=>prepararEventoCheck(p),/version/);p.versionEsperada=0;p.operacionId='x';assert.throws(()=>prepararEventoCheck(p),/operacion/)});
test('N7 solo eventos con actor/hora de servidor y secuencia sin huecos',()=>{assert.throws(()=>resumenDesdeEventos({total:3,eventos:[evento(2,0,'ok')]}),/secuencia/);const e=evento(1,0,'ok');delete e.actor;assert.throws(()=>resumenDesdeEventos({total:3,eventos:[e]}),/secuencia/)});
test('N8 eventos reproducen estado y deshacer check decrementa contador',()=>{const e1=evento(1,0,'ok');const e2=evento(2,0,'pending');const r=resumenDesdeEventos({total:3,eventos:[e1,e2]});assert.deepEqual([r.checked,r.pending,r.incidents,r.version],[0,3,0,2])});
test('N9 rechazados replay distinto op mismo id y transicion redundante',()=>{const x=evento(1,0,'ok');const y=evento(2,1,'ok',U);assert.throws(()=>resumenDesdeEventos({total:3,eventos:[x,y]}),/secuencia/);assert.throws(()=>resumenDesdeEventos({total:3,eventos:[x,evento(2,0,'ok')]}),/redundante/)});
test('N10 el total del servidor manda; resumen calculado, no recibido del cliente',()=>{const r=comprobarDescarteConEventos({cargaServidor:servidor(),head:head(),eventos:[evento(1,0,'ok')]});assert.deepEqual([r.checked,r.pending,r.total,r.acredita_verificacion_fisica],[1,2,3,false]);});
test('N11 no descartar con cola offline ni versiones/huella inconsistentes',()=>{
 const params={cargaServidor:servidor(),head:head(),eventos:[evento(1,0,'ok')]};assert.throws(()=>comprobarDescarteConEventos({...params,colaPendiente:1}),/sin confirmar/);
 assert.throws(()=>comprobarDescarteConEventos({...params,head:{...head(),version:2}}),/version/);
 assert.throws(()=>comprobarDescarteConEventos({...params,head:{...head(),pdf_hash:'b'.repeat(64)}}),/identidad/);
});
test('N12 no descartar con 0 checks, ni comprobacion completa, ni carga finalizada',()=>{
 const p={cargaServidor:servidor(),head:{...head(),version:0},eventos:[]};assert.throws(()=>comprobarDescarteConEventos(p),/check/);
 const all=[evento(1,0,'ok'),evento(2,1,'ok'),evento(3,2,'ok','a71d3ee7-181f-4c2a-9000-000000000003')];assert.throws(()=>comprobarDescarteConEventos({...p,head:{...head(),version:3},eventos:all}),/pendiente/);
 assert.throws(()=>comprobarDescarteConEventos({...p,cargaServidor:{...servidor(),fin:'2026-11-17T10:05:00Z'}}),/identidad/);
});
