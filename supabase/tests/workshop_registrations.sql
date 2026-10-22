-- Workshop registrations (20261023080000): a published workshop blocks its
-- leaders and room (and a visit already there stops it); a guest holds a
-- seat, gives details, pays later or (free) confirms; a full workshop has
-- a waitlist, whose first person is offered a freed seat; refunds are full
-- until seven days before, later only when the waitlist takes the seat,
-- and full when the centre cancels; holds, offers and unpaid seats run
-- out; enough paid seats confirm the workshop; only admins and leaders
-- read registrations. Everything is rolled back at the end.

BEGIN;

-- Runs a statement; returns 'ok', or the error's hint (else its code).
CREATE FUNCTION pg_temp.hint_of(p_sql text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_hint text;
BEGIN
  EXECUTE p_sql;
  RETURN 'ok';
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  RETURN coalesce(nullif(v_hint, ''), SQLSTATE);
END;
$$;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('7b000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'ws-reg-admin@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Admin"}', now(), now(), false, false),
  ('7b000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'ws-reg-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Leader"}', now(), now(), false, false),
  ('7b000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'ws-reg-coleader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Coleader"}', now(), now(), false, false),
  ('7b000000-0000-4000-8000-000000000004', 'authenticated', 'authenticated',
    'ws-reg-other@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Other"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('7b000000-0000-4000-8000-000000000001', 'admin'),
  ('7b000000-0000-4000-8000-000000000002', 'specialist'),
  ('7b000000-0000-4000-8000-000000000003', 'specialist'),
  ('7b000000-0000-4000-8000-000000000004', 'specialist');

UPDATE public.specialists SET active = true
WHERE user_id IN (
  '7b000000-0000-4000-8000-000000000002', '7b000000-0000-4000-8000-000000000003',
  '7b000000-0000-4000-8000-000000000004'
);

INSERT INTO public.locations (name, slug, active, publicly_visible)
VALUES ('Ws Reg Location', 'ws-reg-loc', true, true);
INSERT INTO public.rooms (location_id, name, slug, active, publicly_visible)
SELECT id, 'Ws Reg Room', 'ws-reg-room', true, true
FROM public.locations WHERE slug = 'ws-reg-loc';

INSERT INTO public.services (name, slug, category, default_duration_minutes, active, publicly_visible, booking_enabled)
VALUES ('Ws Reg Consultation', 'ws-reg-consultation', 'consultation', 50, true, true, true);
INSERT INTO public.specialist_services (specialist_id, service_id, active, price_minor, supports_in_person, supports_online)
SELECT specialist.id, service.id, true, 20000, true, true
FROM public.specialists AS specialist, public.services AS service
WHERE specialist.user_id IN ('7b000000-0000-4000-8000-000000000002', '7b000000-0000-4000-8000-000000000004')
  AND service.slug = 'ws-reg-consultation';

CREATE TEMP TABLE ws AS
SELECT
  (SELECT id FROM public.specialists WHERE user_id = '7b000000-0000-4000-8000-000000000002') AS leader,
  (SELECT id FROM public.specialists WHERE user_id = '7b000000-0000-4000-8000-000000000003') AS co_leader,
  (SELECT id FROM public.specialists WHERE user_id = '7b000000-0000-4000-8000-000000000004') AS other,
  (SELECT id FROM public.locations WHERE slug = 'ws-reg-loc') AS loc,
  (SELECT id FROM public.rooms WHERE slug = 'ws-reg-room') AS room,
  ((current_date + 30) + time '17:00') AT TIME ZONE 'Europe/Warsaw' AS t30,
  ((current_date + 40) + time '17:00') AT TIME ZONE 'Europe/Warsaw' AS t40,
  ((current_date + 45) + time '17:00') AT TIME ZONE 'Europe/Warsaw' AS t45,
  ((current_date + 3) + time '17:00') AT TIME ZONE 'Europe/Warsaw' AS t3;
GRANT SELECT ON ws TO authenticated, anon;

CREATE TEMP TABLE tokens (name text PRIMARY KEY, token text NOT NULL);
GRANT SELECT ON tokens TO authenticated, anon;

-- Visits the later workshops run into: the other specialist in the room
-- on day 40, the leader online on day 45.
INSERT INTO public.appointments (
  reference, specialist_id, service_id, specialist_service_id, mode, room_id,
  during, buffer_minutes, duration_minutes, price_minor, currency_code,
  status, access_token_hash, client_name, client_email,
  terms_accepted_at, privacy_accepted_at, confirmed_at
)
SELECT visit.ref, offer.specialist_id, offer.service_id, offer.id, visit.mode,
  CASE WHEN visit.mode = 'in_person' THEN ws.room END,
  tstzrange(visit.at, visit.at + interval '50 minutes'), 10, 50, 20000, 'PLN',
  'confirmed', extensions.digest(visit.ref, 'sha256'), 'Gość Wizyty',
  'ws-visit@example.invalid', now(), now(), now()
FROM ws
CROSS JOIN LATERAL (VALUES
  ('WS-VISIT-1', ws.other, 'in_person'::public.visit_mode, ws.t40),
  ('WS-VISIT-2', ws.leader, 'online'::public.visit_mode, ws.t45)
) AS visit(ref, specialist_id, mode, at)
JOIN public.specialist_services AS offer ON offer.specialist_id = visit.specialist_id;

-- ------------------------------------------------------------ the admin

SELECT set_config('request.jwt.claims',
  '{"sub":"7b000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  f ws%ROWTYPE;
  v_main uuid;
  v_rows integer;
BEGIN
  SELECT * INTO f FROM ws;

  -- A: a draft blocks nothing; once published, both leaders and the room
  -- (widened to the hour grid: 17:00–19:30 takes 17:00–20:00).
  INSERT INTO public.workshops (
    slug, title, specialist_id, location_id, room_id, modality, starts_at,
    ends_at, price_minor, capacity, min_participants, registration_enabled
  )
  VALUES (
    'ws-reg-main', 'Warsztat główny', f.leader, f.loc, f.room, 'in_person',
    f.t30, f.t30 + interval '150 minutes', 10000, 2, 2, true
  )
  RETURNING id INTO v_main;
  INSERT INTO public.workshop_co_leaders (workshop_id, specialist_id) VALUES (v_main, f.co_leader);
  IF EXISTS (SELECT 1 FROM public.specialist_time_off WHERE workshop_id = v_main) THEN
    RAISE EXCEPTION 'A: a draft blocked its leaders';
  END IF;
  UPDATE public.workshops SET status = 'published' WHERE id = v_main;
  IF (SELECT count(*) FROM public.specialist_time_off WHERE workshop_id = v_main) <> 2 THEN
    RAISE EXCEPTION 'A: the published workshop did not block both leaders';
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM public.room_availability_exceptions
    WHERE workshop_id = v_main AND type = 'blocked_interval'
      AND starts_at = time '17:00' AND ends_at = time '20:00'
  ) THEN
    RAISE EXCEPTION 'A: the room was not blocked on the grid';
  END IF;

  -- B: the blocks change only with the workshop.
  IF pg_temp.hint_of(format('SELECT public.delete_time_off(%L)',
      (SELECT id FROM public.specialist_time_off WHERE workshop_id = v_main LIMIT 1))) <> 'workshop_block' THEN
    RAISE EXCEPTION 'B: a workshop''s time off was deleted';
  END IF;
  DELETE FROM public.room_availability_exceptions WHERE workshop_id = v_main;
  GET DIAGNOSTICS v_rows = ROW_COUNT;
  IF v_rows <> 0 THEN
    RAISE EXCEPTION 'B: an admin deleted a workshop''s room block';
  END IF;

  -- C: a room with a visit, D: a leader with a visit, E: a leader with
  -- another workshop are refused.
  IF pg_temp.hint_of(format(
    $sql$INSERT INTO public.workshops (slug, title, specialist_id, location_id, room_id, modality, starts_at, ends_at, price_minor, capacity, status)
      VALUES ('ws-reg-room-busy', 'Sala zajęta', %L, %L, %L, 'in_person', %L, %L, 0, 5, 'published')$sql$,
    f.co_leader, f.loc, f.room, f.t40, f.t40 + interval '1 hour')) <> 'room_busy' THEN
    RAISE EXCEPTION 'C: a workshop took a room with a visit';
  END IF;
  IF pg_temp.hint_of(format(
    $sql$INSERT INTO public.workshops (slug, title, specialist_id, modality, starts_at, ends_at, price_minor, capacity, status)
      VALUES ('ws-reg-leader-busy', 'Prowadzący zajęty', %L, 'online', %L, %L, 0, 5, 'published')$sql$,
    f.leader, f.t45, f.t45 + interval '1 hour')) <> 'specialist_busy' THEN
    RAISE EXCEPTION 'D: a workshop took a leader with a visit';
  END IF;
  IF pg_temp.hint_of(format(
    $sql$INSERT INTO public.workshops (slug, title, specialist_id, modality, starts_at, ends_at, price_minor, capacity, status)
      VALUES ('ws-reg-leader-twice', 'Dwa naraz', %L, 'online', %L, %L, 0, 5, 'published')$sql$,
    f.co_leader, f.t30 + interval '1 hour', f.t30 + interval '2 hours')) <> 'specialist_away' THEN
    RAISE EXCEPTION 'E: a co-leader led two workshops at once';
  END IF;

  -- F: the centre cannot book a visit into the workshop's hours.
  IF pg_temp.hint_of(format(
    'SELECT public.centre_book_visit(%L, %L, %L, NULL, %L, %L, NULL, NULL)',
    (SELECT id FROM public.specialist_services WHERE specialist_id = f.leader),
    'online', f.t30 + interval '1 hour', 'Klient', 'ws-client@example.invalid')) <> 'time_off' THEN
    RAISE EXCEPTION 'F: a visit was booked into a workshop';
  END IF;

  -- Two short online workshops, three days ahead: free (one seat) and
  -- paid (50 zł, one seat), with a meeting link on the free one.
  INSERT INTO public.workshops (
    slug, title, specialist_id, modality, starts_at, ends_at, price_minor,
    capacity, registration_enabled, status
  )
  VALUES
    ('ws-reg-free', 'Warsztat bezpłatny', f.other, 'online', f.t3, f.t3 + interval '1 hour', 0, 1, true, 'published'),
    ('ws-reg-soon', 'Warsztat za trzy dni', f.co_leader, 'online', f.t3 + interval '2 hours', f.t3 + interval '3 hours', 5000, 1, true, 'published');
  INSERT INTO public.workshop_online_links (workshop_id, meeting_url)
  SELECT id, 'https://meet.example.invalid/ws-reg' FROM public.workshops WHERE slug = 'ws-reg-free';
  IF pg_temp.hint_of($sql$INSERT INTO public.workshop_online_links (workshop_id, meeting_url)
      SELECT id, 'http://insecure.example.invalid' FROM public.workshops WHERE slug = 'ws-reg-soon'$sql$) <> '23514' THEN
    RAISE EXCEPTION 'A: a link without https was accepted';
  END IF;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ guests

SET LOCAL ROLE anon;
DO $$
BEGIN
  IF pg_temp.hint_of($sql$SELECT public.hold_workshop_seat('ws-reg-main', 'visitor-anon-1')$sql$) <> '42501' THEN
    RAISE EXCEPTION 'G: a visitor called the hold directly';
  END IF;
END;
$$;
RESET ROLE;

DO $$
DECLARE
  v_token text;
  v_due timestamptz;
  v_seat record;
BEGIN
  -- G: hold, details, pay later (due seven days before).
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-reg-main', 'visitor-key-1');
  INSERT INTO tokens VALUES ('r1', v_token);
  IF pg_temp.hint_of(format('SELECT public.reserve_workshop_seat(%L)', v_token)) <> 'details_required' THEN
    RAISE EXCEPTION 'G: a seat was reserved without details';
  END IF;
  IF pg_temp.hint_of(format(
    'SELECT public.save_workshop_registration_details(%L, %L, %L, NULL, NULL, true, false)',
    v_token, 'Anna', 'anna@example.invalid')) <> 'consent_required' THEN
    RAISE EXCEPTION 'G: details were saved without the privacy policy';
  END IF;
  PERFORM public.save_workshop_registration_details(v_token, 'Anna Nowak', ' Anna@Example.invalid ', '500600700', NULL, true, true);
  SELECT payment_due_at INTO v_due FROM public.reserve_workshop_seat(v_token);
  IF v_due <> (SELECT t30 FROM ws) - interval '7 days' THEN
    RAISE EXCEPTION 'G: the payment was not due seven days before';
  END IF;

  -- The second seat: the same e-mail is refused; a paid seat is not free.
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-reg-main', 'visitor-key-2');
  INSERT INTO tokens VALUES ('r2', v_token);
  IF pg_temp.hint_of(format(
    'SELECT public.save_workshop_registration_details(%L, %L, %L, NULL, NULL, true, true)',
    v_token, 'Druga Anna', 'anna@example.invalid')) <> 'already_registered' THEN
    RAISE EXCEPTION 'G: one e-mail registered twice';
  END IF;
  PERFORM public.save_workshop_registration_details(v_token, 'Ola', 'ola@example.invalid', NULL, NULL, true, true);
  IF pg_temp.hint_of(format('SELECT public.confirm_free_workshop_seat(%L)', v_token)) <> 'payment_required' THEN
    RAISE EXCEPTION 'G: a paid seat was confirmed for free';
  END IF;
  -- (Paid by card: the payment PR confirms it like this.)
  UPDATE public.workshop_registrations
  SET status = 'confirmed', paid_minor = 10000, confirmed_at = now(), hold_expires_at = NULL
  WHERE access_token_hash = extensions.digest(v_token, 'sha256');

  -- H: full: no third hold; the waitlist instead (not for a known e-mail).
  IF pg_temp.hint_of($sql$SELECT public.hold_workshop_seat('ws-reg-main', 'visitor-key-3')$sql$) <> 'full' THEN
    RAISE EXCEPTION 'H: a full workshop held a third seat';
  END IF;
  SELECT * INTO v_seat FROM public.workshop_availability(ARRAY[(SELECT id FROM public.workshops WHERE slug = 'ws-reg-main')]);
  IF v_seat.seats_left <> 0 OR v_seat.confirmed OR NOT v_seat.registration_open THEN
    RAISE EXCEPTION 'H: the availability was wrong: %', row_to_json(v_seat);
  END IF;
  IF pg_temp.hint_of($sql$SELECT public.join_workshop_waitlist('ws-reg-main', 'visitor-key-3', 'Anna', 'ANNA@example.invalid', NULL, NULL, true, true)$sql$) <> 'already_registered' THEN
    RAISE EXCEPTION 'I: a registered e-mail joined the waitlist';
  END IF;
  SELECT access_token INTO v_token FROM public.join_workshop_waitlist('ws-reg-main', 'visitor-key-3', 'Ewa', 'ewa@example.invalid', NULL, NULL, true, true);
  INSERT INTO tokens VALUES ('w1', v_token);
  SELECT access_token INTO v_token FROM public.join_workshop_waitlist('ws-reg-main', 'visitor-key-4', 'Zosia', 'zosia@example.invalid', NULL, NULL, true, true);
  INSERT INTO tokens VALUES ('w2', v_token);
  IF (SELECT waitlist_position FROM public.get_workshop_registration(v_token)) <> 2 THEN
    RAISE EXCEPTION 'I: the second on the waitlist was not second';
  END IF;
  IF pg_temp.hint_of($sql$SELECT public.join_workshop_waitlist('ws-reg-free', 'visitor-key-5', 'Kasia', 'kasia@example.invalid', NULL, NULL, true, true)$sql$) <> 'seats_free' THEN
    RAISE EXCEPTION 'I: a workshop with seats took a waitlist sign-up';
  END IF;
END;
$$;

DO $$
DECLARE
  v_cancel record;
  v_reg record;
BEGIN
  -- J: Ola cancels 30 days before: a full refund; Ewa is offered the seat.
  SELECT * INTO v_cancel FROM public.cancel_workshop_registration((SELECT token FROM tokens WHERE name = 'r2'));
  IF v_cancel.refund_minor <> 10000 OR v_cancel.refund_when_replaced THEN
    RAISE EXCEPTION 'J: an early cancellation was not refunded in full: %', row_to_json(v_cancel);
  END IF;
  SELECT * INTO v_reg FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'w1'));
  IF v_reg.status <> 'offered' OR v_reg.offer_expires_at NOT BETWEEN now() + interval '23 hours' AND now() + interval '24 hours' THEN
    RAISE EXCEPTION 'J: the first on the waitlist was not offered the seat for 24 hours: %', row_to_json(v_reg);
  END IF;
  IF (SELECT status FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'w2'))) <> 'waitlisted' THEN
    RAISE EXCEPTION 'J: the second on the waitlist was offered too';
  END IF;

  -- K: Ewa pays; then Anna pays: two paid seats confirm the workshop.
  UPDATE public.workshop_registrations
  SET status = 'confirmed', paid_minor = 10000, confirmed_at = now(), offer_expires_at = NULL
  WHERE access_token_hash = extensions.digest((SELECT token FROM tokens WHERE name = 'w1'), 'sha256');
  IF (SELECT confirmed_at FROM public.workshops WHERE slug = 'ws-reg-main') IS NOT NULL THEN
    RAISE EXCEPTION 'K: one paid seat confirmed a workshop needing two';
  END IF;
  UPDATE public.workshop_registrations
  SET status = 'confirmed', paid_minor = 10000, confirmed_at = now(), payment_due_at = NULL
  WHERE access_token_hash = extensions.digest((SELECT token FROM tokens WHERE name = 'r1'), 'sha256');
  IF (SELECT confirmed_at FROM public.workshops WHERE slug = 'ws-reg-main') IS NULL THEN
    RAISE EXCEPTION 'K: the minimum did not confirm the workshop';
  END IF;

  -- L: Anna passes her seat to Basia, but not to someone registered.
  IF pg_temp.hint_of(format('SELECT public.transfer_workshop_seat(%L, %L, %L, NULL)',
      (SELECT token FROM tokens WHERE name = 'r1'), 'Ewa', 'ewa@example.invalid')) <> 'already_registered' THEN
    RAISE EXCEPTION 'L: a seat went to someone already registered';
  END IF;
  PERFORM public.transfer_workshop_seat((SELECT token FROM tokens WHERE name = 'r1'), 'Basia', 'basia@example.invalid', NULL);
  IF (SELECT client_email FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'r1'))) <> 'basia@example.invalid' THEN
    RAISE EXCEPTION 'L: the seat was not passed on';
  END IF;

  -- M: fewer seats than people registered is refused.
  IF pg_temp.hint_of($sql$UPDATE public.workshops SET capacity = 1 WHERE slug = 'ws-reg-main'$sql$) <> 'capacity_below_taken' THEN
    RAISE EXCEPTION 'M: the capacity went below the seats taken';
  END IF;
