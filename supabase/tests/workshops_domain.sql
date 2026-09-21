BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '70000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-workshops-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Workshops","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '70000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-workshops-leader@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Workshop","last_name":"Leader"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('70000000-0000-4000-8000-000000000001', 'admin'),
  ('70000000-0000-4000-8000-000000000002', 'specialist');

CREATE TEMP TABLE workshops_test_ids AS
SELECT
  (SELECT id FROM public.specialists WHERE user_id = '70000000-0000-4000-8000-000000000002') AS leader_id;

GRANT SELECT ON workshops_test_ids TO authenticated, anon;

-- Fixture location/room, created by admin (locations/rooms both require
-- has_role('admin') to INSERT).
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

INSERT INTO public.locations (name, slug, active, publicly_visible)
VALUES ('Test Workshops Location', 'test-loc-workshops', true, true);

INSERT INTO public.locations (name, slug, active, publicly_visible)
VALUES ('Test Workshops Other Location', 'test-loc-workshops-other', true, true);

INSERT INTO public.rooms (location_id, name, slug, active, publicly_visible)
VALUES (
  (SELECT id FROM public.locations WHERE slug = 'test-loc-workshops'),
  'Test Workshops Room', 'test-room-workshops', true, true
);

RESET ROLE;

CREATE TEMP TABLE workshops_test_locations AS
SELECT
  (SELECT id FROM public.locations WHERE slug = 'test-loc-workshops') AS location_id,
  (SELECT id FROM public.locations WHERE slug = 'test-loc-workshops-other') AS other_location_id,
  (SELECT id FROM public.rooms WHERE slug = 'test-room-workshops') AS room_id;

GRANT SELECT ON workshops_test_locations TO authenticated, anon;

-- A/C/D/E/F/G/H/I/M/N/O: admin capabilities and constraint enforcement.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  leader uuid := (SELECT leader_id FROM workshops_test_ids);
  loc uuid := (SELECT location_id FROM workshops_test_locations);
  other_loc uuid := (SELECT other_location_id FROM workshops_test_locations);
  room uuid := (SELECT room_id FROM workshops_test_locations);
