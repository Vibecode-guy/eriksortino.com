# Project 3 — Autonomous Vehicle Fleet Operations Command Center

**Scope:** Los Angeles AV fleet operations **simulation**. All vehicles, coordinates, incidents, providers, response times, costs, and performance measures are synthetic portfolio assumptions. No confidential HONK, Waymo, Zoox, or partner information. Do not present the simulation as a live fleet feed.

**Guardrails:** Do not change Project 1 (`ai-dispatch-project.html`) or Project 2 (`la-service-operations.html`) except a critical site-breaking fix. Maintain the existing portfolio studies and clearly distinguish this *new* AV Command Center from existing Project 03 EV Network Expansion and Project 04 Fleet Operating Review.

## Roadmap (update after every verified delivery)
### Phase 1 — Foundations
- [x] Create durable roadmap and scope/disclosure.
- [x] Create responsive, accessible dark command-center UI at `project3-av-command-center.html`.
- [x] Add homepage portfolio navigation without removing existing work.
- [x] Render schematic LA fleet map, selectable vehicles, and detail panels.
- [ ] Verify deployed page and mobile navigation.

### Phase 2 — Dispatch MVP
- [x] Generate immobilized AV, door-ajar, flatbed-recovery, and depot-transport incidents.
- [x] Show severity, queue, elapsed simulated time, and SLA status.
- [x] Filter compatible providers and support assignment.
- [x] Advance dispatch → en route → on scene → completed, with escalation handling.
- [x] Acceptance: select vehicle → create incident → assign provider → complete → KPIs update.

### Phase 3 — Analytics
- [x] Snapshot fleet availability and fleet-minute incident downtime/service-ready exposure with explicit denominators. Commercial trip utilization is not modeled; remains pending Phase 4 trip/demand model.
- [x] Mean/nearest-rank p90 completed response, completed recovery costs, provider assignment/completion/SLA/spend, incident counts by type and area.
- [x] Geographic and incident-type breakdowns; completed-stage mean/p90 and largest observed mean bottleneck (descriptive only).

### Phase 4 — Planning
- [x] Compare existing four fictional providers with one additional staged crew at LAX/Westside, Valley, or San Pedro/Harbor; capability-compatible earliest-on-scene dispatch with deterministic cost/ID tie-breaks.
- [x] Fleet size (12–240), synthetic incident demand (2–30 incidents per 100 AVs/day), and maximum incremental 30-day cost controls; modeled queue time, mean/p90 response, SLA share, and cost.
- [x] Baseline/alternative before-and-after comparison using identical seeded synthetic incidents, a fixed 30-day horizon, one-crew-per-provider capacity, and explainable budget-constrained recommendation. Fleet-size control scales incident workload, not the 12 vehicle markers; passenger-trip utilization is still not modeled.

### Phase 5 — Quality and deployment
- [x] CI regression coverage for planning determinism, identical incident cohorts, capacity queueing, capability checks, recommendation budget, cost reconciliation, and invalid inputs (18 total Project 3 tests).
- [x] Unit tests for state transitions, provider eligibility, KPI formulas, edge cases, fleet-minute denominators, provider metrics, SLA and bottleneck summaries (11 synthetic tests in GitHub Actions).
- [ ] Keyboard navigation, semantic status, focus behavior, mobile responsive checks.
- [ ] Clearly disclose synthetic data, scenario assumptions, limitations.
- [ ] Publish executive summary and methodology.
- [ ] Verify production deployment and key workflow.

## Phase 6 — Scale the simulation (next active milestone)
- [x] Inspect existing state initialization and test fixtures before changing fleet size.
- [x] Introduce a fixed-seed generator for 100 fictional vehicles across Central LA, Westside/Venice, Valley, South LA/LAX, and Harbor/San Pedro; fixed internal seed `20261102`, LCG parameters `1664525`/`1013904223`, and approximate zone-coordinate jitter. Still synthetic and not street-snapped.
- [x] Expand from four to six fictional recovery teams, with equipment/capabilities and one-active-assignment-per-team capacity.
- [x] Add deterministic 24-marker representative view (selected and incident AVs always shown; search and unavailable-only view show all matches). The full fleet remains in the keyboard-accessible vehicle selector. This is visual density control, not geographic clustering or actual telemetry.
- [ ] Ensure vehicle selectors, incident creation, provider eligibility, response metrics, reset, and the separate 30-day scenario planner remain consistent.
- [x] Verify engine/analytics/planning regression tests for 100 unique vehicles, deterministic reset, six providers, assignment capacity and KPI formulas: 38 tests passed in run `41570001039` (the separate static-integration step failed).
- [x] Document distinct simulation scales: interactive workbench defaults to 100 deterministic synthetic vehicles and six fictional teams (optional engine fixture count 12–240 and unsigned 32-bit seed); the separate planning slider controls a 30-day synthetic incident cohort and does not resize the workbench or imply real telemetry. The default seed is 20261102; LCG uses unsigned 32-bit state, multiplier 1664525, increment 1013904223, and five approximate LA area centers with jitter. The initial 12 demonstration points remain fixed; neither they nor generated points are road-snapped.\n- [ ] Expose seed and fixture-size controls in the UI only after confirming map/selector performance, reset semantics and keyboard behavior at 240 vehicles.
- [x] Repaired inline-script CI static integration; GitHub Actions run 41658312327 passed and Pages deployment run 41658311783 succeeded at dd732645. Browser/mobile interaction verification still pending.\n- [x] Verify CI for configurable fixture commit `7ab836b8`: run `41764186668` passed both regression and static-integration steps.\n- [ ] Verify GitHub Pages deployment for latest roadmap commit and perform live browser/mobile acceptance checks.

