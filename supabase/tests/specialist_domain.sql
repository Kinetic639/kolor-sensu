BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '20000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-reviewer-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Reviewer","last_name":"Specialist"}',
    now(), now(), false, false
  ),
  (
    '20000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Second","last_name":"Specialist"}',
    now(), now(), false, false
  ),
  (
    '20000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'domain-test-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Domain","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '20000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
    'domain-test-dual@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Dual","last_name":"Reviewer"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('20000000-0000-4000-8000-000000000001', 'specialist'),
  ('20000000-0000-4000-8000-000000000002', 'specialist'),
  ('20000000-0000-4000-8000-000000000003', 'admin'),
  ('20000000-0000-4000-8000-000000000004', 'specialist'),
  ('20000000-0000-4000-8000-000000000004', 'admin');

CREATE TEMP TABLE domain_test_ids AS
SELECT
  (SELECT id FROM public.specialists WHERE user_id = '20000000-0000-4000-8000-000000000001') AS first_specialist_id,
  (SELECT id FROM public.specialists WHERE user_id = '20000000-0000-4000-8000-000000000002') AS second_specialist_id,
  (SELECT id FROM public.specialists WHERE user_id = '20000000-0000-4000-8000-000000000004') AS dual_specialist_id;

GRANT SELECT ON domain_test_ids TO authenticated, anon;

SELECT set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  own_draft_id uuid;
BEGIN
  -- Not a bare count(*): DEV now permanently carries real published
  -- specialists (see 20260920101323_dev_publish_seed_specialist_profiles.sql),
  -- so a fresh specialist's visible set legitimately includes those. The
  -- actual invariant under test is "own row visible, another draft
  -- specialist's row is not".
  IF NOT EXISTS (
    SELECT 1 FROM public.specialists
    WHERE id = (SELECT first_specialist_id FROM domain_test_ids)
  ) THEN
    RAISE EXCEPTION 'A/B: specialist could not see their own internal specialist record';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.specialists
    WHERE id = (SELECT second_specialist_id FROM domain_test_ids)
  ) THEN
    RAISE EXCEPTION 'A/B: specialist unexpectedly saw another draft specialist''s record';
  END IF;

  -- A new specialist's public profile starts with the account's name.
  IF NOT EXISTS (
    SELECT 1 FROM public.specialist_public_profiles
    WHERE specialist_id = (SELECT first_specialist_id FROM domain_test_ids)
      AND first_name = 'Reviewer' AND last_name = 'Specialist'
      AND display_name = 'Reviewer Specialist'
  ) THEN
    RAISE EXCEPTION 'T: a new public profile did not take the account''s name';
  END IF;

  SELECT public.save_my_specialist_profile_draft(
    p_first_name => ' Approved ',
    p_last_name => 'Specialist',
    p_short_bio => 'Pending biography',
    p_languages => ARRAY['pl']
  ) INTO own_draft_id;

  -- The name on the site is made of the first and last name.
  IF NOT EXISTS (
    SELECT 1 FROM public.specialist_profile_drafts
    WHERE id = own_draft_id
      AND first_name = 'Approved' AND last_name = 'Specialist'
      AND display_name = 'Approved Specialist'
  ) THEN
    RAISE EXCEPTION 'C: specialist could not create and read their own draft';
  END IF;

  BEGIN
    UPDATE public.specialist_profile_drafts
    SET display_name = 'Unsafe edit'
    WHERE specialist_id = (SELECT second_specialist_id FROM domain_test_ids);
    RAISE EXCEPTION 'D: specialist unexpectedly received direct draft update permission';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  BEGIN
    UPDATE public.specialist_public_profiles
    SET publication_status = 'published', published_at = now()
    WHERE specialist_id = (SELECT first_specialist_id FROM domain_test_ids);
    RAISE EXCEPTION 'E: specialist unexpectedly published directly';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  PERFORM public.submit_my_specialist_profile_draft(own_draft_id);

  IF (
    SELECT display_name
    FROM public.specialist_public_profiles
    WHERE specialist_id = (SELECT first_specialist_id FROM domain_test_ids)
  ) <> 'Reviewer Specialist' THEN
    RAISE EXCEPTION 'M: pending draft changed the canonical published profile';
  END IF;

END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000004","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  own_draft_id uuid;
BEGIN
  SELECT public.save_my_specialist_profile_draft(
    p_first_name => 'Dual Role',
    p_last_name => 'Specialist'
  ) INTO own_draft_id;
  PERFORM public.submit_my_specialist_profile_draft(own_draft_id);

  -- A single admin who is also a specialist publishes their own profile.
  PERFORM public.approve_specialist_profile_draft(own_draft_id, 'self review');
  IF NOT EXISTS (
    SELECT 1 FROM public.specialist_profile_drafts
    WHERE id = own_draft_id
      AND status = 'published'
      AND reviewed_by = auth.uid()
  ) THEN
    RAISE EXCEPTION 'F: specialist/admin could not approve their own draft';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  own_draft_id uuid;
