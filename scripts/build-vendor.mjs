import {mkdir,copyFile} from "node:fs/promises";
import {build} from "esbuild";

await mkdir("vendor",{recursive:true});
await build({
  entryPoints:["@supabase/supabase-js"],
  bundle:true,
  format:"esm",
  platform:"browser",
  target:["es2020"],
  minify:true,
  outfile:"vendor/supabase.mjs"
});
await Promise.all([
  copyFile("node_modules/pdfjs-dist/build/pdf.min.mjs","vendor/pdf.min.mjs"),
  copyFile("node_modules/pdfjs-dist/build/pdf.worker.min.mjs","vendor/pdf.worker.min.mjs")
]);
// Solo se carga al generar un PDF combinado con páginas originales.
// Se produce en CI/despliegue con la versión bloqueada en package-lock.json.
await build({
  entryPoints:["pdf-lib"],
  bundle:true,
  format:"esm",
  platform:"browser",
  target:["es2020"],
  minify:true,
  outfile:"vendor/pdf-lib.min.mjs"
});
