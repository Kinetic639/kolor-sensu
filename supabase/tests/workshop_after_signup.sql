-- After signing up (20261023170000): a new date lets the seat go with a
-- full refund at any time; the e-mails events call for are listed once;
-- admins and leaders hear of sign-ups, a full workshop and a minimum not
-- reached; the admin adds and cancels participants, writes to everyone
-- and closes the workshop; the admin and leaders mark who came. Rolled
-- back at the end.

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
  ('7e000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'ws-after-admin@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Admin"}', now(), now(), false, false),
  ('7e000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'ws-after-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Leader"}', now(), now(), false, false),
  ('7e000000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'ws-after-other@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Other"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('7e000000-0000-4000-8000-000000000001', 'admin'),
  ('7e000000-0000-4000-8000-000000000002', 'specialist'),
  ('7e000000-0000-4000-8000-000000000003', 'specialist');

INSERT INTO public.workshops (
  slug, title, short_description, specialist_id, modality, starts_at, ends_at,
  price_minor, capacity, min_participants, registration_enabled, status
)
SELECT w.slug, w.title, 'Krótko', specialist.id, 'online', w.at, w.at + interval '2 hours',
  w.price, w.seats, w.minimum, true, 'published'
FROM public.specialists AS specialist
CROSS JOIN (VALUES
  ('ws-after-a', 'Warsztat A', ((current_date + 20) + time '17:00') AT TIME ZONE 'Europe/Warsaw', 10000, 2, NULL::integer),
  ('ws-after-b', 'Warsztat B', ((current_date + 9) + time '17:00') AT TIME ZONE 'Europe/Warsaw', 5000, 5, 3)
) AS w(slug, title, at, price, seats, minimum)
WHERE specialist.user_id = '7e000000-0000-4000-8000-000000000002';

CREATE TEMP TABLE tokens (name text PRIMARY KEY, token text NOT NULL);
GRANT SELECT ON tokens TO authenticated;

-- Two paid seats on A (full) and one on the waitlist.
DO $$
DECLARE
  v_token text;
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['anna', 'basia'] LOOP
    SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-after-a', 'ws-after-' || v_name);
    INSERT INTO tokens VALUES (v_name, v_token);
    PERFORM public.save_workshop_registration_details(v_token, initcap(v_name), v_name || '@example.invalid', NULL, NULL, true, true);
    UPDATE public.workshop_registrations
    SET status = 'confirmed', paid_minor = 10000, confirmed_at = now(), hold_expires_at = NULL
    WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  END LOOP;
  SELECT access_token INTO v_token FROM public.join_workshop_waitlist('ws-after-a', 'ws-after-cela', 'Cela', 'cela@example.invalid', NULL, NULL, true, true);
  INSERT INTO tokens VALUES ('cela', v_token);
END;
$$;

DO $$
DECLARE
  v_a uuid := (SELECT id FROM public.workshops WHERE slug = 'ws-after-a');
  v_cancel record;
BEGIN
  -- A: the leader and the admins heard of each sign-up and of the full workshop.
  IF (SELECT count(*) FROM public.notifications WHERE kind = 'workshop_signup' AND details->>'workshop_id' = v_a::text AND portal = 'specialist') <> 2
     OR NOT EXISTS (SELECT 1 FROM public.notifications WHERE kind = 'workshop_full' AND details->>'workshop_id' = v_a::text AND portal = 'admin') THEN
    RAISE EXCEPTION 'A: the sign-ups or the full workshop were not told';
  END IF;

  -- B: a new date (3 days ahead): Anna cancels, still with a full refund.
  UPDATE public.workshops
  SET starts_at = now() + interval '3 days', ends_at = now() + interval '3 days 2 hours'
  WHERE id = v_a;
  IF NOT (SELECT refund_any_time FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'anna'))) THEN
    RAISE EXCEPTION 'B: the new date did not allow a full refund';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.list_due_workshop_emails() AS due
      WHERE due.kind = 'rescheduled'
        AND due.reference = (SELECT reference FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'anna')))) THEN
    RAISE EXCEPTION 'B: the new date was not to be e-mailed';
  END IF;
  SELECT * INTO v_cancel FROM public.cancel_workshop_registration((SELECT token FROM tokens WHERE name = 'anna'));
  IF v_cancel.refund_minor <> 10000 OR v_cancel.refund_when_replaced THEN
    RAISE EXCEPTION 'B: a cancellation after the new date was not refunded in full: %', row_to_json(v_cancel);
  END IF;

  -- C: Cela is offered the seat; the offer and the cancellation are due
  -- (the reminder not yet: three days before).
  IF NOT EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE kind = 'offered')
     OR NOT EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE kind = 'cancelled')
     OR EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE kind = 'reminder') THEN
    RAISE EXCEPTION 'C: the offer and the cancellation were not due, or the reminder was early';
  END IF;
  -- Claimed once, then no longer due.
  PERFORM public.claim_workshop_email(
    (SELECT reference FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'cela'))), 'offered');
  IF EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE kind = 'offered') THEN
    RAISE EXCEPTION 'C: a claimed offer stayed due';
  END IF;
  IF (SELECT refund_due_minor FROM public.claim_workshop_email(
        (SELECT reference FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'anna'))), 'cancelled')) <> 10000 THEN
    RAISE EXCEPTION 'C: the cancellation e-mail did not say the refund';
  END IF;

  -- D: an owed refund is listed until it is given back.
  IF NOT EXISTS (SELECT 1 FROM public.list_owed_workshop_refunds() WHERE owed_minor = 10000) THEN
    RAISE EXCEPTION 'D: the owed refund was not listed';
  END IF;
END;
$$;

-- ------------------------------------------------------------ the admin

