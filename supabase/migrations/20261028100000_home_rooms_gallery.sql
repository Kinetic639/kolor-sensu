-- The room banner shares the homepage's existing content and publish action.
-- Missing gallery settings keep the previous automatic published-room source.
CREATE FUNCTION private.home_rooms_gallery_is_valid(p_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
  gallery jsonb;
  photo jsonb;
BEGIN
  IF p_payload IS NULL OR NOT (p_payload ? 'roomsPeek') THEN RETURN true; END IF;
  gallery := p_payload -> 'roomsPeek';
  IF jsonb_typeof(gallery) IS DISTINCT FROM 'object'
    OR jsonb_typeof(gallery -> 'visible') IS DISTINCT FROM 'boolean'
    OR coalesce(gallery ->> 'source', '') NOT IN ('auto', 'manual')
    OR jsonb_typeof(gallery -> 'photos') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  IF jsonb_array_length(gallery -> 'photos') > 12 THEN RETURN false; END IF;
  IF EXISTS (SELECT 1 FROM jsonb_object_keys(gallery) AS k WHERE k <> ALL(ARRAY['visible','source','photos'])) THEN RETURN false; END IF;
  FOR photo IN SELECT value FROM jsonb_array_elements(gallery -> 'photos') LOOP
    IF jsonb_typeof(photo) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
    IF coalesce(photo ->> 'source', '') NOT IN ('room', 'upload')
      OR jsonb_typeof(photo -> 'imagePath') IS DISTINCT FROM 'string'
      OR length(btrim(photo ->> 'imagePath')) NOT BETWEEN 1 AND 2048
      OR jsonb_typeof(photo -> 'imageAlt') IS DISTINCT FROM 'string'
      OR length(btrim(photo ->> 'imageAlt')) NOT BETWEEN 1 AND 200
      OR jsonb_typeof(photo -> 'caption') IS DISTINCT FROM 'string'
      OR length(btrim(photo ->> 'caption')) NOT BETWEEN 1 AND 100
      OR jsonb_typeof(photo -> 'description') IS DISTINCT FROM 'string'
      OR length(photo ->> 'description') > 200 THEN RETURN false; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(photo) AS k WHERE k <> ALL(ARRAY['source','imagePath','imageAlt','caption','description'])) THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END;
$$;
REVOKE ALL ON FUNCTION private.home_rooms_gallery_is_valid(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.home_rooms_gallery_is_valid(jsonb) TO authenticated, service_role;
ALTER TABLE public.site_content ADD CONSTRAINT site_content_home_rooms_gallery
  CHECK (key <> 'home_sections' OR (
    private.home_rooms_gallery_is_valid(draft_payload)
    AND private.home_rooms_gallery_is_valid(published_payload)
  ));
