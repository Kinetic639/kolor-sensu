-- Home → "Pierwszy krok" (site_content key 'first_steps'): only admins
-- edit and publish; visitors read only what is published; a band without
-- exactly four proper steps is refused by the database itself.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '53000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'first-steps-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Steps","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '53000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'first-steps-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Steps","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('53000000-0000-4000-8000-000000000001', 'admin'),
  ('53000000-0000-4000-8000-000000000002', 'specialist');

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"53000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  step jsonb := '{"title": "Krok", "text": "Opis."}'::jsonb;
BEGIN
  IF (
    SELECT jsonb_array_length(draft_payload -> 'steps')
    FROM public.site_content WHERE key = 'first_steps'
  ) IS DISTINCT FROM 4 THEN
    RAISE EXCEPTION 'A: the seeded draft does not hold four steps';
  END IF;

  UPDATE public.site_content
  SET draft_payload = jsonb_build_object(
    'visible', false, 'steps', jsonb_build_array(step, step, step, step)
  )
  WHERE key = 'first_steps';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'visible', true, 'steps', jsonb_build_array(step, step, step)
    )
    WHERE key = 'first_steps';
    RAISE EXCEPTION 'V: three steps were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'visible', true,
      'steps', jsonb_build_array(step, step, step, step - 'text')
    )
    WHERE key = 'first_steps';
    RAISE EXCEPTION 'V: a step without its sentence was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'steps', jsonb_build_array(step, step, step, step)
    )
    WHERE key = 'first_steps';
    RAISE EXCEPTION 'V: a band without its switch was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('first_steps');

  IF (
    SELECT published_payload ->> 'visible'
    FROM public.site_content WHERE key = 'first_steps'
  ) IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'P: publishing did not copy the draft';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"53000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.site_content WHERE key = 'first_steps') THEN
    RAISE EXCEPTION 'S: a specialist read the steps draft';
  END IF;

  UPDATE public.site_content
  SET draft_payload = draft_payload WHERE key = 'first_steps';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited the steps';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (
    SELECT published_payload ->> 'visible'
    FROM public.site_content WHERE key = 'first_steps'
  ) IS DISTINCT FROM 'false' THEN
    RAISE EXCEPTION 'R: a visitor could not read the published steps';
  END IF;

  BEGIN
    PERFORM draft_payload FROM public.site_content WHERE key = 'first_steps';
    RAISE EXCEPTION 'R: a visitor read the steps draft';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

ROLLBACK;
