-- Workshop sign-up (20261023090000): a code is for consultations,
-- workshops (all or one) or everything; a workshop seat takes a code, is
-- paid through its own Stripe session (amount checked), confirmed once
-- paid, still confirmed after its hold ran out while a seat is free, else
-- lost; refunds are recorded; each e-mail is claimed once and its link
-- opens the registration; visitors read public workshops with their
-- leaders and seats. Everything is rolled back at the end.

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
  RETURN coalesce(nullif(v_hint, ''), SQLSTATE);
END;
$$;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('7c000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'ws-signup-admin@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Admin"}', now(), now(), false, false),
  ('7c000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'ws-signup-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Leader"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('7c000000-0000-4000-8000-000000000001', 'admin'),
  ('7c000000-0000-4000-8000-000000000002', 'specialist');

UPDATE public.specialists SET active = true, publicly_visible = true
WHERE user_id = '7c000000-0000-4000-8000-000000000002';
INSERT INTO public.specialist_public_profiles (specialist_id, display_name, publication_status, published_at)
SELECT id, 'Ewa Prowadząca', 'published', now()
FROM public.specialists WHERE user_id = '7c000000-0000-4000-8000-000000000002'
ON CONFLICT (specialist_id) DO UPDATE
  SET display_name = EXCLUDED.display_name, publication_status = 'published', published_at = now();

INSERT INTO public.workshops (
  slug, title, specialist_id, modality, starts_at, ends_at, price_minor,
  capacity, registration_enabled, status
)
SELECT slug, title, specialist.id, 'online', at, at + interval '2 hours', price, seats, true, 'published'
FROM public.specialists AS specialist
CROSS JOIN (VALUES
  ('ws-signup-a', 'Warsztat A', ((current_date + 20) + time '17:00') AT TIME ZONE 'Europe/Warsaw', 10000, 2),
  ('ws-signup-b', 'Warsztat B', ((current_date + 25) + time '17:00') AT TIME ZONE 'Europe/Warsaw', 8000, 1)
) AS w(slug, title, at, price, seats)
WHERE specialist.user_id = '7c000000-0000-4000-8000-000000000002';

INSERT INTO public.discount_codes (code, kind, value, scope, workshop_id)
VALUES
  ('KONSULTACJE', 'percent', 10, 'consultations', NULL),
  ('WARSZTATY', 'percent', 50, 'workshops', NULL),
  ('TYLKO-B', 'amount', 1000, 'workshops', (SELECT id FROM public.workshops WHERE slug = 'ws-signup-b')),
  ('WSZYSTKO', 'amount', 100000, 'all', NULL);

CREATE TEMP TABLE tokens (name text PRIMARY KEY, token text NOT NULL);

DO $$
DECLARE
  v_token text;
  v_price integer;
  v_result text;
  v_reg record;
BEGIN
  -- A: the codes' scopes on a seat of workshop A.
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-signup-a', 'ws-signup-key-1');
  INSERT INTO tokens VALUES ('a1', v_token);
  PERFORM public.save_workshop_registration_details(v_token, 'Anna', 'anna@example.invalid', NULL, NULL, true, true);
  IF pg_temp.hint_of(format('SELECT public.apply_workshop_discount(%L, %L)', v_token, 'konsultacje')) <> 'code_not_here' THEN
    RAISE EXCEPTION 'A: a consultations code worked on a workshop';
  END IF;
  IF pg_temp.hint_of(format('SELECT public.apply_workshop_discount(%L, %L)', v_token, 'TYLKO-B')) <> 'code_not_here' THEN
    RAISE EXCEPTION 'A: workshop B''s code worked on workshop A';
  END IF;
  SELECT price_minor INTO v_price FROM public.apply_workshop_discount(v_token, 'warsztaty');
  IF v_price <> 5000 THEN
    RAISE EXCEPTION 'A: 50 %% off 100 zł gave %', v_price;
  END IF;
  SELECT * INTO v_reg FROM public.get_workshop_registration(v_token);
  IF v_reg.discount_code <> 'WARSZTATY' OR v_reg.list_price_minor <> 10000 THEN
    RAISE EXCEPTION 'A: the registration did not show its code';
  END IF;

  -- B: the amount must be the seat's; the paid session confirms it.
  IF pg_temp.hint_of(format(
    'SELECT public.attach_workshop_checkout(%L, %L, now() + interval ''31 minutes'', 10000, %L)',
    v_token, 'cs_test_ws_a1', 'pln')) <> 'amount_mismatch' THEN
    RAISE EXCEPTION 'B: a session for the list price was attached';
  END IF;
  PERFORM public.attach_workshop_checkout(v_token, 'cs_test_ws_a1', now() + interval '31 minutes', 5000, 'pln');
  IF public.pending_workshop_checkout(v_token) <> 'cs_test_ws_a1' THEN
    RAISE EXCEPTION 'B: the pending session was not found';
  END IF;
  IF public.fulfill_workshop_checkout('cs_test_ws_a1', false, NULL) <> 'pending' THEN
    RAISE EXCEPTION 'B: an unpaid session confirmed the seat';
  END IF;
  v_result := public.fulfill_workshop_checkout('cs_test_ws_a1', true, 'pi_test_ws_a1');
  IF v_result <> 'confirmed'
     OR public.fulfill_workshop_checkout('cs_test_ws_a1', true, 'pi_test_ws_a1') <> 'already_confirmed' THEN
    RAISE EXCEPTION 'B: the paid session did not confirm the seat once (%)', v_result;
  END IF;
  IF (SELECT paid_minor FROM public.get_workshop_registration(v_token)) <> 5000 THEN
    RAISE EXCEPTION 'B: the payment was not recorded';
  END IF;
  IF public.fulfill_workshop_checkout('cs_test_unknown', true, NULL) <> 'unknown_session' THEN
    RAISE EXCEPTION 'B: an unknown session was not told apart';
  END IF;

  -- C: a code covering it all: a free seat, confirmed without Stripe.
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-signup-a', 'ws-signup-key-2');
  PERFORM public.save_workshop_registration_details(v_token, 'Bogna', 'bogna@example.invalid', NULL, NULL, true, true);
  PERFORM public.apply_workshop_discount(v_token, 'wszystko');
  IF pg_temp.hint_of(format(
    'SELECT public.attach_workshop_checkout(%L, %L, now() + interval ''31 minutes'', 0, %L)',
    v_token, 'cs_test_ws_free', 'pln')) <> 'free' THEN
    RAISE EXCEPTION 'C: a free seat started a payment';
  END IF;
  PERFORM public.confirm_free_workshop_seat(v_token);

  -- D: a hold run out but a seat still free: the payment still confirms;
  -- with no seat left the seat is lost (and the money goes back).
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-signup-b', 'ws-signup-key-3');
  INSERT INTO tokens VALUES ('b1', v_token);
  PERFORM public.save_workshop_registration_details(v_token, 'Celina', 'celina@example.invalid', NULL, NULL, true, true);
  PERFORM public.attach_workshop_checkout(v_token, 'cs_test_ws_b1', now() + interval '31 minutes', 8000, 'pln');
  UPDATE public.workshop_registrations SET hold_expires_at = now() - interval '1 minute'
  WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  IF public.fulfill_workshop_checkout('cs_test_ws_b1', true, 'pi_test_ws_b1') <> 'confirmed' THEN
    RAISE EXCEPTION 'D: a late payment with a free seat was not confirmed';
  END IF;
  UPDATE public.workshops SET capacity = 2 WHERE slug = 'ws-signup-b';
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-signup-b', 'ws-signup-key-4');
  PERFORM public.save_workshop_registration_details(v_token, 'Dora', 'dora@example.invalid', NULL, NULL, true, true);
  PERFORM public.attach_workshop_checkout(v_token, 'cs_test_ws_b2', now() + interval '31 minutes', 8000, 'pln');
  UPDATE public.workshop_registrations SET hold_expires_at = now() - interval '1 minute'
  WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  -- Someone else takes the freed seat first.
  PERFORM public.hold_workshop_seat('ws-signup-b', 'ws-signup-key-5');
  IF public.fulfill_workshop_checkout('cs_test_ws_b2', true, 'pi_test_ws_b2') <> 'seat_lost' THEN
    RAISE EXCEPTION 'D: a late payment took a seat someone else held';
  END IF;

  -- E: a refund is recorded on the payment and the registration.
  IF NOT public.record_workshop_refund('pi_test_ws_b1', 8000)
     OR (SELECT refunded_minor FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'b1'))) <> 8000 THEN
    RAISE EXCEPTION 'E: the refund was not recorded';
  END IF;
  IF public.record_workshop_refund('pi_test_unknown', 100) THEN
    RAISE EXCEPTION 'E: an unknown payment was refunded';
  END IF;
