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
result = {
    "source": "NYC Taxi and Limousine Commission",
    "month": MONTH,
    "source_url": URL,
    "hourly_demand": run("01_hourly_demand.sql"),
    "top_pickup_zones": run("02_zone_demand.sql"),
    "quality_audit": run("03_quality_audit.sql")[0],
}
out = ROOT / "output" / "metrics.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(result, indent=2, default=str) + "\n")
print(f"Wrote {out}")
