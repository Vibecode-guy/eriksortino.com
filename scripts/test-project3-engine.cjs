'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('./project3-engine.js');
test('MVP: select AV, create event, assign eligible provider, complete and update KPIs',()=>{
 const s=E.initialState();assert.equal(E.kpis(s).available,100);
 s.selected='AV-101';const i=E.createIncident(s,s.selected,'flatbed');
 assert.equal(E.kpis(s).available,99);assert.equal(E.kpis(s).active,1);
 const candidates=E.eligibleProviders(s,i.id);assert.ok(candidates.length>0);assert.ok(candidates.every(p=>p.capabilities.includes('flatbed')));
 E.assign(s,i.id,candidates[0].id);assert.equal(i.status,'dispatched');
 E.advance(s,i.id);assert.equal(i.status,'en_route');
 E.advance(s,i.id);assert.equal(i.status,'on_scene');const response=i.onSceneAt-i.created;assert.ok(response>0);
 E.advance(s,i.id);assert.equal(i.status,'completed');
 const k=E.kpis(s);assert.equal(k.available,100);assert.equal(k.active,0);assert.equal(k.completed,1);assert.equal(k.meanResponse,response);assert.equal(k.p90Response,response);assert.ok(k.totalCost>0);
});
test('incompatible providers cannot be assigned and duplicate vehicle incidents are rejected',()=>{
 const s=E.initialState(),i=E.createIncident(s,'AV-104','flatbed');
 assert.throws(()=>E.assign(s,i.id,'P-01'),/not equipped/);
 assert.throws(()=>E.createIncident(s,'AV-104','door_ajar'),/unavailable/);
 assert.throws(()=>E.advance(s,i.id),/Assign provider first/);
});
test('escalation and SLA breaches depend on simulated time',()=>{
 const s=E.initialState(),i=E.createIncident(s,'AV-107','door_ajar');
 E.tick(s,31);assert.equal(E.kpis(s).breached,1);E.escalate(s,i.id);assert.equal(i.escalated,true);
 E.assign(s,i.id,'P-02');E.advance(s,i.id);E.advance(s,i.id);E.advance(s,i.id);
 assert.equal(E.kpis(s).breached,0);assert.throws(()=>E.escalate(s,i.id),/completed/);
});
test('nearest-rank p90 and mean use only completed incident on-scene times',()=>{
 const s=E.initialState();const first=E.createIncident(s,'AV-101','door_ajar');E.assign(s,first.id,'P-01');
 for(let n=0;n<3;n++)E.advance(s,first.id);
 const second=E.createIncident(s,'AV-112','depot');E.assign(s,second.id,'P-03');for(let n=0;n<3;n++)E.advance(s,second.id);
 const times=s.incidents.map(i=>i.onSceneAt-i.created).sort((a,b)=>a-b),k=E.kpis(s);
 assert.equal(k.meanResponse,(times[0]+times[1])/2);assert.equal(k.p90Response,times[1]);assert.equal(k.completed,2);
});
test('invalid clock advances and completed state transitions fail closed',()=>{
 const s=E.initialState(),i=E.createIncident(s,'AV-105','immobilized');assert.throws(()=>E.tick(s,-2),/Invalid/);
 E.assign(s,i.id,'P-02');for(let n=0;n<3;n++)E.advance(s,i.id);
 assert.throws(()=>E.advance(s,i.id),/already completed/);
 assert.throws(()=>E.assign(s,i.id,'P-02'),/queued/);
});

test('flat tire requires a service decision and flatbed-equipped provider for recovery',()=>{
 const s=E.initialState(),i=E.createIncident(s,'AV-101','flat_tire');
 E.assign(s,i.id,'P-02');E.advance(s,i.id);E.advance(s,i.id);
 assert.throws(()=>E.advance(s,i.id),/Choose tire service/);
 E.resolveTire(s,i.id,'flatbed');E.advance(s,i.id);
 assert.equal(i.tireResolution,'flatbed');assert.equal(i.cost,400);
 const t=E.createIncident(s,'AV-102','flat_tire');
 E.assign(s,t.id,'P-01');E.advance(s,t.id);E.advance(s,t.id);
 assert.throws(()=>E.resolveTire(s,t.id,'flatbed'),/lacks flatbed capability/);
 E.resolveTire(s,t.id,'roadside');E.advance(s,t.id);
 assert.equal(t.cost,150);
});

