-- Edukacja in the CMS (docs/product/education-plan.md, PR 4):
--   'education_page'  /edukacja and /edukacja/artykuly: the tops of both
--   pages, the line while nothing is published, and the word about therapy
--   under every article.
-- Seeded as a draft with the contracts' default; until it is published the
-- site shows that default.

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
    'seo_cookies'::text,
    'site_appearance'::text,
    'about_page'::text, 'about_headers'::text, 'specialists_page'::text,
    'contact_page'::text, 'closing_cta'::text, 'site_contact'::text,
    'offer_page'::text, 'service_page'::text, 'prices_page'::text,
    'legal_terms'::text, 'legal_privacy'::text, 'legal_cookies'::text,
    'education_page'::text
  ]));

-- The payload check, its whole body: plus education_page.
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
      AND (NOT p_payload ? 'intro' OR private.page_intro_is_valid(p_payload -> 'intro'))
      AND (
        NOT p_payload ? 'amenities'
        OR (
          jsonb_typeof(p_payload -> 'amenities') = 'array'
          AND jsonb_array_length(p_payload -> 'amenities') <= 8
          AND NOT EXISTS (
            SELECT 1 FROM jsonb_array_elements(p_payload -> 'amenities') AS point
            WHERE jsonb_typeof(point) <> 'string'
          )
        )
      )
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
    WHEN 'site_appearance' THEN
      jsonb_typeof(p_payload -> 'watercolorBackdropPath') IN ('string', 'null')
      AND length(coalesce(p_payload ->> 'watercolorBackdropPath', '')) <= 300
      AND jsonb_typeof(p_payload -> 'watercolorParallaxPath') IN ('string', 'null')
      AND length(coalesce(p_payload ->> 'watercolorParallaxPath', '')) <= 300
    WHEN 'about_page' THEN
      private.page_intro_is_valid(p_payload -> 'intro')
      AND jsonb_typeof(p_payload -> 'values') = 'array'
      AND jsonb_array_length(p_payload -> 'values') = 3
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload -> 'values') AS card
        WHERE jsonb_typeof(card) <> 'object'
          OR jsonb_typeof(card -> 'title') IS DISTINCT FROM 'string'
          OR jsonb_typeof(card -> 'text') IS DISTINCT FROM 'string'
      )
      AND jsonb_typeof(p_payload -> 'showStory') = 'boolean'
      AND jsonb_typeof(p_payload -> 'showProfessionalism') = 'boolean'
      AND jsonb_typeof(p_payload -> 'showAudiences') = 'boolean'
      AND jsonb_typeof(p_payload -> 'professionalism') = 'array'
      AND jsonb_array_length(p_payload -> 'professionalism') <= 8
      AND jsonb_typeof(p_payload -> 'audiences') = 'array'
      AND jsonb_array_length(p_payload -> 'audiences') BETWEEN 1 AND 6
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload -> 'audiences') AS card
        WHERE jsonb_typeof(card) <> 'object'
          OR jsonb_typeof(card -> 'title') IS DISTINCT FROM 'string'
          OR coalesce(card ->> 'href', '') !~ '^/([^/]|$)'
      )
    WHEN 'about_headers' THEN
      (
        SELECT bool_and(private.section_header_is_valid(p_payload -> section))
        FROM unnest(ARRAY[
          'story', 'audiences', 'specialists', 'rooms', 'contact'
        ]) AS section
      )
    WHEN 'specialists_page' THEN
      private.page_intro_is_valid(p_payload -> 'intro')
      AND jsonb_typeof(p_payload -> 'emptyText') = 'string'
      AND jsonb_typeof(p_payload -> 'helpHeading') = 'string'
    WHEN 'contact_page' THEN
      private.page_intro_is_valid(p_payload -> 'intro')
      AND jsonb_typeof(p_payload -> 'travel') = 'string'
      AND jsonb_typeof(p_payload -> 'formHeading') = 'string'
      AND jsonb_typeof(p_payload -> 'faqHeading') = 'string'
      AND jsonb_typeof(p_payload -> 'faq') = 'array'
      AND jsonb_array_length(p_payload -> 'faq') <= 12
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload -> 'faq') AS item
        WHERE jsonb_typeof(item) <> 'object'
          OR jsonb_typeof(item -> 'question') IS DISTINCT FROM 'string'
          OR jsonb_typeof(item -> 'answer') IS DISTINCT FROM 'string'
      )
    WHEN 'closing_cta' THEN
      coalesce(btrim(p_payload ->> 'heading'), '') <> ''
      AND coalesce(btrim(p_payload ->> 'bookingLabel'), '') <> ''
      AND coalesce(btrim(p_payload ->> 'contactLabel'), '') <> ''
    WHEN 'site_contact' THEN
      jsonb_typeof(p_payload -> 'hours') = 'string'
      AND length(p_payload ->> 'hours') <= 160
    WHEN 'offer_page' THEN
      private.page_intro_is_valid(p_payload -> 'intro')
      AND coalesce(btrim(p_payload ->> 'emptyText'), '') <> ''
    WHEN 'service_page' THEN
      jsonb_typeof(p_payload -> 'howWeWork') = 'object'
      AND jsonb_typeof(p_payload #> '{howWeWork,eyebrow}') = 'string'
      AND coalesce(btrim(p_payload #>> '{howWeWork,heading}'), '') <> ''
      AND jsonb_typeof(p_payload #> '{howWeWork,description}') = 'string'
      AND coalesce(btrim(p_payload #>> '{howWeWork,ctaLabel}'), '') <> ''
      AND jsonb_typeof(p_payload -> 'unbooked') = 'object'
      AND coalesce(btrim(p_payload #>> '{unbooked,priceText}'), '') <> ''
      AND coalesce(btrim(p_payload #>> '{unbooked,contactLabel}'), '') <> ''
    WHEN 'prices_page' THEN
      private.page_intro_is_valid(p_payload -> 'intro')
      AND coalesce(btrim(p_payload ->> 'emptyText'), '') <> ''
      AND coalesce(btrim(p_payload ->> 'noPriceText'), '') <> ''
      AND coalesce(btrim(p_payload ->> 'rulesHeading'), '') <> ''
      AND jsonb_typeof(p_payload -> 'rules') = 'array'
      AND jsonb_array_length(p_payload -> 'rules') <= 8
      AND NOT EXISTS (
        SELECT 1 FROM jsonb_array_elements(p_payload -> 'rules') AS rule
        WHERE jsonb_typeof(rule) <> 'object'
          OR coalesce(btrim(rule ->> 'title'), '') = ''
          OR coalesce(btrim(rule ->> 'text'), '') = ''
      )
    WHEN 'legal_terms' THEN private.legal_page_is_valid(p_payload)
    WHEN 'legal_privacy' THEN private.legal_page_is_valid(p_payload)
    WHEN 'legal_cookies' THEN private.legal_page_is_valid(p_payload)
    WHEN 'education_page' THEN
      private.page_intro_is_valid(p_payload -> 'intro')
      AND private.page_intro_is_valid(p_payload -> 'articlesIntro')
      AND jsonb_typeof(p_payload -> 'emptyText') = 'string'
      AND jsonb_typeof(p_payload -> 'therapyNote') = 'string'
    ELSE
      -- Every page's search and sharing settings ('seo_<page>').
      p_key LIKE 'seo\_%' AND private.page_seo_is_valid(p_payload)
  END, false);
$$;

INSERT INTO public.site_content (key, draft_payload)
VALUES ('education_page', '{"intro":{"eyebrow":{"text":"Edukacja","tone":"pink"},"title":[[{"text":"Edukacja","tone":"default"}],[{"text":"Wiedza, która pomaga zrozumieć.","tone":"green"}]],"description":[{"text":"Dzielimy się wiedzą o zdrowiu psychicznym, emocjach i relacjach: przystępnie, rzetelnie i bez oceniania.","link":null}],"cta":null},"emptyText":"Przygotowujemy artykuły i materiały edukacyjne. Jeśli masz pytanie, z którym chcesz przyjść już teraz, zadzwoń lub napisz do nas.","articlesIntro":{"eyebrow":{"text":"Edukacja","tone":"pink"},"title":[[{"text":"Artykuły","tone":"default"}]],"description":[{"text":"Przystępnie o emocjach, relacjach i zdrowiu psychicznym, pisane przez naszych specjalistów.","link":null}],"cta":null},"therapyNote":"Artykuł ma charakter edukacyjny i nie zastępuje konsultacji ze specjalistą. Jeśli to, o czym czytasz, dotyczy Ciebie lub bliskiej osoby, umów się na rozmowę. Jeśli czujesz, że Twoje życie jest zagrożone, od razu szukaj pomocy."}'::jsonb)
ON CONFLICT (key) DO NOTHING;
