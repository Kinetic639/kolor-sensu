-- Home → "Pierwszy krok": four steps of starting therapy on a band that
-- paints itself as the page scrolls; the admin sets whether it shows, its
-- words and the steps' names and sentences in the CMS
-- (docs/architecture/cms-domain.md). One more fixed site_content key.

ALTER TABLE public.site_content DROP CONSTRAINT site_content_key_check;
ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_key_check
  CHECK (key = ANY (ARRAY[
    'home'::text, 'rooms'::text, 'support_areas'::text, 'home_sections'::text,
    'first_steps'::text
  ]));

-- Its payload: { "visible": boolean, "heading": string, "steps": [four
-- objects, each with a title and a text] }. Lengths and unknown fields are
-- checked by firstStepsContentSchema (packages/contracts/src/cms.ts).
CREATE OR REPLACE FUNCTION private.site_content_payload_is_valid(p_key text, p_payload jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT COALESCE(jsonb_typeof(p_payload) = 'object' AND CASE p_key
    WHEN 'home' THEN p_payload ? 'heading' AND p_payload ? 'body'
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
      AND jsonb_typeof(p_payload -> 'heading') = 'string'
      AND jsonb_typeof(p_payload -> 'steps') = 'array'
      AND jsonb_array_length(p_payload -> 'steps') = 4
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(p_payload -> 'steps') AS step
        WHERE jsonb_typeof(step) <> 'object'
          OR jsonb_typeof(step -> 'title') IS DISTINCT FROM 'string'
          OR jsonb_typeof(step -> 'text') IS DISTINCT FROM 'string'
      )
    ELSE false
  END, false);
$$;

-- A draft to start from, the site's own words; nothing is published, so
-- the site shows the band with these until the admin publishes.
INSERT INTO public.site_content (key, draft_payload)
VALUES (
  'first_steps',
  '{"visible": true, "eyebrow": "Pierwszy krok", "heading": "Od pierwszego kontaktu do wsparcia na dłużej", "description": "", "steps": [
    {"title": "Kontakt", "text": "Umawiasz się na dogodny termin: telefonicznie, przez formularz lub online."},
    {"title": "Pierwsze spotkanie", "text": "Rozmawiamy o Twoich potrzebach, pytaniach i oczekiwaniach."},
    {"title": "Wspólny plan", "text": "Proponujemy możliwe formy wsparcia i dalsze kroki."},
    {"title": "Rozpoczęcie pracy", "text": "Zaczynamy proces terapeutyczny w Twoim tempie i w bezpiecznej atmosferze."}
  ]}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
