-- Recurring availability like calendar apps (docs/product/booking-plan.md,
-- "Reguły powtarzania"; RFC 5545 RRULE / EXDATE): a rule repeats on
-- several weekdays every N weeks and ends never, on a date, or after N
-- occurrences (stored as that date, plus the count for display). Single
-- occurrences are skipped through exceptions; "this and following" ends a
-- series the day before and starts a new one.

-- The functions below are replaced; drop the old ones first.
DROP FUNCTION public.save_availability_rule(
  public.availability_recurrence, smallint, time, time, date,
  public.availability_mode, uuid, date, text, uuid, uuid
);
DROP FUNCTION private.availability_conflict(
  uuid, uuid, uuid, public.availability_recurrence, smallint, time, time, date, date
);
DROP FUNCTION private.availability_occurs_on(
  public.availability_recurrence, smallint, date, date, date
);

ALTER TABLE public.specialist_availability_rules
  ADD COLUMN weekdays smallint[],
  ADD COLUMN interval_weeks smallint NOT NULL DEFAULT 1,
  ADD COLUMN occurrence_count smallint;

UPDATE public.specialist_availability_rules
SET weekdays = ARRAY[weekday],
    interval_weeks = CASE WHEN recurrence = 'biweekly' THEN 2 ELSE 1 END;

ALTER TABLE public.specialist_availability_rules
  DROP CONSTRAINT specialist_availability_rules_weekday_range,
  DROP CONSTRAINT specialist_availability_rules_once_is_one_day;
DROP INDEX public.specialist_availability_rules_specialist_weekday_idx;
DROP INDEX public.specialist_availability_rules_room_weekday_idx;
ALTER TABLE public.specialist_availability_rules DROP COLUMN weekday;

-- "biweekly" becomes weekly every 2 weeks.
ALTER TABLE public.specialist_availability_rules
  ALTER COLUMN recurrence DROP DEFAULT,
  ALTER COLUMN recurrence TYPE text;
UPDATE public.specialist_availability_rules
SET recurrence = 'weekly' WHERE recurrence = 'biweekly';
DROP TYPE public.availability_recurrence;
CREATE TYPE public.availability_recurrence AS ENUM ('once', 'weekly');
ALTER TABLE public.specialist_availability_rules
  ALTER COLUMN recurrence TYPE public.availability_recurrence
    USING recurrence::public.availability_recurrence,
  ALTER COLUMN recurrence SET DEFAULT 'once',
  ALTER COLUMN weekdays SET NOT NULL;

-- A weekday set: 1–7, at least one, sorted, no repeats.
CREATE FUNCTION private.is_weekday_set(p_days smallint[])
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT cardinality(p_days) BETWEEN 1 AND 7
    AND p_days <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::smallint[]
    AND p_days = ARRAY(SELECT DISTINCT day FROM unnest(p_days) AS day ORDER BY day);
$$;

ALTER TABLE public.specialist_availability_rules
  ADD CONSTRAINT specialist_availability_rules_weekdays_valid CHECK (
    private.is_weekday_set(weekdays)
  ),
  ADD CONSTRAINT specialist_availability_rules_interval_range CHECK (
    interval_weeks BETWEEN 1 AND 4
  ),
  ADD CONSTRAINT specialist_availability_rules_once_is_one_day CHECK (
    recurrence <> 'once'
    OR (
      valid_until = valid_from
      AND weekdays = ARRAY[extract(isodow FROM valid_from)::smallint]
      AND interval_weeks = 1
      AND occurrence_count IS NULL
    )
  ),
  ADD CONSTRAINT specialist_availability_rules_count_range CHECK (
    occurrence_count IS NULL
    OR (occurrence_count BETWEEN 1 AND 200 AND valid_until IS NOT NULL)
  );

CREATE INDEX specialist_availability_rules_specialist_idx
ON public.specialist_availability_rules (specialist_id, valid_from);
CREATE INDEX specialist_availability_rules_room_idx
ON public.specialist_availability_rules (room_id)
WHERE room_id IS NOT NULL;

-- Occurrences removed from a series (EXDATE).
CREATE TABLE public.specialist_availability_exceptions (
  rule_id uuid NOT NULL REFERENCES public.specialist_availability_rules (id) ON DELETE CASCADE,
  date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (rule_id, date)
);

