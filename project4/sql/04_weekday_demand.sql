-- SQL technique: date extraction, conditional filtering and aggregation.
-- ISO day of week: Monday=1, Sunday=7.
SELECT
  ISODOW(tpep_pickup_datetime)::INTEGER AS weekday_iso,
  COUNT(*) AS trip_count
FROM taxi_trips
WHERE tpep_pickup_datetime IS NOT NULL
GROUP BY 1
ORDER BY 1;
