-- Specialist availability (docs/product/booking-plan.md, RD1).
--
-- A window is a weekday and a local time span (centre time zone), online or
-- in a specific room ("hybrid": in the room, online clients too). It repeats
-- weekly, fortnightly (from the week of valid_from) or happens once (a
-- single-day validity). Time off is a span of instants and wins over
-- windows. Free slots are computed from these later (RD2); visitors never
-- read these tables.
--
-- Writes go only through the functions below, which check who may manage
-- whose schedule, that a specialist's windows do not overlap and that a
-- room is not given to two specialists at once. The room check cannot be a
-- single EXCLUDE constraint (recurring rules), so the functions serialise
-- per specialist and per room with advisory locks.

CREATE TYPE public.availability_mode AS ENUM ('in_person', 'online', 'hybrid');
CREATE TYPE public.availability_recurrence AS ENUM ('weekly', 'biweekly', 'once');

CREATE TABLE public.specialist_availability_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE RESTRICT,
  recurrence public.availability_recurrence NOT NULL DEFAULT 'weekly',
  weekday smallint NOT NULL,
  starts_at time NOT NULL,
  ends_at time NOT NULL,
  valid_from date NOT NULL,
  valid_until date,
  mode public.availability_mode NOT NULL,
  room_id uuid REFERENCES public.rooms (id) ON DELETE RESTRICT,
  note text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_availability_rules_weekday_range CHECK (weekday BETWEEN 1 AND 7),
  CONSTRAINT specialist_availability_rules_time_order CHECK (starts_at < ends_at),
  CONSTRAINT specialist_availability_rules_quarter_hours CHECK (
    extract(second FROM starts_at) = 0
    AND extract(second FROM ends_at) = 0
    AND extract(minute FROM starts_at)::integer % 15 = 0
    AND extract(minute FROM ends_at)::integer % 15 = 0
  ),
  CONSTRAINT specialist_availability_rules_room_matches_mode CHECK (
    (mode = 'online') = (room_id IS NULL)
  ),
  CONSTRAINT specialist_availability_rules_validity_order CHECK (
    valid_until IS NULL OR valid_until >= valid_from
  ),
  CONSTRAINT specialist_availability_rules_once_is_one_day CHECK (
    recurrence <> 'once'
    OR (valid_until = valid_from AND weekday = extract(isodow FROM valid_from))
  ),
  CONSTRAINT specialist_availability_rules_note_length CHECK (
    note IS NULL OR char_length(note) <= 500
  )
);

CREATE INDEX specialist_availability_rules_specialist_weekday_idx
ON public.specialist_availability_rules (specialist_id, weekday, starts_at);

CREATE INDEX specialist_availability_rules_room_weekday_idx
ON public.specialist_availability_rules (room_id, weekday)
WHERE room_id IS NOT NULL;

CREATE TRIGGER set_specialist_availability_rules_updated_at
BEFORE UPDATE ON public.specialist_availability_rules
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

CREATE TABLE public.specialist_time_off (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialist_id uuid NOT NULL REFERENCES public.specialists (id) ON DELETE RESTRICT,
  during tstzrange NOT NULL,
  reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT specialist_time_off_bounded CHECK (
    NOT isempty(during) AND NOT lower_inf(during) AND NOT upper_inf(during)
  ),
  CONSTRAINT specialist_time_off_reason_length CHECK (
    reason IS NULL OR char_length(reason) <= 500
  ),
  CONSTRAINT specialist_time_off_no_overlap EXCLUDE USING gist (
    specialist_id WITH =,
    during WITH &&
  )
);

CREATE TRIGGER set_specialist_time_off_updated_at
BEFORE UPDATE ON public.specialist_time_off
FOR EACH ROW
EXECUTE FUNCTION private.set_updated_at();

ALTER TABLE public.specialist_availability_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_availability_rules FORCE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_time_off ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_time_off FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.specialist_availability_rules FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.specialist_time_off FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.specialist_availability_rules TO authenticated;
GRANT SELECT ON public.specialist_time_off TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialist_availability_rules TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialist_time_off TO service_role;

CREATE POLICY "Specialists and admins can read availability"
ON public.specialist_availability_rules
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.specialists
    WHERE specialists.id = specialist_availability_rules.specialist_id
      AND specialists.user_id = (SELECT auth.uid())
  )
);

CREATE POLICY "Specialists and admins can read time off"
ON public.specialist_time_off
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.specialists
    WHERE specialists.id = specialist_time_off.specialist_id
      AND specialists.user_id = (SELECT auth.uid())
  )
);

