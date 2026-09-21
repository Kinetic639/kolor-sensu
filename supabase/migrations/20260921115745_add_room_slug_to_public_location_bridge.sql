-- Extends the public room -> location bridge (see
-- 20260921111816_public_room_location_bridge.sql) to also return the
-- room's own slug. /gabinety/[slug] needs a stable identifier and
-- rooms.slug is the domain's existing one -- it was simply not exposed to
-- anon yet. Still no broader anon grant on `rooms` itself; still the same
-- narrow, additive SECURITY DEFINER pattern.
--
-- Postgres does not allow CREATE OR REPLACE to change a function's return
-- shape, so this drops and recreates rather than replacing in place.
DROP FUNCTION public.list_public_room_locations();

CREATE FUNCTION public.list_public_room_locations()
RETURNS TABLE (
  room_id uuid,
  room_slug text,
  location_id uuid,
  location_name text,
  location_slug text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT
    rooms.id AS room_id,
    rooms.slug AS room_slug,
    locations.id AS location_id,
    locations.name AS location_name,
    locations.slug AS location_slug
  FROM public.rooms
  JOIN public.locations ON locations.id = rooms.location_id
  WHERE rooms.active
    AND rooms.publicly_visible
    AND locations.active
    AND locations.publicly_visible;
$$;

REVOKE ALL ON FUNCTION public.list_public_room_locations() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_public_room_locations()
TO anon, authenticated, service_role;