test('roadside-only tire assessment hands off to a separate flatbed crew',()=>{
 const s=E.initialState(),i=E.createIncident(s,'AV-101','flat_tire');
 E.assign(s,i.id,'P-01');E.advance(s,i.id);E.advance(s,i.id);
 const firstArrival=i.onSceneAt;
 E.requestRecovery(s,i.id,'P-02');
 assert.equal(i.status,'recovery_dispatched');
 assert.equal(i.recoveryProviderId,'P-02');
 assert.equal(i.onSceneAt,firstArrival);
 E.advance(s,i.id);assert.equal(i.status,'recovery_en_route');
 E.advance(s,i.id);assert.equal(i.status,'recovery_on_scene');
 assert.ok(i.recoveryOnSceneAt>firstArrival);
 E.advance(s,i.id);assert.equal(i.status,'completed');
 assert.equal(i.cost,495);
 assert.equal(E.kpis(s).available,100);
});

test('customer evacuation dispatches a second AV without resolving original recovery',()=>{
 const s=E.initialState(),i=E.createIncident(s,'AV-105','immobilized');
 const candidate=E.availableReplacementAVs(s,i.id)[0];
 const e=E.dispatchReplacement(s,i.id,candidate.id);
 assert.equal(e.status,'en_route');
 assert.equal(E.kpis(s).available,98);
 assert.throws(()=>E.dispatchReplacement(s,i.id,'AV-101'),/already dispatched/);
 assert.throws(()=>E.completePassengerTransfer(s,i.id,true),/must arrive/);
 E.arriveReplacement(s,i.id);
 assert.throws(()=>E.completePassengerTransfer(s,i.id,false),/clearance/);
 E.completePassengerTransfer(s,i.id,true);
 assert.equal(e.status,'transferred');
 assert.equal(i.status,'queued');
 assert.equal(E.kpis(s).available,99);
 assert.equal(s.vehicles.find(v=>v.id===candidate.id).status,'available');
});

test('critical customer danger is tracked separately from vehicle recovery',()=>{
 const s=E.initialState(),i=E.createIncident(s,'AV-105','immobilized');
 E.flagCustomerDanger(s,i.id,'exposed_roadway');
 assert.equal(i.severity,'Critical');assert.equal(i.escalated,true);
 assert.equal(i.customerSafety.safeAt,null);
 E.escalateCustomerEmergency(s,i.id);
 assert.notEqual(i.customerSafety.emergencyEscalatedAt,null);
 const second=E.availableReplacementAVs(s,i.id)[0];
 E.dispatchReplacement(s,i.id,second.id);
 E.arriveReplacement(s,i.id);
 assert.equal(i.customerSafety.safeAt,null);
 E.completePassengerTransfer(s,i.id,true);
 assert.ok(i.customerSafety.safeAt>=i.customerSafety.flaggedAt);
 assert.equal(i.status,'queued');
});

test('customer danger takes queue priority and safety metrics exclude vehicle recovery',()=>{
 const s=E.initialState();
 const ordinary=E.createIncident(s,'AV-101','door_ajar');
 const danger=E.createIncident(s,'AV-105','immobilized');
 E.flagCustomerDanger(s,danger.id,'unsafe_location');
 assert.equal(E.prioritizedIncidents(s)[0].id,danger.id);
 assert.equal(E.safetyMetrics(s).awaiting,1);
 assert.equal(E.safetyMetrics(s).meanTimeToSafety,null);
 E.dispatchReplacement(s,danger.id,'AV-102');
 E.arriveReplacement(s,danger.id);
 assert.equal(E.safetyMetrics(s).awaiting,1);
 E.completePassengerTransfer(s,danger.id,true);
 assert.equal(E.safetyMetrics(s).awaiting,0);
 assert.equal(E.safetyMetrics(s).safe,1);
 assert.ok(E.safetyMetrics(s).meanTimeToSafety>0);
 assert.equal(E.prioritizedIncidents(s)[0].id,ordinary.id);
 assert.notEqual(danger.status,'completed');
});

