# KONTROLA · MOVENTA

PWA móvil de operaciones de almacén para **preparación, consulta, verificación, historial e incidencias de cargas**.

**Versión de esta rama:** 0.3.3. **Estado:** desarrollo probado parcialmente, **no apto aún para producción**.

- PR de Fase 1: https://github.com/josegude-ux/KONTROLA/pull/1
- PR de operación integral: https://github.com/josegude-ux/KONTROLA/pull/2
- Documento de continuidad: [docs/CONTINUIDAD.md](docs/CONTINUIDAD.md)

La aplicación completa está en la rama de la PR #2, **no en main**.

## Flujo previsto

1. El administrador descarga manualmente los PDF de Business Central.
2. Desde KONTROLA los importa, revisa, corrige y publica.
3. KONTROLA clasifica por almacén: **A Coruña (COR_01_COR)** o **Ferrol (COR_02_NAR)**. Los códigos desconocidos se revisan antes de publicar.
4. El operario consulta la carga sin iniciar ningún reloj; para trabajar pulsa **Iniciar preparación**.
5. La preparación física se registra con la pistola de Business Central, que KONTROLA no sustituye.
6. La preparación se cierra manualmente, al comenzar otra carga o al finalizar la verificación, según proceda.
7. Un segundo operario, distinto del preparador, verifica cantidades físicas línea por línea.
8. Al comprobar todas las líneas se cierra la carga, aunque existan diferencias.
9. El administrador consulta incidencias y registra confirmaciones de regularizaciones hechas **manualmente** en Business Central.

También hay paneles de tiempos, incidencias, seguimiento y documentos por almacén, así como funciones para generar, descargar e imprimir hojas procesadas.

## Arquitectura y seguridad

- **Supabase** con autenticación de usuarios reales y roles `operario` y `administrador`.
- Proyecto de Control de Cargas; **INVENTA es independiente**.
- Tablas, RPC y Storage privado de KONTROLA, distintos de los documentos originales de otras aplicaciones.
- Migraciones propuestas en `supabase/migrations/`.
- Control de concurrencia en preparación, importación y verificación; RLS y políticas para documentos privados.
- PWA para teléfonos móviles. La conectividad, impresión real y recuperación de sesiones requieren pruebas en dispositivos.
- La descarga desde Business Central y las regularizaciones son **manuales**, sin API ni escritura automática.

## Pruebas

```bash
npm ci
npm run check
```

Las pruebas de base de datos requieren un servidor **PostgreSQL local y descartable**, compatible con los scripts del repositorio:

```bash
npm run test:db
```

**ATENCIÓN:** `test:db` elimina y recrea la base `kontrola_test` en el PostgreSQL local. El script se niega a trabajar con bases de otros nombres o con `PGHOST` remoto. Nunca lo ejecutes contra datos que quieras conservar.

GitHub Actions ya ha validado satisfactoriamente pruebas de JavaScript y migraciones, flujo de operaciones y concurrencia en PostgreSQL 16 temporal. Esto **no prueba todavía** el entorno Supabase empresarial completo.

## Límites actuales

- Las migraciones no se han aplicado desde este trabajo al Supabase de producción.
- Faltan pruebas E2E con varias cuentas y móviles reales, comprobaciones del Storage privado y validación con impresoras del almacén.
- Los PDF ficticios de pruebas no sustituyen la verificación con documentos reales autorizados.
- No se han fusionado las PR a `main` ni desplegado una versión productiva.
- Las reglas especiales de totales por pasillos siguen pendientes de definición.

Para detalles del estado comprobado, las decisiones aprobadas y los siguientes pasos consulta [docs/CONTINUIDAD.md](docs/CONTINUIDAD.md).

**No publicar PDF reales en este repositorio público.**

## Navegación e historial v0.3.3

- KONTROLA mantiene Preparación, Verificación y Administración; Control de Cargas es un submenú integrado.
- «Consultar cargas» usa **modo de solo lectura**: no aparecen los botones de iniciar/finalizar y sus manejadores comprueban el modo antes de escribir.
- «Historial y resumen» filtra los registros publicados por el RPC autorizado `kontrola_panel_cargas` según fecha de carga, estado, matrícula, ruta o repartidor; resume cargas, peso, referencias, cerradas e incidencias pendientes.
- El filtro por almacén respeta los permisos concedidos por el servidor. El historial no importa documentos ni altera los datos de Business Central.
- El detalle de un registro del historial es de solo lectura. Las cargas sin fecha quedan al final de la lista.
- Control de Tanques permanece **completamente oculto** hasta que pueda integrarse y probarse.
- No se han creado tablas nuevas para esta función. Queda pendiente probar el comportamiento en Supabase real y dispositivos.
