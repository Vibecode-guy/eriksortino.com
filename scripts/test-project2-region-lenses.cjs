// Run: node --test scripts/test-project2-region-lenses.cjs
// Synthetic ZIP aggregates only. No City measurements are invented.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {REGIONS,assignLens,summarize,distanceKm,investigationMatrix}=require('./project2-region-lenses.js');
const zip=(id,n,lat,lon,gap)=>({zip:id,n,lat,lon,gap});
test('six named lenses exist; no ZIP is counted twice',()=>{
 assert.equal(REGIONS.length,6);
 const r=summarize([zip('90731',100,33.73,-118.29,20),zip('90012',60,34.05,-118.24,10),zip('90045',80,33.95,-118.38,8)]);
 assert.equal(r.mappedRequests,240);
 assert.equal(r.assignedRequests+r.unassignedRequests,240);
 assert.equal(r.rows.reduce((s,x)=>s+x.requests,0),r.assignedRequests);
 assert.equal(r.rows.reduce((s,x)=>s+x.zipGroups,0),3);
});
test('Harbor and Downtown examples use measured ZIP-group totals',()=>{
 const r=summarize([zip('90731',100,33.73,-118.29,25),zip('90012',60,34.05,-118.24,6)]);
 assert.equal(r.rows.find(x=>x.id==='harbor').requests,100);
 assert.equal(r.rows.find(x=>x.id==='dtla').historicalGapShare,10);
});
test('missing closure data is unavailable, never zero',()=>{
 const r=summarize([zip('90731',100,33.73,-118.29,null),zip('90732',50,33.74,-118.30,4)]);
 const h=r.rows.find(x=>x.id==='harbor');
 assert.equal(h.requests,150);
 assert.equal(h.historicalGap,null);
 assert.equal(h.historicalGapShare,null);
});
test('out-of-radius ZIP is excluded and disclosed',()=>{
 const r=summarize([zip('99999',40,33.66,-118.70,1)]);
 assert.equal(r.assignedRequests,0);
 assert.equal(r.unassignedRequests,40);
 assert.equal(r.unassignedZipGroups,1);
});
test('duplicate ZIP groups are rejected',()=>{
 const p=zip('90731',10,33.73,-118.29,1);
 assert.throws(()=>summarize([p,p]),/duplicate/);
});
test('invalid counts, coordinates and gap values are rejected',()=>{
 assert.throws(()=>summarize([zip('90731',10,33.73,-118.29,11)]),/gap/);
 assert.throws(()=>summarize([zip('90731',-1,33.73,-118.29,0)]),/Invalid/);
 assert.throws(()=>summarize([zip('90731',10,40,-118.29,0)]),/Invalid/);
});
test('distance and assignment are deterministic',()=>{
 assert.equal(distanceKm([34,-118],[34,-118]),0);
 assert.equal(assignLens({lat:33.7361,lon:-118.2923}),'harbor');
 assert.equal(assignLens({lat:34.0522,lon:-118.2437}),'dtla');
});
test('zero mapped ZIPs never invent a coverage percentage',()=>{
 const r=summarize([]);
 assert.equal(r.assignedShare,null);
 assert.equal(r.rows.every(x=>x.historicalGap===null),true);
});

test('investigation screen uses peer medians and never claims staffing need',()=>{
 const data=[
  zip('90731',100,33.73,-118.29,10),
  zip('90012',200,34.05,-118.24,100),
  zip('90045',300,33.95,-118.38,30),
  zip('91316',400,34.18,-118.45,200)
 ];
 const result=investigationMatrix(summarize(data));
 assert.equal(result.eligibleCount,4);
 assert.equal(result.demandMedian,250);
 assert.equal(result.gapMedian,30);
 assert.equal(result.rows.find(x=>x.id==='harbor').quadrant,'low-low');
 assert.equal(result.rows.find(x=>x.id==='dtla').quadrant,'low-high');
 assert.equal(result.rows.find(x=>x.id==='westside').quadrant,'high-low');
 assert.equal(result.rows.find(x=>x.id==='valley').quadrant,'high-high');
});
test('matrix excludes unavailable timestamp gaps and requires three comparable lenses',()=>{
 const data=[
  zip('90731',100,33.73,-118.29,null),
  zip('90012',200,34.05,-118.24,100),
  zip('90045',300,33.95,-118.38,30),
  zip('91316',400,34.18,-118.45,200)
 ];
 const result=investigationMatrix(summarize(data));
 assert.equal(result.eligibleCount,3);
 assert.equal(result.excludedCount,3);
 assert.equal(result.rows.some(x=>x.id==='harbor'),false);
 const insufficient=investigationMatrix(summarize(data.slice(0,2)));
 assert.equal(insufficient.rows.length,0);
 assert.equal(insufficient.demandMedian,null);
});
test('matrix never manufactures metrics from empty or missing regions',()=>{
 const empty=investigationMatrix(summarize([]));
 assert.equal(empty.eligibleCount,0);
 assert.equal(empty.rows.length,0);
 assert.throws(()=>investigationMatrix(null),/Expected/);
});
