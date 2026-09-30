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

UPDATE public.specialists SET public_slug = 'booking-test-anna', active = true
WHERE user_id = '71000000-0000-4000-8000-000000000002';
UPDATE public.specialists SET public_slug = 'booking-test-jan', active = true
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

INSERT INTO public.services (name, slug, category, default_duration_minutes, active, publicly_visible, booking_enabled)
VALUES ('Booking Consultation', 'booking-test-consultation', 'consultation', 50, true, true, true);

INSERT INTO public.specialist_services (
  specialist_id, service_id, active, accepting_new_clients, price_minor,
  supports_in_person, supports_online
)
SELECT specialists.id, services.id, true, true, 25000, true, true
FROM public.specialists, public.services
WHERE specialists.public_slug IN ('booking-test-anna', 'booking-test-jan')
  AND services.slug = 'booking-test-consultation';

-- The centre: bookings on, a 60-minute grid, 10 minutes between visits,
-- an hour's notice, 60 days ahead.
UPDATE public.center_settings
SET booking_enabled = true, slot_step_minutes = 60,
    default_visit_buffer_minutes = 10, min_booking_lead_minutes = 60,
    max_booking_horizon_days = 60, hold_minutes = 10;

-- Next week's Monday and Tuesday, where the centre is.
CREATE TEMP TABLE booking_test AS
SELECT
  (date_trunc('week', now() AT TIME ZONE 'Europe/Warsaw')::date + 7) AS monday,
  (date_trunc('week', now() AT TIME ZONE 'Europe/Warsaw')::date + 8) AS tuesday,
  (SELECT id FROM public.specialists WHERE public_slug = 'booking-test-anna') AS anna_id,
  (SELECT id FROM public.specialists WHERE public_slug = 'booking-test-jan') AS jan_id,
  (SELECT id FROM public.rooms WHERE slug = 'booking-test-room') AS room_id;
GRANT SELECT ON booking_test TO authenticated, anon, service_role;

