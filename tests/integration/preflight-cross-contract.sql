\set ON_ERROR_STOP on
-- Integración de CONTRATOS en PostgreSQL EFÍMERO exclusivamente.
-- Supone ya instaladas (solo en DB de pruebas) propuestas documental y paralela,
-- obtenidas como blobs de commits fijados. Nunca ejecutar en Supabase.
reset role;
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

-- 1. Publicar una carga revisada, respetando el PDF original distinto del total BC.
select * from public.kontrola_reservar_importacion(
  'LP26-94001',repeat('4f12',16),'test-cruce-original.pdf',1200
) \gset cruz1_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'cruz1_documento_ruta','00000000-0000-0000-0000-000000000001');
select public.kontrola_completar_importacion(
 :'cruz1_id',test.revision_payload('LP26-94001'),'[]'::jsonb
);
select jsonb_set(
  jsonb_set(test.revision_payload('LP26-94001'),'{actual_total}','4'::jsonb),
  '{productos,0}',
  '{"sku":"PRD0000001","description":"Caja prueba","location":"A101-1","qty":4,"unit":"CAJA","pdfOriginal":{"qty":2}}'::jsonb
) as carga \gset bc_
select test.assert(
 public.kontrola_corregir_importacion(
  :'cruz1_id',:'bc_carga'::jsonb,
  '[{"id":"quantity_total_mismatch:document","code":"quantity_total_mismatch","severity":"warning"}]'::jsonb,
  '[{"line":1,"field":"qty","before":2,"after":4,"tipo":"dato_pdf_bc","by":"00000000-0000-0000-0000-000000000001","at":"2026-10-27T10:00:00Z","justificacion":"Comprobación manual Business Central: cuatro cajas, PDF original dos"}]'::jsonb,
  true
 )='aprobada',
 'corrección con evidencia documental conservada'
);
select * from public.kontrola_publicar_importacion(:'cruz1_id') \gset result_
select test.assert(:'result_codigo'='LP26-94001','revisión inicial publicada');
select test.assert((
 select revision=1
  and documento_hash=repeat('4f12',16)
  and productos->0->>'qty'='4'
  and productos->0#>>'{pdfOriginal,qty}'='2'
 from public.kontrola_cargas where codigo='LP26-94001'
), 'PDF de origen no se sustituye por total BC');
select test.assert((
 select r.carga_datos->>'declared_total'='2'
  and r.carga_datos->>'actual_total'='4'
 from public.kontrola_carga_revisiones r where codigo='LP26-94001'
), 'revisión almacena el par de totales original y BC');

-- 2. La Verificación empieza por sí sola, antes de registrar Preparación.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select * from public.kontrola_iniciar_verificacion(
 'LP26-94001','94000000-0000-0000-0000-000000000001'
) \gset verified_
select test.assert(:'verified_estado'='en_curso','Verificación autónoma comienza sobre carga BC corregida');
select test.assert((select count(*)=0 from public.kontrola_preparaciones where codigo='LP26-94001'),
 'no se inventa una Preparación al comenzar Verificación');
select test.assert((select count(*)=1 from public.kontrola_verificaciones where codigo='LP26-94001'),
 'exactamente una sesión de Verificación');

-- 3. Otro usuario puede empezar Preparación SIN cancelar la Verificación.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select * from public.kontrola_iniciar_preparacion(
 'LP26-94001','94000000-0000-0000-0000-000000000002'
) \gset prepared_
select test.assert((select count(*)=1 from public.kontrola_preparaciones
 where codigo='LP26-94001' and fin is null),
 'Preparación independiente se mantiene abierta');
-- La RLS del preparador prohíbe consultar la Verificación de otra persona.
-- Validar la integridad del estado como rol de diagnóstico SOLO en esta BD.
reset role;
select test.assert((select count(*)=1 from public.kontrola_verificaciones
 where codigo='LP26-94001' and fin is null),
 'iniciar Preparación no corta la Verificación activa');

-- 4. Administración puede registrar propuesta, NO sustituir la revisión vigente.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select * from public.kontrola_reservar_importacion(
 'LP26-94001',repeat('5f12',16),'test-cruce-nueva-version.pdf',1200
) \gset cruz2_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'cruz2_documento_ruta','00000000-0000-0000-0000-000000000001');
select public.kontrola_completar_importacion(
 :'cruz2_id',test.revision_payload('LP26-94001'),'[]'::jsonb
);
select test.assert(public.kontrola_corregir_importacion(
 :'cruz2_id',test.revision_payload('LP26-94001'),'[]'::jsonb,'[]'::jsonb,true
)='aprobada','borrador de nueva revisión admisible sin publicar');

do $$
declare refused boolean:=false;
begin
 begin
  perform * from public.kontrola_publicar_importacion(
   (select id from public.kontrola_importaciones
    where codigo='LP26-94001' and documento_hash=repeat('5f12',16))
  );
 exception when insufficient_privilege then refused:=true;
 end;
 if not refused then
  raise exception 'ASSERTION FAILED: publicación sustituye una carga con trabajos paralelos abiertos';
 end if;
