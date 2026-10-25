\set ON_ERROR_STOP on
-- Solo en la BD de prueba local del runner; no acceder a datos de Supabase.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select test.assert((select count(*)=0 from public.kontrola_archivo_eventos),'sin eventos de archivo al inicio');
do $$begin
 perform public.kontrola_cambiar_archivo('LP26-10001',true);
 raise exception 'ASSERTION FAILED: no puede archivar carga reciente';
exception when sqlstate '22023' then null;
end$$;
select test.assert((select archivado=false from public.kontrola_cargas where codigo='LP26-10001'),'carga reciente sigue activa');
-- En el entorno de pruebas simular que pasó el plazo; no altera producción.
reset role;
update public.kontrola_cargas set cerrada_en=now()-interval '92 days' where codigo='LP26-10001';
update public.kontrola_incidencias set actualizada_en=now()-interval '92 days' where codigo='LP26-10001';
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select test.assert(public.kontrola_cambiar_archivo('LP26-10001',true),'administrador archiva elegible');
select test.assert((select archivado=true from public.kontrola_cargas where codigo='LP26-10001'),'carga queda archivada');
select test.assert((select count(*)=1 from public.kontrola_listar_archivadas() where codigo='LP26-10001'),'lista muestra archivada');
select test.assert(not public.kontrola_cambiar_archivo('LP26-10001',true),'segundo archivo es idempotente');
select test.assert(public.kontrola_cambiar_archivo('LP26-10001',false),'admin restaura');
select test.assert((select archivado=false from public.kontrola_cargas where codigo='LP26-10001'),'restaurada visible');
select test.assert((select count(*)=2 from public.kontrola_archivo_eventos where codigo='LP26-10001'),'dos eventos de auditoría');
select test.assert((select count(*)=0 from public.kontrola_listar_archivadas() where codigo='LP26-10001'),'restaurada sale del archivo');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$begin
 perform public.kontrola_cambiar_archivo('LP26-10001',true);
 raise exception 'ASSERTION FAILED: operario pudo archivar';
exception when insufficient_privilege then null;
end$$;
do $$begin
 perform * from public.kontrola_listar_archivadas();
 raise exception 'ASSERTION FAILED: operario pudo listar archivadas';
exception when insufficient_privilege then null;
end$$;
reset role;
select 'KONTROLA_ARCHIVE_OK' as result;
