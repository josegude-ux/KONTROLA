# KONTROLA: menu principal e integracion modular

Fecha: 25-10-2026. Plan de diseño, sin cambios de produccion.

## Decision funcional
KONTROLA sera la aplicacion principal para los operarios. Control de Cargas sera un submenu integrado y Control de Tanques sera un submenu **solo cuando este operativo**; mientras tanto permanece totalmente oculto. INVENTA mantiene su propia interfaz, aunque en el futuro pueda compartir Supabase y autenticacion. Control de Tanques sigue en pausa.

## Propuesta para el menu movil
- Preparacion: funcionalidad ya programada en PR #2.
- Verificacion: funcionalidad ya programada en PR #2.
- Control de Cargas: nuevo submenu para integrar gradualmente funciones del sistema actual, sin duplicar la preparacion ni el importador PDF ya existentes.
- Control de Tanques: modulo futuro **completamente oculto** en el menu para todos los usuarios hasta que se implemente, pruebe y autorice su activacion. No mostrar «Proximamente», accesos deshabilitados ni enlaces.
- Administracion: acceso solo a perfiles autorizados.
- Ajustes, perfil y version.

Respetar la identidad visual aprobada y los permisos por modulo y almacen (Coruna/Ferrol). No mostrar acciones operativas que todavia no funcionen. La disposicion exacta de las nuevas opciones se revisara con el usuario.

## Ruta de trabajo
1. Mantener las pantallas ya existentes de KONTROLA. Diseñar la navegacion por modulos sin cambiar las operaciones actuales.
2. Inventariar funciones de Control de Cargas y conectarlas por fases, reutilizando los flujos ya programados.
3. Preparar un acceso unico por trabajador con permisos diferenciados. Los proyectos existentes siguen independientes hasta validacion.
4. Preparar una migracion incremental hacia el Supabase elegido (INVENTA es candidato), con mapa de usuarios, registros, permisos, PDF y respaldo/restauracion.
5. Ejecutar ensayos sin coste adicional en PostgreSQL descartable de GitHub Actions o Supabase local. Ninguna prueba de este tipo sustituye las pruebas completas de Auth y Storage.
6. Solo con nueva autorizacion, migrar bases reales tras las pruebas. No pausar ni eliminar proyectos automaticamente.
7. Incorporar Control de Tanques mas adelante, conservando las tablas historicas existentes y definiendo permisos propios.

## Limites
Este documento no autoriza cambios en produccion, ejecucion de migraciones, gastos, cambios de permisos reales, fusion a main ni reactivacion del proyecto de Tanques. KONTROLA v0.3.1 de PR #2 sigue pendiente de validacion en Supabase real y moviles.

Relacionado: docs/ESTUDIO_UNIFICACION_SUPABASE.md y docs/CONTINUIDAD.md.
