-- VISURA 200 · encargo de 000 (VISURA-000-CP-REVISION-FUNCIONES-ANON-KONTROLA-20261121-035).
-- Retira EXECUTE sobrante a anon y PUBLIC en 5 funciones SECURITY DEFINER de public.
-- Cada función y cada rol se comprueba antes: si no existe en la base, se omite con un aviso (p. ej. la CI del repositorio).
-- No cambia el cuerpo de ninguna función. No aplicar sin AUTORIZO.

do $$
declare
  rec record;
  r text;
begin
  for rec in
    select * from (values
      ('public.es_administrador()',                   array['anon'],                 array['authenticated','service_role']),
      ('public.usuario_autorizado()',                 array['anon'],                 array['authenticated','service_role']),
      ('public.kontrola_finalizar_preparacion(text)', array['anon'],                 array['authenticated','service_role']),
      -- Funciones de disparador: no se llaman por RPC; el disparador no necesita EXECUTE de anon ni de authenticated.
      ('public.kontrola_asignar_bultos_publicados()', array['anon','authenticated'], array[]::text[]),
      ('public.kontrola_incidente_auditar()',         array['anon','authenticated'], array[]::text[])
    ) as t(sig, revoke_roles, grant_roles)
  loop
    if to_regprocedure(rec.sig) is null then
      raise notice 'Omitido: % no existe en esta base', rec.sig;
      continue;
    end if;
    execute format('revoke execute on function %s from public', rec.sig);
    foreach r in array rec.revoke_roles loop
      if exists (select 1 from pg_roles where rolname = r) then
        execute format('revoke execute on function %s from %I', rec.sig, r);
      else
        raise notice 'Rol % no existe en esta base; se omite el revoke de %', r, rec.sig;
      end if;
    end loop;
    foreach r in array rec.grant_roles loop
      if exists (select 1 from pg_roles where rolname = r) then
        execute format('grant execute on function %s to %I', rec.sig, r);
      else
        raise notice 'Rol % no existe en esta base; se omite el grant de %', r, rec.sig;
      end if;
    end loop;
  end loop;
end $$;
