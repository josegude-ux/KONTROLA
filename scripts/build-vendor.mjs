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
