import test from "node:test";
import assert from "node:assert/strict";
import {buildReportDownloadHtml} from "../src/admin.mjs";

test("downloaded report escapes untrusted document titles",()=>{
  const html=buildReportDownloadHtml('Carga </title><script>alert("x")</script>',"body{}","<main>seguro</main>");
  assert.doesNotMatch(html,/<script>/i);
  assert.match(html,/&lt;\/title&gt;&lt;script&gt;/);
});