SELECT set_config('request.jwt.claims',
  '{"sub":"7e000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
DECLARE
  v_b uuid := (SELECT id FROM public.workshops WHERE slug = 'ws-after-b');
  v_added record;
  v_message record;
BEGIN
  -- E: added paid outside (confirmed) and with the link to pay (awaiting).
  SELECT * INTO v_added FROM public.centre_add_workshop_participant(v_b, 'Dora', 'dora@example.invalid', '500600700', NULL, true);
  IF v_added.status <> 'confirmed' THEN
    RAISE EXCEPTION 'E: a participant paid outside was not confirmed';
  END IF;
  SELECT * INTO v_added FROM public.centre_add_workshop_participant(v_b, 'Ela', 'ela@example.invalid', NULL, NULL, false);
  IF v_added.status <> 'awaiting_payment' THEN
    RAISE EXCEPTION 'E: a participant to pay was not awaiting the payment';
  END IF;
  IF pg_temp.hint_of(format(
      'SELECT public.centre_add_workshop_participant(%L, %L, %L, NULL, NULL, true)',
      v_b, 'Dora again', 'DORA@example.invalid')) <> 'already_registered' THEN
    RAISE EXCEPTION 'E: one e-mail was added twice';
  END IF;

  -- F: cancelling one: no more than was paid through the site.
  IF pg_temp.hint_of(format('SELECT public.centre_cancel_workshop_participant(%L, 100)',
      (SELECT id FROM public.workshop_registrations WHERE client_email = 'ela@example.invalid'))) <> 'refund_too_high' THEN
    RAISE EXCEPTION 'F: more than was paid was refunded';
  END IF;
  PERFORM public.centre_cancel_workshop_participant(
    (SELECT id FROM public.workshop_registrations WHERE client_email = 'ela@example.invalid'), 0);
  IF (SELECT status FROM public.workshop_registrations WHERE client_email = 'ela@example.invalid') <> 'cancelled' THEN
    RAISE EXCEPTION 'F: the participant was not cancelled';
  END IF;

  -- G: a message to everyone signed up.
  SELECT * INTO v_message FROM public.record_workshop_message(v_b, 'Co zabrać', 'Wygodne ubranie.');
  IF v_message.client_email <> 'dora@example.invalid' THEN
    RAISE EXCEPTION 'G: the message went to the wrong people: %', row_to_json(v_message);
  END IF;

  -- H: who came, only once it has begun.
  IF pg_temp.hint_of(format('SELECT public.set_workshop_attendance(%L, true)',
      (SELECT id FROM public.workshop_registrations WHERE client_email = 'dora@example.invalid'))) <> 'not_started' THEN
    RAISE EXCEPTION 'H: attendance was marked before the start';
  END IF;
END;
$$;
RESET ROLE;

-- I: the minimum not reached three days before the payments are due.
DO $
DECLARE
  v_first integer;
BEGIN
  v_first := public.remind_workshop_minimums();
  IF v_first <> 1
     OR NOT EXISTS (SELECT 1 FROM public.notifications WHERE kind = 'workshop_minimum' AND portal = 'admin')
     OR public.remind_workshop_minimums() <> 0 THEN
    RAISE EXCEPTION 'I: the minimum was not reminded once (% the first time): %', v_first,
      (SELECT json_agg(json_build_object('slug', w.slug, 'min', w.min_participants,
        'confirmed_at', w.confirmed_at, 'reminded', w.minimum_reminded_at, 'starts', w.starts_at,
        'paid', (SELECT count(*) FROM public.workshop_registrations AS r WHERE r.workshop_id = w.id AND r.status = 'confirmed')))
       FROM public.workshops AS w WHERE w.slug LIKE 'ws-after-%');
  END IF;
  -- The workshop happens (moved into the past, as postgres).
  UPDATE public.workshops
  SET starts_at = now() - interval '3 hours', ends_at = now() - interval '1 hour'
  WHERE slug = 'ws-after-b';
END;
$$;

-- J: the leader marks who came; another specialist cannot.
SELECT set_config('request.jwt.claims',
  '{"sub":"7e000000-0000-4000-8000-000000000003","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF pg_temp.hint_of(format('SELECT public.set_workshop_attendance(%L, true)',
      (SELECT id FROM public.workshop_registrations WHERE client_email = 'dora@example.invalid'))) NOT IN ('42501', 'not_found') THEN
    RAISE EXCEPTION 'J: another specialist marked attendance';
  END IF;
END;
$$;
RESET ROLE;

SELECT set_config('request.jwt.claims',
  '{"sub":"7e000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.set_workshop_attendance(
    (SELECT id FROM public.workshop_registrations WHERE client_email = 'dora@example.invalid'), true);
  IF NOT (SELECT attended FROM public.workshop_registrations WHERE client_email = 'dora@example.invalid') THEN
    RAISE EXCEPTION 'J: the leader could not mark attendance';
  END IF;
END;
$$;
RESET ROLE;

-- K: the admin closes the ended workshop.
SELECT set_config('request.jwt.claims',
  '{"sub":"7e000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  PERFORM public.complete_workshop((SELECT id FROM public.workshops WHERE slug = 'ws-after-b'));
  IF (SELECT status FROM public.workshops WHERE slug = 'ws-after-b') <> 'completed' THEN
    RAISE EXCEPTION 'K: the workshop was not closed';
  END IF;
  IF pg_temp.hint_of(format('SELECT public.complete_workshop(%L)',
      (SELECT id FROM public.workshops WHERE slug = 'ws-after-a'))) <> 'not_ended' THEN
    RAISE EXCEPTION 'K: a coming workshop was closed';
  END IF;
END;
$$;
RESET ROLE;

ROLLBACK;
