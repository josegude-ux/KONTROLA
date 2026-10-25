#!/usr/bin/env bash
set -euo pipefail

DB="${KONTROLA_TEST_DB:-kontrola_test}"
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
"${PSQL[@]}" -f tests/integration/workflow.sql >/tmp/kontrola-workflow.log
tests/integration/concurrency.sh "$DB"
rg -q "KONTROLA_INTEGRATION_OK" /tmp/kontrola-workflow.log
echo "KONTROLA_DATABASE_OK migrations=3 workflow=passed concurrency=passed"