ALTER TABLE public.specialist_availability_exceptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.specialist_availability_exceptions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.specialist_availability_exceptions FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.specialist_availability_exceptions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.specialist_availability_exceptions TO service_role;

CREATE POLICY "Specialists and admins can read availability exceptions"
ON public.specialist_availability_exceptions
FOR SELECT
TO authenticated
USING (
  public.has_role('admin'::public.app_role)
  OR EXISTS (
    SELECT 1
    FROM public.specialist_availability_rules AS rule
    JOIN public.specialists ON specialists.id = rule.specialist_id
    WHERE rule.id = specialist_availability_exceptions.rule_id
      AND specialists.user_id = (SELECT auth.uid())
  )
);

-- Whether the pattern (not its exceptions) has an occurrence on a date.
-- Pure date arithmetic, mirrored by @repo/scheduling's occursOn.
CREATE FUNCTION private.availability_pattern_on(
  p_recurrence public.availability_recurrence,
  p_weekdays smallint[],
  p_interval smallint,
  p_valid_from date,
  p_valid_until date,
  p_date date
)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path = ''
AS $$
  SELECT extract(isodow FROM p_date)::smallint = ANY (p_weekdays)
    AND p_date >= p_valid_from
    AND (p_valid_until IS NULL OR p_date <= p_valid_until)
    AND (
      p_recurrence = 'once'
      OR (
        (
          (p_date - (extract(isodow FROM p_date)::integer - 1))
          - (p_valid_from - (extract(isodow FROM p_valid_from)::integer - 1))
        ) / 7
      ) % p_interval = 0
    );
$$;

-- Whether a stored rule has an occurrence on a date (pattern minus exceptions).
CREATE FUNCTION private.availability_rule_on(p_rule_id uuid, p_date date)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.specialist_availability_rules AS rule
    WHERE rule.id = p_rule_id
      AND private.availability_pattern_on(
        rule.recurrence, rule.weekdays, rule.interval_weeks,
        rule.valid_from, rule.valid_until, p_date
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.specialist_availability_exceptions AS exception
        WHERE exception.rule_id = rule.id AND exception.date = p_date
      )
  );
$$;

-- The date of the Nth occurrence of a weekly pattern from `p_valid_from`.
CREATE FUNCTION private.availability_nth_date(
  p_weekdays smallint[],
  p_interval smallint,
  p_valid_from date,
  p_count integer
)
RETURNS date
LANGUAGE plpgsql
IMMUTABLE
SET search_path = ''
AS $$
DECLARE
  day date := p_valid_from;
  found integer := 0;
BEGIN
  -- At most 200 occurrences, one a month in the sparsest pattern.
  FOR i IN 0..(200 * 28) LOOP
    IF private.availability_pattern_on('weekly', p_weekdays, p_interval, p_valid_from, NULL, day) THEN
      found := found + 1;
      IF found = p_count THEN
        RETURN day;
      END IF;
    END IF;
    day := day + 1;
  END LOOP;
  RETURN NULL;
END;
$$;

