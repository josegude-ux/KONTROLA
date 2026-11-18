\set ON_ERROR_STOP on
-- Executed only after BOTH A/B transactions have ended successfully.
BEGIN;
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
SELECT set_config('request.jwt.claims','{"is_anonymous":false}',true);
DO $qa$
DECLARE h1 bigint; h2 bigint; n1 integer; n2 integer; replay jsonb; r jsonb; rejected boolean:=false;
BEGIN
 SELECT version INTO h1 FROM public.visura_f3a_check_cargas WHERE lp='LP26-999901';
 SELECT version INTO h2 FROM public.visura_f3a_check_cargas WHERE lp='LP26-999902';
 SELECT count(*) INTO n1 FROM public.visura_f3a_check_eventos WHERE lp='LP26-999901';
 SELECT count(*) INTO n2 FROM public.visura_f3a_check_eventos WHERE lp='LP26-999902';
 IF h1<>1 OR h2<>1 OR n1<>1 OR n2<>1 THEN
  RAISE EXCEPTION 'BAD_RACE_COUNTS: %,%,%,%',h1,h2,n1,n2;
 END IF;
 replay:=public.visura_f3a_registrar_check('COR_01_COR','LP26-999902',repeat('b',64),0,'ok',0,
  'a71d3ee7-181f-4c2a-9000-000000009503'::uuid);
 IF replay IS DISTINCT FROM (SELECT recibo FROM public.visura_f3a_check_eventos WHERE operacion_id=
   'a71d3ee7-181f-4c2a-9000-000000009503'::uuid) THEN
  RAISE EXCEPTION 'IDEMPOTENCE_LOST';
 END IF;
 r:=public.visura_f3a_registrar_check('COR_01_COR','LP26-999901',repeat('a',64),1,'ok',1,
  'a71d3ee7-181f-4c2a-9000-000000009504'::uuid);
 IF (r->>'version')::bigint<>2 OR (r->>'checked')::integer<>2 OR (r->>'pending')::integer<>1 THEN
  RAISE EXCEPTION 'RETRY_AFTER_CAS_BAD';
 END IF;
 SELECT count(*) INTO n1 FROM public.visura_f3a_check_eventos WHERE lp='LP26-999901';
 IF n1<>2 THEN RAISE EXCEPTION 'EVENT_COUNT_AFTER_RECOVERY_BAD'; END IF;
 IF has_function_privilege('authenticated',
 'public.visura_f3a_registrar_check(text,text,text,integer,text,bigint,uuid)','EXECUTE')
 OR has_function_privilege('anon',
 'public.visura_f3a_registrar_check(text,text,text,integer,text,bigint,uuid)','EXECUTE')
 THEN RAISE EXCEPTION 'R41_RPC_EXPOSED';END IF;
 RAISE NOTICE 'PASS_2_REAL_SESSIONS_RECOVERY_IDEMPOTENCE_ACL';
END $qa$;
COMMIT;
