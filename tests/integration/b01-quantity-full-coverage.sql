\set ON_ERROR_STOP on
-- VISURA B01: solo base PostgreSQL ficticia creada por CI, nunca Supabase real.
reset role;
select test.assert(
 not public.kontrola_total_bc_documentado(
  '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"BC acredita cuatro cajas en primera línea del documento"}]'::jsonb
 ),'una corrección BC NO justifica otra línea sin evidencia');

select test.assert(
 public.kontrola_total_bc_documentado(
  '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"BC acredita cuatro cajas en primera línea del documento"},{"line":2,"field":"qty","before":3,"after":9,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:10:00Z","justificacion":"BC acredita nueve cajas en segunda línea del documento"}]'::jsonb
 ),'dos líneas diferentes con evidencia individual pueden aceptarse');

select test.assert(
 public.kontrola_total_bc_documentado(
  '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"BC acredita cuatro cajas en primera línea del documento"},{"line":2,"field":"qty","before":3,"after":9,"tipo":"lectura_pdf","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:11:00Z","justificacion":"Relectura contrastada con BC: nueve cajas realmente impresas"}]'::jsonb
 ),'una corrección BC y otra de lectura justificadas pueden coexistir');

select test.assert(
 not public.kontrola_total_bc_documentado(
  '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"BC acredita cuatro cajas en primera línea del documento"},{"line":2,"field":"qty","before":3,"after":8,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:10:00Z","justificacion":"Evidencia antigua ya no coincide con la cantidad final"}]'::jsonb
 ),'evidencia de cantidad anterior NO justifica cantidad final distinta');

select test.assert(
 not public.kontrola_total_bc_documentado(
  '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}}]}'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"breve"}]'::jsonb
 ),'justificación demasiado breve no habilita publicación');

select test.assert(
 not public.kontrola_total_bc_documentado(
  '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}}]}'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"Falta motivo tipo dado el registro de auditoría"}]'::jsonb
 ),'corrección sin tipo de origen está prohibida');
select test.assert(
 not public.kontrola_total_bc_documentado(
  '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}}]}'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","at":"2026-10-27T10:00:00Z","justificacion":"Falta responsable identificado de esta corrección"}]'::jsonb
 ),'corrección sin actor no habilita total BC');

-- Prueba de RPC con datos sintéticos y dos líneas. La revisión queda
-- pendiente si solo una línea lleva evidencia, después puede aprobarse
-- cuando el segundo cambio está igualmente documentado.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select * from public.kontrola_reservar_importacion(
 'LP26-95001',repeat('a2f4',16),'prueba-dos-lineas.pdf',1200
) \gset import_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'import_documento_ruta','00000000-0000-0000-0000-000000000001');

select jsonb_set(
 jsonb_set(
  jsonb_set(test.revision_payload('LP26-95001'),
  '{productos}',
  '[{"sku":"PRD0000001","description":"Caja 1","location":"A101-1","qty":2,"unit":"CAJA"},{"sku":"PRD0000002","description":"Caja 2","location":"A101-2","qty":3,"unit":"CAJA"}]'::jsonb),
  '{referencias}','2'::jsonb),
 '{declared_total}','5'::jsonb
) as original \gset original_

select jsonb_set(
 jsonb_set(
  :'original_original'::jsonb,
  '{productos}',
  '[{"sku":"PRD0000001","description":"Caja 1","location":"A101-1","qty":4,"unit":"CAJA","pdfOriginal":{"qty":2}},{"sku":"PRD0000002","description":"Caja 2","location":"A101-2","qty":9,"unit":"CAJA","pdfOriginal":{"qty":3}}]'::jsonb
 ),'{actual_total}','13'::jsonb
) as changed \gset revised_

select public.kontrola_completar_importacion(
 :'import_id',:'original_original'::jsonb,'[]'::jsonb
);
select test.assert(
 public.kontrola_corregir_importacion(
 :'import_id',:'revised_changed'::jsonb,
 '[{"id":"quantity_total_mismatch:document","code":"quantity_total_mismatch","severity":"warning"}]'::jsonb,
 '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"BC acredita cuatro cajas de la primera línea"}]'::jsonb,
 true)='revision_requerida',
 'RPC de corregir conserva revisión pendiente hasta auditar segunda línea'
);
select test.assert(
 public.kontrola_corregir_importacion(
 :'import_id',:'revised_changed'::jsonb,
 '[{"id":"quantity_total_mismatch:document","code":"quantity_total_mismatch","severity":"warning"}]'::jsonb,
 '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"BC acredita cuatro cajas de la primera línea"},{"line":2,"field":"qty","before":3,"after":9,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:05:00Z","justificacion":"BC acredita nueve cajas de la segunda línea"}]'::jsonb,
 true)='aprobada',
 'RPC solo aprueba tras evidencia BC individual para las dos líneas'
);
select * from public.kontrola_publicar_importacion(:'import_id') \gset published_
select test.assert(:'published_codigo'='LP26-95001','publicación tras todas las evidencias');
reset role;
select test.assert((
 select c.revision=1 and c.productos->0->>'qty'='4'
  and c.productos->1->>'qty'='9'
  and c.productos->0#>>'{pdfOriginal,qty}'='2'
  and c.productos->1#>>'{pdfOriginal,qty}'='3'
 from public.kontrola_cargas c where c.codigo='LP26-95001'
),'la carga conserva ambas cantidades originales sin falsa preparación');
select test.assert((select count(*)=0 from public.kontrola_preparaciones
 where codigo='LP26-95001'),'publicar no inicia picking ni Preparación');
select test.assert((select count(*)=0 from public.kontrola_verificaciones
 where codigo='LP26-95001'),'publicar no inicia Verificación');
select 'KONTROLA_B01_CANTIDADES_TODAS_AUDITADAS_OK' as result;