END;
$$;

DO $$
DECLARE
  v_mail record;
BEGIN
  -- F: the confirmation is claimed once; its link opens the registration.
  SELECT * INTO v_mail FROM public.claim_workshop_email(
    (SELECT reference FROM public.get_workshop_registration((SELECT token FROM tokens WHERE name = 'a1'))),
    'confirmation');
  IF v_mail.manage_token IS NULL OR v_mail.leaders IS NULL THEN
    RAISE EXCEPTION 'F: the confirmation was not claimed: %', row_to_json(v_mail);
  END IF;
  IF EXISTS (SELECT 1 FROM public.claim_workshop_email(v_mail.reference, 'confirmation')) THEN
    RAISE EXCEPTION 'F: the confirmation was claimed twice';
  END IF;
  IF (SELECT client_email FROM public.get_workshop_registration(v_mail.manage_token)) <> 'anna@example.invalid' THEN
    RAISE EXCEPTION 'F: the e-mail''s link did not open the registration';
  END IF;
  IF EXISTS (SELECT 1 FROM public.claim_workshop_email(v_mail.reference, 'reserved')) THEN
    RAISE EXCEPTION 'F: a confirmed seat was e-mailed as reserved';
  END IF;
  -- A failed send gives the claim back.
  PERFORM public.release_workshop_email(v_mail.reference, 'confirmation');
  IF NOT EXISTS (SELECT 1 FROM public.claim_workshop_email(v_mail.reference, 'confirmation')) THEN
    RAISE EXCEPTION 'F: a released e-mail could not be claimed again';
  END IF;
  PERFORM public.mark_workshop_email_sent(v_mail.reference, 'confirmation', 'msg-1');
