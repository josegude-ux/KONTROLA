-- KONTROLA · operación integral de pruebas.
-- Incremental: conserva las tablas de Fase 1 y verificación, sin tocar otros proyectos.
begin;

-- La Fase 1 pudo haberse aplicado antes de que existiera este RPC; se entrega
-- de forma incremental para que las instalaciones existentes también lo reciban.
create or replace function public.kontrola_mi_perfil()
returns table(id uuid,nombre text,rol text,activo boolean)
language sql stable security definer set search_path=''
as $$
 select u.id,u.nombre::text,u.rol::text,u.activo
 from public.usuarios_app u
 where u.id=(select auth.uid()) and u.activo and u.rol in ('operario','administrador');
$$;
revoke all on function public.kontrola_mi_perfil() from public,anon;
grant execute on function public.kontrola_mi_perfil() to authenticated;

create table if not exists public.kontrola_almacenes (
 codigo text primary key,
 nombre text not null,
 activo boolean not null default true,
 check (codigo ~ '^[A-Z]{2,8}_[0-9]{2,3}_[A-Z0-9]{2,12}$')
);
insert into public.kontrola_almacenes(codigo,nombre) values
 ('COR_01_COR','A Coruña'),
 ('COR_02_NAR','Ferrol')
on conflict(codigo) do update set nombre=excluded.nombre,activo=true;
insert into public.kontrola_almacenes(codigo,nombre,activo) values
 ('PEND_00_CLAS','Pendiente de clasificar',false)
on conflict(codigo) do update set nombre=excluded.nombre,activo=false;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('kontrola-pdfs','kontrola-pdfs',false,26214400,array['application/pdf'])
on conflict(id) do update set
 public=false,
 file_size_limit=excluded.file_size_limit,
 allowed_mime_types=excluded.allowed_mime_types;

create table if not exists public.kontrola_usuario_almacenes (
 usuario_id uuid not null references auth.users(id) on delete cascade,
 almacen text not null references public.kontrola_almacenes(codigo),
 activo boolean not null default true,
 asignado_en timestamptz not null default now(),
 primary key(usuario_id,almacen)
);

alter table public.kontrola_cargas
 add column if not exists almacen text references public.kontrola_almacenes(codigo),
 add column if not exists estado text,
 add column if not exists revision integer not null default 1,
 add column if not exists hallazgos jsonb not null default '[]'::jsonb,
 add column if not exists correcciones jsonb not null default '[]'::jsonb,
 add column if not exists hoja_generada_en timestamptz,
 add column if not exists actualizado_en timestamptz not null default now();
update public.kontrola_cargas set almacen='PEND_00_CLAS' where almacen is null;
update public.kontrola_cargas set estado=case
 when cerrada_en is not null then 'cerrada'
 when exists(select 1 from public.kontrola_verificaciones v where v.codigo=kontrola_cargas.codigo and v.fin is null) then 'verificacion_en_curso'
 when exists(select 1 from public.kontrola_preparaciones p where p.codigo=kontrola_cargas.codigo and p.fin is null) then 'preparacion_en_curso'
 when exists(select 1 from public.kontrola_preparaciones p where p.codigo=kontrola_cargas.codigo and p.fin is not null) then 'preparada'
 else 'publicada' end
where estado is null;
alter table public.kontrola_cargas alter column almacen set not null;
alter table public.kontrola_cargas alter column estado set not null;
revoke insert,update,delete on public.kontrola_cargas from authenticated;
drop policy if exists "kontrola_cargas_publicar" on public.kontrola_cargas;
alter table public.kontrola_cargas drop constraint if exists kontrola_cargas_estado_valido;
alter table public.kontrola_cargas add constraint kontrola_cargas_estado_valido check (
 estado in ('publicada','preparacion_en_curso','preparada','verificacion_en_curso','cerrada')
);
alter table public.kontrola_cargas drop constraint if exists kontrola_carga_cierre_completo;
alter table public.kontrola_cargas add constraint kontrola_carga_cierre_completo check (
 (cerrada_en is null and cerrada_por is null) or (cerrada_en is not null and cerrada_por is not null)
);

alter table public.kontrola_preparaciones
 add column if not exists inicio_request_id uuid,
 add column if not exists actualizado_en timestamptz not null default now();
create unique index if not exists kontrola_preparacion_request_unico
 on public.kontrola_preparaciones(inicio_request_id) where inicio_request_id is not null;
alter table public.kontrola_verificaciones
 add column if not exists inicio_request_id uuid;
