-- A room without opening hours is closed (the admin sets its hours before
-- anyone can be on duty there): a specialist's window in a room must fit
-- its hours, and free times are offered only while the room is open, so
-- hours narrowed or removed later stop offering what no longer fits.

CREATE OR REPLACE FUNCTION "private"."write_availability_rule"("p_specialist_id" "uuid", "p_id" "uuid", "p_recurrence" "public"."availability_recurrence", "p_weekdays" smallint[], "p_interval_weeks" smallint, "p_starts_at" time without time zone, "p_ends_at" time without time zone, "p_valid_from" "date", "p_valid_until" "date", "p_occurrence_count" smallint, "p_mode" "public"."availability_mode", "p_room_id" "uuid", "p_note" "text") RETURNS "uuid"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO ''
    AS $$
DECLARE
  v_weekdays smallint[] := ARRAY(
    SELECT DISTINCT day FROM unnest(p_weekdays) AS day ORDER BY day
  );
  v_interval smallint := coalesce(p_interval_weeks, 1);
  v_valid_until date := p_valid_until;
  v_count smallint := p_occurrence_count;
  v_room_id uuid := CASE WHEN p_mode = 'online' THEN NULL ELSE p_room_id END;
  clash record;
  saved_id uuid;
BEGIN
  IF p_recurrence = 'once' THEN
    v_weekdays := ARRAY[extract(isodow FROM p_valid_from)::smallint];
    v_interval := 1;
    v_valid_until := p_valid_from;
    v_count := NULL;
  ELSIF v_count IS NOT NULL THEN
    IF NOT private.is_weekday_set(v_weekdays) THEN
      RAISE EXCEPTION 'Invalid weekdays' USING ERRCODE = '23514';
    END IF;
    v_valid_until := private.availability_nth_date(v_weekdays, v_interval, p_valid_from, v_count);
  END IF;

  IF v_room_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rooms WHERE rooms.id = v_room_id AND rooms.active
  ) THEN
    RAISE EXCEPTION 'Room is not available' USING ERRCODE = '22023';
  END IF;

  -- A room is only used while it is open, on each of the window's
  -- weekdays; one without opening hours is closed.
  IF v_room_id IS NOT NULL
     AND EXISTS (
       SELECT 1 FROM unnest(v_weekdays) AS day
       WHERE NOT EXISTS (
         SELECT 1 FROM public.room_opening_hours AS hours
         WHERE hours.room_id = v_room_id
           AND hours.weekday = day
           AND hours.starts_at <= p_starts_at
           AND hours.ends_at >= p_ends_at
       )
     )
  THEN
    RAISE EXCEPTION 'The room is closed at these hours'
      USING ERRCODE = '23P01', HINT = 'room_closed';
  END IF;

  -- One writer per specialist and per room at a time (fixed order).
  PERFORM pg_advisory_xact_lock(hashtextextended('availability:specialist:' || p_specialist_id, 0));
  IF v_room_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('availability:room:' || v_room_id, 0));
  END IF;

  IF private.is_weekday_set(v_weekdays) THEN
    SELECT * INTO clash
    FROM private.availability_clash(
      p_id, p_specialist_id, v_room_id, p_recurrence, v_weekdays, v_interval,
      p_starts_at, p_ends_at, p_valid_from, v_valid_until
    );
    IF FOUND THEN
      IF clash.kind = 'room_taken' THEN
        RAISE EXCEPTION 'The room is taken at these hours'
          USING ERRCODE = '23P01', HINT = 'room_taken',
            DETAIL = jsonb_build_object(
              'specialist', private.specialist_display_name(clash.specialist_id),
              'date', clash.day,
              'startsAt', to_char(clash.starts_at, 'HH24:MI'),
              'endsAt', to_char(clash.ends_at, 'HH24:MI')
            )::text;
      END IF;
      RAISE EXCEPTION 'Availability window clashes with another one'
        USING ERRCODE = '23P01', HINT = clash.kind;
    END IF;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.specialist_availability_rules (
      specialist_id, recurrence, weekdays, interval_weeks, starts_at, ends_at,
      valid_from, valid_until, occurrence_count, mode, room_id, note
    ) VALUES (
      p_specialist_id, p_recurrence, v_weekdays, v_interval, p_starts_at, p_ends_at,
      p_valid_from, v_valid_until, v_count, p_mode, v_room_id, nullif(trim(p_note), '')
    )
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.specialist_availability_rules
    SET recurrence = p_recurrence,
        weekdays = v_weekdays,
        interval_weeks = v_interval,
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        valid_from = p_valid_from,
        valid_until = v_valid_until,
        occurrence_count = v_count,
        mode = p_mode,
        room_id = v_room_id,
        note = nullif(trim(p_note), '')
    WHERE id = p_id
    RETURNING id INTO saved_id;
  END IF;

  RETURN saved_id;
