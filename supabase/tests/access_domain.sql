BEGIN;

-- Who may use the portals (Ustawienia → Dostęp), a specialist's two
-- settings (Aktywny, Widoczny na stronie) and the news of a profile sent
-- for review and reviewed. Everything is rolled back at the end.

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('73000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-access-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ada","last_name":"Access"}', now(), now(), false, false),
  ('73000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-access-admin2@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Bea","last_name":"Access"}', now(), now(), false, false),
  ('73000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'domain-test-access-anna@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Anna","last_name":"Access"}', now(), now(), false, false),
  ('73000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
    'domain-test-access-jan@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Jan","last_name":"Access"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('73000000-0000-4000-8000-000000000001', 'admin'),
  ('73000000-0000-4000-8000-000000000002', 'admin'),
  ('73000000-0000-4000-8000-000000000003', 'specialist'),
  ('73000000-0000-4000-8000-000000000004', 'specialist');

CREATE TEMP TABLE access_test AS
SELECT
  '73000000-0000-4000-8000-000000000001'::uuid AS ada,
  '73000000-0000-4000-8000-000000000002'::uuid AS bea,
  '73000000-0000-4000-8000-000000000003'::uuid AS anna,
  '73000000-0000-4000-8000-000000000004'::uuid AS jan,
  (SELECT id FROM public.specialists WHERE user_id = '73000000-0000-4000-8000-000000000003') AS anna_specialist;
GRANT SELECT ON access_test TO anon, authenticated, service_role;

-- What a statement raised: its hint, else its SQLSTATE ('' when nothing).
CREATE FUNCTION pg_temp.refusal_of(p_sql text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  hint text;
  state text;
BEGIN
  EXECUTE p_sql;
  RETURN '';
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT, state = RETURNED_SQLSTATE;
  RETURN coalesce(nullif(hint, ''), state);
END;
$$;
GRANT EXECUTE ON FUNCTION pg_temp.refusal_of(text) TO anon, authenticated, service_role;

CREATE FUNCTION pg_temp.as_user(p_user uuid)
RETURNS void
LANGUAGE sql
AS $$
  SELECT set_config('request.jwt.claims',
    json_build_object('sub', p_user, 'role', 'authenticated')::text, true);
$$;

-- A: a new specialist starts inactive and off the site; their portal works.
DO $$
BEGIN
  IF (SELECT (active, publicly_visible) FROM public.specialists
      WHERE id = (SELECT anna_specialist FROM access_test)) IS DISTINCT FROM (false, false) THEN
    RAISE EXCEPTION 'A: a new specialist is not inactive and off the site';
  END IF;
END;
$$;

-- B: the admins see every portal user; nobody else sees any.
SELECT pg_temp.as_user((SELECT ada FROM access_test));
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  row_anna record;
BEGIN
  SELECT * INTO row_anna FROM public.list_portal_users() WHERE user_id = (SELECT anna FROM access_test);
  IF row_anna IS NULL OR row_anna.email <> 'domain-test-access-anna@example.invalid'
     OR row_anna.is_admin OR NOT row_anna.is_specialist OR row_anna.joined THEN
    RAISE EXCEPTION 'B: Anna in the list: %', row_to_json(row_anna);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.list_portal_users()
                 WHERE user_id = (SELECT bea FROM access_test) AND is_admin) THEN
    RAISE EXCEPTION 'B: the other admin missing';
  END IF;
END;
$$;
RESET ROLE;

SELECT pg_temp.as_user((SELECT anna FROM access_test));
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.list_portal_users()) THEN
    RAISE EXCEPTION 'B: a specialist listed the portal users';
  END IF;
  -- C: a specialist gives nobody access, nor changes a specialist.
  IF pg_temp.refusal_of(format('SELECT public.grant_admin(%L)', (SELECT anna FROM access_test))) <> 'forbidden' THEN
    RAISE EXCEPTION 'C: a specialist made themselves an admin';
  END IF;
  IF pg_temp.refusal_of(format('SELECT public.revoke_admin(%L)', (SELECT ada FROM access_test))) <> 'forbidden' THEN
    RAISE EXCEPTION 'C: a specialist took an admin''s access';
  END IF;
  IF pg_temp.refusal_of(format('SELECT public.set_specialist_active(%L, true)', (SELECT anna_specialist FROM access_test))) <> 'forbidden' THEN
    RAISE EXCEPTION 'C: a specialist made themselves active';
  END IF;
  IF pg_temp.refusal_of(format('SELECT public.set_specialist_visibility(%L, true)', (SELECT anna_specialist FROM access_test))) <> 'forbidden' THEN
    RAISE EXCEPTION 'C: a specialist put themselves on the site';
  END IF;
  IF pg_temp.refusal_of(format('SELECT public.portal_user_id_by_email(%L)', 'domain-test-access-ada@example.invalid')) <> '42501' THEN
    RAISE EXCEPTION 'C: a specialist looked up an account by address';
  END IF;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF pg_temp.refusal_of('SELECT public.list_portal_users()') <> '42501' THEN
    RAISE EXCEPTION 'B: a visitor listed the portal users';
  END IF;
  IF pg_temp.refusal_of(format('SELECT public.grant_admin(%L)', gen_random_uuid())) <> '42501' THEN
    RAISE EXCEPTION 'C: a visitor called grant_admin';
  END IF;
END;
$$;
RESET ROLE;

-- D: an admin gives a specialist the admin's access and takes it back;
-- nobody takes their own.
SELECT pg_temp.as_user((SELECT ada FROM access_test));
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.grant_admin((SELECT anna FROM access_test));
  -- Twice is the same as once.
  PERFORM public.grant_admin((SELECT anna FROM access_test));
  IF NOT (SELECT is_admin AND is_specialist FROM public.list_portal_users()
          WHERE user_id = (SELECT anna FROM access_test)) THEN
    RAISE EXCEPTION 'D: Anna is not an admin and a specialist';
  END IF;
  IF pg_temp.refusal_of(format('SELECT public.grant_admin(%L)', gen_random_uuid())) <> 'not_found' THEN
    RAISE EXCEPTION 'D: an admin made of nobody';
  END IF;
  IF pg_temp.refusal_of(format('SELECT public.revoke_admin(%L)', (SELECT ada FROM access_test))) <> 'own_access' THEN
    RAISE EXCEPTION 'D: an admin took their own access';
  END IF;
  PERFORM public.revoke_admin((SELECT anna FROM access_test));
  IF (SELECT is_admin FROM public.list_portal_users() WHERE user_id = (SELECT anna FROM access_test))
     OR NOT (SELECT is_specialist FROM public.list_portal_users() WHERE user_id = (SELECT anna FROM access_test)) THEN
    RAISE EXCEPTION 'D: taking the admin''s access took more';
  END IF;
  PERFORM public.revoke_admin((SELECT bea FROM access_test));
  IF (SELECT is_admin FROM public.list_portal_users() WHERE user_id = (SELECT bea FROM access_test)) THEN
    RAISE EXCEPTION 'D: the other admin kept their access';
  END IF;
END;
$$;
RESET ROLE;

-- E: the invitation finds an existing account by address, in any case.
SET LOCAL ROLE service_role;
DO $$
BEGIN
  IF public.portal_user_id_by_email('  Domain-Test-Access-Jan@Example.Invalid ') IS DISTINCT FROM (SELECT jan FROM access_test) THEN
    RAISE EXCEPTION 'E: the account by its address';
  END IF;
  IF public.portal_user_id_by_email('nobody-access@example.invalid') IS NOT NULL THEN
    RAISE EXCEPTION 'E: an account for an unknown address';
  END IF;
END;
$$;
RESET ROLE;

-- F: the admin turns a specialist's settings on and off; turned off, the
-- specialist keeps their portal (and their visits).
SELECT pg_temp.as_user((SELECT ada FROM access_test));
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF public.set_specialist_active((SELECT anna_specialist FROM access_test), true) <> 0 THEN
    RAISE EXCEPTION 'F: visits to come for a new specialist';
  END IF;
  PERFORM public.set_specialist_visibility((SELECT anna_specialist FROM access_test), true);
  IF pg_temp.refusal_of(format('SELECT public.set_specialist_active(%L, true)', gen_random_uuid())) <> 'not_found'
     OR pg_temp.refusal_of(format('SELECT public.set_specialist_visibility(%L, true)', gen_random_uuid())) <> 'not_found' THEN
    RAISE EXCEPTION 'F: settings of nobody';
  END IF;
END;
$$;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT (active, publicly_visible) FROM public.specialists
      WHERE id = (SELECT anna_specialist FROM access_test)) IS DISTINCT FROM (true, true) THEN
    RAISE EXCEPTION 'F: both settings on';
  END IF;
