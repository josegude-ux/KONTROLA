-- VISURA PREPARA · FASE 2 · PROPUESTA COMPLETA SQL PARA F3
-- NO EJECUTAR NI APLICAR EN PRODUCCIÓN, NI EN OTROS PROYECTOS.
-- Requiere respaldo verificable y GO específico de 000/200/15.
-- Exige base de pruebas Control de Cargas, inexistente/NO ACREDITADA al 17-11-2026.
-- No altera ninguna tabla de KONTROLA, INVENTA, TANQUES ni Business Central.
-- Estado de verificación F3 exige sincronización explícita de líneas, con CAS.
begin;

create or replace function public.verificacion_cargas_normalizar_lp(p_codigo text)
returns text language plpgsql immutable set search_path='' as $$
declare v text; n text;
begin
 v:=upper(regexp_replace(coalesce(p_codigo,''),'[[:space:]]','','g'));
 if v !~ '^LP[0-9]{2}-?[0-9]{4,6}$' then
   raise exception 'Formato LP no reconocido' using errcode='22023';
 end if;
 n:=ltrim(regexp_replace(v,'^LP[0-9]{2}-?','',''),'0');
 return 'LP'||substring(v from 3 for 2)||'-'||lpad(n,greatest(4,length(n)),'0');
end $$;
revoke all on function public.verificacion_cargas_normalizar_lp(text) from public,anon,authenticated;

create table if not exists public.verificacion_cargas_revisiones (
 almacen text not null,
 codigo text not null check(codigo=public.verificacion_cargas_normalizar_lp(codigo)),
 pdf_hash text not null check(pdf_hash ~ '^[a-f0-9]{64}$'),
 lineas jsonb not null check(jsonb_typeof(lineas)='array'),
 total integer not null check(total > 0 and total <= 3000),
 comprobadas integer not null check(comprobadas>=0 and comprobadas<=total),
 incidencias integer not null check(incidencias>=0 and incidencias<=comprobadas),
 cerrada_en timestamptz,
 version_revision bigint not null default 1 check(version_revision > 0),
 actualizada_en timestamptz not null default clock_timestamp(),
 primary key(almacen,codigo),
 check(jsonb_array_length(lineas)=total)
);
create table if not exists public.verificacion_cargas_descartes (
 almacen text not null,
 codigo text not null,
 estado_descarte text not null default 'activa' check(estado_descarte in('activa','descartada')),
 pdf_hash_original text not null check(pdf_hash_original ~ '^[a-f0-9]{64}$'),
 descartada_en timestamptz,
 descartada_por uuid references auth.users(id),
 motivo_descarte text check(motivo_descarte is null or char_length(motivo_descarte)<=180),
 snapshot_progreso jsonb,
 version_descarte bigint not null default 0 check(version_descarte>=0),
 actualizada_en timestamptz not null default clock_timestamp(),
 primary key(almacen,codigo),
 foreign key(almacen,codigo) references public.verificacion_cargas_revisiones(almacen,codigo) on delete restrict,
 check(estado_descarte='activa' or
  (descartada_en is not null and descartada_por is not null and snapshot_progreso is not null))
);
create table if not exists public.verificacion_cargas_operaciones (
 operacion_id uuid primary key,
 almacen text not null,
 accion text not null check(accion in ('descartar_lote','restaurar')),
 actor_id uuid not null references auth.users(id),
 solicitud jsonb not null,
 respuesta jsonb,
 creada_en timestamptz not null default clock_timestamp()
);
create table if not exists public.verificacion_cargas_eventos (
 evento_id bigint generated always as identity primary key,
 operacion_id uuid not null references public.verificacion_cargas_operaciones(operacion_id),
 almacen text not null,
 codigo text not null,
 accion text not null check(accion in ('descartar','restaurar')),
 estado_anterior text not null,
 estado_nuevo text not null,
 actor_id uuid not null references auth.users(id),
 en_servidor timestamptz not null default clock_timestamp(),
 dispositivo_informativo text,
 snapshot_progreso jsonb,
 unique(operacion_id,almacen,codigo,accion),
 foreign key(almacen,codigo) references public.verificacion_cargas_descartes(almacen,codigo) on delete restrict
);
create table if not exists public.verificacion_cargas_versiones_posteriores (
 almacen text not null,
 codigo text not null,
 pdf_hash text not null check(pdf_hash ~ '^[a-f0-9]{64}$'),
 recibida_en timestamptz not null default clock_timestamp(),
 actor_id uuid not null references auth.users(id),
 dispositivo_informativo text,
 pendiente_restauracion boolean not null default true,
 primary key(almacen,codigo,pdf_hash),
 foreign key(almacen,codigo) references public.verificacion_cargas_descartes(almacen,codigo) on delete restrict
);
create index if not exists verificacion_cargas_eventos_por_carga
 on public.verificacion_cargas_eventos(almacen,codigo,en_servidor desc);

