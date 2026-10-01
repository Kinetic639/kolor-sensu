-- Pay now or later (docs/product/booking-plan.md, R11). Every visit may be
-- reserved without paying: the client pays online by payment_due_hours
-- (48) before it, from the e-mail's link, or the reservation is cancelled
-- for want of payment (cancelled_by 'system'). A visit closer than that is
-- paid at once online; one the centre books then gets a short link
-- (centre_payment_link_hours, at most until an hour before). Nothing is
-- ever paid on site. Unpaid reservations past their time stop blocking the
-- calendar at once (appointment_is_live) and are cancelled lazily by every
-- booking and by the site's scheduled job, which also sends the reminders.

ALTER TABLE public.center_settings
  ADD COLUMN payment_due_hours integer NOT NULL DEFAULT 48
    CONSTRAINT center_settings_payment_due_hours CHECK (payment_due_hours BETWEEN 1 AND 720),
  ADD COLUMN centre_payment_link_hours integer NOT NULL DEFAULT 2
    CONSTRAINT center_settings_centre_payment_link_hours CHECK (centre_payment_link_hours BETWEEN 1 AND 72);

ALTER TABLE public.appointments ADD COLUMN payment_due_at timestamptz;

ALTER TABLE public.appointments DROP CONSTRAINT appointments_cancelled_by_valid;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_cancelled_by_valid
  CHECK (cancelled_by IS NULL OR cancelled_by IN ('client', 'centre', 'system'));

-- A booked visit needs the client's name and e-mail (the payment link goes
-- there); a confirmed one also their consents, which a reservation the
-- centre made gets when the client pays.
ALTER TABLE public.appointments DROP CONSTRAINT appointments_client_when_booked;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_client_when_booked CHECK (
  status NOT IN ('awaiting_payment', 'confirmed')
  OR (
    client_name IS NOT NULL
    AND client_email IS NOT NULL
    AND (
      (status = 'awaiting_payment' AND booked_by = 'centre')
      OR (terms_accepted_at IS NOT NULL AND privacy_accepted_at IS NOT NULL)
    )
  )
);

ALTER TABLE public.booking_emails DROP CONSTRAINT booking_emails_kind_valid;
ALTER TABLE public.booking_emails ADD CONSTRAINT booking_emails_kind_valid CHECK (
  kind IN ('confirmation', 'reminder', 'rescheduled', 'cancelled',
           'reserved', 'payment_reminder', 'payment_last_call')
);

ALTER TABLE public.appointment_events DROP CONSTRAINT appointment_events_kind_check;
ALTER TABLE public.appointment_events ADD CONSTRAINT appointment_events_kind_check CHECK (
  kind IN ('created', 'details_saved', 'hold_released', 'hold_expired',
           'awaiting_payment', 'confirmed', 'cancelled', 'rescheduled',
           'payment_started', 'payment_succeeded', 'payment_failed',
           'payment_expired', 'refund_recorded', 'email_sent', 'reserved')
);

-- An unpaid reservation past its time no longer holds the time. (free_slots,
-- its only caller, is recreated below.)
DROP FUNCTION private.appointment_is_live(public.appointment_status, timestamptz);
CREATE FUNCTION private.appointment_is_live(
  p_status public.appointment_status,
  p_hold_expires_at timestamptz,
  p_payment_due_at timestamptz
)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT p_status = 'confirmed'
    OR (p_status = 'awaiting_payment' AND (p_payment_due_at IS NULL OR p_payment_due_at > now()))
    OR (p_status = 'held' AND p_hold_expires_at > now());
$function$;

-- When a visit starting then must be paid by (null: at once).
CREATE FUNCTION private.payment_due(p_starts_at timestamptz)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT CASE
    WHEN p_starts_at - make_interval(hours => settings.payment_due_hours) > now() + interval '1 hour'
      THEN p_starts_at - make_interval(hours => settings.payment_due_hours)
  END
  FROM public.center_settings AS settings
  WHERE settings.id = 1;
$function$;

-- Cancels the reservations not paid in time (none with a payment going on).
CREATE FUNCTION private.cancel_overdue_payments()
RETURNS SETOF text
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  UPDATE public.appointments AS visit
  SET status = 'cancelled', cancelled_at = now(), cancelled_by = 'system',
      refund_due_minor = 0
  WHERE visit.status = 'awaiting_payment'
    AND visit.payment_due_at <= now()
    AND NOT EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id AND payment.status = 'pending'
    )
  RETURNING visit.reference;
