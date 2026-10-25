# Estudio de viabilidad — Backend único INVENTA + Control de Cargas + KONTROLA

**Fecha:** 2026-10-25
**Naturaleza:** planificación técnica / inventario de riesgos, **sin cambios en ninguna base de datos**.
**Repositorios:**
- INVENTA: https://github.com/josegude-ux/INVENTA-
- Control de Cargas: https://github.com/josegude-ux/control-cargas-movil
- KONTROLA: https://github.com/josegude-ux/KONTROLA (desarrollo actual en PR #2)

## Decisión propuesta (no ejecutada)

**Candidato de destino: Supabase de INVENTA (`wlejxnpphysogrzcxjfh`).**
Conservar el modelo de datos y los controles de INVENTA y añadir los módulos de Control de Cargas y KONTROLA mediante migraciones y permisos aislados. Esto requiere reconfigurar las aplicaciones y comprobar la identidad y propiedad de los datos.

La recomendación no equivale a autorización para migrar, crear cuentas, escribir SQL, desplegar ni apagar el proyecto antiguo.

## Evidencias verificadas en Supabase (consulta de metadatos, lectura exclusivamente)

| Característica | Control de Cargas | INVENTA |
|---|---|---|
| Project ref | `oevetnszmfxeukcncwji` | `wlejxnpphysogrzcxjfh` |
| Usuarios auth.users | 1 | 1 |
| Perfil de usuario | `public.usuarios_app(id,nombre,rol,activo)` | `public.profiles(user_id,display_name,role,enabled,version,...)` |
| Cargas compartidas | 35 registros | No existe esa tabla |
| Catálogo de artículos | No hay tabla `products` | 1.853 registros `products` |
| Ubicaciones | No hay tabla `locations` | 794 registros `locations` |
| Líneas importadas BC | No hay tabla `bc_import_lines` | 3.041 registros |
| Auditoría INVENTA | No hay tabla `audit_events` | 2.654 registros |
| Storage | Bucket privado `pdf-cargas`, 0 objetos | Sin buckets |
| Migraciones KONTROLA en producción | No aplicadas | No aplicadas |

Las cantidades son una instantánea de las consultas y pueden cambiar.

La organización está en plan Free y tiene activos los dos proyectos: INVENTA y Control de Cargas. También figura un proyecto `control-tanques-staging` INACTIVE. Crear otra rama alojada requiere aceptar un coste; no es necesario para esta fase de estudio.

## Precaución: dependencias adicionales

Control de Cargas comparte su proyecto Supabase con tablas `tanques_members`, `tanques_records`, `tanques_audit` y funciones de esquema `tanques_private`.

**No se puede apagar, pausar ni eliminar el proyecto Control de Cargas al completar únicamente la migración de cargas/KONTROLA**, sin identificar qué sistemas consumen la parte de tanques y acordar cómo conservarla o migrarla.

Control de Cargas v0.5.26 también usa información local del dispositivo. Las 35 filas de `cargas_compartidas` no implican que todos los PDF originales estén almacenados en Supabase: `pdf-cargas` está vacío al realizar el estudio. Hay que inventariar contenido local/OneDrive de forma consentida, no inventar PDF a partir de JSON.

## Problema central: autenticación y roles

- Ambas aplicaciones operan hoy con proyectos Auth independientes. Que exista una cuenta en cada proyecto no significa que compartan la misma UUID, contraseña o autorización.
- INVENTA utiliza `profiles` y ayudas de autorización en el esquema `internal` (administrador, supervisor, operario, cuenta habilitada).
- Control de Cargas y KONTROLA se apoyan en `usuarios_app` y funciones `kontrola_* / es_administrador`.
- No se deben copiar contraseñas, reutilizar JWT ajenos ni relacionar usuarios por un identificador supuesto.
- Se requiere plan de correspondencia de identidades expresamente verificado; las claves foráneas y atribuciones de auditoría de las cargas requieren conservar la autoría histórica.
- Recomendar **una sola autenticación en el proyecto elegido**, sin conceder privilegios adicionales de INVENTA a cualquier operario de KONTROLA.
- Para una integración inicial, las tablas de cada módulo pueden seguir separadas. La futura interfaz única es otro trabajo distinto y no debe hacerse antes de estabilizar los datos.

## Modelo de integración que hay que diseñar