-- The first window the candidate would clash with: the same specialist
-- ('overlap') or the same room ('room_taken'), or NULL. Candidate
-- occurrences are compared date by date over the period both are valid in
-- (up to three years ahead), leaving out skipped occurrences.
CREATE FUNCTION private.availability_conflict(
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
  SELECT CASE WHEN rule.specialist_id = p_specialist_id THEN 'overlap' ELSE 'room_taken' END
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
  WHERE rule.id IS DISTINCT FROM p_ignore_id
    AND (
      rule.specialist_id = p_specialist_id
      OR (p_room_id IS NOT NULL AND rule.room_id = p_room_id)
    )
    AND rule.weekdays && p_weekdays
    AND rule.starts_at < p_ends_at
    AND p_starts_at < rule.ends_at
    AND period.first_day <= period.last_day
    AND EXISTS (
      SELECT 1
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
    )
  ORDER BY (rule.specialist_id = p_specialist_id) DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION private.is_weekday_set(smallint[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.is_weekday_set(smallint[]) TO authenticated, service_role;
REVOKE ALL ON FUNCTION private.availability_pattern_on(
  public.availability_recurrence, smallint[], smallint, date, date, date
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.availability_pattern_on(
  public.availability_recurrence, smallint[], smallint, date, date, date
) TO authenticated, service_role;
REVOKE ALL ON FUNCTION private.availability_rule_on(uuid, date) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.availability_nth_date(smallint[], smallint, date, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.availability_conflict(
  uuid, uuid, uuid, public.availability_recurrence, smallint[], smallint, time, time, date, date
) FROM PUBLIC, anon, authenticated;

-- Normalises, checks and writes one rule for `p_specialist_id` (already
-- authorised by the caller): a one-off takes its weekday from the date; a
-- count becomes the end date; clashes are refused with a hint.
CREATE FUNCTION private.write_availability_rule(
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

REVOKE ALL ON FUNCTION private.write_availability_rule(
  uuid, uuid, public.availability_recurrence, smallint[], smallint, time, time,
  date, date, smallint, public.availability_mode, uuid, text
) FROM PUBLIC, anon, authenticated;

-- The owner of a rule the caller may manage; someone else's rule looks the
-- same as a missing one.
CREATE FUNCTION private.managed_rule_owner(p_rule_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_id uuid;
BEGIN
  SELECT specialist_id INTO owner_id
  FROM public.specialist_availability_rules
  WHERE id = p_rule_id
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
  END IF;
  BEGIN
    PERFORM private.managed_specialist_id(owner_id);
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
  END;
  RETURN owner_id;
END;
$$;

REVOKE ALL ON FUNCTION private.managed_rule_owner(uuid) FROM PUBLIC, anon, authenticated;

-- Adds a rule, or (with `p_id`) changes the whole rule.
CREATE FUNCTION public.save_availability_rule(
  p_recurrence public.availability_recurrence,
  p_weekdays smallint[],
  p_starts_at time,
  p_ends_at time,
  p_valid_from date,
  p_mode public.availability_mode,
  p_room_id uuid DEFAULT NULL,
  p_interval_weeks smallint DEFAULT 1,
  p_valid_until date DEFAULT NULL,
  p_occurrence_count smallint DEFAULT NULL,
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
BEGIN
  IF p_id IS NOT NULL THEN
    target_specialist_id := private.managed_rule_owner(p_id);
    IF p_specialist_id IS NOT NULL AND p_specialist_id <> target_specialist_id THEN
      RAISE EXCEPTION 'Availability window not found' USING ERRCODE = 'P0002';
    END IF;
  ELSE
    target_specialist_id := private.managed_specialist_id(p_specialist_id);
  END IF;

  RETURN private.write_availability_rule(
    target_specialist_id, p_id, p_recurrence, p_weekdays, p_interval_weeks,
    p_starts_at, p_ends_at, p_valid_from, p_valid_until, p_occurrence_count,
    p_mode, p_room_id, p_note
  );
END;
$$;

-- Removes one occurrence ('this'), the occurrences from a date on
-- ('following') or the whole rule ('all').
CREATE FUNCTION public.delete_availability_occurrence(
  p_rule_id uuid,
  p_date date,
  p_scope text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  rule public.specialist_availability_rules%ROWTYPE;
BEGIN
  PERFORM private.managed_rule_owner(p_rule_id);
  SELECT * INTO rule FROM public.specialist_availability_rules WHERE id = p_rule_id;

  IF p_scope NOT IN ('this', 'following', 'all') THEN
    RAISE EXCEPTION 'Unknown scope' USING ERRCODE = '22023';
  END IF;

  IF p_scope = 'all' OR rule.recurrence = 'once' THEN
    DELETE FROM public.specialist_availability_rules WHERE id = p_rule_id;
    RETURN;
  END IF;

  IF NOT private.availability_rule_on(p_rule_id, p_date) THEN
    RAISE EXCEPTION 'Occurrence not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_scope = 'this' THEN
    INSERT INTO public.specialist_availability_exceptions (rule_id, date)
    VALUES (p_rule_id, p_date);
    RETURN;
  END IF;

  -- 'following': nothing left before the date means the whole series goes.
  IF NOT EXISTS (
    SELECT 1
    FROM generate_series(0, p_date - rule.valid_from - 1) AS offset_days(n)
    WHERE private.availability_rule_on(p_rule_id, rule.valid_from + offset_days.n)
  ) THEN
    DELETE FROM public.specialist_availability_rules WHERE id = p_rule_id;
    RETURN;
  END IF;

  UPDATE public.specialist_availability_rules
  SET valid_until = p_date - 1, occurrence_count = NULL
  WHERE id = p_rule_id;
  DELETE FROM public.specialist_availability_exceptions
  WHERE rule_id = p_rule_id AND date >= p_date;
END;
$$;

-- Changes one occurrence ('this': it is skipped and a one-off window takes
-- its place) or the series from a date ('following': the rule ends the day
-- before and a new rule starts), with the given values. 'all' changes the
-- rule itself.
CREATE FUNCTION public.edit_availability_occurrence(
  p_rule_id uuid,
  p_date date,
  p_scope text,
  p_recurrence public.availability_recurrence,
  p_weekdays smallint[],
  p_starts_at time,
  p_ends_at time,
  p_valid_from date,
  p_mode public.availability_mode,
  p_room_id uuid DEFAULT NULL,
  p_interval_weeks smallint DEFAULT 1,
  p_valid_until date DEFAULT NULL,
  p_occurrence_count smallint DEFAULT NULL,
  p_note text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  owner_id uuid;
  rule public.specialist_availability_rules%ROWTYPE;
BEGIN
  owner_id := private.managed_rule_owner(p_rule_id);
  SELECT * INTO rule FROM public.specialist_availability_rules WHERE id = p_rule_id;

  IF p_scope NOT IN ('this', 'following', 'all') THEN
    RAISE EXCEPTION 'Unknown scope' USING ERRCODE = '22023';
  END IF;

  IF p_scope = 'all' OR rule.recurrence = 'once' THEN
    RETURN private.write_availability_rule(
      owner_id, p_rule_id, p_recurrence, p_weekdays, p_interval_weeks,
      p_starts_at, p_ends_at, p_valid_from, p_valid_until, p_occurrence_count,
      p_mode, p_room_id, p_note
    );
  END IF;

  IF NOT private.availability_rule_on(p_rule_id, p_date) THEN
    RAISE EXCEPTION 'Occurrence not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_scope = 'this' THEN
    INSERT INTO public.specialist_availability_exceptions (rule_id, date)
    VALUES (p_rule_id, p_date);
  ELSE
    IF NOT EXISTS (
      SELECT 1
      FROM generate_series(0, p_date - rule.valid_from - 1) AS offset_days(n)
      WHERE private.availability_rule_on(p_rule_id, rule.valid_from + offset_days.n)
    ) THEN
      -- From the first occurrence: the rule itself changes.
      RETURN private.write_availability_rule(
        owner_id, p_rule_id, p_recurrence, p_weekdays, p_interval_weeks,
        p_starts_at, p_ends_at, p_valid_from, p_valid_until, p_occurrence_count,
        p_mode, p_room_id, p_note
      );
    END IF;
    UPDATE public.specialist_availability_rules
    SET valid_until = p_date - 1, occurrence_count = NULL
    WHERE id = p_rule_id;
    DELETE FROM public.specialist_availability_exceptions
    WHERE rule_id = p_rule_id AND date >= p_date;
  END IF;

  RETURN private.write_availability_rule(
    owner_id, NULL,
    CASE WHEN p_scope = 'this' THEN 'once'::public.availability_recurrence ELSE p_recurrence END,
    p_weekdays, p_interval_weeks, p_starts_at, p_ends_at,
    p_valid_from, p_valid_until, p_occurrence_count, p_mode, p_room_id, p_note
  );
END;
$$;

-- The old whole-rule delete stays for one-offs and the rules list.
REVOKE ALL ON FUNCTION public.save_availability_rule(
  public.availability_recurrence, smallint[], time, time, date,
  public.availability_mode, uuid, smallint, date, smallint, text, uuid, uuid
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_availability_rule(
  public.availability_recurrence, smallint[], time, time, date,
  public.availability_mode, uuid, smallint, date, smallint, text, uuid, uuid
) TO authenticated;

REVOKE ALL ON FUNCTION public.delete_availability_occurrence(uuid, date, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.delete_availability_occurrence(uuid, date, text) TO authenticated;

REVOKE ALL ON FUNCTION public.edit_availability_occurrence(
  uuid, date, text, public.availability_recurrence, smallint[], time, time, date,
  public.availability_mode, uuid, smallint, date, smallint, text
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.edit_availability_occurrence(
  uuid, date, text, public.availability_recurrence, smallint[], time, time, date,
  public.availability_mode, uuid, smallint, date, smallint, text
) TO authenticated;
