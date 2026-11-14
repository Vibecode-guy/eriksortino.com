/* Project 3 routing boundary: synthetic fallback until a permitted, verified road-routing source is configured. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AVRouting=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function validPoint(p){return p&&Number.isFinite(p.lat)&&Number.isFinite(p.lon)&&p.lat>=-90&&p.lat<=90&&p.lon>=-180&&p.lon<=180;}
function greatCircleKm(a,b){
 const rad=Math.PI/180,dLat=(b.lat-a.lat)*rad,dLon=(b.lon-a.lon)*rad;
 const h=Math.sin(dLat/2)**2+Math.cos(a.lat*rad)*Math.cos(b.lat*rad)*Math.sin(dLon/2)**2;
 return 6371.0088*2*Math.asin(Math.min(1,Math.sqrt(h)));
}
function fallback(origin,destination){
 if(!validPoint(origin)||!validPoint(destination))throw Error('Invalid routing coordinates');
 // Great-circle distance keeps the deterministic fallback geographically consistent
 // across latitudes; it remains a straight-line model, never a road route.
 const km=greatCircleKm(origin,destination);
 return {minutes:Math.max(6,Math.round(km/.52+5)),distanceKm:null,basis:'synthetic_straight_line',description:'Synthetic straight-line estimate at assumed 31 km/h plus 5 minutes; not a road ETA or live traffic'};
}
/* Accepts an OSRM-compatible Route v1 JSON response only after caller verifies service provenance.
   Never silently treats malformed, zero-route or implausible results as verified road ETAs. */
function fromRoadResponse(response,origin,destination){
 const assumed=fallback(origin,destination);
 if(!response||response.code!=='Ok'||!Array.isArray(response.routes)||!response.routes.length)return assumed;
 const minDistance=Math.max(0,greatCircleKm(origin,destination)*0.99-0.1);
 // Evaluate alternative routes independently: an invalid first route must not hide a
 // valid alternative. Prefer the shortest valid duration, then distance, then index.
 const candidates=response.routes.map((route,index)=>{
  if(!route||!Number.isFinite(route.duration)||route.duration<=0||!Number.isFinite(route.distance)||route.distance<0||route.distance>1000000)return null;
  const minutes=Math.max(1,Math.ceil(route.duration/60));
  const distanceKm=+(route.distance/1000).toFixed(2);
  if(route.distance/(route.duration/3600)>160000||minutes>1440||distanceKm>1000||distanceKm<minDistance)return null;
  return {minutes,distanceKm,duration:route.duration,distance:route.distance,index};
 }).filter(Boolean).sort((a,b)=>a.duration-b.duration||a.distance-b.distance||a.index-b.index);
 if(!candidates.length)return assumed;
 const best=candidates[0];
 return {minutes:best.minutes,distanceKm:best.distanceKm,basis:'road_network_unverified',description:'OSRM-compatible route response; road estimate only if source and request are independently verified. No live traffic assumed'};
}
return {fallback,fromRoadResponse};
});
