\set ON_ERROR_STOP on
-- SOLO AUDITORÍA de PR #72 en PostgreSQL 16 efímero.
-- La prueba demuestra si una revisión INCOMPLETA puede alterar el baseline
-- y si una segunda corrección BC puede aprobar cantidades sin evidencia.
-- SUCCESS DE ESTA PRUEBA = vulnerabilidad reproducida; NO seguridad aprobada.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

select * from public.kontrola_reservar_importacion(
 'LP26-95003',repeat('b2f4',16),'adversarial-dos-guardados.pdf',1200
) \gset original_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'original_documento_ruta','00000000-0000-0000-0000-000000000001');

select jsonb_set(
 jsonb_set(
  jsonb_set(
   jsonb_set(test.revision_payload('LP26-95003'),'{productos}',
    '[{"sku":"PRD0000001","description":"Caja A","location":"A101-1","qty":2,"unit":"CAJA"},{"sku":"PRD0000002","description":"Caja B","location":"A101-2","qty":3,"unit":"CAJA"}]'::jsonb),
  '{referencias}','2'::jsonb),
  '{actual_total}','5'::jsonb),
 '{declared_total}','5'::jsonb
) as carga \gset first_
select public.kontrola_completar_importacion(
 :'original_id',:'first_carga'::jsonb,'[]'::jsonb
);

-- PRIMER guardado. Deja error global y NO lleva evidencias, pero persiste
-- qty=9 en segunda línea SIN pdfOriginal.qty (el PDF real tenía qty=3).
select jsonb_set(
 jsonb_set(:'first_carga'::jsonb,'{productos}',
  '[{"sku":"PRD0000001","description":"Caja A","location":"A101-1","qty":4,"unit":"CAJA","pdfOriginal":{"qty":2}},{"sku":"PRD0000002","description":"Caja B","location":"A101-2","qty":9,"unit":"CAJA"}]'::jsonb),
 '{actual_total}','13'::jsonb
) as changed \gset second_

select test.assert(
 public.kontrola_corregir_importacion(
  :'original_id',:'second_changed'::jsonb,'[]'::jsonb,'[]'::jsonb,true
 )='revision_requerida',
 'PR72 permite guardar borrador no aprobado cuyo segundo qty ya ha sido modificado sin origen'
);
select test.assert((
 select i.carga_datos->'productos'->1->>'qty'='9'
  and i.carga_datos->'productos'->1#>>'{pdfOriginal,qty}' is null
  and i.estado='revision_requerida'
 from public.kontrola_importaciones i where i.id=:'original_id'
),'la revisión incompleta sustituyó en servidor la segunda cantidad fuente');

-- SEGUNDO guardado. El helper PR72 encuentra BC válida en línea 1; la
-- comparación de origen toma como "previo" el BORRADOR ALTERADO, no PDF real.
select test.assert(
 public.kontrola_corregir_importacion(
  :'original_id',:'second_changed'::jsonb,
  '[{"id":"quantity_total_mismatch:document","code":"quantity_total_mismatch","severity":"warning"}]'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"Business Central acredita cuatro cajas en primera línea"}]'::jsonb,
  true
 )='aprobada',
 'HALLAZGO PR72: una sola evidencia BC aprueba una segunda cantidad sin original'
);
select * from public.kontrola_publicar_importacion(:'original_id') \gset published_
select test.assert(:'published_codigo'='LP26-95003','el defecto llega hasta publicar');

reset role;
select test.assert((
 select c.productos->1->>'qty'='9'
  and c.productos->1#>>'{pdfOriginal,qty}' is null
  and jsonb_array_length(c.correcciones)=1
 from public.kontrola_cargas c where c.codigo='LP26-95003'
),'se publicó una segunda cantidad cambiada sin evidencia ni origen conservado');

select 'KONTROLA_PR72_ADVERSARIAL_FINDING_TWO_STEP_UNAUDITED' as result;
