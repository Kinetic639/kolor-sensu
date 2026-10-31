BEGIN;

-- Visits (docs/product/booking-plan.md, RD2): free times worked out in the
-- database from availability, time off, room closures and other visits;
-- a hold that re-checks the time and cannot double-book, even in a race;
-- a guest's access by token. Everything is rolled back at the end.

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('71000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-booking-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Booking","last_name":"Admin"}', now(), now(), false, false),
  ('71000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-booking-anna@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Anna","last_name":"Test"}', now(), now(), false, false),
  ('71000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'domain-test-booking-jan@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Jan","last_name":"Test"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('71000000-0000-4000-8000-000000000001', 'admin'),
  ('71000000-0000-4000-8000-000000000002', 'specialist'),
  ('71000000-0000-4000-8000-000000000003', 'specialist');

UPDATE public.specialists SET public_slug = 'booking-test-anna', active = true, publicly_visible = true
WHERE user_id = '71000000-0000-4000-8000-000000000002';
UPDATE public.specialists SET public_slug = 'booking-test-jan', active = true, publicly_visible = true
WHERE user_id = '71000000-0000-4000-8000-000000000003';

INSERT INTO public.specialist_public_profiles (specialist_id, display_name, publication_status, published_at)
SELECT id, 'Anna Test', 'published', now() FROM public.specialists
WHERE public_slug IN ('booking-test-anna', 'booking-test-jan')
ON CONFLICT (specialist_id) DO UPDATE
SET publication_status = 'published', published_at = now();

INSERT INTO public.locations (name, slug, active, publicly_visible)
VALUES
  ('Booking Location', 'booking-test-location', true, true),
  ('Booking Other Location', 'booking-test-other', true, true);

INSERT INTO public.rooms (location_id, name, slug, capacity, active)
SELECT id, 'Booking Room', 'booking-test-room', 2, true
FROM public.locations WHERE slug = 'booking-test-location';

-- Open every day 06:00–22:00 (a room without hours is closed).
INSERT INTO public.room_opening_hours (room_id, weekday, starts_at, ends_at)
SELECT room.id, day, '06:00', '22:00'
FROM public.rooms AS room CROSS JOIN generate_series(1, 7) AS day
WHERE room.slug = 'booking-test-room';

INSERT INTO public.services (name, slug, category, default_duration_minutes, active, publicly_visible, booking_enabled)
VALUES ('Booking Consultation', 'booking-test-consultation', 'consultation', 50, true, true, true);

INSERT INTO public.specialist_services (
  specialist_id, service_id, active, price_minor,
  supports_in_person, supports_online
)
SELECT specialists.id, services.id, true, 25000, true, true
FROM public.specialists, public.services
WHERE specialists.public_slug IN ('booking-test-anna', 'booking-test-jan')
  AND services.slug = 'booking-test-consultation';

-- The centre: bookings on, a 60-minute grid, 10 minutes between visits,
-- an hour's notice, 60 days ahead, reminders a day before.
UPDATE public.center_settings
SET booking_enabled = true, slot_step_minutes = 60,
    default_visit_buffer_minutes = 10, min_booking_lead_minutes = 60,
    max_booking_horizon_days = 60, hold_minutes = 10,
    visit_reminder_hours = 24, payment_reminder_hours = 24;

-- Next week's Monday and Tuesday, where the centre is.
CREATE TEMP TABLE booking_test AS
SELECT
  (date_trunc('week', now() AT TIME ZONE 'Europe/Warsaw')::date + 7) AS monday,
  (date_trunc('week', now() AT TIME ZONE 'Europe/Warsaw')::date + 8) AS tuesday,
  (SELECT id FROM public.specialists WHERE public_slug = 'booking-test-anna') AS anna_id,
  (SELECT id FROM public.specialists WHERE public_slug = 'booking-test-jan') AS jan_id,
  (SELECT id FROM public.rooms WHERE slug = 'booking-test-room') AS room_id;
GRANT SELECT ON booking_test TO authenticated, anon, service_role;

-- Anna: Monday 9–12 in the room, Monday 13–15 online, Tuesday 9–11
-- hybrid (in the room, or online from it).
INSERT INTO public.specialist_availability_rules (
  specialist_id, recurrence, weekdays, starts_at, ends_at, valid_from, mode, room_id
)
SELECT anna_id, 'weekly'::public.availability_recurrence, ARRAY[1]::smallint[], '09:00'::time, '12:00'::time, monday, 'in_person'::public.availability_mode, room_id FROM booking_test
UNION ALL
SELECT anna_id, 'weekly', ARRAY[1]::smallint[], '13:00', '15:00', monday, 'online', NULL FROM booking_test
UNION ALL
SELECT anna_id, 'weekly', ARRAY[2]::smallint[], '09:00', '11:00', monday, 'hybrid', room_id FROM booking_test;

-- The free times of a day, as local `HH:MM`, in order.
CREATE FUNCTION pg_temp.free_times(p_mode public.visit_mode, p_day date, p_location text DEFAULT NULL)
RETURNS text
LANGUAGE sql
AS $$
  SELECT coalesce(string_agg(to_char(starts_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI'), ' ' ORDER BY starts_at), '')
  FROM public.list_free_slots('booking-test-consultation', 'booking-test-anna', p_mode, p_day, p_day, p_location);
$$;

-- The start of a local time on a day.
CREATE FUNCTION pg_temp.at(p_day date, p_time time)
RETURNS timestamptz
LANGUAGE sql
AS $$ SELECT (p_day + p_time) AT TIME ZONE 'Europe/Warsaw'; $$;

GRANT EXECUTE ON FUNCTION pg_temp.free_times(public.visit_mode, date, text) TO anon, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.at(date, time) TO anon, service_role;

-- The guest's details as the site sends them (the whole name split, and
-- the consents a visit within 14 days or for minors asks for, given).
CREATE FUNCTION pg_temp.save_details(
  p_token text, p_name text, p_email text, p_phone text, p_notes text,
  p_terms boolean, p_privacy boolean
)
RETURNS void
LANGUAGE sql
AS $$
  SELECT public.save_booking_details(p_token, split_part(p_name, ' ', 1),
    nullif(substr(p_name, length(split_part(p_name, ' ', 1)) + 2), ''),
    p_email, p_phone, p_notes, p_terms, p_privacy, true, true);
$$;
GRANT EXECUTE ON FUNCTION pg_temp.save_details(text, text, text, text, text, boolean, boolean) TO anon, service_role;

-- A–B: anyone sees the free times, on the grid, fitting the window.
SET LOCAL ROLE anon;
DO $$
DECLARE
  t booking_test%ROWTYPE;
BEGIN
  SELECT * INTO t FROM booking_test;

  -- A: a 50-minute visit starts on the hour and ends inside the window.
  IF pg_temp.free_times('in_person', t.monday) <> '09:00 10:00 11:00' THEN
    RAISE EXCEPTION 'A: Monday in person: %', pg_temp.free_times('in_person', t.monday);
  END IF;
  IF pg_temp.free_times('online', t.monday) <> '13:00 14:00' THEN
    RAISE EXCEPTION 'A: Monday online: %', pg_temp.free_times('online', t.monday);
  END IF;
  -- A hybrid window serves both; 11:00 would end after 11:30.
  IF pg_temp.free_times('in_person', t.tuesday) <> '09:00 10:00'
     OR pg_temp.free_times('online', t.tuesday) <> '09:00 10:00' THEN
    RAISE EXCEPTION 'A: Tuesday hybrid';
  END IF;
  IF (SELECT ends_at - starts_at FROM public.list_free_slots(
        'booking-test-consultation', 'booking-test-anna', 'in_person', t.monday, t.monday
      ) LIMIT 1) <> interval '50 minutes' THEN
    RAISE EXCEPTION 'A: a slot is not 50 minutes long';
  END IF;

  -- B: in person, only in the room's location.
  IF pg_temp.free_times('in_person', t.monday, 'booking-test-location') <> '09:00 10:00 11:00'
     OR pg_temp.free_times('in_person', t.monday, 'booking-test-other') <> '' THEN
    RAISE EXCEPTION 'B: the location filter';
  END IF;

  -- B: at most two weeks at a time.
  BEGIN
    PERFORM public.list_free_slots('booking-test-consultation', 'booking-test-anna', 'online', t.monday, t.monday + 14);
    RAISE EXCEPTION 'B: a range over 14 days was accepted';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;

  -- B: the public reads no visits and cannot hold a time itself.
  BEGIN
    PERFORM 1 FROM public.appointments LIMIT 1;
    RAISE EXCEPTION 'B: anon read appointments';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.hold_slot('booking-test-consultation', 'booking-test-anna', 'in_person', pg_temp.at(t.monday, '10:00'), p_client_key => 'visitor-1');
    RAISE EXCEPTION 'B: anon held a time';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

CREATE TEMP TABLE booking_test_holds (name text PRIMARY KEY, token text, appointment_id uuid);
GRANT SELECT, INSERT ON booking_test_holds TO service_role;

-- C–H: the site's server holds times.
SET LOCAL ROLE service_role;
DO $$
DECLARE
  t booking_test%ROWTYPE;
  held record;
  visit public.appointments%ROWTYPE;
  hint text;
BEGIN
  SELECT * INTO t FROM booking_test;

  -- C: a hold takes the room of the window, the offer's price, and a token
  -- the database keeps only as a hash.
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person', pg_temp.at(t.monday, '10:00'), p_client_key => 'visitor-1'
  );
  INSERT INTO booking_test_holds VALUES ('monday_10', held.access_token, held.appointment_id);
  SELECT * INTO visit FROM public.appointments WHERE id = held.appointment_id;
  IF visit.status <> 'held' OR visit.room_id IS DISTINCT FROM t.room_id
     OR visit.price_minor <> 25000 OR visit.currency_code <> 'PLN'
     OR visit.duration_minutes <> 50 OR visit.buffer_minutes <> 10
     OR visit.during <> tstzrange(pg_temp.at(t.monday, '10:00'), pg_temp.at(t.monday, '10:50'))
     OR visit.blocks <> tstzrange(pg_temp.at(t.monday, '10:00'), pg_temp.at(t.monday, '11:00')) THEN
    RAISE EXCEPTION 'C: the hold was not saved as expected: %', row_to_json(visit);
  END IF;
  IF visit.access_token_hash <> extensions.digest(held.access_token, 'sha256')
     OR length(held.access_token) < 40 THEN
    RAISE EXCEPTION 'C: the token';
  END IF;
  -- The year and month it was booked, and its number in that month.
  IF held.reference !~ ('^' || to_char(now() AT TIME ZONE 'Europe/Warsaw', 'YYMM') || '-[0-9]{3,}$') THEN
    RAISE EXCEPTION 'C: the reference %', held.reference;
  END IF;
  IF held.hold_expires_at NOT BETWEEN now() + interval '9 minutes' AND now() + interval '11 minutes' THEN
    RAISE EXCEPTION 'C: the hold should last 10 minutes';
  END IF;

  -- D: the time is taken; 9:00 and 11:00 keep their 10 minutes' break.
  IF pg_temp.free_times('in_person', t.monday) <> '09:00 11:00' THEN
    RAISE EXCEPTION 'D: after the hold: %', pg_temp.free_times('in_person', t.monday);
  END IF;

  -- E: a taken time, one off the grid, one outside the window.
  FOREACH hint IN ARRAY ARRAY['10:00', '10:30', '12:00'] LOOP
    BEGIN
      PERFORM public.hold_slot(
        'booking-test-consultation', 'booking-test-anna', 'in_person', pg_temp.at(t.monday, hint::time), p_client_key => 'visitor-1'
      );
      RAISE EXCEPTION 'E: % was held', hint;
    EXCEPTION WHEN raise_exception THEN
      IF SQLERRM LIKE 'E:%' THEN RAISE; END IF;
      GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
      IF hint <> 'slot_unavailable' THEN RAISE EXCEPTION 'E: expected slot_unavailable, got %', hint; END IF;
    END;
  END LOOP;

  -- F: the database itself refuses a second visit in the same time, for
  -- the specialist and for the room.
  BEGIN
    INSERT INTO public.appointments (
      reference, specialist_id, service_id, specialist_service_id, mode, room_id,
      during, buffer_minutes, duration_minutes, price_minor, currency_code,
      status, hold_expires_at, access_token_hash
    )
    SELECT 'KS-TEST-1', specialist_id, service_id, specialist_service_id, 'online', NULL,
      tstzrange(pg_temp.at(t.monday, '10:30'), pg_temp.at(t.monday, '11:20')), 10, 50, 0, 'PLN',
      'held', now() + interval '5 minutes', extensions.digest('x', 'sha256')
    FROM public.appointments WHERE id = visit.id;
    RAISE EXCEPTION 'F: the specialist was double-booked';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;
  BEGIN
    INSERT INTO public.appointments (
      reference, specialist_id, service_id, specialist_service_id, mode, room_id,
      during, buffer_minutes, duration_minutes, price_minor, currency_code,
      status, hold_expires_at, access_token_hash
    )
    SELECT 'KS-TEST-2', t.jan_id, service_id,
      (SELECT id FROM public.specialist_services WHERE specialist_id = t.jan_id),
      'in_person', t.room_id,
      tstzrange(pg_temp.at(t.monday, '10:30'), pg_temp.at(t.monday, '11:20')), 10, 50, 0, 'PLN',
      'held', now() + interval '5 minutes', extensions.digest('y', 'sha256')
    FROM public.appointments WHERE id = visit.id;
    RAISE EXCEPTION 'F: the room was double-booked';
  EXCEPTION WHEN exclusion_violation THEN NULL;
  END;

  -- G: a hold left to expire frees the time, and it can be held again.
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'online', pg_temp.at(t.monday, '13:00'), p_client_key => 'visitor-1'
  );
  INSERT INTO booking_test_holds VALUES ('monday_13', held.access_token, held.appointment_id);
  UPDATE public.appointments SET hold_expires_at = now() - interval '1 second'
  WHERE id = held.appointment_id;
  IF pg_temp.free_times('online', t.monday) <> '13:00 14:00' THEN
    RAISE EXCEPTION 'G: an expired hold still blocks: %', pg_temp.free_times('online', t.monday);
  END IF;
  PERFORM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'online', pg_temp.at(t.monday, '13:00'), p_client_key => 'visitor-1'
  );
  IF (SELECT status FROM public.appointments WHERE id = held.appointment_id) <> 'expired' THEN
    RAISE EXCEPTION 'G: the old hold was not marked expired';
  END IF;

  -- H: the guest sees their visit by token, and can let it go.
  SELECT token INTO hint FROM booking_test_holds WHERE name = 'monday_10';
  IF (SELECT (status, service_name, specialist_name, room_name, location_name, price_minor)
      FROM public.get_booking(hint))
     IS DISTINCT FROM ('held'::public.appointment_status, 'Booking Consultation'::text, 'Anna Test'::text,
       'Booking Room'::text, 'Booking Location'::text, 25000) THEN
    RAISE EXCEPTION 'H: get_booking';
  END IF;
  IF EXISTS (SELECT 1 FROM public.get_booking('not-a-token')) THEN
    RAISE EXCEPTION 'H: a wrong token found a visit';
  END IF;
  IF NOT public.release_hold(hint) THEN RAISE EXCEPTION 'H: release_hold'; END IF;
  IF pg_temp.free_times('in_person', t.monday) <> '09:00 10:00 11:00' THEN
    RAISE EXCEPTION 'H: a released hold still blocks';
  END IF;
  IF public.release_hold(hint) THEN RAISE EXCEPTION 'H: released twice'; END IF;
END;
$$;
RESET ROLE;

-- I–L: what else takes times away (as the owner, changing the setup).
DO $$
DECLARE
  t booking_test%ROWTYPE;
BEGIN
  SELECT * INTO t FROM booking_test;

  -- I: time off.
  INSERT INTO public.specialist_time_off (specialist_id, during)
  VALUES (t.anna_id, tstzrange(pg_temp.at(t.monday, '09:30'), pg_temp.at(t.monday, '10:00')));
  IF pg_temp.free_times('in_person', t.monday) <> '10:00 11:00' THEN
    RAISE EXCEPTION 'I: time off: %', pg_temp.free_times('in_person', t.monday);
  END IF;
  DELETE FROM public.specialist_time_off WHERE specialist_id = t.anna_id;

  -- J: a room closed all day, or for a while; online is not affected
  -- (13:00 is held since G).
  INSERT INTO public.room_availability_exceptions (room_id, date, type)
  VALUES (t.room_id, t.monday, 'closed_all_day');
  IF pg_temp.free_times('in_person', t.monday) <> ''
     OR pg_temp.free_times('online', t.monday) <> '14:00' THEN
    RAISE EXCEPTION 'J: room closed all day';
  END IF;
  DELETE FROM public.room_availability_exceptions WHERE room_id = t.room_id;
  INSERT INTO public.room_availability_exceptions (room_id, date, type, starts_at, ends_at)
  VALUES (t.room_id, t.monday, 'blocked_interval', '11:00', '12:00');
  IF pg_temp.free_times('in_person', t.monday) <> '09:00 10:00' THEN
    RAISE EXCEPTION 'J: room blocked for a while: %', pg_temp.free_times('in_person', t.monday);
  END IF;
  DELETE FROM public.room_availability_exceptions WHERE room_id = t.room_id;

  -- K: not bookable: the offer, the form, the service, the specialist, the centre.
  UPDATE public.specialist_services SET supports_online = false WHERE specialist_id = t.anna_id;
  IF pg_temp.free_times('online', t.monday) <> '' THEN RAISE EXCEPTION 'K: online not offered'; END IF;
  UPDATE public.specialist_services SET supports_online = true, active = false
  WHERE specialist_id = t.anna_id;
  IF pg_temp.free_times('online', t.monday) <> '' THEN RAISE EXCEPTION 'K: offer inactive'; END IF;
  UPDATE public.specialist_services SET active = true WHERE specialist_id = t.anna_id;
  UPDATE public.services SET booking_enabled = false WHERE slug = 'booking-test-consultation';
  IF pg_temp.free_times('online', t.monday) <> '' THEN RAISE EXCEPTION 'K: service not bookable'; END IF;
  UPDATE public.services SET booking_enabled = true WHERE slug = 'booking-test-consultation';
  UPDATE public.specialists SET active = false WHERE id = t.anna_id;
  IF pg_temp.free_times('online', t.monday) <> '' THEN RAISE EXCEPTION 'K: inactive specialist'; END IF;
  UPDATE public.specialists SET active = true WHERE id = t.anna_id;
  UPDATE public.center_settings SET booking_enabled = false;
  IF pg_temp.free_times('online', t.monday) <> '' THEN RAISE EXCEPTION 'K: bookings off'; END IF;
  UPDATE public.center_settings SET booking_enabled = true;

  -- L: notice and horizon.
  UPDATE public.center_settings SET max_booking_horizon_days = 1;
  -- (Next Tuesday is at least two days away.)
  IF pg_temp.free_times('online', t.tuesday) <> '' THEN RAISE EXCEPTION 'L: beyond the horizon'; END IF;
  -- A week's notice: nothing sooner.
  UPDATE public.center_settings SET max_booking_horizon_days = 60, min_booking_lead_minutes = 10080;
  IF EXISTS (
    SELECT 1 FROM public.list_free_slots('booking-test-consultation', 'booking-test-anna', 'online', t.monday, t.tuesday)
    WHERE starts_at < now() + interval '7 days'
  ) THEN
    RAISE EXCEPTION 'L: inside the notice';
  END IF;
  UPDATE public.center_settings SET min_booking_lead_minutes = 60;

  -- L2: the soonest free time (#203): the first of the list, also from a
  -- day with nothing free; none past the horizon, nor for an unknown offer.
  IF public.next_free_slot('booking-test-consultation', 'booking-test-anna', 'online', t.monday)
     IS DISTINCT FROM (
       SELECT min(starts_at) FROM public.list_free_slots(
         'booking-test-consultation', 'booking-test-anna', 'online', t.monday, t.monday + 13)
     ) THEN
    RAISE EXCEPTION 'L2: not the first free time';
  END IF;
  IF public.next_free_slot('booking-test-consultation', 'booking-test-anna', 'online', t.monday - 1)
     IS DISTINCT FROM public.next_free_slot('booking-test-consultation', 'booking-test-anna', 'online', t.monday) THEN
    RAISE EXCEPTION 'L2: a Sunday did not lead on to the week';
  END IF;
  IF public.next_free_slot('booking-test-consultation', 'booking-test-anna', 'online', current_date + 61) IS NOT NULL
     OR public.next_free_slot('booking-test-consultation', 'no-such-specialist', 'online', t.monday) IS NOT NULL THEN
    RAISE EXCEPTION 'L2: a time past the horizon or for no offer';
  END IF;
  UPDATE public.center_settings SET max_booking_horizon_days = 1;
  IF public.next_free_slot('booking-test-consultation', 'booking-test-anna', 'online', t.tuesday) IS NOT NULL THEN
    RAISE EXCEPTION 'L2: past a short horizon';
  END IF;
  UPDATE public.center_settings SET max_booking_horizon_days = 60;
END;
$$;

-- N: the wizard's catalogue: what can be booked, by the same rules as the
-- free times, and the centre's booking window.
SET LOCAL ROLE anon;
DO $$
DECLARE
  offer record;
BEGIN
  SELECT * INTO offer FROM public.list_bookable_offers()
  WHERE specialist_slug = 'booking-test-anna';
  IF offer IS NULL OR offer.service_slug <> 'booking-test-consultation'
     OR offer.service_name <> 'Booking Consultation' OR offer.specialist_name <> 'Anna Test'
     OR offer.duration_minutes <> 50 OR offer.price_minor <> 25000
     OR NOT offer.supports_in_person OR NOT offer.supports_online THEN
    RAISE EXCEPTION 'N: Anna''s offer: %', row_to_json(offer);
  END IF;
  IF (SELECT (time_zone, horizon_days, hold_minutes) FROM public.booking_window())
     IS DISTINCT FROM ('Europe/Warsaw'::text, 60, 10) THEN
    RAISE EXCEPTION 'N: booking_window';
  END IF;
END;
$$;
RESET ROLE;
DO $$
BEGIN
  UPDATE public.specialist_services SET active = false
  WHERE specialist_id = (SELECT anna_id FROM booking_test);
  IF EXISTS (SELECT 1 FROM public.list_bookable_offers() WHERE specialist_slug = 'booking-test-anna') THEN
    RAISE EXCEPTION 'N: an inactive offer was listed';
  END IF;
  UPDATE public.specialist_services SET active = true
  WHERE specialist_id = (SELECT anna_id FROM booking_test);
  UPDATE public.center_settings SET booking_enabled = false;
  IF EXISTS (SELECT 1 FROM public.list_bookable_offers()) THEN
    RAISE EXCEPTION 'N: offers listed with bookings off';
  END IF;
  UPDATE public.center_settings SET booking_enabled = true;
END;
$$;

-- M: specialists read their own visits, admins all; nobody reads tokens.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  -- Her three: released, expired and held.
  IF (SELECT count(*) FROM public.appointments) <> 3 THEN
    RAISE EXCEPTION 'M: Anna should see her visits';
  END IF;
  BEGIN
    PERFORM access_token_hash FROM public.appointments LIMIT 1;
    RAISE EXCEPTION 'M: a specialist read a token hash';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.appointments SET price_minor = 0;
    RAISE EXCEPTION 'M: a specialist changed a visit';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  -- Payments are for the admin only.
  IF EXISTS (SELECT 1 FROM public.payments) THEN
    RAISE EXCEPTION 'M: a specialist read payments';
  END IF;
END;
$$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.appointments) THEN
    RAISE EXCEPTION 'M: Jan saw Anna''s visits';
  END IF;
