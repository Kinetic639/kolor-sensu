-- Home → which specialist sections show (site_content key 'home_sections'):
-- only admins edit and publish; visitors read only what is published;
-- malformed settings are refused by the database itself.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '52000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'home-sections-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Sections","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '52000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'home-sections-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Sections","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('52000000-0000-4000-8000-000000000001', 'admin'),
  ('52000000-0000-4000-8000-000000000002', 'specialist');

-- The admin: the seeded draft shows the team and hides the spotlight;
-- edits, publishes; malformed settings are refused.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF (
    SELECT (draft_payload ->> 'showSpecialists')::boolean
      AND NOT (draft_payload -> 'spotlight' ->> 'visible')::boolean
    FROM public.site_content WHERE key = 'home_sections'
  ) IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'A: the seeded draft does not show the team and hide the spotlight';
  END IF;

  IF (SELECT published_payload FROM public.site_content WHERE key = 'home_sections')
    IS NOT NULL THEN
    RAISE EXCEPTION 'A: the sections were published before the admin did it';
  END IF;

  UPDATE public.site_content
  SET draft_payload = jsonb_build_object(
    'showSpecialists', false,
    'spotlight', jsonb_build_object(
      'visible', true,
      'specialistId', '6f1c2b9a-3c41-4e2b-9a55-0d3f2a7b8c10',
      'imagePath', NULL, 'imageAlt', ''
    )
  )
  WHERE key = 'home_sections';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = '{"showSpecialists": "tak", "spotlight": {"visible": false}}'::jsonb
    WHERE key = 'home_sections';
    RAISE EXCEPTION 'V: a switch that is not a boolean was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = '{"showSpecialists": true}'::jsonb
    WHERE key = 'home_sections';
    RAISE EXCEPTION 'V: settings without the spotlight were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = '{"showSpecialists": true, "spotlight": {"specialistId": null}}'::jsonb
    WHERE key = 'home_sections';
    RAISE EXCEPTION 'V: a spotlight without its switch was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- The fix for every key: a missing field is refused, not let through.
  BEGIN
    UPDATE public.site_content
    SET draft_payload = '{"showAmenitiesSection": true}'::jsonb
    WHERE key = 'rooms';
    RAISE EXCEPTION 'V: /gabinety settings missing a switch were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('home_sections');

  IF (
    SELECT published_payload -> 'spotlight' ->> 'visible'
    FROM public.site_content WHERE key = 'home_sections'
  ) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'P: publishing did not copy the draft';
  END IF;
END;
$$;

RESET ROLE;

-- A specialist: neither reads nor edits the settings.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"52000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.site_content WHERE key = 'home_sections') THEN
    RAISE EXCEPTION 'S: a specialist read the sections draft';
  END IF;

  UPDATE public.site_content
  SET draft_payload = '{"showSpecialists": true, "spotlight": {"visible": false}}'::jsonb
  WHERE key = 'home_sections';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited the sections';
  END IF;
END;
$$;

RESET ROLE;

-- A visitor: reads the published settings, never the draft.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (
    SELECT published_payload ->> 'showSpecialists'
    FROM public.site_content WHERE key = 'home_sections'
  ) IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'R: a visitor could not read the published sections';
  END IF;

  BEGIN
    PERFORM draft_payload FROM public.site_content WHERE key = 'home_sections';
    RAISE EXCEPTION 'R: a visitor read the sections draft';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

ROLLBACK;
