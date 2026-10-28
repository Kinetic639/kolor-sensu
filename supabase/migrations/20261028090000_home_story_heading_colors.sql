-- Optional slide-title colours. Existing plain titles remain valid; both
-- drafts and publications must keep the coloured words equal to the title.
CREATE FUNCTION private.home_story_headings_are_valid(p_payload jsonb)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO ''
AS $$
DECLARE
  step jsonb;
  segment jsonb;
  heading text;
BEGIN
  IF p_payload IS NULL THEN RETURN true; END IF;
  IF jsonb_typeof(p_payload -> 'steps') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
  FOR step IN SELECT value FROM jsonb_array_elements(p_payload -> 'steps') LOOP
    IF NOT step ? 'headingSegments' THEN CONTINUE; END IF;
    IF jsonb_typeof(step -> 'headingSegments') IS DISTINCT FROM 'array' THEN RETURN false; END IF;
    IF jsonb_array_length(step -> 'headingSegments') NOT BETWEEN 1 AND 80 THEN RETURN false; END IF;
    heading := '';
    FOR segment IN SELECT value FROM jsonb_array_elements(step -> 'headingSegments') LOOP
      IF jsonb_typeof(segment) IS DISTINCT FROM 'object' THEN RETURN false; END IF;
      IF jsonb_typeof(segment -> 'text') IS DISTINCT FROM 'string'
        OR length(segment ->> 'text') NOT BETWEEN 1 AND 80
        OR coalesce(segment ->> 'tone', '') NOT IN ('default', 'green', 'pink')
        OR EXISTS (SELECT 1 FROM jsonb_object_keys(segment) AS k WHERE k <> ALL(ARRAY['text','tone']))
      THEN RETURN false; END IF;
      heading := heading || (segment ->> 'text');
    END LOOP;
    IF length(heading) NOT BETWEEN 1 AND 80 OR btrim(heading) = ''
      OR heading IS DISTINCT FROM step ->> 'heading' THEN RETURN false; END IF;
  END LOOP;
  RETURN true;
END;
$$;

REVOKE ALL ON FUNCTION private.home_story_headings_are_valid(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.home_story_headings_are_valid(jsonb) TO authenticated, service_role;

ALTER TABLE public.site_content ADD CONSTRAINT site_content_story_heading_colors
  CHECK (key <> 'home_story' OR (
    private.home_story_headings_are_valid(draft_payload)
    AND private.home_story_headings_are_valid(published_payload)
  ));
