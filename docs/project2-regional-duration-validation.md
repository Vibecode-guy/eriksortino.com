# Project 2 — Regional closure-duration validation contract

## Purpose
Add median and p90 completion durations for the six *exploratory* LA geographic lenses without fabricating observations or confusing missing closure timestamps with official backlog.

## Required source and cohort
- Source: MyLA311 2024, Socrata resource `b7dx-7gc3`.
- Creation window: `createddate >= '2024-01-01T00:00:00' and createddate < '2025-01-01T00:00:00'`.
- A valid completed duration requires non-null `createddate` and `closeddate`, with `closeddate >= createddate`. Exclude negative/invalid durations and report their counts.
- The City does not populate `ClosedDate` uniformly across request types. Report completion-date coverage separately by region and, where feasible, service type.
- Use the same plausible coordinate bounds and deterministic ZIP-mean lens assignments as `scripts/project2-region-lenses.js` **only as an exploratory approximation**. The mean ZIP coordinate is not a neighborhood boundary.

## Safe calculation design
1. Obtain a complete, reconciled ZIP-level demand and coordinate aggregate from the existing pipeline.
2. Prefer a full-cohort **ZIP × duration-bin** grouped query, not a capped row sample. Define bins in hours or days, including a long-tail bin; reconcile the sum of all valid-duration bins with an independent count of valid completed records within the geographic bounds.
3. For each region, sum bins only for its assigned ZIP groups. Track assigned, unassigned, missing ZIP, invalid dates, and missing closure dates explicitly. Never double-count ZIP groups in overlapping reference radii.
4. A binned median or p90 is **an interval estimate**, not an exact percentile. Display the percentile bin/range and bin width. Do not label the bin midpoint as an exact median/p90. If exact values are required, retrieve all eligible individual durations through complete, paginated requests and verify record-count reconciliation first; avoid exporting addresses or case identifiers.
5. Refuse to render a regional percentile when any query is truncated, reconciliation fails, bin coverage is incomplete, or the denominator is below a documented minimum. Show “Unavailable” rather than zero.
6. Record API retrieval timestamp, source resource, cohort, coordinate filter, closure-date coverage, and whether the statistic is exact or binned.

## Regression tests before dashboard integration
- Exact bin boundaries, empty bins, ties, and p90 long-tail handling.
- Incomplete/missing ZIP groups, invalid timestamps, and null closure dates.
- Sum of regional and unassigned counts equals mapped valid-duration count.
- Reject duplicated ZIP × bin groups and counts greater than independent totals.
- Confirm a failed API refresh clears old regional percentile displays.
- Confirm keyboard-accessible table output and mobile overflow behavior.

## Interpretation
Do not treat high demand alone as understaffing. Do not call a missing `ClosedDate` official backlog. Do not combine the current two-signal investigation matrix with closure duration into a “service-pressure score” until comparable duration coverage and service mix have been validated.

## Implementation order
Validate live City query/schema first; implement and test the complete duration aggregation; integrate a six-area comparison table; only then extend the investigation matrix. Keep Project 1 unchanged.
