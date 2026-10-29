// Controlled DOM regression tests. Synthetic inputs only; no City observations.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {summarize}=require('./project2-region-lenses.js');
const source=fs.readFileSync(require('node:path').join(__dirname,'project2-region-ui.js'),'utf8');
function harness(){
 const ids=new Map(),handlers={};
 class Element{
  constructor(tag){this.tag=tag;this.children=[];this.textContent='';this.value='';this.style={};this.attributes={};}
  set id(v){this._id=v;ids.set(v,this);}get id(){return this._id;}
  append(...nodes){this.children.push(...nodes);}
  replaceChildren(...nodes){this.children=[...nodes];}
  setAttribute(key,value){this.attributes[key]=value;}
  addEventListener(key,fn){(this.events??={})[key]=fn;}
  insertAdjacentElement(position,element){this.inserted=element;}
 }
 const controls=new Element('div');
 const document={
  head:new Element('head'),
  createElement:tag=>new Element(tag),
  querySelector:selector=>selector==='#coverage .controls'?controls:null,
  addEventListener:(event,fn)=>{handlers[event]=fn;},
  getElementById:id=>ids.get(id)||null
 };
 const selector=new Element('select');selector.id='regionFocus';selector.value='all';
 const explanation=new Element('p');explanation.id='regionExplanation';
 const window={Project2Regions:require('./project2-region-lenses.js'),renderGeoHeat(){},focusRegion(){},fitCityMap(){}};
 const geoMarkers=new Map(),geoPoints=[];
 vm.runInNewContext(source,{document,window,geoMarkers,geoPoints});
 assert.equal(typeof handlers.DOMContentLoaded,'function');
 handlers.DOMContentLoaded();
 return {window,ids,controls};
}
const fixture=[
 {zip:'90731',n:100,lat:33.73,lon:-118.29,gap:10},
 {zip:'90012',n:200,lat:34.05,lon:-118.24,gap:100},
 {zip:'90045',n:300,lat:33.95,lon:-118.38,gap:30},
 {zip:'91316',n:400,lat:34.18,lon:-118.45,gap:200}
];
test('four investigation quadrants and accessible comparison rows render from valid inputs',()=>{
 const {window,ids}=harness();window.renderGeoHeat(fixture,1000);
 assert.equal(ids.get('regionMatrixGrid').children.length,4);
 assert.equal(ids.get('regionMatrixTable').children.length,4);
 assert.match(ids.get('regionMatrixStatus').textContent,/4 of six approximate lenses comparable/);
 assert.match(ids.get('regionMatrixStatus').textContent,/No official backlog/);
 assert.match(ids.get('regionMatrixGrid').children[0].children[2].textContent,/audit missing ClosedDate usage/);
});
test('failed geographic refresh clears stale matrix rather than displaying old values',()=>{
 const {window,ids}=harness();window.renderGeoHeat(fixture,1000);window.renderGeoHeat([],0);
 assert.equal(ids.get('regionMatrixGrid').children.length,0);
 assert.equal(ids.get('regionMatrixTable').children.length,0);
 assert.match(ids.get('regionMatrixStatus').textContent,/Unavailable/);
});
test('incomplete timestamp-gap measurements are not converted to zero',()=>{
 const {window,ids}=harness();
 window.renderGeoHeat(fixture.map((x,i)=>i===0?{...x,gap:null}:x),1000);
 assert.equal(ids.get('regionMatrixTable').children.length,3);
 assert.match(ids.get('regionMatrixStatus').textContent,/3 of six approximate lenses comparable/);
});
