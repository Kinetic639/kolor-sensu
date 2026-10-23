-- Home → the sections added on 18.10: "Dlaczego my" ('why_us'), the
-- newsletter band ('newsletter_band'), "Gdzie jesteśmy" ('home_location')
-- and the crisis strip ('crisis_help'), and their headers. Seeded as the
-- site's defaults; only admins edit and publish; visitors read only what
-- is published; content of the wrong shape (one fact or five, a crisis
-- line whose number is not a number, a strip without lines, headers
-- without the new sections) is refused by the database itself.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '55000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'new-sections-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Sections","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '55000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'new-sections-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Sections","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('55000000-0000-4000-8000-000000000001', 'admin'),
  ('55000000-0000-4000-8000-000000000002', 'specialist');

-- The seed (as the owner: the payloads as stored).
DO $$
BEGIN
  IF (
    SELECT draft_payload FROM public.site_content WHERE key = 'why_us'
  ) ->> 'visible' IS DISTINCT FROM 'false'
  OR (
    SELECT jsonb_array_length(draft_payload -> 'facts')
    FROM public.site_content WHERE key = 'why_us'
  ) IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'M: "Dlaczego my" was not seeded hidden with four facts';
  END IF;

  IF (
    SELECT draft_payload ->> 'visible'
    FROM public.site_content WHERE key = 'newsletter_band'
  ) IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'M: the newsletter band was not seeded hidden';
  END IF;

  IF (
    SELECT draft_payload ->> 'visible'
    FROM public.site_content WHERE key = 'home_location'
  ) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'M: "Gdzie jesteśmy" was not seeded shown';
  END IF;

  IF (
    SELECT draft_payload -> 'lines' -> 0 ->> 'number'
    FROM public.site_content WHERE key = 'crisis_help'
  ) IS DISTINCT FROM '112' THEN
    RAISE EXCEPTION 'M: the crisis strip does not start from 112';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.site_content
    WHERE key IN ('why_us', 'newsletter_band', 'home_location', 'crisis_help')
      AND published_payload IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'M: a new section was published by the migration';
  END IF;

  IF NOT (
    SELECT draft_payload ? 'whyUs' AND draft_payload ? 'newsletter'
      AND draft_payload ? 'location'
      AND published_payload ? 'whyUs' AND published_payload ? 'location'
    FROM public.site_content WHERE key = 'home_headers'
  ) THEN
    RAISE EXCEPTION 'M: the headers did not gain the new sections';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"55000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  fact jsonb := '{"title": "Poufność", "text": "Zostaje między nami."}'::jsonb;
  line jsonb := '{"number": "116 123", "label": "Telefon", "detail": ""}'::jsonb;
  headers jsonb;
BEGIN
  UPDATE public.site_content
  SET draft_payload = jsonb_build_object(
    'visible', true, 'facts', jsonb_build_array(fact, fact)
  )
  WHERE key = 'why_us';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'visible', true, 'facts', jsonb_build_array(fact)
    )
    WHERE key = 'why_us';
    RAISE EXCEPTION 'V: one fact was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'visible', true, 'facts', jsonb_build_array(fact, fact, fact, fact, fact)
    )
    WHERE key = 'why_us';
    RAISE EXCEPTION 'V: five facts were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = '{"visible": "tak"}'::jsonb
    WHERE key = 'newsletter_band';
    RAISE EXCEPTION 'V: a newsletter switch that is not a switch was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE public.site_content
  SET draft_payload = '{"visible": false}'::jsonb
  WHERE key = 'home_location';

  UPDATE public.site_content
  SET draft_payload = jsonb_build_object(
    'heading', 'Pomoc', 'text', '', 'lines', jsonb_build_array(line)
  )
  WHERE key = 'crisis_help';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'heading', 'Pomoc', 'text', '', 'lines', '[]'::jsonb
    )
    WHERE key = 'crisis_help';
    RAISE EXCEPTION 'V: a crisis strip without lines was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'heading', 'Pomoc', 'text', '',
      'lines', jsonb_build_array(jsonb_set(line, '{number}', '"zadzwoń"'))
    )
    WHERE key = 'crisis_help';
    RAISE EXCEPTION 'V: a crisis line without a number was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  SELECT draft_payload INTO headers
  FROM public.site_content WHERE key = 'home_headers';
  BEGIN
    UPDATE public.site_content
    SET draft_payload = headers - 'whyUs'
    WHERE key = 'home_headers';
    RAISE EXCEPTION 'V: headers without "Dlaczego my" were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('why_us');
  PERFORM public.publish_site_content('home_location');
  PERFORM public.publish_site_content('crisis_help');

  IF (
    SELECT published_payload ->> 'visible'
    FROM public.site_content WHERE key = 'why_us'
  ) IS DISTINCT FROM 'true'
  OR (
    SELECT published_payload -> 'lines' -> 0 ->> 'number'
    FROM public.site_content WHERE key = 'crisis_help'
  ) IS DISTINCT FROM '116 123' THEN
    RAISE EXCEPTION 'P: publishing did not copy the drafts';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"55000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.site_content
    WHERE key IN ('why_us', 'newsletter_band', 'home_location', 'crisis_help')
  ) THEN
    RAISE EXCEPTION 'S: a specialist read a new section''s draft';
  END IF;

  UPDATE public.site_content
  SET draft_payload = draft_payload WHERE key = 'crisis_help';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited the crisis strip';
  END IF;

  BEGIN
    PERFORM public.publish_site_content('why_us');
    RAISE EXCEPTION 'S: a specialist published "Dlaczego my"';
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
    SELECT published_payload -> 'lines' -> 0 ->> 'number'
    FROM public.site_content WHERE key = 'crisis_help'
  ) IS DISTINCT FROM '116 123' THEN
    RAISE EXCEPTION 'R: a visitor could not read the published crisis strip';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.site_content WHERE key = 'newsletter_band'
  ) THEN
    RAISE EXCEPTION 'R: a visitor saw the unpublished newsletter band';
  END IF;

  BEGIN
    PERFORM draft_payload FROM public.site_content WHERE key = 'why_us';
    RAISE EXCEPTION 'R: a visitor read the "Dlaczego my" draft';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

ROLLBACK;
