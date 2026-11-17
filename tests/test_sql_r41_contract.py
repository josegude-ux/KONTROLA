"""VISURA F3A R4.1 -- inspección de contrato SQL SOLO ESTÁTICA.
No necesita ni abre PostgreSQL, no acredita compilación de PL/pgSQL.
Son comprobaciones NUEVAS específicas del reintento tras cambios de origen.
"""
from pathlib import Path
import re
import unittest
ROOT=Path(__file__).parents[1]
SQL=(ROOT/'docs/sql-no-ejecutar/VISURA_F3A_R4_1_FUENTE_CHECKS_CORRECCION_NO_EJECUTAR.sql').read_text()
ORIG=(ROOT/'docs/sql-no-ejecutar/VISURA_F3A_R4_FUENTE_CHECKS_PROPUESTA_NO_EJECUTAR.sql').read_text()

def body_of(sql):
 return sql.split('CREATE FUNCTION public.visura_f3a_registrar_check(',1)[1].split('REVOKE ALL ON FUNCTION public.visura_f3a_registrar_check(',1)[0]

class Tests(unittest.TestCase):
 def test_01_errores_original_recibo_posterior_a_fuente(self):
  b=body_of(ORIG)
  self.assertGreater(b.index('WHERE operacion_id=p_operacion'),b.index('FROM public.visura_p3_cargas p'))
 def test_02_version_R41_recibo_antes_de_fuente(self):
  b=body_of(SQL)
  self.assertLess(b.index('WHERE operacion_id=p_operacion'),b.index('FROM public.visura_p3_cargas p'))
 def test_03_validacion_autorizacion_precede_replay(self):
  b=body_of(SQL)
  self.assertLess(b.index('public.kontrola_usuario_activo()'),b.index('WHERE operacion_id=p_operacion'))
 def test_04_idempotencia_revalidada_tras_carrera(self):
  b=body_of(SQL)
  self.assertEqual(b.count('WHERE operacion_id=p_operacion'),2)
  self.assertTrue(b.index('FOR UPDATE')<b.rindex('WHERE operacion_id=p_operacion'))
 def test_05_mismo_uuid_otro_contenido_no_reutilizable(self):
  b=body_of(SQL)
  self.assertEqual(b.count("USING ERRCODE='23505'"),2)
  for item in ['actor','almacen','lp','pdf_hash','linea','estado','version_esperada']:
   self.assertGreaterEqual(b.count('v_repetida.'+item),2)
 def test_06_no_modificar_cargas_operativas(self):
  for tab in ['visura_p3_cargas','kontrola_cargas','kontrola_verificaciones','tanques_records','visura_f3a_estados']:
   self.assertNotRegex(SQL,rf'(?i)\b(?:UPDATE|INSERT\s+INTO|DELETE\s+FROM|DROP\s+TABLE|TRUNCATE)\s+(?:public\.)?{tab}\b')
 def test_07_permiso_RPC_no_habilitado(self):
  self.assertIn('REVOKE ALL ON FUNCTION public.visura_f3a_registrar_check(',SQL)
  self.assertNotRegex(SQL,r'(?i)GRANT\s+EXECUTE\s+ON\s+FUNCTION')
 def test_08_no_reactivar_R3(self):
  self.assertNotRegex(SQL,r'(?i)GRANT\s+EXECUTE\s+ON.*visura_f3a_(descartar_lote|restaurar)')
 def test_09_BOLA_roles_y_alamcen(self):
  b=body_of(SQL)
  for s in ['auth.uid()','is_anonymous','kontrola_usuario_activo()','kontrola_puede_almacen(p_almacen)',
    'kontrola_es_administrador()','kontrola_usuario_almacenes','kontrola_almacenes']:
   self.assertIn(s,b)
 def test_10_check_entidades_privadas_RLS(self):
  for t in ['visura_f3a_check_cargas','visura_f3a_check_eventos']:
   self.assertIn('ALTER TABLE public.'+t+' ENABLE ROW LEVEL SECURITY',SQL)
   self.assertRegex(SQL,rf'REVOKE ALL ON public\.visura_f3a_check_cargas,public\.visura_f3a_check_eventos')
 def test_11_fila_y_fuente_bloqueadas(self):
  b=body_of(SQL)
  self.assertIn('FROM public.visura_p3_cargas p',b)
  self.assertIn('FOR SHARE',b)
  self.assertIn('WHERE almacen=p_almacen AND lp=p_lp FOR UPDATE',b)
  self.assertIn("USING ERRCODE='40001'",b)
 def test_12_auditoria_inmutable(self):
  self.assertIn('BEFORE UPDATE OR DELETE ON public.visura_f3a_check_eventos',SQL)
  self.assertIn('UNIQUE(almacen,lp,version)',SQL)
  self.assertIn('operacion_id uuid PRIMARY KEY',SQL)
 def test_13_nunca_certificacion_fisica(self):
  b=body_of(SQL)
  self.assertIn("'verificacion_fisica_acreditada',FALSE",b)
  self.assertNotIn("'verificacion_fisica_acreditada',TRUE",b)
 def test_14_solo_contadores_reconstruidos_en_servidor(self):
  b=body_of(SQL)
  for s in ['SELECT DISTINCT ON (linea) linea,estado','v_checked:=COALESCE','v_incidencias:=COALESCE']:
   self.assertIn(s,b)
  for p in ['p_checked','p_pending','p_incidents','p_total','p_audit']:
   self.assertNotIn(p,b)
 def test_15_null_inputs_fallaron_cerrados(self):
  b=body_of(SQL)
  for s in ['p_almacen IS NULL','p_lp IS NULL','p_pdf_hash IS NULL','p_estado IS NULL']:
   self.assertIn(s,b)
 def test_16_el_original_no_es_reemplazado(self):
  self.assertTrue(ORIG.startswith('-- VISURA PREPARA'))
  self.assertIn('NO EJECUTAR EN SUPABASE ACTUAL',ORIG)
  self.assertIn('NO APLICAR EN SUPABASE ACTUAL',SQL)

if __name__=='__main__':unittest.main(verbosity=1)
