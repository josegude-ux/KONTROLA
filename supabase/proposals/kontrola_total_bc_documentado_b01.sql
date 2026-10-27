-- VISURA PREPARA / Bloque 01 · EXCEPCIÓN DOCUMENTAL BC AUDITADA.
-- PROPUESTA NO APLICADA: ejecutar únicamente PostgreSQL temporal.
-- Mantiene el total original impreso en declared_total, y la suma BC
-- validada en actual_total con correcciones trazadas. No modifica el PDF.
-- Mantiene la condición de revisión administrativa y el bloqueo de
-- sustituciones una vez iniciada Preparación.
begin;

-- Pure internal audit predicate. No direct data writes or RLS bypass.
create or replace function public.kontrola_total_bc_documentado(
 p_carga jsonb,p_correcciones jsonb
)
returns boolean language plpgsql stable security invoker set search_path=''
as $$
declare
 v_corr jsonb;v_item jsonb;v_index integer;v_qty text;v_original text;
begin
 if jsonb_typeof(p_carga->'productos')<>'array'
  or jsonb_typeof(p_correcciones)<>'array' then return false;end if;
 -- Debe existir una corrección de cantidad que coincida exactamente con
 -- la cantidad final de esa línea, conservando el valor leído del PDF.
 for v_corr in select value from jsonb_array_elements(p_correcciones) loop
  if v_corr->>'field'<>'qty' or v_corr->>'tipo'<>'dato_pdf_bc' then continue;end if;
  if coalesce(v_corr->>'line','') !~ '^[1-9][0-9]*$'
   or length(trim(coalesce(v_corr->>'justificacion','')))<15
   or nullif(v_corr->>'by','') is null
   or nullif(v_corr->>'at','') is null then continue;end if;
  v_index:=(v_corr->>'line')::integer;
  if v_index>jsonb_array_length(p_carga->'productos') then continue;end if;
  v_item:=p_carga->'productos'->(v_index-1);
  v_qty:=coalesce(v_item->>'qty','');
  v_original:=coalesce(v_item#>>'{pdfOriginal,qty}','');
  if v_qty !~ '^[0-9]+([.][0-9]{1,3})?$'
   or v_original !~ '^[0-9]+([.][0-9]{1,3})?$'
   or coalesce(v_corr->>'after','') !~ '^[0-9]+([.][0-9]{1,3})?$' then continue;end if;
  if (v_qty)::numeric=(v_corr->>'after')::numeric
   and (v_original)::numeric<>(v_qty)::numeric then return true;end if;
 end loop;
 return false;
end;
$$;
revoke all on function public.kontrola_total_bc_documentado(jsonb,jsonb) from public,anon,authenticated;


create or replace function public.kontrola_corregir_importacion(
 p_importacion uuid,p_carga jsonb,p_hallazgos jsonb,p_correcciones jsonb,p_confirmar_advertencias boolean
)
returns text language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_row public.kontrola_importaciones%rowtype;v_has_errors boolean;v_almacen text;
begin
 if v_user is null or not public.kontrola_es_administrador() then raise exception 'Solo administración puede corregir' using errcode='42501';end if;
 select i.* into v_row from public.kontrola_importaciones i where i.id=p_importacion for update;
 if not found or v_row.estado not in ('revision_requerida','aprobada') then raise exception 'Importación no editable' using errcode='22023';end if;
 if jsonb_typeof(p_carga)<>'object' or jsonb_typeof(p_carga->'productos')<>'array'
  or jsonb_typeof(p_hallazgos)<>'array' or jsonb_typeof(p_correcciones)<>'array' then
  raise exception 'Contenido corregido inválido' using errcode='22023';
 end if;
 v_almacen:=upper(nullif(p_carga->>'almacen',''));
 -- Si un total de BC está justificado, el total impreso del PDF debe ser
 -- exactamente el mismo que se conservó al procesar el original.
 if public.kontrola_total_bc_documentado(p_carga,p_correcciones)
   and (p_carga->>'declared_total') is distinct from (v_row.carga_datos->>'declared_total') then
  raise exception 'No se puede sustituir el total documental original' using errcode='22023';
 end if;
 v_has_errors:=exists(select 1 from jsonb_array_elements(p_hallazgos) h where h->>'severity'='error')
   or (
     coalesce(p_carga->>'actual_total','') ~ '^[0-9]+([.][0-9]{1,3})?$'
     and coalesce(p_carga->>'declared_total','') ~ '^[0-9]+([.][0-9]{1,3})?$'
     and abs((p_carga->>'actual_total')::numeric-(p_carga->>'declared_total')::numeric)>0.000001
     and not public.kontrola_total_bc_documentado(p_carga,p_correcciones)
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

create or replace function public.kontrola_publicar_importacion(p_importacion uuid)
returns table(codigo text,revision integer,almacen text)
language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_i public.kontrola_importaciones%rowtype;v_existing public.kontrola_cargas%rowtype;v_revision integer;v_data jsonb;
begin
 if v_user is null or not public.kontrola_es_administrador() then raise exception 'Solo administración puede publicar' using errcode='42501';end if;
 select i.* into v_i from public.kontrola_importaciones i where i.id=p_importacion for update;
 if not found then raise exception 'Importación inexistente' using errcode='22023';end if;
 if v_i.estado='publicada' then
  select c.revision,c.almacen into v_revision,almacen
  from public.kontrola_cargas c
  where c.codigo=v_i.codigo and c.documento_hash=v_i.documento_hash;
  if v_revision is null then
   raise exception 'Este PDF pertenece al historial de la carga, no es la revisión vigente' using errcode='22023';
  end if;
  codigo:=v_i.codigo;revision:=v_revision;return next;return;
 end if;
 if v_i.estado<>'aprobada' or v_i.almacen_detectado not in ('COR_01_COR','COR_02_NAR') then
  raise exception 'La importación no está aprobada o clasificada' using errcode='22023';
 end if;
 if exists(select 1 from jsonb_array_elements(v_i.hallazgos) h where h->>'severity'='error') then
  raise exception 'Persisten errores bloqueantes' using errcode='22023';
 end if;
 v_data:=v_i.carga_datos;
 if v_data->>'codigo'<>v_i.codigo or v_data->>'almacen'<>v_i.almacen_detectado
  or jsonb_array_length(v_data->'productos')=0
  or nullif(v_data->>'referencias','')::integer<>jsonb_array_length(v_data->'productos')
  or coalesce(v_data->>'actual_total','') !~ '^[0-9]+([.][0-9]{1,3})?$'
  or coalesce(v_data->>'declared_total','') !~ '^[0-9]+([.][0-9]{1,3})?$'
  or (
    abs((v_data->>'actual_total')::numeric-(v_data->>'declared_total')::numeric)>0.000001
    and not public.kontrola_total_bc_documentado(v_data,v_i.correcciones)
   )
  or abs((v_data->>'actual_total')::numeric-coalesce((
   select sum((p->>'qty')::numeric) from jsonb_array_elements(v_data->'productos') p
  ),0))>0.000001
  or coalesce(v_data#>>'{parser_metadata,verified}','false')<>'true'
  or coalesce(v_data#>>'{parser_metadata,mixed_warehouse}','false')<>'false'
  or exists(
   select 1 from jsonb_array_elements(v_data->'productos') p
   where coalesce(p->>'sku','') !~ '^PRD[0-9]{7}$'
    or coalesce(p->>'qty','') !~ '^[0-9]+([.][0-9]{1,3})?$'
    or (p->>'qty')::numeric<0
    or ((p->>'qty')::numeric>0 and nullif(p->>'unit','') is null)
  ) then
  raise exception 'Los datos revisados no cumplen el contrato de publicación' using errcode='22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('carga:'||v_i.codigo,0));
 select c.* into v_existing from public.kontrola_cargas c where c.codigo=v_i.codigo for update;
 -- Preparación y Verificación pueden empezar de forma independiente.
 -- Una revisión material queda protegida si CUALQUIERA de ambas ya empezó.
 if found and (
   exists(select 1 from public.kontrola_preparaciones p where p.codigo=v_i.codigo)
   or exists(select 1 from public.kontrola_verificaciones v where v.codigo=v_i.codigo)
 ) then
  raise exception 'No se sustituye un documento asociado a una carga iniciada (Preparación o Verificación)' using errcode='42501';
 end if;
 v_revision:=coalesce(v_existing.revision,0)+1;
 if found then
  update public.kontrola_carga_revisiones r set vigente=false where r.codigo=v_i.codigo and r.vigente;
  update public.kontrola_cargas c set
   fecha=nullif(v_data->>'fecha','')::date,matricula=nullif(v_data->>'matricula',''),ruta=nullif(v_data->>'ruta',''),
   repartidor=nullif(v_data->>'repartidor',''),peso_kg=nullif(v_data->>'peso_kg','')::numeric,
   referencias=nullif(v_data->>'referencias','')::integer,productos=v_data->'productos',
   documento_ruta=v_i.documento_ruta,documento_hash=v_i.documento_hash,publicado_por=v_user,publicado_en=now(),
   almacen=v_i.almacen_detectado,estado='publicada',revision=v_revision,hallazgos=v_i.hallazgos,
   correcciones=v_i.correcciones,actualizado_en=now()
  where c.codigo=v_i.codigo;
 else
  insert into public.kontrola_cargas(
   codigo,fecha,matricula,ruta,repartidor,peso_kg,referencias,productos,documento_ruta,documento_hash,
   publicado_por,almacen,estado,revision,hallazgos,correcciones
  ) values(
   v_i.codigo,nullif(v_data->>'fecha','')::date,nullif(v_data->>'matricula',''),nullif(v_data->>'ruta',''),
   nullif(v_data->>'repartidor',''),nullif(v_data->>'peso_kg','')::numeric,nullif(v_data->>'referencias','')::integer,
   v_data->'productos',v_i.documento_ruta,v_i.documento_hash,v_user,v_i.almacen_detectado,'publicada',v_revision,
   v_i.hallazgos,v_i.correcciones
  );
 end if;
 insert into public.kontrola_carga_revisiones(
  codigo,revision,importacion_id,documento_hash,documento_ruta,almacen,carga_datos,hallazgos,correcciones,publicada_por
 ) values(v_i.codigo,v_revision,v_i.id,v_i.documento_hash,v_i.documento_ruta,v_i.almacen_detectado,v_data,v_i.hallazgos,v_i.correcciones,v_user);
 update public.kontrola_importaciones set estado='publicada',publicado_en=now(),actualizado_por=v_user,actualizado_en=now() where id=v_i.id;
 insert into public.kontrola_actividad(codigo,almacen,tipo,actor_id,detalle)
 values(v_i.codigo,v_i.almacen_detectado,'carga_publicada',v_user,jsonb_build_object('revision',v_revision,'importacion_id',v_i.id));
 codigo:=v_i.codigo;revision:=v_revision;almacen:=v_i.almacen_detectado;return next;
end;
$$;
revoke all on function public.kontrola_publicar_importacion(uuid) from public,anon;
grant execute on function public.kontrola_publicar_importacion(uuid) to authenticated;

commit;
