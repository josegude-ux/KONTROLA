-- TEST ONLY. Apply only to a verified empty, disposable PostgreSQL 17 database.
-- No production, no Supabase, no preexisting database. R4.1 candidate loaded separately, byte-identical.
\set ON_ERROR_STOP on
BEGIN;
DO $guard$
BEGIN
 IF current_database() <> 'visura_f3a_qa_r41_20261117' OR
    current_setting('server_version_num')::integer NOT BETWEEN 170000 AND 179999 OR
    inet_server_addr() IS DISTINCT FROM '127.0.0.1'::inet THEN
  RAISE EXCEPTION 'QA_ONLY_LOCAL_EPHEMERAL_POSTGRES17';
 END IF;
 IF EXISTS(SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE')
   OR to_regnamespace('auth') IS NOT NULL
   OR EXISTS(SELECT 1 FROM pg_roles WHERE rolname IN ('anon','authenticated')) THEN
  RAISE EXCEPTION 'QA_DB_NOT_PRISTINE';
 END IF;
END $guard$;
-- These isolated test roles are created ONLY on the disposable PostgreSQL 17 instance.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $f$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid;
$f$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $f$
 SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb);
$f$;
CREATE TABLE public.usuarios_app (id uuid PRIMARY KEY, rol text NOT NULL, activo boolean NOT NULL);
CREATE TABLE public.kontrola_almacenes (codigo text PRIMARY KEY, activo boolean NOT NULL);
CREATE TABLE public.kontrola_usuario_almacenes (usuario_id uuid,almacen text,activo boolean);
CREATE TABLE public.visura_p3_cargas (almacen text NOT NULL,codigo text NOT NULL,pdf_hash text NOT NULL,
 referencias integer NOT NULL,estado text NOT NULL,fin timestamptz,PRIMARY KEY(almacen,codigo));
CREATE TABLE public.visura_f3a_estados (almacen text,lp text,estado text);
CREATE FUNCTION public.kontrola_usuario_activo() RETURNS boolean LANGUAGE sql STABLE AS $f$
 SELECT EXISTS (SELECT 1 FROM public.usuarios_app WHERE id=auth.uid() AND activo);
$f$;
CREATE FUNCTION public.kontrola_es_administrador() RETURNS boolean LANGUAGE sql STABLE AS $f$
 SELECT EXISTS (SELECT 1 FROM public.usuarios_app WHERE id=auth.uid() AND rol='administrador' AND activo);
$f$;
CREATE FUNCTION public.kontrola_puede_almacen(p_almacen text) RETURNS boolean LANGUAGE sql STABLE AS $f$
 SELECT public.kontrola_es_administrador() OR EXISTS (
  SELECT 1 FROM public.kontrola_usuario_almacenes
  WHERE usuario_id=auth.uid() AND almacen=p_almacen AND activo);
$f$;
INSERT INTO public.usuarios_app VALUES ('00000000-0000-4000-8000-000000000011','administrador',true);
INSERT INTO public.kontrola_almacenes VALUES ('COR_01_COR',true);
INSERT INTO public.visura_p3_cargas VALUES
 ('COR_01_COR','LP26-999901',repeat('a',64),3,'en_preparacion',NULL),
 ('COR_01_COR','LP26-999902',repeat('b',64),3,'en_preparacion',NULL);
COMMIT;
