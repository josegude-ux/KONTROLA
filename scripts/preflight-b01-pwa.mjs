#!/usr/bin/env node
// Inventario de PWA/Service Worker por ramas. SOLO git show/cat-file, no despliegue.
import {execFileSync} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import {SOURCES} from "./preflight-b01.mjs";
const git=(...args)=>execFileSync("git",args,{encoding:"utf8",maxBuffer:8*1024*1024});

export function parseServiceWorker(source){
 const match=source.match(/const CACHE="([^"]+)";const ASSETS=(\[[^\n;]+\]);/);
 if(!match)throw Error("SW no presenta const CACHE/ASSETS JSON conocidos");
 const assets=JSON.parse(match[2]);
 if(!Array.isArray(assets)||!assets.every(x=>typeof x==="string"))throw Error("Assets PWA mal definidos");
 return {cache:match[1],assets};
}
export function classifyBuildAssets(missing,buildSource,pagesWorkflow){
 const buildReady=pagesWorkflow.includes("npm run build:vendor")
   &&pagesWorkflow.includes("cp -R src assets vendor dist/");
 const generated=[],absent=[];
 for(const path of missing){
  if(buildReady&&buildSource.includes('outfile:"'+path+'"'))generated.push(path);
  else absent.push(path);
 }
 return {generated,absent};
}
export function comparePwa(a,b){
 const sameCache=a.cache===b.cache;
 const sameVersion=a.version===b.version;
 const modified=["index.html","styles.css","src/app.mjs","src/admin.mjs"].filter(path=>a.blobs[path]!==b.blobs[path]);
 return {sameCache,sameVersion,modified,offlineRefreshRisk:sameCache&&modified.length>0};
}
export function report(snapshots){
 const rows=Object.entries(snapshots);
 const pairs=[
  ["parallel","responsive"],
  ["responsive","documental"],
  ["parallel","documental"]
 ];
 const checks=pairs.map(([left,right])=>({left,right,...comparePwa(snapshots[left],snapshots[right])}));
 const lines=[
  "# VISURA PREPARA B01 — preflight PWA por ramas",
  "",
  "**NO INTEGRADO: solo lectura de Git. No se actualizó ninguna PWA ni se publicó SW.**",
  "",
  "| Rama | version.json | Nombre caché SW | Assets precargados | Generados durante compilación | Ausentes sin generación conocida |",
  "|---|---|---|---:|---:|---:|",
  ...rows.map(([lane,v])=>"| "+lane+" | "+v.version+" | "+v.cache+" | "+v.assets.length+" | "+v.generated.length+" | "+v.missing.length+" |"),
  "",
  "## Posibles diferencias de caché entre ramas",
  "",
  "| Comparación | Caché idéntica | Versión visible idéntica | Archivos UI diferentes | Riesgo de actualización offline |",
  "|---|---|---|---|---|",
  ...checks.map(c=>"| "+c.left+" / "+c.right+" | "+(c.sameCache?"Sí":"No")+" | "+(c.sameVersion?"Sí":"No")+" | "+(c.modified.join(", ")||"ninguno")+" | "+(c.offlineRefreshRisk?"Revisar":"No marcado")+" |"),
  "",
  "## Recomendaciones de integración futura",
  "",
  "- No seleccionar un sw.js completo sin comparar con las funciones realmente presentes en la app integrada.",
  "- Alinear las rutas ASSETS, el identificador CACHE y version.json a la versión real aprobada, sin adelantar versiones productivas.",
  "- Validar instalación, modo offline y actualización desde una versión antigua en iPhone/Android/escritorio con permiso de pruebas.",
  "- La estrategia actual consulta red antes de caché; un token igual con HTML/CSS distintos no prueba por sí solo un error online, pero puede afectar recargas offline y actualizaciones.",
  "- No modificar almacenes locales, cookies, contraseñas o documentos del usuario al actualizar.",
  "- Sin merge, sin despliegue, sin BC/Supabase real. Bloque 02 fuera del alcance."
 ];
 for(const [lane,v] of rows){
  if(v.generated.length)lines.push("**Recursos configurados para generarse en build de "+lane+":** "+v.generated.join(", ")+". No están versionados, pero el workflow Pages incluye build:vendor antes de copiar vendor. Este inventario no sustituye probar la compilación.");
  if(v.missing.length)lines.push("**Recursos de "+lane+" sin archivo ni generación de build reconocida:** "+v.missing.join(", "));
 }
 return {text:lines.join("\n")+"\n",checks};
}
export function run(){
 const snapshots={};
 for(const [lane,meta] of Object.entries(SOURCES)){
  const sha=git("rev-parse","refs/remotes/origin/"+meta.branch).trim();
  if(sha!==meta.sha)throw Error("Rama "+lane+" cambió HEAD; abortar auditoría.");
  const sw=git("show",sha+":sw.js"),info=parseServiceWorker(sw);
  const version=JSON.parse(git("show",sha+":version.json")).version;
  const blobs={};
  for(const path of ["index.html","styles.css","src/app.mjs","src/admin.mjs"]){
   blobs[path]=git("rev-parse",sha+":"+path).trim();
  }
  const missing=[];
  for(const asset of info.assets){
   if(asset==="./")continue;
   const path=asset.startsWith("./")?asset.slice(2):asset;
   try{git("cat-file","-e",sha+":"+path);}
   catch{missing.push(path);}
  }
  const buildSource=git("show",sha+":scripts/build-vendor.mjs");
  const pagesWorkflow=git("show",sha+":.github/workflows/pages.yml");
  const classified=classifyBuildAssets(missing,buildSource,pagesWorkflow);
  snapshots[lane]={...info,version,blobs,missing:classified.absent,generated:classified.generated};
 }
 const result=report(snapshots);
 mkdirSync("artifacts",{recursive:true});
 writeFileSync("artifacts/preflight-b01-pwa.md",result.text);
 writeFileSync("artifacts/preflight-b01-pwa.json",JSON.stringify({
  state:"PWA_BRANCHES_NOT_INTEGRATED",snapshots,checks:result.checks
 },null,2));
 console.log(result.text);
 if(Object.values(snapshots).some(x=>x.missing.length)){
  console.warn("KONTROLA_PWA_AUDIT_WARNING: falta alguno de los recursos precargados.");
 }
 console.log("KONTROLA_B01_PWA_INVENTORY_OK NOT_INTEGRATED");
}
if(process.argv[1]?.endsWith("/preflight-b01-pwa.mjs"))run();
