-- The site's shared settings ('site_appearance'): seeded with nothing
-- chosen and unpublished; only admins edit and publish; visitors read only
-- what is published; settings of the wrong shape are refused by the
-- database itself.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '58000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'site-appearance-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Look","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '58000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'site-appearance-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Look","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('58000000-0000-4000-8000-000000000001', 'admin'),
  ('58000000-0000-4000-8000-000000000002', 'specialist');

-- The seed (as the owner: the payload as stored).
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.site_content
    WHERE key = 'site_appearance'
      AND published_payload IS NULL
      AND draft_payload = '{"watercolorBackdropPath": null, "watercolorParallaxPath": null}'::jsonb
  ) THEN
    RAISE EXCEPTION 'M: the shared settings were not seeded empty and unpublished';
  END IF;
END;
$$;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"58000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  look jsonb := '{"watercolorBackdropPath": "appearance/backdrop.webp",
    "watercolorParallaxPath": "appearance/drops.png"}'::jsonb;
BEGIN
  UPDATE public.site_content SET draft_payload = look
  WHERE key = 'site_appearance';

  -- Only a backdrop, no parallax layer.
  UPDATE public.site_content
  SET draft_payload = look || '{"watercolorParallaxPath": null}'::jsonb
  WHERE key = 'site_appearance';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = look - 'watercolorParallaxPath'
    WHERE key = 'site_appearance';
    RAISE EXCEPTION 'V: settings without the parallax layer were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = look || '{"watercolorBackdropPath": 5}'::jsonb
    WHERE key = 'site_appearance';
    RAISE EXCEPTION 'V: a backdrop that is not a path was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(
      look, '{watercolorBackdropPath}', to_jsonb(repeat('a', 301))
    )
    WHERE key = 'site_appearance';
    RAISE EXCEPTION 'V: a path of 301 characters was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = '[]'::jsonb WHERE key = 'site_appearance';
    RAISE EXCEPTION 'V: settings that are not an object were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  UPDATE public.site_content SET draft_payload = look
  WHERE key = 'site_appearance';
  PERFORM public.publish_site_content('site_appearance');

  IF (
    SELECT published_payload ->> 'watercolorParallaxPath'
    FROM public.site_content WHERE key = 'site_appearance'
  ) IS DISTINCT FROM 'appearance/drops.png' THEN
    RAISE EXCEPTION 'P: publishing did not copy the draft';
  END IF;
END;
$$;

RESET ROLE;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"58000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.site_content
  SET draft_payload = draft_payload WHERE key = 'site_appearance';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited the shared settings';
  END IF;

  BEGIN
    PERFORM public.publish_site_content('site_appearance');
    RAISE EXCEPTION 'S: a specialist published the shared settings';
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
    SELECT published_payload ->> 'watercolorBackdropPath'
    FROM public.site_content WHERE key = 'site_appearance'
  ) IS DISTINCT FROM 'appearance/backdrop.webp' THEN
    RAISE EXCEPTION 'R: a visitor could not read the published settings';
  END IF;

  BEGIN
    PERFORM draft_payload FROM public.site_content
    WHERE key = 'site_appearance';
    RAISE EXCEPTION 'R: a visitor read a draft';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

ROLLBACK;
