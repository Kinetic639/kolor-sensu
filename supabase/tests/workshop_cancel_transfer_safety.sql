-- Giving a seat up, passing it on and what may go wrong (20261102090000,
-- Warsztat · 8 to 10): a seat passed on is the new person's only once
-- they accept the rules, and the participant's link then stops; giving up
-- twice refunds once; the waitlist hears of a new date and of the
-- workshop cancelled; a new leader is e-mailed and lets anyone leave with
-- a full refund; a workshop cancelled gives back what was paid with a code
-- and the code's use; a guessed link finds nothing; a disputed payment
-- shows on the seat. Rolled back at the end.

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
  ('7f100000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'ws-safe-admin@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Admin"}', now(), now(), false, false),
  ('7f100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'ws-safe-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Leader"}', now(), now(), false, false),
  ('7f100000-0000-4000-8000-000000000003', 'authenticated', 'authenticated',
    'ws-safe-other@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Other"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('7f100000-0000-4000-8000-000000000001', 'admin'),
  ('7f100000-0000-4000-8000-000000000002', 'specialist'),
  ('7f100000-0000-4000-8000-000000000003', 'specialist');

-- A: two seats, 3 days ahead (inside the seven days); C and D: 20 days
-- ahead.
INSERT INTO public.workshops (
  slug, title, short_description, specialist_id, modality, starts_at, ends_at,
  price_minor, capacity, registration_enabled, status
)
SELECT w.slug, w.title, 'Krótko', specialist.id, 'online', w.at, w.at + interval '2 hours',
  10000, w.seats, true, 'published'
FROM public.specialists AS specialist
CROSS JOIN (VALUES
  ('ws-safe-a', 'Warsztat A', now() + interval '3 days', 2),
  ('ws-safe-c', 'Warsztat C', ((current_date + 20) + time '17:00') AT TIME ZONE 'Europe/Warsaw', 5),
  ('ws-safe-d', 'Warsztat D', ((current_date + 21) + time '17:00') AT TIME ZONE 'Europe/Warsaw', 5)
) AS w(slug, title, at, seats)
WHERE specialist.user_id = '7f100000-0000-4000-8000-000000000002';

INSERT INTO public.discount_codes (code, kind, value, scope, workshop_id, max_uses)
VALUES ('JEDEN-RAZ', 'percent', 50, 'workshops', NULL, 1);

CREATE TEMP TABLE tokens (name text PRIMARY KEY, token text NOT NULL);
GRANT SELECT ON tokens TO authenticated;

-- A: Anna and Bea paid, Cela on the waitlist; C: Dora paid half with the
-- code.
DO $$
DECLARE
  v_token text;
  v_name text;
BEGIN
  FOREACH v_name IN ARRAY ARRAY['anna', 'bea'] LOOP
    SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-safe-a', 'ws-safe-' || v_name);
    INSERT INTO tokens VALUES (v_name, v_token);
    PERFORM public.save_workshop_registration_details(v_token, initcap(v_name), v_name || '@example.invalid', NULL, NULL, true, true);
    UPDATE public.workshop_registrations
    SET status = 'confirmed', paid_minor = 10000, confirmed_at = now(), hold_expires_at = NULL
    WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  END LOOP;
  SELECT access_token INTO v_token FROM public.join_workshop_waitlist(
    'ws-safe-a', 'ws-safe-cela', 'Cela', 'cela@example.invalid', NULL, NULL, true, true);
  INSERT INTO tokens VALUES ('cela', v_token);

  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-safe-c', 'ws-safe-dora');
  INSERT INTO tokens VALUES ('dora', v_token);
  PERFORM public.apply_workshop_discount(v_token, 'JEDEN-RAZ');
  PERFORM public.save_workshop_registration_details(v_token, 'Dora', 'dora@example.invalid', NULL, NULL, true, true);
  UPDATE public.workshop_registrations
  SET status = 'confirmed', paid_minor = 5000, confirmed_at = now(), hold_expires_at = NULL
  WHERE access_token_hash = extensions.digest(v_token, 'sha256');
END;
$$;

DO $$
DECLARE
  v_anna text := (SELECT token FROM tokens WHERE name = 'anna');
  v_ref text := (SELECT reference FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'anna')));
  v_invite text;
  v_again text;
  v_transfer record;
  v_seat public.workshop_registrations%ROWTYPE;
BEGIN
  -- A (8, card 4): Anna offers her seat to Ewa: still Anna's until Ewa
  -- accepts the rules and the privacy notice.
  PERFORM public.claim_workshop_email(v_ref, 'confirmation');
  v_invite := public.transfer_workshop_seat(v_anna, 'Ewa', 'Nowak', 'Ewa@Example.invalid', NULL);
  IF (SELECT client_email FROM public.get_workshop_registration(v_anna)) <> 'anna@example.invalid' THEN
    RAISE EXCEPTION 'A: the seat moved before the new person accepted';
  END IF;
  SELECT * INTO v_transfer FROM public.workshop_transfer(v_invite);
  IF v_transfer.reference <> v_ref OR v_transfer.email <> 'ewa@example.invalid'
     OR v_transfer.from_name <> 'Anna' OR NOT v_transfer.open THEN
    RAISE EXCEPTION 'A: the invitation was not as offered: %', row_to_json(v_transfer);
  END IF;
  IF pg_temp.hint_of(format('SELECT * FROM public.accept_workshop_transfer(%L, true, false)', v_invite)) <> 'consent_required'
     OR pg_temp.hint_of(format('SELECT * FROM public.accept_workshop_transfer(%L, false, true)', v_invite)) <> 'consent_required' THEN
    RAISE EXCEPTION 'A: the seat moved without the rules and the privacy notice accepted';
  END IF;
  -- A second offer replaces the first: only its link works.
  v_again := public.transfer_workshop_seat(v_anna, 'Ewa', 'Nowak', 'ewa@example.invalid', '500600700');
  IF EXISTS (SELECT 1 FROM public.workshop_transfer(v_invite)) THEN
    RAISE EXCEPTION 'A: an earlier invitation still worked';
  END IF;
  PERFORM public.accept_workshop_transfer(v_again, true, true);
  SELECT * INTO v_seat FROM public.workshop_registrations WHERE reference = v_ref;
  IF v_seat.client_email <> 'ewa@example.invalid' OR v_seat.client_first_name <> 'Ewa'
     OR v_seat.client_last_name <> 'Nowak' OR v_seat.terms_accepted_at IS NULL
     OR v_seat.privacy_accepted_at IS NULL OR v_seat.status <> 'confirmed' THEN
    RAISE EXCEPTION 'A: the seat did not become Ewa''s: %', row_to_json(v_seat);
  END IF;
  IF EXISTS (SELECT 1 FROM public.get_workshop_registration(v_anna)) THEN
    RAISE EXCEPTION 'A: Anna''s link still opened the seat she passed on';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.get_workshop_registration(v_again))
     OR EXISTS (SELECT 1 FROM public.workshop_emails AS e WHERE e.registration_id = v_seat.id) THEN
    RAISE EXCEPTION 'A: Ewa''s link did not open the seat, or Anna''s e-mails stayed';
  END IF;
  IF (SELECT client_email FROM public.claim_workshop_email(v_ref, 'confirmation')) IS DISTINCT FROM 'ewa@example.invalid' THEN
    RAISE EXCEPTION 'A: Ewa was not to get the confirmation';
  END IF;
  IF pg_temp.hint_of(format('SELECT * FROM public.accept_workshop_transfer(%L, true, true)', v_again)) <> 'not_found' THEN
    RAISE EXCEPTION 'A: an invitation was accepted twice';
  END IF;
  UPDATE tokens SET token = v_again WHERE name = 'anna';

  -- Bea offers hers too; she gives the seat up below (B).
  INSERT INTO tokens VALUES ('fela', public.transfer_workshop_seat(
    (SELECT token FROM tokens WHERE name = 'bea'), 'Fela', 'Lis', 'fela@example.invalid', NULL));
