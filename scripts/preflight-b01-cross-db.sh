#!/usr/bin/env bash
set -euo pipefail

# SOLO CI efímera con PostgreSQL local y nombre de BD predeterminado.
if [[ "$GITHUB_ACTIONS" != "true" || "$CI" != "true" || -z "$RUNNER_TEMP" ]]; then
  echo "ERROR: cruce SQL reservado al ejecutor temporal de GitHub Actions." >&2; exit 2
fi
if [[ "$PGHOST" != "localhost" && "$PGHOST" != "127.0.0.1" && "$PGHOST" != "::1" ]]; then
  echo "ERROR: PostgreSQL remoto prohibido." >&2; exit 2
fi
DB="$KONTROLA_TEST_DB"
if [[ "$DB" != "kontrola_test_cross_b01" ]]; then
  echo "ERROR: usar solo kontrola_test_cross_b01." >&2; exit 2
fi
parallel_sha="18c46b0c742bae9321f08603da40dfd1e7d76323"
document_sha="13b5fbdac50b6e7a2ec4b97bbf2313b7bdbd9fcf"
hardening_sha="8cdab594088eba9960968df6d0be6352733c82ea"
head_parallel="$(git rev-parse refs/remotes/origin/feat/visura-prepara-integracion-pr49-pr58-20261026)"
head_document="$(git rev-parse refs/remotes/origin/feat/visura-prepara-b01-totales-bc-auditados-20261027)"
head_hardening="$(git rev-parse refs/remotes/origin/feat/visura-prepara-b01-evidencia-por-linea-20261027)"
if [[ "$head_hardening" != "$hardening_sha" ]]; then
  echo "ERROR: rama de seguridad documental ha avanzado: reauditar." >&2; exit 2
fi
if [[ "$head_parallel" != "$parallel_sha" || "$head_document" != "$document_sha" ]]; then
  echo "ERROR: HEAD de origen avanzado. Reauditar antes de probar." >&2; exit 2
fi
if ! git merge-base --is-ancestor "$document_sha" HEAD; then
  echo "ERROR: checkout de pruebas no deriva de la línea documental." >&2; exit 2
fi
overlay="$(mktemp -d "$RUNNER_TEMP/visura-b01-cross.XXXXXXXX")"
trap 'rm -rf "$overlay"' EXIT

# Solo leer archivos inmutables de origen; NO merge, rebase ni cherry-pick.
git show "$parallel_sha:supabase/proposals/kontrola_prepara_verificacion_paralelas.sql" > "$overlay/parallel-proposal.sql"
git show "$parallel_sha:tests/integration/parallel.sql" > "$overlay/parallel.sql"
git show "$parallel_sha:tests/integration/parallel-concurrency.sh" > "$overlay/parallel-concurrency.sh"
git show "$document_sha:supabase/proposals/kontrola_total_bc_documentado_b01.sql" > "$overlay/document-override.sql"

# La base local YA fue creada y probada con los contratos documentales por
# tests/integration/run.sh. La propuesta paralela se superpone solo en esa BD.
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$overlay/parallel-proposal.sql" > "$overlay/proposal.log"

# REGRESIÓN DETECTADA: la propuesta paralela contiene un CREATE OR REPLACE
# de publicar_importacion más antiguo, que restaura la igualdad PDF/BC y
# suprime la excepción auditable. Verificar el defecto antes de restaurarla.
psql -qAt -d "$DB" -c "select pg_get_functiondef('public.kontrola_publicar_importacion(uuid)'::regprocedure)" > "$overlay/after-parallel-function.sql"
if grep -q 'kontrola_total_bc_documentado' "$overlay/after-parallel-function.sql"; then
  echo "ERROR: contrato SQL de origen cambió. Reauditar antes de continuar." >&2;exit 2
fi

# Orden determinista de overlay DE PRUEBAS: primero contrato paralelo,
# después la propuesta documental del SHA exacto, para conservar las DOS
# protecciones de publicar_importacion. No cambia archivos de ninguna PR.
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$overlay/document-override.sql" > "$overlay/document-reapplied.log"
psql -qAt -d "$DB" -c "select pg_get_functiondef('public.kontrola_publicar_importacion(uuid)'::regprocedure)" > "$overlay/after-document-function.sql"
grep -q 'kontrola_total_bc_documentado' "$overlay/after-document-function.sql"
grep -q 'kontrola_verificaciones' "$overlay/after-document-function.sql"
echo "KONTROLA_B01_ORDER_GUARD_OK: detectar sobreescritura y restaurar validación documental."
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$overlay/parallel.sql" > "$overlay/parallel.log"
grep -q "KONTROLA_PARALLEL_OK" "$overlay/parallel.log"
bash "$overlay/parallel-concurrency.sh" "$DB"
psql -v ON_ERROR_STOP=1 -d "$DB" -f tests/integration/preflight-cross-contract.sql > "$overlay/cross.log"
grep -q "KONTROLA_B01_CROSS_CONTRACT_OK" "$overlay/cross.log"

# Aplicar en ESTA MISMA BASE la propuesta aislada de seguridad de PR #72,
# después del contrato paralelo y documental, sin reescribir PR originales.
git show "$hardening_sha:supabase/proposals/kontrola_bc_evidencia_por_linea_b01.sql" > "$overlay/quantity-hardening.sql"
git show "$hardening_sha:tests/integration/bc-evidence-every-line.sql" > "$overlay/quantity-hardening-test.sql"
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$overlay/quantity-hardening.sql" > "$overlay/quantity-hardening.log"
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$overlay/quantity-hardening-test.sql" > "$overlay/quantity-hardening-test.log"
grep -q "KONTROLA_B01_EVIDENCIA_CADA_LINEA_OK" "$overlay/quantity-hardening-test.log"
psql -qAt -d "$DB" -c "select pg_get_functiondef('public.kontrola_publicar_importacion(uuid)'::regprocedure)" > "$overlay/after-hardening-publication.sql"
grep -q 'kontrola_total_bc_documentado' "$overlay/after-hardening-publication.sql"
grep -q 'kontrola_verificaciones' "$overlay/after-hardening-publication.sql"
echo "KONTROLA_B01_HARDENED_CROSS_OK: propuestas BC original, paralela y evidencia por línea coexistentes en BD efímera."
echo "KONTROLA_B01_CROSS_OK: PDF/BC, revisión protegida, flujos paralelos y prueba de carrera."
echo "SQL probada localmente; NO se fusionaron PR, NO se desplegó, NO equivale a prueba de navegador."
