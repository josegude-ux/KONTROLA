// Datos ENTERAMENTE SINTÉTICOS. No provienen de Business Central ni de producción.
export const LAB_LOADS=Object.freeze([
  {loadId:'LAB-COR-001',warehouse:'COR_01_COR',fechaCarga:'2026-11-05',fechaRecepcionAcreditada:null,
    originalEvidence:{kind:'LAB_SYNTHETIC_SHEET',documentId:'HOJA-SINTETICA-001'},
    originalLines:[{lineId:'1',sku:'MAH-LAB-A',quantity:'10',unit:'CAJA'},
      {lineId:'2',sku:'REF-LAB-B',quantity:'4',unit:'UD'}]},
  {loadId:'LAB-COR-002',warehouse:'COR_01_COR',fechaCarga:'2026-11-03',fechaRecepcionAcreditada:null,
    originalEvidence:{kind:'LAB_SYNTHETIC_SHEET',documentId:'HOJA-SINTETICA-002'},
    originalLines:[{lineId:'1',sku:'MAH-LAB-A',quantity:'8',unit:'CAJA'}]},
  {loadId:'LAB-COR-003',warehouse:'COR_01_COR',fechaCarga:'2026-11-04',fechaRecepcionAcreditada:null,
    originalEvidence:null,originalLines:null},
  {loadId:'LAB-FER-004',warehouse:'COR_02_FER',fechaCarga:'2026-11-05',fechaRecepcionAcreditada:null,
    originalEvidence:{kind:'LAB_SYNTHETIC_SHEET',documentId:'HOJA-SINTETICA-004'},
    originalLines:[{lineId:'1',sku:'FER-LAB-X',quantity:'3',unit:'PALET'}]},
]);
export const LAB_ACTORS=Object.freeze({
  'lab-almacen':{active:true,warehouses:['COR_01_COR'],permissions:['RETURN_READ','RETURN_OPEN','RETURN_INCIDENT_ADD','RETURN_CLOSE']},
  'lab-supervisor':{active:true,warehouses:['COR_01_COR','COR_02_FER'],permissions:['RETURN_READ','RETURN_OPEN','RETURN_INCIDENT_ADD','RETURN_CLOSE']},
  'lab-lector':{active:true,warehouses:['COR_01_COR'],permissions:['RETURN_READ']},
  'lab-ferrol':{active:true,warehouses:['COR_02_FER'],permissions:['RETURN_READ','RETURN_OPEN','RETURN_INCIDENT_ADD','RETURN_CLOSE']},
  'lab-inactivo':{active:false,warehouses:['COR_01_COR'],permissions:['RETURN_READ','RETURN_CLOSE']}
});
