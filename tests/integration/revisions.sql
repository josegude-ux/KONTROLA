\set ON_ERROR_STOP on
-- Ejecución en base temporal; datos de prueba, sin información de empresa.
-- Se ejecuta tras workflow.sql para contar con roles y almacenes configurados.
create or replace function test.revision_payload(p_codigo text)
returns jsonb language sql immutable as $$
 select jsonb_build_object(
  'codigo',p_codigo,'fecha','2026-10-25','matricula','PRUEBA',
  'ruta','Ruta de prueba','repartidor','Operario ficticio',
  'peso_kg',10,'referencias',1,'almacen','COR_01_COR',
  'declared_total',2,'actual_total',2,
  'parser_metadata',jsonb_build_object(
    'verified',true,'warnings','[]'::jsonb,'mixed_warehouse',false,
    'available_warehouses',jsonb_build_array('COR_01_COR')),
  'productos',jsonb_build_array(
    jsonb_build_object('sku','PRD0000001','description','Caja prueba','location','A101-1','qty',2,'unit','CAJA'))
 );
$$;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

-- Revisión 1 de una carga no iniciada.
select * from public.kontrola_reservar_importacion(
 'LP26-50001',repeat('1',64),'revision-1.pdf',1000
)\gset rev1_
select test.assert(:'rev1_repetida'='f','primera revisión debe ser nueva');
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'rev1_documento_ruta','00000000-0000-0000-0000-000000000001');
select public.kontrola_completar_importacion(:'rev1_id',test.revision_payload('LP26-50001'),'[]'::jsonb);
select public.kontrola_corregir_importacion(:'rev1_id',test.revision_payload('LP26-50001'),'[]'::jsonb,'[]'::jsonb,true);
select * from public.kontrola_publicar_importacion(:'rev1_id');
select test.assert((select revision=1 from public.kontrola_cargas where codigo='LP26-50001'),'primera publicación debe ser v1');

-- Cambiar el nombre del mismo PDF NO crea una versión nueva.
select * from public.kontrola_reservar_importacion(
 'LP26-50001',repeat('1',64),'renombrado.pdf',1000
)\gset same_
select test.assert(:'same_repetida'='t' and :'same_id'=:'rev1_id','hash idéntico reutiliza la importación');

-- Revisión 2: documento distinto, misma carga, todavía sin preparación.
select * from public.kontrola_reservar_importacion(
 'LP26-50001',repeat('2',64),'revision-2.pdf',1000
)\gset rev2_
select test.assert(:'rev2_repetida'='f','hash nuevo debe crear una importación nueva');
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'rev2_documento_ruta','00000000-0000-0000-0000-000000000001');
select public.kontrola_completar_importacion(:'rev2_id',test.revision_payload('LP26-50001'),'[]'::jsonb);
select public.kontrola_corregir_importacion(:'rev2_id',test.revision_payload('LP26-50001'),'[]'::jsonb,'[]'::jsonb,true);
select * from public.kontrola_publicar_importacion(:'rev2_id');
select test.assert((select revision=2 and documento_hash=repeat('2',64) from public.kontrola_cargas where codigo='LP26-50001'),'el documento vigente es la revisión 2');
select test.assert((select count(*)=2 from public.kontrola_carga_revisiones where codigo='LP26-50001'),'ambas revisiones quedan archivadas');
select test.assert((select count(*)=1 from public.kontrola_carga_revisiones where codigo='LP26-50001' and vigente),'solo una revisión es vigente');
select test.assert((select count(*)=1 from public.kontrola_carga_revisiones where codigo='LP26-50001' and revision=1 and not vigente and documento_hash=repeat('1',64)),'v1 anterior queda conservada como histórica');

-- Un documento histórico NO puede presentarse como la versión activa.
do $$
begin
 perform * from public.kontrola_publicar_importacion(
  (select id from public.kontrola_importaciones where codigo='LP26-50001' and documento_hash=repeat('1',64))
 );
 raise exception 'ASSERTION FAILED: una importación histórica se anunció como vigente';
exception when sqlstate '22023' then null;
end $$;

-- Un PDF con el mismo SHA-256 NO puede asignarse a otra carga.
do $$
begin
 perform * from public.kontrola_reservar_importacion('LP26-50002',repeat('2',64),'otra-carga.pdf',1000);
 raise exception 'ASSERTION FAILED: se permitió reutilizar un PDF para otra carga';
exception when sqlstate '22023' then null;
end $$;
select test.assert((select count(*)=2 from public.kontrola_importaciones where codigo='LP26-50001'),'no hay duplicados en una carga tras importación repetida');
select test.assert((select count(*)=0 from public.kontrola_importaciones where codigo='LP26-50002'),'la importación cruzada no se guarda');

-- Al iniciar preparación la v2 queda protegida, aunque el admin revise una v3.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select * from public.kontrola_iniciar_preparacion('LP26-50001','50000000-0000-0000-0000-000000000002');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select * from public.kontrola_reservar_importacion(
 'LP26-50001',repeat('3',64),'revision-3.pdf',1000
)\gset rev3_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'rev3_documento_ruta','00000000-0000-0000-0000-000000000001');
select public.kontrola_completar_importacion(:'rev3_id',test.revision_payload('LP26-50001'),'[]'::jsonb);
select public.kontrola_corregir_importacion(:'rev3_id',test.revision_payload('LP26-50001'),'[]'::jsonb,'[]'::jsonb,true);
do $$
begin
 perform * from public.kontrola_publicar_importacion(
  (select id from public.kontrola_importaciones where codigo='LP26-50001' and documento_hash=repeat('3',64))
 );
 raise exception 'ASSERTION FAILED: sustituyó un PDF con preparación iniciada';
exception when insufficient_privilege then null;
end $$;
select test.assert((select revision=2 and documento_hash=repeat('2',64) and estado='preparacion_en_curso' from public.kontrola_cargas where codigo='LP26-50001'),'la preparación mantiene versión 2 intacta');
select test.assert((select count(*)=2 from public.kontrola_carga_revisiones where codigo='LP26-50001'),'no se genera revisión 3 antes de la publicación');
select 'KONTROLA_REVISION_OK' as result;
