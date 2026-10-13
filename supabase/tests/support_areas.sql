-- Home → "Obszary wsparcia" (site_content key 'support_areas') and the
-- site-media bucket for the areas' photos: only admins edit, publish and
-- upload; visitors read only what is published; malformed lists are
-- refused by the database itself.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '51000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'support-areas-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Areas","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '51000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'support-areas-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Areas","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('51000000-0000-4000-8000-000000000001', 'admin'),
  ('51000000-0000-4000-8000-000000000002', 'specialist');

-- The admin: a seeded draft, never published; edits it, publishes it,
-- uploads a photo; malformed lists are refused.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"51000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  area jsonb := jsonb_build_object(
    'id', 'a', 'title', 'Terapia', 'lead', 'Opis.',
    'imagePath', NULL, 'imageAlt', '', 'link', NULL
  );
BEGIN
  IF (
    SELECT jsonb_array_length(draft_payload -> 'areas')
    FROM public.site_content WHERE key = 'support_areas'
  ) IS DISTINCT FROM 5 THEN
    RAISE EXCEPTION 'A: the seeded draft does not hold the five starting areas';
  END IF;

  IF (SELECT published_payload FROM public.site_content WHERE key = 'support_areas')
    IS NOT NULL THEN
    RAISE EXCEPTION 'A: the areas were published before the admin did it';
  END IF;

  UPDATE public.site_content
  SET draft_payload = jsonb_build_object('areas', jsonb_build_array(
    area, area || jsonb_build_object('id', 'b', 'title', 'Warsztaty')
  ))
  WHERE key = 'support_areas';

  -- Refused: no areas, not a list, more than ten, an area without a title,
  -- an area that is not an object.
  BEGIN
    UPDATE public.site_content
    SET draft_payload = '{"areas": []}'::jsonb WHERE key = 'support_areas';
    RAISE EXCEPTION 'V: an empty list of areas was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = '{"areas": {"id": "a"}}'::jsonb WHERE key = 'support_areas';
    RAISE EXCEPTION 'V: areas that are not a list were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object('areas', (
      SELECT jsonb_agg(area || jsonb_build_object('id', 'a' || n))
      FROM generate_series(1, 11) AS n
    ))
    WHERE key = 'support_areas';
    RAISE EXCEPTION 'V: eleven areas were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object('areas', jsonb_build_array(area - 'title'))
    WHERE key = 'support_areas';
    RAISE EXCEPTION 'V: an area without a title was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = '{"areas": ["Terapia"]}'::jsonb WHERE key = 'support_areas';
    RAISE EXCEPTION 'V: an area that is not an object was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('support_areas');

  IF (
    SELECT published_payload -> 'areas' -> 1 ->> 'title'
    FROM public.site_content WHERE key = 'support_areas'
  ) IS DISTINCT FROM 'Warsztaty' THEN
    RAISE EXCEPTION 'P: publishing did not copy the draft';
  END IF;

  INSERT INTO storage.objects (bucket_id, name, owner_id, metadata)
  VALUES (
    'site-media', 'support-areas/test.webp', auth.uid()::text,
    '{"mimetype":"image/webp","size":100}'
  );
END;
$$;

RESET ROLE;

-- A specialist: neither reads nor edits the areas, nor uploads photos.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"51000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.site_content WHERE key = 'support_areas') THEN
    RAISE EXCEPTION 'S: a specialist read the areas draft';
  END IF;

  UPDATE public.site_content
  SET draft_payload = '{"areas": [{"id": "x", "title": "x", "lead": "x"}]}'::jsonb
  WHERE key = 'support_areas';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited the areas';
  END IF;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id, metadata)
    VALUES (
      'site-media', 'support-areas/specialist.webp', auth.uid()::text,
      '{"mimetype":"image/webp","size":100}'
    );
    RAISE EXCEPTION 'S: a specialist uploaded a site photo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- A visitor: reads the published areas, never the draft, uploads nothing.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (
    SELECT jsonb_array_length(published_payload -> 'areas')
    FROM public.site_content WHERE key = 'support_areas'
  ) IS DISTINCT FROM 2 THEN
    RAISE EXCEPTION 'R: a visitor could not read the published areas';
  END IF;

  BEGIN
    PERFORM draft_payload FROM public.site_content WHERE key = 'support_areas';
    RAISE EXCEPTION 'R: a visitor read the areas draft';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, metadata)
    VALUES (
      'site-media', 'support-areas/anon.webp',
      '{"mimetype":"image/webp","size":100}'
    );
    RAISE EXCEPTION 'R: a visitor uploaded a site photo';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

ROLLBACK;
