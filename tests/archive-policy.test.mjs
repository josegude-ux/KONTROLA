import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");
const html=read("index.html"),css=read("styles.css");
const admin=read("src/admin.mjs"),policy=read("docs/PLAN_ARCHIVO_ONEDRIVE.md");
test("no se muestra el panel de migración de PDF antiguos en el nuevo arranque",()=>{
  assert.match(html,/id="legacyAuditPanel" hidden aria-hidden="true"/);
  assert.match(css,/#legacyAuditPanel\[hidden\]\{display:none!important\}/);
  assert.match(policy,/No es necesario importar, reconstruir, conciliar ni conservar en KONTROLA los PDF generados anteriormente/);
});
test("el archivo periódico de PDFs nuevos en OneDrive se presenta como acción manual",()=>{
  assert.match(html,/id="archiveOneDrivePanel"/);
  assert.match(html,/id="onedriveArchiveHelp"/);
  assert.match(html,/Imprimir \/ Guardar PDF/);
  assert.match(html,/muévela? a la carpeta de OneDrive elegida/);
  assert.match(html,/El traslado no es automático/);
  assert.match(policy,/ningún PDF se borra automáticamente/i);
  assert.match(css,/@media print\{#onedriveArchiveHelp\{display:none!important\}\}/);
});
test("la interfaz distingue HTML descargado de PDF generado por impresión",()=>{
  assert.match(admin,/type:"text\/html;charset=utf-8"/);
  assert.match(admin,/window\.print\(\)/);
  assert.match(policy,/No se debe cambiar el nombre de un HTML a .pdf/);
});