create unique index if not exists kontrola_verificacion_request_unico
 on public.kontrola_verificaciones(inicio_request_id) where inicio_request_id is not null;

create table if not exists public.kontrola_importaciones (
 id uuid primary key default gen_random_uuid(),
 codigo text not null check (codigo ~ '^LP[0-9]{2}-[0-9]{4,6}$'),
 documento_hash text not null unique check (documento_hash ~ '^[a-f0-9]{64}$'),
 documento_ruta text not null unique,
 archivo_nombre text not null,
 archivo_tamano bigint not null check (archivo_tamano > 0 and archivo_tamano <= 26214400),
 almacen_detectado text,
 estado text not null default 'reservada'
  check (estado in ('reservada','revision_requerida','aprobada','publicada','fallida','rechazada')),
 carga_datos jsonb,
 hallazgos jsonb not null default '[]'::jsonb,
 correcciones jsonb not null default '[]'::jsonb,
 advertencias_confirmadas boolean not null default false,
 creado_por uuid not null references auth.users(id),
 creado_en timestamptz not null default now(),
 actualizado_por uuid not null references auth.users(id),
 actualizado_en timestamptz not null default now(),
 publicado_en timestamptz,
 error text
);

create table if not exists public.kontrola_carga_revisiones (
 id uuid primary key default gen_random_uuid(),
 codigo text not null references public.kontrola_cargas(codigo) on delete restrict,
 revision integer not null,
 importacion_id uuid not null references public.kontrola_importaciones(id) on delete restrict,
 documento_hash text not null,
 documento_ruta text not null,
 almacen text not null references public.kontrola_almacenes(codigo),
 carga_datos jsonb not null,
 hallazgos jsonb not null default '[]'::jsonb,
 correcciones jsonb not null default '[]'::jsonb,
 publicada_por uuid not null references auth.users(id),
 publicada_en timestamptz not null default now(),
 vigente boolean not null default true,
 unique(codigo,revision)
);
create unique index if not exists kontrola_revision_vigente_unica
 on public.kontrola_carga_revisiones(codigo) where vigente;

create table if not exists public.kontrola_importacion_eventos (
 id bigint generated always as identity primary key,
 importacion_id uuid not null references public.kontrola_importaciones(id) on delete restrict,
 tipo text not null,
 antes jsonb,
 despues jsonb,
 actor_id uuid not null references auth.users(id),
 creado_en timestamptz not null default now()
);

create table if not exists public.kontrola_actividad (
 id bigint generated always as identity primary key,
 codigo text references public.kontrola_cargas(codigo) on delete restrict,
 almacen text references public.kontrola_almacenes(codigo),
 tipo text not null,
 actor_id uuid not null references auth.users(id),
 detalle jsonb not null default '{}'::jsonb,
 request_id uuid,
 creado_en timestamptz not null default now()
);
create unique index if not exists kontrola_actividad_request_unica
 on public.kontrola_actividad(request_id,tipo) where request_id is not null;

create table if not exists public.kontrola_incidencia_eventos (
 id bigint generated always as identity primary key,
 incidencia_id uuid not null references public.kontrola_incidencias(id) on delete restrict,
 tipo text not null,
 estado_anterior text,
 estado_nuevo text,
 detalle jsonb not null default '{}'::jsonb,
 actor_id uuid not null references auth.users(id),
 creado_en timestamptz not null default now()
);

create table if not exists public.kontrola_avisos (
 id uuid primary key default gen_random_uuid(),
 tipo text not null,
 entidad_tipo text not null,
 entidad_id text not null,
 almacen text references public.kontrola_almacenes(codigo),
 destinatario_clave text not null default 'administrador',
 titulo text not null,
 mensaje text not null,
 activo boolean not null default true,
 creado_en timestamptz not null default now(),
 leido_por uuid references auth.users(id),
 leido_en timestamptz,
 unique(tipo,entidad_tipo,entidad_id,destinatario_clave)
);

create or replace function public.kontrola_puede_almacen(p_almacen text)
returns boolean language sql stable security definer set search_path=''
as $$
 select public.kontrola_es_administrador() or (
  public.kontrola_usuario_activo()
  and exists(select 1 from public.kontrola_almacenes a where a.codigo=p_almacen and a.activo)
  and (
   not exists(select 1 from public.kontrola_usuario_almacenes ua where ua.usuario_id=(select auth.uid()))
   or exists(select 1 from public.kontrola_usuario_almacenes ua where ua.usuario_id=(select auth.uid()) and ua.almacen=p_almacen and ua.activo)
  )
 );
