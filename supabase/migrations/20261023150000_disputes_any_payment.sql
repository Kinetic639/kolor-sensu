-- A dispute finds its payment whatever came first, and a workshop seat's
-- too. Stripe may send charge.dispute.created before the payment is settled
-- (its payment intent not yet stored), so the visit or the seat is also
-- found by the reference Stripe keeps with the payment (its metadata). A
-- dispute on a workshop seat's payment tells the admins too (seats have no
-- history of their own yet).

DROP FUNCTION public.record_dispute(text, text, text, integer, text, boolean);

-- (The body of 20261022220000_stripe_webhook_hardening, finding the visit
-- by its reference too, and a workshop seat.) The visit's or the seat's
-- reference, or null when the payment is neither.
CREATE FUNCTION public.record_dispute(
  p_payment_intent_id text, p_dispute_id text, p_status text,
  p_amount_minor integer, p_reason text, p_closed boolean,
  p_reference text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_seat public.workshop_registrations%ROWTYPE;
  v_kind text := CASE WHEN p_closed THEN 'dispute_closed' ELSE 'payment_disputed' END;
  v_notice text := CASE WHEN p_closed THEN 'dispute_closed' ELSE 'disputed' END;
  v_money jsonb := jsonb_strip_nulls(jsonb_build_object(
    'dispute_status', p_status,
    'dispute_reason', p_reason,
    'amount_minor', p_amount_minor
  ));
BEGIN
  SELECT visit.* INTO v_visit
  FROM public.payments AS payment
  JOIN public.appointments AS visit ON visit.id = payment.appointment_id
  WHERE payment.payment_intent_id = p_payment_intent_id;
  IF NOT FOUND AND p_reference IS NOT NULL THEN
    SELECT * INTO v_visit FROM public.appointments WHERE reference = p_reference;
  END IF;

  IF v_visit.id IS NOT NULL THEN
    PERFORM private.log_appointment_event(v_visit.id, v_kind, 'payment',
      jsonb_strip_nulls(jsonb_build_object(
        'dispute_id', p_dispute_id, 'status', p_status,
        'amount_minor', p_amount_minor, 'reason', p_reason
      )));
    INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
    SELECT admin.user_id, 'admin', v_visit.id, v_notice, 'payment',
      v_money || jsonb_strip_nulls(jsonb_build_object(
        'reference', v_visit.reference,
        'starts_at', lower(v_visit.during),
        'mode', v_visit.mode,
        'client_name', v_visit.client_name,
        'service_name', (SELECT service.name FROM public.services AS service
                         WHERE service.id = v_visit.service_id),
        'price_minor', v_visit.price_minor,
        'currency_code', v_visit.currency_code
      ))
    FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
          WHERE role.role = 'admin') AS admin;
    RETURN v_visit.reference;
  END IF;

  SELECT seat.* INTO v_seat
  FROM public.workshop_payments AS payment
  JOIN public.workshop_registrations AS seat ON seat.id = payment.registration_id
  WHERE payment.payment_intent_id = p_payment_intent_id;
  IF NOT FOUND AND p_reference IS NOT NULL THEN
    SELECT * INTO v_seat FROM public.workshop_registrations WHERE reference = p_reference;
  END IF;
  IF v_seat.id IS NULL THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
  SELECT admin.user_id, 'admin', NULL, v_notice, 'payment',
    v_money || jsonb_strip_nulls(jsonb_build_object(
      'reference', v_seat.reference,
      'starts_at', workshop.starts_at,
      'client_name', v_seat.client_name,
      'service_name', workshop.title,
      'price_minor', v_seat.price_minor,
      'currency_code', v_seat.currency_code
    ))
  FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
        WHERE role.role = 'admin') AS admin
  CROSS JOIN public.workshops AS workshop
  WHERE workshop.id = v_seat.workshop_id;
  RETURN v_seat.reference;
END;
$$;

REVOKE ALL ON FUNCTION public.record_dispute(text, text, text, integer, text, boolean, text)
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.record_dispute(text, text, text, integer, text, boolean, text)
  TO service_role;
