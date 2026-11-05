const test=require('node:test'),assert=require('node:assert/strict');
const G=require('./project3-geo.js'),E=require('./project3-engine.js');
test('north points upward, east points right; bounds are exact',()=>{
 const nw=G.project(G.BOUNDS.north,G.BOUNDS.west),se=G.project(G.BOUNDS.south,G.BOUNDS.east);
 assert.equal(nw.x,G.FRAME.left);assert.equal(nw.y,G.FRAME.top);
 assert.equal(se.x,G.FRAME.right);assert.equal(se.y,G.FRAME.bottom);
 assert.equal(nw.withinBounds,true);
});
test('out of bounds points are clipped and flagged, never silently presented as precise',()=>{
 const p=G.project(35,-120);assert.equal(p.withinBounds,false);assert.equal(p.x,G.FRAME.left);assert.equal(p.y,G.FRAME.top);
});
test('nonfinite and invalid geographic coordinates are rejected',()=>{
 for(const pair of [[NaN,-118],[34,Infinity],[91,-118],[34,-181]])assert.throws(()=>G.project(...pair),/Invalid WGS84/);
});
test('default seeded 100 AVs and six recovery teams have finite coordinates within declared schematic frame',()=>{
 const s=E.initialState();assert.equal(s.vehicles.length,100);assert.equal(s.providers.length,6);
 const audit=G.audit(s.vehicles);assert.deepEqual(audit.invalid,[]);assert.deepEqual(audit.outside,[]);
 for(const p of s.providers)assert.equal(G.project(p.lat,p.lon).withinBounds,true);
});
test('projection and audit are deterministic for repeatable fleet seeds',()=>{
 const a=E.initialState({seed:123,count:240}),b=E.initialState({seed:123,count:240});
 assert.deepEqual(a.vehicles.map(v=>G.project(v.lat,v.lon)),b.vehicles.map(v=>G.project(v.lat,v.lon)));
 assert.deepEqual(G.audit(a.vehicles),G.audit(b.vehicles));
});