END;
$$;

DO $$
DECLARE
  v_token text;
  v_cancel record;
BEGIN
  -- N: three days before: no paying later; a late cancellation is refunded
  -- once the waitlist takes the seat.
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-reg-soon', 'visitor-key-6');
  INSERT INTO tokens VALUES ('a1', v_token);
  PERFORM public.save_workshop_registration_details(v_token, 'Ala', 'ala@example.invalid', NULL, NULL, true, true);
  IF pg_temp.hint_of(format('SELECT public.reserve_workshop_seat(%L)', v_token)) <> 'pay_now_required' THEN
    RAISE EXCEPTION 'N: a seat three days ahead was reserved to pay later';
  END IF;
  UPDATE public.workshop_registrations
  SET status = 'confirmed', paid_minor = 5000, confirmed_at = now(), hold_expires_at = NULL
  WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  SELECT access_token INTO v_token FROM public.join_workshop_waitlist('ws-reg-soon', 'visitor-key-6', 'Bea', 'bea@example.invalid', NULL, NULL, true, true);
  INSERT INTO tokens VALUES ('b1', v_token);
  SELECT * INTO v_cancel FROM public.cancel_workshop_registration((SELECT token FROM tokens WHERE name = 'a1'));
  IF v_cancel.refund_minor <> 0 OR NOT v_cancel.refund_when_replaced THEN
    RAISE EXCEPTION 'N: a late cancellation was refunded at once: %', row_to_json(v_cancel);
  END IF;
  UPDATE public.workshop_registrations
  SET status = 'confirmed', paid_minor = 5000, confirmed_at = now(), offer_expires_at = NULL
  WHERE access_token_hash = extensions.digest(v_token, 'sha256') AND status = 'offered';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'N: the waitlist was not offered the late seat';
  END IF;
  IF (SELECT refund_due_minor FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'a1'))) <> 5000 THEN
    RAISE EXCEPTION 'N: the replaced late cancellation was not refunded';
  END IF;

  -- O: a free seat is confirmed, not reserved; the link shows once it is.
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-reg-free', 'visitor-key-7');
  PERFORM public.save_workshop_registration_details(v_token, 'Celina', 'celina@example.invalid', NULL, NULL, true, true);
  IF pg_temp.hint_of(format('SELECT public.reserve_workshop_seat(%L)', v_token)) <> 'free' THEN
    RAISE EXCEPTION 'O: a free seat was reserved';
  END IF;
  IF (SELECT meeting_url FROM public.get_workshop_registration(v_token)) IS NOT NULL THEN
    RAISE EXCEPTION 'O: the link showed before the seat was confirmed';
  END IF;
  PERFORM public.confirm_free_workshop_seat(v_token);
  IF (SELECT meeting_url FROM public.get_workshop_registration(v_token)) IS DISTINCT FROM 'https://meet.example.invalid/ws-reg' THEN
    RAISE EXCEPTION 'O: a confirmed participant did not get the link';
  END IF;
