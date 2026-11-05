\set ON_ERROR_STOP on
-- Solo PostgreSQL 16 temporal tras propuesta #72 y guard "neto cero".
-- Ficción: 2+3=5 cajas PDF; 4+1=5 cajas BC, dos líneas modificadas.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select * from public.kontrola_reservar_importacion(
 'LP26-96001',repeat('9e62',16),'bc-neto-cero.pdf',1200
) \gset net_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'net_documento_ruta','00000000-0000-0000-0000-000000000001');

select jsonb_set(
 jsonb_set(
  jsonb_set(
   jsonb_set(test.revision_payload('LP26-96001'),'{productos}',
     '[{"sku":"PRD0000001","description":"Caja A","location":"A101-1","qty":2,"unit":"CAJA"},
       {"sku":"PRD0000002","description":"Caja B","location":"A101-2","qty":3,"unit":"CAJA"}]'::jsonb
   ),'{referencias}','2'::jsonb
  ),'{declared_total}','5'::jsonb
 ),'{actual_total}','5'::jsonb
) as original \gset net_data_
select public.kontrola_completar_importacion(:'net_id',:'net_data_original'::jsonb,'[]'::jsonb);

select jsonb_set(
 :'net_data_original'::jsonb,'{productos}',
 '[{"sku":"PRD0000001","description":"Caja A","location":"A101-1","qty":4,"unit":"CAJA","pdfOriginal":{"qty":2}},
   {"sku":"PRD0000002","description":"Caja B","location":"A101-2","qty":1,"unit":"CAJA","pdfOriginal":{"qty":3}}]'::jsonb
) as corrected \gset net_data_

select test.assert(
 public.kontrola_corregir_importacion(
  :'net_id',:'net_data_corrected'::jsonb,'[]'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T13:00:00Z","justificacion":"Primera línea contrastada manualmente con Business Central"}]'::jsonb,
  true
 )='revision_requerida',
 'no aprobar cambio BC compensado si segunda línea carece de evidencia'
);
select test.assert((select estado='revision_requerida' from public.kontrola_importaciones where id=:'net_id'),
 'una aprobación incompleta permanece en revisión');
do $publication_rejected$
declare v_rejected boolean:=false;
begin
 begin
  perform * from public.kontrola_publicar_importacion(
   (select id from public.kontrola_importaciones where codigo='LP26-96001')
  );
 exception when sqlstate '22023' then v_rejected:=true;
 end;
 if not v_rejected then
  raise exception 'ASSERTION FAILED: se publicó una revisión BC incompleta aunque el total compensase';
 end if;
end;
$publication_rejected$;
select test.assert((select count(*)=0 from public.kontrola_cargas where codigo='LP26-96001'),
 'la primera publicación rechazada no creó carga');

select test.assert(
 public.kontrola_corregir_importacion(
  :'net_id',:'net_data_corrected'::jsonb,'[]'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T13:00:00Z","justificacion":"Primera línea contrastada manualmente con Business Central"},
    {"line":2,"field":"qty","before":3,"after":1,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T13:01:00Z","justificacion":"Segunda línea contrastada manualmente con Business Central"}]'::jsonb,
  true
 )='aprobada',
 'ambas evidencias BC permiten aprobar cambio neto cero'
);
select * from public.kontrola_publicar_importacion(:'net_id') \gset net_pub_
select test.assert(:'net_pub_codigo'='LP26-96001','publicación auditada después de dos evidencias');
select test.assert((select revision=1 and productos->0->>'qty'='4' and productos->1->>'qty'='1'
 and productos->0#>>'{pdfOriginal,qty}'='2' and productos->1#>>'{pdfOriginal,qty}'='3'
 from public.kontrola_cargas where codigo='LP26-96001'),
 'se conservan cantidades BC y las dos cantidades del PDF');
select test.assert((select count(*)=0 from public.kontrola_preparaciones where codigo='LP26-96001'),
 'la publicación no inventa Preparación de VISURA');
select test.assert((select count(*)=0 from public.kontrola_verificaciones where codigo='LP26-96001'),
 'la publicación no inventa Verificación');
reset role;
select 'KONTROLA_B01_NETO_CERO_EVIDENCIA_OK' as result;
