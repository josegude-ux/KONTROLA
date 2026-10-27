import test from "node:test";
import assert from "node:assert/strict";
import {rpcNames,summarize,matchesFn,hasSafeAccess,validateExtraContracts,report} from "../scripts/preflight-b01-rpc.mjs";

test("nombres RPC identificados sin contar llamadas duplicadas",()=>{
 assert.deepEqual(rpcNames('client.rpc("kontrola_x",{}) client.rpc("kontrola_x") client.rpc("kontrola_y")'),["kontrola_x","kontrola_y"]);
});
test("informa la divergencia real y no certifica integración",()=>{
 const x=summarize({parallel:'client.rpc("shared")',responsive:'client.rpc("shared")',documental:'client.rpc("shared") client.rpc("extra")'});
 assert.deepEqual(x.common,["shared"]);
 assert.deepEqual(x.docsOnly,["extra"]);
 assert.deepEqual(x.parallelOnly,[]);
 const md=report({summary:x,checks:[],shas:{parallel:"a",responsive:"b",documental:"c"}});
 assert.match(md,/NO INTEGRADO/);
 assert.match(md,/extra/);
});
test("exige definición y permisos explícitos; GRANT solo no basta",()=>{
 const name="kontrola_reservar_provisional_pdf";
 const sql="create or replace function public."+name+"(p_hash text) returns text as $$ select null::text $$ language sql; "+
 "revoke all on function public."+name+"(text) from public,anon; "+
 "grant execute on function public."+name+"(text) to authenticated;";
 assert.ok(matchesFn(sql,name));
 assert.ok(hasSafeAccess(sql,name));
 assert.equal(hasSafeAccess(sql.replace("from public,anon","from anon"),name),false);
 assert.equal(hasSafeAccess(sql.replace("to authenticated","to public"),name),false);
 const incomplete=validateExtraContracts({calls:[name],sql});
 assert.equal(incomplete.filter(v=>v.inClient&&v.inProposal&&v.guardedByGrant).length,1);
 assert.equal(incomplete.length,3);
});
