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

test('declined offer does not occupy a crew or change queued incident',()=>{
 const s=E.initialState({seed:20261102,count:100});
 const i=E.createIncident(s,'AV-104','flatbed');
 const p=E.eligibleProviders(s,i.id)[0];
 const minute=s.minute;
 const offer=E.recordProviderOffer(s,i.id,p.id,'declined');
 assert.equal(offer.outcome,'declined');
 assert.equal(i.status,'queued');
 assert.equal(s.minute,minute);
 assert.ok(E.eligibleProviders(s,i.id).some(x=>x.id===p.id));
 assert.equal(E.providerBoard(s).find(x=>x.id===p.id).busy,false);
 assert.throws(()=>E.recordProviderOffer(s,i.id,p.id,'accepted'),/already offered/);
});
test('cancellation releases capacity and preserves an auditable reason',()=>{
 const s=E.initialState();
 const i=E.createIncident(s,'AV-104','flatbed');
 const p=E.eligibleProviders(s,i.id)[0];
 E.recordProviderOffer(s,i.id,p.id,'accepted');
 assert.ok(!E.eligibleProviders(s,i.id).some(x=>x.id===p.id) || i.status==='dispatched');
 const before=s.minute;
 assert.throws(()=>E.cancelProviderAssignment(s,i.id,''),/reason/);
 E.cancelProviderAssignment(s,i.id,'Synthetic crew unavailable');
 assert.equal(i.status,'queued');
 assert.equal(i.providerId,null);
 assert.equal(s.minute,before);
 assert.equal(s.providerCancellations.length,1);
 assert.equal(s.providerCancellations[0].providerId,p.id);
 assert.equal(s.providerCancellations[0].reason,'Synthetic crew unavailable');
 assert.equal(E.providerBoard(s).find(x=>x.id===p.id).busy,false);
 assert.ok(E.eligibleProviders(s,i.id).some(x=>x.id===p.id));
});
