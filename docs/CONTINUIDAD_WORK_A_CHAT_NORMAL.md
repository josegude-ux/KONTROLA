# Traspaso del agente VISURA AUTO-DEV

Leer primero docs/VISURA_WORK_ESTADO.md en la rama
feat/visura-work-reviewer-evidence-20261026 de josegude-ux/KONTROLA.
Base: https://github.com/josegude-ux/KONTROLA/pull/37
SHA inicial: 0756bad9e17652dc3b77c626700df05ec09bf9ea.
Relación: esta rama -> feat/visura-auto-dev-task-spec (#37) ->
chore/visura-auto-dev-guardrails (#30) -> main. Ningún merge autorizado.

Otros repositorios: https://github.com/josegude-ux/INVENTA- (no modificado).
Rama operativa PREPARA: cursor/verificacion-fisica-cargas-8ba0; no editar.
No confundir el agente con PREPARA 0.3.35 ni con los documentos gráficos locales.

Comprobar git ls-remote, PRs y CI antes de retomar; no asumir que main es lo más
avanzado. Preservar commits posteriores. No forzar push ni tocar ramas compartidas.
Este primer punto de control precede al desarrollo; la disponibilidad remota
solo se confirma tras push y comparación del SHA remoto. Ver estado actualizado.
Observador implementado y conectado; código remoto 203c930527467bc6db1b4f552aef8a63ab93383a.
285 pruebas locales correctas. Primera tarea: prueba autenticada de solo lectura
del observador y verificación de políticas efectivas; después resolver elegibilidad.
Si faltan herramientas en chat normal, entregar cambios revisables sin inventar
commits ni verificaciones. No depender de Work, Cursor o memoria del chat.

PR de referencia: https://github.com/josegude-ux/KONTROLA/pull/43 (borrador, destino #37).


## Verificación adicional — resumen de permisos

Código remoto 15f416576371256395705974bb97bd7a1a3e263b, mismo PR #43.
293 pruebas locales correctas (8 nuevas), compilación, safety smoke y diff check
correctos. El resumen Actions muestra recuentos de permisos, desconocidos y
mismatches, sin nombres ni tokens; rechaza indicadores de autorización y datos
incoherentes. Prueba integrada del transporte GET hasta el informe unificado y
la reconsulta final del PR. CI del nuevo commit pendiente de consulta.
La autenticación real del módulo sigue pendiente: este avance usa pruebas
simuladas y no resuelve elegibilidad, CODEOWNERS ni políticas efectivas.
Primera tarea de continuación: verificar CI del último SHA de #43 y realizar
prueba autenticada de solo lectura cuando exista transporte confiable disponible.


## Corrección de validación completa del lote

Código 27941f4d05403a2f7db381c20a9088f8ff3b3c96, PR #43.
298 pruebas locales correctas; compileall, safety smoke y diff check correctos.
Se validan token y todas las identidades antes de cualquier llamada de red.
Un login asociado a dos IDs se rechaza; variaciones de mayúsculas del mismo ID
se deduplican. Un registro inválido al final ya no provoca consultas parciales.
La prueba autenticada real y las políticas efectivas continúan pendientes.
Siguiente paso: comprobar CI del último SHA y validar con un transporte de
solo lectura autorizado; no habilitar escritura ni ampliar permisos por defecto.
