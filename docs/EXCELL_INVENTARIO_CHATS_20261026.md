# EXCELL — Inventario y reglas de continuidad de chats
**Fecha de corte:** 2026-10-26  
**Tipo:** inventario organizativo de conversaciones, NO prueba de acceso íntegro a cada chat.  
**Estado:** documentación independiente; no autoriza merge, despliegue, cambios en datos ni ejecución automática.

## 1. Conversaciones identificadas
| Conversación | Propósito | Estado organizativo recomendado | Responsable operativo propuesto |
|---|---|---|---|
| MOVENTA 0.3 | Antecedente del desarrollo MOVENTA / PREPARA | Histórico; alcanzó límite de longitud según el usuario. Conservar, no borrar | Ningún desarrollo nuevo |
| VISURA 0.1 | Sucesor explícito de MOVENTA 0.3 | Histórico / referencia de continuidad para VISURA 0.2 | Consultar, no duplicar trabajo |
| VISURA 0.2 | Coordinación y continuación; receptor de traspasos de WORK | Activo, coordinación y supervisión; evitar tocar las ramas del agente | Coordinación |
| VISURA WORK | Desarrollo del agente VISURA AUTO-DEV | Desarrollo especializado, bajo límites de uso de Work | Único escritor de AUTO-DEV |
| PROMPT E IMAGENES | Identidad visual, imágenes e instrucciones de integración | Especializado | Recursos gráficos |
| VISURA CENTRO DE MANDO | Panel web de órdenes y traspaso | Desarrollo separado en rama visura-panel | Interfaz de Centro de Mando |
| AUDITAR SOLAPAMIENTOS VISURA | Comprobación de colisiones entre tareas y ramas | Auditoría, solo lectura | Auditoría transversal |
| Prompt recuperación GitHub | Instrucciones de recuperación, verificación y continuidad | Consulta y auditoría documental | Documentación |
| Crear manual PDF | Prompt e instrucciones del manual de usuario | Consulta histórica | Manuales |
| Instalación desde enlace | Enlaces e instalación de versiones | Soporte | Distribución y soporte |

**Líneas de trabajo que también se mencionan:** VISURA INVENTA, VISURA PREPARA, MOVENTA 0.2, VISURA 0.3, pruebas de Centro de Mando, logo VISURA y control horario Excel. No se ha verificado que todos sean títulos de chats presentes en EXCELL; completar el listado en la barra lateral de ChatGPT antes de archivar.

## 2. Traspasos y límites
- Sucesión explícita: **MOVENTA 0.3 → VISURA 0.1 → VISURA 0.2**. No se garantiza lectura íntegra de conversaciones anteriores por compartir proyecto o título.
- VISURA WORK → VISURA 0.2 es **traspaso de coordinación**, no un segundo permiso de escritura concurrente sobre los mismos PR o archivos.
- Limitación de **créditos de Work** reportada por el usuario: distinta del límite de longitud del chat.
- MOVENTA 0.3 se clasifica aquí como **histórico**, pero este archivo NO mueve, renombra, bloquea, archiva ni borra conversaciones de ChatGPT.
- Los chats dedicados a **pruebas** no deben ejecutar cambios reales de código, GitHub, imágenes, despliegues ni Supabase.

