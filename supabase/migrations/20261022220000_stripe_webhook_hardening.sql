-- Stripe's side, hardened (audit of 22.10, R1, R7, R8):
--   - a dispute (a chargeback) is written to the visit's history and the
--     centre's admins are told, when it opens and when it closes;
--   - a payment still "in progress" (BLIK, Przelewy24) two hours on is
--     listed for the scheduled job to ask Stripe about, so a lost event
--     never holds a time for good;
--   - a reservation past its time to pay is cancelled even with a payment
--     begun for it, once that payment's session (31 minutes) is over.

ALTER TABLE public.appointment_events
  DROP CONSTRAINT appointment_events_kind_check,
  ADD CONSTRAINT appointment_events_kind_check CHECK (kind = ANY (ARRAY[
    'created', 'details_saved', 'hold_released', 'hold_expired',
    'awaiting_payment', 'confirmed', 'cancelled', 'rescheduled',
    'payment_started', 'payment_succeeded', 'payment_failed',
    'payment_expired', 'refund_recorded', 'email_sent', 'reserved',
    'refund_issued', 'reservation_confirmed', 'payment_disputed',
    'dispute_closed'
  ]));

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_kind_check,
  ADD CONSTRAINT notifications_kind_check CHECK (kind = ANY (ARRAY[
    'booked', 'reserved', 'centre_booked', 'paid', 'cancelled',
    'rescheduled', 'refunded', 'profile_submitted', 'profile_approved',
    'profile_rejected', 'visit_to_close', 'unpaid_limit', 'disputed',
    'dispute_closed'
  ]));

-- A dispute on a visit's payment (Stripe's charge.dispute.created and
-- charge.dispute.closed): the history says so, with the amount, the
-- reason and how it ended; the admins get a notification. The visit's
-- reference, or null when the payment is not a visit's.
CREATE FUNCTION public.record_dispute(
  p_payment_intent_id text, p_dispute_id text, p_status text,
  p_amount_minor integer, p_reason text, p_closed boolean
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_kind text := CASE WHEN p_closed THEN 'dispute_closed' ELSE 'payment_disputed' END;
BEGIN
  SELECT visit.* INTO v_visit
  FROM public.payments AS payment
  JOIN public.appointments AS visit ON visit.id = payment.appointment_id
  WHERE payment.payment_intent_id = p_payment_intent_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  PERFORM private.log_appointment_event(v_visit.id, v_kind, 'payment',
    jsonb_strip_nulls(jsonb_build_object(
      'dispute_id', p_dispute_id, 'status', p_status,
      'amount_minor', p_amount_minor, 'reason', p_reason
    )));
  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT admin.user_id, 'admin', v_visit.id,
    CASE WHEN p_closed THEN 'dispute_closed' ELSE 'disputed' END, 'payment',
    jsonb_strip_nulls(jsonb_build_object(
      'reference', v_visit.reference,
      'starts_at', lower(v_visit.during),
      'mode', v_visit.mode,
      'client_name', v_visit.client_name,
      'service_name', (SELECT service.name FROM public.services AS service
                       WHERE service.id = v_visit.service_id),
      'dispute_status', p_status,
      'dispute_reason', p_reason,
      'amount_minor', p_amount_minor,
      'price_minor', v_visit.price_minor,
      'currency_code', v_visit.currency_code
    ))
  FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
        WHERE role.role = 'admin') AS admin;
  RETURN v_visit.reference;
END;
$$;

REVOKE ALL ON FUNCTION public.record_dispute(text, text, text, integer, text, boolean)
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.record_dispute(text, text, text, integer, text, boolean)
  TO service_role;

-- The Checkout Sessions whose payment is still pending two hours after it
-- began (a session lives 31 minutes; BLIK and Przelewy24 settle within
-- minutes): the scheduled job asks Stripe how they ended. Oldest first.
CREATE FUNCTION public.list_stuck_payments()
RETURNS TABLE (checkout_session_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT payment.checkout_session_id
  FROM public.payments AS payment
  WHERE payment.status = 'pending'
    AND payment.created_at < now() - interval '2 hours'
  ORDER BY payment.created_at
  LIMIT 50;
$$;

REVOKE ALL ON FUNCTION public.list_stuck_payments() FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.list_stuck_payments() TO service_role;

-- (The body of 20261022200000_pay_later_limits, with a payment counting as
-- going on only while its session can still be paid.)
CREATE OR REPLACE FUNCTION private.cancel_overdue_payments()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $$
  WITH lapsed AS (
    UPDATE public.appointments AS visit
    SET status = 'expired', reservation_confirm_by = NULL
    WHERE visit.status = 'awaiting_payment'
      AND visit.reservation_confirm_by IS NOT NULL
      AND visit.payment_due_at <= now()
      AND NOT EXISTS (
        SELECT 1 FROM public.payments AS payment
        WHERE payment.appointment_id = visit.id AND payment.status = 'pending'
          AND payment.created_at > now() - interval '31 minutes'
      )
    RETURNING visit.id
  )
  -- (Every data-changing WITH runs, whether or not it is read.)
  UPDATE public.appointments AS visit
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'system',
      refund_due_minor = 0
  WHERE visit.status = 'awaiting_payment'
    AND visit.reservation_confirm_by IS NULL
    AND visit.payment_due_at <= now()
    AND NOT EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id AND payment.status = 'pending'
        AND payment.created_at > now() - interval '31 minutes'
    )
  RETURNING visit.reference;
$$;
