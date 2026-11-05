/* Project 3 synthetic coordinate projection. This is NOT a street map or routing service.
 * WGS84 latitude/longitude values are illustrative, not telemetry or road-snapped.
 * Bounds cover the simulated LA service area, not official City boundaries. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AVGeo=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const BOUNDS=Object.freeze({west:-118.60,east:-118.15,south:33.68,north:34.30});
const FRAME=Object.freeze({left:35,right:865,top:35,bottom:580});
function project(lat,lon){
 if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat > 90||lon < -180||lon > 180)throw Error('Invalid WGS84 coordinate');
 const x=FRAME.left+(lon-BOUNDS.west)/(BOUNDS.east-BOUNDS.west)*(FRAME.right-FRAME.left);
 const y=FRAME.top+(BOUNDS.north-lat)/(BOUNDS.north-BOUNDS.south)*(FRAME.bottom-FRAME.top);
 return {x:Math.max(FRAME.left,Math.min(FRAME.right,x)),y:Math.max(FRAME.top,Math.min(FRAME.bottom,y)),withinBounds:lon>=BOUNDS.west&&lon<=BOUNDS.east&&lat>=BOUNDS.south&&lat<=BOUNDS.north};
}
function audit(vehicles){
 if(!Array.isArray(vehicles))throw Error('Vehicles must be an array');
 const invalid=[],outside=[];
 for(const v of vehicles){try{if(!project(v.lat,v.lon).withinBounds)outside.push(v.id);}catch(e){invalid.push(v.id);}}
 return {total:vehicles.length,invalid,outside};
}
return {BOUNDS,FRAME,project,audit};
});
