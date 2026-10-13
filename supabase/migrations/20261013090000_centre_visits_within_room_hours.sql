-- A visit the centre books or moves into a room must fit the room's
-- opening hours too, as specialists' hours and the site's free times do
-- since 20261007010000 (#33): the whole visit within its weekly hours or an
-- extra opening that day; a room without hours is closed. The time after a
-- visit (its buffer) may run past closing, so the last hour can be booked.
-- Visits already booked outside the hours stay as they are.

CREATE OR REPLACE FUNCTION "private"."room_open_during"("p_room_id" "uuid", "p_during" "tstzrange", "p_timezone" "text") RETURNS boolean
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  WITH visit AS (
    SELECT lower(p_during) AT TIME ZONE p_timezone AS starts_at,
           upper(p_during) AT TIME ZONE p_timezone AS ends_at
  )
  SELECT EXISTS (
    SELECT 1 FROM visit, public.room_opening_hours AS hours
    WHERE hours.room_id = p_room_id
      AND hours.weekday = extract(isodow FROM visit.starts_at)::smallint
      AND visit.starts_at >= visit.starts_at::date + hours.starts_at
      AND visit.ends_at <= visit.starts_at::date + hours.ends_at
  ) OR EXISTS (
    SELECT 1 FROM visit, public.room_availability_exceptions AS extra
    WHERE extra.room_id = p_room_id
      AND extra.type = 'extra_available_interval'
      AND extra.date = visit.starts_at::date
      AND visit.starts_at >= extra.date + extra.starts_at
      AND visit.ends_at <= extra.date + extra.ends_at
  );
$$;

ALTER FUNCTION "private"."room_open_during"("p_room_id" "uuid", "p_during" "tstzrange", "p_timezone" "text") OWNER TO "postgres";

REVOKE ALL ON FUNCTION "private"."room_open_during"("p_room_id" "uuid", "p_during" "tstzrange", "p_timezone" "text") FROM PUBLIC;

CREATE OR REPLACE FUNCTION "public"."centre_book_visit"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_room_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_client_phone" "text", "p_client_notes" "text") RETURNS TABLE("appointment_id" "uuid", "reference" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "payment_due_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
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
    -- Open then, by its hours (#33).
    IF NOT private.room_open_during(v_room.id, v_during, v_settings.timezone) THEN
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
$$;


ALTER FUNCTION "public"."centre_book_visit"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_starts_at" timestamp with time zone, "p_room_id" "uuid", "p_client_name" "text", "p_client_email" "text", "p_client_phone" "text", "p_client_notes" "text") OWNER TO "postgres";



CREATE OR REPLACE FUNCTION "public"."centre_reschedule_visit"("p_appointment_id" "uuid", "p_starts_at" timestamp with time zone, "p_mode" "public"."visit_mode", "p_room_id" "uuid", "p_reason" "text" DEFAULT NULL::"text") RETURNS TABLE("reference" "text", "starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "sequence" integer, "payment_due_at" timestamp with time zone)
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_offer public.specialist_services%ROWTYPE;
  v_settings public.center_settings%ROWTYPE;
  v_room public.rooms%ROWTYPE;
  v_during tstzrange;
  v_day date;
  v_due timestamptz;
BEGIN
  IF NOT public.has_role('admin') THEN
    RAISE EXCEPTION 'Only the centre moves visits'
      USING ERRCODE = 'insufficient_privilege';
  END IF;
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.id = p_appointment_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'No such visit' USING HINT = 'not_found';
  END IF;
  IF v_visit.status NOT IN ('confirmed', 'awaiting_payment') THEN
    RAISE EXCEPTION 'This visit cannot be moved' USING HINT = 'not_reschedulable';
  END IF;
  IF p_starts_at IS NULL OR p_starts_at <= now() THEN
    RAISE EXCEPTION 'The time has passed' USING HINT = 'in_the_past';
  END IF;

  SELECT * INTO v_offer FROM public.specialist_services AS offer
  WHERE offer.id = v_visit.specialist_service_id;
  IF (p_mode = 'online' AND NOT v_offer.supports_online)
     OR (p_mode = 'in_person' AND NOT v_offer.supports_in_person) THEN
    RAISE EXCEPTION 'This service is not given this way' USING HINT = 'not_bookable';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  v_during := tstzrange(p_starts_at, p_starts_at + make_interval(mins => v_visit.duration_minutes));
  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;

  IF v_during = v_visit.during AND p_mode = v_visit.mode
     AND (CASE WHEN p_mode = 'in_person' THEN p_room_id END) IS NOT DISTINCT FROM v_visit.room_id THEN
    RAISE EXCEPTION 'The visit is there already' USING HINT = 'nothing_changed';
  END IF;

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
    -- Open then, by its hours (#33).
    IF NOT private.room_open_during(v_room.id, v_during, v_settings.timezone) THEN
      RAISE EXCEPTION 'The room is closed then' USING HINT = 'room_closed';
    END IF;
  ELSIF p_room_id IS NOT NULL THEN
    RAISE EXCEPTION 'An online visit has no room' USING HINT = 'not_bookable';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.specialist_time_off AS off
    WHERE off.specialist_id = v_visit.specialist_id AND off.during && v_during
  ) THEN
    RAISE EXCEPTION 'The specialist is away then' USING HINT = 'time_off';
  END IF;

  IF v_visit.status = 'awaiting_payment' AND v_visit.payment_due_at IS NOT NULL THEN
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
  END IF;

  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_visit.specialist_id, 0));
  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();
  PERFORM private.cancel_overdue_payments();

  PERFORM set_config('kolor.change_reason', coalesce(left(btrim(p_reason), 500), ''), true);
  BEGIN
    UPDATE public.appointments
    SET during = v_during,
        mode = p_mode,
        room_id = CASE WHEN p_mode = 'in_person' THEN v_room.id END,
        availability_rule_id = NULL,
        buffer_minutes = v_settings.default_visit_buffer_minutes,
        payment_due_at = coalesce(v_due, payment_due_at)
    WHERE id = v_visit.id;
  EXCEPTION WHEN exclusion_violation THEN
    IF SQLERRM LIKE '%appointments_room_no_overlap%' THEN
      RAISE EXCEPTION 'The room is taken then' USING HINT = 'room_busy';
    END IF;
    RAISE EXCEPTION 'The specialist has a visit then' USING HINT = 'specialist_busy';
  END;
  PERFORM set_config('kolor.change_reason', '', true);

  -- The e-mails about it (and the reminders) go again for the new time.
  DELETE FROM public.booking_emails
  WHERE appointment_id = v_visit.id
    AND kind IN ('rescheduled', 'reminder', 'payment_reminder', 'payment_last_call');

  RETURN QUERY SELECT v_visit.reference, lower(v_during), upper(v_during),
    private.times_moved(v_visit.id), coalesce(v_due, v_visit.payment_due_at);
END;
$$;


ALTER FUNCTION "public"."centre_reschedule_visit"("p_appointment_id" "uuid", "p_starts_at" timestamp with time zone, "p_mode" "public"."visit_mode", "p_room_id" "uuid", "p_reason" "text") OWNER TO "postgres";

