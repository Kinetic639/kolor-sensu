-- Filtering the calendar must preserve every compatible offer for each hour.
CREATE OR REPLACE FUNCTION public.specialist_availability(
  p_specialist_slug text, p_service_slug text DEFAULT NULL,
  p_from date DEFAULT NULL, p_to date DEFAULT NULL, p_nearest boolean DEFAULT false
) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = '' AS $$
DECLARE
  v_zone text;
  v_today date;
  v_last date;
  v_from date;
  v_to date;
  v_slots jsonb := '[]'::jsonb;
BEGIN
  SELECT timezone, (now() AT TIME ZONE timezone)::date,
    (now() AT TIME ZONE timezone)::date + max_booking_horizon_days
  INTO v_zone, v_today, v_last FROM public.center_settings WHERE id = 1 AND booking_enabled;
  IF NOT FOUND THEN RAISE EXCEPTION 'Online booking is unavailable' USING ERRCODE = '55000'; END IF;
  IF p_nearest THEN
    v_from := date_trunc('week', v_today)::date;
    v_to := v_from + 6;
  ELSE
    IF p_from IS NULL OR p_to IS NULL OR p_to < p_from OR p_to - p_from > 41 THEN
      RAISE EXCEPTION 'A range of one to 42 days is required' USING ERRCODE = '22023';
    END IF;
    v_from := p_from;
    v_to := p_to;
  END IF;
  IF EXISTS (
    SELECT 1 FROM public.specialist_services AS offer
    JOIN public.specialists AS specialist ON specialist.id = offer.specialist_id
    JOIN public.services AS service ON service.id = offer.service_id
    WHERE specialist.public_slug = p_specialist_slug
      AND (p_service_slug IS NULL OR service.slug = p_service_slug)
      AND offer.id IN (SELECT private.bookable_offers())
  ) THEN
    LOOP
      SELECT coalesce(jsonb_agg(jsonb_build_object('startsAt', slot.starts_at, 'options', slot.options)
        ORDER BY slot.starts_at), '[]'::jsonb)
      INTO v_slots FROM private.specialist_slot_options(
        p_specialist_slug, NULL, greatest(v_from, v_today), least(v_to, v_last)
      ) AS slot WHERE v_from <= v_last AND v_to >= v_today
        AND (p_service_slug IS NULL OR EXISTS (
          SELECT 1 FROM jsonb_array_elements(slot.options) AS option
          WHERE option->>'service' = p_service_slug
        ));
      EXIT WHEN NOT p_nearest OR jsonb_array_length(v_slots) > 0 OR v_to >= v_last;
      v_from := v_from + 7;
      v_to := v_from + 6;
    END LOOP;
  END IF;
  RETURN jsonb_build_object('timeZone', v_zone, 'today', v_today, 'lastDay', v_last,
    'from', v_from, 'to', v_to, 'slots', v_slots);
END;
$$;
REVOKE ALL ON FUNCTION public.specialist_availability(text, text, date, date, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.specialist_availability(text, text, date, date, boolean) TO anon, authenticated, service_role;
COMMENT ON FUNCTION public.specialist_availability(text, text, date, date, boolean) IS
  'Read-only public availability in one request. Groups equivalent offers and returns only free hours with eligible services, forms and public locations.';
