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

ROLLBACK;
