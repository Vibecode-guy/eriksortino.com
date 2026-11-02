-- Top pickup zones by completed trips (zone IDs require TLC lookup for names).
SELECT
    PULocationID AS pickup_zone_id,
    COUNT(*) AS trip_count,
    ROUND(AVG(trip_distance), 2) AS avg_trip_miles
FROM taxi_trips
WHERE PULocationID IS NOT NULL AND trip_distance > 0
GROUP BY 1
ORDER BY trip_count DESC
LIMIT 20;
