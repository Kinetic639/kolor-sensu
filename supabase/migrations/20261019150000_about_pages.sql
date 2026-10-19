-- The "O nas" pages' words move into the CMS (docs/architecture/cms-domain.md),
-- with two settings every page shares, and the contact form's messages:
--   'about_page'        O nas: its top, the three value cards, and three parts
--                       the admin switches on (Nasza historia, the facts under
--                       Profesjonalizm, Z kim pracujemy), off until then;
--   'about_headers'     O nas: its sections' headers;
--   'specialists_page'  /specjalisci: its top, the empty list, the banner;
--   'contact_page'      /kontakt: its top, travel, the form's heading, FAQ;
--   'closing_cta'       the closing banner on many pages (Ustawienia wspólne);
--   'site_contact'      the contact hours (Ustawienia wspólne);
--   'rooms'             /gabinety gains its top, "Co u nas znajdziesz" and the
--                       line for no rooms (read with the site's words before);
--   contact_messages    what visitors send from /kontakt, written only by the
--                       site's server (submit_contact_message), at most three
--                       an hour from one visitor or one address.

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
    'contact_page'::text, 'closing_cta'::text, 'site_contact'::text
  ]));

-- A page's top (PageIntro, pageIntroSchema): its title, the rest words.
CREATE OR REPLACE FUNCTION private.page_intro_is_valid(p_intro jsonb)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT COALESCE(
    jsonb_typeof(p_intro) = 'object'
    AND coalesce(btrim(p_intro ->> 'heading'), '') <> ''
    AND jsonb_typeof(p_intro -> 'eyebrow') = 'string'
    AND jsonb_typeof(p_intro -> 'accent') = 'string'
    AND jsonb_typeof(p_intro -> 'lead') = 'string',
    false
  );
$$;

REVOKE ALL ON FUNCTION private.page_intro_is_valid(jsonb) FROM PUBLIC;

-- The payload check, its whole body: the new keys, and /gabinety's words.
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
    ELSE
      -- Every page's search and sharing settings ('seo_<page>').
      p_key LIKE 'seo\_%' AND private.page_seo_is_valid(p_payload)
  END, false);
$$;