$function$;

-- The history: reserved (paying later), cancelled by the system.
CREATE OR REPLACE FUNCTION private.appointment_events_trigger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM private.log_appointment_event(NEW.id, 'created',
      CASE WHEN NEW.booked_by = 'centre' THEN 'centre' ELSE 'client' END,
      jsonb_strip_nulls(jsonb_build_object(
        'reference', NEW.reference,
        'starts_at', lower(NEW.during), 'ends_at', upper(NEW.during),
        'mode', NEW.mode, 'price_minor', NEW.price_minor, 'currency_code', NEW.currency_code,
        'status', NEW.status, 'payment_due_at', NEW.payment_due_at
      )));
    RETURN NEW;
  END IF;

  IF OLD.terms_accepted_at IS NULL AND NEW.terms_accepted_at IS NOT NULL THEN
    PERFORM private.log_appointment_event(NEW.id, 'details_saved', 'client');
  END IF;

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NEW.status = 'expired' THEN
      PERFORM private.log_appointment_event(NEW.id, 'hold_expired', 'system',
        jsonb_build_object('from', OLD.status));
    ELSIF NEW.status = 'cancelled' AND OLD.status = 'held' THEN
      PERFORM private.log_appointment_event(NEW.id, 'hold_released', 'client');
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM private.log_appointment_event(NEW.id, 'cancelled',
        CASE NEW.cancelled_by WHEN 'centre' THEN 'centre' WHEN 'system' THEN 'system' ELSE 'client' END,
        jsonb_strip_nulls(jsonb_build_object(
          'from', OLD.status, 'refund_due_minor', NEW.refund_due_minor,
          'reason', CASE WHEN NEW.cancelled_by = 'system' THEN 'unpaid' END
        )));
    ELSIF NEW.status = 'awaiting_payment' AND OLD.status = 'held' AND NEW.payment_due_at IS NOT NULL THEN
      PERFORM private.log_appointment_event(NEW.id, 'reserved', 'client',
        jsonb_build_object('payment_due_at', NEW.payment_due_at));
    ELSIF NEW.status = 'awaiting_payment' THEN
      PERFORM private.log_appointment_event(NEW.id, 'awaiting_payment', 'payment');
    ELSIF NEW.status = 'confirmed' THEN
      PERFORM private.log_appointment_event(NEW.id, 'confirmed', 'payment',
        jsonb_build_object('from', OLD.status));
    END IF;
  END IF;

  IF NEW.during IS DISTINCT FROM OLD.during AND OLD.status = NEW.status
     AND NEW.status IN ('confirmed', 'awaiting_payment') THEN
    PERFORM private.log_appointment_event(NEW.id, 'rescheduled',
      CASE WHEN NEW.reschedule_count > OLD.reschedule_count THEN 'client' ELSE 'centre' END,
      jsonb_build_object(
        'from_starts_at', lower(OLD.during), 'from_ends_at', upper(OLD.during),
        'to_starts_at', lower(NEW.during), 'to_ends_at', upper(NEW.during)
      ));
  END IF;
  RETURN NEW;
END;
$function$;

-- Free times: the same, with unpaid reservations past their time freed.
CREATE OR REPLACE FUNCTION private.free_slots(p_offer_id uuid, p_mode visit_mode, p_from date, p_to date, p_location_id uuid DEFAULT NULL::uuid, p_ignore_appointment uuid DEFAULT NULL::uuid)
 RETURNS TABLE(starts_at timestamp with time zone, ends_at timestamp with time zone, rule_id uuid, room_id uuid)
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
        AND private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
        AND visit.blocks && tstzrange(c.slot_start, c.slot_end + make_interval(mins => settings.buffer))
    )
    AND (
      p_mode = 'online'
      OR NOT EXISTS (
        SELECT 1 FROM public.appointments AS visit
        WHERE visit.room_id = c.window_room
          AND visit.id IS DISTINCT FROM p_ignore_appointment
          AND private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
          AND visit.blocks && tstzrange(c.slot_start, c.slot_end + make_interval(mins => settings.buffer))
      )
    );
