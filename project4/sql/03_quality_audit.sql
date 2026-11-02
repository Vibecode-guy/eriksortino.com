-- Inspect questionable records before deciding whether to exclude them.
SELECT
    COUNT(*) AS total_rows,
    COUNT(*) FILTER (WHERE tpep_pickup_datetime IS NULL) AS missing_pickup_time,
    COUNT(*) FILTER (WHERE tpep_dropoff_datetime <= tpep_pickup_datetime) AS nonpositive_duration,
    COUNT(*) FILTER (WHERE trip_distance IS NULL OR trip_distance <= 0) AS invalid_distance,
    COUNT(*) FILTER (WHERE PULocationID IS NULL) AS missing_pickup_zone
FROM taxi_trips;
