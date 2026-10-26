import test from "node:test";
import assert from "node:assert/strict";
import {filtrarHistorial,resumenHistorial,formatoFechaCarga,csvHistorial,htmlResumenHistorial} from "../src/history.mjs";

const rows=[
  {codigo:"LP26-001",fecha:"2026-10-25",estado:"publicada",peso_kg:120,referencias:3,incidencias_pendientes:0,ruta:"R1",repartidor:"Jose",matricula:"1234ABC"},
  {codigo:"LP26-002",fecha:"2026-10-24",estado:"cerrada",peso_kg:80,referencias:2,incidencias_pendientes:1,ruta:"R2",repartidor:"Ana",matricula:"2345DEF"},
  {codigo:"LP26-003",fecha:null,estado:"preparada",peso_kg:null,referencias:null,incidencias_pendientes:null,ruta:null,repartidor:null,matricula:null},
  {codigo:"LP26-004",fecha:"2026-10-25",estado:"cerrada",peso_kg:150,referencias:6,incidencias_pendientes:2,ruta:"R1",repartidor:"ANA",matricula:"3456GHI"}
];

test("Ordena fecha descendente y peso, colocando al final las cargas sin fecha",()=>{
  const snapshot=rows.slice();
  assert.deepEqual(filtrarHistorial(rows).map(r=>r.codigo),["LP26-004","LP26-001","LP26-002","LP26-003"]);
  assert.deepEqual(rows,snapshot,"La búsqueda nunca debe reordenar datos originales");
});
test("Filtra fecha, estado y texto combinados sin corregir silenciosamente los filtros",()=>{
  assert.deepEqual(filtrarHistorial(rows,{fecha:"2026-10-25",estado:"cerrada",busqueda:"r1"}).map(r=>r.codigo),["LP26-004"]);
  assert.deepEqual(filtrarHistorial(rows,{fecha:"2026-10-25"}).map(r=>r.codigo),["LP26-004","LP26-001"]);
  assert.deepEqual(filtrarHistorial(rows,{estado:"cerrada"}).map(r=>r.codigo),["LP26-004","LP26-002"]);
  assert.deepEqual(filtrarHistorial(rows,{busqueda:"aNa"}).map(r=>r.codigo),["LP26-004","LP26-002"]);
  assert.deepEqual(filtrarHistorial(rows,{busqueda:"2345deF"}).map(r=>r.codigo),["LP26-002"]);
  assert.deepEqual(filtrarHistorial(rows,{fecha:"2026-10-22"}),[]);
});
test("Suma únicamente las filas filtradas y no convierte datos ausentes en NaN",()=>{
  assert.deepEqual(resumenHistorial(rows),{cargas:4,pesoKg:350,referencias:11,cerradas:2,incidencias:3});
  assert.deepEqual(resumenHistorial(filtrarHistorial(rows,{estado:"cerrada"})),
    {cargas:2,pesoKg:230,referencias:8,cerradas:2,incidencias:3});
  assert.deepEqual(resumenHistorial([{peso_kg:"???",referencias:"mal",incidencias_pendientes:"NaN"}]),
    {cargas:1,pesoKg:0,referencias:0,cerradas:0,incidencias:0});
  assert.deepEqual(resumenHistorial([]),{cargas:0,pesoKg:0,referencias:0,cerradas:0,incidencias:0});
});
test("Fecha mostrada como día/mes/año sin desfase horario",()=>{
  assert.equal(formatoFechaCarga("2026-10-25"),"25/10/2026");
  assert.equal(formatoFechaCarga(null),"Sin fecha");
});

test("CSV incluye BOM, separador español, encabezados y solo las filas seleccionadas",()=>{
  const filtered=filtrarHistorial(rows,{estado:"cerrada"});
  const csv=csvHistorial(filtered,"COR_01_COR");
  assert.ok(csv.startsWith("\uFEFF"));
  assert.match(csv,/"Almacén";"Código";"Fecha de carga";"Estado"/);
  assert.match(csv,/"COR_01_COR";"LP26-004"/);
  assert.doesNotMatch(csv,/LP26-001/);
  assert.equal(csv.split("\r\n").length,4);
});
test("CSV neutraliza fórmulas maliciosas, comillas y saltos de línea",()=>{
  const csv=csvHistorial([{
    codigo:'=WEBSERVICE("https://example.test")',
    ruta:'-1+2',repartidor:'  @SUM(1;2)',matricula:'"+1',
    estado:'a";"b',fecha:"2026-10-25",peso_kg:0
  }],"COR_01_COR");
  assert.match(csv,/'=WEBSERVICE\(""https:\/\/example\.test""\)/);
  assert.match(csv,/"'-1\+2"/);
  assert.match(csv,/"'  @SUM\(1;2\)"/);
  assert.match(csv,/"a"";""b"/);
});
test("Informe imprimible escapa texto no confiable y respeta filtros recibidos",()=>{
  const html=htmlResumenHistorial([{
    codigo:'<img src=x onerror=alert(1)>',ruta:"R&L",estado:"publicada",
    fecha:"2026-10-25",repartidor:"<Operario>",matricula:'"1234"',
    peso_kg:150,referencias:3,incidencias_pendientes:0
  }],{almacen:"COR_01_COR",busqueda:"<script>"});
  assert.doesNotMatch(html,/<img|<script>/);
  assert.match(html,/&lt;img/);
  assert.match(html,/R&amp;L/);
  assert.match(html,/&lt;Operario&gt;/);
  assert.match(html,/&lt;script&gt;/);
  assert.match(html,/Resumen de cargas/);
});
