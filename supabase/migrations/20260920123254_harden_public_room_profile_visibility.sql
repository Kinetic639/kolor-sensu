CREATE OR REPLACE FUNCTION private.room_is_publicly_exposable(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rooms
    WHERE id = p_room_id
      AND active
      AND publicly_visible
  );
$$;

REVOKE ALL ON FUNCTION private.room_is_publicly_exposable(uuid)
FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.room_is_publicly_exposable(uuid)
TO anon, authenticated, service_role;

DROP POLICY "Anon can read published room public profiles"
ON public.room_public_profiles;

CREATE POLICY "Anon can read published room public profiles"
ON public.room_public_profiles
FOR SELECT
TO anon
USING (
  published
  AND (SELECT private.room_is_publicly_exposable(room_id))
);
