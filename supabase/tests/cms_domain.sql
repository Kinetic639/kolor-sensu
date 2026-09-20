-- Covers task items A, B, C, D, E, G, I. F ("Home renders at /") and H ("no
-- arbitrary CMS route can be created") are structural/Playwright-level
-- concerns -- there is no dynamic CMS route in the codebase at all, and
-- Home is Next.js's own fixed apps/web/src/app/page.tsx -- proven in
-- tests/e2e/cms-domain.spec.ts, not faked here as SQL assertions.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '50000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-cms-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Cms","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '50000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-cms-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Cms","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('50000000-0000-4000-8000-000000000001', 'admin'),
  ('50000000-0000-4000-8000-000000000002', 'specialist');

-- A/D/E/G/I: admin reads/edits the Home draft, publishes, and the DB
-- invariants around it.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.site_content
    WHERE key = 'home' AND draft_payload ? 'heading' AND draft_payload ? 'body'
  ) THEN
    RAISE EXCEPTION 'A: admin could not read the Home draft';
  END IF;

  UPDATE public.site_content
  SET draft_payload = jsonb_build_object(
    'heading', 'Test heading', 'body', 'Test body', 'buttonLabel', NULL
  )
  WHERE key = 'home';

  IF (SELECT draft_payload ->> 'heading' FROM public.site_content WHERE key = 'home')
    <> 'Test heading' THEN
    RAISE EXCEPTION 'A: admin edit to the Home draft did not persist';
  END IF;

  -- Admin has no INSERT grant at all on site_content (the singleton row is
  -- migration-seeded, matching the center_settings/center_public_profile
  -- pattern) -- this fails at the grant layer, before any CHECK would even
  -- run. That is itself the "no arbitrary CMS page can be created"
  -- guarantee: not even Admin can create a new site_content row.
  BEGIN
    INSERT INTO public.site_content (key, draft_payload)
    VALUES ('not-home', jsonb_build_object('heading', 'x', 'body', 'y'));
    RAISE EXCEPTION 'G: an arbitrary CMS page key was accepted';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = jsonb_build_object('heading', 'Missing body')
    WHERE key = 'home';
    RAISE EXCEPTION 'I: a malformed Home payload (missing body) was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    UPDATE public.site_content
    SET draft_payload = '["not", "an", "object"]'::jsonb
    WHERE key = 'home';
    RAISE EXCEPTION 'I: a non-object Home payload was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  -- Restore the intended draft edit (the two bad UPDATE attempts above
  -- were rejected atomically and never applied).
  IF (SELECT draft_payload ->> 'heading' FROM public.site_content WHERE key = 'home')
    <> 'Test heading' THEN
    RAISE EXCEPTION 'I: a rejected update leaked a partial write';
  END IF;

  PERFORM public.publish_site_content('home');

  IF (SELECT published_payload ->> 'heading' FROM public.site_content WHERE key = 'home')
    <> 'Test heading' THEN
    RAISE EXCEPTION 'D: publish did not copy the current draft to published';
  END IF;

  -- A further draft edit after publish must not retroactively change what
  -- was already published.
  UPDATE public.site_content
  SET draft_payload = jsonb_build_object(
    'heading', 'Edited after publish', 'body', 'Test body', 'buttonLabel', NULL
  )
  WHERE key = 'home';

  IF (SELECT published_payload ->> 'heading' FROM public.site_content WHERE key = 'home')
    <> 'Test heading' THEN
    RAISE EXCEPTION 'E: a later draft edit leaked into the published content';
  END IF;
END;
$$;

RESET ROLE;

-- B: specialist has no CMS access at all.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"50000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.site_content WHERE key = 'home') THEN
    RAISE EXCEPTION 'B: specialist unexpectedly read the Home draft row';
  END IF;

  UPDATE public.site_content
  SET draft_payload = jsonb_build_object('heading', 'Hacked', 'body', 'Hacked')
  WHERE key = 'home';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'B: specialist unexpectedly updated the Home draft';
  END IF;
END;
$$;

RESET ROLE;

-- C: anon can never read draft content, even via a direct column select
-- (draft_payload is not a grantable column for anon at all, unlike
-- published_payload/published_at which are).
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM draft_payload FROM public.site_content WHERE key = 'home';
    RAISE EXCEPTION 'C: anon unexpectedly read the Home draft payload';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  IF (SELECT published_payload ->> 'heading' FROM public.site_content WHERE key = 'home')
    IS DISTINCT FROM 'Test heading' THEN
    RAISE EXCEPTION 'D: anon could not read the published Home content';
  END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
