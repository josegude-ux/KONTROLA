-- KONTROLA: proteger documentos duplicados y revisiones históricas.
-- Migración incremental, aplicar SOLO en el backend KONTROLA autorizado.
-- Nunca ejecutar pruebas destructivas en Supabase real.

create or replace function public.kontrola_reservar_importacion(
 p_codigo text,p_hash text,p_archivo text,p_tamano bigint
)
returns table(id uuid,documento_ruta text,repetida boolean,estado text)
language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_existing public.kontrola_importaciones%rowtype;v_id uuid;
begin
 if v_user is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración puede importar' using errcode='42501';
 end if;
 if p_codigo !~ '^LP[0-9]{2}-[0-9]{4,6}$' or p_hash !~ '^[a-f0-9]{64}$' or p_tamano<=0 or p_tamano>26214400 then
  raise exception 'Metadatos de importación inválidos' using errcode='22023';
 end if;
 v_id:=gen_random_uuid();
 insert into public.kontrola_importaciones(
  id,codigo,documento_hash,documento_ruta,archivo_nombre,archivo_tamano,creado_por,actualizado_por
 ) values(v_id,p_codigo,p_hash,'documentos/'||p_codigo||'/'||p_hash||'.pdf',p_archivo,p_tamano,v_user,v_user)
 -- Dos solicitudes concurrentes pueden chocar tanto en documento_hash como en documento_ruta.
 -- Omitir el objetivo del conflicto protege las dos restricciones UNIQUE.
 on conflict do nothing returning kontrola_importaciones.id into v_id;
 if v_id is null then
  select x.* into v_existing from public.kontrola_importaciones x where x.documento_hash=p_hash;
  if v_existing.id is null then
   raise exception 'No se ha podido resolver la importación duplicada' using errcode='23505';
  end if;
  if v_existing.codigo<>p_codigo then
   raise exception 'Este PDF ya está asociado a otra carga (%)',v_existing.codigo using errcode='22023';
  end if;
  id:=v_existing.id;documento_ruta:=v_existing.documento_ruta;repetida:=true;estado:=v_existing.estado;return next;return;
 end if;
 id:=v_id;documento_ruta:='documentos/'||p_codigo||'/'||p_hash||'.pdf';repetida:=false;estado:='reservada';return next;
end;
$$;
revoke all on function public.kontrola_reservar_importacion(text,text,text,bigint) from public,anon;
grant execute on function public.kontrola_reservar_importacion(text,text,text,bigint) to authenticated;

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
  or abs((v_data->>'actual_total')::numeric-(v_data->>'declared_total')::numeric)>0.000001
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
 if found and exists(select 1 from public.kontrola_preparaciones p where p.codigo=v_i.codigo) then
  raise exception 'No se sustituye un documento asociado a una carga iniciada' using errcode='42501';
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
