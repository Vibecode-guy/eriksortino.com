/* Exploratory centroid-proximity lenses, NOT official Los Angeles region boundaries.
 * Every ZIP-group mean coordinate is assigned to at most one eligible lens.
 * Only already reconciled, plausible geocoded 2024 ZIP aggregates may be supplied.
 * This intentionally does not estimate region-specific closure-time percentiles. */
(function(root,factory){
  'use strict';
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.Project2Regions=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  const REGIONS=[
    {id:'harbor',name:'San Pedro / Harbor',center:[33.7361,-118.2923],radiusKm:17},
    {id:'valley',name:'San Fernando Valley',center:[34.1867,-118.4490],radiusKm:30},
    {id:'dtla',name:'Downtown LA',center:[34.0522,-118.2437],radiusKm:8},
    {id:'westside',name:'Westside',center:[34.0259,-118.3960],radiusKm:17},
    {id:'south',name:'South Los Angeles',center:[33.9890,-118.2920],radiusKm:15},
    {id:'east',name:'East / Northeast LA',center:[34.0820,-118.1850],radiusKm:17}
  ];
  function distanceKm(a,b){
    const rad=Math.PI/180, dLat=(b[0]-a[0])*rad,dLon=(b[1]-a[1])*rad;
    const h=Math.sin(dLat/2)**2+Math.cos(a[0]*rad)*Math.cos(b[0]*rad)*Math.sin(dLon/2)**2;
    return 12742*Math.asin(Math.min(1,Math.sqrt(h)));
  }
  // Multiple reference radii can overlap. Assignment remains deterministic, but
  // overlap and proximity to a radius edge must be disclosed as uncertainty.
  function eligibleLenses(point){
    return REGIONS.map(region=>({region,distance:distanceKm([point.lat,point.lon],region.center)}))
      .filter(x=>x.distance<=x.region.radiusKm)
      .sort((a,b)=>a.distance-b.distance||a.region.id.localeCompare(b.region.id));
  }
  function assignLens(point){
    const candidates=eligibleLenses(point);
    return candidates.length?candidates[0].region.id:null;
  }
  function summarize(points){
    if(!Array.isArray(points))throw Error('Expected ZIP aggregate array');
    const seen=new Set(),rows=REGIONS.map(r=>({...r,zipCodes:[],requests:0,gapCount:0,gapComplete:true}));
    const byId=new Map(rows.map(r=>[r.id,r]));
    let mappedRequests=0,assignedRequests=0,unassignedRequests=0,unassignedZipGroups=0;
    let overlappingZipGroups=0,overlappingRequests=0,nearRadiusEdgeZipGroups=0,nearRadiusEdgeRequests=0;
    for(const p of points){
      const zip=String(p.zip??'').trim(),n=Number(p.n),lat=Number(p.lat),lon=Number(p.lon);
      if(!zip||seen.has(zip)||!Number.isSafeInteger(n)||n<=0||
        p.lat==null||p.lon==null||!Number.isFinite(lat)||!Number.isFinite(lon)||
        lat<33.65||lat>34.35||lon< -118.75||lon> -118.1)
        throw Error('Invalid or duplicate mapped ZIP aggregate');
      seen.add(zip);
      const gap=p.gap==null?null:Number(p.gap);
      if(gap!==null&&(!Number.isSafeInteger(gap)||gap<0||gap>n))
        throw Error('Invalid historical timestamp-gap count');
      mappedRequests+=n;
      const candidates=eligibleLenses({lat,lon});
      if(candidates.length>1){overlappingZipGroups++;overlappingRequests+=n;}
      const chosen=candidates[0];
      if(!chosen){unassignedRequests+=n;unassignedZipGroups++;continue;}
      // Within 2 km of the selected *reference radius*, not a legal boundary.
      if(chosen.region.radiusKm-chosen.distance<2){nearRadiusEdgeZipGroups++;nearRadiusEdgeRequests+=n;}
      const row=byId.get(chosen.region.id);row.zipCodes.push(zip);row.requests+=n;assignedRequests+=n;
      if(gap===null)row.gapComplete=false;else row.gapCount+=gap;
    }
    if(!Number.isSafeInteger(mappedRequests)||assignedRequests+unassignedRequests!==mappedRequests)
      throw Error('Regional lens counts do not reconcile');
    return {
      mappedRequests,assignedRequests,unassignedRequests,unassignedZipGroups,
      overlappingZipGroups,overlappingRequests,nearRadiusEdgeZipGroups,nearRadiusEdgeRequests,
      assignedShare:mappedRequests?100*assignedRequests/mappedRequests:null,
      rows:rows.map(r=>({
        ...r,zipGroups:r.zipCodes.length,
        historicalGap:r.gapComplete&&r.zipCodes.length?r.gapCount:null,
        historicalGapShare:r.gapComplete&&r.requests?100*r.gapCount/r.requests:null
      }))
    };
  }
  // Relative investigation screen only. Closure duration and actual staffing
  // capacity are unavailable; this MUST NOT be called a service-pressure score.
  function median(values){
    const sorted=[...values].sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
    return sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2;
  }
  function investigationMatrix(summary){
    if(!summary||!Array.isArray(summary.rows))throw Error('Expected reconciled regional summary');
    const eligible=summary.rows.filter(r=>r.zipGroups>0&&Number.isSafeInteger(r.requests)&&r.requests>0&&
      Number.isFinite(r.historicalGapShare)&&r.historicalGapShare>=0&&r.historicalGapShare<=100);
    const excludedCount=summary.rows.length-eligible.length;
    if(eligible.length<3)return {eligibleCount:eligible.length,excludedCount,demandMedian:null,gapMedian:null,rows:[]};
    const demandMedian=median(eligible.map(r=>r.requests));
    const gapMedian=median(eligible.map(r=>r.historicalGapShare));
    const rows=eligible.map(r=>{
      const demandHigh=r.requests>=demandMedian,gapHigh=r.historicalGapShare>=gapMedian;
      return {id:r.id,name:r.name,requests:r.requests,gapShare:r.historicalGapShare,
        demandHigh,gapHigh,quadrant:(demandHigh?'high':'low')+'-'+(gapHigh?'high':'low')};
    });
    return {eligibleCount:eligible.length,excludedCount,demandMedian,gapMedian,rows};
  }
  return {REGIONS,distanceKm,assignLens,summarize,investigationMatrix};
});
