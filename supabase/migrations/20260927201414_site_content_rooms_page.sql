-- A second CMS page: /gabinety. Its content is typed per key (see
-- @repo/contracts/cms): the rooms page only switches its optional sections,
-- "Co u nas znajdziesz" and the locations' descriptions, on and off. Both
-- start on, so the site looks the same until the admin changes them.

ALTER TABLE public.site_content
  DROP CONSTRAINT site_content_key_check,
  DROP CONSTRAINT site_content_draft_payload_shape,
  DROP CONSTRAINT site_content_published_payload_shape;

CREATE FUNCTION private.site_content_payload_is_valid(p_key text, p_payload jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT jsonb_typeof(p_payload) = 'object' AND CASE p_key
    WHEN 'home' THEN p_payload ? 'heading' AND p_payload ? 'body'
    WHEN 'rooms' THEN
      jsonb_typeof(p_payload -> 'showAmenitiesSection') = 'boolean'
      AND jsonb_typeof(p_payload -> 'showLocationDetails') = 'boolean'
    ELSE false
  END;
$$;

ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_key_check CHECK (key IN ('home', 'rooms')),
  ADD CONSTRAINT site_content_draft_payload_shape CHECK (
    private.site_content_payload_is_valid(key, draft_payload)
  ),
  ADD CONSTRAINT site_content_published_payload_shape CHECK (
    published_payload IS NULL
    OR private.site_content_payload_is_valid(key, published_payload)
  );

INSERT INTO public.site_content (key, draft_payload, published_payload, published_at)
VALUES (
  'rooms',
  '{"showAmenitiesSection": true, "showLocationDetails": true}',
  '{"showAmenitiesSection": true, "showLocationDetails": true}',
  now()
)
ON CONFLICT (key) DO NOTHING;
