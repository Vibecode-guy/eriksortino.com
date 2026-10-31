// Controlled DOM regression tests. Synthetic inputs only; no City observations.
'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
const {summarize}=require('./project2-region-lenses.js');
const source=fs.readFileSync(require('node:path').join(__dirname,'project2-region-ui.js'),'utf8');
function harness(mode='heat'){
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
 const geoMarkers=new Map(),geoPoints=[];
 const geoLayer=mode==='heat'?{points:[],setLatLngs(points){this.points=points;}}:{};
 const stats={renderCalls:0};
 const window={Project2Regions:require('./project2-region-lenses.js'),renderGeoHeat(points){stats.renderCalls++;geoPoints.splice(0,geoPoints.length,...points);if(!points.length&&typeof geoLayer.setLatLngs==='function')geoLayer.setLatLngs([]);},focusRegion(){},fitCityMap(){}};
 vm.runInNewContext(source,{document,window,geoMarkers,geoPoints,geoLayer,geoMapTotal:1000});
 assert.equal(typeof handlers.DOMContentLoaded,'function');
 handlers.DOMContentLoaded();
 return {window,ids,controls,geoLayer,stats};
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

test('selecting a lens filters the default red heat layer and reset restores all ZIPs',()=>{
 const {window,ids,geoLayer}=harness();
 window.renderGeoHeat(fixture,1000);
 assert.equal(geoLayer.points.length,fixture.length);
 window.focusRegion('harbor');
 assert.equal(geoLayer.points.length,1);
 assert.equal(geoLayer.points[0][0],33.73);
 assert.equal(geoLayer.points[0][1],-118.29);
 assert.equal(geoLayer.points[0][2],Math.sqrt(100/400));
 assert.match(ids.get('regionExplanation').textContent,/Harbor/);
 window.fitCityMap();
 assert.equal(ids.get('regionFocus').value,'all');
 assert.equal(geoLayer.points.length,fixture.length);
 window.renderGeoHeat([],0);
 assert.equal(geoLayer.points.length,0);
});

test('circle top-20 mode redraws on lens selection and reset without a City API call',()=>{
 const {window,ids,stats}=harness('circle');
 window.renderGeoHeat(fixture,1000);
 assert.equal(stats.renderCalls,1);
 ids.get('regionFocus').value='harbor';
 window.focusRegion('harbor');
 assert.equal(stats.renderCalls,2);
 window.fitCityMap();
 assert.equal(ids.get('regionFocus').value,'all');
 assert.equal(stats.renderCalls,3);
});
test('heat mode changes weighted points in place rather than rebuilding the map',()=>{
 const {window,stats,geoLayer}=harness();
 window.renderGeoHeat(fixture,1000);
 window.focusRegion('harbor');
 assert.equal(stats.renderCalls,1);
 assert.equal(geoLayer.points.length,1);
});

test('region selection is announced and geographic assignment uncertainty is disclosed',()=>{
 const {window,ids}=harness();
 window.renderGeoHeat(fixture,1000);
 const firstRow=ids.get('regionLensTable').children[0];
 const harborButton=firstRow.children[0].children[0];
 assert.equal(harborButton.attributes['aria-pressed'],'false');
 const note=ids.get('regionLensCoverage').textContent;
 assert.match(note,/multiple reference radii/);
 assert.match(note,/within 2 km/);
 assert.match(note,/not additional excluded records/);
 ids.get('regionFocus').value='harbor';
 window.focusRegion('harbor');
 assert.equal(harborButton.attributes['aria-pressed'],'true');
 window.fitCityMap();
 assert.equal(harborButton.attributes['aria-pressed'],'false');
});
