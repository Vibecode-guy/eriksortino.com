'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('./project3-engine.js');

// Fixture reproducibility is independent of wall clock, browser, and telemetry.
test('seeded fleet fixtures are reproducible at 12, 100, and 240 vehicles',()=>{
 for(const count of [12,100,240]){
  for(const seed of [0,20261102,4294967295]){
   const a=E.initialState({seed,count}),b=E.initialState({seed,count});
   assert.deepEqual(a.vehicles,b.vehicles);
   assert.equal(a.vehicles.length,count);
   assert.equal(new Set(a.vehicles.map(v=>v.id)).size,count);
   assert.equal(a.providers.length,6);
   assert.ok(a.vehicles.every(v=>v.status==='available'));
   assert.equal(a.incidents.length,0);
   assert.equal(a.minute,0);
  }
 }
});
test('different seeds alter generated positions but preserve twelve demonstration anchors',()=>{
 const a=E.initialState({seed:1,count:100}).vehicles;
 const b=E.initialState({seed:2,count:100}).vehicles;
 assert.deepEqual(a.slice(0,12),b.slice(0,12));
 assert.notDeepEqual(a.slice(12).map(v=>[v.lat,v.lon]),b.slice(12).map(v=>[v.lat,v.lon]));
});
test('invalid fixture configurations fail rather than silently truncating',()=>{
 for(const count of [11,241,-1,100.5,NaN,Infinity])
  assert.throws(()=>E.initialState({seed:20261102,count}),/Fleet size/);
 for(const seed of [-1,4294967296,1.5,NaN,Infinity])
  assert.throws(()=>E.initialState({seed,count:100}),/Fleet seed/);
});
test('fresh seeded state is isolated from prior incident and provider mutation',()=>{
 const a=E.initialState({seed:20261102,count:100});
 const original=E.initialState({seed:20261102,count:100});
 const i=E.createIncident(a,'AV-101','door_ajar');
 E.assign(a,i.id,E.eligibleProviders(a,i.id)[0].id);
 a.providers[0].name='Modified only in test state';
 const reset=E.initialState({seed:20261102,count:100});
 assert.deepEqual(reset,original);
 assert.equal(reset.incidents.length,0);
 assert.equal(E.providerBoard(reset).filter(p=>p.busy).length,0);
});
