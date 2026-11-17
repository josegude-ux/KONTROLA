-- ENSAYO POSTGRESQL NO EJECUTADO A FECHA DE PREPARACION.
-- APLICAR solo dentro de una transaccion que terminará en ROLLBACK.
DO $guard$
BEGIN
 IF has_function_privilege('authenticated','public.visura_f3a_registrar_check(text,text,text,integer,text,bigint,uuid)','EXECUTE')
 OR has_function_privilege('anon','public.visura_f3a_registrar_check(text,text,text,integer,text,bigint,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'R4 se creó con EXECUTE permitido';END IF;
 IF NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.visura_f3a_check_cargas'::regclass)
 OR NOT (SELECT relrowsecurity FROM pg_class WHERE oid='public.visura_f3a_check_eventos'::regclass)
 THEN RAISE EXCEPTION 'RLS no habilitado'; END IF;
END $guard$;
-- Permiso solo TEMPORAL en transaccion reversible para ensayar el contrato.
GRANT EXECUTE ON FUNCTION public.visura_f3a_registrar_check(text,text,text,integer,text,bigint,uuid) TO authenticated;
SELECT set_config('request.jwt.claim.sub','a71d3ee7-181f-4c2a-9000-000000000001',true);
SELECT set_config('request.jwt.claims','{"is_anonymous":false}',true);
SET LOCAL ROLE authenticated;
DO $tests$
DECLARE r jsonb;r2 jsonb;r3 jsonb;denied boolean;op uuid:='a71d3ee7-181f-4c2a-9000-000000001001';
BEGIN
 r:=public.visura_f3a_registrar_check('COR_01_COR','LP26-21230',repeat('a',64),0,'ok',0,op);
 IF r->>'version'<>'1' OR r->>'checked'<>'1' OR r->>'pending'<>'2' OR
    r->>'procedencia'<>'evento_registrado_en_servidor' OR r->>'verificacion_fisica_acreditada'<>'false' THEN
  RAISE EXCEPTION 'Primer check no confirmado correctamente'; END IF;
 r2:=public.visura_f3a_registrar_check('COR_01_COR','LP26-21230',repeat('a',64),0,'ok',0,op);
 IF r2 IS DISTINCT FROM r THEN RAISE EXCEPTION 'Reintento no idempotente';END IF;
 denied:=false;
 BEGIN PERFORM public.visura_f3a_registrar_check('COR_01_COR','LP26-21230',repeat('a',64),0,'incident',0,op);
 EXCEPTION WHEN unique_violation THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'UUID cambiado no detectado'; END IF;
 denied:=false;
 BEGIN PERFORM public.visura_f3a_registrar_check('COR_01_COR','LP26-21230',repeat('a',64),1,'ok',0,'a71d3ee7-181f-4c2a-9000-000000001002');
 EXCEPTION WHEN serialization_failure THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'CAS no protegido';END IF;
 denied:=false;
 BEGIN PERFORM public.visura_f3a_registrar_check('COR_01_COR','LP26-21230',repeat('a',64),0,'ok',1,'a71d3ee7-181f-4c2a-9000-000000001003');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Duplicidad de transición';END IF;
 r3:=public.visura_f3a_registrar_check('COR_01_COR','LP26-21230',repeat('a',64),0,'pending',1,'a71d3ee7-181f-4c2a-9000-000000001004');
 IF r3->>'version'<>'2' OR r3->>'checked'<>'0' OR r3->>'pending'<>'3' THEN
 RAISE EXCEPTION 'Reversión de check incorrecta';END IF;
 IF has_table_privilege('authenticated','public.visura_f3a_check_cargas','SELECT') OR
    has_table_privilege('authenticated','public.visura_f3a_check_eventos','SELECT') THEN
    RAISE EXCEPTION 'SELECT directo habilitado indebidamente'; END IF;
 PERFORM set_config('request.jwt.claim.sub','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',true);
 denied:=false;
 BEGIN PERFORM public.visura_f3a_registrar_check('COR_01_COR','LP26-21230',repeat('a',64),1,'ok',2,'a71d3ee7-181f-4c2a-9000-000000001005');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Usuario desconocido permitido';END IF;
 PERFORM set_config('request.jwt.claim.sub','a71d3ee7-181f-4c2a-9000-000000000001',true);
 PERFORM set_config('request.jwt.claims','{"is_anonymous":true}',true);
 denied:=false;
 BEGIN PERFORM public.visura_f3a_registrar_check('COR_01_COR','LP26-21230',repeat('a',64),1,'ok',2,'a71d3ee7-181f-4c2a-9000-000000001006');
 EXCEPTION WHEN insufficient_privilege THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'JWT anónimo permitido';END IF;
END $tests$;
RESET ROLE;
-- CERRAR P3 EN LA MISMA BASE FICTICIA, luego comprobar retry de UUID antiguo.
UPDATE public.visura_p3_cargas SET estado='finalizada',fin=clock_timestamp()
 WHERE almacen='COR_01_COR' AND codigo='LP26-21230';
SET LOCAL ROLE authenticated;
DO $retry$
DECLARE r jsonb;denied boolean:=false;
BEGIN
 r:=public.visura_f3a_registrar_check('COR_01_COR','LP26-21230',repeat('a',64),0,'ok',0,'a71d3ee7-181f-4c2a-9000-000000001001');
 IF r->>'version'<>'1' THEN RAISE EXCEPTION 'Reintento tras cierre no recupera recibo';END IF;
 BEGIN PERFORM public.visura_f3a_registrar_check('COR_01_COR','LP26-21230',repeat('a',64),1,'ok',2,'a71d3ee7-181f-4c2a-9000-000000001007');
 EXCEPTION WHEN invalid_parameter_value THEN denied:=true;END;
 IF NOT denied THEN RAISE EXCEPTION 'Nuevo check permitido tras cierre';END IF;
END $retry$;
RESET ROLE;
-- Reversión final corresponde al runner; NO se hace COMMIT.
