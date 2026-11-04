/* Project 3 deterministic visual-density selector; full fleet remains in accessible vehicle select. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.AVMapDensity=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
function visibleVehicles(vehicles,{search='',status='all',selected='',limit=24}={}){
 if(!Array.isArray(vehicles)||!Number.isSafeInteger(limit)||limit<1)throw Error('Invalid map density input');
 const q=String(search).trim().toLowerCase();
 const matches=vehicles.filter(v=>(!q||(v.id+' '+v.area).toLowerCase().includes(q))&&(status==='all'||(status==='available'?v.status==='available':status==='unavailable'&&v.status!=='available')));
 // Explicit search and unavailable-only views must show all matches.
 if(q||status==='unavailable'||matches.length<=limit)return {matches,shown:matches,limited:false};
 // Preserve selected vehicle, all incidents and stable ID order; sample remaining available vehicles.
 const priority=matches.filter(v=>v.id===selected||v.status!=='available');
 const priorityIds=new Set(priority.map(v=>v.id));
 const others=matches.filter(v=>!priorityIds.has(v.id));
 const slots=Math.max(0,limit-priority.length);
 const chosen=slots>=others.length?others:Array.from({length:slots},(_,i)=>others[Math.floor(i*others.length/slots)]);
 const chosenIds=new Set([...priority,...chosen].map(v=>v.id));
 return {matches,shown:matches.filter(v=>chosenIds.has(v.id)),limited:chosenIds.size<matches.length};
}
return {visibleVehicles};
});
