-- Moving a visit as the centre (R12) must change something: the same time,
-- form and room is refused (nothing_changed), so the portal never reports a
-- move that did not happen.

CREATE OR REPLACE FUNCTION public.centre_reschedule_visit(
  p_appointment_id uuid,
  p_starts_at timestamptz,
  p_mode public.visit_mode,
  p_room_id uuid,
  p_reason text DEFAULT NULL
)
RETURNS TABLE(reference text, starts_at timestamptz, ends_at timestamptz, sequence integer, payment_due_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
$function$;
REVOKE ALL ON FUNCTION public.centre_reschedule_visit(uuid, timestamptz, public.visit_mode, uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.centre_reschedule_visit(uuid, timestamptz, public.visit_mode, uuid, text) TO authenticated, service_role;
