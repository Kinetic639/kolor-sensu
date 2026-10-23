-- Home → "Myśli, które się odmieniają" ('home_thoughts') keeps its thoughts
-- in pairs: every difficult thought with the kinder one it turns into
-- (docs/architecture/cms-domain.md), instead of two lists the site dealt
-- out in turn: { label, pairs: 8..40 × { negative, positive } }.

-- The payload check, its whole body: 'home_thoughts' requires the pairs,
-- each with both sides, and no longer the two lists. Redefined before the
-- rows change, so they are checked in their new shape.
CREATE OR REPLACE FUNCTION private.site_content_payload_is_valid(p_key text, p_payload jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT COALESCE(jsonb_typeof(p_payload) = 'object' AND CASE p_key
    WHEN 'home' THEN
      p_payload ? 'heading' AND p_payload ? 'body'
      AND (
        NOT p_payload ? 'points'
        OR (
          jsonb_typeof(p_payload -> 'points') = 'array'
          AND jsonb_array_length(p_payload -> 'points') <= 4
          AND NOT EXISTS (
            SELECT 1
            FROM jsonb_array_elements(p_payload -> 'points') AS point
            WHERE jsonb_typeof(point) <> 'object'
              OR jsonb_typeof(point -> 'label') IS DISTINCT FROM 'string'
              OR coalesce(point ->> 'icon', '') <> ALL (ARRAY[
                'leaf', 'users', 'house', 'heart', 'shield', 'sparkles'
              ])
          )
        )
      )
    WHEN 'rooms' THEN
      jsonb_typeof(p_payload -> 'showAmenitiesSection') = 'boolean'
      AND jsonb_typeof(p_payload -> 'showLocationDetails') = 'boolean'
    WHEN 'support_areas' THEN
      jsonb_typeof(p_payload -> 'areas') = 'array'
      AND jsonb_array_length(p_payload -> 'areas') BETWEEN 1 AND 10
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_payload -> 'areas') AS area
        WHERE jsonb_typeof(area) <> 'object'
          OR jsonb_typeof(area -> 'id') IS DISTINCT FROM 'string'
          OR jsonb_typeof(area -> 'title') IS DISTINCT FROM 'string'
          OR jsonb_typeof(area -> 'lead') IS DISTINCT FROM 'string'
      )
    WHEN 'home_sections' THEN
      jsonb_typeof(p_payload -> 'showSpecialists') = 'boolean'
      AND jsonb_typeof(p_payload -> 'spotlight') = 'object'
      AND jsonb_typeof(p_payload -> 'spotlight' -> 'visible') = 'boolean'
    WHEN 'first_steps' THEN
      jsonb_typeof(p_payload -> 'visible') = 'boolean'
      AND jsonb_typeof(p_payload -> 'steps') = 'array'
      AND jsonb_array_length(p_payload -> 'steps') = 4
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_payload -> 'steps') AS step
        WHERE jsonb_typeof(step) <> 'object'
          OR jsonb_typeof(step -> 'title') IS DISTINCT FROM 'string'
          OR jsonb_typeof(step -> 'text') IS DISTINCT FROM 'string'
      )
    WHEN 'home_headers' THEN
      (
        SELECT bool_and(private.section_header_is_valid(p_payload -> section))
        FROM unnest(ARRAY[
          'supportAreas', 'whyUs', 'firstSteps', 'spotlight', 'specialists',
          'rooms', 'story', 'newsletter', 'location'
        ]) AS section
      )
    WHEN 'why_us' THEN
      jsonb_typeof(p_payload -> 'visible') = 'boolean'
      AND jsonb_typeof(p_payload -> 'facts') = 'array'
      AND jsonb_array_length(p_payload -> 'facts') BETWEEN 2 AND 4
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_payload -> 'facts') AS fact
        WHERE jsonb_typeof(fact) <> 'object'
          OR jsonb_typeof(fact -> 'title') IS DISTINCT FROM 'string'
          OR jsonb_typeof(fact -> 'text') IS DISTINCT FROM 'string'
      )
    WHEN 'newsletter_band' THEN
      jsonb_typeof(p_payload -> 'visible') = 'boolean'
    WHEN 'home_location' THEN
      jsonb_typeof(p_payload -> 'visible') = 'boolean'
    WHEN 'crisis_help' THEN
      jsonb_typeof(p_payload -> 'heading') = 'string'
      AND jsonb_typeof(p_payload -> 'text') = 'string'
      AND jsonb_typeof(p_payload -> 'lines') = 'array'
      AND jsonb_array_length(p_payload -> 'lines') BETWEEN 1 AND 6
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_payload -> 'lines') AS line
        WHERE jsonb_typeof(line) <> 'object'
          OR jsonb_typeof(line -> 'label') IS DISTINCT FROM 'string'
          OR jsonb_typeof(line -> 'detail') IS DISTINCT FROM 'string'
          OR coalesce(line ->> 'number', '') !~ '^\+?[0-9][0-9 ]{2,19}$'
      )
    WHEN 'home_thoughts' THEN
      jsonb_typeof(p_payload -> 'label') = 'string'
      AND NOT p_payload ?| ARRAY['negative', 'positive']
      AND jsonb_typeof(p_payload -> 'pairs') = 'array'
      AND jsonb_array_length(p_payload -> 'pairs') BETWEEN 8 AND 40
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_payload -> 'pairs') AS pair
        WHERE jsonb_typeof(pair) <> 'object'
          OR jsonb_typeof(pair -> 'negative') IS DISTINCT FROM 'string'
          OR jsonb_typeof(pair -> 'positive') IS DISTINCT FROM 'string'
          OR btrim(pair ->> 'negative') = ''
          OR btrim(pair ->> 'positive') = ''
      )
    WHEN 'home_story' THEN
      jsonb_typeof(p_payload -> 'steps') = 'array'
      AND jsonb_array_length(p_payload -> 'steps') BETWEEN 1 AND 4
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_payload -> 'steps') AS step
        WHERE jsonb_typeof(step) <> 'object'
          OR jsonb_typeof(step -> 'heading') IS DISTINCT FROM 'string'
          OR jsonb_typeof(step -> 'text') IS DISTINCT FROM 'string'
      )
    ELSE false
  END, false);
