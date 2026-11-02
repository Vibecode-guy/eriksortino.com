/* Project 3 planning sandbox: deterministic synthetic scenarios, never real dispatch advice. */
(function(root,factory){const api=factory(typeof module==='object'&&module.exports?require('./project3-engine.js'):root.AVCommand);if(typeof module==='object'&&module.exports)module.exports=api;else root.AVPlanning=api;})(typeof globalThis!=='undefined'?globalThis:this,function(E){
'use strict';
if(!E)throw Error('AV engine required');
const DAYS=30, FIXED_SITE_COST=3200, KM_RATE=.65;
const SITES=[
 {id:'baseline',label:'Existing four fictional providers',lat:null,lon:null},
 {id:'west',label:'Add LAX / Westside staging',lat:33.959,lon:-118.402},
 {id:'valley',label:'Add San Fernando Valley staging',lat:34.1867,lon:-118.449},
 {id:'harbor',label:'Add San Pedro / Harbor staging',lat:33.739,lon:-118.289}
];
const TYPE_ORDER=['door_ajar','flat_tire','immobilized','flatbed','depot'];
const TYPE_WEIGHTS=[25,15,30,18,12]; // percent, synthetic assumptions
function validate(config){
 const c={fleetSize:config?.fleetSize??24,incidentsPer100PerDay:config?.incidentsPer100PerDay??5,budget:config?.budget??5000,days:config?.days??DAYS};
 if(!Number.isInteger(c.fleetSize)||c.fleetSize<12||c.fleetSize>240||!Number.isInteger(c.incidentsPer100PerDay)||c.incidentsPer100PerDay<1||c.incidentsPer100PerDay>30||!Number.isInteger(c.budget)||c.budget<0||c.budget>100000||!Number.isInteger(c.days)||c.days<1||c.days>60)throw Error('Invalid scenario controls');
 return c;
}
function distanceKm(a,b){return Math.hypot((a.lat-b.lat)*111,(a.lon-b.lon)*92);}
function random(seed){let x=seed>>>0;return ()=>{x=(Math.imul(x,1664525)+1013904223)>>>0;return x/4294967296;};}
function eventsFor(config){
 const c=validate(config),vehicles=E.initialState().vehicles,count=Math.round(c.fleetSize*c.incidentsPer100PerDay*c.days/100);
 const rng=random(20261101+c.fleetSize*37+c.incidentsPer100PerDay*101+c.days*13);
 const events=[];
 for(let n=0;n<count;n++){
  const v=vehicles[Math.floor(rng()*vehicles.length)],roll=rng()*100;
  let total=0,type=TYPE_ORDER[TYPE_ORDER.length-1];
  for(let j=0;j<TYPE_ORDER.length;j++){total+=TYPE_WEIGHTS[j];if(roll<total){type=TYPE_ORDER[j];break;}}
  // Fixed horizon, bounded jitter; sort by arrival to keep the single-crew model causal.
  const base=(n+.5)*c.days*1440/count;
  const jitter=(rng()-.5)*Math.min(60,c.days*1440/count*.5);
  const at=Math.max(0,Math.min(c.days*1440-1,Math.round(base+jitter)));
  events.push({id:n+1,at,vehicleId:v.id,type});
 }
 return events.sort((a,b)=>a.at-b.at||a.id-b.id);
}
function percentile(values,p){if(!values.length)return null;const a=values.slice().sort((x,y)=>x-y);return a[Math.ceil(a.length*p)-1];}
function mean(values){return values.length?Math.round(values.reduce((a,b)=>a+b,0)*10/values.length)/10:null;}
function simulate(config,siteId,events){
 const c=validate(config),site=SITES.find(x=>x.id===siteId);if(!site)throw Error('Unknown staging site');
 const fleet=E.initialState(),vehicles=new Map(fleet.vehicles.map(v=>[v.id,v]));
 const providers=fleet.providers.map(p=>({...p}));
 if(site.id!=='baseline')providers.push({id:'P-05',name:'Additional staged crew ('+site.label+')',lat:site.lat,lon:site.lon,capabilities:TYPE_ORDER.slice(),baseCost:205});
 const ready=new Map(providers.map(p=>[p.id,0])),jobs=new Map(providers.map(p=>[p.id,0]));
 const responses=[],waits=[],examples=[];let met=0,variableCost=0,queuedEvents=0,over30Queue=0;
 for(const event of events){
  const v=vehicles.get(event.vehicleId),t=E.TYPES[event.type];if(!v||!t)throw Error('Invalid synthetic event');
  const candidates=providers.filter(p=>p.capabilities.includes(t.needs)).map(p=>{
   const start=Math.max(event.at,ready.get(p.id)),travel=E.estimateTravel(v,p),onScene=start+t.minutes[0]+travel;
   const surcharge=event.type==='flatbed'?125:event.type==='depot'?95:0;
   const cost=Math.round(p.baseCost+surcharge+KM_RATE*distanceKm(v,p));
   return {provider:p,start,travel,onScene,cost,wait:start-event.at,response:onScene-event.at};
  }).sort((a,b)=>a.response-b.response||a.cost-b.cost||a.provider.id.localeCompare(b.provider.id));
  if(!candidates.length)throw Error('No compatible provider');
  const best=candidates[0];ready.set(best.provider.id,best.onScene+t.minutes[2]);jobs.set(best.provider.id,jobs.get(best.provider.id)+1);
  responses.push(best.response);waits.push(best.wait);if(best.wait>0)queuedEvents++;if(best.wait>30)over30Queue++;if(best.response<=t.sla)met++;variableCost+=best.cost;
  if(examples.length<3)examples.push({vehicleId:event.vehicleId,type:event.type,provider:best.provider.name,travelMinutes:best.travel,queueMinutes:best.wait,responseMinutes:best.response,estimatedCost:best.cost,reason:'Eligible capability; earliest modeled on-scene arrival among available crews, then lower variable cost, then provider ID.'});
 }
 const overhead=site.id==='baseline'?0:FIXED_SITE_COST;
 return {id:site.id,label:site.label,events:events.length,meanResponse:mean(responses),p90Response:percentile(responses,.9),meanQueue:mean(waits),p90Queue:percentile(waits,.9),queuedEvents,over30Queue,queuedPercent:events.length?Math.round(1000*queuedEvents/events.length)/10:0,crewLoad:[...jobs].map(([id,count])=>({id,count})).sort((a,b)=>b.count-a.count||a.id.localeCompare(b.id)),slaMet:met,slaPercent:events.length?Math.round(1000*met/events.length)/10:null,variableCost,overhead,totalCost:variableCost+overhead,providerJobs:[...jobs].map(([id,count])=>({id,count})),examples};
}
function compare(config){
 const c=validate(config),events=eventsFor(c),scenarios=SITES.map(s=>simulate(c,s.id,events)),baseline=scenarios[0];
 const eligible=scenarios.filter(s=>s.totalCost-baseline.totalCost<=c.budget);
 eligible.sort((a,b)=>(a.p90Response??Infinity)-(b.p90Response??Infinity)||(a.meanResponse??Infinity)-(b.meanResponse??Infinity)||a.totalCost-b.totalCost||a.id.localeCompare(b.id));
 const recommendation=eligible[0]||baseline;
 return {config:c,baseline,recommendation,scenarios,assumptions:{horizonDays:c.days,events:events.length,siteFixedCost:FIXED_SITE_COST,perKmCost:KM_RATE,providerCrewCapacity:'One concurrent response per fictional provider; additional site adds one crew',eventGeneration:'Seeded synthetic incidents across 12 LA vehicle-area proxies; fleet size scales event volume, not map markers',dispatchRule:'Earliest modeled on-scene arrival among capability-compatible crews, then lowest variable cost, then provider ID',recommendationRule:'Among staging options with incremental total cost at most the selected budget, choose lowest p90 response; tie by mean response, total cost, then site ID'},notes:['All locations, event frequencies, cost rates, SLA thresholds and travel estimates are invented, not calibrated to a real operator.','Same seeded incidents are used across all four staging options within a comparison.','One fictional crew per provider; queue time includes any crew busy with prior incidents.','This is a 30-day incident-response workload model, not passenger-trip utilization or a live fleet feed.','Straight-line travel and constant effective speed omit real traffic, routing, availability and safety requirements.']};
}
return {DAYS,SITES,validate,eventsFor,simulate,compare,mean,percentile};
});
