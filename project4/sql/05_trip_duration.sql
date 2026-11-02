-- SQL technique: CTEs, derived measures and percentile aggregation.
-- Duration is calculated from observed pickup/dropoff timestamps.
WITH durations AS (
  SELECT
    DATE_DIFF('minute', tpep_pickup_datetime, tpep_dropoff_datetime) AS duration_minutes
  FROM taxi_trips
  WHERE tpep_pickup_datetime IS NOT NULL
    AND tpep_dropoff_datetime IS NOT NULL
)
SELECT
  COUNT(*) AS valid_trip_count,
  ROUND(AVG(duration_minutes), 2) AS avg_duration_minutes,
  ROUND(MEDIAN(duration_minutes), 2) AS median_duration_minutes,
  ROUND(QUANTILE_CONT(duration_minutes, 0.9), 2) AS p90_duration_minutes
FROM durations
WHERE duration_minutes BETWEEN 1 AND 180;
