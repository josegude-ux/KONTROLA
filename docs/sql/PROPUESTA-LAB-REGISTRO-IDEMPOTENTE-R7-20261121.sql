-- VISURA 15/215 · CP014 · DISEÑO SQL NO APLICADO · SOLO LAB.
-- NO EJECUTAR sin autorización expresa, respaldo, revisión RLS ni E2E.
-- Proyecto: KONTROLA/VISURA PREPARA ALMACÉN. Mantener PRUEBA_3 R7 original.
--
-- Contrato real inspeccionado 21/11/2026 en solo lectura:
-- kontrola_cargas: codigo,almacen,estado,documento_ruta,documento_hash,publicado_en
-- kontrola_impresiones: id,codigo,almacen,usuario_id,generado_en,reimpresion.
-- Los registros anteriores carecen de hash. Jamás inferir su revisión.
--
-- Extender SOLO el historial existente: sin nueva tabla ni duplicar LP.
-- Conservar otras RPC y clientes antiguos sin cambio de firma.
alter table public.kontrola_impresiones
  add column if not exists documento_hash text,
  add column if not exists origen_generacion text not null default 'VISURA';
-- Precaución: validar restricciones/índices existentes antes de aplicar.
create unique index if not exists kontrola_impresiones_r7_codigo_hash_uidx
  on public.kontrola_impresiones (codigo, documento_hash)
  where origen_generacion = 'R7' and documento_hash is not null;

-- Alcance intencional: una sola LP, primer registro idempotente.
-- No registrar reimpresión, PDF físicamente impreso, ni alterar datos BC.
create or replace function public.kontrola_registrar_generacion_r7(
  p_almacen text,
  p_codigo text,
  p_documento_hash text,
  p_local_generado_en timestamptz
)
returns table(codigo text, resultado text, intentos bigint)
language plpgsql volatile security definer
set search_path = ''
as $func$
declare
  v_carga record;
  v_total bigint;
  v_existente boolean;
begin
  if (select auth.uid()) is null
     or not public.kontrola_es_administrador()
     or not public.kontrola_puede_almacen(p_almacen)
  then
    raise exception 'Sin permiso para registrar listados R7' using errcode='42501';
  end if;
  if p_almacen <> 'COR_01_COR'
    or p_codigo is null or p_codigo !~ '^LP[0-9]{2}-[0-9]{4,6}$'
    or p_documento_hash is null or p_documento_hash !~ '^[a-f0-9]{64}$'
    or p_local_generado_en is null
    or p_local_generado_en > now() + interval '5 minutes'
  then
    raise exception 'Parámetros de generación R7 inválidos';
  end if;

  -- SERIALIZAR contra dos equipos que intentan registrar la misma LP.
  select c.codigo,c.documento_hash,c.documento_ruta,c.estado,c.almacen
    into v_carga from public.kontrola_cargas c
   where c.codigo=p_codigo and c.almacen=p_almacen
   for update;
  if not found or v_carga.estado <> 'publicada'
     or v_carga.documento_hash <> p_documento_hash
     or v_carga.documento_ruta <>
         'documentos/'||p_codigo||'/'||p_documento_hash||'.pdf'
  then
    raise exception 'Documento actual distinto del R7 generado o LP no publicada';
  end if;

  -- La repetición exacta es idempotente incluso si se recibe en otro equipo.
  select exists(
    select 1 from public.kontrola_impresiones i
     where i.codigo=p_codigo and i.almacen=p_almacen
       and i.origen_generacion='R7' and i.documento_hash=p_documento_hash
  ) into v_existente;

  if v_existente then
    resultado:='YA_REGISTRADO';
  else
    -- Historial anterior sin huella: NO atribuirlo falsamente a este PDF.
    if exists(
      select 1 from public.kontrola_impresiones i
       where i.codigo=p_codigo and (i.documento_hash is null
           or i.origen_generacion is distinct from 'R7')
    ) then
      raise exception 'Existe impresión histórica sin revisión verificable; revisión manual';
    end if;

    insert into public.kontrola_impresiones(
      codigo,almacen,usuario_id,reimpresion,documento_hash,origen_generacion
    ) values (
      p_codigo,p_almacen,(select auth.uid()),false,p_documento_hash,'R7'
    ) on conflict do nothing;

    -- Un índice único + bloqueo de LP evita dobles anotaciones.
    resultado:='REGISTRADO';
  end if;

  select count(*)::bigint into v_total from public.kontrola_impresiones i
    where i.codigo=p_codigo and i.almacen=p_almacen;
  codigo:=p_codigo;intentos:=v_total;
  return next;
end;
$func$;
-- Una SECURITY DEFINER expuesta exige comprobación expresa de administrador.
revoke all on function public.kontrola_registrar_generacion_r7(
 text,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.kontrola_registrar_generacion_r7(
 text,text,text,timestamptz) to authenticated;

-- Estado verificable por versión actual SIN sobreescribir la función heredada.
create or replace function public.kontrola_estado_generacion_r7(
 p_almacen text
)
returns table(codigo text, documento_hash text, generaciones bigint)
language plpgsql stable security definer
set search_path=''
as $func$
begin
 if (select auth.uid()) is null
    or not public.kontrola_es_administrador()
    or not public.kontrola_puede_almacen(p_almacen)
 then
   raise exception 'Sin permiso para consultar generaciones R7' using errcode='42501';
 end if;
 return query
   select c.codigo,c.documento_hash,count(i.id)::bigint
     from public.kontrola_cargas c
     left join public.kontrola_impresiones i
       on i.codigo=c.codigo and i.almacen=c.almacen
      and i.origen_generacion='R7' and i.documento_hash=c.documento_hash
    where c.almacen=p_almacen and c.estado='publicada'
    group by c.codigo,c.documento_hash
    order by c.codigo;
end;
$func$;
revoke all on function public.kontrola_estado_generacion_r7(text)
 from public,anon,authenticated;
grant execute on function public.kontrola_estado_generacion_r7(text)
 to authenticated;

-- MIGRACIÓN PENDIENTE DE HOMOLOGACIÓN:
-- A) revisar dependencias/RLS, propietarios y seguridad de funciones anteriores
-- B) confirmar huellas en las rutas y el contrato de primera generación
-- C) probar concurrencia simultánea y reintento tras timeout con usuarios ficticios
-- D) validar que la RPC antigua no registra a la vez una LP en otra revisión
-- E) NO aplicar la propuesta de fecha anterior sin revisión específica
