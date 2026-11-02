-- A price is 0 zł (free) or at least 2 zł (Klient · 4, card 9; #256,
-- decided 27.10): Stripe takes no less, and a few groszy is a mistake. For
-- a service's offers and for workshops alike. Checked from now on for every
-- price set or changed (NOT VALID: a price saved before stays until it is
-- next edited).
ALTER TABLE public.specialist_services
  ADD CONSTRAINT specialist_services_price_free_or_two
  CHECK (price_minor = 0 OR price_minor >= 200) NOT VALID;
ALTER TABLE public.workshops
  ADD CONSTRAINT workshops_price_free_or_two
  CHECK (price_minor = 0 OR price_minor >= 200) NOT VALID;

-- confirm_free_booking: the body of 20261022100000_discount_codes, a visit
-- free by its service's price (0 zł) too, not only by a code covering it.
CREATE OR REPLACE FUNCTION public.confirm_free_booking(p_access_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  v_visit := private.held_visit(p_access_token);
  IF v_visit.terms_accepted_at IS NULL OR v_visit.client_email IS NULL THEN
    RAISE EXCEPTION 'The client''s details come first' USING HINT = 'details_required';
  END IF;
  IF v_visit.price_minor <> 0 THEN
    RAISE EXCEPTION 'The visit is not free' USING HINT = 'not_free';
  END IF;
  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  UPDATE public.appointments
  SET status = 'confirmed', confirmed_at = now(), hold_expires_at = NULL
  WHERE id = v_visit.id;
END;
$$;
