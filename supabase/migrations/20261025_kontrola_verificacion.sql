-- KONTROLA · verificación física de cargas.
-- REVISAR antes de aplicar. No escribe en Business Central ni altera otros proyectos.
begin;

alter table public.kontrola_cargas
 add column if not exists cerrada_en timestamptz,
 add column if not exists cerrada_por uuid references auth.users(id);

create table if not exists public.kontrola_verificaciones (
 id uuid primary key default gen_random_uuid(),
 codigo text not null unique references public.kontrola_cargas(codigo) on delete restrict,
 verificador_id uuid not null references auth.users(id),
 inicio timestamptz not null default now(),
 fin timestamptz,
 estado text not null default 'en_curso'
   check (estado in ('en_curso','finalizada')),
 constraint kontrola_verificacion_tiempos_validos
   check ((estado = 'en_curso' and fin is null) or (estado = 'finalizada' and fin is not null and fin >= inicio))
);

create table if not exists public.kontrola_verificacion_lineas (
 verificacion_id uuid not null references public.kontrola_verificaciones(id) on delete restrict,
 linea integer not null check (linea > 0),
 sku text not null,
 descripcion text not null default '',
 ubicacion text not null default '',
 prevista_cantidad numeric(14,3) not null check (prevista_cantidad >= 0),
 unidad text not null default '',
 comprobada_cantidad numeric(14,3) check (comprobada_cantidad is null or comprobada_cantidad >= 0),
 comprobada_por uuid references auth.users(id),
 comprobada_en timestamptz,
 diferencia numeric(14,3) generated always as
   (case when comprobada_cantidad is null then null else comprobada_cantidad - prevista_cantidad end) stored,
 primary key (verificacion_id,linea),
 constraint kontrola_linea_comprobacion_completa check (
   (comprobada_cantidad is null and comprobada_por is null and comprobada_en is null)
   or
   (comprobada_cantidad is not null and comprobada_por is not null and comprobada_en is not null)
 )
);

create table if not exists public.kontrola_incidencias (
 id uuid primary key default gen_random_uuid(),
 codigo text not null references public.kontrola_cargas(codigo) on delete restrict,
 verificacion_id uuid not null references public.kontrola_verificaciones(id) on delete restrict,
 linea integer not null,
 sku text not null,
 prevista_cantidad numeric(14,3) not null,
 comprobada_cantidad numeric(14,3) not null,
 diferencia numeric(14,3) not null,
 estado text not null default 'pendiente'
   check (estado in ('pendiente','descartada','regularizada')),
 detectada_por uuid not null references auth.users(id),
 detectada_en timestamptz not null default now(),
 actualizada_por uuid not null references auth.users(id),
 actualizada_en timestamptz not null default now(),
 constraint kontrola_incidencia_linea_unica unique (verificacion_id,linea),
 foreign key (verificacion_id,linea)
   references public.kontrola_verificacion_lineas(verificacion_id,linea) on delete restrict
);

create table if not exists public.kontrola_verificacion_eventos (
 id bigint generated always as identity primary key,
 verificacion_id uuid not null references public.kontrola_verificaciones(id) on delete restrict,
 linea integer not null,
 cantidad_anterior numeric(14,3),
 cantidad_nueva numeric(14,3) not null check (cantidad_nueva >= 0),
 registrado_por uuid not null references auth.users(id),
 registrado_en timestamptz not null default now(),
 foreign key (verificacion_id,linea)
   references public.kontrola_verificacion_lineas(verificacion_id,linea) on delete restrict
);

alter table public.kontrola_verificaciones enable row level security;
alter table public.kontrola_verificacion_lineas enable row level security;
alter table public.kontrola_incidencias enable row level security;
alter table public.kontrola_verificacion_eventos enable row level security;

revoke all on public.kontrola_verificaciones from anon, authenticated;
revoke all on public.kontrola_verificacion_lineas from anon, authenticated;
revoke all on public.kontrola_incidencias from anon, authenticated;
revoke all on public.kontrola_verificacion_eventos from anon, authenticated;
grant select on public.kontrola_verificaciones to authenticated;
grant select on public.kontrola_verificacion_lineas to authenticated;
grant select on public.kontrola_incidencias to authenticated;
grant select on public.kontrola_verificacion_eventos to authenticated;

drop policy if exists "kontrola_verificaciones_lectura" on public.kontrola_verificaciones;
create policy "kontrola_verificaciones_lectura" on public.kontrola_verificaciones
 for select to authenticated using (
  public.kontrola_es_administrador()
  or (public.kontrola_usuario_activo() and verificador_id = (select auth.uid()))
 );
