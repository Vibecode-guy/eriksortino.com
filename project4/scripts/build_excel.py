"""Build an auditable Excel operations model from verified TLC SQL exports.

This is a scenario model, not an estimate of actual NYC taxi staffing.
Requires openpyxl. No invented observations.
"""
import json
from pathlib import Path
from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.styles import Font, PatternFill, Alignment
from openpyxl.utils import get_column_letter

ROOT = Path(__file__).resolve().parents[1]
data = json.loads((ROOT / "data" / "metrics.json").read_text())
wb = Workbook()
overview = wb.active
overview.title = "Executive Summary"
overview.append(["NYC Transportation Intelligence | January 2025"])
overview.append(["Source", data["source"]])
overview.append(["Reporting month", data["month"]])
overview.append(["Records audited", data["quality_audit"]["total_rows"]])
overview.append(["Interpretation", "Observed taxi pickups; not unmet demand or vehicle availability"])
overview.append(["Method", "SQL/DuckDB pipeline; AI-assisted development"])
overview.append(["Scenario caution", "Capacity assumptions are editable illustrations, not actual staffing"])
overview.append([])
overview.append(["Peak hour", "Observed pickups"])
peak = max(data["hourly_demand"], key=lambda x: x["trip_count"])
overview.append([peak["pickup_hour"], peak["trip_count"]])

def sheet(name, columns, rows):
    ws = wb.create_sheet(name)
    ws.append(columns)
    for row in rows:
        ws.append(row)
    ws.freeze_panes = "A2"
    ws.auto_filter.ref = ws.dimensions
    return ws

hourly = sheet("Hourly Demand", ["Hour", "Pickups", "Share of audited records"],
    [[r["pickup_hour"], r["trip_count"], f"=B{i}/'Executive Summary'!$B$4"]
     for i, r in enumerate(data["hourly_demand"], 2)])
for row in hourly.iter_rows(min_row=2, min_col=3, max_col=3):
    row[0].number_format = "0.00%"
weekday = sheet("Weekday Demand", ["ISO weekday", "Pickups"],
    [[r["weekday_iso"], r["trip_count"]] for r in data["weekday_demand"]])
zones = sheet("Top Pickup Zones", ["Borough", "Zone", "Zone ID", "Pickups"],
    [[r["borough"], r["zone_name"], r["pickup_zone_id"], r["trip_count"]]
     for r in data["named_pickup_zones"]])
boroughs = sheet("Borough Demand", ["Borough", "Pickups"],
    [[r["borough"], r["trip_count"]] for r in data["borough_demand"]])
monthly = sheet("Monthly Trends", ["Month", "Pickups", "Prior month", "MoM change"],
    [[r["month"], r["trip_count"], r["previous_month_trips"], r["month_over_month_pct"] / 100
      if r["month_over_month_pct"] is not None else None]
     for r in data["monthly_trends"]])
for row in monthly.iter_rows(min_row=2, min_col=4, max_col=4):
    row[0].number_format = "0.00%"
audit = sheet("Data Quality", ["Metric", "Value"],
    [[k, v] for k, v in data["quality_audit"].items()])
scenario = wb.create_sheet("Capacity Scenario")
for row in [
    ["Illustrative capacity planning — editable assumptions", "Value"],
    ["Assumed pickups per vehicle per hour", 2],
    ["Target utilization (0 to 1)", 0.75],
    ["Contingency reserve (0 to 1)", 0.15],
    [],
    ["Hour", "Observed pickups", "Modeled vehicles", "With contingency"],
]:
    scenario.append(row)
for i, r in enumerate(data["hourly_demand"], 7):
    scenario.append([r["pickup_hour"], r["trip_count"],
                     f"=ROUNDUP(B{i}/($B$2*$B$3),0)",
                     f"=ROUNDUP(C{i}*(1+$B$4),0)"])
scenario["A33"] = "Illustrative only: citywide observed taxi pickups are not fleet dispatch demand."
scenario["B3"].number_format = "0%"
scenario["B4"].number_format = "0%"
scenario.freeze_panes = "A7"
scenario.auto_filter.ref = "A6:D30"

for ws in wb.worksheets:
    header_row = 6 if ws.title == "Capacity Scenario" else (9 if ws.title == "Executive Summary" else 1)
    for cell in ws[header_row]:
        cell.fill = PatternFill("solid", fgColor="15324C")
        cell.font = Font(color="FFFFFF", bold=True)
        cell.alignment = Alignment(wrap_text=True)
    for col in ws.columns:
        letter = get_column_letter(col[0].column)
        width = min(65, max(14, max(len(str(c.value or "")) if c.data_type != "f" else 16 for c in col) + 3))
        ws.column_dimensions[letter].width = width
    ws.sheet_view.showGridLines = False

chart = BarChart()
chart.title = "Observed pickups by hour"
chart.y_axis.title = "Trips"
chart.x_axis.title = "Hour"
chart.add_data(Reference(hourly, min_col=2, min_row=1, max_row=25), titles_from_data=True)
chart.set_categories(Reference(hourly, min_col=1, min_row=2, max_row=25))
chart.width = 22
chart.height = 11
hourly.add_chart(chart, "E3")
out = ROOT / "NYC_Transportation_Intelligence_Excel_Model.xlsx"
wb.save(out)
print(f"Saved {out} with {len(wb.sheetnames)} sheets")
