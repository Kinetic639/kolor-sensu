-- One grid for the whole schedule (R2): visits start only on the centre's
-- grid (`slot_step_minutes`, now every full hour), so the times specialists
-- are available, a room's opening hours and the times a room is blocked lie
-- on the same grid. A window from 8:15 to 14:15 gave visits only from 9:00
-- to 13:00 yet held the room from 8:15 to 14:15; on the grid it holds no
-- more than it gives. The database refuses a time off the grid (hint
-- `off_grid`), and the grid cannot change while something would be off it.
--
-- What there is already is put on the grid: a window narrowed to it (its
-- start up, its end down: no start time it gave is lost, the room is
-- freed), opening hours likewise, a room's blocked time widened to it (it
-- blocks at least what it did). One too short to have a full step in it is
-- left as it is, and said.

CREATE FUNCTION private.on_grid(p_time time, p_step integer)
RETURNS boolean
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $function$
  SELECT (extract(epoch FROM p_time) / 60)::integer % p_step = 0;
$function$;

CREATE FUNCTION private.grid_up(p_time time, p_step integer)
RETURNS time
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $function$
  SELECT time '00:00' + make_interval(
    mins => (ceil(extract(epoch FROM p_time) / 60 / p_step) * p_step)::integer
  );
$function$;

CREATE FUNCTION private.grid_down(p_time time, p_step integer)
RETURNS time
LANGUAGE sql
IMMUTABLE
SET search_path TO ''
AS $function$
  SELECT time '00:00' + make_interval(
    mins => (floor(extract(epoch FROM p_time) / 60 / p_step) * p_step)::integer
  );
$function$;

REVOKE ALL ON FUNCTION private.on_grid(time, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.grid_up(time, integer) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.grid_down(time, integer) FROM PUBLIC, anon, authenticated;

-- What there is, onto the grid.
DO $$
DECLARE
  v_step integer;
  r record;
BEGIN
  SELECT slot_step_minutes INTO v_step FROM public.center_settings WHERE id = 1;

  FOR r IN
    SELECT id, starts_at, ends_at FROM public.specialist_availability_rules
    WHERE NOT private.on_grid(starts_at, v_step) OR NOT private.on_grid(ends_at, v_step)
  LOOP
    IF private.grid_up(r.starts_at, v_step) < private.grid_down(r.ends_at, v_step) THEN
      UPDATE public.specialist_availability_rules
      SET starts_at = private.grid_up(r.starts_at, v_step),
          ends_at = private.grid_down(r.ends_at, v_step)
      WHERE id = r.id;
    ELSE
      RAISE NOTICE 'Availability % (% to %) has no full step: left as it is',
        r.id, r.starts_at, r.ends_at;
    END IF;
  END LOOP;

  FOR r IN
    SELECT id, starts_at, ends_at FROM public.room_opening_hours
    WHERE NOT private.on_grid(starts_at, v_step) OR NOT private.on_grid(ends_at, v_step)
  LOOP
    IF private.grid_up(r.starts_at, v_step) < private.grid_down(r.ends_at, v_step) THEN
      UPDATE public.room_opening_hours
      SET starts_at = private.grid_up(r.starts_at, v_step),
          ends_at = private.grid_down(r.ends_at, v_step)
      WHERE id = r.id;
    ELSE
      RAISE NOTICE 'Opening hours % (% to %) have no full step: left as they are',
        r.id, r.starts_at, r.ends_at;
    END IF;
  END LOOP;

  UPDATE public.room_availability_exceptions
  SET starts_at = private.grid_down(starts_at, v_step),
      ends_at = CASE
        WHEN private.grid_up(ends_at, v_step) = time '00:00' THEN time '24:00'
        ELSE private.grid_up(ends_at, v_step)
      END
  WHERE type = 'blocked_interval'
    AND starts_at IS NOT NULL AND ends_at IS NOT NULL
    AND (NOT private.on_grid(starts_at, v_step) OR NOT private.on_grid(ends_at, v_step));
END $$;

-- From now on: on the grid, or refused.
CREATE FUNCTION private.require_on_grid()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_step integer;
BEGIN
  IF NEW.starts_at IS NULL OR NEW.ends_at IS NULL THEN
    RETURN NEW;
  END IF;
  SELECT slot_step_minutes INTO v_step FROM public.center_settings WHERE id = 1;
  IF NOT private.on_grid(NEW.starts_at, v_step) OR NOT private.on_grid(NEW.ends_at, v_step) THEN
    RAISE EXCEPTION 'Times must lie on the centre''s grid of % minutes', v_step
      USING ERRCODE = 'check_violation', HINT = 'off_grid',
        DETAIL = json_build_object('step', v_step)::text;
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.require_on_grid() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER specialist_availability_rules_on_grid
BEFORE INSERT OR UPDATE OF starts_at, ends_at ON public.specialist_availability_rules
FOR EACH ROW EXECUTE FUNCTION private.require_on_grid();

CREATE TRIGGER room_opening_hours_on_grid
BEFORE INSERT OR UPDATE OF starts_at, ends_at ON public.room_opening_hours
FOR EACH ROW EXECUTE FUNCTION private.require_on_grid();

CREATE TRIGGER room_availability_exceptions_on_grid
BEFORE INSERT OR UPDATE OF starts_at, ends_at ON public.room_availability_exceptions
FOR EACH ROW EXECUTE FUNCTION private.require_on_grid();

-- The grid changes only when everything is on the new one.
CREATE FUNCTION private.require_grid_fits()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
BEGIN
  IF NEW.slot_step_minutes IS DISTINCT FROM OLD.slot_step_minutes AND (
    EXISTS (
      SELECT 1 FROM public.specialist_availability_rules AS rule
      WHERE NOT private.on_grid(rule.starts_at, NEW.slot_step_minutes)
         OR NOT private.on_grid(rule.ends_at, NEW.slot_step_minutes)
    )
    OR EXISTS (
      SELECT 1 FROM public.room_opening_hours AS hours
      WHERE NOT private.on_grid(hours.starts_at, NEW.slot_step_minutes)
         OR NOT private.on_grid(hours.ends_at, NEW.slot_step_minutes)
    )
  ) THEN
    RAISE EXCEPTION 'Some availability or opening hours are off a grid of % minutes',
      NEW.slot_step_minutes
      USING ERRCODE = 'check_violation', HINT = 'grid_misfit';
  END IF;
  RETURN NEW;
END;
$function$;
REVOKE ALL ON FUNCTION private.require_grid_fits() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER center_settings_grid_fits
BEFORE UPDATE OF slot_step_minutes ON public.center_settings
FOR EACH ROW EXECUTE FUNCTION private.require_grid_fits();

-- The portals know the grid (their time pickers offer only its times).
DROP FUNCTION public.booking_window();
CREATE FUNCTION public.booking_window()
 RETURNS TABLE(time_zone text, horizon_days integer, hold_minutes integer, cancellation_window_hours integer, reschedule_window_hours integer, max_self_reschedules integer, payment_due_hours integer, slot_step_minutes integer)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO ''
AS $function$
  SELECT timezone, max_booking_horizon_days, hold_minutes,
    cancellation_window_hours, reschedule_window_hours, max_self_reschedules,
    payment_due_hours, slot_step_minutes
  FROM public.center_settings
  WHERE id = 1;
$function$;
GRANT EXECUTE ON FUNCTION public.booking_window() TO anon, authenticated, service_role;