END;
$$;

DO $$
DECLARE
  v_token text;
BEGIN
  -- P: what runs out: an offer, a hold, an unpaid seat.
  PERFORM public.cancel_workshop_registration((SELECT token FROM tokens WHERE name = 'r1'));
  UPDATE public.workshop_registrations SET offer_expires_at = now() - interval '1 minute'
  WHERE access_token_hash = extensions.digest((SELECT token FROM tokens WHERE name = 'w2'), 'sha256')
    AND status = 'offered';
  IF NOT FOUND THEN
    RAISE EXCEPTION 'P: Zosia was not offered the freed seat';
  END IF;
  IF public.run_workshop_jobs() < 1
     OR (SELECT status FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'w2'))) <> 'expired' THEN
    RAISE EXCEPTION 'P: an offer ran out but stayed';
  END IF;

  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-reg-main', 'visitor-key-8');
  UPDATE public.workshop_registrations SET hold_expires_at = now() - interval '1 minute'
  WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  PERFORM public.run_workshop_jobs();
  IF (SELECT status FROM public.workshop_registrations WHERE access_token_hash = extensions.digest(v_token, 'sha256')) <> 'expired' THEN
    RAISE EXCEPTION 'P: a hold ran out but stayed';
  END IF;

  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-reg-main', 'visitor-key-9');
  PERFORM public.save_workshop_registration_details(v_token, 'Dora', 'dora@example.invalid', NULL, NULL, true, true);
  PERFORM public.reserve_workshop_seat(v_token);
  UPDATE public.workshop_registrations SET payment_due_at = now() - interval '1 minute'
  WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  PERFORM public.run_workshop_jobs();
  IF (SELECT status::text || '/' || cancelled_by FROM public.workshop_registrations
      WHERE access_token_hash = extensions.digest(v_token, 'sha256')) <> 'cancelled/system' THEN
    RAISE EXCEPTION 'P: an unpaid seat outlived its due time';
  END IF;
