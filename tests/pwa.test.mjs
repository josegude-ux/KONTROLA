import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const serviceWorker=await readFile(new URL("../sw.js",import.meta.url),"utf8");
const workflow=await readFile(new URL("../.github/workflows/ci.yml",import.meta.url),"utf8");
const app=await readFile(new URL("../src/app.mjs",import.meta.url),"utf8");
const pdf=await readFile(new URL("../src/pdf.mjs",import.meta.url),"utf8");
const icon=await readFile(new URL("../assets/icon.svg",import.meta.url),"utf8");

test("the offline shell caches every local module imported by the application",()=>{
  for(const module of ["app.mjs","admin.mjs","pdf.mjs","core.mjs","logic.mjs","verification.mjs","document-review.mjs","report.mjs","import-policy.mjs","admin-revisions.mjs","revision-diff.mjs","business-date.mjs","import-batch.mjs","admin-stats.mjs","legacy-audit.mjs","admin-legacy.mjs","legacy-reconcile.mjs","admin-reconcile.mjs","legacy-originals.mjs","admin-originals.mjs","admin-print-batch.mjs","config.mjs"]){
    assert.match(serviceWorker,new RegExp(`src/${module.replace(".","\\.")}`));
  }
});

test("CI validates pull requests targeting the Phase 1 branch",()=>{
  assert.match(workflow,/pull_request:\s*\n\s*branches:\s*\[[^\]]*desarrollo\/fase-1-operario[^\]]*\]/);
  assert.match(workflow,/node --check src\/verification\.mjs/);
  assert.match(workflow,/node --check src\/document-review\.mjs/);
  assert.match(workflow,/node --check src\/report\.mjs/);
  assert.match(workflow,/node --check src\/admin\.mjs/);
  assert.match(workflow,/node --check src\/pdf\.mjs/);
});

test("browser runtime dependencies are local and cached",()=>{
  assert.match(app,/vendor\/supabase\.mjs/);
  assert.match(pdf,/vendor\/pdf\.min\.mjs/);
  assert.match(pdf,/vendor\/pdf\.worker\.min\.mjs/);
  assert.doesNotMatch(app,/import\(["']https?:\/\//);
  assert.doesNotMatch(pdf,/import\(["']https?:\/\//);
  for(const asset of ["vendor/supabase.mjs","vendor/pdf.min.mjs","vendor/pdf.worker.min.mjs"]){
    assert.match(serviceWorker,new RegExp(asset.replaceAll(".","\\.")));
  }
  assert.match(serviceWorker,/cache:\s*["']reload["']/);
});

test("the install icon declares square intrinsic dimensions",()=>{
  assert.match(icon,/<svg[^>]*width="512"[^>]*height="512"[^>]*viewBox="0 0 512 512"/);
});
