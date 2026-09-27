-- The public rooms page is organised by location: each location (the
-- building) describes itself and its amenities (lift, parking, entrance…),
-- and lists its rooms with their photos and a rich text description.
--
-- 1. Locations get a public description, amenities and accessibility notes.
-- 2. A room's long description becomes a RichTextDocument (jsonb), like a
--    specialist's bio (docs/architecture/rich-text-platform.md). Room-level
--    amenities and accessibility notes stay in the table but are no longer
--    edited or shown: those describe the building.
-- 3. Visitors cannot read `rooms`, so list_published_room_placements tells
--    the site which published room belongs to which location, in order.

ALTER TABLE public.locations
  ADD COLUMN public_description text,
  ADD COLUMN amenities text[] NOT NULL DEFAULT '{}',
  ADD COLUMN accessibility_notes text,
  ADD CONSTRAINT locations_public_description_length CHECK (
    public_description IS NULL OR char_length(public_description) <= 1000
  ),
  ADD CONSTRAINT locations_amenities_count CHECK (
    cardinality(amenities) <= 30 AND array_position(amenities, NULL) IS NULL
  ),
  ADD CONSTRAINT locations_accessibility_notes_length CHECK (
    accessibility_notes IS NULL OR char_length(accessibility_notes) <= 1000
  );

CREATE FUNCTION private.plain_text_to_rich_text(value text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT CASE
    WHEN coalesce(trim(value), '') = '' THEN
      '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb
    ELSE jsonb_build_object(
      'type', 'doc',
      'content', (
        SELECT jsonb_agg(
          jsonb_build_object(
            'type', 'paragraph',
            'content', jsonb_build_array(
              jsonb_build_object('type', 'text', 'text', trim(line))
            )
          )
          ORDER BY position
        )
        FROM regexp_split_to_table(value, E'\\n+') WITH ORDINALITY AS lines(line, position)
        WHERE trim(line) <> ''
      )
    )
  END;
$$;

ALTER TABLE public.room_public_profiles
  DROP CONSTRAINT room_public_profiles_long_description_length,
  ALTER COLUMN long_description TYPE jsonb
    USING private.plain_text_to_rich_text(long_description),
  ALTER COLUMN long_description SET DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  ALTER COLUMN long_description SET NOT NULL,
  ADD CONSTRAINT room_public_profiles_long_description_document CHECK (
    jsonb_typeof(long_description) = 'object'
    AND long_description ->> 'type' = 'doc'
    AND octet_length(long_description::text) <= 500000
  );

DROP FUNCTION private.plain_text_to_rich_text(text);

CREATE FUNCTION public.list_published_room_placements()
RETURNS TABLE (room_id uuid, location_id uuid, sort_order integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT room.id, room.location_id, room.sort_order
  FROM public.rooms AS room
  JOIN public.room_public_profiles AS profile ON profile.room_id = room.id
  JOIN public.locations AS location ON location.id = room.location_id
  WHERE room.active
    AND room.publicly_visible
    AND profile.published
    AND location.active
    AND location.publicly_visible
  ORDER BY room.sort_order, profile.display_name;
$$;

REVOKE ALL ON FUNCTION public.list_published_room_placements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.list_published_room_placements() TO anon, authenticated;
