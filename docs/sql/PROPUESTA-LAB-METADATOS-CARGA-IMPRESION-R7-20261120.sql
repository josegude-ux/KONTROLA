-- VISURA PREPARA · DISEÑO NO APLICADO · LAB 2026-11-20
-- R7: destino de reparto CORUÑA/FERROL y comentario manual (<=120).
-- NO EJECUTAR en Supabase sin validación específica, backup y autorización.
-- Confirmado en lectura del esquema real: kontrola_cargas carece de estos campos.
-- Nunca guardar PDF, observaciones del documento BC ni secretos en esta tabla.
-- Estado de impresión continúa exclusivamente en public.kontrola_impresiones.
-- Antes de activar: resolver disparidad fecha c.fecha / c.publicado_en en RPC existente.

create table if not exists public.kontrola_impresion_meta (
  codigo text primary key references public.kontrola_cargas(codigo) on delete restrict,
  almacen text not null,
  destino text check (destino is null or destino in ('CORUÑA','FERROL')),
  comentario text not null default '' check (char_length(comentario)<=120),
  version bigint not null default 1 check (version>=1),
  actualizado_por uuid not null references auth.users(id),
  actualizado_en timestamptz not null default now()
);
create index if not exists kontrola_impresion_meta_almacen_idx on public.kontrola_impresion_meta(almacen);
alter table public.kontrola_impresion_meta enable row level security;
revoke all on public.kontrola_impresion_meta from anon,authenticated;

create table if not exists public.kontrola_impresion_meta_auditoria (
  id bigint generated always as identity primary key,
  codigo text not null references public.kontrola_cargas(codigo) on delete restrict,
  version bigint not null,
  anterior_destino text,
  nuevo_destino text,
  anterior_comentario text not null default '',
  nuevo_comentario text not null default '',
  usuario_id uuid not null references auth.users(id),
  registrado_en timestamptz not null default now()
);
create index if not exists kontrola_impresion_meta_aud_codigo_idx
  on public.kontrola_impresion_meta_auditoria(codigo,registrado_en desc);
alter table public.kontrola_impresion_meta_auditoria enable row level security;
revoke all on public.kontrola_impresion_meta_auditoria from anon,authenticated;

create or replace function public.kontrola_impresion_meta_leer(
  p_almacen text,p_codigos text[])
returns table(codigo text,destino text,comentario text,version bigint,actualizado_en timestamptz)
language plpgsql stable security definer set search_path=''
as $$
begin
  if (select auth.uid()) is null or not public.kontrola_es_administrador()
    or not public.kontrola_puede_almacen(p_almacen) then
    raise exception 'Sin permisos de impresión' using errcode='42501';
  end if;
  if p_codigos is null or cardinality(p_codigos)<1 or cardinality(p_codigos)>50
    or exists(select 1 from unnest(p_codigos) x where x is null)
    or (select count(distinct x) from unnest(p_codigos) x)<>cardinality(p_codigos) then
    raise exception 'Solicita entre 1 y 50 LP diferentes';
  end if;
  return query select c.codigo,m.destino,coalesce(m.comentario,''),coalesce(m.version,0)::bigint,m.actualizado_en
  from public.kontrola_cargas c
  left join public.kontrola_impresion_meta m on m.codigo=c.codigo and m.almacen=c.almacen
  where c.almacen=p_almacen and c.codigo=any(p_codigos) and c.estado='publicada'
  order by c.codigo;
end;
$$;
revoke all on function public.kontrola_impresion_meta_leer(text,text[]) from public,anon;
grant execute on function public.kontrola_impresion_meta_leer(text,text[]) to authenticated;

create or replace function public.kontrola_impresion_meta_guardar(
  p_almacen text,p_codigo text,p_destino text,p_comentario text,p_version bigint)
returns jsonb language plpgsql volatile security definer set search_path=''
as $$
declare
  v_actual record;v_destino text;v_comentario text;v_version bigint;
begin
  if (select auth.uid()) is null or not public.kontrola_es_administrador()
    or not public.kontrola_puede_almacen(p_almacen) then
    raise exception 'Sin permisos de edición de destinos' using errcode='42501';
  end if;
  if p_codigo is null or p_codigo !~ '^LP[0-9]{2}-[0-9]{4,6}$'
    or p_version is null or p_version<0 then
    raise exception 'Código LP o versión inválidos';
  end if;
  v_destino := nullif(trim(p_destino),'');
  if upper(coalesce(v_destino,'')) in ('CORUNA','CORUÑA') then v_destino:='CORUÑA';
  elsif upper(coalesce(v_destino,''))='FERROL' then v_destino:='FERROL';
  elsif v_destino is not null then raise exception 'Destino no reconocido';
  end if;
  v_comentario := coalesce(trim(p_comentario),'');
  if char_length(v_comentario)>120 or
    v_comentario ~ '[[:cntrl:]]' then raise exception 'Comentario inválido (máximo 120 caracteres)';
  end if;
  -- Se bloquea la LP pública para serializar cambios concurrentes entre ordenadores.
  perform 1 from public.kontrola_cargas c
    where c.codigo=p_codigo and c.almacen=p_almacen and c.estado='publicada'
    for update;
  if not found then raise exception 'LP no publicada o fuera del almacén' using errcode='42501'; end if;
  select m.destino,m.comentario,m.version into v_actual
    from public.kontrola_impresion_meta m where m.codigo=p_codigo and m.almacen=p_almacen for update;
  if not found then
    if p_version<>0 then raise exception 'Conflicto de versión: refresca la LP'; end if;
    insert into public.kontrola_impresion_meta(codigo,almacen,destino,comentario,version,actualizado_por)
      values(p_codigo,p_almacen,v_destino,v_comentario,1,(select auth.uid()));
    v_version:=1;
    insert into public.kontrola_impresion_meta_auditoria(
      codigo,version,anterior_destino,nuevo_destino,anterior_comentario,nuevo_comentario,usuario_id)
      values(p_codigo,1,null,v_destino,'',v_comentario,(select auth.uid()));
  else
    if v_actual.version<>p_version then
      raise exception 'Conflicto de versión: otro equipo ha cambiado la LP';
    end if;
    if v_actual.destino is not distinct from v_destino
      and v_actual.comentario=v_comentario then
      return jsonb_build_object('codigo',p_codigo,'destino',v_actual.destino,
        'comentario',v_actual.comentario,'version',v_actual.version,'sin_cambios',true);
    end if;
    v_version:=v_actual.version+1;
    update public.kontrola_impresion_meta
      set destino=v_destino,comentario=v_comentario,version=v_version,
          actualizado_por=(select auth.uid()),actualizado_en=now()
      where codigo=p_codigo and almacen=p_almacen;
    insert into public.kontrola_impresion_meta_auditoria(
      codigo,version,anterior_destino,nuevo_destino,anterior_comentario,nuevo_comentario,usuario_id)
      values(p_codigo,v_version,v_actual.destino,v_destino,v_actual.comentario,v_comentario,(select auth.uid()));
  end if;
  return jsonb_build_object('codigo',p_codigo,'destino',v_destino,
    'comentario',v_comentario,'version',v_version,'sin_cambios',false);
end;
$$;
revoke all on function public.kontrola_impresion_meta_guardar(text,text,text,text,bigint) from public,anon;
grant execute on function public.kontrola_impresion_meta_guardar(text,text,text,text,bigint) to authenticated;

-- Falta validar la ampliación del contrato de TOTAL de mercancía verificado y
-- el tratamiento de observaciones originales del PDF, por hash de documento.
-- No insertar TOTAL o advertencias calculadas desde clientes sin validación del BC.
