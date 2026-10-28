import {test,expect} from "@playwright/test";
import {PDFDocument} from "pdf-lib";
import {writeFileSync} from "node:fs";
const url="http://127.0.0.1:8765/tests/fixed-position-visual.html";
const sizes=[
  {name:"desktop",width:1440,height:900,cols:4,metricCols:5,card:false},
  {name:"tablet",width:820,height:1180,cols:2,metricCols:3,card:false},
  {name:"mobile",width:390,height:844,cols:1,metricCols:2,card:true}
];
for(const s of sizes){
  test("VISURA PREPARA · posiciones fijas · "+s.name,async({page})=>{
    await page.setViewportSize({width:s.width,height:s.height});
    await page.goto(url);
    await expect(page.locator("html")).toHaveAttribute("data-visual-fixture-ready","yes");
    await expect(page.locator("#fixedCount")).toContainText("3 incidencias");
    await expect(page.locator("#fixedProvenance")).toContainText("Exportado BC:");
    await expect(page.locator("#fixedProvenance")).toContainText("Antigüedad BC:");
    const layout=await page.evaluate(()=>{
      const grid=getComputedStyle(document.querySelector(".fixed-filters")).gridTemplateColumns.trim().split(/\s+/);
      const metrics=getComputedStyle(document.querySelector(".fixed-metrics")).gridTemplateColumns.trim().split(/\s+/);
      return {
        filters:grid.length,metrics:metrics.length,
        table:getComputedStyle(document.querySelector(".fixed-table")).display,
        cards:getComputedStyle(document.querySelector(".fixed-cards")).display,
        width:document.documentElement.scrollWidth,
        windowWidth:innerWidth
      };
    });
    expect(layout.filters).toBe(s.cols);
    expect(layout.metrics).toBe(s.metricCols);
    expect(layout.width).toBeLessThanOrEqual(layout.windowWidth+2);
    expect(layout.cards==="none").toBe(!s.card);
    if(s.card){
      await expect(page.locator(".fixed-cards article")).toHaveCount(3);
      await expect(page.locator(".fixed-cards")).toContainText("R01-P01: 5");
    }else{
      await expect(page.locator(".fixed-table tbody tr")).toHaveCount(3);
      await expect(page.locator(".fixed-table")).toContainText("R01-P01: 5");
    }
    await page.screenshot({path:"artifacts/fijos-"+s.name+".png",fullPage:true});
    await page.locator("#fixedSearch").fill("PRD003");
    await expect(page.locator("#fixedCount")).toContainText("1 incidencias");
    await page.locator("#fixedSearch").fill("");
    await page.locator("#fixedMetrics button").nth(3).click();
    await expect(page.locator("#fixedCount")).toContainText("2 incidencias");
  });
}
test("cambio de almacén erróneo borra resultados anteriores",async({page})=>{
  await page.goto(url);
  await expect(page.locator("html")).toHaveAttribute("data-visual-fixture-ready","yes");
  await expect(page.locator("#fixedCount")).toContainText("3 incidencias");
  await page.locator("#fixedWarehouse").selectOption("COR_02_NAR");
  await expect(page.locator("#fixedStatus")).toContainText("Informe no disponible");
  await expect(page.locator("#fixedExport")).toBeDisabled();
  await expect(page.locator("#fixedPrint")).toBeDisabled();
  await expect(page.locator("#fixedTable tbody tr")).toHaveCount(0);
});

test("PDF real A4: informe multipágina, paginación y seguridad del documento",async({page})=>{
  await page.goto(url);
  const html=await page.evaluate(async()=>{
    const {buildFixedPrintHtml}=await import("../src/fixed-position-print.mjs");
    const rows=Array.from({length:58},(_,i)=>({
      code:"SIM"+String(i).padStart(4,"0"),description:"Artículo ficticio "+i,
      warehouse:"COR_01_COR",location:"A01-P"+String(i).padStart(2,"0"),
      aisle:"A01",zone:"PICKING",unit:"UD",category:i%2?"cero":"negativo",
      positionQuantity:i%2?"0":"-1",warehouseQuantity:"50",
      otherQuantity:"50",replenishment:i%2===1,locations:[]
    }));
    return buildFixedPrintHtml({
      report:{warehouse:"COR_01_COR",complete:true,
        meta:{sourceFile:"PRUEBA_FICTICIA.xlsx",importedAt:"2026-10-27T11:00:00Z",stale:false}},
      rows,generatedAt:"2026-10-27T11:10:00Z",pageSize:18
    });
  });
  await page.setContent(html);
  const bytes=await page.pdf({format:"A4",landscape:true,printBackground:true});
  const pdf=await PDFDocument.load(bytes);
  expect(pdf.getPageCount()).toBeGreaterThanOrEqual(4);
  writeFileSync("artifacts/fijos-multipagina.pdf",bytes);
});

test("XLSX descargado es ZIP OOXML válido y legible en Excel",async({page})=>{
  await page.goto(url);
  await expect(page.locator("html")).toHaveAttribute("data-visual-fixture-ready","yes");
  const [download]=await Promise.all([
    page.waitForEvent("download"),
    page.locator("#fixedXlsx").click()
  ]);
  expect(download.suggestedFilename()).toMatch(/VISURA_PREPARA_fijas_COR_01_COR_.*\.xlsx$/);
  const file=await download.path();
  const {spawnSync}=await import("node:child_process");
  const verification=[
    "import sys,zipfile,xml.etree.ElementTree as ET",
    "z=zipfile.ZipFile(sys.argv[1])",
    "assert z.testzip() is None",
    "names=set(z.namelist())",
    "assert 'xl/worksheets/sheet2.xml' in names",
    "for name in names:",
    "  if name.endswith('.xml') or name.endswith('.rels'): ET.fromstring(z.read(name))",
    "sheet=ET.fromstring(z.read('xl/worksheets/sheet2.xml'))",
    "ns={'x':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}",
    "assert len(sheet.findall('.//x:sheetData/x:row',ns))==4",
    "assert b'PRD003' in z.read('xl/worksheets/sheet2.xml')",
    "assert not sheet.findall('.//x:f',ns)"
  ].join("\n");
  const result=spawnSync("python3",["-c",verification,file],{encoding:"utf8"});
  expect(result.status,result.stderr).toBe(0);
});
