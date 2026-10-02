-- What the centre still has to settle (docs/product/booking-plan.md, R14):
-- money owed to a client that Stripe has not given back. Two kinds:
--   refund_owed         the visit was cancelled (or money given back later)
--                       and less went back than is owed: Stripe refused, or
--                       the site never got to it;
--   paid_without_visit  a payment came for a visit that never happened (its
--                       time was lost meanwhile, or it was cancelled for want
--                       of payment) and was not all given back.
-- A change younger than two minutes is still on its way, so not listed.
-- The admin settles one from the dashboard: the site refunds what is owed.

-- Each visit with money owed, and how much.
CREATE FUNCTION private.open_settlements()
RETURNS TABLE (
  appointment_id uuid, payment_id uuid, kind text, owed_minor integer,
  last_change_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT visit.id, payment.id, owed.kind, owed.minor,
    greatest(
      visit.cancelled_at,
      payment.updated_at,
      (SELECT max(event.occurred_at) FROM public.appointment_events AS event
       WHERE event.appointment_id = visit.id AND event.kind = 'refund_issued')
    )
  FROM public.appointments AS visit
  JOIN LATERAL (
    SELECT p.* FROM public.payments AS p
    WHERE p.appointment_id = visit.id
      AND p.status IN ('succeeded', 'partially_refunded', 'refunded')
      AND p.payment_intent_id IS NOT NULL
    ORDER BY p.created_at DESC
    LIMIT 1
  ) AS payment ON true
  CROSS JOIN LATERAL (
    SELECT
      CASE WHEN visit.confirmed_at IS NULL THEN 'paid_without_visit' ELSE 'refund_owed' END AS kind,
      CASE WHEN visit.confirmed_at IS NULL
        THEN payment.amount_minor - payment.refunded_minor
        ELSE least(coalesce(visit.refund_due_minor, 0), payment.amount_minor) - payment.refunded_minor
      END AS minor
  ) AS owed
  WHERE owed.minor > 0;
$function$;
REVOKE ALL ON FUNCTION private.open_settlements() FROM PUBLIC, anon, authenticated;

-- The admin's list.
CREATE FUNCTION public.list_settlements()
RETURNS TABLE (
  appointment_id uuid, reference text, kind text,
  status public.appointment_status, starts_at timestamptz,
  client_name text, client_email text, client_phone text,
  service_name text, specialist_name text,
  paid_minor integer, refunded_minor integer, owed_minor integer,
  currency_code text, since timestamptz
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre settles payments'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  RETURN QUERY
  SELECT visit.id, visit.reference, open.kind, visit.status, lower(visit.during),
    visit.client_name, visit.client_email, visit.client_phone,
    service.name, profile.display_name,
    payment.amount_minor, payment.refunded_minor, open.owed_minor,
    payment.currency_code, open.last_change_at
  FROM private.open_settlements() AS open
  JOIN public.appointments AS visit ON visit.id = open.appointment_id
  JOIN public.payments AS payment ON payment.id = open.payment_id
  JOIN public.services AS service ON service.id = visit.service_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  WHERE open.last_change_at < now() - interval '2 minutes'
  ORDER BY open.last_change_at;
END;
$function$;
REVOKE ALL ON FUNCTION public.list_settlements() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_settlements() TO authenticated, service_role;

-- The admin settles one: what is owed, to refund now. Each settling is its
-- own entry in the history (its id keeps Stripe's refunds apart); twice
-- within a minute is refused, so a double click refunds once.
CREATE FUNCTION public.centre_settle_visit(p_appointment_id uuid)
RETURNS TABLE (
  reference text, payment_intent_id text, refund_minor integer,
  refunded_before_minor integer, settlement_id bigint
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_payment public.payments%ROWTYPE;
  v_open record;
  v_event bigint;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre settles payments'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.appointment_events AS event
    WHERE event.appointment_id = v_visit.id AND event.kind = 'refund_issued'
      AND event.details ? 'settlement'
      AND event.occurred_at > now() - interval '1 minute'
  ) THEN
    RAISE EXCEPTION 'Settled a moment ago' USING HINT = 'recently_settled';
  END IF;

  SELECT * INTO v_open FROM private.open_settlements() AS open
  WHERE open.appointment_id = v_visit.id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Nothing is owed' USING HINT = 'nothing_owed';
  END IF;
  SELECT * INTO v_payment FROM public.payments AS payment
  WHERE payment.id = v_open.payment_id
  FOR UPDATE;

  -- A payment without a visit: all of it is owed.
  IF v_open.kind = 'paid_without_visit' THEN
    UPDATE public.appointments
    SET refund_due_minor = v_payment.amount_minor
    WHERE id = v_visit.id;
  END IF;

  INSERT INTO public.appointment_events (appointment_id, kind, actor, actor_user_id, details)
  VALUES (v_visit.id, 'refund_issued', 'centre', (SELECT auth.uid()),
    jsonb_build_object(
      'refund_minor', v_open.owed_minor,
      'settlement', v_open.kind,
      'reason', CASE v_open.kind
        WHEN 'paid_without_visit' THEN 'Zwrot płatności za wizytę, która się nie odbyła'
        ELSE 'Ponowienie zwrotu' END
    ))
  RETURNING id INTO v_event;
  -- The e-mail about it (one per refund): the last one's row opens again.
  UPDATE public.booking_emails
  SET sent_at = NULL, provider_message_id = NULL,
      claimed_at = now() - interval '1 hour'
  WHERE appointment_id = v_visit.id AND kind = 'refunded';

  RETURN QUERY SELECT v_visit.reference, v_payment.payment_intent_id,
    v_open.owed_minor, v_payment.refunded_minor, v_event;
END;
$function$;
REVOKE ALL ON FUNCTION public.centre_settle_visit(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_settle_visit(uuid) TO authenticated, service_role;