$$;
revoke all on function public.kontrola_puede_almacen(text) from public,anon;
grant execute on function public.kontrola_puede_almacen(text) to authenticated;

alter table public.kontrola_almacenes enable row level security;
alter table public.kontrola_usuario_almacenes enable row level security;
alter table public.kontrola_importaciones enable row level security;
alter table public.kontrola_carga_revisiones enable row level security;
alter table public.kontrola_importacion_eventos enable row level security;
alter table public.kontrola_actividad enable row level security;
alter table public.kontrola_incidencia_eventos enable row level security;
alter table public.kontrola_avisos enable row level security;
revoke all on public.kontrola_almacenes,public.kontrola_usuario_almacenes,
 public.kontrola_importaciones,public.kontrola_carga_revisiones,
 public.kontrola_importacion_eventos,public.kontrola_actividad,
 public.kontrola_incidencia_eventos,public.kontrola_avisos from anon,authenticated;
grant select on public.kontrola_almacenes,public.kontrola_usuario_almacenes,
 public.kontrola_importaciones,public.kontrola_carga_revisiones,
 public.kontrola_importacion_eventos,public.kontrola_actividad,
 public.kontrola_incidencia_eventos,public.kontrola_avisos to authenticated;

create policy "kontrola_almacenes_lectura" on public.kontrola_almacenes
 for select to authenticated using (public.kontrola_usuario_activo());
create policy "kontrola_usuario_almacenes_lectura" on public.kontrola_usuario_almacenes
 for select to authenticated using (
  public.kontrola_es_administrador() or usuario_id=(select auth.uid())
 );
create policy "kontrola_importaciones_admin" on public.kontrola_importaciones
 for select to authenticated using (public.kontrola_es_administrador());
create policy "kontrola_revisiones_lectura" on public.kontrola_carga_revisiones
 for select to authenticated using (public.kontrola_puede_almacen(almacen));
create policy "kontrola_importacion_eventos_admin" on public.kontrola_importacion_eventos
 for select to authenticated using (public.kontrola_es_administrador());
create policy "kontrola_actividad_lectura" on public.kontrola_actividad
 for select to authenticated using (
  public.kontrola_es_administrador()
  or (actor_id=(select auth.uid()) and public.kontrola_puede_almacen(almacen))
 );
create policy "kontrola_incidencia_eventos_lectura" on public.kontrola_incidencia_eventos
 for select to authenticated using (public.kontrola_es_administrador());
create policy "kontrola_avisos_lectura" on public.kontrola_avisos
 for select to authenticated using (
  public.kontrola_es_administrador()
  or (destinatario_clave='usuario:'||(select auth.uid())::text and public.kontrola_puede_almacen(almacen))
 );

drop policy if exists "kontrola_verificaciones_lectura" on public.kontrola_verificaciones;
create policy "kontrola_verificaciones_lectura" on public.kontrola_verificaciones
 for select to authenticated using (
  public.kontrola_es_administrador() or (
   public.kontrola_usuario_activo() and verificador_id=(select auth.uid()) and exists(
    select 1 from public.kontrola_cargas c
    where c.codigo=kontrola_verificaciones.codigo and public.kontrola_puede_almacen(c.almacen)
   )
  )
 );
drop policy if exists "kontrola_verificacion_lineas_lectura" on public.kontrola_verificacion_lineas;
create policy "kontrola_verificacion_lineas_lectura" on public.kontrola_verificacion_lineas
 for select to authenticated using (
  public.kontrola_es_administrador() or exists(
   select 1 from public.kontrola_verificaciones v
   join public.kontrola_cargas c on c.codigo=v.codigo
   where v.id=verificacion_id and v.verificador_id=(select auth.uid())
    and public.kontrola_usuario_activo() and public.kontrola_puede_almacen(c.almacen)
  )
 );
drop policy if exists "kontrola_incidencias_lectura" on public.kontrola_incidencias;
create policy "kontrola_incidencias_lectura" on public.kontrola_incidencias
 for select to authenticated using (
  public.kontrola_es_administrador() or exists(
   select 1 from public.kontrola_verificaciones v
   join public.kontrola_cargas c on c.codigo=v.codigo
   where v.id=verificacion_id and v.verificador_id=(select auth.uid())
    and public.kontrola_usuario_activo() and public.kontrola_puede_almacen(c.almacen)
  )
 );
