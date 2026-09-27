-- Bridges the public room_public_profiles table (anon-readable, no
-- location_id of its own) to its room's location, without granting anon
-- any direct access to the `rooms` table (still zero grant there, by
-- design -- see rooms_resource_domain_foundation.sql). Returns location
-- context only for rooms that are currently publicly exposable (active +
-- publicly_visible, matching the existing room_is_publicly_exposable
-- guard) belonging to an active + publicly_visible location.
--
-- Set-returning (all public rooms in one call), not a per-room lookup:
-- a public page resolving location context for every public room needs
-- exactly one round trip here, never one call per room.
--
-- Lives in `public` (not `private`, unlike room_is_publicly_exposable)
-- because it must be callable via PostgREST .rpc() from client code --
-- private-schema functions are never exposed as RPC endpoints in this
-- codebase, only used as internal RLS-policy helpers.
CREATE FUNCTION public.list_public_room_locations()
RETURNS TABLE (
  room_id uuid,
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