END;
$$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.appointments WHERE reference ~ '^[0-9]{4}-[0-9]{3,}$') < 3 THEN
    RAISE EXCEPTION 'M: the admin should see every visit';
  END IF;
  PERFORM 1 FROM public.payments LIMIT 1;
END;
$$;
RESET ROLE;

-- O: one visitor cannot hold time after time (5 holds in 15 minutes).
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
  hint text;
BEGIN
  SELECT * INTO t FROM booking_test;
  FOR i IN 1..5 LOOP
    SELECT * INTO held FROM public.hold_slot(
      'booking-test-consultation', 'booking-test-anna', 'in_person',
      pg_temp.at(t.tuesday, '09:00'), p_client_key => 'visitor-2'
    );
    PERFORM public.release_hold(held.access_token);
  END LOOP;
  BEGIN
    PERFORM public.hold_slot(
      'booking-test-consultation', 'booking-test-anna', 'in_person',
      pg_temp.at(t.tuesday, '09:00'), p_client_key => 'visitor-2'
    );
    RAISE EXCEPTION 'O: a sixth hold was allowed';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'O:%' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'too_many_holds' THEN RAISE EXCEPTION 'O: expected too_many_holds, got %', hint; END IF;
  END;
  -- Another visitor still can.
  PERFORM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.tuesday, '09:00'), p_client_key => 'visitor-3'
  );
END;
$body$;

-- P: the client's details go to their held visit, with the consents.
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
  visit public.appointments%ROWTYPE;
  hint text;
BEGIN
  SELECT * INTO t FROM booking_test;
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.tuesday, '10:00'), p_client_key => 'visitor-4'
  );

  -- Both consents are needed.
  BEGIN
    PERFORM pg_temp.save_details(held.access_token, 'Jan Kowalski',
      'jan@example.com', '600100200', NULL, true, false);
    RAISE EXCEPTION 'P: saved without the privacy consent';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'P:%' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'consent_required' THEN RAISE EXCEPTION 'P: expected consent_required, got %', hint; END IF;
  END;
  -- Details the database would not keep.
  BEGIN
    PERFORM pg_temp.save_details(held.access_token, 'Jan Kowalski',
      'not-an-email', '600100200', NULL, true, true);
    RAISE EXCEPTION 'P: saved a wrong e-mail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'P:%' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'invalid_details' THEN RAISE EXCEPTION 'P: expected invalid_details, got %', hint; END IF;
  END;

  PERFORM pg_temp.save_details(held.access_token, 'Jan Kowalski',
    'jan@example.com', '+48 600 100 200', 'Pierwsza wizyta', true, true);
  SELECT * INTO visit FROM public.appointments WHERE id = held.appointment_id;
  IF (visit.client_name, visit.client_email, visit.client_phone, visit.client_notes, visit.status)
     IS DISTINCT FROM ('Jan Kowalski'::text, 'jan@example.com'::text, '+48 600 100 200'::text,
       'Pierwsza wizyta'::text, 'held'::public.appointment_status)
     OR visit.terms_accepted_at IS NULL OR visit.privacy_accepted_at IS NULL THEN
    RAISE EXCEPTION 'P: the details were not saved: %', row_to_json(visit);
  END IF;
  IF (SELECT (client_name, client_email, details_saved) FROM public.get_booking(held.access_token))
     IS DISTINCT FROM ('Jan Kowalski'::text, 'jan@example.com'::text, true) THEN
    RAISE EXCEPTION 'P: get_booking does not show the details';
  END IF;

  -- Not after the hold expired.
  UPDATE public.appointments SET hold_expires_at = now() - interval '1 second'
  WHERE id = held.appointment_id;
  BEGIN
    PERFORM pg_temp.save_details(held.access_token, 'Jan Kowalski',
      'jan@example.com', '600100200', NULL, true, true);
    RAISE EXCEPTION 'P: saved on an expired hold';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'P:%' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'hold_expired' THEN RAISE EXCEPTION 'P: expected hold_expired, got %', hint; END IF;
  END;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $body$
BEGIN
  BEGIN
    PERFORM pg_temp.save_details('x', 'a', 'a@b.pl', '600100200', NULL, true, true);
    RAISE EXCEPTION 'P: anon saved details';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;

-- Q: paying. The Stripe session is tied to a hold that has the client's
-- details; paying confirms the visit once, whatever arrives first (the
-- return page or the webhook); a failed or expired session frees the time;
-- money for a time that was lost in the meantime is to be refunded.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
  visit public.appointments%ROWTYPE;
  outcome text;
  hint text;
BEGIN
  SELECT * INTO t FROM booking_test;
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'online',
    pg_temp.at(t.monday, '14:00'), p_client_key => 'visitor-5'
  );

  -- Not before the details.
  BEGIN
    PERFORM public.attach_checkout_session(held.access_token, 'cs_test_1', now() + interval '30 minutes', 25000, 'PLN');
    RAISE EXCEPTION 'Q: a session without the details';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'Q:%' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'details_required' THEN RAISE EXCEPTION 'Q: expected details_required, got %', hint; END IF;
  END;
  PERFORM pg_temp.save_details(held.access_token, 'Ewa Test', 'ewa@example.com',
    '600100200', NULL, true, true);

  -- Not for another amount than the visit's.
  BEGIN
    PERFORM public.attach_checkout_session(held.access_token, 'cs_test_1', now() + interval '30 minutes', 100, 'PLN');
    RAISE EXCEPTION 'Q: a session for a wrong amount';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'Q:%' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'amount_mismatch' THEN RAISE EXCEPTION 'Q: expected amount_mismatch, got %', hint; END IF;
  END;

  -- The hold lasts as long as the session.
  PERFORM public.attach_checkout_session(held.access_token, 'cs_test_1', now() + interval '30 minutes', 25000, 'PLN');
  SELECT * INTO visit FROM public.appointments WHERE id = held.appointment_id;
  IF visit.hold_expires_at < now() + interval '29 minutes' THEN
    RAISE EXCEPTION 'Q: the hold was not extended to the session';
  END IF;
  IF (SELECT (status, amount_minor) FROM public.payments WHERE checkout_session_id = 'cs_test_1')
     IS DISTINCT FROM ('pending'::public.payment_status, 25000) THEN
    RAISE EXCEPTION 'Q: the payment was not recorded';
  END IF;
  IF (SELECT checkout_session_id FROM public.pending_checkout_session(held.access_token)) <> 'cs_test_1' THEN
    RAISE EXCEPTION 'Q: pending_checkout_session';
  END IF;

  -- Paid: confirmed once.
  outcome := public.fulfill_checkout_session('cs_test_1', true, 'pi_test_1');
  IF outcome <> 'confirmed' THEN RAISE EXCEPTION 'Q: fulfil gave %', outcome; END IF;
  outcome := public.fulfill_checkout_session('cs_test_1', true, 'pi_test_1');
  IF outcome <> 'already_confirmed' THEN RAISE EXCEPTION 'Q: a second fulfil gave %', outcome; END IF;
  SELECT * INTO visit FROM public.appointments WHERE id = held.appointment_id;
  IF visit.status <> 'confirmed' OR visit.confirmed_at IS NULL OR visit.hold_expires_at IS NOT NULL
     OR (SELECT (status, payment_intent_id) FROM public.payments WHERE checkout_session_id = 'cs_test_1')
        IS DISTINCT FROM ('succeeded'::public.payment_status, 'pi_test_1'::text) THEN
    RAISE EXCEPTION 'Q: the visit was not confirmed: %', row_to_json(visit);
  END IF;
  -- A confirmed visit keeps its time.
  IF pg_temp.free_times('online', t.monday) LIKE '%14:00%' THEN
    RAISE EXCEPTION 'Q: a confirmed visit left its time free';
  END IF;

  -- A refund is recorded against the payment.
  PERFORM public.record_refund('pi_test_1', 25000);
  IF (SELECT (status, refunded_minor) FROM public.payments WHERE checkout_session_id = 'cs_test_1')
     IS DISTINCT FROM ('refunded'::public.payment_status, 25000) THEN
    RAISE EXCEPTION 'Q: the refund was not recorded';
  END IF;
END;
$body$;

DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
  other record;
  outcome text;
BEGIN
  SELECT * INTO t FROM booking_test;

  -- Paid later (BLIK, Przelewy24): the time waits for the money.
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.tuesday, '10:00'), p_client_key => 'visitor-6'
  );
  PERFORM pg_temp.save_details(held.access_token, 'Ola Test', 'ola@example.com',
    '600100200', NULL, true, true);
  PERFORM public.attach_checkout_session(held.access_token, 'cs_test_2', now() + interval '30 minutes', 25000, 'PLN');
  outcome := public.fulfill_checkout_session('cs_test_2', false, NULL);
  IF outcome <> 'awaiting_payment'
     OR (SELECT status FROM public.appointments WHERE id = held.appointment_id) <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'Q: an unpaid session gave %', outcome;
  END IF;
  -- The payment failed: the time is free again.
  PERFORM public.fail_checkout_session('cs_test_2', 'failed');
  IF (SELECT status FROM public.appointments WHERE id = held.appointment_id) <> 'expired'
     OR (SELECT status FROM public.payments WHERE checkout_session_id = 'cs_test_2') <> 'failed'
     OR pg_temp.free_times('in_person', t.tuesday) NOT LIKE '%10:00%' THEN
    RAISE EXCEPTION 'Q: a failed payment kept the time';
  END IF;

  -- Paid after the hold lapsed and someone else took the time: to refund.
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.tuesday, '10:00'), p_client_key => 'visitor-7'
  );
  PERFORM pg_temp.save_details(held.access_token, 'Piotr Test', 'piotr@example.com',
    '600100200', NULL, true, true);
  PERFORM public.attach_checkout_session(held.access_token, 'cs_test_3', now() + interval '30 minutes', 25000, 'PLN');
  UPDATE public.appointments SET hold_expires_at = now() - interval '1 second'
  WHERE id = held.appointment_id;
  SELECT * INTO other FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.tuesday, '10:00'), p_client_key => 'visitor-8'
  );
  outcome := public.fulfill_checkout_session('cs_test_3', true, 'pi_test_3');
  IF outcome <> 'slot_lost'
     OR (SELECT status FROM public.appointments WHERE id = held.appointment_id) <> 'expired'
     OR (SELECT status FROM public.payments WHERE checkout_session_id = 'cs_test_3') <> 'succeeded' THEN
    RAISE EXCEPTION 'Q: a lost time gave %', outcome;
  END IF;

  -- Settled once: the time freed again does not bring back a visit whose
  -- money goes back; the refund is asked for until it is recorded.
  UPDATE public.appointments SET status = 'cancelled' WHERE id = other.appointment_id;
  outcome := public.fulfill_checkout_session('cs_test_3', true, 'pi_test_3');
  IF outcome <> 'slot_lost'
     OR (SELECT status FROM public.appointments WHERE id = held.appointment_id) <> 'expired' THEN
    RAISE EXCEPTION 'Q: a lost time came back: %', outcome;
  END IF;
  PERFORM public.record_refund('pi_test_3', 25000);
  outcome := public.fulfill_checkout_session('cs_test_3', true, 'pi_test_3');
  IF outcome <> 'already_settled'
     OR (SELECT status FROM public.appointments WHERE id = held.appointment_id) <> 'expired' THEN
    RAISE EXCEPTION 'Q: a refunded payment confirmed the visit: %', outcome;
  END IF;

  -- Paid after the hold lapsed, the time still free: confirmed anyway.
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.tuesday, '10:00'), p_client_key => 'visitor-q9'
  );
  PERFORM pg_temp.save_details(held.access_token, 'Ewa Test', 'ewa@example.com',
    '600100200', NULL, true, true);
  PERFORM public.attach_checkout_session(held.access_token, 'cs_test_4', now() + interval '30 minutes', 25000, 'PLN');
  -- A second session for the same visit (another tab): both get paid.
  PERFORM public.attach_checkout_session(held.access_token, 'cs_test_5', now() + interval '30 minutes', 25000, 'PLN');
  UPDATE public.appointments SET hold_expires_at = now() - interval '1 second'
  WHERE id = held.appointment_id;
  outcome := public.fulfill_checkout_session('cs_test_4', true, 'pi_test_4');
  IF outcome <> 'confirmed' THEN RAISE EXCEPTION 'Q: a free lapsed time gave %', outcome; END IF;
  -- The second payment goes back; the first still confirms.
  outcome := public.fulfill_checkout_session('cs_test_5', true, 'pi_test_5');
  IF outcome <> 'refund_payment' THEN RAISE EXCEPTION 'Q: a second payment gave %', outcome; END IF;
  IF public.fulfill_checkout_session('cs_test_4', true, 'pi_test_4') <> 'already_confirmed'
     OR public.fulfill_checkout_session('cs_test_5', true, 'pi_test_5') <> 'refund_payment' THEN
    RAISE EXCEPTION 'Q: two payments settled again differently';
  END IF;

  -- A session for an old price (the discount code changed since): refunded,
  -- the visit is not confirmed for it.
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.monday, (regexp_match(pg_temp.free_times('in_person', t.monday), '(\S+)$'))[1]::time),
    p_client_key => 'visitor-q10'
  );
  PERFORM pg_temp.save_details(held.access_token, 'Jan Test', 'jan@example.com',
    '600100200', NULL, true, true);
  PERFORM public.attach_checkout_session(held.access_token, 'cs_test_6', now() + interval '30 minutes', 25000, 'PLN');
  UPDATE public.appointments SET price_minor = 30000 WHERE id = held.appointment_id;
  outcome := public.fulfill_checkout_session('cs_test_6', true, 'pi_test_6');
  IF outcome <> 'refund_payment'
     OR (SELECT status FROM public.appointments WHERE id = held.appointment_id) <> 'held' THEN
    RAISE EXCEPTION 'Q: an old price gave %', outcome;
  END IF;

  -- Refunds are recorded only upwards, whatever order they come in.
  PERFORM public.record_refund('pi_test_4', 10000);
  PERFORM public.record_refund('pi_test_4', 0);
  PERFORM public.record_refund('pi_test_4', 5000);
  IF (SELECT (status, refunded_minor) FROM public.payments WHERE checkout_session_id = 'cs_test_4')
     IS DISTINCT FROM ('partially_refunded'::public.payment_status, 10000) THEN
    RAISE EXCEPTION 'Q: a refund went down';
  END IF;
  PERFORM public.record_refund('pi_test_6', 0);
  IF (SELECT status FROM public.payments WHERE checkout_session_id = 'cs_test_6') <> 'succeeded' THEN
    RAISE EXCEPTION 'Q: a refund of nothing changed the payment';
  END IF;

  -- An unknown session.
  IF public.fulfill_checkout_session('cs_unknown', true, NULL) <> 'unknown_session' THEN
    RAISE EXCEPTION 'Q: an unknown session';
  END IF;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $body$
BEGIN
  BEGIN
    PERFORM public.fulfill_checkout_session('cs_test_1', true, NULL);
    RAISE EXCEPTION 'Q: anon confirmed a payment';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;

-- R: the confirmation e-mail. Claimed once per visit (a second claim finds
-- nothing), with a fresh link token only the e-mail carries; the link opens
-- the visit; a failed send gives the claim back for a retry.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
  mail record;
  hint text;
BEGIN
  SELECT * INTO t FROM booking_test;
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.monday, '09:00'), p_client_key => 'visitor-9'
  );
  PERFORM pg_temp.save_details(held.access_token, 'Marta Test', 'marta@example.com',
    '600100200', NULL, true, true);

  -- Not before the visit is confirmed.
  IF EXISTS (SELECT 1 FROM public.claim_booking_email(held.reference, 'confirmation')) THEN
    RAISE EXCEPTION 'R: an e-mail for an unpaid visit';
  END IF;

  PERFORM public.attach_checkout_session(held.access_token, 'cs_test_r', now() + interval '30 minutes', 25000, 'PLN');
  PERFORM public.fulfill_checkout_session('cs_test_r', true, 'pi_test_r');

  SELECT * INTO mail FROM public.claim_booking_email(held.reference, 'confirmation');
  IF mail IS NULL OR mail.client_email <> 'marta@example.com' OR mail.client_name <> 'Marta Test'
     OR mail.service_name <> 'Booking Consultation' OR mail.room_name <> 'Booking Room'
     OR mail.location_name <> 'Booking Location' OR mail.mode <> 'in_person'
     OR mail.starts_at <> pg_temp.at(t.monday, '09:00') OR length(mail.manage_token) < 40 THEN
    RAISE EXCEPTION 'R: the claim: %', row_to_json(mail);
  END IF;
  -- The link token is not the hold's token, and opens the visit.
  IF mail.manage_token = held.access_token
     OR (SELECT status FROM public.get_booking(mail.manage_token)) <> 'confirmed' THEN
    RAISE EXCEPTION 'R: the link token';
  END IF;

  -- Claimed: nobody else sends it.
  IF EXISTS (SELECT 1 FROM public.claim_booking_email(held.reference, 'confirmation')) THEN
    RAISE EXCEPTION 'R: claimed twice';
  END IF;

  -- A failed send gives it back; a new claim gets a new link token.
  PERFORM public.release_booking_email(held.reference, 'confirmation');
  SELECT * INTO mail FROM public.claim_booking_email(held.reference, 'confirmation');
  IF mail IS NULL THEN RAISE EXCEPTION 'R: a released e-mail was not claimable'; END IF;
  PERFORM public.mark_booking_email_sent(held.reference, 'confirmation', 'msg_1');
  IF (SELECT (sent_at IS NOT NULL, provider_message_id) FROM public.booking_emails
      WHERE appointment_id = held.appointment_id AND kind = 'confirmation')
     IS DISTINCT FROM (true, 'msg_1'::text) THEN
    RAISE EXCEPTION 'R: the sent e-mail was not recorded';
  END IF;
  -- Sent: never again.
  PERFORM public.release_booking_email(held.reference, 'confirmation');
  IF EXISTS (SELECT 1 FROM public.claim_booking_email(held.reference, 'confirmation')) THEN
    RAISE EXCEPTION 'R: a sent e-mail was claimed again';
  END IF;
  -- The latest link works; the first one no longer does.
  IF (SELECT count(*) FROM public.get_booking(mail.manage_token)) <> 1 THEN
    RAISE EXCEPTION 'R: the latest link does not open the visit';
  END IF;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $body$
BEGIN
  BEGIN
    PERFORM public.claim_booking_email('KS-X', 'confirmation');
    RAISE EXCEPTION 'R: anon claimed an e-mail';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;

-- S: the client changes a visit from the e-mail link (R8). Only the link's
-- token works. Cancelling gives the money back until the centre's window,
-- nothing after; moving goes to another free time of the same offer, as
-- many times as the centre allows and not later than its window. The
-- e-mails about it keep the client's link working.
-- Anna: Wednesday 9–13 in the room. The windows are set by the test (0 or
-- 720 hours), so the day it runs on does not matter.
INSERT INTO public.specialist_availability_rules (
  specialist_id, recurrence, weekdays, starts_at, ends_at, valid_from, mode, room_id
)
SELECT anna_id, 'weekly', ARRAY[3]::smallint[], '09:00', '13:00', monday, 'in_person', room_id
FROM booking_test;
UPDATE public.center_settings
SET cancellation_window_hours = 0, reschedule_window_hours = 0, max_self_reschedules = 1;

CREATE TEMP TABLE s_visits (name text PRIMARY KEY, reference text, hold_token text, link_token text);
GRANT SELECT, INSERT ON s_visits TO service_role;

-- A confirmed, paid visit on Wednesday, kept by name with its tokens.
CREATE FUNCTION pg_temp.paid_visit(p_name text, p_time time)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  held record;
  mail record;
BEGIN
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at((SELECT monday + 2 FROM booking_test), p_time), p_client_key => 'visitor-' || p_name
  );
  PERFORM pg_temp.save_details(held.access_token, 'Ola Test', 'ola@example.com',
    '600100200', NULL, true, true);
  PERFORM public.attach_checkout_session(held.access_token, 'cs_test_' || p_name,
    now() + interval '30 minutes', 25000, 'PLN');
  PERFORM public.fulfill_checkout_session('cs_test_' || p_name, true, 'pi_test_' || p_name);
  SELECT * INTO mail FROM public.claim_booking_email(held.reference, 'confirmation');
  INSERT INTO s_visits VALUES (p_name, held.reference, held.access_token, mail.manage_token);
