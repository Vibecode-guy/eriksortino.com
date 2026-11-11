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

test('240-vehicle map sampling preserves source order, unique IDs and priority incidents',()=>{
 const original=E.initialState({count:240}).vehicles;
 const fleet=original.map((v,i)=>({...v,status:i%17===0?'incident':'available'}));
 const snapshot=JSON.stringify(fleet);
 const selected=fleet.at(-1).id;
 const a=visibleVehicles(fleet,{selected,limit:24});
 const b=visibleVehicles(fleet,{selected,limit:24});
 assert.equal(a.matches.length,240);
 assert.equal(a.shown.length,24);
 assert.equal(new Set(a.shown.map(v=>v.id)).size,a.shown.length);
 assert.deepEqual(a.shown,b.shown);
 assert.deepEqual(a.shown.map(v=>v.id),fleet.filter(v=>a.shown.some(s=>s.id===v.id)).map(v=>v.id));
 assert(a.shown.some(v=>v.id===selected));
 assert(fleet.filter(v=>v.status!=='available').every(v=>a.shown.some(s=>s.id===v.id)));
 assert.equal(JSON.stringify(fleet),snapshot,'density rendering must not mutate simulation state');
});
test('explicit filtered views are uncapped and retain match counts',()=>{
 const fleet=E.initialState({count:240}).vehicles.map((v,i)=>({...v,status:i<40?'incident':'available'}));
 const unavailable=visibleVehicles(fleet,{status:'unavailable',limit:8});
 assert.equal(unavailable.matches.length,40);
 assert.equal(unavailable.shown.length,40);
 assert.equal(unavailable.limited,false);
 const search=visibleVehicles(fleet,{search:'AV-',limit:8});
 assert.equal(search.matches.length,240);
 assert.equal(search.shown.length,240);
 assert.equal(search.limited,false);
});

test('invalid status filters fail explicitly rather than showing an empty synthetic fleet',()=>{
 const fleet=E.initialState({count:100}).vehicles;
 for(const status of ['offline','Available','',null]){
  assert.throws(()=>visibleVehicles(fleet,{status}),/Invalid map density input/);
 }
 assert.equal(visibleVehicles(fleet,{}).matches.length,100);
 assert.equal(visibleVehicles(fleet,{status:'all'}).matches.length,100);
 assert.equal(visibleVehicles(fleet,{status:'available'}).matches.length,100);
 assert.equal(visibleVehicles(fleet,{status:'unavailable'}).matches.length,0);
});

test('map search normalizes whitespace and case without mutating 100/240-vehicle fixtures',()=>{
 for(const count of [100,240]){
  const fleet=E.initialState({count,seed:20261102}).vehicles;
  const before=JSON.stringify(fleet);
  const target=fleet.at(-1);
  const byId=visibleVehicles(fleet,{search:'  '+target.id.toLowerCase()+'  ',limit:1});
  assert.deepEqual(byId.shown.map(v=>v.id),[target.id]);
  const byArea=visibleVehicles(fleet,{search:'  '+target.area.toUpperCase()+'  ',limit:1});
  assert(byArea.shown.length>0);
  assert(byArea.shown.every(v=>v.area.toLowerCase().includes(target.area.toLowerCase())));
  assert.equal(byArea.shown.length,byArea.matches.length,'explicit search should not hide matches');
  assert.equal(JSON.stringify(fleet),before);
  assert.deepEqual(E.initialState({count,seed:20261102}).vehicles,fleet,'same seed should reproduce map fixture');
 }
});
