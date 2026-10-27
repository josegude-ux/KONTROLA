import {test,expect} from "@playwright/test";
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
