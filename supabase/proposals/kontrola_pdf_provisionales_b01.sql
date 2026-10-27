-- VISURA PREPARA · B01 · Propuesta incremental para conservar PDF no identificados.
-- Exclusivamente PostgreSQL temporal en CI; NO desplegar ni aplicar a Supabase real.
-- Tabla separada: ninguna carga, preparación o verificación puede nacer de un provisional.

create table if not exists public.kontrola_pdf_provisionales (
  id uuid primary key default gen_random_uuid(),
  documento_hash text not null unique check (documento_hash ~ '^[a-f0-9]{64}$'),
  documento_ruta text not null unique,
  archivo_nombre text not null,
  archivo_tamano bigint not null check (archivo_tamano > 0 and archivo_tamano <= 26214400),
  estado text not null default 'reservada'
    check (estado in ('reservada','pendiente_identificacion','identificada')),
  importacion_id uuid unique references public.kontrola_importaciones(id) on delete restrict,
  codigo_confirmado text check (codigo_confirmado is null or codigo_confirmado ~ '^LP[0-9]{2}-[0-9]{4,6}
  datos_extraidos jsonb not null default '{}'::jsonb
    check (jsonb_typeof(datos_extraidos)='object'),
  motivo text,
  creado_por uuid not null references auth.users(id),
  creado_en timestamptz not null default now(),
  actualizado_por uuid not null references auth.users(id),
  actualizado_en timestamptz not null default now(),
  check (documento_ruta='provisionales/'||documento_hash||'.pdf')
);

alter table public.kontrola_pdf_provisionales enable row level security;
revoke all on public.kontrola_pdf_provisionales from public,anon,authenticated;
grant select on public.kontrola_pdf_provisionales to authenticated;
drop policy if exists "kontrola_provisionales_admin_lectura" on public.kontrola_pdf_provisionales;
create policy "kontrola_provisionales_admin_lectura" on public.kontrola_pdf_provisionales
  for select to authenticated using (public.kontrola_es_administrador());

-- Añadir permisos de Storage únicamente para originales reservados en esta tabla.
-- No modificar las políticas existentes de cargas ya publicadas.
drop policy if exists "kontrola_provisional_pdf_lectura" on storage.objects;
create policy "kontrola_provisional_pdf_lectura" on storage.objects
  for select to authenticated using (
    bucket_id='kontrola-pdfs' and public.kontrola_es_administrador() and exists (
      select 1 from public.kontrola_pdf_provisionales p where p.documento_ruta=name
    )
  );
drop policy if exists "kontrola_provisional_pdf_alta" on storage.objects;
create policy "kontrola_provisional_pdf_alta" on storage.objects
  for insert to authenticated with check (
    bucket_id='kontrola-pdfs' and public.kontrola_es_administrador() and exists (
      select 1 from public.kontrola_pdf_provisionales p
      where p.documento_ruta=name and p.estado='reservada'
    )
  );

create or replace function public.kontrola_reservar_provisional_pdf(
 p_hash text,p_archivo text,p_tamano bigint
)
returns table(id uuid,documento_ruta text,repetida boolean,estado text)
language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_id uuid;
 v_existente public.kontrola_pdf_provisionales%rowtype;
begin
 if v_actor is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración puede reservar provisionales' using errcode='42501';
 end if;
 if p_hash is null or p_hash !~ '^[a-f0-9]{64}$'
  or p_archivo is null or length(p_archivo)>255 or p_archivo !~* '[.]pdf$'
  or p_tamano is null or p_tamano<=0 or p_tamano>26214400 then
  raise exception 'Metadatos de PDF provisional inválidos' using errcode='22023';
 end if;
 -- Un documento ya identificado sigue en su flujo normal; jamás se copia sin control.
 if exists(select 1 from public.kontrola_importaciones i where i.documento_hash=p_hash) then
  raise exception 'Este contenido ya consta en una importación identificada' using errcode='22023';
 end if;
 v_id:=gen_random_uuid();
 insert into public.kontrola_pdf_provisionales(
   id,documento_hash,documento_ruta,archivo_nombre,archivo_tamano,creado_por,actualizado_por
 ) values(
   v_id,p_hash,'provisionales/'||p_hash||'.pdf',p_archivo,p_tamano,v_actor,v_actor
 ) on conflict (documento_hash) do nothing
 returning kontrola_pdf_provisionales.id into v_id;
 if v_id is null then
  select p.* into v_existente from public.kontrola_pdf_provisionales p
  where p.documento_hash=p_hash;
  if v_existente.id is null then
    raise exception 'No se pudo resolver el provisional repetido' using errcode='23505';
  end if;
  id:=v_existente.id;documento_ruta:=v_existente.documento_ruta;
  repetida:=true;estado:=v_existente.estado;return next;return;
 end if;
 id:=v_id;documento_ruta:='provisionales/'||p_hash||'.pdf';
 repetida:=false;estado:='reservada';return next;
end;
$$;
revoke all on function public.kontrola_reservar_provisional_pdf(text,text,bigint) from public,anon;
grant execute on function public.kontrola_reservar_provisional_pdf(text,text,bigint) to authenticated;

create or replace function public.kontrola_completar_provisional_pdf(
 p_id uuid,p_datos jsonb,p_motivo text
)
returns text
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_row public.kontrola_pdf_provisionales%rowtype;
begin
 if v_actor is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración puede completar provisionales' using errcode='42501';
 end if;
 if jsonb_typeof(p_datos)<>'object' or p_motivo is null or length(trim(p_motivo))<8 then
  raise exception 'Motivo o metadatos de provisional inválidos' using errcode='22023';
 end if;
 select p.* into v_row from public.kontrola_pdf_provisionales p where p.id=p_id for update;
 if not found then raise exception 'Provisional no encontrado' using errcode='22023';end if;
 if not exists (select 1 from storage.objects o where o.bucket_id='kontrola-pdfs' and o.name=v_row.documento_ruta) then
  raise exception 'El PDF original no consta en el almacén privado' using errcode='22023';
 end if;
 if v_row.estado='pendiente_identificacion' then return v_row.estado; end if;
 update public.kontrola_pdf_provisionales
 set estado='pendiente_identificacion',datos_extraidos=p_datos,motivo=left(p_motivo,1000),
   actualizado_por=v_actor,actualizado_en=now()
 where id=p_id;
 return 'pendiente_identificacion';
end;
$$;
revoke all on function public.kontrola_completar_provisional_pdf(uuid,jsonb,text) from public,anon;
grant execute on function public.kontrola_completar_provisional_pdf(uuid,jsonb,text) to authenticated;
),
  almacen_confirmado text check (almacen_confirmado is null or almacen_confirmado in ('COR_01_COR','COR_02_NAR')),
  evidencia_confirmacion text,
  datos_extraidos jsonb not null default '{}'::jsonb
    check (jsonb_typeof(datos_extraidos)='object'),
  motivo text,
  creado_por uuid not null references auth.users(id),
  creado_en timestamptz not null default now(),
  actualizado_por uuid not null references auth.users(id),
  actualizado_en timestamptz not null default now(),
  check (documento_ruta='provisionales/'||documento_hash||'.pdf')
);

