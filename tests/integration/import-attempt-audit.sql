\set ON_ERROR_STOP on
-- Solo ejecutar tras bootstrap, migraciones, workflow y revisions, en kontrola_test local.
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);

select count(*) as n from public.kontrola_importacion_eventos e
join public.kontrola_importaciones i on i.id=e.importacion_id
where i.codigo='LP26-50001' and e.tipo='reintento_importacion' \gset audit_before_

-- Hash y código ya asociados: la reserva no debe modificar originales ni crear otra fila.
select * from public.kontrola_reservar_importacion(
 'LP26-50001',repeat('1',64),'nuevo-nombre-mismo-contenido.pdf',1000
) \gset audit_duplicate_
select test.assert(:'audit_duplicate_repetida'='t','el hash conocido debe devolverse como repetido');
select test.assert((
 select count(*)=(:audit_before_n)::bigint+1
 from public.kontrola_importacion_eventos e
 join public.kontrola_importaciones i on i.id=e.importacion_id
 where i.codigo='LP26-50001' and e.tipo='reintento_importacion'
),'un intento repetido genera exactamente un evento adicional');
select test.assert((
 select count(*)=1 from public.kontrola_importaciones
 where codigo='LP26-50001' and documento_hash=repeat('1',64)
),'un reintento no puede crear un PDF duplicado');
select test.assert((
 select e.despues->>'archivo'='nuevo-nombre-mismo-contenido.pdf'
   and e.despues->>'hash'=repeat('1',64)
 from public.kontrola_importacion_eventos e
 where e.importacion_id=:'audit_duplicate_id' and e.tipo='reintento_importacion'
 order by e.id desc limit 1
),'el evento audita nombre, contenido y usuario');
select test.assert((
 select count(*)=1 from public.kontrola_importacion_eventos e
 where e.importacion_id=:'audit_duplicate_id' and e.tipo='reintento_importacion'
 and e.actor_id='00000000-0000-0000-0000-000000000001'
 and e.despues->>'archivo'='nuevo-nombre-mismo-contenido.pdf'
),'el intento queda asociado al administrador autenticado');

-- Un usuario operativo nunca debe poder registrar el evento por esta RPC.
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000002',false);
do $$
begin
 perform * from public.kontrola_reservar_importacion(
   'LP26-50001',repeat('1',64),'operario-prohibido.pdf',1000
 );
 raise exception 'ASSERTION FAILED: operario pudo reservar PDF';
exception when insufficient_privilege then null;
end$$;
select 'KONTROLA_REINTENTOS_AUDITORIA_OK' as result;