END;
$$;
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.set_specialist_active((SELECT anna_specialist FROM access_test), false);
  PERFORM public.set_specialist_visibility((SELECT anna_specialist FROM access_test), false);
END;
$$;
RESET ROLE;
DO $$
BEGIN
  IF (SELECT (active, publicly_visible) FROM public.specialists
      WHERE id = (SELECT anna_specialist FROM access_test)) IS DISTINCT FROM (false, false) THEN
    RAISE EXCEPTION 'F: both settings off';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.user_roles
                 WHERE user_id = (SELECT anna FROM access_test) AND role = 'specialist') THEN
    RAISE EXCEPTION 'F: an inactive specialist lost their portal';
  END IF;
END;
$$;

-- G: a profile sent for review is news for every admin but its sender;
-- reviewed, it is news for the specialist but not the reviewer.
SELECT pg_temp.as_user((SELECT anna FROM access_test));
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  draft uuid;
BEGIN
  SELECT public.save_my_specialist_profile_draft(
    p_first_name => 'Anna', p_last_name => 'Access', p_short_bio => 'Psycholożka'
  ) INTO draft;
  PERFORM public.submit_my_specialist_profile_draft(draft);
END;
$$;
RESET ROLE;
DO $$
DECLARE
  t access_test%ROWTYPE;
