-- Changing a visit from its e-mail link (docs/product/booking-plan.md, R8):
-- the client cancels (money back until cancellation_window_hours before the
-- visit, none after) or moves it to another free time of the same offer
-- (until reschedule_window_hours before, at most max_self_reschedules
-- times). Everything else goes through the centre. Only the e-mail link's
-- token (manage_token_hash) changes a visit; the hold cookie's does not.

ALTER TABLE public.appointments
  ADD COLUMN reschedule_count integer NOT NULL DEFAULT 0
    CONSTRAINT appointments_reschedule_count_valid CHECK (reschedule_count BETWEEN 0 AND 50),
  -- What the client is owed on cancelling (null: not cancelled by them).
  ADD COLUMN refund_due_minor integer
    CONSTRAINT appointments_refund_due_valid CHECK (refund_due_minor IS NULL OR refund_due_minor >= 0);

GRANT SELECT (reschedule_count, refund_due_minor) ON public.appointments TO authenticated;

-- Free times, optionally not counting one visit (the one being moved, so
-- it can move to a time overlapping its own).
DROP FUNCTION private.free_slots(uuid, public.visit_mode, date, date, uuid);
CREATE FUNCTION private.free_slots(
  p_offer_id uuid,
  p_mode public.visit_mode,
  p_from date,
  p_to date,
  p_location_id uuid DEFAULT NULL,
  p_ignore_appointment uuid DEFAULT NULL
)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz, rule_id uuid, room_id uuid)
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  WITH settings AS (
    SELECT timezone AS tz,
      slot_step_minutes AS step,
      default_visit_buffer_minutes AS buffer,
      min_booking_lead_minutes AS lead,
      max_booking_horizon_days AS horizon
    FROM public.center_settings
    WHERE id = 1
  ),
  offer AS (
    SELECT o.specialist_id,
      coalesce(o.duration_minutes, s.default_duration_minutes) AS duration
    FROM public.specialist_services AS o
    JOIN public.services AS s ON s.id = o.service_id
    WHERE o.id = p_offer_id
  ),
  windows AS (
    SELECT r.id AS rule_id, r.room_id AS window_room, d::date AS day,
      r.starts_at AS window_start, r.ends_at AS window_end
    FROM offer
    JOIN public.specialist_availability_rules AS r ON r.specialist_id = offer.specialist_id
    CROSS JOIN generate_series(p_from, p_to, interval '1 day') AS d
    LEFT JOIN public.rooms AS room ON room.id = r.room_id
    LEFT JOIN public.locations AS location ON location.id = room.location_id
    WHERE private.availability_rule_on(r.id, d::date)
      AND CASE p_mode
        WHEN 'online' THEN r.mode IN ('online', 'hybrid')
        ELSE r.mode IN ('in_person', 'hybrid')
      END
      AND (
        r.room_id IS NULL
        OR (
          room.active AND location.active
          AND NOT EXISTS (
            SELECT 1 FROM public.room_availability_exceptions AS closed
            WHERE closed.room_id = r.room_id
              AND closed.date = d::date
              AND closed.type = 'closed_all_day'
          )
        )
      )
      AND (p_mode = 'online' OR p_location_id IS NULL OR room.location_id = p_location_id)
  ),
  candidates AS (
    SELECT w.rule_id, w.window_room, w.day,
      ((w.day + make_interval(mins => m)) AT TIME ZONE settings.tz) AS slot_start,
      ((w.day + make_interval(mins => m + offer.duration)) AT TIME ZONE settings.tz) AS slot_end
    FROM windows AS w
    CROSS JOIN settings
    CROSS JOIN offer
    CROSS JOIN generate_series(
      (ceil(extract(epoch FROM w.window_start) / 60 / settings.step) * settings.step)::integer,
      (extract(epoch FROM w.window_end) / 60)::integer - offer.duration,
      settings.step
    ) AS m
  )
  SELECT c.slot_start, c.slot_end, c.rule_id,
    CASE WHEN p_mode = 'in_person' THEN c.window_room END
  FROM candidates AS c
  CROSS JOIN settings
  CROSS JOIN offer
  WHERE c.slot_start >= now() + make_interval(mins => settings.lead)
    AND c.slot_start <= now() + make_interval(days => settings.horizon)
    AND NOT EXISTS (
      SELECT 1 FROM public.specialist_time_off AS off
      WHERE off.specialist_id = offer.specialist_id
        AND off.during && tstzrange(c.slot_start, c.slot_end)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.room_availability_exceptions AS blocked
      WHERE blocked.room_id = c.window_room
        AND blocked.date = c.day
        AND blocked.type = 'blocked_interval'
        AND tstzrange(
          (blocked.date + blocked.starts_at) AT TIME ZONE settings.tz,
          (blocked.date + blocked.ends_at) AT TIME ZONE settings.tz
        ) && tstzrange(c.slot_start, c.slot_end)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments AS visit
      WHERE visit.specialist_id = offer.specialist_id
        AND visit.id IS DISTINCT FROM p_ignore_appointment
        AND private.appointment_is_live(visit.status, visit.hold_expires_at)
        AND visit.blocks && tstzrange(c.slot_start, c.slot_end + make_interval(mins => settings.buffer))
    )
    AND (
      p_mode = 'online'
      OR NOT EXISTS (
        SELECT 1 FROM public.appointments AS visit
        WHERE visit.room_id = c.window_room
          AND visit.id IS DISTINCT FROM p_ignore_appointment
          AND private.appointment_is_live(visit.status, visit.hold_expires_at)
          AND visit.blocks && tstzrange(c.slot_start, c.slot_end + make_interval(mins => settings.buffer))
      )
    );
