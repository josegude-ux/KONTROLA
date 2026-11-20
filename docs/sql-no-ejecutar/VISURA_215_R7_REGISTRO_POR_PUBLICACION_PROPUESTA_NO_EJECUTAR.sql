-- VISURA-215 R7 · PROPUESTA EXCLUSIVAMENTE DOCUMENTAL — NO EJECUTAR
-- Corrige el desajuste observado en la función instalada de Supabase:
-- el panel usa publicado_en, pero el registro vigente exige c.fecha=hoy (fecha BC).
-- No se ha autorizado aplicar esta modificación a la base de datos.
-- Requiere homologación SQL con usuarios/roles ficticios y revisión 00.
begin;

create or replace function public.kontrola_registrar_lote_impresion(
 p_almacen text,p_codigos text[],p_reimprimir boolean default false
)
returns table(codigo text,intentos bigint)
language plpgsql volatile security definer set search_path = ''
as $fn$
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
 -- Bloqueo estable para evitar dos generaciones concurrentes de la misma LP.
 perform 1 from public.kontrola_cargas c
 where c.codigo=any(p_codigos) and c.almacen=p_almacen
   and c.estado='publicada'
   and (c.publicado_en at time zone 'Europe/Madrid')::date =
       (now() at time zone 'Europe/Madrid')::date
 order by c.codigo for update;
 if (select count(*) from public.kontrola_cargas c
     where c.codigo=any(p_codigos) and c.almacen=p_almacen
       and c.estado='publicada'
       and (c.publicado_en at time zone 'Europe/Madrid')::date =
           (now() at time zone 'Europe/Madrid')::date)<>n then
  raise exception 'Alguna carga no fue publicada hoy o no pertenece al almacén';
 end if;
 if not p_reimprimir and exists(select 1 from public.kontrola_impresiones i
   where i.codigo=any(p_codigos) and i.almacen=p_almacen) then
  raise exception 'Hay cargas ya generadas. Actualiza o utiliza Reimprimir.';
 end if;
 if p_reimprimir and exists(select 1 from unnest(p_codigos) x
   where not exists(select 1 from public.kontrola_impresiones i
     where i.codigo=x and i.almacen=p_almacen)) then
  raise exception 'La reimpresión solo admite cargas ya generadas.';
 end if;
 insert into public.kontrola_impresiones(codigo,almacen,usuario_id,reimpresion)
 select x,p_almacen,auth.uid(),p_reimprimir from unnest(p_codigos) x;
 return query select i.codigo,count(*)::bigint
 from public.kontrola_impresiones i
 where i.codigo=any(p_codigos) and i.almacen=p_almacen
 group by i.codigo;
end;
$fn$;

revoke all on function public.kontrola_registrar_lote_impresion(text,text[],boolean) from public,anon;
grant execute on function public.kontrola_registrar_lote_impresion(text,text[],boolean) to authenticated;
commit;
-- NO EJECUTADO. No cambiar producción ni migraciones desplegadas.
