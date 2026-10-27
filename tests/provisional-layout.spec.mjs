import {test,expect} from "@playwright/test";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
const root=process.cwd(),port=4189;
const mime={".html":"text/html",".css":"text/css",".js":"text/javascript",".mjs":"text/javascript",".svg":"image/svg+xml",".webp":"image/webp",".png":"image/png",".json":"application/json",".webmanifest":"application/manifest+json"};
let server;
test.beforeAll(async()=>{
 server=createServer(async(req,res)=>{
  try{
   const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
   const file=normalize(join(root,path==="/"?"/index.html":path));
   if(!file.startsWith(root+"/")){res.writeHead(403).end();return;}
   const bytes=await readFile(file);
   res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream"}).end(bytes);
  }catch{res.writeHead(404).end("not found");}
 });
 await new Promise(resolve=>server.listen(port,"127.0.0.1",resolve));
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});
for(const view of [
 {name:"movil",width:390,height:844,columns:1},
 {name:"tablet",width:768,height:1024,columns:2},
 {name:"escritorio",width:1440,height:900,columns:2}
]){
 test("formulario provisional legible en "+view.name,async({page})=>{
  await page.setViewportSize({width:view.width,height:view.height});
  await page.route("**/src/app.mjs",route=>route.fulfill({status:200,contentType:"text/javascript",body:""}));
  await page.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded"});
  // Fixture DOM de presentación: NO autentica, descarga ni altera datos.
  await page.evaluate(()=>{
   document.getElementById("loginView").hidden=true;
   document.getElementById("shell").hidden=false;
   document.querySelectorAll(".view").forEach(v=>v.hidden=true);
   document.getElementById("adminView").hidden=false;
   document.querySelectorAll("#adminView [role=tabpanel]").forEach((v,i)=>v.hidden=i!==0);
   const box=document.getElementById("provisionalPdfSection");
   box.hidden=false;
   const list=document.getElementById("provisionalPdfList");
   const entry=document.createElement("div");entry.className="revision-entry";
   const meta=document.createElement("span");meta.textContent="PDF sin código LP confirmado";
   const original=document.createElement("button");original.className="secondary";original.textContent="Descargar original";
   const form=document.createElement("div");form.className="provisional-identity-form";
   for(const labelText of ["Código LP contrastado en BC","Almacén contrastado en BC","Evidencia o justificación del contraste manual"]){
    const label=document.createElement("label");label.textContent=labelText;
    const control=labelText.startsWith("Evidencia")?document.createElement("textarea"):
      labelText.startsWith("Almacén")?document.createElement("select"):document.createElement("input");
    if(control.nodeName==="SELECT"){const opt=document.createElement("option");opt.textContent="A Coruña";control.appendChild(opt);}
    label.appendChild(control);form.appendChild(label);
   }
   const confirm=document.createElement("button");confirm.className="primary";confirm.textContent="Identificar para revisión";
   form.appendChild(confirm);entry.append(meta,original,form);list.appendChild(entry);
  });
  const box=page.locator("#provisionalPdfSection"),form=page.locator(".provisional-identity-form");
  await expect(box).toBeVisible();
  await expect(form.getByText("Identificar para revisión")).toBeVisible();
  const columns=await form.evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(" ").length);
  expect(columns).toBe(view.columns);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({path:"artifacts/provisional-"+view.name+".png",fullPage:true});
 });
}
