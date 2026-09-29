-- Paying for a visit (docs/product/booking-plan.md, R6). The site's server
-- creates a Stripe Checkout Session and ties it to the hold; the hold then
-- lasts as long as the session. Paying confirms the visit once, whichever
-- arrives first: the client's return page or Stripe's webhook. A session
-- that fails or expires frees the time. Money that arrives for a time that
-- was lost meanwhile is reported as `slot_lost`, for the server to refund.

-- Ties a Checkout Session to the client's live hold, which must have their
-- details and the visit's own amount; an earlier pending session of the
-- visit is set aside (the server expires it at Stripe).
CREATE FUNCTION public.attach_checkout_session(
  p_access_token text,
  p_session_id text,
  p_expires_at timestamptz,
  p_amount_minor integer,
  p_currency_code text
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_visit FROM public.appointments
  WHERE access_token_hash = extensions.digest(p_access_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND OR v_visit.status <> 'held' OR v_visit.hold_expires_at <= now() THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  IF v_visit.terms_accepted_at IS NULL OR v_visit.client_email IS NULL THEN
    RAISE EXCEPTION 'The client''s details come first' USING HINT = 'details_required';
  END IF;
  IF p_amount_minor IS DISTINCT FROM v_visit.price_minor
     OR upper(p_currency_code) IS DISTINCT FROM v_visit.currency_code THEN
    RAISE EXCEPTION 'The amount is not the visit''s' USING HINT = 'amount_mismatch';
  END IF;

  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';

  INSERT INTO public.payments (appointment_id, checkout_session_id, amount_minor, currency_code)
  VALUES (v_visit.id, p_session_id, p_amount_minor, v_visit.currency_code);

  -- While the client pays, the time stays theirs (never beyond a day).
  UPDATE public.appointments
  SET hold_expires_at = greatest(
    hold_expires_at,
    least(p_expires_at, now() + interval '1 day')
  )
  WHERE id = v_visit.id;
END;
$$;

-- The session the client is paying in, if any (to show it again).
CREATE FUNCTION public.pending_checkout_session(p_access_token text)
RETURNS TABLE (checkout_session_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT payment.checkout_session_id
  FROM public.payments AS payment
  JOIN public.appointments AS visit ON visit.id = payment.appointment_id
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
    AND payment.status = 'pending'
  ORDER BY payment.created_at DESC
  LIMIT 1;
$$;

-- A session completed: paid now (`p_paid`), or later (BLIK, Przelewy24).
-- Idempotent. Returns `confirmed`, `already_confirmed`, `awaiting_payment`,
-- `slot_lost` (paid, but the time is taken: refund) or `unknown_session`.
CREATE FUNCTION public.fulfill_checkout_session(
  p_session_id text,
  p_paid boolean,
  p_payment_intent_id text
)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_visit public.appointments%ROWTYPE;
BEGIN
  SELECT * INTO v_payment FROM public.payments
  WHERE checkout_session_id = p_session_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RETURN 'unknown_session';
  END IF;
  SELECT * INTO v_visit FROM public.appointments
  WHERE id = v_payment.appointment_id
  FOR UPDATE;

  IF p_paid THEN
    UPDATE public.payments
    SET status = CASE WHEN status IN ('refunded', 'partially_refunded') THEN status ELSE 'succeeded' END,
        payment_intent_id = coalesce(p_payment_intent_id, payment_intent_id)
    WHERE id = v_payment.id;
  END IF;

  IF v_visit.status = 'confirmed' THEN
    RETURN 'already_confirmed';
  END IF;

  BEGIN
    IF p_paid THEN
      UPDATE public.appointments
      SET status = 'confirmed', confirmed_at = now(), hold_expires_at = NULL
      WHERE id = v_visit.id;
      RETURN 'confirmed';
    END IF;
    UPDATE public.appointments
    SET status = 'awaiting_payment', hold_expires_at = NULL
    WHERE id = v_visit.id;
    RETURN 'awaiting_payment';
  EXCEPTION WHEN exclusion_violation THEN
    -- The hold lapsed and someone else has the time now.
    UPDATE public.appointments SET status = 'expired'
    WHERE id = v_visit.id AND status IN ('held', 'awaiting_payment');
    RETURN 'slot_lost';
  END;
END;
$$;

-- A session that failed or expired: the time is free again.
CREATE FUNCTION public.fail_checkout_session(p_session_id text, p_reason text)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  IF p_reason NOT IN ('failed', 'expired') THEN
    RAISE EXCEPTION 'Unknown reason %', p_reason USING ERRCODE = 'invalid_parameter_value';
  END IF;
  UPDATE public.payments
  SET status = p_reason::public.payment_status
  WHERE checkout_session_id = p_session_id AND status = 'pending'
  RETURNING * INTO v_payment;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  UPDATE public.appointments SET status = 'expired'
  WHERE id = v_payment.appointment_id AND status IN ('held', 'awaiting_payment');
END;
$$;

-- Money given back (all or part) for a payment.
CREATE FUNCTION public.record_refund(p_payment_intent_id text, p_refunded_minor integer)
RETURNS boolean
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  UPDATE public.payments
  SET refunded_minor = least(p_refunded_minor, amount_minor),
      status = CASE
        WHEN p_refunded_minor >= amount_minor THEN 'refunded'::public.payment_status
        ELSE 'partially_refunded'::public.payment_status
      END
  WHERE payment_intent_id = p_payment_intent_id;
  RETURN FOUND;
END;
$$;

REVOKE ALL ON FUNCTION public.attach_checkout_session(text, text, timestamptz, integer, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_checkout_session(text, text, timestamptz, integer, text)
TO service_role;
REVOKE ALL ON FUNCTION public.pending_checkout_session(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pending_checkout_session(text) TO service_role;
REVOKE ALL ON FUNCTION public.fulfill_checkout_session(text, boolean, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fulfill_checkout_session(text, boolean, text) TO service_role;
REVOKE ALL ON FUNCTION public.fail_checkout_session(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.fail_checkout_session(text, text) TO service_role;
REVOKE ALL ON FUNCTION public.record_refund(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.record_refund(text, integer) TO service_role;
