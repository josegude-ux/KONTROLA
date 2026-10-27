\set ON_ERROR_STOP on
-- SOLO AUDITORÍA de propuesta SQL de PR #69 en base efímera.
-- Muestra que una única corrección BC puede cubrir una segunda línea no auditada.
reset role;
select test.assert(
 not public.kontrola_total_bc_documentado(
  '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
  '[]'::jsonb
 ),
 'Sin correcciones el predicado nunca justifica total BC'
);
select test.assert(
 public.kontrola_total_bc_documentado(
  '{"productos":[{"qty":4,"pdfOriginal":{"qty":2}},{"qty":9,"pdfOriginal":{"qty":3}}]}'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"BC contrastado manualmente cuatro cajas en primera línea"}]'::jsonb
 ),
 'HALLAZGO: función original acepta la primera corrección sin exigir evidencia de la segunda cantidad'
);
select 'KONTROLA_B01_ADVERSARIAL_FINDING_UNAUDITED_QUANTITY' as result;
