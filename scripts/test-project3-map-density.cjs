const test=require('node:test'),assert=require('node:assert/strict');
const {visibleVehicles}=require('./project3-map-density.js');
const E=require('./project3-engine.js');
test('default 100-vehicle view is bounded, deterministic and retains selected AV',()=>{
 const fleet=E.initialState().vehicles;const a=visibleVehicles(fleet,{selected:'AV-199'}),b=visibleVehicles(fleet,{selected:'AV-199'});
 assert.equal(fleet.length,100);assert.equal(a.shown.length,24);assert(a.limited);assert(a.shown.some(v=>v.id==='AV-199'));assert.deepEqual(a.shown,b.shown);
});
test('all incident vehicles remain visible even above cap',()=>{
 const fleet=E.initialState().vehicles.map((v,i)=>({...v,status:i<30?'incident':'available'}));
 const view=visibleVehicles(fleet,{selected:'AV-150'});
 assert.equal(view.shown.filter(v=>v.status==='incident').length,30);
 assert(view.shown.some(v=>v.id==='AV-150'));
});
test('search and unavailable-only filter reveal every matching vehicle',()=>{
 const fleet=E.initialState().vehicles.map((v,i)=>({...v,status:i<31?'incident':'available'}));
 const q=visibleVehicles(fleet,{search:'AV-199'});assert.equal(q.shown.length,1);assert.equal(q.shown[0].id,'AV-199');
 const offline=visibleVehicles(fleet,{status:'unavailable'});assert.equal(offline.shown.length,31);assert.equal(offline.matches.length,31);
});
test('supports 12 and 240 vehicles and rejects invalid limit',()=>{
 for(const count of [12,240]){const fleet=E.initialState({count}).vehicles;const view=visibleVehicles(fleet,{selected:fleet.at(-1).id});assert.equal(view.shown.length,Math.min(24,count));assert(view.shown.some(v=>v.id===fleet.at(-1).id));}
 assert.throws(()=>visibleVehicles([],{limit:0}),/Invalid map density/);
});
