import test from "node:test";
import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";

const serviceWorker=await readFile(new URL("../sw.js",import.meta.url),"utf8");
const workflow=await readFile(new URL("../.github/workflows/ci.yml",import.meta.url),"utf8");

test("the offline shell caches every local module imported by the application",()=>{
  for(const module of ["app.mjs","core.mjs","logic.mjs","verification.mjs","config.mjs"]){
    assert.match(serviceWorker,new RegExp(`src/${module.replace(".","\\.")}`));
  }
});

test("CI validates pull requests targeting the Phase 1 branch",()=>{
  assert.match(workflow,/pull_request:\s*\n\s*branches:\s*\[[^\]]*desarrollo\/fase-1-operario[^\]]*\]/);
  assert.match(workflow,/node --check src\/verification\.mjs/);
});