alter table public.kontrola_pdf_provisionales enable row level security;
revoke all on public.kontrola_pdf_provisionales from public,anon,authenticated;
grant select on public.kontrola_pdf_provisionales to authenticated;
drop policy if exists "kontrola_provisionales_admin_lectura" on public.kontrola_pdf_provisionales;
create policy "kontrola_provisionales_admin_lectura" on public.kontrola_pdf_provisionales
  for select to authenticated using (public.kontrola_es_administrador());

-- Añadir permisos de Storage únicamente para originales reservados en esta tabla.
-- No modificar las políticas existentes de cargas ya publicadas.
drop policy if exists "kontrola_provisional_pdf_lectura" on storage.objects;
create policy "kontrola_provisional_pdf_lectura" on storage.objects
  for select to authenticated using (
    bucket_id='kontrola-pdfs' and public.kontrola_es_administrador() and exists (
      select 1 from public.kontrola_pdf_provisionales p where p.documento_ruta=name
    )
  );
drop policy if exists "kontrola_provisional_pdf_alta" on storage.objects;
create policy "kontrola_provisional_pdf_alta" on storage.objects
  for insert to authenticated with check (
    bucket_id='kontrola-pdfs' and public.kontrola_es_administrador() and exists (
      select 1 from public.kontrola_pdf_provisionales p
      where p.documento_ruta=name and p.estado='reservada'
    )
  );

