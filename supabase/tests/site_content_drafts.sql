-- The CMS preview (issue #109): the site reads drafts through
-- get_site_content_draft(key) and polls get_site_content_draft_version(),
-- both executable only by service_role (the site's server). Visitors (anon)
-- and every signed-in session (authenticated: a specialist, even an admin)
-- may not call them; admins read drafts through the table in the portal.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '51090000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'preview-test-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Preview","last_name":"Specialist"}',
    now(), now(), false, false
  ),
  (
    '51090000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'preview-test-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Preview","last_name":"Admin"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('51090000-0000-4000-8000-000000000001', 'specialist'),
  ('51090000-0000-4000-8000-000000000002', 'admin');

UPDATE public.site_content
SET draft_payload = draft_payload || jsonb_build_object('heading', 'Szkic podglądu')
WHERE key = 'home';

-- The grants themselves: only service_role (and the owner) may execute.
DO $$
BEGIN
  IF has_function_privilege('anon', 'public.get_site_content_draft(text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.get_site_content_draft(text)', 'EXECUTE')
    OR has_function_privilege('anon', 'public.get_site_content_draft_version()', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.get_site_content_draft_version()', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'grants: anon or authenticated may execute the draft functions';
  END IF;
  IF NOT has_function_privilege('service_role', 'public.get_site_content_draft(text)', 'EXECUTE')
    OR NOT has_function_privilege('service_role', 'public.get_site_content_draft_version()', 'EXECUTE')
  THEN
    RAISE EXCEPTION 'grants: service_role may not execute the draft functions';
  END IF;
END;
$$;

-- A: anon (a visitor) cannot read a draft.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM public.get_site_content_draft('home');
    RAISE EXCEPTION 'A: anon read a draft';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.get_site_content_draft_version();
    RAISE EXCEPTION 'A: anon read the drafts'' version';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- B: a signed-in specialist cannot read a draft.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"51090000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.get_site_content_draft('home');
    RAISE EXCEPTION 'B: a specialist read a draft';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.get_site_content_draft_version();
    RAISE EXCEPTION 'B: a specialist read the drafts'' version';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- C: nor through an admin's session (the portal reads drafts through the
-- table, as before).
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"51090000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.get_site_content_draft('home');
    RAISE EXCEPTION 'C: an authenticated session executed the draft function';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- D: service_role (the site's server) reads the draft and its version.
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
SET LOCAL ROLE service_role;

DO $$
BEGIN
  IF public.get_site_content_draft('home') ->> 'heading'
    IS DISTINCT FROM 'Szkic podglądu' THEN
    RAISE EXCEPTION 'D: service_role did not read the current draft';
  END IF;
  IF public.get_site_content_draft('no_such_key') IS NOT NULL THEN
    RAISE EXCEPTION 'D: an unknown key returned a draft';
  END IF;
  IF public.get_site_content_draft_version() IS DISTINCT FROM
    (SELECT max(updated_at) FROM public.site_content) THEN
    RAISE EXCEPTION 'D: the version is not the latest change';
  END IF;
END;
$$;

RESET ROLE;

-- E: saving a draft moves the version to that save (the preview refreshes
-- on it): the trigger stamps updated_at with now().
DO $$
BEGIN
  UPDATE public.site_content
  SET draft_payload = draft_payload
  WHERE key = 'rooms';
  IF public.get_site_content_draft_version() IS DISTINCT FROM now() THEN
    RAISE EXCEPTION 'E: the version did not follow a saved draft';
  END IF;
END;
$$;

ROLLBACK;
