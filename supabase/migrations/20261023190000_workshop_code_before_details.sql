-- A discount code on a workshop seat before the participant's details
-- (#190). The code's form sits above the details, and the details are
-- saved only by "Zapłać teraz" or "Zarezerwuj", which go on at once: so
-- requiring them first (private.payable_workshop_seat) refused every code
-- (details_required). A code needs only a seat still held, offered or
-- reserved; paying still needs the details.

-- A seat still the guest's: held, offered or reserved, and not run out.
CREATE FUNCTION private.live_workshop_seat(p_access_token text)
RETURNS public.workshop_registrations
LANGUAGE plpgsql
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  v_registration := private.workshop_registration_by_token(p_access_token);
  IF v_registration.id IS NULL OR NOT (
    (v_registration.status = 'held' AND v_registration.hold_expires_at > now())
    OR (v_registration.status = 'offered' AND v_registration.offer_expires_at > now())
    OR (v_registration.status = 'awaiting_payment' AND v_registration.payment_due_at > now())
  ) THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  RETURN v_registration;
END;
$$;

REVOKE ALL ON FUNCTION private.live_workshop_seat(text) FROM PUBLIC, anon, authenticated;

-- (The body of 20261023120000_discount_code_rules, with the seat checked
-- by live_workshop_seat.)
CREATE OR REPLACE FUNCTION public.apply_workshop_discount(p_access_token text, p_code text)
RETURNS TABLE (code text, list_price_minor integer, discount_minor integer, price_minor integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
  v_code public.discount_codes%ROWTYPE;
  v_list integer;
  v_discount integer;
BEGIN
  v_registration := private.live_workshop_seat(p_access_token);
  PERFORM private.check_discount_attempts(p_access_token);
  v_code := private.usable_discount_code(p_code, v_registration.workshop_id);
  PERFORM private.check_code_uses(v_code.id, NULL, v_registration.id);
  v_list := coalesce(v_registration.list_price_minor, v_registration.price_minor);
  v_discount := private.discount_on(v_code.kind, v_code.value, v_list);

  UPDATE public.workshop_payments SET status = 'expired'
  WHERE registration_id = v_registration.id AND status = 'pending';
  UPDATE public.workshop_registrations AS r SET
    list_price_minor = v_list,
    discount_minor = v_discount,
    price_minor = v_list - v_discount,
    discount_code_id = v_code.id
  WHERE r.id = v_registration.id;

  RETURN QUERY SELECT v_code.code, v_list, v_discount, v_list - v_discount;
END;
$$;

-- (The body of 20261023090000_workshop_signup, with the seat checked by
-- live_workshop_seat.)
CREATE OR REPLACE FUNCTION public.remove_workshop_discount(p_access_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_registration public.workshop_registrations%ROWTYPE;
BEGIN
  v_registration := private.live_workshop_seat(p_access_token);
  IF v_registration.discount_code_id IS NULL THEN
    RETURN;
  END IF;
  UPDATE public.workshop_payments SET status = 'expired'
  WHERE registration_id = v_registration.id AND status = 'pending';
  UPDATE public.workshop_registrations AS r SET
    price_minor = v_registration.list_price_minor,
    list_price_minor = NULL,
    discount_minor = 0,
    discount_code_id = NULL
  WHERE r.id = v_registration.id;
END;
$$;
