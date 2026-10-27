#!/usr/bin/env bash
set -euo pipefail

DB="${KONTROLA_TEST_DB:-kontrola_test}"

# Prueba DESTRUCTIVA: impedir eliminar una base con nombre ajeno a las pruebas.
case "$DB" in
  kontrola_test|kontrola_test_*) ;;
  *)
    echo "ERROR: test:db solo puede recrear bases llamadas kontrola_test o kontrola_test_*." >&2
    exit 2
    ;;
esac

# Prohibir conectar este script a un servidor remoto mediante PGHOST.
# Las pruebas deben ejecutarse en PostgreSQL local o en el servicio temporal de CI.
if [[ -n "${PGHOST:-}" && "${PGHOST}" != "localhost" && "${PGHOST}" != "127.0.0.1" && "${PGHOST}" != "::1" ]]; then
  echo "ERROR: test:db no permite PGHOST remoto. Ejecuta sobre PostgreSQL aislado local." >&2
  exit 2
fi
if [[ -n "${PGHOST:-}" ]]; then
  DROPDB=(dropdb --if-exists "$DB")
  CREATEDB=(createdb "$DB")
  PSQL=(psql -v ON_ERROR_STOP=1 -d "$DB")
else
  DROPDB=(sudo -u postgres dropdb --if-exists "$DB")
  CREATEDB=(sudo -u postgres createdb "$DB")
  PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB")
fi

"${DROPDB[@]}"
"${CREATEDB[@]}"
"${PSQL[@]}" -f tests/integration/bootstrap.sql >/tmp/kontrola-bootstrap.log
: >/tmp/kontrola-migrations.log
for migration in supabase/migrations/*.sql;do
  "${PSQL[@]}" -f "$migration" >>/tmp/kontrola-migrations.log
done
# Extensión optativa del Bloque 01: solo en CI aislada, nunca en la base real.
if [[ "${KONTROLA_TEST_REINTENTOS:-}" == "1" ]]; then
  "${PSQL[@]}" -f supabase/proposals/kontrola_auditoria_reintentos_b01.sql >>/tmp/kontrola-migrations.log
fi
if [[ "${KONTROLA_TEST_PROVISIONALES:-}" == "1" ]]; then
  "${PSQL[@]}" -f supabase/proposals/kontrola_pdf_provisionales_b01.sql >>/tmp/kontrola-migrations.log
fi
if [[ "${KONTROLA_TEST_HASH_CRUZADO:-}" == "1" ]]; then
  if [[ "${KONTROLA_TEST_REINTENTOS:-}" != "1" || "${KONTROLA_TEST_PROVISIONALES:-}" != "1" ]]; then
    echo "ERROR: el test hash cruzado requiere activar auditoría y provisionales en base local." >&2
    exit 2
  fi
  "${PSQL[@]}" -f supabase/proposals/kontrola_hash_cruzado_b01.sql >>/tmp/kontrola-migrations.log
fi
if [[ "${KONTROLA_TEST_TOTAL_BC:-}" == "1" ]]; then
  "${PSQL[@]}" -f supabase/proposals/kontrola_total_bc_documentado_b01.sql >>/tmp/kontrola-migrations.log
fi
"${PSQL[@]}" -f tests/integration/workflow.sql >/tmp/kontrola-workflow.log
"${PSQL[@]}" -f tests/integration/revisions.sql >/tmp/kontrola-revisions.log
"${PSQL[@]}" -f tests/integration/operator-stats.sql >/tmp/kontrola-operator-stats.log
tests/integration/concurrency.sh "$DB"
grep -q "KONTROLA_INTEGRATION_OK" /tmp/kontrola-workflow.log
grep -q "KONTROLA_REVISION_OK" /tmp/kontrola-revisions.log
if [[ "${KONTROLA_TEST_REINTENTOS:-}" == "1" ]]; then
  "${PSQL[@]}" -f tests/integration/import-attempt-audit.sql >/tmp/kontrola-auditoria-reintentos.log
  grep -q "KONTROLA_REINTENTOS_AUDITORIA_OK" /tmp/kontrola-auditoria-reintentos.log
fi
if [[ "${KONTROLA_TEST_PROVISIONALES:-}" == "1" ]]; then
  "${PSQL[@]}" -f tests/integration/provisional-drafts.sql >/tmp/kontrola-provisionales.log
  grep -q "KONTROLA_PROVISIONALES_OK" /tmp/kontrola-provisionales.log
fi
if [[ "${KONTROLA_TEST_HASH_CRUZADO:-}" == "1" ]]; then
  "${PSQL[@]}" -f tests/integration/hash-cross.sql >/tmp/kontrola-hash-cruzado.log
  grep -q "KONTROLA_HASH_CRUZADO_OK" /tmp/kontrola-hash-cruzado.log
fi
if [[ "${KONTROLA_TEST_TOTAL_BC:-}" == "1" ]]; then
  "${PSQL[@]}" -f tests/integration/bc-total-difference.sql >/tmp/kontrola-total-bc.log
  grep -q "KONTROLA_TOTAL_BC_AUDITADO_OK" /tmp/kontrola-total-bc.log
fi
grep -q "KONTROLA_OPERATOR_STATS_OK" /tmp/kontrola-operator-stats.log
# Propuesta de archivo: ejecutar SOLO en base aislada tras las pruebas principales.
"${PSQL[@]}" -f tests/integration/archive.sql >/tmp/kontrola-archivo.log
grep -q "KONTROLA_ARCHIVE_OK" /tmp/kontrola-archivo.log
echo "KONTROLA_DATABASE_OK migrations=6 workflow=passed revisions=passed stats=passed concurrency=passed archive=passed"