BEGIN
  -- A: admin creates a draft workshop.
  INSERT INTO public.workshops (
    slug, title, specialist_id, location_id, room_id, modality,
    starts_at, ends_at, price_minor, capacity
  )
  VALUES (
    'test-warsztat-a', 'Test Warsztat', leader, loc, room, 'in_person',
    '2026-10-15 17:00:00+02', '2026-10-15 19:00:00+02', 15000, 12
  );

  IF (SELECT count(*) FROM public.workshops WHERE slug = 'test-warsztat-a') <> 1 THEN
    RAISE EXCEPTION 'A: admin could not create a workshop';
  END IF;
  IF (SELECT status FROM public.workshops WHERE slug = 'test-warsztat-a') <> 'draft' THEN
    RAISE EXCEPTION 'A: a newly created workshop was not a draft by default';
  END IF;

  -- C: admin edits the workshop.
  UPDATE public.workshops SET title = 'Test Warsztat Updated' WHERE slug = 'test-warsztat-a';
  IF (SELECT title FROM public.workshops WHERE slug = 'test-warsztat-a') <> 'Test Warsztat Updated' THEN
    RAISE EXCEPTION 'C: admin edit did not persist';
  END IF;

  -- D: a non-existent specialist_id is rejected.
  BEGIN
    INSERT INTO public.workshops (
      slug, title, specialist_id, location_id, room_id, modality,
      starts_at, ends_at, price_minor, capacity
    )
    VALUES (
      'test-warsztat-bad-specialist', 'Bad Specialist', '00000000-0000-4000-8000-000000000000',
      loc, room, 'in_person', '2026-10-15 17:00:00+02', '2026-10-15 19:00:00+02', 15000, 12
    );
    RAISE EXCEPTION 'D: a non-existent specialist_id was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  -- E: a room that belongs to a different location than location_id is rejected.
  BEGIN
    INSERT INTO public.workshops (
      slug, title, specialist_id, location_id, room_id, modality,
      starts_at, ends_at, price_minor, capacity
    )
    VALUES (
      'test-warsztat-bad-room-location', 'Bad Room Location', leader, other_loc, room,
      'in_person', '2026-10-15 17:00:00+02', '2026-10-15 19:00:00+02', 15000, 12
    );
    RAISE EXCEPTION 'E: a room from another location was accepted';
  EXCEPTION WHEN foreign_key_violation THEN NULL;
  END;

  -- F: starts_at must be before ends_at.
  BEGIN
    INSERT INTO public.workshops (
      slug, title, specialist_id, location_id, room_id, modality,
      starts_at, ends_at, price_minor, capacity
    )
    VALUES (
      'test-warsztat-bad-time', 'Bad Time', leader, loc, room, 'in_person',
      '2026-10-15 19:00:00+02', '2026-10-15 17:00:00+02', 15000, 12
    );
    RAISE EXCEPTION 'F: starts_at after ends_at was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- G: price bounds.
  BEGIN
    INSERT INTO public.workshops (
      slug, title, specialist_id, location_id, room_id, modality,
      starts_at, ends_at, price_minor, capacity
    )
    VALUES (
      'test-warsztat-bad-price-low', 'Bad Price Low', leader, loc, room, 'in_person',
      '2026-10-15 17:00:00+02', '2026-10-15 19:00:00+02', -1, 12
    );
    RAISE EXCEPTION 'G: a negative price was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.workshops (
      slug, title, specialist_id, location_id, room_id, modality,
      starts_at, ends_at, price_minor, capacity
    )
    VALUES (
      'test-warsztat-bad-price-high', 'Bad Price High', leader, loc, room, 'in_person',
      '2026-10-15 17:00:00+02', '2026-10-15 19:00:00+02', 99999999, 12
    );
    RAISE EXCEPTION 'G: a price above the sane upper bound was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- H: capacity bounds.
  BEGIN
    INSERT INTO public.workshops (
      slug, title, specialist_id, location_id, room_id, modality,
      starts_at, ends_at, price_minor, capacity
    )
    VALUES (
      'test-warsztat-bad-capacity-low', 'Bad Capacity Low', leader, loc, room, 'in_person',
      '2026-10-15 17:00:00+02', '2026-10-15 19:00:00+02', 15000, 0
    );
    RAISE EXCEPTION 'H: a capacity of 0 was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.workshops (
      slug, title, specialist_id, location_id, room_id, modality,
      starts_at, ends_at, price_minor, capacity
    )
    VALUES (
      'test-warsztat-bad-capacity-high', 'Bad Capacity High', leader, loc, room, 'in_person',
      '2026-10-15 17:00:00+02', '2026-10-15 19:00:00+02', 15000, 501
    );
    RAISE EXCEPTION 'H: a capacity of 501 was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- I: slug uniqueness.
  BEGIN
    INSERT INTO public.workshops (
      slug, title, specialist_id, location_id, room_id, modality,
      starts_at, ends_at, price_minor, capacity
    )
    VALUES (
      'test-warsztat-a', 'Duplicate Slug', leader, loc, room, 'in_person',
      '2026-11-01 17:00:00+01', '2026-11-01 19:00:00+01', 15000, 12
    );
    RAISE EXCEPTION 'I: a duplicate slug was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;

  -- N: an in-person workshop with no location is rejected.
  BEGIN
    INSERT INTO public.workshops (
      slug, title, specialist_id, location_id, room_id, modality,
      starts_at, ends_at, price_minor, capacity
    )
    VALUES (
      'test-warsztat-bad-no-location', 'No Location', leader, NULL, NULL, 'in_person',
      '2026-10-15 17:00:00+02', '2026-10-15 19:00:00+02', 15000, 12
    );
    RAISE EXCEPTION 'N: an in-person workshop with no location was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- O: an online workshop needs no location or room.
  INSERT INTO public.workshops (
    slug, title, specialist_id, location_id, room_id, modality,
    starts_at, ends_at, price_minor, capacity
  )
  VALUES (
    'test-warsztat-online', 'Test Warsztat Online', leader, NULL, NULL, 'online',
    '2026-10-20 17:00:00+02', '2026-10-20 19:00:00+02', 0, 30
  );
  IF (SELECT count(*) FROM public.workshops WHERE slug = 'test-warsztat-online') <> 1 THEN
    RAISE EXCEPTION 'O: an online workshop with no location/room was rejected';
  END IF;

  -- an online workshop WITH a room must still be rejected.
  BEGIN
    INSERT INTO public.workshops (
      slug, title, specialist_id, location_id, room_id, modality,
      starts_at, ends_at, price_minor, capacity
    )
    VALUES (
      'test-warsztat-bad-online-room', 'Online With Room', leader, NULL, room, 'online',
      '2026-10-15 17:00:00+02', '2026-10-15 19:00:00+02', 0, 12
    );
    RAISE EXCEPTION 'O: an online workshop with a room was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- B: a specialist cannot create a workshop.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    INSERT INTO public.workshops (
      slug, title, specialist_id, location_id, room_id, modality,
      starts_at, ends_at, price_minor, capacity
    )
    VALUES (
      'test-warsztat-specialist-forbidden', 'Forbidden', (SELECT leader_id FROM workshops_test_ids),
      (SELECT location_id FROM workshops_test_locations), (SELECT room_id FROM workshops_test_locations),
      'in_person', '2026-10-15 17:00:00+02', '2026-10-15 19:00:00+02', 15000, 12
    );
    RAISE EXCEPTION 'B: a specialist unexpectedly created a workshop';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  IF (SELECT count(*) FROM public.workshops WHERE specialist_id = (SELECT leader_id FROM workshops_test_ids)) <> 2 THEN
    RAISE EXCEPTION 'baseline: specialist could not read the workshops they lead';
  END IF;
