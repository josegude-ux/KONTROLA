#!/usr/bin/env node
// Auditoría frontend estática SIN integrar ramas, Sin acceso a red, bases ni navegador.
// Analiza únicamente blobs Git con SHA fijados; no escribe cambios de producto.
import {execFileSync} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import {SOURCES} from "./preflight-b01.mjs";
const git=(...a)=>execFileSync("git",a,{encoding:"utf8",maxBuffer:16*1024*1024});
export const collectIds=source=>[...String(source||"").matchAll(/\bid=["']([\w:-]+)["']/g)].map(x=>x[1]);
export const imports=source=>[...String(source||"").matchAll(/\bfrom\s+["'](\.\/[^"']+)["']/g)].map(x=>x[1]);
export const difference=(a,b)=>[...new Set(a)].filter(x=>!new Set(b).has(x)).sort();
export const scan=(s,terms)=>terms.every(x=>String(s||"").includes(x));
export const CONTRACTS=[
 {label:"Preparación/Verificación independientes",path:"src/app.mjs",terms:["parallel-workflows.mjs"],owner:"responsive"},
 {label:"Matriz de pasillos",path:"src/app.mjs",terms:["renderAisleMatrix","aisle-matrix.mjs"],owner:"responsive"},
 {label:"Impresión A4 compacta",path:"index.html",terms:['id="downloadCompactA4"'],owner:"responsive"},
 {label:"Impresión COR 1",path:"src/admin.mjs",terms:["printCor1Bundle"],owner:"responsive"},
 {label:"Previsualización COR 2",path:"src/admin.mjs",terms:["showCor2Detail"],owner:"responsive"},
 {label:"Amplitud real de escritorio",path:"styles.css",terms:["max-width:1480px","@media screen and (min-width:1100px)"],owner:"responsive"},
 {label:"Bandeja de provisionales privados",path:"src/admin.mjs",terms:["storeProvisionalPdf","refreshProvisionalDrafts"],owner:"documental"},
 {label:"Corrección de cantidades con evidencia",path:"src/admin.mjs",terms:["quantity-correction-form"],owner:"documental"},
 {label:"Listado de cargas anteriores",path:"src/admin.mjs",terms:["refreshOldLoads"],owner:"documental"},
 {label:"Cambio de contraseña individual",path:"index.html",terms:['id="choosePasswordForm"','id="ownPasswordConfirm"'],owner:"documental"}
];

export function analyze(sources){
 const lines=["parallel","responsive","documental"];
 const ids={},invalid=[],matches={};
 for(const lane of lines){
  const html=sources[lane]["index.html"];
  ids[lane]=collectIds(html);
  const dup=ids[lane].filter((id,index)=>ids[lane].indexOf(id)!==index);
  if(dup.length)invalid.push({line:lane,type:"duplicate-html-id",values:[...new Set(dup)]});
  // Element lookups in app are part of a fragile, high-value DOM contract.
  const used=[...String(sources[lane]["src/app.mjs"]||"").matchAll(/\$\(["']([\w:-]+)["']\)/g)].map(x=>x[1]);
  const unresolved=difference(used,ids[lane]);
  if(unresolved.length)invalid.push({line:lane,type:"app-dom-reference-missing",values:unresolved});
  const pathFiles=new Set(Object.keys(sources[lane]));
  const wanted=imports(sources[lane]["src/app.mjs"]);
  const unresolvedImports=wanted.filter(x=>!pathFiles.has("src/"+x.slice(2)));
  if(unresolvedImports.length)invalid.push({line:lane,type:"app-import-not-provided-to-audit",values:unresolvedImports});
 }
 for(const contract of CONTRACTS){
  matches[contract.label]=Object.fromEntries(lines.map(lane=>[lane,scan(sources[lane][contract.path],contract.terms)]));
 }
 const missing=CONTRACTS.filter(x=>!matches[x.label][x.owner]);
 const gaps=CONTRACTS.filter(x=>!lines.every(l=>matches[x.label][l]));
 return {ids,invalid,matches,missing,gaps};
}
export function asMarkdown(data){
 const {ids,invalid,matches,missing,gaps}=data;
 const lines=[
  "# VISURA PREPARA — inventario de conservación frontend (Bloque 01)",
  "",
  "**NO INTEGRADO. Auditoría por lectura de tres líneas divergentes; NO se ha efectuado merge ni combinación de frontend.**",
  "",
  "El resultado SUCCESS únicamente prueba presencia de contratos en sus ramas de origen, referencias DOM y ausencia de errores observados en el inventario, nunca ejecución de interfaz combinada.",
  "",
  "## Contratos y pérdidas potenciales",
  "",
  "| Función protegida | Línea paralela | Línea responsive | Línea documental |",
  "|---|---|---|---|",
  ...CONTRACTS.map(c=>[c.label,...["parallel","responsive","documental"].map(k=>matches[c.label][k]?"Presente":"Ausente")].join(" | ").replace(/^/,"| ").concat(" |")),
  "",
  "## IDs HTML exclusivos que se perderían al escoger una rama",
  "",
  "**Solo línea documental:** "+difference(ids.documental,ids.parallel).join(", "),
  "",
  "**Solo línea paralela:** "+difference(ids.parallel,ids.documental).join(", "),
  "",
  "## Diagnóstico",
  "",
  "Contratos no localizados en su rama responsable: "+missing.length+".",
  "Contratos que no coexisten en todas las ramas: "+gaps.length+".",
  "Referencias DOM duplicadas/incoherentes en las ramas inspeccionadas: "+invalid.length+".",
  "",
  ...invalid.map(x=>"- "+x.line+" · "+x.type+": "+x.values.join(", ")),
  "",
  "## Riesgos y siguientes pruebas",
  "",
  "- Conservar funciones del menú, matrices de pasillos, A4 por almacén y vistas de impresión de la línea paralela/responsive.",
  "- Conservar funciones de provisionales, correcciones auditadas, históricos y contraseñas de la línea documental.",
  "- Preservar CSS adaptable y comprobar la coexistencia con formularios y bandejas documentales.",
  "- Una prueba E2E de la interfaz combinada requiere fase posterior autorizada: este informe no simula DOM fusionado ni verifica RLS en navegador.",
  "- Antes de integración, contrastar funciones JavaScript, HTML, CSS, PWA, scripts y documentación; no seleccionar archivos enteros de una rama.",
  "- No alterar Bloque 02, Business Central, picking, permisos empresariales ni producción."
 ];
 return lines.join("\n")+"\n";
}
export function run(){
 const snapshots={};
 const paths=["index.html","styles.css","src/app.mjs","src/admin.mjs"];
 for(const [lane,meta] of Object.entries(SOURCES)){
  const sha=git("rev-parse","refs/remotes/origin/"+meta.branch).trim();
  if(sha!==meta.sha)throw Error("SHA ha cambiado "+lane+": "+sha+"; reauditar.");
  snapshots[lane]={};
  for(const path of paths)snapshots[lane][path]=git("show",sha+":"+path);
  // Los módulos del app deben existir en su rama, no solo estar mencionados.
  for(const relative of imports(snapshots[lane]["src/app.mjs"])){
   try{git("cat-file","-e",sha+":src/"+relative.slice(2));}
   catch(e){throw Error("Import no resoluble "+lane+" "+relative);}
  }
 }
 // El analizador recibe todos los imports como entradas conocidas.
 for(const lane of Object.keys(snapshots)){
  for(const relative of imports(snapshots[lane]["src/app.mjs"])){
   snapshots[lane]["src/"+relative.slice(2)]="exists";
  }
 }
 const info=analyze(snapshots);
 if(info.invalid.length||info.missing.length)throw Error("Incidencia en contrato origen: "+JSON.stringify({invalid:info.invalid,missing:info.missing}));
 mkdirSync("artifacts",{recursive:true});
 writeFileSync("artifacts/preflight-b01-frontend.md",asMarkdown(info));
 writeFileSync("artifacts/preflight-b01-frontend.json",JSON.stringify({state:"FRONTEND_NOT_INTEGRATED",contracts:info.matches,gaps:info.gaps.map(x=>x.label),exclusiveIds:{documental:difference(info.ids.documental,info.ids.parallel),parallel:difference(info.ids.parallel,info.ids.documental)}},null,2));
 console.log(asMarkdown(info));
 console.log("KONTROLA_FRONTEND_INVENTORY_OK NOT_INTEGRATED");
}
if(process.argv[1]?.endsWith("/preflight-b01-frontend.mjs"))run();
