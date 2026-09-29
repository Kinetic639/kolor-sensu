-- The client's details and a limit on holds (docs/product/booking-plan.md,
-- R5). A visitor (their IP address, hashed with a server secret by the
-- site) may hold at most 5 times in 15 minutes, so nobody can block the
-- schedule by holding time after time. Details go only to a live hold, with
-- both consents and their time.

-- Holds per visitor, kept an hour. Private: not reachable through the API.
CREATE TABLE private.booking_holds (
  client_key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX booking_holds_client_idx ON private.booking_holds (client_key, created_at);
REVOKE ALL ON private.booking_holds FROM PUBLIC, anon, authenticated;

DROP FUNCTION public.hold_slot(text, text, public.visit_mode, timestamptz, text);

CREATE FUNCTION public.hold_slot(
  p_service_slug text,
  p_specialist_slug text,
  p_mode public.visit_mode,
  p_starts_at timestamptz,
  p_client_key text,
  p_location_slug text DEFAULT NULL
)
RETURNS TABLE (
  appointment_id uuid,
  reference text,
  access_token text,
  hold_expires_at timestamptz
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_settings public.center_settings%ROWTYPE;
  v_offer public.specialist_services%ROWTYPE;
  v_location uuid;
  v_day date;
  v_slot record;
  v_token text;
  v_reference text;
  v_id uuid;
  v_expires timestamptz;
BEGIN
  IF p_client_key IS NULL OR char_length(p_client_key) NOT BETWEEN 8 AND 128 THEN
    RAISE EXCEPTION 'A visitor key is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  SELECT * INTO v_settings FROM public.center_settings WHERE id = 1;
  SELECT * INTO v_offer FROM public.specialist_services
  WHERE id = private.bookable_offer(p_service_slug, p_specialist_slug, p_mode);
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This service cannot be booked with this specialist'
      USING HINT = 'not_bookable';
  END IF;
  IF p_location_slug IS NOT NULL THEN
    v_location := private.public_location_id(p_location_slug);
    IF v_location IS NULL THEN
      RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
    END IF;
  END IF;

  -- A visitor's holds, one at a time; at most 5 in 15 minutes.
  PERFORM pg_advisory_xact_lock(hashtextextended('booking:visitor:' || p_client_key, 0));
  DELETE FROM private.booking_holds WHERE created_at < now() - interval '1 hour';
  IF (
    SELECT count(*) FROM private.booking_holds AS attempt
    WHERE attempt.client_key = p_client_key
      AND attempt.created_at > now() - interval '15 minutes'
  ) >= 5 THEN
    RAISE EXCEPTION 'Too many holds, try again later' USING HINT = 'too_many_holds';
  END IF;

  -- One hold at a time per specialist; the constraints guard rooms too.
  PERFORM pg_advisory_xact_lock(hashtextextended('booking:specialist:' || v_offer.specialist_id, 0));

  -- Holds left to expire give their time back.
  UPDATE public.appointments SET status = 'expired'
  WHERE status = 'held' AND hold_expires_at <= now();

  v_day := (p_starts_at AT TIME ZONE v_settings.timezone)::date;
  SELECT * INTO v_slot
  FROM private.free_slots(v_offer.id, p_mode, v_day, v_day, v_location) AS slot
  WHERE slot.starts_at = p_starts_at;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END IF;

  -- 32 random bytes, URL-safe.
  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  LOOP
    v_reference := 'KS-' || to_char(v_day, 'YYYYMMDD') || '-'
      || lpad(floor(random() * 10000)::integer::text, 4, '0');
    EXIT WHEN NOT EXISTS (
      SELECT 1 FROM public.appointments AS existing WHERE existing.reference = v_reference
    );
  END LOOP;
  v_expires := now() + make_interval(mins => v_settings.hold_minutes);

  BEGIN
    INSERT INTO public.appointments (
      reference, specialist_id, service_id, specialist_service_id,
      availability_rule_id, mode, room_id, during, buffer_minutes,
      duration_minutes, price_minor, currency_code, status, hold_expires_at,
      access_token_hash
    )
    VALUES (
      v_reference, v_offer.specialist_id, v_offer.service_id, v_offer.id,
      v_slot.rule_id, p_mode, v_slot.room_id,
      tstzrange(v_slot.starts_at, v_slot.ends_at),
      v_settings.default_visit_buffer_minutes,
      (extract(epoch FROM v_slot.ends_at - v_slot.starts_at) / 60)::integer,
      v_offer.price_minor, v_offer.currency_code, 'held', v_expires,
      extensions.digest(v_token, 'sha256')
    )
    RETURNING id INTO v_id;
  EXCEPTION WHEN exclusion_violation THEN
    RAISE EXCEPTION 'This time is not free' USING HINT = 'slot_unavailable';
  END;

  INSERT INTO private.booking_holds (client_key) VALUES (p_client_key);

  RETURN QUERY SELECT v_id, v_reference, v_token, v_expires;
END;
$$;

-- The client's details for their live hold; both consents, stamped now.
CREATE FUNCTION public.save_booking_details(
  p_access_token text,
  p_name text,
  p_email text,
  p_phone text,
  p_notes text,
  p_accept_terms boolean,
  p_accept_privacy boolean
)
RETURNS void
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF p_accept_terms IS NOT TRUE OR p_accept_privacy IS NOT TRUE THEN
    RAISE EXCEPTION 'Both consents are required' USING HINT = 'consent_required';
  END IF;

  SELECT id INTO v_id FROM public.appointments
  WHERE access_token_hash = extensions.digest(p_access_token, 'sha256')
    AND status = 'held' AND hold_expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;

  BEGIN
    UPDATE public.appointments
    SET client_name = nullif(trim(p_name), ''),
        client_email = lower(nullif(trim(p_email), '')),
        client_phone = nullif(trim(p_phone), ''),
        client_notes = nullif(trim(p_notes), ''),
        terms_accepted_at = now(),
        privacy_accepted_at = now()
    WHERE id = v_id;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END;
  IF (SELECT client_name IS NULL OR client_email IS NULL OR client_phone IS NULL
      FROM public.appointments WHERE id = v_id) THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END IF;
END;
$$;

-- A guest's visit by its token, now with their details.
DROP FUNCTION public.get_booking(text);

CREATE FUNCTION public.get_booking(p_access_token text)
RETURNS TABLE (
  reference text,
  status public.appointment_status,
  mode public.visit_mode,
  starts_at timestamptz,
  ends_at timestamptz,
  hold_expires_at timestamptz,
  service_name text,
  specialist_name text,
  room_name text,
  location_name text,
  price_minor integer,
  currency_code text,
  client_name text,
  client_email text,
  client_phone text,
  client_notes text,
  details_saved boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT visit.reference, visit.status, visit.mode,
    lower(visit.during), upper(visit.during), visit.hold_expires_at,
    service.name, profile.display_name, room.name, location.name,
    visit.price_minor, visit.currency_code,
    visit.client_name, visit.client_email, visit.client_phone, visit.client_notes,
    visit.terms_accepted_at IS NOT NULL AND visit.privacy_accepted_at IS NOT NULL
  FROM public.appointments AS visit
  JOIN public.services AS service ON service.id = visit.service_id
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256');
$$;

REVOKE ALL ON FUNCTION public.hold_slot(text, text, public.visit_mode, timestamptz, text, text)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.hold_slot(text, text, public.visit_mode, timestamptz, text, text)
TO service_role;

REVOKE ALL ON FUNCTION public.save_booking_details(text, text, text, text, text, boolean, boolean)
FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_booking_details(text, text, text, text, text, boolean, boolean)
TO service_role;

REVOKE ALL ON FUNCTION public.get_booking(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_booking(text) TO service_role;
