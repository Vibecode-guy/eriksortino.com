const test=require('node:test'),assert=require('node:assert/strict');
const R=require('./project3-routing.js');
const lax={lat:33.959,lon:-118.402},downtown={lat:34.049,lon:-118.246};
test('synthetic fallback is deterministic, labeled and never misrepresents a road route',()=>{
 const a=R.fallback(lax,downtown);assert.deepEqual(a,R.fallback(lax,downtown));
 assert.equal(a.basis,'synthetic_straight_line');assert.equal(a.distanceKm,null);assert(a.minutes>=6);
 assert.match(a.description,/not a road ETA/);
});
test('reject invalid coordinates before accepting a road response',()=>{
 for(const point of [{lat:91,lon:0},{lat:0,lon:181},{lat:NaN,lon:0},null]){
  assert.throws(()=>R.fallback(point,downtown),/Invalid routing coordinates/);
  assert.throws(()=>R.fromRoadResponse({code:'Ok',routes:[{duration:600,distance:5000}]},point,downtown),/Invalid routing coordinates/);
 }
});
test('valid OSRM-compatible response uses seconds and meters without claiming live traffic',()=>{
 const r=R.fromRoadResponse({code:'Ok',routes:[{duration:901,distance:22345}]},lax,downtown);
 assert.equal(r.minutes,16);assert.equal(r.distanceKm,22.34);assert.equal(r.basis,'road_network_unverified');assert.match(r.description,/No live traffic/);
});
test('missing, malformed, unsuccessful and implausible route data fall back safely',()=>{
 for(const data of [null,{}, {code:'NoRoute',routes:[]},{code:'Ok',routes:[]},{code:'Ok',routes:[{duration:0,distance:2}]},{code:'Ok',routes:[{duration:NaN,distance:2}]},{code:'Ok',routes:[{duration:100,distance:-1}]},{code:'Ok',routes:[{duration:86461,distance:2}]},{code:'Ok',routes:[{duration:100,distance:1000001}]}]){
  assert.deepEqual(R.fromRoadResponse(data,lax,downtown),R.fallback(lax,downtown));
 }
});

test('reject routes shorter than geodesic distance, including zero-distance routes between distinct points',()=>{
 for(const distance of [0,100,1000]){
  const result=R.fromRoadResponse({code:'Ok',routes:[{duration:600,distance}]},lax,downtown);
  assert.deepEqual(result,R.fallback(lax,downtown));
 }
 assert.equal(R.fromRoadResponse({code:'Ok',routes:[{duration:900,distance:25000}]},lax,downtown).basis,'road_network_unverified');
});

test('implausibly fast road responses fall back while realistic slow routes remain usable',()=>{
 const tooFast={code:'Ok',routes:[{duration:60,distance:25000}]};
 assert.deepEqual(R.fromRoadResponse(tooFast,lax,downtown),R.fallback(lax,downtown));
 const slow={code:'Ok',routes:[{duration:7200,distance:25000}]};
 assert.equal(R.fromRoadResponse(slow,lax,downtown).basis,'road_network_unverified');
});
