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
head_parallel="$(git rev-parse refs/remotes/origin/feat/visura-prepara-integracion-pr49-pr58-20261026)"
head_document="$(git rev-parse refs/remotes/origin/feat/visura-prepara-b01-totales-bc-auditados-20261027)"
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

# La base local YA fue creada y probada con los contratos documentales por
# tests/integration/run.sh. La propuesta paralela se superpone solo en esa BD.
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$overlay/parallel-proposal.sql" > "$overlay/proposal.log"
psql -v ON_ERROR_STOP=1 -d "$DB" -f "$overlay/parallel.sql" > "$overlay/parallel.log"
grep -q "KONTROLA_PARALLEL_OK" "$overlay/parallel.log"
bash "$overlay/parallel-concurrency.sh" "$DB"
psql -v ON_ERROR_STOP=1 -d "$DB" -f tests/integration/preflight-cross-contract.sql > "$overlay/cross.log"
grep -q "KONTROLA_B01_CROSS_CONTRACT_OK" "$overlay/cross.log"
echo "KONTROLA_B01_CROSS_OK: PDF/BC, revisión protegida, flujos paralelos y prueba de carrera."
echo "SQL probada localmente; NO se fusionaron PR, NO se desplegó, NO equivale a prueba de navegador."
