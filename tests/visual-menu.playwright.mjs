import { test, expect } from "@playwright/test";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";

const root = process.cwd();
const mime = { ".html":"text/html", ".js":"text/javascript", ".mjs":"text/javascript", ".css":"text/css", ".webp":"image/webp", ".png":"image/png", ".json":"application/json", ".webmanifest":"application/manifest+json", ".svg":"image/svg+xml" };
let server;
test.beforeAll(async () => {
  server = createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      const file = normalize(join(root, pathname === "/" ? "index.html" : pathname));
      if (!file.startsWith(root)) { res.writeHead(403).end(); return; }
      const body = await readFile(file);
      res.writeHead(200, { "content-type": mime[extname(file)] || "application/octet-stream" });
      res.end(body);
    } catch { res.writeHead(404).end("not found"); }
  });
  await new Promise(resolve => server.listen(4173, "127.0.0.1", resolve));
});
test.afterAll(async () => { await new Promise(resolve => server.close(resolve)); });

for (const viewport of [
  { name: "desktop", width: 1440, height: 1000 },
  { name: "mobile", width: 390, height: 844 },
]) {
  test(`menu layout and official images: ${viewport.name}`, async ({ page }) => {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
    const cards = [
      ["openPreparation", "visura-prepara-preparacion-3d.webp"],
      ["openReview", "visura-prepara-control-cargas-3d.webp"],
      ["openCargas", "visura-prepara-operaciones-3d.webp"],
    ];
    for (const [id, filename] of cards) {
      const card = page.locator(`#${id}`);
      await expect(card).toBeVisible();
      await expect(card.locator("img")).toHaveAttribute("src", new RegExp(filename));
      await expect(card.locator("img")).toHaveJSProperty("complete", true);
      const naturalWidth = await card.locator("img").evaluate(img => img.naturalWidth);
      expect(naturalWidth, `image failed to load: ${filename}`).toBeGreaterThan(0);
    }
    await expect(page.locator("#openAdmin")).toHaveCount(1);
    const bodyWidth = await page.locator("body").evaluate(el => el.scrollWidth);
    expect(bodyWidth).toBeLessThanOrEqual(viewport.width + 1);
    await page.screenshot({ path: `artifacts/menu-${viewport.name}.png`, fullPage: true });
  });
}