create or replace function public.kontrola_reservar_provisional_pdf(
 p_hash text,p_archivo text,p_tamano bigint
)
returns table(id uuid,documento_ruta text,repetida boolean,estado text)
language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_id uuid;
 v_existente public.kontrola_pdf_provisionales%rowtype;
begin
 if v_actor is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración puede reservar provisionales' using errcode='42501';
 end if;
 if p_hash is null or p_hash !~ '^[a-f0-9]{64}$'
  or p_archivo is null or length(p_archivo)>255 or p_archivo !~* '[.]pdf$'
  or p_tamano is null or p_tamano<=0 or p_tamano>26214400 then
  raise exception 'Metadatos de PDF provisional inválidos' using errcode='22023';
 end if;
 -- Un documento ya identificado sigue en su flujo normal; jamás se copia sin control.
 if exists(select 1 from public.kontrola_importaciones i where i.documento_hash=p_hash) then
  raise exception 'Este contenido ya consta en una importación identificada' using errcode='22023';
 end if;
 v_id:=gen_random_uuid();
 insert into public.kontrola_pdf_provisionales(
   id,documento_hash,documento_ruta,archivo_nombre,archivo_tamano,creado_por,actualizado_por
 ) values(
   v_id,p_hash,'provisionales/'||p_hash||'.pdf',p_archivo,p_tamano,v_actor,v_actor
 ) on conflict (documento_hash) do nothing
 returning kontrola_pdf_provisionales.id into v_id;
 if v_id is null then
  select p.* into v_existente from public.kontrola_pdf_provisionales p
  where p.documento_hash=p_hash;
  if v_existente.id is null then
    raise exception 'No se pudo resolver el provisional repetido' using errcode='23505';
  end if;
  id:=v_existente.id;documento_ruta:=v_existente.documento_ruta;
  repetida:=true;estado:=v_existente.estado;return next;return;
 end if;
 id:=v_id;documento_ruta:='provisionales/'||p_hash||'.pdf';
 repetida:=false;estado:='reservada';return next;
end;
$$;
revoke all on function public.kontrola_reservar_provisional_pdf(text,text,bigint) from public,anon;
grant execute on function public.kontrola_reservar_provisional_pdf(text,text,bigint) to authenticated;

create or replace function public.kontrola_completar_provisional_pdf(
 p_id uuid,p_datos jsonb,p_motivo text
)
returns text
language plpgsql security definer set search_path=''
as $$
declare v_actor uuid:=auth.uid();v_row public.kontrola_pdf_provisionales%rowtype;
begin
 if v_actor is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración puede completar provisionales' using errcode='42501';
 end if;
 if jsonb_typeof(p_datos)<>'object' or p_motivo is null or length(trim(p_motivo))<8 then
  raise exception 'Motivo o metadatos de provisional inválidos' using errcode='22023';
 end if;
 select p.* into v_row from public.kontrola_pdf_provisionales p where p.id=p_id for update;
 if not found then raise exception 'Provisional no encontrado' using errcode='22023';end if;
 if not exists (select 1 from storage.objects o where o.bucket_id='kontrola-pdfs' and o.name=v_row.documento_ruta) then
  raise exception 'El PDF original no consta en el almacén privado' using errcode='22023';
 end if;
 if v_row.estado='pendiente_identificacion' then return v_row.estado; end if;
 update public.kontrola_pdf_provisionales
 set estado='pendiente_identificacion',datos_extraidos=p_datos,motivo=left(p_motivo,1000),
   actualizado_por=v_actor,actualizado_en=now()
 where id=p_id;
 return 'pendiente_identificacion';
