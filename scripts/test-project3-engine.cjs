'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('./project3-engine.js');
test('MVP: select AV, create event, assign eligible provider, complete and update KPIs',()=>{
 const s=E.initialState();assert.equal(E.kpis(s).available,12);
 s.selected='AV-101';const i=E.createIncident(s,s.selected,'flatbed');
 assert.equal(E.kpis(s).available,11);assert.equal(E.kpis(s).active,1);
 const candidates=E.eligibleProviders(s,i.id);assert.ok(candidates.length>0);assert.ok(candidates.every(p=>p.capabilities.includes('flatbed')));
 E.assign(s,i.id,candidates[0].id);assert.equal(i.status,'dispatched');
 E.advance(s,i.id);assert.equal(i.status,'en_route');
 E.advance(s,i.id);assert.equal(i.status,'on_scene');const response=i.onSceneAt-i.created;assert.ok(response>0);
 E.advance(s,i.id);assert.equal(i.status,'completed');
 const k=E.kpis(s);assert.equal(k.available,12);assert.equal(k.active,0);assert.equal(k.completed,1);assert.equal(k.meanResponse,response);assert.equal(k.p90Response,response);assert.ok(k.totalCost>0);
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
