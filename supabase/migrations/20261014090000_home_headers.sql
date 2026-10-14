-- Home → the sections' headers (eyebrow, title, description, call to
-- action), edited in the CMS as words and colours only; each section's
-- markup stays code's (docs/architecture/cms-domain.md). One more fixed
-- site_content key, 'home_headers': one header per homepage section.
--
-- "Pierwszy krok" and "Z kim porozmawiasz" had their eyebrow, heading and
-- description in their own payloads; they move here (draft and published
-- alike, so the site shows the same words after this as before), and leave
-- those payloads.

ALTER TABLE public.site_content DROP CONSTRAINT site_content_key_check;
ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_key_check
  CHECK (key = ANY (ARRAY[
    'home'::text, 'rooms'::text, 'support_areas'::text, 'home_sections'::text,
    'first_steps'::text, 'home_headers'::text
  ]));

-- One header's shape: an eyebrow object, a title of one or two lines (each
-- a non-empty list of { text, tone } runs), a description list of
-- { text, link } runs and a call to action or null; colours and styles
-- from the fixed lists. Lengths, pages and unknown fields are checked by
-- sectionHeaderSchema (packages/contracts/src/section-header.ts).
CREATE OR REPLACE FUNCTION private.section_header_is_valid(p_header jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT COALESCE(
    jsonb_typeof(p_header) = 'object'
    AND jsonb_typeof(p_header -> 'eyebrow') = 'object'
    AND jsonb_typeof(p_header -> 'eyebrow' -> 'text') = 'string'
    AND (p_header -> 'eyebrow' ->> 'tone') IN ('default', 'green', 'pink')
    AND jsonb_typeof(p_header -> 'title') = 'array'
    AND jsonb_array_length(p_header -> 'title') BETWEEN 1 AND 2
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_header -> 'title') AS line
      WHERE jsonb_typeof(line) <> 'array'
        OR jsonb_array_length(line) = 0
        OR EXISTS (
          SELECT 1
          FROM jsonb_array_elements(line) AS segment
          WHERE jsonb_typeof(segment -> 'text') IS DISTINCT FROM 'string'
            OR (segment ->> 'tone') IS DISTINCT FROM 'default'
              AND (segment ->> 'tone') IS DISTINCT FROM 'green'
              AND (segment ->> 'tone') IS DISTINCT FROM 'pink'
        )
    )
    AND jsonb_typeof(p_header -> 'description') = 'array'
    AND NOT EXISTS (
      SELECT 1
      FROM jsonb_array_elements(p_header -> 'description') AS part
      WHERE jsonb_typeof(part -> 'text') IS DISTINCT FROM 'string'
        OR jsonb_typeof(part -> 'link') NOT IN ('null', 'object')
    )
    AND (
      SELECT count(*)
      FROM jsonb_array_elements(p_header -> 'description') AS part
      WHERE jsonb_typeof(part -> 'link') = 'object'
    ) <= 1
    AND (
      jsonb_typeof(p_header -> 'cta') = 'null'
      OR jsonb_typeof(p_header -> 'cta') = 'object'
        AND jsonb_typeof(p_header -> 'cta' -> 'label') = 'string'
        AND jsonb_typeof(p_header -> 'cta' -> 'href') = 'string'
        AND (p_header -> 'cta' ->> 'style') IN ('button', 'outline', 'arrow')
    ),
    false
  );
$$;

-- The payload check, its whole body: 'home_headers' added (every section's
-- header, valid), and 'first_steps' no longer requires its own heading.
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
          'supportAreas', 'firstSteps', 'spotlight', 'specialists', 'rooms',
          'story', 'faq'
        ]) AS section
      )
    ELSE false
  END, false);
$$;

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

-- The homepage's headers as they show today: the site's own words, with
-- "Pierwszy krok" and "Z kim porozmawiasz" taken from their payloads
-- (each from the version it comes from: the draft into the draft, the
-- published into the published).
CREATE FUNCTION pg_temp.home_headers(p_steps jsonb, p_spotlight jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT jsonb_build_object(
    'supportAreas', pg_temp.plain_header(
      'Obszary wsparcia', 'W czym możemy pomóc',
      'Wybierz koło, aby zobaczyć, czym zajmujemy się w każdym z obszarów.',
      NULL
    ),
    'firstSteps', pg_temp.plain_header(
      coalesce(p_steps ->> 'eyebrow', 'Pierwszy krok'),
      coalesce(
        nullif(p_steps ->> 'heading', ''),
        'Od pierwszego kontaktu do wsparcia na dłużej'
      ),
      p_steps ->> 'description',
      NULL
    ),
    'spotlight', pg_temp.plain_header(
      coalesce(nullif(p_spotlight ->> 'eyebrow', ''), 'Poznaj nasz zespół'),
      coalesce(nullif(p_spotlight ->> 'heading', ''), 'Z kim porozmawiasz'),
      p_spotlight ->> 'description',
      NULL
    ),
    'specialists', pg_temp.plain_header(
      'Nasi specjaliści', 'Poznaj nasz zespół',
      'Doświadczony zespół specjalistów, którzy z empatią i zaangażowaniem towarzyszą w drodze do lepszego samopoczucia.',
      '{"label": "Zobacz wszystkich specjalistów", "href": "/specjalisci", "style": "arrow"}'
    ),
    'rooms', pg_temp.plain_header(
      'Nasze gabinety', 'Przestrzeń, która wspiera',
      'Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie i poczuciu bezpieczeństwa.',
      '{"label": "Zobacz nasze gabinety", "href": "/gabinety", "style": "arrow"}'
    ),
    'story', pg_temp.plain_header(
      'Jak zacząć', 'Twoja droga do lepszego samopoczucia', NULL, NULL
    ),
    'faq', pg_temp.plain_header(
      'Pytania i odpowiedzi', 'Zanim się zobaczymy',
      'Najczęstsze pytania osób, które zastanawiają się nad pierwszą wizytą.',
      '{"label": "Masz inne pytanie? Napisz do nas", "href": "/kontakt", "style": "arrow"}'
    )
  );
$$;

INSERT INTO public.site_content (key, draft_payload, published_payload, published_at)
SELECT
  'home_headers',
  pg_temp.home_headers(
    (SELECT draft_payload FROM public.site_content WHERE key = 'first_steps'),
    (SELECT draft_payload -> 'spotlight' FROM public.site_content WHERE key = 'home_sections')
  ),
  pg_temp.home_headers(
    (SELECT published_payload FROM public.site_content WHERE key = 'first_steps'),
    (SELECT published_payload -> 'spotlight' FROM public.site_content WHERE key = 'home_sections')
  ),
  now()
ON CONFLICT (key) DO NOTHING;

-- The moved words leave their old places.
UPDATE public.site_content
SET
  draft_payload = draft_payload - 'eyebrow' - 'heading' - 'description',
  published_payload = published_payload - 'eyebrow' - 'heading' - 'description'
WHERE key = 'first_steps';

UPDATE public.site_content
SET
  draft_payload = jsonb_set(
    draft_payload, '{spotlight}',
    (draft_payload -> 'spotlight') - 'eyebrow' - 'heading' - 'description'
  ),
  published_payload = CASE
    WHEN published_payload IS NULL THEN NULL
    ELSE jsonb_set(
      published_payload, '{spotlight}',
      (published_payload -> 'spotlight') - 'eyebrow' - 'heading' - 'description'
    )
  END
WHERE key = 'home_sections';
