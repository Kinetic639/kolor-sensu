-- Home → four new sections (docs/architecture/cms-domain.md):
--   'why_us'           "Dlaczego my": whether it shows and 2–4 facts;
--   'newsletter_band'  the newsletter band: whether it shows;
--   'home_location'    "Gdzie jesteśmy": whether it shows (the address,
--                      phone, e-mail and hours are the company details);
--   'crisis_help'      the crisis strip: its words and the numbers to call
--                      (always shown).
-- The headers gain one each for "Dlaczego my", the newsletter band and
-- "Gdzie jesteśmy".

ALTER TABLE public.site_content DROP CONSTRAINT site_content_key_check;
ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_key_check
  CHECK (key = ANY (ARRAY[
    'home'::text, 'rooms'::text, 'support_areas'::text, 'home_sections'::text,
    'first_steps'::text, 'home_headers'::text, 'why_us'::text,
    'newsletter_band'::text, 'home_location'::text, 'crisis_help'::text
  ]));

-- A header of plain words, every one in the default colour (as
-- plainHeader in the contracts).
CREATE FUNCTION pg_temp.plain_header(
  p_eyebrow text, p_title text, p_description text, p_cta jsonb
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'eyebrow', jsonb_build_object('text', p_eyebrow, 'tone', 'default'),
    'title', jsonb_build_array(
      jsonb_build_array(jsonb_build_object('text', p_title, 'tone', 'default'))
    ),
    'description', CASE
      WHEN coalesce(p_description, '') = '' THEN '[]'::jsonb
      ELSE jsonb_build_array(
        jsonb_build_object('text', p_description, 'link', NULL)
      )
    END,
    'cta', coalesce(p_cta, 'null'::jsonb)
  );
$$;

-- The new headers, as defaultHomeHeaders has them, into the draft and the
-- published headers alike (before the check requires them; extra keys
-- pass the current one).
CREATE FUNCTION pg_temp.new_headers()
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'whyUs', pg_temp.plain_header(
      'Dlaczego my', 'Bezpieczna przestrzeń i doświadczony zespół', NULL, NULL
    ),
    'newsletter', pg_temp.plain_header(
      'Newsletter', 'Bądźmy w kontakcie',
      'Artykuły, warsztaty i nowości z centrum, raz w miesiącu.', NULL
    ),
    'location', pg_temp.plain_header(
      'Gdzie jesteśmy', 'Odwiedź nas', NULL,
      '{"label": "Kontakt", "href": "/kontakt", "style": "arrow"}'
    )
  );
$$;

UPDATE public.site_content
SET
  draft_payload = pg_temp.new_headers() || draft_payload,
  published_payload = CASE
    WHEN published_payload IS NULL THEN NULL
    ELSE pg_temp.new_headers() || published_payload
  END
WHERE key = 'home_headers';

-- The payload check, its whole body: the four new keys, and the headers'
-- three new sections.
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
    ELSE false
  END, false);
$$;

-- Drafts to start from, as the contracts' defaults; nothing is published,
-- so the site shows those defaults until the admin publishes.
INSERT INTO public.site_content (key, draft_payload)
VALUES
  (
    'why_us',
    '{"visible": false, "facts": [
      {"title": "Superwizja", "text": "Każdy specjalista pracuje pod regularną superwizją."},
      {"title": "Poufność", "text": "To, o czym mówisz w gabinecie, zostaje między Tobą a specjalistą."},
      {"title": "Doświadczenie", "text": "Zespół z wieloletnią praktyką, który stale się szkoli."},
      {"title": "Kodeks etyczny", "text": "Pracujemy zgodnie z kodeksami etyki zawodowej."}
    ]}'::jsonb
  ),
  ('newsletter_band', '{"visible": false}'::jsonb),
  ('home_location', '{"visible": true}'::jsonb),
  (
    'crisis_help',
    '{"heading": "Potrzebujesz pomocy teraz?",
      "text": "Jeśli Twoje życie jest w zagrożeniu, dzwoń pod 112. Możesz też zadzwonić na bezpłatne linie wsparcia:",
      "lines": [
        {"number": "112", "label": "Numer alarmowy", "detail": "gdy życie jest w bezpośrednim zagrożeniu"},
        {"number": "800 702 222", "label": "Centrum Wsparcia dla Osób w Stanie Kryzysu Psychicznego", "detail": "całodobowo, bezpłatnie"},
        {"number": "116 123", "label": "Kryzysowy Telefon Zaufania", "detail": "dla dorosłych"},
        {"number": "116 111", "label": "Telefon Zaufania dla Dzieci i Młodzieży", "detail": "całodobowo"}
      ]}'::jsonb
  )
ON CONFLICT (key) DO NOTHING;