END;
$$;

-- The hint of what a statement raised ('' when it raised nothing).
CREATE FUNCTION pg_temp.hint_of(p_sql text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  hint text;
BEGIN
  EXECUTE p_sql;
  RETURN '';
EXCEPTION WHEN raise_exception THEN
  GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
  RETURN hint;
END;
$$;

-- Wednesday's free times for anyone, as local `HH:MM`.
CREATE FUNCTION pg_temp.wednesday_times()
RETURNS text
LANGUAGE sql
AS $$
  SELECT coalesce(string_agg(to_char(starts_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI'), ' ' ORDER BY starts_at), '')
  FROM public.list_free_slots('booking-test-consultation', 'booking-test-anna', 'in_person',
    (SELECT monday + 2 FROM booking_test), (SELECT monday + 2 FROM booking_test));
$$;

GRANT EXECUTE ON FUNCTION pg_temp.paid_visit(text, time) TO service_role;
GRANT EXECUTE ON FUNCTION pg_temp.hint_of(text) TO service_role;
GRANT EXECUTE ON FUNCTION pg_temp.wednesday_times() TO service_role;

SET LOCAL ROLE service_role;
DO $body$
DECLARE
  wed date;
  a s_visits%ROWTYPE;
  moved record;
  mail record;
  times text;
BEGIN
  SELECT monday + 2 INTO wed FROM booking_test;
  PERFORM pg_temp.paid_visit('s1', '09:00');
  SELECT * INTO a FROM s_visits WHERE name = 's1';

  -- The policy is in the booking window.
  IF (SELECT (cancellation_window_hours, reschedule_window_hours, max_self_reschedules)
      FROM public.booking_window()) IS DISTINCT FROM (0, 0, 1) THEN
    RAISE EXCEPTION 'S: the booking window has no change policy';
  END IF;

  -- Times to move to: the day's other free times; its own time is not
  -- one, and it does not block the times next to it.
  SELECT string_agg(to_char(starts_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI'), ' ' ORDER BY starts_at)
  INTO times FROM public.list_reschedule_slots(a.link_token, wed, wed);
  IF times IS DISTINCT FROM '10:00 11:00 12:00' THEN
    RAISE EXCEPTION 'S: times to move to: %', times;
  END IF;
  -- The hold's token (the wizard's cookie) changes nothing.
  IF EXISTS (SELECT 1 FROM public.list_reschedule_slots(a.hold_token, wed, wed)) THEN
    RAISE EXCEPTION 'S: the hold token lists times to move to';
  END IF;
  IF pg_temp.hint_of(format('SELECT public.reschedule_booking(%L, %L)', a.hold_token, pg_temp.at(wed, '10:00'))) <> 'not_found'
     OR pg_temp.hint_of(format('SELECT public.cancel_booking(%L)', a.hold_token)) <> 'not_found' THEN
    RAISE EXCEPTION 'S: the hold token changed the visit';
  END IF;
  -- Not to a time that is not free, nor to its own.
  IF pg_temp.hint_of(format('SELECT public.reschedule_booking(%L, %L)', a.link_token, pg_temp.at(wed, '10:30'))) <> 'slot_unavailable'
     OR pg_temp.hint_of(format('SELECT public.reschedule_booking(%L, %L)', a.link_token, pg_temp.at(wed, '09:00'))) <> 'slot_unavailable' THEN
    RAISE EXCEPTION 'S: moved to a time that is not free';
  END IF;

  -- Moving: the new time, with its buffer; the old one is free again.
  SELECT * INTO moved FROM public.reschedule_booking(a.link_token, pg_temp.at(wed, '10:00'));
  IF moved.reference <> a.reference OR moved.starts_at <> pg_temp.at(wed, '10:00')
     OR moved.ends_at <> pg_temp.at(wed, '10:50') OR moved.reschedule_count <> 1 THEN
    RAISE EXCEPTION 'S: the move: %', row_to_json(moved);
  END IF;
  IF (SELECT (status, starts_at, reschedule_count, price_minor) FROM public.get_booking(a.link_token))
     IS DISTINCT FROM ('confirmed'::public.appointment_status, pg_temp.at(wed, '10:00'), 1, 25000) THEN
    RAISE EXCEPTION 'S: the moved visit';
  END IF;
  IF (SELECT blocks FROM public.appointments WHERE reference = a.reference)
     <> tstzrange(pg_temp.at(wed, '10:00'), pg_temp.at(wed, '11:00')) THEN
    RAISE EXCEPTION 'S: the moved visit does not block its new time';
  END IF;
  IF pg_temp.wednesday_times() <> '09:00 11:00 12:00' THEN
    RAISE EXCEPTION 'S: free times after the move: %', pg_temp.wednesday_times();
  END IF;

  -- The e-mail about it: once per move, and no new link (theirs works).
  SELECT * INTO mail FROM public.claim_booking_email(a.reference, 'rescheduled');
  IF mail IS NULL OR mail.manage_token IS NOT NULL OR mail.starts_at <> pg_temp.at(wed, '10:00') THEN
    RAISE EXCEPTION 'S: the rescheduled e-mail: %', row_to_json(mail);
  END IF;
  PERFORM public.mark_booking_email_sent(a.reference, 'rescheduled', 'msg_s1');
  IF EXISTS (SELECT 1 FROM public.claim_booking_email(a.reference, 'rescheduled')) THEN
    RAISE EXCEPTION 'S: the rescheduled e-mail claimed twice';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.get_booking(a.link_token)) THEN
    RAISE EXCEPTION 'S: the link stopped working';
  END IF;

  -- Once only (the centre's limit): then nothing to move to.
  IF pg_temp.hint_of(format('SELECT public.reschedule_booking(%L, %L)', a.link_token, pg_temp.at(wed, '11:00'))) <> 'not_reschedulable'
     OR EXISTS (SELECT 1 FROM public.list_reschedule_slots(a.link_token, wed, wed)) THEN
    RAISE EXCEPTION 'S: moved more times than allowed';
  END IF;
END;
$body$;
RESET ROLE;

-- The centre allows a second move: it goes, and its e-mail goes again.
UPDATE public.center_settings SET max_self_reschedules = 2;
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  wed date;
  a s_visits%ROWTYPE;
BEGIN
  SELECT monday + 2 INTO wed FROM booking_test;
  SELECT * INTO a FROM s_visits WHERE name = 's1';
  IF (SELECT reschedule_count FROM public.reschedule_booking(a.link_token, pg_temp.at(wed, '11:00'))) <> 2 THEN
    RAISE EXCEPTION 'S: the second move';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.claim_booking_email(a.reference, 'rescheduled')) THEN
    RAISE EXCEPTION 'S: no e-mail about the second move';
  END IF;
END;
$body$;
RESET ROLE;

-- Inside the centre's window (720 hours): no moving, no refund.
UPDATE public.center_settings
SET max_self_reschedules = 5, reschedule_window_hours = 720, cancellation_window_hours = 720;
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  wed date;
  b s_visits%ROWTYPE;
  cancelled record;
BEGIN
  SELECT monday + 2 INTO wed FROM booking_test;
  PERFORM pg_temp.paid_visit('s2', '09:00');
  SELECT * INTO b FROM s_visits WHERE name = 's2';
  IF pg_temp.hint_of(format('SELECT public.reschedule_booking(%L, %L)', b.link_token, pg_temp.at(wed, '12:00'))) <> 'not_reschedulable'
     OR EXISTS (SELECT 1 FROM public.list_reschedule_slots(b.link_token, wed, wed)) THEN
    RAISE EXCEPTION 'S: moved inside the window';
  END IF;

  SELECT * INTO cancelled FROM public.cancel_booking(b.link_token);
  IF (cancelled.reference, cancelled.refund_minor, cancelled.payment_intent_id)
     IS DISTINCT FROM (b.reference, 0, 'pi_test_s2'::text) THEN
    RAISE EXCEPTION 'S: a late cancellation: %', row_to_json(cancelled);
  END IF;
  IF (SELECT (status, cancelled_by, refund_due_minor) FROM public.get_booking(b.link_token))
     IS DISTINCT FROM ('cancelled'::public.appointment_status, 'client'::text, 0) THEN
    RAISE EXCEPTION 'S: the late-cancelled visit';
  END IF;
  -- The old return page opened again: no refund the window did not give.
  IF public.fulfill_checkout_session('cs_test_s2', true, 'pi_test_s2') <> 'already_settled' THEN
    RAISE EXCEPTION 'S: a late cancellation refunded through the return page';
  END IF;
END;
$body$;
RESET ROLE;

-- Before the window: cancelling gives it all back and frees the time.
UPDATE public.center_settings SET cancellation_window_hours = 0;
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  a s_visits%ROWTYPE;
  cancelled record;
  mail record;
BEGIN
  SELECT * INTO a FROM s_visits WHERE name = 's1';
  SELECT * INTO cancelled FROM public.cancel_booking(a.link_token);
  IF (cancelled.refund_minor, cancelled.payment_intent_id) IS DISTINCT FROM (25000, 'pi_test_s1'::text) THEN
    RAISE EXCEPTION 'S: an early cancellation: %', row_to_json(cancelled);
  END IF;
  IF (SELECT (status, refund_due_minor) FROM public.get_booking(a.link_token))
     IS DISTINCT FROM ('cancelled'::public.appointment_status, 25000) THEN
    RAISE EXCEPTION 'S: the cancelled visit';
  END IF;
  IF pg_temp.wednesday_times() <> '09:00 10:00 11:00 12:00' THEN
    RAISE EXCEPTION 'S: free times after cancelling: %', pg_temp.wednesday_times();
  END IF;
  -- Once; and no moving a cancelled visit.
  IF pg_temp.hint_of(format('SELECT public.cancel_booking(%L)', a.link_token)) <> 'not_cancellable'
     OR pg_temp.hint_of(format('SELECT public.reschedule_booking(%L, %L)', a.link_token,
          pg_temp.at((SELECT monday + 2 FROM booking_test), '12:00'))) <> 'not_reschedulable' THEN
    RAISE EXCEPTION 'S: a cancelled visit changed again';
  END IF;

  -- The e-mail: "cancelled" only, and the link still shows the visit.
  SELECT * INTO mail FROM public.claim_booking_email(a.reference, 'cancelled');
  IF mail IS NULL OR mail.manage_token IS NOT NULL THEN
    RAISE EXCEPTION 'S: the cancelled e-mail: %', row_to_json(mail);
  END IF;
  IF EXISTS (SELECT 1 FROM public.claim_booking_email(a.reference, 'reminder')) THEN
    RAISE EXCEPTION 'S: a reminder for a cancelled visit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.get_booking(a.link_token)) THEN
    RAISE EXCEPTION 'S: the link stopped working after cancelling';
  END IF;
  -- The refund, recorded from Stripe's event.
  PERFORM public.record_refund('pi_test_s1', 25000);
  IF (SELECT refunded_minor FROM public.get_booking(a.link_token)) <> 25000 THEN
    RAISE EXCEPTION 'S: the refund was not recorded';
  END IF;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $body$
BEGIN
  BEGIN
    PERFORM public.cancel_booking('x');
    RAISE EXCEPTION 'S: anon cancelled';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.reschedule_booking('x', now());
    RAISE EXCEPTION 'S: anon moved a visit';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.list_reschedule_slots('x', current_date, current_date);
    RAISE EXCEPTION 'S: anon listed times to move to';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;

-- T: visits in the portals (R9). Specialists list their own, admins all
-- (with payments); holds are not visits. Only the centre cancels from the
-- portal, always with the money back; its e-mail carries a new link.
GRANT SELECT ON s_visits TO authenticated, anon;
SET LOCAL ROLE service_role;
SELECT pg_temp.paid_visit('t1', '12:00');
-- A hold given back in the wizard: cancelled, but never a visit.
SELECT public.release_hold((SELECT access_token FROM public.hold_slot(
  'booking-test-consultation', 'booking-test-anna', 'in_person',
  pg_temp.at((SELECT monday + 2 FROM booking_test), '10:00'), p_client_key => 'visitor-t2')));
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  week date;
  row record;
  hint text;
BEGIN
  SELECT monday INTO week FROM booking_test;
  SELECT * INTO row FROM public.list_visits(week, week + 6)
  WHERE reference = (SELECT reference FROM s_visits WHERE name = 't1');
  IF row IS NULL OR row.status <> 'confirmed' OR row.client_name <> 'Ola Test'
     OR row.service_name <> 'Booking Consultation' OR row.room_name <> 'Booking Room'
     OR row.starts_at <> pg_temp.at(week + 2, '12:00') THEN
    RAISE EXCEPTION 'T: Anna''s visit: %', row_to_json(row);
  END IF;
  -- Payments are the centre's.
  IF row.paid IS NOT NULL OR row.refunded_minor IS NOT NULL THEN
    RAISE EXCEPTION 'T: a specialist saw payments';
  END IF;
  -- Booked visits only, never holds (live or given back).
  IF EXISTS (SELECT 1 FROM public.list_visits(week, week + 6)
             WHERE status NOT IN ('confirmed', 'awaiting_payment', 'cancelled')
                OR starts_at = pg_temp.at(week + 2, '10:00')) THEN
    RAISE EXCEPTION 'T: a hold listed as a visit';
  END IF;
  BEGIN
    PERFORM public.centre_cancel_visit(row.id);
    RAISE EXCEPTION 'T: a specialist cancelled from the portal';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.list_visits(week, week + 70);
    RAISE EXCEPTION 'T: a range too long';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
END;
$body$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF EXISTS (SELECT 1 FROM public.list_visits(
      (SELECT monday FROM booking_test), (SELECT monday + 6 FROM booking_test))) THEN
    RAISE EXCEPTION 'T: Jan saw Anna''s visits';
  END IF;
END;
$body$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  week date;
  row record;
  cancelled record;
BEGIN
  SELECT monday INTO week FROM booking_test;
  SELECT * INTO row FROM public.list_visits(week, week + 6)
  WHERE reference = (SELECT reference FROM s_visits WHERE name = 't1');
  IF row IS NULL OR row.paid IS DISTINCT FROM true OR row.refunded_minor <> 0 THEN
    RAISE EXCEPTION 'T: the admin''s view: %', row_to_json(row);
  END IF;
  IF EXISTS (SELECT 1 FROM public.list_visits(week, week + 6, (SELECT jan_id FROM booking_test))) THEN
    RAISE EXCEPTION 'T: the specialist filter';
  END IF;
  -- The specialist portal: own visits only, even for an admin (who has none).
  BEGIN
    PERFORM public.list_visits(week, week + 6, p_own => true);
    RAISE EXCEPTION 'T: an admin without a specialist profile listed "own" visits';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;

  SELECT * INTO cancelled FROM public.centre_cancel_visit(row.id);
  IF (cancelled.refund_minor, cancelled.payment_intent_id) IS DISTINCT FROM (25000, 'pi_test_t1'::text) THEN
    RAISE EXCEPTION 'T: the centre''s cancellation: %', row_to_json(cancelled);
  END IF;
  SELECT * INTO row FROM public.list_visits(week, week + 6) WHERE id = row.id;
  IF (row.status, row.cancelled_by, row.refund_due_minor)
     IS DISTINCT FROM ('cancelled'::public.appointment_status, 'centre'::text, 25000) THEN
    RAISE EXCEPTION 'T: the cancelled visit: %', row_to_json(row);
  END IF;
  BEGIN
    PERFORM public.centre_cancel_visit(row.id);
    RAISE EXCEPTION 'T: cancelled twice';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'T:%' THEN RAISE; END IF;
  END;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE service_role;
DO $body$
DECLARE
  mail record;
BEGIN
  SELECT * INTO mail FROM public.claim_booking_email(
    (SELECT reference FROM s_visits WHERE name = 't1'), 'cancelled');
  IF mail IS NULL OR mail.cancelled_by <> 'centre' OR length(mail.manage_token) < 40
     OR NOT EXISTS (SELECT 1 FROM public.get_booking(mail.manage_token)) THEN
    RAISE EXCEPTION 'T: the centre''s cancellation e-mail: %', row_to_json(mail);
  END IF;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $body$
BEGIN
  BEGIN
    PERFORM public.list_visits(current_date, current_date);
    RAISE EXCEPTION 'T: anon listed visits';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.centre_cancel_visit(gen_random_uuid());
    RAISE EXCEPTION 'T: anon cancelled';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;

-- U: the bookings table (R9). The database searches, filters, sorts and
-- pages, with the number of all matches; a search is literal text; the
-- same people see the same visits as in list_visits.
SET LOCAL ROLE service_role;
SELECT pg_temp.paid_visit('u1', '09:00');
SELECT pg_temp.paid_visit('u2', '11:00');
RESET ROLE;
UPDATE public.appointments SET client_name = 'Zofia 100% Test'
WHERE reference = (SELECT reference FROM s_visits WHERE name = 'u2');

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  week date;
  total bigint;
  first text;
BEGIN
  SELECT monday INTO week FROM booking_test;
  -- One page, and how many there are in all.
  SELECT max(total_count) INTO total
  FROM public.search_bookings(p_from => pg_temp.at(week, '00:00'), p_limit => 1);
  IF total < 2 THEN RAISE EXCEPTION 'U: the total count'; END IF;
  IF (SELECT count(*) FROM public.search_bookings(p_from => pg_temp.at(week, '00:00'), p_limit => 1)) <> 1 THEN
    RAISE EXCEPTION 'U: a page of one';
  END IF;
  -- A search is literal: "%" finds the name with a per cent sign only.
  IF (SELECT array_agg(reference) FROM public.search_bookings(p_query => '100%'))
     IS DISTINCT FROM ARRAY[(SELECT reference FROM s_visits WHERE name = 'u2')] THEN
    RAISE EXCEPTION 'U: a literal search';
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_bookings(p_query => '_ofia')) THEN
    RAISE EXCEPTION 'U: "_" matched as a wildcard';
  END IF;
  -- Sorted as asked: the latest first.
  SELECT reference INTO first FROM public.search_bookings(
    p_query => 'Test', p_from => pg_temp.at(week + 2, '00:00'),
    p_to => pg_temp.at(week + 3, '00:00'), p_statuses => ARRAY['confirmed'],
    -- (Anna's only: the DEV data has other visits that match "Test".)
    p_specialist_ids => ARRAY[(SELECT anna_id FROM booking_test)],
    p_desc => true, p_limit => 1);
  IF first <> (SELECT reference FROM s_visits WHERE name = 'u2') THEN
    RAISE EXCEPTION 'U: sorting by time, latest first: %', first;
  END IF;
  -- Only allowed sorts, statuses and page sizes.
  BEGIN
    PERFORM public.search_bookings(p_sort => 'client_email; DROP TABLE x');
    RAISE EXCEPTION 'U: an unknown sort';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.search_bookings(p_statuses => ARRAY['held']);
    RAISE EXCEPTION 'U: holds as a status';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.search_bookings(p_limit => 1000);
    RAISE EXCEPTION 'U: a page too large';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
END;
$body$;
RESET ROLE;

-- Jan (another specialist) finds none of Anna's visits.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF EXISTS (SELECT 1 FROM public.search_bookings(p_query => 'Test')) THEN
    RAISE EXCEPTION 'U: Jan found Anna''s visits';
  END IF;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $body$
BEGIN
  PERFORM public.search_bookings();
  RAISE EXCEPTION 'U: anon searched visits';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$body$;
RESET ROLE;

-- V: the table's other filters (service, place, payment) and one visit's
-- details for the side panel, with the e-mails sent (admins only).
SELECT public.mark_booking_email_sent(
  (SELECT reference FROM s_visits WHERE name = 'u1'), 'confirmation', 'msg_u1');
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  u1 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'u1'));
  service uuid := (SELECT id FROM public.services WHERE slug = 'booking-test-consultation');
  detail record;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.search_bookings(p_specialist_ids => ARRAY[(SELECT anna_id FROM booking_test)], p_service_ids => ARRAY[service], p_room_ids => ARRAY[(SELECT room_id FROM booking_test)], p_payments => ARRAY['paid']) WHERE id = u1) THEN
    RAISE EXCEPTION 'V: service, place and payment filters';
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_bookings(p_specialist_ids => ARRAY[(SELECT anna_id FROM booking_test)], p_online => true) WHERE id = u1) THEN
    RAISE EXCEPTION 'V: an in-person visit found as online';
  END IF;
  BEGIN
    PERFORM public.search_bookings(p_payments => ARRAY['everything']);
    RAISE EXCEPTION 'V: an unknown payment filter';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  SELECT * INTO detail FROM public.get_visit(u1);
  IF detail IS NULL OR detail.client_name <> 'Ola Test' OR detail.confirmed_at IS NULL
     OR NOT detail.emails @> '[{"kind": "confirmation"}]'::jsonb THEN
    RAISE EXCEPTION 'V: the visit''s details: %', row_to_json(detail);
  END IF;
END;
$body$;
RESET ROLE;

-- Anna sees her visit without payments or e-mails; Jan does not see it.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  detail record;
BEGIN
  SELECT * INTO detail FROM public.get_visit(
    (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'u1')));
  IF detail IS NULL OR detail.emails IS NOT NULL OR detail.paid IS NOT NULL THEN
    RAISE EXCEPTION 'V: Anna''s view of her visit: %', row_to_json(detail);
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_bookings(p_payments => ARRAY['paid'])) THEN
    RAISE EXCEPTION 'V: a specialist filtered by payments';
  END IF;
END;
$body$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF EXISTS (SELECT 1 FROM public.get_visit(
      (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'u1')))) THEN
    RAISE EXCEPTION 'V: Jan saw Anna''s visit';
  END IF;
END;
$body$;
RESET ROLE;

-- W: every reservation keeps its history (the audit log), written by the
-- database itself: the hold, the details, the payment, the confirmation,
-- the e-mails, a move, a cancellation and the refund, each with who did
-- it. Admins read all of it; specialists their own visits without the
-- money; nobody writes it by hand.
SET LOCAL ROLE service_role;
SELECT pg_temp.paid_visit('w1', '12:00');
DO $body$
DECLARE
  w s_visits%ROWTYPE;