drop policy if exists "kontrola_verificacion_eventos_lectura" on public.kontrola_verificacion_eventos;
create policy "kontrola_verificacion_eventos_lectura" on public.kontrola_verificacion_eventos
 for select to authenticated using (
  public.kontrola_es_administrador() or exists(
   select 1 from public.kontrola_verificaciones v
   join public.kontrola_cargas c on c.codigo=v.codigo
   where v.id=verificacion_id and v.verificador_id=(select auth.uid())
    and public.kontrola_usuario_activo() and public.kontrola_puede_almacen(c.almacen)
  )
 );

drop policy if exists "kontrola_cargas_lectura" on public.kontrola_cargas;
create policy "kontrola_cargas_lectura" on public.kontrola_cargas
 for select to authenticated using (public.kontrola_puede_almacen(almacen));
drop policy if exists "kontrola_pdf_lectura_autorizada" on storage.objects;
create policy "kontrola_pdf_lectura_autorizada" on storage.objects for select to authenticated
 using (
  bucket_id='kontrola-pdfs' and exists(
   select 1 from public.kontrola_cargas c
   where c.documento_ruta=name and public.kontrola_puede_almacen(c.almacen)
  )
  or bucket_id='kontrola-pdfs' and public.kontrola_es_administrador() and exists(
   select 1 from public.kontrola_importaciones i where i.documento_ruta=name
  )
 );
drop policy if exists "kontrola_pdf_publicar_admin" on storage.objects;
create policy "kontrola_pdf_publicar_admin" on storage.objects for insert to authenticated
 with check (
  bucket_id='kontrola-pdfs' and public.kontrola_es_administrador()
  and exists(
   select 1 from public.kontrola_importaciones i
   where i.documento_ruta=name and i.estado='reservada'
  )
 );
revoke execute on function public.kontrola_cargas_para_verificar() from authenticated;

create or replace function public.kontrola_mis_almacenes()
returns table(codigo text,nombre text)
language sql stable security definer set search_path=''
as $$
 select a.codigo,a.nombre from public.kontrola_almacenes a
 where a.activo and public.kontrola_puede_almacen(a.codigo)
 order by a.codigo;
$$;
revoke all on function public.kontrola_mis_almacenes() from public,anon;
grant execute on function public.kontrola_mis_almacenes() to authenticated;

create or replace function public.kontrola_configurar_acceso_almacen(
 p_usuario uuid,p_almacen text,p_activo boolean
)
returns void language plpgsql security definer set search_path=''
as $$
declare v_anterior boolean;
begin
 if auth.uid() is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración puede configurar almacenes' using errcode='42501';
 end if;
 if not exists(select 1 from public.usuarios_app u where u.id=p_usuario and u.activo) then
  raise exception 'Usuario no habilitado' using errcode='22023';
 end if;
 if not exists(select 1 from public.kontrola_almacenes a where a.codigo=p_almacen and a.activo) then
  raise exception 'Almacén no disponible' using errcode='22023';
 end if;
 select ua.activo into v_anterior from public.kontrola_usuario_almacenes ua
 where ua.usuario_id=p_usuario and ua.almacen=p_almacen;
 insert into public.kontrola_usuario_almacenes(usuario_id,almacen,activo)
 values(p_usuario,p_almacen,p_activo)
 on conflict(usuario_id,almacen) do update set activo=excluded.activo,asignado_en=now();
 insert into public.kontrola_actividad(almacen,tipo,actor_id,detalle)
 values(p_almacen,'acceso_almacen_configurado',(select auth.uid()),jsonb_build_object(
  'usuario_id',p_usuario,'anterior',v_anterior,'nuevo',p_activo
 ));
end;
$$;
revoke all on function public.kontrola_configurar_acceso_almacen(uuid,text,boolean) from public,anon;
grant execute on function public.kontrola_configurar_acceso_almacen(uuid,text,boolean) to authenticated;

