BEGIN;

-- Specialist availability (docs/product/booking-plan.md, "Reguły
-- powtarzania"): one-off windows and recurring rules (several weekdays,
-- every N weeks, ending never / on a date / after N occurrences), in a room
-- or online; single occurrences removed or changed with a scope, as in
-- calendar apps; time off. Everything is rolled back at the end.

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('70000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-availability-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Availability","last_name":"Admin"}', now(), now(), false, false),
  ('70000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-availability-anna@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Anna","last_name":"Test"}', now(), now(), false, false),
  ('70000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'domain-test-availability-jan@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Jan","last_name":"Test"}', now(), now(), false, false);

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
  (SELECT id FROM public.specialists WHERE user_id = '70000000-0000-4000-8000-000000000002') AS anna_id,
  (SELECT id FROM public.specialists WHERE user_id = '70000000-0000-4000-8000-000000000003') AS jan_id,
  (SELECT id FROM public.rooms WHERE slug = 'availability-room-1') AS room_1_id,
  (SELECT id FROM public.rooms WHERE slug = 'availability-room-2') AS room_2_id,
  (SELECT id FROM public.rooms WHERE slug = 'availability-room-closed') AS room_closed_id;
GRANT SELECT ON availability_test_ids TO authenticated, anon;

-- Lets another user refer to rows they cannot read.
CREATE TEMP TABLE availability_test_rules (name text PRIMARY KEY, rule_id uuid);
GRANT SELECT, INSERT ON availability_test_rules TO authenticated;

-- 2030-01-07 is a Monday.

-- A–G: Anna manages her own availability.
SELECT set_config('request.jwt.claims', '{"sub":"70000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  ids availability_test_ids%ROWTYPE;
  v_rule uuid;
  hint text;
BEGIN
  SELECT * INTO ids FROM availability_test_ids;

  -- A: one rule, Monday to Friday, in a room.
  v_rule := public.save_availability_rule(
    p_recurrence => 'weekly', p_weekdays => ARRAY[5, 1, 3, 2, 4]::smallint[],
    p_starts_at => '09:00', p_ends_at => '12:00',
    p_valid_from => '2030-01-07', p_mode => 'in_person', p_room_id => ids.room_1_id
  );
  IF (SELECT (specialist_id, weekdays, interval_weeks) FROM public.specialist_availability_rules WHERE id = v_rule)
     IS DISTINCT FROM (ids.anna_id, ARRAY[1, 2, 3, 4, 5]::smallint[], 1::smallint) THEN
    RAISE EXCEPTION 'A: the weekdays were not saved sorted, for the caller';
  END IF;
  INSERT INTO availability_test_rules VALUES ('anna_workdays', v_rule);

  -- B: her own windows must not overlap, on any shared weekday.
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'weekly', p_weekdays => ARRAY[3, 6]::smallint[],
      p_starts_at => '11:00', p_ends_at => '13:00',
      p_valid_from => '2030-01-07', p_mode => 'online'
    );
    RAISE EXCEPTION 'B: an overlapping window was accepted';
  EXCEPTION WHEN exclusion_violation THEN
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'overlap' THEN RAISE EXCEPTION 'B: expected hint overlap, got %', hint; END IF;
  END;

  -- C: weekdays must be 1–7, at least one.
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'weekly', p_weekdays => ARRAY[]::smallint[],
      p_starts_at => '13:00', p_ends_at => '14:00',
      p_valid_from => '2030-01-07', p_mode => 'online'
    );
    RAISE EXCEPTION 'C: a rule without weekdays was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'weekly', p_weekdays => ARRAY[8]::smallint[],
      p_starts_at => '13:00', p_ends_at => '14:00',
      p_valid_from => '2030-01-07', p_mode => 'online'
    );
    RAISE EXCEPTION 'C: weekday 8 was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- D: a room window needs an active room; times on a 15-minute grid.
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'once', p_weekdays => ARRAY[1]::smallint[],
      p_starts_at => '15:00', p_ends_at => '16:00',
      p_valid_from => '2030-01-07', p_mode => 'in_person', p_room_id => ids.room_closed_id
    );
    RAISE EXCEPTION 'D: an inactive room was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'once', p_weekdays => ARRAY[1]::smallint[],
      p_starts_at => '15:10', p_ends_at => '16:00',
      p_valid_from => '2030-01-07', p_mode => 'online'
    );
    RAISE EXCEPTION 'D: an off-grid time was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;

  -- E: a one-off window takes its weekday from the date.
  v_rule := public.save_availability_rule(
    p_recurrence => 'once', p_weekdays => ARRAY[7]::smallint[],
    p_starts_at => '15:00', p_ends_at => '17:00',
    p_valid_from => '2030-01-09', p_mode => 'online'
  );
  IF (SELECT (weekdays, valid_until) FROM public.specialist_availability_rules WHERE id = v_rule)
     IS DISTINCT FROM (ARRAY[3]::smallint[], '2030-01-09'::date) THEN
    RAISE EXCEPTION 'E: a one-off window did not normalise to its date';
  END IF;

  -- F: "after N occurrences" ends on the Nth date: Mon, Wed, Fri from
  -- 2030-01-07, five times = 7, 9, 11, 14, 16 January.
  v_rule := public.save_availability_rule(
    p_recurrence => 'weekly', p_weekdays => ARRAY[1, 3, 5]::smallint[],
    p_starts_at => '18:00', p_ends_at => '19:00',
    p_valid_from => '2030-01-07', p_mode => 'online', p_occurrence_count => 5::smallint
  );
  IF (SELECT (valid_until, occurrence_count) FROM public.specialist_availability_rules WHERE id = v_rule)
     IS DISTINCT FROM ('2030-01-16'::date, 5::smallint) THEN
    RAISE EXCEPTION 'F: five occurrences should end on 2030-01-16';
  END IF;

  -- G: every second week, Tuesday and Thursday, in room 2 (even weeks).
  v_rule := public.save_availability_rule(
    p_recurrence => 'weekly', p_weekdays => ARRAY[2, 4]::smallint[], p_interval_weeks => 2::smallint,
    p_starts_at => '13:00', p_ends_at => '16:00',
    p_valid_from => '2030-01-07', p_mode => 'in_person', p_room_id => ids.room_2_id
  );
  INSERT INTO availability_test_rules VALUES ('anna_fortnight', v_rule);
