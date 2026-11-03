-- A seat taken with a made-up address cannot fill a workshop
-- (20261103090000, #269, Warsztat · 5, card 5): a seat to pay later, or a
-- free one, waits 30 minutes for its confirming from the e-mail's link
-- (never the browser's own token), then lapses quietly; confirmed, the
-- leaders hear of it; a seat from an e-mail's link needs no confirming;
-- one person has at most two unpaid seats (a third is paid now, the
-- admins told) and at most two free ones waiting. Rolled back at the end.

BEGIN;

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
  IF SQLSTATE = '42501' THEN
    RETURN '42501';
  END IF;
  RETURN coalesce(nullif(v_hint, ''), SQLSTATE);
END;
$$;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('7f200000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'ws-conf-admin@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Admin"}', now(), now(), false, false),
  ('7f200000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'ws-conf-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Leader"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('7f200000-0000-4000-8000-000000000001', 'admin'),
  ('7f200000-0000-4000-8000-000000000002', 'specialist');

-- Paid workshops p1 to p3 and free ones f1 to f3, all weeks ahead.
INSERT INTO public.workshops (
  slug, title, short_description, specialist_id, modality, starts_at, ends_at,
  price_minor, capacity, registration_enabled, status
)
-- (One a day: the leader leads one at a time.)
SELECT w.slug, w.title, 'Krótko', specialist.id, 'online',
  ((current_date + 30 + w.day) + time '17:00') AT TIME ZONE 'Europe/Warsaw',
  ((current_date + 30 + w.day) + time '19:00') AT TIME ZONE 'Europe/Warsaw',
  w.price, w.seats, true, 'published'
FROM public.specialists AS specialist
CROSS JOIN (VALUES
  ('ws-conf-p1', 'Płatny 1', 10000, 3, 0),
  ('ws-conf-p2', 'Płatny 2', 10000, 3, 1),
  ('ws-conf-p3', 'Płatny 3', 10000, 3, 2),
  ('ws-conf-f1', 'Bezpłatny 1', 0, 3, 3),
  ('ws-conf-f2', 'Bezpłatny 2', 0, 3, 4),
  ('ws-conf-f3', 'Bezpłatny 3', 0, 3, 5)
) AS w(slug, title, price, seats, day)
WHERE specialist.user_id = '7f200000-0000-4000-8000-000000000002';

-- A seat held with details (a fresh hold key each time: five an hour).
CREATE FUNCTION pg_temp.seat(p_slug text, p_name text, p_email text, p_phone text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_token text;
BEGIN
  SELECT access_token INTO v_token
  FROM public.hold_workshop_seat(p_slug, 'ws-conf-hold-' || gen_random_uuid());
  PERFORM public.save_workshop_registration_details(v_token, p_name, p_email, p_phone, NULL, true, true);
  RETURN v_token;
END;
$$;

CREATE FUNCTION pg_temp.seat_of(p_token text)
RETURNS public.workshop_registrations
LANGUAGE sql
AS $$
  SELECT r.* FROM public.workshop_registrations AS r
  WHERE r.access_token_hash = extensions.digest(p_token, 'sha256');
$$;

CREATE FUNCTION pg_temp.signups_told(p_reference text)
RETURNS integer
LANGUAGE sql
AS $$
  SELECT count(*)::integer FROM public.notifications
  WHERE kind = 'workshop_signup' AND details->>'reference' = p_reference;
$$;

CREATE TEMP TABLE tokens (name text PRIMARY KEY, token text NOT NULL);

DO $$
DECLARE
  v_token text := pg_temp.seat('ws-conf-p1', 'Anna Nowak', 'anna@example.invalid', '500600701');
  v_seat public.workshop_registrations%ROWTYPE;
  v_reserved record;
  v_mail record;
  v_p1 uuid := (SELECT id FROM public.workshops WHERE slug = 'ws-conf-p1');
BEGIN
  -- A: "Zapłacę później": the seat waits 30 minutes for its confirming;
  -- it is taken meanwhile, and nobody is told of it yet.
  SELECT * INTO v_reserved FROM public.reserve_workshop_seat(v_token, 'ws-conf-visitor-a');
  v_seat := pg_temp.seat_of(v_token);
  IF v_reserved.outcome <> 'reserved'
     OR v_reserved.confirm_by NOT BETWEEN now() + interval '29 minutes' AND now() + interval '31 minutes'
     OR v_reserved.payment_due_at <> (SELECT starts_at FROM public.workshops WHERE id = v_p1) - interval '7 days'
     OR v_seat.status <> 'awaiting_payment' OR v_seat.payment_due_at <> v_reserved.confirm_by
     OR v_seat.confirm_by <> v_reserved.confirm_by THEN
    RAISE EXCEPTION 'A: the reservation did not wait for its confirming: % %', row_to_json(v_reserved), row_to_json(v_seat);
  END IF;
  IF private.workshop_seats_taken(v_p1) <> 1 THEN
    RAISE EXCEPTION 'A: the seat waiting for its confirming was not taken';
  END IF;
  IF pg_temp.signups_told(v_seat.reference) <> 0 THEN
    RAISE EXCEPTION 'A: the leaders heard of a seat not confirmed';
  END IF;
  IF public.workshop_seat_confirm_by(v_token) <> v_reserved.confirm_by THEN
    RAISE EXCEPTION 'A: the seat did not say until when to confirm it';
  END IF;

  -- The browser's own token confirms nothing; the e-mail's link does, once.
  IF public.confirm_workshop_seat(v_token) IS NOT NULL THEN
    RAISE EXCEPTION 'A: the browser''s token confirmed the address';
  END IF;
  SELECT * INTO v_mail FROM public.claim_workshop_email(v_seat.reference, 'reserved');
  IF v_mail.confirm_by IS DISTINCT FROM v_reserved.confirm_by THEN
    RAISE EXCEPTION 'A: the e-mail did not carry until when to confirm';
  END IF;
  IF public.confirm_workshop_seat(v_mail.manage_token) IS DISTINCT FROM 'reserved' THEN
    RAISE EXCEPTION 'A: the e-mail''s link did not confirm the seat';
  END IF;
  v_seat := pg_temp.seat_of(v_token);
  IF v_seat.confirm_by IS NOT NULL OR v_seat.payment_due_at <> v_reserved.payment_due_at
     OR v_seat.status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'A: the confirmed seat was not due seven days before: %', row_to_json(v_seat);
  END IF;
  IF pg_temp.signups_told(v_seat.reference) = 0 THEN
    RAISE EXCEPTION 'A: the leaders did not hear of the confirmed seat';
  END IF;
  IF public.confirm_workshop_seat(v_mail.manage_token) IS NOT NULL
     OR public.workshop_seat_confirm_by(v_mail.manage_token) IS NOT NULL THEN
    RAISE EXCEPTION 'A: a seat was confirmed twice';
  END IF;
  INSERT INTO tokens VALUES ('anna', v_token);
END;
$$;

DO $$
DECLARE
  v_token text := pg_temp.seat('ws-conf-p1', 'Bot Jeden', 'bot1@example.invalid', NULL);
  v_free text := pg_temp.seat('ws-conf-f1', 'Bot Dwa', 'bot2@example.invalid', NULL);
  v_seat public.workshop_registrations%ROWTYPE;
BEGIN
  -- B: not confirmed in time, a seat lapses quietly: expired, nothing owed,
  -- no e-mail of a cancellation, the seat free again.
  PERFORM public.reserve_workshop_seat(v_token, 'ws-conf-visitor-b');
  PERFORM public.confirm_free_workshop_seat(v_free, 'ws-conf-visitor-b');
  UPDATE public.workshop_registrations
  SET payment_due_at = now() - interval '1 minute', confirm_by = now() - interval '1 minute'
  WHERE id = (pg_temp.seat_of(v_token)).id;
  UPDATE public.workshop_registrations
  SET hold_expires_at = now() - interval '1 minute', confirm_by = now() - interval '1 minute'
  WHERE id = (pg_temp.seat_of(v_free)).id;
  PERFORM public.run_workshop_jobs();
  v_seat := pg_temp.seat_of(v_token);
  IF v_seat.status <> 'expired' OR v_seat.cancelled_at IS NOT NULL OR v_seat.payment_due_at IS NOT NULL
     OR v_seat.confirm_by IS NOT NULL THEN
    RAISE EXCEPTION 'B: the reservation did not lapse quietly: %', row_to_json(v_seat);
  END IF;
  IF (pg_temp.seat_of(v_free)).status <> 'expired' THEN
    RAISE EXCEPTION 'B: the free seat did not lapse';
  END IF;
  IF EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE reference = v_seat.reference) THEN
    RAISE EXCEPTION 'B: a lapsed seat was to be e-mailed';
  END IF;
END;
$$;

DO $$
DECLARE
  v_token text;
  v_seat public.workshop_registrations%ROWTYPE;
  v_mail record;
  v_free record;
BEGIN
  -- C: a free seat waits for its confirming too, as a hold; the e-mail's
  -- link confirms it and the leaders hear of it.
  v_token := pg_temp.seat('ws-conf-f1', 'Celina Las', 'celina@example.invalid', NULL);
  SELECT * INTO v_free FROM public.confirm_free_workshop_seat(v_token, 'ws-conf-visitor-c');
  v_seat := pg_temp.seat_of(v_token);
  IF v_free.confirm_by IS NULL OR v_seat.status <> 'held' OR v_seat.hold_expires_at <> v_free.confirm_by THEN
    RAISE EXCEPTION 'C: the free seat was confirmed before its address: %', row_to_json(v_seat);
  END IF;
  IF pg_temp.hint_of(format('SELECT public.confirm_free_workshop_seat(%L)', v_token)) <> 'hold_expired'
     OR pg_temp.hint_of(format('SELECT public.reserve_workshop_seat(%L)', v_token)) <> 'hold_expired' THEN
    RAISE EXCEPTION 'C: a seat waiting for its confirming was taken again';
  END IF;
  SELECT * INTO v_mail FROM public.claim_workshop_email(v_seat.reference, 'reserved');
  IF v_mail.manage_token IS NULL OR v_mail.price_minor <> 0 THEN
    RAISE EXCEPTION 'C: no e-mail to confirm the free seat';
  END IF;
  IF public.confirm_workshop_seat(v_mail.manage_token) IS DISTINCT FROM 'confirmed'
     OR (pg_temp.seat_of(v_token)).status <> 'confirmed'
     OR (pg_temp.seat_of(v_token)).confirm_by IS NOT NULL
     OR pg_temp.signups_told(v_seat.reference) = 0 THEN
    RAISE EXCEPTION 'C: the free seat was not confirmed from its e-mail';
  END IF;

  -- D: a seat from an e-mail's link (a waitlist's offer) needs no
  -- confirming: the address is proven.
  v_token := pg_temp.seat('ws-conf-p2', 'Dora Kos', 'dora@example.invalid', NULL);
  UPDATE public.workshop_registrations
  SET status = 'offered', offer_expires_at = now() + interval '1 day', hold_expires_at = NULL,
      waitlisted_at = now() - interval '1 day'
  WHERE id = (pg_temp.seat_of(v_token)).id;
  v_seat := pg_temp.seat_of(v_token);
  SELECT * INTO v_mail FROM public.claim_workshop_email(v_seat.reference, 'offered');
  IF (SELECT confirm_by FROM public.reserve_workshop_seat(v_mail.manage_token, 'ws-conf-visitor-d')) IS NOT NULL
     OR (pg_temp.seat_of(v_token)).confirm_by IS NOT NULL
     OR (pg_temp.seat_of(v_token)).payment_due_at < now() + interval '1 day' THEN
    RAISE EXCEPTION 'D: a seat from the e-mail''s link waited for confirming';
  END IF;
END;
$$;

DO $$
DECLARE
  v_token text;
  v_reserved record;
BEGIN
  -- E: at most two unpaid seats per person: Anna has one (A); a second
  -- under another address but her phone; a third under her address
  -- (written otherwise) and her phone: paid now, the admins told once.
  IF (SELECT outcome FROM public.reserve_workshop_seat(
        pg_temp.seat('ws-conf-p2', 'Anna Nowak', 'anna.n@example.invalid', '500 600 701'),
        'ws-conf-visitor-e1')) <> 'reserved' THEN
    RAISE EXCEPTION 'E: a second unpaid seat was refused';
  END IF;
  v_token := pg_temp.seat('ws-conf-p3', 'Anna Nowak', ' ANNA@example.invalid', '+48 500600701');
  SELECT * INTO v_reserved FROM public.reserve_workshop_seat(v_token, 'ws-conf-visitor-e2');
  IF v_reserved.outcome <> 'pay_now' OR (pg_temp.seat_of(v_token)).status <> 'held' THEN
    RAISE EXCEPTION 'E: a third unpaid seat by the same person: %', row_to_json(v_reserved);
  END IF;
  PERFORM public.reserve_workshop_seat(v_token, 'ws-conf-visitor-e2');
  IF (SELECT count(*) FROM public.notifications
      WHERE kind = 'workshop_unpaid_limit' AND portal = 'admin'
        AND details->>'reference' = (pg_temp.seat_of(v_token)).reference) <> 1 THEN
    RAISE EXCEPTION 'E: the admins were not told once';
  END IF;

  -- By the visitor: other details, the same browser.
  PERFORM public.reserve_workshop_seat(
    pg_temp.seat('ws-conf-p1', 'Ela Raz', 'ela1@example.invalid', NULL), 'ws-conf-visitor-ela');
  PERFORM public.reserve_workshop_seat(
    pg_temp.seat('ws-conf-p2', 'Ela Dwa', 'ela2@example.invalid', NULL), 'ws-conf-visitor-ela');
  IF (SELECT outcome FROM public.reserve_workshop_seat(
        pg_temp.seat('ws-conf-p3', 'Ela Trzy', 'ela3@example.invalid', NULL), 'ws-conf-visitor-ela')) <> 'pay_now' THEN
    RAISE EXCEPTION 'E: a third unpaid seat from the same browser';
  END IF;

  -- F: at most two free seats waiting for their confirming.
  PERFORM public.confirm_free_workshop_seat(
    pg_temp.seat('ws-conf-f1', 'Fela Raz', 'fela@example.invalid', NULL), 'ws-conf-visitor-f1');
  PERFORM public.confirm_free_workshop_seat(
    pg_temp.seat('ws-conf-f2', 'Fela Dwa', 'fela@example.invalid', NULL), 'ws-conf-visitor-f2');
  IF pg_temp.hint_of(format('SELECT public.confirm_free_workshop_seat(%L, %L)',
       pg_temp.seat('ws-conf-f3', 'Fela Trzy', 'fela@example.invalid', NULL), 'ws-conf-visitor-f3'))
     <> 'too_many_unconfirmed' THEN
    RAISE EXCEPTION 'F: a third free seat waited for its confirming';
  END IF;
END;
$$;

-- G: the admin sees which seats wait for their confirming.
SELECT set_config('request.jwt.claims',
  '{"sub":"7f200000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT count(*) FROM public.workshop_registrations
      WHERE client_email = 'fela@example.invalid' AND confirm_by IS NOT NULL) <> 2 THEN
    RAISE EXCEPTION 'G: the admin did not see the seats waiting';
  END IF;
END;
$$;
RESET ROLE;

ROLLBACK;
