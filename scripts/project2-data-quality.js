/* Full-cohort MyLA311 field-completeness audit; no sampled records.
 * ClosedDate null does not necessarily mean open: field use varies by request type. */
(function(root,factory){
 'use strict';
 const api=factory(root);
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document)root.Project2Quality=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(root){
 'use strict';
 const METRICS=Object.freeze([
  {id:'nullZip',label:'ZIP is null',where:'zipcode is null'},
  {id:'nullCoordinates',label:'Latitude or longitude is null',where:'latitude is null or longitude is null'},
  {id:'nullOwner',label:'Owner is null',where:'owner is null'},
  {id:'nullChannel',label:'Request source is null',where:'requestsource is null'},
  {id:'nullClosure',label:'ClosedDate is null',where:'closeddate is null'},
  {id:'negativeClosure',label:'ClosedDate precedes CreatedDate',where:'closeddate is not null and closeddate < createddate'}
 ]);
 function buildQuery(cohort,condition){
  if(typeof cohort!=='string'||!cohort.includes('createddate'))throw Error('Explicit creation cohort required');
  return '$select='+encodeURIComponent('count(*) as count')+'&$where='+encodeURIComponent(cohort+(condition?' and ('+condition+')':''));
 }
 function validateCount(value,label,total){
  if(value===null||value===undefined||value===''||!Number.isSafeInteger(Number(value))||Number(value)<0||
     (total!==undefined&&Number(value)>total))throw Error('Invalid or inconsistent count for '+label);
  return Number(value);
 }
 function summarize(total,counts){
  const n=validateCount(total,'cohort');
  if(!counts||typeof counts!=='object')throw Error('Expected metric counts');
  return METRICS.map(m=>{
   const value=counts[m.id],count=value===null||value===undefined?null:validateCount(value,m.id,n);
   return {id:m.id,label:m.label,count,percent:count===null||n===0?null:100*count/n};
  });
 }
 let serial=0;
 function node(tag,value){
  const el=root.document.createElement(tag);
  if(value!==undefined)el.textContent=value;
  return el;
 }
 function mount(){
  if(!root||!root.document)return false;
  const overview=root.document.getElementById('overview');if(!overview)return false;
  if(root.document.getElementById('qualityAuditCard'))return true;
  const card=node('section');card.id='qualityAuditCard';card.className='card';card.style.marginTop='16px';
  card.setAttribute('role','region');card.setAttribute('aria-labelledby','qualityAuditTitle');
  const eyebrow=node('div','Data completeness · full 2024 creation cohort');eyebrow.className='eyebrow';card.append(eyebrow);
  const title=node('h3','Field completeness and closure-date audit');title.id='qualityAuditTitle';card.append(title);
  const intro=node('p','Independent full-cohort City API counts. A null ClosedDate does not establish that a request remains open; some request types do not use this field. Null checks do not capture blank strings or every invalid value. Negative date order is a separate QA signal, not an SLA measure.');
  intro.className='resolution-note';card.append(intro);
  const status=node('p','Waiting for City data.');status.id='qualityAuditStatus';status.setAttribute('role','status');status.setAttribute('aria-live','polite');card.append(status);
  const wrap=node('div');wrap.className='geo-table-wrap';const table=node('table');table.className='geo-table';
  table.append(node('caption','Field completeness for requests created during 2024'));
  const head=node('thead'),row=node('tr');
  for(const label of ['Signal','Requests','Share of all 2024-created requests']){const th=node('th',label);th.scope='col';row.append(th);}
  head.append(row);table.append(head);
  const body=node('tbody');body.id='qualityAuditTable';table.append(body);wrap.append(table);card.append(wrap);
  const note=node('p','Denominator: requests created January 1–December 31, 2024 in the current published dataset. These are descriptive checks, not staffing conclusions. Independent queries may reflect City updates during a refresh.');
  note.className='resolution-note';card.append(note);overview.append(card);return true;
 }
 async function refresh(queryFn,cohort){
  const ticket=++serial;
  if(!mount()||typeof queryFn!=='function')return;
  const status=root.document.getElementById('qualityAuditStatus'),body=root.document.getElementById('qualityAuditTable');
  status.textContent='Checking full-cohort field completeness…';body.replaceChildren();
  try{
   const totalRows=await queryFn(buildQuery(cohort));
   // A newer refresh makes this result obsolete. Do not launch six additional
   // queries for a stale cohort, and never wait on superseded metric requests.
   if(ticket!==serial)return;
   const total=validateCount(totalRows&&totalRows[0]&&totalRows[0].count,'cohort');
   const results=await Promise.allSettled(METRICS.map(m=>queryFn(buildQuery(cohort,m.where))));
   if(ticket!==serial)return;
   const counts={},problems=[];
   for(let i=0;i<METRICS.length;i++){
    const metric=METRICS[i],result=results[i];
    try{
     if(result.status!=='fulfilled')throw Error(String(result.reason?.message||result.reason||'API error'));
     counts[metric.id]=validateCount(result.value?.[0]?.count,metric.id,total);
    }catch(e){counts[metric.id]=null;problems.push(metric.label+': '+String(e.message||e).slice(0,80));}
   }
   for(const row of summarize(total,counts)){
    const tr=node('tr'),th=node('th',row.label);th.scope='row';tr.append(th);
    tr.append(node('td',row.count===null?'Unavailable':row.count.toLocaleString()));
    tr.append(node('td',row.percent===null?'—':row.percent.toFixed(2)+'%'));body.append(tr);
   }
   status.textContent=(METRICS.length-problems.length)+' of '+METRICS.length+' full-cohort signals available; denominator '+total.toLocaleString()+' requests. '+
    (problems.length?'Unavailable metrics were not replaced with zeros. '+problems.join('; '):'All reported counts passed denominator validation.');
  }catch(e){
   if(ticket!==serial)return;
   body.replaceChildren();
   status.textContent='Field-completeness audit unavailable: '+String(e.message||e).slice(0,180)+'. No previous values are shown as current.';
  }
 }
 return {METRICS,buildQuery,validateCount,summarize,refresh};
});
