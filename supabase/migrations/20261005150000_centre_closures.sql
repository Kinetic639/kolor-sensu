-- Ustawienia → Dni zamknięcia: days the whole centre is closed (public
-- holidays, the team's leave). No time is offered on them, and no visit
-- can be booked or moved onto them, by a client or by the centre; visits
-- already booked there stay (the admin sees how many, and moves them).

CREATE TABLE public.centre_closures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  starts_on date NOT NULL,
  ends_on date NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT centre_closures_days CHECK (ends_on >= starts_on),
  CONSTRAINT centre_closures_reason_length
    CHECK (char_length(reason) BETWEEN 1 AND 120)
);

CREATE INDEX centre_closures_days_idx
  ON public.centre_closures (starts_on, ends_on);

ALTER TABLE public.centre_closures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.centre_closures FORCE ROW LEVEL SECURITY;

REVOKE ALL ON public.centre_closures FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.centre_closures TO authenticated;
GRANT ALL ON public.centre_closures TO service_role;

CREATE POLICY "Admins manage centre closures"
ON public.centre_closures
FOR ALL
TO authenticated
USING (public.has_role('admin'))
WITH CHECK (public.has_role('admin'));

-- Specialists see them (their schedule).
CREATE POLICY "Specialists read centre closures"
ON public.centre_closures
FOR SELECT
TO authenticated
USING (public.has_role('specialist'));

-- Is the centre closed that day?
CREATE FUNCTION private.centre_closed_on(p_day date)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.centre_closures AS closure
    WHERE p_day BETWEEN closure.starts_on AND closure.ends_on
  );
$$;

REVOKE ALL ON FUNCTION private.centre_closed_on(date) FROM PUBLIC, anon, authenticated;

-- No visit onto a closed day: a new one, or one moved there.
CREATE FUNCTION private.refuse_closed_days()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  tz text := (SELECT timezone FROM public.center_settings WHERE id = 1);
BEGIN
  IF TG_OP = 'UPDATE' AND NEW.during IS NOT DISTINCT FROM OLD.during THEN
    RETURN NEW;
  END IF;
  IF NOT private.appointment_is_live(NEW.status, NEW.hold_expires_at, NEW.payment_due_at) THEN
    RETURN NEW;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.centre_closures AS closure
    WHERE (lower(NEW.during) AT TIME ZONE tz)::date <= closure.ends_on
      AND ((upper(NEW.during) - interval '1 microsecond') AT TIME ZONE tz)::date
        >= closure.starts_on
  ) THEN
    RAISE EXCEPTION 'The centre is closed that day.'
      USING ERRCODE = 'P0001', HINT = 'centre_closed';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION private.refuse_closed_days() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER appointments_refuse_closed_days
-- (Not on a change of state: a payment confirms what was already held.)
BEFORE INSERT OR UPDATE OF during ON public.appointments
FOR EACH ROW
EXECUTE FUNCTION private.refuse_closed_days();

-- How many live visits fall on those days (the admin's warning).
CREATE FUNCTION public.visits_on_days(p_from date, p_to date)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT CASE WHEN public.has_role('admin') THEN (
    SELECT count(*)::integer
    FROM public.appointments AS visit
    CROSS JOIN public.center_settings AS settings
    WHERE settings.id = 1
      AND private.appointment_is_live(visit.status, visit.hold_expires_at, visit.payment_due_at)
      AND (lower(visit.during) AT TIME ZONE settings.timezone)::date
        BETWEEN p_from AND p_to
  ) END;
$$;

REVOKE ALL ON FUNCTION public.visits_on_days(date, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.visits_on_days(date, date) TO authenticated;

-- The free times: none on a closed day.
CREATE OR REPLACE FUNCTION private.free_slots(p_offer_id uuid, p_mode visit_mode, p_from date, p_to date, p_location_id uuid DEFAULT NULL::uuid, p_ignore_appointment uuid DEFAULT NULL::uuid)
 RETURNS TABLE(starts_at timestamp with time zone, ends_at timestamp with time zone, rule_id uuid, room_id uuid)
 LANGUAGE sql
 STABLE
 SET search_path TO ''
AS $function$
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
$function$;
