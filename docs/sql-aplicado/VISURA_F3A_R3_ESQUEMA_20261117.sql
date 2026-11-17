-- VISURA PREPARA ALMACEN / FASE 3A - R3 / IMPLEMENTACION CONTROLADA EN TEST
-- ORDEN: VISURA-15-AUDITORIA-RECUPERACION-001 / MATRIZ 00 / DIST F2
-- Su destino UNICO es Supabase control-cargas-movil (PWA de pruebas).
-- NO modifica tablas KONTROLA, visura_p3, TANQUES, Business Central ni usuarios.
-- R3 exige LP + SHA + total referencias previamente acreditados por visura_p3_cargas.
-- El numero de referencias SI se valida en servidor. El progreso checked/pending NO se certifica,
-- se registra expresamente como procedencia de DISPOSITIVO NO ACREDITADA.
-- R3 exige ALMACEN ASIGNADO EXPLICITAMENTE para operario, o administrador activo.
-- RPC instaladas SIN GRANT EXECUTE a authenticated: habilitacion separada post pruebas.
-- Actor UUID sin FK hacia auth.users: no bloquea borrado de identidades existentes.
-- Se conserva actor historico como UUID para trazabilidad.
-- No prueba que el progreso snapshot enviado por dispositivo sea verdadero; NO habilitar UI.
-- Este contrato NO sincroniza revisiones completas ni lineas vivas.
-- Una carga envia SOLO resumen de progreso al descartarse.
-- Dependencias del sandbox: auth.users y funciones de autorizacion
-- public.kontrola_usuario_activo() y public.kontrola_puede_almacen(text).
BEGIN;
DO $guard$
BEGIN
 IF to_regprocedure('public.kontrola_usuario_activo()') IS NULL
    OR to_regprocedure('public.kontrola_puede_almacen(text)') IS NULL
    OR to_regprocedure('public.kontrola_es_administrador()') IS NULL
    OR to_regclass('public.kontrola_usuario_almacenes') IS NULL
    OR to_regclass('public.visura_p3_cargas') IS NULL THEN
  RAISE EXCEPTION 'Faltan contratos de acceso ALMACEN en el sandbox';
 END IF;
 IF to_regclass('public.visura_f3a_estados') IS NOT NULL
    OR to_regclass('public.visura_f3a_operaciones') IS NOT NULL
    OR to_regclass('public.visura_f3a_eventos') IS NOT NULL THEN
  RAISE EXCEPTION 'F3A ya existe; no sobreescribir';
 END IF;
