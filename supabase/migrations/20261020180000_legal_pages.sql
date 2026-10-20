-- The legal documents move into the CMS (docs/architecture/cms-domain.md):
--   'legal_terms'    /regulamin,
--   'legal_privacy'  /polityka-prywatnosci,
--   'legal_cookies'  /cookies:
-- each the page's header, the document as rich text (its full check is the
-- contracts', on save; here its outline) and the date it applies from.
-- Seeded as drafts with the site's sample documents, which say they are
-- samples; the centre replaces them before the launch.

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
    'legal_terms'::text, 'legal_privacy'::text, 'legal_cookies'::text
  ]));

-- The payload check, its whole body: the legal keys.
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
    WHEN 'legal_terms', 'legal_privacy', 'legal_cookies' THEN
      private.page_intro_is_valid(p_payload -> 'intro')
      AND jsonb_typeof(p_payload -> 'body') = 'object'
      AND p_payload #>> '{body,type}' = 'doc'
      AND jsonb_typeof(p_payload #> '{body,content}') = 'array'
      AND jsonb_array_length(p_payload #> '{body,content}') >= 1
      AND jsonb_typeof(p_payload -> 'effectiveFrom') = 'string'
    ELSE
      -- Every page's search and sharing settings ('seo_<page>').
      p_key LIKE 'seo\_%' AND private.page_seo_is_valid(p_payload)
  END, false);
$$;

INSERT INTO public.site_content (key, draft_payload)
VALUES
  ('legal_terms', '{"intro":{"eyebrow":{"text":"Dokumenty","tone":"pink"},"title":[[{"text":"Regulamin","tone":"default"}]],"description":[{"text":"Zasady korzystania ze strony oraz umawiania i opłacania wizyt online.","link":null}],"cta":null},"effectiveFrom":"","body":{"type":"doc","content":[{"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"To jest przykładowa treść regulaminu. Przed uruchomieniem strony centrum zastępuje ją własnym dokumentem."}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"1. Postanowienia ogólne"}]},{"type":"paragraph","content":[{"type":"text","text":"Regulamin określa zasady korzystania ze strony Kolor Sensu oraz umawiania i opłacania wizyt online. Usługodawcą jest spółka prowadząca centrum Kolor Sensu; jej nazwa, adres i NIP są podane w stopce strony."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"2. Umawianie wizyt"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Wizytę umawiasz na stronie, wybierając usługę, specjalistę i wolny termin."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Do rezerwacji potrzebne są imię i nazwisko, adres e-mail i numer telefonu."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Potwierdzenie rezerwacji i link do zarządzania wizytą wysyłamy e-mailem."}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"3. Płatności"}]},{"type":"paragraph","content":[{"type":"text","text":"Za wizytę umówioną na stronie płacisz online, kartą lub BLIK-iem. Płatności obsługuje operator płatności Stripe. Rezerwacja, której nie opłacisz w wyznaczonym czasie, zostaje anulowana."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"4. Zmiana terminu i odwołanie wizyty"}]},{"type":"paragraph","content":[{"type":"text","text":"Wizytę możesz przełożyć albo odwołać przez link z e-maila z potwierdzeniem. Kiedy opłata wraca w całości, opisuje "},{"type":"text","text":"Cennik","marks":[{"type":"link","attrs":{"href":"/cennik#zasady"}}]},{"type":"text","text":"."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"5. Pomoc w kryzysie"}]},{"type":"paragraph","content":[{"type":"text","text":"Centrum nie udziela pomocy w nagłych sytuacjach zagrożenia życia. W takiej sytuacji zadzwoń pod numer 112 albo skorzystaj z "},{"type":"text","text":"numerów pomocy w kryzysie","marks":[{"type":"link","attrs":{"href":"/pomoc-w-kryzysie"}}]},{"type":"text","text":"."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"6. Reklamacje i kontakt"}]},{"type":"paragraph","content":[{"type":"text","text":"Uwagi i reklamacje możesz zgłosić przez "},{"type":"text","text":"formularz kontaktowy","marks":[{"type":"link","attrs":{"href":"/kontakt"}}]},{"type":"text","text":". Odpowiadamy w ciągu 14 dni."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"7. Postanowienia końcowe"}]},{"type":"paragraph","content":[{"type":"text","text":"W sprawach, których regulamin nie opisuje, stosuje się przepisy prawa polskiego. Zasady przetwarzania danych osobowych opisuje "},{"type":"text","text":"Polityka prywatności","marks":[{"type":"link","attrs":{"href":"/polityka-prywatnosci"}}]},{"type":"text","text":"."}]}]}}'::jsonb),
  ('legal_privacy', '{"intro":{"eyebrow":{"text":"Dokumenty","tone":"pink"},"title":[[{"text":"Polityka prywatności","tone":"default"}]],"description":[{"text":"Jakie dane zbieramy, po co, komu je powierzamy i jakie masz prawa.","link":null}],"cta":null},"effectiveFrom":"","body":{"type":"doc","content":[{"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"To jest przykładowa treść polityki prywatności. Przed uruchomieniem strony centrum zastępuje ją własnym dokumentem."}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Kto jest administratorem danych"}]},{"type":"paragraph","content":[{"type":"text","text":"Administratorem Twoich danych osobowych jest spółka prowadząca centrum Kolor Sensu. Jej nazwa, adres i NIP są podane w stopce strony. W sprawach danych osobowych napisz do nas przez "},{"type":"text","text":"stronę Kontakt","marks":[{"type":"link","attrs":{"href":"/kontakt"}}]},{"type":"text","text":"."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Jakie dane zbieramy i po co"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Rezerwacja wizyty:","marks":[{"type":"bold"}]},{"type":"text","text":" imię i nazwisko, e-mail, telefon i wybrany termin, żeby umówić i potwierdzić wizytę oraz o niej przypomnieć."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Ankieta przed pierwszą wizytą:","marks":[{"type":"bold"}]},{"type":"text","text":" odpowiedzi, które pomagają przygotować pierwsze spotkanie."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Formularz kontaktowy:","marks":[{"type":"bold"}]},{"type":"text","text":" imię, e-mail, opcjonalnie telefon i treść wiadomości, żeby odpowiedzieć na Twoje pytanie."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Płatność:","marks":[{"type":"bold"}]},{"type":"text","text":" dane potrzebne do rozliczenia wizyty. Dane karty przetwarza wyłącznie operator płatności."}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Komu powierzamy dane"}]},{"type":"paragraph","content":[{"type":"text","text":"Korzystamy z firm, które przetwarzają dane w naszym imieniu:"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Stripe: obsługa płatności online."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Resend: wysyłka e-maili z potwierdzeniami i przypomnieniami."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Supabase i Vercel: przechowywanie danych i działanie strony."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Cloudflare Turnstile: ochrona formularzy przed botami."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Google: mapa na stronie Kontakt, tylko po Twojej zgodzie."}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Jak długo przechowujemy dane"}]},{"type":"paragraph","content":[{"type":"text","text":"Dane z rezerwacji przechowujemy tak długo, jak wymagają tego przepisy, na przykład o rozliczeniach, a wiadomości z formularza kontaktowego do czasu zakończenia sprawy."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Twoje prawa"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"dostęp do swoich danych i otrzymanie ich kopii,"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"sprostowanie i usunięcie danych,"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"ograniczenie przetwarzania i sprzeciw wobec niego,"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"przeniesienie danych,"}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"skarga do Prezesa Urzędu Ochrony Danych Osobowych."}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Pliki cookies"}]},{"type":"paragraph","content":[{"type":"text","text":"Co zapisujemy w Twojej przeglądarce, opisuje strona "},{"type":"text","text":"Pliki cookies","marks":[{"type":"link","attrs":{"href":"/cookies"}}]},{"type":"text","text":"."}]}]}}'::jsonb),
  ('legal_cookies', '{"intro":{"eyebrow":{"text":"Dokumenty","tone":"pink"},"title":[[{"text":"Pliki cookies","tone":"default"}]],"description":[{"text":"Co strona zapisuje w Twojej przeglądarce i jak zmienić swój wybór.","link":null}],"cta":null},"effectiveFrom":"","body":{"type":"doc","content":[{"type":"blockquote","content":[{"type":"paragraph","content":[{"type":"text","text":"To jest przykładowa treść informacji o plikach cookies. Przed uruchomieniem strony centrum zastępuje ją własnym dokumentem."}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Co zapisujemy w Twojej przeglądarce"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"ks-cookie-consent","marks":[{"type":"bold"}]},{"type":"text","text":": Twój wybór w banerze plików cookies, żeby nie pytać o niego przy każdej wizycie."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"ks-intro","marks":[{"type":"bold"}]},{"type":"text","text":": informacja, że animacja powitalna została już pokazana."}]}]}]},{"type":"paragraph","content":[{"type":"text","text":"Obie informacje są zapisane w pamięci Twojej przeglądarki i nie są wysyłane do nas ani do nikogo innego."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Pliki zewnętrznych usług"}]},{"type":"bulletList","content":[{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Cloudflare Turnstile przy formularzach rezerwacji i kontaktu sprawdza, czy korzysta z nich człowiek, i może przy tym zapisać własne pliki."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Mapa Google na stronie Kontakt ładuje się dopiero po Twojej zgodzie i może zapisywać pliki Google."}]}]},{"type":"listItem","content":[{"type":"paragraph","content":[{"type":"text","text":"Płatność online prowadzi przez Stripe, który używa własnych plików potrzebnych do bezpiecznej płatności."}]}]}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Pliki analityczne"}]},{"type":"paragraph","content":[{"type":"text","text":"Obecnie nie używamy plików analitycznych ani marketingowych. Jeśli je wprowadzimy, zadziałają tylko za Twoją zgodą wyrażoną w banerze."}]},{"type":"heading","attrs":{"level":2},"content":[{"type":"text","text":"Jak zmienić wybór"}]},{"type":"paragraph","content":[{"type":"text","text":"Swój wybór możesz w każdej chwili usunąć, czyszcząc dane tej witryny w ustawieniach przeglądarki. Baner pojawi się wtedy ponownie."}]}]}}'::jsonb)
ON CONFLICT (key) DO NOTHING;
