// VISURA PREPARA ALMACÉN · PRUEBA_3 R7: hoja individual FRÍO CORUÑA.
// Datos aislados: NO introduce carga ni modificación en Supabase.
// Falta de destino acreditado => no generar folio (no inferir por almacén).
import {destinoAcreditado} from "./visura-print-r7-core.mjs";
const get=s=>String(s??"").trim();
const identificador=s=>/^LP\d{2}-\d{4,6}$/.test(get(s));
const numero=n=>Number.isFinite(Number(n))?Number(n).toLocaleString("es-ES",{maximumFractionDigits:3}):"—";

function lineasFrio(row){
 return (Array.isArray(row?.productos)?row.productos:[]).filter(p=>
   get(p?.location).toUpperCase()==="ZFRIO"&&
   p.qty!==null&&p.qty!==undefined&&Number.isFinite(Number(p.qty))&&Number(p.qty)>0);
}
function itemKey(item){
 return [get(item?.sku).toUpperCase(),get(item?.location).toUpperCase(),Number(item?.qty),
   get(item?.unit).toUpperCase()].join("|");
}
export function planHojaFrioCorunaR7(row,parsed){
 if(!row||row.almacen!=="COR_01_COR"||!identificador(row.codigo))
   throw Error("No existe LP de origen COR1 acreditada.");
 const all=lineasFrio(row);
 if(!all.length)return null;
 if(destinoAcreditado(row)!=="CORUÑA")return null; // Ferrol o destino pendiente no autorizan folio Coruña.
 if(!parsed||parsed.id!==row.codigo||parsed.warehouse!=="COR_01_COR"||
   parsed.verified!==true||!Array.isArray(parsed.products)||
   !Array.isArray(parsed.pageNumbers)||!parsed.pageNumbers.length)
   throw Error("La LP no acredita origen, páginas o cantidades del PDF BC para FRÍO CORUÑA.");
 if(all.length>42)throw Error("Más de 42 productos ZFRIO: no cabe en una hoja individual.");
 const expected=lineasFrio({productos:parsed.products}).map(itemKey).sort();
 const current=all.map(itemKey).sort();
 if(expected.length!==current.length||expected.some((x,i)=>x!==current[i]))
   throw Error("El frío de la carga ha cambiado respecto al PDF original: revisar antes de imprimir.");
 const repartidor=get(row.repartidor??row.driver).split(/[;,]/)[0]
   .replace(/^\s*[A-Z]{1,3}\d{2,4}\s+/i,"").trim();
 if(!repartidor)throw Error("Falta repartidor para la hoja individual FRÍO CORUÑA.");
 const items=all.map(p=>{
   const desc=get(p.description)||get(p.sku);
   if(!desc)throw Error("Hay un producto de frío sin referencia ni descripción.");
   return {descripcion:desc,cantidad:Number(p.qty),unidad:get(p.unit),sku:get(p.sku)};
 });
 return {codigo:row.codigo,matricula:get(row.matricula)||"NO CONSTA",
   repartidor,fecha:get(row.fecha),productos:items};
}