create or replace function public.kontrola_panel_cargas(p_almacen text)
returns table(
 codigo text,fecha date,matricula text,ruta text,repartidor text,peso_kg numeric,
 referencias integer,productos jsonb,documento_ruta text,almacen text,estado text,
 revision integer,preparador_id uuid,preparacion_inicio timestamptz,preparacion_fin timestamptz,
 verificador_id uuid,verificacion_inicio timestamptz,verificacion_fin timestamptz,
 incidencias_pendientes bigint
)
language plpgsql stable security definer set search_path=''
as $$
begin
 if not public.kontrola_puede_almacen(p_almacen) then
  raise exception 'Sin acceso al almacén' using errcode='42501';
 end if;
 return query
 select c.codigo,c.fecha,c.matricula,c.ruta,c.repartidor,c.peso_kg,c.referencias,
  c.productos,c.documento_ruta,c.almacen,c.estado,c.revision,
  p.operario_id,p.inicio,p.fin,v.verificador_id,v.inicio,v.fin,
  count(i.id) filter(where i.estado='pendiente')::bigint
 from public.kontrola_cargas c
 left join public.kontrola_preparaciones p on p.codigo=c.codigo
 left join public.kontrola_verificaciones v on v.codigo=c.codigo
 left join public.kontrola_incidencias i on i.codigo=c.codigo
 where c.almacen=p_almacen
 group by c.codigo,c.fecha,c.matricula,c.ruta,c.repartidor,c.peso_kg,c.referencias,
  c.productos,c.documento_ruta,c.almacen,c.estado,c.revision,p.operario_id,p.inicio,p.fin,
  v.verificador_id,v.inicio,v.fin
 order by c.fecha desc nulls last,c.peso_kg desc nulls last,c.codigo;
end;
$$;
revoke all on function public.kontrola_panel_cargas(text) from public,anon;
grant execute on function public.kontrola_panel_cargas(text) to authenticated;

create or replace function public.kontrola_resumen_zona(p_almacen text,p_dia date default current_date)
returns table(
 publicadas bigint,en_preparacion bigint,pendientes_verificacion bigint,
 en_verificacion bigint,cerradas bigint,incidencias_pendientes bigint,anteriores_pendientes bigint
)
language plpgsql stable security definer set search_path=''
as $$
begin
 if not public.kontrola_puede_almacen(p_almacen) then
  raise exception 'Sin acceso al almacén' using errcode='42501';
 end if;
 return query select
  count(*) filter(where c.estado='publicada')::bigint,
  count(*) filter(where c.estado='preparacion_en_curso')::bigint,
  count(*) filter(where c.estado='preparada')::bigint,
  count(*) filter(where c.estado='verificacion_en_curso')::bigint,
  count(*) filter(where c.estado='cerrada' and coalesce(c.cerrada_en::date,c.fecha)=p_dia)::bigint,
  (select count(*) from public.kontrola_incidencias i join public.kontrola_cargas ci on ci.codigo=i.codigo where ci.almacen=p_almacen and i.estado='pendiente')::bigint,
  count(*) filter(where c.estado<>'cerrada' and c.fecha<p_dia)::bigint
 from public.kontrola_cargas c where c.almacen=p_almacen;
end;
$$;
revoke all on function public.kontrola_resumen_zona(text,date) from public,anon;
grant execute on function public.kontrola_resumen_zona(text,date) to authenticated;

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
  id:=v_existing.id;documento_ruta:=v_existing.documento_ruta;repetida:=true;estado:=v_existing.estado;return next;return;
 end if;
 id:=v_id;documento_ruta:='documentos/'||p_codigo||'/'||p_hash||'.pdf';repetida:=false;estado:='reservada';return next;
end;
$$;
revoke all on function public.kontrola_reservar_importacion(text,text,text,bigint) from public,anon;
grant execute on function public.kontrola_reservar_importacion(text,text,text,bigint) to authenticated;

create or replace function public.kontrola_completar_importacion(
 p_importacion uuid,p_carga jsonb,p_hallazgos jsonb
)
returns text language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_row public.kontrola_importaciones%rowtype;v_almacen text;
begin
 if v_user is null or not public.kontrola_es_administrador() then raise exception 'Solo administración puede revisar' using errcode='42501';end if;
 select i.* into v_row from public.kontrola_importaciones i where i.id=p_importacion for update;
 if not found then raise exception 'Importación inexistente' using errcode='22023';end if;
 if v_row.estado='publicada' then return v_row.estado;end if;
 if jsonb_typeof(p_carga)<>'object' or jsonb_typeof(p_carga->'productos')<>'array' or jsonb_typeof(p_hallazgos)<>'array' then
  raise exception 'Contenido procesado inválido' using errcode='22023';
 end if;
 v_almacen:=upper(nullif(p_carga->>'almacen',''));
 update public.kontrola_importaciones set carga_datos=p_carga,hallazgos=p_hallazgos,
  almacen_detectado=v_almacen,estado='revision_requerida',actualizado_por=v_user,actualizado_en=now(),error=null
 where id=p_importacion;
 insert into public.kontrola_importacion_eventos(importacion_id,tipo,despues,actor_id)
 values(p_importacion,'procesada',jsonb_build_object('almacen',v_almacen,'hallazgos',p_hallazgos),v_user);
 return 'revision_requerida';
