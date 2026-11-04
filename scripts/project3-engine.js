/* Project 3 synthetic AV operations simulator. No real fleet or partner data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AVCommand=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const VEHICLES=[
 ['AV-101','Westchester',33.959,-118.402],['AV-102','Marina del Rey',33.981,-118.451],['AV-103','Venice',33.994,-118.469],
 ['AV-104','Santa Monica',34.017,-118.491],['AV-105','Culver City',34.021,-118.396],['AV-106','Mid-City',34.048,-118.356],
 ['AV-107','Downtown LA',34.049,-118.246],['AV-108','Hollywood',34.101,-118.329],['AV-109','Koreatown',34.061,-118.301],
 ['AV-110','South LA',33.990,-118.293],['AV-111','Inglewood',33.961,-118.353],['AV-112','San Pedro',33.739,-118.289]
];
const PROVIDERS=[
 {id:'P-01',name:'Westside Roadside',area:'West LA',lat:34.010,lon:-118.420,capabilities:['door_ajar','immobilized','flat_tire'],baseCost:95},
 {id:'P-02',name:'Central Recovery',area:'Central LA',lat:34.045,lon:-118.300,capabilities:['door_ajar','immobilized','flat_tire','flatbed','depot'],baseCost:225},
 {id:'P-03',name:'Harbor Flatbed',area:'Harbor',lat:33.775,lon:-118.285,capabilities:['flatbed','depot','immobilized'],baseCost:195},
 {id:'P-04',name:'Valley Response',area:'Valley',lat:34.175,lon:-118.420,capabilities:['door_ajar','immobilized','flat_tire','flatbed'],baseCost:175}
];
const ZONES=[['Central LA',34.049,-118.246],['Westside / Venice',33.994,-118.469],['San Fernando Valley',34.175,-118.420],['South LA / LAX',33.961,-118.353],['Harbor / San Pedro',33.739,-118.289]];
const DEFAULT_FLEET_CONFIG=Object.freeze({seed:20261102,count:100});
function seededFleet(config=DEFAULT_FLEET_CONFIG){
 const {seed:inputSeed=DEFAULT_FLEET_CONFIG.seed,count=DEFAULT_FLEET_CONFIG.count}=config;
 if(!Number.isSafeInteger(inputSeed)||inputSeed<0||inputSeed>4294967295)throw Error('Fleet seed must be a 32-bit unsigned integer');
 if(!Number.isSafeInteger(count)||count<12||count>240)throw Error('Fleet size must be 12–240');
 const out=VEHICLES.map(([id,area,lat,lon])=>({id,area,lat,lon,status:'available'}));
 let seed=inputSeed;
 const rand=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let n=113;n<101+count;n++){
  const zone=ZONES[(n-113)%ZONES.length];
  out.push({id:'AV-'+n,area:zone[0],lat:+(zone[1]+(rand()-.5)*.055).toFixed(6),lon:+(zone[2]+(rand()-.5)*.075).toFixed(6),status:'available'});
 }
 return out;
}
const FLEET=seededFleet();
PROVIDERS.push(
 {id:'P-05',name:'LAX Field Response',area:'South LA / LAX',lat:33.959,lon:-118.402,capabilities:['door_ajar','immobilized','flat_tire'],baseCost:125},
 {id:'P-06',name:'Harbor Recovery Two',area:'Harbor / San Pedro',lat:33.745,lon:-118.285,capabilities:['immobilized','flatbed','depot'],baseCost:205}
);
const TYPES={
 door_ajar:{label:'Door ajar',severity:'Low',sla:30,needs:'door_ajar',minutes:[4,8,6],impact:'Vehicle temporarily unavailable'},
 flat_tire:{label:'Flat tire · roadside assessment',severity:'Medium',sla:40,needs:'flat_tire',minutes:[5,12,24],impact:'Vehicle unavailable pending tire service or recovery assessment'},
 immobilized:{label:'Immobilized AV',severity:'High',sla:35,needs:'immobilized',minutes:[5,12,15],impact:'Vehicle unavailable'},
 flatbed:{label:'Flatbed recovery',severity:'Critical',sla:45,needs:'flatbed',minutes:[8,16,35],impact:'Vehicle unavailable'},
 depot:{label:'Depot transport',severity:'Medium',sla:60,needs:'depot',minutes:[6,18,32],impact:'Vehicle unavailable'}
};
function initialState(config){return {minute:0,nextId:1,selected:'AV-101',vehicles:(config?seededFleet(config):FLEET).map(v=>({...v})),providers:PROVIDERS.map(p=>({...p})),incidents:[],providerOffers:[],providerCancellations:[],additionalCharges:[],providerSurveys:[],qualityPlans:[]};}

// Deterministic showcase data, created through the same state transitions as manual dispatch.
function demoState(){
 const s=initialState();
 const complete=(id,type)=>{const i=createIncident(s,id,type);const options=eligibleProviders(s,i.id);assign(s,i.id,options[0].id);advance(s,i.id);advance(s,i.id);advance(s,i.id);return i;};
 complete('AV-102','door_ajar');
 complete('AV-107','flatbed');
 complete('AV-112','depot');
 const active=createIncident(s,'AV-105','immobilized');
 assign(s,active.id,eligibleProviders(s,active.id)[0].id);
 advance(s,active.id);
 const queued=createIncident(s,'AV-110','flatbed');
 s.selected='AV-101';
 return s;
}
function vehicle(s,id){const v=s.vehicles.find(x=>x.id===id);if(!v)throw Error('Unknown vehicle');return v;}
function incident(s,id){const i=s.incidents.find(x=>x.id===id);if(!i)throw Error('Unknown incident');return i;}
function provider(s,id){const p=s.providers.find(x=>x.id===id);if(!p)throw Error('Unknown provider');return p;}
function createIncident(s,vehicleId,type){const v=vehicle(s,vehicleId),t=TYPES[type];if(!t)throw Error('Unknown incident type');if(v.status!=='available')throw Error('Vehicle already unavailable');const i={id:'INC-'+String(s.nextId++).padStart(3,'0'),vehicleId,type,severity:t.severity,sla:t.sla,created:s.minute,status:'queued',providerId:null,assignedAt:null,enRouteAt:null,onSceneAt:null,completedAt:null,cost:0,tireResolution:null,recoveryProviderId:null,recoveryRequestedAt:null,recoveryOnSceneAt:null,redispatchReason:null,owner:null,acknowledgedAt:null,notes:[],pendingActions:[],evacuation:null,customerSafety:{danger:false,reason:null,flaggedAt:null,emergencyEscalatedAt:null,safeAt:null},escalated:false};s.incidents.unshift(i);v.status='incident';return i;}
function providerBusy(s,id,excludeId){return s.incidents.some(i=>i.id!==excludeId&&i.status!=='completed'&&(i.providerId===id||i.recoveryProviderId===id));}
function providerBoard(s){return s.providers.map(p=>{const current=s.incidents.find(i=>i.status!=='completed'&&(i.providerId===p.id||i.recoveryProviderId===p.id));return {...p,busy:!!current,incidentId:current?.id||null};});}
function eligibleProviders(s,incidentId){const i=incident(s,incidentId);return s.providers.filter(p=>!providerBusy(s,p.id,i.id)&&p.capabilities.includes(TYPES[i.type].needs)).map(p=>({...p,estimatedMinutes:estimateTravel(vehicle(s,i.vehicleId),p)})).sort((a,b)=>a.estimatedMinutes-b.estimatedMinutes||a.id.localeCompare(b.id));}
function estimateTravel(v,p){const dy=(v.lat-p.lat)*111,dx=(v.lon-p.lon)*92;return Math.max(6,Math.round(Math.hypot(dx,dy)/.52+5));} // synthetic effective speed ~31 km/h
function recordProviderOffer(s,incidentId,providerId,outcome){
 const i=incident(s,incidentId),p=provider(s,providerId);
 if(i.status!=='queued')throw Error('Offers require a queued incident');
 if(!p.capabilities.includes(TYPES[i.type].needs))throw Error('Provider not equipped');
 if(!['accepted','declined','timed_out'].includes(outcome))throw Error('Invalid offer outcome');
 if(outcome==='accepted'&&providerBusy(s,p.id,i.id))throw Error('Provider already busy');
 if(s.providerOffers.some(o=>o.incidentId===i.id&&o.providerId===p.id))throw Error('Provider already offered this incident');
 const offer={incidentId:i.id,providerId:p.id,outcome,minute:s.minute};s.providerOffers.push(offer);
 if(outcome==='accepted')assign(s,i.id,p.id);
 return offer;
}
function cancelProviderAssignment(s,id,reason){
 const i=incident(s,id);
 if(!['dispatched','en_route'].includes(i.status))throw Error('Cancellation requires an assigned provider before arrival');
 const detail=String(reason||'').trim();
 if(!detail||detail.length>200)throw Error('Cancellation reason must be 1–200 characters');
 s.providerCancellations.push({incidentId:i.id,providerId:i.providerId,minute:s.minute,reason:detail});
 i.providerId=null;i.assignedAt=null;i.enRouteAt=null;i.status='queued';return i;
}
function recordAdditionalCharge(s,id,amount,reason){
 const i=incident(s,id),value=Number(amount),detail=String(reason||'').trim();
 if(!i.providerId)throw Error('Assign a provider before recording additional charges');
 if(!Number.isFinite(value)||value<=0||value>10000||Math.round(value*100)!==value*100)throw Error('Charge must be a positive amount up to $10,000 with two decimal places');
 if(!detail||detail.length>200)throw Error('Charge reason must be 1–200 characters');
 const charge={incidentId:i.id,providerId:i.providerId,amount:value,reason:detail,minute:s.minute};
 s.additionalCharges.push(charge);return charge;
}
function recordProviderSurvey(s,id,nps){
 const i=incident(s,id);
 if(!i.providerId)throw Error('Provider assignment required for survey');
 if(!Number.isInteger(nps)||nps<0||nps>10)throw Error('NPS response must be an integer from 0 to 10');
 if(s.providerSurveys.some(x=>x.incidentId===id))throw Error('Survey already recorded for incident');
 const survey={incidentId:id,providerId:i.providerId,nps,minute:s.minute};s.providerSurveys.push(survey);return survey;
}
function providerExperience(s){
 return s.providers.map(p=>{
  const surveys=s.providerSurveys.filter(x=>x.providerId===p.id);
  const promoters=surveys.filter(x=>x.nps>=9).length,detractors=surveys.filter(x=>x.nps<=6).length;
  return {providerId:p.id,name:p.name,responses:surveys.length,
   nps:surveys.length?100*(promoters-detractors)/surveys.length:null};
 });
}
function providerQuality(s){
 return s.providers.map(p=>{
  const arrivals=s.incidents.filter(i=>i.arrivalProviderId===p.id&&i.onSceneAt!==null);
  const onTime=arrivals.filter(i=>i.onSceneAt-i.created<=i.sla).length,late=arrivals.length-onTime;
  const cancellations=s.providerCancellations.filter(x=>x.providerId===p.id).length;
  const accepted=s.providerOffers.filter(o=>o.providerId===p.id&&o.outcome==='accepted').length;
  const charges=s.additionalCharges.filter(x=>x.providerId===p.id);
  const totalAdditional=charges.reduce((sum,x)=>sum+x.amount,0);
  return {providerId:p.id,name:p.name,arrivals:arrivals.length,onTime,late,cancellations,
   onTimeRate:arrivals.length?100*onTime/arrivals.length:null,
   cancellationRate:accepted?100*cancellations/accepted:null,
   chargeCount:charges.length,totalAdditional,averageAdditional:accepted?totalAdditional/accepted:null};
 });
}
// Illustrative management index, not a production vendor rating. Missing dimensions are excluded.
// Deterministic historical sample, deliberately isolated from live dispatch KPIs.
const QUALITY_STATUSES=['open','in_progress','review_due','closed'];
function openQualityPlan(s,providerId,owner,action){
 provider(s,providerId);
 if(!owner||!owner.trim()||!action||!action.trim())throw Error('Owner and corrective action are required');
 if(s.qualityPlans.some(p=>p.providerId===providerId&&p.status!=='closed'))throw Error('Provider already has an active quality plan');
 const history=providerHistory(s).find(p=>p.providerId===providerId);
 const plan={id:'QP-'+String(s.qualityPlans.length+1).padStart(3,'0'),providerId,owner:owner.trim().slice(0,100),
  action:action.trim().slice(0,500),status:'open',baselineScore:history.periods[1].score,
  reviewAfterDays:30,reviewDay:null,followUpScore:null,notes:[],createdAt:'Synthetic period end'};
 s.qualityPlans.push(plan);return plan;
}
function updateQualityPlan(s,id,status,note,followUpScore=null){
 const plan=s.qualityPlans.find(p=>p.id===id);if(!plan)throw Error('Unknown quality plan');
 if(!QUALITY_STATUSES.includes(status))throw Error('Invalid quality plan status');
 if(plan.status==='closed')throw Error('Closed quality plan cannot be changed');
 if(!note||!note.trim())throw Error('A progress note is required');
 if(status==='closed'&&(!Number.isFinite(followUpScore)||followUpScore<0||followUpScore>100))throw Error('Closing requires a follow-up index from 0 to 100');
 plan.notes.push({status,text:note.trim().slice(0,500),at:'Simulation'});
 plan.status=status;
 if(status==='review_due')plan.reviewDay=30;
 if(status==='closed')plan.followUpScore=followUpScore;
 return plan;
}
function providerQualityPlans(s){return s.qualityPlans.map(p=>({...p,notes:p.notes.map(n=>({...n})),improvement:p.followUpScore===null?null:p.followUpScore-p.baselineScore}));}
function providerReviewQueue(s){
 const history=providerHistory(s);
 return history.map(p=>{
  const active=s.qualityPlans.find(x=>x.providerId===p.providerId&&x.status!=='closed');
  const flagged=p.delta<=-3||p.periods[1].score<75;
  const reason=p.delta<=-3?'Performance declined by '+Math.abs(p.delta).toFixed(1)+' points':
   p.periods[1].score<75?'Recent performance index below 75':'No automatic review trigger';
  return {providerId:p.providerId,name:p.name,flagged,reason,score:p.periods[1].score,delta:p.delta,
   activePlanId:active?active.id:null,planStatus:active?active.status:null,
   action:active?'Plan active':flagged?'Review recommended':'Monitor'};
 }).sort((a,b)=>Number(b.flagged)-Number(a.flagged)||a.score-b.score);
}
function providerHistory(s){
 const periods=['Prior 30 days','Recent 30 days'];
 return s.providers.map((p,index)=>{
  const rows=periods.map((period,periodIndex)=>{
   const offers=36+index*7+periodIndex*6;
   const accepted=Math.round(offers*Math.max(.52,.94-index*.055+(periodIndex===1?(index%2===0?.035:-.055):0)));
   const arrivals=Math.max(1,accepted-2-index%3);
   const onTime=Math.round(arrivals*Math.max(.48,.94-index*.052+(periodIndex===1?(index%2===0?.025:-.065):0)));
   const cancellations=Math.max(0,accepted-arrivals);
   const redispatch=Math.round(arrivals*(.035+index*.014+(periodIndex===1&&index%2===1?.045:0)));
   const averageAdditional=+(9+index*7+(periodIndex===1?(index%2===0?-2:8):0)).toFixed(2);
   const responses=Math.max(8,Math.round(arrivals*.45));
   const promoters=Math.round(responses*Math.max(.35,.78-index*.055+(periodIndex===1?(index%2===0?.03:-.08):0)));
   const detractors=Math.round(responses*(.06+index*.025+(periodIndex===1&&index%2===1?.04:0)));
   const nps=100*(promoters-detractors)/responses;
   const acceptanceRate=100*accepted/offers,onTimeRate=100*onTime/arrivals,cancellationRate=100*cancellations/accepted,redispatchRate=100*redispatch/arrivals;
   const score=.25*acceptanceRate+.30*onTimeRate+.15*(100-cancellationRate)+.10*(100-redispatchRate)+.10*Math.max(0,100-averageAdditional/2)+.10*(nps+100)/2;
   return {period,offers,accepted,arrivals,onTime,late:arrivals-onTime,cancellations,redispatch,averageAdditional,responses,nps,acceptanceRate,onTimeRate,cancellationRate,redispatchRate,score};
  });
  const delta=rows[1].score-rows[0].score;
  return {providerId:p.id,name:p.name,periods:rows,delta,
   recommendation:delta<=-3?'Quality review':rows[1].score>=85?'Consider more volume':'Monitor performance'};
 }).sort((a,b)=>b.periods[1].score-a.periods[1].score);
}
function providerScorecard(s){
 const acceptance=providerAcceptance(s),quality=providerQuality(s),experience=providerExperience(s);
 const clamp=v=>Math.max(0,Math.min(100,v));
 const weights={acceptance:25,onTime:30,cancellations:15,redispatch:10,additionalCharges:10,nps:10};
 return s.providers.map(p=>{
  const a=acceptance.find(x=>x.providerId===p.id),q=quality.find(x=>x.providerId===p.id),e=experience.find(x=>x.providerId===p.id);
  const dispatched=s.incidents.filter(i=>i.providerId===p.id||i.arrivalProviderId===p.id||s.providerCancellations.some(x=>x.incidentId===i.id&&x.providerId===p.id));
  const redispatch=dispatched.filter(i=>i.redispatchReason&&i.providerId===p.id).length;
  const redispatchRate=dispatched.length?100*redispatch/dispatched.length:null;
  const dimensions=[
   {name:'acceptance',weight:weights.acceptance,value:a.rate,count:a.offers},
   {name:'onTime',weight:weights.onTime,value:q.onTimeRate,count:q.arrivals},
   {name:'cancellations',weight:weights.cancellations,value:q.cancellationRate===null?null:100-q.cancellationRate,count:a.accepted},
   {name:'redispatch',weight:weights.redispatch,value:redispatchRate===null?null:100-redispatchRate,count:dispatched.length},
   {name:'additionalCharges',weight:weights.additionalCharges,value:q.averageAdditional===null?null:clamp(100-q.averageAdditional/2),count:a.accepted},
   {name:'nps',weight:weights.nps,value:e.nps===null?null:(e.nps+100)/2,count:e.responses}
  ];
  const observed=dimensions.filter(d=>d.value!==null);
  const weight=observed.reduce((n,d)=>n+d.weight,0);
  const score=weight?observed.reduce((n,d)=>n+d.weight*clamp(d.value),0)/weight:null;
  const sufficient=a.offers>=5&&q.arrivals>=5&&e.responses>=5;
  return {providerId:p.id,name:p.name,acceptance:a,quality:q,experience:e,redispatch,redispatchJobs:dispatched.length,redispatchRate,
   score,coverageWeight:weight,dimensions,eligibleForRanking:sufficient&&weight===100};
 }).sort((a,b)=>Number(b.eligibleForRanking)-Number(a.eligibleForRanking)||(b.score??-1)-(a.score??-1)||a.name.localeCompare(b.name));
}
function providerAcceptance(s){
 return s.providers.map(p=>{
  const offers=s.providerOffers.filter(o=>o.providerId===p.id);
  const accepted=offers.filter(o=>o.outcome==='accepted').length,declined=offers.filter(o=>o.outcome==='declined').length,timedOut=offers.filter(o=>o.outcome==='timed_out').length;
  return {providerId:p.id,name:p.name,offers:offers.length,accepted,declined,timedOut,rate:offers.length?100*accepted/offers.length:null};
 });
}
function assign(s,incidentId,providerId){const i=incident(s,incidentId),p=provider(s,providerId);if(i.status!=='queued')throw Error('Incident must be queued');if(!p.capabilities.includes(TYPES[i.type].needs))throw Error('Provider not equipped');if(providerBusy(s,p.id,i.id))throw Error('Provider already assigned to active incident');i.providerId=p.id;i.assignedAt=s.minute;i.status='dispatched';return i;}
function advance(s,incidentId){const i=incident(s,incidentId),t=TYPES[i.type];if(i.status==='queued')throw Error('Assign provider first');if(i.status==='completed')throw Error('Incident already completed');if(i.type==='flat_tire'&&i.status==='on_scene'&&!i.tireResolution)throw Error('Choose tire service or flatbed recovery before completing');const next={dispatched:'en_route',en_route:'on_scene',on_scene:'completed',recovery_dispatched:'recovery_en_route',recovery_en_route:'recovery_on_scene',recovery_on_scene:'completed'}[i.status];if(!next)throw Error('Invalid state');const mins=i.status==='recovery_dispatched'?8:i.status==='recovery_en_route'?estimateTravel(vehicle(s,i.vehicleId),provider(s,i.recoveryProviderId)):i.status==='recovery_on_scene'?45:i.status==='dispatched'?t.minutes[0]:i.status==='en_route'?estimateTravel(vehicle(s,i.vehicleId),provider(s,i.providerId)):i.type==='flat_tire'&&i.tireResolution==='flatbed'?45:t.minutes[2];s.minute+=mins;i.status=next;if(next==='en_route')i.enRouteAt=s.minute;if(next==='recovery_on_scene')i.recoveryOnSceneAt=s.minute;if(next==='on_scene'){i.onSceneAt=s.minute;i.arrivalProviderId=i.providerId;}if(next==='completed'){i.completedAt=s.minute;i.cost=provider(s,i.providerId).baseCost+(i.recoveryProviderId?provider(s,i.recoveryProviderId).baseCost:0)+(i.type==='flatbed'?125:i.type==='depot'?95:i.type==='flat_tire'&&i.tireResolution==='flatbed'?175:i.type==='flat_tire'?55:0);vehicle(s,i.vehicleId).status='available';}return i;}
function resolveTire(s,id,outcome){
 const i=incident(s,id);
 if(i.type!=='flat_tire'||i.status!=='on_scene')throw Error('Tire decision requires an on-scene flat tire incident');
 if(!['roadside','flatbed'].includes(outcome))throw Error('Choose roadside service or flatbed recovery');
 const p=provider(s,i.providerId);
 if(outcome==='flatbed'&&!p.capabilities.includes('flatbed'))throw Error('Current provider lacks flatbed capability; assign a flatbed-equipped provider before on-scene arrival');
 i.tireResolution=outcome;return i;
}
function requestRecovery(s,id,providerId,reason='change_of_service'){
 const i=incident(s,id),p=provider(s,providerId);
 if(i.type!=='flat_tire'||i.status!=='on_scene'||i.tireResolution)throw Error('Recovery handoff requires unresolved on-scene flat tire');
 if(!['change_of_service','incorrect_equipment'].includes(reason))throw Error('Invalid re-dispatch reason');
 if(!p.capabilities.includes('flatbed'))throw Error('Recovery crew must have flatbed capability');
 if(p.id===i.providerId)throw Error('Select a separate recovery provider');if(providerBusy(s,p.id,i.id))throw Error('Recovery provider already assigned');
 i.tireResolution='flatbed';i.recoveryProviderId=p.id;i.recoveryRequestedAt=s.minute;i.redispatchReason=reason;i.status='recovery_dispatched';return i;
}
const DANGER_REASONS={exposed_roadway:'Exposed roadway',unsafe_location:'Unsafe location',immediate_risk:'Immediate customer risk'};
function flagCustomerDanger(s,id,reason){
 const i=incident(s,id);
 if(i.status==='completed')throw Error('Cannot flag a completed incident');
 if(!DANGER_REASONS[reason])throw Error('Choose a valid customer danger reason');
 if(i.customerSafety.danger)throw Error('Customer danger already flagged');
 i.customerSafety.danger=true;i.customerSafety.reason=reason;i.customerSafety.flaggedAt=s.minute;i.severity='Critical';i.escalated=true;return i.customerSafety;
}
function escalateCustomerEmergency(s,id){
 const i=incident(s,id);
 if(!i.customerSafety.danger)throw Error('Flag customer danger first');
 if(i.customerSafety.emergencyEscalatedAt!==null)throw Error('Emergency escalation already recorded');
 i.customerSafety.emergencyEscalatedAt=s.minute;return i.customerSafety;
}
function availableReplacementAVs(s,id){
 const i=incident(s,id),target=vehicle(s,i.vehicleId);
 return s.vehicles.filter(v=>v.id!==target.id&&v.status==='available').map(v=>({...v,estimatedMinutes:estimateTravel(target,v)})).sort((a,b)=>a.estimatedMinutes-b.estimatedMinutes||a.id.localeCompare(b.id));
}
function dispatchReplacement(s,id,replacementId){
 const i=incident(s,id),replacement=vehicle(s,replacementId);
 if(i.status==='completed')throw Error('Cannot evacuate from completed incident');
 if(i.evacuation)throw Error('Replacement already dispatched');
 if(replacement.id===i.vehicleId||replacement.status!=='available')throw Error('Replacement AV must be a different available vehicle');
 const eta=estimateTravel(vehicle(s,i.vehicleId),replacement);
 i.evacuation={replacementId,requestedAt:s.minute,etaMinutes:eta,arrivedAt:null,transferredAt:null,status:'en_route'};
 replacement.status='replacement_en_route';return i.evacuation;
}
function arriveReplacement(s,id){
 const i=incident(s,id),e=i.evacuation;
 if(!e||e.status!=='en_route')throw Error('Replacement must be en route');
 s.minute+=e.etaMinutes;e.arrivedAt=s.minute;e.status='awaiting_clearance';
 vehicle(s,e.replacementId).status='replacement_on_scene';return e;
}
function completePassengerTransfer(s,id,clearance){
 const i=incident(s,id),e=i.evacuation;
 if(!e||e.status!=='awaiting_clearance')throw Error('Replacement must arrive before passenger transfer');
 if(clearance!==true)throw Error('Explicit passenger transfer clearance required');
 s.minute+=5;e.transferredAt=s.minute;e.status='transferred';if(i.customerSafety.danger)i.customerSafety.safeAt=s.minute;
 vehicle(s,e.replacementId).status='available';return e;
}
function escalate(s,id){const i=incident(s,id);if(i.status==='completed')throw Error('Cannot escalate completed incident');i.escalated=true;return i;}
function tick(s,minutes=5){if(!Number.isInteger(minutes)||minutes<1||minutes>1440)throw Error('Invalid clock advance');s.minute+=minutes;}
function responseBreakdown(s,id){
 const i=incident(s,id),e=i.evacuation;
 const elapsedAt=t=>t===null||t===undefined?null:t-i.created;
 return [
  {key:'first_assistance',label:'First assistance',minutes:elapsedAt(i.onSceneAt),note:'Original provider on scene'},
  {key:'replacement_arrival',label:'Replacement AV arrival',minutes:elapsedAt(e?.arrivedAt),note:e?'Second AV '+e.replacementId:'No replacement requested'},
  {key:'passenger_transfer',label:'Passenger transfer',minutes:elapsedAt(e?.transferredAt),note:'Requires simulated clearance'},
  {key:'vehicle_recovery',label:'Vehicle recovery',minutes:elapsedAt(i.completedAt),note:'Original incident completion'}
 ];
}
function responsePerformance(s){
 const keys=['first_assistance','replacement_arrival','passenger_transfer','vehicle_recovery'];
 return keys.map(key=>{
  const rows=s.incidents.map(i=>responseBreakdown(s,i.id).find(r=>r.key===key));
  const samples=rows.filter(r=>r.minutes!==null).map(r=>r.minutes).sort((a,b)=>a-b);
  return {key,label:rows[0]?.label||key,samples:samples.length,meanMinutes:samples.length?samples.reduce((a,b)=>a+b,0)/samples.length:null,p90Minutes:samples.length?samples[Math.ceil(samples.length*.9)-1]:null};
 });
}
function customerSafetyTimeline(s,id){
 const i=incident(s,id),safety=i.customerSafety,e=i.evacuation;
 const events=[];
 if(safety?.flaggedAt!==null&&safety?.flaggedAt!==undefined)events.push({minute:safety.flaggedAt,label:'Customer danger flagged',detail:DANGER_REASONS[safety.reason]||'Customer safety'});
 if(safety?.emergencyEscalatedAt!==null&&safety?.emergencyEscalatedAt!==undefined)events.push({minute:safety.emergencyEscalatedAt,label:'Emergency escalation recorded',detail:'Simulated operator escalation only'});
 if(e){events.push({minute:e.requestedAt,label:'Replacement AV dispatched',detail:e.replacementId+' · ETA '+e.etaMinutes+' min'});if(e.arrivedAt!==null)events.push({minute:e.arrivedAt,label:'Replacement AV arrived',detail:e.replacementId});if(e.transferredAt!==null)events.push({minute:e.transferredAt,label:'Passenger transfer confirmed',detail:'Explicit simulated clearance recorded'});}
 if(safety?.safeAt!==null&&safety?.safeAt!==undefined)events.push({minute:safety.safeAt,label:'Customer transfer time recorded',detail:'Time since danger flag: '+(safety.safeAt-safety.flaggedAt)+' min'});
 return events.sort((a,b)=>a.minute-b.minute);
}
function safetyMetrics(s){
 const flagged=s.incidents.filter(i=>i.customerSafety?.danger);
 const awaiting=flagged.filter(i=>i.customerSafety.safeAt===null);
 const safe=flagged.filter(i=>i.customerSafety.safeAt!==null);
 const times=safe.map(i=>i.customerSafety.safeAt-i.customerSafety.flaggedAt);
 return {flagged:flagged.length,awaiting:awaiting.length,safe:safe.length,emergencyEscalated:flagged.filter(i=>i.customerSafety.emergencyEscalatedAt!==null).length,meanTimeToSafety:times.length?times.reduce((a,b)=>a+b,0)/times.length:null};
}
function incidentSla(s,id){
 const i=incident(s,id);
 const safety=Boolean(i.customerSafety?.danger);
 const limit=safety?10:i.sla;
 const start=safety?i.customerSafety.flaggedAt:i.created;
 const stop=safety?i.customerSafety.safeAt:i.onSceneAt;
 const elapsed=Math.max(0,(stop===null||stop===undefined?s.minute:stop)-start);
 const remaining=limit-elapsed;
 const status=stop!==null&&stop!==undefined?(remaining<0?'breached':'met'):remaining<0?'breached':remaining<=Math.max(5,Math.ceil(limit*.2))?'warning':'on_track';
 return {id:i.id,limit,elapsed,remaining,status,safety,closed:stop!==null&&stop!==undefined};
}
function slaMonitoring(s){
 const items=s.incidents.filter(i=>i.customerSafety?.danger||i.onSceneAt===null).map(i=>incidentSla(s,i.id));
 const open=items.filter(i=>!i.closed);
 return {items,critical:open.filter(i=>i.safety).length,warning:open.filter(i=>i.status==='warning').length,breached:open.filter(i=>i.status==='breached').length};
}
function prioritizedIncidents(s){
 const priority=i=>i.customerSafety?.danger&&i.customerSafety.safeAt===null?0:i.status!=='completed'?1:2;
 return s.incidents.slice().sort((a,b)=>priority(a)-priority(b)||a.created-b.created||a.id.localeCompare(b.id));
}
function kpis(s){const total=s.vehicles.length,available=s.vehicles.filter(v=>v.status==='available').length,completed=s.incidents.filter(i=>i.completedAt!==null);const times=completed.map(i=>i.onSceneAt-i.created).sort((a,b)=>a-b);const mean=times.length?times.reduce((a,b)=>a+b,0)/times.length:null;const p90=times.length?times[Math.ceil(times.length*.9)-1]:null;const cost=completed.reduce((a,i)=>a+i.cost,0);return {total,available,availabilityPercent:total?100*available/total:0,active:s.incidents.filter(i=>i.status!=='completed').length,completed:completed.length,meanResponse:mean,p90Response:p90,totalCost:cost,breached:s.incidents.filter(i=>i.status!=='completed'&&s.minute-i.created>i.sla).length};}
function elapsed(s,i){return (i.completedAt===null?s.minute:i.completedAt)-i.created;}
function vehicleHealth(v){const n=Number(v.id.split('-')[1]);const batteryPercent=22+(n*37%77);const connectivity=n%17===0?'intermittent':'online';const fault=n%23===0?'inspection_required':n%31===0?'sensor_review':'none';return {batteryPercent,connectivity,fault,readiness:v.status!=='available'?'unavailable':batteryPercent<30||connectivity!=='online'||fault!=='none'?'review':'ready'};}
const DISPATCHERS=['Day Shift Dispatcher','Swing Shift Dispatcher','Overnight Dispatcher'];
function assignIncidentOwner(s,id,owner){
 const i=incident(s,id);
 if(!DISPATCHERS.includes(owner))throw Error('Unknown dispatcher');
 if(i.status==='completed')throw Error('Cannot reassign a completed incident');
 i.owner=owner;i.acknowledgedAt=null;return i;
}
function acknowledgeIncident(s,id,owner){
 const i=incident(s,id);
 if(i.status==='completed'||i.owner!==owner)throw Error('Only the assigned dispatcher can acknowledge an open incident');
 i.acknowledgedAt=s.minute;return i;
}
function addIncidentNote(s,id,author,text){
 const i=incident(s,id);
 if(!DISPATCHERS.includes(author))throw Error('Unknown note author');
 const value=String(text||'').trim();
 if(!value||value.length>500)throw Error('Note must be 1–500 characters');
 const note={id:i.notes.length+1,minute:s.minute,author,text:value};i.notes.push(note);return note;
}
function addPendingAction(s,id,text){
 const i=incident(s,id),value=String(text||'').trim();
 if(i.status==='completed')throw Error('Cannot add pending action to completed incident');
 if(!value||value.length>200)throw Error('Action must be 1–200 characters');
 const action={id:i.pendingActions.length+1,createdAt:s.minute,text:value,doneAt:null};
 i.pendingActions.push(action);return action;
}
function completePendingAction(s,id,actionId){
 const i=incident(s,id),action=i.pendingActions.find(a=>a.id===actionId);
 if(!action||action.doneAt!==null)throw Error('Action unavailable or already completed');
 action.doneAt=s.minute;return action;
}
function shiftHandoff(s){
 const active=prioritizedIncidents(s).filter(i=>i.status!=='completed');
 return {minute:s.minute,active:active.length,overdue:active.filter(i=>s.minute-i.created>i.sla).length,
  unowned:active.filter(i=>!i.owner).length,unacknowledged:active.filter(i=>i.owner&&i.acknowledgedAt===null).length,
  openActions:active.reduce((n,i)=>n+i.pendingActions.filter(a=>a.doneAt===null).length,0),
  unavailable:s.vehicles.filter(v=>v.status!=='available').length,
  healthReview:s.vehicles.filter(v=>vehicleHealth(v).readiness==='review').length,
  availableTeams:providerBoard(s).filter(p=>!p.busy).length,
  items:active.map(i=>({id:i.id,vehicleId:i.vehicleId,type:i.type,status:i.status,elapsed:s.minute-i.created,
   provider:i.providerId||'Unassigned',owner:i.owner||'Unassigned',acknowledged:i.acknowledgedAt!==null,
   notes:i.notes.length,actions:i.pendingActions.filter(a=>a.doneAt===null).map(a=>a.text),
   safety:i.customerSafety?.danger&&i.customerSafety.safeAt===null?'CUSTOMER SAFETY PRIORITY':'standard'}))};
}

return {DEFAULT_FLEET_CONFIG,seededFleet,providerReviewQueue,openQualityPlan,updateQualityPlan,providerQualityPlans,providerHistory,providerScorecard,recordProviderSurvey,providerExperience,cancelProviderAssignment,recordAdditionalCharge,providerQuality,recordProviderOffer,providerAcceptance,incidentSla,slaMonitoring,DISPATCHERS,assignIncidentOwner,acknowledgeIncident,addIncidentNote,addPendingAction,completePendingAction,vehicleHealth,shiftHandoff,providerBoard,DANGER_REASONS,flagCustomerDanger,escalateCustomerEmergency,TYPES,initialState,demoState,createIncident,eligibleProviders,assign,advance,resolveTire,requestRecovery,availableReplacementAVs,dispatchReplacement,arriveReplacement,completePassengerTransfer,escalate,tick,kpis,safetyMetrics,responseBreakdown,responsePerformance,customerSafetyTimeline,prioritizedIncidents,elapsed,estimateTravel};
});
