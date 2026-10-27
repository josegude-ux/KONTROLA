-- VISURA PREPARA / EXCELL: PROPUESTA NO APLICADA.
-- Objetivo: adaptador RPC central INVOCADOR, no conexión directa entre Supabase.
-- PRECONDICIÓN: arquitectura unificada expresamente autorizada y comprobada.
-- Tablas requeridas en el proyecto central:
-- public.profiles(user_id,role,enabled) con RLS
-- public.products(code,description,unit) catálogo MAESTRO, con RLS
-- public.bc_import_batches(id,warehouse,status,expected_rows,stock_rows), con RLS
-- public.bc_import_lines(import_id,product_code,location_code,lot,quantity,unit), con RLS
-- visura_reporting.warehouse_access(user_id,warehouse), RLS
-- visura_reporting.import_state(warehouse,import_id,source_file,imported_at,
--     stock_complete,catalog_complete,positions_complete,locations_complete,
--     omitted_zero_certified,stale,max_age_hours), RLS
-- visura_reporting.fixed_by_warehouse(warehouse,product_code,location_code), RLS
-- visura_reporting.locations_by_warehouse(warehouse,location_code,aisle,zone), RLS
-- Estas relaciones DEBEN derivar de una única fuente maestra verificable por almacén.
-- No son una instrucción para duplicar datos maestros de INVENTA.
-- Atención: NO aplicar hasta resolver los IDs de usuarios y las posiciones existentes.
-- Esta función es de solo lectura, no corrige ni altera stock.

create or replace function public.kontrola_admin_posiciones_fijas(p_almacen text)
returns jsonb
language plpgsql stable security invoker set search_path = ''
as $rpc$
declare
  v_wh text := upper(btrim(p_almacen));
  v_state record;
  v_batch record;
  v_products jsonb;
  v_locations jsonb;
  v_fixed jsonb;
  v_stock jsonb;
  v_qty bigint;
  v_complete boolean;
  v_stale boolean;
begin
  if p_almacen is null or v_wh !~ '^[A-Z0-9_]{3,40}$' then
    raise exception 'Código de almacén inválido' using errcode='22023';
  end if;
  if (select auth.uid()) is null or not exists(
     select 1 from public.profiles p
     where p.user_id=(select auth.uid())
       and p.enabled=true and p.role='admin'
  ) then
    raise exception 'Solo Administración puede consultar posiciones fijas'
      using errcode='42501';
  end if;
  if not exists(
     select 1 from visura_reporting.warehouse_access a
     where a.user_id=(select auth.uid()) and a.warehouse=v_wh
  ) then
    raise exception 'Sin permiso para este almacén' using errcode='42501';
  end if;
  select s.* into v_state
  from visura_reporting.import_state s where s.warehouse=v_wh;
  if not found then
    raise exception 'No existe importación acreditada para este almacén'
      using errcode='P0002';
  end if;
  select b.status,b.warehouse,b.expected_rows,b.stock_rows into v_batch
  from public.bc_import_batches b where b.id=v_state.import_id;
  if not found or v_batch.warehouse is distinct from v_wh then
    raise exception 'La importación no corresponde al almacén'
      using errcode='22023';
  end if;
  select count(*) into v_qty from public.bc_import_lines
    where import_id=v_state.import_id;
  if v_qty>100000 then
    raise exception 'Informe demasiado grande; utilizar extracción administrativa por lotes verificados'
      using errcode='54000';
  end if;
  -- Contrato: jamás devolver lotes recortados como si fueran completos.
  v_complete := v_batch.status='committed'
    and v_batch.stock_rows=v_qty
    and v_batch.expected_rows=v_qty
    and v_state.stock_complete=true;
  v_stale := coalesce(v_state.stale,true)
    or v_state.imported_at is null
    or v_state.max_age_hours is null
    or v_state.max_age_hours<=0
    or now()>v_state.imported_at+make_interval(hours=>greatest(v_state.max_age_hours,0));
  select coalesce(jsonb_agg(jsonb_build_object(
    'code',p.code,'description',p.description,'unit',p.unit
  ) order by p.code),'[]'::jsonb) into v_products
  from public.products p;
  select coalesce(jsonb_agg(jsonb_build_object(
    'warehouse',l.warehouse,'code',l.location_code,
    'aisle',l.aisle,'zone',l.zone
  ) order by l.location_code),'[]'::jsonb) into v_locations
  from visura_reporting.locations_by_warehouse l where l.warehouse=v_wh;
  select coalesce(jsonb_agg(jsonb_build_object(
    'warehouse',f.warehouse,'product_code',f.product_code,
    'location_code',f.location_code
  ) order by f.product_code,f.location_code),'[]'::jsonb) into v_fixed
  from visura_reporting.fixed_by_warehouse f where f.warehouse=v_wh;
  select coalesce(jsonb_agg(jsonb_build_object(
    'warehouse',v_wh,'product_code',x.product_code,
    'location_code',x.location_code,'lot',x.lot,
    'quantity',x.quantity::text,'unit',x.unit
  ) order by x.product_code,x.location_code,x.lot),'[]'::jsonb) into v_stock
  from public.bc_import_lines x where x.import_id=v_state.import_id;
  return jsonb_build_object(
    'warehouse',v_wh,
    'meta',jsonb_build_object(
      'warehouse',v_wh,'authorized',true,'truncated',false,
      'sourceFile',v_state.source_file,'importedAt',v_state.imported_at,
      'stockComplete',v_complete,
      'catalogComplete',v_state.catalog_complete,
      'positionsComplete',v_state.positions_complete,
      'locationsComplete',v_state.locations_complete,
      'absentStockIsZero',v_state.omitted_zero_certified,
      'stale',v_stale
    ),
    'products',v_products,'locations',v_locations,
    'fixed',v_fixed,'stock',v_stock
  );
end;
$rpc$;

revoke all on function public.kontrola_admin_posiciones_fijas(text) from public, anon;
grant execute on function public.kontrola_admin_posiciones_fijas(text) to authenticated;