**Exit criteria:** A fixed seed reliably creates 100 selectable vehicles and six recovery teams; a user can dispatch and complete an incident; KPIs update; existing tests pass; and the page remains usable on mobile.

## Current prioritized next steps (2026-11-04)
1. Confirm Project 3 CI and Pages deployment for map-density changes; run actual mobile/keyboard browser checks when available.
2. Source and attribute a public Los Angeles geographic basemap. The existing schematic now uses explicit WGS84 bounds and tested coordinate projection; it is NOT a street map, real telemetry, or road-snapped geometry.
3. Validate a road-network routing provider and its usage constraints; preserve clearly labeled deterministic straight-line fallback.
4. [x] Rank eligible, unoccupied crews by capability, modeled on-scene ETA, estimated initial recovery charge and stable ID; add deterministic capacity/eligibility regression. [ ] Replace straight-line estimate with validated road-network routing; test traffic and SLA assumptions separately.
5. Reconcile scenario and operational denominators, add regression tests for accessibility and extreme workloads.


### Geographic projection milestone (2026-11-04 evening)
- [x] Inspect existing schematic SVG, 100-vehicle generator, map density filter and CI before editing.
- [x] Add `scripts/project3-geo.js`: deterministic WGS84 latitude/longitude projection into the existing 900×610 schematic, declared bounds west −118.60/east −118.15/south 33.68/north 34.30, clipping with an explicit out-of-bounds flag, and a fleet coordinate audit. These are **illustrative service-area extents**, not official LA city boundaries.
- [x] Integrate projection in existing vehicle-marker renderer without recreating the page or changing incident workflows. Clearly label the result a schematic with synthetic WGS84 positions, not live GPS or road-snapped positions.
- [x] Add five geography regression cases (orientation, edge clipping, invalid coordinates, 100-vehicle/six-team audit, 240-vehicle seeded reproducibility) and include in CI.
- [ ] Confirm full post-integration CI and latest GitHub Pages deployment; browser/mobile acceptance still pending.
- [ ] Source an actual, attributed public LA basemap and determine a compatible accessible rendering strategy. **Not yet implemented:** real street geometry, routing, traffic or verified on-road travel times.

## Phase 4 planning methodology (explicitly fictional)

- **30-day demand:** Round(fleet size × synthetic incidents per 100 AVs/day × 30 / 100). A seeded generator distributes incidents across the existing 12 synthetic LA area proxies and the four incident categories (30% door ajar, 35% immobilized, 20% flatbed, 15% depot transport). These percentages are invented for demonstration.
- **Dispatch:** For each incident, choose a compatible fictional provider with the earliest modeled on-scene arrival, then lower variable cost, then provider ID. One crew per provider can work on only one response at a time; later incidents queue until that crew finishes. Travel uses the original synthetic straight-line estimator; there is no traffic, live routing, safety approval, shift schedule, or real contract data.
- **Cost:** Fictional base charge + synthetic category surcharge + $0.65 per straight-line kilometer, rounded per incident. Each additional staged crew adds a synthetic $3,200 fixed cost per 30 days. Scenario total = all incident variable charges + fixed cost. These are illustrative dollars, not vendor quotes or actual costs.
- **Comparison:** Every staging option receives the same generated event set within one selected configuration. Nearest-rank p90 and mean include crew queue, dispatch preparation, and travel. Recommend the lowest p90 option whose incremental 30-day cost does not exceed the selected budget; tie by mean response, total cost, then ID. This is not a production routing recommendation or forecast.
- **Separation:** Planning runs independently of the interactive incident workbench and does not change its incident history or map markers. No commercial passenger-trip utilization or actual fleet telemetry is inferred.

