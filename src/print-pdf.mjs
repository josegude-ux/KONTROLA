// VISURA PREPARA: generate a real offline A4 PDF for iOS standalone PWAs.
// No backend, network request, external library, or print dialog is required.
const PAGE_W=595.28, PAGE_H=841.89, MARGIN=38, CONTENT_W=PAGE_W-2*MARGIN;
const WIN_1252=new Map([[0x20ac,0x80],[0x201a,0x82],[0x192,0x83],[0x201e,0x84],[0x2026,0x85],
  [0x2020,0x86],[0x2021,0x87],[0x2c6,0x88],[0x2030,0x89],[0x160,0x8a],[0x2039,0x8b],
  [0x152,0x8c],[0x17d,0x8e],[0x2018,0x91],[0x2019,0x92],[0x201c,0x93],[0x201d,0x94],
  [0x2022,0x95],[0x2013,0x96],[0x2014,0x97],[0x2dc,0x98],[0x2122,0x99],[0x161,0x9a],
  [0x203a,0x9b],[0x153,0x9c],[0x17e,0x9e],[0x178,0x9f]]);
const sanitize=(input,max=3000)=>String(input??"").replace(/\s+/g," ").trim().slice(0,max);
function pdfEscaped(input){
  let result="";
  for(const char of sanitize(input)){
    const cp=char.codePointAt(0),code=(cp>=32&&cp<=126)||(cp>=160&&cp<=255)?cp:WIN_1252.get(cp);
    if(code===undefined){result+="?";continue;}
    if(code===40||code===41||code===92)result+="\\"+String.fromCharCode(code);
    else if(code<127)result+=String.fromCharCode(code);
    else result+="\\"+code.toString(8).padStart(3,"0");
  }
  return result;
}
function estimatedWidth(text,size,bold=false){
  let n=0;for(const c of text){if("ilI!.,:;|'".includes(c))n+=0.25;else if("mwMW@%".includes(c))n+=0.9;else n+=bold?0.57:0.52;}
  return n*size;
}
function wrap(text,width,size,bold=false){
  const words=sanitize(text).split(" ");const result=[];let line="";
  for(let word of words){
    if(!word)continue;
    const next=line?line+" "+word:word;
    if(estimatedWidth(next,size,bold)<=width){line=next;continue;}
    if(line){result.push(line);line="";}
    while(estimatedWidth(word,size,bold)>width){
      let k=1;while(k<word.length&&estimatedWidth(word.slice(0,k+1),size,bold)<=width)k++;
      result.push(word.slice(0,k));word=word.slice(k);
    }
    line=word;
  }
  if(line)result.push(line);
  return result.length?result:["—"];
}
function makePdf(pdfPages){
  const enc=new TextEncoder(),objects=[null,
    "<< /Type /Catalog /Pages 2 0 R >>",null,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>"];
  const ids=[];
  for(const page of pdfPages){
    const stream=enc.encode(page.join("\n")+"\n"),contentId=objects.length;
    objects.push([enc.encode(`<< /Length ${stream.length} >>\nstream\n`),stream,enc.encode("endstream")]);
    const pageId=objects.length;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_W} ${PAGE_H}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentId} 0 R >>`);
    ids.push(pageId);
  }
  objects[2]=`<< /Type /Pages /Kids [${ids.map(i=>i+" 0 R").join(" ")}] /Count ${ids.length} >>`;
  const chunks=[],offsets=[0];let pos=0;
  function add(value){const bytes=typeof value==="string"?enc.encode(value):value;chunks.push(bytes);pos+=bytes.length;}
  add("%PDF-1.4\n");
  for(let i=1;i<objects.length;i++){
    offsets[i]=pos;add(`${i} 0 obj\n`);
    const object=objects[i];if(Array.isArray(object))object.forEach(add);else add(object);
    add("\nendobj\n");
  }
  const xref=pos;
  add(`xref\n0 ${objects.length}\n0000000000 65535 f \n`);
  for(let i=1;i<objects.length;i++)add(String(offsets[i]).padStart(10,"0")+" 00000 n \n");
  add(`trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
  const out=new Uint8Array(pos);let offset=0;
  for(const piece of chunks){out.set(piece,offset);offset+=piece.length;}
  return out;
}