BEGIN
  SELECT * INTO w FROM s_visits WHERE name = 'w1';
  PERFORM public.mark_booking_email_sent(w.reference, 'confirmation', 'msg_w1');
END;
$body$;
RESET ROLE;
-- The centre allows moving and a refund; the client moves, then cancels.
UPDATE public.center_settings
SET cancellation_window_hours = 0, reschedule_window_hours = 0, max_self_reschedules = 1;
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  w s_visits%ROWTYPE;
  wed date;
BEGIN
  SELECT monday + 2 INTO wed FROM booking_test;
  SELECT * INTO w FROM s_visits WHERE name = 'w1';
  PERFORM public.reschedule_booking(w.link_token, pg_temp.at(wed, '10:00'));
  PERFORM public.cancel_booking(w.link_token);
  PERFORM public.record_refund('pi_test_w1', 25000);
END;
$body$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  w1 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'w1'));
  log text;
BEGIN
  SELECT string_agg(kind || '/' || actor, ' ' ORDER BY occurred_at, id) INTO log
  FROM public.list_visit_events(w1);
  IF log IS DISTINCT FROM
     'created/client details_saved/client payment_started/payment payment_succeeded/payment '
     || 'confirmed/payment email_sent/system rescheduled/client cancelled/client refund_recorded/payment' THEN
    RAISE EXCEPTION 'W: the history: %', log;
  END IF;
  IF (SELECT details ->> 'refund_due_minor' FROM public.list_visit_events(w1) WHERE kind = 'cancelled') <> '25000' THEN
    RAISE EXCEPTION 'W: the admin sees the money';
  END IF;
  -- The log is written only by the database.
  BEGIN
    INSERT INTO public.appointment_events (appointment_id, kind, actor) VALUES (w1, 'created', 'centre');
    RAISE EXCEPTION 'W: an admin wrote the log by hand';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;

-- Anna: her visit's history, without the money.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  w1 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'w1'));
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.list_visit_events(w1) WHERE kind = 'rescheduled') THEN
    RAISE EXCEPTION 'W: Anna does not see her visit''s history';
  END IF;
  IF EXISTS (SELECT 1 FROM public.list_visit_events(w1)
             WHERE kind LIKE 'payment_%' OR kind = 'refund_recorded' OR details ? 'refund_due_minor') THEN
    RAISE EXCEPTION 'W: a specialist saw the money';
  END IF;
END;
$body$;
RESET ROLE;

-- Jan: nothing of Anna's.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF EXISTS (SELECT 1 FROM public.list_visit_events(
      (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'w1')))) THEN
    RAISE EXCEPTION 'W: Jan read Anna''s visit''s history';
  END IF;
END;
$body$;
RESET ROLE;

-- X: the centre books a visit (K5, "+ Nowa wizyta"). An admin for anyone, a
-- specialist for themselves; any time the specialist and the room are free
-- (inside availability or not), never in the past, in a closed room or
-- during time off. Nothing is paid on site: the visit is reserved until
-- paid online, by 48 hours before it (R11), and the client gets the link by
-- e-mail, so an e-mail is required; the consents come when they pay. The
-- history says the centre did it.
CREATE TEMP TABLE x_day AS
SELECT monday + 14 AS day,
  (SELECT id FROM public.specialist_services WHERE specialist_id = anna_id) AS anna_offer,
  (SELECT id FROM public.specialist_services WHERE specialist_id = jan_id) AS jan_offer,
  room_id
FROM booking_test;
GRANT SELECT ON x_day TO authenticated, anon, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.at(date, time) TO authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.hint_of(text) TO authenticated, service_role;
CREATE TEMP TABLE x_visits (name text PRIMARY KEY, id uuid, reference text, token text);
GRANT ALL ON x_visits TO authenticated, service_role;

-- Anna is away that day from 18:00; the room is closed the day after.
INSERT INTO public.specialist_time_off (specialist_id, during)
SELECT anna_id, tstzrange(pg_temp.at(x.day, '18:00'), pg_temp.at(x.day, '20:00'))
FROM booking_test, x_day AS x;
INSERT INTO public.room_availability_exceptions (room_id, date, type, reason)
SELECT room_id, day + 1, 'closed_all_day', 'Remont' FROM x_day;

CREATE FUNCTION pg_temp.book(
  p_offer uuid, p_mode public.visit_mode, p_at timestamptz, p_room uuid,
  p_name text DEFAULT 'Ewa Klientka', p_email text DEFAULT 'ewa@example.invalid',
  p_phone text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
AS $$
  SELECT appointment_id FROM public.centre_book_visit(
    p_offer, p_mode, p_at, p_room, p_name, p_email, p_phone, 'Pierwsza wizyta'
  );
$$;
GRANT EXECUTE ON FUNCTION pg_temp.book(uuid, public.visit_mode, timestamptz, uuid, text, text, text) TO authenticated, anon;

-- The hint a booking stops with ('' when it goes through).
CREATE FUNCTION pg_temp.refusal(
  p_offer uuid, p_mode public.visit_mode, p_at timestamptz, p_room uuid,
  p_email text DEFAULT 'ewa@example.invalid', p_phone text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_hint text;
BEGIN
  PERFORM pg_temp.book(p_offer, p_mode, p_at, p_room, 'Ewa Klientka', p_email, p_phone);
  RETURN '';
EXCEPTION
  WHEN insufficient_privilege THEN RETURN 'forbidden';
  WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    RETURN coalesce(nullif(v_hint, ''), SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION pg_temp.refusal(uuid, public.visit_mode, timestamptz, uuid, text, text) TO authenticated, anon;

-- The admin.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  x x_day%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO x FROM x_day;

  -- Outside Anna's hours (her room window ends at 12:00) and off the grid.
  v_id := pg_temp.book(x.anna_offer, 'in_person', pg_temp.at(x.day, '12:15'), x.room_id);
  INSERT INTO x_visits VALUES ('x1', v_id);
  v_id := pg_temp.book(x.anna_offer, 'online', pg_temp.at(x.day, '16:00'), NULL,
    'Jan Telefon', 'jan.telefon@example.invalid', '600 100 200');
  INSERT INTO x_visits VALUES ('x2', v_id);
  v_id := pg_temp.book(x.anna_offer, 'online', pg_temp.at(x.day, '10:00'), NULL);
  INSERT INTO x_visits VALUES ('x3', v_id);

  IF (SELECT count(*) FROM public.list_visits(x.day, x.day)
      WHERE id IN (SELECT id FROM x_visits) AND status = 'awaiting_payment' AND NOT paid) <> 3 THEN
    RAISE EXCEPTION 'X: the admin does not see the booked visits, awaiting payment';
  END IF;

  -- The same time for Anna, and the room for Jan: taken.
  IF pg_temp.refusal(x.anna_offer, 'online', pg_temp.at(x.day, '12:30'), NULL) <> 'specialist_busy' THEN
    RAISE EXCEPTION 'X: Anna booked twice';
  END IF;
  -- The room keeps the buffer after Anna's visit (12:15 to 13:05, then 10 minutes).
  IF pg_temp.refusal(x.jan_offer, 'in_person', pg_temp.at(x.day, '13:10'), x.room_id) <> 'room_busy' THEN
    RAISE EXCEPTION 'X: the room was double-booked';
  END IF;
  IF pg_temp.refusal(x.jan_offer, 'in_person', pg_temp.at(x.day, '13:15'), x.room_id) <> '' THEN
    RAISE EXCEPTION 'X: the room after the buffer was refused';
  END IF;

  IF pg_temp.refusal(x.anna_offer, 'online', now() - interval '1 hour', NULL) <> 'in_the_past' THEN
    RAISE EXCEPTION 'X: booked in the past';
  END IF;
  IF pg_temp.refusal(x.anna_offer, 'in_person', pg_temp.at(x.day, '08:00'), NULL) <> 'room_required' THEN
    RAISE EXCEPTION 'X: in person without a room';
  END IF;
  IF pg_temp.refusal(x.anna_offer, 'online', pg_temp.at(x.day, '08:00'), x.room_id) <> 'not_bookable' THEN
    RAISE EXCEPTION 'X: online in a room';
  END IF;
  IF pg_temp.refusal(x.anna_offer, 'in_person', pg_temp.at(x.day + 1, '10:00'), x.room_id) <> 'room_closed' THEN
    RAISE EXCEPTION 'X: booked a closed room';
  END IF;
  -- Only while the room is open (06:00–22:00, #33): not past closing, not
  -- before opening.
  IF pg_temp.refusal(x.anna_offer, 'in_person', pg_temp.at(x.day, '21:30'), x.room_id) <> 'room_closed'
     OR pg_temp.refusal(x.anna_offer, 'in_person', pg_temp.at(x.day, '05:30'), x.room_id) <> 'room_closed' THEN
    RAISE EXCEPTION 'X: booked outside the room''s hours';
  END IF;
  IF pg_temp.refusal(x.anna_offer, 'online', pg_temp.at(x.day, '18:30'), NULL) <> 'time_off' THEN
    RAISE EXCEPTION 'X: booked during time off';
  END IF;
  -- The payment link goes by e-mail: a phone alone is not enough.
  IF pg_temp.refusal(x.anna_offer, 'online', pg_temp.at(x.day, '09:00'), NULL, NULL, '600 100 200') <> 'invalid_details' THEN
    RAISE EXCEPTION 'X: booked a client without an e-mail';
  END IF;
  IF pg_temp.refusal(x.anna_offer, 'online', pg_temp.at(x.day, '09:00'), NULL, 'not an e-mail') <> 'invalid_details' THEN
    RAISE EXCEPTION 'X: booked with a wrong e-mail';
  END IF;

  -- Close to the visit the link is short: two hours, or until an hour
  -- before it; too close, and there is no time to pay.
  v_id := pg_temp.book(x.anna_offer, 'online', date_trunc('hour', now()) + interval '5 hours', NULL);
  INSERT INTO x_visits VALUES ('soon', v_id);
  IF pg_temp.refusal(x.anna_offer, 'online', now() + interval '70 minutes', NULL) <> 'too_soon' THEN
    RAISE EXCEPTION 'X: booked with no time to pay';
  END IF;
END;
$body$;
RESET ROLE;

-- The room's hours, changed and undone (#33): a visit ending at closing
-- (its buffer after it may run past), no hours (closed), an extra opening.
DO $body$
DECLARE
  x x_day%ROWTYPE;
  v_hint text;
BEGIN
  SELECT * INTO x FROM x_day;
  BEGIN
    PERFORM pg_temp.book(x.anna_offer, 'in_person', pg_temp.at(x.day, '21:10'), x.room_id);
    RAISE EXCEPTION 'undo' USING HINT = 'booked';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint <> 'booked' THEN
      RAISE EXCEPTION 'X: a visit ending at closing was refused: %', v_hint;
    END IF;
  END;

  BEGIN
    DELETE FROM public.room_opening_hours WHERE room_id = x.room_id;
    IF pg_temp.refusal(x.anna_offer, 'in_person', pg_temp.at(x.day, '10:00'), x.room_id) <> 'room_closed' THEN
      RAISE EXCEPTION 'X: booked a room without opening hours';
    END IF;
    INSERT INTO public.room_availability_exceptions (room_id, date, type, starts_at, ends_at, reason)
    VALUES (x.room_id, x.day, 'extra_available_interval', '09:00', '12:00', 'Dyżur dodatkowy');
    IF pg_temp.refusal(x.jan_offer, 'in_person', pg_temp.at(x.day, '11:30'), x.room_id) <> 'room_closed' THEN
      RAISE EXCEPTION 'X: booked past an extra opening';
    END IF;
    IF pg_temp.refusal(x.jan_offer, 'in_person', pg_temp.at(x.day, '10:00'), x.room_id) <> '' THEN
      RAISE EXCEPTION 'X: an extra opening did not open the room';
    END IF;
    RAISE EXCEPTION 'undo' USING HINT = 'checked';
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
    IF v_hint IS DISTINCT FROM 'checked' THEN RAISE; END IF;
  END;
END;
$body$;

DO $body$
DECLARE
  x x_day%ROWTYPE;
  v public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO x FROM x_day;
  SELECT * INTO v FROM public.appointments WHERE id = (SELECT id FROM x_visits WHERE name = 'x1');
  IF v.status <> 'awaiting_payment' OR v.booked_by <> 'centre' OR v.confirmed_at IS NOT NULL
     OR v.payment_due_at <> pg_temp.at(x.day, '12:15') - interval '48 hours'
     OR v.terms_accepted_at IS NOT NULL OR v.privacy_accepted_at IS NOT NULL
     OR v.duration_minutes <> 50 OR v.buffer_minutes <> 10 OR v.price_minor <> 25000
     OR v.client_email <> 'ewa@example.invalid' OR v.client_notes <> 'Pierwsza wizyta' THEN
    RAISE EXCEPTION 'X: the booked visit: %', row_to_json(v);
  END IF;
  IF (SELECT payment_due_at FROM public.appointments WHERE id = (SELECT id FROM x_visits WHERE name = 'soon'))
     <> now() + interval '2 hours' THEN
    RAISE EXCEPTION 'X: the short link is not two hours';
  END IF;
  -- The history: created by the centre, by that admin, awaiting payment.
  IF NOT EXISTS (
    SELECT 1 FROM public.appointment_events
    WHERE appointment_id = v.id AND kind = 'created' AND actor = 'centre'
      AND actor_user_id = '71000000-0000-4000-8000-000000000001'
      AND details ->> 'status' = 'awaiting_payment'
      AND details ? 'payment_due_at'
  ) THEN
    RAISE EXCEPTION 'X: the history does not say the centre booked it';
  END IF;
  UPDATE x_visits SET reference = (SELECT reference FROM public.appointments WHERE id = x_visits.id);
END;
$body$;

-- The e-mail: the reservation, with the link and the time to pay by; not a
-- confirmation. The link opens the visit; paying takes the consents first,
-- then the full price, and confirms it.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  c record;
  b record;
  v_token text;
BEGIN
  IF EXISTS (SELECT 1 FROM public.claim_booking_email((SELECT reference FROM x_visits WHERE name = 'x1'), 'confirmation')) THEN
    RAISE EXCEPTION 'X: confirmed a visit not paid';
  END IF;
  SELECT * INTO c FROM public.claim_booking_email((SELECT reference FROM x_visits WHERE name = 'x1'), 'reserved');
  IF c.reference IS NULL OR c.booked_by <> 'centre' OR c.paid OR c.manage_token IS NULL
     OR c.payment_due_at IS NULL THEN
    RAISE EXCEPTION 'X: the reservation claim: %', row_to_json(c);
  END IF;
  v_token := c.manage_token;
  UPDATE x_visits SET token = v_token WHERE name = 'x1';
  SELECT * INTO b FROM public.get_booking(v_token);
  IF b.reference <> c.reference OR b.paid OR b.status <> 'awaiting_payment'
     OR b.payment_due_at <> c.payment_due_at OR b.details_saved THEN
    RAISE EXCEPTION 'X: the visit page: %', row_to_json(b);
  END IF;

  IF pg_temp.hint_of(format('SELECT public.attach_reservation_payment(%L, %L, 25000, %L)', v_token, 'cs_x1', 'PLN')) <> 'consent_required' THEN
    RAISE EXCEPTION 'X: paid without the consents';
  END IF;
  PERFORM public.accept_booking_terms(v_token);
  IF pg_temp.hint_of(format('SELECT public.attach_reservation_payment(%L, %L, 100, %L)', v_token, 'cs_x1', 'PLN')) <> 'amount_mismatch' THEN
    RAISE EXCEPTION 'X: paid another amount';
  END IF;
  PERFORM public.attach_reservation_payment(v_token, 'cs_x1', 25000, 'PLN');
  IF (SELECT checkout_session_id FROM public.pending_reservation_payment(v_token)) <> 'cs_x1' THEN
    RAISE EXCEPTION 'X: the open payment is not found';
  END IF;
  IF public.fulfill_checkout_session('cs_x1', true, 'pi_x1') <> 'confirmed' THEN
    RAISE EXCEPTION 'X: paying did not confirm it';
  END IF;
  SELECT * INTO c FROM public.claim_booking_email((SELECT reference FROM x_visits WHERE name = 'x1'), 'confirmation');
  IF c.reference IS NULL OR NOT c.paid THEN
    RAISE EXCEPTION 'X: no confirmation after paying: %', row_to_json(c);
  END IF;
  IF pg_temp.hint_of(format('SELECT public.accept_booking_terms(%L)', v_token)) <> 'not_payable' THEN
    RAISE EXCEPTION 'X: a paid visit asked to be paid';
  END IF;

  -- A payment that lapses leaves the reservation until it is due.
  UPDATE x_visits SET token = (
    SELECT manage_token FROM public.claim_booking_email(x_visits.reference, 'reserved')
  ) WHERE name = 'x3';
  PERFORM public.accept_booking_terms((SELECT token FROM x_visits WHERE name = 'x3'));
  PERFORM public.attach_reservation_payment((SELECT token FROM x_visits WHERE name = 'x3'), 'cs_x3', 25000, 'PLN');
  PERFORM public.fail_checkout_session('cs_x3', 'expired');
  IF (SELECT status FROM public.appointments WHERE id = (SELECT id FROM x_visits WHERE name = 'x3')) <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'X: a lapsed payment ended the reservation';
  END IF;
END;
$body$;
RESET ROLE;

-- Anna books for herself, not for Jan; nobody books without signing in.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  x x_day%ROWTYPE;
BEGIN
  SELECT * INTO x FROM x_day;
  IF pg_temp.refusal(x.anna_offer, 'online', pg_temp.at(x.day, '14:00'), NULL) <> '' THEN
    RAISE EXCEPTION 'X: Anna could not book for herself';
  END IF;
  IF pg_temp.refusal(x.jan_offer, 'online', pg_temp.at(x.day, '15:00'), NULL) <> 'forbidden' THEN
    RAISE EXCEPTION 'X: Anna booked for Jan';
  END IF;
END;
$body$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $body$
DECLARE
  x x_day%ROWTYPE;
BEGIN
  SELECT * INTO x FROM x_day;
  PERFORM public.centre_book_visit(x.anna_offer, 'online', pg_temp.at(x.day, '08:00'), NULL, 'A', 'a@example.invalid', NULL, NULL);
  RAISE EXCEPTION 'X: a visitor booked as the centre';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$body$;
DO $body$
BEGIN
  PERFORM public.reserve_hold('x');
  RAISE EXCEPTION 'X: a visitor reserved without the site';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$body$;
RESET ROLE;

-- Online bookings still need the consents; so does any paid visit.
DO $body$
BEGIN
  UPDATE public.appointments SET terms_accepted_at = NULL
  WHERE id = (SELECT id FROM public.appointments WHERE booked_by = 'client' AND status = 'confirmed' LIMIT 1);
  RAISE EXCEPTION 'X: an online booking lost its consents';
EXCEPTION WHEN check_violation THEN NULL;
END;
$body$;
DO $body$
BEGIN
  UPDATE public.appointments SET status = 'confirmed', confirmed_at = now()
  WHERE id = (SELECT id FROM x_visits WHERE name = 'x2');
  RAISE EXCEPTION 'X: confirmed a centre booking without consents';
EXCEPTION WHEN check_violation THEN NULL;
END;
$body$;

-- Y: pay now or later (R11). In the wizard, with the details saved, the
-- client may reserve and pay later, by 48 hours before; a visit closer
-- than that is paid at once. An unpaid reservation past its time stops
-- holding the time at once and is cancelled (by the system) by the next
-- booking or the scheduled job, unless a payment is going on; the job
-- lists the e-mails due: a day and six hours before the payment is due,
-- the cancellation, and a day before a paid visit. Each goes once.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  x x_day%ROWTYPE;
  held record;
  near record;
  r record;
  v public.appointments%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO x FROM x_day;
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'online',
    pg_temp.at(x.day + 7, '13:00'), p_client_key => 'visitor-y'
  );
  IF pg_temp.hint_of(format('SELECT public.reserve_hold(%L)', held.access_token)) <> 'details_required' THEN
    RAISE EXCEPTION 'Y: reserved without the details';
  END IF;
  PERFORM pg_temp.save_details(held.access_token, 'Ola Później',
    'ola@example.invalid', '600100200', NULL, true, true);
  SELECT * INTO r FROM public.reserve_hold(held.access_token);
  SELECT * INTO v FROM public.appointments WHERE id = held.appointment_id;
  -- Held for 30 minutes until confirmed from the e-mail (Z), then paid by a
  -- day after booking (sooner than 48 hours before the visit).
  IF v.status <> 'awaiting_payment' OR v.hold_expires_at IS NOT NULL
     OR v.payment_due_at <> now() + interval '30 minutes'
     OR v.reservation_confirm_by <> v.payment_due_at
     OR r.confirm_by <> v.payment_due_at OR r.outcome <> 'reserved'
     OR r.payment_due_at <> v.created_at + interval '24 hours'
     OR r.reference <> v.reference THEN
    RAISE EXCEPTION 'Y: the reservation: %', row_to_json(v);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.appointment_events
    WHERE appointment_id = v.id AND kind = 'reserved' AND actor = 'client'
  ) THEN
    RAISE EXCEPTION 'Y: the history does not say it was reserved';
  END IF;
  IF pg_temp.hint_of(format('SELECT public.reserve_hold(%L)', held.access_token)) <> 'hold_expired' THEN
    RAISE EXCEPTION 'Y: reserved twice';
  END IF;
  -- The reserved time is not free to others.
  IF EXISTS (
    SELECT 1 FROM public.list_free_slots('booking-test-consultation', 'booking-test-anna', 'online', x.day + 7, x.day + 7)
    WHERE starts_at = pg_temp.at(x.day + 7, '13:00')
  ) THEN
    RAISE EXCEPTION 'Y: a reserved time was free';
  END IF;

  -- The client can cancel a reservation from its link; nothing to refund.
  v_token := (SELECT manage_token FROM public.claim_booking_email(v.reference, 'reserved'));
  SELECT * INTO r FROM public.cancel_booking(v_token);
  IF r.refund_minor <> 0 OR r.payment_intent_id IS NOT NULL
     OR (SELECT (status, cancelled_by) FROM public.appointments WHERE id = v.id)
        IS DISTINCT FROM ('cancelled'::public.appointment_status, 'client'::text) THEN
    RAISE EXCEPTION 'Y: cancelling a reservation: %', row_to_json(r);
  END IF;

  -- Within 48 hours: pay now.
  SELECT * INTO near FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'online',
    pg_temp.at(x.day + 7, '14:00'), p_client_key => 'visitor-y'
  );
  PERFORM pg_temp.save_details(near.access_token, 'Ola Później',
    'ola@example.invalid', '600100200', NULL, true, true);
  INSERT INTO x_visits VALUES ('near', near.appointment_id, near.reference, near.access_token);
END;
$body$;
RESET ROLE;
-- (Moved by hand to the first hour, 6 to 40 hours from now, that is free
-- for the specialist: within 48 hours whenever the test runs, and never on
-- another test visit; on a Sunday evening "ten hours from now" was the
-- next Monday's 9:00, booked above (#104).)
UPDATE public.appointments AS visit
SET during = (
  SELECT tstzrange(slot, slot + interval '50 minutes')
  FROM generate_series(
    date_trunc('hour', now()) + interval '6 hours',
    date_trunc('hour', now()) + interval '40 hours',
    interval '1 hour'
  ) AS slot
  WHERE NOT EXISTS (
    SELECT 1 FROM public.appointments AS other
    WHERE other.specialist_id = visit.specialist_id
      AND other.id <> visit.id
      -- (with room for the breaks around both: the rule compares blocks)
      AND other.blocks && tstzrange(slot - interval '1 hour', slot + interval '2 hours')
  )
  ORDER BY slot
  LIMIT 1
)
WHERE visit.id = (SELECT id FROM x_visits WHERE name = 'near');

SET LOCAL ROLE service_role;
DO $body$
BEGIN
  IF pg_temp.hint_of(format('SELECT public.reserve_hold(%L)', (SELECT token FROM x_visits WHERE name = 'near')))
     <> 'pay_now_required' THEN
    RAISE EXCEPTION 'Y: reserved a visit due within 48 hours';
  END IF;
END;
$body$;
RESET ROLE;

-- Past its time: x2 (nothing paid) and x3 (a payment going on).
UPDATE public.appointments SET payment_due_at = now() - interval '1 minute'
WHERE id IN (SELECT id FROM x_visits WHERE name IN ('x2', 'x3'));
DO $body$
BEGIN
  IF (SELECT private.appointment_is_live(status, hold_expires_at, payment_due_at)
      FROM public.appointments WHERE id = (SELECT id FROM x_visits WHERE name = 'x2')) THEN
    RAISE EXCEPTION 'Y: an overdue reservation still holds the time';
  END IF;
END;
$body$;
INSERT INTO public.payments (appointment_id, checkout_session_id, amount_minor, currency_code)
SELECT id, 'cs_x3_again', 25000, 'PLN' FROM x_visits WHERE name = 'x3';

SET LOCAL ROLE service_role;
DO $body$
DECLARE
  c record;
BEGIN
  IF (SELECT array_agg(reference) FROM public.cancel_unpaid_visits())
     IS DISTINCT FROM ARRAY[(SELECT reference FROM x_visits WHERE name = 'x2')] THEN
    RAISE EXCEPTION 'Y: cancelled the wrong reservations';
  END IF;
  IF (SELECT (status, cancelled_by, refund_due_minor) FROM public.appointments WHERE id = (SELECT id FROM x_visits WHERE name = 'x2'))
     IS DISTINCT FROM ('cancelled'::public.appointment_status, 'system'::text, 0) THEN
    RAISE EXCEPTION 'Y: the unpaid reservation was not cancelled by the system';
  END IF;
  IF (SELECT status FROM public.appointments WHERE id = (SELECT id FROM x_visits WHERE name = 'x3')) <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'Y: cancelled while the client was paying';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.appointment_events
    WHERE appointment_id = (SELECT id FROM x_visits WHERE name = 'x2')
      AND kind = 'cancelled' AND actor = 'system' AND details ->> 'reason' = 'unpaid'
  ) THEN
    RAISE EXCEPTION 'Y: the history does not say why it was cancelled';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.list_due_emails()
    WHERE reference = (SELECT reference FROM x_visits WHERE name = 'x2') AND kind = 'cancelled'
  ) THEN
    RAISE EXCEPTION 'Y: no e-mail about the cancellation';
  END IF;
  SELECT * INTO c FROM public.claim_booking_email((SELECT reference FROM x_visits WHERE name = 'x2'), 'cancelled');
  IF c.reference IS NULL OR c.cancelled_by <> 'system' OR c.manage_token IS NOT NULL THEN
    RAISE EXCEPTION 'Y: the cancellation claim: %', row_to_json(c);
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.list_due_emails()
    WHERE reference = (SELECT reference FROM x_visits WHERE name = 'x2')
  ) THEN
    RAISE EXCEPTION 'Y: the cancellation e-mail is due twice';
  END IF;
