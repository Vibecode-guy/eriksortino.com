'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const E=require('./project3-engine.js');

// Synthetic offers: denominator is all recorded outcomes, not just completed jobs.
test('offer acceptance counts declined and timed-out offers in denominator',()=>{
 const s=E.initialState({seed:20261102,count:100});
 const incident=E.createIncident(s,'AV-104','flatbed');
 const teams=E.eligibleProviders(s,incident.id);
 assert.ok(teams.length>=3,'fixture requires three compatible recovery teams');
 E.recordProviderOffer(s,incident.id,teams[0].id,'declined');
 E.recordProviderOffer(s,incident.id,teams[1].id,'timed_out');
 E.recordProviderOffer(s,incident.id,teams[2].id,'accepted');
 const rows=E.providerAcceptance(s);
 const declined=rows.find(p=>p.providerId===teams[0].id);
 const timedOut=rows.find(p=>p.providerId===teams[1].id);
 const accepted=rows.find(p=>p.providerId===teams[2].id);
 assert.deepEqual([declined.offers,declined.accepted,declined.declined,declined.timedOut,declined.rate],[1,0,1,0,0]);
 assert.deepEqual([timedOut.offers,timedOut.accepted,timedOut.declined,timedOut.timedOut,timedOut.rate],[1,0,0,1,0]);
 assert.deepEqual([accepted.offers,accepted.accepted,accepted.declined,accepted.timedOut,accepted.rate],[1,1,0,0,100]);
 const untouched=rows.find(p=>![teams[0].id,teams[1].id,teams[2].id].includes(p.providerId));
 assert.equal(untouched.rate,null,'zero-offer rate is unavailable, not 0% or 100%');
 assert.equal(s.minute,0,'offers alone do not advance synthetic clock');
});

test('cancelled accepted offer stays in acceptance denominator and quality cancellation rate',()=>{
 const s=E.initialState();
 const incident=E.createIncident(s,'AV-104','flatbed');
 const team=E.eligibleProviders(s,incident.id)[0];
 E.recordProviderOffer(s,incident.id,team.id,'accepted');
 E.cancelProviderAssignment(s,incident.id,'Synthetic capacity withdrawal');
 const acceptance=E.providerAcceptance(s).find(p=>p.providerId===team.id);
 const quality=E.providerQuality(s).find(p=>p.providerId===team.id);
 assert.equal(acceptance.offers,1);
 assert.equal(acceptance.accepted,1);
 assert.equal(acceptance.rate,100);
 assert.equal(quality.cancellations,1);
 assert.equal(quality.cancellationRate,100);
 assert.equal(quality.arrivals,0);
 assert.equal(quality.onTimeRate,null,'no arrivals must not be represented as 0% on-time');
 assert.equal(E.kpis(s).completed,0);
 assert.equal(E.providerBoard(s).find(p=>p.id===team.id).busy,false);
});
