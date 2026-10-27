-- VISURA PREPARA B01 · propuesta adicional: evidencia BC POR CADA LÍNEA modificada.
-- BORRADOR NO APLICADO. Requiere controles de integración y aprobación posterior.
-- Basado en PR #69 (13b5fbdac50b6e7a2ec4b97bbf2313b7bdbd9fcf).
-- Preserva PDF original, auditoría, estado de publicación y flujos paralelos.
begin;

create or replace function public.kontrola_total_bc_documentado(
 p_carga jsonb,p_correcciones jsonb
)
returns boolean language plpgsql stable security invoker set search_path=''
as $$
declare v_r record;v_original text;v_final text;v_count integer;v_changed integer:=0;
begin
 if jsonb_typeof(p_carga->'productos') is distinct from 'array'
    or jsonb_typeof(p_correcciones) is distinct from 'array' then return false;end if;
 -- Un solo registro válido de OTRA línea no justifica el total global.
 for v_r in
  select value as item,ordinality as num
  from jsonb_array_elements(p_carga->'productos') with ordinality
 loop
  v_original:=v_r.item#>>'{pdfOriginal,qty}';
  v_final:=v_r.item->>'qty';
  if v_original is null then continue;end if;
  if coalesce(v_original,'') !~ '^[0-9]+([.][0-9]{1,3})?$'
     or coalesce(v_final,'') !~ '^[0-9]+([.][0-9]{1,3})?$' then
   return false;
  end if;
  if v_original::numeric=v_final::numeric then continue;end if;
  v_changed:=v_changed+1;
  select count(*) into v_count
  from jsonb_array_elements(p_correcciones) c
  where c->>'line'=v_r.num::text
   and c->>'field'='qty'
   and c->>'tipo'='dato_pdf_bc'
   and length(trim(coalesce(c->>'justificacion','')))>=15
   and nullif(c->>'by','') is not null
   and nullif(c->>'at','') is not null
   and case when coalesce(c->>'after','') ~ '^[0-9]+([.][0-9]{1,3})?$'
      then (c->>'after')::numeric=v_final::numeric else false end;
  if v_count<1 then return false;end if;
 end loop;
 return v_changed>0;
end;
$$;
revoke all on function public.kontrola_total_bc_documentado(jsonb,jsonb) from public,anon,authenticated;

-- Anclaje del origen del PDF al JSON previamente guardado en servidor.
-- Evita que el cliente invente pdfOriginal o cambie una segunda cantidad
-- sin preservar la cantidad de la importación original.
create or replace function public.kontrola_bc_origen_preservado(
 p_nueva jsonb,p_guardada jsonb
)
returns boolean language plpgsql stable security invoker set search_path=''
as $$
declare v_r record;v_prev jsonb;v_original text;v_prev_original text;v_qty text;v_old_qty text;
begin
 if jsonb_typeof(p_nueva->'productos') is distinct from 'array'
   or jsonb_typeof(p_guardada->'productos') is distinct from 'array' then return false;end if;
 if jsonb_array_length(p_nueva->'productos')<>jsonb_array_length(p_guardada->'productos') then return false;end if;
 for v_r in
  select value as item,ordinality as num
  from jsonb_array_elements(p_nueva->'productos') with ordinality
 loop
  v_prev:=p_guardada->'productos'->(v_r.num::integer-1);
  v_old_qty:=v_prev->>'qty';
  v_prev_original:=v_prev#>>'{pdfOriginal,qty}';
  v_original:=v_r.item#>>'{pdfOriginal,qty}';
  v_qty:=v_r.item->>'qty';
  if coalesce(v_old_qty,'') !~ '^[0-9]+([.][0-9]{1,3})?$'
   or coalesce(v_qty,'') !~ '^[0-9]+([.][0-9]{1,3})?$' then return false;end if;
  if v_prev_original is not null then
   if coalesce(v_prev_original,'') !~ '^[0-9]+([.][0-9]{1,3})?$' or v_original is null then return false;end if;
   if coalesce(v_original,'') !~ '^[0-9]+([.][0-9]{1,3})?$'
      or v_original::numeric<>v_prev_original::numeric then return false;end if;
  elsif v_original is not null then
   if coalesce(v_original,'') !~ '^[0-9]+([.][0-9]{1,3})?$'
    or v_original::numeric<>v_old_qty::numeric then return false;end if;
  elsif v_qty::numeric<>v_old_qty::numeric then
   -- Cantidad modificada sin origen registrado: nunca avalarla como BC.
   return false;
  end if;
 end loop;
 return true;
end;
$$;
revoke all on function public.kontrola_bc_origen_preservado(jsonb,jsonb) from public,anon,authenticated;

create or replace function public.kontrola_corregir_importacion(
 p_importacion uuid,p_carga jsonb,p_hallazgos jsonb,p_correcciones jsonb,p_confirmar_advertencias boolean
)
returns text language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_row public.kontrola_importaciones%rowtype;v_has_errors boolean;v_almacen text;v_bc boolean;
begin
 if v_user is null or not public.kontrola_es_administrador() then raise exception 'Solo administración puede corregir' using errcode='42501';end if;
 select i.* into v_row from public.kontrola_importaciones i where i.id=p_importacion for update;
 if not found or v_row.estado not in ('revision_requerida','aprobada') then raise exception 'Importación no editable' using errcode='22023';end if;
 if jsonb_typeof(p_carga) is distinct from 'object' or jsonb_typeof(p_carga->'productos') is distinct from 'array'
   or jsonb_typeof(p_hallazgos) is distinct from 'array' or jsonb_typeof(p_correcciones) is distinct from 'array' then
  raise exception 'Contenido corregido inválido' using errcode='22023';end if;
 v_almacen:=upper(nullif(p_carga->>'almacen',''));
 -- El total impreso es inmutable incluso cuando no haya una excepción BC.
 if (p_carga->>'declared_total') is distinct from (v_row.carga_datos->>'declared_total') then
  raise exception 'No se puede sustituir el total documental original' using errcode='22023';end if;
 v_bc:=public.kontrola_total_bc_documentado(p_carga,p_correcciones);
 if v_bc and not public.kontrola_bc_origen_preservado(p_carga,v_row.carga_datos) then
  raise exception 'Las cantidades no conservan el origen del PDF' using errcode='22023';end if;
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