END;
$body$;
RESET ROLE;

-- The admin still sees it, cancelled by the system; a payment arriving
-- late does not bring it back (the money goes back).
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.list_visits((SELECT day FROM x_day), (SELECT day FROM x_day))
    WHERE id = (SELECT id FROM x_visits WHERE name = 'x2')
      AND status = 'cancelled' AND cancelled_by = 'system'
  ) THEN
    RAISE EXCEPTION 'Y: the admin does not see the unpaid reservation cancelled';
  END IF;
END;
$body$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
INSERT INTO public.payments (appointment_id, checkout_session_id, amount_minor, currency_code)
SELECT id, 'cs_x2_late', 25000, 'PLN' FROM x_visits WHERE name = 'x2';
SET LOCAL ROLE service_role;
DO $body$
BEGIN
  IF public.fulfill_checkout_session('cs_x2_late', true, 'pi_x2_late') <> 'slot_lost'
     OR (SELECT status FROM public.appointments WHERE id = (SELECT id FROM x_visits WHERE name = 'x2')) <> 'cancelled' THEN
    RAISE EXCEPTION 'Y: a late payment brought a cancelled visit back';
  END IF;
END;
$body$;
RESET ROLE;

-- The reminders: x3 due in 12 hours (reserved days ago); "soon" due in two
-- hours but booked just now, so no last call until it was booked earlier.
DELETE FROM public.payments WHERE checkout_session_id = 'cs_x3_again';
UPDATE public.appointments
SET payment_due_at = now() + interval '12 hours', created_at = now() - interval '3 days'
WHERE id = (SELECT id FROM x_visits WHERE name = 'x3');

SET LOCAL ROLE service_role;
DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.list_due_emails()
    WHERE reference = (SELECT reference FROM x_visits WHERE name = 'x3') AND kind = 'payment_reminder'
  ) THEN
    RAISE EXCEPTION 'Y: no reminder a day before the payment is due';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.list_due_emails()
    WHERE reference = (SELECT reference FROM x_visits WHERE name = 'soon')
  ) THEN
    RAISE EXCEPTION 'Y: reminded of a reservation made just now';
  END IF;
END;
$body$;
RESET ROLE;

UPDATE public.appointments SET created_at = now() - interval '1 day'
WHERE id = (SELECT id FROM x_visits WHERE name = 'soon');
SET LOCAL ROLE service_role;
DO $body$
BEGIN
  IF (SELECT kind FROM public.list_due_emails()
      WHERE reference = (SELECT reference FROM x_visits WHERE name = 'soon')) IS DISTINCT FROM 'payment_last_call' THEN
    RAISE EXCEPTION 'Y: no last call six hours before the payment is due';
  END IF;
END;
$body$;
RESET ROLE;

-- Paid, it is reminded of a day before the visit (in five hours), once.
UPDATE public.appointments
SET status = 'confirmed', confirmed_at = now(),
    terms_accepted_at = now(), privacy_accepted_at = now()
WHERE id = (SELECT id FROM x_visits WHERE name = 'soon');
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  c record;
BEGIN
  IF (SELECT kind FROM public.list_due_emails()
      WHERE reference = (SELECT reference FROM x_visits WHERE name = 'soon')) IS DISTINCT FROM 'reminder' THEN
    RAISE EXCEPTION 'Y: no reminder a day before the visit';
  END IF;
  SELECT * INTO c FROM public.claim_booking_email((SELECT reference FROM x_visits WHERE name = 'soon'), 'reminder');
  IF c.manage_token IS NULL THEN
    RAISE EXCEPTION 'Y: the visit reminder has no link';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.list_due_emails()
    WHERE reference = (SELECT reference FROM x_visits WHERE name = 'soon')
  ) THEN
    RAISE EXCEPTION 'Y: the visit reminder is due twice';
  END IF;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  PERFORM public.list_due_emails();
  RAISE EXCEPTION 'Y: a signed-in user listed the e-mails';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$body$;
RESET ROLE;


-- Z: pay-later in the portals. The visits carry the time a reservation
-- must be paid by; the booking window says how long before a visit; the
-- centre sends the link again (an admin for any, a specialist for their
-- own), not more often than every five minutes, and only while it can
-- still be paid.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  x x_day%ROWTYPE;
  v_id uuid;
BEGIN
  SELECT * INTO x FROM x_day;
  v_id := pg_temp.book(x.anna_offer, 'online', pg_temp.at(x.day, '11:00'), NULL);
  INSERT INTO x_visits VALUES ('z1', v_id);
  IF (SELECT payment_due_at FROM public.list_visits(x.day, x.day) WHERE id = v_id)
     IS DISTINCT FROM pg_temp.at(x.day, '11:00') - interval '48 hours'
     OR (SELECT payment_due_at FROM public.get_visit(v_id))
     IS DISTINCT FROM pg_temp.at(x.day, '11:00') - interval '48 hours'
     OR (SELECT payment_due_at FROM public.search_bookings(p_query => 'Ewa Klientka') WHERE id = v_id)
     IS DISTINCT FROM pg_temp.at(x.day, '11:00') - interval '48 hours' THEN
    RAISE EXCEPTION 'Z: the portals do not see when it must be paid by';
  END IF;
  IF (SELECT payment_due_hours FROM public.booking_window()) <> 48 THEN
    RAISE EXCEPTION 'Z: the booking window has no time to pay by';
  END IF;
END;
$body$;
RESET ROLE;
UPDATE x_visits SET reference = (SELECT reference FROM public.appointments WHERE id = x_visits.id)
WHERE name = 'z1';

-- The link went out a moment ago.
SET LOCAL ROLE service_role;
SELECT 1 FROM public.claim_booking_email((SELECT reference FROM x_visits WHERE name = 'z1'), 'reserved');
SELECT public.mark_booking_email_sent((SELECT reference FROM x_visits WHERE name = 'z1'), 'reserved', 'msg_z1');
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF pg_temp.hint_of(format('SELECT public.centre_resend_payment_link(%L)',
       (SELECT id FROM x_visits WHERE name = 'z1'))) <> 'recently_sent' THEN
    RAISE EXCEPTION 'Z: the link was sent again at once';
  END IF;
END;
$body$;
RESET ROLE;

UPDATE public.booking_emails SET claimed_at = now() - interval '10 minutes'
WHERE appointment_id = (SELECT id FROM x_visits WHERE name = 'z1');

-- Jan (another specialist) cannot; Anna can, for her own.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  PERFORM public.centre_resend_payment_link((SELECT id FROM x_visits WHERE name = 'z1'));
  RAISE EXCEPTION 'Z: Jan sent Anna''s client a link';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$body$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF (SELECT reference FROM public.centre_resend_payment_link((SELECT id FROM x_visits WHERE name = 'z1')))
     IS DISTINCT FROM (SELECT reference FROM x_visits WHERE name = 'z1') THEN
    RAISE EXCEPTION 'Z: Anna could not send her client the link';
  END IF;
END;
$body$;
RESET ROLE;

-- The reservation's e-mail can be claimed (and sent) once more, with a new
-- link; once paid, there is nothing to send.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  c record;
BEGIN
  SELECT * INTO c FROM public.claim_booking_email((SELECT reference FROM x_visits WHERE name = 'z1'), 'reserved');
  IF c.manage_token IS NULL THEN
    RAISE EXCEPTION 'Z: the e-mail could not go again';
  END IF;
  PERFORM public.accept_booking_terms(c.manage_token);
  PERFORM public.attach_reservation_payment(c.manage_token, 'cs_z1', 25000, 'PLN');
  PERFORM public.fulfill_checkout_session('cs_z1', true, 'pi_z1');
END;
$body$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF pg_temp.hint_of(format('SELECT public.centre_resend_payment_link(%L)',
       (SELECT id FROM x_visits WHERE name = 'z1'))) <> 'not_payable' THEN
    RAISE EXCEPTION 'Z: a link to pay for a paid visit';
  END IF;
END;
$body$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $body$
BEGIN
  PERFORM public.centre_resend_payment_link(gen_random_uuid());
  RAISE EXCEPTION 'Z: a visitor sent a link';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$body$;
RESET ROLE;


-- AA: the centre settles visits its own way (R12). An admin cancels at any
-- time with the refund they choose (all by default, at most what is left),
-- gives money back later, and moves a visit to any free time, room or
-- form; each with a reason in the history. A specialist does none of it.
-- (Wednesday's 9:00 and 11:00, U's visits, are freed for these.)
UPDATE public.appointments
SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'centre'
WHERE reference IN (SELECT reference FROM s_visits WHERE name IN ('u1', 'u2'));
SET LOCAL ROLE service_role;
SELECT pg_temp.paid_visit('aa1', '09:00');
SELECT pg_temp.paid_visit('aa2', '11:00');
SELECT pg_temp.paid_visit('aa3', '10:00');
RESET ROLE;
GRANT SELECT ON s_visits TO authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.hint_of(text) TO authenticated;
GRANT EXECUTE ON FUNCTION pg_temp.at(date, time) TO authenticated;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  aa1 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1'));
  c record;
BEGIN
  IF pg_temp.hint_of(format('SELECT public.centre_cancel_visit(%L, 30000)', aa1)) <> 'refund_too_high' THEN
    RAISE EXCEPTION 'AA: gave back more than was paid';
  END IF;
  -- Cancelled the same day: 100 zł kept for the late cancellation.
  SELECT * INTO c FROM public.centre_cancel_visit(aa1, 15000, 'Późne odwołanie');
  IF (c.refund_minor, c.payment_intent_id) IS DISTINCT FROM (15000, 'pi_test_aa1'::text) THEN
    RAISE EXCEPTION 'AA: the cancellation: %', row_to_json(c);
  END IF;
  IF (SELECT (status, cancelled_by, refund_due_minor) FROM public.appointments WHERE id = aa1)
     IS DISTINCT FROM ('cancelled'::public.appointment_status, 'centre'::text, 15000) THEN
    RAISE EXCEPTION 'AA: the cancelled visit';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.list_visit_events(aa1)
    WHERE kind = 'cancelled' AND actor = 'centre'
      AND details ->> 'reason' = 'Późne odwołanie' AND details ->> 'refund_due_minor' = '15000'
  ) THEN
    RAISE EXCEPTION 'AA: the history does not say why';
  END IF;
END;
$body$;
RESET ROLE;

-- Stripe gave back 150 zł; later the centre gives back 50 zł more, and no
-- more than what is left.
SELECT public.record_refund('pi_test_aa1', 15000);
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  aa1 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1'));
  r record;
BEGIN
  IF pg_temp.hint_of(format('SELECT public.centre_refund_visit(%L, 11000)', aa1)) <> 'refund_too_high'
     OR pg_temp.hint_of(format('SELECT public.centre_refund_visit(%L, 0)', aa1)) <> 'refund_too_high' THEN
    RAISE EXCEPTION 'AA: a refund beyond what is left';
  END IF;
  SELECT * INTO r FROM public.centre_refund_visit(aa1, 5000, 'Gest dobrej woli');
  IF (r.refund_minor, r.payment_intent_id, r.refunded_before_minor)
     IS DISTINCT FROM (5000, 'pi_test_aa1'::text, 15000) THEN
    RAISE EXCEPTION 'AA: the later refund: %', row_to_json(r);
  END IF;
  IF (SELECT refund_due_minor FROM public.appointments WHERE id = aa1) <> 20000 THEN
    RAISE EXCEPTION 'AA: what the centre owes back';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.list_visit_events(aa1)
    WHERE kind = 'refund_issued' AND actor = 'centre'
      AND details ->> 'refund_minor' = '5000' AND details ->> 'reason' = 'Gest dobrej woli'
  ) THEN
    RAISE EXCEPTION 'AA: the refund is not in the history';
  END IF;
END;
$body$;
RESET ROLE;

-- Anna: none of it, and no money in her visit's history.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  aa1 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1'));
  aa2 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa2'));
BEGIN
  BEGIN
    PERFORM public.centre_refund_visit(aa1, 100);
    RAISE EXCEPTION 'AA: a specialist gave money back';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.centre_reschedule_visit(aa2, now() + interval '30 days', 'online', NULL);
    RAISE EXCEPTION 'AA: a specialist moved a visit as the centre';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF EXISTS (SELECT 1 FROM public.list_visit_events(aa1)
             WHERE kind = 'refund_issued' OR details ? 'refund_minor') THEN
    RAISE EXCEPTION 'AA: a specialist saw the refunds';
  END IF;
END;
$body$;
RESET ROLE;

-- Moving: outside the hours (15:00 on Wednesday), in another form, with
-- the break kept and a new link in the e-mail.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  wed date := (SELECT monday + 2 FROM booking_test);
  room uuid := (SELECT room_id FROM booking_test);
  aa2 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa2'));
  m record;
BEGIN
  IF pg_temp.hint_of(format('SELECT public.centre_reschedule_visit(%L, %L, %L, %L)',
       aa2, now() - interval '1 hour', 'in_person', room)) <> 'in_the_past'
     OR pg_temp.hint_of(format('SELECT public.centre_reschedule_visit(%L, %L, %L, NULL)',
       aa2, pg_temp.at(wed, '15:00'), 'in_person')) <> 'room_required' THEN
    RAISE EXCEPTION 'AA: moved to the past, or in person without a room';
  END IF;
  -- Not past the room's closing (22:00, #33).
  IF pg_temp.hint_of(format('SELECT public.centre_reschedule_visit(%L, %L, %L, %L)',
       aa2, pg_temp.at(wed, '21:30'), 'in_person', room)) <> 'room_closed' THEN
    RAISE EXCEPTION 'AA: moved outside the room''s hours';
  END IF;
  SELECT * INTO m FROM public.centre_reschedule_visit(aa2, pg_temp.at(wed, '15:00'), 'in_person', room, 'Prośba klienta');
  IF (m.starts_at, m.ends_at, m.sequence)
     IS DISTINCT FROM (pg_temp.at(wed, '15:00'), pg_temp.at(wed, '15:50'), 1) THEN
    RAISE EXCEPTION 'AA: the move: %', row_to_json(m);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.list_visit_events(aa2)
    WHERE kind = 'rescheduled' AND actor = 'centre' AND details ->> 'reason' = 'Prośba klienta'
  ) THEN
    RAISE EXCEPTION 'AA: the history of the move';
  END IF;
  -- Online the same time: no room; a second move.
  SELECT * INTO m FROM public.centre_reschedule_visit(aa2, pg_temp.at(wed, '15:00'), 'online', NULL);
  IF m.sequence <> 2
     OR (SELECT (mode, room_id) FROM public.appointments WHERE id = aa2)
        IS DISTINCT FROM ('online'::public.visit_mode, NULL::uuid) THEN
    RAISE EXCEPTION 'AA: moving online';
  END IF;
  -- Where it is already: nothing to move.
  IF pg_temp.hint_of(format('SELECT public.centre_reschedule_visit(%L, %L, %L, NULL)',
       aa2, pg_temp.at(wed, '15:00'), 'online')) <> 'nothing_changed' THEN
    RAISE EXCEPTION 'AA: a move that changes nothing';
  END IF;
  -- Not onto another visit (aa3, 10:00–10:50, and its break).
  IF pg_temp.hint_of(format('SELECT public.centre_reschedule_visit(%L, %L, %L, NULL)',
       aa2, pg_temp.at((SELECT monday + 2 FROM booking_test), '10:30'), 'online')) <> 'specialist_busy' THEN
    RAISE EXCEPTION 'AA: moved onto another visit';
  END IF;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE service_role;
DO $body$
DECLARE
  c record;
BEGIN
  SELECT * INTO c FROM public.claim_booking_email((SELECT reference FROM s_visits WHERE name = 'aa2'), 'rescheduled');
  IF c.reference IS NULL OR c.manage_token IS NULL OR c.mode <> 'online' THEN
    RAISE EXCEPTION 'AA: the e-mail about the move: %', row_to_json(c);
  END IF;
END;
$body$;
RESET ROLE;

-- AB. The e-mail about money the centre gave back later (R12): one per
-- refund, with a new link; none before a refund; a specialist's history
-- does not show it.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  c record;
BEGIN
  IF EXISTS (SELECT 1 FROM public.claim_booking_email((SELECT reference FROM s_visits WHERE name = 'aa3'), 'refunded')) THEN
    RAISE EXCEPTION 'AB: an e-mail about a refund never given';
  END IF;
  SELECT * INTO c FROM public.claim_booking_email((SELECT reference FROM s_visits WHERE name = 'aa1'), 'refunded');
  IF c.reference IS NULL OR c.manage_token IS NULL THEN
    RAISE EXCEPTION 'AB: the e-mail about the refund: %', row_to_json(c);
  END IF;
  PERFORM public.mark_booking_email_sent(c.reference, 'refunded', 'msg_ab1');
  PERFORM public.mark_booking_email_sent(c.reference, 'confirmation', 'msg_ab0');
  IF EXISTS (SELECT 1 FROM public.claim_booking_email(c.reference, 'refunded')) THEN
    RAISE EXCEPTION 'AB: the same refund told twice';
  END IF;
