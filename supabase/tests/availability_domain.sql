BEGIN;

-- Specialist availability (docs/product/booking-plan.md, RD1): weekly,
-- fortnightly and one-day windows in a room or online, time off, and the
-- rules the save functions enforce. Everything is rolled back at the end.

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  (
    '70000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-availability-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Availability","last_name":"Admin"}',
    now(), now(), false, false
  ),
  (
    '70000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-availability-anna@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Anna","last_name":"Test"}',
    now(), now(), false, false
  ),
  (
    '70000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'domain-test-availability-jan@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Jan","last_name":"Test"}',
    now(), now(), false, false
  );

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('70000000-0000-4000-8000-000000000001', 'admin'),
  ('70000000-0000-4000-8000-000000000002', 'specialist'),
  ('70000000-0000-4000-8000-000000000003', 'specialist');

INSERT INTO public.locations (name, slug, active, publicly_visible)
VALUES ('Test Location Availability', 'test-loc-availability', true, true);

INSERT INTO public.rooms (location_id, name, slug, capacity, active)
SELECT id, 'Availability Room 1', 'availability-room-1', 2, true
FROM public.locations WHERE slug = 'test-loc-availability'
UNION ALL
SELECT id, 'Availability Room 2', 'availability-room-2', 2, true
FROM public.locations WHERE slug = 'test-loc-availability'
UNION ALL
SELECT id, 'Availability Room Closed', 'availability-room-closed', 2, false
FROM public.locations WHERE slug = 'test-loc-availability';

CREATE TEMP TABLE availability_test_ids AS
SELECT
  (SELECT id FROM public.specialists
   WHERE user_id = '70000000-0000-4000-8000-000000000002') AS anna_id,
  (SELECT id FROM public.specialists
   WHERE user_id = '70000000-0000-4000-8000-000000000003') AS jan_id,
  (SELECT id FROM public.rooms WHERE slug = 'availability-room-1') AS room_1_id,
  (SELECT id FROM public.rooms WHERE slug = 'availability-room-2') AS room_2_id,
  (SELECT id FROM public.rooms WHERE slug = 'availability-room-closed') AS room_closed_id;

GRANT SELECT ON availability_test_ids TO authenticated, anon;

-- Lets another user refer to a window they cannot read.
CREATE TEMP TABLE availability_test_rules (anna_rule_id uuid);
GRANT SELECT, INSERT ON availability_test_rules TO authenticated;

-- 2030-01-07 is a Monday.

-- A-F: Anna manages her own availability.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-4000-8000-000000000002","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  ids availability_test_ids%ROWTYPE;
  rule_id uuid;
  hint text;
