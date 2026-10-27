import test from "node:test";
import assert from "node:assert/strict";
import {parseServiceWorker,comparePwa,report,classifyBuildAssets} from "../scripts/preflight-b01-pwa.mjs";

test("parsea caché y recursos precargados de manera determinista",()=>{
 const sw='const CACHE="kontrola-v1";const ASSETS=["./","./index.html","./styles.css"];';
 assert.deepEqual(parseServiceWorker(sw),{cache:"kontrola-v1",assets:["./","./index.html","./styles.css"]});
 assert.throws(()=>parseServiceWorker('const CACHE="x"'),/CACHE/);
});
test("identifica riesgos cuando cambian recursos con el mismo token de caché",()=>{
 const a={cache:"v1",version:"0.3",blobs:{"index.html":"a","styles.css":"old","src/app.mjs":"b","src/admin.mjs":"c"}};
 const b={...a,blobs:{...a.blobs,"styles.css":"new"}};
 const result=comparePwa(a,b);
 assert.equal(result.sameCache,true);
 assert.equal(result.offlineRefreshRisk,true);
 assert.deepEqual(result.modified,["styles.css"]);
});
test("la auditoría deja claro que no acredita la PWA integrada",()=>{
 const x={cache:"v1",version:"0.3",assets:["./"],missing:[],blobs:{"index.html":"a","styles.css":"b","src/app.mjs":"c","src/admin.mjs":"d"}};
 const r=report({parallel:x,responsive:x,documental:{...x,cache:"v2"}});
 assert.match(r.text,/NO INTEGRADO/);
 assert.match(r.text,/sin despliegue/);
 assert.equal(r.checks.length,3);
});

test("reconoce archivo no versionado como generado solo si Pages compila antes de copiar",()=>{
 const build='await build({outfile:"vendor/pdf-lib.min.mjs"});';
 const pages='npm run build:vendor\ncp -R src assets vendor dist/';
 assert.deepEqual(classifyBuildAssets(["vendor/pdf-lib.min.mjs","assets/ausente.svg"],build,pages),{
  generated:["vendor/pdf-lib.min.mjs"],absent:["assets/ausente.svg"]
 });
 assert.deepEqual(classifyBuildAssets(["vendor/pdf-lib.min.mjs"],build,"cp -R src assets vendor dist/"),{
  generated:[],absent:["vendor/pdf-lib.min.mjs"]
 });
});
