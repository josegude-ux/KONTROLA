\set ON_ERROR_STOP on
-- Contrato B01, SOLO PostgreSQL temporal, después de migrations/workflow/revisions.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

select * from public.kontrola_reservar_provisional_pdf(
 repeat('4f36',16),'sin-codigo-confirmado.pdf',2000
) \gset prov_
select test.assert(:'prov_repetida'='f','primer provisional debe reservarse');
select test.assert(:'prov_documento_ruta'='provisionales/'||repeat('4f36',16)||'.pdf','ruta identificada solo por hash');
select test.assert((select count(*)=0 from public.kontrola_importaciones where documento_hash=repeat('4f36',16)),'no crear importación con LP inventado');
select test.assert((select count(*)=0 from public.kontrola_cargas where documento_hash=repeat('4f36',16)),'un provisional no es carga publicada');

-- No puede completarse hasta conservar realmente el original en Storage.
do $$
begin
 perform public.kontrola_completar_provisional_pdf(
  (select p.id from public.kontrola_pdf_provisionales p where p.documento_hash=repeat('4f36',16)),
  '{}'::jsonb,'Código LP no legible'
 );
 raise exception 'ASSERTION FAILED: se completó provisional sin original';
exception when sqlstate '22023' then null;
end$$;

insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'prov_documento_ruta','00000000-0000-0000-0000-000000000001');
select test.assert(public.kontrola_completar_provisional_pdf(
 :'prov_id','{"id":"sin-identificar","warehouse":null,"products":[]}'::jsonb,
 'Código LP no verificado en PDF'
)='pendiente_identificacion','original protegido queda pendiente de identificación');
select test.assert((select estado='pendiente_identificacion' and creado_por=auth.uid()
 from public.kontrola_pdf_provisionales where id=:'prov_id'),'estado y autor se preservan');

select * from public.kontrola_reservar_provisional_pdf(
 repeat('4f36',16),'renombrado.pdf',2000
) \gset again_
select test.assert(:'again_repetida'='t' and :'again_id'=:'prov_id','el mismo contenido reutiliza el provisional');
select test.assert((select count(*)=1 from public.kontrola_pdf_provisionales where documento_hash=repeat('4f36',16)),'no duplicar el borrador');

-- Un operario no ve metadatos ni descarga el PDF provisional.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select test.assert((select count(*)=0 from public.kontrola_pdf_provisionales),'un operario no puede leer provisionales');
select test.assert((select count(*)=0 from storage.objects
 where bucket_id='kontrola-pdfs' and name=:'prov_documento_ruta'),'un operario no puede consultar el original');
do $$
begin
 perform * from public.kontrola_reservar_provisional_pdf(
   repeat('e',64),'operario.pdf',2000
 );
 raise exception 'ASSERTION FAILED: operario reservó PDF provisional';
exception when insufficient_privilege then null;
end$$;
select 'KONTROLA_PROVISIONALES_OK' as result;
