-- VISURA PREPARA B01 - Guard de evidencia BC en movimientos que suman cero.
-- PROPUESTA SIN APLICAR. Se apila sobre #72; PostgreSQL efímero para pruebas.
-- Este parche NO reemplaza la definición de public.kontrola_publicar_importacion.
begin;

create or replace function public.kontrola_corregir_importacion(
 p_importacion uuid,p_carga jsonb,p_hallazgos jsonb,p_correcciones jsonb,p_confirmar_advertencias boolean
)
returns text language plpgsql security definer set search_path=''
as $$
declare v_user uuid:=auth.uid();v_row public.kontrola_importaciones%rowtype;v_has_errors boolean;v_almacen text;v_bc boolean;v_bc_requested boolean:=false;
begin
 if v_user is null or not public.kontrola_es_administrador() then raise exception 'Solo administración puede corregir' using errcode='42501';end if;
 select i.* into v_row from public.kontrola_importaciones i where i.id=p_importacion for update;
 if not found or v_row.estado not in ('revision_requerida','aprobada') then raise exception 'Importación no editable' using errcode='22023';end if;
 if jsonb_typeof(p_carga) is distinct from 'object' or jsonb_typeof(p_carga->'productos') is distinct from 'array'
   or jsonb_typeof(p_hallazgos) is distinct from 'array' or jsonb_typeof(p_correcciones) is distinct from 'array' then
  raise exception 'Contenido corregido inválido' using errcode='22023';end if;
 v_almacen:=upper(nullif(p_carga->>'almacen',''));
 -- El total impreso es inmutable incluso cuando no haya una excepción BC.
 if (p_carga->>'declared_total') is distinct from (v_row.carga_datos->>'declared_total') then
  raise exception 'No se puede sustituir el total documental original' using errcode='22023';end if;
 v_bc:=public.kontrola_total_bc_documentado(p_carga,p_correcciones);
 select exists(
  select 1 from jsonb_array_elements(p_correcciones) c
  where c->>'field'='qty' and c->>'tipo'='dato_pdf_bc'
 ) into v_bc_requested;
 -- Proteger cambios BC incluso cuando aumentos y reducciones se compensen
 -- y el total final coincida exactamente con el PDF.
 if v_bc_requested and not public.kontrola_bc_origen_preservado(p_carga,v_row.carga_datos) then
  raise exception 'Las cantidades no conservan el origen del PDF' using errcode='22023';end if;
 v_has_errors:=exists(select 1 from jsonb_array_elements(p_hallazgos) h where h->>'severity'='error')
   or (v_bc_requested and not v_bc)
   or (
     coalesce(p_carga->>'actual_total','') ~ '^[0-9]+([.][0-9]{1,3})?$'
     and coalesce(p_carga->>'declared_total','') ~ '^[0-9]+([.][0-9]{1,3})?$'
     and abs((p_carga->>'actual_total')::numeric-(p_carga->>'declared_total')::numeric)>0.000001
     and not v_bc
   );
 update public.kontrola_importaciones set carga_datos=p_carga,hallazgos=p_hallazgos,
  almacen_detectado=v_almacen,correcciones=p_correcciones,advertencias_confirmadas=p_confirmar_advertencias,
  estado=case when not v_has_errors and p_confirmar_advertencias then 'aprobada' else 'revision_requerida' end,
  actualizado_por=v_user,actualizado_en=now()
 where id=p_importacion;
 insert into public.kontrola_importacion_eventos(importacion_id,tipo,antes,despues,actor_id)
 values(p_importacion,'corregida',v_row.carga_datos,p_carga,v_user);
 return case when not v_has_errors and p_confirmar_advertencias then 'aprobada' else 'revision_requerida' end;
end;
$$;
revoke all on function public.kontrola_corregir_importacion(uuid,jsonb,jsonb,jsonb,boolean) from public,anon;
grant execute on function public.kontrola_corregir_importacion(uuid,jsonb,jsonb,jsonb,boolean) to authenticated;

commit;
