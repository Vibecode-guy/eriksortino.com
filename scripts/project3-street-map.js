/* Optional public street-map enhancement. All marker coordinates are synthetic.
 * Leaflet and OSM tiles are third-party dependencies; schematic remains fallback.
 * No routing, live traffic, or telemetry is provided. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AVStreetMap=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const OSM_TILES='https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const ATTRIBUTION='&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap contributors</a>';
function eligible(v){return v&&Number.isFinite(v.lat)&&Number.isFinite(v.lon)&&v.lat>=-90&&v.lat<=90&&v.lon>=-180&&v.lon<=180;}
function points(vehicles){if(!Array.isArray(vehicles))throw Error('Vehicles must be an array');return vehicles.filter(eligible).map(v=>({id:v.id,lat:v.lat,lon:v.lon,status:v.status,area:v.area}));}
function create(container,onSelect){
 if(!container||!globalThis.L||typeof globalThis.L.map!=='function')return null;
 const map=globalThis.L.map(container,{scrollWheelZoom:false}).setView([34.0522,-118.30],10);
 globalThis.L.tileLayer(OSM_TILES,{attribution:ATTRIBUTION,maxZoom:18}).addTo(map);
 const layer=globalThis.L.layerGroup().addTo(map);
 return {update(vehicles,selected){layer.clearLayers();for(const v of points(vehicles)){const marker=globalThis.L.circleMarker([v.lat,v.lon],{radius:v.id===selected?9:6,color:v.id===selected?'#ffffff':'#092331',weight:2,fillColor:v.status==='available'?'#89e7b3':'#ff8b92',fillOpacity:.95});marker.bindTooltip(String(v.id)+' · '+String(v.area)+' · '+String(v.status));marker.on('click',()=>onSelect(v.id));marker.addTo(layer);const el=typeof marker.getElement==='function'?marker.getElement():null;if(el){el.setAttribute('tabindex','0');el.setAttribute('data-synthetic-vehicle-id',String(v.id));el.setAttribute('role','button');el.setAttribute('aria-pressed',String(v.id===selected));el.setAttribute('aria-label','Select synthetic vehicle '+String(v.id)+' in '+String(v.area)+', '+String(v.status));el.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onSelect(v.id);queueMicrotask(()=>{if(!container||typeof container.querySelectorAll!=='function')return;for(const candidate of container.querySelectorAll('[data-synthetic-vehicle-id]')){if(candidate.getAttribute('data-synthetic-vehicle-id')===String(v.id)){if(typeof candidate.focus==='function')candidate.focus({preventScroll:true});break;}}});}});}} },invalidate(){map.invalidateSize();},destroy(){map.remove();}};
}
return {OSM_TILES,ATTRIBUTION,eligible,points,create};
});
