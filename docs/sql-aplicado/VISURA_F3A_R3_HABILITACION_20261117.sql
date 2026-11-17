-- VISURA PREPARA ALMACEN F3A R3: activacion de RPC para PWA de pruebas.
-- Solo se ejecutara tras verificaciones de ACL/RLS, rollback e identidad P3.
BEGIN;
DO $guard$
BEGIN
 IF to_regclass('public.visura_f3a_estados') IS NULL
    OR to_regclass('public.visura_f3a_operaciones') IS NULL
    OR to_regclass('public.visura_f3a_eventos') IS NULL
    OR to_regprocedure('public.visura_f3a_descartar_lote(text,jsonb,uuid,text)') IS NULL
    OR to_regprocedure('public.visura_f3a_restaurar(text,text,bigint,uuid)') IS NULL
    OR EXISTS(SELECT 1 FROM public.visura_f3a_estados)
    OR EXISTS(SELECT 1 FROM public.visura_f3a_operaciones)
    OR EXISTS(SELECT 1 FROM public.visura_f3a_eventos) THEN
   RAISE EXCEPTION 'F3A R3 no es segura para habilitar; abortar';
 END IF;
 IF EXISTS(SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
  WHERE n.nspname='public' AND c.relname IN ('visura_f3a_estados','visura_f3a_operaciones','visura_f3a_eventos')
  AND NOT c.relrowsecurity) THEN RAISE EXCEPTION 'Falta RLS'; END IF;
 IF pg_get_functiondef('public.visura_f3a_descartar_lote(text,jsonb,uuid,text)'::regprocedure)
  NOT LIKE '%dispositivo_no_acreditado%' THEN RAISE EXCEPTION 'Falta marca de confianza'; END IF;
END $guard$;
GRANT EXECUTE ON FUNCTION public.visura_f3a_descartar_lote(text,jsonb,uuid,text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.visura_f3a_restaurar(text,text,bigint,uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.visura_f3a_descartar_lote(text,jsonb,uuid,text) FROM anon,PUBLIC;
REVOKE EXECUTE ON FUNCTION public.visura_f3a_restaurar(text,text,bigint,uuid) FROM anon,PUBLIC;
COMMIT;
