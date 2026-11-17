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