-- Sin INSERT/UPDATE/DELETE directos desde navegador: todas las escrituras por RPC autorizada.
alter table public.verificacion_cargas_revisiones enable row level security;
alter table public.verificacion_cargas_descartes enable row level security;
alter table public.verificacion_cargas_operaciones enable row level security;
alter table public.verificacion_cargas_eventos enable row level security;
alter table public.verificacion_cargas_versiones_posteriores enable row level security;
revoke all on public.verificacion_cargas_revisiones,public.verificacion_cargas_descartes,
 public.verificacion_cargas_operaciones,public.verificacion_cargas_eventos,
 public.verificacion_cargas_versiones_posteriores from public,anon,authenticated;
grant select on public.verificacion_cargas_revisiones,public.verificacion_cargas_descartes,
 public.verificacion_cargas_operaciones,public.verificacion_cargas_eventos,
 public.verificacion_cargas_versiones_posteriores to authenticated;
create policy vc_revisiones_lectura on public.verificacion_cargas_revisiones for select to authenticated
 using ((select auth.uid()) is not null and public.kontrola_usuario_activo() and public.kontrola_puede_almacen(almacen));
create policy vc_descartes_lectura on public.verificacion_cargas_descartes for select to authenticated
 using ((select auth.uid()) is not null and public.kontrola_usuario_activo() and public.kontrola_puede_almacen(almacen));
create policy vc_operaciones_lectura on public.verificacion_cargas_operaciones for select to authenticated
 using ((select auth.uid())=actor_id and public.kontrola_usuario_activo() and public.kontrola_puede_almacen(almacen));
create policy vc_eventos_lectura on public.verificacion_cargas_eventos for select to authenticated
 using ((select auth.uid()) is not null and public.kontrola_usuario_activo() and public.kontrola_puede_almacen(almacen));
create policy vc_versiones_lectura on public.verificacion_cargas_versiones_posteriores for select to authenticated
 using ((select auth.uid()) is not null and public.kontrola_usuario_activo() and public.kontrola_puede_almacen(almacen));

-- Defensa adicional: historial append-only, incluso ante grants erróneos.
create or replace function public.verificacion_cargas_bloquear_edicion_auditoria()
returns trigger language plpgsql set search_path='' as $$
begin
 raise exception 'Auditoría inmutable: únicamente añadir eventos' using errcode='42501';
end $$;
revoke all on function public.verificacion_cargas_bloquear_edicion_auditoria() from public,anon,authenticated;
create trigger vc_eventos_append_only before update or delete
 on public.verificacion_cargas_eventos for each row
 execute function public.verificacion_cargas_bloquear_edicion_auditoria();

