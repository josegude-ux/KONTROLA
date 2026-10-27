#!/usr/bin/env node
// Preflight de compatibilidad: lectura de objetos Git, sin merge ni modificación de ramas.
import {execFileSync} from "node:child_process";
import {mkdirSync,writeFileSync} from "node:fs";

export const SOURCES={
 parallel:{branch:"feat/visura-prepara-integracion-pr49-pr58-20261026",sha:"18c46b0c742bae9321f08603da40dfd1e7d76323"},
 responsive:{branch:"feat/visura-prepara-b01-responsive-20261027",sha:"d66ecad37a13c3af6dafe2463236a1e2b874f77a"},
 documental:{branch:"feat/visura-prepara-b01-totales-bc-auditados-20261027",sha:"13b5fbdac50b6e7a2ec4b97bbf2313b7bdbd9fcf"}
};
const git=(...args)=>execFileSync("git",args,{encoding:"utf8",maxBuffer:15*1024*1024});
const read=(sha,path)=>{
 try{return git("show",sha+":"+path);}
 catch(error){if(error.status===128)return "";throw error;}
};
export const contains=(source,pattern)=>String(source||"").includes(pattern);
const changed=(base,head)=>new Set(git("diff","--name-only",base,head).trim().split("\n").filter(Boolean));
const overlap=(a,b)=>[...a].filter(p=>b.has(p)).sort();
const markdown=(s)=>String(s).replace(/\|/g,"\\|").replace(/\n/g," ");
const q=(s)=>String.fromCharCode(96)+s+String.fromCharCode(96);

export function assess(source){
 const a=source.parallel,b=source.responsive,c=source.documental;
 return [
  {group:"Flujos",name:"Preparación y Verificación paralelas",found:contains(a.parallel,"estadoTrasVerificar")&&contains(a.sql,"kontrola_iniciar_verificacion")&&contains(a.sql,"kontrola_iniciar_preparacion")},
  {group:"Flujos",name:"Un preparador y verificador diferente",found:contains(a.parallel,"if(load.preparador_id===userId)return false")},
  {group:"Flujos",name:"Picking exclusivamente en Business Central",found:contains(a.parallel,"picking real se registra en BC")},
  {group:"Responsive",name:"Escritorio fluido hasta 1480 px",found:contains(b.css,"max-width:1480px")&&contains(b.css,"@media screen and (min-width:1100px)")},
  {group:"Responsive",name:"Adaptación tablet y móvil",found:contains(b.css,"@media screen and (max-width:720px)")&&contains(b.css,"max-width:1099px")},
  {group:"Documental",name:"Original provisional privado",found:contains(c.sqlProvisional,"kontrola_pdf_provisionales")&&contains(c.admin,"storeProvisionalPdf")},
  {group:"Documental",name:"Corrección cantidad con evidencia",found:contains(c.review,"applyValidatedQuantityCorrection")&&contains(c.admin,"quantity-correction-form")},
  {group:"Documental",name:"Totales originales separados de BC",found:contains(c.sqlTotal,"kontrola_total_bc_documentado")&&contains(c.sqlTotal,"declared_total")&&contains(c.sqlTotal,"actual_total")},
  {group:"Documental",name:"Bloqueo documental tras iniciar Verificación",found:contains(c.sqlTotal,"public.kontrola_verificaciones v where v.codigo=v_i.codigo")},
  {group:"Integración",name:"PR documental incluye layout ancho",found:contains(c.css,"max-width:1480px")},
  {group:"Integración",name:"PR documental incluye motor paralelo",found:contains(c.parallel,"estadoTrasVerificar")},
  {group:"Integración",name:"PR responsive incluye edición de cantidades",found:contains(b.admin,"applyValidatedQuantityCorrection")}
 ];
}

