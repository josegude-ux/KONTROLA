import test from "node:test";
import assert from "node:assert/strict";
import {collectIds,imports,difference,CONTRACTS,analyze,asMarkdown} from "../scripts/preflight-b01-frontend.mjs";

const mk=()=>{
 const a={};
 for(const lane of ["parallel","responsive","documental"]){
  a[lane]={"index.html":'<button id="startPreparation"></button>',"styles.css":"","src/app.mjs":'$("startPreparation");',"src/admin.mjs":""};
  for(const contract of CONTRACTS){
   if(lane===contract.owner||(lane==="parallel"&&contract.owner==="responsive")){
    a[lane][contract.path]+="\n"+contract.terms.join(" ");
   }
  }
 }
 return a;
};

test("HTML IDs y referencias de import se extraen sin mutar la fuente",()=>{
 assert.deepEqual(collectIds('<p id="one"></p><span id=\'two\'></span>'),["one","two"]);
 assert.deepEqual(imports('import {a} from "./a.mjs"; import b from "./b.mjs";'),["./a.mjs","./b.mjs"]);
 assert.deepEqual(difference(["a","a","b"],["b"]),["a"]);
});
test("orígenes conservan contratos, pero no certifica frontend combinado",()=>{
 const snapshots=mk();
 const {invalid,missing,gaps}=analyze(snapshots);
 assert.equal(invalid.length,0);
 assert.equal(missing.length,0);
 assert.ok(gaps.length>=3);
 const report=asMarkdown(analyze(snapshots));
 assert.match(report,/NO INTEGRADO/);
 assert.match(report,/Matriz de pasillos/);
 assert.match(report,/Bandeja de provisionales privados/);
 assert.match(report,/NO se ha efectuado merge/);
});
test("detecta DOM duplicado y JS que referencia nodo inexistente",()=>{
 const snapshots=mk();
 snapshots.documental["index.html"]+='<div id="startPreparation"></div>';
 snapshots.documental["src/app.mjs"]+='\n$("nonexistent");';
 const result=analyze(snapshots);
 assert.equal(result.invalid.length,2);
 assert.ok(result.invalid.some(x=>x.type==="duplicate-html-id"));
 assert.ok(result.invalid.some(x=>x.type==="app-dom-reference-missing"&&x.values.includes("nonexistent")));
});
test("detecta desaparición de una función aprobada en su propia rama",()=>{
 const snapshots=mk();
 snapshots.responsive["src/admin.mjs"]="";
 const result=analyze(snapshots);
 assert.ok(result.missing.some(c=>c.label==="Impresión COR 1"));
});
