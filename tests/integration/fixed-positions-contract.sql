\set ON_ERROR_STOP on
-- Exclusivo a PostgreSQL 16 efímero de GitHub Actions. NO USAR contra bases reales.
create schema auth;
create schema visura_reporting;
create schema test;
do $$begin
  if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;
  if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;
end$$;
grant usage on schema auth,public,visura_reporting,test to authenticated;
grant usage on schema public,test to anon;
create or replace function auth.uid() returns uuid language sql stable
 as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant execute on function auth.uid() to authenticated;
create or replace function test.assert(pass boolean,reason text) returns void
language plpgsql as $$begin if pass is distinct from true then raise exception 'ASSERTION: %',reason;end if;end$$;
grant execute on function test.assert(boolean,text) to authenticated,anon;

create table public.profiles(user_id uuid primary key,role text not null,enabled boolean not null);
create table public.products(code text primary key,description text not null,unit text not null);
create table public.bc_import_batches(
  id uuid primary key,warehouse text not null,status text not null,
  expected_rows integer not null,stock_rows integer not null
);
create table public.bc_import_lines(
  import_id uuid not null references public.bc_import_batches(id),
  product_code text not null,location_code text not null,
  lot text not null,quantity numeric not null,unit text not null
);
create table visura_reporting.warehouse_access(
  user_id uuid not null,warehouse text not null,primary key(user_id,warehouse)
);
create table visura_reporting.import_state(
  warehouse text primary key,import_id uuid references public.bc_import_batches(id),
  source_file text not null,imported_at timestamptz,
  stock_complete boolean not null,catalog_complete boolean not null,
  positions_complete boolean not null,locations_complete boolean not null,
  omitted_zero_certified boolean not null,stale boolean not null,max_age_hours integer
);
create table visura_reporting.locations_by_warehouse(
  warehouse text not null,location_code text not null,aisle text,zone text,
  primary key(warehouse,location_code)
);
create table visura_reporting.fixed_by_warehouse(
  warehouse text not null,product_code text not null,location_code text not null,
  primary key(warehouse,product_code,location_code)
);
insert into public.profiles values
 ('00000000-0000-0000-0000-000000000001','admin',true),
 ('00000000-0000-0000-0000-000000000002','operator',true),
 ('00000000-0000-0000-0000-000000000003','admin',false);
insert into visura_reporting.warehouse_access values
 ('00000000-0000-0000-0000-000000000001','COR_01_COR'),
 ('00000000-0000-0000-0000-000000000002','COR_01_COR'),
 ('00000000-0000-0000-0000-000000000003','COR_01_COR');
insert into public.products values ('PRD001','Ejemplo prueba','UD'),('PRD002','Sin fija','UD');
insert into public.bc_import_batches values
 ('00000000-0000-0000-0000-000000000101','COR_01_COR','committed',3,3),
 ('00000000-0000-0000-0000-000000000102','COR_02_NAR','committed',1,1);
insert into public.bc_import_lines values
 ('00000000-0000-0000-0000-000000000101','PRD001','A01-P01','L1',0,'UD'),
 ('00000000-0000-0000-0000-000000000101','PRD001','B02-P01','L2',20,'UD'),
 ('00000000-0000-0000-0000-000000000101','PRD002','B04-P01','L1',-2,'UD'),
 ('00000000-0000-0000-0000-000000000102','PRD001','A01-P01','L1',999,'UD');
insert into visura_reporting.import_state values
 ('COR_01_COR','00000000-0000-0000-0000-000000000101','BC_TEST_COR1.xlsx',now()-interval '1 hour',true,true,true,true,false,false,48),
 ('COR_02_NAR','00000000-0000-0000-0000-000000000102','BC_TEST_COR2.xlsx',now(),true,true,true,true,false,false,48);
insert into visura_reporting.locations_by_warehouse values
 ('COR_01_COR','A01-P01','A01','Z1'),('COR_01_COR','B02-P01','B02','RESERVA'),
 ('COR_01_COR','B04-P01','B04','RESERVA'),('COR_02_NAR','A01-P01','A01','Z2');
insert into visura_reporting.fixed_by_warehouse values
 ('COR_01_COR','PRD001','A01-P01'),('COR_02_NAR','PRD001','A01-P01');

-- Política de acceso propia del proveedor; nunca bastan GRANTs sin RLS.
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.bc_import_batches enable row level security;
alter table public.bc_import_lines enable row level security;
alter table visura_reporting.warehouse_access enable row level security;
alter table visura_reporting.import_state enable row level security;
alter table visura_reporting.locations_by_warehouse enable row level security;
alter table visura_reporting.fixed_by_warehouse enable row level security;

grant select on public.profiles,public.products,public.bc_import_batches,public.bc_import_lines to authenticated;
grant select on visura_reporting.warehouse_access,visura_reporting.import_state,
  visura_reporting.locations_by_warehouse,visura_reporting.fixed_by_warehouse to authenticated;
