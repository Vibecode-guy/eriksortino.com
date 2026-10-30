// Synthetic validation only; run: node --test scripts/test-project2-data-quality.cjs
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const q=require('./project2-data-quality.js');
const cohort="createddate >= '2024-01-01T00:00:00' and createddate < '2025-01-01T00:00:00'";
test('all six queries use explicit 2024 cohort and real field names',()=>{
 assert.equal(q.METRICS.length,6);
 for(const m of q.METRICS){
  const params=new URLSearchParams(q.buildQuery(cohort,m.where));
  assert.equal(params.get('$select'),'count(*) as count');
  assert.equal(params.get('$where'),cohort+' and ('+m.where+')');
 }
});
test('OR coordinate filter is parenthesized within the creation cohort',()=>{
 const where=new URLSearchParams(q.buildQuery(cohort,'latitude is null or longitude is null')).get('$where');
 assert.ok(where.includes('and (latitude is null or longitude is null)'));
});
test('zero, partial and unavailable counts remain distinguishable',()=>{
 const rows=q.summarize(200,{nullZip:0,nullCoordinates:25,nullClosure:null});
 assert.equal(rows[0].percent,0);assert.equal(rows[1].percent,12.5);
 assert.equal(rows[4].count,null);assert.equal(rows[4].percent,null);
});
test('invalid, fractional, negative and excessive counts fail validation',()=>{
 for(const bad of [-1,.5,'bad',Number.MAX_SAFE_INTEGER+1,201])
  assert.throws(()=>q.summarize(200,{nullZip:bad}),/Invalid or inconsistent/);
});
test('zero denominator is not converted to a fabricated percentage',()=>{
 assert.equal(q.summarize(0,{nullZip:0})[0].percent,null);
 assert.throws(()=>q.summarize(-1,{}),/Invalid or inconsistent/);
});
test('missing cohort filters are rejected',()=>{
 assert.equal(new URLSearchParams(q.buildQuery(cohort)).get('$where'),cohort);
 assert.throws(()=>q.buildQuery('status = 1'),/creation cohort/);
});
