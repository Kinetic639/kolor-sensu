-- Discount codes (20261022100000): only admins manage them; a code takes a
-- percentage or an amount off a held visit (never below zero), within its
-- dates and while switched on; another code replaces it, removing it brings
-- the list price back, and the payment begun at the old price is given up;
-- a visit the code made free is confirmed without a payment; a used code
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

  -- An amount over the price: free, never below zero; confirmed.
  SELECT * INTO result FROM public.apply_discount_code('token-2', 'ZA-DARMO');
  IF result.price_minor <> 0 OR result.discount_minor <> 20000 THEN
    RAISE EXCEPTION 'B: the discount went past the price: %', result;
  END IF;
  PERFORM public.confirm_free_booking('token-2');
  IF (SELECT status FROM public.appointments WHERE reference = 'KS-DISC-2') <> 'confirmed' THEN
    RAISE EXCEPTION 'B: the free visit was not confirmed';
  END IF;
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
     OR (SELECT discount_total_minor FROM public.list_discount_codes() WHERE code = 'ZA-DARMO') <> 20000 THEN
    RAISE EXCEPTION 'U: the code''s uses were not counted';
  END IF;
  IF (
    SELECT discount_minor FROM public.get_visit_discount(
      (SELECT id FROM public.appointments WHERE reference = 'KS-DISC-2')
    )
  ) IS DISTINCT FROM 20000 THEN
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

ROLLBACK;