END;
$$;

RESET ROLE;

-- J/P: a draft workshop is fully invisible to anon (no row, no column leak).
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.workshops WHERE slug = 'test-warsztat-a') THEN
    RAISE EXCEPTION 'J: anon unexpectedly read a draft workshop';
  END IF;
  IF EXISTS (SELECT * FROM public.workshops WHERE slug = 'test-warsztat-a') THEN
    RAISE EXCEPTION 'P: anon unexpectedly read draft workshop fields via SELECT *';
  END IF;
END;
$$;

RESET ROLE;

-- K/M: admin publishes; the published workshop becomes visible to anon.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.workshops SET status = 'published' WHERE slug = 'test-warsztat-a' AND status = 'draft';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'M: admin could not publish the workshop';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (SELECT count(*) FROM public.workshops WHERE slug = 'test-warsztat-a') <> 1 THEN
    RAISE EXCEPTION 'K: anon could not read the published workshop';
  END IF;
  IF (SELECT title FROM public.workshops WHERE slug = 'test-warsztat-a') <> 'Test Warsztat Updated' THEN
    RAISE EXCEPTION 'K: anon read an unexpected title for the published workshop';
  END IF;
END;
$$;

RESET ROLE;

-- L/M: admin cancels a published workshop; it stays addressable to anon
-- with status = cancelled (list-vs-detail filtering is an application-layer
-- concern, not RLS -- see listPublicWorkshops/getPublicWorkshopBySlug).
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  UPDATE public.workshops SET status = 'cancelled' WHERE slug = 'test-warsztat-a' AND status = 'published';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 1 THEN
    RAISE EXCEPTION 'M: admin could not cancel the workshop';
  END IF;

  -- A cancel attempted from the wrong source status (already cancelled) is
  -- correctly a no-op, not an error -- mirrors the app layer's guarded
  -- transition helper.
  UPDATE public.workshops SET status = 'cancelled' WHERE slug = 'test-warsztat-a' AND status = 'published';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'M: cancelling an already-cancelled workshop unexpectedly matched a row';
  END IF;
END;
$$;

RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  IF (SELECT status FROM public.workshops WHERE slug = 'test-warsztat-a') <> 'cancelled' THEN
    RAISE EXCEPTION 'L: anon could not read the cancelled workshop as cancelled at its existing URL';
  END IF;
END;
$$;

RESET ROLE;

ROLLBACK;
