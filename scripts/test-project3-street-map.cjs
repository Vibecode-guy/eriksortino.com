'use strict';const test=require('node:test'),assert=require('node:assert/strict');const M=require('./project3-street-map.js');
test('public basemap has explicit attribution',()=>{assert.match(M.OSM_TILES,/openstreetmap\.org/);assert.match(M.ATTRIBUTION,/OpenStreetMap contributors/);});
test('synthetic overlay rejects invalid coordinates',()=>{assert.deepEqual(M.points([{id:'a',lat:34.05,lon:-118.3,status:'available'},{id:'b',lat:NaN,lon:0},{id:'c',lat:91,lon:0}]).map(x=>x.id),['a']);});
test('missing third-party map dependency preserves schematic fallback',()=>{assert.equal(M.create(null,()=>{}),null);});

test('street map renders only valid synthetic markers, handles selection and cleans up',()=>{
 const old=globalThis.L;
 const events=[],markers=[];
 const layer={clearLayers(){events.push('clear');},addTo(){return this;}};
 const map={setView(coords,zoom){assert.deepEqual(coords,[34.0522,-118.30]);assert.equal(zoom,10);return this;},invalidateSize(){events.push('resize');},remove(){events.push('remove');}};
 globalThis.L={
  map(container,opts){assert.equal(container,'container');assert.equal(opts.scrollWheelZoom,false);return map;},
  tileLayer(url,opts){assert.equal(url,M.OSM_TILES);assert.equal(opts.attribution,M.ATTRIBUTION);return {addTo(){events.push('tiles');}};},
  layerGroup(){return layer;},
  circleMarker(coords,opts){const marker={coords,opts,bindTooltip(text){this.tooltip=text;return this;},on(name,fn){this.click=fn;return this;},addTo(target){assert.equal(target,layer);markers.push(this);return this;}};return marker;}
 };
 try{
  const selected=[];
  const instance=M.create('container',id=>selected.push(id));
  assert(instance);
  instance.update([{id:'AV-1',lat:34.05,lon:-118.3,area:'LA',status:'available'},{id:'bad',lat:Infinity,lon:0},{id:'AV-2',lat:34.1,lon:-118.2,area:'Valley',status:'unavailable'}],'AV-2');
  assert.equal(markers.length,2);
  assert.deepEqual(markers.map(m=>m.coords),[[34.05,-118.3],[34.1,-118.2]]);
  assert.equal(markers[0].opts.radius,6);
  assert.equal(markers[1].opts.radius,9);
  assert.match(markers[1].tooltip,/AV-2/);
  markers[1].click();
  assert.deepEqual(selected,['AV-2']);
  instance.update([],null);
  assert.equal(events.filter(e=>e==='clear').length,2);
  instance.invalidate();instance.destroy();
  assert(events.includes('resize')&&events.includes('remove')&&events.includes('tiles'));
 }finally{if(old===undefined)delete globalThis.L;else globalThis.L=old;}
});


test('public basemap marker exposes keyboard selection and accessible synthetic label',()=>{
 const old=globalThis.L;let keyHandler,selected;const attrs={};
 const element={setAttribute(k,v){attrs[k]=v;},addEventListener(k,fn){if(k==='keydown')keyHandler=fn;}};
 const layer={clearLayers(){},addTo(){return this;}};
 globalThis.L={map(){return {setView(){return this;},invalidateSize(){},remove(){}};},tileLayer(){return {addTo(){}};},layerGroup(){return layer;},circleMarker(){return {bindTooltip(){return this;},on(){return this;},addTo(){return this;},getElement(){return element;}};}};
 try{const instance=M.create('map',id=>{selected=id;});instance.update([{id:'AV-42',lat:34.05,lon:-118.3,area:'Central LA',status:'available'}],null);
 assert.equal(attrs.role,'button');assert.equal(attrs.tabindex,'0');assert.match(attrs['aria-label'],/synthetic vehicle AV-42/);
 let prevented=false;keyHandler({key:'Enter',preventDefault(){prevented=true;}});assert.equal(selected,'AV-42');assert(prevented);
 selected=null;keyHandler({key:' ',preventDefault(){prevented=true;}});assert.equal(selected,'AV-42');
 selected=null;keyHandler({key:'Tab',preventDefault(){throw Error('Tab should not be prevented');}});assert.equal(selected,null);
 instance.destroy();}finally{if(old===undefined)delete globalThis.L;else globalThis.L=old;}
});
