-- A payment is settled once (audit of 22.10). The return page settles the
-- session each time it is opened, so `fulfill_checkout_session` remembers
-- what it decided for each payment and a repeat changes nothing:
--   - a payment that confirmed its visit never turns into a refund later
--     (a visit cancelled late, or by the centre with part of the money, is
--     not refunded in full by opening the old return page again);
--   - a payment that was to be refunded never confirms the visit later
--     (the time freed again after a refund does not make the visit free);
--   - a payment for a visit already paid, or for another amount than the
--     visit's price (an old session after a discount code changed), is
--     refunded instead of being kept or confirming the visit.
-- Refunds are recorded only upwards, whatever order Stripe's events come in.

ALTER TABLE public.payments
  ADD COLUMN fulfilment text
  CONSTRAINT payments_fulfilment_valid
    CHECK (fulfilment IN ('confirmed', 'slot_lost', 'refund_payment'));

COMMENT ON COLUMN public.payments.fulfilment IS
  'What paying this session did: confirmed the visit, or is to be refunded (slot_lost, refund_payment).';

CREATE OR REPLACE FUNCTION public.fulfill_checkout_session(
  p_session_id text, p_paid boolean, p_payment_intent_id text
) RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_visit public.appointments%ROWTYPE;
  v_outcome text;
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

  IF p_payment_intent_id IS NOT NULL AND v_payment.payment_intent_id IS NULL THEN
    UPDATE public.payments SET payment_intent_id = p_payment_intent_id
    WHERE id = v_payment.id;
  END IF;

  -- Settled before: the same answer, and nothing changes.
  IF v_payment.fulfilment = 'confirmed' THEN
    RETURN CASE WHEN v_visit.status = 'confirmed' THEN 'already_confirmed' ELSE 'already_settled' END;
  END IF;
  IF v_payment.fulfilment IS NOT NULL THEN
    -- Still to refund until the money is back (a refund that failed is retried).
    RETURN CASE WHEN v_payment.refunded_minor >= v_payment.amount_minor
      THEN 'already_settled' ELSE v_payment.fulfilment END;
  END IF;

  IF NOT p_paid THEN
    -- The money is on its way (BLIK, Przelewy24): the time waits for it.
    IF v_visit.status = 'confirmed' THEN
      RETURN 'already_confirmed';
    END IF;
    IF v_visit.status = 'cancelled' THEN
      RETURN 'slot_lost';
    END IF;
    BEGIN
      UPDATE public.appointments
      SET status = 'awaiting_payment', hold_expires_at = NULL
      WHERE id = v_visit.id;
      RETURN 'awaiting_payment';
    EXCEPTION WHEN exclusion_violation THEN
      UPDATE public.appointments SET status = 'expired'
      WHERE id = v_visit.id AND status IN ('held', 'awaiting_payment');
      RETURN 'slot_lost';
    END;
  END IF;

  UPDATE public.payments
  SET status = CASE WHEN status IN ('refunded', 'partially_refunded') THEN status ELSE 'succeeded' END
  WHERE id = v_payment.id;

  IF v_visit.status = 'confirmed' THEN
    -- Paid twice (two sessions for one visit): this one goes back.
    v_outcome := 'refund_payment';
  ELSIF v_visit.status = 'cancelled' THEN
    v_outcome := 'slot_lost';
  ELSIF v_payment.amount_minor <> v_visit.price_minor
     OR v_payment.currency_code <> v_visit.currency_code THEN
    -- Not the visit's price (an old session after the code changed).
    v_outcome := 'refund_payment';
  ELSE
    BEGIN
      UPDATE public.appointments
      SET status = 'confirmed', confirmed_at = now(), hold_expires_at = NULL
      WHERE id = v_visit.id;
      v_outcome := 'confirmed';
    EXCEPTION WHEN exclusion_violation THEN
      -- The hold lapsed and someone else has the time now.
      UPDATE public.appointments SET status = 'expired'
      WHERE id = v_visit.id AND status IN ('held', 'awaiting_payment');
      v_outcome := 'slot_lost';
    END;
  END IF;

  UPDATE public.payments SET fulfilment = v_outcome WHERE id = v_payment.id;
  RETURN v_outcome;
END;
$$;

CREATE OR REPLACE FUNCTION public.record_refund(
  p_payment_intent_id text, p_refunded_minor integer
) RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
BEGIN
  -- All refunded so far only grows: an older event arriving late, or a
  -- refund of nothing, changes nothing.
  UPDATE public.payments
  SET refunded_minor = greatest(refunded_minor, least(p_refunded_minor, amount_minor)),
      status = CASE
        WHEN greatest(refunded_minor, least(p_refunded_minor, amount_minor)) >= amount_minor
          THEN 'refunded'::public.payment_status
        WHEN greatest(refunded_minor, least(p_refunded_minor, amount_minor)) > 0
          THEN 'partially_refunded'::public.payment_status
        ELSE status
      END
  WHERE payment_intent_id = p_payment_intent_id;
  RETURN FOUND;
END;
$$;
