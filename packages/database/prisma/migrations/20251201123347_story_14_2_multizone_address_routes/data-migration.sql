-- Story 14.2: Data migration for existing routes
-- Migrate legacy fromZoneId/toZoneId to new junction tables

-- Insert origin zones from legacy fromZoneId
INSERT INTO zone_route_origin_zone (id, "zoneRouteId", "zoneId")
SELECT 
  gen_random_uuid()::text,
  id,
  "fromZoneId"
FROM zone_route
WHERE "fromZoneId" IS NOT NULL
ON CONFLICT ("zoneRouteId", "zoneId") DO NOTHING;

-- Insert destination zones from legacy toZoneId
INSERT INTO zone_route_destination_zone (id, "zoneRouteId", "zoneId")
SELECT 
  gen_random_uuid()::text,
  id,
  "toZoneId"
FROM zone_route
WHERE "toZoneId" IS NOT NULL
ON CONFLICT ("zoneRouteId", "zoneId") DO NOTHING;

-- Verify migration
-- SELECT 
--   (SELECT COUNT(*) FROM zone_route WHERE "fromZoneId" IS NOT NULL) as routes_with_from,
--   (SELECT COUNT(*) FROM zone_route_origin_zone) as origin_zones,
--   (SELECT COUNT(*) FROM zone_route WHERE "toZoneId" IS NOT NULL) as routes_with_to,
--   (SELECT COUNT(*) FROM zone_route_destination_zone) as destination_zones;
