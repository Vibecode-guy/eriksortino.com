-- Project 03 — EV Network Expansion Strategy
-- Portable SQL-style analysis specification for an AFDC station export.
-- Column names should be mapped to the exact downloaded file headers.

WITH ev AS (
  SELECT
    id, station_name, city, state, zip, latitude, longitude,
    status_code, access_code, ev_network, facility_type,
    COALESCE(ev_level1_evse_num,0) AS l1_ports,
    COALESCE(ev_level2_evse_num,0) AS l2_ports,
    COALESCE(ev_dc_fast_num,0) AS dc_fast_ports,
    COALESCE(ev_level1_evse_num,0)+COALESCE(ev_level2_evse_num,0)+COALESCE(ev_dc_fast_num,0) AS total_ports,
    open_date, date_last_confirmed, updated_at
  FROM afdc_stations
  WHERE fuel_type_code='ELEC'
    AND access_code='public'
    AND status_code IN ('E','P')
), market AS (
  SELECT
    state, city,
    COUNT(*) AS stations,
    SUM(total_ports) AS ports,
    SUM(dc_fast_ports) AS dc_fast_ports,
    AVG(total_ports * 1.0) AS ports_per_station,
    SUM(dc_fast_ports) * 1.0 / NULLIF(SUM(total_ports),0) AS dc_fast_share,
    COUNT(DISTINCT ev_network) AS networks
  FROM ev
  GROUP BY state, city
)
SELECT *
FROM market
ORDER BY dc_fast_ports DESC, ports DESC;

-- Portfolio strategy layer (implemented after normalization):
-- Expansion Priority = 0.35*CoverageGap + 0.30*DCFastGap
--                    + 0.20*CorridorRelevance + 0.15*NetworkWhiteSpace
-- This is an Erik Sortino portfolio framework, not a DOE metric.
