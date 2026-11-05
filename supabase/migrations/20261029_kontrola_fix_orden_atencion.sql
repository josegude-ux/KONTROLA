-- Corrección de ORDER BY en UNION ALL, sin alterar datos ni otras aplicaciones.
create or replace function public.kontrola_necesitan_atencion(p_almacen text)
returns table(tipo text,entidad_id text,codigo text,titulo text,detalle text,creado_en timestamptz)
language plpgsql stable security definer set search_path=''
as $$
begin
 if not public.kontrola_es_administrador() then raise exception 'Solo administración' using errcode='42501';end if;
 return query
 select 'importacion',i.id::text,i.codigo,
  case when i.almacen_detectado not in ('COR_01_COR','COR_02_NAR') then 'Pendiente de clasificar' else 'PDF pendiente de revisar' end,
  coalesce(i.error,'Revisar hallazgos del documento'),i.actualizado_en
 from public.kontrola_importaciones i
 where i.estado in ('reservada','revision_requerida','fallida')
  and (p_almacen is null or i.almacen_detectado=p_almacen or i.almacen_detectado is null)
 union all
 select 'carga',c.codigo,c.codigo,'Pendiente de clasificar','Carga anterior sin almacén documental confirmado',c.actualizado_en
 from public.kontrola_cargas c
 where c.almacen='PEND_00_CLAS' and p_almacen is null
 union all
 select 'verificacion',v.id::text,v.codigo,'Verificación incompleta','Continuar la comprobación línea por línea',v.inicio
 from public.kontrola_verificaciones v join public.kontrola_cargas c on c.codigo=v.codigo
 where v.estado='en_curso' and (p_almacen is null or c.almacen=p_almacen)
 union all
 select 'incidencia',i.id::text,i.codigo,'Incidencia pendiente','Referencia '||i.sku||' · diferencia '||i.diferencia,i.detectada_en
 from public.kontrola_incidencias i join public.kontrola_cargas c on c.codigo=i.codigo
 where i.estado='pendiente' and (p_almacen is null or c.almacen=p_almacen)
 order by 6;
end;
$$;
revoke all on function public.kontrola_necesitan_atencion(text) from public,anon;
grant execute on function public.kontrola_necesitan_atencion(text) to authenticated;