drop policy if exists "kontrola_verificacion_lineas_lectura" on public.kontrola_verificacion_lineas;
create policy "kontrola_verificacion_lineas_lectura" on public.kontrola_verificacion_lineas
 for select to authenticated using (
  exists (
   select 1 from public.kontrola_verificaciones v
   where v.id = verificacion_id
    and (public.kontrola_es_administrador()
      or (public.kontrola_usuario_activo() and v.verificador_id = (select auth.uid())))
  )
 );
drop policy if exists "kontrola_incidencias_lectura" on public.kontrola_incidencias;
create policy "kontrola_incidencias_lectura" on public.kontrola_incidencias
 for select to authenticated using (
  public.kontrola_es_administrador()
  or exists (
   select 1 from public.kontrola_verificaciones v
   where v.id = verificacion_id
    and public.kontrola_usuario_activo()
    and v.verificador_id = (select auth.uid())
  )
 );
drop policy if exists "kontrola_verificacion_eventos_lectura" on public.kontrola_verificacion_eventos;
create policy "kontrola_verificacion_eventos_lectura" on public.kontrola_verificacion_eventos
 for select to authenticated using (
  public.kontrola_es_administrador()
  or exists (
   select 1 from public.kontrola_verificaciones v
   where v.id = verificacion_id
    and public.kontrola_usuario_activo()
    and v.verificador_id = (select auth.uid())
  )
 );

create or replace function public.kontrola_cargas_para_verificar()
returns table(
 codigo text, fecha date, matricula text, ruta text, repartidor text,
 peso_kg numeric, referencias integer, estado text,
 lineas_total bigint, lineas_comprobadas bigint, incidencias_pendientes bigint
)
language plpgsql stable security definer set search_path = ''
as $$
declare
 v_user uuid := auth.uid();
begin
 if v_user is null or not public.kontrola_usuario_activo() then
  raise exception 'Usuario no habilitado para verificación' using errcode = '42501';
 end if;
 return query
 select c.codigo,c.fecha,c.matricula,c.ruta,c.repartidor,c.peso_kg,c.referencias,
  coalesce(v.estado,'pendiente')::text,
  count(l.linea)::bigint,
  count(l.comprobada_cantidad)::bigint,
  count(i.id) filter (where i.estado = 'pendiente')::bigint
 from public.kontrola_cargas c
 join public.kontrola_preparaciones p on p.codigo = c.codigo and p.fin is not null
 left join public.kontrola_verificaciones v on v.codigo = c.codigo
 left join public.kontrola_verificacion_lineas l on l.verificacion_id = v.id
 left join public.kontrola_incidencias i
  on i.verificacion_id = v.id and i.linea = l.linea
 where p.operario_id <> v_user
  and (v.id is null or v.verificador_id = v_user)
 group by c.codigo,c.fecha,c.matricula,c.ruta,c.repartidor,c.peso_kg,c.referencias,v.estado;
end;
$$;
revoke all on function public.kontrola_cargas_para_verificar() from public, anon;
grant execute on function public.kontrola_cargas_para_verificar() to authenticated;

create or replace function public.kontrola_abrir_verificacion(p_codigo text)
returns uuid
language plpgsql security definer set search_path = ''
as $$
declare
 v_user uuid := auth.uid();
 v_preparador uuid;
 v_preparacion_fin timestamptz;
 v_verificacion public.kontrola_verificaciones%rowtype;
