# Project 4 — NYC Transportation Intelligence Lab

A SQL-first portfolio project analyzing official NYC Taxi & Limousine Commission Yellow Taxi trip records.

## Visitor journey
1. Business question and why it matters
2. SQL query with plain-English explanation
3. Verified query result and interactive visualization
4. Data quality checks, limitations and operational interpretation

## Data
Official monthly Yellow Taxi Parquet files: https://www.nyc.gov/site/tlc/about/tlc-trip-record-data.page

The dataset provides pickup/dropoff timestamps, taxi zone IDs, distance and fares. It does **not** establish driver availability, dispatch latency or total fleet utilization.

## Local quick start
```bash
python -m pip install duckdb
python project4/scripts/build_metrics.py 2025-01
```

This generates `project4/output/metrics.json` locally (not committed). Do not label illustrative dashboard figures as observed data.

## Planned UI
- KPI overview with dataset month and row count
- Pickup demand by hour, weekday, zone
- SQL explorer: question / code / explanation / result
- Data-quality audit and limitations
- Operational implications and reproducibility notes

Project 1–3 remain unchanged. This is an isolated project scaffold on a feature branch.

## Verified execution
The January 2025 GitHub Actions validation run succeeded with **3,475,226 records**. Subsequent workflow runs also passed after weekday and trip-duration queries were added. See [SQL validation runs](https://github.com/Vibecode-guy/eriksortino.com/actions/workflows/project4-sql.yml).

## Publishing the dashboard
The analysis workflow stores the generated `metrics.json` as a GitHub Actions artifact. The separate manual [Publish Verified Metrics](https://github.com/Vibecode-guy/eriksortino.com/actions/workflows/project4-publish.yml) workflow writes `project4/data/metrics.json` to this feature branch. The static dashboard at `project4/index.html` reads that JSON. Publishing the metrics is distinct from deploying the website; do not claim the page is live until the site deployment is verified.

## Analyst skills demonstrated
- SQL aggregation and grouping for hourly, weekday and zone demand
- CTEs and percentile statistics for trip-duration distributions
- Conditional aggregation for transparent data-quality auditing
- Python and DuckDB reproducible ETL with CI validation
- Business interpretation and explicit limitations of observational data

## Scope and integrity
Observed pickup counts are not a direct measure of unmet demand or fleet availability. Duration is derived from recorded trip timestamps and does not represent dispatch response time. Avoid committing large raw Parquet datasets.
