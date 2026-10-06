BEGIN;

-- The centre's own settings (Ustawienia, CMS): days it is closed, the
-- announcement bar on the site, its company details, the schedule grid and
-- the time after a visit. Everything is rolled back at the end; the DEV
-- closures and announcements are set aside inside the transaction so they
-- do not change what the test sees.

DELETE FROM public.centre_closures;
DELETE FROM public.site_announcements;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('72000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'domain-test-centre-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Centre","last_name":"Admin"}', now(), now(), false, false),
  ('72000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'domain-test-centre-anna@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Anna","last_name":"Centre"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('72000000-0000-4000-8000-000000000001', 'admin'),
  ('72000000-0000-4000-8000-000000000002', 'specialist');

UPDATE public.specialists SET public_slug = 'centre-test-anna', active = true, publicly_visible = true
WHERE user_id = '72000000-0000-4000-8000-000000000002';

INSERT INTO public.specialist_public_profiles (specialist_id, display_name, publication_status, published_at)
SELECT id, 'Anna Centre', 'published', now() FROM public.specialists
WHERE public_slug = 'centre-test-anna'
ON CONFLICT (specialist_id) DO UPDATE
SET publication_status = 'published', published_at = now();

INSERT INTO public.locations (name, slug, active, publicly_visible)
VALUES ('Centre Location', 'centre-test-location', true, true);

INSERT INTO public.rooms (location_id, name, slug, capacity, active)
SELECT id, 'Centre Room', 'centre-test-room', 2, true
FROM public.locations WHERE slug = 'centre-test-location';

INSERT INTO public.services (
  name, slug, category, default_duration_minutes, after_minutes,
  active, publicly_visible, booking_enabled
)
VALUES ('Centre Consultation', 'centre-test-consultation', 'consultation', 50, 10, true, true, true);

INSERT INTO public.specialist_services (
  specialist_id, service_id, active, price_minor, supports_in_person, supports_online
)
SELECT specialists.id, services.id, true, 25000, true, false
FROM public.specialists, public.services
WHERE specialists.public_slug = 'centre-test-anna'
  AND services.slug = 'centre-test-consultation';

UPDATE public.center_settings
SET booking_enabled = true, slot_step_minutes = 60, min_booking_lead_minutes = 60,
    max_booking_horizon_days = 60, hold_minutes = 10;

-- Next week's Monday and the one after, where the centre is.
CREATE TEMP TABLE centre_test AS
SELECT
  (date_trunc('week', now() AT TIME ZONE 'Europe/Warsaw')::date + 7) AS monday,
  (date_trunc('week', now() AT TIME ZONE 'Europe/Warsaw')::date + 14) AS next_monday,
  (now() AT TIME ZONE 'Europe/Warsaw')::date AS today,
  (SELECT id FROM public.specialists WHERE public_slug = 'centre-test-anna') AS anna_id,
  (SELECT id FROM public.rooms WHERE slug = 'centre-test-room') AS room_id;
GRANT SELECT ON centre_test TO authenticated, anon, service_role;

-- Anna: Mondays 9–12 in the room.
INSERT INTO public.specialist_availability_rules (
  specialist_id, recurrence, weekdays, starts_at, ends_at, valid_from, mode, room_id
)
SELECT anna_id, 'weekly', ARRAY[1]::smallint[], '09:00', '12:00', monday, 'in_person', room_id
FROM centre_test;

CREATE FUNCTION pg_temp.free_times(p_day date)
RETURNS text
LANGUAGE sql
AS $$
  SELECT coalesce(string_agg(to_char(starts_at AT TIME ZONE 'Europe/Warsaw', 'HH24:MI'), ' ' ORDER BY starts_at), '')
  FROM public.list_free_slots('centre-test-consultation', 'centre-test-anna', 'in_person', p_day, p_day);
$$;

CREATE FUNCTION pg_temp.at(p_day date, p_time time)
RETURNS timestamptz
LANGUAGE sql
AS $$ SELECT (p_day + p_time) AT TIME ZONE 'Europe/Warsaw'; $$;

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
EXCEPTION WHEN raise_exception OR check_violation THEN
  GET STACKED DIAGNOSTICS hint = PG_EXCEPTION_HINT;
  RETURN coalesce(hint, '');
END;
$$;

-- Whether a statement broke a check ('check' / 'denied' / '').
CREATE FUNCTION pg_temp.refusal_of(p_sql text)
RETURNS text
LANGUAGE plpgsql
AS $$
BEGIN
  EXECUTE p_sql;
  RETURN '';
EXCEPTION
  WHEN check_violation THEN RETURN 'check';
  WHEN insufficient_privilege THEN RETURN 'denied';
END;
$$;

GRANT EXECUTE ON FUNCTION pg_temp.free_times(date) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.at(date, time) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.hint_of(text) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION pg_temp.refusal_of(text) TO anon, authenticated, service_role;

-- A paid visit on Monday at 9 (booked while the centre is open).
CREATE TEMP TABLE centre_visit (id uuid, reference text);
GRANT ALL ON centre_visit TO service_role;
SET LOCAL ROLE service_role;
DO $$
DECLARE
  held record;
BEGIN
  SELECT * INTO held FROM public.hold_slot(
    'centre-test-consultation', 'centre-test-anna', 'in_person',
    pg_temp.at((SELECT monday FROM centre_test), '09:00'), p_client_key => 'visitor-centre');
  PERFORM public.save_booking_details(held.access_token, 'Ola Centrum', 'ola-centre@example.invalid',
    '600100200', NULL, true, true);
  PERFORM public.attach_checkout_session(held.access_token, 'cs_test_centre',
    now() + interval '30 minutes', 25000, 'PLN');
  PERFORM public.fulfill_checkout_session('cs_test_centre', true, 'pi_test_centre');
  INSERT INTO centre_visit
  SELECT id, reference FROM public.appointments WHERE reference = held.reference;
END;
$$;
RESET ROLE;

-- A: the time after a visit (the service's after_minutes) keeps the next
-- one away: 50 minutes and 10 after fit three in 9–12, 20 after only two.
DO $$
DECLARE
  t centre_test%ROWTYPE;
BEGIN
  SELECT * INTO t FROM centre_test;
  IF pg_temp.free_times(t.next_monday) <> '09:00 10:00 11:00' THEN
    RAISE EXCEPTION 'A: 10 minutes after: %', pg_temp.free_times(t.next_monday);
  END IF;
  UPDATE public.services SET after_minutes = 20 WHERE slug = 'centre-test-consultation';
  IF pg_temp.free_times(t.next_monday) <> '09:00 10:00' THEN
    RAISE EXCEPTION 'A: 20 minutes after: %', pg_temp.free_times(t.next_monday);
  END IF;
  UPDATE public.services SET after_minutes = 10 WHERE slug = 'centre-test-consultation';
  IF pg_temp.refusal_of($q$UPDATE public.services SET after_minutes = 121 WHERE slug = 'centre-test-consultation'$q$) <> 'check' THEN
    RAISE EXCEPTION 'A: more than two hours after a visit';
  END IF;
  -- The visit at 9 holds its time after it too: 10:00 is still free.
  IF pg_temp.free_times(t.monday) <> '10:00 11:00' THEN
    RAISE EXCEPTION 'A: around the booked visit: %', pg_temp.free_times(t.monday);
  END IF;
END;
$$;

-- B: closures. Only admins write them; specialists read them; nobody else.
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF pg_temp.refusal_of('SELECT 1 FROM public.centre_closures') <> 'denied' THEN
    RAISE EXCEPTION 'B: a visitor read the closures';
  END IF;
  IF pg_temp.refusal_of('SELECT public.visits_on_days(current_date, current_date)') <> 'denied' THEN
    RAISE EXCEPTION 'B: a visitor counted visits';
  END IF;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"72000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF pg_temp.refusal_of(format(
       'INSERT INTO public.centre_closures (starts_on, ends_on, reason) VALUES (%L, %L, %L)',
       (SELECT monday FROM centre_test), (SELECT monday FROM centre_test), 'Urlop')) <> 'denied' THEN
    RAISE EXCEPTION 'B: a specialist closed the centre';
  END IF;
  IF public.visits_on_days((SELECT monday FROM centre_test), (SELECT monday FROM centre_test)) IS NOT NULL THEN
    RAISE EXCEPTION 'B: a specialist counted the centre''s visits';
  END IF;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"72000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  t centre_test%ROWTYPE;
  on_monday integer;
BEGIN
  SELECT * INTO t FROM centre_test;
  -- The admin's warning before closing a day with visits on it (the DEV
  -- data has visits of its own: ours is one more than without it).
  on_monday := public.visits_on_days(t.monday, t.monday);
  IF on_monday < 1 THEN
    RAISE EXCEPTION 'B: visits on the days';
  END IF;
  IF pg_temp.refusal_of(format(
       'INSERT INTO public.centre_closures (starts_on, ends_on, reason) VALUES (%L, %L, %L)',
       t.monday, t.monday - 1, 'Wstecz')) <> 'check' THEN
    RAISE EXCEPTION 'B: a closure ending before it starts';
  END IF;
  IF pg_temp.refusal_of(format(
       'INSERT INTO public.centre_closures (starts_on, ends_on, reason) VALUES (%L, %L, %L)',
       t.monday, t.monday, '')) <> 'check' THEN
    RAISE EXCEPTION 'B: a closure without a reason';
  END IF;
  -- Closing a day with a visit on it: the visit stays.
  INSERT INTO public.centre_closures (starts_on, ends_on, reason) VALUES (t.monday, t.monday, 'Szkolenie');
  IF public.visits_on_days(t.monday, t.monday) <> on_monday THEN
    RAISE EXCEPTION 'B: the visits on a closed day went';
  END IF;
