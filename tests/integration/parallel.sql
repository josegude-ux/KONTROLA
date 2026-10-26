\set ON_ERROR_STOP on

-- Ejecutar EXCLUSIVAMENTE en la base temporal kontrola_test, después de aplicar
-- supabase/proposals/kontrola_prepara_verificacion_paralelas.sql.
-- Datos ficticios y usuarios de bootstrap.sql; no toca el proyecto Supabase conectado.
reset role;
insert into public.kontrola_cargas(codigo,productos,documento_ruta,documento_hash,publicado_por,almacen,estado)
values
('LP26-70001','[{"sku":"PRD0000701","description":"Palé paralelo","location":"A101-1","qty":2,"unit":"CAJA"}]',
'documentos/LP26-70001/eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee.pdf',
repeat('e',64),'00000000-0000-0000-0000-000000000001','COR_01_COR','publicada'),
('LP26-70002','[{"sku":"PRD0000702","description":"Palé sin preparación VISURA","location":"A101-2","qty":1,"unit":"CAJA"}]',
'documentos/LP26-70002/abababababababababababababababababababababababababababababababab.pdf',
repeat('a',64),'00000000-0000-0000-0000-000000000001','COR_01_COR','publicada'),
('LP26-70003','[{"sku":"PRD0000703","description":"Palé preparación previa","location":"A101-3","qty":1,"unit":"CAJA"}]',
'documentos/LP26-70003/'||repeat('b',64)||'.pdf',
repeat('b',64),'00000000-0000-0000-0000-000000000001','COR_01_COR','publicada');

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select test.assert(
 (select count(*)=1 from public.kontrola_panel_cargas('COR_01_COR') where codigo='LP26-70001' and preparador_id is null),
 'carga publicada disponible para verificación desde el inicio sin preparador de VISURA');
select * from public.kontrola_iniciar_verificacion('LP26-70001','70000000-0000-0000-0000-000000000001') \gset ver1_
select test.assert(:'ver1_estado'='en_curso','verificación inicializada sin preparación registrada');
select test.assert(
 (select count(*)=0 from public.kontrola_preparaciones where codigo='LP26-70001'),
 'iniciar verificación no crea ficticiamente una preparación');

-- El segundo operario todavía puede iniciar preparación después de empezar la verificación.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select * from public.kontrola_iniciar_preparacion('LP26-70001','70000000-0000-0000-0000-000000000002') \gset prep1_
select test.assert(
 (select estado='verificacion_en_curso' from public.kontrola_cargas where codigo='LP26-70001'),
 'inicio de preparación no oculta verificación que está en curso');
select test.assert(
 (select fin is null from public.kontrola_preparaciones where codigo='LP26-70001'),
 'preparación propia continúa abierta y disponible');

-- No se permite a un tercero apropiarse de la sesión de verificación.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
do $$
declare blocked boolean:=false;
begin
 begin
  perform * from public.kontrola_iniciar_verificacion('LP26-70001','70000000-0000-0000-0000-000000000003');
 exception when insufficient_privilege then blocked:=true;
 end;
 if not blocked then raise exception 'ASSERTION FAILED: otro verificador asumió sesión existente';end if;
end$$;

-- El mismo verificador no puede asumir la preparación de su carga.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
do $$
declare blocked boolean:=false;
begin
 begin
  perform * from public.kontrola_iniciar_preparacion('LP26-70001','70000000-0000-0000-0000-000000000004');
 exception when insufficient_privilege then blocked:=true;
 end;
 if not blocked then raise exception 'ASSERTION FAILED: verificador pudo preparar su propia carga';end if;
end$$;

select * from public.kontrola_registrar_linea(:'ver1_id',1,2);
select * from public.kontrola_finalizar_verificacion(:'ver1_id');
select test.assert(
 (select fin is null from public.kontrola_preparaciones where codigo='LP26-70001'),
 'cerrar verificación NO puede cerrar automáticamente la preparación de otro operario');
select test.assert(
 (select estado='preparacion_en_curso' and cerrada_en is null and cerrada_por is null
 from public.kontrola_cargas where codigo='LP26-70001'),
 'verificación terminada conserva sesión de preparación abierta y no cierra carga anticipadamente');

select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.kontrola_finalizar_preparacion('LP26-70001');
select test.assert(
 (select estado='cerrada' and cerrada_en is not null and cerrada_por is not null
 from public.kontrola_cargas where codigo='LP26-70001'),
 'al acabar ambos procesos se cierra la carga, sin falsear picking de BC');

-- Sin preparación registrada: verificación autónoma debe completar sin esperar picking.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select * from public.kontrola_iniciar_verificacion('LP26-70002','70000000-0000-0000-0000-000000000005') \gset ver2_
select * from public.kontrola_registrar_linea(:'ver2_id',1,1);
select * from public.kontrola_finalizar_verificacion(:'ver2_id');
select test.assert(
 (select estado='cerrada' from public.kontrola_cargas where codigo='LP26-70002'),
 'la verificación puede terminar sin una sesión de preparación VISURA');

-- Orden inverso: preparación finaliza antes de la verificación.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select * from public.kontrola_iniciar_preparacion('LP26-70003','70000000-0000-0000-0000-000000000006') \gset prep3_
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select * from public.kontrola_iniciar_verificacion('LP26-70003','70000000-0000-0000-0000-000000000007') \gset ver3_
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
select public.kontrola_finalizar_preparacion('LP26-70003');
select test.assert(
 (select estado='verificacion_en_curso' from public.kontrola_cargas where codigo='LP26-70003'),
 'preparación finalizada no interrumpe verificación activa');
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000003',false);
select * from public.kontrola_registrar_linea(:'ver3_id',1,1);
select * from public.kontrola_finalizar_verificacion(:'ver3_id');
select test.assert(
 (select estado='cerrada' from public.kontrola_cargas where codigo='LP26-70003'),
 'ambos órdenes de cierre terminan correctamente');

-- Verificación completa: cambiar de carga no reabre o degrada un cierre.
select test.assert(
 (select count(*)=3 from public.kontrola_cargas where codigo in ('LP26-70001','LP26-70002','LP26-70003') and estado='cerrada'),
 'ninguna carga verificada se degrada de cerrada a preparada');
reset role;
select test.assert(
 not has_function_privilege('anon','public.kontrola_finalizar_preparacion(text)','EXECUTE'),
 'la función SECURITY DEFINER de finalizar preparación no debe exponerse a anon');
select 'KONTROLA_PARALLEL_OK' as result;
