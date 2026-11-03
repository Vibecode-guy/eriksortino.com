-- Monthly pickup trends using a SQL window function.
-- Source: official TLC Yellow Taxi monthly Parquet files.
WITH monthly AS (
  SELECT
    STRFTIME(tpep_pickup_datetime, '%Y-%m') AS month,
    COUNT(*) AS trip_count
  FROM taxi_trips_multi
  WHERE tpep_pickup_datetime >= DATE '2024-12-01'
    AND tpep_pickup_datetime < DATE '2025-04-01'
  GROUP BY 1
), trends AS (
  SELECT month, trip_count,
         LAG(trip_count) OVER (ORDER BY month) AS previous_month_trips
  FROM monthly
)
SELECT month, trip_count, previous_month_trips,
       ROUND(100.0 * (trip_count - previous_month_trips)
         / NULLIF(previous_month_trips, 0), 2) AS month_over_month_pct
FROM trends
ORDER BY month;
