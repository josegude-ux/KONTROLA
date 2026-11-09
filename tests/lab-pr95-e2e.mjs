// E2E local del LAB PR #95. Solo fixtures ficticios; no Supabase, Lovable ni BC.
// Ejecución: PW_BROWSER=chromium|webkit node tests/lab-pr95-e2e.mjs
import assert from "node:assert/strict";
import {spawn} from "node:child_process";
import {mkdtemp,writeFile,rm,mkdir} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join,resolve} from "node:path";
import {PDFDocument,StandardFonts} from "pdf-lib";
import {chromium,webkit,devices} from "playwright";

const browserName=process.env.PW_BROWSER||"chromium";
if(!["chromium","webkit"].includes(browserName))throw Error("PW_BROWSER incorrecto");
const BASE="http://127.0.0.1:18765";
const output=resolve("test-results/pr95-e2e/"+browserName);
await mkdir(output,{recursive:true});
const dir=await mkdtemp(join(tmpdir(),"visura-pr95-"));
let server,browser;
const steps=[],errors=[];
const check=(title,value)=>{assert.ok(value,title);steps.push({title,result:"PASS"});console.log("PASS",browserName,title)};
const fixtureData=[
  {filename:"C12345.pdf",warehouse:"COR_01_COR",code:"LP26-12345",items:[["A101-1","PRD0000001",2],["B102-2","PRD0000002",3]]},
  {filename:"F12346.pdf",warehouse:"COR_02_NAR",code:"LP26-12346",items:[["C103-1","PRD0000003",3],["D104-2","PRD0000004",4]]}
];
async function makePdf(spec){
  const doc=await PDFDocument.create(),p=doc.addPage([595.28,841.89]);
  const H=p.getHeight(),font=await doc.embedFont(StandardFonts.Helvetica);
  const write=(txt,x,y)=>p.drawText(txt,{x,y:H-y,size:10,font});
  write("PDF FICTICIO ENSAYO / SIN DATOS REALES",38,27);
  write("Almacen: "+spec.warehouse,42,51);
  write("Fecha carga: 09/11/2026",42,70);
  write(spec.code,42,89);
  write("Ruta: LAB",42,108);
  write("Repartidor: OPERARIO ENSAYO",42,127);
  write("Peso carga: 140,50",42,146);
  write("Matricula: 1234TST",42,165);
  write("MERCANCIA",42,200);
  spec.items.forEach(([loc,sku,q],i)=>{
    const y=248+42*i;
    write(loc,42,y);write(sku,100,y);write("PRODUCTO FICTICIO "+(i+1),175,y);
    write(String(q),420,y);write("CAJA",533,y);
  });
  write("Total referencias prod.: 2",42,610);
  write("TOTAL:",338,610);
  write(String(spec.items.reduce((n,x)=>n+x[2],0)),425,610);
  write("CONTROL ENVASES",42,680);
  write("PALETS",42,736);
  write("FIRMA NO OPERATIVA",42,780);
  const dest=join(dir,spec.filename);
  await writeFile(dest,await doc.save());
  return dest;
}
async function waitPage(){
  for(let i=0;i<100;i++){
    try{const r=await fetch(BASE+"/lab/visura-prepara-v056.html");if(r.ok)return;}
    catch{}
    await new Promise(r=>setTimeout(r,150));
  }
  throw Error("Servidor LAB no disponible");
}
async function checkSelection(page){
  await page.locator("#demo").click();
  await page.waitForFunction(()=>document.querySelector("#total")?.textContent==="3");
  check("A/B/C ficticias visibles",await page.locator(".load").count()===3);
  check("No permite imprimir DEMO sin PDF",await page.locator("#prepare").isDisabled());
  await page.locator("#selectAll").click();
  check("Seleccionar todas marca 3",await page.locator("#selectedCount").textContent()==="3 seleccionadas");
  await page.locator("#search").fill("DEMO-B");
  check("Filtro B muestra solo una",await page.locator(".load").count()===1);
  check("Filtro conserva selección oculta",await page.locator("#selectedCount").textContent()==="3 seleccionadas");
  await page.locator("#unselect").click();
  check("Desmarcar borra todas",await page.locator("#selectedCount").textContent()==="0 seleccionadas");
  await page.locator("#markVisible").click();
  check("Marcar visibles selecciona solo B",await page.locator("#selectedCount").textContent()==="1 seleccionadas");
  await page.locator("#search").fill("");
  await page.locator("#warehouse").selectOption("COR_02_NAR");
  check("Cambio de almacén vacía ensayo",await page.locator("#total").textContent()==="0");
  await page.locator("#warehouse").selectOption("COR_01_COR");
}
async function checkDocument(page,spec){
  await page.locator("#warehouse").selectOption(spec.warehouse);
  const path=await makePdf(spec);
  await page.locator("#pdfs").setInputFiles(path);
  await page.waitForFunction(()=>{
    const s=document.querySelector("#status")?.textContent||"";
    return s.includes("PDF verificados")||s.includes("Rechazados:")||s.includes("No es un PDF");
  },null,{timeout:20000});
  const s=await page.locator("#status").textContent();
  console.log("E2E_DEBUG_IMPORT",browserName,s);
  check(spec.filename+" importado y verificado",s.includes("1 PDF verificados")&&!s.includes("Rechazados:"));
  check(spec.filename+" única carga del almacén",await page.locator("#total").textContent()==="1");
  check(spec.filename+" código exacto",await page.locator(".load b").first().textContent()===spec.code);
  await page.locator("#selectAll").click();
  check(spec.filename+" habilita vista previa",await page.locator("#prepare").isEnabled());
  const printBeforePreview=await page.evaluate(()=>window.__testPrintCount||0);
  await page.locator("#prepare").click();
  await page.waitForFunction(()=>document.querySelector("#preview")?.classList.contains("show")||
    (document.querySelector("#status")?.textContent||"").includes("Impresión cancelada"),null,{timeout:30000});
  console.log("E2E_DEBUG_PREVIEW",browserName,await page.locator("#status").textContent(),await page.locator("#preview").getAttribute("class"));
  check(spec.filename+" vista previa visible",await page.locator("#preview").evaluate(x=>x.classList.contains("show")));
  check(spec.filename+" original + resumen A4",await page.locator("#sheets .lab-sheet").count()===2);
  check(spec.filename+" original renderizado a PNG",await page.locator("#sheets .lab-sheet img").evaluate(x=>x.complete&&x.naturalWidth>0));
  const report=await page.locator("#sheets").innerText();
  check(spec.filename+" mercancía y pasillos incluidos",report.includes(spec.code)&&report.includes("Totales por formato"));
  check(spec.filename+" excluye textos de control",!report.includes("CONTROL ENVASES")&&!report.includes("PALETS")&&!report.includes("FIRMA NO OPERATIVA"));
  const name=spec.warehouse==="COR_01_COR"?"coruna":"ferrol";
  await page.screenshot({path:join(output,name+"-"+(page.viewportSize()?.width||0)+".png"),fullPage:true});
  const previous=await page.evaluate(()=>window.__testPrintCount||0);
  check(spec.filename+" vista previa no imprime sola",previous===printBeforePreview);
  await page.locator("#print").click();
  check(spec.filename+" impresión solo tras clic",await page.evaluate(()=>window.__testPrintCount)===previous+1);
  await page.locator("#closePreview").click();
  check(spec.filename+" cierra vista previa",!(await page.locator("#preview").evaluate(x=>x.classList.contains("show"))));
}
async function runContext(browser,kind){
  const ctx=kind==="mobile"
    ?await browser.newContext({...devices["iPhone 13 Pro Max"],browserName,serviceWorkers:"block",acceptDownloads:true})
    :await browser.newContext({viewport:{width:1280,height:800},serviceWorkers:"block",acceptDownloads:true});
  const page=await ctx.newPage();
  page.on("pageerror",error=>errors.push(kind+": "+error.message));
  page.on("request",r=>{if(/^https?:/.test(r.url())&&!r.url().startsWith(BASE))errors.push("petición externa "+r.url())});
  await page.addInitScript(()=>{window.__testPrintCount=0;window.print=()=>{window.__testPrintCount++}});
  await page.goto(BASE+"/lab/visura-prepara-v056.html",{waitUntil:"networkidle",timeout:30000});
  check(kind+" carga la pantalla",await page.locator("#demo").isVisible());
  check(kind+" sin desbordamiento horizontal",await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await checkSelection(page);
  for(const spec of fixtureData)await checkDocument(page,spec);
  check(kind+" sin desbordamiento en último informe",await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1));
  await ctx.close();
}
try{
  server=spawn("python3",["-m","http.server","18765","--bind","127.0.0.1"],{cwd:process.cwd(),stdio:"pipe"});
  await waitPage();
  browser=await ({chromium,webkit}[browserName]).launch({headless:true});
  await runContext(browser,"desktop");
  await runContext(browser,"mobile");
  check("No hay errores JavaScript ni peticiones externas",errors.length===0);
  const result={browser:browserName,steps,errors,fixtures:fixtureData.map(x=>x.filename),date:new Date().toISOString(),status:"PASS"};
  await writeFile(join(output,"resultado.json"),JSON.stringify(result,null,2));
  console.log("E2E PR95 PASS",browserName,steps.length,"checks");
}catch(error){
  console.error("E2E PR95 FAIL",browserName,error.stack||String(error));
  console.error("Errores:",errors);
  await writeFile(join(output,"resultado.json"),JSON.stringify({browser:browserName,steps,errors,error:String(error),status:"FAIL"},null,2));
  process.exitCode=1;
}finally{
  if(browser)await browser.close();
  if(server)server.kill("SIGTERM");
  await rm(dir,{recursive:true,force:true});
}
