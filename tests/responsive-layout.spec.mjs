import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root=process.cwd();
const port=4178;
const mime={".html":"text/html",".css":"text/css",".mjs":"text/javascript",".js":"text/javascript",".svg":"image/svg+xml",".png":"image/png",".webp":"image/webp",".json":"application/json",".webmanifest":"application/manifest+json"};
const views=["homeView","cargasMenuView","cargasHistoryView","loadsView","detailView","reviewLoadsView","reviewDetailView","adminView","settingsView"];
let server;

test.beforeAll(async()=>{
  server=createServer(async(req,res)=>{
    try{
      const path=decodeURIComponent(new URL(req.url,"http://localhost").pathname);
      const file=normalize(join(root,path==="/"?"/index.html":path));
      if(!file.startsWith(root+"/")){res.writeHead(403).end();return;}
      const bytes=await readFile(file);
      res.writeHead(200,{"content-type":mime[extname(file)]||"application/octet-stream"}).end(bytes);
    }catch{res.writeHead(404).end("Not found");}
  });
  await new Promise(resolve=>server.listen(port,"127.0.0.1",resolve));
});
test.afterAll(async()=>{await new Promise(resolve=>server.close(resolve));});

async function showView(page,id){
  await page.evaluate(({id,views})=>{
    for(const viewId of views)document.getElementById(viewId).hidden=viewId!==id;
    document.getElementById("loginView").hidden=true;
    document.getElementById("shell").hidden=false;
  },{id,views});
}
async function assertNoOverflow(page,id,desc){
  const result=await page.evaluate(()=>{
    const viewport=document.documentElement.clientWidth;
    return {viewport,documentWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth};
  });
  expect(result.documentWidth,`Desbordamiento horizontal en ${id}, ${desc}`).toBeLessThanOrEqual(result.viewport+1);
  expect(result.bodyWidth,`Desbordamiento del body en ${id}, ${desc}`).toBeLessThanOrEqual(result.viewport+1);
}

for(const viewport of [
  {name:"movil-pequeno",width:320,height:720},
  {name:"movil",width:390,height:844},
  {name:"tablet-vertical",width:768,height:1024},
  {name:"tablet-horizontal",width:1024,height:768},
  {name:"escritorio",width:1440,height:900},
  {name:"escritorio-ancho",width:1920,height:1080},
]){
  test(`pantallas adaptadas en ${viewport.name}`,async({page})=>{
    await page.setViewportSize({width:viewport.width,height:viewport.height});
    // La sesión y los permisos no se simulan: se inspecciona solo el HTML/CSS real.
    await page.route("**/src/app.mjs",route=>route.fulfill({status:200,contentType:"text/javascript",body:""}));
    await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:"domcontentloaded"});
    for(const id of views){
      await showView(page,id);
      await expect(page.locator("#"+id)).toBeVisible();
      await assertNoOverflow(page,id,viewport.name);
      if(id==="homeView"){
        const grid=await page.locator("#homeView .inventa-inspired-home").evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(" ").length);
        expect(grid).toBe(viewport.width>=1100?2:1);
        if(viewport.width>=1100){
          const width=await page.locator("main.container").evaluate(el=>el.getBoundingClientRect().width);
          expect(width).toBeGreaterThanOrEqual(viewport.width===1440?1200:1350);
        }
      }
      if(id==="adminView"){
        for(let i=0;i<9;i++){
          await page.evaluate(index=>{
            document.querySelectorAll("#adminView [role=tabpanel]").forEach((el,j)=>{el.hidden=j!==index;});
          },i);
          await assertNoOverflow(page,`adminSection${i}`,viewport.name);
        }
      }
    }
    await showView(page,"homeView");
    if(["movil","tablet-vertical","escritorio"].includes(viewport.name)){
      await page.screenshot({path:`artifacts/responsive-${viewport.name}.png`,fullPage:true});
      await showView(page,"adminView");
      await page.evaluate(()=>document.querySelectorAll("#adminView [role=tabpanel]").forEach((el,j)=>{el.hidden=j!==0;}));
      await page.screenshot({path:`artifacts/administracion-${viewport.name}.png`,fullPage:true});
    }
  });
}

test("redimensionar de escritorio a tablet y móvil recompone menú sin recargar",async({page})=>{
  await page.route("**/src/app.mjs",route=>route.fulfill({status:200,contentType:"text/javascript",body:""}));
  await page.setViewportSize({width:1440,height:900});
  await page.goto(`http://127.0.0.1:${port}/`,{waitUntil:"domcontentloaded"});
  await showView(page,"homeView");
  for(const width of [1440,1024,768,560,390,768,1440]){
    await page.setViewportSize({width,height:900});
    await assertNoOverflow(page,"homeView",`redimensionado ${width}`);
    const count=await page.locator("#homeView .inventa-inspired-home").evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(" ").length);
    expect(count).toBe(width>=1100?2:1);
  }
});
