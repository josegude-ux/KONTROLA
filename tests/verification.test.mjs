import test from "node:test";
import assert from "node:assert/strict";
import {
  buildVerificationLines,
  parseCheckedQuantity,
  summarizeVerification
} from "../src/verification.mjs";

test("builds stable line numbers without merging duplicate products",()=>{
  const lines=buildVerificationLines([
    {sku:"PRD0000001",description:"Caja A",location:"A101-1",qty:2,unit:"CAJA"},
    {sku:"PRD0000001",description:"Caja A",location:"A101-1",qty:3,unit:"CAJA"}
  ]);
  assert.deepEqual(lines.map(line=>line.lineNumber),[1,2]);
  assert.deepEqual(lines.map(line=>line.expectedQuantity),[2,3]);
});

test("accepts non-negative physical quantities with Spanish decimal separator",()=>{
  assert.equal(parseCheckedQuantity("12,5"),12.5);
  assert.equal(parseCheckedQuantity("0"),0);
  assert.throws(()=>parseCheckedQuantity("-1"),/cantidad/i);
  assert.throws(()=>parseCheckedQuantity(""),/cantidad/i);
  assert.throws(()=>parseCheckedQuantity("1.2.3"),/cantidad/i);
});

test("summarizes pending, matching and differing lines independently from preparation",()=>{
  const summary=summarizeVerification([
    {expectedQuantity:2,checkedQuantity:2},
    {expectedQuantity:3,checkedQuantity:1},
    {expectedQuantity:4,checkedQuantity:null}
  ]);
  assert.deepEqual(summary,{total:3,checked:2,pending:1,matches:1,differences:1,canFinish:false});
});

test("allows completion with differences once every line is checked",()=>{
  const summary=summarizeVerification([
    {expectedQuantity:2,checkedQuantity:2},
    {expectedQuantity:3,checkedQuantity:1}
  ]);
  assert.equal(summary.canFinish,true);
  assert.equal(summary.differences,1);
});
