-- VISURA 200 · reversión de 20261121_kontrola_retirar_execute_anon (autorizada por el usuario el 22/11/2026).
-- Restaura EXECUTE para public, anon, authenticated y service_role en las 5 funciones, como antes de esa migración.
-- Cada función y cada rol se comprueba antes; si no existen en la base, se omiten con aviso. Sin cambios de cuerpo.

do $$
declare
  rec record;
  r text;
begin
  for rec in
    select * from (values
      ('public.es_administrador()'),
      ('public.usuario_autorizado()'),
      ('public.kontrola_finalizar_preparacion(text)'),
      ('public.kontrola_asignar_bultos_publicados()'),
      ('public.kontrola_incidente_auditar()')
    ) as t(sig)
  loop
    if to_regprocedure(rec.sig) is null then
      raise notice 'Omitido: % no existe en esta base', rec.sig;
      continue;
    end if;
    execute format('grant execute on function %s to public', rec.sig);
    foreach r in array array['anon','authenticated','service_role'] loop
      if exists (select 1 from pg_roles where rolname = r) then
        execute format('grant execute on function %s to %I', rec.sig, r);
      else
        raise notice 'Rol % no existe en esta base; se omite el grant de %', r, rec.sig;
      end if;
    end loop;
  end loop;
end $$;
