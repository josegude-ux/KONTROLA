import test from "node:test";
import assert from "node:assert/strict";
import {cargasCabeceraPendiente,cabeceraSinMetadatos,cabeceraLeida} from "../src/legacy-header.mjs";

const validPath=code=>"documentos/"+code+"/"+"a".repeat(64)+".pdf";
const load=(code,overrides={})=>({
  codigo:code,documento_ruta:validPath(code),almacen:"COR_01_COR",
  ruta:"Norte",matricula:"1234ABC",repartidor:"Ana",...overrides
});

test("selecciona solo los PDF vigentes referenciados y limita a cinco por gesto",()=>{
  const loads=Array.from({length:8},(_,i)=>load("LP26-"+String(10000+i)));
  assert.equal(cargasCabeceraPendiente(loads).length,5);
  assert.equal(cargasCabeceraPendiente(loads,"LP26-10007")[0].codigo,"LP26-10007");
  assert.deepEqual(cargasCabeceraPendiente(loads,"ninguna"),[]);
  assert.equal(cargasCabeceraPendiente(loads,"",20).length,5);
  assert.deepEqual(cargasCabeceraPendiente(loads,"",0),[]);
});

test("rechaza rutas arbitrarias, documentos ajenos y cargas con cabecera ya guardada",()=>{
  const items=[
    load("LP26-10001",{documento_ruta:"documentos/LP26-99999/"+"a".repeat(64)+".pdf"}),
    load("LP26-10002",{documento_ruta:"../private.pdf"}),
    load("LP26-10003",{observaciones:"Abrir puerta"}),
    load("LP26-10004",{huecos_palets_grandes:0}),
    load("LP26-10005")
  ];
  assert.deepEqual(cargasCabeceraPendiente(items).map(x=>x.codigo),["LP26-10005"]);
  assert.equal(cabeceraSinMetadatos(load("LP26-10005")),true);
  assert.equal(cabeceraSinMetadatos(load("LP26-10005",{huecos_palets_pequenos:0})),false);
});

test("solo acepta cabeceras del código y almacén de la carga",()=>{
  const reference=load("LP26-10001");
  const parsed={
    id:"LP26-10001",warehouse:"COR_01_COR",
    observations:"  Entregar   puerta  3 ",
    palletsLarge:6,palletsSmall:null,palletsTotal:null
  };
  assert.deepEqual(cabeceraLeida(reference,parsed,"COR_01_COR"),{
    observaciones:"Entregar puerta 3",
    huecos_palets_grandes:6,huecos_palets_pequenos:null,huecos_palets_europeos:null,huecos_palets_total:null
  });
  assert.equal(cabeceraLeida(reference,{...parsed,id:"LP26-10009"},"COR_01_COR"),null);
  assert.equal(cabeceraLeida(reference,{...parsed,warehouse:"COR_02_NAR"},"COR_01_COR"),null);
  assert.equal(cabeceraLeida(reference,parsed,"COR_02_NAR"),null);
  assert.equal(cabeceraLeida(load("LP26-10001",{almacen:"COR_02_NAR"}),parsed,"COR_01_COR"),null);
});

test("ausencia de huecos no se transforma en cero y elimina cantidades inválidas",()=>{
  const result=cabeceraLeida(load("LP26-10001"),{
    id:"LP26-10001",warehouse:"COR_01_COR",observations:null,
    palletsLarge:"6",palletsSmall:2.2,palletsTotal:-3
  },"COR_01_COR");
  assert.deepEqual(result,{
    observaciones:null,huecos_palets_grandes:null,huecos_palets_pequenos:null,huecos_palets_europeos:null,huecos_palets_total:null
  });
});

test("cabecera 6G 1E conserva Observaciones y no declara palés P",()=>{
 const r=cabeceraLeida(load("LP26-10001"),{
  id:"LP26-10001",warehouse:"COR_01_COR",observations:"CENTRO 1*",
  palletsLarge:6,palletsEuropean:1,palletsSmall:null,palletsTotal:null},"COR_01_COR");
 assert.equal(r.observaciones,"CENTRO 1*");
 assert.equal(r.huecos_palets_grandes,6);
 assert.equal(r.huecos_palets_europeos,1);
 assert.equal(r.huecos_palets_pequenos,null);
});
