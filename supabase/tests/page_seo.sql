-- Every page's search and sharing settings ('seo_<page>'): seeded empty
-- (the site's own) and unpublished; only admins edit and publish;
-- visitors read only what is published; settings of the wrong shape
-- (a field missing, of another type or too long, a key for a page that
-- does not exist) are refused by the database itself.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '57000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'page-seo-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Seo","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '57000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'page-seo-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Seo","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('57000000-0000-4000-8000-000000000001', 'admin'),
  ('57000000-0000-4000-8000-000000000002', 'specialist');

-- The seed (as the owner: the payloads as stored).
DO $$
BEGIN
  IF (
    SELECT count(*) FROM public.site_content WHERE key LIKE 'seo\_%'
  ) IS DISTINCT FROM 14::bigint THEN
    RAISE EXCEPTION 'M: not every page''s settings were seeded';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.site_content
    WHERE key LIKE 'seo\_%'
      AND (
        published_payload IS NOT NULL
        OR draft_payload ->> 'title' <> ''
        OR (draft_payload ->> 'noindex')::boolean
      )
  ) THEN
    RAISE EXCEPTION 'M: a page''s settings were seeded published or filled';
  END IF;

  -- No row for a page that does not exist, not even for the owner.
  BEGIN
    INSERT INTO public.site_content (key, draft_payload)
    SELECT 'seo_unknown', draft_payload
    FROM public.site_content WHERE key = 'seo_home';
    RAISE EXCEPTION 'V: settings for an unknown page were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
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
  seo jsonb := '{"title": "O nas | Kolor Sensu", "description": "Kim jesteśmy.",
    "ogTitle": "Poznaj Kolor Sensu", "ogDescription": "Zespół terapeutów.",
    "ogImagePath": "seo/about.jpg", "ogImageAlt": "Gabinet", "noindex": false}'::jsonb;
BEGIN
  UPDATE public.site_content SET draft_payload = seo WHERE key = 'seo_about';
  UPDATE public.site_content
  SET draft_payload = seo || '{"ogImagePath": null, "noindex": true}'::jsonb
  WHERE key = 'seo_cookies';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = seo - 'noindex' WHERE key = 'seo_about';
    RAISE EXCEPTION 'V: settings without noindex were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = seo || '{"noindex": "tak"}'::jsonb
    WHERE key = 'seo_about';
    RAISE EXCEPTION 'V: a noindex that is not true or false was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = seo || '{"ogImagePath": 5}'::jsonb
    WHERE key = 'seo_about';
    RAISE EXCEPTION 'V: a picture that is not a path was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(seo, '{title}', to_jsonb(repeat('a', 121)))
    WHERE key = 'seo_about';
    RAISE EXCEPTION 'V: a title of 121 characters was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_set(
      seo, '{description}', to_jsonb(repeat('a', 321))
    )
    WHERE key = 'seo_about';
    RAISE EXCEPTION 'V: a description of 321 characters was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = '[]'::jsonb WHERE key = 'seo_home';
    RAISE EXCEPTION 'V: settings that are not an object were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('seo_about');

  IF (
    SELECT published_payload ->> 'ogTitle'
    FROM public.site_content WHERE key = 'seo_about'
  ) IS DISTINCT FROM 'Poznaj Kolor Sensu' THEN
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
  UPDATE public.site_content
  SET draft_payload = draft_payload WHERE key = 'seo_home';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited a page''s settings';
  END IF;

  BEGIN
    PERFORM public.publish_site_content('seo_home');
    RAISE EXCEPTION 'S: a specialist published a page''s settings';
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
    SELECT published_payload ->> 'title'
    FROM public.site_content WHERE key = 'seo_about'
  ) IS DISTINCT FROM 'O nas | Kolor Sensu' THEN
    RAISE EXCEPTION 'R: a visitor could not read the published settings';
  END IF;

  IF EXISTS (SELECT 1 FROM public.site_content WHERE key = 'seo_cookies') THEN
    RAISE EXCEPTION 'R: a visitor saw unpublished settings';
  END IF;

  BEGIN
    PERFORM draft_payload FROM public.site_content WHERE key = 'seo_home';
    RAISE EXCEPTION 'R: a visitor read a draft';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

ROLLBACK;
