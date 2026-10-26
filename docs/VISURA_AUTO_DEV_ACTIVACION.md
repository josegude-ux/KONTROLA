# VISURA AUTO-DEV — Activación controlada

Estado: **NO ACTIVADO**. Este documento describe los requisitos para una ejecución real, no afirma que estén implementados.

## Separación de componentes

1. **GitHub Actions, lectura:** consulta tareas permitidas y valida metadatos. Nunca ejecuta el texto de una issue.
2. **Ejecutor de IA:** aislado, con permisos mínimos para una rama de trabajo y PR en borrador; sin acceso a Supabase, Business Central ni secretos de producción.
3. **Pasarela de gasto:** única ruta autorizada hacia el proveedor de IA. No se permite que un workflow o agente invoque directamente OpenRouter eludiendo la pasarela.
4. **Libro mayor persistente y atómico:** reserva antes de cada llamada el coste máximo posible, incluye todos los procesos, reintentos y servicios facturables; registra la liquidación. El almacenamiento efímero de Actions **no sirve**.
5. **Corte externo:** límite de crédito/prepago o control del proveedor verificado independientemente. Si no existe, no activar ejecuciones desatendidas.

## Criterio de 10 EUR/mes

- El límite se aplica al **total mensual**, no a cada clave o cada ejecución.
- El cálculo debe incluir tipos de cambio USD/EUR conservadores, impuestos/comisiones cuando procedan, margen para GitHub Actions y cualquier otro servicio de pago.
- El agente debe estimar el **máximo**, no solo el coste promedio de tokens.
- Reserva y autorización deben ser una sola operación atómica frente a ejecuciones concurrentes.
- Al reiniciar un workflow, rotar credenciales, cambiar de mes o fallar la red, **no se reinicia el consumo acumulado**.
- Sin prueba verificable del libro mayor, pasarela, coste máximo por llamada y corte externo: **DENEGAR**.

## Seguridad

- No pasar claves a PRs de terceros, código de issues ni workflows con código no confiable.
- No dar permisos de administrador ni usar `service_role` de Supabase.
- No fusionar, desplegar, aplicar migraciones ni borrar datos sin autorización expresa.
- Probar primero con una tarea documental, registrar coste y comprobar PR en borrador.

## Evidencia pendiente

- Resultado verificable del workflow de auditoría de cola y pruebas unitarias.
- Identidad, permisos y entorno del ejecutor real.
- Proveedor/modelo y límites contractuales comprobados.
- Almacenamiento persistente con reserva atómica y pruebas de concurrencia.
- Pasarela obligatoria y corte real de gasto, con test de denegación.
- Primera ejecución del agente generando un PR por sí mismo.

El script `scripts/visura_budget_gate.py` es **solo una comprobación pura**: no reserva, no persiste, no intercepta peticiones y por tanto **no impone un límite de facturación**.