BEGIN
  SELECT * INTO ids FROM availability_test_ids;

  -- A: a weekly window in a room.
  rule_id := public.save_availability_rule(
    p_recurrence => 'weekly', p_weekday => 1::smallint,
    p_starts_at => '09:00', p_ends_at => '13:00',
    p_valid_from => '2030-01-07', p_mode => 'in_person',
    p_room_id => ids.room_1_id
  );
  IF (SELECT specialist_id FROM public.specialist_availability_rules WHERE id = rule_id)
     IS DISTINCT FROM ids.anna_id THEN
    RAISE EXCEPTION 'A: the window was not saved for the calling specialist';
  END IF;

  -- B: her own windows must not overlap, even online.
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'weekly', p_weekday => 1::smallint,
      p_starts_at => '12:00', p_ends_at => '14:00',
      p_valid_from => '2030-01-07', p_mode => 'online'
    );
    RAISE EXCEPTION 'B: an overlapping window was accepted';
  EXCEPTION WHEN exclusion_violation THEN
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'overlap' THEN
      RAISE EXCEPTION 'B: expected hint overlap, got %', hint;
    END IF;
  END;

  -- B: back to back is fine.
  PERFORM public.save_availability_rule(
    p_recurrence => 'weekly', p_weekday => 1::smallint,
    p_starts_at => '13:00', p_ends_at => '15:00',
    p_valid_from => '2030-01-07', p_mode => 'online'
  );

  -- C: editing a window keeps its id and is checked without itself.
  PERFORM public.save_availability_rule(
    p_id => rule_id,
    p_recurrence => 'weekly', p_weekday => 1::smallint,
    p_starts_at => '08:00', p_ends_at => '13:00',
    p_valid_from => '2030-01-07', p_mode => 'hybrid',
    p_room_id => ids.room_1_id, p_note => 'Pierwszorazowi do 11:00'
  );
  IF (SELECT starts_at FROM public.specialist_availability_rules WHERE id = rule_id) <> '08:00' THEN
    RAISE EXCEPTION 'C: the window was not updated';
  END IF;
  INSERT INTO availability_test_rules VALUES (rule_id);

  -- D: a room window needs an active room; online has no room.
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'weekly', p_weekday => 2::smallint,
      p_starts_at => '09:00', p_ends_at => '10:00',
      p_valid_from => '2030-01-07', p_mode => 'in_person',
      p_room_id => ids.room_closed_id
    );
    RAISE EXCEPTION 'D: an inactive room was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'weekly', p_weekday => 2::smallint,
      p_starts_at => '09:00', p_ends_at => '10:00',
      p_valid_from => '2030-01-07', p_mode => 'in_person'
    );
    RAISE EXCEPTION 'D: an in-person window without a room was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- E: times on a 15-minute grid only.
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'weekly', p_weekday => 2::smallint,
      p_starts_at => '09:10', p_ends_at => '10:00',
      p_valid_from => '2030-01-07', p_mode => 'online'
    );
    RAISE EXCEPTION 'E: an off-grid time was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- F: a one-day window takes its weekday from the date.
  rule_id := public.save_availability_rule(
    p_recurrence => 'once', p_weekday => 7::smallint,
    p_starts_at => '10:00', p_ends_at => '12:00',
    p_valid_from => '2030-01-09', p_mode => 'online'
  );
  IF (SELECT (weekday, valid_until) FROM public.specialist_availability_rules WHERE id = rule_id)
     IS DISTINCT FROM (3::smallint, '2030-01-09'::date) THEN
    RAISE EXCEPTION 'F: a one-day window did not normalise to its date';
  END IF;

  -- F: fortnightly, from the week of 2030-01-07 (even weeks).
  PERFORM public.save_availability_rule(
    p_recurrence => 'biweekly', p_weekday => 4::smallint,
    p_starts_at => '09:00', p_ends_at => '12:00',
    p_valid_from => '2030-01-07', p_mode => 'in_person',
    p_room_id => ids.room_2_id
  );
END;
$$;

RESET ROLE;

-- G-J: Jan shares the rooms.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-4000-8000-000000000003","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  ids availability_test_ids%ROWTYPE;
  hint text;
