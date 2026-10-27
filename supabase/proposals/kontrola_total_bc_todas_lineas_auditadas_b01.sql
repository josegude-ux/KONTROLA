-- VISURA PREPARA / B01: cierre conservador de la cobertura de cantidades BC.
-- PROPUESTA OPTATIVA y NO APLICADA. Ejecutar solo sobre PostgreSQL de prueba.
-- Complementa PR #69 tras instalar su helper original; no altera tablas,
-- permisos, PDFs, Business Central ni las funciones de publicación existentes.
-- La RPC de PR #69 llama a esta función en revisión y publicación.
begin;

create or replace function public.kontrola_total_bc_documentado(
 p_carga jsonb,p_correcciones jsonb
)
returns boolean
language plpgsql stable security invoker set search_path=''
as $$
declare
 v_count integer;
 v_pos integer;
 v_prod jsonb;
 v_actual text;
 v_original text;
 v_corr jsonb;
 v_valid boolean;
 v_has_bc boolean:=false;
begin
 if jsonb_typeof(p_carga->'productos')<>'array'
    or jsonb_typeof(p_correcciones)<>'array' then return false;end if;
 v_count:=jsonb_array_length(p_carga->'productos');
 if v_count=0 then return false;end if;

 -- En un documento cuyo total operativo discrepa, TODAS las líneas cuyo
 -- qty cambia respecto de pdfOriginal deben quedar justificadas. La
 -- existencia de UNA corrección BC nunca cubre cambios de otras líneas.
 for v_pos in 1..v_count loop
  v_prod:=p_carga->'productos'->(v_pos-1);
  if jsonb_typeof(v_prod)<>'object' then return false;end if;
  v_actual:=coalesce(v_prod->>'qty','');
  v_original:=coalesce(v_prod#>>'{pdfOriginal,qty}',v_actual);

  if v_actual !~ '^[0-9]+([.][0-9]{1,3})?$'
    or v_original !~ '^[0-9]+([.][0-9]{1,3})?$' then return false;end if;

  if v_original::numeric<>v_actual::numeric then
   v_valid:=false;
   for v_corr in select value from jsonb_array_elements(p_correcciones) loop
    if coalesce(v_corr->>'line','')<>v_pos::text
      or v_corr->>'field'<>'qty'
      or v_corr->>'tipo' not in ('dato_pdf_bc','lectura_pdf')
      or coalesce(v_corr->>'before','') !~ '^[0-9]+([.][0-9]{1,3})?$'
      or coalesce(v_corr->>'after','') !~ '^[0-9]+([.][0-9]{1,3})?$'
      or length(trim(coalesce(v_corr->>'justificacion','')))<15
      or coalesce(v_corr->>'by','') !~ '^[a-fA-F0-9]{8}(-[a-fA-F0-9]{4}){3}-[a-fA-F0-9]{12}$'
      or coalesce(v_corr->>'at','') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}'
    then continue;end if;
    if (v_corr->>'after')::numeric=v_actual::numeric then
      v_valid:=true;
      if v_corr->>'tipo'='dato_pdf_bc' then v_has_bc:=true;end if;
    end if;
   end loop;
   if not v_valid then return false;end if;
  end if;
 end loop;
 return v_has_bc;
end;
$$;

-- Helper interno: no crear permisos de llamada directa para clientes.
revoke all on function public.kontrola_total_bc_documentado(jsonb,jsonb)
  from public,anon,authenticated;
commit;