END;
$$;

DO $$
DECLARE
  v_a uuid := (SELECT id FROM public.workshops WHERE slug = 'ws-safe-a');
  v_ewa text := (SELECT token FROM tokens WHERE name = 'anna');
  v_bea text := (SELECT token FROM tokens WHERE name = 'bea');
  v_cela_ref text := (SELECT reference FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'cela')));
  v_cancel record;
BEGIN
  -- D (9, card 5): a new leader: everyone, the waitlist too, is to hear of
  -- it, and may leave with a full refund though it is three days before.
  UPDATE public.workshops
  SET specialist_id = (SELECT id FROM public.specialists WHERE user_id = '7f100000-0000-4000-8000-000000000003')
  WHERE id = v_a;
  IF (SELECT count(*) FROM public.list_due_workshop_emails() AS due
      JOIN public.workshop_registrations AS r ON r.reference = due.reference
      WHERE r.workshop_id = v_a AND due.kind = 'leader_changed') <> 3 THEN
    RAISE EXCEPTION 'D: not all three were to hear of the new leader';
  END IF;
  IF (SELECT leaders FROM public.claim_workshop_email(v_cela_ref, 'leader_changed')) NOT LIKE '%Other%' THEN
    RAISE EXCEPTION 'D: the e-mail did not name the new leader';
  END IF;
  IF EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE reference = v_cela_ref AND kind = 'leader_changed') THEN
    RAISE EXCEPTION 'D: the new leader''s e-mail was due twice';
  END IF;
  -- Another change is told again.
  UPDATE public.workshops
  SET specialist_id = (SELECT id FROM public.specialists WHERE user_id = '7f100000-0000-4000-8000-000000000002')
  WHERE id = v_a;
  IF NOT EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE reference = v_cela_ref AND kind = 'leader_changed') THEN
    RAISE EXCEPTION 'D: a second change of leader was not to be e-mailed';
  END IF;
  SELECT * INTO v_cancel FROM public.cancel_workshop_registration(v_bea);
  IF v_cancel.refund_minor <> 10000 OR v_cancel.refund_when_replaced THEN
    RAISE EXCEPTION 'D: after a new leader the seat was not refunded in full: %', row_to_json(v_cancel);
  END IF;

  -- B (8, card 6): giving up twice: the second is refused, nothing more
  -- owed.
  IF pg_temp.hint_of(format('SELECT * FROM public.cancel_workshop_registration(%L)', v_bea)) <> 'already_cancelled'
     OR (SELECT refund_due_minor FROM public.workshop_registrations WHERE client_email = 'bea@example.invalid') <> 10000 THEN
    RAISE EXCEPTION 'B: a second "Zrezygnuj" counted';
  END IF;
  -- An invitation for a seat given up goes with it.
  IF EXISTS (SELECT 1 FROM public.workshop_transfer((SELECT token FROM tokens WHERE name = 'fela'))) THEN
    RAISE EXCEPTION 'A: an invitation outlived its seat';
  END IF;

  -- C (9, card 3): the waitlist hears of a new date and of the workshop
  -- cancelled.
  UPDATE public.workshops SET starts_at = starts_at + interval '1 day', ends_at = ends_at + interval '1 day' WHERE id = v_a;
  IF NOT EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE reference = v_cela_ref AND kind = 'rescheduled') THEN
    RAISE EXCEPTION 'C: the waitlist was not to hear of the new date';
  END IF;
  UPDATE public.workshops SET status = 'cancelled', cancel_reason = 'Choroba prowadzącej' WHERE id = v_a;
  IF NOT EXISTS (SELECT 1 FROM public.list_due_workshop_emails() WHERE reference = v_cela_ref AND kind = 'cancelled')
     OR (SELECT refund_due_minor FROM public.workshop_registrations WHERE client_email = 'ewa@example.invalid') <> 10000 THEN
    RAISE EXCEPTION 'C: the waitlist was not to hear of the cancellation, or Ewa was not owed her money';
  END IF;
  IF pg_temp.hint_of(format('SELECT public.transfer_workshop_seat(%L, %L, %L, %L, NULL)', v_ewa, 'Gosia', 'Mak', 'gosia@example.invalid')) <> 'not_transferable' THEN
    RAISE EXCEPTION 'C: a cancelled seat was passed on';
  END IF;