END $guard$;
CREATE TABLE public.visura_f3a_estados (
 almacen text NOT NULL,
 lp text NOT NULL CHECK(lp ~ '^LP[0-9]{2}-[0-9]{4,6}$'),
 pdf_hash text NOT NULL CHECK(pdf_hash ~ '^[a-f0-9]{64}$'),
 estado text NOT NULL CHECK(estado IN ('activa','descartada')),
 version bigint NOT NULL CHECK(version > 0),
 actor_descarte uuid ,
 hora_descarte timestamptz,
 snapshot_resumen jsonb,
 actualizado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
 PRIMARY KEY(almacen,lp),
 CHECK(estado='activa' OR (actor_descarte IS NOT NULL
  AND hora_descarte IS NOT NULL AND snapshot_resumen IS NOT NULL))
);
CREATE TABLE public.visura_f3a_operaciones (
 operacion_id uuid PRIMARY KEY,
 almacen text NOT NULL,
 accion text NOT NULL CHECK(accion IN ('descartar','restaurar')),
 actor uuid NOT NULL ,
 payload jsonb NOT NULL,
 recibo jsonb,
 creado_en timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE public.visura_f3a_eventos (
 evento_id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
 operacion_id uuid NOT NULL REFERENCES public.visura_f3a_operaciones(operacion_id),
 almacen text NOT NULL,
 lp text NOT NULL,
 accion text NOT NULL CHECK(accion IN ('descartar','restaurar')),
 actor uuid NOT NULL ,
 hora timestamptz NOT NULL DEFAULT clock_timestamp(),
 snapshot_resumen jsonb,
 UNIQUE(operacion_id,almacen,lp),
 FOREIGN KEY(almacen,lp) REFERENCES public.visura_f3a_estados(almacen,lp)
  ON DELETE RESTRICT
);
CREATE INDEX visura_f3a_eventos_lp ON public.visura_f3a_eventos(almacen,lp,hora DESC);
ALTER TABLE public.visura_f3a_estados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visura_f3a_operaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visura_f3a_eventos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.visura_f3a_estados,public.visura_f3a_operaciones,
 public.visura_f3a_eventos FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.visura_f3a_estados,public.visura_f3a_operaciones,
 public.visura_f3a_eventos TO authenticated;
CREATE POLICY vc3a_estados_leer ON public.visura_f3a_estados FOR SELECT TO authenticated
 USING((SELECT auth.uid()) IS NOT NULL AND COALESCE(auth.jwt()->>'is_anonymous','false')<>'true' AND public.kontrola_usuario_activo()
  AND public.kontrola_puede_almacen(almacen)
  AND (public.kontrola_es_administrador() OR EXISTS (
      SELECT 1 FROM public.kontrola_usuario_almacenes ua
      WHERE ua.usuario_id=(SELECT auth.uid()) AND ua.almacen=almacen AND ua.activo))
  AND EXISTS(SELECT 1 FROM public.kontrola_almacenes a WHERE a.codigo=almacen AND a.activo));
CREATE POLICY vc3a_operaciones_leer ON public.visura_f3a_operaciones FOR SELECT TO authenticated
 USING((SELECT auth.uid())=actor AND COALESCE(auth.jwt()->>'is_anonymous','false')<>'true' AND public.kontrola_usuario_activo()
  AND public.kontrola_puede_almacen(almacen)
  AND (public.kontrola_es_administrador() OR EXISTS (
      SELECT 1 FROM public.kontrola_usuario_almacenes ua
      WHERE ua.usuario_id=(SELECT auth.uid()) AND ua.almacen=almacen AND ua.activo))
  AND EXISTS(SELECT 1 FROM public.kontrola_almacenes a WHERE a.codigo=almacen AND a.activo));
CREATE POLICY vc3a_eventos_leer ON public.visura_f3a_eventos FOR SELECT TO authenticated
 USING((SELECT auth.uid()) IS NOT NULL AND COALESCE(auth.jwt()->>'is_anonymous','false')<>'true' AND public.kontrola_usuario_activo()
  AND public.kontrola_puede_almacen(almacen)
  AND (public.kontrola_es_administrador() OR EXISTS (
      SELECT 1 FROM public.kontrola_usuario_almacenes ua
      WHERE ua.usuario_id=(SELECT auth.uid()) AND ua.almacen=almacen AND ua.activo))
  AND EXISTS(SELECT 1 FROM public.kontrola_almacenes a WHERE a.codigo=almacen AND a.activo));
CREATE FUNCTION public.visura_f3a_evento_inmutable() RETURNS trigger
 LANGUAGE plpgsql SET search_path='' AS $guard$
BEGIN
 RAISE EXCEPTION 'Auditoria inmutable' USING ERRCODE='42501';
END $guard$;
CREATE TRIGGER visura_f3a_no_editar_eventos BEFORE UPDATE OR DELETE
 ON public.visura_f3a_eventos FOR EACH ROW
 EXECUTE FUNCTION public.visura_f3a_evento_inmutable();
REVOKE ALL ON FUNCTION public.visura_f3a_evento_inmutable() FROM PUBLIC,anon,authenticated;
CREATE FUNCTION public.visura_f3a_normalizar_lp(p_lp text) RETURNS text
 LANGUAGE plpgsql IMMUTABLE SET search_path='' AS $f$
DECLARE v text;m text[]; n text;
BEGIN
 v:=upper(translate(coalesce(p_lp,''),chr(32)||chr(9)||chr(13)||chr(10),''));
 m:=regexp_match(v,'^LP([0-9]{2})-?([0-9]{4,6})$');
 IF m IS NULL THEN RAISE EXCEPTION 'LP no reconocido' USING ERRCODE='22023';END IF;
 n:=ltrim(m[2],'0');
 RETURN 'LP'||m[1]||'-'||lpad(n,greatest(4,length(n)),'0');
END $f$;
REVOKE ALL ON FUNCTION public.visura_f3a_normalizar_lp(text) FROM PUBLIC,anon,authenticated;
-- p_items = [{"lp":"LP26-21230","pdf_hash":"[64 hex]","version":0,
--  "snapshot":{"total":2,"checked":1,"pending":1,"incidents":0,"cerrada":false}}]
-- No acepta lineas ni audit; solo resumen al momento de descartar.
CREATE FUNCTION public.visura_f3a_descartar_lote(
 p_almacen text,p_items jsonb,p_operacion uuid,p_motivo text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE actor_actual uuid:=auth.uid(); hora_actual timestamptz:=clock_timestamp();
 items_ordenados jsonb; solicitud jsonb; operacion public.visura_f3a_operaciones%ROWTYPE;
 item jsonb; resumen jsonb; registro public.visura_f3a_estados%ROWTYPE;
 lp_actual text; hash_actual text; version_actual bigint;
 p3_estado text; p3_referencias integer; p3_fin timestamptz;
 n_total int;n_ok int;n_pending int;n_incidencias int;
 cambios jsonb:='[]'::jsonb;respuesta jsonb;
BEGIN
 IF actor_actual IS NULL OR p_almacen IS NULL OR length(p_almacen) NOT BETWEEN 1 AND 100
    OR public.kontrola_usuario_activo() IS DISTINCT FROM TRUE
    OR public.kontrola_puede_almacen(p_almacen) IS DISTINCT FROM TRUE
    OR NOT (public.kontrola_es_administrador() OR EXISTS (
       SELECT 1 FROM public.kontrola_usuario_almacenes ua
       WHERE ua.usuario_id=actor_actual AND ua.almacen=p_almacen AND ua.activo))
    OR COALESCE(auth.jwt()->>'is_anonymous','false')='true'
    OR NOT EXISTS(SELECT 1 FROM public.kontrola_almacenes a
       WHERE a.codigo=p_almacen AND a.activo) THEN
  RAISE EXCEPTION 'Sin sesion, rol activo o acceso al almacen' USING ERRCODE='42501';
 END IF;
 IF p_operacion IS NULL OR jsonb_typeof(p_items) IS DISTINCT FROM 'array'
    OR jsonb_array_length(p_items) NOT BETWEEN 1 AND 100
    OR length(coalesce(p_motivo,''))>180 THEN
  RAISE EXCEPTION 'Solicitud invalida' USING ERRCODE='22023';
 END IF;
 IF EXISTS(SELECT 1 FROM jsonb_array_elements(p_items) AS t(x)
  WHERE jsonb_typeof(x) IS DISTINCT FROM 'object'
   OR jsonb_typeof(x->'snapshot') IS DISTINCT FROM 'object') THEN
  RAISE EXCEPTION 'Elementos invalidos' USING ERRCODE='22023';
 END IF;
 SELECT jsonb_agg(x ORDER BY x->>'lp') INTO items_ordenados
  FROM jsonb_array_elements(p_items) AS t(x);
 IF (SELECT count(DISTINCT x->>'lp') FROM jsonb_array_elements(items_ordenados) AS t(x))
     <>jsonb_array_length(items_ordenados) THEN
  RAISE EXCEPTION 'LP repetido en lote' USING ERRCODE='22023';
 END IF;
 solicitud:=jsonb_build_object('almacen',p_almacen,'items',items_ordenados,'motivo',p_motivo);
 INSERT INTO public.visura_f3a_operaciones(operacion_id,almacen,accion,actor,payload)
 VALUES(p_operacion,p_almacen,'descartar',actor_actual,solicitud)
 ON CONFLICT(operacion_id) DO NOTHING;
 SELECT * INTO operacion FROM public.visura_f3a_operaciones
  WHERE operacion_id=p_operacion FOR UPDATE;
 IF operacion.actor<>actor_actual OR operacion.accion<>'descartar'
    OR operacion.payload<>solicitud THEN
  RAISE EXCEPTION 'ID de operacion con contenido diferente' USING ERRCODE='23505';
 END IF;
 IF operacion.recibo IS NOT NULL THEN RETURN operacion.recibo;END IF;
 -- Primer recorrido: validacion y bloqueos ordenados; cero cambios de descarte.
 FOR item IN SELECT x FROM jsonb_array_elements(items_ordenados) AS t(x) LOOP
  IF EXISTS(SELECT 1 FROM jsonb_object_keys(item) AS t(k)
    WHERE k NOT IN ('lp','pdf_hash','version','snapshot')) OR
   EXISTS(SELECT 1 FROM jsonb_object_keys(item->'snapshot') AS t(k)
    WHERE k NOT IN ('total','checked','pending','incidents','cerrada')) THEN
   RAISE EXCEPTION 'Campos no autorizados en snapshot' USING ERRCODE='22023';
  END IF;
  lp_actual:=item->>'lp'; hash_actual:=item->>'pdf_hash';
  IF lp_actual IS DISTINCT FROM public.visura_f3a_normalizar_lp(lp_actual)
     OR hash_actual IS NULL OR hash_actual !~ '^[a-f0-9]{64}$'
     OR item->>'version' IS NULL OR item->>'version' !~ '^[0-9]+$' THEN
   RAISE EXCEPTION 'LP, huella o version invalidos' USING ERRCODE='22023';
  END IF;
  version_actual:=(item->>'version')::bigint;
  resumen:=item->'snapshot';
  IF jsonb_typeof(resumen->'cerrada') IS DISTINCT FROM 'boolean'
     OR resumen->>'cerrada' IS DISTINCT FROM 'false'
     OR resumen->>'total' IS NULL OR resumen->>'total' !~ '^[0-9]+$'
     OR resumen->>'checked' IS NULL OR resumen->>'checked' !~ '^[0-9]+$'
     OR resumen->>'pending' IS NULL OR resumen->>'pending' !~ '^[0-9]+$'
     OR resumen->>'incidents' IS NULL OR resumen->>'incidents' !~ '^[0-9]+$' THEN
   RAISE EXCEPTION 'Snapshot incompleto o cerrado' USING ERRCODE='22023';
  END IF;
  n_total:=(resumen->>'total')::int; n_ok:=(resumen->>'checked')::int;
  n_pending:=(resumen->>'pending')::int;n_incidencias:=(resumen->>'incidents')::int;
  IF n_total NOT BETWEEN 1 AND 3000 OR n_ok<0 OR n_pending<1
    OR n_ok+n_pending<>n_total OR n_incidencias<0 OR n_incidencias>n_ok THEN
   RAISE EXCEPTION 'Carga completa o recuentos inconsistentes' USING ERRCODE='22023';
  END IF;
  -- Contrato PRUEBA_3: LP y PDF deben existir ya en servidor; bloqueo del origen
  -- durante el cambio para impedir cierre/sustitucion concurrente del mismo LP.
  SELECT p.estado,p.referencias,p.fin
    INTO p3_estado,p3_referencias,p3_fin
    FROM public.visura_p3_cargas p
   WHERE p.almacen=p_almacen AND p.codigo=lp_actual AND p.pdf_hash=hash_actual
   FOR SHARE;
  IF NOT FOUND OR p3_estado NOT IN ('sin_iniciar','en_preparacion')
    OR p3_fin IS NOT NULL OR p3_referencias IS DISTINCT FROM n_total THEN
   RAISE EXCEPTION 'LP/PDF/total no acreditados o carga cerrada en PRUEBA_3' USING ERRCODE='22023';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
   'visura_f3a:'||p_almacen||':'||lp_actual,0));
  SELECT * INTO registro FROM public.visura_f3a_estados
   WHERE almacen=p_almacen AND lp=lp_actual FOR UPDATE;
  IF FOUND THEN
   IF registro.estado<>'activa' OR registro.version<>version_actual
      OR registro.pdf_hash<>hash_actual THEN
    RAISE EXCEPTION 'Conflicto de version/estado para %',lp_actual USING ERRCODE='40001';
   END IF;
  ELSIF version_actual<>0 THEN
   RAISE EXCEPTION 'Version inicial no valida para %',lp_actual USING ERRCODE='40001';
  END IF;
 END LOOP;
 -- Segundo recorrido: una misma transaccion SQL inserta estados y eventos.
 FOR item IN SELECT x FROM jsonb_array_elements(items_ordenados) AS t(x) LOOP
  lp_actual:=item->>'lp';hash_actual:=item->>'pdf_hash';
  version_actual:=(item->>'version')::bigint;
  resumen:=jsonb_build_object('total',(item->'snapshot'->>'total')::int,
   'checked',(item->'snapshot'->>'checked')::int,
   'pending',(item->'snapshot'->>'pending')::int,
   'incidents',(item->'snapshot'->>'incidents')::int,
   '_fuente_lp','visura_p3_cargas',
   '_progreso_fuente','dispositivo_no_acreditado');
  INSERT INTO public.visura_f3a_estados(almacen,lp,pdf_hash,estado,version,
   actor_descarte,hora_descarte,snapshot_resumen,actualizado_en)
  VALUES(p_almacen,lp_actual,hash_actual,'descartada',version_actual+1,
   actor_actual,hora_actual,resumen,hora_actual)
  ON CONFLICT(almacen,lp) DO UPDATE SET
   estado='descartada',version=EXCLUDED.version,actor_descarte=actor_actual,
   hora_descarte=hora_actual,snapshot_resumen=resumen,actualizado_en=hora_actual;
  INSERT INTO public.visura_f3a_eventos(
   operacion_id,almacen,lp,accion,actor,hora,snapshot_resumen)
  VALUES(p_operacion,p_almacen,lp_actual,'descartar',actor_actual,hora_actual,resumen);
  cambios:=cambios||jsonb_build_array(jsonb_build_object('lp',lp_actual,'version',version_actual+1));
 END LOOP;
 respuesta:=jsonb_build_object('operacion_id',p_operacion,'actor',actor_actual,
  'hora_servidor',hora_actual,'snapshot_acreditado',false,'cargas',cambios);
 UPDATE public.visura_f3a_operaciones SET recibo=respuesta WHERE operacion_id=p_operacion;
 RETURN respuesta;
