-- VISURA 200 · encargo de 000 (VISURA-000-CP-REVISION-FUNCIONES-ANON-KONTROLA-20261121-035).
-- Retira EXECUTE sobrante a anon y PUBLIC en 5 funciones SECURITY DEFINER de public.
-- No cambia el cuerpo de ninguna función. No aplicar sin AUTORIZO.

revoke execute on function public.es_administrador() from public, anon;
revoke execute on function public.usuario_autorizado() from public, anon;
revoke execute on function public.kontrola_finalizar_preparacion(text) from public, anon;
revoke execute on function public.kontrola_asignar_bultos_publicados() from public, anon;
revoke execute on function public.kontrola_incidente_auditar() from public, anon;

-- Funciones de disparador: no se llaman por RPC; el disparador no necesita EXECUTE de authenticated.
revoke execute on function public.kontrola_asignar_bultos_publicados() from authenticated;
revoke execute on function public.kontrola_incidente_auditar() from authenticated;

-- Las 3 que sí se usan por RPC o desde políticas siguen disponibles para authenticated y service_role.
grant execute on function public.es_administrador() to authenticated, service_role;
grant execute on function public.usuario_autorizado() to authenticated, service_role;
grant execute on function public.kontrola_finalizar_preparacion(text) to authenticated, service_role;
