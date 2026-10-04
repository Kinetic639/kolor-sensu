-- The centre gives money back (R12) past what it already owes, not only
-- past what has gone back. A refund promised and refused by Stripe (or
-- still under way) is owed: it is settled on its own (centre_settle_visit),
-- and a new refund on top of it could promise more than was paid.

CREATE OR REPLACE FUNCTION public.centre_refund_visit(
  p_appointment_id uuid,
  p_refund_minor integer,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(
  reference text,
  refund_minor integer,
  payment_intent_id text,
  refunded_before_minor integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_left integer;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre gives money back'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  SELECT * INTO v_payment FROM public.payments AS payment
  WHERE payment.appointment_id = v_visit.id
    AND payment.status IN ('succeeded', 'partially_refunded')
    AND payment.payment_intent_id IS NOT NULL
  ORDER BY payment.created_at DESC
  LIMIT 1
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nothing was paid' USING HINT = 'not_paid';
  END IF;
  -- What is left past what has gone back and what is owed already.
  v_left := v_payment.amount_minor
    - greatest(v_payment.refunded_minor, coalesce(v_visit.refund_due_minor, 0));
  IF p_refund_minor IS NULL OR p_refund_minor <= 0 OR p_refund_minor > v_left THEN
    RAISE EXCEPTION 'Between 1 and % can be given back', greatest(v_left, 0)
      USING HINT = 'refund_too_high';
  END IF;

  -- What the centre owes back: what it gave (or owes) so far and this.
  UPDATE public.appointments
  SET refund_due_minor = greatest(coalesce(refund_due_minor, 0), v_payment.refunded_minor) + p_refund_minor
  WHERE id = v_visit.id;
  PERFORM private.log_appointment_event(v_visit.id, 'refund_issued', 'centre',
    jsonb_strip_nulls(jsonb_build_object(
      'refund_minor', p_refund_minor,
      'reason', nullif(left(btrim(coalesce(p_reason, '')), 500), '')
    )));
  -- Each refund gets its own e-mail (the last one's row makes way).
  DELETE FROM public.booking_emails
  WHERE appointment_id = v_visit.id AND kind = 'refunded';

  RETURN QUERY SELECT v_visit.reference, p_refund_minor, v_payment.payment_intent_id,
    v_payment.refunded_minor;
END;
$function$;