end;
$$;
revoke all on function public.kontrola_completar_importacion(uuid,jsonb,jsonb) from public,anon;
grant execute on function public.kontrola_completar_importacion(uuid,jsonb,jsonb) to authenticated;

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
 v_has_errors:=exists(select 1 from jsonb_array_elements(p_hallazgos) h where h->>'severity'='error');
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
  select c.revision,c.almacen into v_revision,almacen from public.kontrola_cargas c where c.codigo=v_i.codigo;
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

create or replace function public.kontrola_iniciar_preparacion(p_codigo text,p_request_id uuid)
returns table(codigo text,inicio timestamptz,ya_iniciada boolean)
language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_now timestamptz:=now();v_carga public.kontrola_cargas%rowtype;v_existing public.kontrola_preparaciones%rowtype;
begin
 if v_user is null or not public.kontrola_usuario_activo() then raise exception 'Usuario no habilitado' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Falta identificador de operación' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('operario:'||v_user::text,0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('carga:'||p_codigo,0));
 select c.* into v_carga from public.kontrola_cargas c where c.codigo=p_codigo for update;
 if not found or not public.kontrola_puede_almacen(v_carga.almacen) then raise exception 'Carga no disponible' using errcode='42501';end if;
 if v_carga.estado='cerrada' then raise exception 'La carga está cerrada' using errcode='22023';end if;
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
 update public.kontrola_cargas set estado='preparacion_en_curso',actualizado_en=v_now where kontrola_cargas.codigo=p_codigo;
 insert into public.kontrola_actividad(codigo,almacen,tipo,actor_id,request_id)
 values(p_codigo,v_carga.almacen,'preparacion_iniciada',v_user,p_request_id);
 codigo:=p_codigo;inicio:=v_now;ya_iniciada:=false;return next;
end;
$$;
revoke all on function public.kontrola_iniciar_preparacion(text,uuid) from public,anon;
grant execute on function public.kontrola_iniciar_preparacion(text,uuid) to authenticated;
revoke execute on function public.kontrola_abrir_carga(text) from authenticated;

create or replace function public.kontrola_finalizar_preparacion(p_codigo text)
returns timestamptz language plpgsql security definer set search_path=''
as $$
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
  estado=case when exists(
   select 1 from public.kontrola_verificaciones v where v.codigo=p_codigo and v.fin is null
  ) then 'verificacion_en_curso' else 'preparada' end,
  actualizado_en=v_now
 where kontrola_cargas.codigo=p_codigo returning almacen into v_almacen;
 insert into public.kontrola_actividad(codigo,almacen,tipo,actor_id,detalle)
 values(p_codigo,v_almacen,'preparacion_finalizada',v_user,jsonb_build_object('motivo','manual'));
 return v_now;
end;
$$;

create or replace function public.kontrola_iniciar_verificacion(p_codigo text,p_request_id uuid)
returns table(id uuid,inicio timestamptz,estado text)
language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_p public.kontrola_preparaciones%rowtype;v_v public.kontrola_verificaciones%rowtype;v_c public.kontrola_cargas%rowtype;
begin
 if v_user is null or not public.kontrola_usuario_activo() then raise exception 'Usuario no habilitado' using errcode='42501';end if;
 if p_request_id is null then raise exception 'Falta identificador de operación' using errcode='22023';end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('carga:'||p_codigo,0));
 select c.* into v_c from public.kontrola_cargas c where c.codigo=p_codigo for update;
 if not found or not public.kontrola_puede_almacen(v_c.almacen) then raise exception 'Carga no disponible' using errcode='42501';end if;
 select p.* into v_p from public.kontrola_preparaciones p where p.codigo=p_codigo for update;
 if not found then raise exception 'La carga no tiene preparación' using errcode='22023';end if;
 if v_p.operario_id=v_user then raise exception 'No puedes verificar una carga que has preparado' using errcode='42501';end if;
 select v.* into v_v from public.kontrola_verificaciones v where v.codigo=p_codigo for update;
 if found then
  if v_v.verificador_id<>v_user then raise exception 'Carga asignada a otro verificador' using errcode='42501';end if;
  id:=v_v.id;inicio:=v_v.inicio;estado:=v_v.estado;return next;return;
 end if;
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
$$;
revoke all on function public.kontrola_iniciar_verificacion(text,uuid) from public,anon;
grant execute on function public.kontrola_iniciar_verificacion(text,uuid) to authenticated;
revoke execute on function public.kontrola_abrir_verificacion(text) from authenticated;

