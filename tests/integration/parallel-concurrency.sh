#!/usr/bin/env bash
set -euo pipefail

# Ejecutar solo desde tests/integration/run.sh, en su BD efímera y local.
DB="${1:-kontrola_test}"
case "$DB" in
  kontrola_test|kontrola_test_*) ;;
  *) echo "Base no apta para prueba paralela" >&2; exit 2;;
esac
if [[ -n "${PGHOST:-}" && "${PGHOST}" != "localhost" && "${PGHOST}" != "127.0.0.1" && "${PGHOST}" != "::1" ]]; then
  echo "Prohibido ejecutar contra PostgreSQL remoto" >&2
  exit 2
fi
if [[ -n "${PGHOST:-}" ]]; then
  PSQL=(psql -v ON_ERROR_STOP=1 -d "$DB")
else
  PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB")
fi

"${PSQL[@]}" <<'SQL' >/dev/null
insert into public.kontrola_cargas(codigo,productos,documento_ruta,documento_hash,publicado_por,almacen,estado)
values (
 'LP26-70004',
 '[{"sku":"PRD0000704","description":"Palé concurrente","location":"A101-4","qty":1,"unit":"CAJA"}]',
 'documentos/LP26-70004/'||repeat('9',64)||'.pdf',repeat('9',64),
 '00000000-0000-0000-0000-000000000001','COR_01_COR','publicada'
);
SQL

start_as(){
  local user="$1" request="$2"
  "${PSQL[@]}" -qAt <<SQL
set role authenticated;
select set_config('request.jwt.claim.sub','$user',false);
select id from public.kontrola_iniciar_verificacion('LP26-70004','$request');
SQL
}
set +e
start_as "00000000-0000-0000-0000-000000000001" "70000000-0000-0000-0000-000000000011" >/tmp/kontrola-parallel-race-a.log 2>&1 &
pid_a=$!
start_as "00000000-0000-0000-0000-000000000003" "70000000-0000-0000-0000-000000000012" >/tmp/kontrola-parallel-race-b.log 2>&1 &
pid_b=$!
wait "$pid_a";status_a=$?
wait "$pid_b";status_b=$?
set -e

if [[ "$status_a" -eq 0 && "$status_b" -eq 0 ]] || [[ "$status_a" -ne 0 && "$status_b" -ne 0 ]];then
  echo "Expected exactly one successful reviewer: a=$status_a b=$status_b" >&2
  cat /tmp/kontrola-parallel-race-a.log /tmp/kontrola-parallel-race-b.log >&2
  exit 1
fi
if [[ "$status_a" -eq 0 ]];then loser="/tmp/kontrola-parallel-race-b.log";else loser="/tmp/kontrola-parallel-race-a.log";fi
grep -q "Carga asignada a otro verificador" "$loser"
count=$("${PSQL[@]}" -qAt -c "select count(*) from public.kontrola_verificaciones where codigo='LP26-70004'")
events=$("${PSQL[@]}" -qAt -c "select count(*) from public.kontrola_actividad where codigo='LP26-70004' and tipo='verificacion_iniciada'")
preparations=$("${PSQL[@]}" -qAt -c "select count(*) from public.kontrola_preparaciones where codigo='LP26-70004'")
[[ "$count" == "1" && "$events" == "1" && "$preparations" == "0" ]]
echo "KONTROLA_PARALLEL_RACE_OK one_reviewer=1 events=1 fabricated_preparations=0"
