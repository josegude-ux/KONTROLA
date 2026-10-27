import {test,expect} from "@playwright/test";
import {createServer} from "node:http";
import {readFile} from "node:fs/promises";
import {extname,join,normalize} from "node:path";
const root=process.cwd(),port=4191;
const mime={".html":"text/html",".css":"text/css",".mjs":"text/javascript",".js":"text/javascript",".png":"image/png",".svg":"image/svg+xml",".webp":"image/webp",".json":"application/json"};
let server;
test.beforeAll(async()=>{
 server=createServer(async(req,res)=>{
  try{
   const pathname=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
   const file=normalize(join(root,pathname==="/"?"/index.html":pathname));
   if(!file.startsWith(root+"/")){res.writeHead(403).end();return;}
   res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream"}).end(await readFile(file));
  }catch{res.writeHead(404).end("missing");}
 });
 await new Promise(resolve=>server.listen(port,"127.0.0.1",resolve));
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});
for(const device of [
 {name:"movil",width:390,height:844,columns:1},
 {name:"tablet-vertical",width:768,height:1024,columns:2},
 {name:"tablet-horizontal",width:1024,height:768,columns:2},
 {name:"escritorio",width:1440,height:900,columns:2},
 {name:"escritorio-ancho",width:1920,height:1080,columns:2}
]){
 test("corrección documental legible en "+device.name,async({page})=>{
  await page.setViewportSize({width:device.width,height:device.height});
  await page.route("**/src/app.mjs",route=>route.fulfill({status:200,contentType:"text/javascript",body:""}));
  await page.goto("http://127.0.0.1:"+port+"/",{waitUntil:"domcontentloaded"});
  await page.evaluate(()=>{
   document.getElementById("loginView").hidden=true;
   document.getElementById("shell").hidden=false;
   document.querySelectorAll(".view").forEach(v=>v.hidden=true);
   document.getElementById("adminView").hidden=false;
   document.querySelectorAll("#adminView [role=tabpanel]").forEach((v,i)=>v.hidden=i!==0);
   const root=document.getElementById("documentReview");
   const section=document.createElement("section");section.className="quantity-review";
   const heading=document.createElement("h4");heading.textContent="Cantidades operativas · revisión administrativa";
   section.appendChild(heading);
   const row=document.createElement("details");row.open=true;
   row.className="quantity-review-row quantity-corrected";
   const summary=document.createElement("summary");
   const ref=document.createElement("span");ref.textContent="Línea 1 · PRD0000001 · Caja";
   const qty=document.createElement("strong");qty.textContent="Cantidad VISURA: 4 · CORREGIDA (PDF: 2)";
   summary.append(ref,qty);row.append(summary);
   const form=document.createElement("div");form.className="quantity-correction-form";
   for(const labelText of ["Cantidad validada en BC","Origen de la corrección","Evidencia y justificación (contraste manual BC)"]){
    const label=document.createElement("label");label.textContent=labelText;
    const control=labelText.startsWith("Evidencia")?document.createElement("textarea"):
      labelText.startsWith("Origen")?document.createElement("select"):document.createElement("input");
    if(control.nodeName==="SELECT"){const option=document.createElement("option");option.textContent="Lectura incorrecta";control.appendChild(option);}
    label.appendChild(control);form.append(label);
   }
   const button=document.createElement("button");button.className="secondary";button.textContent="Registrar corrección de cantidad";
   form.append(button);row.append(form);section.append(row);root.replaceChildren(section);
  });
  const form=page.locator(".quantity-correction-form");
  await expect(form.getByText("Registrar corrección de cantidad")).toBeVisible();
  const columns=await form.evaluate(el=>getComputedStyle(el).gridTemplateColumns.trim().split(/\s+/).length);
  expect(columns).toBe(device.columns);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  await page.screenshot({path:"artifacts/quantity-review-"+device.name+".png",fullPage:true});
 });
}
