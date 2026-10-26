# VISURA WORK — auditoría de recuperación y políticas (26-10-2026)

## Procedencia y prioridad
- Chat de origen solicitado: **VISURA WORK**. Chat destino: **CHAT NUEVO**. El historial completo del chat origen no es directamente accesible aquí; se han usado contexto recuperado y **evidencias remotas independientes** de GitHub. No atribuirle otras decisiones no verificadas.
- Responsable funcional: VISURA WORK / VISURA AUTO-DEV (agente virtual). VISURA 0.2 coordina; PROMPT E IMÁGENES solo recursos gráficos; PREPARA e INVENTA fuera del alcance. No solapar archivos de otros trabajos.
- Repositorio: https://github.com/josegude-ux/KONTROLA. main contiene una ficha anterior (25-10-2026), **no representa el código más avanzado**.

## Referencias GitHub verificadas
| PR | Rama | HEAD verificado | Estado |
|---|---|---|---|
| [#37](https://github.com/josegude-ux/KONTROLA/pull/37) | feat/visura-auto-dev-task-spec | 0756bad9e17652dc3b77c626700df05ec09bf9ea | abierta, borrador; depende de #30 |
| [#43](https://github.com/josegude-ux/KONTROLA/pull/43) | feat/visura-work-reviewer-evidence-20261026 | d3aec336ab24a1c8f3cef485c19b8110cbc1d591 | abierta, borrador; base #37 |
| [#44](https://github.com/josegude-ux/KONTROLA/pull/44) | fix/visura-work-review-snapshot-repository-20261026 | b934a2ccf5fbff11de8ced3b2d121a46b7750408 | abierta, borrador; base #43 |

- Comparación REST #43→#44: **ahead 1, behind 0**, siete archivos cambiados; la rama de #43 no se ha editado en este traspaso.
- CI real del SHA `b934a2c` consultada vía GitHub: Code Review Gate [run 40307255056](https://github.com/josegude-ux/KONTROLA/actions/runs/40307255056) = success; CSV Pilot Tests [40307255057](https://github.com/josegude-ux/KONTROLA/actions/runs/40307255057) = success; Queue Audit [40307255142](https://github.com/josegude-ux/KONTROLA/actions/runs/40307255142) = success. La cifra exacta de tests de ese commit **no se ha leído de los logs**, no inventarla. La documentación de #43 describe 313 pruebas en su revisión anterior.
- Sin revisiones presentadas en #37, #43 o #44 al consultar la API.

## Primera tarea segura ejecutada: sondeo de política de solo lectura
- GitHub REST devuelve ruleset **activo** `VISURA-AUTO-DEV-PROTECCION-MAIN` [ID 25846536](https://github.com/josegude-ux/KONTROLA/rules/25846536), con condición `~DEFAULT_BRANCH`, sin actores de bypass listados y `current_user_can_bypass: never`. Incluye prohibición de borrado y non-fast-forward, requisito de PR y resolución de conversaciones.
- Los parámetros del mismo ruleset indican `required_approving_review_count: 0` y `require_code_owner_review: false`. **No equivale a aprobación humana ni prueba política efectiva de la rama base de #43**, que no es main.
- GET de protección clásica de `main`: **HTTP 403 / Resource not accessible by integration**. No reinterpretar el 403 como «sin protección» ni «aprobado».
- Consulta de rulesets *aplicables a rama concreta* mediante esta conexión: endpoint no permitido; **sin veredicto** sobre protección efectiva de `feat/visura-auto-dev-task-spec` u otras ramas de destino.
- CODEOWNERS en `CODEOWNERS`, `.github/CODEOWNERS`, `docs/CODEOWNERS` con ref de la PR #44: **404** en las tres rutas; no afirmar que exista una política CODEOWNERS efectiva.
- Permiso del propietario `josegude-ux` observado como `admin`, pero **no acredita elegibilidad ni revisión de otra identidad**.
- La conexión de GitHub permite consultas reales autenticadas de solo lectura, pero no entrega credenciales al programa Python; las pruebas del transporte de los módulos `scripts/visura_github_*.py` siguen siendo simuladas. No extraer tokens de herramientas ni introducirlos en repositorio o logs.
- Informe observado, **no decisión automática**: ejecución_autorizada=false, fusion_autorizada=false, despliegue_autorizado=false.

## Trabajo pendiente y secuencia segura
1. Revalidar HEAD, PRs y CI por SHA antes de cualquier nueva edición, evitando duplicar la corrección ya efectuada en #44.
2. Obtener evidencia confiable de políticas efectivas sobre **rama de destino real de #43** y excepciones; los endpoints inaccesibles quedan `unknown`. Determinar si es necesaria una configuración humana de protecciones y aprobaciones.
3. Conseguir transporte autenticado de solo lectura **del propio módulo** en entorno aislado con credenciales facilitadas por el entorno de ejecución, sin revelar secretos; comparar identidad numérica real y datos de revisión. No usar la identidad autodeclarada del snapshot como autenticación.
4. Auditar CODEOWNERS, revisores elegibles y reglas de bypass; revisar contenido, tests y sandbox antes de diseñar ejecución autónoma. Un resultado de auditoría favorable no habilita escritura.
5. Solo con revisión y permiso explícito: considerar integración o despliegue. No tocar Supabase, Business Central, PREPARA, INVENTA, workflows o ramas publicadas.

## Continuidad técnica
- Esta **rama documental separada** nació del SHA de #44, sin modificar las ramas de #43 o #44; no se crea PR ni se fusiona. Conserva el informe y referencias en los cuatro documentos de continuidad existentes.
- Este avance consiste en verificación de estado y documentación; **no** modifica, prueba ni activa el código del agente en este chat. No atribuir al chat normal el entorno de Work, los terminales o las credenciales de Work.
- No usar Cursor ni proveedores de pago; los datos de Business Central se actualizan exclusivamente por Excel manual, según decisiones previas de VISURA.
