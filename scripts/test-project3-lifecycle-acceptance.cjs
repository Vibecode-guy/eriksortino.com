/* Project 3 deterministic lifecycle acceptance at the engine boundary.
   Synthetic fixtures only; this is not a browser interaction test. */
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('./project3-engine.js');

test('incident to assignment, passenger clearance, completion and KPI reconciliation',()=>{
 const s=E.initialState({seed:20261102,count:100});
 const before=E.kpis(s);
 assert.equal(before.total,100);
 assert.equal(before.available,100);
 const i=E.createIncident(s,'AV-101','immobilized');
 assert.equal(E.kpis(s).available,99);
 assert.equal(E.kpis(s).active,1);
 E.flagCustomerDanger(s,i.id,'unsafe_location');
 E.escalateCustomerEmergency(s,i.id);
 assert.equal(E.safetyMetrics(s).awaiting,1);
 assert.equal(E.incidentSla(s,i.id).closed,false);
 const replacement=E.availableReplacementAVs(s,i.id)[0];
 assert.ok(replacement&&replacement.id!=='AV-101');
 E.dispatchReplacement(s,i.id,replacement.id);
 assert.equal(E.kpis(s).available,98);
 assert.throws(()=>E.completePassengerTransfer(s,i.id,true),/arrive/i);
 E.arriveReplacement(s,i.id);
 assert.throws(()=>E.completePassengerTransfer(s,i.id,false),/clearance/i);
 E.completePassengerTransfer(s,i.id,true);
 assert.equal(E.kpis(s).available,99);
 assert.equal(E.safetyMetrics(s).awaiting,0);
 assert.equal(E.safetyMetrics(s).safe,1);
 assert.equal(E.incidentSla(s,i.id).closed,true);
 const offers=E.eligibleProviders(s,i.id);
 assert.ok(offers.length>0);
 E.assign(s,i.id,offers[0].id);
 assert.equal(E.providerBoard(s).find(p=>p.id===offers[0].id).busy,true);
 for(let n=0;n<3;n++)E.advance(s,i.id);
 assert.equal(i.status,'completed');
 assert.equal(E.providerBoard(s).find(p=>p.id===offers[0].id).busy,false);
 const after=E.kpis(s);
 assert.equal(after.available,100);
 assert.equal(after.active,0);
 assert.equal(after.completed,1);
 assert.equal(after.totalCost,i.cost);
 assert.equal(after.meanResponse,i.onSceneAt-i.created);
 assert.equal(after.p90Response,after.meanResponse);
 const stages=E.responsePerformance(s);
 assert.equal(stages.find(x=>x.key==='passenger_transfer').samples,1);
 assert.equal(stages.find(x=>x.key==='vehicle_recovery').samples,1);
 assert.equal(E.customerSafetyTimeline(s,i.id).some(x=>x.label==='Passenger transfer confirmed'),true);
});
test('same seed and actions reproduce workflow timestamps, safety and costs',()=>{
 function run(){
  const s=E.initialState({seed:73,count:240});
  const i=E.createIncident(s,'AV-200','door_ajar');
  const p=E.eligibleProviders(s,i.id)[0];
  E.assign(s,i.id,p.id);
  E.advance(s,i.id);E.advance(s,i.id);E.advance(s,i.id);
  return {vehicle:s.vehicles.find(v=>v.id==='AV-200'),incident:i,kpis:E.kpis(s),team:E.providerBoard(s).find(x=>x.id===p.id)};
 }
 assert.deepEqual(run(),run());
});

test('provider capacity and equipment guards prevent double assignment without corrupting queue',()=>{
 const s=E.initialState({seed:20261102,count:100});
 const first=E.createIncident(s,'AV-101','flatbed');
 const second=E.createIncident(s,'AV-102','flatbed');
 const eligible=E.eligibleProviders(s,first.id);
 assert.ok(eligible.length>0);
 const chosen=eligible[0];
 E.assign(s,first.id,chosen.id);
 assert.equal(E.eligibleProviders(s,second.id).some(p=>p.id===chosen.id),false);
 assert.throws(()=>E.assign(s,second.id,chosen.id),/already assigned/i);
 assert.equal(second.status,'queued');
 assert.equal(second.providerId,null);
 const incapable=s.providers.find(p=>!p.capabilities.includes('flatbed'));
 assert.ok(incapable);
 assert.throws(()=>E.assign(s,second.id,incapable.id),/not equipped/i);
 assert.equal(E.kpis(s).active,2);
 for(let n=0;n<3;n++)E.advance(s,first.id);
 assert.equal(E.eligibleProviders(s,second.id).some(p=>p.id===chosen.id),true);
});

