-- BORRADOR DE MIGRACIÓN NO APLICADO, basado en definiciones instaladas leídas del proyecto control-cargas-movil.
-- No aplicar sobre ninguna base hasta superar pruebas de integración y aprobación específica.
-- Conserva el control de revisiones PDF actualmente instalado; no reemplazar por la migración histórica.
begin;

CREATE OR REPLACE FUNCTION public.kontrola_finalizar_preparacion(p_codigo text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_now timestamptz:=now();v_p public.kontrola_preparaciones%rowtype;v_almacen text;
begin
 if v_user is null or not public.kontrola_usuario_activo() then raise exception 'Usuario no habilitado' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('operario:'||v_user::text,0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('carga:'||p_codigo,0));
 select p.* into v_p from public.kontrola_preparaciones p where p.codigo=p_codigo for update;
 if not found or v_p.operario_id<>v_user then raise exception 'Preparación no disponible' using errcode='42501';end if;
 if v_p.fin is not null then return v_p.fin;end if;
 update public.kontrola_preparaciones set fin=v_now,cierre_motivo='Finalización manual',actualizado_en=v_now where codigo=p_codigo;
 update public.kontrola_cargas set
  estado=case
   when exists(select 1 from public.kontrola_verificaciones v where v.codigo=p_codigo and v.fin is not null) then 'cerrada'
   when exists(select 1 from public.kontrola_verificaciones v where v.codigo=p_codigo and v.fin is null) then 'verificacion_en_curso'
   else 'preparada' end,
  cerrada_en=case when exists(select 1 from public.kontrola_verificaciones v where v.codigo=p_codigo and v.fin is not null)
   then coalesce(cerrada_en,v_now) else cerrada_en end,
  cerrada_por=case when exists(select 1 from public.kontrola_verificaciones v where v.codigo=p_codigo and v.fin is not null)
   then coalesce(cerrada_por,v_user) else cerrada_por end,
  actualizado_en=v_now
 where kontrola_cargas.codigo=p_codigo returning almacen into v_almacen;
 insert into public.kontrola_actividad(codigo,almacen,tipo,actor_id,detalle)
 values(p_codigo,v_almacen,'preparacion_finalizada',v_user,jsonb_build_object('motivo','manual'));
 return v_now;
end;
$function$;
REVOKE ALL ON FUNCTION public.kontrola_finalizar_preparacion(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kontrola_finalizar_preparacion(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.kontrola_finalizar_verificacion(p_verificacion uuid)
 RETURNS TABLE(codigo text, finalizada_en timestamp with time zone, incidencias_pendientes bigint)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_v public.kontrola_verificaciones%rowtype;v_now timestamptz:=now();v_almacen text;v_codigo text;v_prep_active boolean:=false;
begin
 if v_user is null or not public.kontrola_usuario_activo() then raise exception 'Usuario no habilitado' using errcode='42501';end if;
 select v.codigo into v_codigo from public.kontrola_verificaciones v where v.id=p_verificacion;
 if v_codigo is null then raise exception 'Verificación no disponible' using errcode='42501';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('carga:'||v_codigo,0));
 select v.* into v_v from public.kontrola_verificaciones v where v.id=p_verificacion for update;
 if not found or v_v.verificador_id<>v_user then raise exception 'Verificación no disponible' using errcode='42501';end if;
 select c.almacen into v_almacen from public.kontrola_cargas c where c.codigo=v_v.codigo;
 if not public.kontrola_puede_almacen(v_almacen) then raise exception 'Acceso al almacén revocado' using errcode='42501';end if;
 if exists(select 1 from public.kontrola_verificacion_lineas l where l.verificacion_id=p_verificacion and l.comprobada_cantidad is null) then
  raise exception 'Faltan líneas por comprobar' using errcode='22023';
 end if;
 if v_v.estado<>'finalizada' then
  update public.kontrola_verificaciones set fin=v_now,estado='finalizada' where id=p_verificacion;
  -- Nunca finalizar la sesión de preparación del otro operario.
  select exists(select 1 from public.kontrola_preparaciones p where p.codigo=v_v.codigo and p.fin is null) into v_prep_active;
  update public.kontrola_cargas set
   estado=case when v_prep_active then 'preparacion_en_curso' else 'cerrada' end,
   cerrada_en=case when v_prep_active then null else coalesce(cerrada_en,v_now) end,
   cerrada_por=case when v_prep_active then null else coalesce(cerrada_por,v_user) end,
   actualizado_en=v_now where kontrola_cargas.codigo=v_v.codigo returning almacen into v_almacen;
  insert into public.kontrola_actividad(codigo,almacen,tipo,actor_id,detalle)
  values(v_v.codigo,v_almacen,'verificacion_finalizada',v_user,jsonb_build_object('preparacion_cerrada',false,'preparacion_registrada_activa',v_prep_active,'motivo','verificacion_completa'));
 else
  v_now:=v_v.fin;
 end if;
 select count(*) into incidencias_pendientes from public.kontrola_incidencias i where i.verificacion_id=p_verificacion and i.estado='pendiente';
 codigo:=v_v.codigo;finalizada_en:=v_now;return next;
end;
$function$;
REVOKE ALL ON FUNCTION public.kontrola_finalizar_verificacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kontrola_finalizar_verificacion(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.kontrola_iniciar_preparacion(p_codigo text, p_request_id uuid)
 RETURNS TABLE(codigo text, inicio timestamp with time zone, ya_iniciada boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_now timestamptz:=now();v_carga public.kontrola_cargas%rowtype;v_existing public.kontrola_preparaciones%rowtype;
begin
 if v_user is null or not public.kontrola_usuario_activo() then raise exception 'Usuario no habilitado' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Falta identificador de operación' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('operario:'||v_user::text,0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('carga:'||p_codigo,0));
 select c.* into v_carga from public.kontrola_cargas c where c.codigo=p_codigo for update;
 if not found or not public.kontrola_puede_almacen(v_carga.almacen) then raise exception 'Carga no disponible' using errcode='42501';end if;
 if v_carga.estado='cerrada' then raise exception 'La carga está cerrada' using errcode='22023';end if;
 if exists(select 1 from public.kontrola_verificaciones v where v.codigo=p_codigo and v.verificador_id=v_user) then
  raise exception 'El mismo usuario no puede preparar y verificar esta carga' using errcode='42501';
 end if;
 select p.* into v_existing from public.kontrola_preparaciones p where p.codigo=p_codigo;
 if found then
  if v_existing.operario_id<>v_user then raise exception 'Carga asignada a otro preparador' using errcode='42501';end if;
  codigo:=p_codigo;inicio:=v_existing.inicio;ya_iniciada:=true;return next;return;
 end if;
 update public.kontrola_preparaciones p set fin=v_now,cierre_motivo='Cambio de carga a '||p_codigo,actualizado_en=v_now
 where p.operario_id=v_user and p.fin is null;
 update public.kontrola_cargas c set estado='preparada',actualizado_en=v_now
 where exists(select 1 from public.kontrola_preparaciones p where p.codigo=c.codigo and p.operario_id=v_user and p.fin=v_now)
  and not exists(select 1 from public.kontrola_verificaciones v where v.codigo=c.codigo and v.fin is null);
 insert into public.kontrola_preparaciones(codigo,operario_id,inicio,inicio_request_id,actualizado_en)
 values(p_codigo,v_user,v_now,p_request_id,v_now);
 update public.kontrola_cargas set estado=case when exists(select 1 from public.kontrola_verificaciones v where v.codigo=p_codigo and v.fin is null)
 then 'verificacion_en_curso' else 'preparacion_en_curso' end,actualizado_en=v_now where kontrola_cargas.codigo=p_codigo;
 insert into public.kontrola_actividad(codigo,almacen,tipo,actor_id,request_id)
 values(p_codigo,v_carga.almacen,'preparacion_iniciada',v_user,p_request_id);
 codigo:=p_codigo;inicio:=v_now;ya_iniciada:=false;return next;
end;
$function$;
REVOKE ALL ON FUNCTION public.kontrola_iniciar_preparacion(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kontrola_iniciar_preparacion(text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.kontrola_iniciar_verificacion(p_codigo text, p_request_id uuid)
 RETURNS TABLE(id uuid, inicio timestamp with time zone, estado text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare v_user uuid:=auth.uid();v_p public.kontrola_preparaciones%rowtype;v_v public.kontrola_verificaciones%rowtype;v_c public.kontrola_cargas%rowtype;
begin
 if v_user is null or not public.kontrola_usuario_activo() then raise exception 'Usuario no habilitado' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Falta identificador de operación' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('carga:'||p_codigo,0));
 select c.* into v_c from public.kontrola_cargas c where c.codigo=p_codigo for update;
 if not found or not public.kontrola_puede_almacen(v_c.almacen) then raise exception 'Carga no disponible' using errcode='42501';end if;
 select p.* into v_p from public.kontrola_preparaciones p where p.codigo=p_codigo for update;
 -- La preparación del picking se gestiona en Business Central; no requiere sesión VISURA.
 if v_p.operario_id=v_user then raise exception 'No puedes verificar una carga que has preparado' using errcode='42501';end if;
 select v.* into v_v from public.kontrola_verificaciones v where v.codigo=p_codigo for update;
 if found then
  if v_v.verificador_id<>v_user then raise exception 'Carga asignada a otro verificador' using errcode='42501';end if;
  id:=v_v.id;inicio:=v_v.inicio;estado:=v_v.estado;return next;return;
 end if;
 if v_c.estado='cerrada' then raise exception 'No es posible iniciar una verificación nueva con carga cerrada' using errcode='22023';end if;
 insert into public.kontrola_verificaciones(codigo,verificador_id,inicio_request_id)
 values(p_codigo,v_user,p_request_id) returning * into v_v;
 insert into public.kontrola_verificacion_lineas(verificacion_id,linea,sku,descripcion,ubicacion,prevista_cantidad,unidad)
 select v_v.id,p.ordinality::integer,coalesce(p.value->>'sku',''),coalesce(p.value->>'description',''),
  coalesce(p.value->>'location',''),(p.value->>'qty')::numeric,coalesce(p.value->>'unit','')
 from jsonb_array_elements(v_c.productos) with ordinality p(value,ordinality)
 where (p.value->>'qty')::numeric>0;
 if not found then raise exception 'La carga no contiene líneas verificables' using errcode='22023';end if;
 update public.kontrola_cargas set estado='verificacion_en_curso',actualizado_en=now() where kontrola_cargas.codigo=p_codigo;
 insert into public.kontrola_actividad(codigo,almacen,tipo,actor_id,request_id)
 values(p_codigo,v_c.almacen,'verificacion_iniciada',v_user,p_request_id);
 id:=v_v.id;inicio:=v_v.inicio;estado:=v_v.estado;return next;
end;
$function$;
REVOKE ALL ON FUNCTION public.kontrola_iniciar_verificacion(text,uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kontrola_iniciar_verificacion(text,uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.kontrola_publicar_importacion(p_importacion uuid)
 RETURNS TABLE(codigo text, revision integer, almacen text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
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
 if found and (exists(select 1 from public.kontrola_preparaciones p where p.codigo=v_i.codigo) or exists(select 1 from public.kontrola_verificaciones v where v.codigo=v_i.codigo)) then
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
$function$;
REVOKE ALL ON FUNCTION public.kontrola_publicar_importacion(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.kontrola_publicar_importacion(uuid) TO authenticated;

commit;
