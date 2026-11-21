-- VISURA 200 · encargo de 000 (VISURA-000-CP-REVISION-FUNCIONES-ANON-KONTROLA-20261121-035).
-- Retira EXECUTE sobrante a anon y PUBLIC en 5 funciones SECURITY DEFINER de public.
-- Cada sentencia solo se ejecuta si la función existe: en una base sin ellas (p. ej. la CI del repositorio) se omite con un aviso.
-- No cambia el cuerpo de ninguna función. No aplicar sin AUTORIZO.

do $$ begin
  if to_regprocedure('public.es_administrador()') is null then
    raise notice 'Omitido: public.es_administrador() no existe en esta base';
  else
    revoke execute on function public.es_administrador() from public, anon;
    grant execute on function public.es_administrador() to authenticated, service_role;
  end if;
end $$;

do $$ begin
  if to_regprocedure('public.usuario_autorizado()') is null then
    raise notice 'Omitido: public.usuario_autorizado() no existe en esta base';
  else
    revoke execute on function public.usuario_autorizado() from public, anon;
    grant execute on function public.usuario_autorizado() to authenticated, service_role;
  end if;
end $$;

do $$ begin
  if to_regprocedure('public.kontrola_finalizar_preparacion(text)') is null then
    raise notice 'Omitido: public.kontrola_finalizar_preparacion(text) no existe en esta base';
  else
    revoke execute on function public.kontrola_finalizar_preparacion(text) from public, anon;
    grant execute on function public.kontrola_finalizar_preparacion(text) to authenticated, service_role;
  end if;
end $$;

-- Funciones de disparador: no se llaman por RPC; el disparador no necesita EXECUTE de anon, PUBLIC ni authenticated.
do $$ begin
  if to_regprocedure('public.kontrola_asignar_bultos_publicados()') is null then
    raise notice 'Omitido: public.kontrola_asignar_bultos_publicados() no existe en esta base';
  else
    revoke execute on function public.kontrola_asignar_bultos_publicados() from public, anon, authenticated;
  end if;
end $$;

do $$ begin
  if to_regprocedure('public.kontrola_incidente_auditar()') is null then
    raise notice 'Omitido: public.kontrola_incidente_auditar() no existe en esta base';
  else
    revoke execute on function public.kontrola_incidente_auditar() from public, anon, authenticated;
  end if;
end $$;
