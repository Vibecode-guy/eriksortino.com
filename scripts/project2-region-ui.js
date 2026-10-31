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
  card.append(node('p','Approximate proximity lenses, not official neighborhood boundaries. Each geocoded ZIP group is assigned at most once to its nearest eligible reference center within the disclosed radius. ZIPs may cross neighborhoods; out-of-radius ZIPs are excluded. Selecting an area filters the red heat map or highlights circle markers without changing the full-cohort intensity scale. Counts reflect reconciled 2024 geocoded requests only. The City notes that ClosedDate is not used for every request type, so missing timestamps cannot be equated with unfinished work.'));
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
  // Accessible, two-signal investigation matrix. Never infer service pressure:
  // closure durations, staffing and category-normalized workloads are unavailable.
  const matrixSection=node('section');matrixSection.className='region-matrix';
  matrixSection.setAttribute('aria-label','Geographic investigation matrix');
  matrixSection.append(node('h3','Geographic investigation matrix · two signals only'));
  matrixSection.append(node('p','Compare relative 2024 geocoded request demand with the historical year-end closure-timestamp gap share. This is a screening aid, NOT a three-signal service-pressure quadrant: closure duration, staffing capacity, and service-mix adjustments are unavailable. Missing gaps are excluded, never treated as zero.'));
  const matrixStatus=node('p','Waiting for reconciled data.');matrixStatus.id='regionMatrixStatus';matrixStatus.setAttribute('role','status');matrixStatus.setAttribute('aria-live','polite');matrixSection.append(matrixStatus);
  const matrixGrid=node('div');matrixGrid.className='region-matrix-grid';matrixGrid.id='regionMatrixGrid';matrixSection.append(matrixGrid);
  const matrixWrap=node('div');matrixWrap.className='geo-table-wrap';
  const matrixTable=node('table');matrixTable.className='geo-table';
  matrixTable.append(node('caption','Region-lens comparison relative to the median of eligible lenses'));
  const matrixHead=node('thead'),matrixHeadRow=node('tr');
  for(const label of ['Approximate area lens','2024 geocoded requests','Year-end timestamp gap share','Relative screening quadrant']){const th=node('th',label);th.scope='col';matrixHeadRow.append(th);}
  matrixHead.append(matrixHeadRow);matrixTable.append(matrixHead);
  const matrixBody=node('tbody');matrixBody.id='regionMatrixTable';matrixTable.append(matrixBody);matrixWrap.append(matrixTable);matrixSection.append(matrixWrap);
  card.append(matrixSection);
  controls.insertAdjacentElement('afterend',card);
  const style=node('style');style.textContent='.lens-btn{background:transparent;color:var(--green);border:1px solid var(--line);padding:6px 9px;font-size:13px;text-align:left}.lens-btn:hover,.lens-btn:focus-visible{background:#e7f1eb}.region-matrix{border-top:1px solid var(--line);margin-top:20px;padding-top:18px}.region-matrix-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin:12px 0}.region-matrix-cell{background:#e7f1eb;border:1px solid var(--line);border-radius:10px;padding:12px;min-width:0}.region-matrix-cell h4{margin:0 0 5px;font-size:14px}.region-matrix-cell p{margin:0;font-size:13px;overflow-wrap:anywhere}.region-matrix-cell .next-action{margin-top:8px;font-size:12px;color:#435049}@media(max-width:560px){.region-matrix-grid{grid-template-columns:1fr}}';document.head.append(style);
  function explain(key){
   const el=document.getElementById('regionExplanation');
   if(!el)return;
   if(key==='all'){el.textContent='All-city map. The six-area ZIP request-mean lenses are approximate, not official service districts.';return;}
   const row=latest?.rows.find(x=>x.id===key);
   if(!row){el.textContent='Selected approximate area. Regional counts unavailable until reconciled geocoded data load.';return;}
   el.textContent=row.name+' exploratory lens: '+row.requests.toLocaleString()+' mapped 2024 requests in '+row.zipGroups+' ZIP groups within '+row.radiusKm+' km of the reference center. '+(row.historicalGap===null?'Year-end timestamp gap unavailable.':row.historicalGap.toLocaleString()+' ('+row.historicalGapShare.toFixed(1)+'%) missing or late year-end closure timestamp.')+' This is not official backlog, an administrative boundary, or staffing evidence. Regional closure median/p90 remain unavailable.';
  }
  function highlight(key){
   if(typeof geoPoints==='undefined')return;
   // Leaflet.heat has no individual markers. Filter its weighted coordinates
   // when a lens is selected; keep the full-cohort scale so intensities remain
   // comparable between areas. Circle-marker modes still use style dimming.
   if(typeof geoLayer!=='undefined'&&geoLayer&&typeof geoLayer.setLatLngs==='function'){
    const max=Math.max(1,...geoPoints.map(p=>p.n));
    const visible=key==='all'?geoPoints:geoPoints.filter(p=>window.Project2Regions.assignLens(p)===key);
    geoLayer.setLatLngs(visible.map(p=>[p.lat,p.lon,Math.sqrt(p.n/max)]));
   }
   if(typeof geoMarkers==='undefined')return;
   for(const p of geoPoints){
    const marker=geoMarkers.get(p.zip);if(!marker||typeof marker.setStyle!=='function')continue;
    const active=key==='all'||window.Project2Regions.assignLens(p)===key;
    marker.setStyle({color:active?'#174a38':'#78877e',weight:active?2:1,fillOpacity:active?.32:.07});
   }
  }
  function renderMatrix(summary){
    matrixGrid.replaceChildren();matrixBody.replaceChildren();
    if(!summary){matrixStatus.textContent='Unavailable until complete geographic data load.';return;}
    const result=window.Project2Regions.investigationMatrix(summary);
    if(!result.rows.length){
      matrixStatus.textContent='Insufficient comparable data: at least three lenses with request volume and complete year-end timestamp-gap measurements are required. '+result.excludedCount+' of six lenses excluded.';
      return;
    }
    const labels={
      'high-high':'At/above peer median · demand and timestamp gap',
      'high-low':'At/above demand median · below gap median',
      'low-high':'Below demand median · at/above gap median',
      'low-low':'Below peer median · both signals'
    };
    matrixStatus.textContent=result.eligibleCount+' of six approximate lenses comparable; '+result.excludedCount+' excluded (no mapped demand or incomplete timestamp gap). Peer medians: '+result.demandMedian.toLocaleString()+' geocoded requests and '+result.gapMedian.toFixed(1)+'% timestamp-gap share. Equal-to-median values fall in the higher group. No official backlog, closure duration, or staffing conclusions.';
    const nextChecks={
      'high-high':'Next check: audit missing ClosedDate usage by service category; then compare category-normalized closure duration and actual capacity before any intervention.',
      'high-low':'Next check: examine demand seasonality, intake channels, and category mix; volume alone does not demonstrate a capacity shortage.',
      'low-high':'Next check: inspect timestamp completeness, closure coding, and long-tail service complexity before interpreting the gap.',
      'low-low':'Next check: validate reporting completeness and use as a comparison group only after matching service mix and observation windows.'
    };
    for(const key of ['high-high','high-low','low-high','low-low']){
      const cell=node('div');cell.className='region-matrix-cell';
      cell.append(node('h4',labels[key]));
      const matches=result.rows.filter(r=>r.quadrant===key);
      cell.append(node('p',matches.length?matches.map(r=>r.name).join(' · '):'No eligible area lenses in this quadrant.'));
      const guidance=node('p',nextChecks[key]);guidance.className='next-action';cell.append(guidance);
      matrixGrid.append(cell);
    }
    for(const row of result.rows){
      const tr=node('tr'),th=node('th',row.name);th.scope='row';tr.append(th);
      for(const value of [row.requests.toLocaleString(),row.gapShare.toFixed(1)+'%',labels[row.quadrant]])tr.append(node('td',value));
      matrixBody.append(tr);
    }
  }
  function render(points){
   latest=null;body.replaceChildren();
   if(!points.length){status.textContent='Waiting for complete reconciled geocoded ZIP aggregates.';note.textContent='No approximate area totals without validated City data.';renderMatrix(null);return;}
   try{
    const result=window.Project2Regions.summarize(points);latest=result;renderMatrix(result);
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
   }catch(e){latest=null;renderMatrix(null);status.textContent='Regional lens unavailable: '+String(e.message||e).slice(0,160);note.textContent='No partial regional values displayed.';}
  }
  const originalRender=window.renderGeoHeat;
  window.renderGeoHeat=function(...args){const out=originalRender.apply(this,args);render(args[0]||[]);return out;};
  // A top-20 circle layer needs rebuilding when the area changes; otherwise
  // it can keep showing the city's top ZIPs and omit the selected area's ZIPs.
  // Heat layers can update in place through setLatLngs, avoiding a full redraw.
  function redrawCircleLens(){
   if(typeof geoLayer!=='undefined'&&geoLayer&&typeof geoLayer.setLatLngs!=='function'&&
      typeof geoPoints!=='undefined'&&geoPoints.length&&typeof geoMapTotal!=='undefined')
    window.renderGeoHeat(geoPoints,geoMapTotal);
  }
  const originalFocus=window.focusRegion;
  window.focusRegion=function(key){const out=originalFocus.call(this,key);redrawCircleLens();highlight(key);explain(key);return out;};
  const originalReset=window.fitCityMap;
  window.fitCityMap=function(){const out=originalReset.call(this);document.getElementById('regionFocus').value='all';redrawCircleLens();highlight('all');explain('all');return out;};
 }
 document.addEventListener('DOMContentLoaded',setup);
})();
