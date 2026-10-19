-- Home → "Myśli, które się odmieniają" ('home_thoughts') in pairs, from
-- 19.10: rows saved as two lists are converted to pairs the way the site
-- showed them; the database refuses a pair missing a side, too few pairs
-- and the old lists; only admins write and publish; visitors read only
-- what is published.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '57000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'thought-pairs-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Pairs","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '57000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'thought-pairs-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Pairs","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('57000000-0000-4000-8000-000000000001', 'admin'),
  ('57000000-0000-4000-8000-000000000002', 'specialist');

-- The conversion (as the owner: the payloads as stored).
DO $$
DECLARE
  draft jsonb;
BEGIN
  SELECT draft_payload INTO draft
  FROM public.site_content WHERE key = 'home_thoughts';

  IF draft ?| ARRAY['negative', 'positive'] THEN
    RAISE EXCEPTION 'M: the seeded thoughts still hold the two lists';
  END IF;

  IF jsonb_array_length(draft -> 'pairs') IS DISTINCT FROM 28
    OR draft ->> 'label' IS DISTINCT FROM
      'Pod natłokiem trudnych myśli kryją się inne'
  THEN
    RAISE EXCEPTION 'M: the seeded thoughts did not become their 28 pairs';
  END IF;

  -- As the site showed them: two rows, a kinder thought for each pair of
  -- neighbours (defaultHomeThoughts in the contracts).
  IF draft -> 'pairs' -> 0 IS DISTINCT FROM
      '{"negative": "nie dam rady", "positive": "Mam prawo tak czuć"}'::jsonb
    OR draft -> 'pairs' -> 1 IS DISTINCT FROM
      '{"negative": "znowu to samo", "positive": "Mam prawo tak czuć"}'::jsonb
    OR draft -> 'pairs' -> 27 IS DISTINCT FROM
      '{"negative": "boję się", "positive": "Mam na kogo liczyć"}'::jsonb
  THEN
    RAISE EXCEPTION 'M: the seeded thoughts were paired unlike the site';
  END IF;

  -- Any lists: rows a c e | b d shown three times over, A B C D in turn
  -- (pairLegacyThoughts in the contracts gives the same).
  IF private.home_thoughts_as_pairs(
    '{"label": "Myśli", "negative": ["a", " b ", "c", "d", "e"],
      "positive": ["A", "B", "C", "D"]}'::jsonb
  ) IS DISTINCT FROM '{"label": "Myśli", "pairs": [
      {"negative": "a", "positive": "A"},
      {"negative": "b", "positive": "B"},
      {"negative": "c", "positive": "B"},
      {"negative": "d", "positive": "C"},
      {"negative": "e", "positive": "C"}
    ]}'::jsonb
  THEN
    RAISE EXCEPTION 'M: two lists were paired unlike the site';
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
  pair jsonb := '{"negative": "lęk", "positive": "To minie"}'::jsonb;
  eight jsonb;
BEGIN
  SELECT jsonb_agg(pair) INTO eight FROM generate_series(1, 8);

  UPDATE public.site_content
  SET draft_payload = jsonb_build_object('label', 'Myśli', 'pairs', eight)
  WHERE key = 'home_thoughts';

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'label', 'Myśli',
      'pairs', eight || '[{"negative": "wstyd"}]'::jsonb
    )
    WHERE key = 'home_thoughts';
    RAISE EXCEPTION 'V: a pair without its kinder thought was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'label', 'Myśli',
      'pairs', eight || '[{"negative": "  ", "positive": "To minie"}]'::jsonb
    )
    WHERE key = 'home_thoughts';
    RAISE EXCEPTION 'V: a pair with an empty difficult thought was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'label', 'Myśli', 'pairs', eight - 0
    )
    WHERE key = 'home_thoughts';
    RAISE EXCEPTION 'V: seven pairs were accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object(
      'label', 'Myśli',
      'negative', '["a", "b", "c", "d", "e", "f", "g", "h"]'::jsonb,
      'positive', '["A", "B", "C"]'::jsonb
    )
    WHERE key = 'home_thoughts';
    RAISE EXCEPTION 'V: the two lists were accepted after the pairs';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  PERFORM public.publish_site_content('home_thoughts');

  IF (
    SELECT published_payload -> 'pairs' -> 0
    FROM public.site_content WHERE key = 'home_thoughts'
  ) IS DISTINCT FROM pair THEN
    RAISE EXCEPTION 'P: publishing did not copy the pairs';
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
  SET draft_payload = draft_payload || '{"label": "Inne"}'::jsonb
  WHERE key = 'home_thoughts';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'S: a specialist edited the thoughts';
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
    SELECT jsonb_array_length(published_payload -> 'pairs')
    FROM public.site_content WHERE key = 'home_thoughts'
  ) IS DISTINCT FROM 8 THEN
    RAISE EXCEPTION 'R: a visitor could not read the published pairs';
  END IF;

  BEGIN
    UPDATE public.site_content
    SET published_payload = published_payload || '{"label": "Inne"}'::jsonb
    WHERE key = 'home_thoughts';
    IF FOUND THEN
      RAISE EXCEPTION 'R: a visitor changed the thoughts';
    END IF;
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

ROLLBACK;
