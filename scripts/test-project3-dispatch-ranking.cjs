'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('./project3-engine.js');

// These are fictional dispatch offers, not actual road-network ETAs or vendor prices.
test('dispatch offer ranking is deterministic, equipped, available and auditable',()=>{
 const s=E.initialState({seed:20261102,count:100});
 const i=E.createIncident(s,'AV-104','flatbed');
 const offers=E.eligibleProviders(s,i.id);
 assert.ok(offers.length>=2);
 assert.ok(offers.every(p=>p.capabilities.includes('flatbed')));
 assert.ok(offers.every(p=>Number.isFinite(p.estimatedOnSceneMinutes)&&p.estimatedOnSceneMinutes>=0));
 assert.ok(offers.every(p=>Number.isFinite(p.estimatedCost)&&p.estimatedCost>0));
 assert.ok(offers.every(p=>/Synthetic|straight-line/.test(p.estimateBasis)));
 const order=(a,b)=>a.estimatedOnSceneMinutes-b.estimatedOnSceneMinutes||
   a.estimatedCost-b.estimatedCost||a.id.localeCompare(b.id);
 assert.deepEqual(offers.map(p=>p.id),[...offers].sort(order).map(p=>p.id));
 assert.deepEqual(E.eligibleProviders(s,i.id),offers,'same state must yield identical offers');
 const winner=offers[0];
 E.assign(s,i.id,winner.id);
 const second=E.createIncident(s,'AV-103','flatbed');
 assert.ok(!E.eligibleProviders(s,second.id).some(p=>p.id===winner.id),'occupied team must not be offered');
 assert.throws(()=>E.assign(s,second.id,winner.id),/already assigned/);
 for(let step=0;step<3;step++)E.advance(s,i.id);
 assert.ok(E.eligibleProviders(s,second.id).some(p=>p.id===winner.id),'team should return after completion');
});
test('modeled initial charge is consistent with provider and incident type',()=>{
 const s=E.initialState();
 for(const [type,surcharge] of [['door_ajar',0],['immobilized',0],['flat_tire',55],['flatbed',125],['depot',95]]){
  const i=E.createIncident(s,'AV-'+(101+s.incidents.length),type);
  for(const p of E.eligibleProviders(s,i.id)){
   assert.equal(p.estimatedCost,p.baseCost+surcharge);
  }
 }
});