-- Whether a window repeating by these rules happens on a date. Pure
-- arithmetic on dates (no time zone), so it is IMMUTABLE and reusable when
-- expanding windows into slots.
CREATE FUNCTION private.availability_occurs_on(
  p_recurrence public.availability_recurrence,
  p_weekday smallint,
  p_valid_from date,
  p_valid_until date,
  p_date date
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT extract(isodow FROM p_date) = p_weekday
    AND p_date >= p_valid_from
    AND (p_valid_until IS NULL OR p_date <= p_valid_until)
    AND (
      p_recurrence <> 'biweekly'
      OR (
        (
          (p_date - (extract(isodow FROM p_date)::integer - 1))
          - (p_valid_from - (extract(isodow FROM p_valid_from)::integer - 1))
        ) / 7
      ) % 2 = 0
    );
$$;

REVOKE ALL ON FUNCTION private.availability_occurs_on(
  public.availability_recurrence, smallint, date, date, date
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.availability_occurs_on(
  public.availability_recurrence, smallint, date, date, date
) TO authenticated, service_role;

-- The specialist the caller may manage: their own, or anyone's for an admin.
CREATE FUNCTION private.managed_specialist_id(p_specialist_id uuid)
RETURNS uuid
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  own_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '42501';
  END IF;

  SELECT specialists.id INTO own_id
  FROM public.specialists
  JOIN public.user_roles
    ON user_roles.user_id = specialists.user_id AND user_roles.role = 'specialist'
  WHERE specialists.user_id = auth.uid();

  IF p_specialist_id IS NULL OR p_specialist_id = own_id THEN
    IF own_id IS NULL THEN
      RAISE EXCEPTION 'Specialist role required' USING ERRCODE = '42501';
    END IF;
    RETURN own_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Not allowed to manage this specialist' USING ERRCODE = '42501';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM public.specialists WHERE id = p_specialist_id) THEN
    RAISE EXCEPTION 'Specialist not found' USING ERRCODE = 'P0002';
  END IF;

  RETURN p_specialist_id;
END;
$$;

REVOKE ALL ON FUNCTION private.managed_specialist_id(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.managed_specialist_id(uuid) TO authenticated;

-- The first window the candidate would clash with: the same specialist
-- ('overlap') or the same room ('room_taken'), or NULL. Two repeating
-- windows on the same weekday clash if they share a date: the pattern
-- repeats every two weeks, so checking the first 14 days of the period
-- they are both valid in is enough.
CREATE FUNCTION private.availability_conflict(
  p_ignore_id uuid,
  p_specialist_id uuid,
  p_room_id uuid,
  p_recurrence public.availability_recurrence,
  p_weekday smallint,
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
  SELECT CASE WHEN rule.specialist_id = p_specialist_id THEN 'overlap' ELSE 'room_taken' END
  FROM public.specialist_availability_rules AS rule
  WHERE rule.id IS DISTINCT FROM p_ignore_id
    AND (
      rule.specialist_id = p_specialist_id
      OR (p_room_id IS NOT NULL AND rule.room_id = p_room_id)
    )
    AND rule.weekday = p_weekday
    AND rule.starts_at < p_ends_at
    AND p_starts_at < rule.ends_at
    AND EXISTS (
      SELECT 1
      FROM generate_series(0, 13) AS offset_days(n)
      CROSS JOIN LATERAL (
        SELECT greatest(rule.valid_from, p_valid_from) + offset_days.n AS day
      ) AS candidate
      WHERE private.availability_occurs_on(
          rule.recurrence, rule.weekday, rule.valid_from, rule.valid_until, candidate.day
        )
        AND private.availability_occurs_on(
          p_recurrence, p_weekday, p_valid_from, p_valid_until, candidate.day
        )
    )
  ORDER BY (rule.specialist_id = p_specialist_id) DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.availability_conflict(
  uuid, uuid, uuid, public.availability_recurrence, smallint, time, time, date, date
) FROM PUBLIC, anon, authenticated;

CREATE FUNCTION public.save_availability_rule(
  p_recurrence public.availability_recurrence,
  p_weekday smallint,
  p_starts_at time,
  p_ends_at time,
  p_valid_from date,
  p_mode public.availability_mode,
  p_room_id uuid DEFAULT NULL,
  p_valid_until date DEFAULT NULL,
  p_note text DEFAULT NULL,
  p_id uuid DEFAULT NULL,
  p_specialist_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_specialist_id uuid;
  v_weekday smallint := p_weekday;
  v_valid_until date := p_valid_until;
  v_room_id uuid := CASE WHEN p_mode = 'online' THEN NULL ELSE p_room_id END;
  conflict text;
  saved_id uuid;
BEGIN
  IF p_id IS NOT NULL THEN
    SELECT rule.specialist_id INTO target_specialist_id
    FROM public.specialist_availability_rules AS rule
    WHERE rule.id = p_id
    FOR UPDATE;
    -- Someone else's window looks the same as a missing one.
    IF NOT FOUND
      OR (p_specialist_id IS NOT NULL AND p_specialist_id <> target_specialist_id)
    THEN
      RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
    END IF;
    BEGIN
      PERFORM private.managed_specialist_id(target_specialist_id);
    EXCEPTION WHEN insufficient_privilege THEN
      RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
    END;
  ELSE
    target_specialist_id := private.managed_specialist_id(p_specialist_id);
  END IF;

  IF p_recurrence = 'once' THEN
    v_weekday := extract(isodow FROM p_valid_from)::smallint;
    v_valid_until := p_valid_from;
  END IF;

  IF v_room_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM public.rooms WHERE rooms.id = v_room_id AND rooms.active
  ) THEN
    RAISE EXCEPTION 'Room is not available' USING ERRCODE = '22023';
  END IF;

  -- One writer per specialist and per room at a time (fixed order).
  PERFORM pg_advisory_xact_lock(hashtextextended('availability:specialist:' || target_specialist_id, 0));
  IF v_room_id IS NOT NULL THEN
    PERFORM pg_advisory_xact_lock(hashtextextended('availability:room:' || v_room_id, 0));
  END IF;

  conflict := private.availability_conflict(
    p_id, target_specialist_id, v_room_id, p_recurrence, v_weekday,
    p_starts_at, p_ends_at, p_valid_from, v_valid_until
  );
  IF conflict IS NOT NULL THEN
    RAISE EXCEPTION 'Availability window clashes with another one'
      USING ERRCODE = '23P01', HINT = conflict;
  END IF;

  IF p_id IS NULL THEN
    INSERT INTO public.specialist_availability_rules (
      specialist_id, recurrence, weekday, starts_at, ends_at,
      valid_from, valid_until, mode, room_id, note
    ) VALUES (
      target_specialist_id, p_recurrence, v_weekday, p_starts_at, p_ends_at,
      p_valid_from, v_valid_until, p_mode, v_room_id, nullif(trim(p_note), '')
    )
    RETURNING id INTO saved_id;
  ELSE
    UPDATE public.specialist_availability_rules
    SET recurrence = p_recurrence,
        weekday = v_weekday,
        starts_at = p_starts_at,
        ends_at = p_ends_at,
        valid_from = p_valid_from,
        valid_until = v_valid_until,
        mode = p_mode,
        room_id = v_room_id,
        note = nullif(trim(p_note), '')
    WHERE id = p_id
    RETURNING id INTO saved_id;
  END IF;

  RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.save_availability_rule(
  public.availability_recurrence, smallint, time, time, date,
  public.availability_mode, uuid, date, text, uuid, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_availability_rule(
  public.availability_recurrence, smallint, time, time, date,
  public.availability_mode, uuid, date, text, uuid, uuid
) TO authenticated;

CREATE FUNCTION public.delete_availability_rule(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT specialist_id INTO owner_id
  FROM public.specialist_availability_rules
  WHERE id = p_id
  FOR UPDATE;

  -- Someone else's window looks the same as a missing one.
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
  END IF;
  BEGIN
    PERFORM private.managed_specialist_id(owner_id);
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
  END;

  DELETE FROM public.specialist_availability_rules WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_availability_rule(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_availability_rule(uuid) TO authenticated;

CREATE FUNCTION public.add_time_off(
  p_starts_at timestamptz,
  p_ends_at timestamptz,
  p_reason text DEFAULT NULL,
  p_specialist_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  saved_id uuid;
BEGIN
  IF p_starts_at >= p_ends_at THEN
    RAISE EXCEPTION 'Time off must end after it starts' USING ERRCODE = '23514';
  END IF;

  INSERT INTO public.specialist_time_off (specialist_id, during, reason)
  VALUES (
    private.managed_specialist_id(p_specialist_id),
    tstzrange(p_starts_at, p_ends_at, '[)'),
    nullif(trim(p_reason), '')
  )
  RETURNING id INTO saved_id;

  RETURN saved_id;
END;
$$;

REVOKE ALL ON FUNCTION public.add_time_off(timestamptz, timestamptz, text, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.add_time_off(timestamptz, timestamptz, text, uuid) TO authenticated;

CREATE FUNCTION public.delete_time_off(p_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT specialist_id INTO owner_id
  FROM public.specialist_time_off
  WHERE id = p_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Time off not found' USING ERRCODE = 'P0002';
  END IF;
  BEGIN
    PERFORM private.managed_specialist_id(owner_id);
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'Time off not found' USING ERRCODE = 'P0002';
  END;

  DELETE FROM public.specialist_time_off WHERE id = p_id;
END;
$$;

REVOKE ALL ON FUNCTION public.delete_time_off(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_time_off(uuid) TO authenticated;