## Verification log
- 2026-11-01 evening: Phase 4 staging and demand comparison delivered in `scripts/project3-planning.js`, `scripts/project3-planning-ui.js`, `scripts/test-project3-planning.cjs`, `project3-av-command-center.html`, and `.github/workflows/project3-checks.yml`. **GitHub Actions passed 18 tests** (11 prior + 7 planning), syntax checks and static integration at commit `babc2473`, run `41381037833`. A temporary inline-script corruption in an intermediate commit was corrected by restoring the original dispatch UI and isolating the planner as an external module; the final CI run passed. GitHub Pages deployment of the final commit was still pending; direct production browser/mobile verification was blocked by network access. Project 1 and Project 2 files were not changed.
- 2026-11-01: Phase 3 analytics delivered in `scripts/project3-analytics.js`, `scripts/test-project3-analytics.cjs`, and `project3-av-command-center.html`; workflow `.github/workflows/project3-checks.yml` updated. New responsive tables show provider performance, SLA attainment, incident type and vehicle-area trends, stage bottlenecks, and time-weighted incident downtime. **Not commercial utilization**; trip utilization remains unavailable until a trip-demand model exists. CI Project 3 checks passed (11 tests and static wiring) at commit `167ac9b8`, run `41314537777`. Live browser/mobile visual verification not performed. GitHub Pages deployment for `167ac9b8` was in progress at the time of this entry. No changes to Project 1 or Project 2.

- 2026-10-31: Roadmap initialized. Implemented initial dark responsive command center, 12 synthetic AVs, 4 synthetic providers, incident queue, workflow, SLA clock, escalation, fleet and response KPIs. Added homepage link. GitHub Actions Project 3 MVP checks passed at commit `cab0f264`. Production URL / mobile visual verification pending; CI tests validate state machine and static wiring, not a browser interaction test. Project 1 and Project 2 files untouched.

- 2026-11-02: Phase 5 executive briefing and guided 60-second walkthrough added to `project3-av-command-center.html` at commit `a4ef186bb57fcf57cb221efab24a5dc0a5b2ac82`. Source change committed to `main`; production deployment, visual/mobile QA and automated browser testing remain unverified. Project 1 files were not modified in this commit.

- 2026-11-02: Fleet engine expanded to 100 deterministic synthetic AVs and six providers (commits `c3751908`, `aa212fc7`). Added map search/status filters and fixed an uninitialized variable in customer-safety rendering (commit `1016de5b`). Existing planning model still has four-provider baseline assumptions; end-to-end browser QA and CI not yet verified. Next: six-team capacity enforcement, planner reconciliation, vehicle health, shift handoff, and real geographic basemap.

- 2026-11-02: Added `providerBoard` and active-assignment capacity checks in `scripts/project3-engine.js` (commit `68cc63c2`); added six-team resource table and disabled empty eligible-provider selection in `project3-av-command-center.html` (commit `2f1198e4`); added a double-booking regression test (commit `a13cbb6`). Corrected earlier malformed 100-vehicle assertions (commit `827ec2b4`). CI and live deployment have not been verified. Planning scenarios still require reconciliation with six-team dispatch baseline.

- 2026-11-02 evening: Audited current 100-AV/6-team engine and existing regression suite. Added fixture identity/reset and six-concurrent-team capacity tests (`f0834528`). Prior Project 3 CI at `495bc58a` failed four tests: two stale 12-vehicle analytics expectations, one safety-SLA state bug after passenger transfer, and one outdated scorecard coverage expectation. Corrected the safety SLA (`43f7275e`) and test expectations (`6c24f9bc`, `2c8c8f15`). CI for final changes must be checked; no claim of successful deployment. Project 1 and 2 untouched. Next: confirm CI; align planning baseline with six teams; expose seeded configuration; replace schematic geography with a sourced public basemap and labeled modeled routing assumptions.

- 2026-11-03 morning: Reviewed failed CI run `41570001039`: all **38 engine, analytics, and planning tests passed**, but static integration failed because its greedy `<script>` regex captured external script tags and threw `SyntaxError: Unexpected token '<'`. Replaced with independent inline-script extraction in `.github/workflows/project3-checks.yml` (commit `bd8cea40`; follow-up `bba7528e` was a no-op content-wise). Awaiting new full CI result. Current planning source already uses six baseline providers and optional seventh crew; older Phase 4 roadmap wording is historical. No Project 1/2 changes.
\n- 2026-11-03 evening: Inspected Project 3 engine, workflow, roadmap and recent GitHub Actions. Previous CI `41658312327` and Pages `41658311783` succeeded at `dd732645`. Added optional validated seed/count configuration to `seededFleet` and `initialState` while preserving the existing 100-AV/6-team default (`9c309541`), plus reproducibility, bounds, identity and isolation regression test (`7ab836b8`). CI passed for `7ab836b8` in run `41764186668`; Pages for later commits pending. No changes to Project 1 or Project 2. Next: validate CI, introduce sourced geographic basemap with clear synthetic telemetry disclosure; preserve existing accessible list/filter controls.\n
- 2026-11-04: Added deterministic representative map-marker density selection (`scripts/project3-map-density.js`), four regression tests, UI integration and CI wiring. All 100 default vehicles remain available in the full vehicle selector and explicit search; selected and incident markers are retained even above the 24-marker visual cap. This is not geographic clustering. Commits `d1d05a51`, `e87b7ab2`, `943b7dec`, `5de232ee`. CI and deployment status to be confirmed separately. No Project 1/2 modifications.

