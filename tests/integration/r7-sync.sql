\set ON_ERROR_STOP on
-- VISURA PREPARA · R7. SOLO sobre kontrola_test local ya creada por run.sh.
-- El borrador SQL se aplicó únicamente a esta base de pruebas efímera.
reset role;
insert into public.kontrola_cargas(
 codigo,productos,documento_ruta,documento_hash,publicado_por,almacen,estado,fecha,publicado_en
) values
 ('LP26-88001','[]'::jsonb,'documentos/LP26-88001/'||repeat('a',64)||'.pdf',
  repeat('a',64),'00000000-0000-0000-0000-000000000001','COR_01_COR','publicada',
  (now() at time zone 'Europe/Madrid')::date-1,now()),
 ('LP26-88002','[]'::jsonb,'documentos/LP26-88002/'||repeat('b',64)||'.pdf',
  repeat('b',64),'00000000-0000-0000-0000-000000000001','COR_01_COR','publicada',
  (now() at time zone 'Europe/Madrid')::date-1,now()),
 ('LP26-88003','[]'::jsonb,'documentos/LP26-88003/'||repeat('c',64)||'.pdf',
  repeat('c',64),'00000000-0000-0000-0000-000000000001','COR_01_COR','publicada',
  (now() at time zone 'Europe/Madrid')::date-1,now());
-- Anotación heredada sin hash: jamás atribuirla automáticamente a la revisión actual.
insert into public.kontrola_impresiones(codigo,almacen,usuario_id,reimpresion)
values('LP26-88003','COR_01_COR','00000000-0000-0000-0000-000000000001',false);

set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
-- Fecha BC de ayer, publicación hoy => primera generación R7 válida.
select * from public.kontrola_registrar_generacion_r7(
 'COR_01_COR','LP26-88001',repeat('a',64),now()
)\gset r7_first_
select test.assert(:'r7_first_resultado'='REGISTRADO','primera generación R7 confirmada');
select test.assert(:'r7_first_intentos'='1','primera generación conserva un único intento');

-- Idempotencia: el mismo PDF desde el mismo u otro equipo no genera otra fila.
select * from public.kontrola_registrar_generacion_r7(
 'COR_01_COR','LP26-88001',repeat('a',64),now()
)\gset r7_repeat_
select test.assert(:'r7_repeat_resultado'='YA_REGISTRADO','repetición idempotente');
select test.assert((select count(*)=1 from public.kontrola_impresiones
 where codigo='LP26-88001' and documento_hash=repeat('a',64)),
 'sin filas duplicadas por la misma LP+hash');

-- El histórico previo sin huella se mantiene ambiguo: revisión manual obligatoria.
do $r7$
declare rejected boolean:=false;
begin
  begin
    perform * from public.kontrola_registrar_generacion_r7(
      'COR_01_COR','LP26-88003',repeat('c',64),now());
  exception when others then rejected:=true;end;
  perform test.assert(rejected,'no convertir histórico sin huella en registro R7');
end$r7$;

-- PDF sustituido, almacén equivocado, fecha previa a publicación: denegación.
do $r7$
declare rejected boolean;
begin
  rejected:=false;
  begin
    perform * from public.kontrola_registrar_generacion_r7(
      'COR_01_COR','LP26-88002',repeat('d',64),now());
  exception when others then rejected:=true;end;
  perform test.assert(rejected,'rechazo del hash de una revisión ajena');

  rejected:=false;
  begin
    perform * from public.kontrola_registrar_generacion_r7(
      'COR_02_NAR','LP26-88002',repeat('b',64),now());
  exception when others then rejected:=true;end;
  perform test.assert(rejected,'rechazo del almacén incorrecto');

  rejected:=false;
  begin
    perform * from public.kontrola_registrar_generacion_r7(
      'COR_01_COR','LP26-88002',repeat('b',64),now()-interval '1 day');
  exception when others then rejected:=true;end;
  perform test.assert(rejected,'marca local previa a la publicación');
end$r7$;

-- Ningún operario puede registrar ni consultar generaciones R7.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $r7$
declare rejected boolean:=false;
begin
  begin
    perform * from public.kontrola_registrar_generacion_r7(
      'COR_01_COR','LP26-88002',repeat('b',64),now());
  exception when others then rejected:=true;end;
  perform test.assert(rejected,'el operario no puede registrar impresión');
end$r7$;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select test.assert((select generaciones=1 from public.kontrola_estado_generacion_r7('COR_01_COR')
 where codigo='LP26-88001'),'consulta versión acreditada');
select test.assert((select generaciones=0 from public.kontrola_estado_generacion_r7('COR_01_COR')
 where codigo='LP26-88003'),'histórico sin huella no se atribuye a R7');
select 'VISURA_R7_SQL_OK' as resultado;
