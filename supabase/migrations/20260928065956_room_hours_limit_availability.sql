-- A room's opening hours limit the availability specialists set in it:
-- when the room has any hours, a window must fit an opening interval on
-- each of its weekdays. Rooms without hours stay unrestricted. Date
-- closures (room exceptions) are left to slot computation.

CREATE OR REPLACE FUNCTION private.write_availability_rule(
  p_specialist_id uuid,
  p_id uuid,
  p_recurrence public.availability_recurrence,
  p_weekdays smallint[],
  p_interval_weeks smallint,
  p_starts_at time,
  p_ends_at time,
  p_valid_from date,
  p_valid_until date,
  p_occurrence_count smallint,
  p_mode public.availability_mode,
  p_room_id uuid,
  p_note text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_weekdays smallint[] := ARRAY(
    SELECT DISTINCT day FROM unnest(p_weekdays) AS day ORDER BY day
  );
  v_interval smallint := coalesce(p_interval_weeks, 1);
  v_valid_until date := p_valid_until;
  v_count smallint := p_occurrence_count;
  v_room_id uuid := CASE WHEN p_mode = 'online' THEN NULL ELSE p_room_id END;
  conflict text;
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

  -- A room with opening hours is only used while it is open, on each of
  -- the window's weekdays.
  IF v_room_id IS NOT NULL
     AND EXISTS (SELECT 1 FROM public.room_opening_hours WHERE room_id = v_room_id)
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
    conflict := private.availability_conflict(
      p_id, p_specialist_id, v_room_id, p_recurrence, v_weekdays, v_interval,
      p_starts_at, p_ends_at, p_valid_from, v_valid_until
    );
    IF conflict IS NOT NULL THEN
      RAISE EXCEPTION 'Availability window clashes with another one'
        USING ERRCODE = '23P01', HINT = conflict;
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