END;
$body$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
SELECT public.centre_refund_visit(
  (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1')),
  1000, NULL);
DO $body$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.list_visit_events(
      (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1')))
    WHERE kind = 'email_sent' AND details ->> 'email' = 'refunded'
  ) THEN
    RAISE EXCEPTION 'AB: the admin does not see the e-mail was sent';
  END IF;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE service_role;
DO $body$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.claim_booking_email((SELECT reference FROM s_visits WHERE name = 'aa1'), 'refunded')) THEN
    RAISE EXCEPTION 'AB: the next refund gets no e-mail';
  END IF;
END;
$body$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  aa1 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1'));
BEGIN
  IF EXISTS (SELECT 1 FROM public.list_visit_events(aa1)
             WHERE kind = 'email_sent' AND details ->> 'email' = 'refunded') THEN
    RAISE EXCEPTION 'AB: a specialist saw the e-mail about a refund';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.list_visit_events(aa1) WHERE kind = 'email_sent') THEN
    RAISE EXCEPTION 'AB: a specialist lost the other e-mails';
  END IF;
END;
$body$;
RESET ROLE;

-- AC. Notifications (R13): from a visit's history, for every admin (with
-- the money) and the visit's specialist (without it), never for whoever
-- did it; each reads only their own inbox; opening it reads it.
-- (A visit paid as Stripe pays: no signed-in person.)
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE service_role;
SELECT pg_temp.paid_visit('ac1', '12:00');
RESET ROLE;
DO $body$
DECLARE
  admin_id uuid := '71000000-0000-4000-8000-000000000001';
  anna_id uuid := '71000000-0000-4000-8000-000000000002';
  aa1 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1'));
  ac1 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'ac1'));
  x1 uuid := (SELECT id FROM x_visits WHERE name = 'x1');
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.notifications
                 WHERE user_id = admin_id AND portal = 'admin' AND appointment_id = ac1
                   AND kind = 'booked' AND actor = 'payment' AND details ? 'price_minor'
                   AND details ->> 'client_name' = 'Ola Test') THEN
    RAISE EXCEPTION 'AC: the admin was not told of a new paid visit';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notifications
                 WHERE user_id = anna_id AND portal = 'specialist' AND appointment_id = ac1
                   AND kind = 'booked') THEN
    RAISE EXCEPTION 'AC: the specialist was not told of her new visit';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notifications
             WHERE portal = 'specialist'
               AND (details ?| ARRAY['price_minor', 'refund_minor', 'refund_due_minor', 'currency_code']
                    OR kind = 'refunded')) THEN
    RAISE EXCEPTION 'AC: a specialist was told of money';
  END IF;
  -- The admin cancelled aa1 and gave money back: not told of it themselves.
  IF EXISTS (SELECT 1 FROM public.notifications
             WHERE user_id = admin_id AND appointment_id = aa1
               AND kind IN ('cancelled', 'refunded')) THEN
    RAISE EXCEPTION 'AC: the admin was told of what they did';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.notifications
                 WHERE user_id = anna_id AND appointment_id = aa1 AND kind = 'cancelled'
                   AND actor = 'centre' AND details ->> 'reason' = 'Późne odwołanie') THEN
    RAISE EXCEPTION 'AC: the specialist was not told the centre cancelled, and why';
  END IF;
  -- Booked by the admin, then paid: the specialist hears both, the admin the payment.
  IF (SELECT string_agg(kind, ' ' ORDER BY id) FROM public.notifications
      WHERE user_id = anna_id AND appointment_id = x1) IS DISTINCT FROM 'centre_booked paid' THEN
    RAISE EXCEPTION 'AC: the specialist''s news of a centre booking';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notifications
             WHERE user_id = admin_id AND appointment_id = x1 AND kind = 'centre_booked') THEN
    RAISE EXCEPTION 'AC: the admin was told of their own booking';
  END IF;
  -- Holds and their lapsing are nobody's news.
  -- (The test's visits only, and only news from their history: "to close"
  -- comes from the clock.)
  IF EXISTS (SELECT 1 FROM public.notifications AS n
             JOIN public.appointments AS visit ON visit.id = n.appointment_id
             JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
             WHERE specialist.user_id IN (anna_id, '71000000-0000-4000-8000-000000000003')
               AND n.kind <> 'visit_to_close'
               AND NOT EXISTS (
               SELECT 1 FROM public.appointment_events AS e
               WHERE e.appointment_id = n.appointment_id
                 AND (e.kind NOT IN ('created', 'details_saved', 'hold_released', 'hold_expired')
                      OR e.actor = 'centre')
             )) THEN
    RAISE EXCEPTION 'AC: a hold made a notification';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies
                 WHERE schemaname = 'realtime' AND tablename = 'messages'
                   AND cmd = 'SELECT' AND qual LIKE '%user:%auth.uid()%') THEN
    RAISE EXCEPTION 'AC: the live channel is not limited to its owner';
  END IF;
END;
$body$;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  unread integer;
BEGIN
  IF EXISTS (SELECT 1 FROM public.notifications
             WHERE user_id <> '71000000-0000-4000-8000-000000000002') THEN
    RAISE EXCEPTION 'AC: Anna read someone else''s notifications';
  END IF;
  -- One marked read by its button: that one only, and only once.
  SELECT count(*) INTO unread FROM public.notifications WHERE portal = 'specialist' AND read_at IS NULL;
  -- (The count is a statement of its own: one expression sees one snapshot.)
  IF unread > 1 THEN
    IF NOT public.mark_notification_read((SELECT max(id) FROM public.notifications WHERE portal = 'specialist' AND read_at IS NULL)) THEN
      RAISE EXCEPTION 'AC: marking one notification read';
    END IF;
    IF (SELECT count(*) FROM public.notifications WHERE portal = 'specialist' AND read_at IS NULL) <> unread - 1 THEN
      RAISE EXCEPTION 'AC: marking one notification read marked others';
    END IF;
  END IF;
  IF public.mark_notification_read(-1) THEN
    RAISE EXCEPTION 'AC: marked a notification that is not hers';
  END IF;
  SELECT count(*) INTO unread FROM public.notifications WHERE portal = 'specialist' AND read_at IS NULL;
  IF unread = 0 OR public.mark_notifications_read('specialist') <> unread THEN
    RAISE EXCEPTION 'AC: opening the inbox did not read it';
  END IF;
  IF EXISTS (SELECT 1 FROM public.notifications WHERE portal = 'specialist' AND read_at IS NULL) THEN
    RAISE EXCEPTION 'AC: notifications left unread';
  END IF;
  BEGIN
    INSERT INTO public.notifications (user_id, portal, kind, actor)
    VALUES ('71000000-0000-4000-8000-000000000002', 'specialist', 'booked', 'client');
    RAISE EXCEPTION 'AC: a user wrote a notification';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    UPDATE public.notifications SET read_at = NULL;
    RAISE EXCEPTION 'AC: a user changed a notification';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;

DO $body$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.notifications
                 WHERE user_id = '71000000-0000-4000-8000-000000000001' AND read_at IS NULL) THEN
    RAISE EXCEPTION 'AC: Anna read the admin''s inbox';
  END IF;
END;
$body$;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF EXISTS (SELECT 1 FROM public.notifications
             WHERE user_id <> '71000000-0000-4000-8000-000000000003') THEN
    RAISE EXCEPTION 'AC: Jan read others'' notifications';
  END IF;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $body$
BEGIN
  BEGIN
    PERFORM 1 FROM public.notifications LIMIT 1;
    RAISE EXCEPTION 'AC: a visitor read notifications';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.mark_notifications_read('admin');
    RAISE EXCEPTION 'AC: a visitor marked notifications read';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.mark_notification_read(1);
    RAISE EXCEPTION 'AC: a visitor marked a notification read';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;

-- AD. What the centre still has to settle (R14): a refund owed that Stripe
-- has not made (aa1: 21 000 owed, 15 000 given back), a payment for a visit
-- that never was (x2: paid after it was cancelled for want of payment).
-- Listed once two minutes have passed; settled once, refunded once.
DO $body$
DECLARE
  aa1 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1'));
  x2 uuid := (SELECT id FROM x_visits WHERE name = 'x2');
  s5 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 's2'));
BEGIN
  IF (SELECT (kind, owed_minor) FROM private.open_settlements() WHERE appointment_id = aa1)
     IS DISTINCT FROM ('refund_owed'::text, 6000) THEN
    RAISE EXCEPTION 'AD: the refund owed on aa1';
  END IF;
  IF (SELECT (kind, owed_minor) FROM private.open_settlements() WHERE appointment_id = x2)
     IS DISTINCT FROM ('paid_without_visit'::text, 25000) THEN
    RAISE EXCEPTION 'AD: the payment without a visit';
  END IF;
  -- A late cancellation keeps the money on purpose: nothing owed.
  IF EXISTS (SELECT 1 FROM private.open_settlements() WHERE appointment_id = s5) THEN
    RAISE EXCEPTION 'AD: a late cancellation listed as owed';
  END IF;
END;
$body$;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF EXISTS (SELECT 1 FROM public.list_settlements()
             WHERE reference IN (SELECT reference FROM s_visits WHERE name = 'aa1')) THEN
    RAISE EXCEPTION 'AD: listed a refund still on its way';
  END IF;
END;
$body$;
RESET ROLE;

-- Two minutes and more later (without the triggers that would date the
-- rows now).
SET LOCAL session_replication_role = replica;
UPDATE public.appointment_events SET occurred_at = occurred_at - interval '10 minutes'
WHERE appointment_id IN (
  (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1')),
  (SELECT id FROM x_visits WHERE name = 'x2'));
UPDATE public.appointments SET cancelled_at = cancelled_at - interval '10 minutes'
WHERE id IN (
  (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1')),
  (SELECT id FROM x_visits WHERE name = 'x2'));
UPDATE public.payments SET updated_at = updated_at - interval '10 minutes'
WHERE appointment_id IN (
  (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1')),
  (SELECT id FROM x_visits WHERE name = 'x2'));
SET LOCAL session_replication_role = origin;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  aa1 uuid := (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1'));
  x2 uuid := (SELECT id FROM x_visits WHERE name = 'x2');
  s record;
BEGIN
  SELECT * INTO s FROM public.list_settlements() WHERE appointment_id = aa1;
  IF s.appointment_id IS NULL OR (s.kind, s.owed_minor, s.paid_minor, s.refunded_minor, s.client_name)
     IS DISTINCT FROM ('refund_owed'::text, 6000, 25000, 15000, 'Ola Test'::text) THEN
    RAISE EXCEPTION 'AD: the admin''s list: %', row_to_json(s);
  END IF;
  SELECT * INTO s FROM public.centre_settle_visit(aa1);
  IF (s.refund_minor, s.payment_intent_id, s.refunded_before_minor)
     IS DISTINCT FROM (6000, 'pi_test_aa1'::text, 15000) OR s.settlement_id IS NULL THEN
    RAISE EXCEPTION 'AD: settling aa1: %', row_to_json(s);
  END IF;
  IF pg_temp.hint_of(format('SELECT public.centre_settle_visit(%L)', aa1)) <> 'recently_settled' THEN
    RAISE EXCEPTION 'AD: settled twice in a moment';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.list_visit_events(aa1)
                 WHERE kind = 'refund_issued' AND details ->> 'settlement' = 'refund_owed'
                   AND details ->> 'refund_minor' = '6000') THEN
    RAISE EXCEPTION 'AD: the settling is not in the history';
  END IF;
  SELECT * INTO s FROM public.centre_settle_visit(x2);
  IF s.refund_minor <> 25000
     OR (SELECT refund_due_minor FROM public.appointments WHERE id = x2) <> 25000 THEN
    RAISE EXCEPTION 'AD: settling a payment without a visit';
  END IF;
END;
$body$;
RESET ROLE;

-- Stripe gave it back; a minute later, nothing is owed.
SELECT public.record_refund('pi_test_aa1', 21000);
UPDATE public.appointment_events SET occurred_at = occurred_at - interval '2 minutes'
WHERE appointment_id = (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1'))
  AND kind = 'refund_issued' AND details ? 'settlement';
SET LOCAL ROLE service_role;
DO $body$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.claim_booking_email((SELECT reference FROM s_visits WHERE name = 'aa1'), 'refunded')) THEN
    RAISE EXCEPTION 'AD: no e-mail about the settled refund';
  END IF;
END;
$body$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF pg_temp.hint_of(format('SELECT public.centre_settle_visit(%L)',
       (SELECT id FROM public.appointments WHERE reference = (SELECT reference FROM s_visits WHERE name = 'aa1')))) <> 'nothing_owed' THEN
    RAISE EXCEPTION 'AD: settled what was not owed';
  END IF;
END;
$body$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  BEGIN
    PERFORM public.list_settlements();
    RAISE EXCEPTION 'AD: a specialist listed what is owed';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.centre_settle_visit((SELECT id FROM x_visits WHERE name = 'x2'));
    RAISE EXCEPTION 'AD: a specialist settled';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $body$
BEGIN
  PERFORM public.list_settlements();
  RAISE EXCEPTION 'AD: a visitor listed what is owed';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$body$;
RESET ROLE;

-- AE. Clients (R15): one per e-mail address, made by a real booking (never
-- by a hold given up on); the admin's list and card; correcting a client's
-- details, which their visits still to come follow.
DO $body$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.clients WHERE email_key = 'ola@example.com' AND name = 'Ola Test') THEN
    RAISE EXCEPTION 'AE: no client for the visits booked';
  END IF;
  IF EXISTS (SELECT 1 FROM public.appointments AS visit
             WHERE visit.client_email = 'ola@example.com' AND private.shown_as_visit(visit)
               AND visit.client_id IS DISTINCT FROM (SELECT id FROM public.clients WHERE email_key = 'ola@example.com')) THEN
    RAISE EXCEPTION 'AE: a visit not linked to its client';
  END IF;
  -- Jan (section P) gave his details for a hold that lapsed: no client.
  IF EXISTS (SELECT 1 FROM public.clients WHERE email_key = 'jan@example.com') THEN
    RAISE EXCEPTION 'AE: a hold given up on made a client';
  END IF;
END;
$body$;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  ola uuid := (SELECT id FROM public.search_clients(p_query => 'ola@example.com') LIMIT 1);
  c record;
  u record;
  future integer;
BEGIN
  SELECT * INTO c FROM public.get_client(ola);
  IF c.id IS NULL OR c.visits < 1 OR c.upcoming < 1 OR c.cancelled < 1 OR c.paid_minor <= 0 THEN
    RAISE EXCEPTION 'AE: the client''s card: %', row_to_json(c);
  END IF;
  IF (SELECT count(*) FROM public.list_client_visits(ola)) < c.visits + c.cancelled THEN
    RAISE EXCEPTION 'AE: the client''s visits';
  END IF;
  IF (SELECT total FROM public.count_visit_views('[{"id": "all"}]'::jsonb))
     IS DISTINCT FROM (SELECT max(total_count) FROM public.search_bookings(p_limit => 1)) THEN
    RAISE EXCEPTION 'AE: a view''s count';
  END IF;
  IF (SELECT id FROM public.get_visit_client(
        (SELECT id FROM public.list_client_visits(ola) LIMIT 1))) IS DISTINCT FROM ola THEN
    RAISE EXCEPTION 'AE: a visit''s client';
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_clients(p_query => '_la@')) THEN
    RAISE EXCEPTION 'AE: "_" matched as a wildcard';
  END IF;
  IF pg_temp.hint_of(format('SELECT public.admin_update_client(%L, %L, %L, NULL, NULL)',
       ola, 'Ola Test', 'ewa@example.com')) <> 'email_taken' THEN
    RAISE EXCEPTION 'AE: took another client''s address';
  END IF;
  IF pg_temp.hint_of(format('SELECT public.admin_update_client(%L, %L, %L, NULL, NULL)',
       ola, 'Ola Test', 'not an e-mail')) <> 'invalid_details' THEN
    RAISE EXCEPTION 'AE: saved a wrong address';
  END IF;
  SELECT count(*) INTO future FROM public.list_client_visits(ola)
  WHERE status IN ('confirmed', 'awaiting_payment') AND starts_at > now();
  SELECT * INTO u FROM public.admin_update_client(ola, 'Ola Nowak', ' Ola.Nowak@Example.invalid ', '600 200 300', 'Woli popołudnia');
  IF u.upcoming_updated <> future THEN
    RAISE EXCEPTION 'AE: % visits to come followed, not %', u.upcoming_updated, future;
  END IF;
  SELECT * INTO c FROM public.get_client(ola);
  IF (c.name, c.email, c.phone, c.notes)
     IS DISTINCT FROM ('Ola Nowak'::text, 'ola.nowak@example.invalid'::text, '600 200 300'::text, 'Woli popołudnia'::text) THEN
    RAISE EXCEPTION 'AE: the saved details: %', row_to_json(c);
  END IF;
END;
$body$;
RESET ROLE;

-- (The visits themselves, read past the admin's functions.)
DO $body$
DECLARE
  ola uuid := (SELECT id FROM public.clients WHERE email_key = 'ola.nowak@example.invalid');
BEGIN
  IF ola IS NULL THEN
    RAISE EXCEPTION 'AE: the client''s new address';
  END IF;
  IF EXISTS (SELECT 1 FROM public.appointments
             WHERE client_id = ola AND status IN ('confirmed', 'awaiting_payment') AND lower(during) > now()
               AND client_email <> 'ola.nowak@example.invalid') THEN
    RAISE EXCEPTION 'AE: a visit to come kept the old address';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.appointments
                 WHERE client_id = ola AND status = 'cancelled' AND client_email = 'ola@example.com') THEN
    RAISE EXCEPTION 'AE: a cancelled visit lost what the client gave then';
  END IF;
END;
$body$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  BEGIN
    PERFORM public.search_clients();
    RAISE EXCEPTION 'AE: a specialist listed the clients';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.get_visit_client(gen_random_uuid());
    RAISE EXCEPTION 'AE: a specialist read a visit''s client';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.admin_update_client(gen_random_uuid(), 'A', 'a@example.invalid', NULL, NULL);
    RAISE EXCEPTION 'AE: a specialist changed a client';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.clients LIMIT 1;
    RAISE EXCEPTION 'AE: a specialist read the clients table';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $body$
BEGIN
  PERFORM public.get_client(gen_random_uuid());
  RAISE EXCEPTION 'AE: a visitor read a client';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$body$;
RESET ROLE;

-- Z: "Zapłacę później" cannot block the schedule (audit of 22.10). One
-- person (by e-mail, phone or visitor) has at most two unpaid reservations;
-- a third is paid at once and the admins are told, once. A reservation is
-- held for 30 minutes until the client confirms it from the e-mail's link,
-- then paid by a day after booking (or the centre's time before the visit,
-- if sooner); one not confirmed lapses quietly, without an e-mail.
CREATE FUNCTION pg_temp.reserve_new(
  p_mode public.visit_mode, p_at timestamptz, p_name text, p_email text,
  p_phone text, p_hold_key text, p_reserve_key text
)
RETURNS TABLE (appointment_id uuid, reference text, outcome text)
LANGUAGE plpgsql
AS $$
DECLARE
  held record;
  r record;
BEGIN
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', p_mode, p_at,
    p_client_key => p_hold_key
  );
  PERFORM pg_temp.save_details(held.access_token, p_name, p_email,
    p_phone, NULL, true, true);
  SELECT * INTO r FROM public.reserve_hold(held.access_token, p_reserve_key);
  RETURN QUERY SELECT held.appointment_id, held.reference, r.outcome;
END;
$$;
GRANT EXECUTE ON FUNCTION pg_temp.reserve_new(public.visit_mode, timestamptz, text, text, text, text, text) TO service_role;
CREATE TEMP TABLE z_visits (name text PRIMARY KEY, id uuid, reference text, outcome text);
GRANT ALL ON z_visits TO service_role;

SET LOCAL ROLE service_role;
DO $body$
DECLARE
  x x_day%ROWTYPE;
  v public.appointments%ROWTYPE;
  c record;
  v_due timestamptz;