// Input comes exclusively from DOM text nodes of the already authorized report.
export function generarPdfHojas(hojas){
  if(!Array.isArray(hojas)||!hojas.length||hojas.length>21)throw Error("Cantidad de hojas PDF no válida.");
  const pdfPages=[];let commands=[],y=0,rowCount=0;
  const newPage=()=>{
    if(pdfPages.length>=180)throw Error("El informe es demasiado largo para exportar de forma segura.");
    commands=[];pdfPages.push(commands);y=PAGE_H-MARGIN;
    commands.push(`BT /F2 8 Tf 0.12 0.23 0.38 rg 1 0 0 1 ${MARGIN} ${y.toFixed(2)} Tm (VISURA PREPARA) Tj ET`);
    y-=24;
  };
  function addLine(text,{size=9.5,bold=false,space=3,indent=0}={}){
    const lines=wrap(text,CONTENT_W-indent,size,bold);
    for(const line of lines){
      if(y-size*1.5<49)newPage();
      commands.push(`BT /${bold?"F2":"F1"} ${size} Tf 0 0 0 rg 1 0 0 1 ${(MARGIN+indent).toFixed(2)} ${y.toFixed(2)} Tm (${pdfEscaped(line)}) Tj ET`);
      y-=size*1.40;
    }
    y-=space;
  }
  function rule(){if(y<65)newPage();commands.push(`q 0.78 G ${MARGIN} ${y.toFixed(2)} m ${(PAGE_W-MARGIN).toFixed(2)} ${y.toFixed(2)} l S Q`);y-=12;}
  for(const hoja of hojas){
    if(!hoja||!['carga','portada'].includes(hoja.tipo))throw Error("Tipo de informe PDF no reconocido.");
    newPage();
    if(hoja.tipo==='portada'){
      addLine(hoja.titulo||'RELACIÓN DE HOJAS DE PREPARACIÓN',{size:15,bold:true,space:10});rule();
      for(const linea of hoja.detalles||[])addLine(linea,{size:10,space:4});
      rule();
      for(const fila of hoja.filas||[])addLine(fila,{size:9,space:2});
      addLine('Archivo manual: comprueba la copia antes de eliminar ningún documento.',{size:8,space:6});
      continue;
    }
    addLine(hoja.titulo||'HOJA DE PREPARACIÓN POR PASILLOS',{size:15,bold:true,space:4});
    addLine('Exclusivamente mercancía procesada',{size:9,space:8});rule();
    for(const campo of hoja.cabecera||[])addLine(campo,{size:9.5,space:2});
    rule();
    for(const pasillo of hoja.pasillos||[]){
      addLine(pasillo.titulo||'Pasillo',{size:12,bold:true,space:6});
      for(const linea of pasillo.lineas||[]){
        if(++rowCount>15000)throw Error("El informe contiene demasiadas líneas.");
        if(y<95)newPage();
        addLine(`${linea.referencia||'SIN REFERENCIA'}  ·  ${linea.cantidad||'—'} ${linea.unidad||''}`,{size:9.8,bold:true,space:1});
        addLine(linea.descripcion||'Sin descripción',{size:9.2,indent:9,space:1});
        addLine('Ubicación: '+(linea.ubicacion||'Sin ubicación'),{size:8,indent:9,space:5});
      }
      addLine(pasillo.total||'Fin de pasillo',{size:9,bold:true,space:6});rule();
    }
    addLine(hoja.pie||'El picking se registra en Business Central.',{size:8,space:2});
  }
  return makePdf(pdfPages);
}

export function extraerHojasDeInforme(reportPaper){
  const hojas=[];
  const cover=reportPaper.querySelector('.archive-cover');
  if(cover){
    hojas.push({tipo:'portada',titulo:cover.querySelector('h1')?.textContent,
      detalles:[...cover.querySelectorAll('p')].map(el=>el.textContent),
      filas:[...cover.querySelectorAll('tbody tr')].map(tr=>[...tr.querySelectorAll('td')].map(td=>td.textContent).join(' · '))});
  }
  for(const article of reportPaper.querySelectorAll('article.preparation-report')){
    hojas.push({tipo:'carga',titulo:article.querySelector('header h1')?.textContent,
      cabecera:[...article.querySelectorAll('dl div')].map(el=>el.querySelector('dt')?.textContent+': '+(el.querySelector('dd')?.textContent||'')),
      pasillos:[...article.querySelectorAll('.report-aisle')].map(section=>({
        titulo:section.querySelector('h2')?.textContent,
        lineas:[...section.querySelectorAll('tbody tr')].map(tr=>{
          const c=[...tr.querySelectorAll('td')].map(el=>el.textContent);
          return {ubicacion:c[0],referencia:c[1],descripcion:c[2],cantidad:c[3],unidad:c[4]};
        }),
        total:section.querySelector('tfoot')?.textContent
      })),
      pie:article.querySelector('footer')?.textContent});
  }
  if(!hojas.some(x=>x.tipo==='carga'))throw Error('No hay hojas de preparación para exportar.');
  return hojas;
}

export function nombrePdfInforme(titulo){
  return (sanitize(titulo,150).normalize('NFD').replace(/[\u0300-\u036f]/g,'')
    .replace(/[^A-Za-z0-9_-]+/g,'_').replace(/^_+|_+$/g,'').slice(0,100)||'VISURA_PREPARA')+'.pdf';
}
