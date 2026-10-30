// Synthetic owner/type data only; no City observations are invented.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {LIMIT,queries,summarize}=require('./project2-owner-mix.js');
const g=(owner,requesttype,n)=>({owner,requesttype,n:String(n)});
test('SoQL queries group by real owner and requesttype fields and use full-cohort count',()=>{
 const [groups,count]=queries("createddate >= '2024-01-01' and createddate < '2025-01-01'");
 assert.match(decodeURIComponent(groups),/owner,requesttype,count\(\*\) as n/);
 assert.match(decodeURIComponent(groups),/\$group=owner,requesttype/);
 assert.match(decodeURIComponent(groups),/\$limit=5000/);
 assert.match(decodeURIComponent(count),/count\(\*\) as n/);
 assert.throws(()=>queries(''),/cohort/);
});
test('reconciles all owner and type margins including other buckets',()=>{
 const rows=[];
 for(let i=0;i<8;i++)for(let j=0;j<8;j++)rows.push(g('Owner '+i,'Type '+j,1));
 const d=summarize(rows,64);
 assert.equal(d.total,64);assert.equal(d.ownerRows.length,7);assert.equal(d.typeCols.length,7);
 assert.equal(d.values.flat().reduce((a,b)=>a+b,0),64);
 assert.equal(d.ownerRows.at(-1).n,16);assert.equal(d.typeCols.at(-1).n,16);
 assert.equal(d.values.at(-1).at(-1),4);
});
test('missing owner/type are reported, not dropped',()=>{
 const d=summarize([g(null,'Pothole',5),g('Street Services',null,7)],12);
 assert.equal(d.missingOwner,5);assert.equal(d.missingType,7);
 assert.equal(d.values.flat().reduce((a,b)=>a+b,0),12);
});
test('rejects incomplete, duplicate, invalid and truncated results',()=>{
 assert.throws(()=>summarize([g('A','B',2)],3),/reconcile/);
 assert.throws(()=>summarize([g('A','B',1),g('A','B',1)],2),/Duplicate/);
 assert.throws(()=>summarize([g('A','B',-1)],0),/invalid count/);
 assert.throws(()=>summarize(Array.from({length:LIMIT},(_,i)=>g('A'+i,'B',1)),LIMIT),/limit/);
});
test('zero cohort does not fabricate a chart',()=>{
 const d=summarize([],0);assert.equal(d.total,0);assert.deepEqual(d.values,[]);assert.equal(d.topPair,null);
});
test('ties are deterministic',()=>{
 const d=summarize([g('Agency B','Type',3),g('Agency A','Type',3)],6);
 assert.equal(d.ownerRows[0].name,'Agency A');
 assert.equal(d.topPair.owner,'Agency A');
});

function fakeDocument(){
 const createElement=tag=>({tag,children:[],textContent:'',scope:'',replaceChildren(...items){this.children=[...items];},append(...items){this.children.push(...items);}});
 const ids=['ownerTypeHead','ownerTypeBody','ownerTypeFoot','ownerTypeStatus'];
 const nodes=Object.fromEntries(ids.map(id=>[id,createElement(id)]));
 return {nodes,createElement,getElementById:id=>nodes[id]};
}
test('owner mix accessible table renders reconciled values and clears on failure',async()=>{
 const prior=global.document,doc=fakeDocument();global.document=doc;
 try{
  const {refresh}=require('./project2-owner-mix.js'),cohort="createddate >= '2024-01-01'";
  const good=q=>Promise.resolve(decodeURIComponent(q).includes('$group=')?[g('Agency','Pothole',5)]:[{n:'5'}]);
  await refresh(good,cohort);
  assert.equal(doc.nodes.ownerTypeBody.children.length,1);
  assert.equal(doc.nodes.ownerTypeFoot.children.length,1);
  assert.match(doc.nodes.ownerTypeStatus.textContent,/5 requests/);
  const bad=q=>Promise.resolve(decodeURIComponent(q).includes('$group=')?[g('Agency','Pothole',5)]:[{n:'98'}]);
  await refresh(bad,cohort);
  assert.equal(doc.nodes.ownerTypeBody.children.length,0);
  assert.match(doc.nodes.ownerTypeStatus.textContent,/unavailable/);
 }finally{global.document=prior;}
});
test('a stale slower owner mix refresh cannot overwrite the newer snapshot',async()=>{
 const prior=global.document,doc=fakeDocument();global.document=doc;
 try{
  const {refresh}=require('./project2-owner-mix.js'),cohort="createddate >= '2024-01-01'",pending=[];
  const slow=q=>new Promise(resolve=>pending.push({q,resolve}));
  const first=refresh(slow,cohort);
  const fast=q=>Promise.resolve(decodeURIComponent(q).includes('$group=')?[g('Agency','Pothole',5)]:[{n:'5'}]);
  await refresh(fast,cohort);
  for(const item of pending)item.resolve(decodeURIComponent(item.q).includes('$group=')?[g('Old agency','Old type',8)]:[{n:'8'}]);
  await first;
  assert.match(doc.nodes.ownerTypeStatus.textContent,/5 requests/);
  assert.equal(doc.nodes.ownerTypeBody.children[0].children[0].textContent,'Agency');
 }finally{global.document=prior;}
});