BEGIN
  SELECT * INTO x FROM x_day;
  INSERT INTO z_visits SELECT 'z1', * FROM pg_temp.reserve_new('online',
    pg_temp.at(x.day + 14, '13:00'), 'Zofia Raz', 'zofia@example.invalid',
    '600 200 300', 'visitor-z1-hold', 'visitor-z-same');
  INSERT INTO z_visits SELECT 'z2', * FROM pg_temp.reserve_new('online',
    pg_temp.at(x.day + 14, '14:00'), 'Zofia Raz', 'zofia@example.invalid',
    '600200300', 'visitor-z2-hold', 'visitor-z-same');
  IF (SELECT array_agg(outcome ORDER BY name) FROM z_visits) <> ARRAY['reserved', 'reserved'] THEN
    RAISE EXCEPTION 'Z: two unpaid reservations were not allowed';
  END IF;

  SELECT * INTO v FROM public.appointments WHERE id = (SELECT id FROM z_visits WHERE name = 'z1');
  IF v.status <> 'awaiting_payment' OR v.payment_due_at <> now() + interval '30 minutes'
     OR v.reservation_confirm_by <> v.payment_due_at OR v.reserved_by_key <> 'visitor-z-same' THEN
    RAISE EXCEPTION 'Z: the reservation before it is confirmed: %', row_to_json(v);
  END IF;

  -- The e-mail: confirm by the 30 minutes, pay by a day after booking.
  SELECT * INTO c FROM public.claim_booking_email(v.reference, 'reserved');
  IF c.confirm_by <> v.reservation_confirm_by
     OR c.payment_due_at <> v.created_at + interval '24 hours' OR c.manage_token IS NULL THEN
    RAISE EXCEPTION 'Z: the reservation e-mail: %', row_to_json(c);
  END IF;
  IF public.reservation_confirm_by(c.manage_token) <> v.reservation_confirm_by
     OR public.reservation_confirm_by('not-the-link') IS NOT NULL THEN
    RAISE EXCEPTION 'Z: until when to confirm, by the link';
  END IF;
  IF public.confirm_reservation('not-the-link') IS NOT NULL THEN
    RAISE EXCEPTION 'Z: confirmed without the link';
  END IF;
  v_due := public.confirm_reservation(c.manage_token);
  SELECT * INTO v FROM public.appointments WHERE id = v.id;
  IF v_due IS DISTINCT FROM v.created_at + interval '24 hours'
     OR v.payment_due_at <> v_due OR v.reservation_confirm_by IS NOT NULL
     OR v.status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'Z: the confirmed reservation: %', row_to_json(v);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.appointment_events
    WHERE appointment_id = v.id AND kind = 'reservation_confirmed' AND actor = 'client'
  ) THEN
    RAISE EXCEPTION 'Z: the history does not say it was confirmed';
  END IF;
  IF public.confirm_reservation(c.manage_token) IS NOT NULL
     OR public.reservation_confirm_by(c.manage_token) IS NOT NULL THEN
    RAISE EXCEPTION 'Z: confirmed twice';
  END IF;

  -- A third: the same e-mail (written otherwise), the same phone, or the
  -- same visitor, is paid at once; still held, nothing reserved.
  INSERT INTO z_visits SELECT 'z3', * FROM pg_temp.reserve_new('in_person',
    pg_temp.at(x.day + 14, '09:00'), 'Zofia Raz', 'Zofia@Example.invalid',
    '511 222 333', 'visitor-z3-hold', NULL);
  INSERT INTO z_visits SELECT 'z4', * FROM pg_temp.reserve_new('in_person',
    pg_temp.at(x.day + 14, '10:00'), 'Zenon Inny', 'zenon@example.invalid',
    '+48 600-200-300', 'visitor-z4-hold', NULL);
  INSERT INTO z_visits SELECT 'z5', * FROM pg_temp.reserve_new('in_person',
    pg_temp.at(x.day + 14, '11:00'), 'Zuzanna Inna', 'zuzanna@example.invalid',
    '700 800 900', 'visitor-z5-hold', 'visitor-z-same');
  IF (SELECT array_agg(outcome ORDER BY name) FROM z_visits WHERE name IN ('z3', 'z4', 'z5'))
     <> ARRAY['pay_now', 'pay_now', 'pay_now'] THEN
    RAISE EXCEPTION 'Z: a third unpaid reservation: %',
      (SELECT array_agg(outcome ORDER BY name) FROM z_visits);
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.appointments
    WHERE id IN (SELECT id FROM z_visits WHERE name IN ('z3', 'z4', 'z5'))
      AND (status <> 'held' OR payment_due_at IS NOT NULL)
  ) THEN
    RAISE EXCEPTION 'Z: a refused reservation was reserved';
  END IF;
  IF (SELECT count(*) FROM public.notifications
      WHERE kind = 'unpaid_limit' AND portal = 'admin'
        AND appointment_id = (SELECT id FROM z_visits WHERE name = 'z3'))
     <> (SELECT count(DISTINCT user_id) FROM public.user_roles WHERE role = 'admin') THEN
    RAISE EXCEPTION 'Z: the admins were not told of the third reservation';
  END IF;
END;
$body$;
RESET ROLE;

-- Another person may still reserve (the admins hear nothing of it); one
-- not confirmed lapses quietly.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  x x_day%ROWTYPE;
  v_before bigint;
BEGIN
  SELECT * INTO x FROM x_day;
  v_before := (SELECT count(*) FROM public.notifications WHERE kind = 'unpaid_limit');
  INSERT INTO z_visits SELECT 'z6', * FROM pg_temp.reserve_new('online',
    pg_temp.at(x.day + 15, '09:00'), 'Zbigniew Trzeci', 'zbigniew@example.invalid',
    '500 400 300', 'visitor-z6-hold', 'visitor-z-other');
  IF (SELECT outcome FROM z_visits WHERE name = 'z6') <> 'reserved' THEN
    RAISE EXCEPTION 'Z: another person could not reserve';
  END IF;
  IF (SELECT count(*) FROM public.notifications WHERE kind = 'unpaid_limit') <> v_before THEN
    RAISE EXCEPTION 'Z: the admins were told without a reason';
  END IF;
END;
$body$;
RESET ROLE;

UPDATE public.appointments SET payment_due_at = now() - interval '1 minute',
  reservation_confirm_by = now() - interval '1 minute'
WHERE id = (SELECT id FROM z_visits WHERE name = 'z6');
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  v_ref text := (SELECT reference FROM z_visits WHERE name = 'z6');
BEGIN
  IF v_ref IN (SELECT reference FROM public.cancel_unpaid_visits()) THEN
    RAISE EXCEPTION 'Z: a reservation not confirmed was cancelled as unpaid';
  END IF;
  IF (SELECT (status, cancelled_by, reservation_confirm_by)
      FROM public.appointments WHERE reference = v_ref)
     IS DISTINCT FROM ('expired'::public.appointment_status, NULL::text, NULL::timestamptz) THEN
    RAISE EXCEPTION 'Z: a reservation not confirmed did not lapse';
  END IF;
  IF EXISTS (SELECT 1 FROM public.list_due_emails() WHERE reference = v_ref) THEN
    RAISE EXCEPTION 'Z: an e-mail is due for a reservation nobody confirmed';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.list_free_slots('booking-test-consultation', 'booking-test-anna',
      'online', (SELECT day FROM x_day) + 15, (SELECT day FROM x_day) + 15)
    WHERE starts_at = pg_temp.at((SELECT day FROM x_day) + 15, '09:00')
  ) THEN
    RAISE EXCEPTION 'Z: the lapsed reservation still holds its time';
  END IF;
END;
$body$;
RESET ROLE;

-- Only the site's server reserves and confirms.
SET LOCAL ROLE anon;
DO $body$
BEGIN
  BEGIN
    PERFORM public.reserve_hold('x', 'visitor-anon');
    RAISE EXCEPTION 'Z: anon reserved';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.confirm_reservation('x');
    RAISE EXCEPTION 'Z: anon confirmed a reservation';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.reservation_confirm_by('x');
    RAISE EXCEPTION 'Z: anon read a reservation';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;

-- AA: Stripe's side (audit of 22.10). A dispute on a visit's payment is
-- written to its history and told to the admins, when it opens and when
-- it closes; payments pending two hours on are listed for the job to ask
-- Stripe about; a reservation past its time is cancelled even with a
-- payment begun for it, once that payment's session is over.
INSERT INTO public.payments (appointment_id, checkout_session_id, payment_intent_id, amount_minor, currency_code, status)
SELECT id, 'cs_aa_paid', 'pi_aa_disputed', 25000, 'PLN', 'succeeded'
FROM z_visits WHERE name = 'z2';
INSERT INTO public.payments (appointment_id, checkout_session_id, amount_minor, currency_code, created_at)
SELECT id, 'cs_aa_stuck', 25000, 'PLN', now() - interval '3 hours'
FROM z_visits WHERE name = 'z1';
INSERT INTO public.payments (appointment_id, checkout_session_id, amount_minor, currency_code, created_at)
SELECT id, 'cs_aa_recent', 25000, 'PLN', now() - interval '10 minutes'
FROM z_visits WHERE name = 'z2';

SET LOCAL ROLE service_role;
DO $body$
DECLARE
  v_z2 uuid := (SELECT id FROM z_visits WHERE name = 'z2');
  v_admins bigint := (SELECT count(DISTINCT user_id) FROM public.user_roles WHERE role = 'admin');
BEGIN
  IF public.record_dispute('pi_aa_disputed', 'du_1', 'needs_response', 25000, 'fraudulent', false)
     IS DISTINCT FROM (SELECT reference FROM z_visits WHERE name = 'z2') THEN
    RAISE EXCEPTION 'AA: the dispute did not find its visit';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.appointment_events
    WHERE appointment_id = v_z2 AND kind = 'payment_disputed' AND actor = 'payment'
      AND details ->> 'reason' = 'fraudulent' AND (details ->> 'amount_minor')::integer = 25000
  ) THEN
    RAISE EXCEPTION 'AA: the history does not say the payment is disputed';
  END IF;
  IF (SELECT count(*) FROM public.notifications
      WHERE appointment_id = v_z2 AND kind = 'disputed' AND portal = 'admin'
        AND details ->> 'dispute_reason' = 'fraudulent') <> v_admins THEN
    RAISE EXCEPTION 'AA: the admins were not told of the dispute';
  END IF;
  PERFORM public.record_dispute('pi_aa_disputed', 'du_1', 'lost', 25000, 'fraudulent', true);
  IF NOT EXISTS (
    SELECT 1 FROM public.appointment_events
    WHERE appointment_id = v_z2 AND kind = 'dispute_closed' AND details ->> 'status' = 'lost'
  ) OR (SELECT count(*) FROM public.notifications
        WHERE appointment_id = v_z2 AND kind = 'dispute_closed') <> v_admins THEN
    RAISE EXCEPTION 'AA: the closed dispute was not recorded';
  END IF;
  IF public.record_dispute('pi_not_ours', 'du_2', 'needs_response', 100, 'general', false) IS NOT NULL THEN
    RAISE EXCEPTION 'AA: a dispute on another payment found a visit';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.list_stuck_payments() WHERE checkout_session_id = 'cs_aa_stuck')
     OR EXISTS (SELECT 1 FROM public.list_stuck_payments() WHERE checkout_session_id = 'cs_aa_recent') THEN
    RAISE EXCEPTION 'AA: the stuck payments: %',
      (SELECT array_agg(checkout_session_id) FROM public.list_stuck_payments());
  END IF;
END;
$body$;
RESET ROLE;

-- z1 (confirmed) past its time with an old payment begun: cancelled; z2
-- (not confirmed) past its time with a payment begun minutes ago: kept.
UPDATE public.appointments SET payment_due_at = now() - interval '1 minute'
WHERE id IN (SELECT id FROM z_visits WHERE name IN ('z1', 'z2'));
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  v_cancelled text[] := ARRAY(SELECT public.cancel_unpaid_visits());
BEGIN
  IF NOT (SELECT reference FROM z_visits WHERE name = 'z1') = ANY (v_cancelled)
     OR (SELECT status FROM public.appointments WHERE id = (SELECT id FROM z_visits WHERE name = 'z1')) <> 'cancelled' THEN
    RAISE EXCEPTION 'AA: an overdue reservation with a payment long over was kept';
  END IF;
  IF (SELECT status FROM public.appointments WHERE id = (SELECT id FROM z_visits WHERE name = 'z2')) <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'AA: cancelled while the client was paying';
  END IF;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $body$
BEGIN
  BEGIN
    PERFORM public.record_dispute('pi_x', 'du_x', 'lost', 1, 'general', true);
    RAISE EXCEPTION 'AA: anon recorded a dispute';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.list_stuck_payments();
    RAISE EXCEPTION 'AA: anon listed payments';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;

-- AB: a dispute that comes before its payment is settled (its intent not
-- stored yet) finds the visit by the reference Stripe keeps with it.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  v_z1 uuid := (SELECT id FROM z_visits WHERE name = 'z1');
  v_ref text := (SELECT reference FROM z_visits WHERE name = 'z1');
BEGIN
  IF public.record_dispute('pi_ab_unknown', 'du_ab', 'needs_response', 25000, 'general', false, v_ref)
     IS DISTINCT FROM v_ref THEN
    RAISE EXCEPTION 'AB: the dispute did not find the visit by its reference';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.appointment_events
    WHERE appointment_id = v_z1 AND kind = 'payment_disputed' AND details ->> 'dispute_id' = 'du_ab'
  ) THEN
    RAISE EXCEPTION 'AB: the history does not say the payment is disputed';
  END IF;
END;
$body$;
RESET ROLE;

-- AC: the clocks change (Klient · 1). Anna's Monday 9–12 stays 9–12 Polish
-- time in the weeks before and after the change, in March and in October;
-- the same hour is then an hour further or nearer in UTC. (2027 is past
-- the 60 days' horizon: two years ahead here, rolled back with the rest.)
UPDATE public.center_settings SET max_booking_horizon_days = 730;
DO $body$
DECLARE
  v_offer uuid := (
    SELECT offer.id FROM public.specialist_services AS offer
    JOIN public.services AS service ON service.id = offer.service_id
    WHERE offer.specialist_id = (SELECT anna_id FROM booking_test)
      AND service.slug = 'booking-test-consultation'
  );
  v_day date;
  v_times text;
BEGIN
  FOREACH v_day IN ARRAY ARRAY['2027-03-22', '2027-03-29', '2027-10-25', '2027-11-01']::date[] LOOP
    SELECT string_agg(to_char(slot.starts_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI'), ' ' ORDER BY slot.starts_at)
    INTO v_times
    FROM private.free_slots(v_offer, 'in_person', v_day, v_day) AS slot;
    IF v_times IS DISTINCT FROM '09:00 10:00 11:00' THEN
      RAISE EXCEPTION 'AC: on % the free times were %', v_day, v_times;
    END IF;
  END LOOP;
  IF (SELECT min(starts_at) FROM private.free_slots(v_offer, 'in_person', '2027-03-29', '2027-03-29'))
     - (SELECT min(starts_at) FROM private.free_slots(v_offer, 'in_person', '2027-03-22', '2027-03-22'))
     <> interval '7 days' - interval '1 hour'
     OR (SELECT min(starts_at) FROM private.free_slots(v_offer, 'in_person', '2027-11-01', '2027-11-01'))
     - (SELECT min(starts_at) FROM private.free_slots(v_offer, 'in_person', '2027-10-25', '2027-10-25'))
     <> interval '7 days' + interval '1 hour' THEN
    RAISE EXCEPTION 'AC: 9:00 did not move with the clocks';
  END IF;
END;
$body$;

-- AD: one service, two prices (Klient · 1, card 4). Anna asks 250 zł and
-- Jan 180 zł for the same consultation: each hold keeps the price of the
-- specialist chosen, which is what the summary shows and the payment asks.
UPDATE public.center_settings SET booking_enabled = true;
UPDATE public.specialist_services AS offer
SET price_minor = CASE offer.specialist_id WHEN t.anna_id THEN 25000 ELSE 18000 END,
    active = true, supports_in_person = true, supports_online = true
FROM booking_test AS t, public.services AS service
WHERE service.id = offer.service_id AND service.slug = 'booking-test-consultation'
  AND offer.specialist_id IN (t.anna_id, t.jan_id);
-- Jan: Mondays 9–12 online.
INSERT INTO public.specialist_availability_rules (
  specialist_id, recurrence, weekdays, starts_at, ends_at, valid_from, mode, room_id
)
SELECT jan_id, 'weekly', ARRAY[1]::smallint[], '09:00', '12:00', monday, 'online', NULL
FROM booking_test;
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  v_day date := (SELECT monday + 35 FROM booking_test);
  v_anna record;
  v_jan record;
BEGIN
  SELECT * INTO v_anna FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'online',
    pg_temp.at(v_day, '13:00'), p_client_key => 'visitor-ad-anna'
  );
  SELECT * INTO v_jan FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-jan', 'online',
    pg_temp.at(v_day, '09:00'), p_client_key => 'visitor-ad-jan'
  );
  IF (SELECT price_minor FROM public.appointments WHERE id = v_anna.appointment_id) <> 25000 THEN
    RAISE EXCEPTION 'AD: Anna''s hold is not at her price';
  END IF;
  IF (SELECT price_minor FROM public.appointments WHERE id = v_jan.appointment_id) <> 18000 THEN
    RAISE EXCEPTION 'AD: Jan''s hold is not at his price';
  END IF;
  -- What the guest's pages read for each (the summary and the payment).
  IF (SELECT price_minor FROM public.get_booking(v_jan.access_token)) <> 18000
     OR (SELECT price_minor FROM public.get_booking(v_anna.access_token)) <> 25000 THEN
    RAISE EXCEPTION 'AD: the guest reads another price';
  END IF;
END;
$body$;
RESET ROLE;

-- AF–AI: the details step (Klient · 3). The consents a visit asks for,
-- one visit for one person at a time, who reads a questionnaire, and a
-- booking left unfinished. (Bookings are on and the horizon long, AC–AD.)
CREATE TEMP TABLE col3 (name text PRIMARY KEY, token text, appointment_id uuid);
GRANT SELECT, INSERT ON col3 TO service_role;
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  near record;
  far record;
  need record;
BEGIN
  SELECT * INTO t FROM booking_test;

  -- AF (card 15): a visit within 14 days of booking waits for the client's
  -- request to have it before the 14 days to withdraw are over.
  SELECT * INTO near FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-jan', 'online', pg_temp.at(t.monday, '10:00'),
    p_client_key => 'visitor-af-near'
  );
  INSERT INTO col3 VALUES ('near', near.access_token, near.appointment_id);
  SELECT * INTO need FROM public.booking_requirements(near.access_token);
  IF NOT need.early_start OR need.guardian THEN
    RAISE EXCEPTION 'AF: what a visit next week asks: %', row_to_json(need);
  END IF;
  BEGIN
    PERFORM public.save_booking_details(near.access_token, 'Ala', 'Nowak', 'ala@example.invalid',
      '600700800', NULL, true, true);
    RAISE EXCEPTION 'AF: saved without the request to start early';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'A visit within 14 days needs the client''s request' THEN RAISE; END IF;
  END;
  PERFORM public.save_booking_details(near.access_token, 'Ala', 'Nowak', 'ala@example.invalid',
    '600700800', NULL, true, true, p_accept_early_start => true);
  IF (SELECT early_start_accepted_at IS NULL OR guardian_confirmed_at IS NOT NULL
      FROM public.appointments WHERE id = near.appointment_id) THEN
    RAISE EXCEPTION 'AF: the time of the request was not saved';
  END IF;

  -- Eight weeks ahead: no such request asked, none saved.
  SELECT * INTO far FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person', pg_temp.at(t.monday + 56, '09:00'),
    p_client_key => 'visitor-af-far'
  );
  INSERT INTO col3 VALUES ('far', far.access_token, far.appointment_id);
  IF (SELECT early_start FROM public.booking_requirements(far.access_token)) THEN
    RAISE EXCEPTION 'AF: a visit eight weeks ahead asked to start early';
  END IF;
  PERFORM public.save_booking_details(far.access_token, 'Ala', 'Nowak', 'ala@example.invalid',
    '600700800', NULL, true, true);
  IF (SELECT early_start_accepted_at FROM public.appointments WHERE id = far.appointment_id) IS NOT NULL THEN
    RAISE EXCEPTION 'AF: a request saved that was not asked for';
  END IF;
END;
$body$;
RESET ROLE;

-- AF (card 16): a service for minors is booked by a parent or guardian.
UPDATE public.services SET for_minors = true WHERE slug = 'booking-test-consultation';
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
BEGIN
  SELECT * INTO t FROM booking_test;
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person', pg_temp.at(t.monday + 63, '09:00'),
    p_client_key => 'visitor-af-minor'
  );
  IF NOT (SELECT guardian FROM public.booking_requirements(held.access_token)) THEN
    RAISE EXCEPTION 'AF: a service for minors did not ask for the guardian';
  END IF;
  BEGIN
    PERFORM public.save_booking_details(held.access_token, 'Ola', 'Rodzic', 'rodzic@example.invalid',
      '600700801', NULL, true, true);
    RAISE EXCEPTION 'AF: saved without the guardian''s confirmation';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'A service for minors is booked by a parent or guardian' THEN RAISE; END IF;
  END;
  PERFORM public.save_booking_details(held.access_token, 'Ola', 'Rodzic', 'rodzic@example.invalid',
    '600700801', NULL, true, true, p_confirm_guardian => true);
  IF (SELECT guardian_confirmed_at FROM public.appointments WHERE id = held.appointment_id) IS NULL THEN
    RAISE EXCEPTION 'AF: the guardian''s confirmation was not saved';
  END IF;
  PERFORM public.release_hold(held.access_token);
END;
$body$;
RESET ROLE;
UPDATE public.services SET for_minors = false WHERE slug = 'booking-test-consultation';

-- AG (card 17): one person, one visit at a time, by e-mail or by phone.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  first record;
  second record;
  v_day date;
BEGIN
  SELECT * INTO t FROM booking_test;
  v_day := t.monday + 42;
  -- Anna at 10:00 in the room, details given.
  SELECT * INTO first FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person', pg_temp.at(v_day, '10:00'),
    p_client_key => 'visitor-ag-1'
  );
  PERFORM public.save_booking_details(first.access_token, 'Ewa', 'Raz', 'ewa.raz@example.invalid',
    '+48 600 700 900', NULL, true, true);
  -- Jan online at the same time, for the same person: by e-mail, by phone.
  SELECT * INTO second FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-jan', 'online', pg_temp.at(v_day, '10:00'),
    p_client_key => 'visitor-ag-2'
  );
  BEGIN
    PERFORM public.save_booking_details(second.access_token, 'Ewa', 'Raz', 'EWA.RAZ@example.invalid',
      '500100100', NULL, true, true);
    RAISE EXCEPTION 'AG: the same e-mail got a second visit at the same time';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'The client has another visit at this time' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.save_booking_details(second.access_token, 'Ewa', 'Raz', 'inny@example.invalid',
      '600700900', NULL, true, true);
    RAISE EXCEPTION 'AG: the same phone got a second visit at the same time';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'The client has another visit at this time' THEN RAISE; END IF;
  END;
  -- Someone else may.
  PERFORM public.save_booking_details(second.access_token, 'Adam', 'Inny', 'adam@example.invalid',
    '500200300', NULL, true, true);
  PERFORM public.release_hold(second.access_token);
  -- The same person at another time may.
  SELECT * INTO second FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-jan', 'online', pg_temp.at(v_day, '11:00'),
    p_client_key => 'visitor-ag-3'
  );
  PERFORM public.save_booking_details(second.access_token, 'Ewa', 'Raz', 'ewa.raz@example.invalid',
    '600700900', NULL, true, true);
  PERFORM public.release_hold(second.access_token);
  -- A time given back no longer counts.
  PERFORM public.release_hold(first.access_token);
  SELECT * INTO second FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-jan', 'online', pg_temp.at(v_day, '10:00'),
    p_client_key => 'visitor-ag-4'
  );
  PERFORM public.save_booking_details(second.access_token, 'Ewa', 'Raz', 'ewa.raz@example.invalid',
    '600700900', NULL, true, true);
  PERFORM public.release_hold(second.access_token);