END $f$;
REVOKE ALL ON FUNCTION public.visura_f3a_descartar_lote(text,jsonb,uuid,text)
 FROM PUBLIC,anon,authenticated;
-- BLOQUEO DE SEGURIDAD: el permiso EXECUTE no se otorga hasta homologacion posterior.
CREATE FUNCTION public.visura_f3a_restaurar(
 p_almacen text,p_lp text,p_version bigint,p_operacion uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE actor_actual uuid:=auth.uid();hora_actual timestamptz:=clock_timestamp();
 lp_actual text; solicitud jsonb;operacion public.visura_f3a_operaciones%ROWTYPE;
 registro public.visura_f3a_estados%ROWTYPE;respuesta jsonb;
BEGIN
 IF actor_actual IS NULL OR p_almacen IS NULL
    OR public.kontrola_usuario_activo() IS DISTINCT FROM TRUE
    OR public.kontrola_puede_almacen(p_almacen) IS DISTINCT FROM TRUE
    OR NOT (public.kontrola_es_administrador() OR EXISTS (
       SELECT 1 FROM public.kontrola_usuario_almacenes ua
       WHERE ua.usuario_id=actor_actual AND ua.almacen=p_almacen AND ua.activo))
    OR COALESCE(auth.jwt()->>'is_anonymous','false')='true'
    OR NOT EXISTS(SELECT 1 FROM public.kontrola_almacenes a
       WHERE a.codigo=p_almacen AND a.activo) THEN
  RAISE EXCEPTION 'Sin sesion o acceso' USING ERRCODE='42501';
 END IF;
 lp_actual:=public.visura_f3a_normalizar_lp(p_lp);
 IF p_lp IS DISTINCT FROM lp_actual OR p_version IS NULL OR p_operacion IS NULL THEN
  RAISE EXCEPTION 'Restauracion invalida' USING ERRCODE='22023';
 END IF;
 solicitud:=jsonb_build_object('almacen',p_almacen,'lp',lp_actual,'version',p_version);
 INSERT INTO public.visura_f3a_operaciones(operacion_id,almacen,accion,actor,payload)
 VALUES(p_operacion,p_almacen,'restaurar',actor_actual,solicitud)
 ON CONFLICT(operacion_id) DO NOTHING;
 SELECT * INTO operacion FROM public.visura_f3a_operaciones
  WHERE operacion_id=p_operacion FOR UPDATE;
 IF operacion.actor<>actor_actual OR operacion.accion<>'restaurar'
    OR operacion.payload<>solicitud THEN
  RAISE EXCEPTION 'ID de operacion reutilizado' USING ERRCODE='23505';
 END IF;
 IF operacion.recibo IS NOT NULL THEN RETURN operacion.recibo;END IF;
 SELECT * INTO registro FROM public.visura_f3a_estados
  WHERE almacen=p_almacen AND lp=lp_actual FOR UPDATE;
 IF NOT FOUND OR registro.estado<>'descartada' OR registro.version<>p_version THEN
  RAISE EXCEPTION 'Conflicto de version o estado' USING ERRCODE='40001';
 END IF;
 UPDATE public.visura_f3a_estados SET estado='activa',version=version+1,
  actualizado_en=hora_actual WHERE almacen=p_almacen AND lp=lp_actual;
 INSERT INTO public.visura_f3a_eventos(
  operacion_id,almacen,lp,accion,actor,hora,snapshot_resumen)
 VALUES(p_operacion,p_almacen,lp_actual,'restaurar',actor_actual,hora_actual,
  registro.snapshot_resumen);
 respuesta:=jsonb_build_object('operacion_id',p_operacion,'lp',lp_actual,
  'estado','activa','version',p_version+1,'actor',actor_actual,
  'hora_servidor',hora_actual);
 UPDATE public.visura_f3a_operaciones SET recibo=respuesta WHERE operacion_id=p_operacion;
 RETURN respuesta;
END $f$;
REVOKE ALL ON FUNCTION public.visura_f3a_restaurar(text,text,bigint,uuid)
 FROM PUBLIC,anon,authenticated;
-- BLOQUEO DE SEGURIDAD: el permiso EXECUTE no se otorga hasta homologacion posterior.
COMMIT;
