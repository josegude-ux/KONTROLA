-- VISURA-15-AUDITORIA-RECUPERACION-001 · F3A R3 · contencion reversible
-- Evidencia: RPC admite snapshot local que el servidor no certifica; NO GO.
-- Conserva las dos migraciones R3, tablas, registros y auditoria.
BEGIN;
DO $check$
BEGIN
 IF to_regprocedure('public.visura_f3a_descartar_lote(text,jsonb,uuid,text)') IS NULL
 OR to_regprocedure('public.visura_f3a_restaurar(text,text,bigint,uuid)') IS NULL THEN
  RAISE EXCEPTION 'No se reconoce instalacion F3A R3';
 END IF;
END $check$;
REVOKE EXECUTE ON FUNCTION public.visura_f3a_descartar_lote(text,jsonb,uuid,text) FROM PUBLIC,anon,authenticated;
REVOKE EXECUTE ON FUNCTION public.visura_f3a_restaurar(text,text,bigint,uuid) FROM PUBLIC,anon,authenticated;
COMMIT;