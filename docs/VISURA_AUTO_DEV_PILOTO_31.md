# VISURA AUTO-DEV — Piloto #31 (documentación)
Fecha: 2026-10-26
Estado: piloto creado manualmente mediante integración GitHub; **NO ejecutado por agente autónomo**.

## Evidencia
- Primer workflow `VISURA AUTO-DEV - Dry Run`: GitHub Actions mostró éxito en la rama `chore/visura-auto-dev-guardrails` (9 segundos), según captura de ejecución.
- Preflight seguro: archivo creado, pero no se ha confirmado una ejecución.
- Esta rama se deriva de `chore/visura-auto-dev-guardrails`, no de `main`, para mantener el piloto aislado.
- Issue de seguimiento: #31.
- Coste de OpenRouter de esta tarea: **0 llamadas de IA a la API**. No se ha consultado la clave.

## Procedimiento de verificación
1. Revisar que el PR piloto solo modifica documentación.
2. Confirmar que el PR apunta a `chore/visura-auto-dev-guardrails`, no a `main`.
3. Verificar que no hay secretos, cambios SQL, despliegues ni accesos a datos.
4. Comprobar el estado de CI antes de cualquier futura fusión.
5. Registrar cualquier discrepancia en la issue #31.

## Pendiente para un agente real
- Elegir modelo y ejecutor de código con permisos limitados.
- Implementar autenticación del ejecutor para crear ramas/PR sin usar credenciales de administrador.
- Implementar corte verificable de consumo mensual agregado de **10 EUR**, incluyendo conversión y posibles costes de plataforma.
- Validar entradas de issues: nunca ejecutarlas como comandos ni exponerles secretos.
- Ensayar un PR creado por el propio agente con registro de coste y pruebas.

## Límites
Esta prueba no habilita tareas autónomas ni cron, no modifica `main`, no fusiona, no despliega y no accede a Supabase o Business Central.
