-- A page's header takes a section's header's shape (docs/architecture/
-- cms-domain.md): the eyebrow with its colour, the title in lines of
-- coloured words (two lines at most: the page's h1), the description with
-- at most one link, and no call to action. Until now it was four words
-- (eyebrow, heading, accent, lead); every page with one is rewritten,
-- draft and published, keeping its look: the eyebrow pink, the heading
-- the title's first line, the accent its second in green, the lead the
-- description.
--   'about_page', 'specialists_page', 'contact_page', 'offer_page',
--   'prices_page' (intro), 'rooms' (intro, when saved).

-- A page's header: a section's header with a title of one or two lines,
-- the first not blank, and no call to action.
CREATE OR REPLACE FUNCTION private.page_intro_is_valid(p_intro jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT COALESCE(
    private.section_header_is_valid(p_intro)
    AND jsonb_typeof(p_intro -> 'cta') = 'null'
    AND btrim(
      (
        SELECT string_agg(segment ->> 'text', '')
        FROM jsonb_array_elements(p_intro -> 'title' -> 0) AS segment
      )
    ) <> '',
    false
  );
$$;

-- The four words as a header (only where they still are four words).
CREATE FUNCTION private.page_intro_as_header(p_intro jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_intro) = 'object' AND p_intro ? 'heading' THEN
      jsonb_build_object(
        'eyebrow', jsonb_build_object(
          'text', coalesce(p_intro ->> 'eyebrow', ''),
          'tone', CASE
            WHEN coalesce(p_intro ->> 'eyebrow', '') <> '' THEN 'pink'
            ELSE 'default'
          END
        ),
        'title',
          jsonb_build_array(jsonb_build_array(jsonb_build_object(
            'text', p_intro ->> 'heading', 'tone', 'default'
          )))
          || CASE
            WHEN coalesce(p_intro ->> 'accent', '') <> '' THEN
              jsonb_build_array(jsonb_build_array(jsonb_build_object(
                'text', p_intro ->> 'accent', 'tone', 'green'
              )))
            ELSE '[]'::jsonb
          END,
        'description', CASE
          WHEN coalesce(p_intro ->> 'lead', '') <> '' THEN
            jsonb_build_array(jsonb_build_object(
              'text', p_intro ->> 'lead', 'link', NULL
            ))
          ELSE '[]'::jsonb
        END,
        'cta', 'null'::jsonb
      )
    ELSE p_intro
  END;
$$;

UPDATE public.site_content
SET draft_payload = jsonb_set(
  draft_payload, '{intro}', private.page_intro_as_header(draft_payload -> 'intro')
)
WHERE key IN (
    'about_page', 'specialists_page', 'contact_page', 'offer_page',
    'prices_page', 'rooms'
  )
  AND draft_payload ? 'intro';

UPDATE public.site_content
SET published_payload = jsonb_set(
  published_payload, '{intro}',
  private.page_intro_as_header(published_payload -> 'intro')
)
WHERE key IN (
    'about_page', 'specialists_page', 'contact_page', 'offer_page',
    'prices_page', 'rooms'
  )
  AND published_payload ? 'intro';

DROP FUNCTION private.page_intro_as_header(jsonb);
