'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('./project3-engine.js');

// Synthetic fixtures only. This is a configuration/identity contract, not telemetry.
test('all supported fleet sizes retain stable seeded prefixes and six independent teams',()=>{
 for(const seed of [0,20261102,4294967295]){
  const full=E.initialState({seed,count:240});
  const ids=full.vehicles.map(v=>v.id);
  assert.equal(new Set(ids).size,240);
  assert.deepEqual(ids,Array.from({length:240},(_,n)=>'AV-'+(n+101)));
  for(let count=12;count<=240;count++){
   const state=E.initialState({seed,count});
   assert.deepEqual(state.vehicles,full.vehicles.slice(0,count),'prefix must be independent of requested count');
   assert.equal(state.providers.length,6);
   assert.equal(new Set(state.providers.map(p=>p.id)).size,6);
   assert.ok(state.vehicles.every(v=>Number.isFinite(v.lat)&&Number.isFinite(v.lon)&&v.lat>=-90&&v.lat<=90&&v.lon>=-180&&v.lon<=180));
  }
 }
});
