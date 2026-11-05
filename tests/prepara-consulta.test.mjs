import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {articulosDeCargas,buscarArticulosDeCargas,ubicacionesEnCargas,validarVistaPreviaMovimiento} from "../src/prepara-consulta.mjs";
const read=p=>readFileSync(new URL("../"+p,import.meta.url),"utf8");
const cargas=[{almacen:"COR_01_COR",codigo:"C1",productos:[
  {sku:"000124",description:"Café molido",location:"A02-P01",qty:3,unit:"CAJA"},
  {sku:"000124",description:"Café molido",location:"A02-P01",qty:2,unit:"CAJA"},
  {sku:"567",description:"Agua",location:"B01-P01",qty:6,unit:"BOTELLA"}
]},{almacen:"OTRO",codigo:"C2",productos:[{sku:"NO",description:"Excluido",location:"Z01",qty:10}]}];
test("indexa solo líneas de cargas del almacén visible sin convertirlas en existencias",()=>{
  const rows=articulosDeCargas(cargas,"COR_01_COR");
  assert.equal(rows.length,3);assert.equal(rows[0].sku,"000124");
  assert.equal(rows[0].cantidadCarga,3);assert.equal(rows[1].cantidadCarga,2);
  assert.equal(rows.every(row=>row.carga==="C1"),true);
  assert.equal(cargas[0].productos[0].qty,3);
});
test("busca referencias, ubicación y descripción sin tildes y exige dos caracteres",()=>{
  const rows=articulosDeCargas(cargas,"COR_01_COR");
  assert.equal(buscarArticulosDeCargas(rows,"cafe").length,2);
  assert.equal(buscarArticulosDeCargas(rows,"A02").length,2);
  assert.equal(buscarArticulosDeCargas(rows,"0001").length,2);
  assert.equal(buscarArticulosDeCargas(rows,"c").length,0);
  assert.equal(buscarArticulosDeCargas(rows,"<script>").length,0);
});
test("las ubicaciones de origen se desduplican sin sumar cantidades de cargas",()=>{
  const r=ubicacionesEnCargas(articulosDeCargas(cargas,"COR_01_COR"));
  assert.equal(r.length,2);assert.equal(r[0].sku,"000124");
  assert.equal("cantidadCarga" in r[0],false);
});
test("valida un borrador positivo pero no confirma disponibilidad de stock",()=>{
  const rows=ubicacionesEnCargas(articulosDeCargas(cargas,"COR_01_COR"));
  const ok=validarVistaPreviaMovimiento({origenKey:"000124|A02-P01",destino:"B10-P09",cantidad:"3,5"},rows);
  assert.equal(ok.ok,true);assert.equal(ok.propuesta.cantidad,3.5);
  assert.equal(ok.propuesta.referencia,"000124");assert.match(ok.propuesta.advertencia,/BORRADOR LOCAL/);
});
test("rechaza origen desconocido, mismo destino, cantidades cero, negativas o inyectadas",()=>{
  const rows=ubicacionesEnCargas(articulosDeCargas(cargas,"COR_01_COR"));
  for(const v of ["0","-1","1e5","1000000","3.0000","<script>",""]){
    assert.equal(validarVistaPreviaMovimiento({origenKey:"000124|A02-P01",destino:"B02",cantidad:v},rows).ok,false,v);
  }
  assert.equal(validarVistaPreviaMovimiento({origenKey:"NO|Z01",destino:"B02",cantidad:"1"},rows).ok,false);
  assert.equal(validarVistaPreviaMovimiento({origenKey:"000124|A02-P01",destino:"A02-P01",cantidad:"1"},rows).ok,false);
  assert.equal(validarVistaPreviaMovimiento({origenKey:"000124|A02-P01",destino:"<b>x</b>",cantidad:"1"},rows).ok,false);
});
test("la capa de consulta solamente reutiliza RPC autorizadas y nunca escribe ni cambia relojes",()=>{
  const app=read("src/app.mjs");
  const start=app.indexOf("async function refrescarArticulosCargas()");
  const end=app.indexOf('$("backFromPreparacionArticulos")',start);
  const block=app.slice(start,end);
  assert.ok(start>0&&end>start);
  assert.match(block,/kontrola_panel_cargas_v2/);
  assert.match(block,/kontrola_codigos_archivados/);
  assert.match(block,/validRequest\(warehouse,userId\)/);
  assert.match(block,/serial!==articulosSerial/);
  assert.doesNotMatch(block,/[.]insert\(|[.]update\(|[.]upsert\(|[.]delete\(|kontrola_iniciar_preparacion|kontrola_finalizar_preparacion|kontrola_iniciar_verificacion|startPreparationClock/);
  assert.match(app,/articulosSerial\+\+/);
  assert.match(app,/articulosWarehouse=null/);
  assert.match(app,/\$\("movimientoOrigenArticulo"\)\.replaceChildren\(\)/);
  assert.match(app,/\$\("articulosBuscar"\)\.value=""/);
});
test("la interfaz conserva las tres acciones, controles accesibles, mensajes y limpieza por sesión",()=>{
  const html=read("index.html"),app=read("src/app.mjs"),sw=read("sw.js");
  for(const id of ["articulosBuscar","articulosActualizar","articulosResultados","articulosEstado",
    "movimientoOrigenArticulo","movimientoDestino","movimientoCantidad","movimientosConsultarOrigenes","movimientosVistaPrevia","movimientosEstado","movimientosResultado"])
    assert.match(html,new RegExp('id="'+id+'"'));
  assert.match(html,/cantidades son de la carga|cantidades son de la carga/i);
  assert.match(html,/no registra, confirma ni ejecuta movimientos/);
  assert.match(app,/articulosCargas=\[\];origenesMovimientos=\[\];articulosWarehouse=null;articulosSerial\+\+/);
  assert.match(sw,/kontrola-integral-visura-v081-prepara-submenu-0345/);
  assert.match(sw,/\.\/src\/prepara-consulta\.mjs/);
});
