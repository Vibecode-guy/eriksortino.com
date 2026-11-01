/* Project 3 synthetic fleet analytics. Derived exclusively from the local simulation state. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AVAnalytics=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function round(n){return Math.round(n*10)/10;}
function percentile(values,p){if(!values.length)return null;const sorted=values.slice().sort((a,b)=>a-b);return sorted[Math.ceil(sorted.length*p)-1];}
function mean(values){return values.length?round(values.reduce((a,b)=>a+b,0)/values.length):null;}
function duration(end,start){return end===null||start===null?null:Math.max(0,end-start);}
function summarize(state){
 if(!state||!Array.isArray(state.incidents)||!Array.isArray(state.vehicles)||!Array.isArray(state.providers)||!Number.isFinite(state.minute)||state.minute<0)throw Error('Invalid simulation state');
 const incidents=state.incidents,completed=incidents.filter(i=>i.status==='completed'&&i.completedAt!==null);
 const total=state.vehicles.length,available=state.vehicles.filter(v=>v.status==='available').length;
 const fleetMinutes=total*state.minute;
 const incidentMinutes=incidents.reduce((sum,i)=>sum+Math.max(0,(i.completedAt===null?state.minute:i.completedAt)-i.created),0);
 if(incidentMinutes>fleetMinutes)throw Error('Incident downtime exceeds fleet exposure');
 const onScene=completed.filter(i=>i.onSceneAt!==null);
 const responses=onScene.map(i=>i.onSceneAt-i.created);
 const types=Object.create(null),areas=Object.create(null);
 const vehicles=new Map(state.vehicles.map(v=>[v.id,v]));
 for(const i of incidents){
  const area=vehicles.get(i.vehicleId)?.area||'Unknown';
  for(const [bucket,key] of [[types,i.type],[areas,area]]){
   if(!bucket[key])bucket[key]={key,incidents:0,active:0,completed:0,spend:0,breached:0};
   const row=bucket[key];row.incidents++;if(i.status!=='completed')row.active++;else {row.completed++;row.spend+=i.cost||0;}
   if(i.status!=='completed'&&state.minute-i.created>i.sla)row.breached++;
  }
 }
 const providerRows=state.providers.map(p=>{
  const assigned=incidents.filter(i=>i.providerId===p.id);
  const done=assigned.filter(i=>i.status==='completed'&&i.completedAt!==null);
  const responded=done.filter(i=>i.onSceneAt!==null);
  const times=responded.map(i=>i.onSceneAt-i.created);
  const met=responded.filter(i=>i.onSceneAt-i.created<=i.sla).length;
  return {id:p.id,name:p.name,assigned:assigned.length,active:assigned.length-done.length,completed:done.length,meanResponse:mean(times),p90Response:percentile(times,.9),slaMet:met,slaEvaluated:responded.length,slaMetPercent:responded.length?round(100*met/responded.length):null,spend:done.reduce((a,i)=>a+(i.cost||0),0)};
 });
 const stages=[
  {id:'assignment',name:'Queue to assignment',values:completed.map(i=>duration(i.assignedAt,i.created)).filter(x=>x!==null)},
  {id:'dispatch',name:'Dispatch to en route',values:completed.map(i=>duration(i.enRouteAt,i.assignedAt)).filter(x=>x!==null)},
  {id:'travel',name:'En route to on scene',values:completed.map(i=>duration(i.onSceneAt,i.enRouteAt)).filter(x=>x!==null)},
  {id:'service',name:'On scene to completion',values:completed.map(i=>duration(i.completedAt,i.onSceneAt)).filter(x=>x!==null)}
 ].map(x=>({id:x.id,name:x.name,samples:x.values.length,meanMinutes:mean(x.values),p90Minutes:percentile(x.values,.9)}));
 const largest=stages.filter(x=>x.meanMinutes!==null).sort((a,b)=>b.meanMinutes-a.meanMinutes)[0]||null;
 const overdue=incidents.filter(i=>i.status!=='completed'&&state.minute-i.created>i.sla).length;
 const queued=incidents.filter(i=>i.status==='queued');
 const totalSpend=completed.reduce((a,i)=>a+(i.cost||0),0);
 return {
  fleet:{total,available,instantAvailabilityPercent:total?round(100*available/total):null,elapsedMinutes:state.minute,fleetMinutes,incidentDowntimeMinutes:incidentMinutes,incidentDowntimePercent:fleetMinutes?round(100*incidentMinutes/fleetMinutes):null,serviceReadyPercent:fleetMinutes?round(100*(fleetMinutes-incidentMinutes)/fleetMinutes):null,tripUtilizationPercent:null},
  incidents:{total:incidents.length,active:incidents.length-completed.length,completed:completed.length,queued:queued.length,overdue,meanResponse:mean(responses),p90Response:percentile(responses,.9),responseSamples:responses.length,totalSpend,meanCost:completed.length?round(totalSpend/completed.length):null},
  providers:providerRows,types:Object.values(types).sort((a,b)=>b.incidents-a.incidents||a.key.localeCompare(b.key)),areas:Object.values(areas).sort((a,b)=>b.incidents-a.incidents||a.key.localeCompare(b.key)),
  stages,bottleneck:largest?{stage:largest.id,label:largest.name,meanMinutes:largest.meanMinutes,samples:largest.samples}:null,
  notes:['All counts and dollar amounts are synthetic.','Response times use completed incidents with an on-scene timestamp; nearest-rank p90.','SLA attainment uses on-scene time versus incident creation; active breaches are reported separately.','Fleet-minute incident downtime is not commercial trip utilization.','Provider costs are posted only at completion; no provider capacity or traffic is modeled.']
 };
}
return {summarize,percentile,mean};
});
