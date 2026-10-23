-- A discount code on a workshop seat before the participant's details
-- (20261024120000, #190): it applies and comes off on a held seat with no
-- details yet, saving the details later keeps it, paying still needs the
-- details, and a seat run out still refuses it. Everything is rolled back
-- at the end.

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
  ('7c100000-0000-4000-8000-000000000002', 'authenticated', 'authenticated',
    'ws-code-leader@example.invalid', '{"provider":"email","providers":["email"]}',
    '{"first_name":"Ws","last_name":"Leader"}', now(), now(), false, false);

INSERT INTO public.user_roles (user_id, role)
VALUES ('7c100000-0000-4000-8000-000000000002', 'specialist');

INSERT INTO public.workshops (
  slug, title, specialist_id, modality, starts_at, ends_at, price_minor,
  capacity, registration_enabled, status
)
SELECT 'ws-code', 'Warsztat z kodem', specialist.id, 'online',
  ((current_date + 20) + time '17:00') AT TIME ZONE 'Europe/Warsaw',
  ((current_date + 20) + time '19:00') AT TIME ZONE 'Europe/Warsaw',
  10000, 5, true, 'published'
FROM public.specialists AS specialist
WHERE specialist.user_id = '7c100000-0000-4000-8000-000000000002';

INSERT INTO public.discount_codes (code, kind, value, scope, workshop_id)
VALUES ('PRZED-DANYMI', 'percent', 50, 'workshops', NULL);

DO $$
DECLARE
  v_token text;
  v_price integer;
  v_reg record;
BEGIN
  -- A: a held seat with no details takes the code and gives it back.
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-code', 'ws-code-key-1');
  SELECT price_minor INTO v_price FROM public.apply_workshop_discount(v_token, 'przed-danymi');
  IF v_price <> 5000 THEN
    RAISE EXCEPTION 'A: the code before the details gave %', v_price;
  END IF;
  PERFORM public.remove_workshop_discount(v_token);
  SELECT * INTO v_reg FROM public.get_workshop_registration(v_token);
  IF v_reg.price_minor <> 10000 OR v_reg.discount_code IS NOT NULL THEN
    RAISE EXCEPTION 'A: the code did not come off before the details';
  END IF;

  -- B: the details saved after the code keep it; paying needs the details.
  PERFORM public.apply_workshop_discount(v_token, 'PRZED-DANYMI');
  IF pg_temp.hint_of(format(
    'SELECT public.attach_workshop_checkout(%L, %L, now() + interval ''31 minutes'', 5000, %L)',
    v_token, 'cs_test_code_a', 'pln')) <> 'details_required' THEN
    RAISE EXCEPTION 'B: a seat with no details started a payment';
  END IF;
  PERFORM public.save_workshop_registration_details(v_token, 'Anna', 'anna-code@example.invalid', NULL, NULL, true, true);
  SELECT * INTO v_reg FROM public.get_workshop_registration(v_token);
  IF v_reg.price_minor <> 5000 OR v_reg.discount_code <> 'PRZED-DANYMI' THEN
    RAISE EXCEPTION 'B: saving the details dropped the code';
  END IF;
  PERFORM public.attach_workshop_checkout(v_token, 'cs_test_code_a', now() + interval '31 minutes', 5000, 'pln');

  -- C: a seat whose hold ran out takes no code.
  SELECT access_token INTO v_token FROM public.hold_workshop_seat('ws-code', 'ws-code-key-2');
  UPDATE public.workshop_registrations SET hold_expires_at = now() - interval '1 minute'
  WHERE access_token_hash = extensions.digest(v_token, 'sha256');
  IF pg_temp.hint_of(format('SELECT public.apply_workshop_discount(%L, %L)', v_token, 'PRZED-DANYMI'))
     <> 'hold_expired' THEN
    RAISE EXCEPTION 'C: a seat run out took a code';
  END IF;
END;
$$;

ROLLBACK;
