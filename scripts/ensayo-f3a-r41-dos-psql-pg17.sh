#!/usr/bin/env bash
# MANUAL-ONLY QA PLAN: requires NEW user authorization for execution.
# Do not run in CI or Supabase. No network credentials or services are provisioned.
set -Eeuo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SQL="$ROOT/tests/pg17-concurrency"
CANDIDATE="$ROOT/docs/sql-no-ejecutar/VISURA_F3A_R4_1_FUENTE_CHECKS_CORRECCION_NO_EJECUTAR.sql"
DB='visura_f3a_qa_r41_20261117'
EXPECTED_BLOB='68db4e388a99ff8631d0de279879a707807d2b59'

fail(){ printf >&2 'NO ACREDITADO: %s\n' "$*"; exit 1; }
[[ ${VISURA_F3A_ALLOW_LOCAL_QA:-} == 'EXPLICIT_ISOLATED_POSTGRES17' ]] || fail 'Falta autorización específica nueva para ejecución del ensayo'
[[ ${VISURA_F3A_TARGET_IS_EPHEMERAL:-} == 'YES_VERIFIED' ]] || fail 'No se acreditó un servicio PostgreSQL17 desechable y propio'
[[ ${PGHOST:-} == '127.0.0.1' ]] || fail 'PGHOST debe ser exactamente 127.0.0.1; los túneles siguen prohibidos'
[[ ${PGPORT:-} == '5432' ]] || fail 'PGPORT diferente de 5432'
[[ ${PGDATABASE:-} == "$DB" ]] || fail 'PGDATABASE no es la base de ensayo exclusiva'
[[ ${PGUSER:-} == 'postgres' ]] || fail 'PGUSER no es postgres local de ensayo'
[[ ${PGSERVICE:-} == '' && ${PGSERVICEFILE:-} == '' ]] || fail 'No usar perfiles remotos de conexión'
command -v psql >/dev/null || fail 'psql no disponible'
command -v stdbuf >/dev/null || fail 'stdbuf no disponible'
command -v git >/dev/null || fail 'git no disponible'
[[ $(git hash-object --no-filters "$CANDIDATE") == "$EXPECTED_BLOB" ]] || fail 'SQL R4.1 no coincide con Git blob aprobado'
[[ -z ${VISURA_F3A_QA_LOG_DIR:-} ]] && LOGDIR="$(mktemp -d /tmp/visura-f3a-pg17-XXXXXX)" || LOGDIR="$VISURA_F3A_QA_LOG_DIR"
mkdir -p "$LOGDIR"
export PGCONNECT_TIMEOUT=3
PSQL=(psql -X -A -t -q -P pager=off -v ON_ERROR_STOP=1)

# These guards are a defense-in-depth check, not proof against local tunnels.
preflight="$("${PSQL[@]}" -c "SELECT current_database()||'|'||current_user||'|'||current_setting('server_version_num')||'|'||coalesce(inet_server_addr()::text,'NULL')")" || fail 'No conecta al servidor de ensayo'
[[ "$preflight" == "$DB|postgres|17"*"|127.0.0.1" ]] || fail "Preflight no es PostgreSQL17 local aislado: $preflight"
printf 'ENV_ONLY_QA=%s\n' "$preflight" | tee "$LOGDIR/metadata.log"

[[ -f "$SQL/00_fixture.sql" ]] || fail 'Falta fixture'
"${PSQL[@]}" -f "$SQL/00_fixture.sql" >"$LOGDIR/setup.log" 2>&1 || fail "Setup falló; ver $LOGDIR/setup.log (no continuar)"
"${PSQL[@]}" -f "$CANDIDATE" >"$LOGDIR/install.log" 2>&1 || fail "SQL original R4.1 falló; ver $LOGDIR/install.log"

writer_pid=''; contender_pid=''
shutdown(){
  if [[ -n "$contender_pid" ]]; then kill "$contender_pid" 2>/dev/null || true; fi
  if [[ -n "$writer_pid" ]]; then kill "$writer_pid" 2>/dev/null || true; fi
}
trap shutdown EXIT

