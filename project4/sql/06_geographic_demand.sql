-- Geographic demand: join official TLC taxi-zone reference data.
-- taxi_zones view reads the official taxi_zone_lookup.csv.
SELECT
  z.Borough AS borough,
  z.Zone AS zone_name,
  t.PULocationID AS pickup_zone_id,
  COUNT(*) AS trip_count
FROM taxi_trips t
JOIN taxi_zones z
  ON t.PULocationID = z.LocationID
WHERE t.trip_distance > 0
GROUP BY 1, 2, 3
ORDER BY trip_count DESC
LIMIT 25;
