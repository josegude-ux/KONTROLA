\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='18000ms';
SET LOCAL lock_timeout='13000ms';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
SELECT set_config('request.jwt.claims','{"is_anonymous":false}',true);
SELECT 'B_PID='||pg_backend_pid();
\echo B_ATTEMPT
DO $case$
DECLARE t0 timestamptz:=clock_timestamp();ms numeric;r jsonb;orig jsonb;
BEGIN
 r:=public.visura_f3a_registrar_check('COR_01_COR','LP26-999902',repeat('b',64),0,'ok',0,
 'a71d3ee7-181f-4c2a-9000-000000009503'::uuid);
 ms:=round(extract(epoch FROM clock_timestamp()-t0)*1000);
 SELECT recibo INTO orig FROM public.visura_f3a_check_eventos WHERE operacion_id=
 'a71d3ee7-181f-4c2a-9000-000000009503'::uuid;
 IF ms<350 OR r IS DISTINCT FROM orig OR (r->>'version')::integer<>1 THEN
  RAISE EXCEPTION 'SAME_UUID_NOT_PROVEN: wait_ms %, receipt %',ms,r;
 END IF;
 RAISE NOTICE 'B_SAME_UUID_IDENTICAL_WAIT_MS=%',ms;
END $case$;
COMMIT;
\echo B_SAME_DONE
