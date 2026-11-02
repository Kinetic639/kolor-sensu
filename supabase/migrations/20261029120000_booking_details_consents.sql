-- The details step (Klient · 3 in Miro): the consents a visit asks for,
-- one visit for one person at a time, and the details of a booking left
-- unfinished removed after 30 days. The consents' wording is a working one,
-- for a lawyer to check (#265, #267).

-- Card 16: a service for a child or a teenager is booked by a parent or a
-- legal guardian, who is the client.
ALTER TABLE public.services
  ADD COLUMN for_minors boolean NOT NULL DEFAULT false;
COMMENT ON COLUMN public.services.for_minors IS
  'For a child or a teenager: booked online by a parent or legal guardian, who confirms it.';

-- When the client gave each consent (cards 15 and 16).
ALTER TABLE public.appointments
  ADD COLUMN early_start_accepted_at timestamptz,
  ADD COLUMN guardian_confirmed_at timestamptz;
COMMENT ON COLUMN public.appointments.early_start_accepted_at IS
  'A visit within 14 days of booking: the client asked for it before the 14 days to withdraw are over, and knows they cannot withdraw once it is done.';
COMMENT ON COLUMN public.appointments.guardian_confirmed_at IS
  'A service for minors: the client confirmed booking as a parent or legal guardian.';
GRANT SELECT (early_start_accepted_at, guardian_confirmed_at)
  ON public.appointments TO authenticated;

-- What a held visit asks of the client before its details are saved.
CREATE FUNCTION private.visit_requirements(p_visit public.appointments)
RETURNS TABLE (early_start boolean, guardian boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT
    lower(p_visit.during) < now() + interval '14 days',
    coalesce((SELECT service.for_minors FROM public.services AS service
              WHERE service.id = p_visit.service_id), false);
$$;

-- For the details step: which consents the guest's held visit asks for.
CREATE FUNCTION public.booking_requirements(p_access_token text)
RETURNS TABLE (early_start boolean, guardian boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO ''
AS $$
  SELECT need.early_start, need.guardian
  FROM public.appointments AS visit
  CROSS JOIN LATERAL private.visit_requirements(visit) AS need
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
    AND visit.status = 'held';
$$;

-- save_booking_details: the body of 20261026120000_first_last_name, with
-- the two consents (cards 15, 16) and no second visit for the same person
-- at the same time, by e-mail or phone (card 17). The old signatures go:
-- the new one takes the same arguments first, the consents after them.
DROP FUNCTION public.save_booking_details(text, text, text, text, text, text, boolean, boolean);
-- The older signature (a whole name, no consents) is for nothing any more.
DROP FUNCTION public.save_booking_details(text, text, text, text, text, boolean, boolean);

CREATE FUNCTION public.save_booking_details(
  p_access_token text, p_first_name text, p_last_name text, p_email text,
  p_phone text, p_notes text, p_accept_terms boolean, p_accept_privacy boolean,
  p_accept_early_start boolean DEFAULT false, p_confirm_guardian boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  p_name text := private.full_name(p_first_name, p_last_name);
  v_visit public.appointments%ROWTYPE;
  v_early boolean;
  v_guardian boolean;
  v_email text := lower(nullif(trim(p_email), ''));
  -- The last nine digits (private.phone_key, 20261022200000_pay_later_limits).
  v_phone text := private.phone_key(p_phone);
BEGIN
  PERFORM private.remember_name_parts(p_first_name, p_last_name);
  IF p_accept_terms IS NOT TRUE OR p_accept_privacy IS NOT TRUE THEN
    RAISE EXCEPTION 'Both consents are required' USING HINT = 'consent_required';
  END IF;

  SELECT * INTO v_visit FROM public.appointments
  WHERE access_token_hash = extensions.digest(p_access_token, 'sha256')
    AND status = 'held' AND hold_expires_at > now()
  FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'The hold has expired' USING HINT = 'hold_expired';
  END IF;

  SELECT need.early_start, need.guardian INTO v_early, v_guardian
  FROM private.visit_requirements(v_visit) AS need;
  IF v_early AND p_accept_early_start IS NOT TRUE THEN
    RAISE EXCEPTION 'A visit within 14 days needs the client''s request'
      USING HINT = 'early_start_required';
  END IF;
  IF v_guardian AND p_confirm_guardian IS NOT TRUE THEN
    RAISE EXCEPTION 'A service for minors is booked by a parent or guardian'
      USING HINT = 'guardian_required';
  END IF;

  -- One person, one visit at a time: booked, awaiting payment, or held by
  -- them elsewhere with their details already given.
  IF EXISTS (
    SELECT 1 FROM public.appointments AS other
    WHERE other.id <> v_visit.id
      AND other.during && v_visit.during
      AND (other.status IN ('confirmed', 'awaiting_payment')
           OR (other.status = 'held' AND other.hold_expires_at > now()))
      AND ((v_email IS NOT NULL AND lower(other.client_email) = v_email)
           OR (v_phone <> '' AND private.phone_key(other.client_phone) = v_phone))
  ) THEN
    RAISE EXCEPTION 'The client has another visit at this time'
      USING HINT = 'client_overlap';
  END IF;

  BEGIN
    UPDATE public.appointments
    SET client_name = nullif(trim(p_name), ''),
        client_email = v_email,
        client_phone = nullif(trim(p_phone), ''),
        client_notes = nullif(trim(p_notes), ''),
        terms_accepted_at = now(),
        privacy_accepted_at = now(),
        early_start_accepted_at = CASE WHEN v_early THEN now() END,
        guardian_confirmed_at = CASE WHEN v_guardian THEN now() END
    WHERE id = v_visit.id;
  EXCEPTION WHEN check_violation THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END;
  IF (SELECT client_name IS NULL OR client_email IS NULL OR client_phone IS NULL
      FROM public.appointments WHERE id = v_visit.id) THEN
    RAISE EXCEPTION 'The details are not valid' USING HINT = 'invalid_details';
  END IF;
END;
$$;

-- Card 13: the client's details on a booking never finished (its hold ran
-- out or was given back, and it never became a visit), 30 days on.
CREATE FUNCTION private.forget_abandoned_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.appointments AS visit
  SET client_name = NULL, client_first_name = NULL, client_last_name = NULL,
      client_email = NULL, client_phone = NULL, client_notes = NULL
  WHERE NOT private.shown_as_visit(visit)
    AND visit.client_id IS NULL
    AND (visit.status IN ('expired', 'cancelled')
         OR (visit.status = 'held' AND visit.hold_expires_at < now()))
    AND coalesce(visit.hold_expires_at, visit.created_at) < now() - interval '30 days'
    AND (visit.client_name IS NOT NULL OR visit.client_email IS NOT NULL
         OR visit.client_phone IS NOT NULL OR visit.client_notes IS NOT NULL);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- (The body of 20261025120000_workshop_data_retention, with card 13.)
CREATE OR REPLACE FUNCTION private.apply_retention()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  client_id uuid;
  registration_id uuid;
BEGIN
  DELETE FROM public.visit_intakes
  WHERE id IN (SELECT private.intakes_past_keeping());
  FOR client_id IN SELECT private.clients_past_keeping() LOOP
    PERFORM private.forget_client_data(client_id);
  END LOOP;
  FOR registration_id IN SELECT private.workshop_registrations_past_keeping() LOOP
    PERFORM private.forget_workshop_registration(registration_id);
  END LOOP;
  PERFORM private.forget_abandoned_bookings();
END;
$$;

REVOKE ALL ON FUNCTION private.visit_requirements(public.appointments) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION private.forget_abandoned_bookings() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.booking_requirements(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.booking_requirements(text) TO service_role;
REVOKE ALL ON FUNCTION public.save_booking_details(text, text, text, text, text, text, boolean, boolean, boolean, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.save_booking_details(text, text, text, text, text, text, boolean, boolean, boolean, boolean) TO service_role;
