'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('./project3-engine.js'),A=require('./project3-analytics.js');
function finish(s,id,p){E.assign(s,id,p);for(let n=0;n<3;n++)E.advance(s,id);}
test('empty state has explicit null denominator-based rates, not fabricated zeros',()=>{
 const a=A.summarize(E.initialState());assert.equal(a.fleet.total,100);assert.equal(a.fleet.instantAvailabilityPercent,100);assert.equal(a.fleet.serviceReadyPercent,null);assert.equal(a.fleet.tripUtilizationPercent,null);assert.equal(a.incidents.meanResponse,null);assert.equal(a.incidents.responseSamples,0);assert.equal(a.providers[0].slaMetPercent,null);assert.equal(a.bottleneck,null);
});
test('fleet-minute incident downtime counts both completed and active incidents',()=>{
 const s=E.initialState(),i=E.createIncident(s,'AV-101','door_ajar');E.tick(s,12);
 let a=A.summarize(s);assert.equal(a.fleet.fleetMinutes,1200);assert.equal(a.fleet.incidentDowntimeMinutes,12);assert.equal(a.fleet.serviceReadyPercent,99);assert.equal(a.fleet.instantAvailabilityPercent,99);
 finish(s,i.id,'P-01');const stop=s.minute;E.tick(s,8);a=A.summarize(s);assert.equal(a.fleet.incidentDowntimeMinutes,i.completedAt-i.created);assert.equal(a.fleet.fleetMinutes,100*(stop+8));assert.equal(a.fleet.instantAvailabilityPercent,100);
});
test('completed response, provider SLA, costs and type/area totals reconcile',()=>{
 const s=E.initialState(),a=E.createIncident(s,'AV-101','door_ajar');finish(s,a.id,'P-01');
 const b=E.createIncident(s,'AV-112','flatbed');finish(s,b.id,'P-03');
 const c=E.createIncident(s,'AV-107','immobilized');E.tick(s,40);
 const x=A.summarize(s);assert.equal(x.incidents.total,3);assert.equal(x.incidents.completed,2);assert.equal(x.incidents.active,1);assert.equal(x.incidents.overdue,1);
 assert.equal(x.incidents.responseSamples,2);assert.equal(x.incidents.p90Response,Math.max(a.onSceneAt-a.created,b.onSceneAt-b.created));
 assert.equal(x.providers.find(p=>p.id==='P-01').completed,1);assert.equal(x.providers.find(p=>p.id==='P-03').completed,1);
 assert.equal(x.providers.reduce((sum,p)=>sum+p.spend,0),x.incidents.totalSpend);
 assert.equal(x.types.reduce((sum,t)=>sum+t.incidents,0),3);assert.equal(x.areas.reduce((sum,t)=>sum+t.incidents,0),3);
 assert.equal(x.stages.length,4);assert.ok(x.bottleneck.meanMinutes>=0);
});
test('provider with no completions has unavailable response and SLA rates',()=>{
 const s=E.initialState(),i=E.createIncident(s,'AV-101','door_ajar');E.assign(s,i.id,'P-01');const x=A.summarize(s);
 const p=x.providers.find(p=>p.id==='P-01');assert.equal(p.assigned,1);assert.equal(p.active,1);assert.equal(p.completed,0);assert.equal(p.meanResponse,null);assert.equal(p.slaMetPercent,null);
});
test('percentiles are nearest-rank and mean does not mutate inputs',()=>{
 const a=[9,1,5,7];assert.equal(A.percentile(a,.9),9);assert.deepEqual(a,[9,1,5,7]);assert.equal(A.mean([]),null);assert.equal(A.mean([1,2,2]),1.7);
});
test('invalid state and impossible fleet exposure are rejected',()=>{
 assert.throws(()=>A.summarize({minute:-1,incidents:[],vehicles:[],providers:[]}),/Invalid/);
 const s=E.initialState();E.createIncident(s,'AV-101','door_ajar');s.minute=0;s.incidents[0].created=-20;assert.throws(()=>A.summarize(s),/exceeds fleet exposure/);
});
