-- Optional primary e-book for compact mobile compositions. Legacy payloads remain valid.
-- Optional education compositions in home_story. Keep the existing payload
-- validator and permissions intact; validate the new metadata independently.
CREATE OR REPLACE FUNCTION private.home_story_media_is_valid(p_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
  step jsonb;
  media jsonb;
  maximum integer;
BEGIN
  IF p_payload IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(p_payload -> 'steps') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  FOR step IN SELECT value FROM jsonb_array_elements(p_payload -> 'steps') LOOP
    IF NOT step ? 'media' THEN CONTINUE; END IF;
    media := step -> 'media';
    IF jsonb_typeof(media) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
    IF media ->> 'type' = 'image' THEN
      IF EXISTS (SELECT 1 FROM jsonb_object_keys(media) AS k WHERE k <> 'type') THEN RETURN false; END IF;
      CONTINUE;
    END IF;
    maximum := CASE media ->> 'type' WHEN 'articles' THEN 3 WHEN 'ebooks' THEN 2 WHEN 'workshops' THEN 1 ELSE 0 END;
    IF maximum = 0 OR coalesce(media ->> 'source', '') NOT IN ('auto','manual') THEN RETURN false; END IF;
    IF EXISTS (SELECT 1 FROM jsonb_object_keys(media) AS k WHERE k <> ALL(CASE WHEN media ->> 'type' = 'ebooks' THEN ARRAY['type','source','ids','mobilePrimaryId'] ELSE ARRAY['type','source','ids'] END)) THEN RETURN false; END IF;
    IF jsonb_typeof(media -> 'ids') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(media -> 'ids') > maximum
      OR (media ->> 'source' = 'manual' AND jsonb_array_length(media -> 'ids') = 0) THEN RETURN false; END IF;
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(media -> 'ids') AS id
      WHERE jsonb_typeof(id) IS DISTINCT FROM 'string'
        OR (id #>> '{}') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
    ) THEN RETURN false; END IF;
    IF (SELECT count(DISTINCT id) FROM jsonb_array_elements(media -> 'ids') AS id)
      <> jsonb_array_length(media -> 'ids') THEN RETURN false; END IF;
    IF media ? 'mobilePrimaryId' AND media -> 'mobilePrimaryId' <> 'null'::jsonb THEN
      IF jsonb_typeof(media -> 'mobilePrimaryId') IS DISTINCT FROM 'string'
        OR (media ->> 'mobilePrimaryId') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' THEN RETURN false; END IF;
      IF media ->> 'source' = 'manual' AND NOT (media -> 'ids' @> jsonb_build_array(media ->> 'mobilePrimaryId')) THEN RETURN false; END IF;
    END IF;
  END LOOP;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION private.home_story_media_is_valid(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.home_story_media_is_valid(jsonb) TO authenticated, service_role;
