import test from "node:test";
import assert from "node:assert/strict";
import {buildFixedXlsx} from "../src/fixed-position-xlsx.mjs";

// Lector ZIP independiente (método stored): comprueba integridad mínima del paquete OOXML.
function readZip(bytes){
  assert.equal(bytes[0],0x50);assert.equal(bytes[1],0x4b);
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const decoder=new TextDecoder(),files=new Map();
  let off=0;
  while(off<bytes.length&&view.getUint32(off,true)===0x04034b50){
    const method=view.getUint16(off+8,true);
    const compressed=view.getUint32(off+18,true);
    const n=view.getUint16(off+26,true),extra=view.getUint16(off+28,true);
    const path=decoder.decode(bytes.slice(off+30,off+30+n));
    const start=off+30+n+extra;
    assert.equal(method,0,"No se permite compresión imprevista");
    assert.ok(start+compressed<=bytes.length);
    files.set(path,decoder.decode(bytes.slice(start,start+compressed)));
    off=start+compressed;
  }
  assert.ok(files.has("[Content_Types].xml"));
  assert.ok(files.has("_rels/.rels"));
  assert.ok(files.has("xl/workbook.xml"));
  assert.ok(files.has("xl/_rels/workbook.xml.rels"));
  assert.ok(files.has("xl/worksheets/sheet1.xml"));
  assert.ok(files.has("xl/worksheets/sheet2.xml"));
  const eocd=bytes.length-22;
  assert.equal(view.getUint32(eocd,true),0x06054b50);
  assert.equal(view.getUint16(eocd+10,true),6);
  assert.equal(view.getUint32(eocd+16,true),off);
  return files;
}
const meta={sourceFile:"BC_ORIGEN.xlsx",importedAt:"2026-10-27T12:00:00Z",stale:false};
const report={warehouse:"COR_01_COR",meta,complete:true};
const row={category:"negativo",code:"PRD001",description:"Artículo sin riesgo",
  warehouse:"COR_01_COR",location:"P01",aisle:"P",zone:"Z1",
  positionQuantity:"-2.5",warehouseQuantity:"8",otherQuantity:"10.5",
  unit:"UD",replenishment:false,source:meta.sourceFile,importedAt:meta.importedAt,
  reason:"Existencia negativa",locations:[{location:"R01",quantity:"10.5"}]};
test("XLSX estándar con dos hojas y metadatos",()=>{
  const file=readZip(buildFixedXlsx({report,rows:[row],generatedAt:"2026-10-27T13:00:00Z"}));
  assert.match(file.get("xl/workbook.xml"),/name="Resumen"/);
  assert.match(file.get("xl/workbook.xml"),/name="Incidencias"/);
  const summary=file.get("xl/worksheets/sheet1.xml");
  const details=file.get("xl/worksheets/sheet2.xml");
  assert.match(summary,/BC_ORIGEN\.xlsx/);
  assert.match(summary,/2026-10-27T12:00:00Z/);
  assert.match(details,/Artíc[u]?lo sin riesgo/);
  assert.match(details,/<c r="H2"><v>-2\.5<\/v><\/c>/);
  assert.match(details,/<c r="I2"><v>8<\/v><\/c>/);
  assert.match(details,/<c r="J2"><v>10\.5<\/v><\/c>/);
  assert.match(details,/R01: 10\.5/);
});
test("XLSX evita inyección y conserva decimales exactos largos como texto",()=>{
  const malicious={...row,code:"=HYPERLINK(\"https://ejemplo\")",
    description:"<script>ataque</script> & compra",
    positionQuantity:"-123456789012.123456"};
  const data=readZip(buildFixedXlsx({report,rows:[malicious]})).get("xl/worksheets/sheet2.xml");
  assert.doesNotMatch(data,/<f>/);
  assert.match(data,/<c r="B2" t="inlineStr">/);
  assert.match(data,/=HYPERLINK\(&quot;https:\/\/ejemplo&quot;\)/);
  assert.match(data,/&lt;script&gt;ataque&lt;\/script&gt; &amp; compra/);
  assert.match(data,/<c r="H2" t="inlineStr"><is><t xml:space="preserve">-123456789012\.123456<\/t>/);
});
test("XLSX exporta todo el filtro sin límite de paginación visual",()=>{
  const many=Array.from({length:1208},(_,n)=>({
    ...row,code:"IT"+String(n).padStart(5,"0"),location:"P"+String(n).padStart(5,"0")
  }));
  const doc=readZip(buildFixedXlsx({report,rows:many,filters:{search:"IT"}}));
  const sheet=doc.get("xl/worksheets/sheet2.xml");
  assert.match(sheet,/IT00000/);
  assert.match(sheet,/IT01207/);
  assert.match(sheet,/dimension ref="A1:P1209"/);
  assert.equal((sheet.match(/<row r="/g)||[]).length,1209);
});
test("XLSX mantiene nombre/almacén/origen escapados y no contiene macros",()=>{
  const data=buildFixedXlsx({report:{warehouse:"COR&01",meta:{...meta,sourceFile:"<archivo>.xlsx"},
    complete:false},rows:[]});
  const file=readZip(data);
  assert.match(file.get("xl/worksheets/sheet1.xml"),/COR&amp;01/);
  assert.match(file.get("xl/worksheets/sheet1.xml"),/&lt;archivo&gt;\.xlsx/);
  assert.ok(![...file.keys()].some(x=>/vba|macro/i.test(x)));
  assert.match(file.get("xl/worksheets/sheet2.xml"),/dimension ref="A1:P1"/);
});
test("XLSX no inventa stock y es validado antes de generar",()=>{
  const sheet=readZip(buildFixedXlsx({report,rows:[{...row,positionQuantity:null}]}))
    .get("xl/worksheets/sheet2.xml");
  assert.match(sheet,/SIN DATOS/);
  assert.throws(()=>buildFixedXlsx({report:null,rows:[row]}),/origen/);
  assert.throws(()=>buildFixedXlsx({report,rows:null}),/origen/);
});