end;
$$;
revoke all on function public.kontrola_completar_provisional_pdf(uuid,jsonb,text) from public,anon;
grant execute on function public.kontrola_completar_provisional_pdf(uuid,jsonb,text) to authenticated;


-- No se publica una carga: solo se transfiere la identidad confirmada
-- a la importación documental normal, aún pendiente de revisión administrativa.
create or replace function public.kontrola_identificar_provisional_pdf(
 p_id uuid,p_codigo text,p_almacen text,p_evidencia text
)
returns uuid
language plpgsql security definer set search_path=''
as $$
declare
 v_actor uuid:=auth.uid();
 v_draft public.kontrola_pdf_provisionales%rowtype;
 v_importacion uuid;
begin
 if v_actor is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración puede identificar PDF provisionales' using errcode='42501';
 end if;
 if p_codigo is null or p_codigo !~ '^LP[0-9]{2}-[0-9]{4,6}$'
  or p_almacen is null or p_almacen not in ('COR_01_COR','COR_02_NAR')
  or p_evidencia is null or length(trim(p_evidencia))<15 then
  raise exception 'La identificación exige LP, almacén y evidencia contrastada con BC' using errcode='22023';
 end if;
 select p.* into v_draft from public.kontrola_pdf_provisionales p
 where p.id=p_id for update;
 if not found then raise exception 'PDF provisional inexistente' using errcode='22023';end if;
 if v_draft.estado='identificada' then
  if v_draft.codigo_confirmado<>p_codigo or v_draft.almacen_confirmado<>p_almacen then
   raise exception 'Este PDF provisional ya tiene otra identidad validada' using errcode='22023';
  end if;
  return v_draft.importacion_id;
 end if;
 if v_draft.estado<>'pendiente_identificacion' then
  raise exception 'El original debe conservarse antes de identificarlo' using errcode='22023';
 end if;
 if not exists(select 1 from storage.objects o
  where o.bucket_id='kontrola-pdfs' and o.name=v_draft.documento_ruta) then
  raise exception 'El PDF original no consta en el almacenamiento privado' using errcode='22023';
 end if;
 insert into public.kontrola_importaciones(
   codigo,documento_hash,documento_ruta,archivo_nombre,archivo_tamano,
   almacen_detectado,creado_por,actualizado_por
 ) values(
   p_codigo,v_draft.documento_hash,v_draft.documento_ruta,
   v_draft.archivo_nombre,v_draft.archivo_tamano,p_almacen,
   v_actor,v_actor
 ) on conflict do nothing returning id into v_importacion;
 if v_importacion is null then
  raise exception 'El documento ya está registrado o existe conflicto de identidad' using errcode='22023';
 end if;
 update public.kontrola_pdf_provisionales
  set estado='identificada',codigo_confirmado=p_codigo,
  almacen_confirmado=p_almacen,evidencia_confirmacion=left(p_evidencia,2000),
  importacion_id=v_importacion,actualizado_por=v_actor,actualizado_en=now()
 where id=p_id;
 insert into public.kontrola_importacion_eventos(importacion_id,tipo,despues,actor_id)
 values(
   v_importacion,'provisional_identificado',
   jsonb_build_object('provisional_id',p_id,'codigo',p_codigo,
     'almacen',p_almacen,'evidencia',left(p_evidencia,2000)),
   v_actor
 );
 return v_importacion;
end;
$$;
revoke all on function public.kontrola_identificar_provisional_pdf(uuid,text,text,text) from public,anon;
grant execute on function public.kontrola_identificar_provisional_pdf(uuid,text,text,text) to authenticated;
