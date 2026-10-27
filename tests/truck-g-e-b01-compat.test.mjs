import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {extraerFormatoCamion} from "../src/core.mjs";
import {cargaHuecosPendientes,cabeceraLeida} from "../src/legacy-header.mjs";
import {capacidadDeCarga,evaluarHuecosCamion} from "../src/palet-viabilidad.mjs";
import {combinarHuecosConOrigen,textoHuecosConOrigen,formatearHuecosPalets} from "../src/logic.mjs";

const code="LP26-19735",warehouse="COR_01_COR";
const route="documentos/"+code+"/"+"a".repeat(64)+".pdf";
const load={codigo:code,almacen:warehouse,documento_ruta:route,
  huecos_palets_grandes:null,huecos_palets_europeos:null,huecos_palets_pequenos:null,huecos_palets_total:"0"};

test("8G 4E prevalece en parser ante cero separado y conserva semántica E",()=>{
  for(const label of ["8G4E","8G 4E","8G-4E","8G/4E","8 G 4 E"]){
    const parsed=extraerFormatoCamion("CR4863JPP VOLDIS-"+label,"0");
    assert.deepEqual(parsed,{palletsLarge:8,palletsSmall:null,palletsEuropean:4,palletsTotal:null});
  }
  assert.equal(formatearHuecosPalets(8,null,null,4),"8 G · 4 E");
  assert.deepEqual(extraerFormatoCamion("IVECO 6G 1E","0"),
    {palletsLarge:6,palletsSmall:null,palletsEuropean:1,palletsTotal:null});
  assert.equal(extraerFormatoCamion("CAMION 8G 4P","0").palletsSmall,4);
  assert.equal(extraerFormatoCamion("CAMION 8G","0").palletsEuropean,null);
});

test("cero almacenado desencadena relectura de solo lectura en ruta válida",()=>{
  assert.equal(cargaHuecosPendientes(load),true);
  assert.equal(cargaHuecosPendientes({...load,documento_ruta:"../privado.pdf"}),false);
  assert.equal(cargaHuecosPendientes({...load,huecos_palets_grandes:8}),false);
  assert.equal(cabeceraLeida(load,{id:"LP26-99999",warehouse,palletsLarge:8},warehouse),null);
  const parsed=cabeceraLeida(load,{id:code,warehouse,palletsLarge:8,palletsEuropean:4,palletsSmall:null},warehouse);
  assert.equal(parsed.huecos_palets_grandes,8);
  assert.equal(parsed.huecos_palets_europeos,4);
  assert.equal(parsed.huecos_palets_pequenos,null);
});

test("desglose explícito del PDF original prevalece sobre un total cero genérico",()=>{
  const revision={huecos_palets_total:"0",observaciones:"Mantener anotación vigente"};
  const pdf={huecos_palets_grandes:8,huecos_palets_europeos:4,huecos_palets_total:null,
    observaciones:"Texto antiguo"};
  const result=combinarHuecosConOrigen(load,revision,pdf);
  assert.equal(result.huecos_palets_grandes,8);
  assert.equal(result.huecos_palets_europeos,4);
  assert.equal(result.huecos_palets_pequenos,null);
  assert.equal(result.huecos_palets_total,null);
  assert.equal(result.huecos_origen,"pdf_leido");
  assert.equal(result.observaciones,revision.observaciones);
  assert.equal(textoHuecosConOrigen(result),"8 G · 4 E");
});

test("un dato de revisión positivo sigue prevaleciendo sobre PDF local contradictorio",()=>{
  const revision={huecos_palets_grandes:6,huecos_palets_europeos:1,observaciones:"Actual"};
  const pdf={huecos_palets_grandes:8,huecos_palets_europeos:4,observaciones:"Previo"};
  const result=combinarHuecosConOrigen(load,revision,pdf);
  assert.equal(result.huecos_palets_grandes,6);
  assert.equal(result.huecos_palets_europeos,1);
  assert.equal(result.observaciones,"Actual");
  assert.equal(result.huecos_origen,"revision");
});

test("un cero aislado no acredita capacidad ni declara viabilidad",()=>{
  assert.equal(capacidadDeCarga({huecos_palets_total:0}).modo,"sin_datos");
  assert.equal(capacidadDeCarga({huecos_palets_grandes:0,huecos_palets_europeos:0}).modo,"sin_datos");
  assert.equal(capacidadDeCarga({huecos_palets_grandes:8,huecos_palets_europeos:0,
    huecos_palets_pequenos:2}).segundoTipo,"P");
  assert.equal(evaluarHuecosCamion({modo:"total",previas:"no",capacidadTotal:"0",actualTotal:"0"}).estado,"incompleto");
  assert.equal(evaluarHuecosCamion({modo:"desglose",segundoTipo:"E",previas:"no",
    capacidadG:0,capacidadP:0,actualG:0,actualP:0}).estado,"incompleto");
  const result=combinarHuecosConOrigen(load,{huecos_palets_total:"0"});
  assert.equal(textoHuecosConOrigen(result),"0 sin acreditar · confirmar");
});

test("capacidad 8G 4E no autoriza inventar palés actuales, ni compensar formatos",()=>{
  assert.equal(evaluarHuecosCamion({modo:"desglose",segundoTipo:"E",previas:"no",
    capacidadG:8,capacidadP:4,actualG:"",actualP:""}).estado,"incompleto");
  const result=evaluarHuecosCamion({modo:"desglose",segundoTipo:"E",previas:"si",
    capacidadG:8,capacidadP:4,anterioresG:6,anterioresP:1,actualG:2,actualP:3});
  assert.equal(result.estado,"viable");
  assert.deepEqual(result.filas.map(x=>x.restantes),[0,0]);
  assert.equal(evaluarHuecosCamion({modo:"desglose",segundoTipo:"E",previas:"no",
    capacidadG:8,capacidadP:4,actualG:9,actualP:0}).estado,"inviable");
});

test("la UI habilita E/P solo en desglose, limpia inputs y protege preparaciones",()=>{
  const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
  const app=read("src/app.mjs"),html=read("index.html");
  for(const id of ["truckSecondKind","truckSecondKindRow","truckCapacityPLabel",
    "truckPreviousPLabel","truckCurrentPLabel"])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(app,/\$\("truckSecondKindRow"\)\.hidden=!bySize/);
  assert.match(app,/for\(const id of \["truckCapacityP","truckPreviousP","truckCurrentP"\]\)/);
  assert.match(app,/recoverTruckCapacityFromPdf\(load\)/);
  assert.match(app,/if\(result\.estado!=="viable"\)/);
  assert.match(app,/if\(assessment\(\)\.estado!=="viable"\)/);
  assert.match(read("src/admin.mjs"),/configureAdminFixedPositions|fixedPositions/);
});