BEGIN
  -- Without a last name the draft cannot be sent for review.
  SELECT public.save_my_specialist_profile_draft(
    p_first_name => 'Rejected',
    p_last_name => '',
    p_short_bio => 'Needs revision'
  ) INTO own_draft_id;
  BEGIN
    PERFORM public.submit_my_specialist_profile_draft(own_draft_id);
    RAISE EXCEPTION 'U: a draft without a last name was sent for review';
  EXCEPTION
    WHEN no_data_found THEN NULL;
  END;

  SELECT public.save_my_specialist_profile_draft(
    p_first_name => 'Rejected',
    p_last_name => 'Specialist',
    p_short_bio => 'Needs revision'
  ) INTO own_draft_id;
  PERFORM public.submit_my_specialist_profile_draft(own_draft_id);

  IF (SELECT count(*) FROM public.specialist_profile_drafts) <> 1 THEN
    RAISE EXCEPTION 'B/D: specialist could read another specialist draft';
  END IF;
END;
$$;

DO $$
DECLARE
  own_path text;
  other_path text;
BEGIN
  SELECT first_specialist_id::text || '/own.webp', second_specialist_id::text || '/cross.webp'
  INTO other_path, own_path
  FROM domain_test_ids;

  INSERT INTO storage.objects (bucket_id, name, owner_id, metadata)
  VALUES ('specialist-profile-media', own_path, auth.uid()::text, '{"mimetype":"image/webp","size":100}');

  BEGIN
    INSERT INTO storage.objects (bucket_id, name, owner_id, metadata)
    VALUES ('specialist-profile-media', other_path, auth.uid()::text, '{"mimetype":"image/webp","size":100}');
    RAISE EXCEPTION 'P: specialist unexpectedly wrote media into another specialist path';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
    WHEN check_violation THEN NULL;
  END;
END;
$$;

RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  approval_draft_id uuid;
  rejection_draft_id uuid;
BEGIN
  -- The dual-role admin's own draft (F) is already approved.
  IF (SELECT count(*) FROM public.specialist_profile_drafts WHERE status = 'pending_review') <> 2 THEN
    RAISE EXCEPTION 'G: admin could not read all pending drafts';
  END IF;

  SELECT id INTO approval_draft_id
  FROM public.specialist_profile_drafts
  WHERE specialist_id = (SELECT first_specialist_id FROM domain_test_ids)
    AND status = 'pending_review';

  PERFORM public.approve_specialist_profile_draft(approval_draft_id, 'Approved in test');

  IF NOT EXISTS (
    SELECT 1
    FROM public.specialist_public_profiles AS profile
    JOIN public.specialist_profile_drafts AS draft
      ON draft.specialist_id = profile.specialist_id
    WHERE profile.specialist_id = (SELECT first_specialist_id FROM domain_test_ids)
      AND profile.display_name = 'Approved Specialist'
      AND profile.first_name = 'Approved'
      AND profile.last_name = 'Specialist'
      AND profile.publication_status = 'published'
      AND profile.published_at IS NOT NULL
      AND draft.id = approval_draft_id
      AND draft.status = 'published'
      AND draft.reviewed_by = auth.uid()
      AND draft.reviewed_at IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'H/N: approval did not atomically publish and resolve the draft';
  END IF;

  -- The approved name becomes the account's name too.
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = '20000000-0000-4000-8000-000000000001'
      AND first_name = 'Approved' AND last_name = 'Specialist'
  ) THEN
    RAISE EXCEPTION 'V: approval did not update the account''s name';
  END IF;

  SELECT id INTO rejection_draft_id
  FROM public.specialist_profile_drafts
  WHERE specialist_id = (SELECT second_specialist_id FROM domain_test_ids)
    AND status = 'pending_review';

  PERFORM public.reject_specialist_profile_draft(rejection_draft_id, 'Please revise');

  IF NOT EXISTS (
    SELECT 1 FROM public.specialist_profile_drafts
    WHERE id = rejection_draft_id
      AND status = 'rejected'
      AND reviewed_by = auth.uid()
      AND review_comment = 'Please revise'
  ) THEN
    RAISE EXCEPTION 'I: admin rejection did not preserve review metadata';
  END IF;
END;
$$;

RESET ROLE;

-- A new specialist starts inactive and off the site: a published profile
-- alone does not put them there.
DO $$
BEGIN
  IF (SELECT (active, publicly_visible) FROM public.specialists
      WHERE id = (SELECT first_specialist_id FROM domain_test_ids)) IS DISTINCT FROM (false, false) THEN
    RAISE EXCEPTION 'J: a new specialist was active or on the site';
  END IF;
