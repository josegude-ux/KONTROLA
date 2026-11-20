// VISURA PREPARA · Anexos generales de FRÍO CORUÑA / FERROL (y barriles Ferrol).
// Los folios se añaden DESPUÉS de todas las LP, con paridad dúplex por anexo.
import {destinoAcreditado} from "./visura-print-r7-core.mjs";
const text=s=>String(s??"").trim();
const key=p=>[text(p.sku).toUpperCase(),text(p.location).toUpperCase(),Number(p.qty),text(p.unit).toUpperCase()].join("|");
const isCold=p=>text(p?.location).toUpperCase()==="ZFRIO"&&p.qty!==null&&p.qty!==undefined&&Number.isFinite(Number(p.qty))&&Number(p.qty)>0;
const isBarrel=p=>text(p?.unit).toUpperCase()==="BARRIL"&&text(p?.location).toUpperCase()!=="ZFRIO"&&p.qty!==null&&Number.isFinite(Number(p.qty))&&Number(p.qty)>0;
const subset=(xs,fn)=>(Array.isArray(xs)?xs:[]).filter(fn);
const compare=(a,b)=>a.length===b.length&&a.map(key).sort().every((s,i)=>s===b.map(key).sort()[i]);

export function planAnexoFrioCargaR7(row,parsed){
 if(row?.almacen!=="COR_01_COR"||!/^LP\d{2}-\d{4,6}$/.test(text(row?.codigo)))
   throw Error("Anexo de frío requiere una LP COR1 acreditada.");
 const destino=destinoAcreditado(row);
 if(!destino)return null;
 const fecha=text(row.fecha);
 if(!/^\d{4}-\d{2}-\d{2}$/.test(fecha))throw Error("Fecha BC no válida para anexo de frío.");
 const original=parsed?.products,server=row.productos;
 if(!Array.isArray(original)||!Array.isArray(server)||parsed.verified!==true||
   parsed.id!==row.codigo||parsed.warehouse!=="COR_01_COR")
   throw Error("Anexo de frío: documento BC no verificado.");
 const frio=subset(server,isCold),origFrio=subset(original,isCold);
 const barriles=destino==="FERROL"?subset(server,isBarrel):[],
   origBarriles=destino==="FERROL"?subset(original,isBarrel):[];
 if(!compare(frio,origFrio)||!compare(barriles,origBarriles))
   throw Error("Anexo de frío: cantidades o referencias distintas del original BC.");
 const name=text(row.repartidor).replace(/\b(?:DF|CF|BF)\d+\s*/gi,"").trim();
 const product=p=>({codigo:row.codigo,repartidor:name||"NO CONSTA",descripcion:text(p.description)||text(p.sku),qty:Number(p.qty)});
 return {codigo:row.codigo,destino,fecha,
   frio:frio.map(product),barriles:barriles.map(product)};
}

const latin=s=>{
 const v=text(s);if(/[^\u0020-\u007e\u00a0-\u00ff\u20ac\u2013\u2014\u2018\u2019]/u.test(v))
   throw Error("El anexo contiene caracteres que la fuente PDF no admite.");
 return v;
};
function wrap(font,s,size,width){
 const words=latin(s).split(/\s+/);let line="",result=[];
 for(const word of words){
   if(font.widthOfTextAtSize(word,size)>width)throw Error("Descripción demasiado larga en anexo de frío.");
   const trial=line?line+" "+word:word;
   if(font.widthOfTextAtSize(trial,size)>width){if(line)result.push(line);line=word}else line=trial;
 }
 if(line)result.push(line);
 if(result.length>2)throw Error("Descripción de frío no cabe sin recortes.");
 return result;
}
export async function anexarInformesFrioR7(doc,items,{StandardFonts,rgb}={}){
 if(!doc||!Array.isArray(items)||items.length>5||!StandardFonts?.HelveticaBold)
   throw Error("Formato de anexos inválido.");
 if(!items.length)return {paginas:0,grupos:0};
 const font=await doc.embedFont(StandardFonts.Helvetica),bold=await doc.embedFont(StandardFonts.HelveticaBold);
 const W=841.89,H=595.28,margin=31,bottom=44,rowH=38;
 const dark=rgb(.06,.16,.27),muted=rgb(.35,.4,.45),pale=rgb(.88,.92,.96);
 const groups=new Map();
 for(const item of items){
   if(!item||!["CORUÑA","FERROL"].includes(item.destino)||!/^\d{4}-\d{2}-\d{2}$/.test(item.fecha))
     throw Error("Anexo con destino o fecha no acreditados.");
   const key=item.fecha+"|"+item.destino;if(!groups.has(key))groups.set(key,[]);
   groups.get(key).push(item);
 }
 const list=[...groups.entries()].sort((a,b)=>a[0].localeCompare(b[0],"es"));
 let added=0;
 for(const [id,loads] of list){
   const [fecha,destino]=id.split("|");
   const start=doc.getPageCount();
   const cold=loads.flatMap(r=>r.frio),barrels=destino==="FERROL"?loads.flatMap(r=>r.barriles):[];
   const sections=[["FRÍO REFRIGERADO",cold]];
   if(destino==="FERROL")sections.push(["BARRILES",barrels]);
   let page=null,y=0;
   const write=(txt,x,Y,size=9,weight=false,color=dark)=>{
     page.drawText(latin(txt),{x,y:Y,size,font:weight?bold:font,color});
   };
   const init=(section)=>{
     if(added>=120)throw Error("Los anexos son demasiado largos.");
     page=doc.addPage([W,H]);added++;y=H-42;
     write("FRÍO "+destino,margin,y,18,true);y-=22;
     write("Fecha: "+fecha.slice(8)+"/"+fecha.slice(5,7)+"/"+fecha.slice(0,4)+"  ·  Almacén origen: COR_01_COR",margin,y,11,true);y-=28;
     write(section,margin,y,12,true);y-=21;
     page.drawRectangle({x:margin,y:y-7,width:W-2*margin,height:23,color:pale});
     write("CARGA",margin+7,y,9,true);write("REPARTIDOR",margin+105,y,9,true);
     write("DESCRIPCIÓN",margin+270,y,9,true);write("CANTIDAD",margin+632,y,9,true);
     write("PESO REAL",margin+699,y,9,true);y-=31;
   };
   for(const [section,rows] of sections){
     init(section);
     if(!rows.length){write("Sin referencias para este apartado.",margin+8,y,10);continue}
     for(const r of rows){
       if(y-rowH<bottom)init(section+" (continuación)");
       const desc=wrap(font,r.descripcion,9.5,340);
       const qty=Number(r.qty).toLocaleString("es-ES",{maximumFractionDigits:3});
       write(r.codigo,margin+7,y,9);
       const repart=wrap(font,r.repartidor,8.7,159);
       repart.forEach((s,i)=>write(s,margin+105,y-i*11,8.7));
       desc.forEach((s,i)=>write(s,margin+270,y-i*11,9.5));
       write(qty,margin+632,y,10,true);
       // Columna PESO REAL deliberadamente vacía para completar en papel.
       y-=rowH;
     }
   }
   // Cada anexo constituye una unidad física independiente de las LP.
   if((doc.getPageCount()-start)%2){doc.addPage([W,H]);added++;}
 }
 return {paginas:added,grupos:list.length};
}