-- Ingesta futura de verificación al servidor, requisito ANTES de descarte remoto.
-- El cliente declara estados por línea, el servidor valida, calcula el recuento y fija tiempo/usuario.
-- Esta RPC NO forma parte del código conectado en F2.
create or replace function public.verificacion_cargas_sincronizar_revision(
 p_almacen text,p_codigo text,p_pdf_hash text,p_lineas jsonb,
 p_version_esperada bigint,p_cerrar boolean default false,p_aceptar_incidencias boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_codigo text;
 v_total int;v_checked int;v_incidents int;
 v_previous public.verificacion_cargas_revisiones%rowtype;
 v_entry public.verificacion_cargas_descartes%rowtype;
 v_new_version bigint;v_time timestamptz:=clock_timestamp();
begin
 if v_user is null or not public.kontrola_usuario_activo()
    or not public.kontrola_puede_almacen(p_almacen) then
  raise exception 'Sesión/almacén sin autorización' using errcode='42501';
 end if;
 v_codigo:=public.verificacion_cargas_normalizar_lp(p_codigo);
 if p_codigo<>v_codigo then raise exception 'LP no canónico' using errcode='22023'; end if;
 if p_pdf_hash is null or p_pdf_hash !~ '^[a-f0-9]{64}$' or
   jsonb_typeof(p_lineas) is distinct from 'array' then
  raise exception 'PDF o líneas no verificables' using errcode='22023';
 end if;
 v_total:=jsonb_array_length(p_lineas);
 if v_total<1 or v_total>3000 then raise exception 'Líneas fuera de rango' using errcode='22023';end if;
 if exists(select 1 from jsonb_array_elements(p_lineas) as t(item)
   where jsonb_typeof(item)<>'object' or coalesce(item->>'status','') not in ('pending','ok','incident')) then
  raise exception 'Línea de verificación inválida' using errcode='22023';
 end if;
 select count(*) filter(where item->>'status'<>'pending'),
        count(*) filter(where item->>'status'='incident')
 into v_checked,v_incidents from jsonb_array_elements(p_lineas) as t(item);
 if p_version_esperada is null then raise exception 'Versión esperada requerida' using errcode='22023';end if;
 if p_cerrar and v_checked<>v_total then raise exception 'Quedan pendientes' using errcode='22023';end if;
 if p_cerrar and v_incidents>0 and not coalesce(p_aceptar_incidencias,false) then
  raise exception 'Incidencias sin aceptación expresa' using errcode='22023';
 end if;
 select * into v_previous from public.verificacion_cargas_revisiones
  where almacen=p_almacen and codigo=v_codigo for update;
 if found then
  if v_previous.version_revision<>p_version_esperada then raise exception 'Conflicto de revisión' using errcode='40001';end if;
  if v_previous.cerrada_en is not null then raise exception 'Revisión cerrada' using errcode='22023';end if;
  select * into v_entry from public.verificacion_cargas_descartes
   where almacen=p_almacen and codigo=v_codigo for update;
  if not found then raise exception 'Falta ledger del servidor' using errcode='22023';end if;
  if v_entry.estado_descarte='descartada' then raise exception 'Carga descartada' using errcode='22023';end if;
  update public.verificacion_cargas_revisiones set pdf_hash=p_pdf_hash,lineas=p_lineas,
   total=v_total,comprobadas=v_checked,incidencias=v_incidents,
   cerrada_en=case when p_cerrar then v_time else null end,
   version_revision=version_revision+1,actualizada_en=v_time
   where almacen=p_almacen and codigo=v_codigo returning version_revision into v_new_version;
 else
  if p_version_esperada<>0 then raise exception 'Revisión ausente' using errcode='40001';end if;
  insert into public.verificacion_cargas_revisiones
   (almacen,codigo,pdf_hash,lineas,total,comprobadas,incidencias,cerrada_en,version_revision,actualizada_en)
   values(p_almacen,v_codigo,p_pdf_hash,p_lineas,v_total,v_checked,v_incidents,
    case when p_cerrar then v_time else null end,1,v_time);
  insert into public.verificacion_cargas_descartes (almacen,codigo,pdf_hash_original)
   values(p_almacen,v_codigo,p_pdf_hash);
  v_new_version:=1;
 end if;
 return jsonb_build_object('codigo',v_codigo,'version_revision',v_new_version,
   'comprobadas',v_checked,'total',v_total,'actor_servidor',v_user,'fecha_servidor',v_time);
end $$;
revoke all on function public.verificacion_cargas_sincronizar_revision(text,text,text,jsonb,bigint,boolean,boolean)
 from public,anon,authenticated;
grant execute on function public.verificacion_cargas_sincronizar_revision(text,text,text,jsonb,bigint,boolean,boolean)
 to authenticated;

-- Descarte atómico: solicitud misma operación+contenido devuelve MISMO recibo.
-- El servidor relee revisiones, cierra CAS, mantiene PDF original y snapshot.
create or replace function public.verificacion_cargas_descartar_lote(
 p_almacen text,p_codigos text[],p_versiones jsonb,p_operacion uuid,
 p_motivo text default null,p_dispositivo text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_code text;v_request jsonb;v_receipt jsonb;
 v_op public.verificacion_cargas_operaciones%rowtype;
 v_review public.verificacion_cargas_revisiones%rowtype;
 v_state public.verificacion_cargas_descartes%rowtype;
 v_result jsonb:='[]'::jsonb;v_snapshot jsonb;v_timestamp timestamptz:=clock_timestamp();
begin
 if v_user is null or not public.kontrola_usuario_activo()
    or not public.kontrola_puede_almacen(p_almacen) then
  raise exception 'Sin autorización de carga/almacén' using errcode='42501';
 end if;
 if p_operacion is null or p_codigos is null or cardinality(p_codigos)<1
    or cardinality(p_codigos)>100 or jsonb_typeof(p_versiones) is distinct from 'object'
    or char_length(coalesce(p_motivo,''))>180 then
  raise exception 'Lote o motivo inválido' using errcode='22023';
 end if;
 if (select count(distinct x) from unnest(p_codigos) as t(x))<>cardinality(p_codigos) then
  raise exception 'LP repetido en selección' using errcode='22023';
 end if;
 for v_code in select x from unnest(p_codigos) as t(x) order by x loop
  if v_code is null or v_code<>public.verificacion_cargas_normalizar_lp(v_code) then
   raise exception 'LP no canónico en lote' using errcode='22023';
  end if;
 end loop;
 v_request:=jsonb_build_object('almacen',p_almacen,'codigos',
    to_jsonb((select array_agg(x order by x) from unnest(p_codigos) as t(x))),
    'versiones',p_versiones,'motivo',p_motivo);
 insert into public.verificacion_cargas_operaciones(operacion_id,almacen,accion,actor_id,solicitud)
 values(p_operacion,p_almacen,'descartar_lote',v_user,v_request)
 on conflict (operacion_id) do nothing;
 select * into v_op from public.verificacion_cargas_operaciones
  where operacion_id=p_operacion for update;
 if v_op.accion<>'descartar_lote' or v_op.actor_id<>v_user or v_op.solicitud<>v_request then
  raise exception 'ID de operación utilizado con contenido diferente' using errcode='23505';
 end if;
 if v_op.respuesta is not null then return v_op.respuesta;end if;
 -- Primer recorrido: bloquear y validar todas las revisiones/estados ANTES de mutar.
 for v_code in select x from unnest(p_codigos) as t(x) order by x loop
  select * into v_review from public.verificacion_cargas_revisiones
   where almacen=p_almacen and codigo=v_code for update;
  if not found then raise exception 'Revisión no sincronizada para %',v_code using errcode='22023';end if;
  select * into v_state from public.verificacion_cargas_descartes
   where almacen=p_almacen and codigo=v_code for update;
  if not found or v_state.estado_descarte<>'activa'
    or v_review.cerrada_en is not null or v_review.comprobadas>=v_review.total
    or v_state.version_descarte is distinct from
        (p_versiones->v_code->>'version_descarte')::bigint
    or v_review.version_revision is distinct from
        (p_versiones->v_code->>'version_revision')::bigint then
   raise exception 'Carga no descartable o versión conflictiva: %',v_code using errcode='40001';
  end if;
 end loop;
 -- Segundo recorrido: una sola transacción Postgres; error posterior revierte TODO.
 for v_code in select x from unnest(p_codigos) as t(x) order by x loop
  select * into v_review from public.verificacion_cargas_revisiones
   where almacen=p_almacen and codigo=v_code;
  v_snapshot:=jsonb_build_object('nombre','snapshot_progreso_al_descartar',
   'total',v_review.total,'checked',v_review.comprobadas,
   'pending',v_review.total-v_review.comprobadas,'incidents',v_review.incidencias,
   'version_revision',v_review.version_revision,'capturado_en_servidor',v_timestamp);
  update public.verificacion_cargas_descartes set estado_descarte='descartada',
   descartada_en=v_timestamp,descartada_por=v_user,motivo_descarte=nullif(p_motivo,''),
   snapshot_progreso=v_snapshot,version_descarte=version_descarte+1,actualizada_en=v_timestamp
   where almacen=p_almacen and codigo=v_code;
  insert into public.verificacion_cargas_eventos
   (operacion_id,almacen,codigo,accion,estado_anterior,estado_nuevo,actor_id,
    en_servidor,dispositivo_informativo,snapshot_progreso)
   values(p_operacion,p_almacen,v_code,'descartar','activa','descartada',v_user,
    v_timestamp,left(p_dispositivo,100),v_snapshot);
  v_result:=v_result||jsonb_build_array(jsonb_build_object('codigo',v_code,
    'version_descarte',(p_versiones->v_code->>'version_descarte')::bigint+1));
 end loop;
 v_receipt:=jsonb_build_object('operacion_id',p_operacion,'actor_servidor',v_user,
   'fecha_servidor',v_timestamp,'cantidad',cardinality(p_codigos),'cargas',v_result);
 update public.verificacion_cargas_operaciones set respuesta=v_receipt
 where operacion_id=p_operacion;
 return v_receipt;
end $$;
revoke all on function public.verificacion_cargas_descartar_lote(text,text[],jsonb,uuid,text,text)
 from public,anon,authenticated;
grant execute on function public.verificacion_cargas_descartar_lote(text,text[],jsonb,uuid,text,text)
 to authenticated;

-- Restauración manual: mantiene snapshot, progreso y auditoría.
create or replace function public.verificacion_cargas_restaurar(
 p_almacen text,p_codigo text,p_version_descarte bigint,p_operacion uuid,
 p_dispositivo text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_state public.verificacion_cargas_descartes%rowtype;
 v_code text;v_request jsonb;v_op public.verificacion_cargas_operaciones%rowtype;
 v_receipt jsonb;v_time timestamptz:=clock_timestamp();
begin
 if v_user is null or not public.kontrola_usuario_activo()
    or not public.kontrola_puede_almacen(p_almacen) then
  raise exception 'Sin autorización' using errcode='42501';
 end if;
 v_code:=public.verificacion_cargas_normalizar_lp(p_codigo);
 if v_code<>p_codigo or p_operacion is null then raise exception 'LP/operación inválidos' using errcode='22023';end if;
 v_request:=jsonb_build_object('almacen',p_almacen,'codigo',v_code,'version',p_version_descarte);
 insert into public.verificacion_cargas_operaciones(operacion_id,almacen,accion,actor_id,solicitud)
 values(p_operacion,p_almacen,'restaurar',v_user,v_request) on conflict(operacion_id) do nothing;
 select * into v_op from public.verificacion_cargas_operaciones where operacion_id=p_operacion for update;
 if v_op.actor_id<>v_user or v_op.accion<>'restaurar' or v_op.solicitud<>v_request then
  raise exception 'Conflicto de ID de operación' using errcode='23505';
 end if;
 if v_op.respuesta is not null then return v_op.respuesta;end if;
 select * into v_state from public.verificacion_cargas_descartes
 where almacen=p_almacen and codigo=v_code for update;
 if not found or v_state.estado_descarte<>'descartada' or
    v_state.version_descarte<>p_version_descarte then
  raise exception 'Carga no restaurable o versión conflictiva' using errcode='40001';
 end if;
 update public.verificacion_cargas_descartes
 set estado_descarte='activa',version_descarte=version_descarte+1,actualizada_en=v_time
 where almacen=p_almacen and codigo=v_code;
 insert into public.verificacion_cargas_eventos
 (operacion_id,almacen,codigo,accion,estado_anterior,estado_nuevo,actor_id,
 en_servidor,dispositivo_informativo,snapshot_progreso)
 values(p_operacion,p_almacen,v_code,'restaurar','descartada','activa',v_user,
 v_time,left(p_dispositivo,100),v_state.snapshot_progreso);
 v_receipt:=jsonb_build_object('codigo',v_code,'estado_descarte','activa',
  'operacion_id',p_operacion,'actor_servidor',v_user,'fecha_servidor',v_time,
  'version_descarte',p_version_descarte+1);
 update public.verificacion_cargas_operaciones set respuesta=v_receipt where operacion_id=p_operacion;
 return v_receipt;
end $$;
revoke all on function public.verificacion_cargas_restaurar(text,text,bigint,uuid,text)
 from public,anon,authenticated;
grant execute on function public.verificacion_cargas_restaurar(text,text,bigint,uuid,text)
 to authenticated;

-- Versión posterior recibida: nunca reactiva ni reemplaza PDF original.
create or replace function public.verificacion_cargas_registrar_version_posterior(
 p_almacen text,p_codigo text,p_hash text,p_dispositivo text default null)
returns jsonb language plpgsql security definer set search_path='' as $$
declare v_user uuid:=auth.uid();v_state public.verificacion_cargas_descartes%rowtype;
 v_time timestamptz;v_code text:=public.verificacion_cargas_normalizar_lp(p_codigo);
begin
 if v_user is null or not public.kontrola_usuario_activo()
   or not public.kontrola_puede_almacen(p_almacen) then
  raise exception 'Sin autorización' using errcode='42501';
 end if;
 if p_codigo<>v_code or p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then
  raise exception 'Código o hash inválido' using errcode='22023';
 end if;
 select * into v_state from public.verificacion_cargas_descartes
 where almacen=p_almacen and codigo=v_code for update;
 if not found or v_state.estado_descarte<>'descartada' then
  raise exception 'La carga no está descartada' using errcode='22023';
 end if;
 if p_hash=v_state.pdf_hash_original then
  return jsonb_build_object('codigo',v_code,'posterior',false,'mismo_original',true);
 end if;
 insert into public.verificacion_cargas_versiones_posteriores
 (almacen,codigo,pdf_hash,actor_id,dispositivo_informativo)
 values(p_almacen,v_code,p_hash,v_user,left(p_dispositivo,100))
 on conflict(almacen,codigo,pdf_hash) do nothing;
 select recibida_en into v_time from public.verificacion_cargas_versiones_posteriores
 where almacen=p_almacen and codigo=v_code and pdf_hash=p_hash;
 return jsonb_build_object('codigo',v_code,'posterior',true,
   'hash',p_hash,'recibida_en_servidor',v_time);
end $$;
revoke all on function public.verificacion_cargas_registrar_version_posterior(text,text,text,text)
 from public,anon,authenticated;
grant execute on function public.verificacion_cargas_registrar_version_posterior(text,text,text,text)
 to authenticated;
commit;
