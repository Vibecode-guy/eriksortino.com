'use strict';const test=require('node:test'),assert=require('node:assert/strict');const M=require('./project3-street-map.js');
test('public basemap has explicit attribution',()=>{assert.match(M.OSM_TILES,/openstreetmap\.org/);assert.match(M.ATTRIBUTION,/OpenStreetMap contributors/);});
test('synthetic overlay rejects invalid coordinates',()=>{assert.deepEqual(M.points([{id:'a',lat:34.05,lon:-118.3,status:'available'},{id:'b',lat:NaN,lon:0},{id:'c',lat:91,lon:0}]).map(x=>x.id),['a']);});
test('missing third-party map dependency preserves schematic fallback',()=>{assert.equal(M.create(null,()=>{}),null);});
