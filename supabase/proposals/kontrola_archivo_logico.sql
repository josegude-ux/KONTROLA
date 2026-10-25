-- Propuesta para entorno de pruebas. Aplicar tras revisar las RPC de lectura.
alter table public.kontrola_cargas add column if not exists archivado boolean not null default false;
alter table public.kontrola_cargas add column if not exists archivado_en timestamptz;
alter table public.kontrola_cargas add column if not exists archivado_por uuid;
alter table public.kontrola_cargas add column if not exists restaurado_en timestamptz;
alter table public.kontrola_cargas add column if not exists restaurado_por uuid;
create table if not exists public.kontrola_archivo_eventos (
 id bigint generated always as identity primary key,
 codigo text not null references public.kontrola_cargas(codigo),
 almacen text not null,
 accion text not null check (accion in ('archivar','restaurar')),
 actor_id uuid not null,
 ocurrido_en timestamptz not null default now()
);
alter table public.kontrola_archivo_eventos enable row level security;
revoke all on public.kontrola_archivo_eventos from public, anon, authenticated;
create or replace function public.kontrola_cambiar_archivo(p_codigo text,p_archivar boolean)
returns boolean language plpgsql security definer set search_path = '' as $fn$
declare v_user uuid := auth.uid(); v_c public.kontrola_cargas%rowtype;
begin
 if v_user is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración' using errcode='42501';
 end if;
 select * into v_c from public.kontrola_cargas where codigo=p_codigo for update;
 if not found then raise exception 'Carga no disponible' using errcode='42501'; end if;
 if not public.kontrola_puede_almacen(v_c.almacen) then
  raise exception 'Almacén no autorizado' using errcode='42501';
 end if;
 if p_archivar is null then raise exception 'Acción inválida' using errcode='22023'; end if;
 if v_c.archivado=p_archivar then return false; end if;
 if p_archivar then
  if v_c.estado is distinct from 'cerrada' or v_c.cerrada_en is null or v_c.cerrada_en>now()-interval '90 days' or
    exists(select 1 from public.kontrola_incidencias i where i.codigo=p_codigo and i.actualizada_en>now()-interval '90 days') then
   raise exception 'Cierre no acreditado o plazo insuficiente' using errcode='22023';
  end if;
  if not exists(select 1 from public.kontrola_verificaciones v where v.codigo=p_codigo and v.estado='finalizada' and v.fin is not null) or
    exists(select 1 from public.kontrola_verificaciones v where v.codigo=p_codigo and (v.estado is distinct from 'finalizada' or v.fin is null)) or
    not exists(select 1 from public.kontrola_verificacion_lineas l join public.kontrola_verificaciones v on v.id=l.verificacion_id where v.codigo=p_codigo) or
    exists(select 1 from public.kontrola_verificacion_lineas l join public.kontrola_verificaciones v on v.id=l.verificacion_id where v.codigo=p_codigo and l.comprobada_cantidad is null) or
    exists(select 1 from public.kontrola_incidencias i where i.codigo=p_codigo and i.estado='pendiente') or
    exists(select 1 from public.kontrola_preparaciones p where p.codigo=p_codigo and p.fin is null) or
    exists(select 1 from public.kontrola_avisos a where a.entidad_id=p_codigo and a.activo=true) then
    raise exception 'Dependencias o incidencias sin resolver' using errcode='22023';
  end if;
  update public.kontrola_cargas set archivado=true,archivado_en=now(),archivado_por=v_user,actualizado_en=now() where codigo=p_codigo;
 else
  update public.kontrola_cargas set archivado=false,restaurado_en=now(),restaurado_por=v_user,actualizado_en=now() where codigo=p_codigo;
 end if;
 insert into public.kontrola_archivo_eventos(codigo,almacen,accion,actor_id)
 values(p_codigo,v_c.almacen,case when p_archivar then 'archivar' else 'restaurar' end,v_user);
 return true;
end $fn$;
revoke all on function public.kontrola_cambiar_archivo(text,boolean) from public,anon;
grant execute on function public.kontrola_cambiar_archivo(text,boolean) to authenticated;

-- Consulta administrativa de cargas archivadas; respeta el acceso por almacén.
create or replace function public.kontrola_listar_archivadas()
returns table(codigo text, fecha date, almacen text, archivado_en timestamptz, archivado_por uuid, restaurado_en timestamptz, restaurado_por uuid)
language plpgsql security definer set search_path = '' as $fn$
begin
 if auth.uid() is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración' using errcode='42501';
 end if;
 return query select c.codigo,c.fecha,c.almacen,c.archivado_en,c.archivado_por,c.restaurado_en,c.restaurado_por
 from public.kontrola_cargas c where c.archivado=true and public.kontrola_puede_almacen(c.almacen)
 order by c.archivado_en desc nulls last;
end $fn$;
revoke all on function public.kontrola_listar_archivadas() from public,anon;
grant execute on function public.kontrola_listar_archivadas() to authenticated;
