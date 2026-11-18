-- VISURA PREPARA ALMACEN · FASE 3A / propuesta R4 de evidencia mínima
-- SOLO DOCUMENTACION PARA REVISION Y PRUEBAS: NO EJECUTAR EN SUPABASE ACTUAL.
-- Orden existente: VISURA-15-AUDITORIA-RECUPERACION-001
-- Conserva 3 migraciones R3, con visura_f3a_descartar_lote y restaurar SIN EXECUTE.
-- Registrar acciones en servidor NO prueba inspeccion fisica de la mercancia.
-- Su objeto es sustituir la confianza en el resumen de dispositivo por eventos propios.
-- No subir PDF, revisión, cantidades, notas, SKU, ruta, operario nominal ni timestamps cliente.
-- Requiere ensayos nuevos de concurrencia, RLS, cuota, iPhone y reimportacion antes de migrar.
BEGIN;

CREATE TABLE public.visura_f3a_check_cargas (
  almacen text NOT NULL,
  lp text NOT NULL CHECK(lp ~ '^LP[0-9]{2}-[0-9]{4,6}$'),
  pdf_hash text NOT NULL CHECK(pdf_hash ~ '^[a-f0-9]{64}$'),
  total integer NOT NULL CHECK(total BETWEEN 1 AND 3000),
  version bigint NOT NULL DEFAULT 0 CHECK(version >= 0),
  registrado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  actualizado_en timestamptz NOT NULL DEFAULT clock_timestamp(),
  PRIMARY KEY(almacen,lp)
);

CREATE TABLE public.visura_f3a_check_eventos (
  operacion_id uuid PRIMARY KEY,
  almacen text NOT NULL,
  lp text NOT NULL,
  pdf_hash text NOT NULL,
  version_esperada bigint NOT NULL CHECK(version_esperada >= 0),
  version bigint NOT NULL CHECK(version > 0),
  linea integer NOT NULL CHECK(linea >= 0),
  estado text NOT NULL CHECK(estado IN ('pending','ok','incident')),
  actor uuid NOT NULL,
  hora_servidor timestamptz NOT NULL,
  recibo jsonb NOT NULL,
  FOREIGN KEY(almacen,lp) REFERENCES public.visura_f3a_check_cargas(almacen,lp) ON DELETE RESTRICT,
  UNIQUE(almacen,lp,version)
);
CREATE INDEX visura_f3a_check_eventos_linea_version
  ON public.visura_f3a_check_eventos(almacen,lp,linea,version DESC);
ALTER TABLE public.visura_f3a_check_cargas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visura_f3a_check_eventos ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.visura_f3a_check_cargas,public.visura_f3a_check_eventos
 FROM PUBLIC,anon,authenticated;
-- Sin políticas: solo propietario bajo función privilegiada validada y controlada.

CREATE FUNCTION public.visura_f3a_check_eventos_inmutables()
RETURNS trigger LANGUAGE plpgsql SET search_path='' AS $f$
BEGIN
 RAISE EXCEPTION 'Eventos de check inmutables' USING ERRCODE='42501';
END $f$;
CREATE TRIGGER visura_f3a_check_eventos_no_editar
 BEFORE UPDATE OR DELETE ON public.visura_f3a_check_eventos
 FOR EACH ROW EXECUTE FUNCTION public.visura_f3a_check_eventos_inmutables();
REVOKE ALL ON FUNCTION public.visura_f3a_check_eventos_inmutables()
 FROM PUBLIC,anon,authenticated;