END;
$$;
RESET ROLE;

-- Ours among them: cancelled, it is no longer counted (the admin still
-- asking; the visit changed past their functions, then put back).
DO $$
DECLARE
  v_day date := (SELECT monday FROM centre_test);
  on_monday integer := public.visits_on_days((SELECT monday FROM centre_test), (SELECT monday FROM centre_test));
BEGIN
  UPDATE public.appointments SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'centre'
  WHERE id = (SELECT id FROM centre_visit);
  IF public.visits_on_days(v_day, v_day) <> on_monday - 1 THEN
    RAISE EXCEPTION 'B: a cancelled visit counted';
  END IF;
  UPDATE public.appointments SET status = 'confirmed', cancelled_at = NULL, cancelled_by = NULL
  WHERE id = (SELECT id FROM centre_visit);
END;
$$;

SELECT set_config('request.jwt.claims', '{"sub":"72000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.centre_closures WHERE reason = 'Szkolenie') THEN
    RAISE EXCEPTION 'B: a specialist does not see the closed days';
  END IF;
END;
$$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);

-- C: a closed day offers no time and takes no visit, neither new nor moved
-- there; a visit already there may still change otherwise.
SET LOCAL ROLE anon;
DO $$
BEGIN
  IF pg_temp.free_times((SELECT monday FROM centre_test)) <> '' THEN
    RAISE EXCEPTION 'C: time offered on a closed day: %', pg_temp.free_times((SELECT monday FROM centre_test));
  END IF;
  IF pg_temp.free_times((SELECT next_monday FROM centre_test)) <> '09:00 10:00 11:00' THEN
    RAISE EXCEPTION 'C: an open day lost its times';
  END IF;