BEGIN
  SELECT * INTO t FROM access_test;
  IF NOT EXISTS (SELECT 1 FROM public.notifications
                 WHERE user_id = t.ada AND portal = 'admin' AND kind = 'profile_submitted'
                   AND appointment_id IS NULL
                   AND details ->> 'specialist_id' = t.anna_specialist::text
                   AND details ->> 'specialist_name' = 'Anna Access') THEN
    RAISE EXCEPTION 'G: the admin was not told of a profile to review';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notifications WHERE user_id = t.anna) THEN
    RAISE EXCEPTION 'G: the specialist was told of their own profile';
  END IF;
END;
$$;

SELECT pg_temp.as_user((SELECT ada FROM access_test));
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.reject_specialist_profile_draft(
    (SELECT id FROM public.specialist_profile_drafts
     WHERE specialist_id = (SELECT anna_specialist FROM access_test) AND status = 'pending_review'),
    'Dodaj zdjęcie');
END;
$$;
RESET ROLE;
DO $$
DECLARE
  t access_test%ROWTYPE;
BEGIN
  SELECT * INTO t FROM access_test;
  IF NOT EXISTS (SELECT 1 FROM public.notifications
                 WHERE user_id = t.anna AND portal = 'specialist' AND kind = 'profile_rejected'
                   AND details ->> 'reason' = 'Dodaj zdjęcie') THEN
    RAISE EXCEPTION 'G: the specialist was not told why their profile came back';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notifications
             WHERE user_id = t.ada AND kind IN ('profile_approved', 'profile_rejected')) THEN
    RAISE EXCEPTION 'G: the reviewer was told of their own review';
  END IF;
END;
$$;

-- Sent again, and approved.
SELECT pg_temp.as_user((SELECT anna FROM access_test));
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  draft uuid;
BEGIN
  SELECT public.save_my_specialist_profile_draft(
    p_first_name => 'Anna', p_last_name => 'Access', p_short_bio => 'Psycholożka, ze zdjęciem'
  ) INTO draft;
  PERFORM public.submit_my_specialist_profile_draft(draft);
END;
$$;
RESET ROLE;
SELECT pg_temp.as_user((SELECT ada FROM access_test));
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.approve_specialist_profile_draft(
    (SELECT id FROM public.specialist_profile_drafts
     WHERE specialist_id = (SELECT anna_specialist FROM access_test) AND status = 'pending_review'),
    NULL);
END;
$$;
RESET ROLE;
DO $$
DECLARE
  t access_test%ROWTYPE;
BEGIN
  SELECT * INTO t FROM access_test;
  IF (SELECT count(*) FROM public.notifications
      WHERE user_id = t.ada AND kind = 'profile_submitted') <> 2 THEN
    RAISE EXCEPTION 'G: a profile sent again is news again';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notifications
                 WHERE user_id = t.anna AND kind = 'profile_approved' AND NOT details ? 'reason') THEN
    RAISE EXCEPTION 'G: the specialist was not told their profile was approved';
  END IF;
  -- Approved, the profile is not on the site until the admin puts it there.
  IF (SELECT publicly_visible FROM public.specialists WHERE id = t.anna_specialist) THEN
    RAISE EXCEPTION 'G: approving put the specialist on the site';
  END IF;
END;
$$;

ROLLBACK;
