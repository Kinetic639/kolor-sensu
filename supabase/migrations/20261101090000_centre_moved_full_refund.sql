-- A visit the centre changed (Klient · 7, card 6). When the last change of
-- a visit's time, room or form was the centre's, the client may cancel it
-- from their link with all their money back, even inside the cancellation
-- window: the new time was not their choice. A move of their own after it
-- ends that. get_booking says so, for the visit page.

CREATE FUNCTION private.moved_by_centre(p_appointment_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT coalesce((
    SELECT event.actor = 'centre'
    FROM public.appointment_events AS event
    WHERE event.appointment_id = p_appointment_id AND event.kind = 'rescheduled'
    ORDER BY event.occurred_at DESC, event.id DESC
    LIMIT 1
  ), false);
$$;

REVOKE ALL ON FUNCTION private.moved_by_centre(uuid) FROM PUBLIC;

CREATE OR REPLACE FUNCTION "public"."cancel_booking"("p_manage_token" "text") RETURNS TABLE("reference" "text", "refund_minor" integer, "payment_intent_id" "text")
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_window integer;
  v_payment public.payments%ROWTYPE;
  v_paid boolean;
  v_refund integer := 0;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.manage_token_hash = extensions.digest(p_manage_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF NOT (
       v_visit.status = 'confirmed'
       OR (v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now())
     ) OR lower(v_visit.during) <= now() THEN
    RAISE EXCEPTION 'This visit cannot be cancelled' USING HINT = 'not_cancellable';
  END IF;

  SELECT cancellation_window_hours INTO v_window
  FROM public.center_settings WHERE id = 1;

  SELECT * INTO v_payment FROM public.payments AS payment
  WHERE payment.appointment_id = v_visit.id
    AND payment.status IN ('succeeded', 'partially_refunded')
    AND payment.payment_intent_id IS NOT NULL
  ORDER BY payment.created_at DESC
  LIMIT 1
  FOR UPDATE;
  v_paid := FOUND;

  IF v_paid AND (
       now() <= lower(v_visit.during) - make_interval(hours => v_window)
       OR private.moved_by_centre(v_visit.id)
     ) THEN
    v_refund := v_payment.amount_minor - v_payment.refunded_minor;
  END IF;

  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  UPDATE public.appointments
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'client',
      refund_due_minor = v_refund
  WHERE id = v_visit.id;

  RETURN QUERY SELECT v_visit.reference, v_refund,
    CASE WHEN v_paid THEN v_payment.payment_intent_id END;
END;
$$;

DROP FUNCTION public.get_booking(text);
CREATE FUNCTION "public"."get_booking"("p_access_token" "text") RETURNS TABLE("reference" "text", "status" "public"."appointment_status", "mode" "public"."visit_mode", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "hold_expires_at" timestamp with time zone, "service_name" "text", "specialist_name" "text", "room_name" "text", "location_name" "text", "price_minor" integer, "currency_code" "text", "client_name" "text", "client_email" "text", "client_phone" "text", "client_notes" "text", "details_saved" boolean, "reschedule_count" integer, "cancelled_by" "text", "refund_due_minor" integer, "refunded_minor" integer, "booked_by" "text", "paid" boolean, "payment_due_at" timestamp with time zone, "client_first_name" "text", "client_last_name" "text", "moved_by_centre" boolean)
    LANGUAGE "sql" STABLE SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
  SELECT visit.reference, visit.status, visit.mode,
    lower(visit.during), upper(visit.during), visit.hold_expires_at,
    service.name, profile.display_name, room.name, location.name,
    visit.price_minor, visit.currency_code,
    visit.client_name, visit.client_email, visit.client_phone, visit.client_notes,
    visit.terms_accepted_at IS NOT NULL AND visit.privacy_accepted_at IS NOT NULL,
    visit.reschedule_count, visit.cancelled_by, visit.refund_due_minor,
    coalesce((
      SELECT sum(payment.refunded_minor)::integer FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
    ), 0),
    visit.booked_by,
    EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
        AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
    ),
    visit.payment_due_at,
    visit.client_first_name, visit.client_last_name,
    private.moved_by_centre(visit.id)
  FROM public.appointments AS visit
  JOIN public.services AS service ON service.id = visit.service_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
     OR visit.manage_token_hash = extensions.digest(p_access_token, 'sha256');
$$;

REVOKE ALL ON FUNCTION public.get_booking(text) FROM PUBLIC;
GRANT ALL ON FUNCTION public.get_booking(text) TO service_role;
