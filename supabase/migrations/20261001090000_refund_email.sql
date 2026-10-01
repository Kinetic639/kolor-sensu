-- The client hears of money the centre gives back later
-- (docs/product/booking-plan.md, R12): an e-mail with the amount and why,
-- one per refund, with a new link to the visit. A specialist's history
-- does not show it, as it shows no money.

ALTER TABLE public.booking_emails DROP CONSTRAINT booking_emails_kind_valid;
ALTER TABLE public.booking_emails ADD CONSTRAINT booking_emails_kind_valid CHECK (
  kind IN ('confirmation', 'reminder', 'rescheduled', 'cancelled',
           'reserved', 'payment_reminder', 'payment_last_call', 'refunded')
);

-- A refund makes way for its e-mail.
CREATE OR REPLACE FUNCTION public.centre_refund_visit(
  p_appointment_id uuid,
  p_refund_minor integer,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(reference text, refund_minor integer, payment_intent_id text, refunded_before_minor integer)
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
  v_left := v_payment.amount_minor - v_payment.refunded_minor;
  IF p_refund_minor IS NULL OR p_refund_minor <= 0 OR p_refund_minor > v_left THEN
    RAISE EXCEPTION 'Between 1 and % can be given back', v_left USING HINT = 'refund_too_high';
  END IF;

  -- What the centre owes back: what it gave so far and this.
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

-- The e-mail about a refund: ready once there was one; brings a new link.
CREATE OR REPLACE FUNCTION public.claim_booking_email(p_reference text, p_kind text)
RETURNS TABLE (
  reference text, mode public.visit_mode, starts_at timestamptz, ends_at timestamptz,
  service_name text, specialist_name text, room_name text, location_name text,
  location_address text, price_minor integer, currency_code text,
  client_name text, client_email text, manage_token text, cancelled_by text,
  booked_by text, paid boolean, payment_due_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_token text;
  v_ready boolean;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.reference = p_reference
  FOR UPDATE;
  IF NOT FOUND OR v_visit.client_email IS NULL THEN
    RETURN;
  END IF;
  v_ready := CASE p_kind
    WHEN 'cancelled' THEN v_visit.status = 'cancelled'
    WHEN 'reserved' THEN v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now()
    WHEN 'payment_reminder' THEN v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now()
    WHEN 'payment_last_call' THEN v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now()
    WHEN 'reminder' THEN v_visit.status = 'confirmed' AND lower(v_visit.during) > now()
    WHEN 'rescheduled' THEN v_visit.status IN ('confirmed', 'awaiting_payment')
    WHEN 'refunded' THEN EXISTS (
      SELECT 1 FROM public.appointment_events AS event
      WHERE event.appointment_id = v_visit.id AND event.kind = 'refund_issued'
    )
    ELSE v_visit.status = 'confirmed'
  END;
  IF NOT v_ready THEN
    RETURN;
  END IF;

  INSERT INTO public.booking_emails AS email (appointment_id, kind)
  VALUES (v_visit.id, p_kind)
  ON CONFLICT (appointment_id, kind) DO UPDATE
  SET claimed_at = now()
  WHERE email.sent_at IS NULL AND email.claimed_at < now() - interval '10 minutes';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF p_kind IN ('confirmation', 'reminder', 'reserved', 'payment_reminder', 'payment_last_call', 'refunded')
     OR (p_kind = 'cancelled' AND v_visit.cancelled_by = 'centre')
     OR (p_kind = 'rescheduled' AND (
       SELECT event.actor FROM public.appointment_events AS event
       WHERE event.appointment_id = v_visit.id AND event.kind = 'rescheduled'
       ORDER BY event.id DESC LIMIT 1
     ) = 'centre') THEN
    v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
    UPDATE public.appointments
    SET manage_token_hash = extensions.digest(v_token, 'sha256')
    WHERE id = v_visit.id;
  END IF;

  RETURN QUERY
  SELECT v_visit.reference, v_visit.mode, lower(v_visit.during), upper(v_visit.during),
    service.name, profile.display_name, room.name, location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    v_visit.price_minor, v_visit.currency_code,
    v_visit.client_name, v_visit.client_email, v_token, v_visit.cancelled_by,
    v_visit.booked_by,
    EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = v_visit.id
        AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
    ),
    v_visit.payment_due_at
  FROM public.services AS service
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = v_visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = v_visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE service.id = v_visit.service_id;
END;
$function$;

-- A specialist's history hides the e-mails about refunds too.
CREATE OR REPLACE FUNCTION public.list_visit_events(p_id uuid, p_own boolean DEFAULT false)
 RETURNS TABLE(id bigint, occurred_at timestamp with time zone, kind text, actor text, actor_name text, details jsonb)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_admin boolean := public.has_role('admin') AND NOT p_own;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM private.visible_visits(p_own) AS v WHERE v.id = p_id) THEN
    RETURN;
  END IF;
  RETURN QUERY
  SELECT event.id, event.occurred_at, event.kind, event.actor,
    nullif(concat_ws(' ', account.first_name, account.last_name), ''),
    CASE WHEN v_admin THEN event.details
      ELSE event.details - 'price_minor' - 'refund_due_minor' - 'amount_minor'
        - 'refunded_minor' - 'refund_minor' END
  FROM public.appointment_events AS event
  LEFT JOIN public.profiles AS account ON account.id = event.actor_user_id
  WHERE event.appointment_id = p_id
    AND (v_admin OR event.kind NOT IN (
      'payment_started', 'payment_succeeded', 'payment_failed',
      'payment_expired', 'refund_recorded', 'refund_issued'))
    AND (v_admin OR event.kind <> 'email_sent' OR event.details ->> 'email' IS DISTINCT FROM 'refunded')
  ORDER BY event.occurred_at, event.id;
END;
$function$;
