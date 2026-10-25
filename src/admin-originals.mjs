import {inventariarOriginalesLocales} from "./legacy-originals.mjs";
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