END;
$$;

-- ------------------------------------------------------------ who reads

SELECT set_config('request.jwt.claims',
  '{"sub":"7b000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.workshops WHERE slug = 'ws-reg-main')
     OR (SELECT count(*) FROM public.workshop_registrations AS r
         JOIN public.workshops AS w ON w.id = r.workshop_id WHERE w.slug = 'ws-reg-main') = 0 THEN
    RAISE EXCEPTION 'Q: a co-leader did not see their workshop''s participants';
  END IF;
  BEGIN
    PERFORM access_token_hash FROM public.workshop_registrations LIMIT 1;
    RAISE EXCEPTION 'Q: a leader read the access tokens';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF pg_temp.hint_of(format('SELECT public.cancel_workshop(%L)',
      (SELECT id FROM public.workshops WHERE slug = 'ws-reg-main'))) <> '42501' THEN
    RAISE EXCEPTION 'Q: a leader cancelled a workshop';
  END IF;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"7b000000-0000-4000-8000-000000000004","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.workshop_registrations AS r
    JOIN public.workshops AS w ON w.id = r.workshop_id WHERE w.slug = 'ws-reg-main'
  ) THEN
    RAISE EXCEPTION 'Q: another specialist saw the participants';
  END IF;
  IF EXISTS (SELECT 1 FROM public.workshop_online_links AS link
      JOIN public.workshops AS w ON w.id = link.workshop_id WHERE w.slug <> 'ws-reg-free') THEN
    RAISE EXCEPTION 'Q: a specialist read another workshop''s link';
  END IF;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
