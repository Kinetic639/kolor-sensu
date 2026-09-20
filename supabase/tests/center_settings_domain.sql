BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '30000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-center-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Center","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '30000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-center-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Center","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('30000000-0000-4000-8000-000000000001', 'admin'),
  ('30000000-0000-4000-8000-000000000002', 'specialist');

-- O/P: the database enforces the singleton invariant regardless of caller.
DO $$
BEGIN
  BEGIN
    INSERT INTO public.center_settings (id, business_name) VALUES (1, 'Duplicate');
    RAISE EXCEPTION 'O: duplicate center_settings row with the same id was accepted';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.center_settings (id, business_name) VALUES (2, 'Duplicate');
    RAISE EXCEPTION 'O: a second center_settings row with a different id was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.center_public_profile (id, display_name) VALUES (1, 'Duplicate');
    RAISE EXCEPTION 'P: duplicate center_public_profile row with the same id was accepted';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.center_public_profile (id, display_name) VALUES (2, 'Duplicate');
    RAISE EXCEPTION 'P: a second center_public_profile row with a different id was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;
END;
$$;

-- D/H: anonymous access before anything is published.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.center_settings LIMIT 1;
    RAISE EXCEPTION 'D: anon unexpectedly read center settings';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  IF EXISTS (SELECT 1 FROM public.center_public_profile) THEN
    RAISE EXCEPTION 'H: anon unexpectedly read the unpublished center public profile';
  END IF;
END;
$$;

RESET ROLE;

-- A/B/E/I/J: admin operations.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF (SELECT business_name FROM public.center_settings WHERE id = 1) <> 'Kolor Sensu' THEN
    RAISE EXCEPTION 'A: admin could not read center settings';
  END IF;

  UPDATE public.center_settings
  SET business_name = 'Kolor Sensu Test Update', cancellation_window_hours = 48
  WHERE id = 1;

  IF (SELECT cancellation_window_hours FROM public.center_settings WHERE id = 1) <> 48 THEN
    RAISE EXCEPTION 'B: admin update to center settings did not persist';
  END IF;

  IF (SELECT display_name FROM public.center_public_profile WHERE id = 1) <> 'Kolor Sensu' THEN
    RAISE EXCEPTION 'E: admin could not read center public profile';
  END IF;

  UPDATE public.center_public_profile
  SET display_name = 'Kolor Sensu Public', published = true
  WHERE id = 1;

  IF (SELECT published FROM public.center_public_profile WHERE id = 1) IS NOT true THEN
    RAISE EXCEPTION 'E: admin update to center public profile did not persist';
  END IF;

  INSERT INTO public.locations (name, slug, active, publicly_visible)
  VALUES
    ('Test Public Active', 'test-public-active', true, true),
    ('Test Public Hidden', 'test-public-hidden', true, false),
    ('Test Inactive', 'test-inactive', false, true);

  IF (SELECT count(*) FROM public.locations WHERE slug LIKE 'test-%') <> 3 THEN
    RAISE EXCEPTION 'I: admin could not create locations';
  END IF;

  UPDATE public.locations SET active = false WHERE slug = 'test-public-hidden';

  IF (SELECT active FROM public.locations WHERE slug = 'test-public-hidden') IS NOT false THEN
    RAISE EXCEPTION 'J: admin could not update/disable a location';
  END IF;

  -- Restore for the later specialist/anon visibility assertions.
  UPDATE public.locations SET active = true WHERE slug = 'test-public-hidden';
END;
$$;

RESET ROLE;

-- C/F/K/L: specialist operations.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"30000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.center_settings) THEN
    RAISE EXCEPTION 'C: specialist unexpectedly read center settings';
  END IF;

  -- An RLS USING clause that excludes a row makes UPDATE match zero rows
  -- silently (no exception) -- unlike a missing GRANT or a failed WITH CHECK.
  UPDATE public.center_settings SET business_name = 'Unsafe edit' WHERE id = 1;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'C: specialist unexpectedly updated center settings';
  END IF;

  IF (SELECT display_name FROM public.center_public_profile WHERE id = 1) <> 'Kolor Sensu Public' THEN
    RAISE EXCEPTION 'specialist could not read center public profile';
  END IF;

  UPDATE public.center_public_profile SET display_name = 'Unsafe edit' WHERE id = 1;
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'F: specialist unexpectedly updated center public profile';
  END IF;

  IF (SELECT count(*) FROM public.locations WHERE slug LIKE 'test-%') <> 2 THEN
    RAISE EXCEPTION 'K: specialist did not see exactly the active test locations';
  END IF;

  IF EXISTS (SELECT 1 FROM public.locations WHERE slug = 'test-inactive') THEN
    RAISE EXCEPTION 'K: specialist unexpectedly read an inactive location';
  END IF;

  BEGIN
    INSERT INTO public.locations (name, slug) VALUES ('Unsafe', 'test-unsafe-insert');
    RAISE EXCEPTION 'L: specialist unexpectedly created a location';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  UPDATE public.locations SET name = 'Unsafe' WHERE slug = 'test-public-active';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'L: specialist unexpectedly updated a location';
  END IF;

  BEGIN
    DELETE FROM public.locations WHERE slug = 'test-public-active';
    RAISE EXCEPTION 'L: specialist unexpectedly deleted a location';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- G/M/N: anonymous access after publishing.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (SELECT display_name FROM public.center_public_profile WHERE id = 1) <> 'Kolor Sensu Public' THEN
    RAISE EXCEPTION 'G: anon could not read the published center public profile';
  END IF;

  BEGIN
    PERFORM 1 FROM public.center_settings LIMIT 1;
    RAISE EXCEPTION 'D: anon unexpectedly read center settings after publish';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  IF (SELECT count(*) FROM public.locations WHERE slug LIKE 'test-%') <> 1 THEN
    RAISE EXCEPTION 'M: anon did not see exactly the public active location';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.locations WHERE slug = 'test-public-active') THEN
    RAISE EXCEPTION 'M: anon could not read the public active location';
  END IF;

  IF EXISTS (SELECT 1 FROM public.locations WHERE slug = 'test-public-hidden') THEN
    RAISE EXCEPTION 'N: anon unexpectedly read a non-public-visible location';
  END IF;

  IF EXISTS (SELECT 1 FROM public.locations WHERE slug = 'test-inactive') THEN
    RAISE EXCEPTION 'N: anon unexpectedly read an inactive location';
  END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
