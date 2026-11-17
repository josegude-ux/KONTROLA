// Prueba de impresión real con datos FICTICIOS. Bloquea toda red que no sea localhost.
// Uso: node scripts/prueba-impresion-ficticia.mjs [dirSalida] [--dos-dias]
// Requiere servir el repo en 127.0.0.1:8765 (python3 -m http.server 8765 --bind 127.0.0.1),
// playwright accesible (PLAYWRIGHT_MODULE) y Chrome (CHROME_PATH).
const {chromium}=await import(process.env.PLAYWRIGHT_MODULE||'playwright');
const OUT=process.argv[2]||'.';const DOS_DIAS=process.argv.includes('--dos-dias');
const BASE='http://127.0.0.1:8765/control-cargas-prueba3.html?visura_scope=aaaaaaaaaaaaaaaaaaaaaaaa';
const SCOPE='_visura_aaaaaaaaaaaaaaaaaaaaaaaa';
const L=(id,o)=>({id,pdfHash:'h'+id,destination:'CORUÑA',date:'18/11/2026',warehouse:'COR_01_COR',hasCor:true,verified:true,weight:1000,refs:10,cold:[],state:'Pendiente',...o});
const loads=[
 L('LPFICT001',{truck:'CRFIC0001',driver:'R001 ANA FICTICIA; R002 BRUNO PRUEBA',weight:1500,cold:[{location:'ZFRIO',qty:3}]}),
 L('LPFICT002',{truck:'CRFIC0002',driver:'R001 ANA FICTICIA',weight:800}),           // mismo repartidor, menor peso → descartada
 L('LPFICT003',{...(DOS_DIAS?{date:'19/11/2026'}:{}),truck:'CRFIC0003',driver:'R003 CARLOS INVENTADO',weight:2100}),
 L('LPFICT004',{truck:'CRALM0001',driver:'R004 DANI ALMACEN',weight:500}),           // excluida CRALM
 L('LPFICT005',{truck:'CRFIC0005',driver:'R005 ELENA SINVERIF',weight:900,verified:false}), // incidencia
 L('LPFICT006',{truck:'CRFIC0006',driver:'R006 FELIX FERROL',destination:'FERROL'}), // omitida
];
const browser=await chromium.launch({executablePath:process.env.CHROME_PATH||undefined,args:['--no-sandbox']});
const page=await browser.newPage();
const blocked=[];
await page.route('**/*',r=>{const u=r.request().url();if(u.startsWith('http://127.0.0.1:8765/'))return r.continue();blocked.push(u);return r.abort();});
const logs=[];page.on('console',m=>logs.push(m.type()+': '+m.text()));page.on('pageerror',e=>logs.push('pageerror: '+e.message));
const dialogs=[];page.on('dialog',d=>{dialogs.push(d.message());d.dismiss();});
await page.addInitScript(([k,v])=>{localStorage.setItem(k,v);},['control_cargas_prueba_integrada_2'+SCOPE,JSON.stringify(loads)]);
await page.goto(BASE);await page.waitForTimeout(1500);
// Interceptar print() del iframe dedicado sin alterar el código de la app.
await page.evaluate(()=>{window.__prints=[];const orig=HTMLIFrameElement.prototype.appendChild;
 new MutationObserver(ms=>{for(const m of ms)for(const n of m.addedNodes)if(n.id==='dedicatedPrintFrame')n.addEventListener('load',()=>{n.contentWindow.print=()=>window.__prints.push({html:n.contentDocument.documentElement.outerHTML});});}).observe(document.body,{childList:true});});
await page.click('#selectAll');
const results={};
for(const [btn,name] of [['#printDelivery','reparto'],['#printPlates','matriculas']]){
 await page.click(btn);await page.waitForTimeout(300);
 const summary=await page.textContent('#printContents');
 await page.click('#printReport');await page.waitForFunction(n=>window.__prints.length>=n,name==='reparto'?1:2,{timeout:5000});
 const printed=(await page.evaluate(()=>window.__prints.at(-1).html));
 // Imprimir a PDF exactamente el documento que recibe print() del iframe (mismo motor y reglas @page).
 const p2=await browser.newPage();await p2.route('**/*',r=>{blocked.push('p2 '+r.request().url());r.abort();});
 await p2.setContent(printed);await p2.emulateMedia({media:'print'});
 await p2.pdf({path:`${OUT}/${name}${DOS_DIAS?'_2dias':''}.pdf`,preferCSSPageSize:true,printBackground:true});
 await p2.screenshot({path:`${OUT}/${name}${DOS_DIAS?'_2dias':''}.png`,fullPage:true});await p2.close();
 results[name]={summary,len:printed.length,text:printed.replace(/<style[\s\S]*?<\/style>/,'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,900)};
 await page.click('#closeReport');
}
const stored=await page.evaluate(k=>localStorage.getItem(k),'control_cargas_prueba_integrada_2_visura_aaaaaaaaaaaaaaaaaaaaaaaa');
results.cargasIntactas=JSON.stringify(JSON.parse(stored).map(r=>[r.id,r.weight,r.state]))===JSON.stringify(loads.map(r=>[r.id,r.weight,r.state]));
console.log(JSON.stringify({results,dialogs,blocked:[...new Set(blocked)],logs:logs.slice(0,15)},null,1));
await browser.close();