-- Anna: Monday 9–12 in the room, Monday 13–15 online, Tuesday 9–11:30
-- hybrid (in the room, or online from it).
INSERT INTO public.specialist_availability_rules (
  specialist_id, recurrence, weekdays, starts_at, ends_at, valid_from, mode, room_id
)
SELECT anna_id, 'weekly'::public.availability_recurrence, ARRAY[1]::smallint[], '09:00'::time, '12:00'::time, monday, 'in_person'::public.availability_mode, room_id FROM booking_test
UNION ALL
SELECT anna_id, 'weekly', ARRAY[1]::smallint[], '13:00', '15:00', monday, 'online', NULL FROM booking_test
UNION ALL
SELECT anna_id, 'weekly', ARRAY[2]::smallint[], '09:00', '11:30', monday, 'hybrid', room_id FROM booking_test;

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
  IF held.reference !~ ('^KS-' || to_char(t.monday, 'YYYYMMDD') || '-[0-9]{4}$') THEN
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
  VALUES (t.room_id, t.monday, 'blocked_interval', '11:30', '12:00');
  IF pg_temp.free_times('in_person', t.monday) <> '09:00 10:00' THEN
    RAISE EXCEPTION 'J: room blocked for a while: %', pg_temp.free_times('in_person', t.monday);
  END IF;
  DELETE FROM public.room_availability_exceptions WHERE room_id = t.room_id;

  -- K: not bookable: the offer, the form, the service, the specialist, the centre.
  UPDATE public.specialist_services SET supports_online = false WHERE specialist_id = t.anna_id;
  IF pg_temp.free_times('online', t.monday) <> '' THEN RAISE EXCEPTION 'K: online not offered'; END IF;
  UPDATE public.specialist_services SET supports_online = true, accepting_new_clients = false
  WHERE specialist_id = t.anna_id;
  IF pg_temp.free_times('online', t.monday) <> '' THEN RAISE EXCEPTION 'K: not accepting'; END IF;
  UPDATE public.specialist_services SET accepting_new_clients = true WHERE specialist_id = t.anna_id;
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
  UPDATE public.specialist_services SET accepting_new_clients = false
  WHERE specialist_id = (SELECT anna_id FROM booking_test);
  IF EXISTS (SELECT 1 FROM public.list_bookable_offers() WHERE specialist_slug = 'booking-test-anna') THEN
    RAISE EXCEPTION 'N: an offer not taking new clients was listed';
  END IF;
  UPDATE public.specialist_services SET accepting_new_clients = true
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
  IF (SELECT count(*) FROM public.appointments WHERE reference LIKE 'KS-%') < 3 THEN
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
    PERFORM public.save_booking_details(held.access_token, 'Jan Kowalski',
      'jan@example.com', '600100200', NULL, true, false);
    RAISE EXCEPTION 'P: saved without the privacy consent';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'P:%' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'consent_required' THEN RAISE EXCEPTION 'P: expected consent_required, got %', hint; END IF;
  END;
  -- Details the database would not keep.
  BEGIN
    PERFORM public.save_booking_details(held.access_token, 'Jan Kowalski',
      'not-an-email', '600100200', NULL, true, true);
    RAISE EXCEPTION 'P: saved a wrong e-mail';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM LIKE 'P:%' THEN RAISE; END IF;
    GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
    IF hint <> 'invalid_details' THEN RAISE EXCEPTION 'P: expected invalid_details, got %', hint; END IF;
  END;

  PERFORM public.save_booking_details(held.access_token, 'Jan Kowalski',
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
    PERFORM public.save_booking_details(held.access_token, 'Jan Kowalski',
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
    PERFORM public.save_booking_details('x', 'a', 'a@b.pl', '600100200', NULL, true, true);
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
  PERFORM public.save_booking_details(held.access_token, 'Ewa Test', 'ewa@example.com',
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
  PERFORM public.save_booking_details(held.access_token, 'Ola Test', 'ola@example.com',
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
  PERFORM public.save_booking_details(held.access_token, 'Piotr Test', 'piotr@example.com',
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

  -- Paid after the hold lapsed, the time still free: confirmed anyway.
  UPDATE public.appointments SET status = 'cancelled' WHERE id = other.appointment_id;
  outcome := public.fulfill_checkout_session('cs_test_3', true, 'pi_test_3');
  IF outcome <> 'confirmed' THEN RAISE EXCEPTION 'Q: a free lapsed time gave %', outcome; END IF;

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
  PERFORM public.save_booking_details(held.access_token, 'Marta Test', 'marta@example.com',
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
AS $
DECLARE
  held record;
  mail record;
BEGIN
  SELECT * INTO held FROM public.hold_slot(
    'booking-test-consultation', 'booking-test-anna', 'in_person',
    pg_temp.at((SELECT monday + 2 FROM booking_test), p_time), p_client_key => 'visitor-' || p_name
  );
  PERFORM public.save_booking_details(held.access_token, 'Ola Test', 'ola@example.com',
    '600100200', NULL, true, true);
  PERFORM public.attach_checkout_session(held.access_token, 'cs_test_' || p_name,
    now() + interval '30 minutes', 25000, 'PLN');
  PERFORM public.fulfill_checkout_session('cs_test_' || p_name, true, 'pi_test_' || p_name);
  SELECT * INTO mail FROM public.claim_booking_email(held.reference, 'confirmation');
  INSERT INTO s_visits VALUES (p_name, held.reference, held.access_token, mail.manage_token);
END;
$;

-- The hint of what a statement raised ('' when it raised nothing).
CREATE FUNCTION pg_temp.hint_of(p_sql text)
RETURNS text
LANGUAGE plpgsql
AS $
DECLARE
  hint text;
BEGIN
  EXECUTE p_sql;
  RETURN '';
EXCEPTION WHEN raise_exception THEN
  GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
  RETURN hint;
END;
$;

-- Wednesday's free times for anyone, as local `HH:MM`.
CREATE FUNCTION pg_temp.wednesday_times()
RETURNS text
LANGUAGE sql
AS $
  SELECT coalesce(string_agg(to_char(starts_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI'), ' ' ORDER BY starts_at), '')
  FROM public.list_free_slots('booking-test-consultation', 'booking-test-anna', 'in_person',
    (SELECT monday + 2 FROM booking_test), (SELECT monday + 2 FROM booking_test));
$;

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
  FROM public.search_visits(p_from => pg_temp.at(week, '00:00'), p_limit => 1);
  IF total < 2 THEN RAISE EXCEPTION 'U: the total count'; END IF;
  IF (SELECT count(*) FROM public.search_visits(p_from => pg_temp.at(week, '00:00'), p_limit => 1)) <> 1 THEN
    RAISE EXCEPTION 'U: a page of one';
  END IF;
  -- A search is literal: "%" finds the name with a per cent sign only.
  IF (SELECT array_agg(reference) FROM public.search_visits(p_query => '100%'))
     IS DISTINCT FROM ARRAY[(SELECT reference FROM s_visits WHERE name = 'u2')] THEN
    RAISE EXCEPTION 'U: a literal search';
  END IF;
  IF EXISTS (SELECT 1 FROM public.search_visits(p_query => '_ofia')) THEN
    RAISE EXCEPTION 'U: "_" matched as a wildcard';
  END IF;
  -- Sorted as asked: the latest first.
  SELECT reference INTO first FROM public.search_visits(
    p_query => 'Test', p_from => pg_temp.at(week + 2, '00:00'),
    p_to => pg_temp.at(week + 3, '00:00'), p_statuses => ARRAY['confirmed'],
    p_desc => true, p_limit => 1);
  IF first <> (SELECT reference FROM s_visits WHERE name = 'u2') THEN
    RAISE EXCEPTION 'U: sorting by time, latest first: %', first;
  END IF;
  -- Only allowed sorts, statuses and page sizes.
  BEGIN
    PERFORM public.search_visits(p_sort => 'client_email; DROP TABLE x');
    RAISE EXCEPTION 'U: an unknown sort';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.search_visits(p_statuses => ARRAY['held']);
    RAISE EXCEPTION 'U: holds as a status';
  EXCEPTION WHEN invalid_parameter_value THEN NULL;
  END;
  BEGIN
    PERFORM public.search_visits(p_limit => 1000);
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
  IF EXISTS (SELECT 1 FROM public.search_visits(p_query => 'Test')) THEN
    RAISE EXCEPTION 'U: Jan found Anna''s visits';
  END IF;
END;
$body$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $body$
BEGIN
  PERFORM public.search_visits();
  RAISE EXCEPTION 'U: anon searched visits';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$body$;
RESET ROLE;

ROLLBACK;
