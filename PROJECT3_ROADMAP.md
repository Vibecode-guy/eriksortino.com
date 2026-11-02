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
