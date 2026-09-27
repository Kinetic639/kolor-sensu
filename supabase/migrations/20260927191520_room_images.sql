-- Photos of a room for its public profile: up to five, one marked as the
-- main photo, in an order the admin chooses. Files live in the public
-- `room-media` bucket (they are shown on the public site); rows and every
-- change go through admin-only functions that keep the rules:
--   * at most 5 photos per room,
--   * exactly one main photo while the room has any,
--   * positions 0..n-1 without gaps.

CREATE TABLE public.room_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.rooms (id) ON DELETE CASCADE,
  storage_path text NOT NULL UNIQUE,
  position smallint NOT NULL,
  is_main boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT room_images_position_range CHECK (position BETWEEN 0 AND 4),
  CONSTRAINT room_images_storage_path_in_room_folder CHECK (
    storage_path ~ '^[0-9a-f-]{36}/[a-zA-Z0-9_-]+\.(jpe?g|png|webp)$'
    AND split_part(storage_path, '/', 1) = room_id::text
  ),
  CONSTRAINT room_images_room_position_key UNIQUE (room_id, position)
    DEFERRABLE INITIALLY DEFERRED
);

CREATE UNIQUE INDEX room_images_one_main_per_room
ON public.room_images (room_id)
WHERE is_main;

CREATE TRIGGER set_room_images_updated_at
BEFORE UPDATE ON public.room_images
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

-- Anonymous visitors cannot read `rooms`; this checks it for them.
CREATE FUNCTION private.room_media_is_public(p_room_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.rooms AS room
    JOIN public.room_public_profiles AS profile ON profile.room_id = room.id
    WHERE room.id = p_room_id
      AND room.active
      AND room.publicly_visible
      AND profile.published
  );
$$;

REVOKE ALL ON FUNCTION private.room_media_is_public(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.room_media_is_public(uuid) TO anon, authenticated;

ALTER TABLE public.room_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_images FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.room_images FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.room_images TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.room_images TO service_role;

CREATE POLICY "Anyone can read photos of published rooms"
ON public.room_images
FOR SELECT
TO anon
USING (private.room_media_is_public(room_id));

CREATE POLICY "Signed-in users can read permitted room photos"
ON public.room_images
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR private.room_media_is_public(room_id)
);

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'room-media',
  'room-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

CREATE POLICY "Admins can upload room media"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'room-media'
  AND public.has_role('admin'::public.app_role)
);

CREATE POLICY "Admins can update room media"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'room-media' AND public.has_role('admin'::public.app_role))
WITH CHECK (bucket_id = 'room-media' AND public.has_role('admin'::public.app_role));

CREATE POLICY "Admins can delete room media"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'room-media' AND public.has_role('admin'::public.app_role));

-- Admins also list and read objects through the API (e.g. removing a file).
CREATE POLICY "Admins can read room media objects"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'room-media' AND public.has_role('admin'::public.app_role));

CREATE FUNCTION private.require_admin()
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Admin role required' USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION private.require_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.require_admin() TO authenticated;

CREATE FUNCTION public.add_room_image(p_room_id uuid, p_storage_path text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  image_count integer;
  new_id uuid;
BEGIN
  PERFORM private.require_admin();

  -- Serialises concurrent uploads to the same room.
  PERFORM 1 FROM public.rooms WHERE id = p_room_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Room not found' USING ERRCODE = 'P0002';
  END IF;

  SELECT count(*) INTO image_count
  FROM public.room_images
  WHERE room_id = p_room_id;

  IF image_count >= 5 THEN
    RAISE EXCEPTION 'A room can have at most 5 photos' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.room_images (room_id, storage_path, position, is_main)
  VALUES (p_room_id, p_storage_path, image_count, image_count = 0)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

-- Returns the removed file's path so the caller can delete it from storage.
CREATE FUNCTION public.remove_room_image(p_image_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  removed public.room_images%ROWTYPE;
BEGIN
  PERFORM private.require_admin();

  DELETE FROM public.room_images
  WHERE id = p_image_id
  RETURNING * INTO removed;

  IF removed.id IS NULL THEN
    RAISE EXCEPTION 'Room photo not found' USING ERRCODE = 'P0002';
  END IF;

  -- Close the gap in the order.
  UPDATE public.room_images
  SET position = position - 1
  WHERE room_id = removed.room_id
    AND position > removed.position;

  -- The first remaining photo becomes the main one.
  IF removed.is_main THEN
    UPDATE public.room_images
    SET is_main = true
    WHERE room_id = removed.room_id
      AND position = 0;
  END IF;

  RETURN removed.storage_path;
END;
$$;

CREATE FUNCTION public.reorder_room_images(p_room_id uuid, p_image_ids uuid[])
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM private.require_admin();

  IF p_image_ids IS NULL
    OR cardinality(p_image_ids) <> (
      SELECT count(*) FROM public.room_images WHERE room_id = p_room_id
    )
    OR cardinality(p_image_ids) <> (
      SELECT count(DISTINCT image_id)
      FROM unnest(p_image_ids) AS ids(image_id)
      JOIN public.room_images AS image
        ON image.id = ids.image_id AND image.room_id = p_room_id
    )
  THEN
    RAISE EXCEPTION 'The new order must list every photo of the room once'
      USING ERRCODE = '22023';
  END IF;

  UPDATE public.room_images AS image
  SET position = ordered.new_position - 1
  FROM unnest(p_image_ids) WITH ORDINALITY AS ordered(image_id, new_position)
  WHERE image.id = ordered.image_id;
END;
$$;

CREATE FUNCTION public.set_room_main_image(p_image_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_room_id uuid;
BEGIN
  PERFORM private.require_admin();

  SELECT room_id INTO target_room_id
  FROM public.room_images
  WHERE id = p_image_id;

  IF target_room_id IS NULL THEN
    RAISE EXCEPTION 'Room photo not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.room_images
  SET is_main = false
  WHERE room_id = target_room_id AND is_main AND id <> p_image_id;

  UPDATE public.room_images
  SET is_main = true
  WHERE id = p_image_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_room_image(uuid, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.remove_room_image(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reorder_room_images(uuid, uuid[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_room_main_image(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_room_image(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.remove_room_image(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reorder_room_images(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_room_main_image(uuid) TO authenticated;