END;
$$;
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.specialist_public_profiles
    WHERE specialist_id = (SELECT first_specialist_id FROM domain_test_ids)
  ) THEN
    RAISE EXCEPTION 'J: anonymous user saw a profile not yet on the site';
  END IF;
END;
$$;
RESET ROLE;

-- The admin puts them on the site (still not taking visits).
UPDATE public.specialists
SET publicly_visible = true
WHERE id = (SELECT first_specialist_id FROM domain_test_ids);
SET LOCAL ROLE anon;

DO $$
BEGIN
  -- Not a bare count(*): DEV now permanently carries real published
  -- specialists (see 20260920101323_dev_publish_seed_specialist_profiles.sql).
  -- Assert the test's own newly-published profile is visible, not the
  -- table's total size.
  IF NOT EXISTS (
    SELECT 1 FROM public.specialist_public_profiles
    WHERE specialist_id = (SELECT first_specialist_id FROM domain_test_ids)
      AND publication_status = 'published'
  ) THEN
    RAISE EXCEPTION 'J: anonymous user did not see the active published profile';
  END IF;

  BEGIN
    PERFORM 1 FROM public.specialist_profile_drafts;
    RAISE EXCEPTION 'K: anonymous user unexpectedly read drafts';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  -- Reading media must not fail for anonymous visitors (it used to, with
  -- "permission denied"), and media of unpublished profiles stays hidden.
  IF EXISTS (
    SELECT 1 FROM storage.objects
    WHERE bucket_id = 'specialist-profile-media'
      AND name LIKE (SELECT second_specialist_id::text FROM domain_test_ids) || '/%'
  ) THEN
    RAISE EXCEPTION 'N: anonymous user read media of an unpublished profile';
  END IF;
END;
$$;

RESET ROLE;

-- Signed in, someone else (another specialist) sees them on the site too.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.specialists
    WHERE id = (SELECT first_specialist_id FROM domain_test_ids)
  ) THEN
    RAISE EXCEPTION 'J: a signed-in visitor did not see a specialist on the site';
  END IF;
END;
$$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);

UPDATE public.specialists
SET publicly_visible = false
WHERE id = (SELECT first_specialist_id FROM domain_test_ids);
SET LOCAL ROLE anon;

DO $$
BEGIN
  -- Not a bare EXISTS on the whole table: real published specialists
  -- remain visible regardless. Assert specifically that the test
  -- specialist's profile disappeared once taken off the site.
  IF EXISTS (
    SELECT 1 FROM public.specialist_public_profiles
    WHERE specialist_id = (SELECT first_specialist_id FROM domain_test_ids)
  ) THEN
    RAISE EXCEPTION 'L: anonymous user read a profile taken off the site';
  END IF;
END;
$$;

RESET ROLE;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.specialists (user_id, public_slug)
    VALUES (
      '20000000-0000-4000-8000-000000000003',
      (SELECT public_slug FROM public.specialists WHERE id = (SELECT first_specialist_id FROM domain_test_ids))
    );
    RAISE EXCEPTION 'O: duplicate specialist slug was accepted';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;
END;
$$;

-- Only admins rename a specialist's public address. The specialist is on
-- the site again: redirects are readable only for published, visible ones.
RESET ROLE;
UPDATE public.specialists
SET publicly_visible = true
WHERE id = (SELECT first_specialist_id FROM domain_test_ids);
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  PERFORM public.set_specialist_public_slug(
    (SELECT first_specialist_id FROM domain_test_ids),
    'self-chosen-slug'
  );
  RAISE EXCEPTION 'Q: specialist unexpectedly renamed their public address';
EXCEPTION
  WHEN insufficient_privilege THEN NULL;
END;
$$;

-- The admin renames it; the previous address redirects to the new one.
RESET ROLE;
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"20000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  previous_slug text;
BEGIN
  SELECT public_slug INTO previous_slug FROM public.specialists
  WHERE id = (SELECT first_specialist_id FROM domain_test_ids);

  PERFORM public.set_specialist_public_slug(
    (SELECT first_specialist_id FROM domain_test_ids),
    ' Approved-Specialist-Renamed '
  );

  IF NOT EXISTS (
    SELECT 1 FROM public.specialists
    WHERE id = (SELECT first_specialist_id FROM domain_test_ids)
      AND public_slug = 'approved-specialist-renamed'
  ) THEN
    RAISE EXCEPTION 'R: admin could not rename the public address';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.specialist_slug_redirects
    WHERE old_slug = previous_slug
      AND specialist_id = (SELECT first_specialist_id FROM domain_test_ids)
  ) THEN
    RAISE EXCEPTION 'S: the previous address does not redirect';
  END IF;
END;
$$;

ROLLBACK;
