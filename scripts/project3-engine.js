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
const TYPES={
 door_ajar:{label:'Door ajar',severity:'Low',sla:30,needs:'door_ajar',minutes:[4,8,6],impact:'Vehicle temporarily unavailable'},
 flat_tire:{label:'Flat tire · roadside assessment',severity:'Medium',sla:40,needs:'flat_tire',minutes:[5,12,24],impact:'Vehicle unavailable pending tire service or recovery assessment'},
 immobilized:{label:'Immobilized AV',severity:'High',sla:35,needs:'immobilized',minutes:[5,12,15],impact:'Vehicle unavailable'},
 flatbed:{label:'Flatbed recovery',severity:'Critical',sla:45,needs:'flatbed',minutes:[8,16,35],impact:'Vehicle unavailable'},
 depot:{label:'Depot transport',severity:'Medium',sla:60,needs:'depot',minutes:[6,18,32],impact:'Vehicle unavailable'}
};
function initialState(){return {minute:0,nextId:1,selected:'AV-101',vehicles:VEHICLES.map(([id,area,lat,lon])=>({id,area,lat,lon,status:'available'})),providers:PROVIDERS.map(p=>({...p})),incidents:[]};}

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
function createIncident(s,vehicleId,type){const v=vehicle(s,vehicleId),t=TYPES[type];if(!t)throw Error('Unknown incident type');if(v.status!=='available')throw Error('Vehicle already unavailable');const i={id:'INC-'+String(s.nextId++).padStart(3,'0'),vehicleId,type,severity:t.severity,sla:t.sla,created:s.minute,status:'queued',providerId:null,assignedAt:null,enRouteAt:null,onSceneAt:null,completedAt:null,cost:0,tireResolution:null,recoveryProviderId:null,recoveryRequestedAt:null,recoveryOnSceneAt:null,redispatchReason:null,evacuation:null,customerSafety:{danger:false,reason:null,flaggedAt:null,emergencyEscalatedAt:null,safeAt:null},escalated:false};s.incidents.unshift(i);v.status='incident';return i;}
function eligibleProviders(s,incidentId){const i=incident(s,incidentId);return s.providers.filter(p=>p.capabilities.includes(TYPES[i.type].needs)).map(p=>({...p,estimatedMinutes:estimateTravel(vehicle(s,i.vehicleId),p)})).sort((a,b)=>a.estimatedMinutes-b.estimatedMinutes||a.id.localeCompare(b.id));}
function estimateTravel(v,p){const dy=(v.lat-p.lat)*111,dx=(v.lon-p.lon)*92;return Math.max(6,Math.round(Math.hypot(dx,dy)/.52+5));} // synthetic effective speed ~31 km/h
function assign(s,incidentId,providerId){const i=incident(s,incidentId),p=provider(s,providerId);if(i.status!=='queued')throw Error('Incident must be queued');if(!p.capabilities.includes(TYPES[i.type].needs))throw Error('Provider not equipped');i.providerId=p.id;i.assignedAt=s.minute;i.status='dispatched';return i;}
function advance(s,incidentId){const i=incident(s,incidentId),t=TYPES[i.type];if(i.status==='queued')throw Error('Assign provider first');if(i.status==='completed')throw Error('Incident already completed');if(i.type==='flat_tire'&&i.status==='on_scene'&&!i.tireResolution)throw Error('Choose tire service or flatbed recovery before completing');const next={dispatched:'en_route',en_route:'on_scene',on_scene:'completed',recovery_dispatched:'recovery_en_route',recovery_en_route:'recovery_on_scene',recovery_on_scene:'completed'}[i.status];if(!next)throw Error('Invalid state');const mins=i.status==='recovery_dispatched'?8:i.status==='recovery_en_route'?estimateTravel(vehicle(s,i.vehicleId),provider(s,i.recoveryProviderId)):i.status==='recovery_on_scene'?45:i.status==='dispatched'?t.minutes[0]:i.status==='en_route'?estimateTravel(vehicle(s,i.vehicleId),provider(s,i.providerId)):i.type==='flat_tire'&&i.tireResolution==='flatbed'?45:t.minutes[2];s.minute+=mins;i.status=next;if(next==='en_route')i.enRouteAt=s.minute;if(next==='recovery_on_scene')i.recoveryOnSceneAt=s.minute;if(next==='on_scene')i.onSceneAt=s.minute;if(next==='completed'){i.completedAt=s.minute;i.cost=provider(s,i.providerId).baseCost+(i.recoveryProviderId?provider(s,i.recoveryProviderId).baseCost:0)+(i.type==='flatbed'?125:i.type==='depot'?95:i.type==='flat_tire'&&i.tireResolution==='flatbed'?175:i.type==='flat_tire'?55:0);vehicle(s,i.vehicleId).status='available';}return i;}
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
 if(p.id===i.providerId)throw Error('Select a separate recovery provider');
 i.tireResolution='flatbed';i.recoveryProviderId=p.id;i.recoveryRequestedAt=s.minute;i.redispatchReason=reason;i.status='recovery_dispatched';return i;
}
const DANGER_REASONS={exposed_roadway:'Exposed roadway',unsafe_location:'Unsafe location',immediate_risk:'Immediate customer risk'};
function flagCustomerDanger(s,id,reason){
 const i=incident(s,id);
 if(i.status==='completed')throw Error('Cannot flag a completed incident');
 if(!DANGER_REASONS[reason])throw Error('Choose a valid customer danger reason');
 i.customerSafety.danger=true;i.customerSafety.reason=reason;i.customerSafety.flaggedAt=s.minute;i.severity='Critical';i.escalated=true;return i.customerSafety;
}
function escalateCustomerEmergency(s,id){
 const i=incident(s,id);
 if(!i.customerSafety.danger)throw Error('Flag customer danger first');
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
function safetyMetrics(s){
 const flagged=s.incidents.filter(i=>i.customerSafety?.danger);
 const awaiting=flagged.filter(i=>i.customerSafety.safeAt===null);
 const safe=flagged.filter(i=>i.customerSafety.safeAt!==null);
 const times=safe.map(i=>i.customerSafety.safeAt-i.customerSafety.flaggedAt);
 return {flagged:flagged.length,awaiting:awaiting.length,safe:safe.length,emergencyEscalated:flagged.filter(i=>i.customerSafety.emergencyEscalatedAt!==null).length,meanTimeToSafety:times.length?times.reduce((a,b)=>a+b,0)/times.length:null};
}
function prioritizedIncidents(s){
 const priority=i=>i.customerSafety?.danger&&i.customerSafety.safeAt===null?0:i.status!=='completed'?1:2;
 return s.incidents.slice().sort((a,b)=>priority(a)-priority(b)||a.created-b.created||a.id.localeCompare(b.id));
}
function kpis(s){const total=s.vehicles.length,available=s.vehicles.filter(v=>v.status==='available').length,completed=s.incidents.filter(i=>i.completedAt!==null);const times=completed.map(i=>i.onSceneAt-i.created).sort((a,b)=>a-b);const mean=times.length?times.reduce((a,b)=>a+b,0)/times.length:null;const p90=times.length?times[Math.ceil(times.length*.9)-1]:null;const cost=completed.reduce((a,i)=>a+i.cost,0);return {total,available,availabilityPercent:total?100*available/total:0,active:s.incidents.filter(i=>i.status!=='completed').length,completed:completed.length,meanResponse:mean,p90Response:p90,totalCost:cost,breached:s.incidents.filter(i=>i.status!=='completed'&&s.minute-i.created>i.sla).length};}
function elapsed(s,i){return (i.completedAt===null?s.minute:i.completedAt)-i.created;}
return {DANGER_REASONS,flagCustomerDanger,escalateCustomerEmergency,TYPES,initialState,demoState,createIncident,eligibleProviders,assign,advance,resolveTire,requestRecovery,availableReplacementAVs,dispatchReplacement,arriveReplacement,completePassengerTransfer,escalate,tick,kpis,safetyMetrics,prioritizedIncidents,elapsed,estimateTravel};
});
