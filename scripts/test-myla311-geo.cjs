// Run with: node --test scripts/test-myla311-geo.cjs (Node.js 18+).
// All cases use synthetic fixtures; no City observations are fabricated.
'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {makeSummary,verifyGroups,urlFor}=require('./build-myla311-geo.cjs');

const all=[{zipcode:'90001',n:'10'},{zipcode:null,n:'2'}];
const geo=[{zipcode:'90001',n:'8',lat:'34.01',lon:'-118.22'},{zipcode:null,n:'1',lat:'34.02',lon:'-118.24'}];
const gap=[{zipcode:'90001',n:'3'}];
const summary=(a=all,b=geo,c=gap,totals=[12,9,3])=>makeSummary(a,totals[0],b,totals[1],c,totals[2]);

test('complete 2024 ZIP aggregates reconcile with coordinate coverage',()=>{
 const x=summary();
 assert.equal(x.coverage.cohortRequests,12);
 assert.equal(x.coverage.geocodedPlausibleRequests,9);
 assert.equal(x.coverage.geocodedCoveragePercent,75);
 assert.equal(x.coverage.excludedMissingOrOutsideBoundingBox,3);
 assert.equal(x.coverage.missingZipAllRecords,2);
 assert.equal(x.coverage.missingZipGeocoded,1);
 assert.equal(x.geocodedZipGroups[0].historicalYearEndTimestampGap,3);
});
test('zero cohort uses null percentages rather than inventing a rate',()=>{
 const x=summary([],[],[],[0,0,0]);
 assert.equal(x.coverage.geocodedCoveragePercent,null);
 assert.equal(x.coverage.excludedCoordinatePercent,null);
});
test('reject duplicate ZIP groups',()=>{
 assert.throws(()=>summary([{zipcode:'90001',n:'10'},{zipcode:'90001',n:'2'}]),/duplicate ZIP/i);
});
test('reject globally reconciled but locally impossible geographic counts',()=>{
 const a=[{zipcode:'90001',n:'5'},{zipcode:'90002',n:'5'}];
 const b=[{zipcode:'90001',n:'6',lat:'34',lon:'-118.2'},{zipcode:'90002',n:'4',lat:'34',lon:'-118.2'}];
 assert.throws(()=>summary(a,b,[],[10,10,0]),/exceeds all-record ZIP/);
});
test('reject geocoded ZIPs missing from the all-record cohort',()=>{
 assert.throws(()=>summary([{zipcode:'90001',n:'10'}],[{zipcode:'90002',n:'4',lat:'34',lon:'-118.2'}],[],[10,4,0]),/exceeds all-record ZIP/);
});
test('reject invalid geographic mean coordinates',()=>{
 assert.throws(()=>summary([{zipcode:'90001',n:'10'}],[{zipcode:'90001',n:'4',lat:'35',lon:'-118.2'}],[],[10,4,0]),/Invalid geocoded ZIP/);
});
test('reject historical timestamp gaps larger than matching ZIP demand',()=>{
 const a=[{zipcode:'90001',n:'10'},{zipcode:'90002',n:'10'}];
 const b=[{zipcode:'90001',n:'4',lat:'34',lon:'-118.2'},{zipcode:'90002',n:'3',lat:'34.1',lon:'-118.3'}];
 assert.throws(()=>summary(a,b,[{zipcode:'90001',n:'5'}],[20,7,5]),/gap exceeds matching ZIP/);
});
test('reject incomplete grouped query results',()=>{
 assert.throws(()=>verifyGroups([{n:'3'}],4,'ZIP'),/versus total/);
});
test('source queries include explicit 2024 cohort and ZIP grouping',()=>{
 const url=urlFor('zipcode,count(*) as n',"createddate >= '2024-01-01T00:00:00'",'zipcode','n DESC',1000);
 const q=new URL(url);
 assert.equal(q.searchParams.get('$group'),'zipcode');
 assert.match(q.searchParams.get('$where'),/2024-01-01/);
 assert.equal(q.searchParams.get('$limit'),'1000');
});
