\set ON_ERROR_STOP on

drop schema if exists storage cascade;
drop schema if exists auth cascade;
drop schema if exists public cascade;
create schema public;
create schema auth;
create schema storage;
create schema test;

do $$begin
 if not exists(select 1 from pg_roles where rolname='anon') then create role anon nologin;end if;
 if not exists(select 1 from pg_roles where rolname='authenticated') then create role authenticated nologin;end if;
end$$;
grant usage on schema public,auth,storage to anon,authenticated;

create or replace function test.assert(condition boolean,message text)
returns void language plpgsql
as $$begin if condition is not true then raise exception 'ASSERTION FAILED: %',message;end if;end$$;
grant usage on schema test to authenticated;
grant execute on function test.assert(boolean,text) to authenticated;

create table auth.users(
 id uuid primary key,
 email text unique,
 created_at timestamptz not null default now()
);
create or replace function auth.uid() returns uuid language sql stable
as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;
grant execute on function auth.uid() to public;

create table public.usuarios_app(
 id uuid primary key references auth.users(id),
 nombre text not null,
 rol text not null check(rol in ('operario','administrador')),
 activo boolean not null default true
);
alter table public.usuarios_app enable row level security;
grant select on public.usuarios_app to authenticated;
create policy usuarios_app_propio on public.usuarios_app for select to authenticated
 using(id=(select auth.uid()));

create table storage.buckets(
 id text primary key,
 name text not null,
 public boolean not null default false,
 file_size_limit bigint,
 allowed_mime_types text[]
);
create table storage.objects(
 id uuid primary key default gen_random_uuid(),
 bucket_id text not null references storage.buckets(id),
 name text not null,
 owner_id uuid,
 metadata jsonb not null default '{}'::jsonb,
 created_at timestamptz not null default now(),
 unique(bucket_id,name)
);
alter table storage.objects enable row level security;
grant select,insert,delete on storage.objects to authenticated;

insert into auth.users(id,email) values
 ('00000000-0000-0000-0000-000000000001','admin@example.test'),
 ('00000000-0000-0000-0000-000000000002','preparador@example.test'),
 ('00000000-0000-0000-0000-000000000003','verificador@example.test'),
 ('00000000-0000-0000-0000-000000000004','otro@example.test');
insert into public.usuarios_app(id,nombre,rol) values
 ('00000000-0000-0000-0000-000000000001','Admin Pruebas','administrador'),
 ('00000000-0000-0000-0000-000000000002','Operario Preparador','operario'),
 ('00000000-0000-0000-0000-000000000003','Operario Verificador','operario'),
 ('00000000-0000-0000-0000-000000000004','Operario Otro','operario');
