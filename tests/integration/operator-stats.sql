\set ON_ERROR_STOP on
-- Pruebas en PostgreSQL temporal, tras workflow.sql y revisions.sql.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

select test.assert((
 select count(*)>0 from public.kontrola_estadisticas_operarios('COR_01_COR',(
  select (p.inicio at time zone 'Europe/Madrid')::date
  from public.kontrola_preparaciones p where p.codigo='LP26-10001'
 ))
),'administración debe poder consultar preparación de Coruña');

select test.assert((
 select count(*)>0 from public.kontrola_estadisticas_operarios('COR_02_NAR',(
  select (p.inicio at time zone 'Europe/Madrid')::date
  from public.kontrola_preparaciones p where p.codigo='LP26-20001'
 ))
),'administración debe consultar Ferrol sin mezclar Coruña');

select test.assert((
 select count(*)=0 from public.kontrola_estadisticas_operarios('COR_01_COR','2020-01-01')
),'la fecha sin actividad devuelve resultados vacíos');

select test.assert((
 select count(*)=0 from public.kontrola_estadisticas_operarios('COR_01_COR',(
  select (p.inicio at time zone 'Europe/Madrid')::date
  from public.kontrola_preparaciones p where p.codigo='LP26-10001'
 )) where segundos_preparacion<0 or segundos_verificacion<0
),'no deben existir duraciones negativas');

do $$
begin
 perform * from public.kontrola_estadisticas_operarios('OTRO_ALMACEN','2026-10-25');
 raise exception 'ASSERTION FAILED: almacén inválido aceptado';
exception when sqlstate '22023' then null;
end$$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$
begin
 perform * from public.kontrola_estadisticas_operarios('COR_01_COR','2026-10-25');
 raise exception 'ASSERTION FAILED: operario consultó estadísticas nominales';
exception when insufficient_privilege then null;
end$$;

reset role;
select 'KONTROLA_OPERATOR_STATS_OK' as result;
