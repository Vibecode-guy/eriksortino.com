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

test('cancelled dispatch can be reassigned and completed without double-counting recovery',()=>{
 const s=E.initialState({seed:20261102,count:100});
 const i=E.createIncident(s,'AV-104','flatbed');
 const first=E.eligibleProviders(s,i.id)[0];
 E.recordProviderOffer(s,i.id,first.id,'accepted');
 E.advance(s,i.id); // en route, before on-scene arrival
 const cancelledAt=s.minute;
 E.cancelProviderAssignment(s,i.id,'Synthetic vehicle breakdown');
 assert.equal(s.minute,cancelledAt);
 assert.equal(i.onSceneAt,null);
 assert.equal(E.kpis(s).completed,0);
 assert.equal(E.providerBoard(s).find(p=>p.id===first.id).busy,false);
 const replacement=E.eligibleProviders(s,i.id).find(p=>p.id!==first.id);
 assert.ok(replacement,'a second compatible crew must be available');
 E.recordProviderOffer(s,i.id,replacement.id,'accepted');
 assert.equal(E.providerBoard(s).find(p=>p.id===replacement.id).busy,true);
 for(let step=0;step<3;step++)E.advance(s,i.id);
 assert.equal(i.status,'completed');
 assert.equal(i.arrivalProviderId,replacement.id);
 assert.equal(E.kpis(s).completed,1);
 assert.equal(E.kpis(s).active,0);
 assert.equal(E.kpis(s).available,100);
 assert.equal(E.providerBoard(s).filter(p=>p.busy).length,0);
 assert.equal(s.providerCancellations.length,1);
 assert.equal(s.providerOffers.filter(o=>o.outcome==='accepted').length,2);
 assert.equal(E.providerAcceptance(s).find(p=>p.id===first.id||p.providerId===first.id).accepted,1);
 assert.equal(E.providerQuality(s).find(p=>p.providerId===first.id).cancellations,1);
});

test('timed-out offers remain auditable and cannot silently reserve a team',()=>{
 const s=E.initialState({seed:20261102,count:100});
 const i=E.createIncident(s,'AV-104','flatbed');
 const team=E.eligibleProviders(s,i.id)[0];
 const minute=s.minute;
 const offer=E.recordProviderOffer(s,i.id,team.id,'timed_out');
 assert.deepEqual(offer,{incidentId:i.id,providerId:team.id,outcome:'timed_out',minute});
 assert.equal(i.status,'queued');
 assert.equal(s.minute,minute);
 assert.equal(E.providerBoard(s).find(p=>p.id===team.id).busy,false);
 assert.ok(E.eligibleProviders(s,i.id).some(p=>p.id===team.id));
 assert.throws(()=>E.recordProviderOffer(s,i.id,team.id,'accepted'),/already offered/);
 const alternative=E.eligibleProviders(s,i.id).find(p=>p.id!==team.id);
 assert.ok(alternative,'a compatible alternative is required');
 E.recordProviderOffer(s,i.id,alternative.id,'accepted');
 assert.equal(i.providerId,alternative.id);
 assert.equal(E.providerBoard(s).find(p=>p.id===alternative.id).busy,true);
 assert.equal(s.providerOffers.filter(o=>o.outcome==='timed_out').length,1);
});
test('invalid offers cannot mutate queue, capacity, or offer history',()=>{
 const s=E.initialState();
 const i=E.createIncident(s,'AV-104','flatbed');
 const incapable=s.providers.find(p=>!p.capabilities.includes('flatbed'));
 assert.ok(incapable);
 const snapshot=JSON.stringify(s);
 assert.throws(()=>E.recordProviderOffer(s,i.id,incapable.id,'accepted'),/not equipped/);
 assert.throws(()=>E.recordProviderOffer(s,i.id,s.providers.find(p=>p.capabilities.includes('flatbed')).id,'unknown'),/Invalid offer outcome/);
 assert.equal(JSON.stringify(s),snapshot);
});
