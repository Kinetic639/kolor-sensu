-- "Zapłacę później" cannot block the schedule (audit of 22.10). A
-- reservation paid later holds its time for days without any payment, so:
--   - one person (by e-mail, phone or visitor key) has at most two unpaid
--     reservations at a time; a third is paid at once, and the centre's
--     admins are told (a notification);
--   - a reservation holds its time for 30 minutes only, until the client
--     confirms it from the link in its e-mail (the address is real); not
--     confirmed, it lapses quietly like a hold;
--   - confirmed, it is paid by the centre's time before the visit (48 hours
--     by default) or within 24 hours of booking, whichever comes first.

ALTER TABLE public.appointments
  ADD COLUMN reservation_confirm_by timestamptz,
  ADD COLUMN reserved_by_key text
  CONSTRAINT appointments_reserved_by_key_length
    CHECK (reserved_by_key IS NULL OR char_length(reserved_by_key) BETWEEN 8 AND 128);

COMMENT ON COLUMN public.appointments.reservation_confirm_by IS
  'A reservation paid later, not confirmed from its e-mail yet: it lapses at payment_due_at (this time).';
COMMENT ON COLUMN public.appointments.reserved_by_key IS
  'The keyed hash of the visitor who reserved it to pay later (never the address itself).';

ALTER TABLE public.appointment_events
  DROP CONSTRAINT appointment_events_kind_check,
  ADD CONSTRAINT appointment_events_kind_check CHECK (kind = ANY (ARRAY[
    'created', 'details_saved', 'hold_released', 'hold_expired',
    'awaiting_payment', 'confirmed', 'cancelled', 'rescheduled',
    'payment_started', 'payment_succeeded', 'payment_failed',
    'payment_expired', 'refund_recorded', 'email_sent', 'reserved',
    'refund_issued', 'reservation_confirmed'
  ]));

ALTER TABLE public.notifications
  DROP CONSTRAINT notifications_kind_check,
  ADD CONSTRAINT notifications_kind_check CHECK (kind = ANY (ARRAY[
    'booked', 'reserved', 'centre_booked', 'paid', 'cancelled',
    'rescheduled', 'refunded', 'profile_submitted', 'profile_approved',
    'profile_rejected', 'visit_to_close', 'unpaid_limit'
  ]));

CREATE INDEX appointments_unpaid_email_idx ON public.appointments
  (lower(btrim(client_email)))
  WHERE status = 'awaiting_payment' AND booked_by = 'client';

-- When a reservation made by a client is to be paid by, once confirmed:
-- the centre's time before the visit, or a day after booking if sooner;
-- null when it is paid at once (least() would skip the null).
CREATE FUNCTION private.reservation_due(p_starts_at timestamptz, p_created_at timestamptz)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path TO ''
AS $$
  SELECT least(due.at, p_created_at + interval '24 hours')
  FROM (SELECT private.payment_due(p_starts_at) AS at) AS due
  WHERE due.at IS NOT NULL;
$$;