-- Contrato de escritura de UN evento por toque; sin sincronización retrospectiva completa.
-- Entrega mínima p_almacen,p_lp,p_pdf_hash,p_linea,p_estado,p_version_esperada,p_operacion.
-- Hora y actor se fijan aquí, no se aceptan del cliente. Sin EXECUTE para la PWA.
CREATE FUNCTION public.visura_f3a_registrar_check(
 p_almacen text,p_lp text,p_pdf_hash text,p_linea integer,
 p_estado text,p_version_esperada bigint,p_operacion uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $f$
DECLARE
 v_actor uuid:=auth.uid();
 v_total integer; v_pdf text; v_fin timestamptz; v_estado_p3 text;
 v_carga public.visura_f3a_check_cargas%ROWTYPE;
 v_previo text; v_checked integer:=0; v_incidencias integer:=0;
 v_hora timestamptz:=clock_timestamp(); v_recibo jsonb;
 v_repetida public.visura_f3a_check_eventos%ROWTYPE;
BEGIN
 IF v_actor IS NULL OR COALESCE(auth.jwt()->>'is_anonymous','false')='true'
    OR public.kontrola_usuario_activo() IS DISTINCT FROM TRUE
    OR public.kontrola_puede_almacen(p_almacen) IS DISTINCT FROM TRUE
    OR NOT (public.kontrola_es_administrador() OR EXISTS (
      SELECT 1 FROM public.kontrola_usuario_almacenes x
      WHERE x.usuario_id=v_actor AND x.almacen=p_almacen AND x.activo))
    OR NOT EXISTS (SELECT 1 FROM public.kontrola_almacenes a
      WHERE a.codigo=p_almacen AND a.activo) THEN
  RAISE EXCEPTION 'Sin autorización para registrar check' USING ERRCODE='42501';
 END IF;
 IF p_operacion IS NULL OR p_lp !~ '^LP[0-9]{2}-[0-9]{4,6}$'
    OR p_pdf_hash !~ '^[a-f0-9]{64}$'
    OR p_linea IS NULL OR p_linea < 0
    OR p_estado NOT IN ('pending','ok','incident')
    OR p_version_esperada IS NULL OR p_version_esperada < 0 THEN
  RAISE EXCEPTION 'Petición de check inválida' USING ERRCODE='22023';
 END IF;
 -- Nunca usar el total ni el estado de progreso suministrado por el dispositivo.
 SELECT p.pdf_hash,p.referencias,p.estado,p.fin
 INTO v_pdf,v_total,v_estado_p3,v_fin
 FROM public.visura_p3_cargas p
 WHERE p.almacen=p_almacen AND p.codigo=p_lp FOR SHARE;
 IF NOT FOUND OR v_pdf IS DISTINCT FROM p_pdf_hash
    OR v_total NOT BETWEEN 1 AND 3000 OR p_linea >= v_total
    OR v_estado_p3 NOT IN ('sin_iniciar','en_preparacion') OR v_fin IS NOT NULL
    OR EXISTS (SELECT 1 FROM public.visura_f3a_estados d
        WHERE d.almacen=p_almacen AND d.lp=p_lp AND d.estado='descartada') THEN
  RAISE EXCEPTION 'Carga LP/PDF/linea no acreditada o cerrada' USING ERRCODE='22023';
 END IF;
 -- Inserción idempotente del ancla; bloqueo por LP, orden único y CAS.
 INSERT INTO public.visura_f3a_check_cargas(almacen,lp,pdf_hash,total)
 VALUES (p_almacen,p_lp,p_pdf_hash,v_total) ON CONFLICT DO NOTHING;
 SELECT * INTO v_carga FROM public.visura_f3a_check_cargas
 WHERE almacen=p_almacen AND lp=p_lp FOR UPDATE;
 IF v_carga.pdf_hash<>p_pdf_hash OR v_carga.total<>v_total THEN
  RAISE EXCEPTION 'Documento/total ha cambiado; reconciliación manual' USING ERRCODE='40001';
 END IF;
 -- El mismo UUID con idéntico contenido devuelve recibo original, aunque cambie versión.
 SELECT * INTO v_repetida FROM public.visura_f3a_check_eventos
 WHERE operacion_id=p_operacion;
 IF FOUND THEN
   IF v_repetida.actor<>v_actor OR v_repetida.almacen<>p_almacen
      OR v_repetida.lp<>p_lp OR v_repetida.pdf_hash<>p_pdf_hash
      OR v_repetida.linea<>p_linea OR v_repetida.estado<>p_estado
      OR v_repetida.version_esperada<>p_version_esperada THEN
     RAISE EXCEPTION 'ID de operación reutilizado con otro contenido' USING ERRCODE='23505';
   END IF;
   RETURN v_repetida.recibo;
 END IF;
 IF v_carga.version<>p_version_esperada THEN
  RAISE EXCEPTION 'Versión de checks obsoleta' USING ERRCODE='40001';
 END IF;
 SELECT e.estado INTO v_previo FROM public.visura_f3a_check_eventos e
 WHERE e.almacen=p_almacen AND e.lp=p_lp AND e.linea=p_linea
 ORDER BY e.version DESC LIMIT 1;
 v_previo:=COALESCE(v_previo,'pending');
 IF v_previo=p_estado THEN
  RAISE EXCEPTION 'Estado de línea sin cambios' USING ERRCODE='22023';
 END IF;
 -- Solo el servidor reconstruye el último estado de cada línea desde su log inmutable.
 SELECT count(*) FILTER (WHERE x.estado IN ('ok','incident')),
        count(*) FILTER (WHERE x.estado='incident')
 INTO v_checked,v_incidencias
 FROM (
   SELECT DISTINCT ON (linea) linea,estado
   FROM public.visura_f3a_check_eventos
   WHERE almacen=p_almacen AND lp=p_lp
   ORDER BY linea,version DESC
 ) x;
 v_checked:=COALESCE(v_checked,0)
     - CASE WHEN v_previo IN ('ok','incident') THEN 1 ELSE 0 END
     + CASE WHEN p_estado IN ('ok','incident') THEN 1 ELSE 0 END;
 v_incidencias:=COALESCE(v_incidencias,0)
     - CASE WHEN v_previo='incident' THEN 1 ELSE 0 END
     + CASE WHEN p_estado='incident' THEN 1 ELSE 0 END;
 v_recibo:=pg_catalog.jsonb_build_object(
   'operacion_id',p_operacion,'almacen',p_almacen,'lp',p_lp,
   'pdf_hash',p_pdf_hash,'version',v_carga.version+1,
   'linea',p_linea,'estado',p_estado,'actor',v_actor,
   'hora_servidor',v_hora,
   'total',v_total,'checked',v_checked,'pending',v_total-v_checked,
   'incidents',v_incidencias,
   'procedencia','evento_registrado_en_servidor',
   'verificacion_fisica_acreditada',FALSE);
 UPDATE public.visura_f3a_check_cargas
 SET version=version+1, actualizado_en=v_hora
 WHERE almacen=p_almacen AND lp=p_lp;
 INSERT INTO public.visura_f3a_check_eventos(
   operacion_id,almacen,lp,pdf_hash,version_esperada,version,
   linea,estado,actor,hora_servidor,recibo)
 VALUES(p_operacion,p_almacen,p_lp,p_pdf_hash,p_version_esperada,
   v_carga.version+1,p_linea,p_estado,v_actor,v_hora,v_recibo);
 RETURN v_recibo;
END $f$;
REVOKE ALL ON FUNCTION public.visura_f3a_registrar_check(
  text,text,text,integer,text,bigint,uuid) FROM PUBLIC,anon,authenticated;

-- PROHIBIDO activar visura_f3a_descartar_lote R3: su snapshot sigue siendo autodeclarado.
-- FUTURA revisión transaccional R4: bajo el mismo bloqueo de head/LP,
-- recomputar último evento por línea; exigir checked>=1, pending>=1,
-- hash/total coincidentes, cero cola sin confirmar y version esperada exacta.
-- Mantener de momento REVOKE EXECUTE para RPC R3 de descarte/restauración.
COMMIT;
