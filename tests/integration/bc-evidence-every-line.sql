\set ON_ERROR_STOP on
-- Bloque 01 · Prueba regresión de evidencia BC por cada línea, PostgreSQL efímero.
reset role;

select test.assert(
 not public.kontrola_total_bc_documentado(
  '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
  '[{"line":1,"field":"qty","after":4,"tipo":"dato_pdf_bc","by":"admin","at":"2026-10-27T10:00:00Z","justificacion":"Solo está auditada primera línea"}]'::jsonb
 ),'una corrección no puede cubrir otra línea de cantidad cambiada'
);

select test.assert(
 public.kontrola_total_bc_documentado(
  '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
  '[{"line":1,"field":"qty","after":4,"tipo":"dato_pdf_bc","by":"admin","at":"2026-10-27T10:00:00Z","justificacion":"Justificación detallada primera línea"},
    {"line":2,"field":"qty","after":9,"tipo":"dato_pdf_bc","by":"admin","at":"2026-10-27T10:01:00Z","justificacion":"Justificación detallada segunda línea"}]'::jsonb
 ),'dos cantidades corregidas requieren dos evidencias de línea distintas'
);

select test.assert(not public.kontrola_total_bc_documentado(
 '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
 '[{"line":1,"field":"qty","after":4,"tipo":"dato_pdf_bc","by":"admin","at":"2026-10-27T10:00:00Z","justificacion":"Primera línea correctamente justificada"},
   {"line":2,"field":"qty","after":8,"tipo":"dato_pdf_bc","by":"admin","at":"2026-10-27T10:01:00Z","justificacion":"Cantidad final no coincide con prueba"}]'::jsonb
),'evidencia BC con cantidad final incorrecta no justifica línea');

select test.assert(public.kontrola_bc_origen_preservado(
 '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
 '{"productos":[{"qty":2},{"qty":3}]}'::jsonb
),'se acepta conservar ambos valores PDF originales');
select test.assert(not public.kontrola_bc_origen_preservado(
 '{"productos":[{"qty":4,"pdfOriginal":{"qty":99}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
 '{"productos":[{"qty":2},{"qty":3}]}'::jsonb
),'el cliente no puede inventar un valor original diferente del guardado');
select test.assert(not public.kontrola_bc_origen_preservado(
 '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9}]}'::jsonb,
 '{"productos":[{"qty":2},{"qty":3}]}'::jsonb
),'cantidad cambiada sin preservar pdfOriginal se rechaza');
select test.assert(not public.kontrola_bc_origen_preservado(
 '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
 '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":4}}]}'::jsonb
),'no cambia valor PDF en revisión sucesiva');

-- Camino RPC real con dos líneas ficticias y permisos del administrador.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select * from public.kontrola_reservar_importacion(
 'LP26-95002',repeat('8e12',16),'bc-multiples.pdf',1200
) \gset bc2_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'bc2_documento_ruta','00000000-0000-0000-0000-000000000001');

select jsonb_set(
 jsonb_set(
  jsonb_set(
   jsonb_set(test.revision_payload('LP26-95002'),'{productos}',
   '[{"sku":"PRD0000001","description":"Caja 1","location":"A101-1","qty":2,"unit":"CAJA"},
     {"sku":"PRD0000002","description":"Caja 2","location":"A101-2","qty":3,"unit":"CAJA"}]'::jsonb),
   '{referencias}','2'::jsonb),
  '{declared_total}','5'::jsonb),
 '{actual_total}','5'::jsonb
) as initial \gset payload_

select public.kontrola_completar_importacion(:'bc2_id',:'payload_initial'::jsonb,'[]'::jsonb);
select jsonb_set(
 jsonb_set(:'payload_initial'::jsonb,'{actual_total}','13'::jsonb),
 '{productos}',
 '[{"sku":"PRD0000001","description":"Caja 1","location":"A101-1","qty":4,"unit":"CAJA","pdfOriginal":{"qty":2}},
   {"sku":"PRD0000002","description":"Caja 2","location":"A101-2","qty":9,"unit":"CAJA","pdfOriginal":{"qty":3}}]'::jsonb
) as modified \gset payload_

select test.assert(public.kontrola_corregir_importacion(
 :'bc2_id',:'payload_modified'::jsonb,
 '[{"id":"quantity_total_mismatch:document","code":"quantity_total_mismatch","severity":"warning"}]'::jsonb,
 '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"Solo primera línea BC cotejada con PDF original"}]'::jsonb,
 true
)='revision_requerida','queda bloqueada aprobación sin la evidencia de segunda línea');

select test.assert(public.kontrola_corregir_importacion(
 :'bc2_id',:'payload_modified'::jsonb,
 '[{"id":"quantity_total_mismatch:document","code":"quantity_total_mismatch","severity":"warning"}]'::jsonb,
 '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"Primera línea BC cotejada con PDF original"},
   {"line":2,"field":"qty","before":3,"after":9,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:01:00Z","justificacion":"Segunda línea BC cotejada con PDF original"}]'::jsonb,
 true
)='aprobada','dos evidencias BC permiten aprobación');

select * from public.kontrola_publicar_importacion(:'bc2_id') \gset published_
select test.assert(:'published_codigo'='LP26-95002','se publica revisión aprobada');
select test.assert((select revision=1 and productos->0#>>'{pdfOriginal,qty}'='2'
 and productos->1#>>'{pdfOriginal,qty}'='3' from public.kontrola_cargas where codigo='LP26-95002'),
 'carga final conserva los dos originales del PDF');

reset role;
select 'KONTROLA_B01_EVIDENCIA_CADA_LINEA_OK' as result;
