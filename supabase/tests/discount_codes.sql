-- Discount codes (20261022100000): only admins manage them; a code takes a
-- percentage or an amount off a held visit (never below zero), within its
-- dates and while switched on; another code replaces it, removing it brings
-- the list price back, and the payment begun at the old price is given up;
-- no code makes a visit free (it leaves at least 2 zł to pay); a used code
-- cannot be deleted. Everything is rolled back at the end.

BEGIN;

INSERT INTO auth.users (
  id, aud, role, email, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, is_sso_user, is_anonymous
)
VALUES
  ('5c000000-0000-4000-8000-000000000001', 'authenticated', 'authenticated',
    'discount-admin@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Discount","last_name":"Admin"}', now(), now(), false, false),
  ('5c000000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'discount-specialist@example.invalid',
    '{"provider":"email","providers":["email"]}',
    '{"first_name":"Discount","last_name":"Specialist"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES
  ('5c000000-0000-4000-8000-000000000001', 'admin'),
  ('5c000000-0000-4000-8000-000000000002', 'specialist');

INSERT INTO public.services (name, slug, category, default_duration_minutes, active, publicly_visible, booking_enabled)
VALUES ('Discount Consultation', 'discount-test-consultation', 'consultation', 50, true, true, true);

INSERT INTO public.specialist_services (specialist_id, service_id, active, price_minor, supports_in_person, supports_online)
SELECT specialist.id, service.id, true, 20000, true, true
FROM public.specialists AS specialist, public.services AS service
WHERE specialist.user_id = '5c000000-0000-4000-8000-000000000002'
  AND service.slug = 'discount-test-consultation';

-- A held visit (200 zł) with the guest's details, and one other.
INSERT INTO public.appointments (
  reference, specialist_id, service_id, specialist_service_id, mode, room_id,
  during, buffer_minutes, duration_minutes, price_minor, currency_code,
  status, hold_expires_at, access_token_hash, client_name, client_email,
  terms_accepted_at, privacy_accepted_at
)
SELECT ref, offer.specialist_id, offer.service_id, offer.id, 'online', NULL,
  tstzrange(now() + make_interval(days => 7 + n), now() + make_interval(days => 7 + n, mins => 50)),
  10, 50, 20000, 'PLN', 'held', now() + interval '10 minutes',
  extensions.digest(token, 'sha256'), 'Gość Testowy', 'guest@example.invalid',
  now(), now()
FROM public.specialist_services AS offer
JOIN public.services AS service ON service.id = offer.service_id
CROSS JOIN (VALUES ('KS-DISC-1', 'token-1', 0), ('KS-DISC-2', 'token-2', 1)) AS visit(ref, token, n)
WHERE service.slug = 'discount-test-consultation';

INSERT INTO public.payments (appointment_id, checkout_session_id, amount_minor, currency_code)
SELECT id, 'cs_test_discount', 20000, 'PLN' FROM public.appointments WHERE reference = 'KS-DISC-1';

-- ------------------------------------------------------------ a specialist

SELECT set_config('request.jwt.claims',
  '{"sub":"5c000000-0000-4000-8000-000000000002","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  BEGIN
    PERFORM public.save_discount_code(NULL, 'NOPE', 'percent', 10, NULL, NULL, true, '', 'consultations', NULL);
    RAISE EXCEPTION 'A: a specialist added a code';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM 1 FROM public.discount_codes;
    RAISE EXCEPTION 'A: a specialist read the codes';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
  BEGIN
    PERFORM public.apply_discount_code('token-1', 'NOPE');
    RAISE EXCEPTION 'A: a signed-in user applied a code';
  EXCEPTION WHEN insufficient_privilege THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ the admin

SELECT set_config('request.jwt.claims',
  '{"sub":"5c000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
BEGIN
  PERFORM public.save_discount_code(NULL, ' jesien20 ', 'percent', 20, NULL, NULL, true, 'Jesień', 'consultations', NULL);
  PERFORM public.save_discount_code(NULL, 'MINUS50', 'amount', 5000, NULL, NULL, true, '', 'consultations', NULL);
  PERFORM public.save_discount_code(NULL, 'ZA-DARMO', 'amount', 1000000, NULL, NULL, true, '', 'consultations', NULL);
  PERFORM public.save_discount_code(NULL, 'STARY', 'percent', 10, NULL, current_date - 1, true, '', 'consultations', NULL);
  PERFORM public.save_discount_code(NULL, 'PRZYSZLY', 'percent', 10, current_date + 30, NULL, true, '', 'consultations', NULL);
  PERFORM public.save_discount_code(NULL, 'WYLACZONY', 'percent', 10, NULL, NULL, false, '', 'consultations', NULL);

  IF NOT EXISTS (SELECT 1 FROM public.list_discount_codes() WHERE code = 'JESIEN20') THEN
    RAISE EXCEPTION 'C: the code was not kept in capitals';
  END IF;
  BEGIN
    PERFORM public.save_discount_code(NULL, 'ZLE', 'percent', 101, NULL, NULL, true, '', 'consultations', NULL);
    RAISE EXCEPTION 'C: more than 100 %% was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.save_discount_code(NULL, 'CALOSC', 'percent', 100, NULL, NULL, true, '', 'consultations', NULL);
    RAISE EXCEPTION 'C: a 100 %% code was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.save_discount_code(NULL, 'ZŁY KOD', 'percent', 10, NULL, NULL, true, '', 'consultations', NULL);
    RAISE EXCEPTION 'C: a code with a space was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.save_discount_code(NULL, 'ODWROTNIE', 'percent', 10, current_date, current_date - 1, true, '', 'consultations', NULL);
    RAISE EXCEPTION 'C: an end before the start was accepted';
  EXCEPTION WHEN check_violation THEN NULL;
  END;
  BEGIN
    PERFORM public.save_discount_code(NULL, 'MINUS50', 'percent', 10, NULL, NULL, true, '', 'consultations', NULL);
    RAISE EXCEPTION 'C: the same code twice was accepted';
  EXCEPTION WHEN unique_violation THEN NULL;
  END;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ the booking

SET LOCAL ROLE service_role;

DO $$
DECLARE
  result record;
BEGIN
  -- Refusals.
  BEGIN
    PERFORM public.apply_discount_code('token-1', 'NIEMA');
    RAISE EXCEPTION 'B: an unknown code was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Unknown code' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.apply_discount_code('token-1', 'WYLACZONY');
    RAISE EXCEPTION 'B: a switched-off code was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Unknown code' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.apply_discount_code('token-1', 'STARY');
    RAISE EXCEPTION 'B: an expired code was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Code expired' THEN RAISE; END IF;
  END;
  BEGIN
    PERFORM public.apply_discount_code('token-1', 'PRZYSZLY');
    RAISE EXCEPTION 'B: a code before its start was accepted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'Code not started' THEN RAISE; END IF;
  END;

  -- 20 % off 200 zł; the payment at 200 zł is given up.
  SELECT * INTO result FROM public.apply_discount_code('token-1', 'jesien20');
  IF result.price_minor <> 16000 OR result.discount_minor <> 4000 OR result.list_price_minor <> 20000 THEN
    RAISE EXCEPTION 'B: 20 %% off 200 zł was %', result;
  END IF;
  IF (SELECT status FROM public.payments WHERE checkout_session_id = 'cs_test_discount') <> 'expired' THEN
    RAISE EXCEPTION 'B: the payment at the old price stayed open';
  END IF;

  -- Another code replaces it, counted from the list price.
  SELECT * INTO result FROM public.apply_discount_code('token-1', 'MINUS50');
  IF result.price_minor <> 15000 THEN
    RAISE EXCEPTION 'B: 50 zł off was not from the list price: %', result;
  END IF;
  IF (SELECT code FROM public.get_booking_discount('token-1')) <> 'MINUS50' THEN
    RAISE EXCEPTION 'B: the booking did not name its code';
  END IF;

  -- Removed: the list price again.
  PERFORM public.remove_discount_code('token-1');
  IF (SELECT price_minor FROM public.appointments WHERE reference = 'KS-DISC-1') <> 20000
     OR EXISTS (SELECT 1 FROM public.get_booking_discount('token-1')) THEN
    RAISE EXCEPTION 'B: removing the code did not bring the list price back';
  END IF;

  -- Not free: no confirmation without paying.
  BEGIN
    PERFORM public.confirm_free_booking('token-1');
    RAISE EXCEPTION 'B: a visit to pay for was confirmed for free';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'The visit is not free' THEN RAISE; END IF;
  END;

  -- An amount over the price: cut down to leave 2 zł; still paid for.
  SELECT * INTO result FROM public.apply_discount_code('token-2', 'ZA-DARMO');
  IF result.price_minor <> 200 OR result.discount_minor <> 19800 THEN
    RAISE EXCEPTION 'B: the discount left other than 2 zł: %', result;
  END IF;
  BEGIN
    PERFORM public.confirm_free_booking('token-2');
    RAISE EXCEPTION 'B: a visit with a big code was confirmed for free';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'The visit is not free' THEN RAISE; END IF;
  END;
END;
$$;

RESET ROLE;

-- Paid (as the Stripe webhook confirms it).
UPDATE public.appointments SET status = 'confirmed', confirmed_at = now()
WHERE reference = 'KS-DISC-2';

SET LOCAL ROLE service_role;

DO $$
BEGIN
  -- Confirmed: the code cannot change any more.
  BEGIN
    PERFORM public.remove_discount_code('token-2');
    RAISE EXCEPTION 'B: a confirmed visit lost its code';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'The hold has expired' THEN RAISE; END IF;
  END;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ uses

SELECT set_config('request.jwt.claims',
  '{"sub":"5c000000-0000-4000-8000-000000000001","role":"authenticated"}', true);
SET LOCAL ROLE authenticated;

DO $$
DECLARE
  used uuid;
BEGIN
  IF (SELECT used_count FROM public.list_discount_codes() WHERE code = 'ZA-DARMO') <> 1
     OR (SELECT discount_total_minor FROM public.list_discount_codes() WHERE code = 'ZA-DARMO') <> 19800 THEN
    RAISE EXCEPTION 'U: the code''s uses were not counted';
  END IF;
  IF (
    SELECT discount_minor FROM public.get_visit_discount(
      (SELECT id FROM public.appointments WHERE reference = 'KS-DISC-2')
    )
  ) IS DISTINCT FROM 19800 THEN
    RAISE EXCEPTION 'U: the admin did not see the visit''s code';
  END IF;
  SELECT id INTO used FROM public.list_discount_codes() WHERE code = 'ZA-DARMO';
  BEGIN
    PERFORM public.delete_discount_code(used);
    RAISE EXCEPTION 'U: a used code was deleted';
  EXCEPTION WHEN raise_exception THEN
    IF SQLERRM <> 'discount_code_used' THEN RAISE; END IF;
  END;
  PERFORM public.delete_discount_code((SELECT id FROM public.list_discount_codes() WHERE code = 'PRZYSZLY'));
  IF EXISTS (SELECT 1 FROM public.list_discount_codes() WHERE code = 'PRZYSZLY') THEN
    RAISE EXCEPTION 'U: an unused code was not deleted';
  END IF;
END;
$$;

RESET ROLE;

-- ------------------------------------------------------------ the rules (audit of 22.10)
-- A code leaves at least 2 zł to pay (a price of 2 zł takes none); a limited code's last use
-- goes to whoever takes it first (a lapsed hold gives it back); 10 wrong
-- codes in an hour on one hold, and no code is tried any more.

INSERT INTO public.appointments (
  reference, specialist_id, service_id, specialist_service_id, mode, room_id,
  during, buffer_minutes, duration_minutes, price_minor, currency_code,
  status, hold_expires_at, access_token_hash, client_name, client_email,
  terms_accepted_at, privacy_accepted_at
)
SELECT ref, offer.specialist_id, offer.service_id, offer.id, 'online', NULL,
  tstzrange(now() + make_interval(days => 7 + n), now() + make_interval(days => 7 + n, mins => 50)),
  10, 50, 20000, 'PLN', 'held', now() + interval '10 minutes',
  extensions.digest(token, 'sha256'), 'Gość Testowy', 'guest@example.invalid',
  now(), now()
FROM public.specialist_services AS offer
JOIN public.services AS service ON service.id = offer.service_id
CROSS JOIN (VALUES ('KS-DISC-3', 'token-3', 2), ('KS-DISC-4', 'token-4', 3)) AS visit(ref, token, n)
WHERE service.slug = 'discount-test-consultation';
INSERT INTO public.discount_codes (code, kind, value, max_uses)
VALUES ('PRAWIE', 'amount', 19900, NULL), ('RAZ', 'percent', 10, 1);

CREATE FUNCTION pg_temp.code_hint(p_token text, p_code text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_hint text;
BEGIN
  PERFORM public.apply_discount_code(p_token, p_code);
  RETURN '';
EXCEPTION WHEN OTHERS THEN
  GET STACKED DIAGNOSTICS v_hint = PG_EXCEPTION_HINT;
  RETURN coalesce(nullif(v_hint, ''), SQLERRM);
END;
$$;
GRANT EXECUTE ON FUNCTION pg_temp.code_hint(text, text) TO service_role;

SET LOCAL ROLE service_role;
DO $$
BEGIN
  -- (Two statements: one would read the price from before the code.)
  IF pg_temp.code_hint('token-3', 'PRAWIE') <> '' THEN
    RAISE EXCEPTION 'R: a code over the price was refused';
  END IF;
  IF (SELECT price_minor FROM public.appointments WHERE reference = 'KS-DISC-3') <> 200 THEN
    RAISE EXCEPTION 'R: a code that would leave 1 zł was not cut down to leave 2 zł';
  END IF;
  IF pg_temp.code_hint('token-3', 'RAZ') <> '' OR pg_temp.code_hint('token-3', 'RAZ') <> '' THEN
    RAISE EXCEPTION 'R: a code with a use left was refused (or counted against itself)';
  END IF;
  IF pg_temp.code_hint('token-4', 'RAZ') <> 'code_used_up' THEN
    RAISE EXCEPTION 'R: a code past its uses was accepted';
  END IF;
END;
$$;
RESET ROLE;

-- A price of 2 zł or less takes no code; a percentage is cut down too.
DO $$
BEGIN
  IF private.discount_on('percent', 99, 20000) <> 19800
     OR private.discount_on('amount', 50, 1000) <> 50 THEN
    RAISE EXCEPTION 'R: a discount within the price was changed';
  END IF;
  PERFORM private.discount_on('amount', 100, 200);
  RAISE EXCEPTION 'R: a code on a 2 zł price was accepted';
EXCEPTION WHEN raise_exception THEN
  IF SQLERRM LIKE 'R:%' THEN RAISE; END IF;
END;
$$;

-- The first hold lapses: its use is free again.
UPDATE public.appointments SET hold_expires_at = now() - interval '1 minute'
WHERE reference = 'KS-DISC-3';
SET LOCAL ROLE service_role;
DO $$
DECLARE
  i integer;
BEGIN
  IF pg_temp.code_hint('token-4', 'RAZ') <> '' THEN
    RAISE EXCEPTION 'R: a lapsed hold kept the code''s use';
  END IF;
  FOR i IN 1..10 LOOP
    PERFORM public.note_discount_refusal('token-4');
  END LOOP;
  IF pg_temp.code_hint('token-4', 'MINUS50') <> 'too_many_attempts' THEN
    RAISE EXCEPTION 'R: codes were still tried after 10 wrong ones';
  END IF;
  IF pg_temp.code_hint('token-2', 'MINUS50') = 'too_many_attempts' THEN
    RAISE EXCEPTION 'R: another hold paid for the wrong guesses';
  END IF;
END;
$$;
RESET ROLE;

SET LOCAL ROLE anon;
DO $$
BEGIN
  PERFORM public.note_discount_refusal('token-1');
  RAISE EXCEPTION 'R: anon noted a refusal';
EXCEPTION WHEN insufficient_privilege THEN NULL;
END;
$$;
RESET ROLE;

ROLLBACK;