$function$;

REVOKE ALL ON FUNCTION private.free_slots(uuid, public.visit_mode, date, date, uuid, uuid)
FROM PUBLIC, anon, authenticated;

-- The booking window, with the client's change policy (for the visit page).
DROP FUNCTION public.booking_window();
CREATE FUNCTION public.booking_window()
RETURNS TABLE(
  time_zone text,
  horizon_days integer,
  hold_minutes integer,
  cancellation_window_hours integer,
  reschedule_window_hours integer,
  max_self_reschedules integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT timezone, max_booking_horizon_days, hold_minutes,
    cancellation_window_hours, reschedule_window_hours, max_self_reschedules
  FROM public.center_settings
  WHERE id = 1;
$function$;

REVOKE ALL ON FUNCTION public.booking_window() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.booking_window() TO anon, authenticated, service_role;

-- A guest's visit, with what the visit page needs to offer changes.
DROP FUNCTION public.get_booking(text);
CREATE FUNCTION public.get_booking(p_access_token text)
RETURNS TABLE(
  reference text,
  status public.appointment_status,
  mode public.visit_mode,
  starts_at timestamptz,
  ends_at timestamptz,
  hold_expires_at timestamptz,
  service_name text,
  specialist_name text,
  room_name text,
  location_name text,
  price_minor integer,
  currency_code text,
  client_name text,
  client_email text,
  client_phone text,
  client_notes text,
  details_saved boolean,
  reschedule_count integer,
  cancelled_by text,
  refund_due_minor integer,
  refunded_minor integer
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
    ), 0)
  FROM public.appointments AS visit
  JOIN public.services AS service ON service.id = visit.service_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
     OR visit.manage_token_hash = extensions.digest(p_access_token, 'sha256');
$function$;

