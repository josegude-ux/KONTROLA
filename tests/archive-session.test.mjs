import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const source=readFileSync(new URL("../src/admin.mjs",import.meta.url),"utf8");
test("el cierre de sesión vacía los datos privados del archivo",()=>{
  const clear=source.slice(source.indexOf("function clearSensitive()"),source.indexOf('$("processPdf").addEventListener'));
  assert.match(clear,/archiveGeneration\+\+/);
  assert.match(clear,/\$\("archiveCode"\)\.value=""/);
  assert.match(clear,/\$\("archiveStatus"\)\.textContent=""/);
  assert.match(clear,/\$\("archivedLoadsList"\)\.replaceChildren\(\)/);
});
test("las respuestas de archivo tardías no repueblan la pantalla",()=>{
  const change=source.slice(source.indexOf("async function changeArchive"),source.indexOf('$("archiveLoad").addEventListener'));
  const refresh=source.slice(source.indexOf("async function refreshArchivedLoads"),source.indexOf('$("refreshArchived").addEventListener'));
  assert.match(change,/generation!==archiveGeneration/);
  assert.match(refresh,/generation!==archiveGeneration/);
});