### Dispatch ranking transparency (2026-11-05 morning)
- [x] Inspect current engine, dispatch interface, regression suite and previous Pages run; existing six-team capacity filtering preserved.
- [x] Eligible providers now expose estimated on-scene time (synthetic travel plus dispatch preparation), estimated initial incident charge and explicit fallback assumptions; sort by on-scene ETA, then lower modeled cost, then stable provider ID. Exclude occupied or incompatible teams. Display modeled on-scene minutes and initial cost in existing provider selector without duplicating dispatch UI.
- [x] Add regression test for compatible crews, deterministic sorting, ETA/cost formulas and occupied-team exclusion.
- [ ] Confirm post-change CI and Pages deployment; no actual road network or live traffic is used. Synthetic straight-line estimate assumes approximately 31 km/h and is NOT a verified arrival prediction. Tire handoffs and adjustments are excluded from initial quote.
- [ ] Next: attributed public LA basemap; independently verifiable road routing with a deterministic fallback; browser/mobile keyboard checks and scenario denominator audit.
\n### Public geography enhancement — 2026-11-05\n- [x] Inspected existing schematic map, geographic projection, dashboard and CI before modifying.\n- [x] Added opt-in Leaflet/OpenStreetMap street basemap with attribution and synthetic vehicle overlays, preserving existing schematic as default/fallback and existing 24-marker density behavior. Added tests for attribution, invalid coordinates and missing map library; wired into CI.\n- [ ] Verify latest CI and GitHub Pages deployment; visually test toggle, mobile sizing, keyboard operation and tile load in a real browser. Third-party Leaflet CDN and OSM tile availability are not guaranteed; fallback is intentionally retained.\n- [ ] Confirm OSM tile usage policy and production traffic suitability before promoting street basemap to default; consider self-hosted library and approved tile provider.\n- [ ] Obtain and verify road-network routing estimates from a permitted source; dispatch and scenario ETAs still use synthetic straight-line assumptions.\n- [ ] Test end-to-end interaction with map toggling during incident creation, dispatch and completion.\n
### 2026-11-05 evening — verification and regression coverage
- [x] Inspected live repository, existing 100-vehicle/six-crew engine, street-map integration, tests and CI after the inline-script repair. Both Project 3 checks and GitHub Pages deployment succeeded for commit `3a798c2a` (runs `42132747009` and `42132746801`). This confirms automated checks and deployment, **not** mobile browser interaction.
- [x] Added the previously omitted `test-project3-street-map.cjs` suite to the CI test invocation and added static assertions for the street-map module and accessible toggle. Commit `0ed001f5` passed Project 3 CI run `42154124475`.
- [ ] Verify latest Pages deployment and manually exercise the street/schematic toggle, keyboard selection, incident completion and 240-vehicle selector on a real mobile browser. GitHub Actions alone cannot establish those interactions.
- [ ] Verify the Leaflet/OpenStreetMap tile availability, attribution and acceptable-use limits before treating the optional public basemap as a dependable production service. Synthetic coordinates are not road-snapped or real telemetry.
- [ ] Add tested road-network travel estimates with an explicitly labeled deterministic fallback; do not imply real traffic or actual fleet dispatch ETAs.
- [ ] Audit accessibility focus and announcement behavior; add tests for incident workflows at configurable 240-vehicle size and six simultaneously occupied teams.

### 2026-11-06 — 240-vehicle stress regression
- [x] Inspected current engine, existing engine tests, CI workflow, and recent commits before editing; Projects 1 and 2 remain unchanged.
- [x] Added a 240-vehicle fixed-seed lifecycle regression exercising six simultaneous incidents, provider assignment/completion, fleet availability (240 → 234 → 235), active/completed denominators, response mean/p90, cost, queued incident count, and deterministic reset. Test commit: `36e0a860`.
- [ ] Confirm new CI run `42229450844` passes, including static integration; test was queued/in progress at writing. Earlier roadmap commit `99f9ef48` passed CI run `42154161064` and Pages run `42154161719`.
- [ ] Complete actual mobile/keyboard browser acceptance, live page navigation, and attribution checks. GitHub Pages deployment alone does not prove browser interactions work.
- [ ] Validate a verifiable routing source, permissions/quotas and deterministic labeled fallback before replacing synthetic straight-line estimates.
- [ ] Expose optional 240-vehicle fixture controls only after mobile selector and map density acceptance.
