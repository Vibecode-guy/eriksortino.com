/* Project 3: optional planning UI, independent of the incident workbench. */
(function(){
'use strict';
const E=window.AVCommand,P=window.AVPlanning,$=id=>document.getElementById(id);
if(!E||!P||!$('planFleet'))return;
const fmt=n=>n===null?'—':n.toLocaleString(undefined,{maximumFractionDigits:1});
const cash=n=>(n<0?'−$':'$')+Math.abs(n).toLocaleString(undefined,{maximumFractionDigits:2});
const delta=(n,unit)=>n===null?'—':(n>0?'+':n<0?'−':'')+fmt(Math.abs(n))+unit;
function render(){
 try{
  const c={fleetSize:Number($('planFleet').value),incidentsPer100PerDay:Number($('planRate').value),budget:Number($('planBudget').value)};
  const x=P.compare(c),base=x.baseline,chosen=x.recommendation;
  $('planStatus').textContent=x.assumptions.events+' synthetic incidents across '+x.assumptions.horizonDays+' days; '+c.fleetSize+' modeled AVs; '+c.incidentsPer100PerDay+' incidents per 100 AVs/day. Every option uses the same seeded events.';
  $('planRecommendation').textContent='Modeled recommendation: '+chosen.label+'. p90 '+fmt(chosen.p90Response)+' min ('+delta(chosen.p90Response===null||base.p90Response===null?null:chosen.p90Response-base.p90Response,' min')+' versus baseline); incremental 30-day cost '+cash(chosen.totalCost-base.totalCost)+' against '+cash(c.budget)+' ceiling. Rule: lowest modeled p90 within budget, then mean response and total cost. Not real-world dispatch advice.';
  const body=$('planTable');body.replaceChildren();
  for(const r of x.scenarios){
   const tr=document.createElement('tr');
   const values=[r.label+(r.id===chosen.id?' · recommended':''),r.meanResponse===null?'—':fmt(r.meanResponse)+' min',r.p90Response===null?'—':fmt(r.p90Response)+' min',delta(r.p90Response===null||base.p90Response===null?null:r.p90Response-base.p90Response,' min'),r.slaPercent===null?'—':fmt(r.slaPercent)+'%',r.meanQueue===null?'—':fmt(r.meanQueue)+' min',cash(r.totalCost),cash(r.totalCost-base.totalCost)];
   values.forEach((v,i)=>{const cell=document.createElement(i===0?'th':'td');if(i===0)cell.scope='row';cell.textContent=v;tr.append(cell);});body.append(tr);
  }
  const examples=$('planExamples');examples.replaceChildren();
  if(!chosen.examples.length){const li=document.createElement('li');li.textContent='No modeled incidents in this scenario.';examples.append(li);}
  for(const e of chosen.examples){const li=document.createElement('li');li.textContent=e.vehicleId+' / '+E.TYPES[e.type].label+' → '+e.provider+': '+e.queueMinutes+' min crew wait + dispatch preparation + '+e.travelMinutes+' min synthetic travel = '+e.responseMinutes+' min response; variable cost '+cash(e.estimatedCost)+'. '+e.reason;examples.append(li);}
  $('planMethod').textContent='Assumptions: '+x.assumptions.providerCrewCapacity+'. Additional crew overhead '+cash(x.assumptions.siteFixedCost)+'/30 days; distance charge '+cash(x.assumptions.perKmCost)+'/km plus fictional base fees and surcharges. '+x.assumptions.eventGeneration+'. '+x.assumptions.dispatchRule+'. Straight-line travel, no traffic, passenger-trip utilization, safety clearance, or real provider capacity. Estimates are not forecasts.';
 }catch(e){
  $('planStatus').textContent='Planning calculation unavailable: '+e.message;
  $('planRecommendation').textContent='No scenario recommendation available.';
  $('planTable').replaceChildren();$('planExamples').replaceChildren();
 }
}
for(const id of ['planFleet','planRate','planBudget'])$(id).addEventListener('change',render);
$('planReset').addEventListener('click',()=>{
 $('planFleet').value='24';$('planRate').value='5';$('planBudget').value='5000';render();
 const announcer=$('announcer');if(announcer)announcer.textContent='Planning defaults restored';
});
render();
})();
