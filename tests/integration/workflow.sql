\set ON_ERROR_STOP on

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

select * from public.kontrola_reservar_importacion(
 'LP26-10001',repeat('a',64),'coruna.pdf',12000
)\gset cor_
select test.assert(:'cor_repetida'='f','la primera importación no debe ser repetida');
insert into storage.objects(bucket_id,name,owner_id) values(
 'kontrola-pdfs',:'cor_documento_ruta','00000000-0000-0000-0000-000000000001'
);
select public.kontrola_completar_importacion(
 :'cor_id',
 '{"codigo":"LP26-10001","fecha":"2026-10-25","matricula":"1111AAA","ruta":"Coruña Norte","repartidor":"Reparto Uno","peso_kg":1200,"referencias":2,"almacen":"COR_01_COR","productos":[{"sku":"PRD0000001","description":"Caja uno","location":"A101-1","qty":2,"unit":"CAJA"},{"sku":"PRD0000002","description":"Caja dos","location":"B101-1","qty":3,"unit":"CAJA"}]}'::jsonb,
 '[]'::jsonb
);
select public.kontrola_corregir_importacion(:'cor_id',
 '{"codigo":"LP26-10001","fecha":"2026-10-25","matricula":"1111AAA","ruta":"Coruña Norte","repartidor":"Reparto Uno","peso_kg":1200,"referencias":2,"almacen":"COR_01_COR","productos":[{"sku":"PRD0000001","description":"Caja uno","location":"A101-1","qty":2,"unit":"CAJA"},{"sku":"PRD0000002","description":"Caja dos","location":"B101-1","qty":3,"unit":"CAJA"}]}'::jsonb,
 '[]'::jsonb,'[]'::jsonb,true
);
select * from public.kontrola_publicar_importacion(:'cor_id');

select * from public.kontrola_reservar_importacion(
 'LP26-20001',repeat('b',64),'ferrol.pdf',13000
)\gset fer_
insert into storage.objects(bucket_id,name,owner_id) values(
 'kontrola-pdfs',:'fer_documento_ruta','00000000-0000-0000-0000-000000000001'
);
select public.kontrola_completar_importacion(
 :'fer_id',
 '{"codigo":"LP26-20001","fecha":"2026-10-25","matricula":"2222BBB","ruta":"Ferrol Centro","repartidor":"Reparto Dos","peso_kg":900,"referencias":2,"almacen":"COR_02_NAR","productos":[{"sku":"PRD0000003","description":"Pack uno","location":"C101-1","qty":4,"unit":"PACK"},{"sku":"PRD0000004","description":"Pack dos","location":"D101-1","qty":5,"unit":"PACK"}]}'::jsonb,
 '[]'::jsonb
);
select public.kontrola_corregir_importacion(:'fer_id',
 '{"codigo":"LP26-20001","fecha":"2026-10-25","matricula":"2222BBB","ruta":"Ferrol Centro","repartidor":"Reparto Dos","peso_kg":900,"referencias":2,"almacen":"COR_02_NAR","productos":[{"sku":"PRD0000003","description":"Pack uno","location":"C101-1","qty":4,"unit":"PACK"},{"sku":"PRD0000004","description":"Pack dos","location":"D101-1","qty":5,"unit":"PACK"}]}'::jsonb,
 '[]'::jsonb,'[]'::jsonb,true
);
select * from public.kontrola_publicar_importacion(:'fer_id');

select test.assert((select count(*)=1 from public.kontrola_panel_cargas('COR_01_COR')),'Coruña debe contener una carga');
select test.assert((select count(*)=1 from public.kontrola_panel_cargas('COR_02_NAR')),'Ferrol debe contener una carga');
select test.assert((select count(*)=0 from public.kontrola_preparaciones),'consultar no debe iniciar relojes');
select test.assert((select count(*)=2 from public.kontrola_carga_revisiones where vigente),'cada carga debe conservar su revisión documental');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select * from public.kontrola_iniciar_preparacion(
 'LP26-10001','10000000-0000-0000-0000-000000000001'
);
select test.assert((select estado='preparacion_en_curso' from public.kontrola_cargas where codigo='LP26-10001'),'la preparación debe quedar activa');
select * from public.kontrola_iniciar_preparacion(
 'LP26-20001','10000000-0000-0000-0000-000000000002'
);
select test.assert((select fin is not null and cierre_motivo='Cambio de carga a LP26-20001' from public.kontrola_preparaciones where codigo='LP26-10001'),'el cambio debe cerrar la preparación anterior');