REVOKE ALL ON FUNCTION private.reservation_due(timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;

-- The last nine digits of a phone number ('' when it has fewer).
CREATE FUNCTION private.phone_key(p_phone text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $$
  SELECT CASE WHEN length(digits) >= 9 THEN right(digits, 9) ELSE '' END
  FROM (SELECT regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') AS digits) AS phone;
$$;

REVOKE ALL ON FUNCTION private.phone_key(text) FROM PUBLIC, anon, authenticated;

DROP FUNCTION public.reserve_hold(text);

CREATE FUNCTION public.reserve_hold(p_access_token text, p_client_key text DEFAULT NULL)
RETURNS TABLE (reference text, payment_due_at timestamptz, confirm_by timestamptz, outcome text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_due timestamptz;
  v_confirm_by timestamptz;
  v_email text;
  v_phone text;
BEGIN
  IF p_client_key IS NOT NULL AND char_length(p_client_key) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'A visitor key is 8 to 128 characters' USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND OR v_visit.status <> 'held' OR v_visit.hold_expires_at <= now() THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;
  IF v_visit.terms_accepted_at IS NULL OR v_visit.client_email IS NULL THEN
    RAISE EXCEPTION 'The client''s details come first' USING HINT = 'details_required';
  END IF;
  v_due := private.payment_due(lower(v_visit.during));
  IF v_due IS NULL THEN
    RAISE EXCEPTION 'This visit is paid at once' USING HINT = 'pay_now_required';
  END IF;

  -- At most two unpaid reservations per person: by e-mail, phone or
  -- visitor (each locked, so two at once count each other).
  v_email := lower(btrim(v_visit.client_email));
  v_phone := private.phone_key(v_visit.client_phone);
  PERFORM pg_advisory_xact_lock(hashtextextended('booking:unpaid:' || v_email, 0));
  IF v_phone <> '' THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('booking:unpaid:phone:' || v_phone, 0));
  END IF;
  IF p_client_key IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('booking:unpaid:visitor:' || p_client_key, 0));
  END IF;
  IF (
    SELECT count(*) FROM public.appointments AS other
    WHERE other.id <> v_visit.id
      AND other.booked_by = 'client'
      AND other.status = 'awaiting_payment'
      AND other.payment_due_at > now()
      AND (
        lower(btrim(other.client_email)) = v_email
        OR (v_phone <> '' AND private.phone_key(other.client_phone) = v_phone)
        OR (p_client_key IS NOT NULL AND other.reserved_by_key = p_client_key)
      )
  ) >= 2 THEN
    -- Paid at once instead; the admins hear of it once per visit.
    INSERT INTO public.notifications (user_id, portal, appointment_id, kind, actor, details)
    SELECT admin.user_id, 'admin', v_visit.id, 'unpaid_limit', 'system',
      jsonb_strip_nulls(jsonb_build_object(
        'reference', v_visit.reference,
        'starts_at', lower(v_visit.during),
        'mode', v_visit.mode,
        'client_name', v_visit.client_name,
        'service_name', (SELECT service.name FROM public.services AS service
                         WHERE service.id = v_visit.service_id)
      ))
    FROM (SELECT DISTINCT role.user_id FROM public.user_roles AS role
          WHERE role.role = 'admin') AS admin
    WHERE NOT EXISTS (
      SELECT 1 FROM public.notifications AS sent
      WHERE sent.appointment_id = v_visit.id AND sent.kind = 'unpaid_limit'
    );
    RETURN QUERY SELECT v_visit.reference, NULL::timestamptz, NULL::timestamptz, 'pay_now'::text;
    RETURN;
  END IF;

  -- A payment already started for it stops counting.
  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  -- Until it is confirmed from the e-mail, the time is held for 30 minutes.
  v_confirm_by := least(now() + interval '30 minutes', v_due);
  UPDATE public.appointments
  SET status = 'awaiting_payment', hold_expires_at = NULL,
      payment_due_at = v_confirm_by, reservation_confirm_by = v_confirm_by,
      reserved_by_key = p_client_key
  WHERE id = v_visit.id;
  RETURN QUERY SELECT v_visit.reference,
    private.reservation_due(lower(v_visit.during), v_visit.created_at),
    v_confirm_by, 'reserved'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.reserve_hold(text, text) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.reserve_hold(text, text) TO service_role;

-- The client confirms the reservation from its e-mail link: from then on it
-- is paid by its own time. Null when there is nothing to confirm (done
-- already, lapsed, or not a reservation).
CREATE FUNCTION public.confirm_reservation(p_manage_token text)
RETURNS timestamptz
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_due timestamptz;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.manage_token_hash = extensions.digest(p_manage_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND OR v_visit.status <> 'awaiting_payment'
     OR v_visit.reservation_confirm_by IS NULL
     OR v_visit.payment_due_at <= now() THEN
    RETURN NULL;
  END IF;
  v_due := coalesce(
    private.reservation_due(lower(v_visit.during), v_visit.created_at),
    v_visit.payment_due_at
  );
  UPDATE public.appointments
  SET payment_due_at = v_due, reservation_confirm_by = NULL
  WHERE id = v_visit.id;
  PERFORM private.log_appointment_event(v_visit.id, 'reservation_confirmed', 'client',
    jsonb_build_object('payment_due_at', v_due));
  RETURN v_due;
END;
$$;

REVOKE ALL ON FUNCTION public.confirm_reservation(text) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.confirm_reservation(text) TO service_role;

-- Until when a reservation waits to be confirmed from its e-mail link, or
-- null (nothing to confirm).
CREATE FUNCTION public.reservation_confirm_by(p_manage_token text)
RETURNS timestamptz
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT visit.reservation_confirm_by
  FROM public.appointments AS visit
  WHERE visit.manage_token_hash = extensions.digest(p_manage_token, 'sha256')
    AND visit.status = 'awaiting_payment'
    AND visit.payment_due_at > now();
$$;

REVOKE ALL ON FUNCTION public.reservation_confirm_by(text) FROM PUBLIC, anon, authenticated;
GRANT ALL ON FUNCTION public.reservation_confirm_by(text) TO service_role;

-- A reservation not confirmed in time lapses quietly (nobody confirmed the
-- address, so nobody is written to); one confirmed and not paid in time is
-- cancelled by the system, as before.
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
    )
  RETURNING visit.reference;
$$;

-- The reservation's e-mail of a client's reservation not confirmed yet
-- says until when to confirm it, and the time to pay by once confirmed.
DROP FUNCTION public.claim_booking_email(text, text);

CREATE FUNCTION public.claim_booking_email(p_reference text, p_kind text)
RETURNS TABLE (
  reference text, mode public.visit_mode, starts_at timestamptz,
  ends_at timestamptz, service_name text, specialist_name text,
  room_name text, location_name text, location_address text,
  price_minor integer, currency_code text, client_name text,
  client_email text, manage_token text, cancelled_by text, booked_by text,
  paid boolean, payment_due_at timestamptz, confirm_by timestamptz
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
    v_visit.reservation_confirm_by
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