revoke all on public.profiles,public.products,public.bc_import_batches,public.bc_import_lines from anon;
revoke all on visura_reporting.warehouse_access,visura_reporting.import_state,
  visura_reporting.locations_by_warehouse,visura_reporting.fixed_by_warehouse from anon;

create policy profile_self on public.profiles for select to authenticated using(user_id=(select auth.uid()));
create policy warehouse_self on visura_reporting.warehouse_access for select to authenticated
 using(user_id=(select auth.uid()));
create policy products_admin on public.products for select to authenticated
 using(exists(select 1 from public.profiles p where p.user_id=(select auth.uid()) and p.role='admin' and p.enabled));
create policy batches_wh on public.bc_import_batches for select to authenticated
 using(exists(select 1 from visura_reporting.warehouse_access w
   join public.profiles p on p.user_id=w.user_id where w.user_id=(select auth.uid())
   and w.warehouse=warehouse and p.role='admin' and p.enabled));
create policy lines_wh on public.bc_import_lines for select to authenticated
 using(exists(select 1 from public.bc_import_batches b where b.id=import_id));
create policy state_wh on visura_reporting.import_state for select to authenticated
 using(exists(select 1 from visura_reporting.warehouse_access w
   join public.profiles p on p.user_id=w.user_id where w.user_id=(select auth.uid())
   and w.warehouse=warehouse and p.role='admin' and p.enabled));
create policy locations_wh on visura_reporting.locations_by_warehouse for select to authenticated
 using(exists(select 1 from visura_reporting.warehouse_access w
   join public.profiles p on p.user_id=w.user_id where w.user_id=(select auth.uid())
   and w.warehouse=warehouse and p.role='admin' and p.enabled));
create policy fixed_wh on visura_reporting.fixed_by_warehouse for select to authenticated
 using(exists(select 1 from visura_reporting.warehouse_access w
   join public.profiles p on p.user_id=w.user_id where w.user_id=(select auth.uid())
   and w.warehouse=warehouse and p.role='admin' and p.enabled));

\i supabase/proposals/visura_posiciones_fijas_central_rpc.sql

select test.assert(not has_function_privilege('anon','public.kontrola_admin_posiciones_fijas(text)','EXECUTE'),
  'anon no debe poder ejecutar RPC');
select test.assert(has_function_privilege('authenticated','public.kontrola_admin_posiciones_fijas(text)','EXECUTE'),
  'administradores autenticados requieren EXECUTE');

set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select test.assert((public.kontrola_admin_posiciones_fijas('COR_01_COR')->'meta'->>'stockComplete')='true','lote completo');
select test.assert((public.kontrola_admin_posiciones_fijas('COR_01_COR')->'meta'->>'stale')='false','fecha vigente');
select test.assert((public.kontrola_admin_posiciones_fijas('COR_01_COR')->'meta'->>'truncated')='false','sin recorte');
select test.assert((public.kontrola_admin_posiciones_fijas('COR_01_COR')->'meta'->>'absentStockIsZero')='false','ausente no es cero');
select test.assert(jsonb_array_length(public.kontrola_admin_posiciones_fijas('COR_01_COR')->'stock')=3,'3 lotes exactos');
select test.assert((public.kontrola_admin_posiciones_fijas('COR_01_COR')->'stock'->0->>'quantity')='0','suma no física');
select test.assert((public.kontrola_admin_posiciones_fijas('COR_01_COR')->'meta'->>'sourceFile')='BC_TEST_COR1.xlsx','origen trazable');
do $$begin
 perform public.kontrola_admin_posiciones_fijas('COR_02_NAR');
 raise exception 'ALMACÉN NO AUTORIZADO';
 exception when insufficient_privilege then null;
end$$;
do $$begin
 perform public.kontrola_admin_posiciones_fijas('bad;drop');
 raise exception 'ALMACÉN MAL FORMADO';
 exception when invalid_parameter_value then null;
end$$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000002';
do $$begin
 perform public.kontrola_admin_posiciones_fijas('COR_01_COR');
 raise exception 'OPERARIO AUTORIZADO ERRÓNEAMENTE';
 exception when insufficient_privilege then null;
end$$;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000003';
do $$begin
 perform public.kontrola_admin_posiciones_fijas('COR_01_COR');
 raise exception 'CUENTA DESHABILITADA AUTORIZADA';
 exception when insufficient_privilege then null;
end$$;
reset role;
update public.bc_import_batches set expected_rows=4 where id='00000000-0000-0000-0000-000000000101';
update visura_reporting.import_state set stale=true where warehouse='COR_01_COR';
set role authenticated;
set request.jwt.claim.sub='00000000-0000-0000-0000-000000000001';
select test.assert((public.kontrola_admin_posiciones_fijas('COR_01_COR')->'meta'->>'stockComplete')='false','lote incompleto no puede presentarse válido');
select test.assert((public.kontrola_admin_posiciones_fijas('COR_01_COR')->'meta'->>'stale')='true','importación obsoleta');
reset role;
select test.assert((select count(*) from public.bc_import_lines)=4,'sin modificar datos al consultar');
select 'VISURA_FIJOS_RPC_SECURITY_OK' as result;
