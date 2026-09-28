-- Room occupancy for staff (docs/product/booking-plan.md, "Zajętość
-- gabinetów"): specialists see which rooms are taken when and by whom, so
-- they pick a free room or ask a colleague to swap. A refused room says who
-- has it and on which date.

-- Who a specialist is, for colleagues: the account's name, else the public
-- profile's (accounts made by invitation may have no name yet).
CREATE OR REPLACE FUNCTION private.specialist_display_name(p_specialist_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT coalesce(
    nullif(trim(concat_ws(' ', trim(profile.first_name), trim(profile.last_name))), ''),
    nullif(trim(public_profile.display_name), ''),
    'Specjalista'
  )
  FROM public.specialists AS specialist
  JOIN public.profiles AS profile ON profile.id = specialist.user_id
  LEFT JOIN public.specialist_public_profiles AS public_profile
    ON public_profile.specialist_id = specialist.id
  WHERE specialist.id = p_specialist_id;
$$;

-- The first clash of a window with the specialist's own windows or with
-- anyone's in the same room: what kind, whose, and on which date.
CREATE OR REPLACE FUNCTION private.availability_clash(
  p_ignore_id uuid,
  p_specialist_id uuid,
  p_room_id uuid,
  p_recurrence public.availability_recurrence,
  p_weekdays smallint[],
  p_interval smallint,
  p_starts_at time,
  p_ends_at time,
  p_valid_from date,
  p_valid_until date
)
RETURNS TABLE (kind text, specialist_id uuid, day date, starts_at time, ends_at time)
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT
    CASE WHEN rule.specialist_id = p_specialist_id THEN 'overlap' ELSE 'room_taken' END,
    rule.specialist_id,
    clash.day,
    rule.starts_at,
    rule.ends_at
  FROM public.specialist_availability_rules AS rule
  CROSS JOIN LATERAL (
    SELECT
      greatest(rule.valid_from, p_valid_from) AS first_day,
      least(
        coalesce(rule.valid_until, 'infinity'::date),
        coalesce(p_valid_until, 'infinity'::date),
        greatest(rule.valid_from, p_valid_from) + 1095
      ) AS last_day
  ) AS period
  CROSS JOIN LATERAL (
    SELECT candidate.day
    FROM generate_series(0, period.last_day - period.first_day) AS offset_days(n)
    CROSS JOIN LATERAL (SELECT period.first_day + offset_days.n AS day) AS candidate
    WHERE private.availability_pattern_on(
        rule.recurrence, rule.weekdays, rule.interval_weeks,
        rule.valid_from, rule.valid_until, candidate.day
      )
      AND private.availability_pattern_on(
        p_recurrence, p_weekdays, p_interval, p_valid_from, p_valid_until, candidate.day
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.specialist_availability_exceptions AS exception
        WHERE exception.date = candidate.day
          AND exception.rule_id IN (rule.id, p_ignore_id)
      )
    ORDER BY candidate.day
    LIMIT 1
  ) AS clash
  WHERE rule.id IS DISTINCT FROM p_ignore_id
    AND (
      rule.specialist_id = p_specialist_id
      OR (p_room_id IS NOT NULL AND rule.room_id = p_room_id)
    )
    AND rule.weekdays && p_weekdays
    AND rule.starts_at < p_ends_at
    AND p_starts_at < rule.ends_at
    AND period.first_day <= period.last_day
  ORDER BY (rule.specialist_id = p_specialist_id) DESC, clash.day
  LIMIT 1;
$$;

-- Unchanged behaviour, now on top of availability_clash.
CREATE OR REPLACE FUNCTION private.availability_conflict(
  p_ignore_id uuid,
  p_specialist_id uuid,
  p_room_id uuid,
  p_recurrence public.availability_recurrence,
  p_weekdays smallint[],
  p_interval smallint,
  p_starts_at time,
  p_ends_at time,
  p_valid_from date,
  p_valid_until date
)
RETURNS text
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT clash.kind
  FROM private.availability_clash(
    p_ignore_id, p_specialist_id, p_room_id, p_recurrence, p_weekdays,
    p_interval, p_starts_at, p_ends_at, p_valid_from, p_valid_until
  ) AS clash;
$$;

-- A taken room now says who has it and when (DETAIL, as JSON).
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

-- Who has which active room when, between two dates (at most 62 days), for
-- specialists and admins. Only times and names: no notes, no other data.
CREATE OR REPLACE FUNCTION public.list_room_occupancy(p_from date, p_to date)
RETURNS TABLE (
  room_id uuid,
  day date,
  starts_at time,
  ends_at time,
  specialist_id uuid,
  specialist_name text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NOT (
    public.has_role('specialist'::public.app_role)
    OR public.has_role('admin'::public.app_role)
  ) THEN
    RAISE EXCEPTION 'Not allowed' USING ERRCODE = '42501';
  END IF;
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 62 THEN
    RAISE EXCEPTION 'Invalid date range' USING ERRCODE = '22023';
  END IF;

  RETURN QUERY
  SELECT
    rule.room_id,
    candidate.day,
    rule.starts_at,
    rule.ends_at,
    rule.specialist_id,
    private.specialist_display_name(rule.specialist_id)
  FROM public.specialist_availability_rules AS rule
  JOIN public.rooms AS room ON room.id = rule.room_id AND room.active
  CROSS JOIN LATERAL (
    SELECT generated::date AS day
    FROM generate_series(
      greatest(p_from, rule.valid_from),
      least(p_to, coalesce(rule.valid_until, p_to)),
      interval '1 day'
    ) AS generated
  ) AS candidate
  WHERE rule.room_id IS NOT NULL
    AND rule.valid_from <= p_to
    AND (rule.valid_until IS NULL OR rule.valid_until >= p_from)
    AND private.availability_rule_on(rule.id, candidate.day)
  ORDER BY candidate.day, rule.starts_at;
END;
$$;

REVOKE ALL ON FUNCTION private.specialist_display_name(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.availability_clash(
  uuid, uuid, uuid, public.availability_recurrence, smallint[], smallint, time, time, date, date
) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.list_room_occupancy(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_room_occupancy(date, date) TO authenticated;
