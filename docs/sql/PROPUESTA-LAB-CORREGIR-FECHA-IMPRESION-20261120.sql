-- SOLO PROPUESTA DOCUMENTAL DE LAB. NO APLICAR SIN VERIFICAR ESQUEMA, BACKUP Y AUTORIZACIÓN.
-- La pantalla de impresión muestra cargas PUBLICADAS HOY (publicado_en Europe/Madrid),
-- pero la función histórica comprueba c.fecha = hoy (fecha de Business Central).
-- Este borrador conserva roles, RLS, límite 20, exclusión de duplicados y lock atómico.
-- Validar firmas y función realmente desplegada ANTES de considerar una migración.
create or replace function public.kontrola_registrar_lote_impresion(
  p_almacen text,p_codigos text[],p_reimprimir boolean default false)
returns table(codigo text, intentos bigint)
language plpgsql volatile security definer set search_path = ''
as $$
declare n integer; dia date;
begin
  if (select auth.uid()) is null
    or not public.kontrola_es_administrador()
    or not public.kontrola_puede_almacen(p_almacen) then
    raise exception 'Sin permiso para registrar impresiones' using errcode='42501';
  end if;
  dia := (now() at time zone 'Europe/Madrid')::date;
  n := coalesce(array_length(p_codigos,1),0);
  if n<1 or n>20 or exists(select 1 from unnest(p_codigos) x where x is null)
    or (select count(distinct x) from unnest(p_codigos) x)<>n then
    raise exception 'Selecciona entre 1 y 20 cargas diferentes';
  end if;
  -- Se bloquean las LP válidas en orden estable, igual que el contrato vigente.
  perform 1 from public.kontrola_cargas c
    where c.codigo=any(p_codigos) and c.almacen=p_almacen
      and c.estado='publicada'
      and (c.publicado_en at time zone 'Europe/Madrid')::date=dia
    order by c.codigo for update;
  if (select count(*) from public.kontrola_cargas c
    where c.codigo=any(p_codigos) and c.almacen=p_almacen
      and c.estado='publicada'
      and (c.publicado_en at time zone 'Europe/Madrid')::date=dia)<>n then
    raise exception 'Alguna carga no fue publicada hoy o no pertenece al almacén';
  end if;
  if not p_reimprimir and exists(
    select 1 from public.kontrola_impresiones i where i.codigo=any(p_codigos)
  ) then
    raise exception 'Hay cargas ya generadas. Actualiza o utiliza Reimprimir.';
  end if;
  if p_reimprimir and exists(
    select 1 from unnest(p_codigos) x
    where not exists(select 1 from public.kontrola_impresiones i where i.codigo=x)
  ) then
    raise exception 'La reimpresión solo admite cargas ya generadas.';
  end if;
  insert into public.kontrola_impresiones(codigo,almacen,usuario_id,reimpresion)
    select x,p_almacen,(select auth.uid()),p_reimprimir from unnest(p_codigos) x;
  return query select i.codigo,count(*)::bigint from public.kontrola_impresiones i
    where i.codigo=any(p_codigos) group by i.codigo;
end;
$$;
revoke all on function public.kontrola_registrar_lote_impresion(text,text[],boolean) from public,anon;
grant execute on function public.kontrola_registrar_lote_impresion(text,text[],boolean) to authenticated;