1. **Identidad común**: conservar `profiles` de INVENTA, acordar equivalencias de roles, crear permisos por módulo/almacén y las funciones RPC KONTROLA que validen `auth.uid()` dentro del único proyecto.
2. **Tablas de carga propias**: mantener `kontrola_*` y preservar `cargas_compartidas` y `documentos_carga` con sus identificadores originales, sin colisiones; no importar copias ciegas.
3. **Lectura de PDF**: reutilizar el motor existente de Control de Cargas; el PDF original es inmutable y la hoja de preparación procesada un documento derivado versionado.
4. **Catálogo compartido**: opcionalmente consultar `products` y `locations` de INVENTA por SKU y ubicación, con reglas explícitas por almacén. No sobreescribir ubicaciones del PDF ni mezclar Coruña/Ferrol; el rediseño del desglose por pasillos sigue pendiente de definición.
5. **Storage privado**: preparar buckets separados, RLS, rutas de documentos y permisos de lectura/escritura sin abrir PDF a usuarios no autorizados.
6. **Interfaz**: primera etapa aplicaciones separadas, mismo backend y mismo usuario; etapa posterior menú unificado conservando estilos y funcionalidades aprobados.
7. **Control de Tanques**: inventariar y decidir continuidad antes de desactivar su backend.

## Plan seguro sin costes adicionales

### Fase 0 — Inventario y diseño (esta fase, completada parcialmente)

- Metadatos y RLS revisados en ambos proyectos de forma **solo lectura**.
- Identificados nombres de tablas, volumen de datos, roles, Storage, diferencias de Auth y dependencias de Tanques.
- Se conserva el estado de ambos servicios.

### Fase 1 — Preparar scripts sin ejecutarlos

- Diseñar exportación controlada y copias de seguridad de ambas bases, con estrategia de restauración.
- Definir correspondencia de usuarios, roles, autorización y referencias externas.
- Preparar una migración SQL **incremental**, específica para INVENTA, revisando la adaptación de las tres migraciones `kontrola_*`.
- Generar pruebas de no regresión para INVENTA, Control de Cargas, KONTROLA y Tanques.
- Mantener todos los archivos empresariales fuera del repositorio público.

### Fase 2 — Ensayo aislado

- Utilizar GitHub Actions con PostgreSQL descartable o Supabase local en entorno autorizado para simular las dos bases, aplicar las migraciones y comprobar conteos, constraints, RLS, auth simulada, duplicados y reversión.
- **No utilizar `tests/integration/run.sh` contra bases existentes**: el ejecutor destruye y recrea la base de pruebas nominal. Su protección limita el nombre y `PGHOST`, pero el entorno debe seguir siendo descartable.
- Las pruebas de PostgreSQL emulado no sustituyen la verificación final de Auth/Storage reales.

### Fase 3 — Migración real, solo tras nueva autorización

- Validar respaldos y ventana de mantenimiento.
- Migrar identidades y propiedad de registros mediante correspondencias aprobadas.
- Trasladar de forma verificable cargas compartidas, su trazabilidad, PDF existentes y el conjunto Tanques si así se decide.
- Adaptar las dos PWA a un único Supabase; probar iniciación de sesión, RLS, almacenamiento, preparación, verificación, incidencias, sincronización y dispositivos.
- Conservar el proyecto antiguo **en paralelo** hasta aceptación del usuario, sin cancelar cuentas ni cerrar servicios por defecto.

### Fase 4 — Consolidación

- Solo tras comparación completa, aceptación y plan de reversión, valorar detener el proyecto redundante y liberar una plaza del plan Free. Requiere aprobación independiente.
- La unificación de menús e interfaces es una entrega funcional aparte, con diseño coherente y sin rehacer aplicaciones existentes.

## Puertas de seguridad antes de permitir un corte

- Ningún dato o autoría histórica perdida; conteos y relaciones cruzadas coherentes.
- Mismos permisos o más restrictivos, jamás privilegios ampliados por accidente.
- Acceso al PDF original desde móviles, rutas, versiones y permisos comprobados.
- Flujos E2E con usuarios reales de prueba y dos dispositivos.
- INVENTA sigue contando y leyendo Business Central correctamente; Control de Cargas preserva su sincronización; Tanques no se interrumpe.
- Reversión documentada y reproducible; backups probados, no solo generados.
- Autorización expresa del usuario para cualquier escritura en producción y para pausar o eliminar proyectos.

## Conclusión

**Sí es viable usar una sola base de datos Supabase y un inicio de sesión unificado, manteniendo los módulos operativos.** La ruta probablemente menos disruptiva es incorporar las funciones y datos de Control de Cargas/KONTROLA en el proyecto INVENTA, ya que INVENTA contiene el catálogo, las ubicaciones, la auditoría y la mayoría de claves foráneas.

**Pero no es seguro ejecutar la fusión todavía.** Deben resolverse las correspondencias de identidad y permisos, conservación de datos locales/PDF y la dependencia de Tanques. La preparación técnica y los ensayos de PostgreSQL descartable pueden avanzar sin nuevas tarifas de Supabase.