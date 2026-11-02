'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const E=require('./project3-engine.js'),P=require('./project3-planning.js');
test('all staging scenarios share the same deterministic seeded incidents',()=>{
 const c={fleetSize:60,incidentsPer100PerDay:10,budget:5000};
 const a=P.compare(c),b=P.compare(c);
 assert.deepEqual(a,b);
 assert.equal(a.assumptions.events,180);
 assert.equal(a.scenarios.length,4);
 assert.ok(a.scenarios.every(x=>x.events===180));
 assert.equal(a.baseline.id,'baseline');
});
test('response and cost figures reconcile and scenario overhead is explicit',()=>{
 const c={fleetSize:24,incidentsPer100PerDay:5,budget:5000},x=P.compare(c);
 for(const r of x.scenarios){
  assert.equal(r.totalCost,r.variableCost+r.overhead);
  assert.equal(r.providerJobs.reduce((sum,p)=>sum+p.count,0),r.events);
  assert.ok(r.p90Response>=r.meanResponse-1e-8||r.events<2);
  assert.ok(r.slaMet>=0&&r.slaMet<=r.events);
  assert.ok(r.meanQueue>=0);
  assert.ok(r.examples.every(e=>e.responseMinutes>=e.queueMinutes+e.travelMinutes));
 }
 assert.equal(x.baseline.overhead,0);
 assert.ok(x.scenarios.slice(1).every(r=>r.overhead===3200));
});
test('recommended staging is within selected incremental cost budget',()=>{
 for(const budget of [0,2000,5000,25000]){
  const x=P.compare({fleetSize:60,incidentsPer100PerDay:10,budget});
  assert.ok(x.recommendation.totalCost-x.baseline.totalCost<=budget);
  const eligible=x.scenarios.filter(s=>s.totalCost-x.baseline.totalCost<=budget);
  assert.ok(eligible.every(s=>s.p90Response>=x.recommendation.p90Response));
 }
});
test('dispatch examples respect equipment capabilities',()=>{
 const x=P.compare({fleetSize:120,incidentsPer100PerDay:20,budget:25000});
 const providers=E.initialState().providers;
 for(const r of x.scenarios)for(const e of r.examples){
  const p=providers.find(p=>p.name===e.provider);
  if(p)assert.ok(p.capabilities.includes(E.TYPES[e.type].needs));
  else assert.match(e.provider,/Additional staged crew/);
  assert.ok(e.responseMinutes>=e.travelMinutes);
  assert.ok(e.estimatedCost>=0);
 }
});
test('high-demand model produces crew queueing and staging can change results',()=>{
 const x=P.compare({fleetSize:240,incidentsPer100PerDay:30,budget:25000});
 assert.ok(x.baseline.meanQueue>0,'Finite fictional crews should queue under stress');
 assert.ok(x.scenarios.some(s=>s.meanQueue!==x.baseline.meanQueue));
});
test('planner does not mutate input state or shared events',()=>{
 const c={fleetSize:12,incidentsPer100PerDay:2,budget:0},events=P.eventsFor(c),before=JSON.stringify(events);
 P.simulate(c,'baseline',events);P.simulate(c,'harbor',events);
 assert.equal(JSON.stringify(events),before);
 assert.equal(events.length,7);
});
test('invalid inputs and unknown staging site are rejected',()=>{
 for(const c of [{fleetSize:0},{fleetSize:12.5},{incidentsPer100PerDay:31},{budget:-1},{days:0}])assert.throws(()=>P.compare(c),/Invalid/);
 assert.throws(()=>P.simulate({fleetSize:12},'unknown',[]),/Unknown staging/);
 assert.equal(P.percentile([],0.9),null);
 assert.equal(P.percentile([1,2,3,4],.9),4);
});