end$$;

select test.assert((
 select revision=1 and documento_hash=repeat('4f12',16)
  and productos->0->>'qty'='4'
 from public.kontrola_cargas where codigo='LP26-94001'
), 'la carga operativa sigue íntegra tras el rechazo');
select test.assert((select count(*)=1 from public.kontrola_carga_revisiones
 where codigo='LP26-94001'), 'no se agrega revisión material indebida');
-- Estado de dos sesiones de propietarios distintos: prueba de integridad como postgres.
reset role;
select test.assert((select count(*)=1 from public.kontrola_preparaciones
 where codigo='LP26-94001' and fin is null),'Preparación mantiene su sesión');
select test.assert((select count(*)=1 from public.kontrola_verificaciones
 where codigo='LP26-94001' and fin is null),'Verificación mantiene su sesión');
select test.assert((select count(*)=1 from public.kontrola_actividad
 where codigo='LP26-94001' and tipo='verificacion_iniciada'),
 'no se duplicó evento de Verificación al rechazar publicación');

-- 5. Cierre independiente por operarios reales simulados con cuenta individual.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select * from public.kontrola_registrar_linea(:'verified_id',1,4);
select * from public.kontrola_finalizar_verificacion(:'verified_id');
reset role;
select test.assert((select fin is null from public.kontrola_preparaciones where codigo='LP26-94001'),
 'cerrar Verificación no cierra la Preparación de otro usuario');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.kontrola_finalizar_preparacion('LP26-94001');
select test.assert((select estado='cerrada' and revision=1
 from public.kontrola_cargas where codigo='LP26-94001'),
 'ambas tareas finalizan sin perder la revisión original');


-- 6. Caso adverso: existe SOLO Verificación iniciada realmente por RPC;
-- no hay Preparación VISURA que pudiera activar accidentalmente el guard.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select * from public.kontrola_reservar_importacion(
 'LP26-94002',repeat('6f12',16),'solo-verificacion-original.pdf',1200
) \gset solo_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'solo_documento_ruta','00000000-0000-0000-0000-000000000001');
select public.kontrola_completar_importacion(
 :'solo_id',test.revision_payload('LP26-94002'),'[]'::jsonb
);
select test.assert(public.kontrola_corregir_importacion(
 :'solo_id',test.revision_payload('LP26-94002'),'[]'::jsonb,'[]'::jsonb,true
)='aprobada','carga de verificación exclusiva aprobada');
select * from public.kontrola_publicar_importacion(:'solo_id') \gset published_solo_
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select * from public.kontrola_iniciar_verificacion(
 'LP26-94002','94000000-0000-0000-0000-000000000003'
) \gset ver_solo_
reset role;
select test.assert((select count(*)=0 from public.kontrola_preparaciones
 where codigo='LP26-94002'),'sin Preparación al iniciar Verificación exclusiva');
select test.assert((select count(*)=1 from public.kontrola_verificaciones
 where codigo='LP26-94002' and fin is null),'Verificación exclusiva realmente activa');
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select * from public.kontrola_reservar_importacion(
 'LP26-94002',repeat('7f12',16),'solo-verificacion-revision.pdf',1200
) \gset solo2_
insert into storage.objects(bucket_id,name,owner_id)
 values('kontrola-pdfs',:'solo2_documento_ruta','00000000-0000-0000-0000-000000000001');
select public.kontrola_completar_importacion(
 :'solo2_id',test.revision_payload('LP26-94002'),'[]'::jsonb
);
select test.assert(public.kontrola_corregir_importacion(
 :'solo2_id',test.revision_payload('LP26-94002'),'[]'::jsonb,'[]'::jsonb,true
)='aprobada','revisión de propuesta no sustituye original por sí misma');
do $exclusive_guard$
declare blocked boolean:=false;
begin
 begin
  perform * from public.kontrola_publicar_importacion(
   (select id from public.kontrola_importaciones
    where codigo='LP26-94002' and documento_hash=repeat('7f12',16))
  );
 exception when insufficient_privilege then blocked:=true;
 end;
 if not blocked then
  raise exception 'ASSERTION FAILED: Verificación sin Preparación no protegió publicación';
 end if;
end$exclusive_guard$;
reset role;
select test.assert((select revision=1 and documento_hash=repeat('6f12',16)
 from public.kontrola_cargas where codigo='LP26-94002'),
 'no sustituyó PDF vigente aunque Preparación nunca se inició');
select test.assert((select count(*)=0 from public.kontrola_preparaciones
 where codigo='LP26-94002'),'bloqueo independiente de Preparación inexistente');
select test.assert((select count(*)=1 from public.kontrola_carga_revisiones
 where codigo='LP26-94002'),'no creó revisión material después del bloqueo');

reset role;
select 'KONTROLA_B01_CROSS_CONTRACT_OK' as result;
