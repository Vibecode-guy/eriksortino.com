/* Project 3 routing boundary: synthetic fallback until a permitted, verified road-routing source is configured. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AVRouting=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function validPoint(p){return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=-90&&p.lat<=90&&p.lon>=-180&&p.lon<=180;}
function fallback(origin,destination){
 if(!validPoint(origin)||!validPoint(destination))throw Error('Invalid routing coordinates');
 const km=Math.hypot((origin.lat-destination.lat)*111,(origin.lon-destination.lon)*92);
 return {minutes:Math.max(6,Math.round(km/.52+5)),distanceKm:null,basis:'synthetic_straight_line',description:'Synthetic straight-line estimate at assumed 31 km/h plus 5 minutes; not a road ETA or live traffic'};
}
/* Accepts an OSRM-compatible Route v1 JSON response only after caller verifies service provenance.
   Never silently treats malformed, zero-route or implausible results as verified road ETAs. */
function fromRoadResponse(response,origin,destination){
 const assumed=fallback(origin,destination);
 if(!response||response.code!=='Ok'||!Array.isArray(response.routes)||!response.routes.length)return assumed;
 const route=response.routes[0];
 if(!route||!Number.isFinite(route.duration)||route.duration<=0||!Number.isFinite(route.distance)||route.distance<0||route.distance>1000000)return assumed;
 const minutes=Math.max(1,Math.ceil(route.duration/60));
 const distanceKm=+(route.distance/1000).toFixed(2);
 if(minutes>1440||distanceKm>1000)return assumed;
 return {minutes,distanceKm,basis:'road_network_unverified',description:'OSRM-compatible route response; road estimate only if source and request are independently verified. No live traffic assumed'};
}
return {fallback,fromRoadResponse};
});
