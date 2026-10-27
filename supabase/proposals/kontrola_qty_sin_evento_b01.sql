-- VISURA PREPARA B01 - Cambios netos compensados y cantidades sin registro.
-- Propuesta experimental. Ejecutar SOLO despues de propuestas PR #72 y neto cero,
-- en PostgreSQL temporal; NO en Supabase productivo.
begin;

create or replace function public.kontrola_cambios_cantidad_trazados(
 p_nueva jsonb,p_guardada jsonb,p_correcciones jsonb,p_actor uuid
)
returns boolean language plpgsql stable security invoker set search_path=''
as $$
declare v_r record;v_prev jsonb;v_old text;v_new text;v_traced boolean;
begin
 if jsonb_typeof(p_nueva->'productos') is distinct from 'array'
  or jsonb_typeof(p_guardada->'productos') is distinct from 'array'
  or jsonb_typeof(p_correcciones) is distinct from 'array' then return false;end if;
 -- Las alteraciones de estructura (añadir/eliminar referencias) siguen bajo
 -- su flujo de revisión documental existente; este helper NO cambia ese contrato.
 if jsonb_array_length(p_nueva->'productos')<>jsonb_array_length(p_guardada->'productos') then
  return true;
 end if;
 for v_r in
  select value as item,ordinality as num
  from jsonb_array_elements(p_nueva->'productos') with ordinality
 loop
  v_prev:=p_guardada->'productos'->(v_r.num::integer-1);
  v_old:=v_prev->>'qty';v_new:=v_r.item->>'qty';
  if coalesce(v_old,'') !~ '^[0-9]+([.][0-9]{1,3})?$'
    or coalesce(v_new,'') !~ '^[0-9]+([.][0-9]{1,3})?$' then return false;end if;
  if v_old::numeric=v_new::numeric then continue;end if;
  select exists(
    select 1 from jsonb_array_elements(p_correcciones) c
    where c->>'line'=v_r.num::text
      and c->>'field'='qty'
      and c->>'tipo' in ('lectura_pdf','dato_pdf_bc')
      and length(trim(coalesce(c->>'justificacion','')))>=15
      and c->>'by'=p_actor::text
      and nullif(c->>'at','') is not null
      and coalesce(c->>'before','') ~ '^[0-9]+([.][0-9]{1,3})?$'
      and coalesce(c->>'after','') ~ '^[0-9]+([.][0-9]{1,3})?$'
      and (c->>'before')::numeric=v_old::numeric
      and (c->>'after')::numeric=v_new::numeric
  ) into v_traced;
  if not v_traced then return false;end if;
 end loop;
 return true;
end;
$$;
revoke all on function public.kontrola_cambios_cantidad_trazados(jsonb,jsonb,jsonb,uuid) from public,anon,authenticated;

create or replace function public.kontrola_corregir_importacion(
 p_importacion uuid,p_carga jsonb,p_hallazgos jsonb,p_correcciones jsonb,p_confirmar_advertencias boolean
)
returns text language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_row public.kontrola_importaciones%rowtype;v_has_errors boolean;v_almacen text;v_bc boolean;v_bc_requested boolean:=false;
begin
 if v_user is null or not public.kontrola_es_administrador() then raise exception 'Solo administración puede corregir' using errcode='42501';end if;
 select i.* into v_row from public.kontrola_importaciones i where i.id=p_importacion for update;
 if not found or v_row.estado not in ('revision_requerida','aprobada') then raise exception 'Importación no editable' using errcode='22023';end if;
 if jsonb_typeof(p_carga) is distinct from 'object' or jsonb_typeof(p_carga->'productos') is distinct from 'array'
   or jsonb_typeof(p_hallazgos) is distinct from 'array' or jsonb_typeof(p_correcciones) is distinct from 'array' then
  raise exception 'Contenido corregido inválido' using errcode='22023';end if;
 v_almacen:=upper(nullif(p_carga->>'almacen',''));
 -- No persistir cantidades nuevas sin evidencia: de lo contrario,
 -- una segunda llamada vería esas cantidades como "anteriores" y podría
 -- aprobarlas ocultando el cambio inicial.
 if not public.kontrola_cambios_cantidad_trazados(p_carga,v_row.carga_datos,p_correcciones,v_user) then
  raise exception 'Cada cambio de cantidad exige evidencia del administrador responsable' using errcode='22023';
 end if;

 -- El total impreso es inmutable incluso cuando no haya una excepción BC.
 if (p_carga->>'declared_total') is distinct from (v_row.carga_datos->>'declared_total') then
  raise exception 'No se puede sustituir el total documental original' using errcode='22023';end if;
 v_bc:=public.kontrola_total_bc_documentado(p_carga,p_correcciones);
 select exists(
  select 1 from jsonb_array_elements(p_correcciones) c
  where c->>'field'='qty' and c->>'tipo'='dato_pdf_bc'
 ) into v_bc_requested;
 -- Proteger cambios BC incluso cuando aumentos y reducciones se compensen
 -- y el total final coincida exactamente con el PDF.
 if v_bc_requested and not public.kontrola_bc_origen_preservado(p_carga,v_row.carga_datos) then
  raise exception 'Las cantidades no conservan el origen del PDF' using errcode='22023';end if;
 if v_bc_requested and not v_bc then
  raise exception 'Falta evidencia BC de alguna línea modificada' using errcode='22023';
 end if;
 v_has_errors:=exists(select 1 from jsonb_array_elements(p_hallazgos) h where h->>'severity'='error')
   or (
     coalesce(p_carga->>'actual_total','') ~ '^[0-9]+([.][0-9]{1,3})?$'
     and coalesce(p_carga->>'declared_total','') ~ '^[0-9]+([.][0-9]{1,3})?$'
     and abs((p_carga->>'actual_total')::numeric-(p_carga->>'declared_total')::numeric)>0.000001
     and not v_bc
   );
 update public.kontrola_importaciones set carga_datos=p_carga,hallazgos=p_hallazgos,
  almacen_detectado=v_almacen,correcciones=p_correcciones,advertencias_confirmadas=p_confirmar_advertencias,
  estado=case when not v_has_errors and p_confirmar_advertencias then 'aprobada' else 'revision_requerida' end,
  actualizado_por=v_user,actualizado_en=now()
 where id=p_importacion;
 insert into public.kontrola_importacion_eventos(importacion_id,tipo,antes,despues,actor_id)
 values(p_importacion,'corregida',v_row.carga_datos,p_carga,v_user);
 return case when not v_has_errors and p_confirmar_advertencias then 'aprobada' else 'revision_requerida' end;
end;
$$;
revoke all on function public.kontrola_corregir_importacion(uuid,jsonb,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.kontrola_corregir_importacion(uuid,jsonb,jsonb,jsonb,boolean) to authenticated;
commit;