REVOKE ALL ON FUNCTION public.get_booking(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking(text) TO service_role;

-- Whether the client may still move this visit themselves.
CREATE FUNCTION private.self_reschedulable(p_visit public.appointments)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT p_visit.status = 'confirmed'
    AND p_visit.reschedule_count < settings.max_self_reschedules
    AND now() <= lower(p_visit.during) - make_interval(hours => settings.reschedule_window_hours)
  FROM public.center_settings AS settings
  WHERE settings.id = 1;
$function$;

REVOKE ALL ON FUNCTION private.self_reschedulable(public.appointments)
FROM PUBLIC, anon, authenticated;

-- Cancelling by the client. Returns what to refund (0: nothing) and the
-- payment to refund it from; the site's server asks Stripe, and the
-- charge.refunded event records it (record_refund).
CREATE FUNCTION public.cancel_booking(p_manage_token text)
RETURNS TABLE(reference text, refund_minor integer, payment_intent_id text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
  IF v_visit.status <> 'confirmed' OR lower(v_visit.during) <= now() THEN
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

  IF v_paid AND now() <= lower(v_visit.during) - make_interval(hours => v_window) THEN
    v_refund := v_payment.amount_minor - v_payment.refunded_minor;
  END IF;

  UPDATE public.appointments
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'client',
      refund_due_minor = v_refund
  WHERE id = v_visit.id;

  RETURN QUERY SELECT v_visit.reference, v_refund,
    CASE WHEN v_paid THEN v_payment.payment_intent_id END;
END;
$function$;

REVOKE ALL ON FUNCTION public.cancel_booking(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_booking(text) TO service_role;

-- The times this visit may move to: the same offer, form and location,
-- by the usual rules; nothing when the client may not move it.
CREATE FUNCTION public.list_reschedule_slots(p_manage_token text, p_from date, p_to date)
RETURNS TABLE(starts_at timestamptz, ends_at timestamptz)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_location uuid;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 13 THEN
    RAISE EXCEPTION 'A range of one to 14 days is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.manage_token_hash = extensions.digest(p_manage_token, 'sha256');
  IF NOT FOUND OR NOT private.self_reschedulable(v_visit) THEN
    RETURN;
  END IF;
  SELECT room.location_id INTO v_location FROM public.rooms AS room
  WHERE room.id = v_visit.room_id;

  RETURN QUERY
  SELECT slot.starts_at, slot.ends_at
  FROM private.free_slots(
    v_visit.specialist_service_id, v_visit.mode, p_from, p_to, v_location, v_visit.id
  ) AS slot
  WHERE slot.starts_at <> lower(v_visit.during)
  ORDER BY slot.starts_at;
END;
$function$;

REVOKE ALL ON FUNCTION public.list_reschedule_slots(text, date, date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_reschedule_slots(text, date, date) TO service_role;

-- Moving the visit to another free time. The price stays; the e-mail about
-- the move and the reminder for the new time can go out again.
CREATE FUNCTION public.reschedule_booking(p_manage_token text, p_starts_at timestamptz)
RETURNS TABLE(reference text, starts_at timestamptz, ends_at timestamptz, reschedule_count integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_settings public.center_settings%ROWTYPE;
  v_location uuid;
  v_day date;
  v_slot record;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.manage_token_hash = extensions.digest(p_manage_token, 'sha256')
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF NOT private.self_reschedulable(v_visit) THEN
    RAISE EXCEPTION 'This visit cannot be moved by the client' USING HINT = 'not_reschedulable';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_visit.specialist_id, 0));
  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();

  SELECT room.location_id INTO v_location FROM public.rooms AS room
  WHERE room.id = v_visit.room_id;
  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;
  SELECT * INTO v_slot
  FROM private.free_slots(
    v_visit.specialist_service_id, v_visit.mode, v_day, v_day, v_location, v_visit.id
  ) AS slot
  WHERE slot.starts_at = p_starts_at AND slot.starts_at <> lower(v_visit.during);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END IF;

  BEGIN
    UPDATE public.appointments
    SET during = tstzrange(v_slot.starts_at, v_slot.ends_at),
        room_id = v_slot.room_id,
        availability_rule_id = v_slot.rule_id,
        buffer_minutes = v_settings.default_visit_buffer_minutes,
        duration_minutes = (extract(epoch FROM v_slot.ends_at - v_slot.starts_at) / 60)::integer,
        reschedule_count = reschedule_count + 1
    WHERE id = v_visit.id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END;

  DELETE FROM public.booking_emails
  WHERE appointment_id = v_visit.id AND kind IN ('rescheduled', 'reminder');

  RETURN QUERY SELECT v_visit.reference, v_slot.starts_at, v_slot.ends_at,
    v_visit.reschedule_count + 1;
END;
$function$;

REVOKE ALL ON FUNCTION public.reschedule_booking(text, timestamptz) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reschedule_booking(text, timestamptz) TO service_role;

-- E-mails: "cancelled" goes out for a cancelled visit, the rest for a
-- confirmed one. Only the confirmation (and reminder) carry a new link
-- token; "cancelled" and "rescheduled" are sent from the visit page, which
-- already has the link, so the link the client is using keeps working.
CREATE OR REPLACE FUNCTION public.claim_booking_email(p_reference text, p_kind text)
RETURNS TABLE(reference text, mode public.visit_mode, starts_at timestamptz, ends_at timestamptz, service_name text, specialist_name text, room_name text, location_name text, location_address text, price_minor integer, currency_code text, client_name text, client_email text, manage_token text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.reference = p_reference
  FOR UPDATE;
  IF NOT FOUND
     OR v_visit.status <> (CASE WHEN p_kind = 'cancelled' THEN 'cancelled' ELSE 'confirmed' END)::public.appointment_status THEN
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

  IF p_kind IN ('confirmation', 'reminder') THEN
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
    v_visit.client_name, v_visit.client_email, v_token
  FROM public.services AS service
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = v_visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = v_visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE service.id = v_visit.service_id;
END;
$function$;