create or replace function public.kontrola_registrar_linea(
 p_verificacion uuid,p_linea integer,p_cantidad numeric
)
returns table(linea integer,comprobada_cantidad numeric,diferencia numeric,incidencia_estado text)
language plpgsql security definer set search_path=''
as $$
declare
 v_user uuid:=auth.uid();
 v_verificacion public.kontrola_verificaciones%rowtype;
 v_linea public.kontrola_verificacion_lineas%rowtype;
 v_now timestamptz:=now();
 v_almacen text;
begin
 if v_user is null or not public.kontrola_usuario_activo() then
  raise exception 'Usuario no habilitado para verificación' using errcode='42501';
 end if;
 if p_cantidad is null or p_cantidad<0 or pg_catalog.scale(p_cantidad)>3 then
  raise exception 'Cantidad comprobada inválida' using errcode='22023';
 end if;
 select v.* into v_verificacion from public.kontrola_verificaciones v
 where v.id=p_verificacion for update;
 if not found or v_verificacion.verificador_id<>v_user then
  raise exception 'Verificación no disponible para este usuario' using errcode='42501';
 end if;
 select c.almacen into v_almacen from public.kontrola_cargas c where c.codigo=v_verificacion.codigo;
 if not public.kontrola_puede_almacen(v_almacen) then
  raise exception 'Acceso al almacén revocado' using errcode='42501';
 end if;
 if v_verificacion.estado<>'en_curso' then
  raise exception 'La verificación ya está finalizada' using errcode='22023';
 end if;
 select l.* into v_linea from public.kontrola_verificacion_lineas l
 where l.verificacion_id=p_verificacion and l.linea=p_linea for update;
 if not found then raise exception 'Línea de verificación inexistente' using errcode='22023';end if;
 insert into public.kontrola_verificacion_eventos(
  verificacion_id,linea,cantidad_anterior,cantidad_nueva,registrado_por,registrado_en
 ) values(p_verificacion,p_linea,v_linea.comprobada_cantidad,p_cantidad,v_user,v_now);
 update public.kontrola_verificacion_lineas l
 set comprobada_cantidad=p_cantidad,comprobada_por=v_user,comprobada_en=v_now
 where l.verificacion_id=p_verificacion and l.linea=p_linea;
 if p_cantidad<>v_linea.prevista_cantidad then
  insert into public.kontrola_incidencias(
   codigo,verificacion_id,linea,sku,prevista_cantidad,comprobada_cantidad,
   diferencia,estado,detectada_por,detectada_en,actualizada_por,actualizada_en
  ) values(
   v_verificacion.codigo,p_verificacion,p_linea,v_linea.sku,v_linea.prevista_cantidad,
   p_cantidad,p_cantidad-v_linea.prevista_cantidad,'pendiente',v_user,v_now,v_user,v_now
  )
  on conflict on constraint kontrola_incidencia_linea_unica do update set
   comprobada_cantidad=excluded.comprobada_cantidad,diferencia=excluded.diferencia,
   estado='pendiente',actualizada_por=excluded.actualizada_por,actualizada_en=excluded.actualizada_en;
  incidencia_estado:='pendiente';
 else
  update public.kontrola_incidencias i set
   comprobada_cantidad=p_cantidad,diferencia=0,estado='descartada',
   actualizada_por=v_user,actualizada_en=v_now
  where i.verificacion_id=p_verificacion and i.linea=p_linea;
  incidencia_estado:=null;
 end if;
 linea:=p_linea;comprobada_cantidad:=p_cantidad;
 diferencia:=p_cantidad-v_linea.prevista_cantidad;return next;
end;
$$;
revoke all on function public.kontrola_registrar_linea(uuid,integer,numeric) from public,anon;
grant execute on function public.kontrola_registrar_linea(uuid,integer,numeric) to authenticated;

