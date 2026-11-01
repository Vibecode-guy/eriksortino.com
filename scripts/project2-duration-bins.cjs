// Full-cohort grouped closure-duration bins; no sampled percentile claims.
'use strict';
const {assignLens}=require('./project2-region-lenses.js');
const EDGES=[0,1,6,24,72,168,720,2160]; // hours; final bin is unbounded
function binIndex(hours){if(!Number.isFinite(hours)||hours<0)throw Error('Invalid duration');for(let i=0;i<EDGES.length-1;i++)if(hours<EDGES[i+1])return i;return EDGES.length-1;}
function percentileRange(counts,p){if(!Number.isFinite(p)||p<=0||p>1)throw Error('Invalid percentile');const total=counts.reduce((a,b)=>a+b,0);if(!total)return null;const rank=Math.ceil(total*p);let running=0;for(let i=0;i<counts.length;i++){running+=counts[i];if(running>=rank)return {lowerHours:EDGES[i],upperHours:i+1<EDGES.length?EDGES[i+1]:null,openEnded:i===EDGES.length-1};}throw Error('Percentile reconciliation failure');}
function summarizeBins(zipGroups,binRows,expectedTotal){
 if(!Number.isSafeInteger(expectedTotal)||expectedTotal<0)throw Error('Invalid independent duration total');
 const zipMap=new Map();
 for(const row of zipGroups){const zip=String(row.zip??'').trim();if(!zip||zipMap.has(zip)||!Number.isSafeInteger(Number(row.n))||Number(row.n)<0)throw Error('Invalid ZIP coverage');zipMap.set(zip,row);}
 const regions=new Map(),unassigned=Array(EDGES.length).fill(0),missingZip=Array(EDGES.length).fill(0),seen=new Set(),durationByZip=new Map();
 let total=0;
 for(const row of binRows){
  const zip=String(row.zip??'').trim(),bin=Number(row.bin),n=Number(row.n),key=zip+'|'+bin;
  if(!Number.isInteger(bin)||bin<0||bin>=EDGES.length||!Number.isSafeInteger(n)||n<0||seen.has(key))throw Error('Invalid or duplicate duration bin');
  seen.add(key);total+=n;
  if(!zip){missingZip[bin]+=n;continue;}
  const point=zipMap.get(zip);if(!point)throw Error('Duration ZIP missing from geographic cohort');
  const accumulated=(durationByZip.get(zip)||0)+n;
  if(!Number.isSafeInteger(accumulated)||accumulated>Number(point.n))throw Error('Completed duration count exceeds geographic ZIP demand');
  durationByZip.set(zip,accumulated);
  if(!Number.isFinite(Number(point.lat))||!Number.isFinite(Number(point.lon)))throw Error('Invalid ZIP centroid');
  const id=assignLens({lat:Number(point.lat),lon:Number(point.lon)});
  const target=id?(regions.get(id)||Array(EDGES.length).fill(0)):unassigned;
  target[bin]+=n;if(id)regions.set(id,target);
 }
 if(!Number.isSafeInteger(total)||total!==expectedTotal)throw Error('Duration bins do not reconcile to independent total');
 const result=[...regions].map(([id,counts])=>({id,count:counts.reduce((a,b)=>a+b,0),medianRange:percentileRange(counts,.5),p90Range:percentileRange(counts,.9),counts}));
 return {source:'full-cohort grouped duration bins',edgesHours:EDGES,total,missingZipCount:missingZip.reduce((a,b)=>a+b,0),unassignedCount:unassigned.reduce((a,b)=>a+b,0),regions:result};
}
module.exports={EDGES,binIndex,percentileRange,summarizeBins};
