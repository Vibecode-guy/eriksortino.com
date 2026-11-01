# Project 3 — Autonomous Vehicle Fleet Operations Command Center

**Scope:** Los Angeles AV fleet operations **simulation**. All vehicles, coordinates, incidents, providers, response times, costs, and performance measures are synthetic portfolio assumptions. No confidential HONK, Waymo, Zoox, or partner information. Do not present the simulation as a live fleet feed.

**Guardrails:** Do not change Project 1 (`ai-dispatch-project.html`) or Project 2 (`la-service-operations.html`) except a critical site-breaking fix. Maintain the existing portfolio studies and clearly distinguish this *new* AV Command Center from existing Project 03 EV Network Expansion and Project 04 Fleet Operating Review.

## Roadmap (update after every verified delivery)
### Phase 1 — Foundations
- [x] Create durable roadmap and scope/disclosure.
- [ ] Create responsive, accessible dark command-center UI at `project3-av-command-center.html`.
- [ ] Add homepage portfolio navigation without removing existing work.
- [ ] Render schematic LA fleet map, selectable vehicles, and detail panels.
- [ ] Verify deployed page and mobile navigation.

### Phase 2 — Dispatch MVP
- [ ] Generate immobilized AV, door-ajar, flatbed-recovery, and depot-transport incidents.
- [ ] Show severity, queue, elapsed simulated time, and SLA status.
- [ ] Filter compatible providers and support assignment.
- [ ] Advance dispatch → en route → on scene → completed, with escalation handling.
- [ ] Acceptance: select vehicle → create incident → assign provider → complete → KPIs update.

### Phase 3 — Analytics
- [ ] Fleet availability/utilization and documented denominators.
- [ ] Mean/p90 response, recovery cost, provider performance, incident trends.
- [ ] Geographic and type breakdown; bottleneck analysis.

### Phase 4 — Planning
- [ ] Provider staging comparisons and dispatch recommendations with explainable assumptions.
- [ ] Fleet size/demand and response-time/cost scenario controls.
- [ ] Before/after comparisons with reproducible simulation settings.

### Phase 5 — Quality and deployment
- [ ] Unit tests for state transitions, provider eligibility, KPI formulas, edge cases.
- [ ] Keyboard navigation, semantic status, focus behavior, mobile responsive checks.
- [ ] Clearly disclose synthetic data, scenario assumptions, limitations.
- [ ] Publish executive summary and methodology.
- [ ] Verify production deployment and key workflow.

## Verification log
- 2026-10-31: Roadmap initialized. Subsequent checklist items must be marked complete only after corresponding files/behavior are verified. Live production verification is separate from GitHub commit confirmation.
