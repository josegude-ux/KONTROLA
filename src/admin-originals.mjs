import {inventariarOriginalesLocales,recuperarPdfOriginalLocal} from "./legacy-originals.mjs";
const $=id=>document.getElementById(id);
const line=(label,value)=>{
  const p=document.createElement("p");p.className="legacy-audit-line";
  const strong=document.createElement("b");strong.textContent=label+": ";
  p.append(strong,document.createTextNode(String(value)));return p;
};
export function configurarInventarioOriginales({getUser,errorText}){
  const button=$("legacyOriginalsScan"),status=$("legacyOriginalsStatus");
  const results=$("legacyOriginalsResults");
  let active=0;
  async function scan(){
    const current=++active,session=getUser()?.id;
    results.replaceChildren();
    if(!session)return void(status.textContent="Debes iniciar sesión de administrador.");
    button.disabled=true;
    status.textContent="Buscando originales locales en este contenedor del navegador…";
    try{
      const inventory=await inventariarOriginalesLocales();
      if(active!==current||getUser()?.id!==session)return;
      if(!inventory.disponible){
        status.textContent=inventory.razon;
        results.append(line("Atención","Si los PDF se guardaron en otra PWA o en Safari, pueden seguir allí. No desinstales la aplicación original."));
        return;
      }
      results.append(line("Entradas locales encontradas",inventory.cantidad),
        line("Claves de documento vigente",inventory.vigentes),
        line("Claves de revisión histórica",inventory.versiones),
        line("Claves no reconocidas",inventory.desconocidas));
      if(inventory.truncado)results.append(line("Límite","Solo se clasificaron las primeras 5.000 claves."));
      for(const item of inventory.porCarga.slice(0,25)){
        results.append(line("Carga",item.codigo+" · "+(item.vigente?"vigente encontrado":"sin clave vigente")+
          " · "+item.versiones+" clave(s) histórica(s)"));
      }
      results.append(line("Aviso",inventory.aviso));
      // Nunca descargar nada sin clic explícito del administrador.
      // Los archivos se copian a Descargas; los originales permanecen intactos.
      const eligible=inventory.claves.slice(0,25);
      for(const item of eligible){
        const download=document.createElement("button");
        download.type="button";download.className="secondary";
        download.textContent="Guardar PDF "+item.codigo+(item.tipo==="version"?" (revisión histórica)":" (vigente)");
        download.addEventListener("click",async()=>{
          if(download.disabled||active!==current||getUser()?.id!==session)return;
          download.disabled=true;
          status.textContent="Verificando SHA-256 del PDF "+item.codigo+" antes de guardar una copia…";
          try{
            const file=await recuperarPdfOriginalLocal(item.clave);
            if(active!==current||getUser()?.id!==session)return;
            const url=URL.createObjectURL(file.blob);
            const link=document.createElement("a");
            link.href=url;link.download="Control_Cargas_original_"+file.codigo+"_"+file.hash.slice(0,12)+".pdf";
            document.body.appendChild(link);link.click();link.remove();
            setTimeout(()=>URL.revokeObjectURL(url),120000);
            status.textContent="Copia local solicitada de "+item.codigo+". El PDF original sigue intacto en el almacenamiento anterior.";
          }catch(error){
            if(active===current&&getUser()?.id===session)
              status.textContent="No se ha descargado el PDF: "+errorText(error);
          }finally{
            if(active===current)download.disabled=false;
          }
        });
        results.appendChild(download);
      }
      if(inventory.claves.length>eligible.length){
        results.append(line("Límite","Se muestran los primeros 25 botones de guardado; los demás PDF siguen intactos."));
      }
      status.textContent="Inventario local de claves terminado. No se ha abierto, descargado ni modificado ningún PDF.";
    }catch(error){
      if(active!==current||getUser()?.id!==session)return;
      status.textContent="No se pudo comprobar el almacenamiento: "+errorText(error);
    }finally{
      if(active===current)button.disabled=false;
    }
  }
  button.addEventListener("click",scan);
  return {clear:()=>{active++;results.replaceChildren();status.textContent="";button.disabled=false;}};
}