wait_marker(){
  local mark="$1" file="$2" proc="$3" n
  for n in $(seq 1 160); do
    grep -Fq -- "$mark" "$file" 2>/dev/null && return 0
    kill -0 "$proc" 2>/dev/null || break
    sleep .05
  done
  return 1
}

run_pair(){
  local prefix="$1" a_file="$2" b_file="$3" expected="$4"
  local a_log="$LOGDIR/${prefix}_A.log" b_log="$LOGDIR/${prefix}_B.log"
  : >"$a_log"; : >"$b_log"
  stdbuf -oL -eL "${PSQL[@]}" -f "$SQL/$a_file" >"$a_log" 2>&1 &
  writer_pid="$!"
  wait_marker 'A_WRITTEN' "$a_log" "$writer_pid" || fail "$prefix: no se observó A_WRITTEN con A todavía activa"
  ! grep -q 'A_COMMITTED' "$a_log" || fail "$prefix: A confirmó antes de iniciar B"
  local barrier_time; barrier_time="$(date -u +'%Y-%m-%dT%H:%M:%S.%NZ')"
  stdbuf -oL -eL "${PSQL[@]}" -f "$SQL/$b_file" >"$b_log" 2>&1 &
  contender_pid="$!"
  wait_marker 'B_ATTEMPT' "$b_log" "$contender_pid" || fail "$prefix: B no inició la llamada"
  local apid bpid n lockseen=0
  apid="$(grep -oE 'A_PID=[0-9]+' "$a_log" | head -1 | cut -d= -f2)"
  bpid="$(grep -oE 'B_PID=[0-9]+' "$b_log" | head -1 | cut -d= -f2)"
  [[ "$apid" =~ ^[0-9]+$ && "$bpid" =~ ^[0-9]+$ && "$apid" != "$bpid" ]] || fail "$prefix: faltan PID distintos"
  # A third observer must see B waiting for a real PostgreSQL lock.
  for n in $(seq 1 65); do
    local cnt; cnt="$("${PSQL[@]}" -c "SELECT count(*) FROM pg_stat_activity WHERE pid=$bpid AND wait_event_type='Lock'" 2>/dev/null || echo error)"
    if [[ "$cnt" == '1' ]]; then lockseen=1;break;fi
    kill -0 "$contender_pid" 2>/dev/null || break
    sleep .07
  done
  [[ "$lockseen" == 1 ]] || fail "$prefix: NO ACREDITADO, B nunca fue observada esperando un bloqueo PostgreSQL"
  wait "$writer_pid" || fail "$prefix: fallo en transacción A"
  writer_pid=''
  wait "$contender_pid" || fail "$prefix: fallo en transacción B"
  contender_pid=''
  grep -Fq 'A_COMMITTED' "$a_log" || fail "$prefix: A no confirmó"
  grep -Fq "$expected" "$b_log" || fail "$prefix: falta evidencia $expected"
  local end_time;end_time="$(date -u +'%Y-%m-%dT%H:%M:%S.%NZ')"
  printf 'PASS_%s A_PID=%s B_PID=%s LOCK_WAIT_OBSERVED=1 BARRIER_UTC=%s END_UTC=%s\n' \
    "$prefix" "$apid" "$bpid" "$barrier_time" "$end_time" | tee -a "$LOGDIR/metadata.log"
}

run_pair 'CAS' '10_A_cas.sql' '11_B_cas.sql' 'B_CAS_40001_WAIT_MS='
run_pair 'SAME_UUID' '20_A_same_uuid.sql' '21_B_same_uuid.sql' 'B_SAME_UUID_IDENTICAL_WAIT_MS='
"${PSQL[@]}" -f "$SQL/30_assert_and_recovery.sql" >"$LOGDIR/recovery.log" 2>&1 || fail 'Fallo en conteos, recuperación o permisos'
grep -Fq 'PASS_2_REAL_SESSIONS_RECOVERY_IDEMPOTENCE_ACL' "$LOGDIR/recovery.log" || fail 'Falta PASS final de recuperación'
printf 'PASS_PROVISIONAL_PG17_QA_LOCAL_ONLY logs=%s\n' "$LOGDIR"
printf 'NO SUPABASE WRITES; DO NOT CLAIM IOS OR PRODUCTION APPROVAL\n'
