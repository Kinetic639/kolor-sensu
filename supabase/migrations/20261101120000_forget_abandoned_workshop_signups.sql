-- Warsztat · 3, card 9: the details of a workshop sign-up never finished
-- (its hold ran out or was given back before it became a seat, a
-- reservation or a place on the waitlist), 30 days on, as a booking's are
-- (20261029120000_booking_details_consents, card 13).

CREATE FUNCTION private.forget_abandoned_workshop_signups()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_count integer;
BEGIN
  UPDATE public.workshop_registrations AS r
  SET client_name = NULL, client_first_name = NULL, client_last_name = NULL,
      client_email = NULL, client_phone = NULL, client_notes = NULL
  WHERE r.confirmed_at IS NULL
    AND r.waitlisted_at IS NULL
    AND r.payment_due_at IS NULL
    AND r.paid_minor = 0
    AND (r.status IN ('expired', 'cancelled')
         OR (r.status = 'held' AND r.hold_expires_at < now()))
    AND coalesce(r.hold_expires_at, r.created_at) < now() - interval '30 days'
    AND (r.client_name IS NOT NULL OR r.client_email IS NOT NULL
         OR r.client_phone IS NOT NULL OR r.client_notes IS NOT NULL);
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- (The body of 20261029120000_booking_details_consents, with card 9.)
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
  PERFORM private.forget_abandoned_workshop_signups();
END;
$$;

REVOKE ALL ON FUNCTION private.forget_abandoned_workshop_signups() FROM PUBLIC, anon, authenticated;