do $$
begin
 perform * from public.kontrola_iniciar_verificacion('LP26-10001','20000000-0000-0000-0000-000000000001');
 raise exception 'ASSERTION FAILED: el preparador pudo verificar su carga';
exception when insufficient_privilege then null;
end$$;

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select * from public.kontrola_iniciar_verificacion(
 'LP26-10001','20000000-0000-0000-0000-000000000002'
)\gset ver_cor_
select * from public.kontrola_registrar_linea(:'ver_cor_id',1,2);
select * from public.kontrola_registrar_linea(:'ver_cor_id',2,1);
select * from public.kontrola_finalizar_verificacion(:'ver_cor_id');
select test.assert((select estado='cerrada' from public.kontrola_cargas where codigo='LP26-10001'),'la carga Coruña debe cerrarse con incidencia');
select test.assert((select count(*)=1 from public.kontrola_incidencias where codigo='LP26-10001' and estado='pendiente'),'la diferencia debe crear una incidencia');
select test.assert((select count(*)=2 from public.kontrola_verificacion_eventos where verificacion_id=:'ver_cor_id'),'cada cantidad debe dejar evento');

select * from public.kontrola_iniciar_verificacion(
 'LP26-20001','20000000-0000-0000-0000-000000000003'
)\gset ver_fer_
select * from public.kontrola_registrar_linea(:'ver_fer_id',1,4);
select * from public.kontrola_registrar_linea(:'ver_fer_id',2,5);
select * from public.kontrola_finalizar_verificacion(:'ver_fer_id');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select test.assert((select fin is not null and cierre_motivo='Finalización de verificación' from public.kontrola_preparaciones where codigo='LP26-20001'),'verificar debe cerrar la preparación abierta');
select test.assert((select estado='cerrada' from public.kontrola_cargas where codigo='LP26-20001'),'la carga Ferrol debe cerrarse');

select id from public.kontrola_incidencias where codigo='LP26-10001' and estado='pendiente'\gset inc_
select public.kontrola_regularizar_incidencia(:'inc_id');
select test.assert((select estado='regularizada' from public.kontrola_incidencias where id=:'inc_id'),'administración debe confirmar la regularización');
select test.assert((select count(*)>=2 from public.kontrola_incidencia_eventos where incidencia_id=:'inc_id'),'la incidencia debe conservar histórico');
select test.assert((select count(*)=0 from public.kontrola_avisos where entidad_id=:'inc_id' and activo),'el aviso regularizado debe quedar inactivo');
select test.assert((select cerradas=1 from public.kontrola_resumen_zona('COR_01_COR','2026-10-25')),'el resumen de Coruña debe usar datos reales');
select test.assert((select cerradas=1 from public.kontrola_resumen_zona('COR_02_NAR','2026-10-25')),'el resumen de Ferrol debe usar datos reales');

select public.kontrola_configurar_acceso_almacen(
 '00000000-0000-0000-0000-000000000004','COR_02_NAR',true
);
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000004',false);
do $$
begin
 perform * from public.kontrola_panel_cargas('COR_01_COR');
 raise exception 'ASSERTION FAILED: un operario restringido accedió a Coruña';
exception when insufficient_privilege then null;
end$$;
select test.assert((select count(*)=1 from public.kontrola_panel_cargas('COR_02_NAR')),'el permiso configurable debe permitir Ferrol');

reset role;
select 'KONTROLA_INTEGRATION_OK' as result;