END;
$$;
RESET ROLE;

-- H–L: Jan shares the rooms.
SELECT set_config('request.jwt.claims', '{"sub":"70000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  ids availability_test_ids%ROWTYPE;
  hint text;
BEGIN
  SELECT * INTO ids FROM availability_test_ids;

  -- H: he cannot read Anna's windows.
  IF EXISTS (SELECT 1 FROM public.specialist_availability_rules WHERE specialist_id = ids.anna_id) THEN
    RAISE EXCEPTION 'H: a specialist could read another specialist''s availability';
  END IF;

  -- I: Anna's room on any of her weekdays is taken, without saying by whom.
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'once', p_weekdays => ARRAY[3]::smallint[],
      p_starts_at => '10:00', p_ends_at => '11:00',
      p_valid_from => '2030-01-16', p_mode => 'in_person', p_room_id => ids.room_1_id
    );
    RAISE EXCEPTION 'I: a taken room was accepted';
  EXCEPTION WHEN exclusion_violation THEN
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'room_taken' THEN RAISE EXCEPTION 'I: expected room_taken, got %', hint; END IF;
  END;

  -- J: every second week in the other weeks shares room 2; the same weeks do not.
  PERFORM public.save_availability_rule(
    p_recurrence => 'weekly', p_weekdays => ARRAY[2, 4]::smallint[], p_interval_weeks => 2::smallint,
    p_starts_at => '13:00', p_ends_at => '16:00',
    p_valid_from => '2030-01-14', p_mode => 'in_person', p_room_id => ids.room_2_id
  );
  BEGIN
    PERFORM public.save_availability_rule(
      p_recurrence => 'weekly', p_weekdays => ARRAY[4]::smallint[],
      p_starts_at => '14:00', p_ends_at => '15:00',
      p_valid_from => '2030-03-01', p_mode => 'in_person', p_room_id => ids.room_2_id
    );
    RAISE EXCEPTION 'J: a weekly window over fortnightly ones was accepted';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;

  -- K: he cannot manage Anna's occurrences.
  BEGIN
    PERFORM public.delete_availability_occurrence(
      (SELECT rule_id FROM availability_test_rules WHERE name = 'anna_workdays'), '2030-01-08', 'this'
    );
    RAISE EXCEPTION 'K: a specialist removed another specialist''s occurrence';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;

  -- L: tables are written only through the functions.
  BEGIN
    INSERT INTO public.specialist_availability_exceptions (rule_id, date)
    VALUES ((SELECT rule_id FROM availability_test_rules WHERE name = 'anna_workdays'), '2030-01-08');
    RAISE EXCEPTION 'L: a direct insert was accepted';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