export function report({refs,mergebases,shared,checks}){
 const lines=[
  "# VISURA PREPARA — preflight de compatibilidad Bloque 01",
  "",
  "**ESTADO: NO INTEGRADO · NO FUSIONAR NI DESPLEGAR.**",
  "",
  "Se leyeron commits y archivos mediante git show/diff/merge-base. No se ejecutó merge, merge-tree, rebase, checkout ni modificación remota.",
  "Éxito del preflight = revisión de fuentes realizada, NO certificación de aplicación integrada.",
  "",
  "## Fuentes verificadas",
  "",
  "| Línea | SHA fijado |",
  "|---|---|",
  ...Object.entries(refs).map(([name,sha])=>"| "+name+" | "+q(sha)+" |"),
  "",
  "## Archivos afectados en ambas líneas",
  "",
  "| Comparación | Ancestro común | Coincidencias |",
  "|---|---|---:|",
  ...Object.entries(shared).map(([name,list])=>"| "+name+" | "+q(mergebases[name])+" | "+list.length+" |"),
  "",
  ...Object.entries(shared).flatMap(([name,list])=>["**"+name+"**",list.length?list.map(x=>"- "+q(x)).join("\n"):"Sin coincidencias",""]),
  "## Contratos presentes por separado",
  "",
  "| Origen | Contrato | Verificado |",
  "|---|---|---|",
  ...checks.map(x=>"| "+markdown(x.group)+" | "+markdown(x.name)+" | "+(x.found?"Sí":"No")+" |"),
  "",
  "## Riesgos aún pendientes de prueba conjunta",
  "",
  "- Revisar manualmente los solapamientos de index.html, styles.css, src/app.mjs, src/admin.mjs, tests/integration/run.sh y docs/CONTINUIDAD.md.",
  "- Conservar el menú responsive y los formularios administrativos completos, y mantener la independencia de Preparación/Verificación.",
  "- El SQL de paralelismo y el de totales documentados deben probarse juntos en PostgreSQL temporal y con el orden correcto; este preflight NO los aplica.",
  "- La revisión visual estática sin cuenta no equivale a ensayos reales en escritorio, tablet y móvil.",
  "- Sin cambios de datos, permisos productivos, Business Central, picking, palets ni Bloque 02.",
  "",
  "**Siguiente hito:** preparar un plan de integración sin ejecutarla y solicitar la autorización necesaria antes de integrar o desplegar."
 ];
 return lines.join("\n")+"\n";
}

export function run(){
 const refs={};
 for(const [name,meta] of Object.entries(SOURCES)){
  refs[name]=git("rev-parse","refs/remotes/origin/"+meta.branch).trim();
  if(refs[name]!==meta.sha)throw Error("Rama "+name+" avanzó a "+refs[name]+"; hay que volver a auditar antes de usar este informe.");
 }
 const source={
  parallel:{
   parallel:read(refs.parallel,"src/parallel-workflows.mjs"),
   sql:read(refs.parallel,"supabase/proposals/kontrola_prepara_verificacion_paralelas.sql")
  },
  responsive:{
   css:read(refs.responsive,"styles.css"),
   admin:read(refs.responsive,"src/admin.mjs")
  },
  documental:{
   css:read(refs.documental,"styles.css"),
   admin:read(refs.documental,"src/admin.mjs"),
   review:read(refs.documental,"src/document-review.mjs"),
   parallel:read(refs.documental,"src/parallel-workflows.mjs"),
   sqlProvisional:read(refs.documental,"supabase/proposals/kontrola_pdf_provisionales_b01.sql"),
   sqlTotal:read(refs.documental,"supabase/proposals/kontrola_total_bc_documentado_b01.sql")
  }
 };
 const checks=assess(source);
 const missed=checks.filter(x=>x.group!=="Integración"&&!x.found);
 if(missed.length)throw Error("Falta un contrato de origen: "+missed.map(x=>x.name).join("; "));
 const shared={},mergebases={};
 for(const [key,left,right] of [
  ["Paralelismo ↔ Documental","parallel","documental"],
  ["Responsive ↔ Documental","responsive","documental"]
 ]){
  const base=git("merge-base",refs[left],refs[right]).trim();
  mergebases[key]=base;
  shared[key]=overlap(changed(base,refs[left]),changed(base,refs[right]));
 }
 mkdirSync("artifacts",{recursive:true});
 writeFileSync("artifacts/preflight-b01.md",report({refs,mergebases,shared,checks}));
 writeFileSync("artifacts/preflight-b01.json",JSON.stringify({state:"NOT_INTEGRATED",refs,mergebases,shared,checks},null,2));
 process.stdout.write(report({refs,mergebases,shared,checks}));
}
if(process.argv[1]?.endsWith("/preflight-b01.mjs"))run();
