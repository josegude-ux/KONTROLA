\set ON_ERROR_STOP on
-- Totales PDF y BC divergentes: SOLO PostgreSQL efímero, registros ficticios.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

select * from public.kontrola_reservar_importacion(
 'LP26-93001',repeat('9f34',16),'total-original.pdf',1200
) \gset bc_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'bc_documento_ruta','00000000-0000-0000-0000-000000000001');
select public.kontrola_completar_importacion(
 :'bc_id',test.revision_payload('LP26-93001'),'[]'::jsonb
);
select jsonb_set(
 jsonb_set(test.revision_payload('LP26-93001'),'{actual_total}','4'::jsonb),
 '{productos,0}',
 '{"sku":"PRD0000001","description":"Caja prueba","location":"A101-1","qty":4,"unit":"CAJA","pdfOriginal":{"qty":2}}'::jsonb
) as payload \gset bcdata_

-- Una cantidad diferente sin evidencia real NO habilita publicación.
select test.assert(public.kontrola_corregir_importacion(
 :'bc_id',:'bcdata_payload'::jsonb,
 '[{"id":"quantity_total_mismatch:document","code":"quantity_total_mismatch","severity":"warning"}]'::jsonb,
 '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"corto"}]'::jsonb,
 true
)='revision_requerida','no aprobar BC sin prueba suficiente');
select test.assert((select estado='revision_requerida' from public.kontrola_importaciones where id=:'bc_id'),
 'la importación sin evidencia permanece en revisión');

-- Contraste manual de BC con justificación suficiente; total PDF intacto.
select test.assert(public.kontrola_corregir_importacion(
 :'bc_id',:'bcdata_payload'::jsonb,
 '[{"id":"quantity_total_mismatch:document","code":"quantity_total_mismatch","severity":"warning"}]'::jsonb,
 '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:05:00Z","justificacion":"Business Central confirma cuatro cajas de PRD0000001; el PDF original declaraba dos"}]'::jsonb,
 true
)='aprobada','la evidencia BC válida permite revisión administrativa aprobada');

-- Ni el PDF ni su total original pueden maquillarse para eludir el contraste.
do $$
begin
 perform public.kontrola_corregir_importacion(
  (select id from public.kontrola_importaciones where codigo='LP26-93001'),
  jsonb_set(
   jsonb_set(
    jsonb_set(test.revision_payload('LP26-93001'),'{actual_total}','4'::jsonb),
    '{declared_total}','4'::jsonb
   ),'{productos,0}',
   '{"sku":"PRD0000001","description":"Caja prueba","location":"A101-1","qty":4,"unit":"CAJA","pdfOriginal":{"qty":2}}'::jsonb
  ),
  '[{"id":"quantity_total_mismatch:document","code":"quantity_total_mismatch","severity":"warning"}]'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:05:00Z","justificacion":"Business Central confirma cuatro cajas de PRD0000001; el PDF original declaraba dos"}]'::jsonb,
  true
 );
 raise exception 'ASSERTION FAILED: sustituyó el total impreso';
exception when sqlstate '22023' then null;
end$$;

select * from public.kontrola_publicar_importacion(:'bc_id') \gset published_
select test.assert(:'published_codigo'='LP26-93001','se publica solo la carga administrativamente revisada');
select test.assert((
 select c.productos->0->>'qty'='4'
   and c.productos->0#>>'{pdfOriginal,qty}'='2'
   and c.documento_hash=repeat('9f34',16)
   and c.revision=1
 from public.kontrola_cargas c where c.codigo='LP26-93001'
),'la cantidad operativa BC y el valor original se conservan en la carga');
select test.assert((
 select r.carga_datos->>'declared_total'='2'
   and r.carga_datos->>'actual_total'='4'
   and r.correcciones->0->>'tipo'='dato_pdf_bc'
 from public.kontrola_carga_revisiones r where r.codigo='LP26-93001'
),'los dos totales y el motivo quedan archivados en la revisión');
select test.assert((select count(*)=0 from public.kontrola_preparaciones where codigo='LP26-93001'),
 'publicar no inicia preparación ni inventa picking BC');
select test.assert((select count(*)=0 from public.kontrola_verificaciones where codigo='LP26-93001'),
 'publicar no inicia verificación ni hace recuentos físicos');
select 'KONTROLA_TOTAL_BC_AUDITADO_OK' as result;