$$;

-- Two lists into pairs, the way the site showed them (pairLegacyThoughts
-- in packages/contracts/src/cms.ts): the difficult thoughts dealt into two
-- rows, each row three times over, a kinder one under every word in turn,
-- counted across the band; each difficult thought keeps the kinder one its
-- first showing had. Kept (private) so supabase/tests can check it.
CREATE FUNCTION private.home_thoughts_as_pairs(p_payload jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT (p_payload - 'negative' - 'positive') || jsonb_build_object(
    'pairs',
    COALESCE((
      SELECT jsonb_agg(
        jsonb_build_object(
          'negative', btrim(thought.value),
          'positive', btrim(
            (p_payload -> 'positive') ->> (
              (CASE WHEN thought.ordinality % 2 = 1
                THEN (thought.ordinality - 1) / 2
                ELSE 3 * ceil(jsonb_array_length(p_payload -> 'negative') / 2.0)::int
                  + (thought.ordinality - 2) / 2
              END)::int % jsonb_array_length(p_payload -> 'positive')
            )
          )
        )
        ORDER BY thought.ordinality
      )
      FROM jsonb_array_elements_text(p_payload -> 'negative')
        WITH ORDINALITY AS thought (value, ordinality)
    ), '[]'::jsonb)
  );
$$;

UPDATE public.site_content
SET
  draft_payload = CASE
    WHEN jsonb_typeof(draft_payload -> 'negative') = 'array'
    THEN private.home_thoughts_as_pairs(draft_payload)
    ELSE draft_payload
  END,
  published_payload = CASE
    WHEN jsonb_typeof(published_payload -> 'negative') = 'array'
    THEN private.home_thoughts_as_pairs(published_payload)
    ELSE published_payload
  END
WHERE key = 'home_thoughts';