$function$;

-- Holding a time: as before, and the unpaid past their time let go first.
CREATE OR REPLACE FUNCTION public.hold_slot(p_service_slug text, p_specialist_slug text, p_mode visit_mode, p_starts_at timestamp with time zone, p_client_key text, p_location_slug text DEFAULT NULL::text)
 RETURNS TABLE(appointment_id uuid, reference text, access_token text, hold_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_settings public.center_settings%ROWTYPE;
  v_offer public.specialist_services%ROWTYPE;
  v_location uuid;
  v_day date;
  v_slot record;
  v_token text;
  v_reference text;
  v_id uuid;
  v_expires timestamptz;
BEGIN
  IF p_client_key IS NULL OR char_length(p_client_key) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'A visitor key is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  SELECT * INTO v_offer FROM public.specialist_services
  WHERE id = private.bookable_offer(p_service_slug, p_specialist_slug, p_mode);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service cannot be booked with this specialist'
      USING HINT = 'not_bookable';
  END IF;
  IF p_location_slug IS NOT NULL THEN
    v_location := private.public_location_id(p_location_slug);
    IF v_location IS NULL THEN
      RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
    END IF;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('booking:visitor:' || p_client_key, 0));
  DELETE FROM private.booking_holds WHERE created_at < now() - interval '1 hour';
  IF (
    SELECT count(*) FROM private.booking_holds AS attempt
    WHERE attempt.client_key = p_client_key
      AND attempt.created_at > now() - interval '15 minutes'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many holds, try again later' USING HINT = 'too_many_holds';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_offer.specialist_id, 0));

  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();
  PERFORM private.cancel_overdue_payments();

  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;
  SELECT * INTO v_slot
  FROM private.free_slots(v_offer.id, p_mode, v_day, v_day, v_location) AS slot
  WHERE slot.starts_at = p_starts_at;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END IF;

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  v_reference := private.next_booking_reference(now(), v_settings.timezone);
  v_expires := now() + make_interval(mins => v_settings.hold_minutes);

  BEGIN
    INSERT INTO public.appointments (
      reference, specialist_id, service_id, specialist_service_id,
      availability_rule_id, mode, room_id, during, buffer_minutes,
      duration_minutes, price_minor, currency_code, status, hold_expires_at,
      access_token_hash
    )
    VALUES (
      v_reference, v_offer.specialist_id, v_offer.service_id, v_offer.id,
      v_slot.rule_id, p_mode, v_slot.room_id,
      tstzrange(v_slot.starts_at, v_slot.ends_at),
      v_settings.default_visit_buffer_minutes,
      (extract(epoch FROM v_slot.ends_at - v_slot.starts_at) / 60)::integer,
      v_offer.price_minor, v_offer.currency_code, 'held', v_expires,
      extensions.digest(v_token, 'sha256')
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END;

  INSERT INTO private.booking_holds (client_key) VALUES (p_client_key);

  RETURN QUERY SELECT v_id, v_reference, v_token, v_expires;
END;
$function$;

-- Moving a visit: as before, with the unpaid past their time let go first.
CREATE OR REPLACE FUNCTION public.reschedule_booking(p_manage_token text, p_starts_at timestamptz)
 RETURNS TABLE(reference text, starts_at timestamp with time zone, ends_at timestamp with time zone, reschedule_count integer)
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
  PERFORM private.cancel_overdue_payments();

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

-- "Zarezerwuj, zapłacę później": the held visit, with the client's details
-- and consents, is reserved until its payment is due.
CREATE FUNCTION public.reserve_hold(p_access_token text)
RETURNS TABLE (reference text, payment_due_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_due timestamptz;
BEGIN
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
  -- A payment already started for it stops counting.
  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  UPDATE public.appointments
  SET status = 'awaiting_payment', hold_expires_at = NULL, payment_due_at = v_due
  WHERE id = v_visit.id;
  RETURN QUERY SELECT v_visit.reference, v_due;
END;
$function$;
REVOKE ALL ON FUNCTION public.reserve_hold(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_hold(text) TO service_role;

-- The centre books a visit: reserved until paid online, the link by e-mail.
DROP FUNCTION public.centre_book_visit(uuid, public.visit_mode, timestamptz, uuid, text, text, text, text);
CREATE FUNCTION public.centre_book_visit(
  p_offer_id uuid,
  p_mode public.visit_mode,
  p_starts_at timestamptz,
  p_room_id uuid,
  p_client_name text,
  p_client_email text,
  p_client_phone text,
  p_client_notes text
)
RETURNS TABLE (appointment_id uuid, reference text, starts_at timestamptz, ends_at timestamptz, payment_due_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_settings public.center_settings%ROWTYPE;
  v_offer public.specialist_services%ROWTYPE;
  v_duration integer;
  v_during tstzrange;
  v_day date;
  v_room public.rooms%ROWTYPE;
  v_reference text;
  v_due timestamptz;
  v_id uuid;
BEGIN
  SELECT * INTO v_offer FROM public.specialist_services AS offer
  WHERE offer.id = p_offer_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such offer' USING HINT = 'not_bookable';
  END IF;
  PERFORM private.managed_specialist_id(v_offer.specialist_id);

  IF NOT v_offer.active
     OR NOT EXISTS (
       SELECT 1 FROM public.specialists AS specialist
       WHERE specialist.id = v_offer.specialist_id AND specialist.active
     )
     OR NOT EXISTS (
       SELECT 1 FROM public.services AS service
       WHERE service.id = v_offer.service_id AND service.active
     )
     OR (p_mode = 'online' AND NOT v_offer.supports_online)
     OR (p_mode = 'in_person' AND NOT v_offer.supports_in_person) THEN
    RAISE EXCEPTION 'This service cannot be booked this way' USING HINT = 'not_bookable';
  END IF;

  IF p_starts_at IS NULL OR p_starts_at <= now() THEN
    RAISE EXCEPTION 'The time has passed' USING HINT = 'in_the_past';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  -- Paid by the usual time before the visit, or soon when it is close.
  v_due := coalesce(
    private.payment_due(p_starts_at),
    least(
      now() + make_interval(hours => v_settings.centre_payment_link_hours),
      p_starts_at - interval '1 hour'
    )
  );
  IF v_due <= now() + interval '15 minutes' THEN
    RAISE EXCEPTION 'Too little time left to pay' USING HINT = 'too_soon';
  END IF;

  SELECT coalesce(v_offer.duration_minutes, service.default_duration_minutes)
  INTO v_duration FROM public.services AS service WHERE service.id = v_offer.service_id;
  v_during := tstzrange(p_starts_at, p_starts_at + make_interval(mins => v_duration));
  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;

  IF p_mode = 'in_person' THEN
    SELECT * INTO v_room FROM public.rooms AS room WHERE room.id = p_room_id;
    IF NOT FOUND OR NOT v_room.active OR NOT EXISTS (
      SELECT 1 FROM public.locations AS location
      WHERE location.id = v_room.location_id AND location.active
    ) THEN
      RAISE EXCEPTION 'Choose an open room' USING HINT = 'room_required';
    END IF;
    IF EXISTS (
      SELECT 1 FROM public.room_availability_exceptions AS closed
      WHERE closed.room_id = v_room.id
        AND closed.date = v_day
        AND (
          closed.type = 'closed_all_day'
          OR (
            closed.type = 'blocked_interval'
            AND tstzrange(
              (closed.date + closed.starts_at) AT TIME ZONE v_settings.timezone,
              (closed.date + closed.ends_at) AT TIME ZONE v_settings.timezone
            ) && v_during
          )
        )
    ) THEN
      RAISE EXCEPTION 'The room is closed then' USING HINT = 'room_closed';
    END IF;
  ELSIF p_room_id IS NOT NULL THEN
    RAISE EXCEPTION 'An online visit has no room' USING HINT = 'not_bookable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.specialist_time_off AS off
    WHERE off.specialist_id = v_offer.specialist_id AND off.during && v_during
  ) THEN
    RAISE EXCEPTION 'The specialist is away then' USING HINT = 'time_off';
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_offer.specialist_id, 0));
  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();
  PERFORM private.cancel_overdue_payments();

  v_reference := private.next_booking_reference(now(), v_settings.timezone);
  BEGIN
    INSERT INTO public.appointments (
      reference, specialist_id, service_id, specialist_service_id,
      mode, room_id, during, buffer_minutes, duration_minutes,
      price_minor, currency_code, status, payment_due_at, booked_by,
      client_name, client_email, client_phone, client_notes,
      access_token_hash
    )
    VALUES (
      v_reference, v_offer.specialist_id, v_offer.service_id, v_offer.id,
      p_mode, CASE WHEN p_mode = 'in_person' THEN v_room.id END,
      v_during, v_settings.default_visit_buffer_minutes, v_duration,
      v_offer.price_minor, v_offer.currency_code, 'awaiting_payment', v_due, 'centre',
      nullif(trim(p_client_name), ''),
      lower(nullif(trim(p_client_email), '')),
      nullif(trim(p_client_phone), ''),
      nullif(trim(p_client_notes), ''),
      extensions.digest(extensions.gen_random_bytes(32), 'sha256')
    )
    RETURNING id INTO v_id;
  EXCEPTION
    WHEN exclusion_violation THEN
      IF SQLERRM LIKE '%appointments_room_no_overlap%' THEN
        RAISE EXCEPTION 'The room is taken then' USING HINT = 'room_busy';
      END IF;
      RAISE EXCEPTION 'The specialist has a visit then' USING HINT = 'specialist_busy';
    WHEN check_violation THEN
      RAISE EXCEPTION 'The client''s details are not valid' USING HINT = 'invalid_details';
  END;

  RETURN QUERY SELECT v_id, v_reference, lower(v_during), upper(v_during), v_due;
END;
$function$;
REVOKE ALL ON FUNCTION public.centre_book_visit(uuid, public.visit_mode, timestamptz, uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_book_visit(uuid, public.visit_mode, timestamptz, uuid, text, text, text, text) TO authenticated, service_role;

-- A reservation, found by its link: whose token it is (the hold's, or the
-- e-mail's link).
CREATE FUNCTION private.reservation_by_token(p_token text)
RETURNS public.appointments
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT visit.* FROM public.appointments AS visit
  WHERE visit.access_token_hash = extensions.digest(p_token, 'sha256')
     OR visit.manage_token_hash = extensions.digest(p_token, 'sha256')
  LIMIT 1;
$function$;

-- Paying a reservation from its link: the consents (a visit the centre
-- booked has none yet), then a Checkout Session.
CREATE FUNCTION public.accept_booking_terms(p_token text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  v_visit := private.reservation_by_token(p_token);
  IF v_visit.id IS NULL OR v_visit.status <> 'awaiting_payment'
     OR v_visit.payment_due_at IS NULL OR v_visit.payment_due_at <= now() THEN
    RAISE EXCEPTION 'Nothing to pay' USING HINT = 'not_payable';
  END IF;
  UPDATE public.appointments
  SET terms_accepted_at = coalesce(terms_accepted_at, now()),
      privacy_accepted_at = coalesce(privacy_accepted_at, now())
  WHERE id = v_visit.id;
END;
$function$;
REVOKE ALL ON FUNCTION public.accept_booking_terms(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.accept_booking_terms(text) TO service_role;

CREATE FUNCTION public.attach_reservation_payment(
  p_token text, p_session_id text, p_amount_minor integer, p_currency_code text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  v_visit public.appointments%ROWTYPE;
BEGIN
  v_visit := private.reservation_by_token(p_token);
  IF v_visit.id IS NULL OR v_visit.status <> 'awaiting_payment'
     OR v_visit.payment_due_at IS NULL OR v_visit.payment_due_at <= now() THEN
    RAISE EXCEPTION 'Nothing to pay' USING HINT = 'not_payable';
  END IF;
  IF v_visit.terms_accepted_at IS NULL THEN
    RAISE EXCEPTION 'The consents come first' USING HINT = 'consent_required';
  END IF;
  IF p_amount_minor IS DISTINCT FROM v_visit.price_minor
     OR upper(p_currency_code) IS DISTINCT FROM v_visit.currency_code THEN
    RAISE EXCEPTION 'The amount is not the visit''s' USING HINT = 'amount_mismatch';
  END IF;
  UPDATE public.payments SET status = 'expired'
  WHERE appointment_id = v_visit.id AND status = 'pending';
  INSERT INTO public.payments (appointment_id, checkout_session_id, amount_minor, currency_code)
  VALUES (v_visit.id, p_session_id, p_amount_minor, v_visit.currency_code);
END;
$function$;
REVOKE ALL ON FUNCTION public.attach_reservation_payment(text, text, integer, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.attach_reservation_payment(text, text, integer, text) TO service_role;

-- The open payment of a reservation (by its link).
CREATE FUNCTION public.pending_reservation_payment(p_token text)
RETURNS TABLE (checkout_session_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT payment.checkout_session_id
  FROM public.payments AS payment
  WHERE payment.appointment_id = (private.reservation_by_token(p_token)).id
    AND payment.status = 'pending'
  ORDER BY payment.created_at DESC
  LIMIT 1;
$function$;
REVOKE ALL ON FUNCTION public.pending_reservation_payment(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.pending_reservation_payment(text) TO service_role;

-- A failed or lapsed Checkout: the hold ends as before; a reservation stays
-- until its payment is due.
CREATE OR REPLACE FUNCTION public.fail_checkout_session(p_session_id text, p_reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_payment public.payments%ROWTYPE;
BEGIN
  IF p_reason NOT IN ('failed', 'expired') THEN
    RAISE EXCEPTION 'Unknown reason %', p_reason USING ERRCODE = 'invalid_parameter_value';
  END IF;
  UPDATE public.payments
  SET status = p_reason::public.payment_status
  WHERE checkout_session_id = p_session_id AND status = 'pending'
  RETURNING * INTO v_payment;
  IF NOT FOUND THEN
    RETURN;
  END IF;
  UPDATE public.appointments SET status = 'expired'
  WHERE id = v_payment.appointment_id
    AND (status = 'held' OR (status = 'awaiting_payment' AND payment_due_at IS NULL));
END;
$function$;

-- The client cancels from the link: a paid visit as before, an unpaid
-- reservation with nothing to give back.
CREATE OR REPLACE FUNCTION public.cancel_booking(p_manage_token text)
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

  IF v_paid AND now() <= lower(v_visit.during) - make_interval(hours => v_window) THEN
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
$function$;

-- The scheduled job: cancel what was not paid in time, and say which
-- e-mails are due (reservation reminders, the last call, cancellations
-- for want of payment, visit reminders). Claiming sends each once.
CREATE FUNCTION public.cancel_unpaid_visits()
RETURNS TABLE (reference text)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO ''
AS $function$
  SELECT reference FROM private.cancel_overdue_payments() AS reference;
$function$;
REVOKE ALL ON FUNCTION public.cancel_unpaid_visits() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.cancel_unpaid_visits() TO service_role;

CREATE FUNCTION public.list_due_emails()
RETURNS TABLE (reference text, kind text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $function$
  WITH due AS (
    -- Cancelled for want of payment, lately.
    SELECT visit.id, visit.reference, 'cancelled' AS kind
    FROM public.appointments AS visit
    WHERE visit.status = 'cancelled' AND visit.cancelled_by = 'system'
      AND visit.cancelled_at > now() - interval '7 days'
      AND visit.client_email IS NOT NULL
    UNION ALL
    -- A day before the payment is due (for reservations made before that).
    SELECT visit.id, visit.reference, 'payment_reminder'
    FROM public.appointments AS visit
    WHERE visit.status = 'awaiting_payment'
      AND visit.payment_due_at > now() + interval '6 hours'
      AND visit.payment_due_at <= now() + interval '24 hours'
      AND visit.created_at < visit.payment_due_at - interval '24 hours'
    UNION ALL
    -- The last call, six hours before.
    SELECT visit.id, visit.reference, 'payment_last_call'
    FROM public.appointments AS visit
    WHERE visit.status = 'awaiting_payment'
      AND visit.payment_due_at > now()
      AND visit.payment_due_at <= now() + interval '6 hours'
      AND visit.created_at < visit.payment_due_at - interval '6 hours'
    UNION ALL
    -- A day before a paid visit (for visits booked before that).
    SELECT visit.id, visit.reference, 'reminder'
    FROM public.appointments AS visit
    WHERE visit.status = 'confirmed'
      AND lower(visit.during) > now()
      AND lower(visit.during) <= now() + interval '24 hours'
      AND visit.created_at < lower(visit.during) - interval '24 hours'
  )
  SELECT due.reference, due.kind FROM due
  WHERE NOT EXISTS (
    SELECT 1 FROM public.booking_emails AS email
    WHERE email.appointment_id = due.id AND email.kind = due.kind
      AND (email.sent_at IS NOT NULL OR email.claimed_at > now() - interval '10 minutes')
  );
$function$;
REVOKE ALL ON FUNCTION public.list_due_emails() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_due_emails() TO service_role;

-- The visit page knows when it must be paid by.
DROP FUNCTION public.get_booking(text);
CREATE FUNCTION public.get_booking(p_access_token text)
RETURNS TABLE (
  reference text, status public.appointment_status, mode public.visit_mode,
  starts_at timestamptz, ends_at timestamptz, hold_expires_at timestamptz,
  service_name text, specialist_name text, room_name text, location_name text,
  price_minor integer, currency_code text,
  client_name text, client_email text, client_phone text, client_notes text,
  details_saved boolean, reschedule_count integer, cancelled_by text,
  refund_due_minor integer, refunded_minor integer,
  booked_by text, paid boolean, payment_due_at timestamptz
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
    ), 0),
    visit.booked_by,
    EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
        AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
    ),
    visit.payment_due_at
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

-- The e-mails: a reservation and its payment reminders carry a fresh link;
-- a visit reminder too; a cancellation for want of payment none.
DROP FUNCTION public.claim_booking_email(text, text);
CREATE FUNCTION public.claim_booking_email(p_reference text, p_kind text)
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

  IF p_kind IN ('confirmation', 'reminder', 'reserved', 'payment_reminder', 'payment_last_call')
     OR (p_kind = 'cancelled' AND v_visit.cancelled_by = 'centre') THEN
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
REVOKE ALL ON FUNCTION public.claim_booking_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_email(text, text) TO service_role;

REVOKE ALL ON FUNCTION private.appointment_is_live(public.appointment_status, timestamptz, timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.payment_due(timestamptz) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.cancel_overdue_payments() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.reservation_by_token(text) FROM PUBLIC, anon, authenticated;

-- A payment arriving for a visit cancelled meanwhile does not bring it
-- back: the money is to be refunded (as for a time lost).
CREATE OR REPLACE FUNCTION public.fulfill_checkout_session(p_session_id text, p_paid boolean, p_payment_intent_id text)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_payment public.payments%ROWTYPE;
  v_visit public.appointments%ROWTYPE;
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

  IF p_paid THEN
    UPDATE public.payments
    SET status = CASE WHEN status IN ('refunded', 'partially_refunded') THEN status ELSE 'succeeded' END,
        payment_intent_id = coalesce(p_payment_intent_id, payment_intent_id)
    WHERE id = v_payment.id;
  END IF;

  IF v_visit.status = 'confirmed' THEN
    RETURN 'already_confirmed';
  END IF;
  IF v_visit.status = 'cancelled' THEN
    RETURN 'slot_lost';
  END IF;

  BEGIN
    IF p_paid THEN
      UPDATE public.appointments
      SET status = 'confirmed', confirmed_at = now(), hold_expires_at = NULL
      WHERE id = v_visit.id;
      RETURN 'confirmed';
    END IF;
    UPDATE public.appointments
    SET status = 'awaiting_payment', hold_expires_at = NULL
    WHERE id = v_visit.id;
    RETURN 'awaiting_payment';
  EXCEPTION WHEN exclusion_violation THEN
    -- The hold lapsed and someone else has the time now.
    UPDATE public.appointments SET status = 'expired'
    WHERE id = v_visit.id AND status IN ('held', 'awaiting_payment');
    RETURN 'slot_lost';
  END;
END;
$function$;

-- The portals show a reservation cancelled (for want of payment, or by the
-- client) as they show a cancelled visit.
CREATE FUNCTION private.shown_as_visit(p_visit public.appointments)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path TO ''
AS $function$
  SELECT p_visit.status IN ('confirmed', 'awaiting_payment')
    OR (p_visit.status = 'cancelled' AND (
      p_visit.confirmed_at IS NOT NULL
      OR p_visit.cancelled_by IN ('centre', 'system')
      OR p_visit.payment_due_at IS NOT NULL
    ));
$function$;
REVOKE ALL ON FUNCTION private.shown_as_visit(public.appointments) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION private.visible_visits(p_own boolean)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_id uuid, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer, created_at timestamp with time zone, confirmed_at timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
#variable_conflict use_column
DECLARE
  v_admin boolean := public.has_role('admin') AND NOT p_own;
  v_own uuid;
BEGIN
  IF NOT v_admin THEN
    SELECT specialist.id INTO v_own FROM public.specialists AS specialist
    WHERE specialist.user_id = (SELECT auth.uid());
    IF v_own IS NULL THEN
      RAISE EXCEPTION 'Only the centre and its specialists see visits'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;

  RETURN QUERY
  SELECT visit.id, visit.reference, visit.status, visit.mode,
    lower(visit.during), upper(visit.during),
    visit.service_id, service.name,
    visit.specialist_id,
    coalesce(
      nullif(profile.display_name, ''),
      nullif(concat_ws(' ', account.first_name, account.last_name), ''),
      'Specjalista'
    ),
    specialist.color,
    visit.room_id, room.name, room.color, location.name,
    visit.client_name, visit.client_email, visit.client_phone, visit.client_notes,
    visit.price_minor, visit.currency_code,
    CASE WHEN v_admin THEN EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
        AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
    ) END,
    CASE WHEN v_admin THEN visit.refund_due_minor END,
    CASE WHEN v_admin THEN coalesce((
      SELECT sum(payment.refunded_minor)::integer FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
    ), 0) END,
    visit.cancelled_by, visit.cancelled_at, visit.reschedule_count,
    visit.created_at, visit.confirmed_at
  FROM public.appointments AS visit
  JOIN public.services AS service ON service.id = visit.service_id
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  LEFT JOIN public.profiles AS account ON account.id = specialist.user_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE private.shown_as_visit(visit)
    AND (v_admin OR visit.specialist_id = v_own);
END;
$function$;

CREATE OR REPLACE FUNCTION public.list_visits(p_from date, p_to date, p_specialist_id uuid DEFAULT NULL::uuid, p_own boolean DEFAULT false)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_admin boolean := public.has_role('admin') AND NOT p_own;
  v_own uuid;
  v_tz text;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 62 THEN
    RAISE EXCEPTION 'A range of one to 63 days is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF NOT v_admin THEN
    SELECT specialist.id INTO v_own FROM public.specialists AS specialist
    WHERE specialist.user_id = (SELECT auth.uid());
    IF v_own IS NULL THEN
      RAISE EXCEPTION 'Only the centre and its specialists see visits'
        USING ERRCODE = 'insufficient_privilege';
    END IF;
  END IF;
  SELECT timezone INTO v_tz FROM public.center_settings WHERE center_settings.id = 1;

  RETURN QUERY
  SELECT visit.id, visit.reference, visit.status, visit.mode,
    lower(visit.during), upper(visit.during),
    service.name,
    visit.specialist_id,
    coalesce(
      nullif(profile.display_name, ''),
      nullif(concat_ws(' ', account.first_name, account.last_name), ''),
      'Specjalista'
    ),
    specialist.color,
    visit.room_id, room.name, room.color, location.name,
    visit.client_name, visit.client_email, visit.client_phone, visit.client_notes,
    visit.price_minor, visit.currency_code,
    CASE WHEN v_admin THEN EXISTS (
      SELECT 1 FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
        AND payment.status IN ('succeeded', 'refunded', 'partially_refunded')
    ) END,
    CASE WHEN v_admin THEN visit.refund_due_minor END,
    CASE WHEN v_admin THEN coalesce((
      SELECT sum(payment.refunded_minor)::integer FROM public.payments AS payment
      WHERE payment.appointment_id = visit.id
    ), 0) END,
    visit.cancelled_by, visit.cancelled_at, visit.reschedule_count
  FROM public.appointments AS visit
  JOIN public.services AS service ON service.id = visit.service_id
  JOIN public.specialists AS specialist ON specialist.id = visit.specialist_id
  LEFT JOIN public.profiles AS account ON account.id = specialist.user_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE private.shown_as_visit(visit)
    AND (lower(visit.during) AT TIME ZONE v_tz)::date BETWEEN p_from AND p_to
    AND (v_admin OR visit.specialist_id = v_own)
    AND (p_specialist_id IS NULL OR visit.specialist_id = p_specialist_id)
  ORDER BY lower(visit.during), visit.reference;
END;
$function$;
