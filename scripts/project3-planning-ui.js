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
  // The planner and tabletop are separate models: visualize the planning result without moving AV markers.
  const layer=$('coverageLayer'),decision=$('coverageDecision');
  if(layer)layer.dataset.focus=chosen.id;
  if(decision){
   const improvement=base.p90Response===null||chosen.p90Response===null?null:base.p90Response-chosen.p90Response;
   decision.textContent='30-day modeled staging: '+chosen.label+' · p90 '+fmt(chosen.p90Response)+' min'+(improvement===null?'':(' · '+(improvement>=0?fmt(improvement)+' min faster':fmt(-improvement)+' min slower')+' than baseline'))+' · SLA met '+fmt(chosen.slaPercent)+'% · incremental cost '+cash(chosen.totalCost-base.totalCost)+'. Map highlight is illustrative, not a measured coverage boundary.';
  }
  $('planRecommendation').textContent='Modeled recommendation: '+chosen.label+'. p90 '+fmt(chosen.p90Response)+' min ('+delta(chosen.p90Response===null||base.p90Response===null?null:chosen.p90Response-base.p90Response,' min')+' versus baseline); incremental 30-day cost '+cash(chosen.totalCost-base.totalCost)+' against '+cash(c.budget)+' ceiling. Rule: lowest modeled p90 within budget, then mean response and total cost. Not real-world dispatch advice.';
  const stress=$('stressSummary');
  if(stress){
   const mostLoaded=chosen.crewLoad[0],queueChange=chosen.queuedEvents-base.queuedEvents;
   stress.textContent='Modeled capacity pressure · '+chosen.queuedEvents+' of '+chosen.events+' incidents queued ('+fmt(chosen.queuedPercent)+'%); '+chosen.over30Queue+' waited over 30 min for a crew. Baseline queued '+base.queuedEvents+' incidents; recommended staging changes queued events by '+(queueChange>0?'+':'')+queueChange+'. Busiest fictional crew: '+(mostLoaded?mostLoaded.id+' ('+mostLoaded.count+' assignments)':'none')+'. This is a single-crew-per-provider workload model, not observed fleet performance.';
  }
  const loadChart=$('providerLoadChart');
  if(loadChart){
   loadChart.replaceChildren();
   const maxLoad=Math.max(1,...chosen.providerJobs.map(p=>p.count));
   const names=new Map(E.initialState().providers.map(p=>[p.id,p.name]));
   for(const p of chosen.providerJobs){
    const row=document.createElement('div');row.className='scenario-chart-row';
    const label=document.createElement('span');label.className='scenario-chart-label';
    label.textContent=names.get(p.id)||(p.id==='P-07'?'Added staging crew':p.id);
    const track=document.createElement('div');track.className='scenario-track';
    const fill=document.createElement('div');fill.className='scenario-fill';
    fill.style.width=(p.count/maxLoad*100)+'%';track.append(fill);
    const value=document.createElement('span');value.className='scenario-chart-value';
    value.textContent=p.count+' jobs';
    row.append(label,track,value);loadChart.append(row);
   }
   loadChart.setAttribute('aria-label','Modeled assignments by provider: '+chosen.providerJobs.map(p=>(names.get(p.id)||p.id)+' '+p.count).join(', '));
  }
  const cards=$('scenarioCards'),chart=$('scenarioChart');
  if(cards&&chart){
   cards.replaceChildren();chart.replaceChildren();
   const maxP90=Math.max(1,...x.scenarios.map(r=>r.p90Response??0));
   const chartLabels=[];
   for(const r of x.scenarios){
    const recommended=r.id===chosen.id,increment=r.totalCost-base.totalCost,within=increment<=c.budget;
    const card=document.createElement('article');card.className='scenario-card'+(recommended?' recommended':'');
    const heading=document.createElement('h4');heading.textContent=r.label;
    const value=document.createElement('strong');value.textContent=fmt(r.p90Response)+' min';
    const status=document.createElement('div');status.className='scenario-status';status.textContent=recommended?'Recommended':within?'Within budget':'Over budget';
    const sla=document.createElement('small');sla.textContent='SLA met '+fmt(r.slaPercent)+'% · queue '+fmt(r.meanQueue)+' min';
    const cost=document.createElement('small');cost.textContent='Incremental cost '+cash(increment);
    card.append(heading,value,status,sla,cost);cards.append(card);
    const row=document.createElement('div');row.className='scenario-chart-row';
    const label=document.createElement('span');label.className='scenario-chart-label';label.textContent=r.id==='baseline'?'Existing crews':r.id==='west'?'LAX / Westside':r.id==='valley'?'Valley':'San Pedro';
    const track=document.createElement('div');track.className='scenario-track';
    const bar=document.createElement('div');bar.className='scenario-fill'+(recommended?' recommended':'');bar.style.width=((r.p90Response??0)/maxP90*100)+'%';
    track.append(bar);
    const number=document.createElement('span');number.className='scenario-chart-value';number.textContent=fmt(r.p90Response)+' min';
    row.append(label,track,number);chart.append(row);
    chartLabels.push(label.textContent+': '+fmt(r.p90Response)+' minutes'+(recommended?', recommended':''));
   }
   chart.setAttribute('aria-label','Modeled 30-day p90 response times. '+chartLabels.join('; ')+'. Lower is better.');
  }
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
for(const id of ['planFleet','planRate','planBudget'])$(id).addEventListener('change',()=>{syncPresets();render();});
const presets={normal:{fleet:'24',rate:'5',budget:'5000'},surge:{fleet:'120',rate:'20',budget:'10000'},extreme:{fleet:'240',rate:'30',budget:'25000'}};
function syncPresets(){
 for(const button of document.querySelectorAll('[data-stress]')){
  const p=presets[button.dataset.stress];
  button.setAttribute('aria-pressed',String(!!p&&$('planFleet').value===p.fleet&&$('planRate').value===p.rate&&$('planBudget').value===p.budget));
 }
}
for(const button of document.querySelectorAll('[data-stress]'))button.addEventListener('click',()=>{
 const p=presets[button.dataset.stress];if(!p)return;
 $('planFleet').value=p.fleet;$('planRate').value=p.rate;$('planBudget').value=p.budget;syncPresets();render();
});
syncPresets();
$('planReset').addEventListener('click',()=>{
 $('planFleet').value='24';$('planRate').value='5';$('planBudget').value='5000';syncPresets();render();
 const announcer=$('announcer');if(announcer)announcer.textContent='Planning defaults restored';
});
render();
})();