BEGIN
  BEGIN
    PERFORM 1 FROM public.workshop_registrations LIMIT 1;
    RAISE EXCEPTION 'Q: a visitor read registrations';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.workshop_online_links LIMIT 1;
    RAISE EXCEPTION 'Q: a visitor read a meeting link';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  IF NOT EXISTS (
    SELECT 1 FROM public.workshop_co_leaders AS co
    JOIN public.workshops AS w ON w.id = co.workshop_id WHERE w.slug = 'ws-reg-main'
  ) THEN
    RAISE EXCEPTION 'Q: a visitor did not see a public workshop''s co-leader';
  END IF;
  IF (SELECT seats_left FROM public.workshop_availability(
      ARRAY[(SELECT id FROM public.workshops WHERE slug = 'ws-reg-main')])) <> 1 THEN
    RAISE EXCEPTION 'Q: a visitor did not see one seat left';
  END IF;
END;
$$;
RESET ROLE;

-- ------------------------------------------------------------ the centre cancels

SELECT set_config('request.jwt.claims',
  '{"sub":"7b000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_main uuid := (SELECT id FROM public.workshops WHERE slug = 'ws-reg-main');
  v_to_refund integer;
BEGIN
  -- R: everyone's seat goes, the paid get it all back, the blocks go.
  SELECT count(*) INTO v_to_refund FROM public.cancel_workshop(v_main, 'Choroba prowadzącej');
  -- Ola and Basia cancelled earlier (owed, not yet refunded); Ewa now.
  IF v_to_refund <> 3 THEN
    RAISE EXCEPTION 'R: % participants to refund, expected 3', v_to_refund;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.workshop_registrations
    WHERE workshop_id = v_main AND status NOT IN ('cancelled', 'expired')
  ) THEN
    RAISE EXCEPTION 'R: a seat outlived the cancelled workshop';
  END IF;
  IF EXISTS (SELECT 1 FROM public.specialist_time_off WHERE workshop_id = v_main)
     OR EXISTS (SELECT 1 FROM public.room_availability_exceptions WHERE workshop_id = v_main) THEN
    RAISE EXCEPTION 'R: the cancelled workshop still blocked time';
  END IF;
  IF pg_temp.hint_of(format($sql$UPDATE public.workshops SET status = 'published' WHERE id = %L$sql$, v_main)) <> 'workshop_cancelled' THEN
    RAISE EXCEPTION 'R: a cancelled workshop was published again';
  END IF;
END;
$$;
RESET ROLE;

ROLLBACK;