test('customer safety timeline records ordered milestones and prevents duplicate flags',()=>{
 const s=E.initialState(),i=E.createIncident(s,'AV-105','immobilized');
 E.flagCustomerDanger(s,i.id,'exposed_roadway');
 assert.throws(()=>E.flagCustomerDanger(s,i.id,'unsafe_location'),/already flagged/);
 E.escalateCustomerEmergency(s,i.id);
 assert.throws(()=>E.escalateCustomerEmergency(s,i.id),/already recorded/);
 E.dispatchReplacement(s,i.id,'AV-102');
 E.arriveReplacement(s,i.id);
 E.completePassengerTransfer(s,i.id,true);
 const events=E.customerSafetyTimeline(s,i.id);
 assert.deepEqual(events.map(e=>e.label),[
  'Customer danger flagged','Emergency escalation recorded','Replacement AV dispatched',
  'Replacement AV arrived','Passenger transfer confirmed','Customer transfer time recorded'
 ]);
 assert.ok(events.every((e,index)=>index===0||e.minute>=events[index-1].minute));
 assert.equal(i.status,'queued');
});

test('six teams reject double booking and release at completion',()=>{
 const state=E.initialState();
 assert.equal(state.vehicles.length,100);
 assert.equal(E.providerBoard(state).length,6);
 const first=E.createIncident(state,'AV-101','door_ajar');
 E.assign(state,first.id,'P-01');
 const second=E.createIncident(state,'AV-103','door_ajar');
 assert.throws(()=>E.assign(state,second.id,'P-01'),/already assigned/);
 assert.ok(!E.eligibleProviders(state,second.id).some(p=>p.id==='P-01'));
 for(let n=0;n<3;n++)E.advance(state,first.id);
 assert.ok(E.eligibleProviders(state,second.id).some(p=>p.id==='P-01'));
});

test('synthetic health and shift handoff are reproducible and show open work',()=>{
 const a=E.initialState(),b=E.initialState();
 assert.deepEqual(a.vehicles,b.vehicles);
 assert.equal(a.vehicles.length,100);
 assert.equal(a.providers.length,6);
 assert.deepEqual(E.vehicleHealth(a.vehicles[0]),E.vehicleHealth(b.vehicles[0]));
 const incident=E.createIncident(a,'AV-101','immobilized');
 const report=E.shiftHandoff(a);
 assert.equal(report.active,1);
 assert.equal(report.unavailable,1);
 assert.equal(report.items[0].id,incident.id);
 assert.equal(report.availableTeams,6);
 E.assign(a,incident.id,'P-02');
 assert.equal(E.shiftHandoff(a).availableTeams,5);
});

test('response breakdown distinguishes first assistance, replacement, transfer and recovery',()=>{
 const s=E.initialState(),i=E.createIncident(s,'AV-105','immobilized');
 const before=E.responseBreakdown(s,i.id);
 assert.ok(before.every(r=>r.minutes===null));
 E.dispatchReplacement(s,i.id,'AV-102');
 E.arriveReplacement(s,i.id);
 E.completePassengerTransfer(s,i.id,true);
 const mid=E.responseBreakdown(s,i.id);
 assert.equal(mid[0].minutes,null);
 assert.ok(mid[1].minutes>0&&mid[2].minutes>mid[1].minutes);
 assert.equal(mid[3].minutes,null);
 E.assign(s,i.id,'P-02');E.advance(s,i.id);E.advance(s,i.id);E.advance(s,i.id);
 const after=E.responseBreakdown(s,i.id);
 assert.ok(after[0].minutes>0&&after[3].minutes>=after[0].minutes);
 const aggregate=E.responsePerformance(s);
 assert.equal(aggregate.length,4);
 assert.ok(aggregate.every(row=>row.samples===1&&row.meanMinutes!==null));
});
