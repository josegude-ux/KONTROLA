\set ON_ERROR_STOP on
-- Bloque 01: cantidades 2+3 => 4+1, suma idéntica.
-- Ensayo SOLO en PostgreSQL 16 temporal, sin Business Central real.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select * from public.kontrola_reservar_importacion(
 'LP26-96002',repeat('8e63',16),'cantidades-sin-evento.pdf',1200
) \gset ev_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'ev_documento_ruta','00000000-0000-0000-0000-000000000001');
select jsonb_set(
 jsonb_set(
  jsonb_set(
   jsonb_set(test.revision_payload('LP26-96002'),'{productos}',
    '[{"sku":"PRD0000001","description":"Caja A","location":"A101-1","qty":2,"unit":"CAJA"},
      {"sku":"PRD0000002","description":"Caja B","location":"A101-2","qty":3,"unit":"CAJA"}]'::jsonb),
   '{referencias}','2'::jsonb),
  '{declared_total}','5'::jsonb),
 '{actual_total}','5'::jsonb
) as original \gset event_data_
select public.kontrola_completar_importacion(:'ev_id',:'event_data_original'::jsonb,'[]'::jsonb);
select jsonb_set(:'event_data_original'::jsonb,'{productos}',
 '[{"sku":"PRD0000001","description":"Caja A","location":"A101-1","qty":4,"unit":"CAJA","pdfOriginal":{"qty":2}},
   {"sku":"PRD0000002","description":"Caja B","location":"A101-2","qty":1,"unit":"CAJA","pdfOriginal":{"qty":3}}]'::jsonb
) as modified \gset event_data_

-- Si se guardara el cambio sin prueba, otro intento podría alegar que es
-- la cantidad "anterior" y aprobarla. Debe rechazarse ANTES del UPDATE.
do $unlogged$
declare v_refused boolean:=false;
begin
 begin
  perform public.kontrola_corregir_importacion(
   (select id from public.kontrola_importaciones where codigo='LP26-96002'),
   (select jsonb_set(carga_datos,'{productos}',
    '[{"sku":"PRD0000001","description":"Caja A","location":"A101-1","qty":4,"unit":"CAJA","pdfOriginal":{"qty":2}},
      {"sku":"PRD0000002","description":"Caja B","location":"A101-2","qty":1,"unit":"CAJA","pdfOriginal":{"qty":3}}]'::jsonb)
    from public.kontrola_importaciones where codigo='LP26-96002'),
   '[]'::jsonb,'[]'::jsonb,true
  );
 exception when sqlstate '22023' then v_refused:=true;
 end;
 if not v_refused then raise exception 'ASSERTION FAILED: guardó cambios sin evento aunque total idéntico';end if;
end;
$unlogged$;
select test.assert((select carga_datos->'productos'->0->>'qty'='2'
 and carga_datos->'productos'->1->>'qty'='3'
 from public.kontrola_importaciones where id=:'ev_id'),
 'un intento sin evidencia NO altera el borrador almacenado');

-- Una sola corrección BC no puede guardar ambos cambios.
do $partial$
declare v_refused boolean:=false;
begin
 begin
  perform public.kontrola_corregir_importacion(
   (select id from public.kontrola_importaciones where codigo='LP26-96002'),
   (select jsonb_set(carga_datos,'{productos}',
    '[{"sku":"PRD0000001","description":"Caja A","location":"A101-1","qty":4,"unit":"CAJA","pdfOriginal":{"qty":2}},
      {"sku":"PRD0000002","description":"Caja B","location":"A101-2","qty":1,"unit":"CAJA","pdfOriginal":{"qty":3}}]'::jsonb)
    from public.kontrola_importaciones where codigo='LP26-96002'),
   '[]'::jsonb,
   '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T13:00:00Z","justificacion":"Primera línea cotejada con Business Central"}]'::jsonb,
   true
  );
 exception when sqlstate '22023' then v_refused:=true;
 end;
 if not v_refused then raise exception 'ASSERTION FAILED: guardó revisión BC incompleta';end if;
end;
$partial$;
select test.assert((select carga_datos->'productos'->0->>'qty'='2'
 from public.kontrola_importaciones where id=:'ev_id'),
 'rechazo parcial conserva origen para siguientes intentos');

-- No atribuir una revisión a un administrador distinto del de la sesión.
select test.assert(not public.kontrola_cambios_cantidad_trazados(
 :'event_data_modified'::jsonb,:'event_data_original'::jsonb,
 '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"lectura_pdf","by":"00000000-0000-0000-0000-000000000099","at":"2026-10-27T13:00:00Z","justificacion":"Primera línea auditada por administrador ajeno"},
   {"line":2,"field":"qty","before":3,"after":1,"tipo":"lectura_pdf","by":"00000000-0000-0000-0000-000000000099","at":"2026-10-27T13:01:00Z","justificacion":"Segunda línea auditada por administrador ajeno"}]'::jsonb,
 '00000000-0000-0000-0000-000000000001'::uuid
),'no se acepta una identidad arbitraria del autor de la corrección');

-- Dos correcciones de lectura de PDF documentadas por el propio administrador
-- siguen permitidas: no confundirlas con un contraste BC faltante.
select test.assert(public.kontrola_corregir_importacion(
 :'ev_id',:'event_data_modified'::jsonb,'[]'::jsonb,
 '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"lectura_pdf","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T13:00:00Z","justificacion":"PDF verificado: línea 1 tiene realmente cuatro unidades"},
   {"line":2,"field":"qty","before":3,"after":1,"tipo":"lectura_pdf","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T13:01:00Z","justificacion":"PDF verificado: línea 2 tiene realmente una unidad"}]'::jsonb,
 true
)='aprobada','cambios de lectura de PDF con trazabilidad completa siguen permitidos');
select * from public.kontrola_publicar_importacion(:'ev_id') \gset ev_pub_
select test.assert(:'ev_pub_codigo'='LP26-96002','corrección legítima publica con totales compensados');
select test.assert((select revision=1 and productos->0->>'qty'='4'
 and productos->0#>>'{pdfOriginal,qty}'='2'
 and productos->1->>'qty'='1'
 and productos->1#>>'{pdfOriginal,qty}'='3'
 from public.kontrola_cargas where codigo='LP26-96002'),
 'originales y cantidades corregidas permanecen tras publicación');
reset role;
select 'KONTROLA_B01_CANTIDAD_EVENTO_INTEGRIDAD_OK' as result;
