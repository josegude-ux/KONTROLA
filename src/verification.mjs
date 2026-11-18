const finiteQuantity=value=>typeof value==="number"&&Number.isFinite(value)&&value>=0;

export function parseCheckedQuantity(raw){
  const text=String(raw??"").trim().replace(",",".");
  if(!/^\d+(?:\.\d{1,3})?$/.test(text))throw Error("Introduce una cantidad válida, con un máximo de tres decimales.");
  const value=Number(text);
  if(!finiteQuantity(value))throw Error("Introduce una cantidad válida.");
  return value;
}

export function buildVerificationLines(products=[]){
  return products.map((product,index)=>({
    lineNumber:index+1,
    sku:String(product?.sku||""),
    description:String(product?.description||""),
    location:String(product?.location||""),
    expectedQuantity:Number(product?.qty),
    unit:String(product?.unit||""),
    checkedQuantity:null
  }));
}

export function summarizeVerification(lines=[]){
  let checked=0,matches=0,differences=0;
  for(const line of lines){
    if(!finiteQuantity(line?.checkedQuantity))continue;
    checked++;
    if(Number(line.checkedQuantity)===Number(line.expectedQuantity))matches++;
    else differences++;
  }
  const total=lines.length;
  return {total,checked,pending:total-checked,matches,differences,canFinish:total>0&&checked===total};
}