END;
$$;

CREATE OR REPLACE FUNCTION "private"."free_slots"("p_offer_id" "uuid", "p_mode" "public"."visit_mode", "p_from" "date", "p_to" "date", "p_location_id" "uuid" DEFAULT NULL::"uuid", "p_ignore_appointment" "uuid" DEFAULT NULL::"uuid") RETURNS TABLE("starts_at" timestamp with time zone, "ends_at" timestamp with time zone, "rule_id" "uuid", "room_id" "uuid")
    LANGUAGE "sql" STABLE
    SET "search_path" TO ''
    AS $$
  WITH settings AS (
    SELECT timezone AS tz,
      slot_step_minutes AS step,
      min_booking_lead_minutes AS lead,
      max_booking_horizon_days AS horizon
    FROM public.center_settings
    WHERE id = 1
  ),
  offer AS (
    SELECT o.specialist_id,
      s.default_duration_minutes AS duration,
      s.after_minutes AS after
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
      AND NOT private.centre_closed_on(d::date)
      AND CASE p_mode
        WHEN 'online' THEN r.mode IN ('online', 'hybrid')
        ELSE r.mode IN ('in_person', 'hybrid')
      END
      AND (
        r.room_id IS NULL
        OR (
          room.active AND location.active
          -- Open then: its weekly hours (or an extra opening that day)
          -- hold the whole window. A room without hours is closed, and a
          -- window left outside hours changed later offers nothing.
          AND (
            EXISTS (
              SELECT 1 FROM public.room_opening_hours AS hours
              WHERE hours.room_id = r.room_id
                AND hours.weekday = extract(isodow FROM d)::smallint
                AND hours.starts_at <= r.starts_at
                AND hours.ends_at >= r.ends_at
            )
            OR EXISTS (
              SELECT 1 FROM public.room_availability_exceptions AS extra
              WHERE extra.room_id = r.room_id
                AND extra.date = d::date
                AND extra.type = 'extra_available_interval'
                AND extra.starts_at <= r.starts_at
                AND extra.ends_at >= r.ends_at
            )
          )
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
      ((w.day + make_interval(mins => m + offer.duration)) AT TIME ZONE settings.tz) AS slot_end,
      ((w.day + make_interval(mins => m + offer.duration + offer.after)) AT TIME ZONE settings.tz) AS slot_held
    FROM windows AS w
    CROSS JOIN settings
    CROSS JOIN offer
    CROSS JOIN generate_series(
      (ceil(extract(epoch FROM w.window_start) / 60 / settings.step) * settings.step)::integer,
      (extract(epoch FROM w.window_end) / 60)::integer - offer.duration - offer.after,
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
        AND off.during && tstzrange(c.slot_start, c.slot_held)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.room_availability_exceptions AS blocked
      WHERE blocked.room_id = c.window_room
        AND blocked.date = c.day
        AND blocked.type = 'blocked_interval'
        AND tstzrange(
          (blocked.date + blocked.starts_at) AT TIME ZONE settings.tz,
          (blocked.date + blocked.ends_at) AT TIME ZONE settings.tz
        ) && tstzrange(c.slot_start, c.slot_held)
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.appointments AS visit
      WHERE visit.specialist_id = offer.specialist_id
        AND visit.id IS DISTINCT FROM p_ignore_appointment
        AND private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
        AND visit.blocks && tstzrange(c.slot_start, c.slot_held)
    )
    AND (
      p_mode = 'online'
      OR NOT EXISTS (
        SELECT 1 FROM public.appointments AS visit
        WHERE visit.room_id = c.window_room
          AND visit.id IS DISTINCT FROM p_ignore_appointment
          AND private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
          AND visit.blocks && tstzrange(c.slot_start, c.slot_held)
      )
    );
$$;