-- M–R: Anna removes and changes single occurrences, as in calendar apps.
SELECT set_config('request.jwt.claims', '{"sub":"70000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  ids availability_test_ids%ROWTYPE;
  workdays uuid := (SELECT rule_id FROM availability_test_rules WHERE name = 'anna_workdays');
  new_id uuid;
BEGIN
  SELECT * INTO ids FROM availability_test_ids;

  -- M: "only this occurrence": Wednesday 2030-01-16 is skipped...
  PERFORM public.delete_availability_occurrence(workdays, '2030-01-16', 'this');
  IF NOT EXISTS (
    SELECT 1 FROM public.specialist_availability_exceptions AS e WHERE e.rule_id = workdays AND e.date = '2030-01-16'
  ) THEN
    RAISE EXCEPTION 'M: the occurrence was not skipped';
  END IF;
  -- ...a date that is not an occurrence cannot be removed...
  BEGIN
    PERFORM public.delete_availability_occurrence(workdays, '2030-01-12', 'this');
    RAISE EXCEPTION 'M: a Saturday was treated as an occurrence';
  EXCEPTION WHEN no_data_found THEN NULL;
  END;
  -- ...and those hours are free that day.
  PERFORM public.save_availability_rule(
    p_recurrence => 'once', p_weekdays => ARRAY[3]::smallint[],
    p_starts_at => '10:00', p_ends_at => '11:00',
    p_valid_from => '2030-01-16', p_mode => 'online'
  );

  -- N: "only this occurrence" changed: Monday 2030-01-21 moves to 14:00–17:00.
  new_id := public.edit_availability_occurrence(
    p_rule_id => workdays, p_date => '2030-01-21', p_scope => 'this',
    p_recurrence => 'once', p_weekdays => ARRAY[1]::smallint[],
    p_starts_at => '14:00', p_ends_at => '17:00',
    p_valid_from => '2030-01-21', p_mode => 'in_person', p_room_id => ids.room_1_id
  );
  IF (SELECT (recurrence, valid_from, starts_at) FROM public.specialist_availability_rules WHERE id = new_id)
     IS DISTINCT FROM ('once'::public.availability_recurrence, '2030-01-21'::date, '14:00'::time)
     OR NOT EXISTS (
       SELECT 1 FROM public.specialist_availability_exceptions AS e WHERE e.rule_id = workdays AND e.date = '2030-01-21'
     ) THEN
    RAISE EXCEPTION 'N: the single occurrence was not replaced';
  END IF;

  -- O: "this and following", changed: from 2030-02-04 the rule is 08:00–11:00.
  new_id := public.edit_availability_occurrence(
    p_rule_id => workdays, p_date => '2030-02-04', p_scope => 'following',
    p_recurrence => 'weekly', p_weekdays => ARRAY[1, 2, 3, 4, 5]::smallint[],
    p_starts_at => '08:00', p_ends_at => '11:00',
    p_valid_from => '2030-02-04', p_mode => 'in_person', p_room_id => ids.room_1_id
  );
  IF (SELECT valid_until FROM public.specialist_availability_rules WHERE id = workdays) <> '2030-02-03'
     OR (SELECT (valid_from, starts_at) FROM public.specialist_availability_rules WHERE id = new_id)
        IS DISTINCT FROM ('2030-02-04'::date, '08:00'::time) THEN
    RAISE EXCEPTION 'O: the series was not split on 2030-02-04';
  END IF;

  -- P: "this and following", removed: the new series ends before 2030-03-04...
  PERFORM public.delete_availability_occurrence(new_id, '2030-03-04', 'following');
  IF (SELECT valid_until FROM public.specialist_availability_rules WHERE id = new_id) <> '2030-03-03' THEN
    RAISE EXCEPTION 'P: the series did not end before 2030-03-04';
  END IF;
  -- ...and from its first occurrence the whole series goes.
  PERFORM public.delete_availability_occurrence(new_id, '2030-02-04', 'following');
  IF EXISTS (SELECT 1 FROM public.specialist_availability_rules WHERE id = new_id) THEN
    RAISE EXCEPTION 'P: removing from the first occurrence should remove the series';
  END IF;

  -- Q: "all occurrences" removes the rule and its exceptions.
  PERFORM public.delete_availability_occurrence(workdays, '2030-01-08', 'all');
  IF EXISTS (SELECT 1 FROM public.specialist_availability_rules WHERE id = workdays)
     OR EXISTS (SELECT 1 FROM public.specialist_availability_exceptions AS e WHERE e.rule_id = workdays) THEN
    RAISE EXCEPTION 'Q: the rule or its exceptions were left behind';
  END IF;

  -- R: time off may not overlap other time off.
  PERFORM public.add_time_off(p_starts_at => '2030-04-01 00:00+02', p_ends_at => '2030-04-08 00:00+02', p_reason => 'Urlop');
  BEGIN
    PERFORM public.add_time_off(p_starts_at => '2030-04-07 12:00+02', p_ends_at => '2030-04-07 14:00+02');
    RAISE EXCEPTION 'R: overlapping time off was accepted';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;
END;
$$;
RESET ROLE;

-- S: the admin manages anyone's availability.
SELECT set_config('request.jwt.claims', '{"sub":"70000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  ids availability_test_ids%ROWTYPE;
  v_rule uuid;
BEGIN
  SELECT * INTO ids FROM availability_test_ids;
  v_rule := public.save_availability_rule(
    p_specialist_id => ids.anna_id,
    p_recurrence => 'weekly', p_weekdays => ARRAY[6]::smallint[],
    p_starts_at => '09:00', p_ends_at => '10:00',
    p_valid_from => '2030-01-07', p_mode => 'online'
  );
  PERFORM public.delete_availability_occurrence(v_rule, '2030-01-12', 'this');
  IF NOT EXISTS (SELECT 1 FROM public.specialist_availability_exceptions AS e WHERE e.rule_id = v_rule) THEN
    RAISE EXCEPTION 'S: the admin could not read or skip an occurrence';
  END IF;
END;
$$;
RESET ROLE;

-- T: anonymous visitors read nothing.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.specialist_availability_rules LIMIT 1;
    RAISE EXCEPTION 'T: anon read availability';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.specialist_availability_exceptions LIMIT 1;
    RAISE EXCEPTION 'T: anon read exceptions';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

ROLLBACK;