function safeWinAnsi(s){
 // Fontes StandardFonts WinAnsi; bloquear signos no soportados en vez de perder datos.
 const x=get(s).normalize("NFC");
 if(/[\u0000-\u001f\u007f-\u009f]/.test(x))throw Error("Carácter de control en hoja de frío.");
 // Encodificación WinAnsi: acentos y caracteres latinos habituales válidos.
 for(const ch of x){if(!(/[\u0020-\u007e\u00a0-\u00ff\u20ac\u2013\u2014\u2018\u2019]/u.test(ch))) 
   throw Error("La fuente de impresión no admite un carácter en frío. Revisar texto.");
 }
 return x;
}
function wrap(font,text,limit,size){
 const words=safeWinAnsi(text).split(/\s+/);const rows=[];let acc="";
 for(const word of words){
   if(font.widthOfTextAtSize(word,size)>limit)
     throw Error("Descripción demasiado larga para el formato individual FRÍO CORUÑA.");
   const cand=acc?acc+" "+word:word;
   if(font.widthOfTextAtSize(cand,size)<=limit)acc=cand;
   else{if(acc)rows.push(acc);acc=word}
 }
 if(acc)rows.push(acc);
 if(rows.length>2)throw Error("Descripción de frío no cabe íntegra en dos líneas.");
 return rows;
}
export async function dibujarHojaFrioCorunaR7(doc,hoja,{StandardFonts,rgb}){
 if(!doc||!hoja||!Array.isArray(hoja.productos)||!hoja.productos.length||hoja.productos.length>42)
   throw Error("Hoja individual de frío inválida.");
 if(!StandardFonts?.Helvetica||!StandardFonts?.HelveticaBold||typeof doc.embedFont!=="function")
   throw Error("Generador de fuentes PDF inválido.");
 const font=await doc.embedFont(StandardFonts.Helvetica);
 const bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const dark=rgb(.06,.16,.29),sub=rgb(.31,.38,.46),pale=rgb(.92,.95,.97);
 const width=841.89,height=595.28,margin=37;
 const page=doc.addPage([width,height]);
 const write=(value,x,y,size=12,weight=false,color=dark)=>{
   page.drawText(safeWinAnsi(value),{x,y,size,font:weight?bold:font,color});
 };
 page.drawRectangle({x:margin,y:height-91,width:width-2*margin,height:61,color:pale});
 write("REPARTIDOR · FRÍO CORUÑA",margin+12,height-47,13,true);
 const name=safeWinAnsi(hoja.repartidor);
 let size=37;while(size>22&&bold.widthOfTextAtSize(name,size)>width-2*margin-24)size-=1;
 if(bold.widthOfTextAtSize(name,size)>width-2*margin-24)
   throw Error("El nombre del repartidor no cabe en la hoja A4.");
 write(name,margin+12,height-83,size,true);
 write("MATRÍCULA",margin,height-126,10,true,sub);write(hoja.matricula,margin,height-147,17,true);
 write("NÚMERO DE CARGA",margin+400,height-126,10,true,sub);write(hoja.codigo,margin+400,height-147,17,true);
 write("PRODUCTOS DE FRÍO CORUÑA",margin,height-184,16,true);
 write(hoja.productos.length+" "+(hoja.productos.length===1?"REFERENCIA":"REFERENCIAS"),width-margin-130,height-184,10,true,sub);
 const n=hoja.productos.length,cols=n>24?3:n>10?2:1,gap=14;
 const colW=(width-2*margin-(cols-1)*gap)/cols,rows=Math.ceil(n/cols),top=height-208,bottom=35;
 const rowHeight=(top-bottom)/rows;const itemFont=n>24?9.4:n>16?11:n>9?12.5:n>5?15:18;
 if(rowHeight<itemFont*2+3)throw Error("Las líneas de frío no caben sin recortarse.");
 for(let i=0;i<n;i++){
   const col=Math.floor(i/rows),line=i%rows,x=margin+col*(colW+gap),y=top-line*rowHeight;
   const p=hoja.productos[i];
   const qty=numero(p.cantidad)+(p.unidad?" "+safeWinAnsi(p.unidad):"");
   const qtySize=Math.max(9,itemFont-1);
   const caption=wrap(font,(i+1)+". "+p.descripcion,colW-8,itemFont);
   if(font.widthOfTextAtSize(qty,qtySize)>colW-5)
     throw Error("Cantidad/unidad demasiado larga para la hoja de frío.");
   caption.forEach((txt,j)=>write(txt,x,y-j*(itemFont+2),itemFont,false));
   // Cantidad siempre visible, sin compartir la línea con el siguiente producto.
   const qy=y-caption.length*(itemFont+2)-1;
   if(qy < y-rowHeight+2)throw Error("Producto de frío no cabe sin invadir otra fila.");
   write(qty,x+colW-font.widthOfTextAtSize(qty,qtySize)-5,qy,qtySize,true);
 }
 return page;
}