END;
$$;
RESET ROLE;

INSERT INTO public.centre_closures (starts_on, ends_on, reason)
SELECT next_monday, next_monday + 2, 'Urlop zespołu' FROM centre_test;

SET LOCAL ROLE service_role;
DO $$
BEGIN
  IF pg_temp.hint_of(format(
       'SELECT public.hold_slot(%L, %L, %L, %L, %L)',
       'centre-test-consultation', 'centre-test-anna', 'in_person',
       pg_temp.at((SELECT next_monday FROM centre_test), '10:00'), 'visitor-closed')) <> 'slot_unavailable' THEN
    RAISE EXCEPTION 'C: held a time on a closed day';
  END IF;
END;
$$;
RESET ROLE;

DO $$
DECLARE
  t centre_test%ROWTYPE;
BEGIN
  SELECT * INTO t FROM centre_test;
  IF pg_temp.hint_of(format(
       'UPDATE public.appointments SET during = tstzrange(%L, %L) WHERE id = %L',
       pg_temp.at(t.next_monday, '10:00'), pg_temp.at(t.next_monday, '10:50'),
       (SELECT id FROM centre_visit))) <> 'centre_closed' THEN
    RAISE EXCEPTION 'C: a visit moved onto a closed day';
  END IF;
  -- The visit on the day closed after it was booked still changes otherwise.
  UPDATE public.appointments SET client_notes = 'Przełożyć' WHERE id = (SELECT id FROM centre_visit);
