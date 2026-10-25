// Reproducible ZIP-level MyLA311 2024 aggregation. Node.js 18+.
// Usage: node scripts/build-myla311-geo.cjs [output.json]
// No raw case IDs, addresses or individual points are exported.
'use strict';
const fs=require('node:fs'),path=require('node:path');
const API='https://data.lacity.org/resource/b7dx-7gc3.json';
const COHORT="createddate >= '2024-01-01T00:00:00' and createddate < '2025-01-01T00:00:00'";
const BOUNDS='latitude >= 33.65 and latitude <= 34.35 and longitude >= -118.75 and longitude <= -118.1';
const GEO_WHERE=COHORT+' and '+BOUNDS,LIMIT=1000;
function urlFor(select,where,group,order,limit){
 const u=new URL(API);u.searchParams.set('$select',select);u.searchParams.set('$where',where);
 if(group)u.searchParams.set('$group',group);if(order)u.searchParams.set('$order',order);
 if(limit)u.searchParams.set('$limit',String(limit));return u.toString();
}
async function request(url){
 const r=await fetch(url,{signal:AbortSignal.timeout(45000)});
 if(!r.ok)throw Error('City API HTTP '+r.status+': '+(await r.text()).slice(0,200));
 const data=await r.json();if(!Array.isArray(data))throw Error('Expected JSON array');return data;
}
function verifyGroups(groups,total,label){
 if(!Number.isSafeInteger(total)||total<0)throw Error(label+': invalid total');
 if(groups.length>=LIMIT)throw Error(label+': grouped results may be truncated');
 const sum=groups.reduce((a,x)=>a+Number(x.n),0);
 if(!Number.isSafeInteger(sum)||sum!==total)throw Error(label+': grouped '+sum+' versus total '+total);
 return sum;
}
function makeSummary(z,zt,g,gt){
 verifyGroups(z,zt,'ZIP');verifyGroups(g,gt,'Geocoded');
 if(gt>zt)throw Error('Geocoded count exceeds total');
 const zipGroups=z.map(x=>({zip:String(x.zipcode||'').trim()||null,requests:Number(x.n)}));
 const geocodedZipGroups=g.map(x=>({zip:String(x.zipcode||'').trim()||null,requests:Number(x.n),meanLatitude:x.lat==null?null:Number(x.lat),meanLongitude:x.lon==null?null:Number(x.lon)}));
 if(geocodedZipGroups.some(x=>x.zip&&(!Number.isFinite(x.meanLatitude)||!Number.isFinite(x.meanLongitude))))throw Error('Invalid centroid');
 return {source:API,createdStartInclusive:'2024-01-01T00:00:00',createdEndExclusive:'2025-01-01T00:00:00',coordinateFilter:BOUNDS,generatedAt:new Date().toISOString(),
 notes:['2024 creation cohort only.','Missing and out-of-range coordinates are excluded from geocoded totals.','ZIPs are not operational districts; average request coordinates are not ZIP polygons.','No staffing need, backlog or cost savings inferred.'],
 coverage:{cohortRequests:zt,geocodedPlausibleRequests:gt,excludedMissingOrOutsideBoundingBox:zt-gt,missingZipAllRecords:zipGroups.filter(x=>!x.zip).reduce((a,x)=>a+x.requests,0),missingZipGeocoded:geocodedZipGroups.filter(x=>!x.zip).reduce((a,x)=>a+x.requests,0),zipGroups:zipGroups.length,geocodedZipGroups:geocodedZipGroups.length},
 zipGroups,geocodedZipGroups};
}
async function main(){
 const [z,zc,g,gc]=await Promise.all([
 request(urlFor('zipcode,count(*) as n',COHORT,'zipcode','n DESC',LIMIT)),
 request(urlFor('count(*) as n',COHORT)),
 request(urlFor('zipcode,count(*) as n,avg(latitude) as lat,avg(longitude) as lon',GEO_WHERE,'zipcode','n DESC',LIMIT)),
 request(urlFor('count(*) as n',GEO_WHERE))]);
 const result=makeSummary(z,Number(zc[0]?.n),g,Number(gc[0]?.n));
 const dest=path.resolve(process.argv[2]||'data/myla311-2024-geography.json');
 fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,JSON.stringify(result,null,2)+'\n');
 process.stdout.write('Wrote '+dest+'; '+result.coverage.cohortRequests+' cohort requests, '+result.coverage.geocodedPlausibleRequests+' geocoded.\n');
}
module.exports={urlFor,verifyGroups,makeSummary};
if(require.main===module)main().catch(e=>{process.stderr.write(String(e.stack||e)+'\n');process.exitCode=1;});
