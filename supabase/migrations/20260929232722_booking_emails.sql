-- E-mails about a visit (docs/product/booking-plan.md, R7). Each kind is
-- sent once per visit: the site claims it, sends it, and marks it sent (or
-- gives the claim back when sending failed, for a retry). A claim issues a
-- fresh link token for the e-mail's "Twoja wizyta" link, kept only as a
-- hash, separate from the hold's cookie token.

ALTER TABLE public.appointments
  ADD COLUMN manage_token_hash bytea UNIQUE;

CREATE TABLE public.booking_emails (
  appointment_id uuid NOT NULL REFERENCES public.appointments (id) ON DELETE CASCADE,
  kind text NOT NULL,
  claimed_at timestamptz NOT NULL DEFAULT now(),
  sent_at timestamptz,
  provider_message_id text,
  PRIMARY KEY (appointment_id, kind),
  CONSTRAINT booking_emails_kind_valid CHECK (
    kind IN ('confirmation', 'reminder', 'rescheduled', 'cancelled')
  )
);

ALTER TABLE public.booking_emails ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_emails FORCE ROW LEVEL SECURITY;
REVOKE ALL ON public.booking_emails FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.booking_emails TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.booking_emails TO service_role;

CREATE POLICY "Admins read booking e-mails"
ON public.booking_emails
FOR SELECT
TO authenticated
USING (public.has_role('admin'::public.app_role));

-- Claims an e-mail about a confirmed visit, once: what it needs, and a new
-- link token. Nothing when already claimed or sent (a claim unsent for 10
-- minutes, e.g. a crash, can be claimed again).
CREATE FUNCTION public.claim_booking_email(p_reference text, p_kind text)
RETURNS TABLE (
  reference text,
  mode public.visit_mode,
  starts_at timestamptz,
  ends_at timestamptz,
  service_name text,
  specialist_name text,
  room_name text,
  location_name text,
  location_address text,
  price_minor integer,
  currency_code text,
  client_name text,
  client_email text,
  manage_token text
)
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
DECLARE
  v_visit public.appointments%ROWTYPE;
  v_token text;
BEGIN
  SELECT * INTO v_visit FROM public.appointments AS visit
  WHERE visit.reference = p_reference
  FOR UPDATE;
  IF NOT FOUND OR v_visit.status <> 'confirmed' THEN
    RETURN;
  END IF;

  INSERT INTO public.booking_emails AS email (appointment_id, kind)
  VALUES (v_visit.id, p_kind)
  ON CONFLICT (appointment_id, kind) DO UPDATE
  SET claimed_at = now()
  WHERE email.sent_at IS NULL AND email.claimed_at < now() - interval '10 minutes';
  IF NOT FOUND THEN
    RETURN;
  END IF;

  v_token := translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
  UPDATE public.appointments
  SET manage_token_hash = extensions.digest(v_token, 'sha256')
  WHERE id = v_visit.id;

  RETURN QUERY
  SELECT v_visit.reference, v_visit.mode, lower(v_visit.during), upper(v_visit.during),
    service.name, profile.display_name, room.name, location.name,
    nullif(concat_ws(', ',
      nullif(concat_ws(' ', location.address_line1, location.address_line2), ''),
      nullif(concat_ws(' ', location.postal_code, location.city), '')
    ), ''),
    v_visit.price_minor, v_visit.currency_code,
    v_visit.client_name, v_visit.client_email, v_token
  FROM public.services AS service
  LEFT JOIN public.specialist_public_profiles AS profile
    ON profile.specialist_id = v_visit.specialist_id
  LEFT JOIN public.rooms AS room ON room.id = v_visit.room_id
  LEFT JOIN public.locations AS location ON location.id = room.location_id
  WHERE service.id = v_visit.service_id;
END;
$$;

CREATE FUNCTION public.mark_booking_email_sent(
  p_reference text,
  p_kind text,
  p_message_id text
)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  UPDATE public.booking_emails AS email
  SET sent_at = now(), provider_message_id = p_message_id
  FROM public.appointments AS visit
  WHERE visit.reference = p_reference
    AND email.appointment_id = visit.id
    AND email.kind = p_kind;
$$;

-- Sending failed: the e-mail can be claimed again at once.
CREATE FUNCTION public.release_booking_email(p_reference text, p_kind text)
RETURNS void
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
  DELETE FROM public.booking_emails AS email
  USING public.appointments AS visit
  WHERE visit.reference = p_reference
    AND email.appointment_id = visit.id
    AND email.kind = p_kind
    AND email.sent_at IS NULL;
$$;

-- A guest's visit by either of their tokens: the hold's (cookie) or the
-- e-mail link's.
CREATE OR REPLACE FUNCTION public.get_booking(p_access_token text)
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
  WHERE visit.access_token_hash = extensions.digest(p_access_token, 'sha256')
     OR visit.manage_token_hash = extensions.digest(p_access_token, 'sha256');
$$;

-- The specialist and admin views never read the link token's hash either.
REVOKE SELECT (manage_token_hash) ON public.appointments FROM authenticated;

REVOKE ALL ON FUNCTION public.claim_booking_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_booking_email(text, text) TO service_role;
REVOKE ALL ON FUNCTION public.mark_booking_email_sent(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.mark_booking_email_sent(text, text, text) TO service_role;
REVOKE ALL ON FUNCTION public.release_booking_email(text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.release_booking_email(text, text) TO service_role;
