-- KONTROLA: estadísticas por operario, SOLO administración.
-- Migración incremental prevista: NO aplicar a Supabase real sin autorización.
-- La jornada se determina por la fecha de INICIO en Europe/Madrid.
-- Los trabajos abiertos NO computan segundos hasta registrar cierre.
create or replace function public.kontrola_estadisticas_operarios(
 p_almacen text,p_dia date
)
returns table(
 usuario_id uuid,nombre text,preparaciones bigint,verificaciones bigint,
 segundos_preparacion bigint,segundos_verificacion bigint,
 preparaciones_abiertas bigint,verificaciones_abiertas bigint
)
language plpgsql stable security definer set search_path=''
as $$
begin
 if auth.uid() is null or not public.kontrola_es_administrador() then
  raise exception 'Solo administración puede consultar estadísticas por operario' using errcode='42501';
 end if;
 if p_almacen not in ('COR_01_COR','COR_02_NAR') or p_dia is null then
  raise exception 'Almacén o fecha inválidos' using errcode='22023';
 end if;
 return query
 with trabajos as (
  select p.operario_id as actor,p.inicio,p.fin,'preparacion'::text as tipo
  from public.kontrola_preparaciones p
  join public.kontrola_cargas c on c.codigo=p.codigo
  where c.almacen=p_almacen and (p.inicio at time zone 'Europe/Madrid')::date=p_dia
  union all
  select v.verificador_id as actor,v.inicio,v.fin,'verificacion'::text as tipo
  from public.kontrola_verificaciones v
  join public.kontrola_cargas c on c.codigo=v.codigo
  where c.almacen=p_almacen and (v.inicio at time zone 'Europe/Madrid')::date=p_dia
 ), por_usuario as (
  select t.actor,
   count(*) filter(where t.tipo='preparacion')::bigint as preps,
   count(*) filter(where t.tipo='verificacion')::bigint as vers,
   coalesce(sum(greatest(round(extract(epoch from (t.fin-t.inicio)))::bigint,0))
     filter(where t.tipo='preparacion' and t.fin is not null),0)::bigint as prep_sec,
   coalesce(sum(greatest(round(extract(epoch from (t.fin-t.inicio)))::bigint,0))
     filter(where t.tipo='verificacion' and t.fin is not null),0)::bigint as ver_sec,
   count(*) filter(where t.tipo='preparacion' and t.fin is null)::bigint as prep_open,
   count(*) filter(where t.tipo='verificacion' and t.fin is null)::bigint as ver_open
  from trabajos t group by t.actor
 )
 select x.actor,u.nombre::text,x.preps,x.vers,x.prep_sec,x.ver_sec,x.prep_open,x.ver_open
 from por_usuario x
 join public.usuarios_app u on u.id=x.actor
 order by u.nombre,x.actor;
end;
$$;
revoke all on function public.kontrola_estadisticas_operarios(text,date) from public,anon;
grant execute on function public.kontrola_estadisticas_operarios(text,date) to authenticated;