create or replace function public.kontrola_finalizar_verificacion(p_verificacion uuid)
returns table(codigo text,finalizada_en timestamptz,incidencias_pendientes bigint)
language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_v public.kontrola_verificaciones%rowtype;v_now timestamptz:=now();v_almacen text;v_prep_closed boolean:=false;
begin
 if v_user is null or not public.kontrola_usuario_activo() then raise exception 'Usuario no habilitado' using errcode='42501';end if;
 select v.* into v_v from public.kontrola_verificaciones v where v.id=p_verificacion for update;
 if not found or v_v.verificador_id<>v_user then raise exception 'Verificación no disponible' using errcode='42501';end if;
 select c.almacen into v_almacen from public.kontrola_cargas c where c.codigo=v_v.codigo;
 if not public.kontrola_puede_almacen(v_almacen) then raise exception 'Acceso al almacén revocado' using errcode='42501';end if;
 if exists(select 1 from public.kontrola_verificacion_lineas l where l.verificacion_id=p_verificacion and l.comprobada_cantidad is null) then
  raise exception 'Faltan líneas por comprobar' using errcode='22023';
 end if;
 if v_v.estado<>'finalizada' then
  update public.kontrola_verificaciones set fin=v_now,estado='finalizada' where id=p_verificacion;
  update public.kontrola_preparaciones set fin=v_now,cierre_motivo='Finalización de verificación',actualizado_en=v_now
   where kontrola_preparaciones.codigo=v_v.codigo and fin is null;
  v_prep_closed:=found;
  update public.kontrola_cargas set cerrada_en=coalesce(cerrada_en,v_now),cerrada_por=coalesce(cerrada_por,v_user),
   estado='cerrada',actualizado_en=v_now where kontrola_cargas.codigo=v_v.codigo returning almacen into v_almacen;
  insert into public.kontrola_actividad(codigo,almacen,tipo,actor_id,detalle)
  values(v_v.codigo,v_almacen,'verificacion_finalizada',v_user,jsonb_build_object('preparacion_cerrada',v_prep_closed,'motivo','verificacion_completa'));
 else
  v_now:=v_v.fin;
 end if;
 select count(*) into incidencias_pendientes from public.kontrola_incidencias i where i.verificacion_id=p_verificacion and i.estado='pendiente';
 codigo:=v_v.codigo;finalizada_en:=v_now;return next;
end;
$$;

create or replace function public.kontrola_incidente_auditar()
returns trigger language plpgsql security definer set search_path=''
as $$
declare v_almacen text;
begin
 select c.almacen into v_almacen from public.kontrola_cargas c where c.codigo=new.codigo;
 if tg_op='INSERT' then
  insert into public.kontrola_incidencia_eventos(incidencia_id,tipo,estado_nuevo,detalle,actor_id)
  values(new.id,'creada',new.estado,jsonb_build_object('prevista',new.prevista_cantidad,'comprobada',new.comprobada_cantidad,'diferencia',new.diferencia),new.detectada_por);
 else
  insert into public.kontrola_incidencia_eventos(incidencia_id,tipo,estado_anterior,estado_nuevo,detalle,actor_id)
  values(new.id,'actualizada',old.estado,new.estado,jsonb_build_object('prevista',new.prevista_cantidad,'comprobada',new.comprobada_cantidad,'diferencia',new.diferencia),new.actualizada_por);
 end if;
 if new.estado='pendiente' then
  insert into public.kontrola_avisos(tipo,entidad_tipo,entidad_id,almacen,titulo,mensaje)
  values('incidencia','incidencia',new.id::text,v_almacen,'Nueva incidencia en '||new.codigo,'Referencia '||new.sku||' · diferencia '||new.diferencia)
  on conflict(tipo,entidad_tipo,entidad_id,destinatario_clave) do update set activo=true,mensaje=excluded.mensaje,creado_en=now(),leido_por=null,leido_en=null;
 else
  update public.kontrola_avisos set activo=false where entidad_tipo='incidencia' and entidad_id=new.id::text;
 end if;
 return new;
end;
$$;
drop trigger if exists kontrola_incidencia_auditoria on public.kontrola_incidencias;
create trigger kontrola_incidencia_auditoria after insert or update on public.kontrola_incidencias
 for each row execute function public.kontrola_incidente_auditar();

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
 order by creado_en;
end;
$$;
revoke all on function public.kontrola_necesitan_atencion(text) from public,anon;
grant execute on function public.kontrola_necesitan_atencion(text) to authenticated;

-- El bucket sigue siendo privado. Se mantienen las rutas validadas documentos/LP/hash.pdf.
-- La aplicación nunca escribe en Business Central; la regularización solo se confirma en KONTROLA.
commit;