END;
$$;

DO $$
DECLARE
  v_c uuid := (SELECT id FROM public.workshops WHERE slug = 'ws-safe-c');
  v_token text;
  v_price integer;
BEGIN
  -- E (9, card 6): Dora paid half with a code used once at most; the
  -- workshop is cancelled: what she paid is owed back, the code's use free.
  IF pg_temp.hint_of($sql$
       SELECT public.apply_workshop_discount(
         (SELECT access_token FROM public.hold_workshop_seat('ws-safe-c', 'ws-safe-gosia')), 'JEDEN-RAZ')
     $sql$) <> 'code_used_up' THEN
    RAISE EXCEPTION 'E: a code for one use went twice';
  END IF;
  UPDATE public.workshops SET status = 'cancelled', cancel_reason = 'Za mało chętnych' WHERE id = v_c;
  IF (SELECT refund_due_minor FROM public.workshop_registrations WHERE client_email = 'dora@example.invalid') <> 5000 THEN
    RAISE EXCEPTION 'E: the cancelled seat was not owed what was paid';
  END IF;
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-safe-d', 'ws-safe-hela');
  SELECT price_minor INTO v_price FROM public.apply_workshop_discount(v_token, 'JEDEN-RAZ');
  IF v_price <> 5000 THEN
    RAISE EXCEPTION 'E: the code''s use did not come back with the cancelled workshop';
  END IF;

  -- F (10, card 3): a guessed link finds nothing and changes nothing.
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  IF EXISTS (SELECT 1 FROM public.get_workshop_registration(v_token))
     OR EXISTS (SELECT 1 FROM public.workshop_transfer(v_token))
     OR pg_temp.hint_of(format('SELECT * FROM public.cancel_workshop_registration(%L)', v_token)) <> 'already_cancelled'
     OR pg_temp.hint_of(format('SELECT public.transfer_workshop_seat(%L, %L, %L, %L, NULL)', v_token, 'Ida', 'Wolna', 'ida@example.invalid')) <> 'not_transferable'
     OR pg_temp.hint_of(format('SELECT * FROM public.accept_workshop_transfer(%L, true, true)', v_token)) <> 'not_found' THEN
    RAISE EXCEPTION 'F: a guessed link reached something';
  END IF;

  -- G (10, card 5): a dispute on Dora's payment shows on her seat.
  IF public.record_dispute('pi_ws_safe_none', 'dp_ws_safe', 'needs_response', 5000, 'fraudulent', false,
       (SELECT reference FROM public.workshop_registrations WHERE client_email = 'dora@example.invalid')) IS NULL THEN
    RAISE EXCEPTION 'G: the dispute did not find the seat';
  END IF;
  IF (SELECT payment_dispute_status FROM public.workshop_registrations WHERE client_email = 'dora@example.invalid') <> 'needs_response'
     OR (SELECT payment_disputed_at FROM public.workshop_registrations WHERE client_email = 'dora@example.invalid') IS NULL THEN
    RAISE EXCEPTION 'G: the seat did not keep the dispute';
  END IF;
  PERFORM public.record_dispute('pi_ws_safe_none', 'dp_ws_safe', 'won', 5000, 'fraudulent', true,
    (SELECT reference FROM public.workshop_registrations WHERE client_email = 'dora@example.invalid'));
  IF (SELECT payment_dispute_status FROM public.workshop_registrations WHERE client_email = 'dora@example.invalid') <> 'won' THEN
    RAISE EXCEPTION 'G: the closed dispute''s outcome was not kept';
  END IF;
END;
$$;

-- G: the admin reads the dispute on the seat; the invitations stay out of
-- reach.
SELECT set_config('request.jwt.claims',
  '{"sub":"7f100000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT payment_dispute_status FROM public.workshop_registrations WHERE client_email = 'dora@example.invalid') <> 'won' THEN
    RAISE EXCEPTION 'G: the admin did not see the dispute';
  END IF;
  IF pg_temp.hint_of('SELECT count(*) FROM public.workshop_transfers') <> '42501' THEN
    RAISE EXCEPTION 'G: a signed-in user read the invitations';
  END IF;
END;
$$;
RESET ROLE;

ROLLBACK;
