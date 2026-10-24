# KONTROLA — Ficha maestra de continuidad

**Actualizada:** 2026-10-25  
**Repositorio:** `josegude-ux/KONTROLA` (**privado**)  
**Límite del proyecto:** KONTROLA es la aplicación de preparación y verificación de cargas. No confundir con INVENTA, Control de Cargas, Control de Tanques o MOVENTA.

> **Fuente:** decisiones narradas en conversaciones anteriores y recogidas en la ficha general; falta contrastarlas con toda la documentación anterior y con la implementación. Al consultar GitHub, el `README.md` de `main` solo contenía el título «KONTROLA»; eso **no constituye una auditoría completa del código**. No dar por programado lo que solo está diseñado.

## Propósito

Crear la aplicación operativa **KONTROLA**, aprovechando la experiencia y flujos de Control de Cargas, **sin alterar la aplicación estable**. Debe funcionar en iPhone y PC. La estética puede ser coherente con INVENTA, pero ambos proyectos mantienen lógica, repositorios y ciclos de publicación separados.

## Lógica operativa ya discutida (pendiente de confirmación final)

1. **Usuarios identificados:** cada operario accede a las cargas pertinentes.
2. **Consulta de carga:** permitir ver el PDF original y una lista de mercancía organizada por pasillos/ubicaciones; conservar cantidades y unidades.
3. **Preparación/picking:** las pistolas trabajan con **Business Central**. KONTROLA registra el seguimiento operativo y no sustituye el escaneo de BC sin decisión expresa.
4. **Inicio de preparación:** al abrir una carga, comienza el registro de preparación asociado al operario.
5. **Cambio de carga:** puede darse por terminada la fase de preparación de la anterior mientras su verificación sigue abierta.
6. **Segunda verificación:** otra persona comprueba la mercancía línea a línea; **nadie verifica su propia preparación**.
7. **Incidencias y diferencias:** registrar cantidades previstas frente a comprobadas y avisar con agrupación por carga.
8. **Regularizaciones:** solo el responsable autorizado corrige manualmente en Business Central; no automatizar escritura en BC por implicación.
9. **Cierre:** el proceso de carga puede cerrarse tras las verificaciones completas conforme a las reglas pactadas, aunque la regularización de incidencias pendientes tenga tratamiento diferenciado. Confirmar los estados finales antes de implementar.
10. **Dispositivos:** experiencia táctil sencilla en iPhone y usable desde ordenador; evaluar inicialmente con un usuario operario real.

## Qué está decidido y qué NO debe afirmarse

- **Decisiones operativas:** los diez puntos anteriores se recopilaron en la conversación y necesitan cotejo con las últimas decisiones si existen diferencias.
- **Código implementado:** todavía no confirmado mediante auditoría técnica de este repositorio.
- **Supabase, autenticación, políticas de acceso y sincronización:** no dar por implantados ni vinculados a KONTROLA hasta verificar evidencia.
- **MOVENTA:** posible plataforma común; por ahora **no es parte de KONTROLA** ni autoriza integración.
- **INVENTA:** el estado de versiones 0.30.5/0.30.6 pertenece únicamente a INVENTA.

## Próxima tarea recomendada

1. Abrir este repositorio en Cursor Cloud desde iPhone, evitando que el agente opere sobre el repositorio de INVENTA.
2. Leer esta ficha y recuperar, si está disponible, el documento de reglas/decisiones operativas completo.
3. Hacer una **auditoría breve del código de KONTROLA**, para identificar qué hay realmente y cuál es el primer bloque funcional por desarrollar.
4. Implementar por bloques comprobables: modelo de carga y usuario → inicio y fin de preparación → verificación independiente → incidencias → estados/cierre.
5. No tocar el aplicativo Control de Cargas estable, ni modificar BC, datos reales o producción sin autorización.

## Continuidad entre chats

Mensaje recomendado: «Continuamos KONTROLA. Consulta la ficha `docs/CONTINUIDAD.md` del repositorio privado `josegude-ux/KONTROLA`. No mezcles INVENTA. Distingue decisiones operativas de implementación comprobada y retoma la próxima tarea pendiente».

**Al cerrar cada sesión:** registrar fecha, decisiones, módulos implementados y validados, rama/commit/PR, limitaciones, estado de publicación, riesgos y siguiente acción.

## Documentación relacionada

- INVENTA tiene su propia ficha en `josegude-ux/INVENTA-/docs/CONTINUIDAD.md`.
- La ficha provisional de MOVENTA se guarda separadamente en `docs/MOVENTA_CONCEPTO.md` hasta contar con repositorio propio.
