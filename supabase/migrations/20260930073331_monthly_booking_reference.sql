-- A shorter reservation number: the year and month it was made, and its
-- number in that month, `2610-017` (four digits from the thousandth on).
-- Numbered by the database, in the hold's transaction: a hold that fails
-- takes no number, two at once never take the same. A hold never paid
-- keeps its number (the month's count may skip one). Earlier visits keep
-- their `KS-…` numbers.

CREATE TABLE private.booking_reference_counters (
  -- `2610`: the year and month, where the centre is.
  month text PRIMARY KEY CHECK (month ~ '^[0-9]{4}$'),
  last integer NOT NULL CHECK (last > 0)
);

ALTER TABLE private.booking_reference_counters ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON private.booking_reference_counters FROM PUBLIC, anon, authenticated;

-- The next number for a visit booked at an instant.
CREATE FUNCTION private.next_booking_reference(p_at timestamptz, p_time_zone text)
RETURNS text
LANGUAGE plpgsql
SET search_path TO ''
AS $function$
DECLARE
  v_month text := to_char(p_at AT TIME ZONE p_time_zone, 'YYMM');
  v_number integer;
BEGIN
  INSERT INTO private.booking_reference_counters AS counter (month, last)
  VALUES (v_month, 1)
  ON CONFLICT (month) DO UPDATE SET last = counter.last + 1
  RETURNING counter.last INTO v_number;
  RETURN v_month || '-' || lpad(v_number::text, 3, '0');
END;
$function$;

REVOKE ALL ON FUNCTION private.next_booking_reference(timestamptz, text)
FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.hold_slot(p_service_slug text, p_specialist_slug text, p_mode public.visit_mode, p_starts_at timestamptz, p_client_key text, p_location_slug text DEFAULT NULL::text)
RETURNS TABLE(appointment_id uuid, reference text, access_token text, hold_expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
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
  v_reference := private.next_booking_reference(now(), v_settings.timezone);
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
$function$;
