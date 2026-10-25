-- KONTROLA · fase 1 · extensión AISLADA en el proyecto Control de Cargas.
-- REVISAR antes de aplicar. No altera public.cargas, cargas_compartidas ni sus políticas.
-- Reutiliza public.usuarios_app y auth.users; no interfiere con INVENTA.
begin;

create or replace function public.kontrola_usuario_activo()
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (
  select 1 from public.usuarios_app u
  where u.id = (select auth.uid()) and u.activo = true
    and u.rol in ('operario','administrador')
 );
$$;
revoke all on function public.kontrola_usuario_activo() from public, anon;
grant execute on function public.kontrola_usuario_activo() to authenticated;

create or replace function public.kontrola_es_administrador()
returns boolean language sql stable security definer set search_path = ''
as $$
 select exists (
  select 1 from public.usuarios_app u
  where u.id = (select auth.uid()) and u.activo = true and u.rol = 'administrador'
 );
$$;
revoke all on function public.kontrola_es_administrador() from public, anon;
grant execute on function public.kontrola_es_administrador() to authenticated;

create table if not exists public.kontrola_cargas (
 codigo text primary key check (codigo ~ '^LP[0-9]{2}-[0-9]{4,6}$'),
 fecha date,
 matricula text,
 ruta text,
 repartidor text,
 peso_kg numeric(14,3) check (peso_kg is null or peso_kg >= 0),
 referencias integer check (referencias is null or referencias >= 0),
 productos jsonb not null default '[]'::jsonb check (jsonb_typeof(productos) = 'array'),
 documento_ruta text not null unique check (documento_ruta ~ '^documentos/LP[0-9]{2}-[0-9]{4,6}/[a-f0-9]{64}\.pdf$'),
 documento_hash text not null check (documento_hash ~ '^[a-f0-9]{64}$'),
 publicado_por uuid not null references auth.users(id),
 publicado_en timestamptz not null default now()
);
alter table public.kontrola_cargas enable row level security;
revoke all on public.kontrola_cargas from anon, authenticated;
grant select, insert on public.kontrola_cargas to authenticated;
drop policy if exists "kontrola_cargas_lectura" on public.kontrola_cargas;
create policy "kontrola_cargas_lectura" on public.kontrola_cargas
  for select to authenticated using (public.kontrola_usuario_activo());
drop policy if exists "kontrola_cargas_publicar" on public.kontrola_cargas;
create policy "kontrola_cargas_publicar" on public.kontrola_cargas
  for insert to authenticated
  with check (public.kontrola_es_administrador() and publicado_por = (select auth.uid()));

create table if not exists public.kontrola_preparaciones (
 codigo text primary key references public.kontrola_cargas(codigo) on delete restrict,
 operario_id uuid not null references auth.users(id),
 inicio timestamptz not null,
 fin timestamptz,
 cierre_motivo text,
 constraint kontrola_tiempos_validos check (fin is null or fin >= inicio)
);
create unique index if not exists kontrola_una_preparacion_activa_por_usuario
 on public.kontrola_preparaciones(operario_id) where fin is null;
alter table public.kontrola_preparaciones enable row level security;
revoke all on public.kontrola_preparaciones from anon, authenticated;
grant select on public.kontrola_preparaciones to authenticated;
drop policy if exists "kontrola_preparaciones_propias" on public.kontrola_preparaciones;
create policy "kontrola_preparaciones_propias" on public.kontrola_preparaciones
  for select to authenticated
  using (public.kontrola_es_administrador() or (public.kontrola_usuario_activo() and operario_id = (select auth.uid())));

-- La única forma autorizada de iniciar/cerrar tiempos para un operario es esta función.
-- Evita sobreescrituras, una carga con dos preparadores y dos cargas simultáneas del mismo operario.
create or replace function public.kontrola_abrir_carga(p_codigo text)
returns table(codigo text, ya_iniciada boolean, finalizada boolean, inicio timestamptz, fin timestamptz)
language plpgsql security definer set search_path = ''
as $$
declare
 v_user uuid := auth.uid();
 v_now timestamptz := now();
 v_existing public.kontrola_preparaciones%rowtype;
begin
 if v_user is null or not public.kontrola_usuario_activo() then
  raise exception 'Usuario no habilitado para preparación' using errcode = '42501';
 end if;
 if p_codigo is null or length(p_codigo) > 40 then
  raise exception 'Código de carga inválido' using errcode = '22023';
 end if;
 -- Candado por operario + carga: un inicio concurrente no duplica ni pisa registros.
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('operario:'||v_user::text, 0));
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('carga:'||p_codigo, 0));
 if not exists(select 1 from public.kontrola_cargas c where c.codigo = p_codigo) then
  raise exception 'La carga no está publicada' using errcode = '22023';
 end if;
 select p.* into v_existing from public.kontrola_preparaciones p where p.codigo = p_codigo;
 if found then
  if v_existing.operario_id <> v_user then
   raise exception 'La carga ya está asignada a otro preparador' using errcode = '42501';
  end if;
  -- Consultar una carga previa no modifica tiempos. Tampoco la reabre.
  codigo := v_existing.codigo;
  ya_iniciada := v_existing.fin is null;
  finalizada := v_existing.fin is not null;
  inicio := v_existing.inicio;
  fin := v_existing.fin;
  return next;
  return;
 end if;
 -- El fin anterior y el inicio nuevo comparten el mismo instante de servidor.
 update public.kontrola_preparaciones p
    set fin = v_now, cierre_motivo = 'Inicio de '||p_codigo
  where p.operario_id = v_user and p.fin is null;
 insert into public.kontrola_preparaciones as p (codigo,operario_id,inicio)
 values(p_codigo,v_user,v_now);
 codigo := p_codigo;
 ya_iniciada := false;
 finalizada := false;
 inicio := v_now;
 fin := null;
 return next;
end;
$$;
revoke all on function public.kontrola_abrir_carga(text) from public, anon;
grant execute on function public.kontrola_abrir_carga(text) to authenticated;

-- Bucket privado separado: las políticas existentes de 'pdf-cargas' son más permisivas.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
 values('kontrola-pdfs','kontrola-pdfs',false,26214400,array['application/pdf'])
 on conflict(id) do nothing;

drop policy if exists "kontrola_pdf_publicar_admin" on storage.objects;
create policy "kontrola_pdf_publicar_admin" on storage.objects for insert to authenticated
 with check (
  bucket_id = 'kontrola-pdfs'
  and public.kontrola_es_administrador()
  and name ~ '^documentos/LP[0-9]{2}-[0-9]{4,6}/[a-f0-9]{64}\.pdf$'
 );
drop policy if exists "kontrola_pdf_lectura_autorizada" on storage.objects;
create policy "kontrola_pdf_lectura_autorizada" on storage.objects for select to authenticated
 using (
  bucket_id = 'kontrola-pdfs' and
  (public.kontrola_es_administrador() or
   (public.kontrola_usuario_activo() and exists(
    select 1 from public.kontrola_cargas c where c.documento_ruta = name
   )))
 );
drop policy if exists "kontrola_pdf_borrado_admin" on storage.objects;
create policy "kontrola_pdf_borrado_admin" on storage.objects for delete to authenticated
 using (bucket_id = 'kontrola-pdfs' and public.kontrola_es_administrador());

commit;
