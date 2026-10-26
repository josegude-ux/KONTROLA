# VISURA AUTO-DEV - requisitos antes de ejecutar

Estado: diseño; NO activado. El código actual valida, planifica y simula tareas. Los resúmenes de revisiones son orientativos y no autentican identidades.

## Controles externos obligatorios

1. Consultar GitHub mediante una integración de confianza y permisos mínimos.
2. Verificar repositorio, PR, rama de destino y SHA exacto revisado.
3. Comprobar identidad y autorización del revisor, incluidas las reglas de protección de rama.
4. Evitar autoaprobaciones prohibidas por la política del repositorio.
5. Revalidar SHA, aprobaciones y CI inmediatamente antes de actuar.
6. Separar permisos de escritura del código no confiable; no exponer tokens a PRs.
7. No aceptar comandos libres; permitir solo operaciones predefinidas y aisladas.
8. Exigir aprobación humana explícita para fusionar o desplegar.
9. Bloquear datos de producción y llamadas de IA de pago por defecto.
10. Implantar un límite real de gasto externo al ejecutor antes de habilitar IA de pago. El libro local de 10 EUR no garantiza la facturación.
11. Registrar actor, commit, revisión, pruebas y resultado de cada acción.

## Verificación pendiente

La integración disponible permite consultar revisiones, políticas de ramas y resultados observados de check-runs del commit exacto del PR; **esto no verifica que se cumplan los checks obligatorios definidos en la protección de la rama**. Tampoco se ha podido verificar la configuración efectiva de protección de ramas. No afirmar que main está protegida ni activar ejecución basándose en ello.

## Criterio de salida

No activar ejecución automática hasta probar estos controles en el sistema real que tiene credenciales y ejecuta acciones.
