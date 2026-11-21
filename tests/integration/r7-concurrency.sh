#!/usr/bin/env bash
set -euo pipefail
# Solo PostgreSQL aislado de tests. run.sh controla DB y PGHOST.
DB="${1:-kontrola_test}"
case "$DB" in kontrola_test|kontrola_test_*) ;; *) echo "R7: base de pruebas inválida" >&2;exit 2;; esac
if [[ -n "${PGHOST:-}" && "$PGHOST" != localhost && "$PGHOST" != 127.0.0.1 && "$PGHOST" != "::1" ]];then
 echo "R7: prohibido ejecutar en PostgreSQL remoto" >&2;exit 2
fi
if [[ -n "${PGHOST:-}" ]];then PSQL=(psql -v ON_ERROR_STOP=1 -d "$DB");else
 PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB");fi

call_as_admin(){
 "${PSQL[@]}" -qAt <<'SQL'
set role authenticated;
select set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000001',false);
select resultado from public.kontrola_registrar_generacion_r7(
 'COR_01_COR','LP26-88002',repeat('b',64),now()
);
SQL
}
set +e
call_as_admin >/tmp/visura-r7-race-a.log 2>&1 & one=$!
call_as_admin >/tmp/visura-r7-race-b.log 2>&1 & two=$!
wait "$one";st1=$?
wait "$two";st2=$?
set -e
if [[ "$st1" != 0 || "$st2" != 0 ]];then
 echo "R7: hubo una falla concurrente (a=$st1, b=$st2)" >&2;exit 1
fi
count_new=$(grep -c '^REGISTRADO$' /tmp/visura-r7-race-a.log /tmp/visura-r7-race-b.log | awk -F: '{total+=$2} END {print total+0}')
count_old=$(grep -c '^YA_REGISTRADO$' /tmp/visura-r7-race-a.log /tmp/visura-r7-race-b.log | awk -F: '{total+=$2} END {print total+0}')
if [[ "$count_new" != 1 || "$count_old" != 1 ]];then
 echo "R7: dos sesiones no respetaron idempotencia ($count_new / $count_old)" >&2;exit 1
fi
count=$("${PSQL[@]}" -qAt -c "select count(*) from public.kontrola_impresiones where codigo='LP26-88002' and documento_hash=repeat('b',64) and origen_generacion='R7'")
if [[ "$count" != 1 ]];then echo "R7: número erróneo de generaciones ($count)" >&2;exit 1;fi
echo "VISURA_R7_CONCURRENCY_OK dos_sesiones=correctas inserciones=1 duplicados=0"
