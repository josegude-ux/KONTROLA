-- SOLO PARA CLUSTER POSTGRESQL LOCAL Y BASE DESCARTABLE. NO REMOTO.
-- Ejecutar SOLO bajo BEGIN + ROLLBACK generados por ensayar_f3a_r41_local.sh.
CREATE ROLE anon NOLOGIN;
CREATE ROLE authenticated NOLOGIN;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
 SELECT NULLIF(current_setting('request.jwt.claim.sub',true),'')::uuid
$$;
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$
 SELECT COALESCE(NULLIF(current_setting('request.jwt.claims',true),'')::jsonb,'{}'::jsonb)
$$;
CREATE TABLE public.usuarios_app (id uuid PRIMARY KEY, rol text NOT NULL,activo boolean NOT NULL);
CREATE TABLE public.kontrola_almacenes (codigo text PRIMARY KEY,activo boolean NOT NULL);
CREATE TABLE public.kontrola_usuario_almacenes (usuario_id uuid,almacen text,activo boolean);
CREATE TABLE public.visura_p3_cargas(almacen text NOT NULL,codigo text NOT NULL,pdf_hash text NOT NULL,
 referencias integer,estado text NOT NULL,fin timestamptz,PRIMARY KEY (almacen,codigo));
CREATE TABLE public.visura_f3a_estados(almacen text NOT NULL,lp text NOT NULL,estado text NOT NULL,
 PRIMARY KEY (almacen,lp));
CREATE FUNCTION public.kontrola_usuario_activo() RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.usuarios_app u WHERE u.id=auth.uid() AND u.activo
    AND u.rol IN ('administrador','operario'))$$;
CREATE FUNCTION public.kontrola_es_administrador() RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.usuarios_app u WHERE u.id=auth.uid() AND u.activo
    AND u.rol='administrador')$$;
CREATE FUNCTION public.kontrola_puede_almacen(p_almacen text) RETURNS boolean
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $$
 SELECT EXISTS(SELECT 1 FROM public.kontrola_almacenes a WHERE a.codigo=p_almacen AND a.activo)
   AND public.kontrola_usuario_activo()$$;
INSERT INTO public.usuarios_app VALUES('a71d3ee7-181f-4c2a-9000-000000000001','administrador',true);
INSERT INTO public.kontrola_almacenes VALUES('COR_01_COR',true),('COR_02_FER',true);
INSERT INTO public.visura_p3_cargas VALUES('COR_01_COR','LP26-21230',repeat('a',64),3,'en_preparacion',NULL);
