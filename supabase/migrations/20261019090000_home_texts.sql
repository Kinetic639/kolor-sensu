-- Home → the words that were in code move into the CMS
-- (docs/architecture/cms-domain.md):
--   'home'           the hero gains its eyebrow, accent, second button's
--                    label, up to four points (a label and an icon from the
--                    list) and its photo; a hero saved before them reads
--                    with the site's defaults (the contracts);
--   'home_thoughts'  "Myśli, które się odmieniają": the band's name, the
--                    difficult thoughts and the kinder ones;
--   'home_story'     the story told while scrolling: one to four steps.

ALTER TABLE public.site_content DROP CONSTRAINT site_content_key_check;
ALTER TABLE public.site_content
  ADD CONSTRAINT site_content_key_check
  CHECK (key = ANY (ARRAY[
    'home'::text, 'rooms'::text, 'support_areas'::text, 'home_sections'::text,
    'first_steps'::text, 'home_headers'::text, 'why_us'::text,
    'newsletter_band'::text, 'home_location'::text, 'crisis_help'::text,
    'home_thoughts'::text, 'home_story'::text
  ]));

-- The payload check, its whole body: the hero's points, and the two new
-- keys.
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
      AND jsonb_typeof(p_payload -> 'negative') = 'array'
      AND jsonb_array_length(p_payload -> 'negative') BETWEEN 8 AND 40
      AND jsonb_typeof(p_payload -> 'positive') = 'array'
      AND jsonb_array_length(p_payload -> 'positive') BETWEEN 3 AND 20
      AND NOT EXISTS (
        SELECT 1
        FROM jsonb_array_elements(
          (p_payload -> 'negative') || (p_payload -> 'positive')
        ) AS thought
        WHERE jsonb_typeof(thought) <> 'string'
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

-- Drafts to start from, as the contracts' defaults; nothing is published,
-- so the site shows those defaults until the admin publishes.
INSERT INTO public.site_content (key, draft_payload)
VALUES
  (
    'home_thoughts',
    '{"label": "Pod natłokiem trudnych myśli kryją się inne",
      "negative": [
        "nie dam rady", "znowu to samo", "co jeśli", "nie mam siły", "wstyd",
        "lęk", "a jeśli to moja wina", "za mało", "nikt mnie nie rozumie",
        "pustka", "nie zasługuję", "muszę", "co pomyślą inni", "złość",
        "napięcie", "nie śpię", "wszystko na mojej głowie",
        "nie wiem, co dalej", "bezsilność", "smutek", "znowu zawiodę", "chaos",
        "nie potrafię", "porażka", "nie umiem odpocząć", "zawsze tak będzie",
        "samotność", "boję się"
      ],
      "positive": [
        "Mam prawo tak czuć", "Krok po kroku", "Mogę poprosić o pomoc",
        "Wystarczy, że jestem", "Zasługuję na spokój", "To minie",
        "Mogę odpocząć", "Nie muszę dźwigać wszystkiego",
        "To, co czuję, jest ważne", "Oddech po oddechu", "Mam w sobie siłę",
        "Wolno mi się mylić", "Jutro może być lżej", "Mam na kogo liczyć"
      ]}'::jsonb
  ),
  (
    'home_story',
    '{"steps": [
      {"heading": "Pierwsza rozmowa",
       "text": "Zaczynamy od konsultacji: rozmawiamy o tym, z czym przychodzisz i czego potrzebujesz. Nie musisz się do niej specjalnie przygotowywać.",
       "cta": {"label": "Umów wizytę", "href": "/umow-wizyte"},
       "imagePath": null, "imageAlt": ""},
      {"heading": "Przestrzeń, która wspiera",
       "text": "Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie i poczuciu bezpieczeństwa.",
       "cta": {"label": "Zobacz nasze gabinety", "href": "/gabinety"},
       "imagePath": null, "imageAlt": ""},
      {"heading": "Wydarzenia, które inspirują",
       "text": "Warsztaty, grupy rozwojowe i spotkania tematyczne dla osób, które chcą lepiej siebie rozumieć.",
       "cta": {"label": "Zobacz nadchodzące wydarzenia", "href": "/warsztaty"},
       "imagePath": null, "imageAlt": ""}
    ]}'::jsonb
  )
ON CONFLICT (key) DO NOTHING;
