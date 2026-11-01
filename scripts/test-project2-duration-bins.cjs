'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {EDGES,binIndex,percentileRange,summarizeBins}=require('./project2-duration-bins.cjs');
test('bin boundaries are half-open and long tail explicit',()=>{assert.equal(binIndex(0),0);assert.equal(binIndex(1),1);assert.equal(binIndex(720),6);assert.equal(binIndex(999999),7);assert.throws(()=>binIndex(-1));});
test('percentile ranges are intervals, not invented exact values',()=>{const x=[1,1,0,0,0,0,0,8];assert.deepEqual(percentileRange(x,.5),{lowerHours:2160,upperHours:null,openEnded:true});assert.equal(percentileRange(Array(8).fill(0),.9),null);});
test('regions reconcile and missing ZIP is reported',()=>{const z=[{zip:'90731',n:10,lat:33.7361,lon:-118.2923},{zip:'90012',n:10,lat:34.0522,lon:-118.2437}];const x=summarizeBins(z,[{zip:'90731',bin:1,n:3},{zip:'90012',bin:2,n:4},{zip:null,bin:0,n:2}],9);assert.equal(x.total,9);assert.equal(x.missingZipCount,2);assert.equal(x.regions.reduce((a,r)=>a+r.count,0),7);});
test('rejects partial or duplicated groups',()=>{const z=[{zip:'90731',n:10,lat:33.7361,lon:-118.2923}];assert.throws(()=>summarizeBins(z,[{zip:'90731',bin:0,n:1}],2),/reconcile/);assert.throws(()=>summarizeBins(z,[{zip:'90731',bin:0,n:1},{zip:'90731',bin:0,n:1}],2),/duplicate/);});

test('per-ZIP completed count cannot exceed corresponding geographic demand',()=>{
 const z=[{zip:'90731',n:2,lat:33.7361,lon:-118.2923}];
 assert.throws(()=>summarizeBins(z,[{zip:'90731',bin:0,n:2},{zip:'90731',bin:1,n:1}],3),/exceeds geographic ZIP demand/);
});
test('rejects invalid centroid rather than assigning arbitrary region',()=>{
 const z=[{zip:'90731',n:2,lat:NaN,lon:-118.2923}];
 assert.throws(()=>summarizeBins(z,[{zip:'90731',bin:0,n:1}],1),/Invalid ZIP centroid/);
});
