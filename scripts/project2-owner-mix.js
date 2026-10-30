/* Reconciled full-cohort owner × request-type composition; not case-transition flow. */
(function(root,factory){
 'use strict';
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root&&root.document)root.Project2OwnerMix=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
 'use strict';
 const LIMIT=5000,TOP=6;
 const label=(v,missing)=>v==null||String(v).trim()===''?missing:String(v).trim();
 function queries(cohort){
  if(typeof cohort!=='string'||!cohort.includes('createddate'))throw Error('Explicit creation cohort required');
  const base='$where='+encodeURIComponent(cohort);
  return ['$select='+encodeURIComponent('owner,requesttype,count(*) as n')+'&'+base+'&$group='+encodeURIComponent('owner,requesttype')+'&$order='+encodeURIComponent('n DESC')+'&$limit='+LIMIT,
    '$select='+encodeURIComponent('count(*) as n')+'&'+base];
 }
 function summarize(groups,total){
  if(!Array.isArray(groups)||!Number.isSafeInteger(total)||total<0)throw Error('Invalid owner/type aggregate input');
  if(groups.length>=LIMIT)throw Error('Owner/type grouped query reached its limit; full coverage cannot be established');
  const owners=new Map(),types=new Map(),seen=new Set(),pairs=[];
  let sum=0,missingOwner=0,missingType=0;
  for(const g of groups){
   const n=Number(g.n),o=label(g.owner,'(Owner not reported)'),t=label(g.requesttype,'(Type not reported)');
   const raw=JSON.stringify([g.owner==null?null:String(g.owner),g.requesttype==null?null:String(g.requesttype)]);
   if(seen.has(raw)||!Number.isSafeInteger(n)||n<0)throw Error('Duplicate owner/type group or invalid count');
   seen.add(raw);sum+=n;if(!Number.isSafeInteger(sum))throw Error('Unsafe owner/type total');
   owners.set(o,(owners.get(o)||0)+n);types.set(t,(types.get(t)||0)+n);
   if(g.owner==null||String(g.owner).trim()==='')missingOwner+=n;
   if(g.requesttype==null||String(g.requesttype).trim()==='')missingType+=n;
   pairs.push({owner:o,type:t,n});
  }
  if(sum!==total)throw Error('Owner/type grouped counts do not reconcile with complete 2024 cohort');
  const ranked=map=>[...map].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
  const topOwners=ranked(owners).slice(0,TOP).map(([name,n],i)=>({id:'o'+i,name,n}));
  const topTypes=ranked(types).slice(0,TOP).map(([name,n],i)=>({id:'t'+i,name,n}));
  const ownerRows=[...topOwners],typeCols=[...topTypes];
  if(owners.size>TOP)ownerRows.push({id:'o-rest',name:'All remaining owners',n:total-topOwners.reduce((a,x)=>a+x.n,0)});
  if(types.size>TOP)typeCols.push({id:'t-rest',name:'All remaining types',n:total-topTypes.reduce((a,x)=>a+x.n,0)});
  const ownerIds=new Map(topOwners.map(x=>[x.name,x.id])),typeIds=new Map(topTypes.map(x=>[x.name,x.id]));
  const cells=new Map();
  for(const p of pairs){
   const key=JSON.stringify([ownerIds.get(p.owner)||'o-rest',typeIds.get(p.type)||'t-rest']);
   cells.set(key,(cells.get(key)||0)+p.n);
  }
  const values=ownerRows.map(o=>typeCols.map(t=>cells.get(JSON.stringify([o.id,t.id]))||0));
  if(ownerRows.some((o,i)=>values[i].reduce((a,b)=>a+b,0)!==o.n)||
     typeCols.some((t,j)=>values.reduce((a,row)=>a+row[j],0)!==t.n))throw Error('Owner/type matrix margins do not reconcile');
  const topPair=[...pairs].sort((a,b)=>b.n-a.n||a.owner.localeCompare(b.owner)||a.type.localeCompare(b.type))[0]||null;
  return {total,ownerRows,typeCols,values,sourcePairs:pairs.length,missingOwner,missingType,topPair};
 }
 function element(tag,text){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;return e;}
 function render(data){
  const head=document.getElementById('ownerTypeHead'),body=document.getElementById('ownerTypeBody'),foot=document.getElementById('ownerTypeFoot');
  head.replaceChildren();body.replaceChildren();foot.replaceChildren();
  if(!data||!data.total)return;
  const tr=element('tr');
  for(const name of ['Published owner / agency',...data.typeCols.map(x=>x.name),'Total']){const th=element('th',name);th.scope='col';tr.append(th);}head.append(tr);
  data.ownerRows.forEach((o,i)=>{
   const row=element('tr'),th=element('th',o.name);th.scope='row';row.append(th);
   for(const n of [...data.values[i],o.n])row.append(element('td',n.toLocaleString()));
   body.append(row);
  });
  const totalRow=element('tr'),th=element('th','All owners');th.scope='row';totalRow.append(th);
  for(const n of [...data.typeCols.map(x=>x.n),data.total])totalRow.append(element('td',n.toLocaleString()));
  foot.append(totalRow);
 }
 let generation=0;
 async function refresh(q,cohort){
  const token=++generation,status=document.getElementById('ownerTypeStatus');
  if(!status)return;
  render(null);status.textContent='Loading complete 2024 owner × request-type aggregates…';
  try{
   const [grouped,count]=await Promise.all(queries(cohort).map(q));
   const data=summarize(grouped,Number(count[0]?.n));
   if(token!==generation)return;
   render(data);
   status.textContent=data.total?
    'Full 2024 creation cohort reconciled: '+data.total.toLocaleString()+' requests across '+data.sourcePairs.toLocaleString()+' owner/type groups. '+data.missingOwner.toLocaleString()+' requests lack a published owner and '+data.missingType.toLocaleString()+' lack a request type. Top six in each dimension are shown; remaining groups are combined. '+(data.topPair?'Largest recorded pairing: '+data.topPair.owner+' / '+data.topPair.type+' ('+data.topPair.n.toLocaleString()+' requests). ':'')+'Owner is a published agency field, not employee workload; counts do not establish staffing, service outcomes, or case transitions.'
    :'The complete 2024 creation cohort contains zero requests; no composition inferred.';
  }catch(e){
   if(token!==generation)return;
   render(null);status.textContent='Owner/type comparison unavailable or incomplete: '+String(e.message||e).slice(0,180)+'. No partial values displayed.';
  }
 }
 return {LIMIT,TOP,queries,summarize,render,refresh};
});
