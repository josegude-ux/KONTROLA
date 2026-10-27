#!/usr/bin/env node
// Contratos RPC entre ramas; inspección por SHA, nunca se conecta a Supabase.
import {execFileSync} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";
import {SOURCES} from "./preflight-b01.mjs";
const git=(...args)=>execFileSync("git",args,{encoding:"utf8",maxBuffer:16*1024*1024});
export function rpcNames(js){
 return [...new Set([...String(js||"").matchAll(/\.rpc\(\s*[\x22\x27\x60]([A-Za-z0-9_]+)[\x22\x27\x60]/g)].map(x=>x[1]))].sort();
}
export function summarize(callers){
 const sets=Object.fromEntries(Object.entries(callers).map(([k,s])=>[k,rpcNames(s)]));
 const common=sets.parallel.filter(x=>sets.documental.includes(x));
 const docsOnly=sets.documental.filter(x=>!sets.parallel.includes(x));
 const parallelOnly=sets.parallel.filter(x=>!sets.documental.includes(x));
 return {sets,common,docsOnly,parallelOnly};
}
export const matchesFn=(sql,name)=>new RegExp("create\\s+or\\s+replace\\s+function\\s+public\\."+name+"\\s*\\(","i").test(sql);
export const hasSafeAccess=(sql,name)=>{
 return new RegExp("revoke\\s+all\\s+on\\s+function\\s+public\\."+name+"\\s*\\([^)]*\\)\\s+from\\s+public\\s*,\\s*anon\\s*;","i").test(sql)
  && new RegExp("grant\\s+execute\\s+on\\s+function\\s+public\\."+name+"\\s*\\([^)]*\\)\\s+to\\s+authenticated\\s*;","i").test(sql);
};
export function validateExtraContracts({calls,sql}){
 const names=["kontrola_reservar_provisional_pdf","kontrola_completar_provisional_pdf","kontrola_identificar_provisional_pdf"];
 return names.map(name=>({
  name,inClient:calls.includes(name),
  inProposal:matchesFn(sql,name),
  guardedByGrant:hasSafeAccess(sql,name)
 }));
}
export function report({summary,checks,shas}){
 const lines=[
  "# VISURA PREPARA — contratos RPC entre líneas divergentes",
  "",
  "**NO INTEGRADO: inspección estática sin acceso a Supabase ni ejecución SQL o mutación de ramas.**",
  "",
  "## Fuentes verificadas",
  ...Object.entries(shas).map(([k,sha])=>"- "+k+": "+sha),
  "",
  "## Funciones llamadas desde app/admin",
  "- RPC compartidas: "+summary.common.length+".",
  "- Solo línea documental: "+(summary.docsOnly.join(", ")||"ninguna")+".",
  "- Solo línea paralela: "+(summary.parallelOnly.join(", ")||"ninguna")+".",
  "",
  "| RPC documental adicional | Cliente | Función SQL | REVOKE PUBLIC/anon y GRANT authenticated |",
  "|---|---|---|---|",
  ...checks.map(x=>"| "+x.name+" | "+(x.inClient?"Sí":"NO")+" | "+(x.inProposal?"Sí":"NO")+" | "+(x.guardedByGrant?"Sí":"NO")+" |"),
  "",
  "## Límites importantes",
  "- GRANT a authenticated NO garantiza autorización individual, RLS ni rol administrador. Eso se comprueba con otras pruebas de servidor; no inferirlo aquí.",
  "- Conservar las tres RPC junto a la bandeja de provisionales, hashes, Storage privado y restricciones de publicación.",
  "- Que los clientes mencionen una RPC no demuestra que ambas ramas frontend estén integradas.",
  "- Nada en este análisis autoriza merge, despliegue ni modificación de Business Central o Supabase."
 ];
 return lines.join("\n")+"\n";
}
export function run(){
 const src={},shas={};
 for(const [lane,meta] of Object.entries(SOURCES)){
  shas[lane]=git("rev-parse","refs/remotes/origin/"+meta.branch).trim();
  if(shas[lane]!==meta.sha)throw Error("Rama avanzó: "+lane+". Reauditar contratos.");
  src[lane]=["src/app.mjs","src/admin.mjs"].map(path=>git("show",meta.sha+":"+path)).join("\n");
 }
 const summary=summarize(src);
 if(summary.parallelOnly.length)throw Error("RPC solo paralelas no inventariadas: "+summary.parallelOnly.join(", "));
 if(summary.docsOnly.join(",")!==[
  "kontrola_completar_provisional_pdf",
  "kontrola_identificar_provisional_pdf",
  "kontrola_reservar_provisional_pdf"
 ].join(","))throw Error("RPC adicionales cambiaron: "+summary.docsOnly.join(", "));
 const sql=git("show",SOURCES.documental.sha+":supabase/proposals/kontrola_pdf_provisionales_b01.sql");
 const checks=validateExtraContracts({calls:summary.sets.documental,sql});
 if(checks.some(x=>!x.inClient||!x.inProposal||!x.guardedByGrant))throw Error("Contrato RPC sin evidencia: "+JSON.stringify(checks));
 mkdirSync("artifacts",{recursive:true});
 writeFileSync("artifacts/preflight-b01-rpc.md",report({summary,checks,shas}));
 writeFileSync("artifacts/preflight-b01-rpc.json",JSON.stringify({status:"RPC_AUDITED_NOT_INTEGRATED",shas,summary,checks},null,2));
 console.log(report({summary,checks,shas}));
 console.log("KONTROLA_B01_RPC_STATIC_OK NOT_INTEGRATED");
}
if(process.argv[1]?.endsWith("/preflight-b01-rpc.mjs"))run();