test('passenger safety guard failures preserve availability and timestamps',()=>{
 const s=E.initialState({seed:20261102,count:100});
 const i=E.createIncident(s,'AV-103','immobilized');
 assert.throws(()=>E.escalateCustomerEmergency(s,i.id),/flag customer danger/i);
 E.flagCustomerDanger(s,i.id,'unsafe_location');
 assert.throws(()=>E.flagCustomerDanger(s,i.id,'unsafe_location'),/already flagged/i);
 E.escalateCustomerEmergency(s,i.id);
 assert.throws(()=>E.escalateCustomerEmergency(s,i.id),/already recorded/i);
 const r=E.availableReplacementAVs(s,i.id)[0];
 assert.throws(()=>E.dispatchReplacement(s,i.id,i.vehicleId),/different available/i);
 E.dispatchReplacement(s,i.id,r.id);
 assert.throws(()=>E.dispatchReplacement(s,i.id,r.id),/already dispatched/i);
 E.arriveReplacement(s,i.id);
 const at=s.minute;
 assert.throws(()=>E.completePassengerTransfer(s,i.id,false),/clearance/i);
 assert.equal(s.minute,at);
 assert.equal(E.kpis(s).available,98);
 assert.equal(E.safetyMetrics(s).awaiting,1);
 E.completePassengerTransfer(s,i.id,true);
 assert.equal(E.kpis(s).available,99);
 assert.equal(E.safetyMetrics(s).awaiting,0);
});

test('seeded fleet configuration preserves unique IDs, stable anchor points and isolated resets',()=>{
 const baseline=E.initialState({seed:20261102,count:100});
 const repeated=E.initialState({seed:20261102,count:100});
 assert.deepEqual(baseline.vehicles,repeated.vehicles);
 assert.equal(baseline.vehicles.length,100);
 assert.equal(baseline.providers.length,6);
 assert.equal(new Set(baseline.vehicles.map(v=>v.id)).size,100);
 const large=E.initialState({seed:20261102,count:240});
 assert.equal(large.vehicles.length,240);
 assert.deepEqual(large.vehicles.slice(0,100),baseline.vehicles);
 assert.deepEqual(large.vehicles.slice(0,12),baseline.vehicles.slice(0,12));
 const different=E.initialState({seed:20261103,count:100});
 assert.deepEqual(different.vehicles.slice(0,12),baseline.vehicles.slice(0,12));
 assert.notDeepEqual(different.vehicles.slice(12),baseline.vehicles.slice(12));
 E.createIncident(baseline,'AV-101','door_ajar');
 assert.equal(repeated.vehicles[0].status,'available');
 assert.equal(E.kpis(repeated).active,0);
 assert.equal(E.initialState({seed:20261102,count:100}).vehicles[0].status,'available');
});

test('fleet configuration rejects invalid seeds and sizes before generating fixtures',()=>{
 for(const count of [0,11,241,100.5,NaN,Infinity])assert.throws(()=>E.initialState({seed:1,count}),/fleet size/i);
 for(const seed of [-1,4294967296,1.5,NaN,Infinity])assert.throws(()=>E.initialState({seed,count:100}),/seed/i);
});

test('dispatch fallback uses latitude-aware great-circle distance and remains explicitly synthetic',()=>{
 const s=E.initialState({seed:20261102,count:100});
 const i=E.createIncident(s,'AV-101','door_ajar');
 const v=s.vehicles.find(v=>v.id==='AV-101');
 const p=s.providers.find(p=>p.id==='P-01');
 const rad=Math.PI/180;
 const dLat=(p.lat-v.lat)*rad,dLon=(p.lon-v.lon)*rad;
 const a=Math.sin(dLat/2)**2+Math.cos(v.lat*rad)*Math.cos(p.lat*rad)*Math.sin(dLon/2)**2;
 const expected=Math.max(6,Math.round((6371*2*Math.asin(Math.sqrt(a)))/.52+5));
 const offer=E.eligibleProviders(s,i.id).find(x=>x.id===p.id);
 assert.equal(offer.estimatedMinutes,expected);
 assert.match(offer.estimateBasis,/Synthetic straight-line/);
 assert.match(offer.estimateBasis,/no road routing or traffic/);
 // At high latitude, one longitude degree is much shorter than at the equator.
 // Reposition only the test fixture; never present these as actual LA vehicles.
 v.lat=70;v.lon=0;p.lat=70;p.lon=1;
 const polar=E.eligibleProviders(s,i.id).find(x=>x.id===p.id).estimatedMinutes;
 v.lat=0;p.lat=0;
 const equatorial=E.eligibleProviders(s,i.id).find(x=>x.id===p.id).estimatedMinutes;
 assert.ok(polar<equatorial);
 assert.deepEqual(E.eligibleProviders(s,i.id),E.eligibleProviders(s,i.id));
});