BEGIN
  SELECT * INTO ids FROM availability_test_ids;

  -- G: he cannot read Anna's windows.
  IF EXISTS (SELECT 1 FROM public.specialist_availability_rules WHERE specialist_id = ids.anna_id) THEN
    RAISE EXCEPTION 'G: a specialist could read another specialist''s availability';
  END IF;

  -- H: Anna's room at the same time is taken, without saying by whom.
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'weekly', p_weekday => 1::smallint,
      p_starts_at => '11:00', p_ends_at => '12:00',
      p_valid_from => '2030-01-07', p_mode => 'in_person',
      p_room_id => ids.room_1_id
    );
    RAISE EXCEPTION 'H: a taken room was accepted';
  EXCEPTION WHEN exclusion_violation THEN
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'room_taken' THEN
      RAISE EXCEPTION 'H: expected hint room_taken, got %', hint;
    END IF;
  END;

  -- H: the same room right after, another room, or online are fine.
  PERFORM public.save_availability_rule(
    p_recurrence => 'weekly', p_weekday => 1::smallint,
    p_starts_at => '13:00', p_ends_at => '17:00',
    p_valid_from => '2030-01-07', p_mode => 'in_person',
    p_room_id => ids.room_1_id
  );
  PERFORM public.save_availability_rule(
    p_recurrence => 'weekly', p_weekday => 1::smallint,
    p_starts_at => '09:00', p_ends_at => '12:00',
    p_valid_from => '2030-01-07', p_mode => 'in_person',
    p_room_id => ids.room_2_id
  );

  -- I: fortnightly in alternate weeks shares a room; the same weeks do not.
  PERFORM public.save_availability_rule(
    p_recurrence => 'biweekly', p_weekday => 4::smallint,
    p_starts_at => '09:00', p_ends_at => '12:00',
    p_valid_from => '2030-01-14', p_mode => 'in_person',
    p_room_id => ids.room_2_id
  );
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'weekly', p_weekday => 4::smallint,
      p_starts_at => '10:00', p_ends_at => '11:00',
      p_valid_from => '2030-06-01', p_mode => 'in_person',
      p_room_id => ids.room_2_id
    );
    RAISE EXCEPTION 'I: a weekly window over fortnightly ones was accepted';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;

  -- J: a one-day window in a room taken that day is rejected; another day is fine.
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'once', p_weekday => 1::smallint,
      p_starts_at => '10:00', p_ends_at => '11:00',
      p_valid_from => '2030-02-04', p_mode => 'in_person',
      p_room_id => ids.room_1_id
    );
    RAISE EXCEPTION 'J: a one-day window in a taken room was accepted';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;
  PERFORM public.save_availability_rule(
    p_recurrence => 'once', p_weekday => 1::smallint,
    p_starts_at => '10:00', p_ends_at => '11:00',
    p_valid_from => '2030-02-05', p_mode => 'in_person',
    p_room_id => ids.room_1_id
  );

  -- J: a weekly window that ends the day before does not clash with it.
  PERFORM public.save_availability_rule(
    p_recurrence => 'weekly', p_weekday => 2::smallint,
    p_starts_at => '09:00', p_ends_at => '12:00',
    p_valid_from => '2030-01-07', p_valid_until => '2030-02-04',
    p_mode => 'in_person', p_room_id => ids.room_1_id
  );
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'weekly', p_weekday => 2::smallint,
      p_starts_at => '09:00', p_ends_at => '12:00',
      p_valid_from => '2030-02-05', p_mode => 'online'
    );
    RAISE EXCEPTION 'J: a window starting on the one-day window''s date was accepted';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;

  -- K: he cannot manage Anna's availability.
  BEGIN
    PERFORM public.save_availability_rule(
      p_specialist_id => ids.anna_id,
      p_recurrence => 'weekly', p_weekday => 6::smallint,
      p_starts_at => '09:00', p_ends_at => '10:00',
      p_valid_from => '2030-01-07', p_mode => 'online'
    );
    RAISE EXCEPTION 'K: a specialist saved another specialist''s window';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.delete_availability_rule(
      (SELECT anna_rule_id FROM availability_test_rules)
    );
    RAISE EXCEPTION 'K: a specialist removed another specialist''s window';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;

  -- L: tables are written only through the functions.
  BEGIN
    INSERT INTO public.specialist_availability_rules (
      specialist_id, weekday, starts_at, ends_at, valid_from, mode
    ) VALUES (ids.jan_id, 6, '09:00', '10:00', '2030-01-07', 'online');
    RAISE EXCEPTION 'L: a direct insert was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  -- M: time off may not overlap his other time off.
  PERFORM public.add_time_off(
    p_starts_at => '2030-01-07 00:00+01', p_ends_at => '2030-01-14 00:00+01',
    p_reason => 'Urlop'
  );
  BEGIN
    PERFORM public.add_time_off(
      p_starts_at => '2030-01-13 12:00+01', p_ends_at => '2030-01-13 14:00+01'
    );
    RAISE EXCEPTION 'M: overlapping time off was accepted';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.add_time_off(
      p_starts_at => '2030-01-20 12:00+01', p_ends_at => '2030-01-20 12:00+01'
    );
    RAISE EXCEPTION 'M: empty time off was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- N: the admin manages anyone's availability and removes windows.
SELECT set_config(
  'request.jwt.claims',
  '{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}',
  true
);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  ids availability_test_ids%ROWTYPE;
  rule_id uuid;
BEGIN
  SELECT * INTO ids FROM availability_test_ids;

  rule_id := public.save_availability_rule(
    p_specialist_id => ids.anna_id,
    p_recurrence => 'weekly', p_weekday => 6::smallint,
    p_starts_at => '09:00', p_ends_at => '10:00',
    p_valid_from => '2030-01-07', p_mode => 'online'
  );
  IF (SELECT count(*) FROM public.specialist_availability_rules
      WHERE specialist_id IN (ids.anna_id, ids.jan_id)) < 10 THEN
    RAISE EXCEPTION 'N: the admin could not read every specialist''s availability';
  END IF;

  PERFORM public.delete_availability_rule(rule_id);
  IF EXISTS (SELECT 1 FROM public.specialist_availability_rules WHERE id = rule_id) THEN
    RAISE EXCEPTION 'N: the window was not removed';
  END IF;

  PERFORM public.add_time_off(
    p_specialist_id => ids.anna_id,
    p_starts_at => '2030-03-01 00:00+01', p_ends_at => '2030-03-02 00:00+01'
  );
END;
$$;

RESET ROLE;

-- O: anonymous visitors read nothing.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.specialist_availability_rules LIMIT 1;
    RAISE EXCEPTION 'O: anon read availability';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.specialist_time_off LIMIT 1;
    RAISE EXCEPTION 'O: anon read time off';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

ROLLBACK;
