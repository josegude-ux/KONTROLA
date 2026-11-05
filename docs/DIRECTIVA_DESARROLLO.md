# DIRECTIVA DE DESARROLLO AUTÓNOMO — VISURA

**Fecha:** 2026-10-26. **Autoridad:** instrucciones expresas del propietario. **Alcance:** VISURA matriz, VISURA INVENTA, VISURA PREPARA y módulos futuros.

## Reglas permanentes
1. Continuar desde GitHub y la continuidad verificada, sin reiniciar, duplicar trabajos ni usar Cursor.
2. Avanzar autónomamente entre fases aprobadas: lectura, cambios de código, pruebas, corrección de errores, documentación, ramas, commits y PR en borrador. No pedir permiso ordinario para continuar.
3. No realizar borrados destructivos, fusiones, despliegues/publicaciones definitivas, cambios críticos de seguridad ni modificaciones de datos sin autorización expresa.
4. Preguntar solo por permisos insuficientes, recursos imprescindibles, decisiones funcionales sustanciales no resueltas, contradicciones o bloqueos técnicos que exijan intervención.
5. Si una tarea se bloquea, registrar causa, alternativas, pruebas realizadas y continuar con trabajo independiente.
6. Documentar con honestidad qué se ha probado, qué está solo preparado y qué no está implementado. No prometer trabajo en segundo plano.
7. Actualizar `docs/CONTINUIDAD.md` en los commits funcionales y registrar rama, commit, PR, pendientes y reversión antes de cambiar de conversación.

## Objetivo de producto
Una sola PWA VISURA instalable en iPhone, Android y Windows, con VISURA INVENTA y VISURA PREPARA integradas; acceso individual y centralizado; navegación y estilo comunes; módulos y permisos lógicamente separados; Supabase compartido; preservación de funciones y recursos oficiales; Excel manual para INVENTA y PDF manual para PREPARA; ninguna conexión directa con Business Central.

## Estado verificable al redactar
- PREPARA: PR #29 (`feature/visura-prepara-menu-oficial-20261026`) abierta en borrador sobre `branding/visura-prepara-20261026`. Etiquetas principales ajustadas: `openReview` = Control de Cargas; `openCargas` = Operaciones; IDs originales preservados. Test estático de tarjetas incorporado; imágenes oficiales WEBP y originales aún pendientes de subir, sin cambio de rutas PWA. Sin merge ni despliegue.
- INVENTA: rama aislada `visura/seguridad-centralizada-diseno` contiene diseño y auditoría RLS. No equivale a revocación funcional implementada.
- VISURA matriz: prototipo de lanzador aislado en INVENTA, rama `moventa/prototipo-lanzador`. No es aún una única PWA integrada ni SSO.
- Los proyectos Supabase siguen separados; la migración compartida no se ha realizado.

## Orden de ejecución
1. Completar activos oficiales y pruebas de PR #29 sin tocar datos, usuarios ni roles.
2. Inspeccionar código real de login, módulos y PWA de ambas apps y construir integración reversible, conservando URLs y funcionalidades.
3. Diseñar migración verificable de autenticación y datos compartidos, sin ejecutarla hasta evaluación de riesgos/autorización requerida.
4. Probar con datos ficticios, CI y dispositivos antes de presentar candidata instalable.
5. Preparar documentación, reversión y PR para revisión; no publicar automáticamente.

## Reversión
- No fusionar la PR #29; para revertir el trabajo en preparación basta descartar/cerrar la PR, sin alterar las ramas instaladas.
- Mantener intactos los archivos 3D previos como respaldo. Cualquier migración futura deberá incluir procedimiento de reversión comprobado.