begin
 if v_user is null or not public.kontrola_usuario_activo() then
  raise exception 'Usuario no habilitado para verificación' using errcode = '42501';
 end if;
 if p_codigo is null or length(p_codigo) > 40 then
  raise exception 'Código de carga inválido' using errcode = '22023';
 end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('carga:'||p_codigo,0));
 select p.operario_id,p.fin into v_preparador,v_preparacion_fin
 from public.kontrola_preparaciones p where p.codigo = p_codigo for update;
 if not found or v_preparacion_fin is null then
  raise exception 'La preparación de la carga todavía no ha finalizado' using errcode = '22023';
 end if;
 if v_preparador = v_user then
  raise exception 'No puedes verificar una carga que has preparado' using errcode = '42501';
 end if;
 select v.* into v_verificacion
 from public.kontrola_verificaciones v where v.codigo = p_codigo for update;
 if found then
  if v_verificacion.verificador_id <> v_user then
   raise exception 'La carga ya está asignada a otro verificador' using errcode = '42501';
  end if;
  return v_verificacion.id;
 end if;
 insert into public.kontrola_verificaciones(codigo,verificador_id)
 values(p_codigo,v_user) returning * into v_verificacion;
 insert into public.kontrola_verificacion_lineas(
  verificacion_id,linea,sku,descripcion,ubicacion,prevista_cantidad,unidad
 )
 select v_verificacion.id,product.ordinality::integer,
  coalesce(product.value->>'sku',''),
  coalesce(product.value->>'description',''),
  coalesce(product.value->>'location',''),
  (product.value->>'qty')::numeric,
  coalesce(product.value->>'unit','')
 from public.kontrola_cargas c
 cross join lateral jsonb_array_elements(c.productos) with ordinality as product(value,ordinality)
 where c.codigo = p_codigo and (product.value->>'qty')::numeric > 0;
 if not found then
  raise exception 'La carga no contiene líneas verificables' using errcode = '22023';
 end if;
 return v_verificacion.id;
end;
$$;
revoke all on function public.kontrola_abrir_verificacion(text) from public, anon;
grant execute on function public.kontrola_abrir_verificacion(text) to authenticated;

create or replace function public.kontrola_registrar_linea(
 p_verificacion uuid, p_linea integer, p_cantidad numeric
)
returns table(linea integer, comprobada_cantidad numeric, diferencia numeric, incidencia_estado text)
language plpgsql security definer set search_path = ''
as $$
declare
 v_user uuid := auth.uid();
 v_verificacion public.kontrola_verificaciones%rowtype;
 v_linea public.kontrola_verificacion_lineas%rowtype;
 v_now timestamptz := now();
begin
 if v_user is null or not public.kontrola_usuario_activo() then
  raise exception 'Usuario no habilitado para verificación' using errcode = '42501';
 end if;
 if p_cantidad is null or p_cantidad < 0 or pg_catalog.scale(p_cantidad) > 3 then
  raise exception 'Cantidad comprobada inválida' using errcode = '22023';
 end if;
 select v.* into v_verificacion
 from public.kontrola_verificaciones v where v.id = p_verificacion for update;
 if not found or v_verificacion.verificador_id <> v_user then
  raise exception 'Verificación no disponible para este usuario' using errcode = '42501';
 end if;
 if v_verificacion.estado <> 'en_curso' then
  raise exception 'La verificación ya está finalizada' using errcode = '22023';
 end if;
 select l.* into v_linea from public.kontrola_verificacion_lineas l
 where l.verificacion_id = p_verificacion and l.linea = p_linea for update;
 if not found then
  raise exception 'Línea de verificación inexistente' using errcode = '22023';
 end if;
 insert into public.kontrola_verificacion_eventos(
  verificacion_id,linea,cantidad_anterior,cantidad_nueva,registrado_por,registrado_en
 ) values(p_verificacion,p_linea,v_linea.comprobada_cantidad,p_cantidad,v_user,v_now);
 update public.kontrola_verificacion_lineas l
 set comprobada_cantidad = p_cantidad, comprobada_por = v_user, comprobada_en = v_now
 where l.verificacion_id = p_verificacion and l.linea = p_linea;
 if p_cantidad <> v_linea.prevista_cantidad then
  insert into public.kontrola_incidencias(
   codigo,verificacion_id,linea,sku,prevista_cantidad,comprobada_cantidad,
   diferencia,estado,detectada_por,detectada_en,actualizada_por,actualizada_en
  ) values(
   v_verificacion.codigo,p_verificacion,p_linea,v_linea.sku,v_linea.prevista_cantidad,
   p_cantidad,p_cantidad-v_linea.prevista_cantidad,'pendiente',v_user,v_now,v_user,v_now
  )
  on conflict on constraint kontrola_incidencia_linea_unica do update set
   comprobada_cantidad = excluded.comprobada_cantidad,
   diferencia = excluded.diferencia,
   estado = 'pendiente',
   actualizada_por = excluded.actualizada_por,
   actualizada_en = excluded.actualizada_en;
  incidencia_estado := 'pendiente';
 else
  update public.kontrola_incidencias i
  set comprobada_cantidad = p_cantidad, diferencia = 0, estado = 'descartada',
   actualizada_por = v_user, actualizada_en = v_now
  where i.verificacion_id = p_verificacion and i.linea = p_linea;
  incidencia_estado := null;
 end if;
 linea := p_linea;
 comprobada_cantidad := p_cantidad;
 diferencia := p_cantidad-v_linea.prevista_cantidad;
 return next;
