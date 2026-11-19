'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const page=fs.readFileSync(require('node:path').join(__dirname,'../project3-av-command-center.html'),'utf8');
test('dispatch controls retain programmatic labels and incident queue identity',()=>{
 for(const id of ['vehicleSelect','incidentType']){
  assert.match(page,new RegExp('<label\\s+for="'+id+'"'));
  assert.match(page,new RegExp('<select\\s+id="'+id+'"'));
 }
 assert.match(page,/id="queue"[^>]*aria-label="Simulated incident queue"/);
 assert.match(page,/id="announcer"[^>]*role="status"[^>]*aria-live="polite"/);
});
test('public street map is explicitly opt-in and labeled',()=>{
 assert.match(page,/id="streetMapToggle"[^>]*type="button"[^>]*aria-pressed="false"[^>]*aria-controls="streetMap"/);
 assert.match(page,/id="streetMapStatus"[^>]*role="status"/);
 assert.match(page,/synthetic WGS84 positions, not GPS telemetry or road-snapped/);
 assert.match(page,/No actual company or partner data/);
});

test('mobile layouts and keyboard focus cues remain available',()=>{
 assert.match(page,/@media\(max-width:570px\)/,'Mobile breakpoint missing');
 assert.match(page,/\.controls\{grid-template-columns:1fr\}/,'Mobile controls must stack');
 assert.match(page,/\.analytics-grid\{grid-template-columns:1fr\}/,'Mobile analytics must stack');
 assert.match(page,/\.planning-grid\{grid-template-columns:1fr\}/,'Mobile planner must stack');
 assert.match(page,/button:focus-visible,select:focus-visible,a:focus-visible/,'Keyboard focus indication missing');
 assert.match(page,/#streetMap \.leaflet-interactive:focus-visible/,'Map marker focus indication missing');
 assert.match(page,/#streetMap\[hidden\]\{display:none\}/,'Opt-in map must be hidden by default');
});
