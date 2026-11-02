-- Business question: At which hours do completed taxi trips begin?
-- Input: taxi_trips view created from an official monthly Parquet file.
SELECT
    EXTRACT(HOUR FROM tpep_pickup_datetime)::INTEGER AS pickup_hour,
    COUNT(*) AS trip_count
FROM taxi_trips
WHERE tpep_pickup_datetime IS NOT NULL
GROUP BY 1
ORDER BY 1;
