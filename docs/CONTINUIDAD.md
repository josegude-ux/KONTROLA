# KONTROLA — Ficha maestra de continuidad

**Actualizada:** 2026-10-25  
**Repositorio:** `josegude-ux/KONTROLA`  
**Rama base:** `desarrollo/fase-1-operario`  
**Rama de este avance:** `cursor/verificacion-fisica-cargas-8ba0`  
**Pull requests:** Fase 1 [#1](https://github.com/josegude-ux/KONTROLA/pull/1) · verificación [#2](https://github.com/josegude-ux/KONTROLA/pull/2)

> Antes de continuar, inspeccionar la PR #1 y la PR #2. `main` no contiene la aplicación completa. No aplicar migraciones, desplegar, publicar documentos reales ni fusionar sin autorización.

## Implementación recuperada

- Autenticación Supabase contra el proyecto de Control de Cargas, separada de INVENTA.
- Roles `operario` y `administrador`, consulta de cargas, pasillos, ubicaciones y PDF privado.
- Motor PDF heredado de Control de Cargas v0.5.26 conservado.
- Apertura atómica de preparación, una carga activa por operario y un preparador por carga.
- Cierre automático de la preparación anterior al abrir otra carga.
- Publicación administrativa de PDF validado sin sobrescritura automática.

## Implementación realizada en este avance

- El perfil propio se obtiene mediante `kontrola_mi_perfil`; el navegador deja de consultar directamente `usuarios_app`.
- La última preparación puede finalizarse explícitamente con hora del servidor; cambiar de carga mantiene el cierre automático anterior.
- Todos los usuarios autorizados pueden abrir el flujo de verificación.
- SQL impide que una persona verifique una carga preparada por ella misma.
- Una sola persona verifica cada carga, línea por línea, con bloqueos transaccionales por carga y fila.
- Se guardan cantidad prevista, cantidad comprobada, diferencia, usuario y hora del servidor.
- Cada modificación de cantidad crea un evento de auditoría; las diferencias crean incidencias trazables agrupadas por carga.
- Al completar todas las líneas, la verificación y la carga se cierran incluso si existen incidencias pendientes.
- Administración ve incidencias agrupadas y puede confirmar una regularización ya realizada manualmente en Business Central.
- KONTROLA no escribe ni regulariza automáticamente en Business Central.
- Interfaz móvil de verificación, progreso, diferencias y cierre; versión propuesta `0.2.0`.
- Caché PWA y CI ampliadas para incluir el módulo y las pruebas de verificación.

## Persistencia propuesta, no aplicada

- `supabase/migrations/20261024_kontrola_preparacion.sql`: perfil propio y finalización explícita añadidos al SQL de Fase 1.
- `supabase/migrations/20261025_kontrola_verificacion.sql`: verificaciones, líneas, incidencias, eventos, RLS y RPC transaccionales.
- No se ha ejecutado SQL en Supabase ni se ha modificado producción.

## Pruebas realizadas

- `npm run check`: 23 pruebas aprobadas, 0 fallos; incluye sintaxis del cliente, regresiones heredadas, cantidades, cierre con diferencias, permisos declarados, concurrencia, trazabilidad, PWA y CI.
- Prueba local en viewport móvil 390 × 844: login visible, sin desbordamiento horizontal, recursos locales con HTTP 200 y sin errores JavaScript.
- Revisión adversarial aplicada: cierre explícito de la última preparación, estado de UI tras finalizar y regularización administrativa.

Las pruebas de contrato SQL inspeccionan la migración, pero no sustituyen una ejecución real de PostgreSQL/Supabase.

## Decisiones operativas vigentes

- Control de Cargas actual e INVENTA no se modifican.
- El picking se realiza con pistolas en Business Central; KONTROLA no añade checks de picking.
- Nadie puede verificar su propia preparación.
- La verificación es independiente de la preparación y se completa línea por línea.
- Las incidencias no reabren una carga cerrada.
- La regularización en Business Central es manual y la confirma un administrador autorizado en KONTROLA.
- No hay modo offline operativo fiable; no afirmarlo.

## Pendiente antes de producción

1. Revisión humana del SQL y aplicación autorizada en un entorno de pruebas del proyecto correcto.
2. Prueba E2E con al menos dos cuentas reales y dos dispositivos: preparación, exclusión del preparador, concurrencia, verificación, incidencias y regularización.
3. Validación real de RLS y Storage con roles `anon`, `authenticated`, operario inactivo, operario activo y administrador.
4. Prueba con PDF real y confirmación de que Control de Cargas e INVENTA siguen intactos.
5. Aviso en tiempo real al responsable; la lista actual se actualiza al abrir Administración o pulsar «Actualizar».
6. Definir copia/recuperación, observabilidad y estrategia offline antes de desplegar.

## Próximo paso recomendado

Revisar la PR #2 y sus dos migraciones; después, con autorización expresa, aplicar el SQL únicamente en un entorno de pruebas y ejecutar la matriz E2E de dos usuarios/dispositivos. No desplegar ni fusionar en `main` todavía.
