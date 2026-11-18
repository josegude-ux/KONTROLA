-- Registro atómico de intentos de generación para impresión; sin confirmación física.
create table if not exists public.kontrola_impresiones (
 id bigint generated always as identity primary key,
 codigo text not null references public.kontrola_cargas(codigo),
 almacen text not null,
 usuario_id uuid not null references auth.users(id),
 generado_en timestamptz not null default now(),
 reimpresion boolean not null default false
);
create index if not exists kontrola_impresiones_codigo_idx on public.kontrola_impresiones(codigo, generado_en desc);
alter table public.kontrola_impresiones enable row level security;
revoke all on public.kontrola_impresiones from anon, authenticated;
create or replace function public.kontrola_estado_impresion(p_almacen text)
returns table(codigo text, intentos bigint)
language plpgsql stable security definer set search_path = ''
as $$
begin
 if not public.kontrola_es_administrador() or not public.kontrola_puede_almacen(p_almacen) then
  raise exception 'Sin permiso para consultar impresiones' using errcode='42501';
 end if;
 return query select i.codigo,count(*)::bigint from public.kontrola_impresiones i
 where i.almacen=p_almacen group by i.codigo;
end;$$;
revoke all on function public.kontrola_estado_impresion(text) from public,anon;
grant execute on function public.kontrola_estado_impresion(text) to authenticated;

create or replace function public.kontrola_registrar_lote_impresion(p_almacen text,p_codigos text[],p_reimprimir boolean default false)
returns table(codigo text, intentos bigint)
language plpgsql volatile security definer set search_path = ''
as $$
declare n integer;
begin
 if not public.kontrola_es_administrador() or not public.kontrola_puede_almacen(p_almacen) then
  raise exception 'Sin permiso para registrar impresiones' using errcode='42501';
 end if;
 n:=coalesce(array_length(p_codigos,1),0);
 if n<1 or n>20 or exists(select 1 from unnest(p_codigos) x where x is null)
    or (select count(distinct x) from unnest(p_codigos) x)<>n then
  raise exception 'Selecciona entre 1 y 20 cargas diferentes';
 end if;
 -- Bloquea las cargas en orden estable: dos dispositivos no registran el primer intento a la vez.
 perform 1 from public.kontrola_cargas c
 where c.codigo=any(p_codigos) and c.almacen=p_almacen
   and c.fecha=(now() at time zone 'Europe/Madrid')::date
 order by c.codigo for update;
 if (select count(*) from public.kontrola_cargas c where c.codigo=any(p_codigos)
   and c.almacen=p_almacen and c.fecha=(now() at time zone 'Europe/Madrid')::date)<>n then
  raise exception 'Alguna carga no corresponde a hoy o al almacén';
 end if;
 if not p_reimprimir and exists(select 1 from public.kontrola_impresiones i where i.codigo=any(p_codigos)) then
  raise exception 'Hay cargas ya generadas. Actualiza la lista o utiliza Reimprimir.';
 end if;
 if p_reimprimir and exists(select 1 from unnest(p_codigos) x
   where not exists(select 1 from public.kontrola_impresiones i where i.codigo=x)) then
  raise exception 'La reimpresión solo admite cargas ya generadas.';
 end if;
 insert into public.kontrola_impresiones(codigo,almacen,usuario_id,reimpresion)
 select x,p_almacen,auth.uid(),p_reimprimir from unnest(p_codigos) x;
 return query select i.codigo,count(*)::bigint from public.kontrola_impresiones i
 where i.codigo=any(p_codigos) group by i.codigo;
end;$$;
revoke all on function public.kontrola_registrar_lote_impresion(text,text[],boolean) from public,anon;
grant execute on function public.kontrola_registrar_lote_impresion(text,text[],boolean) to authenticated;
