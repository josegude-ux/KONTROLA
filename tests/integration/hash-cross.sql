\set ON_ERROR_STOP on
-- Contrato de hash compartido entre importaciones y provisionales.
-- Solo base kontrola_test en PostgreSQL local o servicio de CI.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

-- Caso 1: hash ya identificado jamás puede reservarse como provisional.
do $$
begin
 perform * from public.kontrola_reservar_provisional_pdf(
  repeat('1',64),'intento-provisional.pdf',1000
 );
 raise exception 'ASSERTION FAILED: documento identificado entró en provisionales';
exception when sqlstate '22023' then null;
end$$;

-- Caso 2: un hash provisional no puede entrar en la reserva normal.
select * from public.kontrola_reservar_provisional_pdf(
 repeat('23ab',16),'sin-identificador.pdf',1200
) \gset cross_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'cross_documento_ruta','00000000-0000-0000-0000-000000000001');
select test.assert(public.kontrola_completar_provisional_pdf(
 :'cross_id','{"id":"sin-identificar","warehouse":null,"products":[]}'::jsonb,
 'Código LP pendiente de contraste con BC'
)='pendiente_identificacion','preparar estado provisional');

do $$
begin
 perform * from public.kontrola_reservar_importacion(
   'LP26-91001',repeat('23ab',16),'otro-nombre.pdf',1200
 );
 raise exception 'ASSERTION FAILED: hash provisional duplicado como importación normal';
exception when sqlstate '22023' then null;
end$$;
select test.assert((select count(*)=0 from public.kontrola_importaciones
 where documento_hash=repeat('23ab',16)),'no duplica reserva normal mientras espera identificación');
select test.assert((select count(*)=1 from public.kontrola_pdf_provisionales
 where documento_hash=repeat('23ab',16) and estado='pendiente_identificacion'),
 'se mantiene el único provisional original');

-- Caso 3: cuando Administración identifica el provisional, el importador ordinario
-- debe resolverlo como la misma importación y no exigir un segundo PDF.
select public.kontrola_identificar_provisional_pdf(
 :'cross_id','LP26-91001','COR_01_COR',
 'Identidad y almacén contrastados manualmente en Business Central',
 test.revision_payload('LP26-91001'),'[]'::jsonb,'[]'::jsonb
) as id \gset promoted_
select * from public.kontrola_reservar_importacion(
 'LP26-91001',repeat('23ab',16),'mismo-contenido-renombrado.pdf',1200
) \gset recognized_
select test.assert(:'recognized_repetida'='t' and :'recognized_id'=:'promoted_id',
 'tras identificar, reservar de nuevo devuelve la misma importación');
select test.assert((select count(*)=1 from public.kontrola_importaciones
 where documento_hash=repeat('23ab',16) and documento_ruta=:'cross_documento_ruta'),
 'la reserva reconocida mantiene el original, sin duplicado físico');
select test.assert((select estado='identificada' and importacion_id=:'promoted_id'
 from public.kontrola_pdf_provisionales where id=:'cross_id'),
 'el provisional enlaza con la revisión sin reabrirse');
select test.assert((select count(*)=0 from public.kontrola_cargas where codigo='LP26-91001'),
 'la deduplicación nunca publica por sí misma');

-- Caso 4: el mismo SHA de carga distinta siempre se rechaza.
do $$
begin
 perform * from public.kontrola_reservar_importacion(
   'LP26-91002',repeat('23ab',16),'identificador-cruzado.pdf',1200
 );
 raise exception 'ASSERTION FAILED: hash reutilizado en otra carga';
exception when sqlstate '22023' then null;
end$$;
select test.assert((select count(*)=0 from public.kontrola_importaciones
 where codigo='LP26-91002'),'no se crea importación de un LP ajeno');
select 'KONTROLA_HASH_CRUZADO_OK' as result;
