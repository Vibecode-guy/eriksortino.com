/* Progressive enhancement for the 2024 MyLA311 ZIP request-mean map.
 * This adds exploratory six-area lenses without changing City query logic.
 * A ZIP is counted at most once; the lenses are not official boundaries. */
(function(){
 'use strict';
 let latest=null;
 function node(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
 function setup(){
  const controls=document.querySelector('#coverage .controls');
  if(!controls||!window.Project2Regions||typeof window.renderGeoHeat!=='function')return;
  const card=node('div');card.className='card';card.id='regionLensCard';card.style.margin='16px 0';
  card.append(node('h3','Six-area ZIP request-mean exploration'));
  card.append(node('p','Approximate proximity lenses, not official neighborhood boundaries. Each geocoded ZIP group is assigned at most once to its nearest eligible reference center within the disclosed radius. ZIPs may cross neighborhoods; out-of-radius ZIPs are excluded. Counts reflect reconciled 2024 geocoded requests only.'));
  const status=node('p','Waiting for reconciled City aggregates.');status.id='regionLensStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');card.append(status);
  const wrap=node('div');wrap.className='geo-table-wrap';
  const table=node('table');table.className='geo-table';
  table.append(node('caption','Exploratory ZIP request-mean lenses; select an area to highlight its mapped ZIPs'));
  const head=node('thead'),headRow=node('tr');
  for(const label of ['Area lens','Radius (km)','Geocoded requests','ZIP groups','Year-end timestamp gap','Gap share','Median / p90 closure']){
   const th=node('th',label);th.scope='col';headRow.append(th);
  }
  head.append(headRow);table.append(head);
  const body=node('tbody');body.id='regionLensTable';table.append(body);wrap.append(table);card.append(wrap);
  const note=node('p','Regional closure-time percentiles are not calculated; timestamp gaps are not official open backlog.');note.className='resolution-note';note.id='regionLensCoverage';card.append(note);
  controls.insertAdjacentElement('afterend',card);
  const style=node('style');style.textContent='.lens-btn{background:transparent;color:var(--green);border:1px solid var(--line);padding:6px 9px;font-size:13px;text-align:left}.lens-btn:hover,.lens-btn:focus-visible{background:#e7f1eb}';document.head.append(style);
  function explain(key){
   const el=document.getElementById('regionExplanation');
   if(!el)return;
   if(key==='all'){el.textContent='All-city map. The six-area ZIP request-mean lenses are approximate, not official service districts.';return;}
   const row=latest?.rows.find(x=>x.id===key);
   if(!row){el.textContent='Selected approximate area. Regional counts unavailable until reconciled geocoded data load.';return;}
   el.textContent=row.name+' exploratory lens: '+row.requests.toLocaleString()+' mapped 2024 requests in '+row.zipGroups+' ZIP groups within '+row.radiusKm+' km of the reference center. '+(row.historicalGap===null?'Year-end timestamp gap unavailable.':row.historicalGap.toLocaleString()+' ('+row.historicalGapShare.toFixed(1)+'%) missing or late year-end closure timestamp.')+' This is not official backlog, an administrative boundary, or staffing evidence. Regional closure median/p90 remain unavailable.';
  }
  function highlight(key){
   if(typeof geoMarkers==='undefined'||typeof geoPoints==='undefined')return;
   for(const p of geoPoints){
    const marker=geoMarkers.get(p.zip);if(!marker||typeof marker.setStyle!=='function')continue;
    const active=key==='all'||window.Project2Regions.assignLens(p)===key;
    marker.setStyle({color:active?'#174a38':'#78877e',weight:active?2:1,fillOpacity:active?.68:.10});
   }
  }
  function render(points){
   latest=null;body.replaceChildren();
   if(!points.length){status.textContent='Waiting for complete reconciled geocoded ZIP aggregates.';note.textContent='No approximate area totals without validated City data.';return;}
   try{
    const result=window.Project2Regions.summarize(points);latest=result;
    for(const row of result.rows){
     const tr=node('tr'),th=node('th');th.scope='row';
     const button=node('button',row.name);button.type='button';button.className='lens-btn';
     button.title='Inspect ZIP request-mean coordinates within '+row.radiusKm+' km of '+row.name;
     button.addEventListener('click',()=>{document.getElementById('regionFocus').value=row.id;window.focusRegion(row.id);});
     th.append(button);tr.append(th);
     for(const value of [String(row.radiusKm),row.requests.toLocaleString(),row.zipGroups.toLocaleString(),row.historicalGap===null?'Unavailable':row.historicalGap.toLocaleString(),row.historicalGapShare===null?'Unavailable':row.historicalGapShare.toFixed(1)+'%','Not calculated'])tr.append(node('td',value));
     body.append(tr);
    }
    status.textContent='Six non-overlapping exploratory lenses calculated from validated ZIP aggregates; these are not official region totals.';
    note.textContent='Assigned '+result.assignedRequests.toLocaleString()+' of '+result.mappedRequests.toLocaleString()+' mapped requests ('+(result.assignedShare===null?'—':result.assignedShare.toFixed(1)+'%')+'). '+result.unassignedRequests.toLocaleString()+' requests in '+result.unassignedZipGroups+' ZIP groups are outside all six radii. Missing gap data remain unavailable, not zero. Regional median/p90 require separately validated data.';
    const key=document.getElementById('regionFocus').value;highlight(key);explain(key);
   }catch(e){status.textContent='Regional lens unavailable: '+String(e.message||e).slice(0,160);note.textContent='No partial regional values displayed.';}
  }
  const originalRender=window.renderGeoHeat;
  window.renderGeoHeat=function(...args){const out=originalRender.apply(this,args);render(args[0]||[]);return out;};
  const originalFocus=window.focusRegion;
  window.focusRegion=function(key){const out=originalFocus.call(this,key);highlight(key);explain(key);return out;};
  const originalReset=window.fitCityMap;
  window.fitCityMap=function(){const out=originalReset.call(this);document.getElementById('regionFocus').value='all';highlight('all');explain('all');return out;};
 }
 document.addEventListener('DOMContentLoaded',setup);
})();
