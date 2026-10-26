# VISURA WORK — AUTO-DEV

Punto de control 2026-10-26. Responsable del agente: VISURA WORK.
Base verificada: PR #37 abierto/borrador, feat/visura-auto-dev-task-spec,
0756bad9e17652dc3b77c626700df05ec09bf9ea. PR #30 abierto/borrador,
chore/visura-auto-dev-guardrails, 29ba116e87937f0bf8b95caed000dc5e2bcc7977.
PR #35 abierto/borrador, edead73f4fba2652fa9ed8d4b8ccb01896299456; GitHub indica conflicto.

Existe validador de tareas, plan simulado, auditoría REST de revisiones,
protección de ramas, check-runs y estados heredados, y resumen Actions.
No hay autorización de escritura automática ni agente autónomo operativo.
285 pruebas locales correctas (269 existentes + 16 nuevas), compilación y bloqueo de IA de pago correctos. CI de esta rama pendiente al preparar este registro.

Trabajo aislado: feat/visura-work-reviewer-evidence-20261026, basado en #37.
Objetivo inmediato: observar permisos de repositorio vinculados a la identidad
numérica de un revisor sin convertirlos en elegibilidad ni autorización.
Pendientes: políticas efectivas, excepciones, CODEOWNERS, derechos efectivos,
revalidación y ciclo vertical aislado antes de habilitar cualquier ejecución.

No merge, despliegue, cambios de datos, proveedores de pago ni activación de
workflows de escritura. No Cursor. Excel manual desde Business Central;
Supabase previsto y credenciales individuales con revocación.

VISURA 0.2 coordina y recibe traspaso; PROMPT E IMÁGENES gestiona gráficos;
Prompt recuperación GitHub audita documentación. No se puede observar la
actividad interna en tiempo real de esos chats; revalidar SHAs antes de integrar.
Paquete gráfico bloqueado anteriormente: excluido de esta rama y su publicación.

## Hito implementado

Commit remoto de código: 203c930527467bc6db1b4f552aef8a63ab93383a.
Observador scripts/visura_github_reviewer_permissions.py conectado al informe
scripts/visura_github_audit_bundle.py. Deduplica revisores, máximo 50 consultas,
verifica ID numérico y login, trata 403/404 como desconocidos, rechaza respuestas
malformadas. Ningún resultado concede permisos de ejecución.

Las pruebas del módulo usan transporte simulado. Consulta independiente por
conector de GitHub devuelve admin para el propietario; no acredita identidad
completa del revisor ni prueba ejecución del módulo con token real.
Fuente API: https://docs.github.com/en/rest/collaborators/collaborators#get-repository-permissions-for-a-user

INVENTA: PRs #18, #19, #20 y #21 siguen abiertos sin fusionar (consulta 2026-10-26).
No se modifican sus ramas. #37 conservaba 0756bad9 al enviar estos cambios.
Los tres documentos de traspaso ya están en GitHub desde 9c0673fc.
El push por Git carecía de credenciales; se guardó por la integración GitHub.

Próximo trabajo: probar el módulo con transporte autenticado de solo lectura,
identidades completas y políticas de rama efectivas. Este entorno no proporciona
un token al proceso Python; no extraer credenciales de la integración.
Después: CODEOWNERS, excepciones y revalidación antes de cualquier ejecución.
El ciclo vertical de escritura sigue sin implementarse ni activarse.

PR de referencia: https://github.com/josegude-ux/KONTROLA/pull/43 (borrador, destino #37).