-- Drafts to start from, as the contracts' defaults; nothing is published,
-- so the site shows those defaults until the admin publishes.
INSERT INTO public.site_content (key, draft_payload)
VALUES
  ('about_page', '{"intro":{"eyebrow":"Centrum psychoterapii i rozwoju","heading":"O nas","accent":"Spokojnie, uważnie, z sensem.","lead":""},"values":[{"title":"Bezpieczeństwo","text":"Rozmawiamy bez oceniania, w poufności i we własnym tempie."},{"title":"Indywidualne podejście","text":"Każdą współpracę zaczynamy od zrozumienia Twojej sytuacji i potrzeb."},{"title":"Profesjonalizm","text":"Nasi specjaliści stale się szkolą i pracują pod regularną superwizją."}],"showStory":false,"story":{"text":"","imagePath":null,"imageAlt":""},"showProfessionalism":false,"professionalism":[],"showAudiences":false,"audiences":[{"title":"Dorośli","text":"Psychoterapia i konsultacje indywidualne.","href":"/oferta"},{"title":"Pary","text":"Wsparcie w relacji, kryzysie i zmianie.","href":"/oferta"},{"title":"Dzieci i młodzież","text":"Pomoc dla młodszych i wsparcie dla rodziców.","href":"/oferta"}],"audiencesNote":"Spotkania stacjonarnie i online."}'::jsonb),
  ('about_headers', '{"story":{"eyebrow":{"text":"Nasza historia","tone":"default"},"title":[[{"text":"Skąd się wzięliśmy","tone":"default"}]],"description":[],"cta":null},"audiences":{"eyebrow":{"text":"Z kim pracujemy","tone":"default"},"title":[[{"text":"Wsparcie na różnych etapach życia","tone":"default"}]],"description":[],"cta":null},"specialists":{"eyebrow":{"text":"Nasi specjaliści","tone":"default"},"title":[[{"text":"Poznaj nasz zespół","tone":"default"}]],"description":[{"text":"Doświadczony zespół specjalistów, którzy z empatią i zaangażowaniem towarzyszą w drodze do lepszego samopoczucia.","link":null}],"cta":{"label":"Zobacz wszystkich specjalistów","href":"/specjalisci","style":"arrow"}},"rooms":{"eyebrow":{"text":"Nasze gabinety","tone":"default"},"title":[[{"text":"Przestrzeń, która wspiera","tone":"default"}]],"description":[{"text":"Jasne, przytulne gabinety stworzone z myślą o Twoim komforcie i poczuciu bezpieczeństwa.","link":null}],"cta":{"label":"Zobacz nasze gabinety","href":"/gabinety","style":"arrow"}},"contact":{"eyebrow":{"text":"Kontakt","tone":"default"},"title":[[{"text":"Jesteśmy blisko","tone":"default"}]],"description":[],"cta":{"label":"Przejdź do kontaktu","href":"/kontakt","style":"arrow"}}}'::jsonb),
  ('specialists_page', '{"intro":{"eyebrow":"Nasi specjaliści","heading":"Specjaliści","accent":"Ludzie, którzy słuchają.","lead":"Doświadczony zespół specjalistów, którzy z empatią i zaangażowaniem towarzyszą w drodze do lepszego samopoczucia."},"emptyText":"Profile naszych specjalistów pojawią się tu wkrótce. Zadzwoń lub napisz do nas, a pomożemy dobrać osobę i termin.","helpHeading":"Nie wiesz, do kogo się zapisać? Pomożemy wybrać."}'::jsonb),
  ('contact_page', '{"intro":{"eyebrow":"Kontakt","heading":"Kontakt","accent":"Jesteśmy tu dla Ciebie.","lead":"Zadzwoń lub napisz. Odpowiemy na pytania, pomożemy dobrać specjalistę i znaleźć termin."},"travel":"","formHeading":"Napisz do nas","faqHeading":"Zanim zadzwonisz","faq":[{"question":"Jak wygląda pierwsza wizyta?","answer":"Pierwsze spotkanie to konsultacja: rozmawiamy o tym, z czym przychodzisz, czego potrzebujesz i jaka forma pomocy będzie najlepsza. Nie musisz się do niej specjalnie przygotowywać."},{"question":"Ile trwa sesja i jak często się spotykamy?","answer":"Sesja trwa zwykle 50 minut. Najczęściej spotykamy się raz w tygodniu, ale częstotliwość ustalamy wspólnie z terapeutą."},{"question":"Czy potrzebuję skierowania?","answer":"Nie. Na psychoterapię i konsultacje psychologiczne możesz umówić się bez skierowania."},{"question":"Czy możliwe są spotkania online?","answer":"Tak. Część specjalistów prowadzi sesje online; informację znajdziesz w opisie usługi i przy każdym specjaliście."},{"question":"Jak mogę odwołać lub przełożyć wizytę?","answer":"Najpóźniej 24 godziny przed spotkaniem, telefonicznie lub mailowo. Wizyta odwołana później jest płatna."}]}'::jsonb),
  ('closing_cta', '{"heading":"Zrób pierwszy krok do lepszego samopoczucia","bookingLabel":"Umów wizytę","contactLabel":"Skontaktuj się"}'::jsonb),
  ('site_contact', '{"hours":"Pn–Pt 8:00–20:00, sob. 9:00–14:00"}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- ------------------------------------------------------------ the form

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 1 AND 120),
  email text NOT NULL CHECK (
    char_length(email) <= 254 AND email ~ '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$'
  ),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 30),
  message text NOT NULL CHECK (char_length(btrim(message)) BETWEEN 1 AND 5000),
  -- A keyed hash of the sender's IP address (the address itself is never
  -- stored), for the limit on messages.
  sender_key text NOT NULL CHECK (char_length(sender_key) BETWEEN 16 AND 128),
  -- When the centre was told about it by e-mail (null: not yet, or failed).
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX contact_messages_sender_recent
  ON public.contact_messages (sender_key, created_at DESC);
CREATE INDEX contact_messages_email_recent
  ON public.contact_messages (lower(email), created_at DESC);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.contact_messages FROM anon, authenticated;
GRANT SELECT ON public.contact_messages TO authenticated;

CREATE POLICY "Admins can read contact messages"
  ON public.contact_messages FOR SELECT TO authenticated
  USING (public.has_role('admin'::public.app_role));

-- Saves one message; refuses a fourth within an hour from the same visitor
-- or the same address (SQLSTATE P0001, 'contact_rate_limited').
CREATE OR REPLACE FUNCTION public.submit_contact_message(
  p_name text,
  p_email text,
  p_phone text,
  p_message text,
  p_sender_key text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF (
    SELECT count(*) FROM public.contact_messages
    WHERE created_at > now() - interval '1 hour'
      AND (sender_key = p_sender_key OR lower(email) = lower(btrim(p_email)))
  ) >= 3 THEN
    RAISE EXCEPTION 'contact_rate_limited';
  END IF;

  INSERT INTO public.contact_messages (name, email, phone, message, sender_key)
  VALUES (
    btrim(p_name),
    lower(btrim(p_email)),
    nullif(btrim(coalesce(p_phone, '')), ''),
    btrim(p_message),
    p_sender_key
  )
  RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Records that the centre was told (the notification e-mail went out).
CREATE OR REPLACE FUNCTION public.mark_contact_message_notified(p_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  UPDATE public.contact_messages SET notified_at = now() WHERE id = p_id;
$$;

REVOKE ALL ON FUNCTION public.submit_contact_message(text, text, text, text, text)
  FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.mark_contact_message_notified(uuid)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.submit_contact_message(text, text, text, text, text)
  TO service_role;
GRANT EXECUTE ON FUNCTION public.mark_contact_message_notified(uuid)
  TO service_role;
