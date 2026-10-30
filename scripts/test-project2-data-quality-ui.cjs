// Synthetic DOM tests for independent full-cohort MyLA311 data-quality panel.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'project2-data-quality.js'),'utf8');
class Element{
 constructor(doc,tag){this.doc=doc;this.tag=tag;this.children=[];this.style={};this.attrs={};this.textContent='';}
 set id(value){this._id=value;this.doc.nodes.set(value,this);}
 get id(){return this._id;}
 append(...nodes){this.children.push(...nodes);}
 replaceChildren(...nodes){this.children=[...nodes];}
 setAttribute(key,value){this.attrs[key]=value;}
}
function harness(){
 const document={nodes:new Map(),createElement(tag){return new Element(this,tag);},getElementById(id){return this.nodes.get(id)||null;}};
 const overview=document.createElement('div');overview.id='overview';
 const context={document,module:{exports:{}}};
 vm.runInNewContext(source,context);
 return {api:context.module.exports,document,overview};
}
const cohort="createddate >= '2024-01-01' and createddate < '2025-01-01'";
test('partial API failures remain unavailable while other full-cohort signals render',async()=>{
 const {api,document,overview}=harness();
 const query=async url=>{
  const where=new URLSearchParams(url).get('$where');
  if(where===cohort)return [{count:'100'}];
  if(where.includes('closeddate is not null'))throw Error('unsupported date comparison');
  return [{count:'7'}];
 };
 await api.refresh(query,cohort);
 const body=document.getElementById('qualityAuditTable'),status=document.getElementById('qualityAuditStatus');
 assert.equal(body.children.length,6);
 assert.match(status.textContent,/5 of 6 full-cohort signals available/);
 assert.equal(body.children[5].children[1].textContent,'Unavailable');
 assert.equal(overview.children.length,1);
});
test('a stale slow refresh cannot overwrite newer validated data',async()=>{
 const {api,document,overview}=harness();
 let release;
 const old=api.refresh(()=>new Promise(resolve=>{release=resolve;}),cohort);
 await api.refresh(async()=>[{count:'50'}],cohort);
 release([{count:'100'}]);await old;
 assert.match(document.getElementById('qualityAuditStatus').textContent,/denominator 50 requests/);
 assert.equal(overview.children.length,1,'refresh must not duplicate the card');
});
test('failed cohort count clears stale table instead of showing old data',async()=>{
 const {api,document}=harness();
 await api.refresh(async()=>[{count:'100'}],cohort);
 assert.equal(document.getElementById('qualityAuditTable').children.length,6);
 await api.refresh(async()=>{throw Error('network unavailable');},cohort);
 assert.equal(document.getElementById('qualityAuditTable').children.length,0);
 assert.match(document.getElementById('qualityAuditStatus').textContent,/No previous values are shown as current/);
});
