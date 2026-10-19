-- Every public page's search and sharing settings ('seo_<page>',
-- docs/architecture/cms-domain.md): the title Google shows, the
-- description, the title, description and picture (with its alt text) a
-- shared link shows, and whether search engines may index the page. Each
-- text empty means the site's own (in code); no picture, the site's
-- generated one. One row per page with a tab in the admin's CMS.

ALTER TABLE public.site_content DROP CONSTRAINT site_content_key_check;
ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_key_check
  CHECK (key = ANY (ARRAY[
    'home'::text, 'rooms'::text, 'support_areas'::text, 'home_sections'::text,
    'first_steps'::text, 'home_headers'::text, 'why_us'::text,
    'newsletter_band'::text, 'home_location'::text, 'crisis_help'::text,
    'home_thoughts'::text, 'home_story'::text,
    'seo_home'::text,
    'seo_about'::text,
    'seo_offer'::text,
    'seo_specialists'::text,
    'seo_prices'::text,
    'seo_rooms'::text,
    'seo_workshops'::text,
    'seo_education'::text,
    'seo_contact'::text,
    'seo_booking'::text,
    'seo_crisis_help'::text,
    'seo_privacy'::text,
    'seo_terms'::text,
    'seo_cookies'::text
  ]));

-- One page's settings: every field there, of its type and length (the
-- contract, pageSeoContentSchema, checks the rest).
CREATE OR REPLACE FUNCTION private.page_seo_is_valid(p_payload jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT COALESCE(
    jsonb_typeof(p_payload) = 'object'
    AND jsonb_typeof(p_payload -> 'title') = 'string'
    AND length(p_payload ->> 'title') <= 120
    AND jsonb_typeof(p_payload -> 'description') = 'string'
    AND length(p_payload ->> 'description') <= 320
    AND jsonb_typeof(p_payload -> 'ogTitle') = 'string'
    AND length(p_payload ->> 'ogTitle') <= 120
    AND jsonb_typeof(p_payload -> 'ogDescription') = 'string'
    AND length(p_payload ->> 'ogDescription') <= 320
    AND jsonb_typeof(p_payload -> 'ogImagePath') IN ('string', 'null')
    AND length(coalesce(p_payload ->> 'ogImagePath', '')) <= 300
    AND jsonb_typeof(p_payload -> 'ogImageAlt') = 'string'
    AND length(p_payload ->> 'ogImageAlt') <= 200
    AND jsonb_typeof(p_payload -> 'noindex') = 'boolean',
    false
  );
$$;

-- The payload check, its whole body (as 20261019110000_home_thought_pairs.sql
-- left it): the pages' settings after the rest.
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
    ELSE
      -- Every page's search and sharing settings ('seo_<page>').
      p_key LIKE 'seo\_%' AND private.page_seo_is_valid(p_payload)
  END, false);
$$;

-- Empty settings to start from (the site's own everywhere); nothing is
-- published, so the pages keep their titles until the admin publishes.
INSERT INTO public.site_content (key, draft_payload)
VALUES
  ('seo_home', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_about', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_offer', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_specialists', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_prices', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_rooms', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_workshops', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_education', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_contact', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_booking', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_crisis_help', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_privacy', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_terms', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb),
  ('seo_cookies', '{"title": "", "description": "", "ogTitle": "", "ogDescription": "", "ogImagePath": null, "ogImageAlt": "", "noindex": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;
