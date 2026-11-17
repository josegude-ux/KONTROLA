import test from 'node:test';
import assert from 'node:assert/strict';
import {crearRepositorioIndexedDBChecksF3A} from '../src/control-cargas-f3a-outbox.mjs';

const scope='_visura_'+'a'.repeat(24);

function fakeIDB({errorFirst=false,throwFirst=false}={}){
  let attempts=0;
  const records=new Map([['example',{key:'example',value:7}]]);
  const db={
    objectStoreNames:{contains:()=>true},
    transaction(name,mode){
      assert.equal(name,'colas');assert.equal(mode,'readonly');
      return {objectStore(store){assert.equal(store,'colas');return {get(key){
        const r={};queueMicrotask(()=>{r.result=records.get(key);r.onsuccess?.()});return r;
      }}}};
    }
  };
  const idb={
    open(name,version){
      attempts++;
      assert.ok(name.startsWith('visura_f3a_checks_outbox_v1'));
      assert.equal(version,1);
      if(throwFirst&&attempts===1)throw Error('transient synchronous IndexedDB failure');
      const request={result:db,error:null};
      const call=attempts;
      queueMicrotask(()=>{
        if(errorFirst&&call===1){
          request.error=Error('transient async IndexedDB failure');
          request.onerror?.();
        }else request.onsuccess?.();
      });
      return request;
    }
  };
  return {idb,get attempts(){return attempts;}};
}

test('I1: primer IDB.open rechazado, el segundo read reabre sin recargar',async()=>{
  const fake=fakeIDB({errorFirst:true});
  const repo=crearRepositorioIndexedDBChecksF3A({scope,idb:fake.idb});
  await assert.rejects(repo.read('example'),/transient async/);
  assert.deepEqual(await repo.read('example'),{key:'example',value:7});
  assert.equal(fake.attempts,2);
});

test('I2: fallo sincrónico al invocar IDB.open no bloquea un intento futuro',async()=>{
  const fake=fakeIDB({throwFirst:true});
  const repo=crearRepositorioIndexedDBChecksF3A({scope,idb:fake.idb});
  await assert.rejects(repo.read('example'),/transient synchronous/);
  assert.deepEqual(await repo.read('example'),{key:'example',value:7});
  assert.equal(fake.attempts,2);
});

test('I3: apertura correcta se reutiliza sin múltiples conexiones',async()=>{
  const fake=fakeIDB();
  const repo=crearRepositorioIndexedDBChecksF3A({scope,idb:fake.idb});
  const [one,two]=await Promise.all([repo.read('example'),repo.read('example')]);
  assert.deepEqual(one,two);
  assert.equal(fake.attempts,1);
  await repo.read('example');
  assert.equal(fake.attempts,1);
});
