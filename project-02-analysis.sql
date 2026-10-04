-- Project 02: Los Angeles Service Operations
-- Source: City of Los Angeles MyLA311 Service Request Data 2024
-- Portfolio transformation example after ingesting the public source table.

WITH cleaned AS (
  SELECT
    TRIM(request_type) AS request_type,
    NULLIF(TRIM(owner),'') AS owner,
    TRIM(status) AS status,
    NULLIF(TRIM(request_source),'') AS request_source,
    CAST(created_date AS TIMESTAMP) AS created_date,
    CAST(closed_date AS TIMESTAMP) AS closed_date,
    CAST(latitude AS DECIMAL(9,6)) AS latitude,
    CAST(longitude AS DECIMAL(9,6)) AS longitude
  FROM myla311_raw
  WHERE created_date IS NOT NULL
), derived AS (
  SELECT *,
    EXTRACT(EPOCH FROM (closed_date-created_date))/3600.0 AS resolution_hours,
    EXTRACT(DOW FROM created_date) AS created_dow,
    EXTRACT(HOUR FROM created_date) AS created_hour,
    CASE
      WHEN closed_date IS NULL THEN 'Open / unresolved'
      WHEN closed_date < created_date THEN 'Invalid date sequence'
      WHEN closed_date-created_date <= INTERVAL '24 hours' THEN '<= 24 hours'
      WHEN closed_date-created_date <= INTERVAL '72 hours' THEN '24-72 hours'
      ELSE '> 72 hours' END AS resolution_band
  FROM cleaned
)
SELECT request_type, COUNT(*) AS requests,
       AVG(resolution_hours) AS avg_resolution_hours
FROM derived
WHERE resolution_hours >= 0
GROUP BY request_type
ORDER BY requests DESC;