end;
$$;
revoke all on function public.kontrola_registrar_linea(uuid,integer,numeric) from public, anon;
grant execute on function public.kontrola_registrar_linea(uuid,integer,numeric) to authenticated;

create or replace function public.kontrola_finalizar_verificacion(p_verificacion uuid)
returns table(codigo text, finalizada_en timestamptz, incidencias_pendientes bigint)
language plpgsql security definer set search_path = ''
as $$
declare
 v_user uuid := auth.uid();
 v_verificacion public.kontrola_verificaciones%rowtype;
 v_now timestamptz := now();
begin
 if v_user is null or not public.kontrola_usuario_activo() then
  raise exception 'Usuario no habilitado para verificación' using errcode = '42501';
 end if;
 select v.* into v_verificacion
 from public.kontrola_verificaciones v where v.id = p_verificacion for update;
 if not found or v_verificacion.verificador_id <> v_user then
  raise exception 'Verificación no disponible para este usuario' using errcode = '42501';
 end if;
 if v_verificacion.estado = 'finalizada' then
  codigo := v_verificacion.codigo;
  finalizada_en := v_verificacion.fin;
 else
  if exists(
   select 1 from public.kontrola_verificacion_lineas l
   where l.verificacion_id = p_verificacion and l.comprobada_cantidad is null
  ) then
   raise exception 'Faltan líneas por comprobar' using errcode = '22023';
  end if;
  update public.kontrola_verificaciones v
   set fin = v_now, estado = 'finalizada'
  where v.id = p_verificacion;
  update public.kontrola_cargas c
   set cerrada_en = coalesce(cerrada_en,v_now), cerrada_por = coalesce(cerrada_por,v_user)
  where c.codigo = v_verificacion.codigo;
  codigo := v_verificacion.codigo;
  finalizada_en := v_now;
 end if;
 select count(*) into incidencias_pendientes
 from public.kontrola_incidencias i
 where i.verificacion_id = p_verificacion and i.estado = 'pendiente';
 return next;
end;
$$;
revoke all on function public.kontrola_finalizar_verificacion(uuid) from public, anon;
grant execute on function public.kontrola_finalizar_verificacion(uuid) to authenticated;

create or replace function public.kontrola_incidencias_pendientes()
returns table(
 id uuid, codigo text, linea integer, sku text, prevista_cantidad numeric,
 comprobada_cantidad numeric, diferencia numeric, detectada_en timestamptz
)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if auth.uid() is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración puede consultar las regularizaciones' using errcode = '42501';
 end if;
 return query
 select i.id,i.codigo,i.linea,i.sku,i.prevista_cantidad,
  i.comprobada_cantidad,i.diferencia,i.detectada_en
 from public.kontrola_incidencias i
 where i.estado = 'pendiente'
 order by i.codigo,i.linea;
end;
$$;
revoke all on function public.kontrola_incidencias_pendientes() from public, anon;
grant execute on function public.kontrola_incidencias_pendientes() to authenticated;

create or replace function public.kontrola_regularizar_incidencia(p_incidencia uuid)
returns timestamptz
language plpgsql security definer set search_path = ''
as $$
declare
 v_user uuid := auth.uid();
 v_now timestamptz := now();
 v_incidencia public.kontrola_incidencias%rowtype;
begin
 if v_user is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración puede confirmar regularizaciones' using errcode = '42501';
 end if;
 select i.* into v_incidencia from public.kontrola_incidencias i
 where i.id = p_incidencia for update;
 if not found then
  raise exception 'Incidencia inexistente' using errcode = '22023';
 end if;
 if v_incidencia.estado = 'regularizada' then
  return v_incidencia.actualizada_en;
 end if;
 if v_incidencia.estado <> 'pendiente' then
  raise exception 'La incidencia no está pendiente' using errcode = '22023';
 end if;
 -- Esta confirmación solo documenta una regularización manual ya hecha en Business Central.
 update public.kontrola_incidencias i
 set estado = 'regularizada', actualizada_por = v_user, actualizada_en = v_now
 where i.id = p_incidencia;
 return v_now;
end;
$$;
revoke all on function public.kontrola_regularizar_incidencia(uuid) from public, anon;
grant execute on function public.kontrola_regularizar_incidencia(uuid) to authenticated;

commit;
