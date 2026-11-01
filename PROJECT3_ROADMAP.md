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
- [ ] Provider staging comparisons and dispatch recommendations with explainable assumptions.
- [ ] Fleet size/demand and response-time/cost scenario controls.
- [ ] Before/after comparisons with reproducible simulation settings.

### Phase 5 — Quality and deployment
- [x] Unit tests for state transitions, provider eligibility, KPI formulas, edge cases, fleet-minute denominators, provider metrics, SLA and bottleneck summaries (11 synthetic tests in GitHub Actions).
- [ ] Keyboard navigation, semantic status, focus behavior, mobile responsive checks.
- [ ] Clearly disclose synthetic data, scenario assumptions, limitations.
- [ ] Publish executive summary and methodology.
- [ ] Verify production deployment and key workflow.

## Verification log
- 2026-11-01: Phase 3 analytics delivered in `scripts/project3-analytics.js`, `scripts/test-project3-analytics.cjs`, and `project3-av-command-center.html`; workflow `.github/workflows/project3-checks.yml` updated. New responsive tables show provider performance, SLA attainment, incident type and vehicle-area trends, stage bottlenecks, and time-weighted incident downtime. **Not commercial utilization**; trip utilization remains unavailable until a trip-demand model exists. CI Project 3 checks passed (11 tests and static wiring) at commit `167ac9b8`, run `41314537777`. Live browser/mobile visual verification not performed. GitHub Pages deployment for `167ac9b8` was in progress at the time of this entry. No changes to Project 1 or Project 2.

- 2026-10-31: Roadmap initialized. Implemented initial dark responsive command center, 12 synthetic AVs, 4 synthetic providers, incident queue, workflow, SLA clock, escalation, fleet and response KPIs. Added homepage link. GitHub Actions Project 3 MVP checks passed at commit `cab0f264`. Production URL / mobile visual verification pending; CI tests validate state machine and static wiring, not a browser interaction test. Project 1 and Project 2 files untouched.
