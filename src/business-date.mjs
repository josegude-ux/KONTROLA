// Fecha de trabajo del almacén en España peninsular. Evita usar UTC cerca de medianoche.
// Europe/Madrid incluye el horario de verano y los cambios de hora automáticamente.
export function fechaAlmacen(instant=new Date()){
  const parts=new Intl.DateTimeFormat("en-GB",{
    timeZone:"Europe/Madrid",year:"numeric",month:"2-digit",day:"2-digit"
  }).formatToParts(instant);
  const values=Object.fromEntries(parts.filter(p=>p.type!=="literal").map(p=>[p.type,p.value]));
  return [values.year,values.month,values.day].join("-");
}
