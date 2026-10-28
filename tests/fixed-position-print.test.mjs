import test from "node:test";
import assert from "node:assert/strict";
import {classifyFixedPositions,filterFixedRows,fixedReportCsv,safeCsvCell} from "../src/fixed-position-report.mjs";
import {buildFixedPrintHtml} from "../src/fixed-position-print.mjs";

const meta={authorized:true,warehouse:"COR_01_COR",stockComplete:true,catalogComplete:true,
  positionsComplete:true,locationsComplete:true,absentStockIsZero:false,sourceFile:"BC-completo.xlsx",
  importedAt:"2026-10-27T10:00:00Z",truncated:false,stale:false};
const products=[{code:"A1",description:"Artículo <script>alert(1)</script>",unit:"UD"},
  {code:"B2",description:"Segundo artículo",unit:"UD"}];
const fixed=[{product_code:"A1",location_code:"A01-P01"},
  {product_code:"B2",location_code:"B01-P01"}];
const stock=[{product_code:"A1",location_code:"A01-P01",lot:"L1",quantity:"0"},
  {product_code:"A1",location_code:"R01-P01",lot:"L1",quantity:"20"},
  {product_code:"B2",location_code:"B01-P01",lot:"L1",quantity:"-2"}];
const locations=[...new Set([...fixed.map(x=>x.location_code),...stock.map(x=>x.location_code)])].map(code=>({code}));
const report=classifyFixedPositions({warehouse:"COR_01_COR",products,fixed,stock,locations,meta});
test("A4 apaisado con resumen, categorías, fuente, fechas y observaciones",()=>{
  const html=buildFixedPrintHtml({report,rows:report.rows,filters:{category:"todos"},generatedAt:"2026-10-27T16:00:00Z"});
  assert.match(html,/@page\{size:A4 landscape/);
  assert.match(html,/BC-completo\.xlsx/);
  assert.match(html,/2026-10-27T10:00:00Z/);
  assert.match(html,/Control de posiciones fijas/);
  assert.match(html,/Posiciones fijas con stock cero/);
  assert.match(html,/Posiciones fijas con stock negativo/);
  assert.match(html,/Observaciones:/);
  assert.match(html,/Página 2 de 2/);
  assert.match(html,/Página 1 de 2/);
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
  assert.match(html,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
});
test("sin fija muestra ubicaciones reales en impresión",()=>{
  const source=classifyFixedPositions({warehouse:"COR_01_COR",products:[{code:"SIN",description:"Sin fija",unit:"UD"}],
    fixed:[],stock:[{product_code:"SIN",location_code:"R01-P01",lot:"L1",quantity:"3"}],
    locations:[{code:"R01-P01"}],meta});
  const html=buildFixedPrintHtml({report:source,rows:source.rows});
  assert.match(html,/R01-P01: 3/);
  assert.match(html,/SIN POSICIÓN FIJA/);
});
test("impresión de gran volumen mantiene más de mil líneas, paginación completa y sin recortes",()=>{
  const many=Array.from({length:1207},(_,i)=>({
    code:"A"+String(i).padStart(5,"0"),description:"Ejemplo",unit:"UD",warehouse:"COR_01_COR",
    location:null,aisle:"",zone:"",category:"sin_fija",reason:"Sin fija",
    positionQuantity:null,warehouseQuantity:"0",otherQuantity:"0",
    source:"BC.xlsx",importedAt:meta.importedAt,locations:[]
  }));
  const html=buildFixedPrintHtml({report,rows:many,pageSize:18});
  assert.match(html,/A01206/);
  assert.match(html,/Página 68 de 68/);
  assert.equal((html.match(/<tr><td>A\d{5}<\/td>/g)||[]).length,1207);
});
test("imprimir sólo categorías filtradas, sin duplicarlas",()=>{
  const zeros=filterFixedRows(report.rows,{category:"cero"});
  const html=buildFixedPrintHtml({report,rows:zeros,filters:{category:"cero"}});
  assert.match(html,/A1/);
  assert.doesNotMatch(html,/B2<\/td>/);
  assert.match(html,/Página 1 de 1/);
});
test("no se ejecuta HTML introducido en descripción, lote o nombre de Excel",()=>{
  const evil={...report,meta:{...meta,sourceFile:"<img src=x onerror=alert(1)>"}};
  const html=buildFixedPrintHtml({report:evil,rows:report.rows});
  assert.doesNotMatch(html,/<img src=x onerror=alert/);
  assert.match(html,/&lt;img src=x onerror=alert/);
  assert.doesNotMatch(html,/<script>alert\(1\)<\/script>/);
});
test("la falta de filas imprime documento de cero incidencias",()=>{
  const html=buildFixedPrintHtml({report,rows:[]});
  assert.match(html,/Sin incidencias en los filtros aplicados/);
  assert.match(html,/Página 1 de 1/);
});
test("no se acepta paginación inválida",()=>{
  assert.throws(()=>buildFixedPrintHtml({report,rows:report.rows,pageSize:0}),/inválido/);
  assert.throws(()=>buildFixedPrintHtml({report:null,rows:report.rows}),/sin origen/);
});
test("CSV conserva números negativos como cantidades interpretables por Excel",()=>{
  const csv=fixedReportCsv(report.rows,{warehouse:"COR_01_COR",sourceFile:"BC.xlsx",importedAt:meta.importedAt,generatedAt:"2026-10-27"});
  assert.match(csv,/"B2";"Segundo artículo";"COR_01_COR";"B01-P01";"B01";"";"-2";"-2";"0";"UD"/);
  assert.equal(safeCsvCell("-SUM(A1)"),"\"'-SUM(A1)\"");
  assert.equal(safeCsvCell("-2",true),"\"-2\"");
  assert.equal(safeCsvCell("=3+4",true),"\"'=3+4\"");
});
test("stock obsoleto genera datos insuficientes aunque el archivo tenga líneas completas",()=>{
  const stale=classifyFixedPositions({warehouse:"COR_01_COR",products,fixed,stock,meta:{...meta,stale:true}});
  assert.equal(stale.byCategory.insuficientes.references,2);
  assert.equal(stale.byCategory.cero.references,0);
  assert.equal(stale.complete,false);
});
