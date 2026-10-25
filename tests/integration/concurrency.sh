#!/usr/bin/env bash
set -euo pipefail

DB="${1:-kontrola_test}"
if [[ -n "${PGHOST:-}" ]]; then
  PSQL=(psql -v ON_ERROR_STOP=1 -d "$DB")
else
  PSQL=(sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB")
fi

"${PSQL[@]}" <<'SQL' >/dev/null
insert into public.kontrola_cargas(
 codigo,productos,documento_ruta,documento_hash,publicado_por,almacen,estado
) values
 ('LP26-30001','[{"sku":"PRD0000010","description":"Race","location":"A101-1","qty":1,"unit":"CAJA"}]',
  'documentos/LP26-30001/cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc.pdf',
  repeat('c',64),'00000000-0000-0000-0000-000000000001','COR_01_COR','publicada'),
 ('LP26-30002','[{"sku":"PRD0000011","description":"Race 2","location":"B101-1","qty":1,"unit":"CAJA"}]',
  'documentos/LP26-30002/dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd.pdf',
  repeat('d',64),'00000000-0000-0000-0000-000000000001','COR_01_COR','publicada')
on conflict(codigo) do nothing;
SQL

call_as(){
  local user="$1" sql="$2"
  "${PSQL[@]}" -qAt <<SQL
set role authenticated;
select set_config('request.jwt.claim.sub','$user',false);
$sql
SQL
}

set +e
call_as "00000000-0000-0000-0000-000000000002" \
  "select codigo from public.kontrola_iniciar_preparacion('LP26-30001','30000000-0000-0000-0000-000000000001');" \
  >/tmp/kontrola-race-one.log 2>&1 &
pid_one=$!
call_as "00000000-0000-0000-0000-000000000003" \
  "select codigo from public.kontrola_iniciar_preparacion('LP26-30001','30000000-0000-0000-0000-000000000002');" \
  >/tmp/kontrola-race-two.log 2>&1 &
pid_two=$!
wait "$pid_one";status_one=$?
wait "$pid_two";status_two=$?
set -e

if [[ $status_one -eq 0 && $status_two -eq 0 ]] || [[ $status_one -ne 0 && $status_two -ne 0 ]]; then
  echo "expected exactly one successful preparer" >&2
  exit 1
fi

winner=$("${PSQL[@]}" -qAt -c "select operario_id from public.kontrola_preparaciones where codigo='LP26-30001'")
call_as "$winner" \
  "select codigo from public.kontrola_iniciar_preparacion('LP26-30002','30000000-0000-0000-0000-000000000003');" \
  >/dev/null

active=$("${PSQL[@]}" -qAt -c "select count(*) from public.kontrola_preparaciones where operario_id='$winner' and fin is null")
reason=$("${PSQL[@]}" -qAt -c "select cierre_motivo from public.kontrola_preparaciones where codigo='LP26-30001'")
[[ "$active" == "1" ]]
[[ "$reason" == "Cambio de carga a LP26-30002" ]]

set +e
call_as "00000000-0000-0000-0000-000000000001" \
  "select repetida from public.kontrola_reservar_importacion('LP26-40001',repeat('f',64),'race.pdf',1000);" \
  >/tmp/kontrola-import-race-one.log 2>&1 &
import_pid_one=$!
call_as "00000000-0000-0000-0000-000000000001" \
  "select repetida from public.kontrola_reservar_importacion('LP26-40001',repeat('f',64),'race.pdf',1000);" \
  >/tmp/kontrola-import-race-two.log 2>&1 &
import_pid_two=$!
wait "$import_pid_one";import_status_one=$?
wait "$import_pid_two";import_status_two=$?
set -e

[[ $import_status_one -eq 0 && $import_status_two -eq 0 ]]
[[ $("${PSQL[@]}" -qAt -c "select count(*) from public.kontrola_importaciones where documento_hash=repeat('f',64)") == "1" ]]
[[ $(cat /tmp/kontrola-import-race-one.log /tmp/kontrola-import-race-two.log | rg -c '^[ft]$') == "2" ]]
[[ $(cat /tmp/kontrola-import-race-one.log /tmp/kontrola-import-race-two.log | rg -c '^f$') == "1" ]]
[[ $(cat /tmp/kontrola-import-race-one.log /tmp/kontrola-import-race-two.log | rg -c '^t$') == "1" ]]
echo "KONTROLA_CONCURRENCY_OK preparer=$winner import_reservation=serialized"
