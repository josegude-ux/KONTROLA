\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='18000ms';
SET LOCAL lock_timeout='13000ms';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
SELECT set_config('request.jwt.claims','{"is_anonymous":false}',true);
SELECT 'B_PID='||pg_backend_pid();
\echo B_ATTEMPT
DO $case$
DECLARE t0 timestamptz:=clock_timestamp();ms numeric;rejected bool:=false;
BEGIN
 BEGIN
  PERFORM public.visura_f3a_registrar_check('COR_01_COR','LP26-999901',repeat('a',64),1,'ok',0,
   'a71d3ee7-181f-4c2a-9000-000000009502'::uuid);
 EXCEPTION WHEN serialization_failure THEN rejected:=true; END;
 ms:=round(extract(epoch FROM clock_timestamp()-t0)*1000);
 IF NOT rejected OR ms<350 THEN
  RAISE EXCEPTION 'CAS_NOT_PROVEN: rejected %, wait_ms %',rejected,ms;
 END IF;
 RAISE NOTICE 'B_CAS_40001_WAIT_MS=%',ms;
END $case$;
COMMIT;
\echo B_CAS_DONE
