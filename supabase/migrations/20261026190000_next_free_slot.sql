-- The soonest free time of an offer from a day on, within the booking
-- horizon (Ustawienia → Rezerwacje, "Rezerwacje na (dni do przodu)"), or
-- null when there is none (#203): the booking page says when the next
-- one is, or offers Kontakt when nothing is free. The free times are
-- private.free_slots's, as list_free_slots reads them a week at a time.

CREATE FUNCTION public.next_free_slot(
  p_service_slug text,
  p_specialist_slug text,
  p_mode public.visit_mode,
  p_from date,
  p_location_slug text DEFAULT NULL
)
RETURNS timestamptz
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_location uuid;
  v_last date;
BEGIN
  IF p_from IS NULL THEN
    RAISE EXCEPTION 'A first day is required'
      USING ERRCODE = 'invalid_parameter_value';
  END IF;
  IF p_location_slug IS NOT NULL THEN
    v_location := private.public_location_id(p_location_slug);
    IF v_location IS NULL THEN RETURN NULL; END IF;
  END IF;
  SELECT (now() AT TIME ZONE settings.timezone)::date + settings.max_booking_horizon_days
  INTO v_last
  FROM public.center_settings AS settings
  WHERE settings.id = 1;
  IF p_from > v_last THEN RETURN NULL; END IF;

  RETURN (
    SELECT min(slot.starts_at)
    FROM private.free_slots(
      private.bookable_offer(p_service_slug, p_specialist_slug, p_mode),
      p_mode, p_from, v_last, v_location
    ) AS slot
  );
END;
$$;

REVOKE ALL ON FUNCTION public.next_free_slot(text, text, public.visit_mode, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.next_free_slot(text, text, public.visit_mode, date, text)
  TO anon, authenticated, service_role;
