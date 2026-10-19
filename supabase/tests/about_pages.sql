-- The "O nas" pages' words (about_page, about_headers, specialists_page,
-- contact_page), the shared closing banner and hours (closing_cta,
-- site_contact), /gabinety's words on 'rooms', and the contact form's
-- messages. Seeded unpublished; only admins edit and publish; visitors read
-- only what is published; content of the wrong shape is refused by the
-- database; messages are written only by the site's server, three an hour
-- at most from one visitor or address, and read only by admins.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '57000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'about-pages-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"About","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '57000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'about-pages-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"About","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('57000000-0000-4000-8000-000000000001', 'admin'),
  ('57000000-0000-4000-8000-000000000002', 'specialist');

-- The seed (as the owner).
DO $$
BEGIN
  IF (
    SELECT count(*) FROM public.site_content
    WHERE key IN (
      'about_page', 'about_headers', 'specialists_page', 'contact_page',
      'closing_cta', 'site_contact'
    ) AND published_payload IS NULL
  ) <> 6 THEN
    RAISE EXCEPTION 'M: the six new keys were not seeded unpublished';
  END IF;

  IF (
    SELECT draft_payload ->> 'showStory' FROM public.site_content
    WHERE key = 'about_page'
  ) IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'M: Nasza historia was not seeded switched off';
  END IF;

  IF (
    SELECT jsonb_array_length(draft_payload -> 'faq') FROM public.site_content
    WHERE key = 'contact_page'
  ) IS DISTINCT FROM 5 THEN
    RAISE EXCEPTION 'M: Kontakt was not seeded with the site''s five questions';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"57000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  about jsonb;
  rooms jsonb;
BEGIN
  SELECT draft_payload INTO about FROM public.site_content WHERE key = 'about_page';

  UPDATE public.site_content
  SET draft_payload = about || '{"showStory": true}'::jsonb
  WHERE key = 'about_page';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(about, '{values}', (about -> 'values') - 0)
    WHERE key = 'about_page';
    RAISE EXCEPTION 'V: two value cards were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(about, '{audiences,0,href}', '"https://x.pl"')
    WHERE key = 'about_page';
    RAISE EXCEPTION 'V: an audience card leading off the site was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(draft_payload, '{intro,heading}', '" "')
    WHERE key = 'contact_page';
    RAISE EXCEPTION 'V: Kontakt without its title was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = '{"heading": "Baner", "bookingLabel": "", "contactLabel": "Napisz"}'::jsonb
    WHERE key = 'closing_cta';
    RAISE EXCEPTION 'V: a banner button without words was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- /gabinety: switches saved before its words still pass; its words are
  -- checked once there.
  SELECT draft_payload INTO rooms FROM public.site_content WHERE key = 'rooms';
  UPDATE public.site_content
  SET draft_payload = '{"showAmenitiesSection": true, "showLocationDetails": true}'::jsonb
  WHERE key = 'rooms';
  BEGIN
    UPDATE public.site_content
    SET draft_payload = '{"showAmenitiesSection": true, "showLocationDetails": true, "amenities": [1]}'::jsonb
    WHERE key = 'rooms';
    RAISE EXCEPTION 'V: an amenity that is not words was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('about_page');
  IF (
    SELECT published_payload ->> 'showStory' FROM public.site_content
    WHERE key = 'about_page'
  ) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'P: publishing did not copy the draft';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"57000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.site_content SET draft_payload = draft_payload WHERE key = 'contact_page';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited Kontakt';
  END IF;

  BEGIN
    PERFORM public.publish_site_content('about_page');
    RAISE EXCEPTION 'S: a specialist published O nas';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (
    SELECT published_payload ->> 'showStory' FROM public.site_content
    WHERE key = 'about_page'
  ) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'R: a visitor could not read the published O nas';
  END IF;

  IF EXISTS (SELECT 1 FROM public.site_content WHERE key = 'contact_page') THEN
    RAISE EXCEPTION 'R: a visitor saw the unpublished Kontakt';
  END IF;

  -- The form: never written or read by a visitor directly.
  BEGIN
    INSERT INTO public.contact_messages (name, email, message, sender_key)
    VALUES ('Ola', 'ola@example.invalid', 'Dzień dobry', repeat('a', 32));
    RAISE EXCEPTION 'F: a visitor wrote a message directly';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    PERFORM public.submit_contact_message(
      'Ola', 'ola@example.invalid', NULL, 'Dzień dobry', repeat('a', 32)
    );
    RAISE EXCEPTION 'F: a visitor called the server''s function';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

SET LOCAL ROLE service_role;

DO $$
DECLARE
  first_id uuid;
BEGIN
  first_id := public.submit_contact_message(
    ' Ola Nowak ', ' Ola@Example.invalid ', '', ' Czy przyjmujecie pary? ',
    repeat('b', 32)
  );
  IF (
    SELECT row(name, email, phone, message)::text FROM public.contact_messages
    WHERE id = first_id
  ) IS DISTINCT FROM row('Ola Nowak', 'ola@example.invalid', NULL::text,
    'Czy przyjmujecie pary?')::text THEN
    RAISE EXCEPTION 'F: the message was not saved tidied';
  END IF;

  PERFORM public.submit_contact_message('Ola', 'ola@example.invalid', NULL, 'Dwa', repeat('c', 32));
  PERFORM public.submit_contact_message('Ola', 'inna@example.invalid', NULL, 'Trzy', repeat('b', 32));

  BEGIN
    PERFORM public.submit_contact_message('Ola', 'ola@example.invalid', NULL, 'Cztery', repeat('d', 32));
    RAISE EXCEPTION 'F: a fourth message within the hour from one address was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'contact_rate_limited' THEN RAISE; END IF;
  END;

  BEGIN
    PERFORM public.submit_contact_message('Ewa', 'ewa@example.invalid', NULL, 'Cztery', repeat('b', 32));
    RAISE EXCEPTION 'F: a fourth message within the hour from one visitor was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'contact_rate_limited' THEN RAISE; END IF;
  END;

  PERFORM public.mark_contact_message_notified(first_id);
  IF (SELECT notified_at FROM public.contact_messages WHERE id = first_id) IS NULL THEN
    RAISE EXCEPTION 'F: the notification was not recorded';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"57000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.contact_messages) THEN
    RAISE EXCEPTION 'F: a specialist read the messages';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"57000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.contact_messages) <> 3 THEN
    RAISE EXCEPTION 'F: an admin could not read the three messages';
  END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
