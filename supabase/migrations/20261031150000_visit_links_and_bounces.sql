-- Klient · 6 (the booking map): the centre helps a client who has no
-- e-mail about their visit.
-- * Card 7: "Wyślij link ponownie" for a confirmed visit too, not only a
--   reservation's link to pay.
-- * Card 14 (correcting the client's e-mail or phone) needs nothing here:
--   admin_update_client already carries it to the visits still to come;
--   the portal offers it in the visit's panel, then the link goes again.
-- * Card 8: an e-mail about a visit that bounced shows in its history.
-- * Card 11: the e-mails give the place's directions (locations.directions,
--   20261025150000_workshop_directions).

ALTER TABLE public.booking_emails ADD COLUMN bounced_at timestamptz;

ALTER TABLE public.appointment_events
  DROP CONSTRAINT appointment_events_kind_check,
  ADD CONSTRAINT appointment_events_kind_check CHECK (kind = ANY (ARRAY[
    'created', 'details_saved', 'hold_released', 'hold_expired',
    'awaiting_payment', 'confirmed', 'cancelled', 'rescheduled',
    'payment_started', 'payment_succeeded', 'payment_failed',
    'payment_expired', 'refund_recorded', 'email_sent', 'reserved',
    'refund_issued', 'reservation_confirmed', 'payment_disputed',
    'dispute_closed', 'email_bounced'
  ]));

-- Card 8: Resend says a message bounced; if it was an e-mail about a visit,
-- the visit's history says which one did not arrive. Once per message.
CREATE FUNCTION public.mark_booking_email_bounced(p_message_id text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_email public.booking_emails%ROWTYPE;
BEGIN
  UPDATE public.booking_emails AS email
  SET bounced_at = now()
  WHERE email.provider_message_id = p_message_id AND email.bounced_at IS NULL
  RETURNING * INTO v_email;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  PERFORM private.log_appointment_event(v_email.appointment_id, 'email_bounced',
    'system', jsonb_build_object('email', v_email.kind));
  RETURN (SELECT reference FROM public.appointments WHERE id = v_email.appointment_id);
END;
$$;

REVOKE ALL ON FUNCTION public.mark_booking_email_bounced(text) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.mark_booking_email_bounced(text) TO service_role;

-- Card 7: the e-mail with the visit's link, once more: a reservation's link
-- to pay, or a confirmed visit's confirmation (with a new link). An admin
-- for any visit, a specialist for their own; not twice in five minutes.
-- The site claims and sends it (as centre_resend_payment_link).
CREATE FUNCTION public.centre_resend_visit_link(p_appointment_id uuid)
RETURNS TABLE (reference text, kind text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_kind text;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  PERFORM private.managed_specialist_id(v_visit.specialist_id);
  v_kind := CASE
    WHEN v_visit.client_email IS NULL THEN NULL
    WHEN v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at > now() THEN 'reserved'
    WHEN v_visit.status = 'confirmed' AND lower(v_visit.during) > now() THEN 'confirmation'
  END;
  IF v_kind IS NULL THEN
    RAISE EXCEPTION 'Nothing to send' USING HINT = 'nothing_to_send';
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.booking_emails AS email
    WHERE email.appointment_id = v_visit.id AND email.kind = v_kind
      AND email.claimed_at > now() - interval '5 minutes'
  ) THEN
    RAISE EXCEPTION 'The link was sent a moment ago' USING HINT = 'recently_sent';
  END IF;
  DELETE FROM public.booking_emails AS email
  WHERE email.appointment_id = v_visit.id AND email.kind = v_kind;
  RETURN QUERY SELECT v_visit.reference, v_kind;
END;
$$;

REVOKE ALL ON FUNCTION public.centre_resend_visit_link(uuid) FROM PUBLIC, anon;
GRANT ALL ON FUNCTION public.centre_resend_visit_link(uuid) TO authenticated, service_role;

-- Card 11: the e-mail's place with its directions. (The body of
-- 20261022200000_pay_later_limits, with location_directions last.)
DROP FUNCTION public.claim_booking_email(text, text);

CREATE FUNCTION public.claim_booking_email(p_reference text, p_kind text)
RETURNS TABLE (
  reference text, mode public.visit_mode, starts_at timestamptz,
  ends_at timestamptz, service_name text, specialist_name text,
  room_name text, location_name text, location_address text,
  price_minor integer, currency_code text, client_name text,
  client_email text, manage_token text, cancelled_by text, booked_by text,
  paid boolean, payment_due_at timestamptz, confirm_by timestamptz,
  location_directions text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
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
    CASE WHEN v_visit.reservation_confirm_by IS NOT NULL
      THEN coalesce(private.reservation_due(lower(v_visit.during), v_visit.created_at), v_visit.payment_due_at)
      ELSE v_visit.payment_due_at
    END,
    v_visit.reservation_confirm_by,
    CASE WHEN v_visit.mode = 'in_person' THEN location.directions END
  FROM public.services AS service
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = v_visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = v_visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE service.id = v_visit.service_id;
END;
$$;

REVOKE ALL ON FUNCTION public.claim_booking_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.claim_booking_email(text, text) TO service_role;