END;
$body$;
RESET ROLE;

-- AH (card 12): a questionnaire is read by the visit's specialist and the
-- centre's admin, by nobody else. (The visit is Jan's, from AF.)
INSERT INTO public.visit_intakes (token_hash, service_id, appointment_id, mood, answers, health_consent_at)
SELECT extensions.digest('col3-intake', 'sha256'), visit.service_id, visit.id, 6, '{"q1":"tak"}', now()
FROM public.appointments AS visit WHERE visit.id = (SELECT appointment_id FROM col3 WHERE name = 'near');
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF (SELECT count(*) FROM public.visit_intakes) <> 1 THEN
    RAISE EXCEPTION 'AH: the visit''s specialist does not see its questionnaire';
  END IF;
END;
$body$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF EXISTS (SELECT 1 FROM public.visit_intakes AS intake
             WHERE intake.token_hash = extensions.digest('col3-intake', 'sha256')) THEN
    RAISE EXCEPTION 'AH: another specialist read the questionnaire';
  END IF;
END;
$body$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.visit_intakes AS intake
                 WHERE intake.token_hash = extensions.digest('col3-intake', 'sha256')) THEN
    RAISE EXCEPTION 'AH: the admin does not see the questionnaire';
  END IF;
END;
$body$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $body$
BEGIN
  PERFORM 1 FROM public.visit_intakes LIMIT 1;
  RAISE EXCEPTION 'AH: the public read a questionnaire';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$body$;
RESET ROLE;

-- AI (card 13): the details of a booking never finished go after 30 days;
-- younger ones, and real visits, stay; the nightly clean-up does it too.
DO $body$
DECLARE
  v_old uuid := (SELECT appointment_id FROM col3 WHERE name = 'near');
  v_young uuid := (SELECT appointment_id FROM col3 WHERE name = 'far');
  v_kept integer := (SELECT count(*) FROM public.appointments AS visit
                     WHERE private.shown_as_visit(visit) AND visit.client_email IS NOT NULL);
BEGIN
  DELETE FROM public.visit_intakes WHERE token_hash = extensions.digest('col3-intake', 'sha256');
  UPDATE public.appointments SET status = 'expired', hold_expires_at = now() - interval '31 days'
  WHERE id = v_old;
  UPDATE public.appointments SET status = 'expired', hold_expires_at = now() - interval '29 days'
  WHERE id = v_young;
  PERFORM private.forget_abandoned_bookings();
  IF (SELECT num_nonnulls(client_name, client_first_name, client_last_name, client_email,
                          client_phone, client_notes)
      FROM public.appointments WHERE id = v_old) <> 0 THEN
    RAISE EXCEPTION 'AI: a booking left 31 days ago kept its details';
  END IF;
  IF (SELECT client_email FROM public.appointments WHERE id = v_young) IS NULL THEN
    RAISE EXCEPTION 'AI: a booking left 29 days ago lost its details';
  END IF;
  IF (SELECT count(*) FROM public.appointments AS visit
      WHERE private.shown_as_visit(visit) AND visit.client_email IS NOT NULL) <> v_kept THEN
    RAISE EXCEPTION 'AI: a real visit lost its details';
  END IF;
  UPDATE public.appointments SET hold_expires_at = now() - interval '31 days' WHERE id = v_young;
  PERFORM private.apply_retention();
  IF (SELECT client_email FROM public.appointments WHERE id = v_young) IS NOT NULL THEN
    RAISE EXCEPTION 'AI: the nightly clean-up left an unfinished booking''s details';
  END IF;
END;
$body$;

-- AJ–AL: paying at once (Klient · 4). The price of the moment of booking,
-- money in another currency, and a price of 0 zł or at least 2 zł.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
  outcome text;
  hint text;
BEGIN
  SELECT * INTO t FROM booking_test;

  -- AJ (card 8): the admin changes the price while the client books; the
  -- client pays the price the time was held at.
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.monday + 70, '09:00'), p_client_key => 'visitor-aj'
  );
  PERFORM pg_temp.save_details(held.access_token, 'Ola Cena', 'ola.cena@example.invalid',
    '600700100', NULL, true, true);
  UPDATE public.specialist_services SET price_minor = 30000
  WHERE specialist_id = t.anna_id;
  BEGIN
    PERFORM public.attach_checkout_session(held.access_token, 'cs_aj_new', now() + interval '30 minutes', 30000, 'PLN');
    RAISE EXCEPTION 'AJ: a session at the new price';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'AJ:%' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'amount_mismatch' THEN RAISE EXCEPTION 'AJ: expected amount_mismatch, got %', hint; END IF;
  END;
  PERFORM public.attach_checkout_session(held.access_token, 'cs_aj', now() + interval '30 minutes', 25000, 'PLN');
  outcome := public.fulfill_checkout_session('cs_aj', true, 'pi_aj');
  IF outcome <> 'confirmed'
     OR (SELECT price_minor FROM public.appointments WHERE id = held.appointment_id) <> 25000 THEN
    RAISE EXCEPTION 'AJ: paid % at the held price: %', outcome,
      (SELECT price_minor FROM public.appointments WHERE id = held.appointment_id);
  END IF;
  UPDATE public.specialist_services SET price_minor = 25000
  WHERE specialist_id = t.anna_id;
END;
$body$;
RESET ROLE;

-- AK (card 10): money in another currency than the visit's goes back and
-- confirms nothing.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
BEGIN
  SELECT * INTO t FROM booking_test;
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.monday + 70, '10:00'), p_client_key => 'visitor-ak'
  );
  PERFORM pg_temp.save_details(held.access_token, 'Ola Waluta', 'ola.waluta@example.invalid',
    '600700101', NULL, true, true);
  PERFORM public.attach_checkout_session(held.access_token, 'cs_ak', now() + interval '30 minutes', 25000, 'PLN');
  INSERT INTO col3 VALUES ('ak', held.access_token, held.appointment_id);
END;
$body$;
RESET ROLE;
-- What Stripe reported came in euro (as the owner: the site never writes it).
UPDATE public.payments SET currency_code = 'EUR' WHERE checkout_session_id = 'cs_ak';
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  outcome text;
BEGIN
  outcome := public.fulfill_checkout_session('cs_ak', true, 'pi_ak');
  IF outcome <> 'refund_payment' THEN
    RAISE EXCEPTION 'AK: money in euro was %, not to be refunded', outcome;
  END IF;
  IF (SELECT status FROM public.appointments WHERE id = (SELECT appointment_id FROM col3 WHERE name = 'ak'))
     = 'confirmed' THEN
    RAISE EXCEPTION 'AK: money in euro confirmed the visit';
  END IF;
END;
$body$;
RESET ROLE;

-- AL (card 9): a price is 0 zł (free) or at least 2 zł; a free visit is
-- confirmed without a payment, with no code.
DO $body$
BEGIN
  BEGIN
    UPDATE public.specialist_services SET price_minor = 150
    WHERE specialist_id = (SELECT anna_id FROM booking_test);
    RAISE EXCEPTION 'AL: an offer at 1,50 zł';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  UPDATE public.specialist_services SET price_minor = 200
  WHERE specialist_id = (SELECT anna_id FROM booking_test);
  UPDATE public.specialist_services SET price_minor = 0
  WHERE specialist_id = (SELECT anna_id FROM booking_test);
END;
$body$;
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
BEGIN
  SELECT * INTO t FROM booking_test;
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.monday + 70, '11:00'), p_client_key => 'visitor-al'
  );
  IF (SELECT price_minor FROM public.appointments WHERE id = held.appointment_id) <> 0 THEN
    RAISE EXCEPTION 'AL: the free visit has a price';
  END IF;
  PERFORM pg_temp.save_details(held.access_token, 'Ola Darmo', 'ola.darmo@example.invalid',
    '600700102', NULL, true, true);
  PERFORM public.confirm_free_booking(held.access_token);
  IF (SELECT (status, discount_code_id IS NULL) FROM public.appointments WHERE id = held.appointment_id)
     IS DISTINCT FROM ('confirmed'::public.appointment_status, true) THEN
    RAISE EXCEPTION 'AL: a free visit was not confirmed without a payment';
  END IF;
END;
$body$;
RESET ROLE;
UPDATE public.specialist_services SET price_minor = 25000
WHERE specialist_id = (SELECT anna_id FROM booking_test);
-- A paid visit is still not confirmed that way.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
  hint text;
BEGIN
  SELECT * INTO t FROM booking_test;
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.monday + 77, '09:00'), p_client_key => 'visitor-al-2'
  );
  PERFORM pg_temp.save_details(held.access_token, 'Ola Płaci', 'ola.placi@example.invalid',
    '600700103', NULL, true, true);
  BEGIN
    PERFORM public.confirm_free_booking(held.access_token);
    RAISE EXCEPTION 'AL: a paid visit confirmed as free';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'AL:%' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'not_free' THEN RAISE EXCEPTION 'AL: expected not_free, got %', hint; END IF;
  END;
  PERFORM public.release_hold(held.access_token);
END;
$body$;
RESET ROLE;

-- AM: a visit paid with a discount code (Klient · 4a). Moving it keeps the
-- code and the price paid (card 3); cancelling it in the window gives back
-- what was paid, not the list price (card 8).
UPDATE public.center_settings
SET cancellation_window_hours = 24, reschedule_window_hours = 24, max_self_reschedules = 1;
INSERT INTO public.discount_codes (code, kind, value) VALUES ('KUPONAM', 'percent', 20);
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
  mail record;
  moved record;
  cancelled record;
  v_day date;
  v_code uuid;
BEGIN
  SELECT * INTO t FROM booking_test;
  v_day := t.monday + 84;
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(v_day, '09:00'), p_client_key => 'visitor-am'
  );
  PERFORM pg_temp.save_details(held.access_token, 'Ola Kupon', 'ola.kupon@example.invalid',
    '600700104', NULL, true, true);
  PERFORM public.apply_discount_code(held.access_token, 'KUPONAM');
  IF (SELECT (price_minor, list_price_minor, discount_minor) FROM public.appointments WHERE id = held.appointment_id)
     IS DISTINCT FROM (20000, 25000, 5000) THEN
    RAISE EXCEPTION 'AM: 20 %% off 250 zł: %',
      (SELECT row_to_json(a) FROM (SELECT price_minor, list_price_minor, discount_minor
        FROM public.appointments WHERE id = held.appointment_id) AS a);
  END IF;
  SELECT discount_code_id INTO v_code FROM public.appointments WHERE id = held.appointment_id;
  PERFORM public.attach_checkout_session(held.access_token, 'cs_am', now() + interval '30 minutes', 20000, 'PLN');
  IF public.fulfill_checkout_session('cs_am', true, 'pi_am') <> 'confirmed' THEN
    RAISE EXCEPTION 'AM: the visit paid with a code was not confirmed';
  END IF;
  SELECT * INTO mail FROM public.claim_booking_email(held.reference, 'confirmation');

  -- Card 3: moved, it keeps its code and the price paid.
  SELECT * INTO moved FROM public.reschedule_booking(mail.manage_token, pg_temp.at(v_day, '10:00'));
  IF (SELECT (status, starts_at, price_minor) FROM public.get_booking(mail.manage_token))
     IS DISTINCT FROM ('confirmed'::public.appointment_status, pg_temp.at(v_day, '10:00'), 20000) THEN
    RAISE EXCEPTION 'AM: the moved visit lost its price';
  END IF;
  IF (SELECT (discount_code_id, discount_minor) FROM public.appointments WHERE id = held.appointment_id)
     IS DISTINCT FROM (v_code, 5000) THEN
    RAISE EXCEPTION 'AM: the moved visit lost its code';
  END IF;

  -- Card 8: cancelled in the window, it gives back what was paid (200 zł),
  -- not the list price (250 zł).
  SELECT * INTO cancelled FROM public.cancel_booking(mail.manage_token);
  IF (cancelled.refund_minor, cancelled.payment_intent_id) IS DISTINCT FROM (20000, 'pi_am'::text) THEN
    RAISE EXCEPTION 'AM: the refund of a visit paid with a code: %', row_to_json(cancelled);
  END IF;
  IF (SELECT (status, refund_due_minor) FROM public.get_booking(mail.manage_token))
     IS DISTINCT FROM ('cancelled'::public.appointment_status, 20000) THEN
    RAISE EXCEPTION 'AM: the cancelled visit owes another amount';
  END IF;
END;
$body$;
RESET ROLE;

-- AN: a reservation keeps the price it was made at (Klient · 5, card 14).
-- The centre raises the offer's price after the client chose "zapłacę
-- później"; the link still asks for the old amount, and the visit is
-- confirmed at it.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
BEGIN
  SELECT * INTO t FROM booking_test;
  INSERT INTO z_visits SELECT 'an1', * FROM pg_temp.reserve_new('in_person',
    pg_temp.at(t.monday + 91, '09:00'), 'Nina Cena', 'nina.cena@example.invalid',
    '600700105', 'visitor-an-hold', 'visitor-an');
  IF (SELECT outcome FROM z_visits WHERE name = 'an1') <> 'reserved' THEN
    RAISE EXCEPTION 'AN: the visit was not reserved';
  END IF;
END;
$body$;
RESET ROLE;
UPDATE public.specialist_services SET price_minor = 30000
WHERE specialist_id = (SELECT anna_id FROM booking_test);
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  c record;
BEGIN
  SELECT * INTO c FROM public.claim_booking_email((SELECT reference FROM z_visits WHERE name = 'an1'), 'reserved');
  PERFORM public.accept_booking_terms(c.manage_token);
  IF pg_temp.hint_of(format('SELECT public.attach_reservation_payment(%L, %L, 30000, %L)',
       c.manage_token, 'cs_an_new', 'PLN')) <> 'amount_mismatch' THEN
    RAISE EXCEPTION 'AN: the link asked for the new price';
  END IF;
  PERFORM public.attach_reservation_payment(c.manage_token, 'cs_an', 25000, 'PLN');
  IF public.fulfill_checkout_session('cs_an', true, 'pi_an') <> 'confirmed' THEN
    RAISE EXCEPTION 'AN: paid at the old price, the visit was not confirmed';
  END IF;
  IF (SELECT (status, price_minor) FROM public.get_booking(c.manage_token))
     IS DISTINCT FROM ('confirmed'::public.appointment_status, 25000) THEN
    RAISE EXCEPTION 'AN: the confirmed visit changed its price';
  END IF;
END;
$body$;
RESET ROLE;
UPDATE public.specialist_services SET price_minor = 25000
WHERE specialist_id = (SELECT anna_id FROM booking_test);

-- AO: the centre helps a client with no e-mail about their visit (Klient ·
-- 6). The e-mail gives the place's directions (card 11); the link goes
-- again, for a confirmed visit too (card 7); a bounced e-mail shows in the
-- history (card 8).
UPDATE public.locations SET directions = 'Wejście od podwórza, drugie piętro'
WHERE slug = 'booking-test-location';
CREATE TEMP TABLE ao_visits (name text PRIMARY KEY, id uuid, reference text);
GRANT ALL ON ao_visits TO service_role, authenticated;
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  t booking_test%ROWTYPE;
  held record;
  mail record;
BEGIN
  SELECT * INTO t FROM booking_test;
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at(t.monday + 98, '09:00'), p_client_key => 'visitor-ao'
  );
  PERFORM pg_temp.save_details(held.access_token, 'Olga Link', 'olga.link@example.invalid',
    '600700106', NULL, true, true);
  PERFORM public.attach_checkout_session(held.access_token, 'cs_ao', now() + interval '30 minutes', 25000, 'PLN');
  IF public.fulfill_checkout_session('cs_ao', true, 'pi_ao') <> 'confirmed' THEN
    RAISE EXCEPTION 'AO: the visit was not confirmed';
  END IF;
  INSERT INTO ao_visits VALUES ('paid', held.appointment_id, held.reference);

  -- Card 11: the confirmation gives the directions (an online one none).
  SELECT * INTO mail FROM public.claim_booking_email(held.reference, 'confirmation');
  IF mail.location_directions IS DISTINCT FROM 'Wejście od podwórza, drugie piętro' THEN
    RAISE EXCEPTION 'AO: the e-mail has no directions: %', row_to_json(mail);
  END IF;
  PERFORM public.mark_booking_email_sent(held.reference, 'confirmation', 'msg_ao');

  INSERT INTO ao_visits SELECT 'reserved', appointment_id, reference
  FROM pg_temp.reserve_new('online', pg_temp.at(t.monday + 98, '13:00'),
    'Oskar Rezerwa', 'oskar.rezerwa@example.invalid', '600700107',
    'visitor-ao-2-hold', 'visitor-ao-2');
  SELECT * INTO mail FROM public.claim_booking_email(
    (SELECT reference FROM ao_visits WHERE name = 'reserved'), 'reserved');
  IF mail.manage_token IS NULL OR mail.location_directions IS NOT NULL THEN
    RAISE EXCEPTION 'AO: an online reservation''s e-mail: %', row_to_json(mail);
  END IF;
  -- Both e-mails went out yesterday.
  UPDATE public.booking_emails SET claimed_at = now() - interval '1 day'
  WHERE appointment_id IN (SELECT id FROM ao_visits);
END;
$body$;
RESET ROLE;

-- Card 7: the admin sends the link again: the confirmation for a confirmed
-- visit, the link to pay for a reservation; not again within five minutes,
-- not for a cancelled visit.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM public.centre_resend_visit_link((SELECT id FROM ao_visits WHERE name = 'paid'));
  IF (r.reference, r.kind) IS DISTINCT FROM ((SELECT reference FROM ao_visits WHERE name = 'paid'), 'confirmation'::text) THEN
    RAISE EXCEPTION 'AO: the confirmed visit''s link: %', row_to_json(r);
  END IF;
  SELECT * INTO r FROM public.centre_resend_visit_link((SELECT id FROM ao_visits WHERE name = 'reserved'));
  IF r.kind IS DISTINCT FROM 'reserved' THEN
    RAISE EXCEPTION 'AO: the reservation''s link: %', row_to_json(r);
  END IF;
END;
$body$;
RESET ROLE;
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  mail record;
BEGIN
  SELECT * INTO mail FROM public.claim_booking_email(
    (SELECT reference FROM ao_visits WHERE name = 'paid'), 'confirmation');
  IF mail.manage_token IS NULL THEN
    RAISE EXCEPTION 'AO: the confirmation could not go again';
  END IF;
END;
$body$;
RESET ROLE;
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF pg_temp.hint_of(format('SELECT public.centre_resend_visit_link(%L)',
       (SELECT id FROM ao_visits WHERE name = 'paid'))) <> 'recently_sent' THEN
    RAISE EXCEPTION 'AO: the link went twice in five minutes';
  END IF;
END;
$body$;
SET LOCAL ROLE service_role;
UPDATE public.booking_emails SET claimed_at = now() - interval '6 minutes'
WHERE appointment_id = (SELECT id FROM ao_visits WHERE name = 'paid');
RESET ROLE;
UPDATE public.appointments SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'client'
WHERE id = (SELECT id FROM ao_visits WHERE name = 'reserved');
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  IF pg_temp.hint_of(format('SELECT public.centre_resend_visit_link(%L)',
       (SELECT id FROM ao_visits WHERE name = 'reserved'))) <> 'nothing_to_send' THEN
    RAISE EXCEPTION 'AO: a link for a cancelled visit';
  END IF;
END;
$body$;
RESET ROLE;

-- Jan, another specialist, cannot; Anna can, for her own.
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
BEGIN
  BEGIN
    PERFORM public.centre_resend_visit_link((SELECT id FROM ao_visits WHERE name = 'paid'));
    RAISE EXCEPTION 'AO: Jan sent the link for Anna''s visit';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '{"sub":"71000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $body$
DECLARE
  r record;
BEGIN
  SELECT * INTO r FROM public.centre_resend_visit_link((SELECT id FROM ao_visits WHERE name = 'paid'));
  IF r.kind IS DISTINCT FROM 'confirmation' THEN
    RAISE EXCEPTION 'AO: Anna could not send her client the link';
  END IF;
END;
$body$;
RESET ROLE;

-- Card 8: the confirmation bounced: the history says so, once; a message
-- not about a visit changes nothing.
SET LOCAL ROLE service_role;
DO $body$
DECLARE
  v_id uuid := (SELECT id FROM ao_visits WHERE name = 'paid');
BEGIN
  IF public.mark_booking_email_bounced('msg_ao') IS DISTINCT FROM (SELECT reference FROM ao_visits WHERE name = 'paid') THEN
    RAISE EXCEPTION 'AO: the bounce was not about the visit';
  END IF;
  IF public.mark_booking_email_bounced('msg_ao') IS NOT NULL
     OR public.mark_booking_email_bounced('msg_newsletter') IS NOT NULL THEN
    RAISE EXCEPTION 'AO: a bounce counted twice, or for another e-mail';
  END IF;
  IF (SELECT array_agg(details ->> 'email') FROM public.appointment_events
      WHERE appointment_id = v_id AND kind = 'email_bounced') IS DISTINCT FROM ARRAY['confirmation'] THEN
    RAISE EXCEPTION 'AO: the history does not say the confirmation bounced';
  END IF;
END;
$body$;
RESET ROLE;
SET LOCAL ROLE anon;
DO $body$
BEGIN
  BEGIN
    PERFORM public.mark_booking_email_bounced('msg_ao');
    RAISE EXCEPTION 'AO: anon marked a bounce';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$body$;
RESET ROLE;

ROLLBACK;