## 3. Estado verificado en GitHub el 2026-10-26
Repositorios: [KONTROLA](https://github.com/josegude-ux/KONTROLA) y [INVENTA-](https://github.com/josegude-ux/INVENTA-).

**Cadena del agente VISURA WORK / AUTO-DEV:**
- [PR #37](https://github.com/josegude-ux/KONTROLA/pull/37): abierto, borrador, rama `feat/visura-auto-dev-task-spec`, HEAD `0756bad9e17652dc3b77c626700df05ec09bf9ea`, basado en `chore/visura-auto-dev-guardrails`.
- [PR #43](https://github.com/josegude-ux/KONTROLA/pull/43): abierto, borrador, rama `feat/visura-work-reviewer-evidence-20261026`, HEAD `d3aec336ab24a1c8f3cef485c19b8110cbc1d591`, base PR #37.
- [PR #44](https://github.com/josegude-ux/KONTROLA/pull/44): abierto, borrador, rama `fix/visura-work-review-snapshot-repository-20261026`, HEAD `b934a2ccf5fbff11de8ced3b2d121a46b7750408`, base PR #43. Cambia auditoría de permisos, pruebas y cuatro documentos `docs/`. La rama #43 no se modifica con ese PR.
- El último cambio descrito en #44 valida `snapshot.repository` antes del GET. **No constituye autorización para ejecución, merge ni publicación**.
- Centro de Mando: rama existente `visura-panel`; no mezclar con el agente ni su documentación.
- [PR #28](https://github.com/josegude-ux/KONTROLA/pull/28) de identidad comercial PREPARA figura **fusionado**; no usar una nota histórica de «pendiente de fusionar» como estado actual.

**Cuidado con documentación antigua:**
- `KONTROLA/main/docs/CONTINUIDAD.md` documenta todavía una Fase 1 antigua (2026-10-25) y NO representa el avance máximo del proyecto.
- La rama de PR #44 tiene la continuidad reciente en `docs/CONTINUIDAD.md`, `docs/VISURA_WORK_ESTADO.md`, `docs/CONTINUIDAD_WORK_A_CHAT_NORMAL.md` y `docs/PROMPT_CONTINUAR_SIN_WORK.md`.
- `INVENTA-/main/docs/CONTINUIDAD.md` existe con estado propio; verificar sus ramas y PRs antes de tocar INVENTA. No extrapolar avances entre repositorios.

## 4. Reglas de asignación
1. **Un único escritor por rama/PR/archivo a la vez.** VISURA WORK conserva AUTO-DEV; VISURA 0.2 revisa, coordina y recibe el traspaso, sin duplicar commits.
2. Centro de Mando trabaja solo en su interfaz y rama autorizada. PROMPT E IMAGENES crea recursos y da instrucciones, sin activar modificaciones de código ajenas.
3. Una auditoría de solapamientos es **solo lectura**. Las pruebas permanecen aisladas y sin efectos reales.
4. Antes de cualquier cambio: verificar HEAD, base, PR, commits, CI, archivo de continuidad **en la rama activa** y posibles modificaciones concurrentes.
5. Al terminar un hito: documentar fecha, rama, SHA, pruebas realmente ejecutadas, pendientes, responsable y siguiente tarea. No declarar CI como correcto sin verificación.
6. **No fusionar, desplegar, borrar datos ni modificar producción sin autorización expresa.** No usar Cursor si no tiene créditos.
7. VISURA INVENTA / PREPARA usan Excel importado manualmente desde Business Central, sin conexión API directa; diseñar seguridad con cuentas individuales y revocación, sin tocar fuentes de datos sin permiso.

## 5. Pendientes de organización manual en ChatGPT
- Revisar en el proyecto EXCELL la lista exacta de títulos y posibles duplicados; esta interfaz de GitHub no administra conversaciones.
- Dejar MOVENTA 0.3 visible como histórico hasta comprobar que sus decisiones están preservadas. **No se ha archivado desde aquí.**
- Etiquetar/describir VISURA 0.1 como sucesor histórico, y VISURA 0.2 como coordinador; confirmar si hay chats reservados exclusivamente a pruebas.
- No archivar masivamente antes de confirmar la continuidad. Crear sucesores cuando un chat llega a su límite de longitud.
- Registrar cambios posteriores al 26/10/2026 mediante revisión de GitHub; los SHA de esta ficha son instantánea, no bloqueo automático.

## 6. Próximo punto de comprobación
1. Confirmar CI específico del SHA de PR #44 antes de integrarlo.
2. Verificar solapamientos en archivos de documentación de PR #43/#44 antes de asignar nuevas tareas.
3. Completar nombres de chats EXCELL que solo están mencionados, no comprobados en el listado real.
4. No convertir este inventario en permiso de fusionar, desplegar ni modificar datos.
