import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const read=path=>readFileSync(new URL("../"+path,import.meta.url),"utf8");

test("la actualizacion conserva el backend Supabase actual de PREPARA",()=>{
  const config=read("src/config.mjs");
  assert.match(config,/SUPABASE_URL\s*=\s*"https:\/\/oevetnszmfxeukcncwji\.supabase\.co"/);
  assert.match(config,/PDF_BUCKET\s*=\s*"kontrola-pdfs"/);
  const key=config.match(/export const SUPABASE_KEY\s*=\s*"([^"]+)"/)?.[1];
  assert.ok(key?.startsWith("sb_publishable_"),"Solo se admite una clave publicable en el navegador");
  assert.doesNotMatch(key,/service_role|sb_secret_/i);
});

test("el manifiesto sigue apuntando a la misma PWA instalada",()=>{
  const manifest=JSON.parse(read("manifest.webmanifest"));
  assert.equal(manifest.start_url,"./");
  assert.equal(manifest.display,"standalone");
  assert.match(manifest.name,/VISURA PREPARA/);
});

test("el service worker precarga todos los recursos del menu VISURA",()=>{
  const sw=read("sw.js");
  for(const name of ["preparacion","control-cargas","operaciones","administracion"]){
    assert.ok(sw.includes(`./assets/home/visura-prepara-${name}-3d.webp`),`Falta imagen ${name} en precache`);
  }
  assert.match(sw,/caches\.open\(CACHE\)/);
  assert.match(sw,/self\.skipWaiting\(\)/);
});

test("la version visible coincide con la version declarada",()=>{
  const config=read("src/config.mjs");
  const version=JSON.parse(read("version.json")).version;
  const pkg=JSON.parse(read("package.json")).version;
  assert.equal(version,pkg);
  assert.ok(config.includes(`APP_VERSION="${version}"`));
});
