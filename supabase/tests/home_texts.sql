-- Home → the words moved into the CMS on 19.10: the hero's points,
-- "Myśli, które się odmieniają" ('home_thoughts') and the story
-- ('home_story'). Seeded as the site's defaults and unpublished; only
-- admins edit and publish; visitors read only what is published; content
-- of the wrong shape (five points or an unknown icon, too few thoughts, a
-- story without steps or with five) is refused by the database itself.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '56000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'home-texts-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Texts","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '56000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'home-texts-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Texts","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('56000000-0000-4000-8000-000000000001', 'admin'),
  ('56000000-0000-4000-8000-000000000002', 'specialist');

-- The seed (as the owner: the payloads as stored).
DO $$
BEGIN
  IF (
    SELECT jsonb_array_length(draft_payload -> 'negative')
    FROM public.site_content WHERE key = 'home_thoughts'
  ) IS DISTINCT FROM 28 THEN
    RAISE EXCEPTION 'M: the thoughts were not seeded with the site''s 28';
  END IF;

  IF (
    SELECT jsonb_array_length(draft_payload -> 'steps')
    FROM public.site_content WHERE key = 'home_story'
  ) IS DISTINCT FROM 3 THEN
    RAISE EXCEPTION 'M: the story was not seeded with three steps';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.site_content
    WHERE key IN ('home_thoughts', 'home_story')
      AND published_payload IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'M: a new section was published by the migration';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"56000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  point jsonb := '{"label": "Przytulne gabinety", "icon": "house"}'::jsonb;
  step jsonb := '{"heading": "Pierwsza rozmowa", "text": "Zaczynamy od konsultacji."}'::jsonb;
  thoughts jsonb;
BEGIN
  -- A hero saved before its points still passes; with points, they are
  -- checked.
  UPDATE public.site_content
  SET draft_payload = '{"heading": "Tytuł", "body": "Opis"}'::jsonb
  WHERE key = 'home';

  UPDATE public.site_content
  SET draft_payload = jsonb_build_object(
    'heading', 'Tytuł', 'body', 'Opis', 'points', jsonb_build_array(point)
  )
  WHERE key = 'home';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'heading', 'Tytuł', 'body', 'Opis',
      'points', jsonb_build_array(point, point, point, point, point)
    )
    WHERE key = 'home';
    RAISE EXCEPTION 'V: five hero points were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'heading', 'Tytuł', 'body', 'Opis',
      'points', jsonb_build_array(jsonb_set(point, '{icon}', '"cat"'))
    )
    WHERE key = 'home';
    RAISE EXCEPTION 'V: a hero point with an unknown icon was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  SELECT draft_payload INTO thoughts
  FROM public.site_content WHERE key = 'home_thoughts';
  UPDATE public.site_content
  SET draft_payload = thoughts || '{"label": "Inne myśli"}'::jsonb
  WHERE key = 'home_thoughts';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = thoughts || '{"negative": ["lęk", "wstyd"]}'::jsonb
    WHERE key = 'home_thoughts';
    RAISE EXCEPTION 'V: too few difficult thoughts were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE public.site_content
  SET draft_payload = jsonb_build_object('steps', jsonb_build_array(step))
  WHERE key = 'home_story';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = '{"steps": []}'::jsonb
    WHERE key = 'home_story';
    RAISE EXCEPTION 'V: a story without steps was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'steps', jsonb_build_array(step, step, step, step, step)
    )
    WHERE key = 'home_story';
    RAISE EXCEPTION 'V: a story of five steps was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('home_thoughts');
  PERFORM public.publish_site_content('home_story');

  IF (
    SELECT published_payload ->> 'label'
    FROM public.site_content WHERE key = 'home_thoughts'
  ) IS DISTINCT FROM 'Inne myśli'
  OR (
    SELECT jsonb_array_length(published_payload -> 'steps')
    FROM public.site_content WHERE key = 'home_story'
  ) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'P: publishing did not copy the drafts';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"56000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.site_content
  SET draft_payload = draft_payload WHERE key = 'home_story';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited the story';
  END IF;

  BEGIN
    PERFORM public.publish_site_content('home_thoughts');
    RAISE EXCEPTION 'S: a specialist published the thoughts';
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
    SELECT jsonb_array_length(published_payload -> 'steps')
    FROM public.site_content WHERE key = 'home_story'
  ) IS DISTINCT FROM 1 THEN
    RAISE EXCEPTION 'R: a visitor could not read the published story';
  END IF;

  BEGIN
    PERFORM draft_payload FROM public.site_content WHERE key = 'home_thoughts';
    RAISE EXCEPTION 'R: a visitor read the thoughts draft';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

ROLLBACK;
