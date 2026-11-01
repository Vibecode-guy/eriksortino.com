'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {intervalWhere,combineBins}=require('./build-myla311-durations.cjs');
test('duration bin query retains cohort, coordinate bounds, and valid closure dates',()=>{const x=intervalWhere(0);assert.match(x,/createddate >=/);assert.match(x,/closeddate is not null/);assert.match(x,/latitude >=/);assert.match(x,/date_diff_hh\(createddate,closeddate\) < 1/);});
test('long-tail duration bin is unbounded',()=>{const x=intervalWhere(7);assert.match(x,/>= 2160/);assert.doesNotMatch(x,/ < [0-9]+$/);});
test('independent bin totals must reconcile',()=>{const g=Array.from({length:8},(_,i)=>i===0?[{zipcode:'90731',n:'3'}]:[]),t=[3,0,0,0,0,0,0,0];assert.equal(combineBins(g,t,3).length,1);assert.throws(()=>combineBins(g,t,4),/independent total/);});
test('partial grouped bin is rejected',()=>{const g=Array.from({length:8},()=>[]),t=[1,0,0,0,0,0,0,0];assert.throws(()=>combineBins(g,t,1),/grouped/);});
