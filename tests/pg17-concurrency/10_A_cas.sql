\set ON_ERROR_STOP on
BEGIN;
SET LOCAL statement_timeout='18000ms';
SET LOCAL lock_timeout='13000ms';
SELECT set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000011',true);
SELECT set_config('request.jwt.claims','{"is_anonymous":false}',true);
SELECT 'A_PID='||pg_backend_pid();
SELECT 'A_TX='||clock_timestamp();
SELECT public.visura_f3a_registrar_check('COR_01_COR','LP26-999901',repeat('a',64),0,'ok',0,
 'a71d3ee7-181f-4c2a-9000-000000009501'::uuid) AS receipt_a;
\echo A_WRITTEN
-- A holds the LP lock while B attempts CAS=0 on the SAME LP.
SELECT pg_sleep(7);
COMMIT;
\echo A_COMMITTED
