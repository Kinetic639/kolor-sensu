-- Home → which specialist sections show: "Poznaj nasz zespół" (the cards)
-- and "Z kim porozmawiasz" (one chosen specialist), switched by the admin
-- in the CMS (docs/architecture/cms-domain.md). One more fixed
-- site_content key; the spotlight's own photo goes to the public
-- site-media bucket (20261013150000_support_areas.sql).

ALTER TABLE public.site_content DROP CONSTRAINT site_content_key_check;
ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_key_check
  CHECK (key = ANY (ARRAY[
    'home'::text, 'rooms'::text, 'support_areas'::text, 'home_sections'::text
  ]));

-- Its payload: { "showSpecialists": boolean, "spotlight": { "visible":
-- boolean, ... } }. The texts, the specialist id and the photo are checked
-- by homeSectionsContentSchema (packages/contracts/src/cms.ts).
--
-- The whole check is now COALESCEd to false: a missing field made it NULL,
-- and a CHECK passes on NULL, so a payload without e.g. "areas" or
-- "showAmenitiesSection" used to be accepted.
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
    ELSE false
  END, false);
$$;

-- A draft to start from: the team shown, the spotlight hidden with its
-- usual texts ready. Nothing is published, so the site keeps showing the
-- team until the admin publishes.
INSERT INTO public.site_content (key, draft_payload)
VALUES (
  'home_sections',
  '{"showSpecialists": true, "spotlight": {"visible": false, "specialistId": null, "eyebrow": "Poznaj nasz zespół", "heading": "Z kim porozmawiasz", "description": "", "imagePath": null, "imageAlt": ""}}'::jsonb
)
ON CONFLICT (key) DO NOTHING;
