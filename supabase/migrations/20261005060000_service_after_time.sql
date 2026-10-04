-- A service's time is the centre's, in two parts (R2): the visit the client
-- books and sees (`default_duration_minutes`, e.g. 50) and the time after it
-- for notes and getting ready for the next one (`after_minutes`, e.g. 10).
-- Together they are the service's time in the schedule (60): a visit holds
-- its specialist and its room for all of it, and the portals draw all of
-- it. The time after was one for the whole centre
-- (center_settings.default_visit_buffer_minutes); it stays only as the
-- starting value of a new service.
--
-- A specialist no longer sets their own length of a service: their price
-- stays theirs, the time is the service's.

ALTER TABLE public.services
  ADD COLUMN after_minutes integer NOT NULL DEFAULT 10,
  ADD CONSTRAINT services_after_minutes_range CHECK (after_minutes BETWEEN 0 AND 120);

UPDATE public.services
SET after_minutes = (SELECT default_visit_buffer_minutes FROM public.center_settings WHERE id = 1);

UPDATE public.specialist_services SET duration_minutes = NULL WHERE duration_minutes IS NOT NULL;
ALTER TABLE public.specialist_services
  ADD CONSTRAINT specialist_services_duration_from_service CHECK (duration_minutes IS NULL);

-- A visit holds the time after it its service gives (set before its
-- blocked range is worked out: triggers run in name order).
CREATE FUNCTION private.set_appointment_after_time()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  NEW.buffer_minutes := coalesce(
    (SELECT service.after_minutes FROM public.services AS service
     WHERE service.id = NEW.service_id),
    NEW.buffer_minutes
  );
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.set_appointment_after_time() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER appointments_a_after_time
BEFORE INSERT OR UPDATE OF during, buffer_minutes, service_id ON public.appointments
FOR EACH ROW EXECUTE FUNCTION private.set_appointment_after_time();

-- Free times: the whole of the service's time (the visit and the time
-- after it) fits in the window, and clear of other visits' whole time.
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

-- The portals' visits carry the end of their whole time (the visit and the
-- time after it), to draw all of it.
DROP FUNCTION public.list_visits(date, date, uuid, boolean);
CREATE FUNCTION public.list_visits(p_from date, p_to date, p_specialist_id uuid DEFAULT NULL::uuid, p_own boolean DEFAULT false)
 RETURNS TABLE(id uuid, reference text, status appointment_status, mode visit_mode, starts_at timestamp with time zone, ends_at timestamp with time zone, service_name text, specialist_id uuid, specialist_name text, specialist_color text, room_id uuid, room_name text, room_color text, location_name text, client_name text, client_email text, client_phone text, client_notes text, price_minor integer, currency_code text, paid boolean, refund_due_minor integer, refunded_minor integer, cancelled_by text, cancelled_at timestamp with time zone, reschedule_count integer, payment_due_at timestamp with time zone, held_until timestamp with time zone)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
  v_tz text;
BEGIN
  IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 62 THEN
    RAISE EXCEPTION 'A range of one to 63 days is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  SELECT timezone INTO v_tz FROM public.center_settings WHERE center_settings.id = 1;

  RETURN QUERY
  SELECT v.id, v.reference, v.status, v.mode, v.starts_at, v.ends_at,
    v.service_name, v.specialist_id, v.specialist_name, v.specialist_color,
    v.room_id, v.room_name, v.room_color, v.location_name,
    v.client_name, v.client_email, v.client_phone, v.client_notes,
    v.price_minor, v.currency_code, v.paid, v.refund_due_minor, v.refunded_minor,
    v.cancelled_by, v.cancelled_at, v.reschedule_count, v.payment_due_at,
    (SELECT upper(visit.blocks) FROM public.appointments AS visit WHERE visit.id = v.id)
  FROM private.visible_visits(p_own) AS v
  WHERE (v.starts_at AT TIME ZONE v_tz)::date BETWEEN p_from AND p_to
    AND (p_specialist_id IS NULL OR v.specialist_id = p_specialist_id)
  ORDER BY v.starts_at, v.reference;
END;
$function$;
REVOKE ALL ON FUNCTION public.list_visits(date, date, uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.list_visits(date, date, uuid, boolean) TO authenticated, service_role;
