#!/usr/bin/env bash
# Ensayo opcional: SÓLO PostgreSQL local EXISTENTE, nunca Supabase remoto.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
if [[ -n "${PGSERVICE:-}" || -n "${PGHOSTADDR:-}" || -n "${DATABASE_URL:-}" ]]; then
 echo 'PROHIBIDO: variable de conexión externa presente.' >&2; exit 13
fi
host="${PGHOST:-127.0.0.1}"
if [[ "$host" != '127.0.0.1' && "$host" != 'localhost' && "$host" != '::1' ]]; then
 echo 'PROHIBIDO: PGHOST debe ser loopback local.' >&2;exit 13
fi
if ! command -v psql >/dev/null 2>&1 || ! command -v pg_isready >/dev/null 2>&1; then
 echo 'SIN ENSAYO: PostgreSQL local no instalado, NO GO de homologación SQL.' >&2; exit 14
fi
if [[ "${PGDATABASE:-}" != visura_f3a_test_* ]]; then
 echo 'PROHIBIDO: PGDATABASE debe empezar con visura_f3a_test_.' >&2;exit 13
fi
port="${PGPORT:-5432}"
if ! [[ "$port" =~ ^[0-9]+$ ]] || ((port<1||port>65535)); then echo 'Puerto inválido' >&2;exit 13;fi
if ! pg_isready -h "$host" -p "$port" -d "$PGDATABASE" >/dev/null; then
 echo 'SIN ENSAYO: no hay motor PostgreSQL local disponible.' >&2;exit 14
fi
# DDL original R4.1 con BEGIN/COMMIT internos excluidos: encapsular todo en rollback.
# El script requiere una base de datos DESCARTABLE y VACÍA, con superusuario local.
TMP="$(mktemp)";trap 'rm -f "$TMP"' EXIT
printf 'BEGIN;\n' > "$TMP"
cat "$ROOT/tests/bootstrap_r41_pg_local.sql" >> "$TMP"
sed '/^BEGIN;$/d;/^COMMIT;$/d' "$ROOT/docs/sql-no-ejecutar/VISURA_F3A_R4_1_FUENTE_CHECKS_CORRECCION_NO_EJECUTAR.sql" >> "$TMP"
cat "$ROOT/tests/regresion_r41_pg_local.sql" >> "$TMP"
printf '\nROLLBACK;\n' >> "$TMP"
# No redirección de host: siempre host loopback explícito.
PGHOST="$host" PGPORT="$port" psql -X --set ON_ERROR_STOP=1 \
  --host "$host" --port "$port" --dbname "$PGDATABASE" --file "$TMP" >/dev/null
printf 'POSTGRESQL LOCAL PASS, transacción revertida (no queda schema R4).\n'
