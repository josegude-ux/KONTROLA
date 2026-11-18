import test from 'node:test';
import assert from 'node:assert/strict';
import {crearRepositorioIndexedDBChecksF3A} from '../src/control-cargas-f3a-outbox.mjs';

const scope='_visura_'+'b'.repeat(24);
function fakeIDB(){
  const connections=[];
  let opens=0;
  const idb={open(name,version){
    assert.equal(version,1);
    assert.ok(name.startsWith('visura_f3a_checks_outbox_v1'));
    opens++;
    const db={closed:false,onclose:null,onversionchange:null,
      close(){this.closed=true;},
      transaction(storeName,mode){
        if(this.closed)throw Object.assign(new Error('IDB connection closed'),{name:'InvalidStateError'});
        assert.equal(storeName,'colas');assert.equal(mode,'readonly');
        return {objectStore(){return {get(key){const req={};queueMicrotask(()=>{req.result={key,value:opens};req.onsuccess?.()});return req;}}}};
      }
    };
    connections.push(db);
    const req={result:db};queueMicrotask(()=>req.onsuccess?.());return req;
  }};
  return {idb,connections,get opens(){return opens},
    closeUnexpectedly(){const db=connections.at(-1);db.closed=true;db.onclose?.({target:db});},
    requestUpgrade(){const db=connections.at(-1);db.onversionchange?.({target:db,oldVersion:1,newVersion:2});}
  };
}

test('L1: cierre inesperado de conexion invalida cache y permite reapertura posterior',async()=>{
  const fake=fakeIDB();const repo=crearRepositorioIndexedDBChecksF3A({scope,idb:fake.idb});
  assert.equal((await repo.read('k')).value,1);
  fake.closeUnexpectedly();
  assert.equal(fake.opens,1,'no reintentar de forma automatica');
  assert.equal((await repo.read('k')).value,2);
  assert.equal(fake.opens,2);
});

test('L2: versionchange cierra la conexion anterior para liberar upgrade',async()=>{
  const fake=fakeIDB();const repo=crearRepositorioIndexedDBChecksF3A({scope,idb:fake.idb});
  await repo.read('k');
  fake.requestUpgrade();
  assert.equal(fake.connections[0].closed,true,'la conexion obsoleta debe cerrarse');
  assert.equal(fake.opens,1);
  assert.equal((await repo.read('k')).value,2);
  assert.equal(fake.opens,2);
});

test('L3: un evento tardio de conexion antigua no invalida la apertura nueva',async()=>{
  const fake=fakeIDB();const repo=crearRepositorioIndexedDBChecksF3A({scope,idb:fake.idb});
  await repo.read('k');
  fake.closeUnexpectedly();
  assert.equal((await repo.read('k')).value,2);
  fake.connections[0].onclose?.({target:fake.connections[0]});
  assert.equal((await repo.read('k')).value,2);
  assert.equal(fake.opens,2,'la cache nueva sigue activa');
});
