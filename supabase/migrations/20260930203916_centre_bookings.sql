-- Visits the centre books (docs/product/scheduling-ui-plan.md, K5: "+ Nowa
-- wizyta"). An admin books for any specialist, a specialist for themselves,
-- from the calendar: the time need not be on the public grid nor inside the
-- availability (the centre decides), but the specialist and the room must
-- be free (the same exclusion constraints as online bookings), the room
-- open that day and the specialist not away. The client accepts nothing
-- online, so no consents are recorded; the visit is confirmed at once and
-- paid on site (no online payment). E-mails, links to manage the visit and
-- the history work as for online bookings, and say who booked it.

-- Who booked: the client online, or the centre.
ALTER TABLE public.appointments
  ADD COLUMN booked_by text NOT NULL DEFAULT 'client'
  CONSTRAINT appointments_booked_by_valid CHECK (booked_by IN ('client', 'centre'));

-- A booked visit needs the client: online with their e-mail and consents,
-- by the centre with a name and a way to reach them.
ALTER TABLE public.appointments DROP CONSTRAINT appointments_client_when_booked;
ALTER TABLE public.appointments ADD CONSTRAINT appointments_client_when_booked CHECK (
  status NOT IN ('awaiting_payment', 'confirmed')
  OR (
    client_name IS NOT NULL
    AND CASE booked_by
      WHEN 'centre' THEN client_email IS NOT NULL OR client_phone IS NOT NULL
      ELSE client_email IS NOT NULL
        AND terms_accepted_at IS NOT NULL
        AND privacy_accepted_at IS NOT NULL
    END
  )
);

-- The history says who created the visit.
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
      jsonb_build_object(
        'reference', NEW.reference,
        'starts_at', lower(NEW.during), 'ends_at', upper(NEW.during),
        'mode', NEW.mode, 'price_minor', NEW.price_minor, 'currency_code', NEW.currency_code,
        'status', NEW.status
      ));
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
        CASE WHEN NEW.cancelled_by = 'centre' THEN 'centre' ELSE 'client' END,
        jsonb_build_object('from', OLD.status, 'refund_due_minor', NEW.refund_due_minor));
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

-- The centre books a visit: confirmed, paid on site.
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
RETURNS TABLE (appointment_id uuid, reference text, starts_at timestamptz, ends_at timestamptz)
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

  v_reference := private.next_booking_reference(now(), v_settings.timezone);
  BEGIN
    INSERT INTO public.appointments (
      reference, specialist_id, service_id, specialist_service_id,
      mode, room_id, during, buffer_minutes, duration_minutes,
      price_minor, currency_code, status, confirmed_at, booked_by,
      client_name, client_email, client_phone, client_notes,
      access_token_hash
    )
    VALUES (
      v_reference, v_offer.specialist_id, v_offer.service_id, v_offer.id,
      p_mode, CASE WHEN p_mode = 'in_person' THEN v_room.id END,
      v_during, v_settings.default_visit_buffer_minutes, v_duration,
      v_offer.price_minor, v_offer.currency_code, 'confirmed', now(), 'centre',
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

  RETURN QUERY SELECT v_id, v_reference, lower(v_during), upper(v_during);
END;
$function$;

REVOKE ALL ON FUNCTION public.centre_book_visit(uuid, public.visit_mode, timestamptz, uuid, text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_book_visit(uuid, public.visit_mode, timestamptz, uuid, text, text, text, text) TO authenticated, service_role;

-- The visit page and the e-mails tell a visit paid online from one paid on
-- site.
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
  booked_by text, paid boolean
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
    )
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

DROP FUNCTION public.claim_booking_email(text, text);
CREATE FUNCTION public.claim_booking_email(p_reference text, p_kind text)
RETURNS TABLE (
  reference text, mode public.visit_mode, starts_at timestamptz, ends_at timestamptz,
  service_name text, specialist_name text, room_name text, location_name text,
  location_address text, price_minor integer, currency_code text,
  client_name text, client_email text, manage_token text, cancelled_by text,
  booked_by text, paid boolean
)
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
     OR v_visit.client_email IS NULL
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

  IF p_kind IN ('confirmation', 'reminder')
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
    )
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
