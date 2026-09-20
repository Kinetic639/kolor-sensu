BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '60000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-rooms-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Rooms","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '60000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-rooms-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Rooms","last_name":"Specialist"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('60000000-0000-4000-8000-000000000001', 'admin'),
  ('60000000-0000-4000-8000-000000000002', 'specialist');

-- A/B/E/F/G/H: admin operations.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

INSERT INTO public.locations (name, slug, active, publicly_visible)
VALUES
  ('Test Location Rooms A', 'test-loc-rooms-a', true, true),
  ('Test Location Rooms B', 'test-loc-rooms-b', true, true);

CREATE TEMP TABLE rooms_test_ids AS
SELECT
  (SELECT id FROM public.locations WHERE slug = 'test-loc-rooms-a') AS location_a_id,
  (SELECT id FROM public.locations WHERE slug = 'test-loc-rooms-b') AS location_b_id;

GRANT SELECT ON rooms_test_ids TO authenticated, anon;

DO $$
DECLARE
  room_a1_id uuid;
BEGIN
  -- A: admin can create rooms.
  INSERT INTO public.rooms (location_id, name, slug, capacity, active, publicly_visible)
  VALUES
    ((SELECT location_a_id FROM rooms_test_ids), 'Test Room 1', 'test-room-1', 4, true, false),
    ((SELECT location_a_id FROM rooms_test_ids), 'Test Room 2', 'test-room-2', 2, false, false);

  IF (SELECT count(*) FROM public.rooms WHERE slug LIKE 'test-room-%') <> 2 THEN
    RAISE EXCEPTION 'A: admin could not create rooms';
  END IF;

  -- F (positive): the same slug is allowed in a different location, proving
  -- uniqueness is scoped to (location_id, slug), not global.
  INSERT INTO public.rooms (location_id, name, slug, capacity)
  VALUES ((SELECT location_b_id FROM rooms_test_ids), 'Test Room 1 (B)', 'test-room-1', 3);

  IF (SELECT count(*) FROM public.rooms WHERE slug = 'test-room-1') <> 2 THEN
    RAISE EXCEPTION 'F: the same slug was not permitted across two different locations';
  END IF;

  -- F (negative): the same slug within the same location is rejected.
  BEGIN
    INSERT INTO public.rooms (location_id, name, slug, capacity)
    VALUES ((SELECT location_a_id FROM rooms_test_ids), 'Duplicate', 'test-room-1', 2);
    RAISE EXCEPTION 'F: a duplicate slug within the same location was accepted';
  EXCEPTION
    WHEN unique_violation THEN NULL;
  END;

  -- E: a room requires a valid, existing location.
  BEGIN
    INSERT INTO public.rooms (location_id, name, slug, capacity)
    VALUES ('00000000-0000-4000-8000-000000000000', 'Orphan', 'test-room-orphan', 2);
    RAISE EXCEPTION 'E: a room with a non-existent location was accepted';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;

  -- G: capacity bounds are enforced at the database.
  BEGIN
    INSERT INTO public.rooms (location_id, name, slug, capacity)
    VALUES ((SELECT location_a_id FROM rooms_test_ids), 'Too Small', 'test-room-too-small', 0);
    RAISE EXCEPTION 'G: a room with capacity below the lower bound was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  BEGIN
    INSERT INTO public.rooms (location_id, name, slug, capacity)
    VALUES ((SELECT location_a_id FROM rooms_test_ids), 'Too Big', 'test-room-too-big', 101);
    RAISE EXCEPTION 'G: a room with capacity above the upper bound was accepted';
  EXCEPTION
    WHEN check_violation THEN NULL;
  END;

  -- B: admin can update a room.
  SELECT id INTO room_a1_id FROM public.rooms
  WHERE location_id = (SELECT location_a_id FROM rooms_test_ids) AND slug = 'test-room-1';

  UPDATE public.rooms SET description = 'Updated by admin test' WHERE id = room_a1_id;

  IF (SELECT description FROM public.rooms WHERE id = room_a1_id) <> 'Updated by admin test' THEN
    RAISE EXCEPTION 'B: admin update to a room did not persist';
  END IF;

  -- H: admin can disable a room.
  UPDATE public.rooms SET active = false WHERE id = room_a1_id;

  IF (SELECT active FROM public.rooms WHERE id = room_a1_id) IS NOT false THEN
    RAISE EXCEPTION 'H: admin could not disable a room';
  END IF;

  -- Restore for the later specialist/anon visibility assertions.
  UPDATE public.rooms SET active = true WHERE id = room_a1_id;
END;
$$;

RESET ROLE;

-- Bonus (historical integrity): deleting a location that still has rooms
-- attached is restricted by the FK constraint itself, not silently
-- cascaded. Locations has no client DELETE grant at all (only
-- SELECT/INSERT/UPDATE), so this runs at the elevated connection role --
-- same pattern services_domain.sql uses for the specialists.active
-- toggle -- to prove the constraint layer, not the grant layer, is what
-- blocks it.
DO $$
BEGIN
  BEGIN
    DELETE FROM public.locations WHERE id = (SELECT location_a_id FROM rooms_test_ids);
    RAISE EXCEPTION 'R: deleting a location with attached rooms was unexpectedly allowed';
  EXCEPTION
    WHEN foreign_key_violation THEN NULL;
  END;
END;
$$;

-- C/D/I/J/L: specialist operations.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"60000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  affected_rows integer;
BEGIN
  -- I/L: specialist reads exactly the active rooms, never the inactive one.
  IF (SELECT count(*) FROM public.rooms WHERE slug LIKE 'test-room-%') <> 2 THEN
    RAISE EXCEPTION 'I: specialist did not see exactly the active test rooms';
  END IF;

  IF EXISTS (SELECT 1 FROM public.rooms WHERE slug = 'test-room-2') THEN
    RAISE EXCEPTION 'L: specialist unexpectedly read an inactive room';
  END IF;

  -- C: specialist cannot create a room.
  BEGIN
    INSERT INTO public.rooms (location_id, name, slug, capacity)
    VALUES ((SELECT location_a_id FROM rooms_test_ids), 'Unsafe', 'test-room-unsafe', 2);
    RAISE EXCEPTION 'C: specialist unexpectedly created a room';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;

  -- D/J: specialist cannot update a room or its lifecycle flags.
  UPDATE public.rooms SET name = 'Hacked' WHERE slug = 'test-room-1';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'D: specialist unexpectedly updated a room';
  END IF;

  UPDATE public.rooms SET active = false, publicly_visible = true WHERE slug = 'test-room-1';
  GET DIAGNOSTICS affected_rows = ROW_COUNT;
  IF affected_rows <> 0 THEN
    RAISE EXCEPTION 'J: specialist unexpectedly changed a room''s lifecycle flags';
  END IF;

  BEGIN
    DELETE FROM public.rooms WHERE slug = 'test-room-1';
    RAISE EXCEPTION 'J: specialist unexpectedly deleted a room';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- K: anonymous access follows the "keep internal for now" decision -- no
-- current public page needs room data, so anon has zero grants on this
-- table, not just a restrictive policy.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;

DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.rooms LIMIT 1;
    RAISE EXCEPTION 'K: anon unexpectedly read room data';
  EXCEPTION
    WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

ROLLBACK;
