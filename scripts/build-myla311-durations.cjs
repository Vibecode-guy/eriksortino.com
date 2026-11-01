// Build validated full-cohort regional duration intervals from MyLA311.
// Usage: node scripts/build-myla311-durations.cjs [output.json]
// Never exports individual cases or invents exact percentiles from bins.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const {EDGES,summarizeBins}=require('./project2-duration-bins.cjs');
const {urlFor,verifyGroups}=require('./build-myla311-geo.cjs');
const COHORT="createddate >= '2024-01-01T00:00:00' and createddate < '2025-01-01T00:00:00'";
const BOUNDS='latitude >= 33.65 and latitude <= 34.35 and longitude >= -118.75 and longitude <= -118.1';
const VALID=COHORT+' and '+BOUNDS+' and closeddate is not null and closeddate >= createddate';
const HOURS='date_diff_hh(createddate,closeddate)';
async function query(select,where,group){
 const url=urlFor(select,where,group,group?'n DESC':null,group?1000:null);
 const response=await fetch(url,{signal:AbortSignal.timeout(45000)});
 if(!response.ok)throw Error('City API HTTP '+response.status+': '+(await response.text()).slice(0,180));
 const rows=await response.json();if(!Array.isArray(rows))throw Error('Expected City JSON array');return rows;
}
function intervalWhere(i){
 if(!Number.isInteger(i)||i<0||i>=EDGES.length)throw Error('Invalid bin');
 const low=EDGES[i],high=EDGES[i+1];
 return VALID+' and '+HOURS+' >= '+low+(high===undefined?'':' and '+HOURS+' < '+high);
}
function combineBins(groups,totals,expected){
 if(groups.length!==EDGES.length||totals.length!==EDGES.length)throw Error('Missing duration bin');
 const rows=[];
 groups.forEach((group,i)=>{
  verifyGroups(group,totals[i],'Duration bin '+i);
  for(const entry of group)rows.push({zip:entry.zipcode??null,bin:i,n:Number(entry.n)});
 });
 if(totals.reduce((a,b)=>a+b,0)!==expected)throw Error('Duration bin totals differ from independent total');
 return rows;
}
async function build(){
 const [geo,allCount,...pairs]=await Promise.all([
  query('zipcode,count(*) as n,avg(latitude) as lat,avg(longitude) as lon',COHORT+' and '+BOUNDS,'zipcode'),
  query('count(*) as n',VALID),
  ...EDGES.flatMap((_,i)=>[query('zipcode,count(*) as n',intervalWhere(i),'zipcode'),query('count(*) as n',intervalWhere(i))])
 ]);
 const total=Number(allCount[0]?.n);
 if(!Number.isSafeInteger(total)||total<0)throw Error('Invalid independent total');
 // Verify the complete geocoded ZIP distribution against its own count.
 const geoCount=await query('count(*) as n',COHORT+' and '+BOUNDS);
 verifyGroups(geo,Number(geoCount[0]?.n),'Geocoded ZIP reference');
 const groups=EDGES.map((_,i)=>pairs[2*i]),totals=EDGES.map((_,i)=>Number(pairs[2*i+1][0]?.n));
 const result=summarizeBins(geo.filter(x=>x.zipcode!=null&&String(x.zipcode).trim()).map(x=>({zip:x.zipcode,n:Number(x.n),lat:Number(x.lat),lon:Number(x.lon)})),combineBins(groups,totals,total),total);
 return {...result,source:'https://data.lacity.org/resource/b7dx-7gc3.json',createdStartInclusive:'2024-01-01',createdEndExclusive:'2025-01-01',generatedAt:new Date().toISOString(),durationDefinition:'ClosedDate minus CreatedDate; nonnegative valid timestamp pairs only',method:'Full-cohort grouped hour bins; percentile ranges, not exact percentiles; ZIP-mean proximity lenses are not official boundaries',limitations:['ClosedDate is not populated uniformly across service types','Date_diff_hh uses whole-hour resolution; sub-hour observations occupy the first bin','Valid closure-date coverage must be considered before comparing areas','Unassigned and missing ZIP requests are excluded from named regions']};
}
async function main(){const output=await build(),dest=path.resolve(process.argv[2]||'data/myla311-2024-duration-intervals.json');fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(output,null,2)+'\n');console.log('Wrote '+dest+' with '+output.total+' valid timestamp pairs');}
module.exports={intervalWhere,combineBins,build};
if(require.main===module)main().catch(e=>{console.error(e);process.exitCode=1;});
