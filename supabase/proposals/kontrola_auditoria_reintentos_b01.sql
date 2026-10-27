-- VISURA PREPARA · Bloque 01 · propuesta de auditoría de importaciones repetidas.
-- 27/10/2026. SOLO validar sobre PostgreSQL temporal; NO aplicar a Supabase real.
-- Sustituye exclusivamente la firma existente de reserva del 20261027,
-- sin tocar el documento original, hash, ruta, estados ni permisos existentes.
-- Requiere el esquema y las migraciones previas de KONTROLA.
-- No registra intentos rechazados por código cruzado: esa transacción se revierte;
-- su auditoría duradera necesita un diseño independiente.
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
  -- Guardar el reintento aunque no se haya generado una nueva importación.
  -- La función sigue siendo transaccional; el resultado y su hash no se alteran.
  insert into public.kontrola_importacion_eventos(
    importacion_id,tipo,antes,despues,actor_id
  ) values(
    v_existing.id,'reintento_importacion',
    jsonb_build_object('estado',v_existing.estado,'codigo',v_existing.codigo),
    jsonb_build_object('archivo',p_archivo,'tamano',p_tamano,'hash',p_hash,'codigo_solicitado',p_codigo),
    v_user
  );
  id:=v_existing.id;documento_ruta:=v_existing.documento_ruta;repetida:=true;estado:=v_existing.estado;return next;return;
 end if;
 id:=v_id;documento_ruta:='documentos/'||p_codigo||'/'||p_hash||'.pdf';repetida:=false;estado:='reservada';return next;
end;
$$;
revoke all on function public.kontrola_reservar_importacion(text,text,text,bigint) from public,anon;
grant execute on function public.kontrola_reservar_importacion(text,text,text,bigint) to authenticated;

