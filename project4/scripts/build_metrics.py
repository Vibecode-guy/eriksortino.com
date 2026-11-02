"""Generate reproducible metrics from one official TLC Yellow Taxi monthly Parquet file."""
import json
import sys
from pathlib import Path
import duckdb

ROOT = Path(__file__).resolve().parents[1]
MONTH = sys.argv[1] if len(sys.argv) > 1 else "2025-01"
if len(MONTH) != 7 or MONTH[4] != "-" or not (MONTH[:4] + MONTH[5:]).isdigit() or not 1 <= int(MONTH[5:]) <= 12:
    raise SystemExit("Month must be YYYY-MM")
URL = f"https://d37ci6vzurychx.cloudfront.net/trip-data/yellow_tripdata_{MONTH}.parquet"
con = duckdb.connect()
con.execute(f"CREATE VIEW taxi_trips AS SELECT * FROM read_parquet('{URL}')")
def run(name):
    sql = (ROOT / "sql" / name).read_text()
    cur = con.execute(sql)
    columns = [c[0] for c in cur.description]
    return [dict(zip(columns, row)) for row in cur.fetchall()]
# Join official TLC zone lookup for human-readable geographic analysis.
ZONE_URL = "https://d37ci6vzurychx.cloudfront.net/misc/taxi_zone_lookup.csv"
con.execute(f"CREATE VIEW taxi_zones AS SELECT * FROM read_csv_auto('{ZONE_URL}')")
zone_sql = """
SELECT z.Borough AS borough, z.Zone AS zone_name,
       t.PULocationID AS pickup_zone_id,
       COUNT(*) AS trip_count
FROM taxi_trips t
JOIN taxi_zones z ON t.PULocationID = z.LocationID
WHERE t.trip_distance > 0
GROUP BY 1, 2, 3
ORDER BY trip_count DESC
LIMIT 25
"""
borough_sql = """
SELECT z.Borough AS borough, COUNT(*) AS trip_count
FROM taxi_trips t
JOIN taxi_zones z ON t.PULocationID = z.LocationID
GROUP BY 1 ORDER BY trip_count DESC
"""
result = {
    "source": "NYC Taxi and Limousine Commission",
    "month": MONTH,
    "source_url": URL,
    "hourly_demand": run("01_hourly_demand.sql"),
    "top_pickup_zones": run("02_zone_demand.sql"),
    "quality_audit": run("03_quality_audit.sql")[0],
    "weekday_demand": run("04_weekday_demand.sql"),
    "trip_duration": run("05_trip_duration.sql")[0],
    "named_pickup_zones": [dict(zip(["borough", "zone_name", "pickup_zone_id", "trip_count"], row)) for row in con.execute(zone_sql).fetchall()],
    "borough_demand": [dict(zip(["borough", "trip_count"], row)) for row in con.execute(borough_sql).fetchall()],
}
out = ROOT / "output" / "metrics.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=2, default=str) + "\n")
print(f"Wrote {out}")
