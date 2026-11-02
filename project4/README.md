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