END;
$$;

-- D: the announcement bar. The site reads only today's, the latest
-- starting; admins manage them; links stay on the site or go to https.
SELECT set_config('request.jwt.claims', '{"sub":"72000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  t centre_test%ROWTYPE;
BEGIN
  SELECT * INTO t FROM centre_test;
  INSERT INTO public.site_announcements (message, starts_on, ends_on)
  VALUES ('Starsze ogłoszenie', t.today - 3, t.today + 3);
  INSERT INTO public.site_announcements (message, link_label, link_href, starts_on, ends_on)
  VALUES ('Nowe godziny', 'Szczegóły', '/kontakt', t.today - 1, t.today);
  INSERT INTO public.site_announcements (message, starts_on, ends_on)
  VALUES ('Jeszcze nie teraz', t.today + 1, t.today + 5);

  IF pg_temp.refusal_of(format(
       'INSERT INTO public.site_announcements (message, link_label, starts_on, ends_on) VALUES (%L, %L, %L, %L)',
       'Bez adresu', 'Zobacz', t.today, t.today)) <> 'check' THEN
    RAISE EXCEPTION 'D: a link label without an address';
  END IF;
  IF pg_temp.refusal_of(format(
       'INSERT INTO public.site_announcements (message, link_label, link_href, starts_on, ends_on) VALUES (%L, %L, %L, %L, %L)',
       'Zły link', 'Zobacz', 'javascript:alert(1)', t.today, t.today)) <> 'check' THEN
    RAISE EXCEPTION 'D: a script link';
  END IF;
  IF pg_temp.refusal_of(format(
       'INSERT INTO public.site_announcements (message, link_label, link_href, starts_on, ends_on) VALUES (%L, %L, %L, %L, %L)',
       'Obcy link', 'Zobacz', '//example.com', t.today, t.today)) <> 'check' THEN
    RAISE EXCEPTION 'D: a link to another site without https';
  END IF;
  IF pg_temp.refusal_of(format(
       'INSERT INTO public.site_announcements (message, link_label, link_href, starts_on, ends_on) VALUES (%L, %L, %L, %L, %L)',
       'Zwykły http', 'Zobacz', 'http://example.com', t.today, t.today)) <> 'check' THEN
    RAISE EXCEPTION 'D: a plain http link';
  END IF;
  IF pg_temp.refusal_of(format(
       'INSERT INTO public.site_announcements (message, starts_on, ends_on) VALUES (%L, %L, %L)',
       '   ', t.today, t.today)) <> 'check' THEN
    RAISE EXCEPTION 'D: an empty announcement';
  END IF;
  IF pg_temp.refusal_of(format(
       'INSERT INTO public.site_announcements (message, starts_on, ends_on) VALUES (%L, %L, %L)',
       'Wstecz', t.today, t.today - 1)) <> 'check' THEN
    RAISE EXCEPTION 'D: an announcement ending before it starts';
  END IF;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
DECLARE
  shown record;
BEGIN
  SELECT * INTO shown FROM public.current_announcement();
  IF shown.message IS DISTINCT FROM 'Nowe godziny' OR shown.link_href IS DISTINCT FROM '/kontakt'
     OR shown.ends_on IS DISTINCT FROM (SELECT today FROM centre_test) THEN
    RAISE EXCEPTION 'D: the announcement shown today: %', row_to_json(shown);
  END IF;
  IF pg_temp.refusal_of('SELECT 1 FROM public.site_announcements') <> 'denied' THEN
    RAISE EXCEPTION 'D: a visitor read every announcement';
  END IF;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '{"sub":"72000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.site_announcements) THEN
    RAISE EXCEPTION 'D: a specialist read the announcements';
  END IF;
  IF pg_temp.refusal_of(format(
       'INSERT INTO public.site_announcements (message, starts_on, ends_on) VALUES (%L, %L, %L)',
       'Od specjalistki', current_date, current_date)) <> 'denied' THEN
    RAISE EXCEPTION 'D: a specialist posted an announcement';
  END IF;
END;
$$;
RESET ROLE;
SELECT set_config('request.jwt.claims', '', true);

-- E: the company, as the law wants it on the site: anyone reads it; NIP
-- has 10 digits, REGON 9 or 14.
DO $$
BEGIN
  UPDATE public.center_settings
  SET legal_name = 'Kolor Sensu sp. z o.o.', tax_id = '5260250274', regon = '012345678',
      registered_address = 'ul. Testowa 1, 00-001 Warszawa'
  WHERE id = 1;
  IF pg_temp.refusal_of($q$UPDATE public.center_settings SET tax_id = '526-025-02-74' WHERE id = 1$q$) <> 'check' THEN
    RAISE EXCEPTION 'E: a NIP with dashes';
  END IF;
  IF pg_temp.refusal_of($q$UPDATE public.center_settings SET regon = '1234567890' WHERE id = 1$q$) <> 'check' THEN
    RAISE EXCEPTION 'E: a REGON of 10 digits';
  END IF;
  UPDATE public.center_settings SET regon = '01234567890123' WHERE id = 1;
END;
$$;

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF (SELECT (legal_name, tax_id, regon) FROM public.company_details())
     IS DISTINCT FROM ('Kolor Sensu sp. z o.o.'::text, '5260250274'::text, '01234567890123'::text) THEN
    RAISE EXCEPTION 'E: the company on the site';
  END IF;
END;
$$;
RESET ROLE;

-- F: reminders: a visit's from 1 hour to a week before, the payment's from
-- 7 hours (after the last call at 6) to a week; none is allowed.
DO $$
BEGIN
  UPDATE public.center_settings SET visit_reminder_hours = NULL, payment_reminder_hours = NULL WHERE id = 1;
  UPDATE public.center_settings SET visit_reminder_hours = 1, payment_reminder_hours = 7 WHERE id = 1;
  IF pg_temp.refusal_of('UPDATE public.center_settings SET visit_reminder_hours = 0 WHERE id = 1') <> 'check'
     OR pg_temp.refusal_of('UPDATE public.center_settings SET visit_reminder_hours = 169 WHERE id = 1') <> 'check' THEN
    RAISE EXCEPTION 'F: a visit reminder out of range';
  END IF;
  IF pg_temp.refusal_of('UPDATE public.center_settings SET payment_reminder_hours = 6 WHERE id = 1') <> 'check'
     OR pg_temp.refusal_of('UPDATE public.center_settings SET payment_reminder_hours = 169 WHERE id = 1') <> 'check' THEN
    RAISE EXCEPTION 'F: a payment reminder out of range';
  END IF;
END;
$$;

-- G: the grid. Times must lie on it, and it changes only when everything
-- already set fits the new one.
DO $$
DECLARE
  t centre_test%ROWTYPE;
BEGIN
  SELECT * INTO t FROM centre_test;
  IF pg_temp.hint_of(format(
       'INSERT INTO public.specialist_availability_rules (specialist_id, recurrence, weekdays, starts_at, ends_at, valid_from, mode, room_id) VALUES (%L, %L, %L, %L, %L, %L, %L, %L)',
       t.anna_id, 'weekly', '{3}', '09:30', '11:00', t.monday, 'in_person', t.room_id)) <> 'off_grid' THEN
    RAISE EXCEPTION 'G: hours off the grid';
  END IF;
  UPDATE public.center_settings SET slot_step_minutes = 30 WHERE id = 1;
  INSERT INTO public.specialist_availability_rules (
    specialist_id, recurrence, weekdays, starts_at, ends_at, valid_from, mode, room_id
  ) VALUES (t.anna_id, 'weekly', ARRAY[3]::smallint[], '09:30', '11:00', t.monday, 'in_person', t.room_id);
  IF pg_temp.hint_of('UPDATE public.center_settings SET slot_step_minutes = 60 WHERE id = 1') <> 'grid_misfit' THEN
    RAISE EXCEPTION 'G: the grid changed under hours that do not fit it';
  END IF;
END;
$$;

ROLLBACK;