END;
$$;

-- G: the visit's booking refuses a workshops-only code.
DO $$
BEGIN
  IF pg_temp.hint_of($sql$SELECT private.usable_discount_code('WARSZTATY', NULL)$sql$) <> 'code_not_here' THEN
    RAISE EXCEPTION 'G: a workshops code worked on a visit';
  END IF;
  IF pg_temp.hint_of($sql$SELECT private.usable_discount_code('WSZYSTKO', NULL)$sql$) <> 'ok' THEN
    RAISE EXCEPTION 'G: a code for everything did not work on a visit';
  END IF;
END;
$$;

-- H: the admin sees each code's scope and use.
SELECT set_config('request.jwt.claims',
  '{"sub":"7c000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
DO $$
BEGIN
  IF (SELECT used_count FROM public.list_discount_codes() WHERE code = 'WARSZTATY') <> 1
     OR (SELECT workshop_title FROM public.list_discount_codes() WHERE code = 'TYLKO-B') <> 'Warsztat B' THEN
    RAISE EXCEPTION 'H: the codes'' list did not show scope and use';
  END IF;
  PERFORM public.save_discount_code(NULL, 'NOWY', 'percent', 5, NULL, NULL, true, '', 'all', NULL);
  BEGIN
    PERFORM public.delete_discount_code((SELECT id FROM public.discount_codes WHERE code = 'WARSZTATY'));
    RAISE EXCEPTION 'H: a code used on a workshop was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'discount_code_used' THEN RAISE; END IF;
  END;
END;
$$;
RESET ROLE;

-- I: visitors read public workshops, their leaders and seats.
SELECT set_config('request.jwt.claims', '', true);
SET LOCAL ROLE anon;
DO $$
DECLARE
  v_row record;
BEGIN
  SELECT * INTO v_row FROM public.list_public_workshops() WHERE slug = 'ws-signup-a';
  IF v_row.seats_left <> 0 OR NOT v_row.registration_open
     OR v_row.leaders -> 0 ->> 'name' <> 'Ewa Prowadząca' THEN
    RAISE EXCEPTION 'I: the public workshop was wrong: %', row_to_json(v_row);
  END IF;
  BEGIN
    PERFORM 1 FROM public.workshop_payments LIMIT 1;
    RAISE EXCEPTION 'I: a visitor read payments';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;
RESET ROLE;

ROLLBACK;
