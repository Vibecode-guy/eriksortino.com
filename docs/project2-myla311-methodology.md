# Project 2 — MyLA311 geographic data methodology

This is a reproducibility guide for the **Los Angeles Service Operations** portfolio dashboard. It describes what the code calculates, not a claim that the live City API or production browser has been verified.

## Source, cohort, and reproducibility

- **Publisher:** City of Los Angeles, MyLA311 Service Request Data 2024.
- **Socrata resource:** `b7dx-7gc3`, queried at `https://data.lacity.org/resource/b7dx-7gc3.json`.
- **Creation cohort:** `createddate >= '2024-01-01T00:00:00' and createddate < '2025-01-01T00:00:00'` (2024 inclusive, 2025 exclusive).
- **Source behavior:** The City may update or backfill historical records. Results are a query-time view, not a frozen historical extract. Multiple independent queries can observe slightly different refresh states.
- **No invented City measurements:** If a query fails, returns a truncated grouped result, or fails count reconciliation, the corresponding output is unavailable rather than replaced with an estimate.

## Run the geographic export

With Node.js 22 (Node.js 18+ supported by the script), from the repository root:

```sh
node --test scripts/test-project2-region-lenses.cjs scripts/test-project2-region-ui.cjs
node scripts/build-myla311-geo.cjs data/myla311-2024-geography.json
```

The export requires live network access to the City endpoint. A successful local test run **does not** verify that the live API responds. The script writes an aggregated JSON file; it does not export case identifiers, addresses, or individual request coordinates. It exits nonzero if its required queries or reconciliations fail.

## Full-cohort geographic aggregation

The export issues independent City API queries for (1) all 2024 requests grouped by `zipcode`, (2) the full cohort count, (3) plausible geocoded requests grouped by `zipcode` with `avg(latitude)` and `avg(longitude)`, (4) their count, (5) a grouped historical closure-timestamp gap, and (6) that gap's independent count.

The **plausible coordinate filter** is latitude 33.65–34.35 and longitude −118.75 to −118.10. This is a disclosed exploratory bounding box, **not** an official Los Angeles municipal boundary. Requests without coordinates or outside that box are excluded from mapped demand; missing ZIP groups are counted separately and cannot be assigned to a region. Grouped ZIP counts must reconcile to their independent totals; geocoded counts cannot exceed corresponding all-cohort ZIP counts; gap counts cannot exceed geocoded demand. The script refuses results at its grouped-row limit rather than silently accepting a possibly truncated ranking.

The map uses the **mean request coordinate within each ZIP group**. It does not plot individual requests or ZIP polygons. A high-volume ZIP mean can obscure variation within that ZIP.

## Six exploratory geographic lenses

The six labels are San Pedro / Harbor, San Fernando Valley, Downtown LA, Westside, South Los Angeles, and East / Northeast LA. Each has a documented reference center and radius in `scripts/project2-region-lenses.js`. Every mapped ZIP mean is assigned to the *nearest eligible center* if within that center's radius; otherwise it is unassigned. This is an approximate navigation method, not a legal boundary, official service district, or population-normalized region comparison.

To disclose assignment sensitivity, the export additionally reports:

- `overlappingZipGroups` and `overlappingRequests`: ZIP means that fall inside **more than one** reference radius, assigned only once to the nearest eligible center.
- `nearRadiusEdgeZipGroups` and `nearRadiusEdgeRequests`: ZIP means within **2 km** of the radius edge of their assigned center.
- `unassignedRequests` and `unassignedZipGroups`: mapped ZIP means outside all six radii.

Overlap and near-edge flags may refer to the **same** requests and must not be added to each other or to excluded requests. Neither is a statistical error bound; both are transparent indicators of sensitivity to the arbitrary lens geometry. All ZIP means, even those not flagged, may cross real neighborhood boundaries.

## Closure dates, status, and duration

The historical year-end timestamp-gap indicator counts 2024-created records where `closeddate` is null, predates `createddate`, or falls on/after January 1, 2025. It is **not** an official backlog or a count of open requests. The City's use of `ClosedDate` varies by request type; later corrections and backfills can also change the indicator. The dashboard's current exact `Closed` status share is a separate metric.

**Regional median and p90 closure duration are not currently computed.** A mean ZIP coordinate, timestamp-gap count, or sampled citywide closure duration cannot produce a defensible regional percentile. Those statistics require validated, complete regional duration observations or appropriate grouped distributions and explicit coverage reporting.

The geographic investigation matrix uses only request counts and timestamp-gap shares relative to the median of eligible exploratory lenses. It is **not** a three-signal service-pressure or staffing model. The six lenses have different sizes and service mixes; raw request totals are not directly comparable measures of labor effort.

## Other dashboard limitations

Several dashboard panels use complete 2024 creation-cohort **aggregate queries** (monthly volume, category/channel/owner mix, ZIP counts, and weekday/hour demand). The separate closure-duration analysis uses a bounded, recent completed-request **sample** and is labeled as such. Do not generalize its median, p90, or average to all City completions. The capacity and financial calculator is hypothetical; modeled capacity value is **not realized cash savings**.

## Automated checks and production verification

`Project 2 regional lens checks` runs syntax, synthetic geographic reconciliation, DOM interaction, data-quality, Pareto, and owner-mix tests on GitHub Actions. The tests use fixtures, not invented City measurements. A green CI run verifies code behavior against those fixtures, **not** live API schema compatibility, geographic ground truth, deployed browser rendering, mobile accessibility, or current production data.

The live site is `https://eriksortino.com/la-service-operations.html`. Verify GitHub Pages deployment independently and check the map, controls, City API responses, and mobile experience in a real browser before claiming production validation.
